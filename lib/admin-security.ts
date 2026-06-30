import fs from "fs/promises";
import path from "path";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    "127.0.0.1"
  );
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

interface LockoutRecord {
  failures: number;
  lockedUntil: number | null;
  lastAttemptAt: string;
}

interface SecurityState {
  lockouts: Record<string, LockoutRecord>;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SECURITY_FILE = path.join(DATA_DIR, "admin-security.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readState(): Promise<SecurityState> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SECURITY_FILE, "utf8");
    return JSON.parse(raw) as SecurityState;
  } catch {
    return { lockouts: {}, updatedAt: new Date().toISOString() };
  }
}

async function writeState(state: SecurityState) {
  await ensureDataDir();
  state.updatedAt = new Date().toISOString();
  await fs.writeFile(SECURITY_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function getAllowedIps(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isIpRestrictionEnabled(): boolean {
  return getAllowedIps().length > 0;
}

const LOCAL_DEV_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "unknown"]);

export function checkIpAllowed(ip: string): { ok: true } | { ok: false; reason: string } {
  const allowed = getAllowedIps();
  if (allowed.length === 0) return { ok: true };
  if (allowed.includes(ip)) return { ok: true };
  if (process.env.NODE_ENV !== "production" && LOCAL_DEV_IPS.has(ip)) return { ok: true };
  return { ok: false, reason: "دسترسی از این IP مجاز نیست" };
}

export async function getLockoutStatus(
  ip: string
): Promise<{ locked: boolean; failures: number; retryAfterSec?: number }> {
  const state = await readState();
  const record = state.lockouts[ip];
  if (!record) return { locked: false, failures: 0 };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      locked: true,
      failures: record.failures,
      retryAfterSec: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
    };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    delete state.lockouts[ip];
    await writeState(state);
    return { locked: false, failures: 0 };
  }

  return { locked: false, failures: record.failures };
}

export async function recordFailedLogin(ip: string): Promise<{
  locked: boolean;
  failures: number;
  retryAfterSec?: number;
}> {
  const state = await readState();
  const now = Date.now();
  const record = state.lockouts[ip] || {
    failures: 0,
    lockedUntil: null,
    lastAttemptAt: new Date().toISOString(),
  };

  record.failures += 1;
  record.lastAttemptAt = new Date().toISOString();

  if (record.failures >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    state.lockouts[ip] = record;
    await writeState(state);
    return {
      locked: true,
      failures: record.failures,
      retryAfterSec: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  state.lockouts[ip] = record;
  await writeState(state);
  return { locked: false, failures: record.failures };
}

export async function clearLoginFailures(ip: string): Promise<void> {
  const state = await readState();
  if (state.lockouts[ip]) {
    delete state.lockouts[ip];
    await writeState(state);
  }
}

export async function getSecurityOverview() {
  const allowedIps = getAllowedIps();
  const state = await readState();
  const activeLockouts = Object.entries(state.lockouts).filter(
    ([, r]) => r.lockedUntil && Date.now() < r.lockedUntil
  ).length;

  return {
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutMinutes: LOCKOUT_DURATION_MS / 60_000,
    ipRestrictionEnabled: allowedIps.length > 0,
    allowedIpCount: allowedIps.length,
    activeLockouts,
  };
}