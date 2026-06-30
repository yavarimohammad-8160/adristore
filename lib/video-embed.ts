import { VIDEO_MEDIA_PREFIX } from "./video-constants";

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;

function isHostedVideoPath(input: string): boolean {
  return (
    input.startsWith(VIDEO_MEDIA_PREFIX) ||
    input.startsWith("/uploads/admin/videos/")
  );
}

/** Extract playable URL from pasted link or iframe embed code */
export function parseVideoInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const iframeSrc = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrc?.[1]) return iframeSrc[1].trim();

  const srcAttr = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcAttr?.[1] && /youtube|aparat|cloudinary|\.mp4/i.test(srcAttr[1])) {
    return srcAttr[1].trim();
  }

  return trimmed;
}

export function embedVideoUrl(url: string): string | null {
  const input = parseVideoInput(url);
  if (!input) return null;

  const ytWatch = input.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  const ytEmbed = input.match(/youtube\.com\/embed\/([\w-]{11})/);
  if (ytEmbed) return `https://www.youtube.com/embed/${ytEmbed[1]}`;

  const aparatPage = input.match(/aparat\.com\/v\/([\w]+)/);
  if (aparatPage) {
    return `https://www.aparat.com/video/video/embed/videohash/${aparatPage[1]}/vt/frame`;
  }

  const aparatEmbed = input.match(/aparat\.com\/video\/video\/embed\/videohash\/([\w]+)/);
  if (aparatEmbed) {
    return `https://www.aparat.com/video/video/embed/videohash/${aparatEmbed[1]}/vt/frame`;
  }

  if (isHostedVideoPath(input)) return input;

  if (input.startsWith("http") && DIRECT_VIDEO_EXT.test(input)) return input;

  if (/cloudinary\.com/i.test(input) && /\/video\//i.test(input)) return input;

  return null;
}

export function isDirectVideo(url: string): boolean {
  const input = parseVideoInput(url);
  if (isHostedVideoPath(input)) return true;
  if (!input.startsWith("http")) return false;
  if (/cloudinary\.com/i.test(input) && /\/video\//i.test(input)) return true;
  return DIRECT_VIDEO_EXT.test(input);
}

export function isValidVideoInput(url: string): boolean {
  const input = parseVideoInput(url);
  if (isHostedVideoPath(input)) return true;
  return embedVideoUrl(url) !== null;
}