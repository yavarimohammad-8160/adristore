"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import { getPhotoUrl } from "@/lib/basalam";
import { Badge } from "@/components/ui/badge";
import { ConfettiBurst } from "./ConfettiBurst";
import { KimdiBadge } from "./KimdiBadge";
import { Price } from "./Price";
import { formatNumber } from "@/lib/format";
import { buildProductImageAlt } from "@/lib/seo";
import { productPath } from "@/lib/slug";

interface ProductCardProps {
  product: Product;
  showFlip?: boolean;
  hideStandardRarity?: boolean;
}

function getRarity(title: string, price: number): { label: string; cls: string } {
  const t = title.toLowerCase();
  if (t.includes("امضا") || t.includes("signature") || price > 250000)
    return { label: "لجندری", cls: "rarity legend" };
  if (t.includes("طلایی") || t.includes("gold") || t.includes("رویال") || price > 150000)
    return { label: "طلایی", cls: "rarity gold" };
  if (t.includes("سیلور") || t.includes("silver") || t.includes("لیمیتد"))
    return { label: "سیلور", cls: "rarity silver" };
  return { label: "استاندارد", cls: "rarity standard" };
}

function getLowStockLabel(inventory: number | undefined): string | null {
  if (inventory === undefined || inventory <= 0) return null;
  if (inventory === 1) return "فقط ۱ عدد مانده!";
  if (inventory <= 3) return `فقط ${formatNumber(inventory)} عدد مانده!`;
  return null;
}

function LowStockBadge({ label, critical }: { label: string; critical?: boolean }) {
  return (
    <div
      className={`low-stock-badge ${critical ? "low-stock-badge--critical" : "low-stock-badge--warn"}`}
    >
      {label}
    </div>
  );
}

function CardImageArea({
  imgSrc,
  title,
  rarity,
  inStock,
  lowStockLabel,
  criticalLow,
  showTitleBar = true,
  hideStandardRarity = false,
}: {
  imgSrc: string;
  title: string;
  rarity: { label: string; cls: string };
  inStock: boolean;
  lowStockLabel: string | null;
  criticalLow: boolean;
  showTitleBar?: boolean;
  hideStandardRarity?: boolean;
}) {
  return (
    <>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <img
          src={imgSrc}
          alt={buildProductImageAlt(title)}
          className="card-img absolute inset-0"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 z-10">
          <KimdiBadge size="sm" />
        </div>
        {!(hideStandardRarity && rarity.label === "استاندارد") && (
          <div className="absolute top-2 right-2 z-10">
            <span className={rarity.cls}>{rarity.label}</span>
          </div>
        )}
        {!inStock && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="text-[10px] bg-gray-600 border-0">ناموجود</Badge>
          </div>
        )}
        {lowStockLabel && (
          <div className="absolute bottom-0 inset-x-0 z-10">
            <LowStockBadge label={lowStockLabel} critical={criticalLow} />
          </div>
        )}
      </div>
      {showTitleBar && (
        <div className="shrink-0 bg-gradient-to-t from-[#1e40af]/95 via-[#1e40af]/80 to-[#1e40af]/60 px-2.5 py-2">
          <div className="text-xs sm:text-sm font-bold line-clamp-2 leading-tight text-white">
            {title}
          </div>
        </div>
      )}
    </>
  );
}

export function ProductCard({
  product,
  showFlip = true,
  hideStandardRarity = false,
}: ProductCardProps) {
  const rarity = getRarity(product.title, product.price);
  const imgSrc = getPhotoUrl(product.photo, product.id);
  const productUrl = productPath(product.id, product.title);
  const inventory = product.inventory ?? 0;
  const inStock = inventory > 0;
  const lowStockLabel = getLowStockLabel(product.inventory);
  const criticalLow = inventory === 1;

  const cardContent = (
    <>
      <Link
        href={productUrl}
        prefetch
        className="trading-card-front relative flex flex-col h-full"
        aria-label={`مشاهده ${product.title}`}
      >
        <CardImageArea
          imgSrc={imgSrc}
          title={product.title}
          rarity={rarity}
          inStock={inStock}
          lowStockLabel={lowStockLabel}
          criticalLow={criticalLow}
          hideStandardRarity={hideStandardRarity}
        />
      </Link>

      <div className="trading-card-back">
        <div>
          <div className="text-base font-bold leading-tight line-clamp-3 mb-2 text-[#1e40af]">
            {product.title}
          </div>
          {lowStockLabel && (
            <div className="mb-2">
              <LowStockBadge label={lowStockLabel} critical={criticalLow} />
            </div>
          )}
          <div className="text-xs text-white/70 mb-3 line-clamp-4">
            {product.brief || product.description?.slice(0, 120) || "کارت فوتبال کلکسیونی اورجینال برند Kimdi از آدری‌استور ⚽"}
          </div>
          <Price value={product.price} size="md" />
          <div className="mt-2 text-xs text-[#22c55e] font-bold">
            موجودی: {formatNumber(inventory)} عدد
          </div>
        </div>

        <div className="pt-2">
          <Link
            href={productUrl}
            prefetch
            className="w-full inline-flex justify-center btn-primary h-10 items-center rounded-xl text-sm font-bold"
          >
            مشاهده جزئیات 🃏
          </Link>
          <a
            href={product.url || `https://basalam.com/p/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center text-xs text-[#1e40af] hover:underline font-bold"
          >
            خرید در باسلام →
          </a>
        </div>
      </div>
    </>
  );

  if (!showFlip) {
    return (
      <ConfettiBurst>
        <Link href={productUrl} prefetch className="group block card-glow">
          <div className="trading-card">
            <div className="trading-card-inner">
              <div className="trading-card-front relative flex flex-col h-full">
                <CardImageArea
                  imgSrc={imgSrc}
                  title={product.title}
                  rarity={rarity}
                  inStock={inStock}
                  lowStockLabel={lowStockLabel}
                  criticalLow={criticalLow}
                  hideStandardRarity={hideStandardRarity}
                />
              </div>
            </div>
            <div className="mt-1.5 px-0.5">
              <Price value={product.price} size="sm" />
            </div>
          </div>
        </Link>
      </ConfettiBurst>
    );
  }

  return (
    <ConfettiBurst className="card-glow">
      <div className="trading-card group">
        <div className="trading-card-inner">{cardContent}</div>
        <div className="mt-2 px-1 flex justify-between items-center text-xs sm:text-xs gap-1 min-h-[44px]">
          <Link href={productUrl} prefetch className="touch-target inline-flex items-center text-[#1e40af] hover:underline font-bold truncate py-2">
            جزئیات →
          </Link>
          <Price value={product.price} size="sm" />
          <span className={`font-bold shrink-0 ${inStock ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {inStock ? `${formatNumber(inventory)} عدد` : "ناموجود"}
          </span>
        </div>
      </div>
    </ConfettiBurst>
  );
}