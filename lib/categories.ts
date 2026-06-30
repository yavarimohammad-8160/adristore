import { textMatchesQuery } from "@/lib/product-search";

export const PLAYERS = [
  "مسی",
  "رونالدو",
  "هالند",
  "امباپه",
  "بنزما",
  "صلاح",

  "مودریچ",
  "بیلینگهام",
  "وینیسیوس",
  "یامال",
  "پله",
  "مارادونا",
  "زیدان",
  "رونالدینیو",
  "کریستیانو",
  "لیونل",
];

export const TEAMS = [
  "بارسلونا",
  "رئال مادرید",
  "منچستر",
  "لیورپول",
  "چلسی",
  "آرسنال",
  "بایرن",
  "پاریس",
  "یوونتوس",
  "اینتر",
  "میلان",
  "آرسنال",
  "اتلتیکو",
  "آژاکس",
  "دورتموند",
];

export const PRICE_RANGES = [
  { label: "زیر ۵۰۰ هزار", min: 0, max: 500000 },
  { label: "۵۰۰ تا ۱ میلیون", min: 500000, max: 1000000 },
  { label: "۱ تا ۲ میلیون", min: 1000000, max: 2000000 },
  { label: "بالای ۲ میلیون", min: 2000000, max: 5000000 },
];

export type CategoryType = "player" | "team" | "price" | "all";

export function matchesCategory(
  title: string,
  price: number,
  category: CategoryType,
  filter?: string
): boolean {
  if (category === "player" && filter) {
    return textMatchesQuery(title, filter);
  }
  if (category === "team" && filter) {
    return textMatchesQuery(title, filter);
  }
  if (category === "price" && filter) {
    const range = PRICE_RANGES.find((r) => r.label === filter);
    if (range) return price >= range.min && price <= range.max;
  }
  if (category === "player" && !filter) {
    return PLAYERS.some((p) => textMatchesQuery(title, p));
  }
  if (category === "team" && !filter) {
    return TEAMS.some((team) => textMatchesQuery(title, team));
  }
  return true;
}