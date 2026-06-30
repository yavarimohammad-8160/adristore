"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminHeader,
  StatCard,
  RefreshBasalamButton,
} from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SecurityStatusCard } from "@/components/admin/SecurityStatusCard";
import { formatNumber, formatPrice } from "@/lib/format";

const VisitorStatsSection = dynamic(
  () =>
    import("@/components/admin/VisitorStatsSection").then((mod) => mod.VisitorStatsSection),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 space-y-4">
        <div className="h-8 w-56 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-[420px] rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-[420px] rounded-2xl bg-white/5 animate-pulse" />
      </div>
    ),
  }
);

interface RecentProduct {
  id: number;
  title: string;
  price: number;
  inventory?: number;
  source: "manual" | "basalam";
  photo?: { sm?: string; md?: string; original?: string } | null;
}

interface Stats {
  manual: number;
  basalam: number;
  total: number;
  totalValue: number;
  basalamLastRefreshed?: string;
  recent: RecentProduct[];
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("خطا در بارگذاری");
      setStats(await res.json());
    } catch {
      toast.error("خطا در بارگذاری داشبورد");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <AdminHeader
        title="داشبورد"
        subtitle="خلاصه وضعیت فروشگاه آدری‌استور"
        action={<RefreshBasalamButton onSuccess={load} />}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="کل محصولات"
              value={formatNumber(stats.total)}
              color="bg-[#1e40af]/20 border-[#1e40af]/40 text-[#93c5fd]"
              iconName="package"
            />
            <StatCard
              label="محصولات باسلام"
              value={formatNumber(stats.basalam)}
              color="bg-[#22c55e]/20 border-[#22c55e]/40 text-[#86efac]"
              iconName="database"
            />
            <StatCard
              label="محصولات دستی"
              value={formatNumber(stats.manual)}
              color="bg-[#fbbf24]/20 border-[#fbbf24]/40 text-[#fde047]"
              iconName="shopping-bag"
            />
            <StatCard
              label="ارزش کل موجودی"
              value={formatPrice(stats.totalValue)}
              color="bg-[#ef4444]/20 border-[#ef4444]/40 text-[#fca5a5]"
              iconName="coins"
            />
          </div>

          {stats.basalamLastRefreshed && (
            <p className="text-sm text-white/50 mb-6">
              آخرین بروزرسانی باسلام:{" "}
              {new Date(stats.basalamLastRefreshed).toLocaleString("fa-IR")}
            </p>
          )}
        </>
      ) : null}

      <VisitorStatsSection />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/60 overflow-hidden">
          <div className="p-4 border-b border-[#1e40af]/20 flex items-center justify-between">
            <h2 className="text-lg font-bold">محصولات اخیر</h2>
            <Link href="/admin/products">
              <Button variant="ghost" size="sm" className="text-[#93c5fd]">
                مشاهده همه
              </Button>
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-[#1e40af]/15 text-[#93c5fd]">
                  <tr>
                    <th className="text-right p-3 font-bold">محصول</th>
                    <th className="text-right p-3 font-bold">قیمت</th>
                    <th className="text-right p-3 font-bold">منبع</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recent || []).map((p) => {
                    const img = p.photo?.sm || p.photo?.md || p.photo?.original;
                    return (
                      <tr key={`${p.source}-${p.id}`} className="border-t border-white/10">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                                🃏
                              </div>
                            )}
                            <span className="font-bold truncate max-w-[180px]">{p.title}</span>
                          </div>
                        </td>
                        <td className="p-3 text-[#fbbf24] font-bold whitespace-nowrap">
                          {formatPrice(p.price)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              p.source === "manual"
                                ? "bg-[#fbbf24]/20 text-[#fde047]"
                                : "bg-[#22c55e]/20 text-[#86efac]"
                            }`}
                          >
                            {p.source === "manual" ? "دستی" : "باسلام"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!stats?.recent?.length && (
                <p className="text-center py-12 text-white/50">محصولی یافت نشد</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SecurityStatusCard />
          <div className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/60 p-6">
          <h2 className="text-lg font-bold mb-4">عملیات سریع</h2>
          <div className="flex flex-col gap-3">
            <Link href="/admin/products?action=new">
              <Button className="w-full btn-fun btn-primary font-bold gap-2">
                <Plus className="h-4 w-4" /> افزودن محصول جدید
              </Button>
            </Link>
            <RefreshBasalamButton onSuccess={load} />
            <Link href="/admin/products">
              <Button variant="outline" className="w-full font-bold">
                مدیریت محصولات
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full font-bold text-[#22c55e]">
                مشاهده سایت
              </Button>
            </Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}