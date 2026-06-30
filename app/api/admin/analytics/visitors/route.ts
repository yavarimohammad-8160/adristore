import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getBasalamVisitAnalytics } from "@/lib/basalam-visit-analytics";
import { getWebsiteVisitAnalytics } from "@/lib/traffic-analytics";

export async function GET() {
  try {
    await requireAdmin();
    const [website, basalam] = await Promise.all([
      Promise.resolve(getWebsiteVisitAnalytics()),
      getBasalamVisitAnalytics(),
    ]);

    return NextResponse.json({ website, basalam });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}