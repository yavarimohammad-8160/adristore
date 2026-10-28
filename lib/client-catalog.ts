import { parseSeriesCatalogJson, type ProductSeries } from "./product-series";
import { isStaticExportBuild, STATIC_DATA } from "./static-data";
import type { Product } from "./types";

/** Manual catalog rows use this id floor and are not Basalam freshness. */
const MANUAL_ID_MIN = 900_000_000;

export type CatalogSource = "live" | "static";

export interface HomeCatalogClientPayload {
  products: Product[];
  series: ProductSeries[];
  source: CatalogSource;
}

export interface ProductsCatalogClientPayload {
  products: Product[];
  source: CatalogSource;
}

export function newestVendorProductId(products: readonly Product[]): number {
  let max = 0;
  for (const product of products) {
    const id = Number(product?.id);
    if (!Number.isFinite(id) || id <= 0 || id >= MANUAL_ID_MIN) continue;
    if (id > max) max = id;
  }
  return max;
}

/**
 * True when `next` is missing a newer Basalam id already present in `current`.
 * Manual ids are ignored so a local row cannot hide a stale vendor snapshot.
 */
export function isOlderCatalogSnapshot(
  next: readonly Product[],
  current: readonly Product[]
): boolean {
  if (current.length === 0 || next.length === 0) return false;
  const nextNewest = newestVendorProductId(next);
  const currentNewest = newestVendorProductId(current);
  return nextNewest > 0 && currentNewest > 0 && nextNewest < currentNewest;
}

/** Keep SSR cards when the only client payload is an older static snapshot. */
export function shouldApplyClientCatalog(
  payload: { products: readonly Product[]; source: CatalogSource },
  baseline: readonly Product[]
): boolean {
  if (payload.products.length === 0) return false;
  if (payload.source === "static" && isOlderCatalogSnapshot(payload.products, baseline)) {
    return false;
  }
  return true;
}

function asProductArray(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean) as Product[];
}

async function fetchJson(url: string, cacheBust: boolean): Promise<unknown | null> {
  const joiner = url.includes("?") ? "&" : "?";
  const target = cacheBust ? `${url}${joiner}v=${Date.now()}` : url;
  const res = await fetch(target, cacheBust ? { cache: "no-store" } : undefined);
  if (!res.ok) return null;
  return res.json();
}

async function loadStaticHomeCatalog(): Promise<HomeCatalogClientPayload | null> {
  for (const url of [STATIC_DATA.homeCatalog, STATIC_DATA.productsCatalog]) {
    try {
      const data = (await fetchJson(url, true)) as {
        products?: unknown;
        series?: unknown;
      } | null;
      if (!data) continue;
      const products = asProductArray(data.products);
      if (products.length === 0) continue;
      return {
        products,
        series: parseSeriesCatalogJson(JSON.stringify(data.series ?? [])),
        source: "static",
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function loadLiveHomeCatalog(): Promise<HomeCatalogClientPayload | null> {
  const res = await fetch("/api/home-catalog", { cache: "no-store" });
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  const data = await res.json();
  const products = asProductArray(data?.products);
  if (products.length === 0) return null;
  return {
    products,
    series: parseSeriesCatalogJson(JSON.stringify(data?.series ?? [])),
    source: "live",
  };
}

async function loadStaticProductsCatalog(): Promise<ProductsCatalogClientPayload | null> {
  try {
    const data = (await fetchJson(STATIC_DATA.productsCatalog, true)) as {
      products?: unknown;
    } | null;
    const products = asProductArray(data?.products);
    return products.length > 0 ? { products, source: "static" } : null;
  } catch {
    return null;
  }
}

async function loadLiveProductsCatalog(): Promise<ProductsCatalogClientPayload | null> {
  const res = await fetch("/api/products?full=1&per_page=10000", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch catalog");
  const data = await res.json();
  const products = asProductArray(data?.products);
  return products.length > 0 ? { products, source: "live" } : null;
}

async function loadStaticSeries(): Promise<ProductSeries[] | null> {
  try {
    const res = await fetch(STATIC_DATA.productSeries);
    if (!res.ok) return null;
    const data = await res.json();
    const list = parseSeriesCatalogJson(JSON.stringify(data?.series ?? []));
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

async function loadLiveSeries(): Promise<ProductSeries[] | null> {
  const res = await fetch("/api/product-series", { cache: "no-store" });
  if (!res.ok) throw new Error(`series fetch failed: ${res.status}`);
  const data = await res.json();
  const list = parseSeriesCatalogJson(JSON.stringify(data?.series ?? []));
  return list.length > 0 ? list : null;
}

async function firstAvailable<T>(loaders: Array<() => Promise<T | null>>): Promise<T> {
  let lastError: unknown;
  for (const load of loaders) {
    try {
      const result = await load();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("catalog fetch failed");
}

/**
 * Homepage catalog for the browser.
 * Node deployments call `/api/home-catalog` first. Pass `staticFallback` after
 * live retries are exhausted. Cloudflare export builds read the static snapshot first.
 */
export async function fetchHomeCatalogClient(options?: {
  staticFallback?: boolean;
}): Promise<HomeCatalogClientPayload> {
  if (isStaticExportBuild()) {
    return firstAvailable([loadStaticHomeCatalog, loadLiveHomeCatalog]);
  }

  try {
    const live = await loadLiveHomeCatalog();
    if (live) return live;
  } catch (error) {
    if (!options?.staticFallback) throw error;
    console.error("Live home catalog failed, trying static snapshot:", error);
  }

  if (options?.staticFallback) {
    const snapshot = await loadStaticHomeCatalog();
    if (snapshot) return snapshot;
  }

  throw new Error("catalog fetch failed");
}

/** `/products` catalog. Same live-first / static-export-first split as the homepage. */
export async function fetchProductsCatalogClient(): Promise<ProductsCatalogClientPayload> {
  if (isStaticExportBuild()) {
    return firstAvailable([loadStaticProductsCatalog, loadLiveProductsCatalog]);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const live = await loadLiveProductsCatalog();
      if (live) return live;
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Live products catalog failed, trying static snapshot:", lastError);
  const snapshot = await loadStaticProductsCatalog();
  if (snapshot) return snapshot;
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch catalog");
}

/** Series dropdown. Live API first on the Node server; static JSON first on export builds. */
export async function fetchSeriesListClient(): Promise<ProductSeries[] | null> {
  try {
    if (isStaticExportBuild()) {
      return await firstAvailable([loadStaticSeries, loadLiveSeries]);
    }
    return await firstAvailable([loadLiveSeries, loadStaticSeries]);
  } catch (error) {
    console.error("Series list fetch failed:", error);
    return null;
  }
}
