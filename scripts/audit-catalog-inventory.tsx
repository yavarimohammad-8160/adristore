/** Read-only end-to-end stock audit. Optional --site also checks published JSON. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadOptionalEnvFiles } from "./load-env.mjs";
import { fetchAllVendorProducts, isBasalamConfigured } from "../lib/basalam";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../lib/types";

loadOptionalEnvFiles();

async function main() {
  assert.ok(isBasalamConfigured(), "BASALAM_TOKEN is required");
  const { products: live, total } = await fetchAllVendorProducts();
  const sources = ["local", ...(process.argv.includes("--site") ? ["published"] : [])];
  let failed = false;
  for (const source of sources) {
    for (const name of ["home-catalog.json", "products-catalog.json"]) {
      const snapshot = source === "local"
        ? JSON.parse(await readFile(`public/data/${name}`, "utf8"))
        : await (async () => {
          const response = await fetch(`https://adristore.ir/data/${name}?inventory-audit=${Date.now()}`, {
            cache: "no-store", signal: AbortSignal.timeout(30_000),
          });
          assert.ok(response.ok, `${name}: HTTP ${response.status}`);
          return response.json();
        })();
      const products = snapshot.products as Product[];
      assert.ok(Array.isArray(products), `${source}/${name}: invalid catalog`);
      const byId = new Map(products.map((p) => [p.id, p]));
      assert.equal(byId.size, products.length, "Duplicate catalog IDs");
      const mismatches = live.filter((p) => byId.get(p.id)?.inventory !== p.inventory)
        .map((p) => ({ id: p.id, api: p.inventory, catalog: byId.get(p.id)?.inventory ?? null }));
      let unavailable = 0;
      for (const product of products) {
        const html = renderToStaticMarkup(createElement(ProductCard, { product }));
        assert.match(html, /مشاهده جزئیات/);
        if ((product.inventory ?? 0) <= 0) {
          unavailable++;
          assert.match(html, /ناموجود/);
          assert.match(html, /<span[^>]*aria-disabled="true"[^>]*cursor-not-allowed/);
          assert.doesNotMatch(html, /target="_blank"/);
        } else {
          assert.match(html, /target="_blank"/);
          assert.doesNotMatch(html, /aria-disabled="true"/);
        }
      }
      failed ||= mismatches.length > 0;
      console.log(JSON.stringify({ source, name, apiTotal: total, products: products.length,
        inventoryUpdatedAt: snapshot.inventoryUpdatedAt, unavailable,
        available: products.length - unavailable, mismatches,
        cardRendering: "passed (local component rendered with source JSON; not a browser test)",
      }, null, 2));
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
