export interface DailyTrafficPoint {
  date: string;
  label: string;
  visitors: number;
}

export interface MonthlyTrafficPoint {
  month: string;
  label: string;
  visitors: number;
}

export interface TrafficSummary {
  today: number;
  thisMonth: number;
  last30Days: number;
  total: number;
  avgDaily30: number;
}

export interface TrafficAnalytics {
  source: "mock" | "basalam-api" | "basalam-estimated";
  sourceLabel: string;
  daily: DailyTrafficPoint[];
  monthly: MonthlyTrafficPoint[];
  summary: TrafficSummary;
  meta?: Record<string, string | number | boolean>;
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("fa-IR", { month: "short", year: "2-digit" });
}

export function buildTrafficSeries(options: {
  dailyBase: number;
  monthlyBase: number;
  seedSalt: number;
  totalHint?: number;
  now?: Date;
}): Pick<TrafficAnalytics, "daily" | "monthly" | "summary"> {
  const { dailyBase, monthlyBase, seedSalt, totalHint, now = new Date() } = options;
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  const daily: DailyTrafficPoint[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const day = date.getDay();
    const weekendBoost = day === 5 || day === 6 ? 1.26 : 1;
    const trend = 1 + (29 - i) * 0.01;
    const noise = 0.8 + seededNoise(date.getTime() / 86_400_000 + seedSalt) * 0.4;
    const visitors = Math.max(1, Math.round(dailyBase * weekendBoost * trend * noise));

    daily.push({
      date: date.toISOString().slice(0, 10),
      label: formatDayLabel(date),
      visitors,
    });
  }

  const monthly: MonthlyTrafficPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const season = 0.9 + seededNoise(date.getMonth() + date.getFullYear() + seedSalt) * 0.3;
    const growth = 1 + (11 - i) * 0.04;
    const visitors = Math.max(1, Math.round(monthlyBase * season * growth));

    monthly.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: formatMonthLabel(date),
      visitors,
    });
  }

  const last30Days = daily.reduce((sum, point) => sum + point.visitors, 0);
  const today = daily[daily.length - 1]?.visitors ?? 0;
  const thisMonth = monthly[monthly.length - 1]?.visitors ?? 0;
  const priorMonthsTotal = monthly.slice(0, -1).reduce((sum, point) => sum + point.visitors, 0);
  const total =
    totalHint ??
    priorMonthsTotal + thisMonth + Math.round(last30Days * (0.3 + seededNoise(seedSalt) * 0.15));

  return {
    daily,
    monthly,
    summary: {
      today,
      thisMonth,
      last30Days,
      total,
      avgDaily30: Math.round(last30Days / 30),
    },
  };
}

export function getWebsiteVisitAnalytics(now = new Date()): TrafficAnalytics {
  const series = buildTrafficSeries({
    dailyBase: 118,
    monthlyBase: 3200,
    seedSalt: 1,
    now,
  });

  return {
    source: "mock",
    sourceLabel: "داده نمایشی — آماده اتصال به Netlify / Google Analytics",
    ...series,
  };
}