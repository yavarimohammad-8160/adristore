import { formatPrice } from "@/lib/format";

interface FreeShippingBannerProps {
  threshold: number;
}

export function FreeShippingBanner({ threshold }: FreeShippingBannerProps) {
  if (!threshold || threshold <= 0) return null;

  return (
    <div className="border-b border-[#22c55e]/25 bg-gradient-to-r from-[#14532d]/40 via-[#0a0f1e] to-[#14532d]/40">
      <p className="max-w-7xl mx-auto px-4 sm:px-5 py-2 text-center text-xs sm:text-sm font-bold text-[#86efac]">
        🚚 خرید بالای {formatPrice(threshold)} ارسال رایگان
      </p>
    </div>
  );
}