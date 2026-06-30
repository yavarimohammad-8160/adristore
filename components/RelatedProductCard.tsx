import Link from "next/link";
import type { Product } from "@/lib/types";
import { getPhotoUrl } from "@/lib/basalam";
import { buildProductImageAlt } from "@/lib/seo";
import { productPath } from "@/lib/slug";
import { Price } from "@/components/Price";

interface RelatedProductCardProps {
  product: Product;
}

export function RelatedProductCard({ product }: RelatedProductCardProps) {
  const href = productPath(product.id, product.title);
  const imgSrc = getPhotoUrl(product.photo, product.id);

  return (
    <Link href={href} prefetch className="group block card-glow">
      <div className="trading-card">
        <div className="trading-card-inner">
          <div className="trading-card-front relative flex flex-col h-full">
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <img
                src={imgSrc}
                alt={buildProductImageAlt(product.title)}
                className="card-img absolute inset-0"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="shrink-0 bg-gradient-to-t from-[#1e40af]/95 via-[#1e40af]/80 to-[#1e40af]/60 px-2.5 py-2">
              <div className="text-xs sm:text-sm font-bold line-clamp-2 leading-tight text-white">
                {product.title}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1.5 px-0.5">
          <Price value={product.price} size="sm" />
        </div>
      </div>
    </Link>
  );
}