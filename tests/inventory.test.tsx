import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCard } from "../components/ProductCard";
import { normalizeProduct, enrichProductsWithGallery, fetchAllVendorProducts, getProduct } from "../lib/basalam";
import { mergeBasalamWithManual, refreshCatalogInventory } from "../lib/catalog-inventory";
import { applyProductOverride, type ProductOverrideRecord } from "../lib/product-overrides";
import { enrichProduct } from "../lib/products";
import { buildBasalamCheckoutUrl } from "../lib/basalam-checkout";
import type { Product } from "../lib/types";

const product = (inventory?: number): Product => ({ id: 57176519, title: "کارت تست", price: 129000, inventory });

test("live API fixture: published does not imply in stock", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/basalam-inventory.json", import.meta.url), "utf8"));
  for (const raw of fixture.products) {
    assert.equal(normalizeProduct(raw).inventory, raw.inventory);
    assert.deepEqual(normalizeProduct(raw).status, raw.status);
  }
});

test("normalization preserves zero and handles explicit unavailability", () => {
  const cases: [Record<string, unknown>, number][] = [
    [{ inventory: 0, stock: 12 }, 0], [{ stock: "3" }, 3], [{ quantity: 2 }, 2], [{ count: 1 }, 1],
    [{ inventory: -2 }, 0], [{ inventory: "bad" }, 0], [{ inventory: Infinity }, 0], [{}, 0],
    [{ inventory: 8, is_available: false }, 0], [{ inventory: 8, available: false }, 0],
    ...["out_of_stock", "inactive", false, 0, { value: "out_of_stock" }, { id: 3790 }, { value: 4184 }, { name: "ناموجود" }]
      .map((status): [Record<string, unknown>, number] => [{ inventory: 8, status }, 0]),
    [{ inventory: 8, status: { value: 2976 } }, 8],
    [{ inventory: 8, status: { value: 3567 } }, 0],
    [{ inventory: 0, variant: [{ stock: 8 }] }, 0],
    [{ variant: [{ stock: 2 }, { stock: 3 }] }, 5],
  ];
  for (const [raw, expected] of cases) assert.equal(normalizeProduct({ id: 1, ...raw }).inventory, expected);
});

test("live zero wins over manual data, overrides, enrichment and JSON roundtrip", () => {
  const live = [product(0), { ...product(4), id: 2 }];
  const merged = mergeBasalamWithManual(live, [{ ...product(12), title: "manual title" }]);
  const override = { inventory: 99, photos: [] } as unknown as ProductOverrideRecord;
  const overridden = merged.map((p) => applyProductOverride(p, override));
  assert.equal(overridden[0].inventory, 0);
  assert.equal(overridden[0].title, "manual title");
  assert.equal(overridden[1].inventory, 4);
  assert.equal(enrichProduct(overridden[0], product(12)).inventory, 0);
  assert.equal(enrichProduct(product(undefined), product(12)).inventory, 12);
  assert.equal(enrichProduct({ ...product(), inventory: null } as unknown as Product, product(12)).inventory, 12);
  assert.equal(enrichProduct(product(Number.NaN), product(12)).inventory?.toString(), "NaN");
  for (const name of ["home-catalog", "products-catalog"]) {
    const json = JSON.parse(JSON.stringify({ name, products: refreshCatalogInventory([product(12), { ...product(1), id: 2 }], overridden) }));
    assert.deepEqual(json.products.map((p: Product) => p.inventory), [0, 4]);
    assert.equal(json.products.length, 2);
  }
});

test("gallery detail cannot overwrite authoritative list inventory", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ ...product(12), photos: [{ original: "https://example.com/gallery.jpg" }] });
  try {
    const result = await enrichProductsWithGallery([product(0), { ...product(3), id: 2 }]);
    assert.deepEqual(result.map((p) => p.inventory), [0, 3]);
    assert.equal(result[0].photos?.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test("API errors and incomplete pagination cannot fabricate mock stock", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 401 });
    await assert.rejects(fetchAllVendorProducts(), /401/);
    assert.equal(await getProduct(57176519), null);
    globalThis.fetch = async () => Response.json({ data: [product(0)], total_count: 2, total_page: 1 });
    await assert.rejects(fetchAllVendorProducts(), /Incomplete/);
    globalThis.fetch = async () => Response.json({ data: [product(0)], total_count: 1, total_page: 1 });
    assert.equal((await fetchAllVendorProducts()).products[0].inventory, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("unknown API products cannot silently keep stale positive stock", () => {
  assert.throws(() => refreshCatalogInventory([product(12)], []), /No verified/);
  assert.throws(() => refreshCatalogInventory([product(12)], [product(undefined)]), /No verified/);
});

test("actual full sync serializes zero despite manual/override/gallery conflicts and image failures", async () => {
  const require = createRequire(new URL("../lib/basalam-sync.ts", import.meta.url));
  const live = Array.from({ length: 50 }, (_, i) => ({ ...product(i % 2 ? 3 : 0), id: i + 1 }));
  const old: Product[] = live.map((p) => ({ ...p, inventory: 12 }));
  // One previously published product disappeared from the vendor list.
  old.push({ ...product(12), id: 51 });
  const writes = new Map<string, string>();
  const commits: { path: string; bytes: Uint8Array }[] = [];
  const mocks: Record<string, unknown> = {
    "./retry": { withRetry: async (fn: () => Promise<unknown>) => fn(), sleep: async () => {} },
    "./media-cdn": {
      ...require("./media-cdn"),
      collectMirrorableUrls: (p: Product) => p.id === 1 ? ["https://statics.basalam.com/failed.jpg"] : [],
      mediaHashStem: async () => "test-image",
    },
    "./basalam": {
      fetchAllVendorProducts: async () => ({ products: live, total: live.length }),
      enrichProductsWithGallery,
    },
    "./manual-products": {
      readManualProducts: async () => [{ ...live[0], inventory: 99 }], manualToProduct: (p: Product) => p,
    },
    "./product-overrides": {
      readProductOverrides: async () => [{ id: 1, inventory: 99 }], applyProductOverride,
    },
    "./github-git": {
      githubConfigured: () => true,
      readTextFile: async () => ({ content: JSON.stringify({ products: old }) }),
      listRepoFiles: async () => new Set<string>(),
      commitFiles: async (_ref: unknown, files: typeof commits) => { commits.push(...files); return { commitSha: "test" }; },
    },
    "node:fs/promises": {
      mkdir: async () => {},
      writeFile: async (name: string, contents: string) => { writes.set(name, contents); },
    },
  };
  const source = readFileSync(new URL("../lib/basalam-sync.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { runBasalamSync?: (options: object) => Promise<{ status: string }> } = {};
  const context = vm.createContext({ exports, require: (name: string) => mocks[name] ?? require(name),
    process: { env: {}, cwd: () => process.cwd() }, console: { log() {}, warn() {} }, TextEncoder, Uint8Array,
  });
  vm.runInContext(compiled, context);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("failed.jpg")) return new Response(null, { status: 500 });
    const id = Number(String(url).split("/").pop());
    return Response.json({ ...product(99), id });
  };
  try {
    const result = await exports.runBasalamSync!({ maxNewImages: 1, dispatchGithubWorkflow: false });
    assert.equal(result.status, "partial");
    for (const name of ["home-catalog.json", "products-catalog.json"]) {
      const output = [...writes].find(([filename]) => filename.endsWith(name));
      assert.ok(output, `sync wrote ${name}`);
      const products = JSON.parse(output[1]).products as Product[];
      assert.equal(products.length, 51);
      for (const p of live) assert.equal(products.find((r) => r.id === p.id)?.inventory, p.inventory);
      assert.equal(products.find((p) => p.id === 51)?.inventory, 0);
      const committed = commits.find((f) => f.path.endsWith(name));
      assert.ok(committed);
      assert.equal(new TextDecoder().decode(committed.bytes), output[1]);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("checkout excludes unavailable items and keeps available items", () => {
  const item = (id: number, inventory: number) => ({ product: { ...product(inventory), id }, quantity: 2 });
  assert.equal(buildBasalamCheckoutUrl([item(1, 0)]), "/product/1");
  assert.equal(buildBasalamCheckoutUrl([item(1, 0), item(2, 0)]), "/product/1");
  assert.equal(buildBasalamCheckoutUrl([item(1, 0), item(2, 3)]), "https://basalam.com/p/2?quantity=2");
});

test("every committed catalog product renders the correct badge and purchase state", () => {
  for (const filename of ["home-catalog.json", "products-catalog.json"]) {
    const data = JSON.parse(readFileSync(`public/data/${filename}`, "utf8"));
    for (const p of data.products as Product[]) {
      const html = renderToStaticMarkup(<ProductCard product={p} />);
      assert.match(html, /مشاهده جزئیات/, `${filename}: ${p.id}`);
      if ((p.inventory ?? 0) <= 0) {
        assert.match(html, /ناموجود/);
        assert.match(html, /<span[^>]*aria-disabled="true"[^>]*cursor-not-allowed/);
        assert.doesNotMatch(html, /target="_blank"/);
      } else {
        assert.match(html, /target="_blank"/);
        assert.doesNotMatch(html, /aria-disabled="true"/);
      }
    }
  }
});
