"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { ProductDetailView } from "@/components/ProductDetailView";
import { STATIC_DATA } from "@/lib/static-data";
import type { Product } from "@/lib/types";

function productIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/products\/(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Cloudflare Pages serves this 404.html for any missing static path.
 * If the URL is a product ID that exists in the catalog JSON, render it
 * instead of a dead 404 — this is what stops new Basalam cards from
 * being unclickable before the next full export.
 */
export default function NotFound() {
  const [status, setStatus] = useState<"boot" | "loading" | "ready" | "missing">("boot");
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    const id =
      new URLSearchParams(window.location.search).get("id") ||
      productIdFromPath(window.location.pathname);
    if (!id) {
      setStatus("missing");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${STATIC_DATA.productsCatalog}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { products?: Product[] };
        const products = Array.isArray(data.products) ? data.products : [];
        const found = products.find((p) => String(p.id) === id) ?? null;
        if (cancelled) return;
        if (!found) {
          setStatus("missing");
          return;
        }
        setProduct(found);
        setRelated(products.filter((p) => p.id !== found.id).slice(0, 6));
        setStatus("ready");
        document.title = `${found.title} | کارت فوتبال Kimdi — آدری‌استور`;
      } catch {
        if (!cancelled) setStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "boot" || status === "loading") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center text-white/70">
        در حال بارگذاری کارت…
      </div>
    );
  }

  if (status === "ready" && product) {
    return <ProductDetailView product={product} related={related} />;
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-5 py-20 wc-page text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1e40af]/30 border-2 border-[#1e40af]/50 mb-6">
        <PackageX className="h-8 w-8 text-[#93c5fd]" />
      </div>
      <h1 className="text-2xl font-black mb-3">کارت پیدا نشد</h1>
      <p className="text-white/60 font-medium max-w-md mx-auto mb-8">
        این محصول Kimdi در آدری‌استور موجود نیست یا حذف شده است.
      </p>
      <Link
        href="/products"
        className="btn-fun btn-primary inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold"
      >
        مشاهده همه کارت‌ها
      </Link>
    </div>
  );
}
