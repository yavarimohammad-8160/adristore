import { searchVendorProducts } from "./products";
import { buildSeriesCatalog } from "./product-series";
import type { Product } from "./types";

export interface HomeCatalogData {
  catalogProducts: Product[];
  seriesCatalog: ReturnType<typeof buildSeriesCatalog>;
  total: number;
}

/** Single source for homepage grid + series dropdown (same product set). */
export async function getHomeCatalogData(): Promise<HomeCatalogData> {
  try {
    const { products, total } = await searchVendorProducts({
      page: 1,
      per_page: 10000,
    });
    const catalogProducts = Array.isArray(products) ? products : [];

    return {
      catalogProducts,
      seriesCatalog: buildSeriesCatalog(catalogProducts),
      total: typeof total === "number" ? total : catalogProducts.length,
    };
  } catch (error) {
    console.error("getHomeCatalogData error:", error);
    return {
      catalogProducts: [],
      seriesCatalog: buildSeriesCatalog([]),
      total: 0,
    };
  }
}