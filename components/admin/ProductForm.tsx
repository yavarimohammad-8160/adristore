"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { ProductPhotoGallery } from "@/components/admin/ProductPhotoGallery";
import { ProductVideoField } from "@/components/admin/ProductVideoField";
import { parseVideoInput } from "@/lib/video-embed";

const CATEGORIES = ["عمومی", "بازیکن", "تیم", "لیمیتد", "امضا", "روکی", "جام جهانی"];

export interface ProductFormValues {
  title: string;
  price: number;
  description: string;
  brief: string;
  category: string;
  seriesId: string;
  inventory: number;
  imageUrls: string[];
  tags: string[];
  videoUrl: string;
}

interface SeriesOption {
  id: string;
  label: string;
}

interface ProductFormProps {
  initial?: Partial<ProductFormValues>;
  productId?: number;
  source?: "manual" | "basalam";
  mode: "create" | "edit";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({
  initial,
  productId,
  mode,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [description, setDescription] = useState(initial?.description || "");
  const [brief, setBrief] = useState(initial?.brief || "");
  const [category, setCategory] = useState(initial?.category || "عمومی");
  const [seriesId, setSeriesId] = useState(initial?.seriesId || "");
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [inventory, setInventory] = useState(String(initial?.inventory ?? 1));
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.imageUrls || []);
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || "");
  const [saving, setSaving] = useState(false);

  const displayPrice =
    price && !isNaN(Number(price)) ? formatNumber(Number(price)) : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/series", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const options = (data.series || [])
          .filter((s: { enabled?: boolean }) => s.enabled !== false)
          .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
          .map((s: { id: string; label: string }) => ({ id: s.id, label: s.label }));
        if (!cancelled) setSeriesOptions(options);
      } catch {
        if (!cancelled) toast.error("خطا در بارگذاری سری‌ها");
      } finally {
        if (!cancelled) setSeriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag) return;
    if (tags.includes(tag)) {
      toast.error("این برچسب قبلاً اضافه شده");
      return;
    }
    setTags((prev) => [...prev, tag]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("نام محصول الزامی است");
      return;
    }
    if (price === "" || isNaN(Number(price))) {
      toast.error("قیمت معتبر وارد کنید");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        price: Number(price),
        description,
        brief: brief || description.slice(0, 120),
        category,
        seriesId: seriesId || undefined,
        inventory: Number(inventory) || 0,
        imageUrls,
        tags,
        videoUrl: parseVideoInput(videoUrl),
      };

      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ذخیره");
      toast.success(mode === "create" ? "محصول ایجاد شد" : "تغییرات ذخیره شد");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="admin-form-section">
        <h3 className="admin-form-section__title">اطلاعات اصلی</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-[#fbbf24] font-bold mb-1.5">نام محصول *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="filter-input h-11"
              placeholder="مثال: کارت مسی ۲۰۲۶"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#22c55e] font-bold mb-1.5">قیمت (تومان) *</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min={0}
                className="filter-input h-11"
                placeholder="۱۵۰۰۰۰"
              />
              {displayPrice && (
                <p className="text-xs text-white/50 mt-1">{displayPrice} تومان</p>
              )}
            </div>
            <div>
              <Label className="text-[#ef4444] font-bold mb-1.5">موجودی</Label>
              <Input
                type="number"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                min={0}
                className="filter-input h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#1e40af] font-bold mb-1.5">دسته‌بندی</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="filter-input w-full h-11 px-3 text-sm font-semibold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[#86efac] font-bold mb-1.5">سری کارت</Label>
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                disabled={seriesLoading}
                className="filter-input w-full h-11 px-3 text-sm font-semibold"
              >
                <option value="">تشخیص خودکار از عنوان</option>
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <h3 className="admin-form-section__title">توضیحات</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 font-bold mb-1.5">توضیح کوتاه</Label>
            <Input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="filter-input h-11"
              placeholder="خلاصه یک خطی برای کارت محصول"
            />
          </div>
          <div>
            <Label className="text-white/70 font-bold mb-1.5">توضیحات کامل</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="filter-input w-full p-3 text-sm resize-y min-h-[120px]"
              placeholder="جزئیات محصول، کیفیت چاپ، نسخه، و..."
            />
          </div>
        </div>
      </section>

      <section className="admin-form-section">
        <h3 className="admin-form-section__title">برچسب‌ها</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="filter-input h-10 flex-1"
              placeholder="مثال: مسی، آرژانتین، لیمیتد"
            />
            <Button
              type="button"
              onClick={addTag}
              className="btn-fun btn-blue font-bold h-10 gap-1 shrink-0"
            >
              <Plus className="h-4 w-4" />
              افزودن برچسب
            </Button>
          </div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="admin-tag-chip">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="opacity-70 hover:opacity-100"
                    aria-label={`حذف ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40">برچسب بازیکن، تیم یا ویژگی محصول را اضافه کنید</p>
          )}
        </div>
      </section>

      <section className="admin-form-section">
        <h3 className="admin-form-section__title">تصاویر محصول</h3>
        <ProductPhotoGallery imageUrls={imageUrls} onChange={setImageUrls} />
      </section>

      <section className="admin-form-section">
        <h3 className="admin-form-section__title">ویدیو محصول</h3>
        <ProductVideoField videoUrl={videoUrl} onChange={setVideoUrl} />
      </section>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1 sticky bottom-0 sm:static bg-[#111827] sm:bg-transparent py-3 sm:py-0 border-t border-[#1e40af]/20 sm:border-0">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 font-bold">
            انصراف
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="btn-fun btn-primary font-bold px-8 h-11 sm:mr-auto"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          {mode === "create" ? "ایجاد محصول" : "ذخیره تغییرات"}
        </Button>
      </div>
    </form>
  );
}