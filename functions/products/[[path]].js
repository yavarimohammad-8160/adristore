/**
 * Cloudflare Pages Function: missing /products/:id files fall through here.
 * Static HTML generated at export time still wins when present.
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[1] || "";
  if (!/^\d+$/.test(id)) {
    return context.next();
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
