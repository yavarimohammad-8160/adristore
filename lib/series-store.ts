import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";
import type { SeriesAccent } from "./product-series";

export interface ManagedSeriesRecord {
  id: string;
  label: string;
  emoji: string;
  accent: SeriesAccent;
  /** Substrings matched against product titles */
  matchTerms: string[];
  /** Optional regex source for title detection */
  pattern?: string;
  enabled: boolean;
  order: number;
}

export interface ManagedSeriesData {
  series: ManagedSeriesRecord[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SERIES_FILE = path.join(DATA_DIR, "managed-series.json");

export const DEFAULT_MANAGED_SERIES: ManagedSeriesRecord[] = [
  {
    id: "امضا",
    label: "سری امضا",
    emoji: "✍️",
    accent: "gold",
    matchTerms: ["سری امضا", "امضا Signature", "امضا Signatures", "امضا"],
    pattern: "سری\\s+امضا",
    enabled: true,
    order: 0,
  },
  {
    id: "جام-جهانی",
    label: "جام جهانی",
    emoji: "🏆",
    accent: "green",
    matchTerms: ["سری جام جهانی", "جام جهانی"],
    pattern: "سری\\s+جام\\s*جهانی",
    enabled: true,
    order: 1,
  },
  {
    id: "ادونس",
    label: "ادونس",
    emoji: "⚡",
    accent: "green",
    matchTerms: ["سری ادونس", "ادونس"],
    pattern: "سری\\s+ادونس",
    enabled: true,
    order: 2,
  },
  {
    id: "کاپیتان",
    label: "کاپیتان",
    emoji: "©️",
    accent: "green",
    matchTerms: ["سری کاپیتان", "کاپیتان"],
    pattern: "سری\\s+کاپیتان",
    enabled: true,
    order: 3,
  },
  {
    id: "best-moment",
    label: "Best Moment",
    emoji: "⭐",
    accent: "gold",
    matchTerms: ["سری Best Moment", "Best Moment"],
    pattern: "سری\\s+best\\s*moment",
    enabled: true,
    order: 4,
  },
  {
    id: "underrated",
    label: "UnderRated",
    emoji: "💫",
    accent: "red",
    matchTerms: ["سری UnderRated", "UnderRated"],
    pattern: "سری\\s+underrated",
    enabled: true,
    order: 5,
  },
  {
    id: "راک-استار",
    label: "راک استار",
    emoji: "🎸",
    accent: "red",
    matchTerms: ["سری راک استار", "راک استار"],
    pattern: "سری\\s+راک\\s*استار",
    enabled: true,
    order: 6,
  },
  {
    id: "بیسیک",
    label: "بیسیک",
    emoji: "🃏",
    accent: "blue",
    matchTerms: ["سری بیسیک", "بیسیک"],
    pattern: "سری\\s+بیسیک",
    enabled: true,
    order: 7,
  },
  {
    id: "دوقولو",
    label: "دوقولو",
    emoji: "👥",
    accent: "green",
    matchTerms: ["دوقلوهای جادویی", "دوقلو", "دوقولو"],
    pattern: "سری\\s+دوقلو",
    enabled: true,
    order: 8,
  },
  {
    id: "kimdi-show",
    label: "کیمدی شو",
    emoji: "🎬",
    accent: "red",
    matchTerms: ["کیمدی شو"],
    pattern: "کیمدی\\s*شو",
    enabled: true,
    order: 9,
  },
  {
    id: "پرایم",
    label: "سری پرایم",
    emoji: "💎",
    accent: "gold",
    matchTerms: ["سری پرایم", "پرایم"],
    pattern: "سری\\s+پرایم",
    enabled: true,
    order: 10,
  },
];

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function slugifySeriesId(label: string): string {
  const normalized = label
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "");
  return normalized || "series";
}

function normalizeRecord(raw: Partial<ManagedSeriesRecord>, index: number): ManagedSeriesRecord | null {
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) return null;

  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().normalize("NFKC").toLowerCase().replace(/\s+/g, "-")
      : slugifySeriesId(label);

  const matchTerms = Array.isArray(raw.matchTerms)
    ? raw.matchTerms.map((t) => String(t).trim()).filter(Boolean)
    : [label, label.replace(/^سری\s+/i, "").trim()].filter(Boolean);

  const accent = (raw.accent as SeriesAccent) || "blue";
  const emoji = typeof raw.emoji === "string" && raw.emoji.trim() ? raw.emoji : "🃏";

  return {
    id,
    label,
    emoji,
    accent,
    matchTerms,
    pattern: typeof raw.pattern === "string" ? raw.pattern.trim() : undefined,
    enabled: raw.enabled !== false,
    order: typeof raw.order === "number" ? raw.order : index,
  };
}

function defaultData(): ManagedSeriesData {
  return {
    series: DEFAULT_MANAGED_SERIES.map((s, i) => ({ ...s, order: i })),
    updatedAt: new Date().toISOString(),
  };
}

export async function readManagedSeriesData(): Promise<ManagedSeriesData> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SERIES_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ManagedSeriesData>;
    const series = Array.isArray(parsed.series)
      ? parsed.series
          .map((item, index) => normalizeRecord(item as Partial<ManagedSeriesRecord>, index))
          .filter((item): item is ManagedSeriesRecord => !!item)
      : [];

    if (series.length === 0) return defaultData();

    return {
      series,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultData();
  }
}

async function writeManagedSeriesData(data: ManagedSeriesData) {
  await ensureDataDir();
  await fs.writeFile(SERIES_FILE, JSON.stringify(data, null, 2), "utf8");
}

const getCachedManagedSeriesData = unstable_cache(
  readManagedSeriesData,
  [CACHE_TAGS.series, "managed-series-v2"],
  { revalidate: REVALIDATE.storefront, tags: [CACHE_TAGS.series, CACHE_TAGS.catalog] }
);

export const getManagedSeriesData = cache(getCachedManagedSeriesData);

export async function getManagedSeries(): Promise<ManagedSeriesRecord[]> {
  const data = await getManagedSeriesData();
  return data.series.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
}

export async function getAllManagedSeries(): Promise<ManagedSeriesRecord[]> {
  const data = await getManagedSeriesData();
  return [...data.series].sort((a, b) => a.order - b.order);
}

export function validateManagedSeriesInput(
  series: unknown
): { ok: true; series: ManagedSeriesRecord[] } | { ok: false; error: string } {
  if (!Array.isArray(series)) {
    return { ok: false, error: "فرمت سری‌ها نامعتبر است" };
  }

  const ids = new Set<string>();
  const normalized: ManagedSeriesRecord[] = [];

  for (let i = 0; i < series.length; i++) {
    const item = normalizeRecord(series[i] as Partial<ManagedSeriesRecord>, i);
    if (!item) {
      return { ok: false, error: `سری در ردیف ${i + 1} نامعتبر است` };
    }
    if (ids.has(item.id)) {
      return { ok: false, error: `شناسه تکراری: ${item.id}` };
    }
    ids.add(item.id);
    normalized.push({ ...item, order: i });
  }

  return { ok: true, series: normalized };
}

export async function saveManagedSeries(series: ManagedSeriesRecord[]): Promise<ManagedSeriesData> {
  const validation = validateManagedSeriesInput(series);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const next: ManagedSeriesData = {
    series: validation.series,
    updatedAt: new Date().toISOString(),
  };

  await writeManagedSeriesData(next);
  revalidateTag(CACHE_TAGS.series, "default");
  revalidateTag(CACHE_TAGS.catalog, "default");
  return next;
}

