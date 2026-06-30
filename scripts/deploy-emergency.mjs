#!/usr/bin/env node
/**
 * Emergency deploy: validate out/ then upload to Cloudflare Pages.
 * Requires: npx wrangler login  OR  CLOUDFLARE_API_TOKEN env var
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadOptionalEnvFiles } from "./load-env.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");

loadOptionalEnvFiles(ROOT);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(path.join(OUT, "index.html"))) {
  fail("out/index.html missing — run: npm run build");
}

const catalogRaw = readFileSync(path.join(OUT, "data", "home-catalog.json"), "utf8");
const catalog = JSON.parse(catalogRaw);
const count = Array.isArray(catalog.products) ? catalog.products.length : 0;
if (count < 50) {
  fail(`out/data has only ${count} products — refusing broken deploy`);
}
if (String(catalog.products[0]?.title || "").includes("سری اول")) {
  fail("catalog looks like mock data — rebuild with committed catalog first");
}

const samplePage = path.join(OUT, "products", "48115796", "index.html");
if (!existsSync(samplePage)) {
  fail("sample product page missing — static export incomplete");
}

const mediaDir = path.join(OUT, "media", "products");
const images = existsSync(mediaDir)
  ? readdirSync(mediaDir).filter((n) => !n.startsWith(".")).length
  : 0;

console.log(`\n🚀 Emergency deploy: ${count} products, ${images} images\n`);

const project = process.env.CLOUDFLARE_PAGES_PROJECT || "adristore";
const args = ["wrangler", "pages", "deploy", "out", `--project-name=${project}`, "--commit-dirty=true"];

const result = spawnSync("npx", args, {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  fail("wrangler deploy failed — run: npx wrangler login");
}

console.log("\n✅ Deployed to Cloudflare Pages\n");