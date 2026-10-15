"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Search, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/CartContext";
import { SmartProductImage } from "@/components/SmartProductImage";
import { formatPrice } from "@/lib/format";
import {
  FORMATIONS,
  POSITION_LABEL,
  formationSlots,
  type FormationKey,
  type Slot,
  type TeamCard,
  type TeamPosition,
} from "@/lib/team-positions";

const COACH_SLOT: Slot = { key: "coach", position: "COACH", x: 0, y: 0 };
const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[];

type Picks = Record<string, number>; // slot key -> product id

function parseShare(q: URLSearchParams): { f: FormationKey; picks: Picks } | null {
  const f = q.get("f") as FormationKey | null;
  if (!f || !FORMATION_KEYS.includes(f)) return null;
  const picks: Picks = {};
  const ids = (q.get("p") || "").split(",");
  formationSlots(f).forEach((s, i) => {
    const id = Number(ids[i]);
    if (id > 0) picks[s.key] = id;
  });
  const c = Number(q.get("c"));
  if (c > 0) picks.coach = c;
  return { f, picks };
}

function shareUrl(f: FormationKey, picks: Picks): string {
  const p = formationSlots(f).map((s) => picks[s.key] ?? "").join(",");
  const q = new URLSearchParams({ f, p });
  if (picks.coach) q.set("c", String(picks.coach));
  return `${window.location.origin}/team-builder?${q.toString()}`;
}

export function TeamBuilder({ pool }: { pool: TeamCard[] }) {
  const { addManyToCart, openCart } = useCart();
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const shared = parseShare(new URLSearchParams(searchParams.toString()));
    if (!shared) return { f: "4-3-3" as FormationKey, picks: {} as Picks };
    const ids = new Set(pool.map((c) => c.id));
    const picks: Picks = {};
    for (const [k, id] of Object.entries(shared.picks)) if (ids.has(id)) picks[k] = id;
    return { f: shared.f, picks };
  });
  const [formation, setFormation] = useState<FormationKey>(initial.f);
  const [picks, setPicks] = useState<Picks>(initial.picks);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [query, setQuery] = useState("");
  const [hideOut, setHideOut] = useState(false);

  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  const slots = useMemo(() => formationSlots(formation), [formation]);
  const allSlots = useMemo(() => [...slots, COACH_SLOT], [slots]);

  // keep URL in sync so the lineup is always shareable
  useEffect(() => {
    if (Object.keys(picks).length === 0) return;
    window.history.replaceState(null, "", shareUrl(formation, picks));
  }, [formation, picks]);

  const changeFormation = (f: FormationKey) => {
    // keep picks whose slot still exists, re-seat the rest by position
    const nextSlots = formationSlots(f);
    const old = slots.filter((s) => picks[s.key]).map((s) => ({ pos: s.position, id: picks[s.key] }));
    const next: Picks = picks.coach ? { coach: picks.coach } : {};
    for (const s of nextSlots) {
      const i = old.findIndex((o) => o.pos === s.position);
      if (i >= 0) next[s.key] = old.splice(i, 1)[0].id;
    }
    setFormation(f);
    setPicks(next);
  };

  const chosen = allSlots.map((s) => (picks[s.key] ? byId.get(picks[s.key]) : undefined));
  const filled = chosen.filter(Boolean).length;
  const total = chosen.reduce((sum, c) => sum + (c?.price ?? 0), 0);
  const complete = filled === allSlots.length;
  const usedIds = new Set(Object.values(picks));

  const options = useMemo(() => {
    if (!activeSlot) return [];
    const q = query.trim();
    return pool.filter(
      (c) =>
        c.position === activeSlot.position &&
        (!hideOut || c.inventory > 0) &&
        (!q || c.title.includes(q))
    );
  }, [pool, activeSlot, query, hideOut]);

  const choose = (card: TeamCard) => {
    if (!activeSlot) return;
    setPicks((p) => ({ ...p, [activeSlot.key]: card.id }));
    setActiveSlot(null);
    setQuery("");
  };

  const finish = () => {
    const products = chosen.filter((c): c is TeamCard => !!c).map((c) => c.product);
    // TODO(team-discount): apply a "full team" discount here once checkout supports one.
    const added = addManyToCart(products);
    if (added > 0) openCart();
  };

  const share = async () => {
    const url = shareUrl(formation, picks);
    try {
      if (navigator.share) await navigator.share({ title: "تیم رویایی من در آدری‌استور", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("لینک ترکیب کپی شد");
      }
    } catch {}
  };

  const renderSlot = (s: Slot, coach = false) => {
    const card = picks[s.key] ? byId.get(picks[s.key]) : undefined;
    return (
      <button
        key={s.key}
        type="button"
        onClick={() => setActiveSlot(s)}
        className={
          coach
            ? "flex flex-col items-center"
            : "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-[18%]"
        }
        style={coach ? undefined : { left: `${s.x}%`, top: `${s.y}%` }}
        aria-label={`انتخاب ${POSITION_LABEL[s.position]}`}
      >
        <span
          className={`relative block w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg overflow-hidden border-2 ${
            card ? "border-[#fbbf24]" : "border-dashed border-white/60 bg-black/30"
          }`}
        >
          {card ? (
            <SmartProductImage photo={card.product.photo} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xl text-white/70">+</span>
          )}
        </span>
        <span className="mt-1 max-w-full truncate rounded bg-black/60 px-1 text-[10px] text-white">
          {card ? card.name : POSITION_LABEL[s.position]}
        </span>
      </button>
    );
  };

  return (
    <div className="mt-4">
      <div className="flex justify-center gap-2" role="radiogroup" aria-label="ترکیب">
        {FORMATION_KEYS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={formation === f}
            onClick={() => changeFormation(f)}
            className={`rounded-xl px-3 py-1.5 text-sm font-bold border ${
              formation === f ? "bg-[#22c55e] text-black border-[#22c55e]" : "border-white/20 text-white/80"
            }`}
            dir="ltr"
          >
            {f}
          </button>
        ))}
      </div>

      <div
        className="relative mt-4 aspect-[3/4] w-full rounded-2xl border-2 border-white/40 overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(0deg,#15803d 0 10%,#166534 10% 20%)",
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/50" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
        <div className="absolute left-1/2 top-0 h-[14%] w-1/2 -translate-x-1/2 border border-t-0 border-white/50" />
        <div className="absolute left-1/2 bottom-0 h-[14%] w-1/2 -translate-x-1/2 border border-b-0 border-white/50" />
        {slots.map((s) => renderSlot(s))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <span className="text-sm text-white/70">مربی:</span>
        {renderSlot(COACH_SLOT, true)}
      </div>

      {/* sticky total */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1e40af]/40 bg-[#0a0f1e]/95 backdrop-blur px-3 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-white/60">{filled} از {allSlots.length} انتخاب شده</p>
            <p className="font-bold text-[#fbbf24]">{formatPrice(total)}</p>
          </div>
          <button
            type="button"
            onClick={share}
            disabled={filled === 0}
            className="rounded-xl border border-white/20 p-2.5 text-white disabled:opacity-40"
            aria-label="اشتراک‌گذاری ترکیب"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={!complete}
            className="btn-primary rounded-xl px-5 py-2.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            تیمم کامله ✅
          </button>
        </div>
      </div>

      {/* bottom sheet */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="بستن" onClick={() => setActiveSlot(null)} />
          <div className="relative w-full max-w-xl mx-auto max-h-[80vh] flex flex-col rounded-t-3xl bg-[#0a0f1e] border-t border-[#1e40af]/50">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="font-display text-lg">انتخاب {POSITION_LABEL[activeSlot.position as TeamPosition]}</h2>
              <button type="button" onClick={() => setActiveSlot(null)} aria-label="بستن">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/5 px-3">
                <Search className="h-4 w-4 text-white/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی نام بازیکن…"
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
              </div>
              <label className="flex items-center gap-1 text-xs text-white/70 whitespace-nowrap">
                <input type="checkbox" checked={hideOut} onChange={(e) => setHideOut(e.target.checked)} />
                فقط موجودها
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4">
              {options.length === 0 && <p className="col-span-3 text-center text-white/50 py-8">کارتی پیدا نشد</p>}
              {options.map((c) => {
                const out = c.inventory <= 0;
                const selectedHere = picks[activeSlot.key] === c.id;
                const usedElsewhere = !selectedHere && usedIds.has(c.id);
                const disabled = out || usedElsewhere;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => choose(c)}
                    className={`relative rounded-xl border p-1 text-right ${
                      selectedHere ? "border-[#22c55e]" : "border-white/10"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-[#fbbf24]"}`}
                  >
                    <SmartProductImage photo={c.product.photo} alt={c.title} className="aspect-[3/4] w-full rounded-lg object-cover" />
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4">{c.name}</p>
                    <p className="text-[11px] font-bold text-[#fbbf24]">
                      {out ? "ناموجود" : usedElsewhere ? "در تیم" : formatPrice(c.price)}
                    </p>
                    {selectedHere && <Check className="absolute top-2 left-2 h-4 w-4 text-[#22c55e]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
