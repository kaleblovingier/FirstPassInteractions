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
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {errorMessage(error)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reloadPage}
          className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={resetDeskAndReload}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          Reset saved desk
        </button>
      </div>
    </main>
  );
}
