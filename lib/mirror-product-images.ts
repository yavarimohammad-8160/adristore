import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Photo, Product } from "./types";

const MEDIA_DIR = path.join(process.cwd(), "public", "media", "products");
const CONCURRENCY = 12;

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp|gif)(?:\?|_|$)/i);
  if (!match) return ".jpg";
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

function isLocalAsset(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function collectPhotoUrls(product: Product): string[] {
  const urls = new Set<string>();
  const add = (photo?: Photo | null) => {
    if (!photo) return;
    for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
      const value = photo[key];
      if (typeof value === "string" && value.trim()) urls.add(value.trim());
    }
  };
  add(product.photo);
  for (const photo of product.photos ?? []) add(photo);
  return [...urls];
}

function remapPhoto(photo: Photo, map: Map<string, string>): Photo {
  const next: Photo = { ...photo };
  for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
    const value = photo[key];
    if (typeof value === "string" && map.has(value)) {
      next[key] = map.get(value);
    }
  }
  return next;
}

async function mirrorRemoteUrl(
  url: string,
  urlToLocal: Map<string, string>
): Promise<string> {
  if (!isRemoteUrl(url)) return url;
  if (urlToLocal.has(url)) return urlToLocal.get(url)!;

  const filename = `${hashUrl(url)}${extensionFromUrl(url)}`;
  const localUrl = `/media/products/${filename}`;
  const diskPath = path.join(MEDIA_DIR, filename);

  if (await exists(diskPath)) {
    urlToLocal.set(url, localUrl);
    return localUrl;
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`   image mirror skipped (${res.status}): ${url.slice(0, 80)}…`);
      return url;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 128) return url;
    await mkdir(MEDIA_DIR, { recursive: true });
    await writeFile(diskPath, bytes);
    urlToLocal.set(url, localUrl);
    return localUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`   image mirror failed: ${message}`);
    return url;
  }
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

/** Download remote product photos into public/media/products for static export. */
export async function mirrorProductImages(products: Product[]): Promise<Product[]> {
  const uniqueUrls = new Set<string>();
  for (const product of products) {
    for (const url of collectPhotoUrls(product)) {
      if (isRemoteUrl(url)) uniqueUrls.add(url);
    }
  }

  if (uniqueUrls.size === 0) {
    console.log("   no remote product images to mirror");
    return products;
  }

  console.log(`   mirroring ${uniqueUrls.size} product image(s) to /media/products/…`);
  const urlToLocal = new Map<string, string>();
  let done = 0;

  await runPool([...uniqueUrls], async (url) => {
    await mirrorRemoteUrl(url, urlToLocal);
    done += 1;
    if (done % 50 === 0 || done === uniqueUrls.size) {
      console.log(`   mirrored ${done}/${uniqueUrls.size}`);
    }
  });

  return products.map((product) => {
    const photo = product.photo ? remapPhoto(product.photo, urlToLocal) : product.photo;
    const photos = product.photos?.map((p) => remapPhoto(p, urlToLocal));
    return { ...product, photo, photos };
  });
}

/** Normalize photo URLs for static hosting (local paths, no empty src). */
export function normalizeProductImagePaths(products: Product[]): Product[] {
  return products.map((product) => {
    const normalizePhoto = (photo?: Photo | null): Photo | null | undefined => {
      if (!photo) return photo;
      const next: Photo = { ...photo };
      for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
        const value = photo[key];
        if (typeof value === "string" && value.trim()) {
          const trimmed = value.trim();
          next[key] = isLocalAsset(trimmed)
            ? trimmed
            : trimmed.replace(/^\/\//, "https://");
        }
      }
      return next;
    };

    return {
      ...product,
      photo: normalizePhoto(product.photo),
      photos: product.photos?.map((p) => normalizePhoto(p)!).filter(Boolean),
    };
  });
}