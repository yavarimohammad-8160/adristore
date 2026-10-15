import type { Metadata } from "next";
import { Suspense } from "react";
import { readStaticProducts } from "@/lib/static-catalog";
import { buildTeamPool } from "@/lib/team-positions";
import { readManualPositions } from "@/lib/team-positions-manual";
import { TeamBuilder } from "@/components/team-builder/TeamBuilder";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

// Positions can be edited at runtime from /admin/positions.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `تیمت رو بچین | ${SITE_NAME}`,
  description: "ترکیب ۱۱ نفره و مربی رویایی‌ات را با کارت‌های کیمدی بچین و کل تیم را یک‌جا بخر.",
  alternates: { canonical: absoluteUrl("/team-builder") },
};

export default async function TeamBuilderPage() {
  const [products, manual] = await Promise.all([readStaticProducts(), readManualPositions()]);
  const pool = buildTeamPool(products, manual);
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
