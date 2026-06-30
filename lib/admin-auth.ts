import { cookies } from "next/headers";
import crypto from "crypto";
import { verifyPassword, isTotpEnabled } from "./admin-settings";
import { getAdminEmail, getAdminSecret } from "./admin-secret";
import { ADMIN_SESSION_COOKIE } from "./admin-session-cookie";

export { getAdminEmail, getAdminSecret };

const SESSION_COOKIE = ADMIN_SESSION_COOKIE;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
}

export function createSessionToken(email: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${email}:${exp}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifySessionToken(token: string): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [email, exp, sig] = parts;
    if (!email || !exp || !sig) return null;
    if (Date.now() > Number(exp)) return null;
    const expected = signPayload(`${email}:${exp}`);
    if (!timingSafeEqualStrings(sig, expected)) return null;
    return { email };
  } catch {
    return null;
  }
}

export function createPending2FAToken(email: string): string {
  const exp = Date.now() + PENDING_2FA_TTL_MS;
  const payload = `2fa:${email}:${exp}`;
  const sig = signPayload(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyPending2FAToken(token: string): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [, email, exp, sig] = parts;
    if (!email || !exp || !sig) return null;
    if (Date.now() > Number(exp)) return null;
    const expected = signPayload(`2fa:${email}:${exp}`);
    if (!timingSafeEqualStrings(sig, expected)) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function validateLogin(
  email: string,
  password: string
): Promise<{ ok: true; requires2fa: boolean } | { ok: false }> {
  const expectedEmail = getAdminEmail().toLowerCase();
  const loginEmail = email.trim().toLowerCase();
  if (!timingSafeEqualStrings(loginEmail, expectedEmail)) return { ok: false };
  if (!(await verifyPassword(password))) return { ok: false };
  const requires2fa = await isTotpEnabled();
  return { ok: true, requires2fa };
}

export { ADMIN_SESSION_COOKIE };