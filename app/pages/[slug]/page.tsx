import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCustomPageBySlug, readSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const settings = await readSiteSettings();
  return settings.customPages
    .filter((page) => page.enabled)
    .map((page) => ({ slug: page.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCustomPageBySlug(slug);
  if (!page) return { title: "صفحه پیدا نشد" };
  return {
    title: page.title,
    description: page.description || page.title,
    alternates: { canonical: absoluteUrl(`/pages/${page.slug}`) },
  };
}

export default async function CustomPage({ params }: Props) {
  const { slug } = await params;
  const page = await getCustomPageBySlug(slug);
  if (!page) notFound();

  const paragraphs = page.content.split(/\n\n+/).filter(Boolean);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-5 py-10 sm:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-bold text-[#22c55e] hover:underline mb-6"
      >
        بازگشت به خانه <ArrowRight className="h-4 w-4" />
      </Link>
      <h1 className="section-title text-3xl sm:text-4xl font-black tracking-tighter mb-4">
        {page.title}
      </h1>
      {page.description && (
        <p className="text-white/60 font-semibold mb-8">{page.description}</p>
      )}
      <div className="prose prose-invert max-w-none space-y-4 text-white/85 leading-relaxed">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-base sm:text-lg">
            {para}
          </p>
        ))}
      </div>
    </main>
  );
}