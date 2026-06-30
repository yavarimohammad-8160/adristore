import type { Product } from "./types";

export interface CheckoutItem {
  product: Product;
  quantity: number;
}

export function getBasalamProductUrl(product: Product): string {
  return product.url || `https://basalam.com/p/${product.id}`;
}

/**
 * Basalam has no documented public API to pre-fill a multi-item cart.
 * Single item → product page (fastest path to purchase).
 * Multiple items → cart page with product id hints in query (best-effort).
 */
export function buildBasalamCheckoutUrl(items: CheckoutItem[]): string {
  if (items.length === 0) {
    return "https://basalam.com/adristore";
  }

  if (items.length === 1) {
    const { product, quantity } = items[0];
    const base = getBasalamProductUrl(product);
    return quantity > 1 ? `${base}?quantity=${quantity}` : base;
  }

  const payload = items
    .map(({ product, quantity }) => `${product.id}:${Math.max(1, quantity)}`)
    .join(",");

  return `https://basalam.com/cart?products=${encodeURIComponent(payload)}&vendor=adristore`;
}