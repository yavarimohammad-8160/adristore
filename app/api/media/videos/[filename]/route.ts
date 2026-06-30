import { NextRequest, NextResponse } from "next/server";
import { isSafeVideoFilename } from "@/lib/upload-media";
import { readVideoFile } from "@/lib/video-storage";

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { filename } = await params;

  if (!isSafeVideoFilename(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const video = await readVideoFile(filename);
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(video.body, {
    status: 200,
    headers: {
      "Content-Type": video.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    },
  });
}