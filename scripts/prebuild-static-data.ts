/**
 * Generates static JSON snapshots for Cloudflare Pages export.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildExportCatalog } from "../lib/prebuild-catalog";

const OUT_DIR = path.join(process.cwd(), "public", "data");

async function main() {
  console.log("→ Prebuilding static catalog data…");

  const { products, seriesCatalog, total } = await buildExportCatalog();

  await mkdir(OUT_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();

  const compact = (value: unknown) => JSON.stringify(value);

  await Promise.all([
    writeFile(
      path.join(OUT_DIR, "home-catalog.json"),
      compact({ products, series: seriesCatalog, total, generatedAt })
    ),
    writeFile(
      path.join(OUT_DIR, "product-series.json"),
      compact({ series: seriesCatalog, generatedAt })
    ),
    writeFile(
      path.join(OUT_DIR, "products-catalog.json"),
      compact({ products, total, generatedAt })
    ),
  ]);

  console.log(
    `✓ Wrote public/data/*.json (${products.length} products, ${seriesCatalog.length} series)`
  );
}

main().catch((err) => {
  console.error("Prebuild failed:", err);
  process.exit(1);
});