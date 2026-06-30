const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-m4v",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".ogg", ".m4v"]);

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function isVideoFile(file: File): boolean {
  if (file.type && VIDEO_MIME_TYPES.has(file.type)) return true;
  const ext = getFileExtension(file.name);
  return VIDEO_EXTENSIONS.has(ext);
}

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isSafeVideoFilename(name: string): boolean {
  return /^[a-zA-Z0-9._-]+\.(mp4|webm|mov|m4v|ogg)$/i.test(name);
}