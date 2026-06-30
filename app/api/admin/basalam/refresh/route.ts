import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveBasalamStats } from "@/lib/manual-products";
import { searchVendorProducts, isBasalamConfigured, getVendor } from "@/lib/basalam";
import { rebuildVideoIndex } from "@/lib/video-index";
import { revalidateStorefront } from "@/lib/revalidate-storefront";

export async function POST() {
  try {
    await requireAdmin();
    if (!isBasalamConfigured()) {
      return NextResponse.json({ error: "اتصال به باسلام پیکربندی نشده است" }, { status: 400 });
    }

    const vendor = await getVendor();
    if (!vendor) {
      return NextResponse.json({ error: "اتصال به باسلام برقرار نشد" }, { status: 502 });
    }

    const { total, products } = await searchVendorProducts({ page: 1, per_page: 1200 });
    const totalValue = products.reduce((sum, p) => sum + p.price * (p.inventory || 0), 0);

    const stats = await saveBasalamStats(total, { totalValue, connected: true });
    await rebuildVideoIndex();
    revalidateStorefront();

    return NextResponse.json({
      ok: true,
      total: stats.total,
      totalValue: stats.totalValue,
      lastRefreshed: stats.lastRefreshed,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در بروزرسانی باسلام" }, { status: 500 });
  }
}