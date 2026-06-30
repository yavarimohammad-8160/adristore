import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import {
  getAllManualProducts,
  createManualProduct,
  manualToProduct,
} from "@/lib/manual-products";
import { searchVendorProducts } from "@/lib/basalam";
import { productMatchesSearch } from "@/lib/product-search";
import type { Photo } from "@/lib/types";
import { updateVideoIndexEntry } from "@/lib/video-index";

function filterManual(
  records: Awaited<ReturnType<typeof getAllManualProducts>>,
  opts: {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    stock?: string;
  }
) {
  let list = [...records];
  const q = opts.search?.trim();
  if (q) {
    list = list.filter((p) => productMatchesSearch(p, q));
  }
  if (opts.category && opts.category !== "all") {
    list = list.filter((p) => p.category === opts.category);
  }
  if (opts.minPrice != null) list = list.filter((p) => p.price >= opts.minPrice!);
  if (opts.maxPrice != null) list = list.filter((p) => p.price <= opts.maxPrice!);
  if (opts.stock === "in") list = list.filter((p) => p.inventory > 0);
  if (opts.stock === "out") list = list.filter((p) => p.inventory <= 0);
  return list;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = request.nextUrl.searchParams;
    const source = sp.get("source") || "all";
    const page = Number(sp.get("page") || "1");
    const perPage = Number(sp.get("per_page") || "20");
    const search = sp.get("search") || "";
    const category = sp.get("category") || "";
    const minPrice = sp.has("min_price") ? Number(sp.get("min_price")) : undefined;
    const maxPrice = sp.has("max_price") ? Number(sp.get("max_price")) : undefined;
    const stock = sp.get("stock") || "";

    const manualRecords = await getAllManualProducts();
    const filteredManual = filterManual(manualRecords, {
      search,
      category,
      minPrice,
      maxPrice,
      stock,
    });

    const manualProducts = filteredManual.map((r) => ({
      ...manualToProduct(r),
      source: "manual" as const,
      category: r.category,
      tags: r.tags || [],
    }));

    if (source === "manual") {
      const start = (page - 1) * perPage;
      const pageItems = manualProducts.slice(start, start + perPage);
      return NextResponse.json({
        products: pageItems,
        total: manualProducts.length,
        manual: manualRecords.length,
        basalam: 0,
        page,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(manualProducts.length / perPage)),
      });
    }

    if (source === "basalam") {
      const res = await searchVendorProducts({
        page,
        per_page: perPage,
        search,
        category: category && category !== "all" ? category : undefined,
        min_price: minPrice,
        max_price: maxPrice,
      });
      let basalamProducts = res.products;
      if (stock === "in") basalamProducts = basalamProducts.filter((p) => (p.inventory ?? 0) > 0);
      if (stock === "out") basalamProducts = basalamProducts.filter((p) => (p.inventory ?? 0) <= 0);

      return NextResponse.json({
        products: basalamProducts.map((p) => ({ ...p, source: "basalam" as const })),
        total: res.total,
        manual: manualRecords.length,
        basalam: res.total,
        page: res.page,
        per_page: res.per_page,
        total_pages: res.total_pages,
      });
    }

    const basalamRes = await searchVendorProducts({
      page: 1,
      per_page: 1200,
      search,
      category: category && category !== "all" ? category : undefined,
      min_price: minPrice,
      max_price: maxPrice,
    });
    let basalamAll = basalamRes.products.map((p) => ({
      ...p,
      source: "basalam" as const,
    }));
    if (stock === "in") basalamAll = basalamAll.filter((p) => (p.inventory ?? 0) > 0);
    if (stock === "out") basalamAll = basalamAll.filter((p) => (p.inventory ?? 0) <= 0);

    const combined = [...manualProducts, ...basalamAll].sort((a, b) => (b.id || 0) - (a.id || 0));
    const start = (page - 1) * perPage;
    const pageItems = combined.slice(start, start + perPage);

    return NextResponse.json({
      products: pageItems,
      total: combined.length,
      manual: manualRecords.length,
      basalam: basalamRes.total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(combined.length / perPage)),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { title, price, description, brief, category, seriesId, inventory, imageUrls, tags, videoUrl } =
      body;

    if (!title || price == null) {
      return NextResponse.json({ error: "عنوان و قیمت الزامی است" }, { status: 400 });
    }

    const photos: Photo[] = (imageUrls || []).map((url: string, i: number) => ({
      id: i + 1,
      original: url,
      md: url,
      sm: url,
    }));

    const record = await createManualProduct({
      title,
      price: Number(price),
      description: description || "",
      brief: brief || description?.slice(0, 120) || "",
      category: category || "عمومی",
      seriesId: typeof seriesId === "string" && seriesId.trim() ? seriesId.trim() : undefined,
      inventory: Number(inventory) || 0,
      photos,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      videoUrl: typeof videoUrl === "string" ? videoUrl.trim() : "",
    });

    await updateVideoIndexEntry(record.id, record.videoUrl);
    revalidateStorefront(record.id);

    return NextResponse.json({
      product: {
        ...manualToProduct(record),
        source: "manual",
        category: record.category,
        tags: record.tags,
        videoUrl: record.videoUrl || "",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در ایجاد محصول" }, { status: 500 });
  }
}