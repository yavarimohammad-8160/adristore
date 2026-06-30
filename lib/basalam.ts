import type { Product, ProductListResponse, Vendor, Photo } from "./types";
import { matchesCategory } from "./categories";
import { productMatchesSearch } from "./product-search";
import { productMatchesSeries } from "./product-series";
import { toDisplayPrice, toApiPrice } from "./format";

const BASE_URL = "https://openapi.basalam.com/v1";
const VENDOR_ID = process.env.BASALAM_VENDOR_ID || "1213430";
const TOKEN = process.env.BASALAM_TOKEN;

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (TOKEN) {
    headers["Authorization"] = `Bearer ${TOKEN}`;
  }
  return headers;
}

export function getPhotoUrl(photo?: Photo | null, fallbackId = 1): string {
  if (!photo) return `https://picsum.photos/id/${(fallbackId % 200) + 10}/400/520`;
  return photo.lg || photo.md || photo.original || photo.sm || photo.xs || "";
}

export async function getVendor(): Promise<Vendor | null> {
  try {
    const res = await fetch(`${BASE_URL}/vendors/${VENDOR_ID}`, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("Vendor fetch error:", e);
    return null;
  }
}

export interface ProductQueryParams {
  page?: number;
  per_page?: number;
  min_price?: number;
  max_price?: number;
  query?: string;
  sort?: "price:asc" | "price:desc" | "newest";
  statuses?: string[];
}

export interface SearchParams extends ProductQueryParams {
  search?: string;
  category?: string;
  filter?: string;
  /** Kimdi card series slug from product-series.ts */
  series?: string;
}

async function fetchProductsPage(
  page: number,
  per_page: number,
  extra?: { min_price?: number; max_price?: number }
): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });
  if (extra?.min_price != null) searchParams.set("min_price", String(toApiPrice(extra.min_price)));
  if (extra?.max_price != null) searchParams.set("max_price", String(toApiPrice(extra.max_price)));

  const url = `${BASE_URL}/vendors/${VENDOR_ID}/products?${searchParams.toString()}`;

  const res = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    console.error(`Basalam products fetch failed (${res.status})`);
    if (!TOKEN || res.status === 401) {
      return getMockProducts(page, per_page);
    }
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  const data = await res.json();
  return normalizeProductResponse(data, page, per_page);
}

export async function getVendorProducts(
  params: ProductQueryParams = {}
): Promise<ProductListResponse> {
  const { page = 1, per_page = 24, min_price, max_price, sort } = params;

  try {
    const result = await fetchProductsPage(page, per_page, { min_price, max_price });
    return applySort(result, sort);
  } catch (error) {
    console.error("Error fetching Basalam products:", error);
    return getMockProducts(page, per_page);
  }
}

let catalogCache: { products: Product[]; total: number; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getFullCatalog(): Promise<{ products: Product[]; total: number }> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL) {
    return { products: catalogCache.products, total: catalogCache.total };
  }

  const first = await fetchProductsPage(1, 100);
  const totalPages = first.total_pages;
  const allProducts = [...first.products];

  const pagesToFetch = Math.min(totalPages, 12);
  const fetches = [];
  for (let p = 2; p <= pagesToFetch; p++) {
    fetches.push(fetchProductsPage(p, 100));
  }

  const results = await Promise.all(fetches);
  for (const r of results) {
    allProducts.push(...r.products);
  }

  catalogCache = {
    products: allProducts,
    total: first.total,
    fetchedAt: Date.now(),
  };

  return { products: allProducts, total: first.total };
}

export async function searchVendorProducts(
  params: SearchParams = {}
): Promise<ProductListResponse> {
  const {
    page = 1,
    per_page = 24,
    search = "",
    min_price,
    max_price,
    sort,
    category = "",
    filter = "",
    series = "",
  } = params;

  try {
    const { products: allProducts, total } = await getFullCatalog();

    let filtered = allProducts;

    if (search.trim()) {
      filtered = filtered.filter((p) => productMatchesSearch(p, search));
    }

    if (category && category !== "all") {
      filtered = filtered.filter((p) =>
        matchesCategory(
          p.title,
          p.price,
          category as "player" | "team" | "price",
          filter || undefined
        )
      );
    }

    if (series && series !== "all") {
      filtered = filtered.filter((p) => productMatchesSeries(p, series));
    }

    if (min_price != null) filtered = filtered.filter((p) => p.price >= min_price);
    if (max_price != null) filtered = filtered.filter((p) => p.price <= max_price);

    if (sort === "price:asc") filtered.sort((a, b) => a.price - b.price);
    else if (sort === "price:desc") filtered.sort((a, b) => b.price - a.price);
    else if (sort === "newest") filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

    const start = (page - 1) * per_page;
    const pageProducts = filtered.slice(start, start + per_page);

    return {
      products: pageProducts,
      total: filtered.length,
      page,
      per_page,
      total_pages: Math.max(1, Math.ceil(filtered.length / per_page)),
    };
  } catch (error) {
    console.error("Search error:", error);
    return getMockProducts(page, per_page);
  }
}

function applySort(
  result: ProductListResponse,
  sort?: "price:asc" | "price:desc" | "newest"
): ProductListResponse {
  if (!sort || sort === undefined) return result;
  const products = [...result.products];
  if (sort === "price:asc") products.sort((a, b) => a.price - b.price);
  else if (sort === "price:desc") products.sort((a, b) => b.price - a.price);
  else if (sort === "newest") products.sort((a, b) => (b.id || 0) - (a.id || 0));
  return { ...result, products };
}

export async function getProduct(productId: number | string): Promise<Product | null> {
  try {
    const res = await fetch(`${BASE_URL}/products/${productId}`, {
      headers: getHeaders(),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (!TOKEN && res.status === 401) {
        return getMockProductById(String(productId));
      }
      return null;
    }
    const product = await res.json();
    return normalizeProduct(product);
  } catch (e) {
    console.error("getProduct error", e);
    return getMockProductById(String(productId));
  }
}

function extractBasalamVideoThumbnail(video: unknown): string | undefined {
  if (!video || typeof video !== "object") return undefined;
  const record = video as Record<string, unknown>;
  if (typeof record.thumbnail === "string" && record.thumbnail.trim()) {
    return record.thumbnail.trim();
  }
  return undefined;
}

function extractBasalamVideoUrl(video: unknown): string | undefined {
  if (!video) return undefined;
  if (typeof video === "string") {
    const trimmed = video.trim();
    return trimmed || undefined;
  }
  if (typeof video !== "object") return undefined;

  const record = video as Record<string, unknown>;
  const urls = record.urls as Record<string, unknown> | undefined;
  const candidates = [
    record.url,
    urls?.primary,
    urls?.original,
    urls?.mp4,
    record.original,
    record.mp4,
    record.link,
    record.src,
    record.path,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function collectPhotos(p: Record<string, unknown>): Photo[] {
  const result: Photo[] = [];
  const seen = new Set<string>();

  const add = (ph: Photo | null | undefined) => {
    if (!ph) return;
    const key = String(ph.id ?? ph.original ?? ph.lg ?? ph.md ?? "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(ph);
  };

  add((p.photo || p.main_photo) as Photo | null);
  const arr = (p.photos as Photo[]) || [];
  for (const ph of arr) add(ph);

  return result;
}

function normalizeProduct(p: Record<string, unknown>): Product {
  const price = toDisplayPrice(p.price ?? p.primary_price ?? p.final_price ?? 0);
  const photos = collectPhotos(p);
  const photo = photos[0] ?? null;
  const id = Number(p.id);

  const videoUrl = extractBasalamVideoUrl(p.video);
  const videoThumbnail = extractBasalamVideoThumbnail(p.video);

  return {
    id,
    title: String(p.title || p.name || "محصول بدون عنوان"),
    price,
    photo,
    photos,
    inventory: Number(p.inventory ?? p.stock ?? 0),
    description: String(p.description || p.brief || ""),
    brief: String(p.brief || ""),
    status: p.status as Product["status"],
    is_wholesale: !!p.is_wholesale,
    url: String(p.url || `https://basalam.com/p/${id}`),
    created_at: p.created_at as string | undefined,
    ...(videoUrl ? { videoUrl } : {}),
    ...(videoThumbnail ? { videoThumbnail } : {}),
  };
}

function normalizeProductResponse(
  data: Record<string, unknown>,
  page: number,
  per_page: number
): ProductListResponse {
  const items = (data.data || data.products || data.items || []) as Record<string, unknown>[];
  const products = items.map(normalizeProduct);

  const meta = data.meta as { total?: number } | undefined;
  const total = Number(data.total_count ?? data.total ?? meta?.total ?? products.length);
  const currentPage = Number(data.page ?? page);
  const perPage = Number(data.per_page ?? per_page);

  return {
    products,
    total,
    page: currentPage,
    per_page: perPage,
    total_pages: Number(data.total_page ?? Math.ceil(total / perPage) ?? 1),
  };
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 24018670,
    title: "آدری کیمدی - امضا Signature سری اول",
    price: 1850000,
    photo: {
      id: 1,
      original: "https://picsum.photos/id/1015/600/600",
      md: "https://picsum.photos/id/1015/400/400",
      sm: "https://picsum.photos/id/1015/300/300",
    },
    photos: [],
    inventory: 12,
    description: "کارت امضا آدری کیمدی از سری Signature.",
    brief: "امضا آدری کیمدی",
    status: { name: "در دسترس", value: 2976 },
    is_wholesale: false,
    url: "https://basalam.com/adristore",
  },
];

/** Full mock catalog for static export when BASALAM_TOKEN is unavailable. */
export function getAllMockCatalogProducts(): Product[] {
  return Array.from({ length: 42 }).flatMap((_, i) =>
    MOCK_PRODUCTS.map((p, idx) => ({
      ...p,
      id: p.id + i * 100 + idx,
      title: `${p.title} ${i > 0 ? `#${i + 1}` : ""}`.trim(),
    }))
  );
}

function getMockProducts(page: number, per_page: number): ProductListResponse {
  const simulated = getAllMockCatalogProducts();
  const start = (page - 1) * per_page;
  return {
    products: simulated.slice(start, start + per_page),
    total: simulated.length,
    page,
    per_page,
    total_pages: Math.ceil(simulated.length / per_page),
  };
}

function getMockProductById(id: string): Product {
  const found = MOCK_PRODUCTS.find((p) => String(p.id) === id);
  if (found) return found;
  return { ...MOCK_PRODUCTS[0], id: Number(id) || 999999, title: "کارت کلکسیونی ویژه" };
}

export const BASALAM_VENDOR_ID = VENDOR_ID;

/** @internal Server-only — do not expose to clients */
export function isBasalamConfigured(): boolean {
  return Boolean(TOKEN);
}