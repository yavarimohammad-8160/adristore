import { NextRequest, NextResponse } from "next/server";
import { getVendorProducts, searchVendorProducts } from "@/lib/products";
export const revalidate = 300;

const API_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const per_page = Number(sp.get("per_page") || "24");
  const search = sp.get("search") || "";
  const min_price = sp.get("min_price") ? Number(sp.get("min_price")) : undefined;
  const max_price = sp.get("max_price") ? Number(sp.get("max_price")) : undefined;
  const sort = (sp.get("sort") as "price:asc" | "price:desc" | "newest") || undefined;
  const category = sp.get("category") || "";
  const filter = sp.get("filter") || "";
  const series = sp.get("series")?.trim().normalize("NFKC") || "";
  const full = sp.get("full") === "1";

  try {
    const result =
      full || search || category || (series && series !== "all")
        ? await searchVendorProducts({
            page,
            per_page,
            search,
            min_price,
            max_price,
            sort,
            category,
            filter,
            series,
          })
        : await getVendorProducts({
            page,
            per_page,
            min_price,
            max_price,
            sort,
          });

    return NextResponse.json(result, {
      headers: { "Cache-Control": API_CACHE_CONTROL },
    });
  } catch (error) {
    console.error("API /products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}