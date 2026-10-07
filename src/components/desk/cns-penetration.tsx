import React, { useMemo, useState } from "react";
import {
  CNS_PROFILES,
  CNS_CLASS_DIVERGENCES,
  CNS_PENETRATION_REGULATORY_DISCLAIMER,
  getAllCnsPenetrationProfiles,
  getCnsProfileById,
  getAllCnsClassDivergences,
  calculateBbpScore,
  detectCnsRisksOnTray,
  type CnsProfile,
  type CnsDrugCategory,
  type CnsPermeabilityLevel,
  type CnsClassDivergence,
  type CnsTrayRisk,
} from "@/lib/drugs/cns-penetration";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import {
  Brain,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  AlertOctagon,
  Info,
  Check,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Flame,
  RotateCcw,
  Sparkles,
  BookOpen,
  Zap,
  Layers,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CnsPenetrationMatrix() {
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const add = useDesk((s) => s.add);

  // 1. Meningeal Inflammation Toggle state
  const [isMeningesInflamed, setIsMeningesInflamed] = useState(false);

  // 2. Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | CnsDrugCategory>("All");
  const [selectedPermeability, setSelectedPermeability] = useState<"All" | CnsPermeabilityLevel>("All");

  // 3. Inspected Hotspot in BBB Diagram
  const [inspectedHotspot, setInspectedHotspot] = useState<
    "endothelium" | "tight-junctions" | "efflux" | "pericytes" | "astrocytes" | null
  >("tight-junctions");

  // 4. Selected Class Divergence tab
  const [selectedDivergenceId, setSelectedDivergenceId] = useState<string>(
    "antihistamines-1st-vs-2nd-generation",
  );

  // 5. Feedback banner for 1-tap loaders
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Pre-configured High-Yield Clinical Regimens for 1-tap desk tray loading
  const HIGH_YIELD_REGIMENS = [
    {
      id: "loperamide-bypass",
      title: "Loperamide P-gp Bypass Hazard",
      badge: "Critical Collision",
      drugIds: ["loperamide", "quinidine"],
      description: "P-gp inhibition allows loperamide to flood CNS, causing central opioid apnea & torsades.",
    },
    {
      id: "sedative-delirium",
      title: "Antihistamine + Opioid Delirium Overload",
      badge: "High Risk",
      drugIds: ["diphenhydramine", "morphine", "diazepam"],
      description: "Synergistic BBB crossing producing severe cognitive delirium and respiratory depression.",
    },
    {
      id: "meningitis-regimen",
      title: "Empiric Bacterial Meningitis Protocol",
      badge: "Acute Infection",
      drugIds: ["ceftriaxone", "ampicillin", "vancomycin", "dexamethasone"],
      description: "Inflamed tight junctions allow polar beta-lactams to penetrate; dexamethasone restores barriers.",
    },
    {
      id: "beta-blocker-contrast",
      title: "Beta-Blocker CNS vs Peripheral Divergence",
      badge: "Pharmacokinetics",
      drugIds: ["propranolol", "atenolol"],
      description: "Contrast lipophilic propranolol (vivid nightmares) vs hydrophilic atenolol (peripheral).",
    },
    {
      id: "antifungal-contrast",
      title: "Triazole CNS Penetration Divergence",
      badge: "Infectious Disease",
      drugIds: ["fluconazole", "voriconazole", "itraconazole"],
      description: "Fluconazole/Voriconazole enter brain freely; Itraconazole is excluded (<10% CSF).",
    },
  ];

  // Active Desk Tray CNS Exposure Audit
  const trayRisks: CnsTrayRisk[] = useMemo(() => {
    return detectCnsRisksOnTray(selected, isMeningesInflamed);
  }, [selected, isMeningesInflamed]);

  // Profiles of drugs currently on desk tray
  const trayProfiles = useMemo(() => {
    return selected
      .map((id) => {
        const prof = getCnsProfileById(id);
        const scoreResult = calculateBbpScore(id, isMeningesInflamed);
        return {
          drugId: id,
          drugName: DRUG_BY_ID[id]?.name ?? id,
          profile: prof,
          scoreResult,
        };
      })
      .filter(Boolean);
  }, [selected, isMeningesInflamed]);

  // Filtered profiles for scorecard
  const filteredProfiles = useMemo(() => {
    return CNS_PROFILES.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.drugName.toLowerCase().includes(q) ||
        p.drugClass.toLowerCase().includes(q) ||
        p.cnsClinicalIndications.some((i) => i.toLowerCase().includes(q));

      // Category
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;

      // Permeability level (dynamically re-evaluated with current inflammation state)
      const score = calculateBbpScore(p.drugId, isMeningesInflamed);
      const matchesPermeability =
        selectedPermeability === "All" || score.level === selectedPermeability;

      return matchesSearch && matchesCategory && matchesPermeability;
    });
  }, [searchQuery, selectedCategory, selectedPermeability, isMeningesInflamed]);

  // Active divergence object
  const activeDivergence: CnsClassDivergence = useMemo(() => {
    return (
      CNS_CLASS_DIVERGENCES.find((d) => d.id === selectedDivergenceId) ??
      CNS_CLASS_DIVERGENCES[0]
    );
  }, [selectedDivergenceId]);

  return (
    <div className="w-full space-y-6 text-fg overflow-x-hidden">
      {/* 1. Header & Regulatory Posture */}
      <header className="flex flex-col gap-3 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <Brain className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                Blood-Brain Barrier (BBB) Neuro-Pharmacokinetics Matrix
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Biophysical determinants of CNS penetration, active luminal efflux, and meningeal inflammation modeling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
              <Activity className="size-3.5" />
              FD&amp;C Act § 520(o)(1)(E)
            </span>
          </div>
        </div>

        {/* Regulatory Posture Notice */}
        <div className="rounded-xl bg-bg-sunken border border-border/80 p-3.5 text-xs leading-relaxed text-muted flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-cyan-500 mt-0.5" />
          <div>
            <span className="font-semibold text-fg">Non-Prescriptive Clinical Decision Support Notice: </span>
            {CNS_PENETRATION_REGULATORY_DISCLAIMER}
          </div>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 p-3.5 text-xs font-semibold text-cyan-900 dark:text-cyan-100 flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <Sparkles className="size-4 shrink-0 text-cyan-500" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 2. Desk Tray CNS Exposure Audit & Pre-Configured Loaders */}
      <section
        aria-label="Desk Tray CNS Exposure Audit"
        className="flex flex-col gap-4 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Shield className="size-5 text-cyan-500" />
              Desk Tray CNS Penetration Audit
            </h2>
            <p className="text-xs text-muted">
              Real-time audit of active drugs on your clinical tray for blood-brain barrier permeability, efflux collisions, and neuro-risks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Tray Count:</span>
            <span className="rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-bold text-fg border border-border">
              {selected.length} {selected.length === 1 ? "Drug" : "Drugs"}
            </span>
          </div>
        </div>

        {/* Critical / Warning Risk Alerts */}
        {trayRisks.length > 0 && (
          <div className="space-y-3">
            {trayRisks.map((risk) => (
              <div
                key={risk.id}
                className={cn(
                  "rounded-xl border p-4 text-xs transition-all",
                  risk.severity === "critical"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                    : risk.severity === "warning"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-950 dark:text-cyan-100",
                )}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  {risk.severity === "critical" ? (
                    <AlertOctagon className="size-5 shrink-0 text-rose-500 mt-0.5" />
                  ) : risk.severity === "warning" ? (
                    <AlertTriangle className="size-5 shrink-0 text-amber-500 mt-0.5" />
                  ) : (
                    <Info className="size-5 shrink-0 text-cyan-500 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm tracking-tight">{risk.title}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          risk.severity === "critical"
                            ? "bg-rose-500 text-white"
                            : risk.severity === "warning"
                            ? "bg-amber-500 text-white"
                            : "bg-cyan-500 text-white",
                        )}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <p className="font-medium text-xs leading-relaxed">{risk.hazard}</p>
                  </div>
                </div>

                <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2.5 text-[11px] leading-relaxed">
                  <div>
                    <span className="font-bold">Biophysical Mechanism: </span>
                    <span className="text-muted dark:text-muted/80">{risk.biophysicalMechanism}</span>
                  </div>
                  <div>
                    <span className="font-bold">Actionable Clinical Considerations:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted dark:text-muted/80">
                      {risk.actionableConsiderations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[10px] text-muted italic pt-1">
                    Citation: {risk.literatureCitation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tray Drug Score Summary Strip */}
        {trayProfiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {trayProfiles.map(({ drugId, drugName, scoreResult, profile }) => (
              <div
                key={drugId}
                className="flex flex-col justify-between rounded-xl border border-border bg-bg-sunken p-3 text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-fg truncate">{drugName}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        scoreResult.level === "High"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : scoreResult.level === "Moderate"
                          ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                          : scoreResult.level === "Low"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30",
                      )}
                    >
                      {scoreResult.level} CNS
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate">{profile?.drugClass ?? "Registered Drug"}</p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-muted">BBP Score: </span>
                    <span className="font-mono font-bold text-fg">{scoreResult.score}/100</span>
                  </div>
                  <div>
                    <span className="text-muted">CSF/Plasma: </span>
                    <span className="font-mono font-bold text-fg">~{scoreResult.csfPlasmaRatioEstimatePercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
            No drugs currently on your desk tray. Add drugs from the scorecard below or click one of the 1-tap high-yield clinical regimens to audit CNS exposure.
          </div>
        )}

        {/* 1-Tap Preconfigured Clinical Regimen Loaders */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            1-Tap High-Yield Clinical Regimen Loaders
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {HIGH_YIELD_REGIMENS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => {
                  load(reg.drugIds);
                  showFeedback(`Loaded '${reg.title}' (${reg.drugIds.join(", ")}) onto Desk Tray`);
                }}
                className="flex flex-col text-left rounded-xl border border-border bg-surface p-3 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 min-h-[44px]"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-fg">{reg.title}</span>
                  <span className="rounded bg-bg-sunken px-1.5 py-0.5 text-[9px] font-semibold text-muted border border-border">
                    {reg.badge}
                  </span>
                </div>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">{reg.description}</p>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                  <Plus className="size-3" />
                  <span>Load {reg.drugIds.length} drugs onto tray</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Meningeal Inflammation Simulator Toggle & BBB Architecture Diagram */}
      <section
        aria-label="Blood-Brain Barrier Physiological Architecture & Inflammation Simulator"
        className="flex flex-col gap-5 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Layers className="size-5 text-cyan-500" />
              BBB Neurovascular Unit Architecture &amp; Inflammation Simulator
            </h2>
            <p className="text-xs text-muted">
              Interactive biophysical model of endothelial tight junctions (claudin-5, occludin), pericytes, astrocyte end-feet, and luminal efflux.
            </p>
          </div>

          {/* Interactive Meningeal Inflammation Toggle */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold text-muted hidden sm:inline">Meningeal State:</span>
            <button
              type="button"
              role="switch"
              aria-checked={isMeningesInflamed}
              onClick={() => setIsMeningesInflamed(!isMeningesInflamed)}
              className={cn(
                "flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                isMeningesInflamed
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-100"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-100",
              )}
            >
              {isMeningesInflamed ? (
                <>
                  <Flame className="size-4 text-rose-500 animate-bounce" />
                  <span>Acute Bacterial Meningitis (Inflamed Clefts)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Intact Physiological BBB (Sealed Zippers)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pathophysiology Explainer Card */}
        <div
          className={cn(
            "rounded-xl border p-4 text-xs transition-all",
            isMeningesInflamed
              ? "bg-rose-500/5 border-rose-500/30 text-rose-950 dark:text-rose-100"
              : "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-100",
          )}
        >
          <div className="flex items-start gap-2.5">
            {isMeningesInflamed ? (
              <Flame className="size-4 shrink-0 text-rose-500 mt-0.5" />
            ) : (
              <ShieldCheck className="size-4 shrink-0 text-emerald-500 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="font-bold text-xs uppercase tracking-wide">
                {isMeningesInflamed
                  ? "Inflammation Active: Paracellular Tight Junction Breakdown"
                  : "Physiological Baseline: High Transendothelial Electrical Resistance (>1500 Ω·cm²)"}
              </span>
              <p className="text-xs leading-relaxed text-muted dark:text-muted/90">
                {isMeningesInflamed
                  ? "Bacterial lysis and pathogen-associated molecular patterns (peptidoglycan, teichoic acid, endotoxin) trigger microglial and endothelial release of TNF-α, IL-1β, and matrix metalloproteinases (MMP-2/9). MMPs degrade claudin-5 and occludin extracellular loops, widening paracellular clefts and allowing hydrophilic beta-lactams (ceftriaxone, ampicillin, meropenem) and vancomycin to leak into CSF."
                  : "Brain capillary endothelial cells are joined by continuous, non-fenestrated tight junctions (claudin-5, occludin, ZO-1 complexes), conferring high electrical resistance (>1500-2000 Ω·cm²). Paracellular water and solute flux is sealed. Only small, lipophilic molecules with low polar surface area (TPSA < 90 Å²) and low H-bonding can cross via transcellular passive diffusion unless transported by active carriers."}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive SVG Diagram */}
        <div className="relative w-full rounded-xl border border-border bg-bg-sunken p-4 overflow-hidden">
          <div className="text-center mb-2">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Anatomical Diagram of the Neurovascular Unit (Click Hotspots Below)
            </span>
          </div>

          <svg
            viewBox="0 0 800 360"
            className="w-full h-auto max-h-[420px] select-none"
            role="img"
            aria-label="Blood-Brain Barrier Cellular Architecture Diagram"
          >
            {/* Background Layer: Lumen vs Brain Parenchyma */}
            {/* 1. Capillary Lumen (Blood Stream) */}
            <rect x="20" y="20" width="760" height="90" rx="8" fill="rgba(239, 68, 68, 0.08)" stroke="rgba(239, 68, 68, 0.25)" strokeDasharray="4 2" />
            <text x="35" y="45" fill="var(--fg)" fontSize="12" fontWeight="bold">Capillary Lumen (Circulating Blood)</text>
            <text x="35" y="65" fill="var(--muted)" fontSize="10">Erythrocytes, serum albumin, unbound drug molecules</text>

            {/* Blood particles / Erythrocytes */}
            <circle cx="280" cy="55" r="14" fill="#f87171" opacity="0.6" />
            <circle cx="480" cy="70" r="16" fill="#f87171" opacity="0.6" />
            <circle cx="650" cy="50" r="12" fill="#f87171" opacity="0.6" />

            {/* Circulating Drug Molecules */}
            <g transform="translate(180, 50)">
              <circle cx="0" cy="0" r="5" fill="#06b6d4" />
              <text x="8" y="4" fill="var(--fg)" fontSize="9">Lipophilic Drug</text>
            </g>
            <g transform="translate(360, 45)">
              <rect x="-4" y="-4" width="8" height="8" fill="#f59e0b" />
              <text x="8" y="4" fill="var(--fg)" fontSize="9">Polar Beta-Lactam</text>
            </g>
            <g transform="translate(560, 60)">
              <polygon points="0,-5 5,5 -5,5" fill="#a855f7" />
              <text x="8" y="4" fill="var(--fg)" fontSize="9">P-gp Substrate (Loperamide)</text>
            </g>

            {/* 2. Endothelial Cell Layer with Tight Junctions */}
            {/* Endothelial Cell A */}
            <rect
              x="50"
              y="130"
              width="310"
              height="60"
              rx="6"
              fill={inspectedHotspot === "endothelium" ? "rgba(6, 182, 212, 0.25)" : "rgba(6, 182, 212, 0.12)"}
              stroke="#06b6d4"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onClick={() => setInspectedHotspot("endothelium")}
            />
            <text x="70" y="155" fill="var(--fg)" fontSize="11" fontWeight="bold">Brain Capillary Endothelial Cell A</text>
            <text x="70" y="172" fill="var(--muted)" fontSize="9">Non-fenestrated, high mitochondria, tight pinocytosis</text>

            {/* Endothelial Cell B */}
            <rect
              x="440"
              y="130"
              width="310"
              height="60"
              rx="6"
              fill={inspectedHotspot === "endothelium" ? "rgba(6, 182, 212, 0.25)" : "rgba(6, 182, 212, 0.12)"}
              stroke="#06b6d4"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onClick={() => setInspectedHotspot("endothelium")}
            />
            <text x="460" y="155" fill="var(--fg)" fontSize="11" fontWeight="bold">Brain Capillary Endothelial Cell B</text>
            <text x="460" y="172" fill="var(--muted)" fontSize="9">Non-fenestrated, continuous lipid bilayer barrier</text>

            {/* Active Efflux Transporters on Luminal Membrane (P-gp & BCRP) */}
            <g
              transform="translate(200, 118)"
              className="cursor-pointer"
              onClick={() => setInspectedHotspot("efflux")}
            >
              <rect x="-25" y="-8" width="50" height="16" rx="4" fill="#a855f7" stroke="#7e22ce" strokeWidth="1.5" />
              <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">P-gp (ABCB1)</text>
              {/* Efflux arrow pumping back into blood */}
              <path d="M 0 -10 L 0 -22 M -4 -16 L 0 -22 L 4 -16" stroke="#a855f7" strokeWidth="2" fill="none" />
            </g>

            <g
              transform="translate(580, 118)"
              className="cursor-pointer"
              onClick={() => setInspectedHotspot("efflux")}
            >
              <rect x="-25" y="-8" width="50" height="16" rx="4" fill="#a855f7" stroke="#7e22ce" strokeWidth="1.5" />
              <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">BCRP (ABCG2)</text>
              <path d="M 0 -10 L 0 -22 M -4 -16 L 0 -22 L 4 -16" stroke="#a855f7" strokeWidth="2" fill="none" />
            </g>

            {/* INTERCELLULAR TIGHT JUNCTION CLEFT (Between Cell A and Cell B: x=360 to x=440) */}
            <g
              className="cursor-pointer"
              onClick={() => setInspectedHotspot("tight-junctions")}
            >
              {isMeningesInflamed ? (
                /* INFLAMED / DISRUPTED TIGHT JUNCTIONS */
                <>
                  <rect x="365" y="125" width="70" height="70" rx="4" fill="rgba(244, 63, 94, 0.15)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
                  {/* Broken zipper links */}
                  <line x1="380" y1="140" x2="395" y2="148" stroke="#f43f5e" strokeWidth="3" />
                  <line x1="420" y1="145" x2="405" y2="155" stroke="#f43f5e" strokeWidth="3" />
                  <line x1="385" y1="170" x2="400" y2="178" stroke="#f43f5e" strokeWidth="3" />
                  <line x1="415" y1="165" x2="425" y2="180" stroke="#f43f5e" strokeWidth="3" />
                  {/* Glowing cytokine markers */}
                  <circle cx="400" cy="135" r="4" fill="#f43f5e" />
                  <text x="400" y="193" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle">MMP-9 / TNF-α</text>
                  <text x="400" y="105" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle">Disrupted Cleft</text>
                  {/* Paracellular Leak Arrow */}
                  <path d="M 400 95 L 400 215 M 396 210 L 400 218 L 404 210" stroke="#f43f5e" strokeWidth="2" fill="none" />
                </>
              ) : (
                /* INTACT SEALED TIGHT JUNCTION */
                <>
                  <rect x="360" y="125" width="80" height="70" rx="4" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2" />
                  {/* Interlocking green zipper bars (claudin-5 & occludin) */}
                  <line x1="375" y1="140" x2="425" y2="140" stroke="#10b981" strokeWidth="3" />
                  <line x1="375" y1="155" x2="425" y2="155" stroke="#10b981" strokeWidth="3" />
                  <line x1="375" y1="170" x2="425" y2="170" stroke="#10b981" strokeWidth="3" />
                  <line x1="375" y1="185" x2="425" y2="185" stroke="#10b981" strokeWidth="3" />
                  <text x="400" y="135" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">Claudin-5</text>
                  <text x="400" y="198" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle">Occludin / ZO-1</text>
                  {/* Blocked Paracellular Barrier Arrow */}
                  <line x1="400" y1="95" x2="400" y2="120" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="395" y1="120" x2="405" y2="120" stroke="#ef4444" strokeWidth="3" />
                </>
              )}
            </g>

            {/* 3. Basement Membrane / Pericytes */}
            <rect
              x="40"
              y="200"
              width="720"
              height="14"
              rx="3"
              fill="rgba(245, 158, 11, 0.18)"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <text x="50" y="211" fill="#f59e0b" fontSize="9" fontWeight="bold">Basement Membrane / Basal Lamina (Type IV Collagen, Laminin, Perlecan)</text>

            {/* Pericyte Cell */}
            <g
              transform="translate(180, 218)"
              className="cursor-pointer"
              onClick={() => setInspectedHotspot("pericytes")}
            >
              <ellipse cx="0" cy="0" rx="60" ry="14" fill={inspectedHotspot === "pericytes" ? "rgba(234, 88, 12, 0.35)" : "rgba(234, 88, 12, 0.2)"} stroke="#ea580c" strokeWidth="1.5" />
              <text x="0" y="4" fill="var(--fg)" fontSize="10" fontWeight="bold" textAnchor="middle">Pericyte (Vessel Tone)</text>
            </g>

            {/* 4. Astrocyte End-Feet (Glial Limitans) */}
            <g
              className="cursor-pointer"
              onClick={() => setInspectedHotspot("astrocytes")}
            >
              <rect
                x="40"
                y="245"
                width="720"
                height="45"
                rx="6"
                fill={inspectedHotspot === "astrocytes" ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.12)"}
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <text x="60" y="268" fill="var(--fg)" fontSize="11" fontWeight="bold">Astrocyte End-Feet (Aquaporin-4 AQP4 Polarized Channels)</text>
              <text x="60" y="282" fill="var(--muted)" fontSize="9">Induces endothelial tight junction phenotypes; regulates glymphatic clearance</text>
            </g>

            {/* 5. Brain Parenchyma / Interstitial Space & Neurons */}
            <rect x="20" y="300" width="760" height="45" rx="6" fill="rgba(168, 85, 247, 0.08)" stroke="rgba(168, 85, 247, 0.25)" />
            <text x="35" y="325" fill="var(--fg)" fontSize="11" fontWeight="bold">Brain Parenchyma &amp; Interstitial Fluid (ISF / Neurons)</text>
            <text x="35" y="338" fill="var(--muted)" fontSize="9">Direct site of therapeutic neuro-receptors (H1, Beta-1, Mu-Opioid, GABA-A, SV2A)</text>
          </svg>

          {/* Hotspot Inspection Inspector Drawer */}
          {inspectedHotspot && (
            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-surface p-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                  {inspectedHotspot === "tight-junctions"
                    ? "Intercellular Tight Junctions (Claudin-5 / Occludin / ZO-1)"
                    : inspectedHotspot === "endothelium"
                    ? "Brain Capillary Endothelial Cells (Continuous Non-Fenestrated)"
                    : inspectedHotspot === "efflux"
                    ? "Luminal Active Efflux Pumps (P-gp ABCB1 & BCRP ABCG2)"
                    : inspectedHotspot === "pericytes"
                    ? "Pericytes (Abluminal Stability & Microvascular Regulation)"
                    : "Astrocyte End-Feet (Glial Limitans & AQP4 Water Channels)"}
                </span>
                <span className="text-[10px] text-muted">Click any component in diagram to inspect</span>
              </div>

              <p className="text-muted leading-relaxed mb-2">
                {inspectedHotspot === "tight-junctions"
                  ? isMeningesInflamed
                    ? "DISRUPTED STATE: Bacterial meningitis promotes degradation of claudin-5 and occludin. Paracellular electrical resistance drops, permitting polar antimicrobials (ceftriaxone, ampicillin, meropenem) and vancomycin to achieve therapeutic bactericidal levels in CSF."
                    : "INTACT PHYSIOLOGICAL STATE: Interlocking transmembrane claudin-5 and occludin proteins create high-resistance paracellular seals (>1500-2000 Ω·cm²). Excludes polar solutes, ions, and hydrophilic drugs (logP < 0, TPSA > 90 Å²)."
                  : inspectedHotspot === "endothelium"
                  ? "Capillary endothelial cells lack fenestrations and exhibit minimal pinocytotic vesicles. Lipid bilayer membranes enforce transcellular passive diffusion, favoring lipophilic compounds (logP 1.5 - 3.0, TPSA < 90 Å², MW < 400 Da)."
                  : inspectedHotspot === "efflux"
                  ? "P-glycoprotein (ABCB1) and BCRP (ABCG2) are expressed on the luminal (blood-facing) apical membrane. They actively extrude xenobiotics back into blood using ATP hydrolysis. Primary gatekeeper excluding loperamide and 2nd-gen antihistamines (fexofenadine)."
                  : inspectedHotspot === "pericytes"
                  ? "Pericytes wrap around capillary endothelia within the basement membrane. They govern microvascular stability, capillary diameter, and participate in blood-brain barrier maintenance."
                  : "Astrocyte end-feet encircle microvessels. They express high densities of aquaporin-4 (AQP4) water channels and secrete trophic factors (TGF-β, GDNF) that induce tight-junction gene expression in endothelial cells."}
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setInspectedHotspot("tight-junctions")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border min-h-[36px]",
                    inspectedHotspot === "tight-junctions" ? "bg-cyan-500/20 border-cyan-500 text-fg" : "border-border text-muted",
                  )}
                >
                  Tight Junctions
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedHotspot("endothelium")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border min-h-[36px]",
                    inspectedHotspot === "endothelium" ? "bg-cyan-500/20 border-cyan-500 text-fg" : "border-border text-muted",
                  )}
                >
                  Endothelium
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedHotspot("efflux")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border min-h-[36px]",
                    inspectedHotspot === "efflux" ? "bg-cyan-500/20 border-cyan-500 text-fg" : "border-border text-muted",
                  )}
                >
                  Efflux Pumps
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedHotspot("pericytes")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border min-h-[36px]",
                    inspectedHotspot === "pericytes" ? "bg-cyan-500/20 border-cyan-500 text-fg" : "border-border text-muted",
                  )}
                >
                  Pericytes
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedHotspot("astrocytes")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border min-h-[36px]",
                    inspectedHotspot === "astrocytes" ? "bg-cyan-500/20 border-cyan-500 text-fg" : "border-border text-muted",
                  )}
                >
                  Astrocyte End-Feet
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. High-Yield Drug Class Divergence Showcase */}
      <section
        aria-label="High-Yield Drug Class Divergence Showcase"
        className="flex flex-col gap-4 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              High-Yield Drug Class Divergences
            </h2>
            <p className="text-xs text-muted">
              Side-by-side pharmacological comparators illustrating how biophysical determinants separate clinical indications from toxicities.
            </p>
          </div>
        </div>

        {/* Divergence Tab Buttons */}
        <div className="flex flex-wrap gap-2">
          {CNS_CLASS_DIVERGENCES.map((div) => (
            <button
              key={div.id}
              type="button"
              onClick={() => setSelectedDivergenceId(div.id)}
              className={cn(
                "min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left",
                selectedDivergenceId === div.id
                  ? "bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs"
                  : "bg-bg-sunken border-border text-muted hover:text-fg hover:bg-surface",
              )}
            >
              {div.title}
            </button>
          ))}
        </div>

        {/* Active Divergence Card Container */}
        <div className="rounded-xl border border-border bg-bg-sunken p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {activeDivergence.drugClass}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-fg">{activeDivergence.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const combined = [
                  ...activeDivergence.comparatorA.drugIds,
                  ...activeDivergence.comparatorB.drugIds,
                ];
                load(combined);
                showFeedback(`Loaded all ${combined.length} divergence drugs onto Desk Tray`);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-surface px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 min-h-[44px] sm:min-h-[36px]"
            >
              <Plus className="size-3.5" />
              <span>Load Both Comparators onto Tray</span>
            </button>
          </div>

          <p className="text-xs text-muted leading-relaxed">{activeDivergence.summary}</p>

          {/* Side-by-Side Comparators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Comparator A */}
            <div className="rounded-xl border border-rose-500/30 bg-surface p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                  {activeDivergence.comparatorA.label}
                </span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {activeDivergence.comparatorA.drugIds.join(", ")}
                </span>
              </div>
              <p className="text-xs font-semibold text-fg">{activeDivergence.comparatorA.phenotype}</p>
              <div className="text-[11px] space-y-1.5 pt-1 text-muted">
                <div>
                  <span className="font-semibold text-fg">Biophysical Determinants: </span>
                  {activeDivergence.comparatorA.biophysicalDeterminants}
                </div>
                <div>
                  <span className="font-semibold text-fg">Clinical Consequences: </span>
                  {activeDivergence.comparatorA.clinicalImplications}
                </div>
              </div>
            </div>

            {/* Comparator B */}
            <div className="rounded-xl border border-emerald-500/30 bg-surface p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {activeDivergence.comparatorB.label}
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {activeDivergence.comparatorB.drugIds.join(", ")}
                </span>
              </div>
              <p className="text-xs font-semibold text-fg">{activeDivergence.comparatorB.phenotype}</p>
              <div className="text-[11px] space-y-1.5 pt-1 text-muted">
                <div>
                  <span className="font-semibold text-fg">Biophysical Determinants: </span>
                  {activeDivergence.comparatorB.biophysicalDeterminants}
                </div>
                <div>
                  <span className="font-semibold text-fg">Clinical Consequences: </span>
                  {activeDivergence.comparatorB.clinicalImplications}
                </div>
              </div>
            </div>
          </div>

          {/* Molecular Mechanism & Clinical Pearls */}
          <div className="rounded-lg bg-surface border border-border p-3.5 text-xs space-y-2">
            <div>
              <span className="font-bold text-fg">Molecular Membrane Vector: </span>
              <span className="text-muted">{activeDivergence.molecularMechanism}</span>
            </div>
            <div>
              <span className="font-bold text-fg">Tight Junction &amp; Efflux Role: </span>
              <span className="text-muted">{activeDivergence.tightJunctionOrEffluxRole}</span>
            </div>
            <div className="pt-1">
              <span className="font-bold text-fg">Clinical Pearls:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted">
                {activeDivergence.clinicalPearls.map((pearl, i) => (
                  <li key={i}>{pearl}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CNS Penetration Scorecard & Formulary Matrix */}
      <section
        aria-label="CNS Penetration Scorecard & Drug Matrix"
        className="flex flex-col gap-4 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Activity className="size-5 text-cyan-500" />
              CNS Penetration Scorecard &amp; Biophysical Formulary
            </h2>
            <p className="text-xs text-muted">
              Live calculated BBP scores, CSF/plasma partitioning, polar surface area (TPSA), and active efflux status across {CNS_PROFILES.length} reference compounds.
            </p>
          </div>
        </div>

        {/* Filter Bar: Search, Category, Permeability */}
        <div className="flex flex-col gap-3">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drug name, class, or indication (e.g., diphenhydramine, ceftriaxone, delirium)..."
              className="w-full rounded-xl border border-border bg-bg-sunken pl-10 pr-4 py-2.5 text-xs sm:text-sm text-fg placeholder:text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 min-h-[44px]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted mr-1">Category:</span>
            {(
              [
                "All",
                "Antihistamine",
                "Beta-Blocker",
                "Corticosteroid",
                "Antimicrobial",
                "Opioid",
                "Psychotropic",
                "Anticonvulsant",
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                  selectedCategory === cat
                    ? "bg-cyan-500 text-white border-cyan-500"
                    : "bg-bg-sunken text-muted border-border hover:text-fg hover:bg-surface",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Permeability Level Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted mr-1">Permeability:</span>
            {(["All", "High", "Moderate", "Low", "Negligible"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedPermeability(lvl)}
                className={cn(
                  "min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                  selectedPermeability === lvl
                    ? "bg-cyan-500 text-white border-cyan-500"
                    : "bg-bg-sunken text-muted border-border hover:text-fg hover:bg-surface",
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Drug Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredProfiles.map((p) => {
            const bbp = calculateBbpScore(p.drugId, isMeningesInflamed);
            const isOnTray = selected.includes(p.drugId);

            return (
              <div
                key={p.drugId}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 text-xs shadow-xs transition-all hover:border-cyan-500/40"
              >
                <div className="space-y-2.5">
                  {/* Top Row: Name, Class, Level Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-fg tracking-tight">{p.drugName}</h4>
                      <p className="text-[11px] text-muted">{p.drugClass}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        bbp.level === "High"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : bbp.level === "Moderate"
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                          : bbp.level === "Low"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
                      )}
                    >
                      {bbp.level}
                    </span>
                  </div>

                  {/* BBP Score & CSF Ratio Bar */}
                  <div className="rounded-lg bg-bg-sunken p-2.5 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted">BBP Score:</span>
                      <span className="font-mono font-bold text-fg">{bbp.score} / 100</span>
                    </div>
                    <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          bbp.score >= 65 ? "bg-emerald-500" : bbp.score >= 40 ? "bg-cyan-500" : bbp.score >= 20 ? "bg-amber-500" : "bg-slate-400",
                        )}
                        style={{ width: `${bbp.score}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-muted">Estimated CSF/Plasma Ratio:</span>
                      <span className="font-mono font-bold text-fg">~{bbp.csfPlasmaRatioEstimatePercent}%</span>
                    </div>
                  </div>

                  {/* Biophysical Chips */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                    <div className="rounded bg-bg-sunken p-1 text-center border border-border/60">
                      <div className="text-muted text-[9px]">MW</div>
                      <div className="font-bold text-fg">{p.biophysical.molecularWeight} Da</div>
                    </div>
                    <div className="rounded bg-bg-sunken p-1 text-center border border-border/60">
                      <div className="text-muted text-[9px]">logP</div>
                      <div className="font-bold text-fg">{p.biophysical.logP}</div>
                    </div>
                    <div className="rounded bg-bg-sunken p-1 text-center border border-border/60">
                      <div className="text-muted text-[9px]">TPSA</div>
                      <div className="font-bold text-fg">{p.biophysical.tpsa} Å²</div>
                    </div>
                  </div>

                  {/* Transport & Efflux Chips */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="rounded bg-bg-sunken px-1.5 py-0.5 text-muted border border-border/50">
                      HBD: {p.biophysical.hBondDonors} / HBA: {p.biophysical.hBondAcceptors}
                    </span>
                    {p.biophysical.pgpSubstrate ? (
                      <span className="rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 border border-purple-500/30">
                        P-gp Substrate
                      </span>
                    ) : (
                      <span className="rounded bg-bg-sunken px-1.5 py-0.5 text-muted border border-border/50">
                        No P-gp Efflux
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold border",
                        p.centralSedationDeliriumRisk === "High"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          : p.centralSedationDeliriumRisk === "Moderate"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                      )}
                    >
                      Sedation: {p.centralSedationDeliriumRisk}
                    </span>
                  </div>

                  {/* Mechanistic Summary Snippet */}
                  <p className="text-[11px] text-muted line-clamp-3 leading-relaxed">
                    {p.mechanisticSummary}
                  </p>
                </div>

                {/* Bottom Row: 1-Tap Add to Desk Tray */}
                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted">
                    Tight Junction Sensitivity: {p.tightJunctionSensitivity}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      add(p.drugId);
                      showFeedback(`Added ${p.drugName} to Desk Tray`);
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all min-h-[44px] sm:min-h-[36px]",
                      isOnTray
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-cyan-500 text-white hover:bg-cyan-600",
                    )}
                  >
                    {isOnTray ? (
                      <>
                        <Check className="size-3" />
                        <span>On Tray</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3" />
                        <span>Add to Tray</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProfiles.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted">
            No drugs matched your filter criteria. Try adjusting the search query or category filters.
          </div>
        )}
      </section>
    </div>
  );
}
