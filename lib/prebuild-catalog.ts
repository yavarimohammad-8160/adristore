/**
 * Script-safe catalog builder (no Next.js unstable_cache).
 * Used by Cloudflare static export prebuild.
 */
import { getAllMockCatalogProducts, getVendorProducts } from "./basalam";
import { buildSeriesCatalog } from "./product-series";
import { readManualProducts, manualToProduct } from "./manual-products";
import {
  applyProductOverride,
  readProductOverrides,
} from "./product-overrides";
import type { Product } from "./types";

async function fetchAllBasalamProducts(): Promise<Product[]> {
  const first = await getVendorProducts({ page: 1, per_page: 100 });
  const all = [...first.products];
  const pages = Math.min(first.total_pages, 120);

  for (let page = 2; page <= pages; page++) {
    const batch = await getVendorProducts({ page, per_page: 100 });
    all.push(...batch.products);
  }

  return all;
}

async function applyOverrides(products: Product[]): Promise<Product[]> {
  const overrides = await readProductOverrides();
  if (!overrides.length) return products;
  const map = new Map(overrides.map((o) => [o.id, o]));
  return products.map((p) => applyProductOverride(p, map.get(p.id) ?? null));
}

async function mergeCatalog(basalamProducts: Product[]) {
  const manualRecords = await readManualProducts();
  const manual = manualRecords.map(manualToProduct);
  const manualIds = new Set(manual.map((p) => p.id));
  const basalamOnly = basalamProducts.filter((p) => !manualIds.has(p.id));
  const merged = await applyOverrides([...manual, ...basalamOnly]);

  return {
    products: merged,
    seriesCatalog: buildSeriesCatalog(merged),
    total: merged.length,
  };
}

/** Full storefront catalog for static JSON export (live Basalam API). */
export async function buildExportCatalog(): Promise<{
  products: Product[];
  seriesCatalog: ReturnType<typeof buildSeriesCatalog>;
  total: number;
}> {
  const basalamProducts = await fetchAllBasalamProducts();
  return mergeCatalog(basalamProducts);
}

/** Mock catalog for CI / builds without BASALAM_TOKEN (no network calls). */
export async function buildMockExportCatalog(): Promise<{
  products: Product[];
  seriesCatalog: ReturnType<typeof buildSeriesCatalog>;
  total: number;
}> {
  return mergeCatalog(getAllMockCatalogProducts());
}