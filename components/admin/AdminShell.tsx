"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  RefreshCw,
  Home,
  Menu,
  Link2,
  Layers,
  Database,
  ShoppingBag,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/series", label: "مدیریت سری‌ها", icon: Layers },
  { href: "/admin/content", label: "صفحات و منو", icon: Link2 },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
] as const;

export type StatIconName = "package" | "database" | "shopping-bag" | "coins";

const STAT_ICONS: Record<StatIconName, LucideIcon> = {
  package: Package,
  database: Database,
  "shopping-bag": ShoppingBag,
  coins: Coins,
};

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1 flex-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/admin" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${
              active
                ? "bg-[#1e40af]/40 text-[#93c5fd] border border-[#1e40af]/50"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebarFooter = (
    <div className="pt-4 border-t border-[#1e40af]/20 space-y-2">
      <p className="text-xs text-white/40 px-2 truncate" title={email}>
        {email}
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-2 text-sm text-[#22c55e] hover:underline"
      >
        <Home className="h-4 w-4" /> بازگشت به سایت
      </Link>
      <Button
        variant="ghost"
        onClick={logout}
        className="w-full justify-start text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
      >
        <LogOut className="h-4 w-4 ml-2" /> خروج
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-[#1e40af]/30 bg-[#111827]">
        <Link href="/admin" className="font-display text-lg font-black">
          <span className="bg-gradient-to-r from-[#22c55e] via-[#fbbf24] to-[#ef4444] bg-clip-text text-transparent">
            ⚽ پنل ادمین
          </span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon-sm" className="border-[#1e40af]/40" />}
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="right" className="bg-[#111827] border-[#1e40af]/30 w-72 p-5 flex flex-col">
            <p className="font-display font-black text-[#fbbf24] mb-4">منو</p>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            {sidebarFooter}
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-l border-[#1e40af]/30 bg-gradient-to-b from-[#111827] to-[#0a0f1e] p-5 flex-col shrink-0">
        <div className="mb-8">
          <Link href="/admin" className="font-display text-xl font-black">
            <span className="bg-gradient-to-r from-[#22c55e] via-[#fbbf24] to-[#ef4444] bg-clip-text text-transparent">
              ⚽ پنل ادمین
            </span>
          </Link>
          <p className="text-xs text-white/50 mt-1">آدری‌استور</p>
        </div>
        <NavLinks pathname={pathname} />
        {sidebarFooter}
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight">{title}</h1>
        {subtitle && <p className="text-white/60 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  color,
  iconName,
}: {
  label: string;
  value: string | number;
  color: string;
  iconName: StatIconName;
}) {
  const Icon = STAT_ICONS[iconName];
  return (
    <div className={`rounded-2xl border-2 p-4 md:p-5 ${color}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-7 w-7 md:h-8 md:w-8 opacity-80 shrink-0" />
        <span className="text-2xl md:text-3xl font-black">{value}</span>
      </div>
      <p className="text-sm font-bold mt-2 opacity-90">{label}</p>
    </div>
  );
}

export function RefreshBasalamButton({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/basalam/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در بروزرسانی");
      toast.success("محصولات باسلام بروزرسانی شد");
      onSuccess?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بروزرسانی");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={refresh}
      disabled={loading}
      className="btn-fun btn-blue font-bold gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "در حال بروزرسانی..." : "بروزرسانی از باسلام"}
    </Button>
  );
}