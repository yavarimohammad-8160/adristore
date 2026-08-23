"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * Full-document navigation to a product page.
 * Next.js <Link> client-routing 404s for IDs that were not in generateStaticParams
 * at the last static export; a real GET lets Cloudflare serve the fallback.
 * Left-click is forced to window.location because 3D card transforms can swallow
 * the native click while still offering “Open in new tab”.
 */
export function ProductLink({
  href,
  className,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (props.target === "_blank") return;
    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
