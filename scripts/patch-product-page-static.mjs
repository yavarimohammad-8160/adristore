#!/usr/bin/env node
/** Injects static-export route config into product routes (Cloudflare build only). */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.join(
  process.cwd(),
  "app/products/[id]/[[...slug]]/page.tsx"
);
const LAYOUT = path.join(process.cwd(), "app/products/layout.tsx");

const STATIC_BLOCK = `
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/lib/types";
`;

const STATIC_CONFIG = `
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public/data/products-catalog.json"),
      "utf8"
    );
    const data = JSON.parse(raw) as { products?: Product[] };
    const products = Array.isArray(data.products) ? data.products : [];
    if (products.length > 0) {
      return products.map((p) => ({ id: String(p.id), slug: [] }));
    }
  } catch (error) {
    console.error("generateStaticParams catalog read failed:", error);
  }
  return [];
}
`;

const SERVERFUL_PAGE_CONFIG = `export const revalidate = 300;
export const dynamicParams = true;
`;

export function patchProductPageForStaticExport() {
  let src = readFileSync(PAGE, "utf8");

  if (!src.includes('from "node:fs/promises"')) {
    src = src.replace(
      'import { productPath, slugMatches } from "@/lib/slug";',
      `${STATIC_BLOCK}import { productPath, slugMatches } from "@/lib/slug";`
    );
  }

  src = src.replace(
    /export const revalidate = 300;\n(?:export const dynamicParams = true;\n)?/,
    `${STATIC_CONFIG}\n`
  );

  writeFileSync(PAGE, src);
  console.log("  patched product page for static export");

  let layout = readFileSync(LAYOUT, "utf8");
  layout = layout.replace(
    /export const revalidate = 300;\n/,
    'export const dynamic = "force-static";\n'
  );
  writeFileSync(LAYOUT, layout);
  console.log("  patched products layout for static export");
}

export function restoreProductPageFromStaticExport() {
  let src = readFileSync(PAGE, "utf8");

  src = src.replace(STATIC_BLOCK, "");
  src = src.replace(
    /export const dynamic = "force-static";\nexport const dynamicParams = false;\n\nexport async function generateStaticParams\(\) \{[\s\S]*?\}\n\n/,
    `${SERVERFUL_PAGE_CONFIG}\n`
  );

  writeFileSync(PAGE, src);
  console.log("  restored product page for serverful dev");

  let layout = readFileSync(LAYOUT, "utf8");
  layout = layout.replace(
    /export const dynamic = "force-static";\n/,
    "export const revalidate = 300;\n"
  );
  writeFileSync(LAYOUT, layout);
  console.log("  restored products layout for serverful dev");
}

const cmd = process.argv[2];
if (cmd === "patch") patchProductPageForStaticExport();
else if (cmd === "restore") restoreProductPageFromStaticExport();