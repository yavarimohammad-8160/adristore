/**
 * Atomic Basalam → GitHub media → catalog JSON sync.
 *
 * Order (never reverse):
 *  1. Fetch live Basalam catalog (all pages)
 *  2. Download NEW/changed images with retry
 *  3. Commit images to adristore-media (extension from magic bytes)
 *  4. Wait until GitHub raw returns 200
 *  5. Purge jsDelivr (legacy mirrors)
 *  6. Write catalog JSON (adristore-img Pages URLs + Basalam remote fallback)
 *  7. Trigger Pages rebuild
 *
 * Incomplete new products are skipped (not added to JSON) and logged.
 */
import { enrichProductsWithGallery, fetchAllVendorProducts } from "./basalam";
import { sortProductsNewestFirst } from "./product-sort";
import {
  commitFiles,
  dispatchWorkflow,
  githubConfigured,
  listRepoFiles,
  readTextFile,
  triggerDeployHook,
  type GitHubRepoRef,
} from "./github-git";
import {
  collectMirrorableUrls,
  existingFilenameForStem,
  filenameFromSourceBytes,
  githubRawUrl,
  mediaHashStem,
  mediaRepoPath,
  MEDIA_BRANCH,
  MEDIA_OWNER,
  MEDIA_PRODUCTS_DIR,
  MEDIA_REPO,
  pagesImgUrl,
  purgeJsdelivrUrl,
  remapPhoto,
  uniqueProductPhotos,
} from "./media-cdn";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sleep, withRetry } from "./retry";
import { buildSeriesCatalog, type ProductSeries } from "./product-series";
import { readManualProducts, manualToProduct } from "./manual-products";
import { applyProductOverride, readProductOverrides } from "./product-overrides";
import type { Photo, Product } from "./types";
import { mergeBasalamWithManual } from "./catalog-inventory";


export type SyncLogLevel = "info" | "warn" | "error" | "ok";

export type SyncLogLine = {
  at: string;
  level: SyncLogLevel;
  step: string;
  message: string;
};

export type SkippedProduct = {
  id: number;
  title: string;
  reason: string;
};

export type BasalamSyncResult = {
  ok: boolean;
  status: "complete" | "partial" | "failed";
  products: number;
  newProductIds: number[];
  updatedExisting: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesAlreadyPresent: number;
  remainingImages: number;
  skippedProducts: SkippedProduct[];
  mediaCommitSha?: string;
  catalogCommitSha?: string;
  pagesTriggered: boolean;
  workflowDispatched: boolean;
  logs: SyncLogLine[];
  generatedAt: string;
};

export type BasalamSyncOptions = {
  maxNewImages?: number;
  forceRebuildImages?: boolean;
  dryRun?: boolean;
  dispatchGithubWorkflow?: boolean;
  onLog?: (line: SyncLogLine) => void;
};

type CatalogSnapshot = {
  products: Product[];
  seriesCatalog: ProductSeries[];
  total: number;
  generatedAt: string;
  syncMeta?: {
    imagesMirrored: number;
    imagesFailed: number;
    newProductIds: number[];
    skipped: SkippedProduct[];
  };
};

const SITE_REPO: GitHubRepoRef = {
  owner: process.env.GITHUB_SITE_OWNER?.trim() || MEDIA_OWNER,
  repo: process.env.GITHUB_SITE_REPO?.trim() || "adristore",
  branch: process.env.GITHUB_SITE_BRANCH?.trim() || "main",
};

const MEDIA_REF: GitHubRepoRef = {
  owner: MEDIA_OWNER,
  repo: MEDIA_REPO,
  branch: MEDIA_BRANCH,
};

const IMAGE_CONCURRENCY = 4;
const VERIFY_ATTEMPTS = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_CACHE_DIR = join(process.cwd(), ".media-cache");

function nowIso(): string {
  return new Date().toISOString();
}

function logger(logs: SyncLogLine[], onLog?: (line: SyncLogLine) => void) {
  return (level: SyncLogLevel, step: string, message: string) => {
    const line: SyncLogLine = { at: nowIso(), level, step, message };
    logs.push(line);
    onLog?.(line);
    const prefix = level === "error" ? "✗" : level === "warn" ? "⚠" : level === "ok" ? "✓" : "→";
    console.log(`${prefix} [${step}] ${message}`);
  };
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function downloadImage(
  url: string
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        headers: { Accept: "image/*", "User-Agent": "adristore-sync" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 128) throw new Error(`too small (${bytes.byteLength} B)`);
      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error(`too large (${bytes.byteLength} B)`);
      return { bytes, contentType: res.headers.get("content-type") };
    },
    { attempts: 4, baseDelayMs: 500, label: `download ${url.slice(0, 80)}` }
  );
}

async function waitUntilRawAvailable(filename: string, log: ReturnType<typeof logger>): Promise<boolean> {
  const url = `${githubRawUrl(filename)}?t=${Date.now()}`;
  for (let i = 0; i < VERIFY_ATTEMPTS; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "image/*,*/*" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const size = Number(res.headers.get("content-length") || 0);
        if (size === 0) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength >= 128) return true;
        } else if (size >= 128) {
          return true;
        }
      }
    } catch {
      /* retry */
    }
    await sleep(1500 * (i + 1));
  }
  log("warn", "verify", `GitHub raw not confirmed for ${filename} after ${VERIFY_ATTEMPTS} attempts`);
  return false;
}

async function purgeJsdelivr(filenames: string[], log: ReturnType<typeof logger>): Promise<void> {
  await runPool(filenames, 6, async (filename) => {
    try {
      await fetch(purgeJsdelivrUrl(filename), { signal: AbortSignal.timeout(15_000) });
    } catch (error) {
      log("warn", "jsdelivr", `purge failed ${filename}: ${error instanceof Error ? error.message : error}`);
    }
  });
}

async function readExistingCatalog(): Promise<CatalogSnapshot | null> {
  try {
    const file = await readTextFile(SITE_REPO, "public/data/home-catalog.json");
    if (!file?.content) return null;
    const data = JSON.parse(file.content) as {
      products?: Product[];
      series?: ProductSeries[];
      total?: number;
      generatedAt?: string;
    };
    if (!Array.isArray(data.products) || data.products.length < 50) return null;
    return {
      products: data.products,
      seriesCatalog: Array.isArray(data.series) ? data.series : buildSeriesCatalog(data.products),
      total: data.total ?? data.products.length,
      generatedAt: data.generatedAt ?? nowIso(),
    };
  } catch (error) {
    console.warn("Could not read catalog from GitHub:", error);
    return null;
  }
}

async function mergeWithManual(basalamProducts: Product[]): Promise<Product[]> {
  let manual: Product[] = [];
  try {
    manual = (await readManualProducts()).map(manualToProduct);
  } catch {
    manual = [];
  }
  const merged = mergeBasalamWithManual(basalamProducts, manual);
  try {
    const overrides = await readProductOverrides();
    if (!overrides.length) return merged;
    const map = new Map(overrides.map((o) => [o.id, o]));
    return merged.map((p) => applyProductOverride(p, map.get(p.id) ?? null));
  } catch {
    return merged;
  }
}

function basalamOriginalUrl(photo?: Photo | null): string | undefined {
  if (!photo) return undefined;
  return (
    photo.remote ||
    (typeof photo.original === "string" && isBasalamLike(photo.original) ? photo.original : undefined) ||
    (typeof photo.lg === "string" && isBasalamLike(photo.lg) ? photo.lg : undefined)
  );
}

function isBasalamLike(url: string): boolean {
  return /basalam\.com\//i.test(url);
}

export async function runBasalamSync(options: BasalamSyncOptions = {}): Promise<BasalamSyncResult> {
  const logs: SyncLogLine[] = [];
  const log = logger(logs, options.onLog);
  const maxNewImages = options.maxNewImages ?? (process.env.SYNC_MAX_IMAGES ? Number(process.env.SYNC_MAX_IMAGES) : 40);
  const generatedAt = nowIso();
  const skippedProducts: SkippedProduct[] = [];
  const newProductIds: number[] = [];

  const fail = (message: string): BasalamSyncResult => ({
    ok: false,
    status: "failed",
    products: 0,
    newProductIds,
    updatedExisting: 0,
    imagesDownloaded: 0,
    imagesFailed: 0,
    imagesAlreadyPresent: 0,
    remainingImages: 0,
    skippedProducts,
    pagesTriggered: false,
    workflowDispatched: false,
    logs,
    generatedAt,
  });

  if (!githubConfigured() && !options.dryRun) {
    log("error", "auth", "GITHUB_TOKEN is not set — cannot commit images or catalog");
    return fail("missing token");
  }

  log("info", "basalam", "Fetching full vendor catalog from Basalam…");
  let liveProducts: Product[];
  try {
    const fetched = await fetchAllVendorProducts();
    liveProducts = await mergeWithManual(fetched.products);
    log("ok", "basalam", `Fetched ${liveProducts.length} products (API total ${fetched.total})`);
    liveProducts = sortProductsNewestFirst(liveProducts);
    log("info", "gallery", "Fetching product details so every gallery photo is included…");
    liveProducts = await enrichProductsWithGallery(liveProducts, {
      concurrency: 5,
      onProgress: (done, total) => {
        if (done === total || done % 50 === 0) {
          log("info", "gallery", `details ${done}/${total}`);
        }
      },
    });
    const withGallery = liveProducts.filter((p) => uniqueProductPhotos(p).length > 1).length;
    log("ok", "gallery", `${withGallery}/${liveProducts.length} products have more than one photo`);
    liveProducts = sortProductsNewestFirst(liveProducts);
  } catch (error) {
    log("error", "basalam", error instanceof Error ? error.message : String(error));
    return fail("basalam fetch failed");
  }

  if (liveProducts.length < 50) {
    log("error", "basalam", `Refusing sync — only ${liveProducts.length} products (would overwrite catalog)`);
    return fail("too few products");
  }

  const existing = options.dryRun ? null : await readExistingCatalog();
  if (existing) {
    log("info", "catalog", `Existing catalog: ${existing.products.length} products (${existing.generatedAt})`);
  } else {
    log("warn", "catalog", "No existing GitHub catalog found — treating all images as new");
  }

  const existingById = new Map((existing?.products ?? []).map((p) => [p.id, p]));
  for (const product of liveProducts) {
    if (!existingById.has(product.id) && product.id < 900_000_000) {
      newProductIds.push(product.id);
    }
  }
  log("info", "diff", `${newProductIds.length} new product(s)`);

  log("info", "media", "Listing files in adristore-media…");
  let existingFiles = new Set<string>();
  try {
    existingFiles = await listRepoFiles(MEDIA_REF, MEDIA_PRODUCTS_DIR);
    log("ok", "media", `${existingFiles.size} image file(s) already in media repo`);
  } catch (error) {
    log("warn", "media", `Could not list media repo (${error instanceof Error ? error.message : error}) — will re-check per file`);
  }

  type PendingImage = { url: string; stem: string; productId: number };
  const pending: PendingImage[] = [];
  const urlToFilename = new Map<string, string>();
  let imagesAlreadyPresent = 0;

  for (const product of liveProducts) {
    for (const url of collectMirrorableUrls(product)) {
      if (urlToFilename.has(url)) continue;
      const stem = await mediaHashStem(url);
      const existingName = existingFilenameForStem(existingFiles, stem);
      if (existingName && !options.forceRebuildImages) {
        urlToFilename.set(url, existingName);
        imagesAlreadyPresent += 1;
        continue;
      }
      if (!pending.some((p) => p.stem === stem)) {
        pending.push({ url, stem, productId: product.id });
      }
    }
  }

  pending.sort((a, b) => b.productId - a.productId);

  log("info", "images", `${pending.length} image(s) to download, ${imagesAlreadyPresent} already in media repo`);

  const remainingAfterCap = Math.max(0, pending.length - maxNewImages);
  const batch = pending.slice(0, maxNewImages);
  if (remainingAfterCap > 0) {
    log("warn", "images", `Capped this run at ${maxNewImages} downloads (${remainingAfterCap} remaining — call sync again)`);
  }

  const downloaded: { path: string; bytes: Uint8Array; filename: string; url: string }[] = [];
  const failedUrls = new Set<string>();
  let imagesFailed = 0;

  await mkdir(IMAGE_CACHE_DIR, { recursive: true });
  await runPool(batch, IMAGE_CONCURRENCY, async (item) => {
    try {
      const cacheKey = join(IMAGE_CACHE_DIR, `${item.stem}.bin`);
      let bytes: Uint8Array | null = null;
      let contentType: string | null = null;
      if (existsSync(cacheKey)) {
        const cached = new Uint8Array(await readFile(cacheKey));
        if (cached.byteLength >= 128) bytes = cached;
      }
      if (!bytes) {
        const downloadedImage = await downloadImage(item.url);
        bytes = downloadedImage.bytes;
        contentType = downloadedImage.contentType;
        await writeFile(cacheKey, bytes);
      }
      const filename = await filenameFromSourceBytes(item.url, bytes, contentType);
      urlToFilename.set(item.url, filename);
      downloaded.push({
        path: mediaRepoPath(filename),
        bytes,
        filename,
        url: item.url,
      });
      log("ok", "download", `${filename} (${bytes.byteLength} B) from product ${item.productId}`);
    } catch (error) {
      imagesFailed += 1;
      failedUrls.add(item.url);
      log("error", "download", `FAILED ${item.stem} product ${item.productId}: ${error instanceof Error ? error.message : error}`);
    }
  });

  let mediaCommitSha: string | undefined;
  const verifiedFilenames = new Set<string>(existingFiles);

  if (downloaded.length > 0 && !options.dryRun) {
    log("info", "commit", `Committing ${downloaded.length} image(s) to ${MEDIA_OWNER}/${MEDIA_REPO}…`);
    try {
      const result = await withRetry(
        () =>
          commitFiles(
            MEDIA_REF,
            downloaded.map(({ path, bytes }) => ({ path, bytes })),
            `sync product images (${downloaded.length} new/changed)`
          ),
        { attempts: 3, baseDelayMs: 800, label: "media commit" }
      );
      mediaCommitSha = result.commitSha;
      log("ok", "commit", `media commit ${mediaCommitSha}`);
    } catch (error) {
      log("error", "commit", error instanceof Error ? error.message : String(error));
      for (const file of downloaded) failedUrls.add(file.url);
      imagesFailed += downloaded.length;
      downloaded.length = 0;
    }
  } else if (options.dryRun) {
    log("info", "commit", "dry-run — skipping media commit");
  }

  if (downloaded.length > 0 && mediaCommitSha) {
    log("info", "verify", "Waiting until images are reachable on GitHub raw…");
    for (const file of downloaded) {
      const ok = await waitUntilRawAvailable(file.filename, log);
      if (ok) {
        verifiedFilenames.add(file.filename);
      } else {
        failedUrls.add(file.url);
        imagesFailed += 1;
      }
    }
    const verifiedNew = downloaded.filter((f) => verifiedFilenames.has(f.filename)).map((f) => f.filename);
    if (verifiedNew.length > 0) {
      log("info", "jsdelivr", `Purging jsDelivr cache for ${verifiedNew.length} file(s)…`);
      await purgeJsdelivr(verifiedNew, log);
    }
  }

  const urlToCdn = new Map<string, string>();
  for (const [url, filename] of urlToFilename) {
    if (failedUrls.has(url)) continue;
    if (verifiedFilenames.has(filename) || existingFiles.has(filename)) {
      // Primary CDN is adristore-img Pages; Basalam stays on photo.remote via remapPhoto.
      urlToCdn.set(url, pagesImgUrl(filename));
    }
  }

  const readyProducts: Product[] = [];
  let updatedExisting = 0;

  for (const product of liveProducts) {
    const prev = existingById.get(product.id);
    const needed = collectMirrorableUrls(product);
    const failedForProduct = needed.filter((u) => failedUrls.has(u));
    const mirroredCount = needed.filter((u) => urlToCdn.has(u)).length;
    const isNew = !prev && product.id < 900_000_000;

    if (isNew && failedForProduct.length > 0) {
      skippedProducts.push({
        id: product.id,
        title: product.title,
        reason: `image download/commit failed (${failedForProduct.length} url(s))`,
      });
      log("warn", "skip", `Skipping new product ${product.id} «${product.title}» — images not ready`);
      continue;
    }

    if (isNew && needed.length > 0 && mirroredCount === 0 && remainingAfterCap > 0) {
      skippedProducts.push({
        id: product.id,
        title: product.title,
        reason: "images queued for a later sync chunk",
      });
      continue;
    }

    const mergedPhotos = uniqueProductPhotos(product).map((p) =>
      remapPhoto(p, urlToCdn, basalamOriginalUrl(p) || p.remote)
    );
    const photo = mergedPhotos[0] ?? product.photo;

    if (prev) updatedExisting += 1;
    readyProducts.push({ ...product, photo, photos: mergedPhotos });
  }

  if (existing) {
    const readyIds = new Set(readyProducts.map((p) => p.id));
    const liveById = new Map(liveProducts.map((p) => [p.id, p]));
    for (const prev of existing.products) {
      if (!readyIds.has(prev.id) && skippedProducts.some((s) => s.id === prev.id)) {
        const fresh = liveById.get(prev.id);
        readyProducts.push({ ...prev, inventory: fresh?.inventory ?? prev.inventory });
      } else if (!readyIds.has(prev.id) && prev.id < 900_000_000) {
        // A delisted vendor product remains browsable, but cannot be purchased.
        readyProducts.push({ ...prev, inventory: 0 });
        log("warn", "catalog", `Product ${prev.id} absent from complete vendor list; retained as unavailable`);
      }
    }
  }

  const snapshot: CatalogSnapshot = {
    products: sortProductsNewestFirst(readyProducts),
    seriesCatalog: buildSeriesCatalog(readyProducts),
    total: readyProducts.length,
    generatedAt,
    syncMeta: {
      imagesMirrored: downloaded.filter((f) => verifiedFilenames.has(f.filename)).length,
      imagesFailed,
      newProductIds: newProductIds.filter((id) => readyProducts.some((p) => p.id === id)),
      skipped: skippedProducts,
    },
  };

  let catalogCommitSha: string | undefined;
  let pagesTriggered = false;
  let workflowDispatched = false;

  if (!options.dryRun) {
    log("info", "catalog", `Writing catalog JSON (${snapshot.products.length} products)…`);
    const payload = (name: "home" | "products" | "series") => {
      if (name === "home") {
        return JSON.stringify({
          products: snapshot.products,
          series: snapshot.seriesCatalog,
          total: snapshot.total,
          generatedAt: snapshot.generatedAt,
          syncMeta: snapshot.syncMeta,
        });
      }
      if (name === "products") {
        return JSON.stringify({
          products: snapshot.products,
          total: snapshot.total,
          generatedAt: snapshot.generatedAt,
        });
      }
      return JSON.stringify({
        series: snapshot.seriesCatalog,
        generatedAt: snapshot.generatedAt,
      });
    };

    try {
      try {
        const { mkdir, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const dir = join(process.cwd(), "public", "data");
        await mkdir(dir, { recursive: true });
        await Promise.all([
          writeFile(join(dir, "home-catalog.json"), payload("home")),
          writeFile(join(dir, "products-catalog.json"), payload("products")),
          writeFile(join(dir, "product-series.json"), payload("series")),
        ]);
        log("ok", "catalog", "Wrote local public/data/*.json");
      } catch (error) {
        log("warn", "catalog", `local write skipped: ${error instanceof Error ? error.message : error}`);
      }

      const encoder = new TextEncoder();
      const committed = await withRetry(
        () =>
          commitFiles(
            SITE_REPO,
            [
              {
                path: "public/data/home-catalog.json",
                bytes: encoder.encode(payload("home")),
              },
              {
                path: "public/data/products-catalog.json",
                bytes: encoder.encode(payload("products")),
              },
              {
                path: "public/data/product-series.json",
                bytes: encoder.encode(payload("series")),
              },
            ],
            `sync catalog (${snapshot.products.length} products, ${snapshot.syncMeta?.newProductIds.length ?? 0} new)`
          ),
        { attempts: 3, baseDelayMs: 800, label: "catalog commit" }
      );
      catalogCommitSha = committed.commitSha;
      log("ok", "catalog", `catalog committed ${catalogCommitSha.slice(0, 8)}`);
    } catch (error) {
      log("error", "catalog", error instanceof Error ? error.message : String(error));
      return {
        ok: false,
        status: "failed",
        products: snapshot.products.length,
        newProductIds: snapshot.syncMeta?.newProductIds ?? [],
        updatedExisting,
        imagesDownloaded: downloaded.length,
        imagesFailed,
        imagesAlreadyPresent,
        remainingImages: remainingAfterCap,
        skippedProducts,
        mediaCommitSha,
        pagesTriggered,
        workflowDispatched,
        logs,
        generatedAt,
      };
    }

    const hook = process.env.CF_PAGES_DEPLOY_HOOK?.trim();
    if (hook) {
      try {
        await triggerDeployHook(hook);
        pagesTriggered = true;
        log("ok", "pages", "Triggered Cloudflare Pages deploy hook");
      } catch (error) {
        log("error", "pages", error instanceof Error ? error.message : String(error));
      }
    } else {
      log("warn", "pages", "CF_PAGES_DEPLOY_HOOK not set — GitHub push should trigger Pages if connected");
    }

    if (options.dispatchGithubWorkflow !== false && remainingAfterCap > 0) {
      try {
        await dispatchWorkflow(SITE_REPO, "basalam-sync", {
          reason: "remaining-images",
          remainingImages: remainingAfterCap,
        });
        workflowDispatched = true;
        log("ok", "workflow", "Dispatched GitHub Action to finish remaining images");
      } catch (error) {
        log("warn", "workflow", error instanceof Error ? error.message : String(error));
      }
    }
  }

  const addedNew = snapshot.syncMeta?.newProductIds.length ?? 0;
  const complete = remainingAfterCap === 0 && imagesFailed === 0 && skippedProducts.length === 0;
  log(
    complete ? "ok" : "warn",
    "done",
    `Sync ${complete ? "complete" : "partial"}: ${snapshot.products.length} products, ${addedNew} new published, ${skippedProducts.length} skipped, ${downloaded.length} images committed, ${remainingAfterCap} remaining`
  );

  return {
    ok: skippedProducts.length === 0 && imagesFailed === 0,
    status: complete ? "complete" : "partial",
    products: snapshot.products.length,
    newProductIds: snapshot.syncMeta?.newProductIds ?? [],
    updatedExisting,
    imagesDownloaded: downloaded.filter((f) => verifiedFilenames.has(f.filename)).length,
    imagesFailed,
    imagesAlreadyPresent,
    remainingImages: remainingAfterCap,
    skippedProducts,
    mediaCommitSha,
    catalogCommitSha,
    pagesTriggered,
    workflowDispatched,
    logs,
    generatedAt,
  };
}

/**
 * Re-download any catalog image whose file is missing from adristore-media,
 * using the stored Basalam `remote` URL. Does not call the Basalam API.
 */
export async function runRepairMissingMedia(
  options: BasalamSyncOptions = {}
): Promise<BasalamSyncResult> {
  const logs: SyncLogLine[] = [];
  const log = logger(logs, options.onLog);
  const generatedAt = nowIso();
  const maxNewImages = options.maxNewImages ?? Number(process.env.SYNC_MAX_IMAGES || 80);

  const empty = (status: BasalamSyncResult["status"], extra: Partial<BasalamSyncResult> = {}): BasalamSyncResult => ({
    ok: status === "complete",
    status,
    products: 0,
    newProductIds: [],
    updatedExisting: 0,
    imagesDownloaded: 0,
    imagesFailed: 0,
    imagesAlreadyPresent: 0,
    remainingImages: 0,
    skippedProducts: [],
    pagesTriggered: false,
    workflowDispatched: false,
    logs,
    generatedAt,
    ...extra,
  });

  if (!githubConfigured() && !options.dryRun) {
    log("error", "auth", "GITHUB_TOKEN is not set");
    return empty("failed");
  }

  log("info", "catalog", "Reading published catalog to find missing images…");
  const existing = await readExistingCatalog();
  if (!existing) {
    log("error", "catalog", "No catalog on GitHub — run a full Basalam sync first");
    return empty("failed");
  }

  log("info", "media", "Listing adristore-media files…");
  let existingFiles = new Set<string>();
  try {
    existingFiles = await listRepoFiles(MEDIA_REF, MEDIA_PRODUCTS_DIR);
    log("ok", "media", `${existingFiles.size} file(s) in media repo`);
  } catch (error) {
    log("error", "media", error instanceof Error ? error.message : String(error));
    return empty("failed", { products: existing.products.length });
  }

  type Pending = { url: string; filename: string; productId: number };
  const pending: Pending[] = [];
  let already = 0;

  for (const product of existing.products) {
    const photos = [product.photo, ...(product.photos ?? [])].filter(Boolean);
    for (const photo of photos) {
      if (!photo) continue;
      for (const key of ["lg", "md", "original", "sm", "xs"] as const) {
        const cdn = photo[key];
        if (typeof cdn !== "string" || !cdn.includes("media/products/")) continue;
        const filename = cdn.split("media/products/")[1]?.split("?")[0];
        if (!filename) continue;
        if (existingFiles.has(filename) && !options.forceRebuildImages) {
          already += 1;
          continue;
        }
        const source = photo.remote && isBasalamLike(photo.remote) ? photo.remote : undefined;
        if (!source) continue;
        if (pending.some((p) => p.filename === filename)) continue;
        pending.push({ url: source, filename, productId: product.id });
      }
    }
  }

  log("info", "images", `${pending.length} missing image(s), ${already} already present`);
  const remainingAfterCap = Math.max(0, pending.length - maxNewImages);
  const batch = pending.slice(0, maxNewImages);

  const downloaded: { path: string; bytes: Uint8Array; filename: string; url: string }[] = [];
  let imagesFailed = 0;
  await runPool(batch, IMAGE_CONCURRENCY, async (item) => {
    try {
      const { bytes, contentType } = await downloadImage(item.url);
      const sniffed = await filenameFromSourceBytes(item.url, bytes, contentType);
      const filename = sniffed;
      downloaded.push({
        path: mediaRepoPath(filename),
        bytes,
        filename,
        url: item.url,
      });
      log("ok", "download", `${filename} (${bytes.byteLength} B) product ${item.productId}`);
    } catch (error) {
      imagesFailed += 1;
      log("error", "download", `FAILED ${item.filename} product ${item.productId}: ${error instanceof Error ? error.message : error}`);
    }
  });

  let mediaCommitSha: string | undefined;
  if (downloaded.length > 0 && !options.dryRun) {
    log("info", "commit", `Committing ${downloaded.length} repaired image(s)…`);
    try {
      const result = await withRetry(
        () =>
          commitFiles(
            MEDIA_REF,
            downloaded.map(({ path, bytes }) => ({ path, bytes })),
            `repair missing product images (${downloaded.length})`
          ),
        { attempts: 3, baseDelayMs: 800, label: "media repair commit" }
      );
      mediaCommitSha = result.commitSha;
      log("ok", "commit", `media commit ${mediaCommitSha}`);
    } catch (error) {
      log("error", "commit", error instanceof Error ? error.message : String(error));
      return empty("failed", {
        products: existing.products.length,
        imagesDownloaded: 0,
        imagesFailed: downloaded.length,
      });
    }
    const names = downloaded.map((f) => f.filename);
    log("info", "verify", "Waiting for GitHub raw…");
    for (const name of names) {
      await waitUntilRawAvailable(name, log);
    }
    log("info", "jsdelivr", `Purging jsDelivr for ${names.length} file(s)…`);
    await purgeJsdelivr(names, log);
  }

  let pagesTriggered = false;
  const hook = process.env.CF_PAGES_DEPLOY_HOOK?.trim();
  if (hook && !options.dryRun) {
    try {
      await triggerDeployHook(hook);
      pagesTriggered = true;
      log("ok", "pages", "Triggered Cloudflare Pages deploy hook");
    } catch (error) {
      log("error", "pages", error instanceof Error ? error.message : String(error));
    }
  } else if (!hook) {
    log("warn", "pages", "CF_PAGES_DEPLOY_HOOK not set — pages will not regenerate automatically");
  }

  const complete = remainingAfterCap === 0 && imagesFailed === 0;
  log(
    complete ? "ok" : "warn",
    "done",
    `Repair ${complete ? "complete" : "partial"}: downloaded ${downloaded.length}, failed ${imagesFailed}, remaining ${remainingAfterCap}`
  );

  return {
    ok: complete,
    status: complete ? "complete" : "partial",
    products: existing.products.length,
    newProductIds: [],
    updatedExisting: 0,
    imagesDownloaded: downloaded.length,
    imagesFailed,
    imagesAlreadyPresent: already,
    remainingImages: remainingAfterCap,
    skippedProducts: [],
    mediaCommitSha,
    pagesTriggered,
    workflowDispatched: false,
    logs,
    generatedAt,
  };
}

export async function runForceRebuildImages(): Promise<BasalamSyncResult> {
  return runRepairMissingMedia({
    forceRebuildImages: false,
    maxNewImages: Number(process.env.SYNC_MAX_IMAGES || 80),
    dispatchGithubWorkflow: true,
  });
}
