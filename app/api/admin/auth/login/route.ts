import { NextRequest, NextResponse } from "next/server";
import {
  validateLogin,
  createSessionToken,
  createPending2FAToken,
  ADMIN_SESSION_COOKIE,
  getAdminSecret,
} from "@/lib/admin-auth";
import {
  checkIpAllowed,
  clearLoginFailures,
  getClientIp,
  getLockoutStatus,
  MAX_LOGIN_ATTEMPTS,
  recordFailedLogin,
} from "@/lib/admin-security";

export const dynamic = "force-dynamic";

function sessionCookie(token: string) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}

function lockoutResponse(retryAfterSec?: number) {
  return NextResponse.json(
    {
      error: `حساب به دلیل ${MAX_LOGIN_ATTEMPTS} تلاش ناموفق به مدت ۳۰ دقیقه قفل شد.`,
    },
    {
      status: 429,
      headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined,
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    getAdminSecret();
  } catch {
    return NextResponse.json(
      { error: "پیکربندی امنیتی سرور ناقص است. ADMIN_SECRET را در Netlify تنظیم کنید." },
      { status: 503 }
    );
  }

  try {
    const ip = getClientIp(request);

    const ipCheck = checkIpAllowed(ip);
    if (!ipCheck.ok) {
      return NextResponse.json({ error: ipCheck.reason }, { status: 403 });
    }

    const lockout = await getLockoutStatus(ip);
    if (lockout.locked) {
      return lockoutResponse(lockout.retryAfterSec);
    }

    const { email, password, username } = await request.json();
    const loginEmail = (email || username || "").trim();
    const result = await validateLogin(loginEmail, password);

    if (!result.ok) {
      const failed = await recordFailedLogin(ip);
      if (failed.locked) {
        return lockoutResponse(failed.retryAfterSec);
      }
      const remaining = MAX_LOGIN_ATTEMPTS - failed.failures;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `ایمیل یا رمز عبور اشتباه است. ${remaining} تلاش باقی‌مانده.`
              : "ایمیل یا رمز عبور اشتباه است",
        },
        { status: 401 }
      );
    }

    await clearLoginFailures(ip);

    if (result.requires2fa) {
      return NextResponse.json({
        ok: true,
        requires2fa: true,
        pendingToken: createPending2FAToken(loginEmail.toLowerCase()),
      });
    }

    const token = createSessionToken(loginEmail.toLowerCase());
    return sessionCookie(token);
  } catch {
    return NextResponse.json({ error: "خطا در ورود" }, { status: 500 });
  }
}

