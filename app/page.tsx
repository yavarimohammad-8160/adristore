import type { Metadata } from "next";
import Link from "next/link";
import { getHomeCatalogData } from "@/lib/home-catalog";
import { buildHeroShowcaseSlots, fetchHeroStarProducts } from "@/lib/hero-showcase";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { CategoryFilter } from "@/components/CategoryFilter";
import { HomeCatalogProvider } from "@/components/HomeCatalogProvider";
import { HomeTopSeriesBar } from "@/components/HomeTopSeriesBar";
import { HomeProductGrid } from "@/components/HomeProductGrid";
import { HeroBanner } from "@/components/HeroBanner";
import { JsonLd } from "@/components/JsonLd";
import { KimdiBadge } from "@/components/KimdiBadge";
import { ArrowRight, Clapperboard, Trophy, Zap } from "lucide-react";
import { VideoProductGrid } from "@/components/VideoProductGrid";
import { getProductsWithVideo } from "@/lib/videos";
import { homeMetadata, absoluteUrl, SITE_NAME, BRAND_NAME, HOME_DESCRIPTION } from "@/lib/seo";
import { productPath } from "@/lib/slug";
import { sortProductsNewestFirst } from "@/lib/product-sort";
import { ProductLink } from "@/components/ProductLink";

export const dynamic = "force-static";

export const metadata: Metadata = homeMetadata;

export default async function Home() {
  const [{ catalogProducts, seriesCatalog, total }, heroStars, videoProducts] =
    await Promise.all([
      getHomeCatalogData(),
      fetchHeroStarProducts(),
      getProductsWithVideo(),
    ]);
  const safeCatalog = sortProductsNewestFirst(
    Array.isArray(catalogProducts) ? catalogProducts : []
  );
  const initialProducts = safeCatalog.slice(0, 24);
  const videoPreview = Array.isArray(videoProducts) ? videoProducts.slice(0, 6) : [];
  const featured = initialProducts.slice(0, 8);
  const showcaseSlots = buildHeroShowcaseSlots(heroStars.pool, {
    ronaldo: heroStars.ronaldo,
    messi: heroStars.messi,
  });

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    brand: BRAND_NAME,
    description: HOME_DESCRIPTION,
    sameAs: ["https://basalam.com/adristore"],
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${BRAND_NAME} — ${SITE_NAME}`,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/products")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <HomeCatalogProvider
      initialProducts={initialProducts}
      initialTotal={total}
      seriesCatalog={seriesCatalog}
      seriesCatalogJson={JSON.stringify(seriesCatalog)}
    >
      <main>
        <JsonLd data={[organizationLd, websiteLd]} />
        <HomeTopSeriesBar />
        <HeroBanner showcaseSlots={showcaseSlots} />

        {featured.length > 0 && (
          <section
            className="max-w-[1440px] mx-auto px-4 sm:px-5 pt-4 pb-2"
            aria-label="کارت‌های پیشنهادی کیمدی"
          >
            <p className="text-sm sm:text-base text-white/65 font-semibold leading-relaxed max-w-3xl">
              در {SITE_NAME} مجموعه کامل{" "}
              <strong className="text-white/90 font-bold">کیمدی کارت</strong> و{" "}
              <strong className="text-white/90 font-bold">کارت کیمدی</strong> را با قیمت روز
              ببینید؛ از کارت‌های ویژه جام جهانی تا سری‌های محبوب بازیکنان.
            </p>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="لینک به کارت‌های محبوب">
              {featured.slice(0, 6).map((product) => (
                <ProductLink
                  key={product.id}
                  href={productPath(product.id, product.title)}
                  className="inline-flex items-center rounded-full border border-[#22c55e]/35 bg-[#22c55e]/10 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#86efac] hover:bg-[#22c55e]/25 hover:border-[#22c55e]/55 transition-colors"
                >
                  {product.title}
                </ProductLink>
              ))}
              <Link
                href="/products"
                className="inline-flex items-center rounded-full border border-[#3b82f6]/35 bg-[#3b82f6]/10 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#93c5fd] hover:bg-[#3b82f6]/25 transition-colors"
              >
                همه کارت کیمدی →
              </Link>
            </nav>
          </section>
        )}

        {/* CATEGORIES */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-5 py-10 sm:py-14" aria-labelledby="filter-heading">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-[#3b82f6] text-sm font-bold mb-2">
                <Trophy className="h-5 w-5" />
                فیلتر هوشمند
                <KimdiBadge size="sm" className="mr-1" />
              </div>
              <h2 id="filter-heading" className="section-title text-2xl sm:text-4xl font-black tracking-tighter">
                جستجوی کیمدی کارت: بازیکن، تیم یا قیمت؟
              </h2>
              <p className="text-white/60 mt-2">
                روی هر دسته کلیک کن و کارت کیمدی مورد علاقه‌ات را در میان صدها کیمدی کارت پیدا کن.
              </p>
            </div>
            <Link
              href="/products"
              className="text-sm hidden sm:flex items-center gap-1 text-[#22c55e] hover:underline font-bold"
            >
              همه کارت کیمدی <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryFilter />
        </section>

        {/* FEATURED CAROUSEL */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-5 py-10" aria-labelledby="featured-heading">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-[#eab308] text-sm font-bold mb-2">
                <Zap className="h-5 w-5" />
                ویژه و محبوب • Kimdi
              </div>
              <h2 id="featured-heading" className="section-title text-2xl sm:text-4xl font-black tracking-tighter">
                کیمدی کارت‌های برگزیده ⚡
              </h2>
              <p className="text-white/55 text-sm mt-2 font-semibold">
                محبوب‌ترین کارت کیمدی این هفته — کلیک کنید و جزئیات هر کارت را ببینید
              </p>
            </div>
            <Link href="/products" className="text-sm flex items-center gap-1 text-[#ef4444] hover:underline font-bold">
              مشاهده کامل <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <FeaturedCarousel products={featured} />

          {featured.length === 0 && (
            <div className="py-12 text-center text-white/50">در حال بارگذاری محصولات...</div>
          )}
        </section>

        {videoPreview.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-5 py-10" aria-labelledby="videos-heading">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 text-[#ef4444] text-sm font-bold mb-2">
                  <Clapperboard className="h-5 w-5" />
                  ویدیوهای Kimdi
                </div>
                <h2 id="videos-heading" className="section-title text-2xl sm:text-4xl font-black tracking-tighter">
                  ویدئوها 🎬
                </h2>
              </div>
              <Link href="/videos" className="text-sm flex items-center gap-1 text-[#ef4444] hover:underline font-bold">
                همه ویدیوها <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <VideoProductGrid products={videoPreview} variant="preview" />
          </section>
        )}

        {/* PRODUCT GRID */}
        <section
          id="products-grid"
          className="products-grid-section max-w-[1440px] mx-auto px-4 sm:px-5 py-10 scroll-mt-24"
          aria-labelledby="grid-heading"
        >
          <div className="products-grid-section__heading mb-5 sm:mb-6">
            <KimdiBadge size="md" className="mb-3" />
            <h2 id="grid-heading" className="section-title text-2xl sm:text-3xl font-black">
              جدیدترین کارت کیمدی 🌟
            </h2>
            <p className="text-white/50 text-sm mt-2 font-semibold">
              تازه‌ترین کیمدی کارت‌ها — مستقیم از {SITE_NAME} و برند {BRAND_NAME}
            </p>
          </div>
          <HomeProductGrid />
        </section>
      </main>
    </HomeCatalogProvider>
  );
}