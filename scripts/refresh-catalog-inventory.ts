/** Stock-only sync: no image downloads, no mock fallback, no product removal.
 * Default: validate/dry-run. --write updates both committed catalogs.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadOptionalEnvFiles } from "./load-env.mjs";
import { fetchAllVendorProducts, fetchProductDetail, isBasalamConfigured } from "../lib/basalam";
import { refreshCatalogInventory } from "../lib/catalog-inventory";
import type { Product } from "../lib/types";

loadOptionalEnvFiles();

async function main() {
  if (!isBasalamConfigured()) throw new Error("BASALAM_TOKEN is required; refusing mock inventory");
  const names = ["home-catalog.json", "products-catalog.json"];
  const snapshots = await Promise.all(names.map(async (name) => {
    const filename = path.join(process.cwd(), "public/data", name);
    const data = JSON.parse(await readFile(filename, "utf8"));
    if (!Array.isArray(data.products) || data.products.length === 0) {
      throw new Error(`Invalid catalog: ${name}`);
    }
    return { filename, data: data as { products: Product[]; [key: string]: unknown } };
  }));
  const { products: live, total } = await fetchAllVendorProducts();
  if (live.length === 0) throw new Error("Empty vendor response; refusing to overwrite inventory");
  const liveIds = new Set(live.map((p) => p.id));
  const existingIds = new Set(snapshots.flatMap(({ data }) => data.products.map((p) => p.id)));
  // A product omitted by the list needs a verified detail response, not a guessed quantity.
  for (const id of existingIds) {
    if (id >= 900_000_000 || liveIds.has(id)) continue;
    const detail = await fetchProductDetail(id);
    if (!detail || detail.id !== id) throw new Error(`Cannot verify omitted product ${id}; catalogs unchanged`);
    live.push(detail);
  }
  const inventoryUpdatedAt = new Date().toISOString();
  const outputs = snapshots.map(({ filename, data }) => ({
    filename,
    data: { ...data, products: refreshCatalogInventory(data.products, live), inventoryUpdatedAt },
  }));
  const before = new Map(snapshots[0].data.products.map((p) => [p.id, p.inventory]));
  const products = outputs[0].data.products;
  const changed = products.filter((p) => p.inventory !== before.get(p.id));
  const newIds = live.filter((p) => !existingIds.has(p.id)).map((p) => p.id);
  console.log(JSON.stringify({
    mode: process.argv.includes("--write") ? "write" : "dry-run",
    inventoryUpdatedAt, apiTotal: total, retainedProducts: products.length,
    unavailable: products.filter((p) => p.inventory === 0).length,
    available: products.filter((p) => (p.inventory ?? 0) > 0).length,
    changed: changed.map((p) => ({ id: p.id, before: before.get(p.id), after: p.inventory })),
    newProductIdsRequiringFullSync: newIds,
  }, null, 2));
  // Both snapshots have been fully validated before either file is written.
  if (process.argv.includes("--write")) {
    for (const output of outputs) {
      await writeFile(output.filename, JSON.stringify(output.data), "utf8");
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
