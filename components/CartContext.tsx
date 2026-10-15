"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product, CartItem } from "@/lib/types";
import { toast } from "sonner";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  /** Add several products at once (one toast). Returns how many were added. */
  addManyToCart: (products: Product[]) => number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("adristore_cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem("adristore_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product) => {
    if ((product.inventory ?? 0) <= 0) {
      toast.error("این محصول ناموجود است");
      return;
    }
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.product.id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + 1,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.title.slice(0, 28)} به سبد اضافه شد`, {
      description: "برای تکمیل خرید به باسلام منتقل می‌شوید",
    });
  };

  const [isCartOpen, setCartOpen] = useState(false);
  const openCart = () => setCartOpen(true);

  const addManyToCart = (products: Product[]) => {
    const available = products.filter((p) => (p.inventory ?? 0) > 0);
    if (available.length === 0) {
      toast.error("هیچ‌کدام از کارت‌ها موجود نیستند");
      return 0;
    }
    setItems((prev) => {
      const updated = [...prev];
      for (const product of available) {
        const idx = updated.findIndex((i) => i.product.id === product.id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        } else {
          updated.push({ product, quantity: 1 });
        }
      }
      return updated;
    });
    toast.success(`${available.length} کارت به سبد اضافه شد`);
    return available.length;
  };

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === id ? { ...item, quantity: qty } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        addManyToCart,
        isCartOpen,
        setCartOpen,
        openCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
