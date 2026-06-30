import { NextResponse } from "next/server";
import { getHomeCatalogData } from "@/lib/home-catalog";

export const revalidate = 300;

export async function GET() {
  try {
    const { catalogProducts, seriesCatalog, total } = await getHomeCatalogData();
    return NextResponse.json({
      products: Array.isArray(catalogProducts) ? catalogProducts : [],
      series: Array.isArray(seriesCatalog) ? seriesCatalog : [],
      total: typeof total === "number" ? total : 0,
    });
  } catch (error) {
    console.error("API /home-catalog error:", error);
    return NextResponse.json(
      { products: [], series: [], total: 0, error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}