"use client";

import type { MouseEvent, ReactNode } from "react";
import { navigateToCleanHome } from "@/lib/navigate-home";

interface HomeNavLinkProps {
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}

export function HomeNavLink({ className, children, onNavigate }: HomeNavLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate?.();
    navigateToCleanHome();
  }

  return (
    <a href="/" className={className} onClick={handleClick}>
      {children}
    </a>
  );
}