import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Photo, Product } from "./types";

const MEDIA_DIR = path.join(process.cwd(), "public", "media", "products");
/** Basalam rate-limits aggressively — keep this low. */
const CONCURRENCY = 3;
const MAX_RETRIES = 5;
const FETCH_TIMEOUT_MS = 45_000;
const BROWSER_HEADERS: HeadersInit = {
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,fa;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Referer: "https://basalam.com/",
};

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

function isBasalamCdnUrl(url: string): boolean {
  return /basalam\.com\//i.test(url);
}

function collectPhotoUrls(product: Product): string[] {
  const urls = new Set<string>();
  const add = (photo?: Photo | null) => {
    if (!photo) return;
    for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
      const value = photo[key];
      if (typeof value === "string" && value.trim()) urls.add(value.trim());
    }
    if (typeof photo.remote === "string" && photo.remote.trim()) {
      urls.add(photo.remote.trim());
    }
  };
  add(product.photo);
  for (const photo of product.photos ?? []) add(photo);
  return [...urls];
}

function remapPhoto(photo: Photo, map: Map<string, string>): Photo {
  const next: Photo = { ...photo };
  let remoteFallback = photo.remote;
  for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
    const value = photo[key];
    if (typeof value === "string" && map.has(value)) {
      // Keep the original Basalam CDN URL as remote so clients can fall back
      // if the mirrored local asset is missing after deploy.
      if (!remoteFallback && isBasalamCdnUrl(value)) {
        remoteFallback = value;
      }
      next[key] = map.get(value);
    }
  }
  if (remoteFallback) next.remote = remoteFallback;
  return next;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let lastError = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429) {
        await sleep(5_000 * 2 ** attempt);
        lastError = "429";
        continue;
      }
      if (!res.ok) {
        lastError = String(res.status);
        if (res.status === 403 || res.status === 404) break;
        await sleep(1_500 * 2 ** attempt);
        continue;
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 128) {
        lastError = "too-small";
        break;
      }
      await mkdir(MEDIA_DIR, { recursive: true });
      await writeFile(diskPath, bytes);
      urlToLocal.set(url, localUrl);
      return localUrl;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await sleep(1_500 * 2 ** attempt);
    }
  }

  console.warn(
    `   image mirror failed (${lastError}): ${url.slice(0, 80)}…`
  );
  return url;
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
      if (typeof photo.remote === "string" && photo.remote.trim()) {
        next.remote = photo.remote.trim().replace(/^\/\//, "https://");
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
