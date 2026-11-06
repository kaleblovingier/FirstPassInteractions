import { createFileRoute } from "@tanstack/react-router";
import { DeskApp } from "@/components/desk/app";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "FirstPass: drug interaction teaching desk" }] }),
  component: Home,
});

function Home() {
  return <DeskApp />;
}
