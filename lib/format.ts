/**
 * Basalam API returns prices in Rial.
 * Store and display in Toman: divide by 10 (1 Toman = 10 Rial).
 */
export function toDisplayPrice(apiRial: unknown): number {
  const n = Number(apiRial);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n / 10);
}

/** Convert display Toman back to API Rial for filter params */
export function toApiPrice(displayToman: number): number {
  return Math.round(displayToman * 10);
}

/** Persian digits with grouping via toLocaleString */
export function formatNumber(displayToman: number): string {
  return Math.round(displayToman).toLocaleString("fa-IR");
}

/** Full price label, e.g. ۱٬۲۹۰٬۰۰۰ تومان (value already in Toman) */
export function formatPrice(displayToman: number, withCurrency = true): string {
  const formatted = Math.round(displayToman).toLocaleString("fa-IR");
  return withCurrency ? `${formatted} تومان` : formatted;
}

/** @deprecated alias */
export function normalizePrice(raw: unknown): number {
  return toDisplayPrice(raw);
}