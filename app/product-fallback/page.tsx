"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductDetailView } from "@/components/ProductDetailView";
import { STATIC_DATA } from "@/lib/static-data";
import type { Product } from "@/lib/types";

function productIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/products\/(\d+)/);
  return match?.[1] ?? null;
}

export default function ProductFallbackPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  const id = useMemo(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search).get("id");
    return q || productIdFromPath(window.location.pathname);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const targetId =
      new URLSearchParams(window.location.search).get("id") ||
      productIdFromPath(window.location.pathname);
    if (!targetId) {
      setStatus("missing");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${STATIC_DATA.productsCatalog}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`catalog ${res.status}`);
        const data = (await res.json()) as { products?: Product[] };
        const products = Array.isArray(data.products) ? data.products : [];
        const found = products.find((p) => String(p.id) === targetId) ?? null;
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
  }, [id]);

  if (status === "loading") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center text-white/70">
        در حال بارگذاری کارت…
      </div>
    );
  }

  if (status === "missing" || !product) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-black mb-3">کارت پیدا نشد</h1>
        <p className="text-white/60 mb-8">این محصول هنوز در کاتالوگ منتشر نشده یا حذف شده است.</p>
        <Link
          href="/products"
          className="btn-fun btn-primary inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold"
        >
          مشاهده همه کارت‌ها
        </Link>
      </div>
    );
  }

  return <ProductDetailView product={product} related={related} />;
}
