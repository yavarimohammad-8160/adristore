import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyPending2FAToken,
  ADMIN_SESSION_COOKIE,
  getAdminSecret,
} from "@/lib/admin-auth";
import { getTotpSecret } from "@/lib/admin-settings";
import { verifyTotpCode } from "@/lib/totp";
import { checkIpAllowed, clearLoginFailures, getClientIp } from "@/lib/admin-security";

export const dynamic = "force-dynamic";

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

    const { pendingToken, code } = await request.json();
    if (!pendingToken || !code) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const pending = verifyPending2FAToken(String(pendingToken));
    if (!pending) {
      return NextResponse.json({ error: "نشست ورود منقضی شده. دوباره وارد شوید." }, { status: 401 });
    }

    const secret = await getTotpSecret();
    if (!secret || !verifyTotpCode(secret, String(code))) {
      return NextResponse.json({ error: "کد تأیید اشتباه است" }, { status: 401 });
    }

    await clearLoginFailures(ip);

    const token = createSessionToken(pending.email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "خطا در تأیید" }, { status: 500 });
  }
}

