import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Product } from "./types";
import { searchVendorProducts } from "./products";
import { getManualProductsAsProducts } from "./manual-products";
import { getAllProductOverrides, applyProductOverride } from "./product-overrides";
import { parseVideoInput } from "./video-embed";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";
import { readVideoIndex, rebuildVideoIndex } from "./video-index";
import { isExcludedFromVideos } from "./video-exclusions";

export interface VideoListing {
  id: number;
  title: string;
  price: number;
  videoUrl: string;
  videoThumbnail?: string;
  /** Number of catalog products sharing this video URL */
  relatedCount: number;
}

function hasVideo(product: Product): boolean {
  return Boolean(product.videoUrl?.trim());
}

function normalizeVideoKey(videoUrl: string): string {
  return parseVideoInput(videoUrl).trim().toLowerCase();
}

/** YouTube thumbnail when the video URL is YouTube; otherwise null. */
export function getYouTubeThumbnail(videoUrl: string): string | null {
  const input = parseVideoInput(videoUrl);
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  if (!match) return null;
  return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
}

function getAparatThumbnail(videoUrl: string): string | null {
  const input = parseVideoInput(videoUrl);
  const match =
    input.match(/aparat\.com\/v\/([\w]+)/) ||
    input.match(/aparat\.com\/video\/video\/embed\/videohash\/([\w]+)/);
  if (!match) return null;
  return `https://www.aparat.com/video/video/videohash/${match[1]}/thumb-fd-1.jpg`;
}

function getBasalamVideoThumbnailFromUrl(videoUrl: string): string | null {
  if (!/statics\.basalam\.com/i.test(videoUrl)) return null;
  const thumb = videoUrl.replace(/(_\d+X\d+_\d+K)?\.(mp4|mov)(\?.*)?$/i, "_thumbnail.jpg");
  return thumb !== videoUrl ? thumb : null;
}

/** Best available preview image for a video URL (YouTube-style poster). */
export function getVideoThumbnail(
  videoUrl: string,
  storedThumbnail?: string | null
): string | null {
  const stored = storedThumbnail?.trim();
  if (stored) return stored;

  return (
    getYouTubeThumbnail(videoUrl) ||
    getAparatThumbnail(videoUrl) ||
    getBasalamVideoThumbnailFromUrl(videoUrl)
  );
}

function deriveSharedVideoTitle(products: Product[]): string {
  if (products.length === 1) return products[0].title;

  const isKimdiShow = products.every((product) => /کیمدی\s*شو/i.test(product.title));
  if (isKimdiShow) {
    const prefixes = products.map((product) => {
      const split = product.title.lastIndexOf(" - ");
      return split > 0 ? product.title.slice(0, split).trim() : product.title.trim();
    });
    const first = prefixes[0];
    if (prefixes.every((prefix) => prefix === first)) return first;
    return "کیمدی شو";
  }

  const splitTitles = products.map((product) => {
    const split = product.title.lastIndexOf(" - ");
    return split > 0 ? product.title.slice(0, split).trim() : product.title.trim();
  });
  const first = splitTitles[0];
  if (splitTitles.every((title) => title === first)) return first;

  return products[0].title;
}

export function deduplicateVideoListings(products: Product[]): VideoListing[] {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    if (isExcludedFromVideos(product)) continue;
    const videoUrl = product.videoUrl?.trim();
    if (!videoUrl) continue;
    const key = normalizeVideoKey(videoUrl);
    const group = groups.get(key) ?? [];
    group.push(product);
    groups.set(key, group);
  }

  const listings: VideoListing[] = [];

  for (const group of groups.values()) {
    group.sort((a, b) => (b.id || 0) - (a.id || 0));
    const representative = group[0];
    const videoUrl = representative.videoUrl!.trim();
    const storedThumb = group.find((product) => product.videoThumbnail)?.videoThumbnail;

    listings.push({
      id: representative.id,
      title: deriveSharedVideoTitle(group),
      price: representative.price,
      videoUrl,
      videoThumbnail: getVideoThumbnail(videoUrl, storedThumb) ?? undefined,
      relatedCount: group.length,
    });
  }

  return listings.sort((a, b) => b.id - a.id);
}

async function hydrateVideoProducts(
  indexEntries: Array<{ id: number; videoUrl: string; videoThumbnail?: string }>
): Promise<Product[]> {
  const { products: catalog } = await searchVendorProducts({ page: 1, per_page: 10000 });
  const catalogMap = new Map(catalog.map((product) => [product.id, product]));

  const manual = await getManualProductsAsProducts();
  for (const product of manual) {
    catalogMap.set(product.id, product);
  }

  const overrides = await getAllProductOverrides();
  const overrideMap = new Map(overrides.map((override) => [override.id, override]));

  const products: Product[] = [];
  const seen = new Set<number>();

  const addIfHasVideo = (product: Product) => {
    const merged = applyProductOverride(product, overrideMap.get(product.id) ?? null);
    if (isExcludedFromVideos(merged) || !hasVideo(merged) || seen.has(merged.id)) return;
    seen.add(merged.id);
    products.push(merged);
  };

  for (const entry of indexEntries) {
    const base = catalogMap.get(entry.id);
    if (!base) continue;
    addIfHasVideo({
      ...base,
      videoUrl: entry.videoUrl,
      videoThumbnail: entry.videoThumbnail ?? base.videoThumbnail,
    });
  }

  for (const product of catalogMap.values()) {
    addIfHasVideo(product);
  }

  return products.sort((a, b) => (b.id || 0) - (a.id || 0));
}

async function fetchProductsWithVideo(): Promise<VideoListing[]> {
  let index = await readVideoIndex();
  if (index.length === 0) {
    index = await rebuildVideoIndex();
  }

  const products = await hydrateVideoProducts(index);
  return deduplicateVideoListings(products);
}

const getCachedProductsWithVideo = unstable_cache(
  fetchProductsWithVideo,
  [CACHE_TAGS.videos, "deduped-v3"],
  { revalidate: REVALIDATE.storefront, tags: [CACHE_TAGS.videos] }
);

/** Unique video listings (deduplicated by URL) with real video thumbnails. */
export const getProductsWithVideo = cache(getCachedProductsWithVideo);