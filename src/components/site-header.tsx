import { HemeMark } from "@/components/desk/mark";
import { SITE_LINKS } from "@/lib/seo/site-nav";

/**
 * Skip link and header for the public reference pages (pairs, drugs, enzymes, practice,
 * glossary, help, legal). Before this, most of them had no way back to the desk and no
 * link between sections except the footer. The skip link targets #content in __root.tsx.
 */
export function SiteHeader({ pathname }: { pathname: string }) {
  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-border" data-testid="site-header">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 py-1.5">
          <a href="/" className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-fg">
            <HemeMark className="size-7" />
            <span className="font-serif text-lg leading-none tracking-tight">FirstPass</span>
            <span className="sr-only">, open the desk</span>
          </a>
          <nav aria-label="Site">
            <ul className="-mx-2 flex flex-wrap items-center">
              {SITE_LINKS.map((link) => {
                const current = pathname === link.href;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      className={
                        current
                          ? "inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-fg underline decoration-accent decoration-2 underline-offset-4"
                          : "inline-flex min-h-11 items-center rounded-md px-2 text-sm text-muted hover:text-fg hover:underline hover:underline-offset-4"
                      }
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
