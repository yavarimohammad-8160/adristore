import type { Metadata } from "next";
import { Suspense } from "react";
import { readStaticProducts } from "@/lib/static-catalog";
import { buildTeamPool } from "@/lib/team-positions";
import { TeamBuilder } from "@/components/team-builder/TeamBuilder";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `تیمت رو بچین | ${SITE_NAME}`,
  description: "ترکیب ۱۱ نفره و مربی رویایی‌ات را با کارت‌های کیمدی بچین و کل تیم را یک‌جا بخر.",
  alternates: { canonical: absoluteUrl("/team-builder") },
};

export default async function TeamBuilderPage() {
  const products = await readStaticProducts();
  const pool = buildTeamPool(products);
  return (
    <main className="max-w-xl mx-auto px-3 pt-4 pb-40">
      <h1 className="font-display text-2xl text-white text-center">⚽ تیم رویایی‌ات رو بچین</h1>
      <p className="text-center text-sm text-white/60 mt-1">
        روی هر پست بزن، کارت بازیکن رو انتخاب کن. وقتی ۱۱ بازیکن و مربی کامل شد، کل تیم میره توی سبد خرید.
      </p>
      <Suspense>
        <TeamBuilder pool={pool} />
      </Suspense>
    </main>
  );
}
