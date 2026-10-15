import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { readStaticProducts } from "@/lib/static-catalog";
import {
  isKimdiCard,
  keywordPosition,
  LOW_OCR_CONFIDENCE,
  playerNameFromTitle,
  resolvePosition,
  type ManualPositionValue,
} from "@/lib/team-positions";
import { MANUAL_VALUES, readManualPositions, setManualPosition } from "@/lib/team-positions-manual";

export const dynamic = "force-dynamic";

function unauthorized(e: unknown) {
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: e instanceof Error ? e.message : "خطا" }, { status: 500 });
}

export async function GET() {
  try {
    await requireAdmin();
    const [products, manual] = await Promise.all([readStaticProducts(), readManualPositions()]);
    const cards = products
      .filter((p) => isKimdiCard(p.title || "") || manual[String(p.id)])
      .map((p) => {
        const r = resolvePosition(p, manual);
        const needsReview =
          r.source === "keyword" ||
          r.source === "none" ||
          (r.source === "ocr" && !r.excluded && (r.confidence ?? 100) < LOW_OCR_CONFIDENCE);
        return {
          id: p.id,
          title: p.title,
          name: playerNameFromTitle(p.title || ""),
          image: p.photo?.sm || p.photo?.md || p.photo?.remote || null,
          position: r.position,
          excluded: r.excluded,
          source: r.source,
          confidence: r.confidence ?? null,
          ocrText: r.ocrText ?? null,
          keywordGuess: keywordPosition(p.title || ""),
          needsReview,
        };
      })
      // drop non-player cards nobody touched (config exclude)
      .filter((c) => c.source !== "ocr" || !c.excluded || manual[String(c.id)]);
    return NextResponse.json({ cards, remaining: cards.filter((c) => c.needsReview).length });
  } catch (e) {
    return unauthorized(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { id?: unknown; position?: unknown };
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
    }
    const position = body.position === null ? null : (body.position as ManualPositionValue);
    if (position !== null && !MANUAL_VALUES.includes(position)) {
      return NextResponse.json({ error: "پوزیشن نامعتبر" }, { status: 400 });
    }
    await setManualPosition(id, position);
    revalidatePath("/team-builder");
    return NextResponse.json({ ok: true, id, position });
  } catch (e) {
    return unauthorized(e);
  }
}
