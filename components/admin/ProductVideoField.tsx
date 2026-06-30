"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, Video, Loader2, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  embedVideoUrl,
  isDirectVideo,
  isValidVideoInput,
  parseVideoInput,
} from "@/lib/video-embed";
import { formatFileSize, MAX_VIDEO_BYTES } from "@/lib/upload-media";

interface ProductVideoFieldProps {
  videoUrl: string;
  onChange: (url: string) => void;
}

function uploadVideoWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve(data.url);
          return;
        }
        reject(new Error(data.error || "خطا در آپلود ویدیو"));
      } catch {
        reject(new Error("خطا در آپلود ویدیو"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("خطا در اتصال")));
    xhr.open("POST", "/api/admin/upload/video");
    xhr.send(fd);
  });
}

export function ProductVideoField({ videoUrl, onChange }: ProductVideoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mode, setMode] = useState<"upload" | "url">(
    videoUrl && !videoUrl.startsWith("/api/media/videos/") && !videoUrl.startsWith("/uploads/")
      ? "url"
      : "upload"
  );

  const previewSrc = embedVideoUrl(videoUrl);
  const showInvalid =
    mode === "url" &&
    videoUrl.trim().length > 0 &&
    !isValidVideoInput(videoUrl);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`حجم فایل بیش از ${formatFileSize(MAX_VIDEO_BYTES)} است`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadVideoWithProgress(file, setUploadProgress);
      onChange(url);
      setMode("upload");
      toast.success("ویدیو آپلود شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در آپلود ویدیو");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  function handleUrlBlur() {
    if (!videoUrl.trim()) return;
    const parsed = parseVideoInput(videoUrl);
    if (parsed !== videoUrl) onChange(parsed);
  }

  function clearVideo() {
    onChange("");
    setMode("upload");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition min-h-[44px] ${
            mode === "upload"
              ? "bg-[#1e40af]/40 border-2 border-[#1e40af]/60 text-[#93c5fd]"
              : "bg-white/5 border-2 border-transparent text-white/60"
          }`}
        >
          آپلود فایل
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition min-h-[44px] ${
            mode === "url"
              ? "bg-[#1e40af]/40 border-2 border-[#1e40af]/60 text-[#93c5fd]"
              : "bg-white/5 border-2 border-transparent text-white/60"
          }`}
        >
          لینک خارجی
        </button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-3">
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e40af]/30 border-2 border-[#1e40af]/50 cursor-pointer hover:bg-[#1e40af]/50 transition font-bold text-sm touch-target min-h-[44px] w-full sm:w-auto">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? `در حال آپلود... ${uploadProgress}%` : "انتخاب ویدیو از کامپیوتر"}
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/ogg,.mp4,.mov,.webm,.m4v"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>

          {uploading && (
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#22c55e] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <p className="text-xs text-white/45">
            mp4، mov، webm — حداکثر {formatFileSize(MAX_VIDEO_BYTES)}. روی Netlify در
            Blob Storage ذخیره می‌شود.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label
            htmlFor="product-video-url"
            className="text-white/70 font-bold mb-1.5 flex items-center gap-1.5"
          >
            <Link2 className="h-4 w-4 text-[#93c5fd]" />
            Video URL
          </Label>
          <Input
            id="product-video-url"
            value={videoUrl}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleUrlBlur}
            className="filter-input h-11"
            placeholder="YouTube، آپارات، Cloudinary یا لینک mp4"
            dir="ltr"
          />
          <p className="text-xs text-white/45">
            لینک صفحه، embed یا کد iframe از YouTube و آپارات را بچسبانید.
          </p>
          {showInvalid && (
            <p className="text-xs text-[#fca5a5] font-semibold">
              لینک ویدیو شناسایی نشد
            </p>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-9 font-bold gap-1"
            onClick={clearVideo}
          >
            <X className="h-4 w-4" />
            حذف ویدیو
          </Button>
        </div>
      )}

      {previewSrc && (
        <div>
          <p className="text-xs text-[#86efac] font-semibold mb-2 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            پیش‌نمایش
          </p>
          <div className="admin-video-preview">
            {isDirectVideo(videoUrl) ? (
              <video
                key={previewSrc}
                src={previewSrc}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <iframe
                src={previewSrc}
                title="پیش‌نمایش ویدیو"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}