#!/usr/bin/env node
// Pre-warm the Next.js image optimizer cache for team-builder cards.
// Usage: BASE=http://127.0.0.1:3000 node scripts/warm-image-cache.mjs [width=256] [concurrency=2]
const BASE = process.env.BASE || "http://127.0.0.1:3000";
const width = Number(process.argv[2] || 256);
const conc = Number(process.argv[3] || 2);
const POS = ["GK", "DEF", "MID", "FWD", "COACH"];
const urls = new Set();
for (const p of POS) {
  const r = await fetch(`${BASE}/api/team-pool?pos=${p}`);
  if (!r.ok) throw new Error(`team-pool ${p}: ${r.status}`);
  const { cards } = await r.json();
  for (const c of cards) {
    const src = c.product?.photo?.md || c.product?.photo?.remote;
    if (src) urls.add(src.trim());
  }
}
const list = [...urls];
let done = 0, fail = 0, i = 0;
const t0 = Date.now();
async function worker() {
  while (i < list.length) {
    const src = list[i++];
    const u = `${BASE}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
    try {
      const r = await fetch(u, { headers: { Accept: "image/webp,image/*,*/*;q=0.8" } });
      await r.arrayBuffer();
      if (!r.ok) fail++;
    } catch { fail++; }
    if (++done % 100 === 0) console.log(`${done}/${list.length}`);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
console.log(`warmed ${done - fail}/${list.length} (fail ${fail}) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
