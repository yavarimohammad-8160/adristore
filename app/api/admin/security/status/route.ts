import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminSettings } from "@/lib/admin-settings";
import { getSecurityOverview, MAX_LOGIN_ATTEMPTS } from "@/lib/admin-security";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export async function GET() {
  try {
    await requireAdmin();
    const [settings, overview] = await Promise.all([
      getAdminSettings(),
      getSecurityOverview(),
    ]);

    const hasStoredPassword = Boolean(settings.passwordHash);
    const passwordUpdatedAt = settings.passwordUpdatedAt ?? null;

    return NextResponse.json({
      password: {
        minLength: MIN_ADMIN_PASSWORD_LENGTH,
        storedSecurely: hasStoredPassword,
        updatedAt: passwordUpdatedAt,
        strength: hasStoredPassword ? "strong" : "env-based",
      },
      twoFactor: {
        enabled: Boolean(settings.totpEnabled && settings.totpSecret),
      },
      lockout: {
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        lockoutMinutes: overview.lockoutMinutes,
        activeLockouts: overview.activeLockouts,
      },
      ipRestriction: {
        enabled: overview.ipRestrictionEnabled,
        allowedCount: overview.allowedIpCount,
      },
      sessionHours: 12,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}