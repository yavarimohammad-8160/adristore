#!/usr/bin/env node
import { existsSync, rmSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "out");
const ZIP_PATH = path.join(ROOT, "adristore-cloudflare.zip");

if (!existsSync(OUT_DIR)) {
  console.error("✗ out/ not found. Run: npm run build:cloudflare");
  process.exit(1);
}

async function dirSizeMB(dir) {
  let bytes = 0;
  async function walk(p) {
    for (const entry of await readdir(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) await walk(full);
      else bytes += (await stat(full)).size;
    }
  }
  await walk(dir);
  return (bytes / (1024 * 1024)).toFixed(2);
}

if (existsSync(ZIP_PATH)) {
  rmSync(ZIP_PATH);
}

const zip = spawnSync("zip", ["-rq", ZIP_PATH, "."], {
  cwd: OUT_DIR,
  stdio: "inherit",
});

if (zip.status !== 0) {
  console.error("✗ zip failed. Install zip (macOS: built-in).");
  process.exit(1);
}

const zipMb = (statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2);
const outMb = await dirSizeMB(OUT_DIR);

console.log(`\n✅ Created ${ZIP_PATH}`);
console.log(`   out/: ${outMb} MB uncompressed → zip: ${zipMb} MB\n`);