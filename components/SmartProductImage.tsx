"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/types";
import {
  CARD_PLACEHOLDER,
  isJsDelivrUrl,
  isPagesImgUrl,
  photoFallbackSrcs,
} from "@/lib/media-cdn";

/** jsDelivr can hang on cached 404s; Pages CDN can fail MIME decode — soft-timeout both. */
const JSDELIVR_TIMEOUT_MS = 2500;
const PAGES_IMG_TIMEOUT_MS = 2500;

type Props = {
  photo?: Photo | null;
  src?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "auto" | "sync";
  draggable?: boolean;
  onLoad?: () => void;
};

export function SmartProductImage({
  photo,
  src,
  alt,
  className,
  loading = "lazy",
  fetchPriority = "auto",
  decoding = "async",
  draggable = false,
  onLoad,
}: Props) {
  const srcs = useMemo(() => photoFallbackSrcs(photo, src), [photo, src]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const current = srcs[Math.min(index, srcs.length - 1)] || CARD_PLACEHOLDER;

  const advance = useCallback(() => {
    setLoaded(false);
    setIndex((i) => (i + 1 < srcs.length ? i + 1 : i));
  }, [srcs.length]);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [srcs]);

  // Soft-timeout jsDelivr and adristore-img Pages CDN. Basalam / local / GitHub raw
  // wait for onLoad/onError — a short timeout was abandoning slow-but-valid images
  // on the homepage when many cards load at once.
  useEffect(() => {
    if (loaded || index >= srcs.length - 1) return;
    const ms = isJsDelivrUrl(current)
      ? JSDELIVR_TIMEOUT_MS
      : isPagesImgUrl(current)
        ? PAGES_IMG_TIMEOUT_MS
        : 0;
    if (!ms) return;
    const timer = window.setTimeout(advance, ms);
    return () => window.clearTimeout(timer);
  }, [advance, index, loaded, srcs.length, current]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      draggable={draggable}
      onLoad={() => {
        setLoaded(true);
        onLoad?.();
      }}
      onError={advance}
    />
  );
}
