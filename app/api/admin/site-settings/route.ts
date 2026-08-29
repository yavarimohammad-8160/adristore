import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import {
  getSiteSettings,
  saveSiteSettings,
  type SiteCustomPage,
  type SiteNavLink,
  slugifyPage,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getSiteSettings());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const patch: {
      freeShippingThreshold?: number;
      isFreeShippingEnabled?: boolean; // 🔴 اضافه شدن نوع متغیر
      navLinks?: SiteNavLink[];
      customPages?: SiteCustomPage[];
    } = {};

    if (typeof body.freeShippingThreshold === "number" && body.freeShippingThreshold >= 0) {
      patch.freeShippingThreshold = Math.round(body.freeShippingThreshold);
    }

    // 🔴 اضافه شدن بررسی سوییچ فعال/غیرفعال بودن ارسال رایگان
    if (typeof body.isFreeShippingEnabled === "boolean") {
      patch.isFreeShippingEnabled = body.isFreeShippingEnabled;
    }

    if (Array.isArray(body.navLinks)) {
      patch.navLinks = body.navLinks;
    }

    if (Array.isArray(body.customPages)) {
      const now = new Date().toISOString();
      patch.customPages = body.customPages.map((page: SiteCustomPage) => ({
        ...page,
        slug: slugifyPage(page.slug || page.title),
        updatedAt: now,
      }));
    }

    const saved = await saveSiteSettings(patch);
    revalidateStorefront();
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در ذخیره" }, { status: 500 });
  }
}
