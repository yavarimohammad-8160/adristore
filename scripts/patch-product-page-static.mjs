#!/usr/bin/env node
/** Patch product routes for static export (Cloudflare build only). */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.join(
  process.cwd(),
  "app/products/[id]/[[...slug]]/page.tsx"
);
const LAYOUT = path.join(process.cwd(), "app/products/layout.tsx");

const SERVERFUL_PAGE_CONFIG = `export const revalidate = 300;
export const dynamicParams = true;
`;

export function patchProductPageForStaticExport() {
  let src = readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n");

  if (!src.includes('export const dynamic = "force-static"')) {
    const next = src.replace(
      /export const revalidate = 300;\nexport const dynamicParams = true;\n/,
      `export const dynamic = "force-static";\nexport const dynamicParams = false;\n`
    );
    if (next === src) {
      throw new Error("Could not patch product page — revalidate/dynamicParams block not found");
    }
    src = next;
  }
  if (!src.includes("export const dynamicParams = false")) {
    throw new Error("static export requires dynamicParams = false on the product page");
  }
  const generateCount = (src.match(/export async function generateStaticParams/g) || []).length;
  if (generateCount !== 1) {
    throw new Error(`expected one generateStaticParams, found ${generateCount}`);
  }
  writeFileSync(PAGE, src);
  console.log("  patched product page for static export");

  let layout = readFileSync(LAYOUT, "utf8").replace(/\r\n/g, "\n");
  if (!layout.includes('export const dynamic = "force-static"')) {
    layout = layout.replace(
      /export const revalidate = 300;\n/,
      'export const dynamic = "force-static";\n'
    );
  }
  writeFileSync(LAYOUT, layout);
  console.log("  patched products layout for static export");
}

export function restoreProductPageFromStaticExport() {
  let src = readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n");
  src = src.replace(
    /export const dynamic = "force-static";\nexport const dynamicParams = false;\n/,
    SERVERFUL_PAGE_CONFIG
  );
  writeFileSync(PAGE, src);
  console.log("  restored product page for serverful dev");

  let layout = readFileSync(LAYOUT, "utf8").replace(/\r\n/g, "\n");
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
