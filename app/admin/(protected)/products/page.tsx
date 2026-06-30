import { Suspense } from "react";
import { ProductsManager } from "@/components/admin/ProductsManager";

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-white/50">در حال بارگذاری...</div>
      }
    >
      <ProductsManager />
    </Suspense>
  );
}