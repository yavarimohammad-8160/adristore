"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { FreeShippingBanner } from "./FreeShippingBanner";
import type { SiteNavLink } from "@/lib/site-settings";

interface ConditionalNavbarProps {
  navLinks: SiteNavLink[];
  freeShippingThreshold: number;
  isFreeShippingEnabled?: boolean;
}

export function ConditionalNavbar({
  navLinks,
  freeShippingThreshold,
  isFreeShippingEnabled = true,
}: ConditionalNavbarProps) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  // شرط نمایش بنر: مبلغ بیشتر از صفر باشه و وضعیتش هم فعال باشه
  const showBanner = isFreeShippingEnabled && freeShippingThreshold > 0;

  return (
    <>
      {showBanner && <FreeShippingBanner threshold={freeShippingThreshold} />}
      <Navbar navLinks={navLinks} />
    </>
  );
}
