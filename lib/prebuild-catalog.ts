/**
 * Script-safe catalog builder (no Next.js unstable_cache).
 * Used by Cloudflare static export prebuild.
 */
import { getAllMockCatalogProducts, fetchAllVendorProducts, enrichProductsWithGallery } from "./basalam";
import { mergeBasalamWithManual } from "./catalog-inventory";
import { buildSeriesCatalog } from "./product-series";
import { readManualProducts, manualToProduct } from "./manual-products";
import {
  applyProductOverride,
  readProductOverrides,
} from "./product-overrides";
import type { Product } from "./types";

async function fetchAllBasalamProducts(): Promise<Product[]> {
  const { products: all } = await fetchAllVendorProducts();

  // 🔴 جادوی گالری اینجاست: بهش می‌گیم برو گالری همه محصولات رو هم بگیر!
  console.log(`Enriching ${all.length} products with gallery images...`);
  return await enrichProductsWithGallery(all, { concurrency: 10 });
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
  const merged = await applyOverrides(mergeBasalamWithManual(basalamProducts, manual));

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
