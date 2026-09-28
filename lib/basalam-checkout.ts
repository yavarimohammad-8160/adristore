import type { Product } from "./types";

export interface CheckoutItem {
  product: Product;
  quantity: number;
}

export function getBasalamProductUrl(product: Product): string {
  // Catalog products store a Basalam purchase URL in `url`. Zero stock must
  // not follow it; the storefront product page stays browsable.
  if (product.inventory !== undefined && product.inventory <= 0) {
    return `/products/${product.id}/`;
  }
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

  const availableItems = items.filter(({ product }) =>
    !(product.inventory !== undefined && product.inventory <= 0)
  );
  if (availableItems.length === 0) {
    return getBasalamProductUrl(items[0].product);
  }

  if (availableItems.length === 1) {
    const { product, quantity } = availableItems[0];
    const base = getBasalamProductUrl(product);
    return quantity > 1 ? `${base}?quantity=${quantity}` : base;
  }

  const payload = availableItems
    .map(({ product, quantity }) => `${product.id}:${Math.max(1, quantity)}`)
    .join(",");

  return `https://basalam.com/cart?products=${encodeURIComponent(payload)}&vendor=adristore`;
}
