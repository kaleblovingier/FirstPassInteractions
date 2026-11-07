/**
 * Shared "page not found" view: a real h1, what happened, and the ways back in.
 * Used by the /drug, /pair and /enzyme routes and as the router's default for unknown paths.
 */
export function NotFoundView({
  what = "page",
  back,
}: {
  /** "drug page", "pair page"... */
  what?: string;
  /** The most relevant index for this kind of page. */
  back?: { href: string; label: string };
}) {
  const links = [
    { href: "/", label: "Open the desk" },
    ...(back ? [back] : []),
    ...(back?.href === "/pairs" ? [] : [{ href: "/pairs", label: "All drug pairs" }]),
    ...(back?.href === "/enzymes" ? [] : [{ href: "/enzymes", label: "Enzyme pages" }]),
  ];
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="not-found">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Not found</p>
      <h1 className="mt-1 font-serif text-2xl tracking-tight text-fg">That {what} doesn't exist</h1>
      <p className="mt-2 text-sm text-muted">
        The link may be old or mistyped. Search the desk for the drug, or start from one of these.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-full bg-bg-sunken px-4 text-sm font-medium text-fg hover:bg-accent-soft"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
