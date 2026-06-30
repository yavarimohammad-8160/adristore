import { getProduct as getCatalogProduct } from "./products";
import {
  getManualProduct,
  manualToProduct,
  type ManualProductRecord,
} from "./manual-products";
import {
  getProductOverride,
  photosToUrls,
  type ProductOverrideRecord,
} from "./product-overrides";
import type { Photo } from "./types";

export const MANUAL_ID_MIN = 900_000_000;

export interface EditableProductData {
  source: "manual" | "basalam";
  productId: number;
  title: string;
  price: number;
  description: string;
  brief: string;
  category: string;
  seriesId: string;
  inventory: number;
  imageUrls: string[];
  tags: string[];
  videoUrl: string;
  hasOverride?: boolean;
}

function fromManualRecord(record: ManualProductRecord): EditableProductData {
  return {
    source: "manual",
    productId: record.id,
    title: record.title,
    price: record.price,
    description: record.description,
    brief: record.brief,
    category: record.category,
    seriesId: record.seriesId || "",
    inventory: record.inventory,
    imageUrls: photosToUrls(record.photos),
    tags: record.tags || [],
    videoUrl: record.videoUrl || "",
  };
}

function fromBasalamProduct(
  product: NonNullable<Awaited<ReturnType<typeof getCatalogProduct>>>,
  override: ProductOverrideRecord | null
): EditableProductData {
  return {
    source: "basalam",
    productId: product.id,
    title: product.title,
    price: product.price,
    description: product.description || "",
    brief: product.brief || "",
    category: override?.category || "عمومی",
    seriesId: override?.seriesId || "",
    inventory: product.inventory ?? 0,
    imageUrls: photosToUrls(product.photos, product.photo),
    tags: override?.tags || [],
    videoUrl: override?.videoUrl || product.videoUrl || "",
    hasOverride: !!override,
  };
}

/** Load product for admin edit form — manual DB or Basalam + local overrides */
export async function getEditableProduct(
  productId: number
): Promise<EditableProductData | null> {
  if (!Number.isFinite(productId) || productId <= 0) return null;

  if (productId >= MANUAL_ID_MIN) {
    const record = await getManualProduct(productId);
    if (!record) return null;
    return fromManualRecord(record);
  }

  const override = await getProductOverride(productId);
  const product = await getCatalogProduct(productId);
  if (!product) return null;

  return fromBasalamProduct(product, override);
}

export function buildPhotoList(imageUrls: string[]): Photo[] {
  return imageUrls.map((url, i) => ({
    id: i + 1,
    original: url,
    md: url,
    sm: url,
  }));
}

export function toAdminProductResponse(
  data: EditableProductData,
  product?: ReturnType<typeof manualToProduct>
) {
  const photos = buildPhotoList(data.imageUrls);
  return {
    product: {
      ...(product ?? {
        id: data.productId,
        title: data.title,
        price: data.price,
        photo: photos[0] ?? null,
        photos,
        inventory: data.inventory,
        description: data.description,
        brief: data.brief,
      }),
      source: data.source,
      category: data.category,
      seriesId: data.seriesId,
      tags: data.tags,
      videoUrl: data.videoUrl,
      hasOverride: data.hasOverride ?? data.source === "manual",
    },
  };
}