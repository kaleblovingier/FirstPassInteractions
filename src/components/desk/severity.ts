import type { Severity } from "@/lib/drugs/types";
import { SEVERITY_HINT, SEVERITY_PLAIN } from "@/lib/drugs/types";

export function severityTone(s: Severity | "none") {
  switch (s) {
    case "contraindicated":
      return "danger" as const;
    case "major":
      return "danger" as const;
    case "moderate":
      return "warn" as const;
    case "minor":
      return "info" as const;
    default:
      return "ok" as const;
  }
}

export function severitySurface(s: Severity | "none") {
  switch (s) {
    case "contraindicated":
      return "bg-danger text-accent-fg";
    case "major":
      return "bg-danger-soft text-danger";
    case "moderate":
      return "bg-warn-soft text-warn";
    case "minor":
      return "bg-info-soft text-info";
    default:
      return "bg-ok-soft text-ok";
  }
}

export function severityPlain(s: Severity | "none") {
  return SEVERITY_PLAIN[s];
}

export function severityHint(s: Severity | "none") {
  return SEVERITY_HINT[s];
}
