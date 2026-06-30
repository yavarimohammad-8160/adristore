import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSeriesCatalog } from "./product-series";
import type { Product } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

type HomeCatalogSnapshot = {
  catalogProducts: Product[];
  seriesCatalog: ReturnType<typeof buildSeriesCatalog>;
  total: number;
};

let productsCache: Product[] | null = null;
let homeCache: HomeCatalogSnapshot | null = null;

export function isStaticExportBuild(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
}

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf8");
  return JSON.parse(raw) as T;
}

export async function readStaticProducts(): Promise<Product[]> {
  if (productsCache) return productsCache;
  const data = await readJson<{ products?: Product[] }>("products-catalog.json");
  productsCache = Array.isArray(data.products) ? data.products : [];
  return productsCache;
}

export async function getStaticProductById(
  id: number | string
): Promise<Product | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const products = await readStaticProducts();
  return products.find((p) => p.id === numericId) ?? null;
}

export async function getStaticHomeCatalog(): Promise<HomeCatalogSnapshot> {
  if (homeCache) return homeCache;

  try {
    const data = await readJson<{
      products?: Product[];
      series?: ReturnType<typeof buildSeriesCatalog>;
      total?: number;
    }>("home-catalog.json");
    const products = Array.isArray(data.products) ? data.products : [];
    const catalog: HomeCatalogSnapshot = {
      catalogProducts: products,
      seriesCatalog:
        Array.isArray(data.series) && data.series.length > 0
          ? data.series
          : buildSeriesCatalog(products),
      total: data.total ?? products.length,
    };
    homeCache = catalog;
    return catalog;
  } catch {
    const products = await readStaticProducts();
    const catalog: HomeCatalogSnapshot = {
      catalogProducts: products,
      seriesCatalog: buildSeriesCatalog(products),
      total: products.length,
    };
    homeCache = catalog;
    return catalog;
  }
}