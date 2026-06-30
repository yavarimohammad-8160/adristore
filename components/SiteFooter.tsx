import Link from "next/link";
import { HomeNavLink } from "@/components/HomeNavLink";
import { KimdiBadge } from "@/components/KimdiBadge";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-[#22c55e]/20 mt-auto py-12 bg-gradient-to-b from-transparent to-[#151829]">
      <div className="max-w-2xl mx-auto px-5 text-center">
        <div className="flex justify-center mb-4">
          <KimdiBadge size="md" />
        </div>
        <p className="text-4xl mb-3">⚽🃏🏆</p>
        <p className="text-white/80 font-bold text-lg mb-2">
          همه کارت‌ها از <span className="text-[#fbbf24]">برند Kimdi</span>
        </p>
        <p className="text-white/60 font-semibold text-sm">
          تمامی کارت‌ها اورجینال، نو و کدنخورده هستند. فروش از طریق غرفه{" "}
          <a
            href="https://basalam.com/adristore"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#22c55e] font-bold hover:underline"
          >
            آدری‌استور
          </a>{" "}
          در باسلام.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm font-bold">
          <HomeNavLink className="text-[#93c5fd] hover:underline">خانه</HomeNavLink>
          <Link href="/products" className="text-[#22c55e] hover:underline">
            محصولات
          </Link>
          <Link href="/blog" className="text-[#fbbf24] hover:underline">
            وبلاگ
          </Link>
          <a
            href="https://basalam.com/adristore"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#fbbf24] hover:underline"
          >
            باسلام →
          </a>
        </div>
      </div>
    </footer>
  );
}