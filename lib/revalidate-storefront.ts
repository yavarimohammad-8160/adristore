import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./cache-config";

/** Invalidate cached storefront pages and data after admin edits. */
export function revalidateStorefront(productId?: number) {
  revalidateTag(CACHE_TAGS.siteSettings, "default");
  revalidateTag(CACHE_TAGS.catalog, "default");
  revalidateTag(CACHE_TAGS.series, "default");
  revalidateTag(CACHE_TAGS.videos, "default");
  revalidateTag(CACHE_TAGS.hero, "default");

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/videos");
  revalidatePath("/sitemap.xml");

  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}