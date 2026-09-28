import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { buildExportCatalog } from "@/lib/prebuild-catalog";
import { absoluteUrl, SITE_URL } from "@/lib/seo";
import { productPath } from "@/lib/slug";
import { isStaticExportBuild, readStaticProducts } from "@/lib/static-catalog";
import type { Product } from "@/lib/types";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/videos"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    // Static export has no Basalam token in every build. The committed catalog
    // is the same list the product pages were generated from.
    const products: Product[] = isStaticExportBuild()
      ? await readStaticProducts()
      : (await buildExportCatalog()).products;
    productRoutes = products.map((p) => ({
      url: absoluteUrl(productPath(p.id, p.title)),
      lastModified: p.created_at ? new Date(p.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error("Sitemap product fetch error:", e);
    try {
      const products = await readStaticProducts();
      productRoutes = products.map((p) => ({
        url: absoluteUrl(productPath(p.id, p.title)),
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    } catch (fallbackError) {
      console.error("Sitemap catalog fallback failed:", fallbackError);
    }
  }

  return [...staticRoutes, ...blogRoutes, ...productRoutes];
}

export { SITE_URL };