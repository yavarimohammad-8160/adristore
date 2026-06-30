/**
 * Generates static JSON snapshots for Cloudflare Pages export.
 * BASALAM_TOKEN from process.env enables live API fetch; otherwise uses mock data.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadOptionalEnvFiles } from "./load-env.mjs";
import {
  buildExportCatalog,
  buildMockExportCatalog,
} from "../lib/prebuild-catalog";
import type { ProductSeries } from "../lib/product-series";
import type { Product } from "../lib/types";

const OUT_DIR = path.join(process.cwd(), "public", "data");

type CatalogSnapshot = {
  products: Product[];
  seriesCatalog: ProductSeries[];
  total: number;
  generatedAt: string;
};

function hasBasalamToken(): boolean {
  return Boolean(process.env.BASALAM_TOKEN?.trim());
}

function useMockCatalog(): boolean {
  return (
    process.env.USE_MOCK_CATALOG === "1" ||
    process.env.SKIP_BASALAM_PREBUILD === "1" ||
    !hasBasalamToken()
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function catalogFilesExist(): Promise<boolean> {
  const files = ["home-catalog.json", "product-series.json", "products-catalog.json"];
  const checks = await Promise.all(
    files.map((name) => fileExists(path.join(OUT_DIR, name)))
  );
  return checks.every(Boolean);
}

async function readExistingCatalog(): Promise<CatalogSnapshot | null> {
  const homePath = path.join(OUT_DIR, "home-catalog.json");
  const seriesPath = path.join(OUT_DIR, "product-series.json");
  const productsPath = path.join(OUT_DIR, "products-catalog.json");

  const [homeRaw, seriesRaw, productsRaw] = await Promise.all([
    readFile(homePath, "utf8"),
    readFile(seriesPath, "utf8"),
    readFile(productsPath, "utf8"),
  ]);

  const home = JSON.parse(homeRaw) as {
    products?: Product[];
    series?: ProductSeries[];
    total?: number;
    generatedAt?: string;
  };
  const series = JSON.parse(seriesRaw) as {
    series?: ProductSeries[];
    generatedAt?: string;
  };
  const products = JSON.parse(productsRaw) as {
    products?: Product[];
    total?: number;
    generatedAt?: string;
  };

  const productList = Array.isArray(home.products)
    ? home.products
    : Array.isArray(products.products)
      ? products.products
      : null;
  const seriesCatalog = Array.isArray(home.series)
    ? home.series
    : Array.isArray(series.series)
      ? series.series
      : null;

  if (!productList?.length || !seriesCatalog?.length) return null;

  return {
    products: productList,
    seriesCatalog,
    total: home.total ?? products.total ?? productList.length,
    generatedAt:
      home.generatedAt ?? series.generatedAt ?? products.generatedAt ?? "unknown",
  };
}

async function writeCatalogFiles(snapshot: CatalogSnapshot): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const { products, seriesCatalog, total, generatedAt } = snapshot;
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
}

async function main() {
  loadOptionalEnvFiles();

  if (process.env.SKIP_PREBUILD === "1") {
    if (await catalogFilesExist()) {
      const existing = await readExistingCatalog();
      console.log(
        `→ Skipping prebuild (SKIP_PREBUILD=1, ${existing?.products.length ?? "?"} products in cache)`
      );
      return;
    }
    console.warn("→ SKIP_PREBUILD=1 but no catalog found — generating mock catalog");
  }

  console.log("→ Prebuilding static catalog data…");

  let snapshot: CatalogSnapshot | null = null;

  if (useMockCatalog()) {
    console.log("   skipping Basalam API — using mock catalog (no BASALAM_TOKEN)");
    const { products, seriesCatalog, total } = await buildMockExportCatalog();
    snapshot = {
      products,
      seriesCatalog,
      total,
      generatedAt: new Date().toISOString(),
    };
  } else {
    console.log("   fetching live catalog with BASALAM_TOKEN");
    try {
      const { products, seriesCatalog, total } = await buildExportCatalog();
      if (products.length === 0) {
        throw new Error("Basalam API returned zero products");
      }
      snapshot = {
        products,
        seriesCatalog,
        total,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`   live fetch failed (${message}) — falling back to mock catalog`);
      const { products, seriesCatalog, total } = await buildMockExportCatalog();
      snapshot = {
        products,
        seriesCatalog,
        total,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  await writeCatalogFiles(snapshot);

  console.log(
    `✓ Wrote public/data/*.json (${snapshot.products.length} products, ${snapshot.seriesCatalog.length} series)`
  );
}

main().catch((err) => {
  console.error("Prebuild failed:", err);
  process.exit(1);
});