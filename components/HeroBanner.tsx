import Link from "next/link";
import type { HeroShowcaseSlot } from "@/lib/hero-showcase";
import { KimdiBadge } from "@/components/KimdiBadge";
import { HeroShowcase } from "@/components/HeroShowcase";
import { HeroParticles } from "@/components/HeroParticles";
import { SITE_NAME } from "@/lib/seo";
import { ArrowDown, Sparkles, Trophy } from "lucide-react";

interface HeroBannerProps {
  showcaseSlots?: HeroShowcaseSlot[];
}

export function HeroBanner({ showcaseSlots = [] }: HeroBannerProps) {
  return (
    <section className="hero-banner relative min-h-0 sm:min-h-[100svh] flex items-center overflow-hidden">
      <HeroParticles />

      {/* Ambient glow orbs */}
      <div className="hero-glow hero-glow--green" aria-hidden />
      <div className="hero-glow hero-glow--gold" aria-hidden />
      <div className="hero-glow hero-glow--red" aria-hidden />

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 sm:py-20 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-6 items-center">
          {/* Copy */}
          <div className="text-center lg:text-right order-2 lg:order-1">
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
              <KimdiBadge size="md" />
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#22c55e]/15 border-2 border-[#22c55e]/40 text-xs sm:text-sm font-bold">
                <Trophy className="h-4 w-4 text-[#fbbf24] shrink-0" />
                <span className="text-[#fbbf24] font-black">WC 2026</span>
                <span className="text-[#86efac] hidden sm:inline">انرژی جام جهانی</span>
                <span className="text-lg sm:text-xl">⚽</span>
              </div>
            </div>

            <h1 className="hero-banner__brand font-display text-[2rem] leading-[1.12] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-3 sm:mb-4">
              <span className="block">کیمدی کارت</span>
              <span className="block text-[0.72em] sm:text-[0.68em] mt-1 text-white/90">
                کارت کیمدی کلکسیونی
              </span>
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-white/85 font-bold mb-3 leading-snug">
              فروشگاه رسمی{" "}
              <span className="hero-banner__kimdi">{SITE_NAME}</span>
              {" "}— برند <span className="text-[#fbbf24]">Kimdi</span>
            </p>

            <p className="text-sm sm:text-lg md:text-xl text-white/60 font-semibold mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 lg:mr-0 leading-relaxed px-1">
              خرید کیمدی کارت و کارت کیمدی اورجینال؛ نو، کد‌نخورده و آماده کلکسیون — مستقیم از باسلام
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-md sm:max-w-none mx-auto lg:mx-0">
              <a
                href="#products-grid"
                className="hero-cta btn-fun btn-primary touch-target inline-flex items-center justify-center gap-2 min-h-[52px] sm:h-16 px-8 sm:px-12 rounded-2xl text-base sm:text-xl font-black w-full sm:w-auto"
              >
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                مشاهده همه کارت‌ها
                <ArrowDown className="h-5 w-5 animate-bounce shrink-0" />
              </a>
              <Link
                href="/products"
                className="btn-fun btn-blue touch-target inline-flex items-center justify-center min-h-[52px] sm:h-14 px-8 rounded-2xl text-base font-bold w-full sm:w-auto"
              >
                کاتالوگ کامل 🃏
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
              <div className="stat-pill text-[#fbbf24] border-[#fbbf24]/30">✦ برند Kimdi</div>
              <div className="stat-pill text-[#22c55e]">✓ اورجینال</div>
              <div className="stat-pill text-[#1e40af]">✓ نو و کد‌نخورده</div>
              <div className="stat-pill text-[#ef4444]">✓ کلکسیونی</div>
            </div>
          </div>

          {/* Card showcase */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end w-full min-w-0">
            <HeroShowcase slots={showcaseSlots} />
          </div>
        </div>
      </div>

      <a
        href="#products-grid"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/40 hover:text-[#22c55e] transition-colors text-xs font-bold"
        aria-label="رفتن به محصولات"
      >
        <span>اسکرول کنید</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  );
}