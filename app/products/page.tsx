"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { filterProductCatalog } from "@/lib/catalog-search";
import { STATIC_DATA } from "@/lib/static-data";
import type { Product, ProductListResponse } from "@/lib/types";
import { KimdiBadge } from "@/components/KimdiBadge";
import { Loader2, Search } from "lucide-react";
import { formatNumber } from "@/lib/format";

let catalogCache: Product[] | null = null;

async function loadCatalogProducts(): Promise<Product[]> {
  if (catalogCache) return catalogCache;

  const staticRes = await fetch(`${STATIC_DATA.productsCatalog}?v=${Date.now()}`, {
    cache: "no-store",
  });
  if (staticRes.ok) {
    const data = await staticRes.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    catalogCache = products;
    return products;
  }

  const res = await fetch("/api/products?full=1&per_page=10000");
  if (!res.ok) throw new Error("Failed to fetch catalog");
  const data = await res.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  catalogCache = products;
  return products;
}

async function fetchProducts(params: Record<string, string>): Promise<ProductListResponse> {
  try {
    const all = await loadCatalogProducts();
    if (all.length > 0) {
      return filterProductCatalog(all, {
        page: Number(params.page || "1"),
        per_page: Number(params.per_page || "30"),
        search: params.search,
        min_price: params.min_price ? Number(params.min_price) : undefined,
        max_price: params.max_price ? Number(params.max_price) : undefined,
        sort: params.sort as "price:asc" | "price:desc" | "newest" | undefined,
        category: params.category,
        filter: params.filter,
        series: params.series,
      });
    }
  } catch {
    /* fall through to API */
  }

  const qs = new URLSearchParams(params);
  const res = await fetch(`/api/products?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function ProductsContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [filter, setFilter] = useState(searchParams.get("filter") || "");
  const [minPrice, setMinPrice] = useState(Number(searchParams.get("min_price") || 0));
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get("max_price") || 5000000));
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high">("newest");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState<Product[]>([]);
  const [searchDebounce, setSearchDebounce] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadProducts = useCallback(
    async (p: number, reset = false) => {
      setLoading(true);
      try {
        const sortParam =
          sort === "price-low" ? "price:asc" : sort === "price-high" ? "price:desc" : "newest";

        const params: Record<string, string> = {
          page: String(p),
          per_page: "30",
        };
        if (searchDebounce.trim()) params.search = searchDebounce.trim();
        if (category) params.category = category;
        if (filter) params.filter = filter;
        if (minPrice > 0) params.min_price = String(minPrice);
        if (maxPrice < 5000000) params.max_price = String(maxPrice);
        if (sortParam) params.sort = sortParam;

        const res = await fetchProducts(params);
        setData(res);

        if (reset || p === 1) {
          setAllLoaded(res.products);
        } else {
          setAllLoaded((prev) => {
            const ids = new Set(prev.map((x) => x.id));
            return [...prev, ...res.products.filter((x) => !ids.has(x.id))];
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [searchDebounce, category, filter, minPrice, maxPrice, sort]
  );

  useEffect(() => {
    setPage(1);
    loadProducts(1, true);
  }, [searchDebounce, category, filter, minPrice, maxPrice, sort, loadProducts]);

  useEffect(() => {
    if (page > 1) loadProducts(page);
  }, [page, loadProducts]);

  const displayProducts = useMemo(() => allLoaded, [allLoaded]);
  const hasMore = data ? page < data.total_pages : false;

  function handleLoadMore() {
    if (!loading && hasMore) setPage((p) => p + 1);
  }

  function resetFilters() {
    setSearch("");
    setCategory("");
    setFilter("");
    setMinPrice(0);
    setMaxPrice(5000000);
    setSort("newest");
    setPage(1);
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-5 py-8 sm:py-10 wc-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <KimdiBadge size="md" className="mb-2" />
          <div className="text-[#22c55e] text-sm font-bold mb-1">⚽ کلکسیون Kimdi</div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight">
            تمام کارت‌های فوتبال Kimdi
          </h1>
          <p className="text-sm text-white/60 mt-2 font-semibold">
            {data ? `${formatNumber(data.total)} کارت اورجینال — آدری‌استور / باسلام` : "در حال بارگذاری..."}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-xl font-bold">
            پاک کردن فیلترها
          </Button>
          <a
            href="https://basalam.com/adristore"
            target="_blank"
            className="btn-fun btn-primary inline-flex items-center h-9 rounded-xl px-4 text-sm"
          >
            باسلام
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-gradient-to-br from-[#1a1f35] to-[#0f1428] p-4 sm:p-5 rounded-2xl border-2 border-[#3b82f6]/20">
        <div className="md:col-span-5">
          <label className="block text-xs mb-1.5 text-[#3b82f6] font-bold flex items-center gap-1">
            <Search className="h-3.5 w-3.5" /> جستجو در {data?.total ? formatNumber(data.total) : "..."} کارت
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="مثال: مسی، رونالدو، بارسلونا، امضا..."
            className="filter-input h-12 font-semibold"
          />
        </div>

        <div className="md:col-span-4">
          <label className="block text-xs mb-1.5 text-[#eab308] font-bold">محدوده قیمت (تومان)</label>
          <div className="px-1 pt-3 pb-1">
            <Slider
              min={0}
              max={5000000}
              step={100000}
              value={[minPrice, maxPrice]}
              onValueChange={(vals) => {
                const [min, max] = Array.isArray(vals) ? vals : [vals, vals];
                setMinPrice(min);
                setMaxPrice(max);
              }}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs tabular-nums text-white/60 mt-1 font-bold">
            <div>{formatNumber(minPrice)}</div>
            <div>{formatNumber(maxPrice)}</div>
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs mb-1.5 text-[#ef4444] font-bold">مرتب‌سازی</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "price-low" | "price-high")}
            className="filter-input w-full h-12 px-3 text-sm font-semibold"
          >
            <option value="newest">جدیدترین</option>
            <option value="price-low">ارزان‌ترین</option>
            <option value="price-high">گران‌ترین</option>
          </select>
        </div>
      </div>

      {(category || filter) && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-white/60">فیلتر فعال:</span>
          <span className="px-4 py-1.5 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#86efac] text-sm font-bold">
            {category === "player" ? "بازیکن" : category === "team" ? "تیم" : "قیمت"}: {filter}
          </span>
        </div>
      )}

      {displayProducts.length > 0 ? (
        <>
          <div className="product-grid">
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 mt-10">
            <p className="text-sm text-white/50 font-semibold">
              نمایش {formatNumber(displayProducts.length)} از{" "}
              {data?.total ? formatNumber(data.total) : "۰"} کارت
            </p>
            {hasMore || loading ? (
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                size="lg"
                className="btn-fun btn-blue touch-target w-full sm:w-auto sm:min-w-[220px] rounded-2xl min-h-[48px] h-12 font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" /> در حال بارگذاری...
                  </>
                ) : (
                  "بارگذاری کارت‌های بیشتر ⬇️"
                )}
              </Button>
            ) : (
              <p className="text-sm text-[#22c55e] font-bold">همه کارت‌ها بارگذاری شد! 🎉</p>
            )}
          </div>
        </>
      ) : loading ? (
        <div className="text-center py-20">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#3b82f6]" />
          <p className="mt-4 text-white/60 font-semibold">در حال جستجو در کاتالوگ...</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">😢</p>
          <p className="text-white/60 font-semibold">هیچ کارتی با این فیلترها پیدا نشد.</p>
          <Button onClick={resetFilters} className="mt-4 btn-fun btn-yellow rounded-xl font-bold">
            حذف فیلترها
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}