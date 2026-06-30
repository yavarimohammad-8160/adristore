import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import {
  getAllManagedSeries,
  readManagedSeriesData,
  saveManagedSeries,
  validateManagedSeriesInput,
  type ManagedSeriesRecord,
} from "@/lib/series-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const data = await readManagedSeriesData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const validation = validateManagedSeriesInput(body.series);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const saved = await saveManagedSeries(validation.series);
    revalidateStorefront();
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در ذخیره" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const current = await getAllManagedSeries();
    const item = body as Partial<ManagedSeriesRecord>;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) {
      return NextResponse.json({ error: "نام سری الزامی است" }, { status: 400 });
    }

    const next: ManagedSeriesRecord[] = [
      ...current,
      {
        id: item.id?.trim() || label.toLowerCase().replace(/\s+/g, "-"),
        label,
        emoji: item.emoji?.trim() || "🃏",
        accent: item.accent || "blue",
        matchTerms: Array.isArray(item.matchTerms)
          ? item.matchTerms.map((t) => String(t).trim()).filter(Boolean)
          : [label],
        pattern: item.pattern?.trim(),
        enabled: item.enabled !== false,
        order: current.length,
      },
    ];

    const saved = await saveManagedSeries(next);
    revalidateStorefront();
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در افزودن سری" }, { status: 500 });
  }
}
