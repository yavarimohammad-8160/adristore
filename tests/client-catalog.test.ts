import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  fetchHomeCatalogClient,
  fetchProductsCatalogClient,
  fetchSeriesListClient,
  isOlderCatalogSnapshot,
  shouldApplyClientCatalog,
} from "../lib/client-catalog";
import type { Product } from "../lib/types";

const product = (id: number): Product => ({ id, title: `card ${id}`, price: 1000 });

const previousExport = process.env.NEXT_PUBLIC_STATIC_EXPORT;
const originalFetch = globalThis.fetch;

function callsOf(fetchMock: typeof fetch): string[] {
  return (fetchMock as unknown as { calls: string[] }).calls;
}

function mockFetch(
  routes: Record<string, { status?: number; body?: unknown; throw?: boolean }>
): typeof fetch {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const route = Object.entries(routes).find(([key]) => url.includes(key));
    if (!route) return new Response(null, { status: 404 });
    if (route[1].throw) throw new Error(`network ${route[0]}`);
    return Response.json(route[1].body ?? {}, { status: route[1].status ?? 200 });
  }) as typeof fetch;
  (impl as unknown as { calls: string[] }).calls = calls;
  return impl;
}

describe("client catalog fetch order", { concurrency: false }, () => {
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (previousExport === undefined) delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  else process.env.NEXT_PUBLIC_STATIC_EXPORT = previousExport;
});

test("live server prefers /api/home-catalog and does not read static JSON", async () => {
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  const fetchMock = mockFetch({
    "/api/home-catalog": {
      body: { products: [product(80), product(70)], series: [{ id: "all", label: "همه" }] },
    },
    "/data/home-catalog.json": { body: { products: [product(10)], series: [] } },
  });
  globalThis.fetch = fetchMock;

  const payload = await fetchHomeCatalogClient();
  assert.equal(payload.source, "live");
  assert.deepEqual(payload.products.map((item) => item.id), [80, 70]);
  assert.equal(callsOf(fetchMock).some((url) => url.includes("/data/")), false);
});

test("live server falls back to static JSON only after the home API fails", async () => {
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  const fetchMock = mockFetch({
    "/api/home-catalog": { status: 500, body: { products: [] } },
    "/data/home-catalog.json": { status: 404 },
    "/data/products-catalog.json": {
      body: { products: [product(10)], series: [{ id: "wc", label: "جام" }] },
    },
  });
  globalThis.fetch = fetchMock;

  await assert.rejects(fetchHomeCatalogClient(), /catalog fetch failed: 500/);
  assert.equal(callsOf(fetchMock).some((url) => url.includes("/data/")), false);

  const payload = await fetchHomeCatalogClient({ staticFallback: true });
  assert.equal(payload.source, "static");
  assert.deepEqual(payload.products.map((item) => item.id), [10]);
  assert.equal(payload.series[0]?.id, "wc");
  assert.equal(
    callsOf(fetchMock).filter((url) => url.includes("/data/home-catalog.json")).length,
    1
  );
});

test("static export keeps the snapshot first and skips the API when it loads", async () => {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = "1";
  const fetchMock = mockFetch({
    "/api/home-catalog": { body: { products: [product(80)], series: [] } },
    "/data/home-catalog.json": { body: { products: [product(10)], series: [] } },
  });
  globalThis.fetch = fetchMock;

  const payload = await fetchHomeCatalogClient();
  assert.equal(payload.source, "static");
  assert.deepEqual(payload.products.map((item) => item.id), [10]);
  assert.equal(callsOf(fetchMock).some((url) => url.includes("/api/")), false);
});

test("products page on the live server does not prefer the frozen catalog file", async () => {
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  const fetchMock = mockFetch({
    "/api/products": { body: { products: [product(90)] } },
    "/data/products-catalog.json": { body: { products: [product(11)] } },
  });
  globalThis.fetch = fetchMock;

  const payload = await fetchProductsCatalogClient();
  assert.equal(payload.source, "live");
  assert.deepEqual(payload.products.map((item) => item.id), [90]);
  assert.equal(callsOf(fetchMock).some((url) => url.includes("/data/")), false);

  const failing = mockFetch({
    "/api/products": { status: 503 },
    "/data/products-catalog.json": { body: { products: [product(11)] } },
  });
  globalThis.fetch = failing;
  const fallback = await fetchProductsCatalogClient();
  assert.equal(fallback.source, "static");
  assert.equal(fallback.products[0]?.id, 11);
  assert.equal(callsOf(failing).filter((url) => url.includes("/api/products")).length, 3);
  assert.equal(
    callsOf(failing).filter((url) => url.includes("/data/products-catalog.json")).length,
    1
  );
});

test("static export products page still reads products-catalog.json first", async () => {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = "1";
  const fetchMock = mockFetch({
    "/api/products": { body: { products: [product(90)] } },
    "/data/products-catalog.json": { body: { products: [product(11)] } },
  });
  globalThis.fetch = fetchMock;

  const payload = await fetchProductsCatalogClient();
  assert.equal(payload.source, "static");
  assert.equal(payload.products[0]?.id, 11);
  assert.equal(callsOf(fetchMock).some((url) => url.includes("/api/")), false);
});

test("series list follows the same live-first vs export-first split", async () => {
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  const liveFetch = mockFetch({
    "/api/product-series": { body: { series: [{ id: "live", label: "زنده" }] } },
    "/data/product-series.json": { body: { series: [{ id: "old", label: "قدیم" }] } },
  });
  globalThis.fetch = liveFetch;
  const live = await fetchSeriesListClient();
  assert.equal(live?.[0]?.id, "live");
  assert.equal(callsOf(liveFetch).some((url) => url.includes("/data/")), false);

  process.env.NEXT_PUBLIC_STATIC_EXPORT = "1";
  const staticFetch = mockFetch({
    "/api/product-series": { body: { series: [{ id: "live", label: "زنده" }] } },
    "/data/product-series.json": { body: { series: [{ id: "old", label: "قدیم" }] } },
  });
  globalThis.fetch = staticFetch;
  const snapshot = await fetchSeriesListClient();
  assert.equal(snapshot?.[0]?.id, "old");
  assert.equal(callsOf(staticFetch).some((url) => url.includes("/api/")), false);
});

test("an older static snapshot must not replace newer SSR cards", () => {
  const ssr = [product(80), product(70)];
  const frozen = [product(10), { ...product(900_000_001), title: "manual" }];
  assert.equal(isOlderCatalogSnapshot(frozen, ssr), true);
  assert.equal(
    shouldApplyClientCatalog({ products: frozen, source: "static" }, ssr),
    false
  );
  assert.equal(
    shouldApplyClientCatalog({ products: [product(81), product(10)], source: "live" }, ssr),
    true
  );
  assert.equal(
    shouldApplyClientCatalog({ products: frozen, source: "static" }, []),
    true
  );
  assert.equal(
    shouldApplyClientCatalog({ products: ssr, source: "static" }, ssr),
    true
  );
});
});
