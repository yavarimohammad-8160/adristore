import { generateSecret, generateURI, verifySync } from "otplib";
import { getAdminEmail } from "./admin-secret";

const TOTP_EPOCH_TOLERANCE_SEC = 30;

const ISSUER = "AdriStore Admin";

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(secret: string, email?: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email || getAdminEmail(),
    secret,
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    const result = verifySync({
      secret,
      token: normalized,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SEC,
    });
    return result.valid;
  } catch {
    return false;
  }
}