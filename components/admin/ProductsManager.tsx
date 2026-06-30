"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, RefreshBasalamButton } from "@/components/admin/AdminShell";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatPrice } from "@/lib/format";

const CATEGORIES = ["all", "عمومی", "بازیکن", "تیم", "لیمیتد", "امضا", "روکی", "جام جهانی"];

interface AdminProduct {
  id: number;
  title: string;
  price: number;
  inventory?: number;
  source: "manual" | "basalam";
  category?: string;
  tags?: string[];
  photo?: { sm?: string; md?: string; original?: string } | null;
  photos?: { sm?: string; md?: string; original?: string }[];
}

export function ProductsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "manual" | "basalam">("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ manual: 0, basalam: 0, total: 0 });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        source: filter,
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (stock) params.set("stock", stock);

      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const data = await res.json();
      setProducts(data.products || []);
      setCounts({
        manual: data.manual || 0,
        basalam: data.basalam || 0,
        total: data.total || 0,
      });
      setTotalPages(data.total_pages || 1);
    } catch {
      toast.error("خطا در بارگذاری محصولات");
    } finally {
      setLoading(false);
    }
  }, [filter, page, search, category, minPrice, maxPrice, stock]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      router.replace("/admin/products/new");
    }
  }, [searchParams, router]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در حذف");
      toast.success("محصول حذف شد");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف");
    } finally {
      setDeleting(false);
    }
  }

  function applyFilters() {
    setPage(1);
    load();
  }

  return (
    <div>
      <AdminHeader
        title="مدیریت محصولات"
        subtitle={`${counts.manual} دستی • ${counts.basalam} باسلام • ${counts.total} نتیجه`}
        action={
          <>
            <RefreshBasalamButton onSuccess={load} />
            <Link href="/admin/products/new">
              <Button className="btn-fun btn-primary font-bold gap-1">
                <Plus className="h-4 w-4" /> محصول جدید
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "manual", "basalam"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filter === f
                ? "bg-[#1e40af]/40 border-2 border-[#1e40af]/60 text-[#93c5fd]"
                : "bg-white/5 border-2 border-transparent text-white/60 hover:text-white"
            }`}
          >
            {f === "all" ? "همه محصولات" : f === "manual" ? "محصولات دستی" : "محصولات باسلام"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/40 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="جستجو در نام محصول..."
              className="filter-input h-10 pr-10"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="filter-input h-10 px-3 text-sm font-semibold"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "همه دسته‌ها" : c}
              </option>
            ))}
          </select>
          <Input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="حداقل قیمت"
            className="filter-input h-10"
          />
          <Input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="حداکثر قیمت"
            className="filter-input h-10"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="filter-input h-9 px-3 text-sm"
          >
            <option value="">همه موجودی</option>
            <option value="in">موجود</option>
            <option value="out">ناموجود</option>
          </select>
          <Button onClick={applyFilters} size="sm" className="btn-fun btn-blue font-bold">
            اعمال فیلتر
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-[#1e40af]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-[#1e40af]/20 text-[#93c5fd]">
                <tr>
                  <th className="text-right p-4 font-bold">تصویر</th>
                  <th className="text-right p-4 font-bold">نام</th>
                  <th className="text-right p-4 font-bold">قیمت</th>
                  <th className="text-right p-4 font-bold">موجودی</th>
                  <th className="text-right p-4 font-bold">منبع</th>
                  <th className="text-right p-4 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const img = p.photo?.sm || p.photo?.md || p.photo?.original;
                  const isManual = p.source === "manual";
                  return (
                    <tr
                      key={`${p.source}-${p.id}`}
                      className="border-t border-white/10 hover:bg-white/5"
                    >
                      <td className="p-3">
                        {img ? (
                          <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                            🃏
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold max-w-[220px]">
                        <span className="truncate block">{p.title}</span>
                        {p.tags?.length ? (
                          <span className="text-xs text-white/40">{p.tags.join(" • ")}</span>
                        ) : null}
                      </td>
                      <td className="p-3 text-[#fbbf24] font-bold whitespace-nowrap">
                        {formatPrice(p.price)}
                      </td>
                      <td className="p-3">{p.inventory ?? "—"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            isManual
                              ? "bg-[#fbbf24]/20 text-[#fde047]"
                              : "bg-[#22c55e]/20 text-[#86efac]"
                          }`}
                        >
                          {isManual ? "دستی" : "باسلام"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Button
                              size="sm"
                              className="h-9 px-3 btn-fun btn-blue font-bold gap-1.5 min-w-[88px]"
                            >
                              <Pencil className="h-4 w-4" />
                              ویرایش
                            </Button>
                          </Link>
                          {isManual ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-9 px-2.5"
                              onClick={() => setDeleteId(p.id)}
                              aria-label="حذف محصول"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Link href={`/products/${p.id}`} target="_blank">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-2.5 border-[#1e40af]/40"
                                aria-label="مشاهده در سایت"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <p className="text-center py-12 text-white/50">محصولی یافت نشد</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="قبلی"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={page === p}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                  >
                    {p.toLocaleString("fa-IR")}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                text="بعدی"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف محصول"
        description="آیا از حذف این محصول مطمئن هستید؟ این عمل قابل بازگشت نیست."
        confirmLabel="حذف"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}