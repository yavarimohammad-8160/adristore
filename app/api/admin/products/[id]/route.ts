import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import {
  getEditableProduct,
  buildPhotoList,
  toAdminProductResponse,
  MANUAL_ID_MIN,
} from "@/lib/admin-product";
import {
  getManualProduct,
  updateManualProduct,
  deleteManualProduct,
  manualToProduct,
} from "@/lib/manual-products";
import { saveProductOverride, photosToUrls } from "@/lib/product-overrides";
import { getProduct } from "@/lib/products";
import { updateVideoIndexEntry } from "@/lib/video-index";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function revalidateProductPages(productId: number) {
  revalidateStorefront(productId);
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productId = Number(id);
    const data = await getEditableProduct(productId);
    if (!data) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    if (data.source === "manual") {
      const record = await getManualProduct(productId);
      if (!record) {
        return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
      }
      return NextResponse.json(toAdminProductResponse(data, manualToProduct(record)));
    }

    return NextResponse.json(toAdminProductResponse(data));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productId = Number(id);
    const body = await request.json();
    const { title, price, description, brief, category, seriesId, inventory, imageUrls, tags, videoUrl } =
      body;

    if (!title?.trim() || price == null || isNaN(Number(price))) {
      return NextResponse.json({ error: "عنوان و قیمت الزامی است" }, { status: 400 });
    }

    let photoUrls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
    if (photoUrls.length === 0) {
      const existing = await getEditableProduct(productId);
      if (existing?.imageUrls.length) {
        photoUrls = existing.imageUrls;
      } else if (productId < MANUAL_ID_MIN) {
        const catalog = await getProduct(productId);
        photoUrls = photosToUrls(catalog?.photos, catalog?.photo);
      }
    }
    const photos = buildPhotoList(photoUrls);

    if (productId >= MANUAL_ID_MIN) {
      const updates = {
        title: String(title).trim(),
        price: Number(price),
        description: description || "",
        brief: brief || description?.slice(0, 120) || "",
        category: category || "عمومی",
        seriesId: typeof seriesId === "string" && seriesId.trim() ? seriesId.trim() : undefined,
        inventory: Number(inventory) || 0,
        tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
        videoUrl: typeof videoUrl === "string" ? videoUrl.trim() : "",
        photos,
      };

      const record = await updateManualProduct(productId, updates);
      if (!record) {
        return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
      }

      await updateVideoIndexEntry(productId, updates.videoUrl);
      revalidateProductPages(productId);
      const data = await getEditableProduct(productId);
      return NextResponse.json(
        toAdminProductResponse(data!, manualToProduct(record))
      );
    }

    const record = await saveProductOverride({
      id: productId,
      title: String(title).trim(),
      price: Number(price),
      description: description || "",
      brief: brief || description?.slice(0, 120) || "",
      category: category || "عمومی",
      seriesId: typeof seriesId === "string" && seriesId.trim() ? seriesId.trim() : undefined,
      inventory: Number(inventory) || 0,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      videoUrl: typeof videoUrl === "string" ? videoUrl.trim() : "",
      photos,
    });

    await updateVideoIndexEntry(productId, record.videoUrl);
    revalidateProductPages(productId);
    const data = await getEditableProduct(productId);
    return NextResponse.json({
      product: {
        ...toAdminProductResponse(data!).product,
        overrideSaved: true,
        updated_at: record.updated_at,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در ویرایش" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productId = Number(id);
    if (productId < MANUAL_ID_MIN) {
      return NextResponse.json(
        { error: "محصولات باسلام قابل حذف نیستند — فقط ویرایش محلی" },
        { status: 400 }
      );
    }
    const ok = await deleteManualProduct(productId);
    if (!ok) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    revalidateProductPages(productId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

