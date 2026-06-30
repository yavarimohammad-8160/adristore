import { getStore } from "@netlify/blobs";
import { VIDEO_MEDIA_PREFIX } from "./video-constants";
import fs from "fs/promises";
import path from "path";

const STORE_NAME = "adristore-videos";
const LOCAL_VIDEO_DIR = path.join(process.cwd(), "public", "uploads", "admin", "videos");

export function videoMediaUrl(filename: string): string {
  return `${VIDEO_MEDIA_PREFIX}${filename}`;
}

async function getVideoStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function saveVideoFile(
  filename: string,
  data: ArrayBuffer,
  contentType: string
): Promise<"blob" | "local"> {
  try {
    const store = await getVideoStore();
    await store.set(filename, data, {
      metadata: { contentType },
    });
    return "blob";
  } catch {
    await fs.mkdir(LOCAL_VIDEO_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_VIDEO_DIR, filename), Buffer.from(data));
    return "local";
  }
}

export async function readVideoFile(
  filename: string
): Promise<{ body: BodyInit; contentType: string } | null> {
  try {
    const store = await getVideoStore();
    const result = await store.getWithMetadata(filename, { type: "stream" });
    if (result?.data) {
      const contentType =
        (result.metadata?.contentType as string | undefined) || guessContentType(filename);
      return { body: result.data, contentType };
    }
  } catch {
    // fall through to local
  }

  try {
    const localPath = path.join(LOCAL_VIDEO_DIR, filename);
    const buf = await fs.readFile(localPath);
    return {
      body: new Uint8Array(buf),
      contentType: guessContentType(filename),
    };
  } catch {
    return null;
  }
}

function guessContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
  };
  return map[ext] || "video/mp4";
}