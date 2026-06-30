import Link from "next/link";
import { Layers, Play, Video } from "lucide-react";
import { getPhotoUrl } from "@/lib/basalam";
import { buildProductImageAlt } from "@/lib/seo";
import { productPath } from "@/lib/slug";
import { Price } from "@/components/Price";
import { KimdiBadge } from "@/components/KimdiBadge";
import { getVideoThumbnail, type VideoListing } from "@/lib/videos";
import { embedVideoUrl, isDirectVideo } from "@/lib/video-embed";
import { formatNumber } from "@/lib/format";

interface VideoProductGridProps {
  products: VideoListing[];
  /** Larger cards for the dedicated /videos page */
  variant?: "preview" | "full";
}

function videoProviderLabel(videoUrl: string): string {
  const embed = embedVideoUrl(videoUrl);
  if (!embed) return "ویدیو";
  if (/youtube/i.test(embed)) return "یوتیوب";
  if (/aparat/i.test(embed)) return "آپارات";
  if (isDirectVideo(videoUrl)) return "فایل ویدیو";
  return "ویدیو";
}

function VideoProductCard({
  item,
  variant,
}: {
  item: VideoListing;
  variant: "preview" | "full";
}) {
  const videoUrl = item.videoUrl.trim();
  const href = productPath(item.id, item.title);
  const thumb =
    getVideoThumbnail(videoUrl, item.videoThumbnail) ||
    getPhotoUrl(undefined, item.id);
  const provider = videoProviderLabel(videoUrl);
  const isShared = item.relatedCount > 1;

  return (
    <Link
      href={href}
      prefetch
      className="video-card group video-card--full"
    >
      <div className="video-card__media">
        <img
          src={thumb}
          alt={buildProductImageAlt(item.title)}
          className="video-card__img"
          loading="lazy"
          decoding="async"
        />
        <div className="video-card__overlay" aria-hidden />

        <div className="video-card__play-wrap" aria-hidden>
          <span className="video-card__play-ring" />
          <span className="video-card__play-btn">
            <Play className="h-5 w-5 fill-current pr-0.5" />
          </span>
        </div>

        <div className="video-card__badges">
          <KimdiBadge size="sm" />
          <span className="video-card__provider">
            <Video className="h-3.5 w-3.5 text-[#fbbf24]" aria-hidden />
            {provider}
          </span>
        </div>

        {isShared && (
          <span className="video-card__count-badge">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {formatNumber(item.relatedCount)} کارت
          </span>
        )}
      </div>

      <div className="video-card__body">
        <h3 className="video-card__title">{item.title}</h3>
        {isShared ? (
          <p className="video-card__meta">
            {/کیمدی\s*شو/i.test(item.title) ? "مجموعه کیمدی شو" : "چند کارت با این ویدیو"}
          </p>
        ) : (
          <Price value={item.price} className="video-card__price" />
        )}
        <span className="video-card__cta">
          {isShared ? "مشاهده ویدیو و کارت‌ها ←" : "مشاهده کارت و ویدیو ←"}
        </span>
      </div>
    </Link>
  );
}

export function VideoProductGrid({ products, variant = "full" }: VideoProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="video-page__empty">
        <div className="video-page__empty-icon" aria-hidden>
          <Video className="h-14 w-14 text-white/25" />
        </div>
        <p className="text-xl font-black text-white/80">هنوز ویدیویی ثبت نشده</p>
      </div>
    );
  }

  return (
    <div className="product-grid video-page__grid">
      {products.map((item) => (
        <VideoProductCard key={item.videoUrl} item={item} variant={variant} />
      ))}
    </div>
  );
}