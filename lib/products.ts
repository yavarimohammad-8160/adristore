import { cache } from "react";
import { mergeBasalamWithManual } from "./catalog-inventory";
import type { Product, ProductListResponse } from "./types";
import {
  getVendorProducts as getBasalamProducts,
  searchVendorProducts as searchBasalamProducts,
  getProduct as getBasalamProduct,
  type ProductQueryParams,
  type SearchParams,
} from "./basalam";
import { matchesCategory } from "./categories";
import { buildSeriesCatalog, getProductSeriesById, productMatchesSeries } from "./product-series";
import { getManualProductsAsProducts, getManualProduct, manualToProduct } from "./manual-products";
import {
  getAllProductOverrides,
  getProductOverride,
  applyProductOverride,
} from "./product-overrides";
import { productMatchesSearch } from "./product-search";
import { sortProductsNewestFirst } from "./product-sort";
import {
  getStaticProductById,
  isStaticExportBuild,
  readStaticProducts,
} from "./static-catalog";

const MANUAL_ID_MIN = 900_000_000;

export function enrichProduct(detail: Product, fallback?: Product | null): Product {
  if (!fallback || fallback.id !== detail.id) return detail;

  const photos =
    detail.photos && detail.photos.length > 0
      ? detail.photos
      : fallback.photos && fallback.photos.length > 0
        ? fallback.photos
        : fallback.photo
          ? [fallback.photo]
          : detail.photos;

  return {
    ...fallback,
    ...detail,
    photo: detail.photo ?? fallback.photo,
    photos: photos ?? (detail.photo ? [detail.photo] : []),
    description: detail.description || fallback.description || fallback.brief || "",
    brief: detail.brief || fallback.brief || "",
    // Only null/undefined permit fallback. Zero is authoritative vendor stock.
    inventory: detail.inventory ?? fallback.inventory,
    url: detail.url || fallback.url,
    videoUrl: detail.videoUrl || fallback.videoUrl,
  };
}

async function findProductInCatalog(id: number): Promise<Product | null> {
  const manual = await getManualProductsAsProducts();
  const manualMatch = manual.find((p) => p.id === id);
  if (manualMatch) return manualMatch;

  const { products } = await getBasalamProducts({ page: 1, per_page: 100 });
  const match = products.find((p) => p.id === id);
  if (match) return match;

  const { products: page2 } = await getBasalamProducts({ page: 2, per_page: 100 });
  return page2.find((p) => p.id === id) ?? null;
}

async function withOverride(product: Product | null): Promise<Product | null> {
  if (!product || product.id >= MANUAL_ID_MIN) return product;
  const override = await getProductOverride(product.id);
  return applyProductOverride(product, override);
}

async function fetchProduct(productId: number | string): Promise<Product | null> {
  const id = Number(productId);
  if (!Number.isFinite(id) || id <= 0) return null;

  if (isStaticExportBuild()) {
    const fromCatalog = await getStaticProductById(id);
    if (fromCatalog) return fromCatalog;
  }

  if (id >= MANUAL_ID_MIN) {
    const manual = await getManualProduct(id);
    if (manual) return manualToProduct(manual);
    return null;
  }

  const detail = await getBasalamProduct(productId);
  if (detail) {
    const needsEnrichment =
      !detail.photos?.length || !detail.photo || !detail.description?.trim();
    const base = needsEnrichment
      ? enrichProduct(detail, await findProductInCatalog(id))
      : detail;
    return withOverride(base);
  }

  return withOverride(await findProductInCatalog(id));
}

/** Request-level dedupe: metadata + page share one fetch per product id */
export const getProduct = cache(fetchProduct);

async function applyOverridesToList(products: Product[]): Promise<Product[]> {
  const overrides = await getAllProductOverrides();
  if (!overrides.length) return products;
  const map = new Map(overrides.map((o) => [o.id, o]));
  return products.map((p) => applyProductOverride(p, map.get(p.id) ?? null));
}

function mergeManualIntoResult(
  result: ProductListResponse,
  manualProducts: Product[],
  page: number
): ProductListResponse {
  if (page !== 1) return result;
  const merged = mergeBasalamWithManual(result.products, manualProducts);
  return {
    ...result,
    products: merged.slice(0, result.per_page),
    total: result.total + manualProducts.length,
    total_pages: Math.ceil((result.total + manualProducts.length) / result.per_page),
  };
}

async function finalizeListResult(
  result: ProductListResponse,
  manualProducts: Product[],
  page: number
): Promise<ProductListResponse> {
  const merged = mergeManualIntoResult(result, manualProducts, page);
  return {
    ...merged,
    products: await applyOverridesToList(merged.products),
  };
}

export async function getVendorProducts(params: ProductQueryParams = {}): Promise<ProductListResponse> {
  if (isStaticExportBuild()) {
    const all = sortProductsNewestFirst(await readStaticProducts());
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 24;
    const start = (page - 1) * per_page;
    return {
      products: all.slice(start, start + per_page),
      total: all.length,
      page,
      per_page,
      total_pages: Math.max(1, Math.ceil(all.length / per_page)),
    };
  }

  const manual = await getManualProductsAsProducts();
  const result = await getBasalamProducts(params);
  return finalizeListResult(result, manual, params.page ?? 1);
}

let storefrontCatalogCache: { products: Product[]; fetchedAt: number } | null = null;
const STOREFRONT_CATALOG_TTL = 5 * 60 * 1000;

/** Basalam catalog + manual products + admin overrides — single source for search/series filters. */
async function getStorefrontCatalog(): Promise<Product[]> {
  if (isStaticExportBuild()) {
    return readStaticProducts();
  }

  if (
    storefrontCatalogCache &&
    Date.now() - storefrontCatalogCache.fetchedAt < STOREFRONT_CATALOG_TTL
  ) {
    return storefrontCatalogCache.products;
  }

  const [{ products: basalamProducts }, manual] = await Promise.all([
    searchBasalamProducts({ page: 1, per_page: 10000 }),
    getManualProductsAsProducts(),
  ]);

  const merged = mergeBasalamWithManual(basalamProducts, manual);
  const products = await applyOverridesToList(merged);

  storefrontCatalogCache = { products, fetchedAt: Date.now() };
  return products;
}

export async function searchVendorProducts(params: SearchParams = {}): Promise<ProductListResponse> {
  const {
    page = 1,
    per_page = 24,
    search = "",
    min_price,
    max_price,
    sort,
    category = "",
    filter = "",
    series = "",
  } = params;

  try {
    const allProducts = await getStorefrontCatalog();
    let filtered = allProducts;

    if (search.trim()) {
      filtered = filtered.filter((p) => productMatchesSearch(p, search));
    }

    if (category && category !== "all") {
      filtered = filtered.filter((p) =>
        matchesCategory(
          p.title,
          p.price,
          category as "player" | "team" | "price",
          filter || undefined
        )
      );
    }

    if (series && series !== "all") {
      const seriesCatalog = buildSeriesCatalog(allProducts);
      const seriesMeta = getProductSeriesById(series, seriesCatalog);
      filtered = filtered.filter((p) => productMatchesSeries(p, series, seriesMeta));
    }

    if (min_price != null) filtered = filtered.filter((p) => p.price >= min_price);
    if (max_price != null) filtered = filtered.filter((p) => p.price <= max_price);

    if (sort === "price:asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
    else if (sort === "price:desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
    else filtered = sortProductsNewestFirst(filtered);

    const start = (page - 1) * per_page;
    const pageProducts = filtered.slice(start, start + per_page);

    return {
      products: pageProducts,
      total: filtered.length,
      page,
      per_page,
      total_pages: Math.max(1, Math.ceil(filtered.length / per_page)),
    };
  } catch (error) {
    console.error("Search error:", error);
    const manual = await getManualProductsAsProducts();
    const result = await searchBasalamProducts(params);
    return finalizeListResult(result, manual, page);
  }
}
