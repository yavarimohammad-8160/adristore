import { unstable_cache } from "next/cache";
import type { Product } from "./types";
import { getVendorProducts, searchVendorProducts } from "./products";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";

const RONALDO_TERMS = ["رونالدو", "ronaldo", "cristiano", "کریستیانو"];
const MESSI_TERMS = ["مسی", "messi", "لیونل", "lionel"];

export type HeroShowcaseVariant = "messi" | "ronaldo" | "default";

export interface HeroShowcaseSlot {
  product: Product | null;
  variant: HeroShowcaseVariant;
}

function dedupeById(products: Product[]): Product[] {
  const seen = new Set<number>();
  return products.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function matchesPlayer(product: Product, terms: string[]): boolean {
  const hay = `${product.title} ${product.description ?? ""} ${product.brief ?? ""}`.toLowerCase();
  return terms.some((t) => hay.includes(t.toLowerCase()));
}

function scoreStarProduct(product: Product, terms: string[]): number {
  let score = 0;
  const title = product.title.toLowerCase();

  if (product.photo?.lg) score += 12;
  else if (product.photo?.md) score += 10;
  else if (product.photo?.sm || product.photo?.original) score += 6;

  if (product.photos && product.photos.length > 1) score += 4;

  for (const term of terms) {
    if (title.includes(term.toLowerCase())) score += 10;
  }

  if (title.includes("kimdi")) score += 5;

  return score;
}

function findBestMatch(
  pool: Product[],
  terms: string[],
  exclude: Set<number>
): Product | null {
  const candidates = pool.filter((p) => !exclude.has(p.id) && matchesPlayer(p, terms));
  if (!candidates.length) return null;
  return [...candidates].sort(
    (a, b) => scoreStarProduct(b, terms) - scoreStarProduct(a, terms)
  )[0];
}

async function fetchHeroStarProductsUncached(): Promise<{
  ronaldo: Product | null;
  messi: Product | null;
  pool: Product[];
}> {
  const [ronaldoSearch, messiSearch, main] = await Promise.all([
    searchVendorProducts({ search: "رونالدو", per_page: 10 }),
    searchVendorProducts({ search: "مسی", per_page: 10 }),
    getVendorProducts({ page: 1, per_page: 24 }),
  ]);

  const pool = dedupeById([
    ...ronaldoSearch.products,
    ...messiSearch.products,
    ...main.products,
  ]);

  const exclude = new Set<number>();
  const messi = findBestMatch(pool, MESSI_TERMS, exclude);
  if (messi) exclude.add(messi.id);
  const ronaldo = findBestMatch(pool, RONALDO_TERMS, exclude);

  return { ronaldo, messi, pool };
}

export const fetchHeroStarProducts = unstable_cache(
  fetchHeroStarProductsUncached,
  [CACHE_TAGS.hero],
  { revalidate: REVALIDATE.storefront, tags: [CACHE_TAGS.hero] }
);

const MESSI_SLOT = 2;
const RONALDO_SLOT = 3;

export function buildHeroShowcaseSlots(
  pool: Product[],
  stars: { ronaldo: Product | null; messi: Product | null }
): HeroShowcaseSlot[] {
  const slots: HeroShowcaseSlot[] = Array.from({ length: 6 }, () => ({
    product: null,
    variant: "default" as HeroShowcaseVariant,
  }));

  const used = new Set<number>();

  if (stars.messi) {
    slots[MESSI_SLOT] = { product: stars.messi, variant: "messi" };
    used.add(stars.messi.id);
  }

  if (stars.ronaldo) {
    slots[RONALDO_SLOT] = { product: stars.ronaldo, variant: "ronaldo" };
    used.add(stars.ronaldo.id);
  }

  const fillers = pool.filter((p) => !used.has(p.id));
  let fillerIndex = 0;

  for (let i = 0; i < 6; i++) {
    if (!slots[i].product && fillerIndex < fillers.length) {
      slots[i] = { product: fillers[fillerIndex++], variant: "default" };
    }
  }

  return slots;
}