"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useHomeCatalog } from "@/components/HomeCatalogProvider";
import { formatNumber } from "@/lib/format";

export function HomeProductGrid() {
  const {
    series,
    search,
    products = [],
    filteredTotal = 0,
    filtering,
    loading,
    hasMore,
    seriesMeta,
    clearFilters,
    loadMore,
  } = useHomeCatalog();

  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <>
      {filtering ? (
        <div className="flex items-center justify-center gap-2 py-16 text-white/60 font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-[#3b82f6]" />
          در حال فیلتر محصولات...
        </div>
      ) : safeProducts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/15 bg-white/5 py-14 text-center">
          <p className="text-lg font-black text-white/75">
            {search.trim() ? "هیچ کارتی پیدا نشد" : "محصولی در این سری یافت نشد"}
          </p>
          <p className="mt-2 text-sm text-white/45">
            {search.trim()
              ? `نتیجه‌ای برای «${search.trim()}» پیدا نشد. املای دیگر یا نام لاتین را امتحان کنید.`
              : "سری دیگری انتخاب کنید یا همه محصولات را ببینید."}
          </p>
          {search.trim() || series !== "all" ? (
            <Button
              onClick={clearFilters}
              className="mt-5 btn-fun btn-yellow rounded-xl font-bold"
            >
              حذف فیلترها
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="product-grid">
          {safeProducts.map((product) => (
            <ProductCard key={product.id} product={product} hideStandardRarity />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-4 mt-12">
        <p className="text-sm text-white/50 font-semibold">
          نمایش {formatNumber(safeProducts.length)} از {formatNumber(filteredTotal)} کارت
          {search.trim() ? ` • جستجو: ${search.trim()}` : ""}
          {series !== "all" && seriesMeta ? ` • ${seriesMeta.label}` : ""}
        </p>
        {hasMore && !filtering && safeProducts.length > 0 ? (
          <Button
            onClick={loadMore}
            disabled={loading}
            size="lg"
            className="btn-fun btn-red touch-target w-full sm:w-auto sm:min-w-[240px] rounded-2xl min-h-[48px] h-12 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                در حال بارگذاری...
              </>
            ) : (
              "بارگذاری کارت‌های بیشتر ⬇️"
            )}
          </Button>
        ) : safeProducts.length > 0 ? (
          <p className="text-sm text-[#22c55e] font-bold">همه کارت‌های این بخش بارگذاری شد! 🎉</p>
        ) : null}
        <Link
          href="/products"
          className="text-sm text-[#93c5fd] hover:underline font-bold"
        >
          مشاهده کاتالوگ کامل با فیلتر →
        </Link>
      </div>
    </>
  );
}