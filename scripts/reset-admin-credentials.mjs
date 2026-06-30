#!/usr/bin/env node
/**
 * Reset local admin credentials.
 * Usage: node --env-file=.env.local scripts/reset-admin-credentials.mjs
 */
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "admin-settings.json");
const SECURITY_FILE = path.join(DATA_DIR, "admin-security.json");

const EMAIL = "admin@adristore.com";
const PASSWORD = "AdminSecure2026!";

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
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

function getAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (secret && secret.length >= 16) return secret;
  const fallback = process.env.ADMIN_PASSWORD;
  if (fallback && fallback.length >= 16) return fallback;
  return secret || fallback || "dev-only-admin-secret";
}

const passwordHash = crypto.createHmac("sha256", getAdminSecret()).update(PASSWORD).digest("hex");

mkdirSync(DATA_DIR, { recursive: true });

writeFileSync(
  SETTINGS_FILE,
  JSON.stringify(
    {
      passwordHash,
      passwordUpdatedAt: new Date().toISOString(),
      totpEnabled: false,
      totpSecret: undefined,
      pendingTotpSecret: undefined,
      pendingTotpExpiresAt: undefined,
    },
    null,
    2
  ) + "\n"
);

writeFileSync(
  SECURITY_FILE,
  JSON.stringify({ lockouts: {}, updatedAt: new Date().toISOString() }, null, 2) + "\n"
);

console.log("✓ Admin credentials reset");
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log("  TOTP:     disabled");
console.log("  Lockouts: cleared");