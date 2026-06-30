import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getBasalamStats } from "@/lib/manual-products";
import { getVendor } from "@/lib/basalam";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getBasalamStats();
    const vendor = await getVendor();
    const connected = !!vendor;
    return NextResponse.json({
      connected,
      total: stats.total,
      lastRefreshed: stats.lastRefreshed,
      totalValue: stats.totalValue ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

