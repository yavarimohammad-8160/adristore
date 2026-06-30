import type { Metadata } from "next";
import type { Product } from "./types";
import { getPhotoUrl } from "./basalam";
import { formatPrice } from "./format";
import { productPath } from "./slug";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://adristore.ir";
export const SITE_NAME = "آدری‌استور";
export const SITE_NAME_LATIN = "adristore";
export const BRAND_NAME = "Kimdi";

export const DEFAULT_KEYWORDS = [
  "کیمدی کارت",
  "کارت کیمدی",
  "کارت فوتبال",
  "کارت کلکسیونی",
  "Kimdi",
  "آدری‌استور",
  "آدری استور",
  "کارت فوتبالی",
  "جام جهانی",
  "باسلام",
  "کارت بازیکن",
  "کارت تیم",
];

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildProductImageAlt(title: string, index?: number): string {
  const base = `کارت فوتبال Kimdi — ${title} — ${SITE_NAME}`;
  if (index != null && index > 0) {
    return `${base} — تصویر ${index + 1}`;
  }
  return base;
}

export function buildProductDescription(product: Product): string {
  const raw =
    product.description?.slice(0, 155) ||
    product.brief ||
    `خرید ${product.title} — کارت فوتبال اورجینال برند Kimdi از ${SITE_NAME}. قیمت ${formatPrice(product.price)}. ارسال از باسلام.`;
  return raw.slice(0, 160);
}

export function buildProductTitle(product: Product): string {
  return `${product.title} | کارت فوتبال Kimdi — ${SITE_NAME}`;
}

export function buildProductMetadata(product: Product): Metadata {
  const path = productPath(product.id, product.title);
  const description = buildProductDescription(product);
  const image = getPhotoUrl(product.photo, product.id);

  return {
    title: { absolute: buildProductTitle(product) },
    description,
    keywords: [
      product.title,
      BRAND_NAME,
      SITE_NAME,
      "کارت فوتبال",
      "کارت کلکسیونی",
      "خرید کارت فوتبال",
    ],
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: buildProductTitle(product),
      description,
      url: absoluteUrl(path),
      siteName: `${BRAND_NAME} — ${SITE_NAME}`,
      locale: "fa_IR",
      type: "website",
      images: image ? [{ url: image, alt: buildProductImageAlt(product.title) }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: buildProductTitle(product),
      description,
      images: image ? [image] : [],
    },
  };
}

export function buildProductJsonLd(product: Product) {
  const path = productPath(product.id, product.title);
  const images = (product.photos?.length
    ? product.photos.map((p) => p.lg || p.md || p.original || p.sm || "")
    : [getPhotoUrl(product.photo, product.id)]
  ).filter(Boolean);

  const inStock = (product.inventory ?? 0) > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description:
      product.description ||
      product.brief ||
      `کارت فوتبال کلکسیونی برند ${BRAND_NAME}`,
    image: images,
    sku: String(product.id),
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
    },
    manufacturer: {
      "@type": "Organization",
      name: BRAND_NAME,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "IRR",
      price: product.price * 10,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };
}

export const HOME_TITLE = `کیمدی کارت | کارت کیمدی اورجینال — ${SITE_NAME}`;
export const HOME_DESCRIPTION =
  `خرید کیمدی کارت و کارت کیمدی اورجینال از ${SITE_NAME}. بیش از ۱۰۰۰ کارت کلکسیونی بازیکن و تیم — نو، کدنخورده و مستقیم از باسلام. جام جهانی ۲۰۲۶.`;

export const homeMetadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: `${BRAND_NAME} — ${SITE_NAME}`,
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og-image.png", alt: `کیمدی کارت — کارت کیمدی ${BRAND_NAME} — ${SITE_NAME}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const productsCatalogMetadata: Metadata = {
  title: `کاتالوگ کارت فوتبال Kimdi | ${SITE_NAME}`,
  description:
    `مشاهده و جستجوی بیش از ۱۰۰۰ کارت فوتبال کلکسیونی برند Kimdi. فیلتر بازیکن، تیم و قیمت — ${SITE_NAME} باسلام.`,
  keywords: [...DEFAULT_KEYWORDS, "کاتالوگ کارت", "لیست کارت فوتبال"],
  alternates: { canonical: absoluteUrl("/products") },
  openGraph: {
    title: `کاتالوگ کارت فوتبال Kimdi | ${SITE_NAME}`,
    description: `تمام کارت‌های فوتبال Kimdi — جستجو، فیلتر و خرید از ${SITE_NAME}.`,
    url: absoluteUrl("/products"),
    locale: "fa_IR",
    type: "website",
  },
};

export const blogMetadata: Metadata = {
  title: `وبلاگ کارت فوتبال Kimdi | ${SITE_NAME}`,
  description:
    "راهنماها و مقالات کلکسیون کارت فوتبال Kimdi — نکات خرید، بهترین کارت‌ها و جام جهانی.",
  keywords: [...DEFAULT_KEYWORDS, "وبلاگ", "راهنمای کلکسیون"],
  alternates: { canonical: absoluteUrl("/blog") },
};