import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";
import { KimdiBadge } from "@/components/KimdiBadge";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl, BRAND_NAME, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "مقاله پیدا نشد" };

  return {
    title: { absolute: `${post.title} | وبلاگ Kimdi — آدری‌استور` },
    description: post.excerpt,
    keywords: [...post.keywords, BRAND_NAME, SITE_NAME, "کارت فوتبال"],
    alternates: { canonical: absoluteUrl(`/blog/${post.slug}`) },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: absoluteUrl(`/blog/${post.slug}`),
      type: "article",
      locale: "fa_IR",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: BRAND_NAME },
    url: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-5 py-12">
      <JsonLd data={articleLd} />
      <nav className="mb-6 text-sm">
        <Link href="/blog" className="text-[#22c55e] hover:underline font-bold">
          ← بازگشت به وبلاگ
        </Link>
      </nav>

      <KimdiBadge size="md" className="mb-4" />
      <time className="text-xs text-[#fbbf24] font-bold" dateTime={post.publishedAt}>
        {new Date(post.publishedAt).toLocaleDateString("fa-IR")}
      </time>
      <h1 className="text-3xl md:text-4xl font-black font-display mt-2 mb-6 leading-tight">
        {post.title}
      </h1>

      <article className="prose prose-invert max-w-none text-white/85 leading-relaxed whitespace-pre-line">
        {post.content.split("\n").map((para, i) =>
          para.trim() ? (
            <p key={i} className="mb-4 text-[15px]">
              {para.replace(/\*\*(.*?)\*\*/g, "$1")}
            </p>
          ) : null
        )}
      </article>

      <div className="mt-10 pt-6 border-t border-[#1e40af]/30">
        <Link
          href="/products"
          className="btn-fun btn-primary inline-flex items-center h-11 px-6 rounded-xl font-bold text-sm"
        >
          مشاهده کارت‌های Kimdi 🃏
        </Link>
      </div>
    </main>
  );
}