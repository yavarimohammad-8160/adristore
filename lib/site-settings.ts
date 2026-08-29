import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, REVALIDATE } from "./cache-config";

export interface SiteNavLink {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  color?: string;
  enabled: boolean;
  order: number;
}

export interface SiteCustomPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  showInNav: boolean;
  navLabel?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean; // 🔴 این خط اضافه شد
  navLinks: SiteNavLink[];
  customPages: SiteCustomPage[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "site-settings.json");

import { DEFAULT_FREE_SHIPPING_THRESHOLD } from "./site-settings-constants";

export { DEFAULT_FREE_SHIPPING_THRESHOLD };

export const DEFAULT_NAV_LINKS: SiteNavLink[] = [
  { id: "home", label: "خانه", href: "/", color: "hover:text-[#22c55e]", enabled: true, order: 0 },
  { id: "products", label: "همه کارت‌ها", href: "/products", color: "hover:text-[#3b82f6]", enabled: true, order: 1 },
  { id: "videos", label: "ویدئوها", href: "/videos", color: "hover:text-[#ef4444]", enabled: true, order: 2 },
  { id: "blog", label: "وبلاگ", href: "/blog", color: "hover:text-[#fbbf24]", enabled: true, order: 3 },
  { id: "basalam", label: "باسلام", href: "https://basalam.com/adristore", color: "hover:text-[#eab308]", external: true, enabled: true, order: 4 },
];

function defaultSettings(): SiteSettings {
  const now = new Date().toISOString();
  return {
    freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    isFreeShippingEnabled: true, // 🔴 مقدار پیش‌فرض
    navLinks: DEFAULT_NAV_LINKS.map((l) => ({ ...l })),
    customPages: [],
    updatedAt: now,
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readSiteSettings(): Promise<SiteSettings> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    const base = defaultSettings();
    return {
      freeShippingThreshold:
        typeof parsed.freeShippingThreshold === "number"
          ? parsed.freeShippingThreshold
          : base.freeShippingThreshold,
      isFreeShippingEnabled: // 🔴 خوندن متغیر از فایل
        typeof parsed.isFreeShippingEnabled === "boolean"
          ? parsed.isFreeShippingEnabled
          : base.isFreeShippingEnabled,
      navLinks:
        Array.isArray(parsed.navLinks) && parsed.navLinks.length > 0
          ? parsed.navLinks
          : base.navLinks,
      customPages: Array.isArray(parsed.customPages) ? parsed.customPages : [],
      updatedAt: parsed.updatedAt || base.updatedAt,
    };
  } catch {
    return defaultSettings();
  }
}

async function writeSettings(settings: SiteSettings) {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

const getCachedSiteSettings = unstable_cache(readSiteSettings, [CACHE_TAGS.siteSettings], {
  revalidate: REVALIDATE.storefront,
  tags: [CACHE_TAGS.siteSettings],
});

export const getSiteSettings = cache(getCachedSiteSettings);

export async function saveSiteSettings(
  input: Partial<Pick<SiteSettings, "freeShippingThreshold" | "isFreeShippingEnabled" | "navLinks" | "customPages">> // 🔴 متغیر رو به آپدیت هم اضافه کردیم
): Promise<SiteSettings> {
  const current = await readSiteSettings();
  const next: SiteSettings = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await writeSettings(next);
  revalidateTag(CACHE_TAGS.siteSettings, "default");
  return next;
}

export function getEnabledNavLinks(settings: SiteSettings): SiteNavLink[] {
  const customNav = settings.customPages
    .filter((p) => p.enabled && p.showInNav)
    .map((p): SiteNavLink => ({
      id: `page-${p.id}`,
      label: p.navLabel || p.title,
      href: `/pages/${p.slug}`,
      color: "hover:text-[#a78bfa]",
      enabled: true,
      order: 50,
    }));

  return [...settings.navLinks, ...customNav]
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);
}

export async function getCustomPageBySlug(slug: string): Promise<SiteCustomPage | null> {
  const settings = await readSiteSettings();
  return settings.customPages.find((p) => p.enabled && p.slug === slug) ?? null;
}

export function slugifyPage(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
