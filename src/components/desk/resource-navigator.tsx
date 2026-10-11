import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Heart,
  HeartPulse,
  Info,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Phone,
  Pill,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Baby,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDesk } from "@/lib/drugs/store";
import type { HostContext } from "@/lib/drugs/types";
import {
  FILTER_PILLS,
  HEALTHCARE_RESOURCES,
  HEALTHCARE_RESOURCES_CDS_DISCLAIMER,
  RESOURCE_COMPLIANCE_CRITERIA,
  filterResources,
  generateResourceHandout,
  healthcareResourcesFor,
  searchManufacturerPAPs,
  STATE_SPAP_DIRECTORY,
  getStateSPAP,
  type FilterPillId,
  type HealthcareResource,
  type ResourceRecommendation,
  type ManufacturerPAPProgram,
  type StatePAPInfo,
} from "@/lib/drugs/healthcare-resources";
import { NOT_CLEARED, PI_FOOTER } from "@/lib/regulatory";

const COMMON_PAP_DRUG_SHORTCUTS = [
  "Humira",
  "Dupixent",
  "Eliquis",
  "Xarelto",
  "Jardiance",
  "Ozempic",
  "Entresto",
  "Keytruda",
  "Stelara",
] as const;

export interface ResourceNavigatorProps {
  ids?: string[];
  host?: HostContext;
  onOpenHelp?: () => void;
}

export function ResourceNavigator({ ids, host, onOpenHelp }: ResourceNavigatorProps) {
  return <ResourcePanel ids={ids} host={host} onOpenHelp={onOpenHelp} />;
}

export function ResourcePanel({ ids: propIds, host: propHost, onOpenHelp }: ResourceNavigatorProps) {
  // Store integration fallback
  const storeSelected = useDesk((s) => s.selected);
  const storeHost = useDesk((s) => ({
    phenotypes: s.phenotypes,
    smoking: s.smoking,
    ketamineRoute: s.ketamineRoute,
    cannabisRoute: s.cannabisRoute,
    alcohol: s.alcohol,
    age: s.age,
    kidney: s.kidney,
    preg: s.preg,
  }));

  const activeIds = propIds ?? storeSelected;
  const activeHost = propHost ?? storeHost;

  // Station State
  const [filterPill, setFilterPill] = useState<FilterPillId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zipInput, setZipInput] = useState("");
  const [patientNameInput, setPatientNameInput] = useState("");
  const [clinicHeaderInput, setClinicHeaderInput] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("");
  const [papSearchQuery, setPapSearchQuery] = useState("");
  const [showPapDirectory, setShowPapDirectory] = useState(true);
  const [copiedHandout, setCopiedHandout] = useState(false);
  const [copiedResourceId, setCopiedResourceId] = useState<string | null>(null);
  const [showHandoutPreview, setShowHandoutPreview] = useState(false);
  const [showComplianceDetails, setShowComplianceDetails] = useState(false);

  // Recommender report based on active tray and host context
  const report = useMemo(
    () => healthcareResourcesFor(activeIds, activeHost),
    [activeIds.join("|"), activeHost.preg, activeHost.kidney, activeHost.alcohol, activeHost.age],
  );

  // Filtered resources for directory grid
  const filteredResources = useMemo(
    () => filterResources(searchQuery, filterPill),
    [searchQuery, filterPill],
  );

  // Filtered Manufacturer PAPs
  const filteredPAPs = useMemo(
    () => searchManufacturerPAPs(papSearchQuery),
    [papSearchQuery],
  );

  // Selected State SPAP
  const selectedSPAP = useMemo(
    () => (selectedStateCode ? getStateSPAP(selectedStateCode) : undefined),
    [selectedStateCode],
  );

  // Generated handout text
  const handoutText = useMemo(
    () =>
      generateResourceHandout({
        drugIds: activeIds,
        host: activeHost,
        zip: zipInput.trim() || undefined,
        patientName: patientNameInput.trim() || undefined,
        clinicHeader: clinicHeaderInput.trim() || undefined,
      }),
    [activeIds.join("|"), activeHost, zipInput, patientNameInput, clinicHeaderInput],
  );

  const handleCopyHandout = async () => {
    try {
      await navigator.clipboard.writeText(handoutText);
      setCopiedHandout(true);
      window.setTimeout(() => setCopiedHandout(false), 2200);
    } catch {
      // Fallback for older browsers or restricted permissions
      const textarea = document.createElement("textarea");
      textarea.value = handoutText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedHandout(true);
      window.setTimeout(() => setCopiedHandout(false), 2200);
    }
  };

  const handleCopyResource = async (res: HealthcareResource) => {
    const text = [
      `${res.name} — ${res.organization}`,
      res.url,
      res.phone ? `Phone: ${res.phone} (${res.availability})` : null,
      res.sms ? `Text: ${res.sms}` : null,
      res.description,
      `Cost: ${res.cost.replace("-", " ").toUpperCase()}`,
      `Eligibility: ${res.eligibilityNotes}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedResourceId(res.id);
      window.setTimeout(() => setCopiedResourceId(null), 1800);
    } catch {
      setCopiedResourceId(res.id);
      window.setTimeout(() => setCopiedResourceId(null), 1800);
    }
  };

  // Helper for domain pill styling
  const getPillCount = (pillId: FilterPillId) => {
    if (pillId === "all") return HEALTHCARE_RESOURCES.length;
    return filterResources("", pillId).length;
  };

  return (
    <div className="space-y-6">
      {/* 1. STATION HEADER & TOP CONTROLS */}
      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LifeBuoy className="size-4" />
              </div>
              <h2 className="font-serif text-lg tracking-tight text-fg">
                Healthcare Resources & Patient Assistance Navigator
              </h2>
              <Badge tone="default" className="font-mono text-[10px] text-muted border border-border/60">
                FD&C Act § 520(o)(1)(E) Non-Device CDS
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              National directories, sliding-scale safety-net clinics, prescription assistance programs (PAPs),
              teratology consultations, chronic disease co-pay foundations, and 24/7 crisis lifelines.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCopyHandout}
              className={cn(
                "gap-1.5 transition-all text-xs font-medium",
                copiedHandout
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {copiedHandout ? (
                <>
                  <Check className="size-3.5" />
                  <span>Copied Patient Handout!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy Patient Handout</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowHandoutPreview(!showHandoutPreview)}
              className="gap-1.5 text-xs text-muted hover:text-fg"
            >
              <FileText className="size-3.5" />
              <span>{showHandoutPreview ? "Hide Preview" : "Preview Handout"}</span>
            </Button>
          </div>
        </div>

        {/* 2. HANDOUT TEXT PREVIEW DRAWER (TOGGLEABLE) */}
        {showHandoutPreview && (
          <div className="mt-4 rounded-lg border border-border/70 bg-surface-raised p-3.5 sm:p-4 text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
              <span className="font-mono text-[11px] font-medium text-fg uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Printable / EHR Clinical Visit Summary Handout Preview
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCopyHandout}
                className="h-7 text-[11px] gap-1"
              >
                {copiedHandout ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copiedHandout ? "Copied" : "Copy All"}
              </Button>
            </div>

            {/* Customization Controls for Handout Header & Patient */}
            <div className="mb-3 grid gap-2 sm:grid-cols-2 pt-1">
              <div>
                <label className="mb-1 block font-mono text-[10px] text-muted uppercase tracking-wider">
                  Clinic / Health System Header
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Hope Valley Community Health Clinic"
                  value={clinicHeaderInput}
                  onChange={(e) => setClinicHeaderInput(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] text-muted uppercase tracking-wider">
                  Patient Identifier / Name (Client-Side Only / No PHI Stored)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. J. Doe / MRN-84012"
                  value={patientNameInput}
                  onChange={(e) => setPatientNameInput(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted select-all">
              {handoutText}
            </pre>
          </div>
        )}

        {/* 3. 24/7 IMMEDIATE CRISIS STRIP */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 pt-3 border-t border-border/60">
          <div className="rounded-lg border border-border/60 bg-surface-raised p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-[11px] text-fg">
              <ShieldAlert className="size-3.5 text-danger shrink-0" />
              <span>988 Suicide & Crisis</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <a
                href="tel:988"
                className="font-mono text-xs font-semibold text-primary hover:underline"
              >
                Dial 988
              </a>
              <span className="font-mono text-[10px] text-muted">24/7 Call & Text</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-surface-raised p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-[11px] text-fg">
              <AlertTriangle className="size-3.5 text-warning shrink-0" />
              <span>Poison Help</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <a
                href="tel:18002221222"
                className="font-mono text-xs font-semibold text-primary hover:underline"
              >
                1-800-222-1222
              </a>
              <span className="font-mono text-[10px] text-muted">24/7 Toxicology</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-surface-raised p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-[11px] text-fg">
              <HeartPulse className="size-3.5 text-primary shrink-0" />
              <span>Never Use Alone</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <a
                href="tel:18004843731"
                className="font-mono text-xs font-semibold text-primary hover:underline"
              >
                1-800-484-3731
              </a>
              <span className="font-mono text-[10px] text-muted">Overdose Peer Monitor</span>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-surface-raised p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-[11px] text-fg">
              <Baby className="size-3.5 text-purple-500 shrink-0" />
              <span>MotherToBaby</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <a
                href="tel:18666266847"
                className="font-mono text-xs font-semibold text-primary hover:underline"
              >
                1-866-626-6847
              </a>
              <span className="font-mono text-[10px] text-muted">Text 855-999-3525</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ACTIVE TRAY CONTEXT-AWARE RECOMMENDATIONS BANNER */}
      {report.recommendations.length > 0 && (
        <section
          aria-label="Active Desk Recommendations"
          className={cn(
            "rounded-xl border p-4 shadow-[var(--shadow-border)] sm:p-5 transition-all",
            report.hasUrgentMatch
              ? "border-danger/30 bg-danger-soft/20 dark:bg-danger-soft/10"
              : "border-primary/30 bg-primary-soft/20 dark:bg-primary-soft/10",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg text-white",
                  report.hasUrgentMatch ? "bg-danger" : "bg-primary",
                )}
              >
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-fg">
                  Active Desk Patient Navigation ({report.recommendations.length} Matched Resources)
                </h3>
                <p className="text-[11px] text-muted">
                  Resources prioritized for the current patient tray and host clinical context.
                </p>
              </div>
            </div>

            {/* Context Badges */}
            <div className="flex flex-wrap gap-1.5">
              {report.activeContextFlags.isPregnantOrLactating && (
                <Badge tone="accent" className="gap-1 text-[10px]">
                  <Baby className="size-3" />
                  Perinatal / Teratology
                </Badge>
              )}
              {report.activeContextFlags.hasTransplantDrugs && (
                <Badge tone="info" className="gap-1 text-[10px]">
                  <Activity className="size-3" />
                  Transplant Regimen
                </Badge>
              )}
              {report.activeContextFlags.hasHighCostBiologics && (
                <Badge tone="ok" className="gap-1 text-[10px]">
                  <Pill className="size-3" />
                  Specialty Biologic / PAP
                </Badge>
              )}
              {report.activeContextFlags.hasOncologyDrugs && (
                <Badge tone="warn" className="gap-1 text-[10px]">
                  <ShieldAlert className="size-3" />
                  Oncology Co-Pay Funds
                </Badge>
              )}
              {report.activeContextFlags.hasHivOrAntiviralDrugs && (
                <Badge tone="info" className="gap-1 text-[10px]">
                  <Users className="size-3" />
                  Ryan White / ADAP
                </Badge>
              )}
              {report.activeContextFlags.hasGeriatricHost && (
                <Badge tone="accent" className="gap-1 text-[10px]">
                  <Building2 className="size-3" />
                  Medicare Extra Help / SPAP
                </Badge>
              )}
              {report.activeContextFlags.hasManufacturerPapMatch && (
                <Badge tone="ok" className="gap-1 text-[10px]">
                  <Sparkles className="size-3" />
                  Manufacturer PAP Match
                </Badge>
              )}
              {report.activeContextFlags.hasCkd && (
                <Badge tone="warn" className="gap-1 text-[10px]">
                  <Activity className="size-3" />
                  CKD / Renal Support
                </Badge>
              )}
              {report.activeContextFlags.hasCardiacDrugs && (
                <Badge tone="accent" className="gap-1 text-[10px]">
                  <Heart className="size-3" />
                  Cardiovascular
                </Badge>
              )}
              {report.activeContextFlags.hasOpioidsOrSedatives && (
                <Badge tone="danger" className="gap-1 text-[10px]">
                  <ShieldAlert className="size-3" />
                  Opioid / Sedative Safety
                </Badge>
              )}
            </div>
          </div>

          {/* Top Priority Matches Horizontal Cards */}
          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {report.recommendations.slice(0, 6).map((rec: ResourceRecommendation) => (
              <div
                key={rec.resource.id}
                className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface p-3 text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-fg line-clamp-1">{rec.resource.shortName}</span>
                    <Badge
                      tone={rec.priority === "urgent" ? "danger" : "default"}
                      className="text-[9px] uppercase tracking-wider shrink-0"
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted line-clamp-2 leading-snug">
                    {rec.matchReason}
                  </p>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-muted">
                    {rec.resource.phone && (
                      <span className="font-mono text-[10px] font-medium text-fg">
                        {rec.resource.phone}
                      </span>
                    )}
                  </div>
                  <a
                    href={rec.resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-primary hover:underline"
                  >
                    Portal
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. SEARCH, FILTER PILLS & LOCATION CONTROLS */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              placeholder="Search by clinic name, program, disease, drug, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-fg"
              >
                Clear
              </button>
            )}
          </div>

          {/* Location & State SPAP Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* State SPAP Dropdown */}
            <div className="relative w-48 sm:w-56">
              <Building2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted pointer-events-none" />
              <select
                aria-label="Filter by State SPAP"
                value={selectedStateCode}
                onChange={(e) => setSelectedStateCode(e.target.value)}
                className="w-full rounded-md border border-border bg-surface pl-8 pr-2.5 text-xs h-9 font-mono text-fg focus:outline-none focus:ring-1 focus:ring-primary truncate"
              >
                <option value="">Select State SPAP...</option>
                {STATE_SPAP_DIRECTORY.map((s) => (
                  <option key={s.stateCode} value={s.stateCode}>
                    {s.stateCode} — {s.stateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Client-side Reference ZIP Input */}
            <div className="relative w-36">
              <MapPin className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                type="text"
                maxLength={5}
                placeholder="Patient ZIP (Local)"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="pl-8 text-xs h-9 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Selected State SPAP Highlight Card */}
        {selectedSPAP && (
          <div className="rounded-lg border border-primary/40 bg-primary-soft/20 p-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-fg">
                    {selectedSPAP.programName} ({selectedSPAP.stateName} — {selectedSPAP.stateCode})
                  </span>
                  <Badge tone="accent" className="font-mono text-[9px]">
                    State SPAP
                  </Badge>
                </div>
                <p className="mt-1 text-muted text-[11px] leading-snug">
                  {selectedSPAP.description}
                </p>
                <p className="mt-1 text-[11px] text-fg/80">
                  <strong className="text-fg font-medium">Eligibility: </strong>
                  {selectedSPAP.eligibility}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStateCode("")}
                className="font-mono text-[10px] text-muted hover:text-fg shrink-0"
              >
                ✕ Clear
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
              {selectedSPAP.phone && (
                <a
                  href={`tel:${selectedSPAP.phone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary hover:underline"
                >
                  <Phone className="size-3" />
                  {selectedSPAP.phone}
                </a>
              )}
              <a
                href={selectedSPAP.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary hover:underline"
              >
                Official State Portal
                <ExternalLink className="size-2.5" />
              </a>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_PILLS.map((pill) => {
            const isSelected = filterPill === pill.id;
            const count = getPillCount(pill.id);
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterPill(pill.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-surface-raised text-muted hover:text-fg hover:bg-surface border border-border/60",
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "text-[10px] rounded-full px-1.5 py-0.2",
                    isSelected ? "bg-white/20 text-white" : "bg-muted/20 text-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5B. MANUFACTURER DIRECT PATIENT ASSISTANCE PROGRAM (PAP) DIRECTORY */}
      <section className="rounded-xl border border-border/80 bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pill className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-semibold text-fg">
                  Manufacturer Direct Patient Assistance Programs (PAP) Directory
                </h3>
                <Badge tone="ok" className="font-mono text-[9px]">
                  Brand-Name Co-Pay & Free Drug Programs
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                Direct pharmaceutical manufacturer foundations providing free medication and co-pay support for uninsured and Medicare Part D patients.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPapDirectory(!showPapDirectory)}
            className="gap-1 text-xs text-muted hover:text-fg self-start sm:self-center"
          >
            <span>{showPapDirectory ? "Collapse Directory" : "Expand Directory"}</span>
            {showPapDirectory ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>

        {showPapDirectory && (
          <div className="mt-4 space-y-3 pt-3 border-t border-border/60">
            {/* PAP Search and Quick Drug Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  type="search"
                  placeholder="Search PAPs by drug name (Humira, Eliquis, Keytruda...), manufacturer, or disease..."
                  value={papSearchQuery}
                  onChange={(e) => setPapSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
                {papSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPapSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-fg"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Drug Shortcut Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted mr-1">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => setPapSearchQuery("")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-colors",
                    !papSearchQuery
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-surface-raised text-muted hover:text-fg border border-border/50",
                  )}
                >
                  All PAPs
                </button>
                {COMMON_PAP_DRUG_SHORTCUTS.map((drug) => {
                  const isMatch = papSearchQuery.toLowerCase() === drug.toLowerCase();
                  return (
                    <button
                      key={drug}
                      type="button"
                      onClick={() => setPapSearchQuery(isMatch ? "" : drug)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-colors",
                        isMatch
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-surface-raised text-muted hover:text-fg border border-border/50",
                      )}
                    >
                      {drug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PAP Cards Grid */}
            {filteredPAPs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted">
                <p className="font-medium text-fg">No manufacturer assistance programs match "{papSearchQuery}"</p>
                <p className="mt-1">Try another brand or generic medication name, or clear the search.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPapSearchQuery("")}
                  className="mt-2 text-xs"
                >
                  View All PAPs
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                {filteredPAPs.map((pap: ManufacturerPAPProgram) => (
                  <div
                    key={pap.id}
                    className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-raised p-3.5 text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-serif text-xs font-semibold text-fg">
                            {pap.programName}
                          </h4>
                          <span className="font-mono text-[10px] text-muted block">
                            {pap.manufacturer}
                          </span>
                        </div>
                        <Badge
                          tone={pap.portalUrl ? "ok" : "default"}
                          className="font-mono text-[9px] shrink-0"
                        >
                          {pap.portalUrl ? "Online Portal" : "Paper / Form"}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {pap.drugNames.map((d: string) => (
                          <span
                            key={d}
                            className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary"
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-[11px] text-muted leading-snug">
                        {pap.description}
                      </p>

                      <div className="mt-2 space-y-1 text-[10px] text-muted border-t border-border/40 pt-1.5">
                        <div>
                          <strong className="text-fg font-medium">Income Threshold: </strong>
                          {pap.incomeThreshold}
                        </div>
                        <div>
                          <strong className="text-fg font-medium">Insurance Criteria: </strong>
                          {pap.insuranceCriteria}
                        </div>
                        <div>
                          <strong className="text-fg font-medium">Eligibility: </strong>
                          {pap.eligibilitySummary}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 font-mono text-[11px]">
                      {pap.phone ? (
                        <a
                          href={`tel:${pap.phone.replace(/\D/g, "")}`}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <Phone className="size-3" />
                          {pap.phone}
                        </a>
                      ) : (
                        <span />
                      )}
                      <a
                        href={pap.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Enrollment Portal
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. DIRECTORY CARDS GRID */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">
            Displaying {filteredResources.length} of {HEALTHCARE_RESOURCES.length} verified public resources
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterPill("all");
              }}
              className="font-mono text-[11px] text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {filteredResources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-xs text-muted">
            <p className="font-medium text-fg">No matching healthcare resources found</p>
            <p className="mt-1">Try clearing your search query or switching the category filter.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterPill("all");
              }}
              className="mt-3 text-xs"
            >
              Show all resources
            </Button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredResources.map((res) => {
              const isCopied = copiedResourceId === res.id;
              return (
                <div
                  key={res.id}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-[var(--shadow-border)] transition-shadow hover:shadow-md"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-serif text-sm font-semibold tracking-tight text-fg">
                          {res.name}
                        </h4>
                        <span className="font-mono text-[10px] text-muted block mt-0.5">
                          {res.organization}
                        </span>
                      </div>
                      <Badge
                        tone={res.cost === "free" ? "ok" : res.cost === "sliding-scale" ? "info" : "default"}
                        className="text-[9px] uppercase tracking-wider shrink-0"
                      >
                        {res.cost.replace("-", " ")}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-xs leading-relaxed text-fg/90">
                      {res.description}
                    </p>

                    {/* Clinical Utility Note */}
                    <div className="mt-2.5 rounded-lg bg-surface-raised p-2.5 text-[11px] leading-relaxed border border-border/40 text-muted">
                      <strong className="text-fg font-medium">Clinical Utility: </strong>
                      {res.clinicalUtility}
                    </div>

                    {/* Services Bullets */}
                    <ul className="mt-2.5 space-y-1 text-[11px] text-muted">
                      {res.services.slice(0, 3).map((srv, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{srv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer Action Strip */}
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {res.phone && (
                          <a
                            href={`tel:${res.phone.replace(/\D/g, "")}`}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            <Phone className="size-3" />
                            {res.phone}
                          </a>
                        )}
                        {res.sms && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
                            <MessageSquare className="size-3" />
                            Text: {res.sms}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyResource(res)}
                          className="h-7 px-2 text-[11px] text-muted hover:text-fg"
                        >
                          {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          <span className="ml-1">{isCopied ? "Copied" : "Copy"}</span>
                        </Button>

                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          Visit Portal
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {res.availability}
                      </span>
                      <span>{res.languages.join(", ")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. REGULATORY COMPLIANCE ACCORDION / FOOTER */}
      <section className="rounded-xl border border-border/60 bg-surface-raised p-4 text-xs text-muted">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary shrink-0" />
            <span className="font-semibold text-fg">
              FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Posture
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowComplianceDetails(!showComplianceDetails)}
            className="font-mono text-[11px] text-primary hover:underline text-left"
          >
            {showComplianceDetails ? "Hide statutory criteria" : "View statutory criteria"}
          </button>
        </div>

        {showComplianceDetails && (
          <div className="mt-3 space-y-2 border-t border-border/50 pt-3 text-[11px] leading-relaxed">
            <p className="text-fg/90">{HEALTHCARE_RESOURCES_CDS_DISCLAIMER}</p>
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              {RESOURCE_COMPLIANCE_CRITERIA.map((crit, idx) => (
                <div key={idx} className="rounded-md border border-border/60 bg-surface p-2.5">
                  <span className="font-mono font-semibold text-fg block text-[10px]">
                    {crit.criterion}: {crit.title}
                  </span>
                  <p className="mt-0.5 text-muted text-[10px] leading-normal">{crit.details}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted/80 pt-1">
              {NOT_CLEARED} {PI_FOOTER}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export const HealthcareResourceNavigator = ResourceNavigator;
export const HealthcareResourceStation = ResourceNavigator;
