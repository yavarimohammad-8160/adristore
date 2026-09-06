"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/types";
import {
  CARD_PLACEHOLDER,
  isJsDelivrUrl,
  photoFallbackSrcs,
} from "@/lib/media-cdn";

/** jsDelivr can hang on cached 404s — only those sources get a soft timeout. */
const JSDELIVR_TIMEOUT_MS = 2500;

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

  // Soft-timeout only for jsDelivr. Basalam / local / GitHub raw should wait for
  // onLoad or onError — a short timeout was abandoning slow-but-valid images on
  // the homepage where many cards load at once (rate limits / high latency).
  useEffect(() => {
    if (loaded || index >= srcs.length - 1) return;
    if (!isJsDelivrUrl(current)) return;
    const timer = window.setTimeout(advance, JSDELIVR_TIMEOUT_MS);
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
