/**
 * Store admin product photos in yavarimohammad-8160/adristore-media.
 * The admin panel runs on Cloudflare (read-only disk), so writing
 * public/uploads fails. GitHub raw URLs work as soon as the commit lands.
 */

const API = "https://api.github.com";
const OWNER = "yavarimohammad-8160";
const REPO = "adristore-media";
const BRANCH = "main";
const DIR = "media/products";

export const MAX_ADMIN_IMAGE_BYTES = 8 * 1024 * 1024;

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

function mediaToken(): string {
  return (
    process.env.MEDIA_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.ADRISTORE_MEDIA_TOKEN?.trim() ||
    ""
  );
}

export function githubMediaConfigured(): boolean {
  return Boolean(mediaToken());
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function brand(bytes: Uint8Array): string {
  if (bytes.length < 12) return "";
  return String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
}

export function sniffImage(bytes: Uint8Array, filename = ""): string {
  if (bytes.length < 12) {
    throw new ImageUploadError("فایل تصویر نیست");
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ".jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return ".png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return ".webp";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return ".gif";

  const ftyp = brand(bytes);
  if (ftyp === "heic" || ftyp === "heix" || ftyp === "heif" || ftyp === "mif1") {
    throw new ImageUploadError(
      "این عکس با فرمت گوشی (HEIC) است. آن را به JPG تبدیل کنید و دوباره آپلود کنید"
    );
  }
  const lower = filename.toLowerCase();
  if (/\.(heic|heif)$/.test(lower)) {
    throw new ImageUploadError(
      "این عکس با فرمت گوشی (HEIC) است. آن را به JPG تبدیل کنید و دوباره آپلود کنید"
    );
  }
  throw new ImageUploadError("فقط عکس JPG، PNG یا WEBP قابل آپلود است");
}

type GhJson = Record<string, unknown>;

async function gh(path: string, init?: RequestInit): Promise<GhJson> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${mediaToken()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "adristore-admin",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 180)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (res.status === 204) return {};
  return (await res.json()) as GhJson;
}

function rawUrl(filename: string): string {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${DIR}/${filename}`;
}

export async function publishAdminImages(
  files: { filename: string; bytes: Uint8Array }[]
): Promise<string[]> {
  if (!files.length) return [];
  if (!githubMediaConfigured()) {
    throw new ImageUploadError("اتصال گیت‌هاب برای ذخیره عکس تنظیم نشده است");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
      const headSha = (ref.object as { sha?: string } | undefined)?.sha;
      if (!headSha) throw new Error("GitHub head missing");
      const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
      const treeSha = (commit.tree as { sha?: string } | undefined)?.sha;
      if (!treeSha) throw new Error("GitHub tree missing");

      const blobs = await Promise.all(
        files.map(async (file) => {
          const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
            method: "POST",
            body: JSON.stringify({
              content: toBase64(file.bytes),
              encoding: "base64",
            }),
          });
          const sha = blob.sha as string | undefined;
          if (!sha) throw new Error("GitHub blob missing sha");
          return {
            path: `${DIR}/${file.filename}`,
            mode: "100644",
            type: "blob",
            sha,
          };
        })
      );

      const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: treeSha, tree: blobs }),
      });
      const nextTree = tree.sha as string | undefined;
      if (!nextTree) throw new Error("GitHub tree create failed");

      const next = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: `upload product image (${files.length})`,
          tree: nextTree,
          parents: [headSha],
        }),
      });
      const nextSha = next.sha as string | undefined;
      if (!nextSha) throw new Error("GitHub commit missing sha");

      const patch = await fetch(`${API}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        method: "PATCH",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${mediaToken()}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "adristore-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sha: nextSha }),
        signal: AbortSignal.timeout(60_000),
      });
      if (patch.ok) return files.map((file) => rawUrl(file.filename));
      const body = await patch.text().catch(() => "");
      const err = new Error(`GitHub ref ${patch.status}: ${body.slice(0, 180)}`);
      (err as Error & { status?: number }).status = patch.status;
      throw err;
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (attempt === 0 && (status === 422 || status === 409)) continue;
      break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "GitHub upload failed";
  if (/401|403|Bad credentials/i.test(message)) {
    throw new ImageUploadError("دسترسی گیت‌هاب برای ذخیره عکس درست نیست");
  }
  throw new ImageUploadError("ذخیره عکس در گیت‌هاب انجام نشد. یک بار دیگر امتحان کنید");
}
