"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { FreeShippingBanner } from "./FreeShippingBanner";
import type { SiteNavLink } from "@/lib/site-settings";

interface ConditionalNavbarProps {
  navLinks: SiteNavLink[];
  freeShippingThreshold: number;
}

export function ConditionalNavbar({
  navLinks,
  freeShippingThreshold,
}: ConditionalNavbarProps) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <FreeShippingBanner threshold={freeShippingThreshold} />
      <Navbar navLinks={navLinks} />
    </>
  );
}