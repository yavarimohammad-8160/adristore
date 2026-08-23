"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/types";
import {
  buildMatchTerms,
  filterProductsBySeries,
  getProductSeriesById,
  parseSeriesCatalogJson,
  type ProductSeries,
} from "@/lib/product-series";
import { productMatchesSearch } from "@/lib/product-search";
import { STATIC_DATA } from "@/lib/static-data";
import { sortProductsNewestFirst } from "@/lib/product-sort";

const PER_PAGE = 24;

const DEFAULT_SERIES_CATALOG: ProductSeries[] = [
  {
    id: "all",
    label: "همه محصولات",
    emoji: "⚽",
    accent: "green",
    count: 0,
    matchTerms: [],
  },
];

interface HomeCatalogContextValue {
  series: string;
  search: string;
  seriesCatalog: ProductSeries[];
  products: Product[];
  filteredTotal: number;
  filtering: boolean;
  loading: boolean;
  catalogReady: boolean;
  hasMore: boolean;
  seriesMeta: ProductSeries | undefined;
  setSeries: (seriesId: string) => void;
  setSearch: (query: string) => void;
  clearFilters: () => void;
  scrollToProductsGrid: () => void;
  loadMore: () => void;
}

const HomeCatalogContext = createContext<HomeCatalogContextValue | null>(null);

function asProductArray(value: Product[] | null | undefined): Product[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function enrichSeriesCatalog(catalog: ProductSeries[]): ProductSeries[] {
  return catalog.map((item) => ({
    ...item,
    matchTerms:
      item.matchTerms && item.matchTerms.length > 0
        ? item.matchTerms
        : buildMatchTerms(item.label, item.id),
  }));
}

function resolveInitialSeries(
  seriesCatalogJson?: string | null,
  seriesCatalog?: ProductSeries[] | null
): ProductSeries[] {
  const fromJson = parseSeriesCatalogJson(seriesCatalogJson);
  if (fromJson.length > 0) return fromJson;

  if (Array.isArray(seriesCatalog) && seriesCatalog.length > 0) {
    return enrichSeriesCatalog(seriesCatalog);
  }

  return DEFAULT_SERIES_CATALOG;
}

function asSeriesId(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || value.trim() === "") return "all";
  return value.trim();
}

function asPageNumber(value: number | null | undefined): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

function paginateProducts(pool: Product[], page: number): Product[] {
  return asProductArray(pool).slice(0, asPageNumber(page) * PER_PAGE);
}

function scrollToProductsGrid() {
  requestAnimationFrame(() => {
    document.getElementById("products-grid")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

async function fetchSeriesList(): Promise<ProductSeries[]> {
  const staticRes = await fetch(STATIC_DATA.productSeries);
  if (staticRes.ok) {
    const data = await staticRes.json();
    const list = parseSeriesCatalogJson(JSON.stringify(data?.series ?? []));
    if (list.length > 0) return list;
  }

  const res = await fetch("/api/product-series", { cache: "no-store" });
  if (!res.ok) throw new Error(`series fetch failed: ${res.status}`);
  const data = await res.json();
  const list = parseSeriesCatalogJson(JSON.stringify(data?.series ?? []));
  return list.length > 0 ? list : DEFAULT_SERIES_CATALOG;
}

async function fetchProductCatalog(): Promise<{
  products: Product[];
  series: ProductSeries[];
}> {
  for (const url of [STATIC_DATA.homeCatalog, STATIC_DATA.productsCatalog]) {
    const staticRes = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
    if (!staticRes.ok) continue;
    const data = await staticRes.json();
    const products = asProductArray(data?.products);
    if (products.length === 0) continue;
    const series = parseSeriesCatalogJson(
      JSON.stringify(data?.series ?? [])
    );
    return {
      products,
      series: series.length > 0 ? series : DEFAULT_SERIES_CATALOG,
    };
  }

  const res = await fetch("/api/home-catalog", { cache: "no-store" });
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  const data = await res.json();
  const series = parseSeriesCatalogJson(JSON.stringify(data?.series ?? []));
  return {
    products: asProductArray(data?.products),
    series: series.length > 0 ? series : DEFAULT_SERIES_CATALOG,
  };
}

interface HomeCatalogProviderProps {
  initialProducts?: Product[] | null;
  initialTotal?: number;
  seriesCatalog?: ProductSeries[] | null;
  seriesCatalogJson?: string | null;
  children: ReactNode;
}

export function HomeCatalogProvider({
  initialProducts,
  initialTotal = 0,
  seriesCatalog,
  seriesCatalogJson,
  children,
}: HomeCatalogProviderProps) {
  const [series, setSeriesState] = useState("all");
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>(() => asProductArray(initialProducts));
  const [seriesList, setSeriesList] = useState<ProductSeries[]>(() =>
    resolveInitialSeries(seriesCatalogJson, seriesCatalog)
  );
  const [catalogReady, setCatalogReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [totalCount, setTotalCount] = useState(
    typeof initialTotal === "number" && initialTotal >= 0 ? initialTotal : 0
  );

  // 1) Load series list immediately (small payload → dropdown populates fast)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await fetchSeriesList();
        if (!cancelled && list.length > 0) setSeriesList(list);
      } catch (error) {
        console.error("Series list fetch failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load full product catalog for filtering
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const load = async () => {
      attempts += 1;
      try {
        const { products, series } = await fetchProductCatalog();
        if (cancelled) return;

        if (products.length > 0) {
          setCatalog(products);
          setSeriesList(enrichSeriesCatalog(series));
          setTotalCount(products.length);
          setCatalogReady(true);
        }
      } catch (error) {
        console.error("Product catalog fetch failed:", error);
        if (!cancelled && attempts < 3) {
          window.setTimeout(load, 600 * attempts);
          return;
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSeries = asSeriesId(series);
  const seriesMeta = getProductSeriesById(activeSeries, seriesList);

  const sourceCatalog = catalogReady ? catalog : asProductArray(initialProducts);

  const filteredPool = useMemo(() => {
    let pool =
      activeSeries === "all"
        ? sourceCatalog
        : filterProductsBySeries(sourceCatalog, activeSeries, seriesList);

    const query = search.trim();
    if (query) {
      pool = pool.filter((product) => productMatchesSearch(product, query));
    }

    return sortProductsNewestFirst(pool);
  }, [activeSeries, sourceCatalog, seriesList, search]);

  const filteredTotal = useMemo(() => {
    if (activeSeries === "all" && !search.trim()) {
      return catalogReady ? catalog.length : totalCount || sourceCatalog.length;
    }
    return filteredPool.length;
  }, [
    activeSeries,
    search,
    catalogReady,
    catalog.length,
    totalCount,
    sourceCatalog.length,
    filteredPool,
  ]);

  const products = useMemo(
    () => paginateProducts(filteredPool, page),
    [filteredPool, page]
  );

  const hasMore = products.length < filteredTotal;

  const setSeries = useCallback((nextSeries: string | null | undefined) => {
    const safeNext = asSeriesId(nextSeries);
    setSeriesState((current) => (current === safeNext ? current : safeNext));
    setPage(1);
  }, []);

  const setSearch = useCallback((query: string) => {
    setSearchState(query);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSeriesState("all");
    setSearchState("");
    setPage(1);
  }, []);

  // Strip stray query/hash on mount (keep in-memory filters intact for search UX).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, search: locationSearch, hash } = window.location;
    const onHome = pathname === "/" || pathname === "";

    if (onHome && (locationSearch || hash)) {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setPage((prev) => asPageNumber(prev) + 1);
    setLoading(false);
  }, [loading, hasMore]);

  const value = useMemo(
    () => ({
      series: activeSeries,
      search,
      seriesCatalog: seriesList,
      products: asProductArray(products),
      filteredTotal,
      filtering:
        bootstrapping &&
        (activeSeries !== "all" || search.trim() !== "") &&
        !catalogReady &&
        filteredPool.length === 0,
      loading,
      catalogReady,
      hasMore,
      seriesMeta,
      setSeries,
      setSearch,
      clearFilters,
      scrollToProductsGrid,
      loadMore,
    }),
    [
      activeSeries,
      search,
      seriesList,
      products,
      filteredTotal,
      bootstrapping,
      catalogReady,
      loading,
      hasMore,
      seriesMeta,
      setSeries,
      setSearch,
      clearFilters,
      loadMore,
      filteredPool.length,
    ]
  );

  return (
    <HomeCatalogContext.Provider value={value}>{children}</HomeCatalogContext.Provider>
  );
}

export function useHomeCatalog(): HomeCatalogContextValue {
  const context = useContext(HomeCatalogContext);
  if (!context) {
    throw new Error("useHomeCatalog must be used within HomeCatalogProvider");
  }
  return context;
}