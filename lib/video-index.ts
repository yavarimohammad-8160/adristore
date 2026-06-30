import { promises as fs } from "fs";
import path from "path";
import {
  searchVendorProducts as searchBasalamCatalog,
  getProduct as getBasalamProduct,
} from "./basalam";
import { readManualProducts, manualToProduct } from "./manual-products";
import { readProductOverrides, applyProductOverride } from "./product-overrides";
import { isExcludedFromVideos } from "./video-exclusions";

const INDEX_PATH = path.join(process.cwd(), "data", "video-index.json");
const BATCH_SIZE = 20;

export interface VideoIndexEntry {
  id: number;
  videoUrl: string;
  videoThumbnail?: string;
}

export async function readVideoIndex(): Promise<VideoIndexEntry[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((entry) => {
        const record = entry as {
          id?: unknown;
          videoUrl?: unknown;
          videoThumbnail?: unknown;
        };
        const id = Number(record.id);
        const videoUrl = typeof record.videoUrl === "string" ? record.videoUrl.trim() : "";
        const videoThumbnail =
          typeof record.videoThumbnail === "string" ? record.videoThumbnail.trim() : undefined;
        if (!Number.isFinite(id) || id <= 0 || !videoUrl) return null;
        return videoThumbnail ? { id, videoUrl, videoThumbnail } : { id, videoUrl };
      })
      .filter((entry): entry is VideoIndexEntry => entry !== null);
  } catch {
    return [];
  }
}

async function writeVideoIndex(entries: VideoIndexEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await fs.writeFile(INDEX_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

/** Keep the persisted index in sync after admin video edits. */
export async function updateVideoIndexEntry(
  id: number,
  videoUrl: string | null | undefined,
  videoThumbnail?: string | null
): Promise<void> {
  const index = await readVideoIndex();
  const url = videoUrl?.trim() || "";
  const next = index.filter((entry) => entry.id !== id);
  if (url) {
    const thumb = videoThumbnail?.trim();
    next.push(thumb ? { id, videoUrl: url, videoThumbnail: thumb } : { id, videoUrl: url });
  }
  next.sort((a, b) => b.id - a.id);
  await writeVideoIndex(next);
}

/** Scan Basalam detail API + overrides/manual entries and persist video URLs. */
export async function rebuildVideoIndex(): Promise<VideoIndexEntry[]> {
  const overrides = await readProductOverrides();
  const overrideMap = new Map(overrides.map((o) => [o.id, o]));

  const { products: catalog } = await searchBasalamCatalog({ page: 1, per_page: 10000 });
  const manual = (await readManualProducts()).map(manualToProduct);

  const entries: VideoIndexEntry[] = [];
  const seen = new Set<number>();
  const idsToScan: number[] = [];

  const addEntry = (id: number, videoUrl: string, videoThumbnail?: string) => {
    const url = videoUrl.trim();
    if (!url || seen.has(id)) return;
    seen.add(id);
    const thumb = videoThumbnail?.trim();
    entries.push(thumb ? { id, videoUrl: url, videoThumbnail: thumb } : { id, videoUrl: url });
  };

  for (const product of catalog) {
    const overridden = applyProductOverride(product, overrideMap.get(product.id) ?? null);
    if (isExcludedFromVideos(overridden)) continue;
    if (overridden.videoUrl?.trim()) {
      addEntry(product.id, overridden.videoUrl, overridden.videoThumbnail);
    } else {
      idsToScan.push(product.id);
    }
  }

  for (const product of manual) {
    if (isExcludedFromVideos(product)) continue;
    if (product.videoUrl?.trim()) {
      addEntry(product.id, product.videoUrl, product.videoThumbnail);
    }
  }

  for (let i = 0; i < idsToScan.length; i += BATCH_SIZE) {
    const batch = idsToScan.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const detail = await getBasalamProduct(id);
          if (!detail) return null;
          const url = detail.videoUrl?.trim();
          if (!url) return null;
          return {
            id,
            videoUrl: url,
            videoThumbnail: detail.videoThumbnail?.trim(),
          };
        } catch {
          return null;
        }
      })
    );

    for (const result of results) {
      if (result) addEntry(result.id, result.videoUrl, result.videoThumbnail);
    }
  }

  entries.sort((a, b) => b.id - a.id);
  await writeVideoIndex(entries);
  return entries;
}