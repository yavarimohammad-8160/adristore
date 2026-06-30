import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { KimdiBadge } from "@/components/KimdiBadge";
import { blogMetadata, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-static";

export const metadata: Metadata = blogMetadata;

export default function BlogPage() {
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "وبلاگ کارت فوتبال Kimdi — آدری‌استور",
    url: absoluteUrl("/blog"),
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: post.publishedAt,
      description: post.excerpt,
    })),
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-5 py-12">
      <JsonLd data={blogLd} />
      <KimdiBadge size="md" className="mb-4" />
      <h1 className="text-4xl font-black font-display mb-3">
        وبلاگ کارت فوتبال Kimdi
      </h1>
      <p className="text-white/60 font-semibold mb-10">
        راهنماها، نکات کلکسیون و مقالات بازاریابی محتوا — آدری‌استور
      </p>

      <div className="space-y-6">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/60 p-6 hover:border-[#22c55e]/40 transition"
          >
            <time className="text-xs text-[#fbbf24] font-bold" dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("fa-IR")}
            </time>
            <h2 className="text-xl font-black mt-2 mb-2">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-[#22c55e] transition-colors"
              >
                {post.title}
              </Link>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm text-[#93c5fd] font-bold hover:underline"
            >
              ادامه مطلب →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}