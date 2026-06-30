import { NextResponse } from "next/server";
import { getEnabledNavLinks, getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({
      navLinks: getEnabledNavLinks(settings),
      freeShippingThreshold: settings.freeShippingThreshold,
    });
  } catch {
    return NextResponse.json({ error: "خطا در بارگذاری تنظیمات" }, { status: 500 });
  }
}