import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "فایلی انتخاب نشده" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "admin");
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const ext = path.extname(file.name) || ".jpg";
      const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, name), buffer);
      urls.push(`/uploads/admin/${name}`);
    }

    return NextResponse.json({ urls });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "خطا در آپلود" }, { status: 500 });
  }
}

