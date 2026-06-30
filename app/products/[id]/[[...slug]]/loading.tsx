export default function ProductLoading() {
  return (
    <div
      className="max-w-[1440px] mx-auto px-4 sm:px-5 py-10 wc-page"
      aria-busy="true"
      aria-label="در حال بارگذاری محصول"
    >
      <div className="mb-6 h-4 w-48 rounded bg-white/10 animate-pulse" />

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        {/* Above-the-fold: image skeleton */}
        <div className="w-full max-w-[480px] mx-auto md:mx-0">
          <div className="aspect-[3.2/4.3] rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-[#fbbf24]/10 animate-pulse border-2 border-[#fbbf24]/20" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-24 h-24 rounded-xl bg-white/10 animate-pulse shrink-0 border border-white/10"
              />
            ))}
          </div>
        </div>

        {/* Above-the-fold: title + price skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-40 rounded-full bg-[#1e40af]/20 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-9 w-full max-w-lg rounded bg-white/10 animate-pulse" />
            <div className="h-9 w-4/5 max-w-md rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-5 w-56 rounded bg-[#fbbf24]/20 animate-pulse" />
          <div className="h-12 w-44 rounded-xl bg-[#fbbf24]/25 animate-pulse" />
          <div className="h-8 w-32 rounded-xl bg-[#22c55e]/20 animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-36 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}