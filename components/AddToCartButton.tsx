"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "./CartContext";
import { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { addToCart } = useCart();
  const unavailable = (product.inventory ?? 0) <= 0;

  if (unavailable) {
    return (
      <Button
        size="lg"
        disabled
        aria-disabled="true"
        title="این محصول در حال حاضر ناموجود است"
        className={`touch-target px-8 text-base min-h-[48px] h-12 w-full sm:w-auto bg-slate-800/80 text-slate-500 cursor-not-allowed ${className}`}
      >
        ناموجود
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className={`btn-primary touch-target px-8 text-base min-h-[48px] h-12 w-full sm:w-auto ${className}`}
      onClick={() => addToCart(product)}
    >
      افزودن به سبد خرید
    </Button>
  );
}
