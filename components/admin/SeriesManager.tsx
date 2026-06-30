"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ManagedSeriesData, ManagedSeriesRecord } from "@/lib/series-store";
import type { SeriesAccent } from "@/lib/product-series";
import { seriesIdFromLabel } from "@/lib/product-series";

const ACCENTS: SeriesAccent[] = ["green", "gold", "blue", "red", "silver"];

function newSeriesId() {
  return `series-${Date.now()}`;
}

function createSeries(order: number): ManagedSeriesRecord {
  const label = "سری جدید";
  return {
    id: newSeriesId(),
    label,
    emoji: "🃏",
    accent: "blue",
    matchTerms: [label],
    pattern: "",
    enabled: true,
    order,
  };
}

export function SeriesManager() {
  const [data, setData] = useState<ManagedSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/series", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("خطا در بارگذاری سری‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const seriesPayload = data.series.map((item, index) => ({
        ...item,
        order: index,
        matchTerms:
          item.matchTerms.length > 0
            ? item.matchTerms
            : [item.label, item.label.replace(/^سری\s+/i, "").trim()].filter(Boolean),
      }));

      const res = await fetch("/api/admin/series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series: seriesPayload }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || "خطا در ذخیره");
      setData(saved);
      toast.success("سری‌ها ذخیره شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  function updateSeriesAt(index: number, patch: Partial<ManagedSeriesRecord>) {
    if (!data) return;
    const nextId = patch.id?.trim();
    if (nextId && data.series.some((s, i) => s.id === nextId && i !== index)) {
      toast.error("شناسه سری تکراری است");
      return;
    }
    setData({
      ...data,
      series: data.series.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }

  function addSeries() {
    if (!data) return;
    const item = createSeries(data.series.length);
    setData({ ...data, series: [...data.series, item] });
  }

  function removeSeriesAt(index: number) {
    if (!data) return;
    setData({
      ...data,
      series: data.series.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    });
  }

  function updateMatchTerms(index: number, raw: string) {
    const terms = raw
      .split(/[,،\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    updateSeriesAt(index, { matchTerms: terms });
  }

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-white/60 py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
      </div>
    );
  }

  const sortedIndices = data.series
    .map((_, index) => index)
    .sort((a, b) => data.series[a].order - data.series[b].order);

  return (
    <div className="max-w-4xl">
      <AdminHeader
        title="مدیریت سری‌ها"
        subtitle="سری‌های کارت را اضافه، ویرایش یا حذف کنید — در فیلتر صفحه اصلی و فرم محصول استفاده می‌شوند"
        action={
          <Button onClick={save} disabled={saving} className="btn-fun btn-primary font-bold">
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            ذخیره تغییرات
          </Button>
        }
      />

      <section className="rounded-2xl border-2 border-[#22c55e]/30 bg-[#111827]/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#86efac]" />
            لیست سری‌ها ({data.series.length})
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addSeries}>
            <Plus className="h-4 w-4 ml-1" /> افزودن سری
          </Button>
        </div>

        <p className="text-xs text-white/45 mb-4">
          «همه محصولات» به‌صورت خودکار در فیلتر صفحه اصلی نمایش داده می‌شود. عبارت‌های تطبیق
          برای فیلتر محصولات بر اساس عنوان استفاده می‌شوند.
        </p>

        <div className="space-y-4">
          {sortedIndices.map((index) => {
            const series = data.series[index];
            return (
            <div
              key={`series-row-${index}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-white/40">
                <GripVertical className="h-4 w-4" />
                <span className="text-xs font-mono">{series.id}</span>
                <label className="flex items-center gap-2 text-sm mr-auto text-white/70">
                  <Checkbox
                    checked={series.enabled}
                    onCheckedChange={(v) => updateSeriesAt(index, { enabled: v === true })}
                  />
                  فعال
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/50">نام سری *</Label>
                  <Input
                    value={series.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      updateSeriesAt(index, {
                        label,
                        id: series.id.startsWith("series-")
                          ? seriesIdFromLabel(label)
                          : series.id,
                      });
                    }}
                    className="filter-input h-10 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">شناسه (slug)</Label>
                  <Input
                    value={series.id}
                    onChange={(e) => updateSeriesAt(index, { id: e.target.value.trim() })}
                    className="filter-input h-10 mt-1 font-mono text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-white/50">ایموجی</Label>
                  <Input
                    value={series.emoji}
                    onChange={(e) => updateSeriesAt(index, { emoji: e.target.value })}
                    className="filter-input h-10 mt-1 text-center text-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/50">رنگ</Label>
                  <select
                    value={series.accent}
                    onChange={(e) =>
                      updateSeriesAt(index, { accent: e.target.value as SeriesAccent })
                    }
                    className="filter-input w-full h-10 mt-1 px-3 text-sm font-semibold"
                  >
                    {ACCENTS.map((accent) => (
                      <option key={accent} value={accent}>
                        {accent}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-white/50">ترتیب</Label>
                  <Input
                    type="number"
                    value={series.order}
                    onChange={(e) => updateSeriesAt(index, { order: Number(e.target.value) })}
                    className="filter-input h-10 mt-1"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/50">عبارت‌های تطبیق (با کاما جدا کنید)</Label>
                <Input
                  value={series.matchTerms.join("، ")}
                  onChange={(e) => updateMatchTerms(index, e.target.value)}
                  className="filter-input h-10 mt-1"
                  placeholder="مثال: سری امضا، امضا Signature"
                />
              </div>

              <div>
                <Label className="text-xs text-white/50">الگوی regex (اختیاری)</Label>
                <Input
                  value={series.pattern || ""}
                  onChange={(e) => updateSeriesAt(index, { pattern: e.target.value })}
                  className="filter-input h-10 mt-1 font-mono text-xs"
                  dir="ltr"
                  placeholder="سری\\s+امضا"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[#ef4444]"
                  onClick={() => removeSeriesAt(index)}
                >
                  <Trash2 className="h-4 w-4 ml-1" />
                  حذف سری
                </Button>
              </div>
            </div>
          );
          })}
        </div>
      </section>
    </div>
  );
}