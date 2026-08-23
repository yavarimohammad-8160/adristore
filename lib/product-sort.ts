import type { Product } from "./types";

/** Newest first: created_at when present, otherwise higher Basalam id. */
export function sortProductsNewestFirst(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const da = Date.parse(a.created_at || "") || 0;
    const db = Date.parse(b.created_at || "") || 0;
    if (db !== da) return db - da;
    return (b.id || 0) - (a.id || 0);
  });
}

export function newestTimestamp(product: Product): number {
  return Date.parse(product.created_at || "") || product.id || 0;
}
