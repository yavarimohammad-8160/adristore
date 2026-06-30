"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface Props {
  products: Product[];
}

export function FeaturedCarousel({ products }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  useEffect(() => {
    updateButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons);
    return () => el.removeEventListener("scroll", updateButtons);
  }, [products]);

  useEffect(() => {
    const timer = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
      el.scrollBy({ left: atEnd ? -el.scrollWidth : 280, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#22c55e]/30 bg-gradient-to-br from-[#1a1f2e] via-[#0f1419] to-[#1a1025] p-4 sm:p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide gallery-thumbs"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 snap-start w-[min(72vw,220px)] sm:w-[220px]">
              <ProductCard product={product} hideStandardRarity />
            </div>
          ))}
        </div>
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="touch-target absolute -right-1 sm:-right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#ef4444] text-white shadow-lg active:scale-95 transition-all flex items-center justify-center"
          aria-label="بعدی"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="touch-target absolute -left-1 sm:-left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#3b82f6] text-white shadow-lg active:scale-95 transition-all flex items-center justify-center"
          aria-label="قبلی"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}