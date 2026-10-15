"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminShell";

type Pos = "GK" | "DEF" | "MID" | "FWD" | "COACH";
type Value = Pos | "EXCLUDE";
interface Card {
  id: number;
  title: string;
  name: string;
  image: string | null;
  position: Pos | null;
  excluded: boolean;
  source: "manual" | "ocr" | "keyword" | "none";
  confidence: number | null;
  ocrText: string | null;
  keywordGuess: Pos | null;
  needsReview: boolean;
}

const LABEL: Record<Value, string> = {
  GK: "دروازه‌بان",
  DEF: "مدافع",
  MID: "هافبک",
  FWD: "مهاجم",
  COACH: "مربی",
  EXCLUDE: "حذف از بازی",
};
const VALUES: Value[] = ["GK", "DEF", "MID", "FWD", "COACH", "EXCLUDE"];
const SOURCE_LABEL: Record<Card["source"], string> = {
  manual: "دستی",
  ocr: "OCR",
  keyword: "حدس از اسم",
  none: "نامشخص",
};
const SOURCE_COLOR: Record<Card["source"], string> = {
  manual: "bg-[#22c55e]/20 text-[#86efac]",
  ocr: "bg-[#1e40af]/30 text-[#93c5fd]",
  keyword: "bg-[#fbbf24]/20 text-[#fde68a]",
  none: "bg-[#ef4444]/20 text-[#fca5a5]",
};

type Filter = "review" | "all" | Value | "manual";

export function PositionsManager() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [filter, setFilter] = useState<Filter>("review");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function fetchCards(): Promise<Card[]> {
    const res = await fetch("/api/admin/positions", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "خطا در بارگذاری");
    return data.cards as Card[];
  }
  async function load() {
    setCards(await fetchCards());
  }

  useEffect(() => {
    let alive = true;
    fetchCards()
      .then((c) => alive && setCards(c))
      .catch((e) => toast.error(e instanceof Error ? e.message : "خطا"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(card: Card, value: Value | null) {
    setBusy(card.id);
    try {
      const res = await fetch("/api/admin/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, position: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ذخیره");
      if (value === null) {
        await load();
      } else {
        setCards((prev) =>
          (prev || []).map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  position: value === "EXCLUDE" ? null : value,
                  excluded: value === "EXCLUDE",
                  source: "manual",
                  needsReview: false,
                }
              : c
          )
        );
      }
      toast.success(value ? `${card.name}: ${LABEL[value]}` : "برگشت به حالت خودکار");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(null);
    }
  }

  const remaining = cards?.filter((c) => c.needsReview).length ?? 0;
  const term = q.trim();
  const visible = (cards || []).filter((c) => {
      if (term && !c.title.includes(term) && !c.name.includes(term) && String(c.id) !== term) return false;
      if (filter === "review") return c.needsReview;
      if (filter === "all") return true;
      if (filter === "manual") return c.source === "manual";
      if (filter === "EXCLUDE") return c.excluded;
      return c.position === filter;
    });

  if (!cards) {
    return (
      <div className="flex items-center gap-2 text-white/60 py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
      </div>
    );
  }

  const filters: [Filter, string][] = [
    ["review", `نیاز به بررسی (${remaining})`],
    ["all", `همه (${cards.length})`],
    ...(["GK", "DEF", "MID", "FWD", "COACH", "EXCLUDE"] as Value[]).map(
      (v) => [v, LABEL[v]] as [Filter, string]
    ),
    ["manual", "اصلاح‌شده دستی"],
  ];

  return (
    <div className="max-w-6xl" dir="rtl">
      <AdminHeader
        title="پوزیشن بازیکن‌ها"
        subtitle="پوزیشن کارت‌ها در «تیمت رو بچین». تغییرات بلافاصله روی سایت اعمال می‌شود."
      />

      <div className="rounded-2xl border-2 border-[#fbbf24]/30 bg-[#111827]/60 p-4 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-lg font-black text-[#fbbf24]">{remaining.toLocaleString("fa-IR")}</span>
        <span className="text-sm text-white/70">کارت باقی‌مانده برای بررسی</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جست‌وجوی اسم بازیکن…"
          className="filter-input h-10 px-3 rounded-lg mr-auto w-full sm:w-64 bg-white/5 border border-white/10"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
              filter === key
                ? "bg-[#1e40af]/40 text-[#93c5fd] border-[#1e40af]/60"
                : "border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-white/50 py-10 text-center">
          {filter === "review" ? "همه‌ی کارت‌ها بررسی شده‌اند 🎉" : "کارتی پیدا نشد."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.slice(0, 300).map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3">
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt={c.name} loading="lazy" className="w-24 h-32 object-cover rounded-lg shrink-0 bg-black/30" />
            ) : (
              <div className="w-24 h-32 rounded-lg bg-black/30 shrink-0" />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <p className="font-bold text-sm leading-5 line-clamp-2" title={c.title}>{c.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-white/10">
                  {c.excluded ? "حذف از بازی" : c.position ? LABEL[c.position] : "بدون پوزیشن"}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${SOURCE_COLOR[c.source]}`}>
                  {SOURCE_LABEL[c.source]}
                  {c.source === "ocr" && c.confidence != null ? ` ${c.confidence}%` : ""}
                </span>
                <span className="text-white/30 font-mono">#{c.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {VALUES.map((v) => {
                  const current = v === "EXCLUDE" ? c.excluded : !c.excluded && c.position === v;
                  return (
                    <button
                      key={v}
                      disabled={busy === c.id}
                      onClick={() => save(c, v)}
                      className={`text-[11px] font-bold rounded-lg py-1.5 border transition disabled:opacity-50 ${
                        current
                          ? v === "EXCLUDE"
                            ? "bg-[#ef4444]/30 border-[#ef4444]/60 text-[#fca5a5]"
                            : "bg-[#22c55e]/25 border-[#22c55e]/60 text-[#86efac]"
                          : "border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {LABEL[v]}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {c.needsReview && c.position && (
                  <button
                    disabled={busy === c.id}
                    onClick={() => save(c, c.position)}
                    className="flex items-center gap-1 text-[11px] text-[#86efac] hover:underline"
                  >
                    <Check className="h-3 w-3" /> تأیید همین ({LABEL[c.position]})
                  </button>
                )}
                {c.source === "manual" && (
                  <button
                    disabled={busy === c.id}
                    onClick={() => save(c, null)}
                    className="flex items-center gap-1 text-[11px] text-white/50 hover:underline"
                  >
                    <Undo2 className="h-3 w-3" /> برگشت به خودکار
                  </button>
                )}
                {busy === c.id && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
            </div>
          </div>
        ))}
      </div>
      {visible.length > 300 && (
        <p className="text-xs text-white/40 mt-4">۳۰۰ کارت اول نمایش داده شد؛ از جست‌وجو یا فیلتر استفاده کنید.</p>
      )}
    </div>
  );
}
