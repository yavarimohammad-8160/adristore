/**
 * CLI entry for atomic Basalam sync (GitHub Action + local).
 *
 *   npx tsx scripts/sync-from-basalam.ts
 *   npx tsx scripts/sync-from-basalam.ts --force-images
 *   npx tsx scripts/sync-from-basalam.ts --dry-run
 */
import { loadOptionalEnvFiles } from "./load-env.mjs";
import { runBasalamSync } from "../lib/basalam-sync";

loadOptionalEnvFiles();

const args = new Set(process.argv.slice(2));

async function main() {
  const result = await runBasalamSync({
    forceRebuildImages: args.has("--force-images") || process.env.FORCE_IMAGE_REBUILD === "1",
    dryRun: args.has("--dry-run"),
    maxNewImages: Number(process.env.SYNC_MAX_IMAGES || 400),
    dispatchGithubWorkflow: false,
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        status: result.status,
        products: result.products,
        newProductIds: result.newProductIds,
        imagesDownloaded: result.imagesDownloaded,
        imagesFailed: result.imagesFailed,
        remainingImages: result.remainingImages,
        skipped: result.skippedProducts,
        pagesTriggered: result.pagesTriggered,
        mediaCommitSha: result.mediaCommitSha,
      },
      null,
      2
    )
  );

  if (result.status === "failed") process.exit(1);
  if (result.remainingImages > 0) {
    console.warn(`Remaining images: ${result.remainingImages} — re-run to finish`);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("sync-from-basalam failed:", error);
  process.exit(1);
});
