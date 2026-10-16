import { NextResponse } from "next/server";
import { readStaticProducts } from "@/lib/static-catalog";
import { buildTeamPool, type TeamCard, type TeamPosition } from "@/lib/team-positions";
import { readManualPositions } from "@/lib/team-positions-manual";

export const dynamic = "force-dynamic";

const POSITIONS: TeamPosition[] = ["GK", "DEF", "MID", "FWD", "COACH"];
let cached: { at: number; pool: TeamCard[] } | null = null;
const TTL_MS = 60_000;

async function getPool(): Promise<TeamCard[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.pool;
  const [products, manual] = await Promise.all([readStaticProducts(), readManualPositions()]);
  cached = { at: Date.now(), pool: buildTeamPool(products, manual) };
  return cached.pool;
}

/** GET /api/team-pool?pos=DEF  or  ?ids=1,2,3  — cards for the team builder, loaded on demand. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pos = url.searchParams.get("pos") as TeamPosition | null;
  const ids = url.searchParams.get("ids");
  const pool = await getPool();
  let cards: TeamCard[];
  if (pos && POSITIONS.includes(pos)) cards = pool.filter((c) => c.position === pos);
  else if (ids) {
    const want = new Set(ids.split(",").slice(0, 20).map(Number));
    cards = pool.filter((c) => want.has(c.id));
  } else return NextResponse.json({ error: "pos or ids required" }, { status: 400 });
  return NextResponse.json(
    { cards },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } }
  );
}
