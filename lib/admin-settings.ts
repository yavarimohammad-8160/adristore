import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { validateStrongPassword } from "./password-policy";
import { hashAdminPassword } from "./admin-secret";

export interface AdminSettings {
  passwordHash?: string;
  passwordUpdatedAt?: string;
  totpSecret?: string;
  totpEnabled?: boolean;
  pendingTotpSecret?: string;
  pendingTotpExpiresAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "admin-settings.json");
const PENDING_TOTP_TTL_MS = 10 * 60 * 1000;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getAdminSettings(): Promise<AdminSettings> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as AdminSettings;
  } catch {
    return {};
  }
}

async function writeAdminSettings(settings: AdminSettings) {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

export async function getEffectivePassword(): Promise<string> {
  const settings = await getAdminSettings();
  if (settings.passwordHash) {
    return settings.passwordHash;
  }
  return hashAdminPassword(process.env.ADMIN_PASSWORD || "admin123");
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = await getEffectivePassword();
  const attempt = hashAdminPassword(password);
  if (expected.length !== attempt.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(attempt));
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const valid = await verifyPassword(currentPassword);
  if (!valid) {
    return { ok: false, error: "رمز عبور فعلی اشتباه است" };
  }

  const policy = validateStrongPassword(newPassword);
  if (!policy.ok) {
    return { ok: false, error: policy.errors[0] };
  }

  const settings = await getAdminSettings();
  settings.passwordHash = hashAdminPassword(newPassword);
  settings.passwordUpdatedAt = new Date().toISOString();
  await writeAdminSettings(settings);
  return { ok: true };
}

export async function isTotpEnabled(): Promise<boolean> {
  const settings = await getAdminSettings();
  return Boolean(settings.totpEnabled && settings.totpSecret);
}

export async function getTotpSecret(): Promise<string | null> {
  const settings = await getAdminSettings();
  return settings.totpSecret ?? null;
}

export async function storePendingTotpSetup(secret: string): Promise<void> {
  const settings = await getAdminSettings();
  settings.pendingTotpSecret = secret;
  settings.pendingTotpExpiresAt = new Date(Date.now() + PENDING_TOTP_TTL_MS).toISOString();
  await writeAdminSettings(settings);
}

export async function getPendingTotpSetup(): Promise<string | null> {
  const settings = await getAdminSettings();
  const secret = settings.pendingTotpSecret;
  const expiresAt = settings.pendingTotpExpiresAt;
  if (!secret || !expiresAt) return null;
  if (Date.now() > new Date(expiresAt).getTime()) {
    await clearPendingTotpSetup();
    return null;
  }
  return secret;
}

export async function clearPendingTotpSetup(): Promise<void> {
  const settings = await getAdminSettings();
  settings.pendingTotpSecret = undefined;
  settings.pendingTotpExpiresAt = undefined;
  await writeAdminSettings(settings);
}

export async function enableTotp(secret: string): Promise<void> {
  const settings = await getAdminSettings();
  settings.totpSecret = secret;
  settings.totpEnabled = true;
  settings.pendingTotpSecret = undefined;
  settings.pendingTotpExpiresAt = undefined;
  await writeAdminSettings(settings);
}

export async function disableTotp(): Promise<void> {
  const settings = await getAdminSettings();
  settings.totpSecret = undefined;
  settings.totpEnabled = false;
  settings.pendingTotpSecret = undefined;
  settings.pendingTotpExpiresAt = undefined;
  await writeAdminSettings(settings);
}