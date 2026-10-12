import { createFileRoute } from "@tanstack/react-router";
import { LostKeyRecovery } from "@/components/desk/lost-key";

export const Route = createFileRoute("/recover")({ component: RecoverPage });

function RecoverPage() {
  return (
    <main className="px-4 py-10">
      <LostKeyRecovery />
    </main>
  );
}
