"use client";

import Link from "next/link";
import type { HeroShowcaseSlot } from "@/lib/hero-showcase";
import { getPhotoUrl } from "@/lib/basalam";
import { buildProductImageAlt } from "@/lib/seo";
import { productPath } from "@/lib/slug";
import { KimdiBadge } from "@/components/KimdiBadge";
import { formatPrice } from "@/lib/format";

const GLOW_COLORS = {
  messi: "#00b4ff",
  ronaldo: "#ff2d55",
  default: ["#00e676", "#ffd700", "#ff3333", "#3388ff", "#c084fc", "#22d3ee"],
} as const;

interface HeroShowcaseProps {
  slots: HeroShowcaseSlot[];
}

function glowForSlot(slot: HeroShowcaseSlot, index: number): string {
  const { variant } = slot;
  if (variant === "messi") return GLOW_COLORS.messi;
  if (variant === "ronaldo") return GLOW_COLORS.ronaldo;
  return GLOW_COLORS.default[index % GLOW_COLORS.default.length];
}

function ShowcaseCard({
  slot,
  index,
  className = "",
}: {
  slot: HeroShowcaseSlot;
  index: number;
  className?: string;
}) {
  const { product, variant } = slot;
  const isStar = variant === "messi" || variant === "ronaldo";
  const color = glowForSlot(slot, index);
  const img = product ? getPhotoUrl(product.photo, product.id) : null;
  const href = product ? productPath(product.id, product.title) : "/products";

  const slotClass = [
    "hero-showcase__slot",
    isStar && "hero-showcase__slot--star",
    variant === "messi" && "hero-showcase__slot--messi",
    variant === "ronaldo" && "hero-showcase__slot--ronaldo",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      prefetch
      className={slotClass}
      style={
        {
          "--slot-i": index,
          "--slot-abs": isStar ? 0.35 : Math.abs(index - 2.5),
        } as React.CSSProperties
      }
      tabIndex={product ? 0 : -1}
    >
      <div className="hero-showcase__card">
        <div
          className="hero-showcase__inner"
          style={{ "--glow-color": color } as React.CSSProperties}
        >
          <div className="hero-showcase__face hero-showcase__front">
            {img ? (
              <img
                src={img}
                alt={buildProductImageAlt(product!.title)}
                className="hero-showcase__img"
              />
            ) : (
              <div
                className="hero-showcase__placeholder"
                style={{ background: `linear-gradient(145deg, ${color}55, ${color}99)` }}
              >
                <span className="text-3xl">🃏</span>
              </div>
            )}
            <div className="hero-showcase__shine" />
            {isStar && <div className="hero-showcase__halo" aria-hidden />}
            <KimdiBadge size="sm" className="absolute top-2 left-2 z-10" />
          </div>
          <div className="hero-showcase__face hero-showcase__back">
            <KimdiBadge size="sm" className="mb-2" />
            <p className="text-xs font-bold line-clamp-3 leading-snug text-white">
              {product?.title ?? "کارت فوتبال Kimdi"}
            </p>
            {product && (
              <p className="text-[10px] text-[#ffd700] font-black mt-2">
                {formatPrice(product.price)}
              </p>
            )}
            <span className="text-[10px] text-[#7dffb8] mt-auto pt-2 font-bold">
              مشاهده ←
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HeroShowcase({ slots }: HeroShowcaseProps) {
  const hasProducts = slots.some((s) => s.product);

  const messiSlot = slots.find((s) => s.variant === "messi");
  const ronaldoSlot = slots.find((s) => s.variant === "ronaldo");
  const starSlots = [messiSlot, ronaldoSlot].filter(Boolean) as HeroShowcaseSlot[];
  const scrollSlots = slots.filter(
    (s) => s.variant === "default" && s.product
  );
  const spotlightSlots =
    starSlots.length > 0
      ? starSlots
      : slots.filter((s) => s.product).slice(0, 1);

  return (
    <>
      {/* Desktop / tablet — fan layout */}
      <div
        className="hero-showcase hero-showcase--desktop hidden sm:block"
        aria-hidden={!hasProducts}
      >
        {slots.map((slot, i) => (
          <ShowcaseCard key={slot.product?.id ?? `desktop-${i}`} slot={slot} index={i} />
        ))}
      </div>

      {/* Mobile — spotlight + horizontal scroll */}
      <div
        className="hero-showcase-mobile sm:hidden"
        aria-hidden={!hasProducts}
      >
        {spotlightSlots.length > 0 && (
          <div
            className={`hero-showcase-mobile__spotlight${
              spotlightSlots.length === 1
                ? " hero-showcase-mobile__spotlight--solo"
                : ""
            }`}
          >
            {spotlightSlots.map((slot, i) => (
              <ShowcaseCard
                key={slot.product?.id ?? `spot-${i}`}
                slot={slot}
                index={i}
                className="hero-showcase-mobile__spotlight-card"
              />
            ))}
          </div>
        )}

        {scrollSlots.length > 0 && (
          <div className="hero-showcase-mobile__scroll-wrap">
            <p className="hero-showcase-mobile__label">کارت‌های بیشتر</p>
            <div className="hero-showcase-mobile__scroll" role="list">
              {scrollSlots.map((slot, i) => (
                <ShowcaseCard
                  key={slot.product?.id ?? `scroll-${i}`}
                  slot={slot}
                  index={i}
                  className="hero-showcase-mobile__scroll-card"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}