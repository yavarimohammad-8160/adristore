import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminEmail } from "@/lib/admin-auth";
import {
  clearPendingTotpSetup,
  disableTotp,
  enableTotp,
  getAdminSettings,
  getPendingTotpSetup,
  getTotpSecret,
  storePendingTotpSetup,
} from "@/lib/admin-settings";
import { buildTotpUri, createTotpSecret, verifyTotpCode } from "@/lib/totp";
import { createTotpQrDataUrl } from "@/lib/totp-qr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getAdminSettings();
    return NextResponse.json({
      enabled: Boolean(settings.totpEnabled && settings.totpSecret),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const action = body.action as string;

    if (action === "setup") {
      const secret = createTotpSecret();
      const uri = buildTotpUri(secret, getAdminEmail());
      const qrDataUrl = await createTotpQrDataUrl(uri);
      await storePendingTotpSetup(secret);
      return NextResponse.json({ secret, uri, qrDataUrl });
    }

    if (action === "cancel") {
      await clearPendingTotpSetup();
      return NextResponse.json({ ok: true });
    }

    if (action === "enable") {
      const pendingSecret = await getPendingTotpSetup();
      const secret = String(body.secret || pendingSecret || "");
      const code = String(body.code || "");

      if (!secret || !code || !verifyTotpCode(secret, code)) {
        return NextResponse.json({ error: "کد تأیید نامعتبر است" }, { status: 400 });
      }

      await enableTotp(secret);
      return NextResponse.json({ ok: true, enabled: true });
    }

    if (action === "disable") {
      const secret = await getTotpSecret();
      if (!secret || !verifyTotpCode(secret, String(body.code || ""))) {
        return NextResponse.json({ error: "کد تأیید نامعتبر است" }, { status: 400 });
      }
      await disableTotp();
      return NextResponse.json({ ok: true, enabled: false });
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

