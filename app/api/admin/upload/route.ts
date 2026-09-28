import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  ImageUploadError,
  MAX_ADMIN_IMAGE_BYTES,
  githubMediaConfigured,
  publishAdminImages,
  sniffImage,
} from "@/lib/publish-admin-image";

export const dynamic = "force-dynamic";

function safeName(ext: string): string {
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

async function saveLocal(name: string, bytes: Uint8Array): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "admin");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, name), bytes);
  return `/uploads/admin/${name}`;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);
    if (!files.length) {
      return NextResponse.json({ error: "فایلی انتخاب نشده" }, { status: 400 });
    }

    const prepared: { filename: string; bytes: Uint8Array }[] = [];
    for (const file of files) {
      if (file.size > MAX_ADMIN_IMAGE_BYTES) {
        throw new ImageUploadError("حجم عکس بیشتر از ۸ مگابایت است");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = sniffImage(bytes, file.name);
      prepared.push({ filename: safeName(ext), bytes });
    }

    if (githubMediaConfigured()) {
      const urls = await publishAdminImages(prepared);
      return NextResponse.json({ urls });
    }

    const urls: string[] = [];
    for (const file of prepared) {
      urls.push(await saveLocal(file.filename, file.bytes));
    }
    return NextResponse.json({ urls });
  } catch (e) {
    if (e instanceof ImageUploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const detail = e instanceof Error ? e.message : "";
    const readOnly = /EROFS|read-only|EPERM|ENOENT/i.test(detail);
    return NextResponse.json(
      {
        error: readOnly
          ? "سرور عکس را ذخیره نکرد. اتصال گیت‌هاب برای آپلود تنظیم نشده است"
          : "خطا در آپلود",
      },
      { status: 500 }
    );
  }
}
