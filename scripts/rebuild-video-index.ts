import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { rebuildVideoIndex } = await import("../lib/video-index");
  const entries = await rebuildVideoIndex();
  console.log(`Video index rebuilt: ${entries.length} products with video`);
  if (entries.length > 0) {
    console.log("Sample:", entries.slice(0, 5));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});