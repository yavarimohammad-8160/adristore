#!/usr/bin/env node
/**
 * Cloudflare Pages static export build.
 * Temporarily removes API routes, admin, and middleware (incompatible with output: 'export').
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables):
 *   BASALAM_TOKEN     — optional; live Basalam catalog when set
 *   BASALAM_VENDOR_ID — optional vendor id (default 1213430)
 *   SKIP_PREBUILD     — optional; skip prebuild when catalog JSON already exists
 *   SKIP_BASALAM_PREBUILD — optional; force mock catalog (no Basalam API)
 *
 * .env.local is optional for local dev only (see scripts/load-env.mjs).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { loadOptionalEnvFiles } from "./load-env.mjs";

const ROOT = process.cwd();
const STASH = path.join(ROOT, ".cloudflare-build-stash");
const CLOUDFLARE_CONFIG = path.join(ROOT, "next.config.mjs");
const CLOUDFLARE_PAGES_MAX_FILE_BYTES = 25 * 1024 * 1024;
const CATALOG_DIR = path.join(ROOT, "public", "data");

loadOptionalEnvFiles(ROOT);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://adristore.ir";

function hasBasalamToken() {
  return Boolean(process.env.BASALAM_TOKEN?.trim());
}

function catalogExists() {
  return ["home-catalog.json", "products-catalog.json"].every((name) =>
    existsSync(path.join(CATALOG_DIR, name))
  );
}

function shouldSkipPrebuild() {
  if (process.env.FORCE_CATALOG_REFRESH === "1") return false;
  if (process.env.SKIP_PREBUILD === "1" && catalogExists()) return true;
  // Always reuse committed catalog unless explicitly forced — prevents API failures
  // from overwriting 1180+ real products with 42-item mock data.
  if (catalogExists()) return true;
  return false;
}

function readCatalogProductCount(catalogPath = path.join(CATALOG_DIR, "home-catalog.json")) {
  try {
    const raw = readFileSync(catalogPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.products) ? data.products.length : 0;
  } catch {
    return 0;
  }
}

function logBuildEnv() {
  const vendorId = process.env.BASALAM_VENDOR_ID || "1213430";
  console.log(`   site URL: ${SITE_URL}`);
  if (shouldSkipPrebuild()) {
    console.log("   prebuild: skipped (reusing committed catalog JSON)");
    return;
  }
  if (hasBasalamToken()) {
    console.log(`   prebuild: live Basalam API (vendor ${vendorId})`);
    return;
  }
  console.log("   prebuild: refresh catalog (no BASALAM_TOKEN — will reuse committed JSON if present)");
}

const STASH_ITEMS = [
  { from: path.join(ROOT, "app", "api"), to: path.join(STASH, "app-api") },
  { from: path.join(ROOT, "app", "admin"), to: path.join(STASH, "app-admin") },
  { from: path.join(ROOT, "app", "pages"), to: path.join(STASH, "app-pages") },
  { from: path.join(ROOT, "middleware.ts"), to: path.join(STASH, "middleware.ts") },
];

function run(cmd, args, env = {}) {
  const prebuildEnv = {};
  if (!hasBasalamToken() || process.env.SKIP_BASALAM_PREBUILD === "1") {
    prebuildEnv.USE_MOCK_CATALOG = "1";
    prebuildEnv.SKIP_BASALAM_PREBUILD = "1";
  }

  let command = cmd;
  let commandArgs = args;
  if (cmd === "node") {
    command = process.execPath;
  } else if (cmd === "npx" && args[0] === "next") {
    command = process.execPath;
    commandArgs = [path.join(ROOT, "node_modules/next/dist/bin/next"), ...args.slice(1)];
  }

  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      ...prebuildEnv,
      NEXT_PUBLIC_STATIC_EXPORT: "1",
      NEXT_PUBLIC_SITE_URL: SITE_URL,
      CF_PAGES: process.env.CF_PAGES || "1",
    },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cmd} ${args.join(" ")}`);
  }
}

function stash() {
  mkdirSync(STASH, { recursive: true });
  for (const { from, to } of STASH_ITEMS) {
    if (!existsSync(from)) continue;
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    renameSync(from, to);
    console.log(`  stashed ${path.relative(ROOT, from)}`);
  }
}

function restore() {
  for (const { from, to } of STASH_ITEMS) {
    if (!existsSync(to)) continue;
    if (existsSync(from)) rmSync(from, { recursive: true, force: true });
    renameSync(to, from);
    console.log(`  restored ${path.relative(ROOT, from)}`);
  }
  if (existsSync(STASH)) {
    try {
      rmSync(STASH, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function dirSizeMB(dir) {
  let bytes = 0;
  const walk = (p) => {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else bytes += statSync(full).size;
    }
  };
  if (existsSync(dir)) walk(dir);
  return (bytes / (1024 * 1024)).toFixed(2);
}

/** Cloudflare Pages Direct Upload rejects individual files over 25 MB. */
function findOversizedFiles(dir, maxBytes = CLOUDFLARE_PAGES_MAX_FILE_BYTES) {
  const oversized = [];
  const walk = (p) => {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const size = statSync(full).size;
        if (size > maxBytes) {
          oversized.push({ path: full, size });
        }
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return oversized.sort((a, b) => b.size - a.size);
}

/** Next.js static export writes index.txt identical to __next._full.txt — drop the duplicate. */
function pruneDuplicateRscPayloads(outDir) {
  let removed = 0;
  let savedBytes = 0;
  const walk = (p) => {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "__next._full.txt") continue;
      const indexTxt = path.join(p, "index.txt");
      if (!existsSync(indexTxt)) continue;
      savedBytes += statSync(full).size;
      rmSync(full);
      removed++;
    }
  };
  walk(outDir);
  if (removed > 0) {
    const savedMb = (savedBytes / (1024 * 1024)).toFixed(2);
    console.log(`   pruned ${removed} duplicate __next._full.txt files (−${savedMb} MB)`);
  }
}

console.log("\n📦 Cloudflare Pages static build\n");

try {
  if (!existsSync(CLOUDFLARE_CONFIG)) {
    throw new Error("next.config.mjs not found (required for Cloudflare static export)");
  }

  console.log("1/6 Prebuilding catalog JSON…");
  logBuildEnv();
  const mediaDir = path.join(ROOT, "public", "media", "products");
  const imageCount = existsSync(mediaDir)
    ? readdirSync(mediaDir).filter((name) => !name.startsWith(".")).length
    : 0;

  if (!shouldSkipPrebuild()) {
    run("node", ["--import", "tsx", "scripts/prebuild-static-data.ts"]);
  } else if (imageCount < 100 && hasBasalamToken() && process.env.SKIP_IMAGE_MIRROR !== "1") {
    console.log("   no local images — live Basalam fetch + image mirror for CI…");
    run("node", ["--import", "tsx", "scripts/prebuild-static-data.ts"], {
      FORCE_CATALOG_REFRESH: "1",
    });
  }

  const catalogCount = readCatalogProductCount();
  if (catalogCount < 50) {
    throw new Error(
      `Catalog has only ${catalogCount} products — refusing to build mock/broken export. ` +
        "Ensure public/data/home-catalog.json is committed with the real catalog."
    );
  }
  console.log(`   catalog: ${catalogCount} products in public/data/home-catalog.json`);

  const finalImageCount = existsSync(mediaDir)
    ? readdirSync(mediaDir).filter((name) => !name.startsWith(".")).length
    : 0;
  if (finalImageCount < 100) {
    const hint = hasBasalamToken()
      ? "images will be mirrored during the next full prebuild"
      : "set BASALAM_TOKEN in Cloudflare Pages env to fetch + mirror images during build";
    console.warn(`   ⚠ only ${finalImageCount} product image(s) in public/media/products (${hint})`);
  } else {
    console.log(`   product images: ${finalImageCount} file(s) in public/media/products`);
  }

  console.log("2/6 Stashing server-only routes…");
  run("node", ["scripts/patch-product-page-static.mjs", "patch"]);
  stash();

  console.log("3/6 Running next build (output: export)…");
  if (existsSync(path.join(ROOT, "out"))) {
    rmSync(path.join(ROOT, "out"), { recursive: true, force: true });
  }
  run("npx", ["next", "build"]);

  console.log("4/6 Pruning duplicate RSC payloads…");
  pruneDuplicateRscPayloads(path.join(ROOT, "out"));
  const functionsDir = path.join(ROOT, "functions");
  if (existsSync(functionsDir)) {
    cpSync(functionsDir, path.join(ROOT, "out", "functions"), { recursive: true });
    console.log("   copied functions/ into out/");
  }

  console.log("5/6 Checking Cloudflare Pages file size limits…");
  const oversized = findOversizedFiles(path.join(ROOT, "out"));
  if (oversized.length > 0) {
    console.error("✗ Files exceed Cloudflare Pages 25 MB limit:");
    for (const file of oversized) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      console.error(`  ${mb} MB  ${path.relative(ROOT, file.path)}`);
    }
    throw new Error(`${oversized.length} file(s) exceed the 25 MB Cloudflare Pages limit`);
  }
  console.log("   all files within 25 MB limit");

  console.log("6/6 Build complete.");

  const indexHtml = path.join(ROOT, "out", "index.html");
  const headersFile = path.join(ROOT, "out", "_headers");
  const redirectsFile = path.join(ROOT, "out", "_redirects");
  if (!existsSync(indexHtml)) {
    throw new Error("out/index.html missing — static export failed");
  }

  try {
    const outRaw = readFileSync(path.join(ROOT, "out", "data", "home-catalog.json"), "utf8");
    const outData = JSON.parse(outRaw);
    const outProducts = Array.isArray(outData.products) ? outData.products.length : 0;
    if (outProducts < 50) {
      throw new Error(`out/data/home-catalog.json has only ${outProducts} products — export is broken`);
    }
    console.log(`   export catalog: ${outProducts} products in out/data/`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("out/data")) throw e;
    console.warn("   ⚠ could not verify out/data/home-catalog.json");
  }

  const productPageSample = path.join(ROOT, "out", "products", "48115796", "index.html");
  if (!existsSync(productPageSample)) {
    console.warn("   ⚠ sample product page out/products/48115796/index.html missing");
  } else {
    console.log("   product pages: static HTML verified (sample 48115796)");
  }
  if (!existsSync(headersFile)) {
    console.warn("   ⚠ out/_headers missing (copy from public/_headers)");
  }
  if (!existsSync(redirectsFile)) {
    console.warn("   ⚠ out/_redirects missing (copy from public/_redirects)");
  }
} catch (err) {
  console.error("\n✗ Cloudflare build failed:", err);
  process.exitCode = 1;
} finally {
  console.log("\n↩ Restoring stashed files…");
  restore();
  try {
    run("node", ["scripts/patch-product-page-static.mjs", "restore"]);
  } catch {
    /* page may not have been patched */
  }
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

const outDir = path.join(ROOT, "out");
if (!existsSync(outDir)) {
  console.error("✗ Build finished but out/ folder was not created.");
  process.exit(1);
}

const sizeMb = dirSizeMB(outDir);
console.log(`\n✅ Static export ready: out/ (${sizeMb} MB)\n`);
console.log("Deploy options:");
console.log("  1. Cloudflare Pages → Connect Git → build: npm run build → output: out");
console.log("  2. Custom domain: Pages project → Custom domains → add adristore.ir + www");
console.log("  3. Direct upload: npm run zip:cloudflare");
console.log("  4. CLI: npm run deploy:cloudflare (requires CLOUDFLARE_API_TOKEN)\n");