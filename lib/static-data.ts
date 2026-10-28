/** Static JSON served from /public/data — Cloudflare export source, live-server fallback. */
export const STATIC_DATA = {
  homeCatalog: "/data/home-catalog.json",
  productSeries: "/data/product-series.json",
  productsCatalog: "/data/products-catalog.json",
} as const;

/** True only for `output: 'export'` builds (`npm run build:cloudflare`). */
export function isStaticExportBuild(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
}