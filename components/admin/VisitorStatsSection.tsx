"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  Eye,
  Globe2,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { TrafficAnalytics } from "@/lib/traffic-analytics";

interface AnalyticsPayload {
  website: TrafficAnalytics;
  basalam: TrafficAnalytics;
}

interface TooltipPayloadItem {
  value?: number;
  payload?: { label?: string };
}

function TrafficTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-xl border border-white/15 bg-[#0f172a]/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs text-white/55 font-semibold">{label ?? payload[0]?.payload?.label}</p>
      <p className="text-sm font-black text-white mt-0.5">{formatNumber(value)} بازدید</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Eye;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-black/20 p-2">
          <Icon className="h-4 w-4 opacity-90" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xl sm:text-2xl font-black leading-none">{value}</p>
          {hint ? <p className="text-[11px] text-white/45 font-semibold mt-1">{hint}</p> : null}
        </div>
      </div>
      <p className="text-xs sm:text-sm font-bold mt-2.5 opacity-90">{label}</p>
    </div>
  );
}

function TrafficStatsPanel({
  title,
  subtitle,
  data,
  theme,
}: {
  title: string;
  subtitle: string;
  data: TrafficAnalytics;
  theme: "website" | "basalam";
}) {
  const isWebsite = theme === "website";
  const { summary, daily, monthly, sourceLabel } = data;

  const colors = isWebsite
    ? {
        border: "border-[#3b82f6]/30",
        badge: "border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[#fde047]",
        line: "#60a5fa",
        fillId: "websiteDailyFill",
        fillStart: "#3b82f6",
        barFillId: "websiteMonthlyFill",
        barStart: "#4ade80",
        barEnd: "#16a34a",
        dailyTitle: "text-[#93c5fd]",
        monthlyTitle: "text-[#86efac]",
        monthlyBorder: "border-[#22c55e]/25",
        icon: Globe2,
      }
    : {
        border: "border-[#eab308]/30",
        badge: "border-[#eab308]/35 bg-[#eab308]/10 text-[#fde047]",
        line: "#fbbf24",
        fillId: "basalamDailyFill",
        fillStart: "#eab308",
        barFillId: "basalamMonthlyFill",
        barStart: "#facc15",
        barEnd: "#ca8a04",
        dailyTitle: "text-[#fde047]",
        monthlyTitle: "text-[#fbbf24]",
        monthlyBorder: "border-[#eab308]/25",
        icon: Store,
      };

  const HeaderIcon = colors.icon;

  return (
    <section className={`rounded-2xl border-2 ${colors.border} bg-[#111827]/60 p-4 md:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HeaderIcon className={`h-5 w-5 ${isWebsite ? "text-[#93c5fd]" : "text-[#fbbf24]"}`} />
            <h2 className="text-lg md:text-xl font-black tracking-tight">{title}</h2>
          </div>
          <p className="text-sm text-white/55 font-semibold">{subtitle}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-[11px] font-bold ${colors.badge}`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {sourceLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatTile
          label="بازدید امروز"
          value={formatNumber(summary.today)}
          icon={Eye}
          accent={
            isWebsite
              ? "bg-[#3b82f6]/12 border-[#3b82f6]/30 text-[#93c5fd]"
              : "bg-[#eab308]/12 border-[#eab308]/30 text-[#fde047]"
          }
        />
        <StatTile
          label="بازدید این ماه"
          value={formatNumber(summary.thisMonth)}
          icon={CalendarDays}
          accent={
            isWebsite
              ? "bg-[#22c55e]/12 border-[#22c55e]/30 text-[#86efac]"
              : "bg-[#f59e0b]/12 border-[#f59e0b]/30 text-[#fcd34d]"
          }
        />
        <StatTile
          label="۳۰ روز اخیر"
          value={formatNumber(summary.last30Days)}
          hint={`میانگین ${formatNumber(summary.avgDaily30)}`}
          icon={TrendingUp}
          accent={
            isWebsite
              ? "bg-[#a855f7]/12 border-[#a855f7]/30 text-[#d8b4fe]"
              : "bg-[#ef4444]/12 border-[#ef4444]/30 text-[#fca5a5]"
          }
        />
        <StatTile
          label="کل بازدیدها"
          value={formatNumber(summary.total)}
          icon={isWebsite ? Globe2 : ShoppingBag}
          accent={
            isWebsite
              ? "bg-[#ef4444]/12 border-[#ef4444]/30 text-[#fca5a5]"
              : "bg-[#1e40af]/12 border-[#1e40af]/30 text-[#93c5fd]"
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
          <h3 className={`text-sm font-bold ${colors.dailyTitle} mb-0.5`}>بازدید روزانه</h3>
          <p className="text-[11px] text-white/40 font-semibold mb-3">۳۰ روز گذشته</p>
          <div className="h-56 w-full min-w-0" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={colors.fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.fillStart} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={colors.fillStart} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => formatNumber(Number(v))}
                />
                <Tooltip content={<TrafficTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke={colors.line}
                  strokeWidth={2}
                  fill={`url(#${colors.fillId})`}
                  dot={false}
                  activeDot={{ r: 4, fill: colors.line, stroke: "#0f172a", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-xl border ${colors.monthlyBorder} bg-black/15 p-4`}>
          <h3 className={`text-sm font-bold ${colors.monthlyTitle} mb-0.5`}>بازدید ماهانه</h3>
          <p className="text-[11px] text-white/40 font-semibold mb-3">۱۲ ماه گذشته</p>
          <div className="h-56 w-full min-w-0" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                <defs>
                  <linearGradient id={colors.barFillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.barStart} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={colors.barEnd} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => formatNumber(Number(v))}
                />
                <Tooltip content={<TrafficTooltip />} />
                <Bar
                  dataKey="visitors"
                  fill={`url(#${colors.barFillId})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VisitorStatsSection() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/analytics/visitors", { credentials: "include" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as AnalyticsPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("خطا در بارگذاری آمار بازدید");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-8 space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg bg-white/5" />
        <Skeleton className="h-[420px] rounded-2xl bg-white/5" />
        <Skeleton className="h-[420px] rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-8 space-y-6" aria-labelledby="analytics-overview-heading">
      <div>
        <h2 id="analytics-overview-heading" className="text-xl md:text-2xl font-black tracking-tight">
          آمار بازدید
        </h2>
        <p className="text-sm text-white/55 mt-1 font-semibold">
          مقایسه بازدید سایت آدری‌استور و غرفه باسلام
        </p>
      </div>

      <TrafficStatsPanel
        title="بازدید سایت"
        subtitle="ترافیک adristore.vercel.app — وب‌سایت فروشگاه"
        data={data.website}
        theme="website"
      />

      <TrafficStatsPanel
        title="بازدید غرفه باسلام"
        subtitle="ترافیک غرفه adristore در basalam.com"
        data={data.basalam}
        theme="basalam"
      />
    </div>
  );
}