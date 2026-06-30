"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useHomeCatalog } from "@/components/HomeCatalogProvider";
import { getProductSeriesById, type ProductSeries } from "@/lib/product-series";
import { ChevronDown, Layers, Loader2, Trophy } from "lucide-react";

interface SeriesCategoryDropdownProps {
  value: string;
  onChange: (seriesId: string) => void;
  disabled?: boolean;
  variant?: "default" | "top";
}

const FALLBACK: ProductSeries[] = [
  { id: "all", label: "همه محصولات", emoji: "⚽", accent: "green", count: 0 },
];

export function SeriesCategoryDropdown({
  value,
  onChange,
  disabled,
  variant = "default",
}: SeriesCategoryDropdownProps) {
  const { seriesCatalog, catalogReady } = useHomeCatalog();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const options =
    Array.isArray(seriesCatalog) && seriesCatalog.length > 0 ? seriesCatalog : FALLBACK;
  const selected = getProductSeriesById(value, options) ?? options[0];
  const isTop = variant === "top";
  const isLoading = !catalogReady && options.length <= 1;

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function pick(seriesId: string) {
    onChange(seriesId);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`series-filter series-filter--menu ${isTop ? "series-filter--top" : ""}`}
    >
      {!isTop && (
        <div className="series-filter__label" id="series-filter-label">
          <Trophy className="h-4 w-4 text-[#fbbf24] shrink-0" aria-hidden />
          <span>سری کارت</span>
          <Layers className="h-3.5 w-3.5 text-[#86efac] opacity-80 shrink-0" aria-hidden />
        </div>
      )}

      <div
        className={`series-filter__select-wrap${open ? " series-filter__select-wrap--open" : ""}`}
      >
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="انتخاب سری کارت"
          aria-labelledby={isTop ? undefined : "series-filter-label"}
          onClick={() => setOpen((prev) => !prev)}
          className={`series-filter__trigger series-filter__menu-btn w-full rounded-xl border-2 px-4 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#3b82f6]/65 focus-visible:border-[#22c55e] focus-visible:ring-[#22c55e]/35 focus-visible:outline-none focus-visible:ring-2 ${
            isTop
              ? "series-filter__trigger--top h-11 min-h-11 border-[#22c55e]/40 bg-[#0f172a]/95"
              : "h-12 min-h-12 border-[#1e40af]/50 bg-[#0a0f1e]/95"
          }`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5 text-right">
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#93c5fd]" aria-hidden />
            ) : (
              <span className="text-base shrink-0" aria-hidden>
                {selected.emoji}
              </span>
            )}
            <span className="truncate">{selected.label}</span>
            {selected.count != null && selected.id !== "all" && (
              <span className="mr-auto text-[0.65rem] font-bold text-white/45 shrink-0">
                {selected.count}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#93c5fd] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="لیست سری کارت‌ها"
            className="series-filter__menu-panel"
          >
            {options.map((item) => {
              const active = item.id === selected.id;
              return (
                <li key={item.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`series-filter__menu-item ${active ? "is-active" : ""}`}
                    onClick={() => pick(item.id)}
                  >
                    <span className="text-base shrink-0" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.count != null && item.id !== "all" && (
                      <span className="mr-auto text-[0.65rem] font-bold text-white/40 shrink-0">
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}