import fs from "fs/promises";
import path from "path";
import { revalidateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import type { Photo, Product } from "./types";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";

export interface ManualProductRecord {
  id: number;
  title: string;
  price: number;
  description: string;
  brief: string;
  category: string;
  seriesId?: string;
  inventory: number;
  photos: Photo[];
  tags?: string[];
  videoUrl?: string;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "manual-products.json");
const STATS_FILE = path.join(DATA_DIR, "basalam-stats.json");

let idCounter = 900_000_001;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Read manual products from disk (no Next.js cache). Safe for scripts and rebuild jobs. */
export async function readManualProducts(): Promise<ManualProductRecord[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw) as ManualProductRecord[];
    const maxId = data.reduce((m, p) => Math.max(m, p.id), 900_000_000);
    idCounter = Math.max(idCounter, maxId + 1);
    return data;
  } catch {
    return [];
  }
}

async function writeDb(products: ManualProductRecord[]) {
  await ensureDataDir();
  await fs.writeFile(DB_FILE, JSON.stringify(products, null, 2), "utf8");
}

export function manualToProduct(record: ManualProductRecord): Product {
  const photo = record.photos[0] ?? null;
  return {
    id: record.id,
    title: record.title,
    price: record.price,
    photo,
    photos: record.photos,
    inventory: record.inventory,
    description: record.description,
    brief: record.brief,
    category: record.category,
    seriesId: record.seriesId,
    tags: record.tags,
    videoUrl: record.videoUrl,
    status: { name: record.inventory > 0 ? "در دسترس" : "ناموجود", value: 2976 },
    is_wholesale: false,
    url: `/products/${record.id}`,
    created_at: record.created_at,
  };
}

const getCachedManualProducts = unstable_cache(readManualProducts, [CACHE_TAGS.catalog, "manual"], {
  revalidate: REVALIDATE.storefront,
  tags: [CACHE_TAGS.catalog],
});

function invalidateCatalogCache() {
  revalidateTag(CACHE_TAGS.catalog, "default");
}

export async function getAllManualProducts(): Promise<ManualProductRecord[]> {
  return getCachedManualProducts();
}

export async function getManualProductsAsProducts(): Promise<Product[]> {
  const records = await getCachedManualProducts();
  return records.map(manualToProduct);
}

export async function getManualProduct(id: number): Promise<ManualProductRecord | null> {
  const products = await readManualProducts();
  return products.find((p) => p.id === id) ?? null;
}

export async function createManualProduct(
  input: Omit<ManualProductRecord, "id" | "created_at" | "updated_at">
): Promise<ManualProductRecord> {
  const products = await readManualProducts();
  const now = new Date().toISOString();
  const record: ManualProductRecord = {
    ...input,
    id: idCounter++,
    created_at: now,
    updated_at: now,
  };
  products.push(record);
  await writeDb(products);
  invalidateCatalogCache();
  return record;
}

export async function updateManualProduct(
  id: number,
  input: Partial<Omit<ManualProductRecord, "id" | "created_at" | "updated_at">>
): Promise<ManualProductRecord | null> {
  const products = await readManualProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = {
    ...products[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  await writeDb(products);
  invalidateCatalogCache();
  return products[idx];
}

export async function deleteManualProduct(id: number): Promise<boolean> {
  const products = await readManualProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
  await writeDb(filtered);
  invalidateCatalogCache();
  return true;
}

export interface BasalamStats {
  total: number;
  lastRefreshed: string;
  totalValue?: number;
  connected?: boolean;
}

export async function getBasalamStats(): Promise<BasalamStats> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(STATS_FILE, "utf8");
    return JSON.parse(raw) as BasalamStats;
  } catch {
    return { total: 0, lastRefreshed: "" };
  }
}

export async function saveBasalamStats(
  total: number,
  extra?: Partial<Pick<BasalamStats, "totalValue" | "connected">>
): Promise<BasalamStats> {
  const stats: BasalamStats = {
    total,
    lastRefreshed: new Date().toISOString(),
    ...extra,
  };
  await ensureDataDir();
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), "utf8");
  return stats;
}

export function computeManualTotalValue(products: ManualProductRecord[]): number {
  return products.reduce((sum, p) => sum + p.price * (p.inventory || 0), 0);
}