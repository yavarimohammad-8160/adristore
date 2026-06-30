import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getFileExtension,
  isVideoFile,
  isSafeVideoFilename,
  MAX_VIDEO_BYTES,
} from "@/lib/upload-media";
import { saveVideoFile, videoMediaUrl } from "@/lib/video-storage";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const EXT_FALLBACK: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogg",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل ویدیو انتخاب نشده" }, { status: 400 });
    }

    if (!isVideoFile(file)) {
      return NextResponse.json(
        { error: "فرمت ویدیو پشتیبانی نمی‌شود — mp4، mov، webm" },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: "حجم ویدیو بیش از حد مجاز است (حداکثر ۵۰ مگابایت)" },
        { status: 400 }
      );
    }

    const ext =
      getFileExtension(file.name) || EXT_FALLBACK[file.type] || ".mp4";
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

    if (!isSafeVideoFilename(filename)) {
      return NextResponse.json({ error: "نام فایل نامعتبر" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const storage = await saveVideoFile(filename, buffer, file.type || "video/mp4");

    return NextResponse.json({
      url: videoMediaUrl(filename),
      filename,
      size: file.size,
      storage,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در آپلود ویدیو" }, { status: 500 });
  }
}

