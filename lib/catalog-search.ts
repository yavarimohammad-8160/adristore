import { matchesCategory } from "@/lib/categories";
import { productMatchesSearch } from "@/lib/product-search";
import {
  buildSeriesCatalog,
  getProductSeriesById,
  productMatchesSeries,
} from "@/lib/product-series";
import type { Product, ProductListResponse } from "@/lib/types";

export interface CatalogSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  sort?: "price:asc" | "price:desc" | "newest";
  category?: string;
  filter?: string;
  series?: string;
}

/** Client-safe product filtering (mirrors server searchVendorProducts). */
export function filterProductCatalog(
  allProducts: Product[],
  params: CatalogSearchParams = {}
): ProductListResponse {
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
  else if (sort === "newest") filtered = [...filtered].sort((a, b) => (b.id || 0) - (a.id || 0));

  const start = (page - 1) * per_page;
  const pageProducts = filtered.slice(start, start + per_page);

  return {
    products: pageProducts,
    total: filtered.length,
    page,
    per_page,
    total_pages: Math.max(1, Math.ceil(filtered.length / per_page)),
  };
}