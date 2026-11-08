// First, so zod is configured before any module below builds a schema.
import "@/lib/zod-config";
import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFoundView } from "@/components/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => <NotFoundView />,
  });
}
