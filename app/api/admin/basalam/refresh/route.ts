import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveBasalamStats } from "@/lib/manual-products";
import { searchVendorProducts, isBasalamConfigured, getVendor } from "@/lib/basalam";
import { rebuildVideoIndex } from "@/lib/video-index";
import { revalidateStorefront } from "@/lib/revalidate-storefront";

export const dynamic = "force-dynamic";

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
    
    // این خط را نگه می‌داریم برای احتیاط (اگر از کش Next.js هم استفاده کرده باشید)
    revalidateStorefront();

    // ---- کدی که باید اضافه شود ----
    // ارسال درخواست به کلودفلر برای Rebuild شدن سایت و اجرای مجدد prebuild-static-data.ts
    if (process.env.CLOUDFLARE_DEPLOY_HOOK_URL) {
      try {
        await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK_URL, { method: "POST" });
        console.log("Deploy hook triggered successfully.");
      } catch (hookError) {
        console.error("Failed to trigger deploy hook:", hookError);
      }
    }
    // --------------------------------

    return NextResponse.json({
      ok: true,
      total: stats.total,
      totalValue: stats.totalValue,
      lastRefreshed: stats.lastRefreshed,
      message: "بروزرسانی با موفقیت انجام شد. سایت در حال بیلد مجدد است و دقایقی دیگر محصولات جدید نمایش داده می‌شوند."
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در بروزرسانی باسلام" }, { status: 500 });
  }
}
