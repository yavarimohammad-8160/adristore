import type { Product } from "./types";

/** Products that must never appear on /videos (non-card listings, etc.). */
export const VIDEO_EXCLUDED_PRODUCT_IDS = new Set([47509362]);

export function isExcludedFromVideos(
  product: Pick<Product, "id" | "title">
): boolean {
  if (VIDEO_EXCLUDED_PRODUCT_IDS.has(product.id)) return true;

  const title = product.title.trim();
  if (/صندلی/i.test(title)) return true;
  if (/(خودرو|ماشین)/i.test(title) && !/کیمدی|کارت/i.test(title)) return true;

  return false;
}