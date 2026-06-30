import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-5 py-20 wc-page text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1e40af]/30 border-2 border-[#1e40af]/50 mb-6">
        <PackageX className="h-8 w-8 text-[#93c5fd]" />
      </div>
      <h1 className="text-2xl font-black mb-3">کارت پیدا نشد</h1>
      <p className="text-white/60 font-medium max-w-md mx-auto mb-8">
        این محصول Kimdi در آدری‌استور موجود نیست یا حذف شده است.
      </p>
      <Link
        href="/products"
        className="btn-fun btn-primary inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold"
      >
        مشاهده همه کارت‌ها
      </Link>
    </div>
  );
}