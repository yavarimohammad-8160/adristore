import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, Film, Trophy } from "lucide-react";
import { VideoProductGrid } from "@/components/VideoProductGrid";
import { KimdiBadge } from "@/components/KimdiBadge";
import { getProductsWithVideo } from "@/lib/videos";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `ویدئوها | ${SITE_NAME}`,
  description: `ویدیوهای معرفی کارت‌های فوتبال Kimdi — ${SITE_NAME}. مشاهده ویدیو محصولات قبل از خرید.`,
  alternates: { canonical: absoluteUrl("/videos") },
};

export default async function VideosPage() {
  const products = await getProductsWithVideo();

  return (
    <main className="video-page">
      {/* Hero */}
      <section className="video-page__hero" aria-labelledby="videos-page-title">
        <div className="video-page__hero-glow video-page__hero-glow--green" aria-hidden />
        <div className="video-page__hero-glow video-page__hero-glow--gold" aria-hidden />
        <div className="video-page__hero-glow video-page__hero-glow--red" aria-hidden />

        <div className="video-page__hero-inner max-w-[1440px] mx-auto px-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <KimdiBadge size="md" />
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e40af]/35 border border-[#3b82f6]/50 text-[#93c5fd] text-xs font-bold">
              <Trophy className="h-3.5 w-3.5 text-[#fbbf24]" />
              جام جهانی ۲۰۲۶
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-xs font-bold">
              <Clapperboard className="h-3.5 w-3.5" />
              {formatNumber(products.length)} ویدیو
            </span>
          </div>

          <h1
            id="videos-page-title"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-4"
          >
            <span className="bg-gradient-to-l from-[#ef4444] via-[#fbbf24] to-[#22c55e] bg-clip-text text-transparent">
              ویدئوها
            </span>
            <span className="text-white/90"> 🎬</span>
          </h1>

          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/products"
              className="btn-fun btn-primary inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold"
            >
              <Film className="h-4 w-4" />
              همه کارت‌ها
            </Link>
            <Link
              href="/"
              className="btn-fun btn-blue inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold"
            >
              خانه
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-5 py-10 sm:py-14">
        <VideoProductGrid products={products} variant="full" />
      </section>
    </main>
  );
}