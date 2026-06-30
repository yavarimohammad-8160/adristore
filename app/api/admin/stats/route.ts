import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAllManualProducts,
  getBasalamStats,
  computeManualTotalValue,
  manualToProduct,
} from "@/lib/manual-products";
import { searchVendorProducts } from "@/lib/basalam";

export async function GET() {
  try {
    await requireAdmin();
    const manual = await getAllManualProducts();
    const basalam = await getBasalamStats();
    const manualValue = computeManualTotalValue(manual);

    const recentManual = [...manual]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        title: r.title,
        price: r.price,
        inventory: r.inventory,
        source: "manual" as const,
        photo: r.photos[0] ?? null,
        updated_at: r.updated_at,
      }));

    let recentBasalam: Array<{
      id: number;
      title: string;
      price: number;
      inventory?: number;
      source: "basalam";
      photo: ReturnType<typeof manualToProduct>["photo"];
    }> = [];

    try {
      const res = await searchVendorProducts({ page: 1, per_page: 5, sort: "newest" });
      recentBasalam = res.products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        inventory: p.inventory,
        source: "basalam" as const,
        photo: p.photo,
      }));
    } catch {
      /* ignore */
    }

    const recent = [...recentManual, ...recentBasalam].slice(0, 8);

    return NextResponse.json({
      manual: manual.length,
      basalam: basalam.total,
      total: manual.length + basalam.total,
      manualValue,
      basalamValue: basalam.totalValue ?? 0,
      totalValue: manualValue + (basalam.totalValue ?? 0),
      basalamLastRefreshed: basalam.lastRefreshed,
      basalamConnected: basalam.connected ?? true,
      recent,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}