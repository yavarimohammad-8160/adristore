#!/usr/bin/env node
/**
 * Cloudflare Pages static export build.
 * Temporarily removes API routes, admin, and middleware (incompatible with output: 'export').
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STASH = path.join(ROOT, ".cloudflare-build-stash");
const CLOUDFLARE_CONFIG = path.join(ROOT, "next.config.mjs");
const CLOUDFLARE_PAGES_MAX_FILE_BYTES = 25 * 1024 * 1024;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();

const STASH_ITEMS = [
  { from: path.join(ROOT, "app", "api"), to: path.join(STASH, "app-api") },
  { from: path.join(ROOT, "app", "admin"), to: path.join(STASH, "app-admin") },
  { from: path.join(ROOT, "app", "pages"), to: path.join(STASH, "app-pages") },
  { from: path.join(ROOT, "middleware.ts"), to: path.join(STASH, "middleware.ts") },
];

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env, NEXT_PUBLIC_STATIC_EXPORT: "1" },
  });
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
  run("node", ["--env-file=.env.local", "--import", "tsx", "scripts/prebuild-static-data.ts"]);

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
console.log("Next: zip the out/ folder and upload to Cloudflare Pages → Direct Upload\n");