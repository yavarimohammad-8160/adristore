"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartContext";
import { ShoppingCart, Trash2, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { getPhotoUrl } from "@/lib/basalam";
import { buildBasalamCheckoutUrl } from "@/lib/basalam-checkout";
import { toast } from "sonner";

export function CartDrawer() {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart } = useCart();

  const handleCheckout = () => {
    if (items.length === 0) return;

    const url = buildBasalamCheckoutUrl(items);
    window.open(url, "_blank", "noopener,noreferrer");

    if (items.length > 1) {
      toast.info(
        "صفحه سبد باسلام باز شد. اگر محصولات خودکار اضافه نشدند، از لینک هر محصول در باسلام به سبد اضافه کنید.",
        { duration: 6000 }
      );
    }
  };

  return (
    <Sheet>
      <SheetTrigger
        className="touch-target relative inline-flex items-center justify-center rounded-xl border-2 border-[#1e40af]/40 bg-[#1e40af]/20 text-white hover:bg-[#1e40af]/40 transition"
        aria-label="سبد خرید"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-[10px] font-bold text-black">
            {totalItems}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-md bg-[#0a0f1e] border-l border-[#1e40af]/30">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl font-display">
            <ShoppingCart className="h-5 w-5 text-[#fbbf24]" /> سبد خرید شما
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100%-140px)]">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white/50">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-bold">سبد خرید خالی است</p>
              <p className="text-sm mt-1">کارت‌های مورد علاقه‌تان را اضافه کنید</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-auto pr-1 -mr-1">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="cart-item flex gap-3 py-3">
                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 border-[#fbbf24]/30">
                      <img
                        src={getPhotoUrl(product.photo, product.id)}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm line-clamp-2 leading-tight pr-6">
                        {product.title}
                      </div>
                      <div className="mt-1 text-[#fbbf24] text-sm font-bold">
                        {formatPrice(product.price * quantity)}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center border-2 border-white/15 rounded-lg">
                          <button
                            type="button"
                            className="px-2 py-0.5 hover:bg-white/5"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                          >
                            −
                          </button>
                          <span className="px-2.5 text-sm font-bold">{quantity}</span>
                          <button
                            type="button"
                            className="px-2 py-0.5 hover:bg-white/5"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="ml-auto p-1 text-[#ef4444] hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#1e40af]/30 mt-auto">
                <div className="flex justify-between text-sm mb-1 text-white/60 font-bold">
                  <span>جمع کل ({totalItems} کالا)</span>
                  <span className="text-[#fbbf24]">{formatPrice(totalPrice)}</span>
                </div>
                <p className="text-[11px] text-white/40 mb-4">
                  پرداخت و ارسال از طریق باسلام انجام می‌شود.
                </p>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleCheckout} className="w-full btn-primary flex gap-2 font-bold">
                    ادامه خرید در باسلام <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" onClick={clearCart} className="text-xs">
                    پاک کردن سبد
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}