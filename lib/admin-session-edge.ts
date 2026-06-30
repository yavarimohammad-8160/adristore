import { ADMIN_SESSION_COOKIE } from "./admin-session-cookie";

export { ADMIN_SESSION_COOKIE };

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 16) return "";
    return secret;
  }
  return secret || process.env.ADMIN_PASSWORD || "dev-only-admin-secret";
}

function base64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    if (!secret) return false;

    const decoded = base64UrlToString(token);
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;
    const [email, exp, sig] = parts;
    if (!email || !exp || !sig) return false;
    if (Date.now() > Number(exp)) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${email}:${exp}`));
    const expected = bytesToHex(mac);
    return timingSafeEqualStrings(sig, expected);
  } catch {
    return false;
  }
}