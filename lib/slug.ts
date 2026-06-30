/** URL-safe slug from product title (supports Persian) */
export function productSlug(title: string): string {
  const slug = title
    .trim()
    .replace(/[/\\?#&%+]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.slice(0, 100) || "kart-football-kimdi";
}

/** Decode a slug segment from the URL (handles encoded Persian) */
export function decodeProductSlug(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Compare URL slug segment with canonical slug from title */
export function slugMatches(segment: string | undefined, title: string): boolean {
  if (!segment) return false;
  return decodeProductSlug(segment) === productSlug(title);
}

/**
 * Canonical product URL. Slug is percent-encoded so redirects work with
 * non-ASCII characters in the Location header.
 */
export function productPath(id: number, title?: string): string {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    return `/products/${id}/`;
  }
  const slug = productSlug(title ?? "");
  return `/products/${id}/${encodeURIComponent(slug)}`;
}