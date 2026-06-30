"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Product page error:", error);
  }, [error]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-5 py-20 wc-page text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ef4444]/20 border-2 border-[#ef4444]/40 mb-6">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
      </div>
      <h1 className="text-2xl font-black mb-3">خطا در بارگذاری محصول</h1>
      <p className="text-white/60 font-medium max-w-md mx-auto mb-8">
        متأسفانه جزئیات این کارت Kimdi بارگذاری نشد. لطفاً دوباره تلاش کنید یا به فهرست
        محصولات برگردید.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn-fun btn-primary inline-flex items-center gap-2 h-12 px-6 rounded-xl text-sm font-bold"
        >
          <RefreshCw className="h-4 w-4" />
          تلاش مجدد
        </button>
        <Link
          href="/products"
          className="btn-fun btn-blue inline-flex items-center justify-center h-12 px-6 rounded-xl text-sm font-bold"
        >
          بازگشت به کاتالوگ
        </Link>
      </div>
    </div>
  );
}