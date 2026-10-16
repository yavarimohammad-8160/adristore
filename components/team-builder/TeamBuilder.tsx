"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Search, Share2, X } from "lucide-react";
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

/** Hold this long (ms) before a press turns into a drag. */
const LONG_PRESS_MS = 280;
/** Mouse: moving this far (px) while pressed also starts a drag. */
const MOUSE_DRAG_PX = 6;
/** Touch: moving this far before the long-press fires cancels it (user is scrolling). */
const TOUCH_SLOP_PX = 10;

interface DragState {
  from: string;
  id: number;
  x: number;
  y: number;
  over: string | null;
}

/** Pure swap/move: coach only trades with coach; empty target = move. */
/** Card year from its title: 2025/2026 in Latin or Persian digits. */
export function cardYear(title: string): "2025" | "2026" | null {
  const t = title.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const m = t.match(/(?:^|\D)(202[56])(?!\d)/);
  return m ? (m[1] as "2025" | "2026") : null;
}

const YEAR_FA = { "2025": "۲۰۲۵", "2026": "۲۰۲۶" } as const;
const YEAR_CLASS = {
  "2025": "bg-sky-500 text-white",
  "2026": "bg-fuchsia-500 text-white",
} as const;

function YearBadge({ title, small }: { title: string; small?: boolean }) {
  const y = cardYear(title);
  if (!y) return null;
  return (
    <span
      className={`pointer-events-none absolute z-10 rounded font-bold leading-none shadow ${YEAR_CLASS[y]} ${
        small ? "bottom-0.5 right-0.5 px-0.5 py-px text-[8px]" : "top-1.5 right-1.5 px-1 py-0.5 text-[10px]"
      }`}
    >
      {YEAR_FA[y]}
    </span>
  );
}

/** Desktop-only (hover-capable pointer) RTL tooltip shown above the card. */
function HoverTip({ text, below }: { text: string; below?: boolean }) {
  return (
    <span
      dir="rtl"
      role="tooltip"
      className={`pointer-events-none absolute ${below ? "top-full mt-1" : "bottom-full mb-1"} left-1/2 z-30 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-[#fbbf24]/40 bg-[#0a0f1e]/95 px-2 py-1 text-center text-[11px] leading-4 text-white opacity-0 shadow-lg transition-opacity [@media(hover:hover)]:block group-hover:opacity-100`}
    >
      {text}
    </span>
  );
}

export function applyDrop(picks: Picks, from: string, to: string): Picks {
  if (from === to || !picks[from]) return picks;
  if ((from === "coach") !== (to === "coach")) return picks;
  const next = { ...picks };
  const a = picks[from];
  const b = picks[to];
  next[to] = a;
  if (b) next[from] = b;
  else delete next[from];
  return next;
}

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

  // ---- drag & drop on the pitch (pointer events, no library) ----
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const pending = useRef<{
    key: string;
    id: number;
    sx: number;
    sy: number;
    touch: boolean;
    timer: number;
  } | null>(null);

  const slotAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot-key]");
    return el?.dataset.slotKey ?? null;
  };

  const startDrag = useCallback((x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    const d = { from: p.key, id: p.id, x, y, over: p.key };
    dragRef.current = d;
    setDrag(d);
    suppressClick.current = true;
    navigator.vibrate?.(15);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (p) {
        const dist = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
        if (p.touch) {
          if (dist > TOUCH_SLOP_PX) {
            window.clearTimeout(p.timer);
            pending.current = null; // it's a scroll, not a drag
          }
        } else if (dist > MOUSE_DRAG_PX) startDrag(e.clientX, e.clientY);
        return;
      }
      const d = dragRef.current;
      if (!d) return;
      const next = { ...d, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) };
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = (e: PointerEvent) => {
      if (pending.current) {
        window.clearTimeout(pending.current.timer);
        pending.current = null;
      }
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDrag(null);
      if (e.type === "pointerup") {
        const to = slotAt(e.clientX, e.clientY);
        if (to) setPicks((cur) => applyDrop(cur, d.from, to));
      }
      // the click that follows pointerup must not open the sheet
      window.setTimeout(() => (suppressClick.current = false), 0);
    };
    // block page scroll on mobile while a card is being dragged
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current && e.cancelable) e.preventDefault();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [startDrag]);

  const onSlotPointerDown = (e: React.PointerEvent, s: Slot) => {
    const id = picks[s.key];
    if (!id || s.key === "coach") return; // only one coach slot: nothing to swap with
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const touch = e.pointerType !== "mouse";
    const { clientX, clientY } = e;
    pending.current = {
      key: s.key,
      id,
      sx: clientX,
      sy: clientY,
      touch,
      timer: window.setTimeout(() => startDrag(clientX, clientY), LONG_PRESS_MS),
    };
  };

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
    const isSource = drag?.from === s.key;
    const isTarget =
      !!drag && drag.over === s.key && drag.from !== s.key && (s.key === "coach") === (drag.from === "coach");
    const mismatch = !!card && card.position !== s.position;
    return (
      <button
        key={s.key}
        type="button"
        data-slot-key={s.key}
        onClick={() => {
          if (suppressClick.current) return;
          setActiveSlot(s);
        }}
        onPointerDown={(e) => onSlotPointerDown(e, s)}
        onContextMenu={(e) => card && e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        title={card?.title}
        className={`group select-none [-webkit-touch-callout:none] ${
          coach
            ? "flex flex-col items-center"
            : "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-[18%]"
        } ${isSource ? "opacity-40" : ""}`}
        style={coach ? undefined : { left: `${s.x}%`, top: `${s.y}%` }}
        aria-label={card ? card.title : `انتخاب ${POSITION_LABEL[s.position]}`}
      >
        {card && !drag && <HoverTip text={card.title} below={!coach && s.y < 25} />}
        <span
          className={`relative block w-12 h-16 sm:w-14 sm:h-[76px] rounded-lg overflow-hidden border-2 transition-transform ${
            isTarget
              ? "border-[#22c55e] scale-110 ring-2 ring-[#22c55e]/60"
              : card
                ? "border-[#fbbf24]"
                : "border-dashed border-white/60 bg-black/30"
          }`}
        >
          {mismatch && (
            <span
              className="absolute top-0.5 left-0.5 z-10 rounded-full bg-amber-500/90 p-0.5"
              title={`این کارت ${POSITION_LABEL[card.position]} است`}
            >
              <AlertTriangle className="h-2.5 w-2.5 text-black" />
            </span>
          )}
          {card && <YearBadge title={card.title} small />}
          {card ? (
            <SmartProductImage width={256} photo={card.product.photo} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xl text-white/70">+</span>
          )}
        </span>
        <span className="mt-1 max-w-full truncate rounded bg-black/60 px-1 text-[10px] text-white">
          {card ? card.name : POSITION_LABEL[s.position]}
        </span>
        {mismatch && (
          <span className="text-[9px] leading-3 text-amber-300">{POSITION_LABEL[card.position]}</span>
        )}
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

      <p className="mt-2 text-center text-[11px] text-white/50">
        برای جابه‌جایی، کارت را نگه دارید و روی جای دیگر بکشید
      </p>

      {/* drag ghost */}
      {drag && byId.get(drag.id) && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 w-14 h-[76px] rounded-lg overflow-hidden border-2 border-[#22c55e] shadow-2xl scale-110"
          style={{ left: drag.x, top: drag.y }}
        >
          <SmartProductImage width={256}
            photo={byId.get(drag.id)!.product.photo}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
            {(() => {
              const cur = picks[activeSlot.key] ? byId.get(picks[activeSlot.key]) : undefined;
              if (!cur) return null;
              return (
                <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 p-2">
                  <span className="relative block w-12 h-16 shrink-0 overflow-hidden rounded-lg">
                    <SmartProductImage width={256} photo={cur.product.photo} alt={cur.title} className="w-full h-full object-cover" />
                    <YearBadge title={cur.title} small />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#22c55e]">کارت فعلی</p>
                    <p className="text-xs leading-5 line-clamp-3">{cur.title}</p>
                    <p className="text-[11px] font-bold text-[#fbbf24]">{formatPrice(cur.price)}</p>
                  </div>
                </div>
              );
            })()}
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
              {options.map((c, i) => {
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
                    title={c.title}
                    className={`group relative rounded-xl border p-1 text-right ${
                      selectedHere ? "border-[#22c55e]" : "border-white/10"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-[#fbbf24]"}`}
                  >
                    <HoverTip text={c.title} below={i < 3} />
                    <span className="relative block">
                      <SmartProductImage width={256} photo={c.product.photo} alt={c.title} className="aspect-[3/4] w-full rounded-lg object-cover" />
                      <YearBadge title={c.title} />
                    </span>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 break-words">{c.title}</p>
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
