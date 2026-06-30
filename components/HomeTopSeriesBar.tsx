"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X } from "lucide-react";
import { SeriesCategoryDropdown } from "@/components/SeriesCategoryDropdown";
import { useHomeCatalog } from "@/components/HomeCatalogProvider";

export function HomeTopSeriesBar() {
  const {
    series,
    search,
    seriesMeta,
    filtering,
    loading,
    setSeries,
    setSearch,
    scrollToProductsGrid,
  } = useHomeCatalog();
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        if (searchInput.trim()) scrollToProductsGrid();
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, setSearch, scrollToProductsGrid]);

  function handleSeriesChange(nextSeries: string) {
    setSeries(nextSeries);
    if (nextSeries !== "all") {
      scrollToProductsGrid();
    }
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  return (
    <div className="home-top-series" aria-label="فیلتر سری کارت‌ها">
      <div className="home-top-series__inner max-w-[1440px] mx-auto px-4 sm:px-5">
        <div className="home-top-series__bar">
          <div className="home-top-series__intro">
            <Sparkles className="h-4 w-4 text-[#fbbf24] shrink-0" aria-hidden />
            <span className="home-top-series__tag">جام جهانی ۲۰۲۶</span>
            <span className="home-top-series__divider" aria-hidden />
            <span className="home-top-series__title">انتخاب سری کارت</span>
          </div>

          <div className="home-top-series__controls">
            <SeriesCategoryDropdown
              value={series}
              onChange={handleSeriesChange}
              disabled={loading}
              variant="top"
            />

            <label className="home-top-series__search-field">
              <Search className="h-4 w-4 shrink-0 text-[#93c5fd]" aria-hidden />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="جستجو: مسی، بیلینگهام..."
                className="home-top-series__search-input"
                aria-label="جستجو در کارت‌ها"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="home-top-series__search-clear"
                  aria-label="پاک کردن جستجو"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>
        </div>

        {(series !== "all" || search.trim()) && (
          <p className="home-top-series__hint">
            {series !== "all" && seriesMeta ? (
              <>
                <span aria-hidden>{seriesMeta.emoji}</span>
                سری: {seriesMeta.label}
              </>
            ) : null}
            {series !== "all" && search.trim() ? " • " : null}
            {search.trim() ? (
              <>
                جستجو: <span className="text-white">{search.trim()}</span>
              </>
            ) : null}
            {filtering ? " — در حال بارگذاری..." : null}
            {search.trim() || series !== "all" ? (
              <>
                {" "}
                <Link href="/products" className="text-[#93c5fd] hover:underline">
                  جستجوی پیشرفته
                </Link>
              </>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}