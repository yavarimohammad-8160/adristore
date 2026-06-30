import { getVendorProducts } from "@/lib/products";
import { RelatedProductCard } from "@/components/RelatedProductCard";

interface RelatedProductsProps {
  excludeId: number;
}

export async function RelatedProducts({ excludeId }: RelatedProductsProps) {
  const { products } = await getVendorProducts({ page: 1, per_page: 7 });
  const related = products.filter((p) => p.id !== excludeId).slice(0, 6);

  if (related.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-[#fbbf24] text-xl font-black mb-4">
        کارت‌های مشابه Kimdi
      </h2>
      <div className="product-grid">
        {related.map((p) => (
          <RelatedProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}