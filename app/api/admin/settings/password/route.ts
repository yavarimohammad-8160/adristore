import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { changeAdminPassword } from "@/lib/admin-settings";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { currentPassword, newPassword } = await request.json();
    const result = await changeAdminPassword(currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در تغییر رمز" }, { status: 500 });
  }
}