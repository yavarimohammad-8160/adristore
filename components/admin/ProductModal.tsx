"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/admin/ProductForm";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  productId?: number;
  initial?: {
    title: string;
    price: number;
    description: string;
    brief: string;
    category: string;
    inventory: number;
    imageUrls: string[];
    tags?: string[];
    videoUrl?: string;
  };
  onSuccess: () => void;
}

export function ProductModal({
  open,
  onOpenChange,
  mode,
  productId,
  initial,
  onSuccess,
}: ProductModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111827] border-[#1e40af]/40 text-white"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "افزودن محصول جدید" : "ویرایش محصول"}
          </DialogTitle>
        </DialogHeader>
        <ProductForm
          key={`${mode}-${productId ?? "new"}`}
          mode={mode}
          productId={productId}
          initial={initial}
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}