import { NextResponse } from "next/server";
import { getProductSeriesCatalog } from "@/lib/product-series-catalog";

export const revalidate = 300;

export async function GET() {
  try {
    const series = await getProductSeriesCatalog();
    return NextResponse.json({ series });
  } catch (error) {
    console.error("API /product-series error:", error);
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }
}