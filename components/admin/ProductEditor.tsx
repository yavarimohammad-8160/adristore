"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";


interface ProductEditorProps {
  mode: "create" | "edit";
  productId?: number;
  source?: "manual" | "basalam";
  initial?: Partial<ProductFormValues>;
}

export function ProductEditor({ mode, productId, source, initial }: ProductEditorProps) {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto">
      <AdminHeader
        title={mode === "create" ? "افزودن محصول جدید" : "ویرایش محصول"}
        subtitle={
          mode === "edit" && initial?.title
            ? initial.title
            : "تمام فیلدهای محصول را تکمیل کنید"
        }
        action={
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-lg border-2 border-[#1e40af]/40 bg-transparent text-sm font-bold hover:bg-white/5 transition"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به لیست
          </Link>
        }
      />

      {mode === "edit" && source && (
        <div
          className={`mb-4 rounded-xl border-2 px-4 py-3 text-sm font-bold ${
            source === "manual"
              ? "border-[#fbbf24]/40 bg-[#fbbf24]/10 text-[#fde047]"
              : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#86efac]"
          }`}
        >
          {source === "manual"
            ? "محصول دستی — تغییرات مستقیماً ذخیره می‌شود"
            : "محصول باسلام — تغییرات به‌صورت محلی ذخیره و روی سایت نمایش داده می‌شود"}
        </div>
      )}

      <div className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/40 p-4 sm:p-6">
        <ProductForm
          key={`${mode}-${productId ?? "new"}`}
          mode={mode}
          productId={productId}
          source={source}
          initial={initial}
          onSuccess={() => router.push("/admin/products")}
          onCancel={() => router.push("/admin/products")}
        />
      </div>
    </div>
  );
}