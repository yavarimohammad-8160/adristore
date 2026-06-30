import type { Product } from "./types";
import type { ManagedSeriesRecord } from "./series-store";

export type SeriesAccent = "green" | "gold" | "blue" | "red" | "silver";

export interface ProductSeries {
  id: string;
  label: string;
  emoji: string;
  accent: SeriesAccent;
  count?: number;
  /** Substrings matched against product.title for filtering */
  matchTerms?: string[];
  /** Managed series appear first in dropdown */
  managed?: boolean;
}

const KIMDI_SHOW_RE = /کیمدی\s*شو/i;
const SERIES_IN_TITLE_RE =
  /سری\s+([^–—-]+?)(?:\s*[-–—]\s*|\s*[-–—]|\s*$)/i;

export function normalizeSeriesId(id: string | null | undefined): string {
  if (!id || typeof id !== "string") return "all";
  return id.trim().normalize("NFKC").toLowerCase();
}

export function seriesIdFromLabel(label: string): string {
  const normalized = normalizeSeriesId(label)
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "");

  if (!normalized) return "series";
  if (KIMDI_SHOW_RE.test(label)) return "kimdi-show";
  return normalized.slice(0, 96);
}

export function formatSeriesLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "سایر کارت‌ها";
  if (KIMDI_SHOW_RE.test(trimmed)) return "کیمدی شو";
  if (/^سری\s/i.test(trimmed)) return trimmed;
  return `سری ${trimmed}`;
}

export function managedMatchTerms(series: ManagedSeriesRecord): string[] {
  const terms = new Set<string>();
  for (const term of series.matchTerms) {
    if (term) terms.add(term);
  }
  if (series.label) {
    terms.add(series.label);
    const withoutPrefix = series.label.replace(/^سری\s+/i, "").trim();
    if (withoutPrefix) terms.add(withoutPrefix);
  }
  return [...terms].filter(Boolean);
}

function managedSeriesToMatcher(series: ManagedSeriesRecord): RegExp | null {
  if (!series.pattern) return null;
  try {
    return new RegExp(series.pattern, "i");
  } catch {
    return null;
  }
}

export function findManagedSeriesById(
  seriesId: string,
  managedSeries?: ManagedSeriesRecord[]
): ManagedSeriesRecord | undefined {
  if (!managedSeries?.length) return undefined;
  const normalized = normalizeSeriesId(seriesId);
  return managedSeries.find((s) => normalizeSeriesId(s.id) === normalized);
}

function titleMatchesManagedSeries(title: string, series: ManagedSeriesRecord): boolean {
  const matcher = managedSeriesToMatcher(series);
  if (matcher?.test(title)) return true;
  return managedMatchTerms(series).some((term) => term.length > 1 && title.includes(term));
}

/** Build title substrings used for series filtering. */
export function buildMatchTerms(
  label: string,
  id: string,
  managedSeries?: ManagedSeriesRecord[]
): string[] {
  const managed = findManagedSeriesById(id, managedSeries);
  if (managed) return managedMatchTerms(managed);

  const terms = new Set<string>();
  const trimmed = label.trim();
  if (trimmed && trimmed !== "همه محصولات") {
    terms.add(trimmed);
    const withoutPrefix = trimmed.replace(/^سری\s+/i, "").trim();
    if (withoutPrefix) terms.add(withoutPrefix);
  }

  return [...terms].filter(Boolean);
}

/** Parse series from product title (dynamic «سری …» extraction). */
export function extractSeriesFromTitle(title: string): { id: string; label: string } {
  const trimmed = title.trim();
  if (!trimmed) return { id: "other", label: "سایر کارت‌ها" };

  if (KIMDI_SHOW_RE.test(trimmed)) {
    return { id: "kimdi-show", label: "کیمدی شو" };
  }

  const match = trimmed.match(SERIES_IN_TITLE_RE);
  if (match?.[1]) {
    const raw = match[1].trim();
    if (raw) {
      return { id: seriesIdFromLabel(raw), label: formatSeriesLabel(raw) };
    }
  }

  return { id: "other", label: "سایر کارت‌ها" };
}

export function resolveProductSeries(
  product: Pick<Product, "title" | "seriesId">,
  managedSeries?: ManagedSeriesRecord[]
): { id: string; label: string } {
  if (product.seriesId) {
    const managed = findManagedSeriesById(product.seriesId, managedSeries);
    if (managed) {
      return { id: managed.id, label: managed.label };
    }
    return { id: product.seriesId, label: formatSeriesLabel(product.seriesId) };
  }
  return extractSeriesFromTitle(product.title);
}

export function emojiForSeries(label: string): string {
  const text = label.toLowerCase();
  if (/کیمدی\s*شو|شو/.test(text)) return "🎬";
  if (/امضا|signature/.test(text)) return "✍️";
  if (/راک|rock/.test(text)) return "🎸";
  if (/رویال|طلایی|gold|royal/.test(text)) return "👑";
  if (/بیسیک|basic|معمولی/.test(text)) return "🃏";
  if (/ادونس|advance/.test(text)) return "⚡";
  if (/پرایم|prime|پرمیوم|premium/.test(text)) return "💎";
  if (/best\s*moment|لحظه/.test(text)) return "⭐";
  if (/underrated/.test(text)) return "💫";
  if (/کاپیتان|captain/.test(text)) return "©️";
  if (/دوقولو|دوقلو/.test(text)) return "👥";
  if (/ترنسفر|transfer/.test(text)) return "🔄";
  if (/سیلور|silver|لیمیتد|limited/.test(text)) return "🥈";
  if (/جام\s*جهانی|world\s*cup|wc/.test(text)) return "🏆";
  if (/باشگاه|club|team/.test(text)) return "🏟️";
  if (/سرمربی|manager/.test(text)) return "🧢";
  return "🃏";
}

export function accentForSeries(label: string): SeriesAccent {
  const text = label.toLowerCase();
  if (/امضا|طلایی|رویال|gold|prime|پرایم|best\s*moment/.test(text)) return "gold";
  if (/کیمدی\s*شو|راک|rock|underrated/.test(text)) return "red";
  if (/جام\s*جهانی|ترنسفر|ادونس|کاپیتان|دوقولو|دوقلو/.test(text)) return "green";
  if (/سیلور|سایر|other/.test(text)) return "silver";
  return "blue";
}

/** Build dropdown by scanning all product titles for unique series names. */
export function buildSeriesCatalog(products: Product[]): ProductSeries[] {
  const counts = new Map<string, { label: string; count: number }>();
  let otherCount = 0;

  for (const product of products) {
    if (!product?.title && !product?.seriesId) continue;

    const { id, label } = resolveProductSeries(product);
    if (id === "other") {
      otherCount++;
      continue;
    }

    const entry = counts.get(id);
    if (entry) {
      entry.count++;
      if (label.length > entry.label.length) entry.label = label;
    } else {
      counts.set(id, { label, count: 1 });
    }
  }

  const dynamic = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, { label, count }]) => ({
      id,
      label,
      emoji: emojiForSeries(label),
      accent: accentForSeries(label),
      count,
      matchTerms: buildMatchTerms(label, id),
    }));

  if (otherCount > 0) {
    dynamic.push({
      id: "other",
      label: "سایر کارت‌ها",
      emoji: "📦",
      accent: "silver",
      count: otherCount,
      matchTerms: [],
    });
  }

  return [
    {
      id: "all",
      label: "همه محصولات",
      emoji: "⚽",
      accent: "green",
      count: products.length,
      matchTerms: [],
    },
    ...dynamic,
  ];
}

export function getProductSeriesById(
  id: string,
  catalog: ProductSeries[]
): ProductSeries | undefined {
  const normalized = normalizeSeriesId(id);
  return catalog.find((series) => normalizeSeriesId(series.id) === normalized);
}

/** Match by explicit seriesId, managed terms, parsed id, or catalog matchTerms. */
export function productMatchesSeries(
  product: Pick<Product, "title" | "seriesId">,
  seriesId: string,
  seriesMeta?: ProductSeries | null,
  managedSeries?: ManagedSeriesRecord[]
): boolean {
  if (!seriesId || seriesId === "all") return true;

  const title = (product.title || "").trim();
  if (!title && !product.seriesId) return false;

  const targetId = normalizeSeriesId(seriesId);

  if (product.seriesId && normalizeSeriesId(product.seriesId) === targetId) {
    return true;
  }

  const managed = findManagedSeriesById(seriesId, managedSeries);
  if (managed && title && titleMatchesManagedSeries(title, managed)) {
    return true;
  }

  const resolved = resolveProductSeries(product);
  if (normalizeSeriesId(resolved.id) === targetId) {
    return true;
  }

  const terms =
    seriesMeta?.matchTerms && seriesMeta.matchTerms.length > 0
      ? seriesMeta.matchTerms
      : buildMatchTerms(seriesMeta?.label ?? "", seriesId, managedSeries);

  return terms.some((term) => term.length > 1 && title.includes(term));
}

export function filterProductsBySeries(
  products: Product[],
  seriesId: string,
  catalog: ProductSeries[]
): Product[] {
  const safeId = seriesId?.trim() || "all";
  if (safeId === "all") return products;

  const meta = getProductSeriesById(safeId, catalog);
  return products.filter((p) => productMatchesSeries(p, safeId, meta));
}

export function parseSeriesCatalogJson(
  json: string | null | undefined,
  managedSeries?: ManagedSeriesRecord[]
): ProductSeries[] {
  if (!json || typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ProductSeries =>
          !!item &&
          typeof item === "object" &&
          typeof (item as ProductSeries).id === "string" &&
          typeof (item as ProductSeries).label === "string"
      )
      .map((item) => ({
        ...item,
        matchTerms:
          item.matchTerms && item.matchTerms.length > 0
            ? item.matchTerms
            : buildMatchTerms(item.label, item.id, managedSeries),
      }));
  } catch {
    return [];
  }
}