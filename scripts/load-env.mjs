#!/usr/bin/env node
/**
 * Load optional .env files for local dev. Never overrides variables already
 * set in the environment (CI / Cloudflare Pages env vars take precedence).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];

/**
 * @param {string} [root]
 * @returns {string[]} keys loaded from disk (not already in process.env)
 */
export function loadOptionalEnvFiles(root = process.cwd()) {
  const loaded = [];

  for (const name of ENV_FILES) {
    const envPath = path.join(root, name);
    if (!existsSync(envPath)) continue;

    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
      loaded.push(key);
    }
  }

  return loaded;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const loaded = loadOptionalEnvFiles();
  if (loaded.length > 0) {
    console.log(`Loaded ${loaded.length} env var(s) from .env file(s)`);
  }
}