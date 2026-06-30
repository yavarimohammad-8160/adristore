import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    "127.0.0.1"
  );
}

export function getAllowedIps(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const LOCAL_DEV_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "unknown"]);

export function checkIpAllowed(ip: string): { ok: true } | { ok: false; reason: string } {
  const allowed = getAllowedIps();
  if (allowed.length === 0) return { ok: true };
  if (allowed.includes(ip)) return { ok: true };
  if (process.env.NODE_ENV !== "production" && LOCAL_DEV_IPS.has(ip)) return { ok: true };
  return { ok: false, reason: "دسترسی از این IP مجاز نیست" };
}