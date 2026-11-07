import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { clearDeskStorage } from "@/lib/drugs/desk-persist";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function reloadPage() {
  if (typeof window === "undefined") return;
  window.location.reload();
}

function resetDeskAndReload() {
  if (typeof window === "undefined") return;
  const ok = window.confirm(
    "Clear the saved desk on this browser, including a license key saved here, and reload?",
  );
  if (!ok) return;
  clearDeskStorage();
  reloadPage();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-bg text-fg"
      }
    >
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-serif text-xl tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {errorMessage(error)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reloadPage}
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg shadow-[var(--shadow-border)] hover:opacity-90"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={resetDeskAndReload}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-fg underline-offset-2 hover:underline"
        >
          Reset saved desk
        </button>
      </div>
    </main>
  );
}
