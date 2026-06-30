import crypto from "crypto";

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (secret && secret.length >= 16) return secret;

  const fallback = process.env.ADMIN_PASSWORD;
  if (fallback && fallback.length >= 16) return fallback;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SECRET (min 16 chars) must be set in Netlify environment variables");
  }

  return secret || fallback || "dev-only-admin-secret";
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || "admin@adristore.com";
}

export function hashAdminPassword(password: string): string {
  return crypto.createHmac("sha256", getAdminSecret()).update(password).digest("hex");
}