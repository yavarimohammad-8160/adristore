/** Shared ISR / CDN revalidation windows (seconds). */
export const REVALIDATE = {
  storefront: 300,
  sitemap: 3600,
  api: 300,
} as const;

export const CACHE_TAGS = {
  siteSettings: "site-settings",
  catalog: "catalog",
  series: "product-series",
  videos: "videos",
  hero: "hero",
} as const;