export function isCleanHomePath(pathname: string, search = "", hash = ""): boolean {
  const onHome = pathname === "/" || pathname === "";
  return onHome && search.length === 0 && hash.length === 0;
}

/** Force a full navigation to "/" with no query params, hash, or in-memory filters. */
export function navigateToCleanHome(): void {
  if (typeof window === "undefined") return;

  const { pathname, search, hash } = window.location;

  if (isCleanHomePath(pathname, search, hash)) {
    window.location.reload();
    return;
  }

  window.location.replace("/");
}