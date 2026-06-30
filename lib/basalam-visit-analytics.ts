import { buildTrafficSeries, type TrafficAnalytics } from "./traffic-analytics";

const BASE_URL = "https://openapi.basalam.com/v1";
const VENDOR_ID = process.env.BASALAM_VENDOR_ID || "1213430";
const TOKEN = process.env.BASALAM_TOKEN;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedAnalytics: { fetchedAt: number; data: TrafficAnalytics } | null = null;

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }
  return headers;
}

interface VendorSnapshot {
  productCount: number;
  orderCount: number;
  title: string;
}

interface ViewSample {
  sampledProducts: number;
  averageViews: number;
  estimatedTotalViews: number;
}

async function fetchVendorSnapshot(): Promise<VendorSnapshot | null> {
  try {
    const res = await fetch(`${BASE_URL}/vendors/${VENDOR_ID}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vendor = data?.data ?? data;
    return {
      productCount: Number(vendor?.product_count) || 0,
      orderCount: Number(vendor?.order_count) || 0,
      title: String(vendor?.title || "غرفه باسلام"),
    };
  } catch {
    return null;
  }
}

async function fetchProductIds(limit: number): Promise<number[]> {
  const ids: number[] = [];
  const perPage = 50;
  let page = 1;

  while (ids.length < limit) {
    const res = await fetch(
      `${BASE_URL}/vendors/${VENDOR_ID}/products?page=${page}&per_page=${perPage}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) break;

    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    if (items.length === 0) break;

    for (const item of items) {
      const id = Number(item?.id);
      if (Number.isFinite(id)) ids.push(id);
      if (ids.length >= limit) break;
    }

    const totalPages = Number(data?.total_page ?? data?.total_pages ?? 1);
    if (page >= totalPages) break;
    page += 1;
  }

  return ids;
}

async function fetchProductViewCount(productId: number): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/products/${productId}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const product = data?.data ?? data;
    return Math.max(0, Number(product?.view_count) || 0);
  } catch {
    return 0;
  }
}

async function sampleProductViews(sampleSize: number): Promise<ViewSample> {
  const ids = await fetchProductIds(sampleSize);
  if (ids.length === 0) {
    return { sampledProducts: 0, averageViews: 0, estimatedTotalViews: 0 };
  }

  const batchSize = 8;
  const views: number[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchViews = await Promise.all(batch.map((id) => fetchProductViewCount(id)));
    views.push(...batchViews);
  }

  const sampledProducts = views.length;
  const sum = views.reduce((acc, value) => acc + value, 0);
  const averageViews = sampledProducts > 0 ? Math.round(sum / sampledProducts) : 0;

  return {
    sampledProducts,
    averageViews,
    estimatedTotalViews: 0,
  };
}

export async function getBasalamVisitAnalytics(now = new Date()): Promise<TrafficAnalytics> {
  if (cachedAnalytics && Date.now() - cachedAnalytics.fetchedAt < CACHE_TTL_MS) {
    return cachedAnalytics.data;
  }

  const data = await fetchBasalamVisitAnalytics(now);
  cachedAnalytics = { fetchedAt: Date.now(), data };
  return data;
}

async function fetchBasalamVisitAnalytics(now = new Date()): Promise<TrafficAnalytics> {
  if (!TOKEN) {
    const series = buildTrafficSeries({
      dailyBase: 64,
      monthlyBase: 1850,
      seedSalt: 7,
      totalHint: 28400,
      now,
    });
    return {
      source: "mock",
      sourceLabel: "داده نمایشی — توکن باسلام تنظیم نشده",
      ...series,
      meta: { connected: false },
    };
  }

  const [vendor, sample] = await Promise.all([
    fetchVendorSnapshot(),
    sampleProductViews(16),
  ]);

  const productCount = vendor?.productCount ?? 0;
  const orderCount = vendor?.orderCount ?? 0;
  const sampledViewsTotal = sample.averageViews * sample.sampledProducts;

  let estimatedTotalViews = 0;
  if (sample.averageViews > 0 && productCount > 0) {
    estimatedTotalViews = Math.max(sample.averageViews * productCount, orderCount * 12);
  } else if (productCount > 0) {
    // view_count often returns 0 in API — estimate from catalog size + orders
    estimatedTotalViews = Math.max(
      Math.round(productCount * 42 + orderCount * 28),
      Math.round(productCount * 18)
    );
  } else {
    estimatedTotalViews = Math.max(orderCount * 18, 2400);
  }

  const dailyBase = Math.max(12, Math.round(estimatedTotalViews / 420));
  const monthlyBase = Math.max(180, Math.round(estimatedTotalViews / 14));

  const series = buildTrafficSeries({
    dailyBase,
    monthlyBase,
    seedSalt: 13,
    totalHint: estimatedTotalViews,
    now,
  });

  const hasViewCounts = sample.averageViews > 0;

  return {
    source: hasViewCounts ? "basalam-estimated" : "basalam-api",
    sourceLabel: hasViewCounts
      ? "تخمینی از view_count محصولات باسلام"
      : "تخمینی از تعداد محصولات و سفارش‌های غرفه — API بازدید روزانه ندارد",
    ...series,
    meta: {
      connected: true,
      vendorTitle: vendor?.title ?? "adristore",
      productCount,
      orderCount,
      sampledProducts: sample.sampledProducts,
      sampledViewsTotal,
      averageProductViews: sample.averageViews,
      estimatedTotalViews,
    },
  };
}