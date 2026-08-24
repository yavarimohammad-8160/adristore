import { RelatedProductCard } from "@/components/RelatedProductCard";
import { readStaticProducts } from "@/lib/static-catalog";
import { sortProductsNewestFirst } from "@/lib/product-sort";

interface RelatedProductsProps {
  excludeId: number;
}

export async function RelatedProducts({ excludeId }: RelatedProductsProps) {
  const catalog = sortProductsNewestFirst(await readStaticProducts());
  const related = catalog
    .filter((p) => p.id !== excludeId && p.id < 900_000_000)
    .slice(0, 6);

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