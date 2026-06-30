import { notFound } from "next/navigation";
import { getEditableProduct } from "@/lib/admin-product";
import { ProductEditor } from "@/components/admin/ProductEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    notFound();
  }

  const data = await getEditableProduct(productId);
  if (!data) {
    notFound();
  }

  return (
    <ProductEditor
      mode="edit"
      productId={productId}
      source={data.source}
      initial={{
        title: data.title,
        price: data.price,
        description: data.description,
        brief: data.brief,
        category: data.category,
        seriesId: data.seriesId,
        inventory: data.inventory,
        imageUrls: data.imageUrls,
        tags: data.tags,
        videoUrl: data.videoUrl,
      }}
    />
  );
}