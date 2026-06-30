export function RelatedProductsSkeleton() {
  return (
    <section className="mt-16" aria-hidden="true">
      <div className="h-7 w-48 rounded bg-white/10 animate-pulse mb-4" />
      <div className="product-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[3/4] rounded-xl bg-white/10 animate-pulse border border-white/10" />
            <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}