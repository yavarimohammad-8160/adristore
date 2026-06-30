import { unstable_cache } from "next/cache";
import { searchVendorProducts } from "./products";
import { buildSeriesCatalog, type ProductSeries } from "./product-series";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";

async function fetchProductSeriesCatalog(): Promise<ProductSeries[]> {
  const { products } = await searchVendorProducts({ page: 1, per_page: 10000 });
  return buildSeriesCatalog(products);
}

/** Series dropdown — auto-detected from product titles. */
export const getProductSeriesCatalog = unstable_cache(
  fetchProductSeriesCatalog,
  [CACHE_TAGS.catalog, CACHE_TAGS.series, "product-series-dynamic-v4"],
  { revalidate: REVALIDATE.storefront, tags: [CACHE_TAGS.catalog, CACHE_TAGS.series] }
);