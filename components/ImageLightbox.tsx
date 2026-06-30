"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  alt: string;
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose, alt }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setZoom(1);
    }
  }, [open, initialIndex]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + images.length) % images.length);
      setZoom(1);
    },
    [images.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, go]);

  if (!open || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="نمایش تصویر بزرگ"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-3 rounded-full bg-[#1e40af]/80 text-white hover:bg-[#1e40af] transition"
        aria-label="بستن"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.5, 3)); }}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          aria-label="بزرگ‌نمایی"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.5, 1)); }}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          aria-label="کوچک‌نمایی"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-[#ef4444]/90 text-white hover:scale-110 transition"
            aria-label="تصویر بعدی"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-[#22c55e]/90 text-white hover:scale-110 transition"
            aria-label="تصویر قبلی"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div
        className="max-w-[92vw] max-h-[85vh] overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[index]}
          alt={`${alt} - تصویر ${index + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-xl transition-transform duration-200 mx-auto"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-bold bg-black/50 px-4 py-2 rounded-full">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}