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
