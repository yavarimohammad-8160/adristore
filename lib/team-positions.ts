import positionsConfig from "@/data/player-positions.json";
import type { Product } from "./types";

export type TeamPosition = "GK" | "DEF" | "MID" | "FWD" | "COACH";
type Override =
  | TeamPosition
  | "EXCLUDE"
  | {
      position: TeamPosition;
      /** Detailed role printed on the card, e.g. "CB" / "ST" (from offline OCR). */
      subPosition?: string;
      source?: string;
      ocrText?: string;
      confidence?: number;
      keywordGuess?: TeamPosition | null;
    };

interface PositionsConfig {
  overrides: Record<string, Override>;
  excludeKeywords: string[];
  keywords: Record<TeamPosition, string[]>;
}

const config = positionsConfig as unknown as PositionsConfig;
/** Coach first (titles like "سری سرمربی"), then GK→FWD so specific roles win. */
const ORDER: TeamPosition[] = ["COACH", "GK", "DEF", "MID", "FWD"];

export function normalizeFa(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c\u200f\-–]/g, "");
}

const normalizedKeywords = ORDER.map(
  (pos) => [pos, config.keywords[pos].map(normalizeFa).filter(Boolean)] as const
);

/** The player-name segment of a Kimdi title ("کیمدی کارت ... سری X - نام"). */
export function playerNameFromTitle(title: string): string {
  const cleaned = title.replace(/با کد QR اصل|Overall\s*\d+/g, "");
  const parts = cleaned.split(/[-–]/);
  return (parts.length > 1 ? parts[parts.length - 1] : cleaned).trim();
}

export function classifyPosition(product: Pick<Product, "id" | "title">): TeamPosition | null {
  const override = config.overrides[String(product.id)];
  if (override) {
    if (override === "EXCLUDE") return null;
    return typeof override === "string" ? override : override.position;
  }

  const title = product.title || "";
  if (!title.trim().startsWith("کیمدی کارت")) return null;
  if (config.excludeKeywords.some((k) => title.includes(k))) return null;

  const name = normalizeFa(playerNameFromTitle(title));
  for (const [pos, keys] of normalizedKeywords) {
    if (keys.some((k) => name.includes(k))) return pos;
  }
  return null;
}

export interface TeamCard {
  id: number;
  title: string;
  name: string;
  price: number;
  inventory: number;
  position: TeamPosition;
  product: Product;
}

export function buildTeamPool(products: Product[]): TeamCard[] {
  const out: TeamCard[] = [];
  for (const p of products) {
    const position = classifyPosition(p);
    if (!position) continue;
    out.push({
      id: p.id,
      title: p.title,
      name: playerNameFromTitle(p.title),
      price: p.price,
      inventory: p.inventory ?? 0,
      position,
      // keep cart payload small: drop long text fields
      product: {
        ...p,
        description: undefined,
        brief: undefined,
        photos: undefined,
        photo: p.photo ? { md: p.photo.md, sm: p.photo.sm, remote: p.photo.remote } : p.photo,
      },
    });
  }
  // in-stock first, then cheaper first
  return out.sort(
    (a, b) => Number(b.inventory > 0) - Number(a.inventory > 0) || a.price - b.price
  );
}

export const FORMATIONS = {
  "4-4-2": { DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { DEF: 4, MID: 3, FWD: 3 },
  "4-2-3-1": { DEF: 4, MID: 5, FWD: 1 },
} as const;
export type FormationKey = keyof typeof FORMATIONS;

export interface Slot {
  key: string;
  position: TeamPosition;
  /** 0..100, top = attack */
  x: number;
  y: number;
}

function row(pos: TeamPosition, count: number, y: number, prefix: string): Slot[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `${prefix}${i}`,
    position: pos,
    x: ((i + 1) * 100) / (count + 1),
    y,
  }));
}

export function formationSlots(f: FormationKey): Slot[] {
  const gk = row("GK", 1, 88, "gk");
  const def = row("DEF", 4, 70, "d");
  if (f === "4-2-3-1") {
    return [
      ...gk, ...def,
      ...row("MID", 2, 52, "dm"),
      ...row("MID", 3, 34, "am"),
      ...row("FWD", 1, 14, "f"),
    ];
  }
  const { MID, FWD } = FORMATIONS[f];
  return [...gk, ...def, ...row("MID", MID, 45, "m"), ...row("FWD", FWD, 18, "f")];
}

export const POSITION_LABEL: Record<TeamPosition, string> = {
  GK: "دروازه‌بان",
  DEF: "مدافع",
  MID: "هافبک",
  FWD: "مهاجم",
  COACH: "مربی",
};
