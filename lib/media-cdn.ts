import type { Photo, Product } from "./types";

export const MEDIA_OWNER = "yavarimohammad-8160";
export const MEDIA_REPO = "adristore-media";
export const MEDIA_BRANCH = "main";
export const MEDIA_PRODUCTS_DIR = "media/products";

/** Primary product-image CDN (Cloudflare Pages project adristore-img). */
export const PAGES_IMG_ORIGIN = "https://adristore-img.pages.dev";
export const PAGES_IMG_PREFIX = `${PAGES_IMG_ORIGIN}/${MEDIA_PRODUCTS_DIR}`;

export const JSDELIVR_PREFIX = `https://cdn.jsdelivr.net/gh/${MEDIA_OWNER}/${MEDIA_REPO}@${MEDIA_BRANCH}/${MEDIA_PRODUCTS_DIR}`;
export const GITHUB_RAW_PREFIX = `https://raw.githubusercontent.com/${MEDIA_OWNER}/${MEDIA_REPO}/${MEDIA_BRANCH}/${MEDIA_PRODUCTS_DIR}`;

export const CARD_PLACEHOLDER = "/card-placeholder.svg";

const PHOTO_KEYS = ["lg", "md", "original", "sm", "xs", "remote"] as const;

export function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isLocalAsset(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function isJsDelivrUrl(url: string): boolean {
  return /cdn\.jsdelivr\.net\/gh\//i.test(url);
}

export function isGitHubRawUrl(url: string): boolean {
  return /raw\.githubusercontent\.com\//i.test(url);
}

export function isBasalamCdnUrl(url: string): boolean {
  return /basalam\.com\//i.test(url);
}

export function isPagesImgUrl(url: string): boolean {
  return /adristore-img\.pages\.dev\//i.test(url);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashUrl(url: string): Promise<string> {
  const hex = await sha256Hex(url);
  return hex.slice(0, 12);
}

export function extensionFromUrl(url: string): string {
  const clean = url.split("?")[0] ?? url;
  const match = clean.match(/\.(jpe?g|png|webp|gif)(?:_|$)/i);
  if (!match) return ".jpg";
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

export async function filenameFromSourceUrl(url: string): Promise<string> {
  return `${await hashUrl(url)}${extensionFromUrl(url)}`;
}

export function pagesImgUrl(filename: string): string {
  return `${PAGES_IMG_PREFIX}/${filename}`;
}

export function jsdelivrUrl(filename: string): string {
  return `${JSDELIVR_PREFIX}/${filename}`;
}

export function githubRawUrl(filename: string): string {
  return `${GITHUB_RAW_PREFIX}/${filename}`;
}

export function mediaRepoPath(filename: string): string {
  return `${MEDIA_PRODUCTS_DIR}/${filename}`;
}

/** Convert a jsDelivr product-image URL to GitHub raw (bypasses jsDelivr 404 cache). */
export function jsdelivrToGitHubRaw(url: string): string | null {
  const match = url.match(
    /cdn\.jsdelivr\.net\/gh\/yavarimohammad-8160\/adristore-media@[^/]+\/media\/products\/([^/?#]+)/i
  );
  if (!match?.[1]) return null;
  return githubRawUrl(match[1]);
}

export function githubRawToJsdelivr(url: string): string | null {
  const match = url.match(
    /raw\.githubusercontent\.com\/yavarimohammad-8160\/adristore-media\/[^/]+\/media\/products\/([^/?#]+)/i
  );
  if (!match?.[1]) return null;
  return jsdelivrUrl(match[1]);
}

export function filenameFromCdnUrl(url: string): string | null {
  const match = url.match(/media\/products\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

/** Local site path `/media/products/…` → Pages CDN first, then jsDelivr / GitHub raw. */
export function localMediaToCdnFallbacks(url: string): string[] {
  if (!isLocalAsset(url)) return [];
  const filename = filenameFromCdnUrl(url);
  if (!filename) return [];
  return [pagesImgUrl(filename), jsdelivrUrl(filename), githubRawUrl(filename)];
}

export function uniqueProductPhotos(product: Pick<Product, "photo" | "photos">): Photo[] {
  const result: Photo[] = [];
  const seen = new Set<string>();
  const add = (photo?: Photo | null) => {
    if (!photo) return;
    const key = String(photo.id ?? photo.original ?? photo.lg ?? photo.md ?? "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(photo);
  };
  add(product.photo);
  for (const photo of product.photos ?? []) add(photo);
  return result;
}

export function collectPhotoUrls(product: Product): string[] {
  const urls = new Set<string>();
  const add = (photo?: Photo | null) => {
    if (!photo) return;
    for (const key of PHOTO_KEYS) {
      const value = photo[key];
      if (typeof value === "string" && value.trim()) urls.add(value.trim());
    }
  };
  for (const photo of uniqueProductPhotos(product)) add(photo);
  return [...urls];
}

/** One or two CDN URLs per distinct photo (original + lg) — not every size variant. */
export function collectMirrorableUrls(product: Product): string[] {
  const urls = new Set<string>();
  const addUrl = (url?: string | null) => {
    if (!url) return;
    const trimmed = url.trim();
    if (isRemoteUrl(trimmed) && isBasalamCdnUrl(trimmed)) urls.add(trimmed);
  };
  for (const photo of uniqueProductPhotos(product)) {
    addUrl(photo.original);
    addUrl(photo.lg);
    if (!photo.original && !photo.lg) {
      addUrl(photo.md);
      addUrl(photo.remote);
    }
  }
  return [...urls];
}

/**
 * Fallback order is the difference between a visible card and a dark one:
 *  1. primary CDN / local / whatever is in lg
 *  2. Basalam original (`remote`) ASAP when CDN MIME/extension is wrong
 *  3. CDN mirrors of a local `/media/products/` file
 *  4. GitHub raw of a jsDelivr file
 *  5. remaining sizes
 *  6. placeholder
 */
export function photoFallbackSrcs(photo?: Photo | null, extra?: string | null): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    ordered.push(trimmed);
  };

  const primary = photo?.lg || photo?.md || photo?.original || extra || photo?.sm || photo?.xs;
  push(primary);
  // Prefer Basalam remote ASAP when CDN MIME/extension is wrong (WebP served as JPEG + nosniff).
  push(photo?.remote);
  if (primary) {
    for (const mirror of localMediaToCdnFallbacks(primary)) push(mirror);
  }
  if (primary && isJsDelivrUrl(primary)) {
    push(jsdelivrToGitHubRaw(primary));
  }
  if (extra && extra !== primary) {
    push(extra);
    for (const mirror of localMediaToCdnFallbacks(extra)) push(mirror);
  }
  if (photo) {
    for (const key of ["md", "original", "sm", "xs"] as const) {
      const value = photo[key];
      push(value);
      if (value) {
        for (const mirror of localMediaToCdnFallbacks(value)) push(mirror);
      }
      if (value && isJsDelivrUrl(value)) push(jsdelivrToGitHubRaw(value));
    }
  }
  push(CARD_PLACEHOLDER);
  return ordered;
}

export function remapPhoto(
  photo: Photo,
  urlMap: Map<string, string>,
  remoteFallback?: string
): Photo {
  const next: Photo = { ...photo };
  for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
    const value = photo[key];
    if (typeof value === "string" && urlMap.has(value)) {
      next[key] = urlMap.get(value);
    }
  }
  if (remoteFallback) next.remote = remoteFallback;
  else if (photo.remote) next.remote = photo.remote;
  return next;
}

export function purgeJsdelivrUrl(filename: string): string {
  return `https://purge.jsdelivr.net/gh/${MEDIA_OWNER}/${MEDIA_REPO}@${MEDIA_BRANCH}/${MEDIA_PRODUCTS_DIR}/${filename}`;
}
