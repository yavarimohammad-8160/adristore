/**
 * Only used when static /products/:id HTML is missing.
 * Existing exported product pages must be served from ASSETS first.
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[1] || "";
  if (!/^\d+$/.test(id)) {
    return context.next();
  }

  try {
    const existing = await context.env.ASSETS.fetch(context.request);
    if (existing.ok) {
      const contentType = existing.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return existing;
      const body = await existing.text();
      const isFallback =
        body.includes("product-fallback") &&
        !body.includes("gallery-main") &&
        !body.includes('itemScope');
      if (!isFallback) {
        return new Response(body, {
          status: 200,
          headers: existing.headers,
        });
      }
    }
  } catch {
    /* serve fallback below */
  }

  const fallback = new URL("/product-fallback/", url);
  fallback.searchParams.set("id", id);
  try {
    const asset = await context.env.ASSETS.fetch(fallback.toString());
    if (asset.ok) {
      return new Response(asset.body, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      });
    }
  } catch {
    /* fall through */
  }
  return context.next();
}
