"use client";

import Link from "next/link";
import { useState } from "react";
import { PLAYERS, TEAMS, PRICE_RANGES } from "@/lib/categories";
import { useHomeCatalog } from "@/components/HomeCatalogProvider";

type Tab = "player" | "team" | "price";

const TAB_STYLES: Record<Tab, string> = {
  player: "from-[#1e40af] to-[#1d4ed8]",
  team: "from-[#22c55e] to-[#16a34a]",
  price: "from-[#fbbf24] to-[#d97706]",
};

export function CategoryFilter() {
  const [active, setActive] = useState<Tab>("player");
  const { search, setSearch, setSeries, scrollToProductsGrid } = useHomeCatalog();

  const items =
    active === "player" ? PLAYERS.slice(0, 10) : active === "team" ? TEAMS.slice(0, 10) : PRICE_RANGES;

  function handleNameFilter(name: string) {
    setSeries("all");
    setSearch(name);
    scrollToProductsGrid();
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border-2 border-white/10 bg-gradient-to-br from-[#1e1b4b]/60 to-[#0f172a]/80 p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
        {(["player", "team", "price"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`touch-target px-4 sm:px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              active === tab
                ? `bg-gradient-to-r ${TAB_STYLES[tab]} text-white shadow-lg scale-105`
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {tab === "player" ? "⚽ بازیکن" : tab === "team" ? "🏆 تیم" : "💰 قیمت"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {active === "price"
          ? PRICE_RANGES.map((range) => (
              <Link
                key={range.label}
                href={`/products?category=price&filter=${encodeURIComponent(range.label)}&min_price=${range.min}&max_price=${range.max}`}
                className="touch-target inline-flex items-center px-4 sm:px-5 py-2.5 rounded-full bg-[#fbbf24]/20 border-2 border-[#fbbf24]/50 text-[#fde047] font-semibold text-sm hover:bg-[#fbbf24]/40 active:scale-95 transition-all"
              >
                {range.label}
              </Link>
            ))
          : items.map((item) => {
              const label = String(item);
              const isActive = search.trim() === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleNameFilter(label)}
                  className={`touch-target inline-flex items-center px-4 sm:px-5 py-2.5 rounded-full border-2 font-semibold text-sm active:scale-95 transition-all ${
                    active === "player"
                      ? isActive
                        ? "bg-[#1e40af]/55 border-[#3b82f6] text-white shadow-md"
                        : "bg-[#1e40af]/20 border-[#1e40af]/50 text-[#93c5fd] hover:bg-[#1e40af]/40"
                      : isActive
                        ? "bg-[#22c55e]/55 border-[#22c55e] text-white shadow-md"
                        : "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#86efac] hover:bg-[#22c55e]/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
      </div>
    </div>
  );
}