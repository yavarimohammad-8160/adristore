import { embedVideoUrl, isDirectVideo } from "@/lib/video-embed";
import { Play } from "lucide-react";

interface ProductVideoProps {
  videoUrl: string;
}

export function ProductVideo({ videoUrl }: ProductVideoProps) {
  const embed = embedVideoUrl(videoUrl);
  if (!embed) return null;

  const direct = isDirectVideo(videoUrl);

  return (
    <section className="mb-6 sm:mb-8" aria-label="ویدیو محصول">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1e40af]/30 border border-[#1e40af]/50">
          <Play className="h-4 w-4 text-[#93c5fd]" fill="currentColor" />
        </span>
        <h2 className="text-base sm:text-lg font-black text-[#93c5fd]">ویدیو محصول</h2>
      </div>

      <div className="product-video-player relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-[#1e40af]/45 bg-[#0a0f1e] shadow-[0_12px_40px_rgba(30,64,175,0.25)]">
        {direct ? (
          <video
            src={embed}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        ) : (
          <iframe
            src={embed}
            title="ویدیو محصول"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>
    </section>
  );
}