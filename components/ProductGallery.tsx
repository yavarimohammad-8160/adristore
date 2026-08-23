"use client";

import { useState, useCallback, memo, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { Photo } from "@/lib/types";
import { CARD_PLACEHOLDER, photoFallbackSrcs } from "@/lib/media-cdn";
import { buildProductImageAlt } from "@/lib/seo";
import { SmartProductImage } from "@/components/SmartProductImage";

const ImageLightbox = dynamic(
  () => import("./ImageLightbox").then((m) => m.ImageLightbox),
  { ssr: false }
);

const SWIPE_THRESHOLD = 48;

function photoToUrl(photo: Photo): string {
  return photoFallbackSrcs(photo)[0] || CARD_PLACEHOLDER;
}

interface GalleryImageProps {
  photo?: Photo | null;
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  lazy?: boolean;
}

const GalleryImage = memo(function GalleryImage({
  photo,
  src,
  alt,
  className = "",
  priority = false,
  lazy = true,
}: GalleryImageProps) {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 animate-pulse"
          aria-hidden
        />
      )}
      <SmartProductImage
        photo={photo}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={priority ? "eager" : lazy ? "lazy" : "eager"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={onLoad}
        draggable={false}
      />
    </div>
  );
});

interface ProductGalleryProps {
  photos: Photo[];
  title: string;
  productId: number;
}

export function ProductGallery({ photos, title }: ProductGalleryProps) {
  const photoList: Photo[] = [];
  const seen = new Set<string>();
  for (const photo of photos) {
    const url = photoToUrl(photo);
    if (!url || url === CARD_PLACEHOLDER || seen.has(url)) continue;
    seen.add(url);
    photoList.push(photo);
  }
  const images =
    photoList.length > 0 ? photoList.map((p) => photoToUrl(p)) : [CARD_PLACEHOLDER];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const goTo = useCallback(
    (dir: -1 | 1) => {
      setActiveIndex((i) => {
        const next = i + dir;
        if (next < 0) return images.length - 1;
        if (next >= images.length) return 0;
        return next;
      });
    },
    [images.length]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (images.length <= 1) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      // RTL: swipe right (positive dx) = previous, swipe left = next
      goTo(dx > 0 ? -1 : 1);
    },
    [goTo, images.length]
  );

  return (
    <div className="w-full max-w-[480px] mx-auto md:mx-0">
      <div className="relative group">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="gallery-main group relative w-full aspect-[3.2/4.3] rounded-2xl overflow-hidden border-2 border-[#fbbf24]/50 shadow-[0_0_30px_rgba(251,191,36,0.25)] cursor-zoom-in bg-[#0f172a] touch-pan-y"
          aria-label="بزرگ‌نمایی تصویر — برای تعویض تصویر بکشید"
        >
          <GalleryImage
            photo={photoList[activeIndex]}
            src={images[activeIndex]}
            alt={buildProductImageAlt(title)}
            className="w-full h-full object-cover transition-transform duration-300 group-active:scale-[1.01]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e40af]/50 via-transparent to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ZoomIn className="h-4 w-4" />
            کلیک برای بزرگ‌نمایی
          </div>
          {images.length > 1 && (
            <>
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[#1e40af]/80 text-white text-xs font-bold">
                {activeIndex + 1} / {images.length}
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:hidden px-3 py-1 rounded-full bg-black/60 text-white/80 text-[11px] font-bold">
                ← بکشید برای تصویر بعدی →
              </div>
            </>
          )}
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(-1)}
              className="gallery-nav gallery-nav--prev touch-target sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="تصویر قبلی"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="gallery-nav gallery-nav--next touch-target sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="تصویر بعدی"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4">
          <p className="text-xs sm:text-sm text-[#fbbf24] font-bold mb-2">
            🖼️ همه تصاویر ({images.length})
          </p>
          <div className="gallery-thumbs flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory -mx-1 px-1">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`gallery-thumb relative flex-shrink-0 snap-start rounded-xl overflow-hidden border-2 transition-all bg-[#0f172a] touch-target ${
                  i === activeIndex
                    ? "border-[#fbbf24] ring-2 ring-[#fbbf24]/60 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                    : "border-white/25 opacity-80 active:opacity-100 active:border-[#22c55e]"
                }`}
                aria-label={`تصویر ${i + 1} از ${images.length}`}
                aria-current={i === activeIndex ? "true" : undefined}
              >
                <GalleryImage
                  photo={photoList[i]}
                  src={src}
                  alt={buildProductImageAlt(title, i)}
                  className="w-full h-full object-cover"
                  lazy={i > 2}
                />
                <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/60 text-white px-1.5 rounded z-10">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-white/50 mt-2 font-medium leading-relaxed hidden sm:block">
        روی هر تصویر کوچک کلیک کنید تا تصویر اصلی عوض شود • روی تصویر بزرگ کلیک کنید برای زوم
      </p>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={activeIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          alt={buildProductImageAlt(title)}
        />
      )}
    </div>
  );
}