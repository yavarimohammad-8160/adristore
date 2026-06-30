"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { HomeNavLink } from "./HomeNavLink";
import { KimdiBadge } from "./KimdiBadge";
import { SITE_NAME } from "@/lib/seo";
import type { SiteNavLink } from "@/lib/site-settings";

interface NavbarProps {
  navLinks: SiteNavLink[];
}

function isHomeHref(href: string) {
  return href === "/" || href === "";
}

export function Navbar({ navLinks }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#1e40af]/30 bg-[#0a0f1e]/95 backdrop-blur-md safe-top">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-5 h-14 sm:h-16">
        <div className="flex items-center gap-3 sm:gap-8 min-w-0">
          <HomeNavLink
            className="flex items-center gap-2 font-black tracking-tighter text-xl min-w-0"
            onNavigate={() => setMenuOpen(false)}
          >
            <span className="text-2xl bounce-fun shrink-0">⚽</span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-display bg-gradient-to-r from-[#fde047] via-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent text-sm sm:text-base">
                Kimdi
              </span>
              <span className="font-display bg-gradient-to-r from-[#22c55e] to-[#86efac] bg-clip-text text-transparent text-xs sm:text-sm truncate">
                {SITE_NAME}
              </span>
            </span>
            <KimdiBadge size="sm" className="hidden sm:inline-flex shrink-0" />
          </HomeNavLink>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener"
                  className={`transition-colors ${link.color || "hover:text-white"}`}
                >
                  {link.label}
                </a>
              ) : isHomeHref(link.href) ? (
                <HomeNavLink
                  key={link.id}
                  className={`transition-colors ${link.color || "hover:text-white"}`}
                >
                  {link.label}
                </HomeNavLink>
              ) : (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`transition-colors ${link.color || "hover:text-white"}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/products"
            className="touch-target inline-flex items-center justify-center sm:px-5 sm:py-2 rounded-xl bg-[#1e40af]/20 border-2 border-[#1e40af]/40 text-[#93c5fd] font-bold hover:bg-[#1e40af]/40 transition"
            aria-label="جستجو در کارت‌ها"
          >
            <Search className="h-5 w-5 sm:mr-1.5" />
            <span className="hidden sm:inline text-sm">جستجو</span>
          </Link>
          <CartDrawer />
          <button
            type="button"
            className="touch-target md:hidden inline-flex items-center justify-center rounded-xl border-2 border-white/15 bg-white/5 text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="md:hidden border-t border-[#1e40af]/25 bg-[#0a0f1e]/98 px-4 py-3 space-y-1"
          aria-label="منوی موبایل"
        >
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener"
                className="touch-target flex items-center rounded-xl px-4 text-base font-bold text-white/90 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ) : isHomeHref(link.href) ? (
              <HomeNavLink
                key={link.id}
                className="touch-target flex items-center rounded-xl px-4 text-base font-bold text-white/90 hover:bg-white/5"
                onNavigate={() => setMenuOpen(false)}
              >
                {link.label}
              </HomeNavLink>
            ) : (
              <Link
                key={link.id}
                href={link.href}
                className="touch-target flex items-center rounded-xl px-4 text-base font-bold text-white/90 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  );
}