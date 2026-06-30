import Link from "next/link";
import { Suspense } from "react";
import { preload } from "react-dom";
import { notFound, permanentRedirect } from "next/navigation";
import { getProduct } from "@/lib/products";
import { getPhotoUrl } from "@/lib/basalam";
import nextDynamic from "next/dynamic";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductVideo } from "@/components/ProductVideo";
import { KimdiBadge } from "@/components/KimdiBadge";
import { JsonLd } from "@/components/JsonLd";
import { Price } from "@/components/Price";
import { RelatedProducts } from "@/components/RelatedProducts";
import { RelatedProductsSkeleton } from "@/components/RelatedProductsSkeleton";
import { formatNumber } from "@/lib/format";
import {
  buildProductMetadata,
  buildProductJsonLd,
  buildProductDescription,
} from "@/lib/seo";
import { productPath, slugMatches } from "@/lib/slug";
import { resolveStaticVideoUrl } from "@/lib/static-video-url";
const AddToCartButton = nextDynamic(
  () => import("@/components/AddToCartButton").then((m) => m.AddToCartButton),
  {
    loading: () => (
      <div className="h-12 w-40 rounded-xl bg-white/10 animate-pulse" aria-hidden />
    ),
  }
);




export const revalidate = 300;
export const dynamicParams = true;




interface Props {
  params: Promise<{ id: string; slug?: string[] }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    return { title: "کارت پیدا نشد | Kimdi — آدری‌استور" };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: Props) {
  const { id, slug: slugSegments } = await params;

  if (!id || !/^\d+$/.test(id)) {
    notFound();
  }

  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const currentSlug = slugSegments?.[0];

  const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
  if (!isStaticExport && !slugMatches(currentSlug, product.title)) {
    permanentRedirect(productPath(product.id, product.title));
  }

  const basalamUrl = product.url || `https://basalam.com/p/${product.id}`;
  const inStock = (product.inventory ?? 0) > 0;
  const jsonLd = buildProductJsonLd(product);
  const photos = product.photos ?? (product.photo ? [product.photo] : []);
  const mainImageUrl = getPhotoUrl(product.photo, product.id);

  if (mainImageUrl) {
    preload(mainImageUrl, { as: "image", fetchPriority: "high" });
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 py-6 sm:py-10 wc-page">
        <nav className="mb-4 sm:mb-6 text-xs sm:text-sm overflow-x-auto whitespace-nowrap pb-1" aria-label="مسیر صفحه">
          <Link href="/" className="text-white/50 hover:text-[#22c55e] font-bold">
            خانه
          </Link>
          <span className="text-white/30 mx-2">/</span>
          <Link href="/products" className="text-white/50 hover:text-[#22c55e] font-bold">
            کارت‌های فوتبال Kimdi
          </Link>
          <span className="text-white/30 mx-2">/</span>
          <span className="text-white/70 font-semibold line-clamp-1">{product.title}</span>
        </nav>

        <article itemScope itemType="https://schema.org/Product">
          <meta itemProp="name" content={product.title} />
          <meta itemProp="description" content={buildProductDescription(product)} />
          <meta itemProp="brand" content="Kimdi" />

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-8">
            <div>
              <ProductGallery photos={photos} title={product.title} productId={product.id} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <KimdiBadge size="md" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e40af]/30 border border-[#1e40af]/50 text-[#93c5fd] text-xs font-bold">
                  🏆 جام جهانی ۲۰۲۶ • آدری‌استور
                </div>
              </div>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-snug mb-4 sm:mb-5"
                itemProp="name"
              >
                {product.title}
              </h1>
              <p className="text-sm text-[#fbbf24] font-bold mb-4">
                کارت فوتبال کلکسیونی برند Kimdi — اورجینال از آدری‌استور
              </p>

              <div className="mb-5" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                <Price value={product.price} size="xl" />
                <meta itemProp="priceCurrency" content="IRR" />
              </div>

              {product.inventory !== undefined && (
                <div
                  className={`inline-block mb-5 rounded-xl px-4 py-1.5 text-sm font-bold border-2 ${
                    inStock
                      ? "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#86efac]"
                      : "bg-[#ef4444]/20 border-[#ef4444]/50 text-[#fca5a5]"
                  }`}
                >
                  {inStock ? `✓ موجودی: ${formatNumber(product.inventory)} عدد` : "ناموجود"}
                </div>
              )}

              <h2 className="sr-only">توضیحات محصول</h2>
              <div
                className="prose prose-invert max-w-none text-white/90 mb-6 sm:mb-8 whitespace-pre-line text-[15px] sm:text-base leading-relaxed font-medium"
                itemProp="description"
              >
                {product.description ||
                  product.brief ||
                  "این کارت فوتبال کلکسیونی برند Kimdi یکی از محبوب‌ترین محصولات آدری‌استور است."}
              </div>

              {product.videoUrl ? (
                <ProductVideo videoUrl={resolveStaticVideoUrl(product.videoUrl)} />
              ) : null}

              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <AddToCartButton product={product} />
                <a
                  href={basalamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-fun btn-blue touch-target inline-flex items-center justify-center min-h-[48px] h-12 px-6 rounded-xl text-sm font-bold w-full sm:w-auto text-center"
                >
                  خرید مستقیم از باسلام
                </a>
              </div>

              <p className="mt-3 text-xs text-white/50 font-medium">
                پرداخت و ارسال توسط باسلام انجام می‌شود.
              </p>

              <div className="mt-9 border-t border-[#1e40af]/30 pt-5 text-xs text-white/50">
                شناسه محصول: {product.id} • برند Kimdi • غرفه آدری‌استور
              </div>
            </div>
          </div>
        </article>

        <Suspense fallback={<RelatedProductsSkeleton />}>
          <RelatedProducts excludeId={product.id} />
        </Suspense>
      </div>
    </>
  );
}