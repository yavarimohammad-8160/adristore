import type { Product } from "./types";

/** Manual descriptions/photos may win; stock always belongs to the live vendor. */
export function mergeBasalamWithManual(live: Product[], manual: Product[]): Product[] {
  const byId = new Map(live.map((p) => [p.id, p]));
  const manualIds = new Set(manual.map((p) => p.id));
  return [
    ...manual.map((p) => {
      const fresh = byId.get(p.id);
      return fresh ? { ...p, inventory: fresh.inventory, status: fresh.status } : p;
    }),
    ...live.filter((p) => !manualIds.has(p.id)),
  ];
}

/** Refresh only stock, preserving every existing product and its mirrored media. */
export function refreshCatalogInventory(existing: Product[], live: Product[]): Product[] {
  const byId = new Map(live.map((p) => [p.id, p]));
  return existing.map((product) => {
    if (product.id >= 900_000_000) return product;
    const fresh = byId.get(product.id);
    if (!fresh || typeof fresh.inventory !== "number" || !Number.isFinite(fresh.inventory)) {
      throw new Error(`No verified Basalam inventory for product ${product.id}; catalog not written`);
    }
    return { ...product, inventory: Math.max(0, fresh.inventory), status: fresh.status };
  });
}
