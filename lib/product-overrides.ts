import fs from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import type { Photo, Product } from "./types";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";

export interface ProductOverrideRecord {
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
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDES_FILE = path.join(DATA_DIR, "product-overrides.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Read overrides from disk (no Next.js cache). Safe for scripts and rebuild jobs. */
export async function readProductOverrides(): Promise<ProductOverrideRecord[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(OVERRIDES_FILE, "utf8");
    return JSON.parse(raw) as ProductOverrideRecord[];
  } catch {
    return [];
  }
}

async function writeOverrides(records: ProductOverrideRecord[]) {
  await ensureDataDir();
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(records, null, 2), "utf8");
}

export function urlsToPhotos(urls: string[]): Photo[] {
  return urls.map((url, i) => ({
    id: i + 1,
    original: url,
    md: url,
    sm: url,
  }));
}

export function photosToUrls(photos?: Photo[], photo?: Photo | null): string[] {
  const list = photos && photos.length > 0 ? photos : photo ? [photo] : [];
  return list
    .map((p) => p.md || p.original || p.sm || p.lg || "")
    .filter(Boolean);
}

const getCachedOverrides = unstable_cache(readProductOverrides, [CACHE_TAGS.catalog, "overrides"], {
  revalidate: REVALIDATE.storefront,
  tags: [CACHE_TAGS.catalog],
});

export async function getAllProductOverrides(): Promise<ProductOverrideRecord[]> {
  return getCachedOverrides();
}

export async function getProductOverride(id: number): Promise<ProductOverrideRecord | null> {
  const records = await readProductOverrides();
  return records.find((r) => r.id === id) ?? null;
}

export async function saveProductOverride(
  input: Omit<ProductOverrideRecord, "updated_at">
): Promise<ProductOverrideRecord> {
  const records = await readProductOverrides();
  const now = new Date().toISOString();
  const idx = records.findIndex((r) => r.id === input.id);
  const record: ProductOverrideRecord = { ...input, updated_at: now };

  if (idx === -1) {
    records.push(record);
  } else {
    records[idx] = record;
  }

  await writeOverrides(records);
  revalidateTag(CACHE_TAGS.catalog, "default");
  return record;
}

export async function deleteProductOverride(id: number): Promise<boolean> {
  const records = await readProductOverrides();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) return false;
  await writeOverrides(filtered);
  revalidateTag(CACHE_TAGS.catalog, "default");
  return true;
}

export function applyProductOverride(
  product: Product,
  override: ProductOverrideRecord | null | undefined
): Product {
  if (!override) return product;

  const photos =
    override.photos && override.photos.length > 0
      ? override.photos
      : product.photos;
  const photo = photos?.[0] ?? product.photo;

  return {
    ...product,
    title: override.title || product.title,
    price: override.price ?? product.price,
    description: override.description || product.description,
    brief: override.brief || product.brief,
    inventory: override.inventory ?? product.inventory,
    photos,
    photo,
    videoUrl: override.videoUrl || product.videoUrl,
    category: override.category,
    seriesId: override.seriesId,
    tags: override.tags,
  };
}