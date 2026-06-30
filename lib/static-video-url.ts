import { VIDEO_MEDIA_PREFIX } from "@/lib/video-constants";

/** Map API video paths to static /uploads files for Cloudflare Pages. */
export function resolveStaticVideoUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith(VIDEO_MEDIA_PREFIX)) {
    const filename = url.slice(VIDEO_MEDIA_PREFIX.length);
    return `/uploads/admin/videos/${filename}`;
  }
  return url;
}