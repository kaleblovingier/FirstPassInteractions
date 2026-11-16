/** Top-level public pages, in the order the header lists them. The desk itself is the brand link. */
export const SITE_LINKS = [
  { href: "/pairs", label: "Pairs" },
  { href: "/enzymes", label: "Enzymes" },
  { href: "/classes", label: "Classes" },
  { href: "/practice", label: "Practice" },
  { href: "/glossary", label: "Glossary" },
  { href: "/help", label: "Find help" },
] as const;

/** The desk at "/" draws its own header, skip link and navigation. Framed /embed/ cards have none. */
export function showsSiteHeader(pathname: string): boolean {
  return pathname !== "/" && !pathname.startsWith("/api/") && !pathname.startsWith("/embed/");
}
