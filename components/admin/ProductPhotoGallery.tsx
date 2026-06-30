"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Loader2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Link2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProductPhotoGalleryProps {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ProductPhotoGallery({ imageUrls, onChange }: ProductPhotoGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در آپلود");
      onChange([...imageUrls, ...data.urls]);
      toast.success(`${data.urls.length} تصویر آپلود شد`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در آپلود");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("آدرس باید با http:// یا https:// شروع شود");
      return;
    }
    onChange([...imageUrls, url]);
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("تصویر اضافه شد");
  }

  function removeAt(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index));
  }

  function moveLeft(index: number) {
    if (index <= 0) return;
    onChange(moveItem(imageUrls, index, index - 1));
  }

  function moveRight(index: number) {
    if (index >= imageUrls.length - 1) return;
    onChange(moveItem(imageUrls, index, index + 1));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    onChange(moveItem(imageUrls, dragIndex, targetIndex));
    setDragIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e40af]/30 border-2 border-[#1e40af]/50 cursor-pointer hover:bg-[#1e40af]/50 transition font-bold text-sm touch-target">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "در حال آپلود..." : "آپلود تصویر"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 font-bold border-[#1e40af]/40"
          onClick={() => setShowUrlInput((v) => !v)}
        >
          <Link2 className="h-3.5 w-3.5" />
          لینک تصویر
        </Button>
        {imageUrls.length > 0 && (
          <span className="text-xs text-white/45 font-semibold mr-auto">
            {imageUrls.length} تصویر • اولین = تصویر اصلی
          </span>
        )}
      </div>

      {showUrlInput && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="filter-input h-10 flex-1"
            dir="ltr"
          />
          <Button type="button" onClick={addUrl} className="btn-fun btn-blue font-bold h-10">
            افزودن
          </Button>
        </div>
      )}

      {imageUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-[#1e40af]/30 bg-white/[0.02] text-white/40">
          <ImageIcon className="h-8 w-8 opacity-50" />
          <p className="text-sm font-semibold">هنوز تصویری اضافه نشده</p>
          <p className="text-xs">آپلود کنید یا لینک تصویر وارد کنید</p>
        </div>
      ) : (
        <div className="admin-photo-gallery">
          {imageUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={`admin-photo-item${index === 0 ? " admin-photo-item--primary" : ""}${
                dragIndex === index ? " admin-photo-item--dragging" : ""
              }`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
            >
              {index === 0 && <span className="admin-photo-item__badge">اصلی</span>}
              <img src={url} alt="" className="admin-photo-item__img" />
              <div className="admin-photo-item__actions">
                <button
                  type="button"
                  className="admin-photo-item__btn"
                  aria-label="جابجایی"
                  title="کشیدن برای جابجایی"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="admin-photo-item__btn"
                  onClick={() => moveLeft(index)}
                  disabled={index === 0}
                  aria-label="جابجایی به چپ"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="admin-photo-item__btn"
                  onClick={() => moveRight(index)}
                  disabled={index === imageUrls.length - 1}
                  aria-label="جابجایی به راست"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="admin-photo-item__btn admin-photo-item__btn--danger"
                  onClick={() => removeAt(index)}
                  aria-label="حذف تصویر"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}