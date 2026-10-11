import { useState, useMemo } from "react";
import {
  Activity,
  Zap,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Check,
  Plus,
  BookOpen,
  Info,
  Heart,
  TrendingDown,
  TrendingUp,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  Gauge,
  Sliders,
  Flame,
} from "lucide-react";
import {
  ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER,
  ELECTROPHYSIOLOGY_CITATIONS,
  getActionPotentialPhases,
  getIonChannelById,
  getAllIonChannels,
  getVaughanWilliamsClasses,
  getTissueModel,
  getArrhythmiaMechanisms,
  getCardiacElectrophysiologyProfile,
  detectArrhythmiaCollisions,
  type ActionPotentialPhase,
  type ActionPotentialPhaseNumber,
  type VaughanWilliamsClassInfo,
  type ArrhythmiaMechanism,
  type ArrhythmiaCollision,
} from "@/lib/drugs/cardiac-electrophysiology";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";

export function CardiacElectrophysiology() {
  const [tissueType, setTissueType] = useState<"ventricular" | "nodal" | "overlay">("ventricular");
  const [selectedPhaseNumber, setSelectedPhaseNumber] = useState<ActionPotentialPhaseNumber>(0);
  const [activeTab, setActiveTab] = useState<"phases" | "classes" | "mechanisms" | "channels" | "tray">("phases");
  const [selectedClassId, setSelectedClassId] = useState<string>("IA");
  const [simulateAfterdepolarization, setSimulateAfterdepolarization] = useState<"none" | "ead" | "dad">("none");
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  // Subscribe to desk tray
  const selectedOnDesk = useDesk((s) => s.selected);

  // Data helpers
  const phases = useMemo(() => getActionPotentialPhases(), []);
  const allChannels = useMemo(() => getAllIonChannels(), []);
  const vwClasses = useMemo(() => getVaughanWilliamsClasses(), []);
  const mechanisms = useMemo(() => getArrhythmiaMechanisms(), []);
  const ventricularModel = useMemo(() => getTissueModel("ventricular"), []);
  const nodalModel = useMemo(() => getTissueModel("nodal"), []);

  // Selected phase detail
  const currentPhase = useMemo<ActionPotentialPhase>(() => {
    return phases.find((p) => p.phase === selectedPhaseNumber) ?? phases[0];
  }, [phases, selectedPhaseNumber]);

  // Selected class detail
  const currentClass = useMemo<VaughanWilliamsClassInfo>(() => {
    return vwClasses.find((c) => c.id === selectedClassId) ?? vwClasses[0];
  }, [vwClasses, selectedClassId]);

  // Collisions on current tray
  const collisionsOnDesk = useMemo<ArrhythmiaCollision[]>(() => {
    return detectArrhythmiaCollisions(selectedOnDesk);
  }, [selectedOnDesk]);

  // Tray drugs with cardiac electrophysiology profiles
  const trayProfiles = useMemo(() => {
    return selectedOnDesk
      .map((id) => getCardiacElectrophysiologyProfile(id))
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [selectedOnDesk]);

  // Quick preset loaders
  const loadPreset = (drugIds: string[]) => {
    useDesk.getState().load(drugIds);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleAddDrug = (drugId: string) => {
    useDesk.getState().add(drugId);
  };

  return (
    <div className="flex flex-col gap-6 py-2 pb-16 max-w-6xl mx-auto w-full">
      {/* 1. Header & Regulatory Disclaimer Banner */}
      <header className="flex flex-col gap-3 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <Heart className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                Cardiac Electrophysiology &amp; Ion Channel Switchboard
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Action potential kinetics, Vaughan Williams mechanics, and biophysical arrhythmia collisions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              <Activity className="size-3.5" />
              FD&amp;C Act § 520(o)(1)(E)
            </span>
          </div>
        </div>

        {/* Regulatory Posture Notice */}
        <div className="rounded-xl bg-bg-sunken border border-border/80 p-3.5 text-xs leading-relaxed text-muted flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-accent mt-0.5" />
          <div>
            <span className="font-semibold text-fg">Non-Prescriptive Clinical Decision Support Notice: </span>
            {ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER}
          </div>
        </div>
      </header>

      {/* 2. Interactive SVG Action Potential Graphic */}
      <section className="flex flex-col gap-4 rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg flex items-center gap-2">
              <Zap className="size-5 text-amber-500" />
              Biophysical Action Potential Morphologies
            </h2>
            <p className="text-xs text-muted">
              Interactive transmembrane voltage curves: Ventricular fast-response vs SA/AV nodal pacemaker slow-response.
            </p>
          </div>

          {/* Morphological Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-bg-sunken p-1 border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTissueType("ventricular")}
                className={cn(
                  "min-h-[38px] px-3 rounded-md transition-all",
                  tissueType === "ventricular"
                    ? "bg-surface text-fg shadow-sm font-bold"
                    : "text-muted hover:text-fg",
                )}
              >
                Ventricular (-90 mV)
              </button>
              <button
                type="button"
                onClick={() => setTissueType("nodal")}
                className={cn(
                  "min-h-[38px] px-3 rounded-md transition-all",
                  tissueType === "nodal"
                    ? "bg-surface text-fg shadow-sm font-bold"
                    : "text-muted hover:text-fg",
                )}
              >
                SA / AV Nodal (-60 mV)
              </button>
              <button
                type="button"
                onClick={() => setTissueType("overlay")}
                className={cn(
                  "min-h-[38px] px-3 rounded-md transition-all",
                  tissueType === "overlay"
                    ? "bg-surface text-fg shadow-sm font-bold"
                    : "text-muted hover:text-fg",
                )}
              >
                Dual Overlay
              </button>
            </div>

            {/* Afterdepolarization simulation toggle */}
            <div className="inline-flex rounded-lg bg-bg-sunken p-1 border border-border text-xs">
              <button
                type="button"
                title="Toggle simulated Early Afterdepolarization (Phase 2/3 Cav1.2 reactivation)"
                onClick={() => setSimulateAfterdepolarization(simulateAfterdepolarization === "ead" ? "none" : "ead")}
                className={cn(
                  "min-h-[38px] px-2.5 rounded-md transition-all flex items-center gap-1",
                  simulateAfterdepolarization === "ead"
                    ? "bg-rose-500 text-white font-bold shadow-sm"
                    : "text-muted hover:text-fg",
                )}
              >
                <Flame className="size-3" />
                Simulate EAD
              </button>
              <button
                type="button"
                title="Toggle simulated Delayed Afterdepolarization (Phase 4 SR Ca2+ leak)"
                onClick={() => setSimulateAfterdepolarization(simulateAfterdepolarization === "dad" ? "none" : "dad")}
                className={cn(
                  "min-h-[38px] px-2.5 rounded-md transition-all flex items-center gap-1",
                  simulateAfterdepolarization === "dad"
                    ? "bg-amber-600 text-white font-bold shadow-sm"
                    : "text-muted hover:text-fg",
                )}
              >
                <Sliders className="size-3" />
                Simulate DAD
              </button>
            </div>
          </div>
        </div>

        {/* SVG Display */}
        <div className="relative w-full overflow-hidden rounded-xl bg-neutral-950 p-2 sm:p-4 text-white shadow-inner">
          <svg
            viewBox="0 0 700 360"
            className="w-full h-auto select-none font-mono"
            style={{ minHeight: "260px" }}
          >
            <defs>
              <linearGradient id="ventricularGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="nodalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Grid & Axis Lines */}
            {/* Horizontal Voltage Grid */}
            <g opacity="0.25" stroke="#94a3b8" strokeDasharray="3,3">
              {/* +30 mV */}
              <line x1="60" y1="50" x2="670" y2="50" />
              {/* 0 mV */}
              <line x1="60" y1="110" x2="670" y2="110" stroke="#f87171" strokeWidth="1.2" opacity="0.6" />
              {/* -40 mV */}
              <line x1="60" y1="190" x2="670" y2="190" />
              {/* -60 mV */}
              <line x1="60" y1="230" x2="670" y2="230" stroke="#38bdf8" strokeWidth="1.2" opacity="0.5" />
              {/* -90 mV */}
              <line x1="60" y1="290" x2="670" y2="290" stroke="#38bdf8" strokeWidth="1.2" opacity="0.7" />
            </g>

            {/* Y Axis Labels */}
            <g fontSize="10" fill="#94a3b8" textAnchor="end">
              <text x="52" y="54">+30 mV</text>
              <text x="52" y="114">0 mV</text>
              <text x="52" y="194">-40 mV</text>
              <text x="52" y="234">-60 mV (Nodal MDP)</text>
              <text x="52" y="294">-90 mV (Resting)</text>
            </g>

            {/* Time Grid & Labels */}
            <g opacity="0.25" stroke="#94a3b8" strokeDasharray="3,3">
              <line x1="60" y1="30" x2="60" y2="305" />
              <line x1="210" y1="30" x2="210" y2="305" />
              <line x1="360" y1="30" x2="360" y2="305" />
              <line x1="510" y1="30" x2="510" y2="305" />
              <line x1="660" y1="30" x2="660" y2="305" />
            </g>
            <g fontSize="10" fill="#94a3b8" textAnchor="middle">
              <text x="60" y="325">0 ms</text>
              <text x="210" y="325">100 ms</text>
              <text x="360" y="325">200 ms</text>
              <text x="510" y="325">300 ms</text>
              <text x="660" y="325">400 ms</text>
              <text x="360" y="348" fill="#64748b" fontSize="11">Time (milliseconds)</text>
            </g>

            {/* Baseline threshold & resting annotations */}
            <g fontSize="9" fill="#94a3b8">
              <text x="70" y="186" fill="#f59e0b" opacity="0.8">-- Nodal Threshold (-40 mV)</text>
              <text x="70" y="246" fill="#38bdf8" opacity="0.8">-- Nodal Maximal Diastolic (-60 mV)</text>
              <text x="70" y="284" fill="#38bdf8" opacity="0.8">-- Ventricular Resting Potential (-90 mV)</text>
            </g>

            {/* 1. Ventricular Action Potential Curve */}
            {(tissueType === "ventricular" || tissueType === "overlay") && (
              <g>
                {/* Standard Ventricular Path */}
                {simulateAfterdepolarization === "none" && (
                  <path
                    d="M 60 290 L 110 290 C 115 290 120 180 125 50 C 128 48 135 75 145 95 C 160 92 250 100 370 115 C 415 125 450 170 480 250 C 495 285 510 290 530 290 L 660 290"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={tissueType === "ventricular" ? "3.5" : "2.5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* EAD simulation curve (Phase 2/3 secondary upstroke) */}
                {simulateAfterdepolarization === "ead" && (
                  <g>
                    <path
                      d="M 60 290 L 110 290 C 115 290 120 180 125 50 C 128 48 135 75 145 95 C 160 92 250 100 350 115 C 380 125 390 145 405 160 C 415 130 430 110 445 120 C 465 140 480 200 500 260 C 515 285 530 290 550 290 L 660 290"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* EAD Callout */}
                    <circle cx="430" cy="115" r="6" fill="#f43f5e" className="animate-ping" opacity="0.7" />
                    <circle cx="430" cy="115" r="4" fill="#f43f5e" />
                    <text x="430" y="90" fill="#f43f5e" fontSize="11" fontWeight="bold" textAnchor="middle">
                      ⚡ Phase 2/3 EAD (Cav1.2 Reactivation)
                    </text>
                  </g>
                )}

                {/* DAD simulation curve (Phase 4 spontaneous diastolic bump) */}
                {simulateAfterdepolarization === "dad" && (
                  <g>
                    <path
                      d="M 60 290 L 110 290 C 115 290 120 180 125 50 C 128 48 135 75 145 95 C 160 92 250 100 370 115 C 415 125 450 170 480 250 C 495 285 510 290 530 290 L 560 290 C 580 285 595 240 610 245 C 620 255 630 288 640 290 L 660 290"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* DAD Callout */}
                    <circle cx="605" cy="245" r="6" fill="#f59e0b" className="animate-ping" opacity="0.7" />
                    <circle cx="605" cy="245" r="4" fill="#f59e0b" />
                    <text x="605" y="225" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">
                      ⚡ Phase 4 DAD (NCX1 Iti Current)
                    </text>
                  </g>
                )}

                {/* Ventricular Phase Markers */}
                <g fontSize="11" fontWeight="bold" fill="#0284c7">
                  {/* Phase 0 Upstroke */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPhaseNumber(0)}
                  >
                    <circle cx="125" cy="50" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="125" y="54" fill="#ffffff" textAnchor="middle">0</text>
                  </g>

                  {/* Phase 1 Notch */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPhaseNumber(1)}
                  >
                    <circle cx="145" cy="95" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="145" y="99" fill="#ffffff" textAnchor="middle">1</text>
                  </g>

                  {/* Phase 2 Plateau */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPhaseNumber(2)}
                  >
                    <circle cx="270" cy="105" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="270" y="109" fill="#ffffff" textAnchor="middle">2</text>
                  </g>

                  {/* Phase 3 Repolarization */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPhaseNumber(3)}
                  >
                    <circle cx="460" cy="210" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="460" y="214" fill="#ffffff" textAnchor="middle">3</text>
                  </g>

                  {/* Phase 4 Resting */}
                  <g
                    className="cursor-pointer"
                    onClick={() => setSelectedPhaseNumber(4)}
                  >
                    <circle cx="580" cy="290" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="580" y="294" fill="#ffffff" textAnchor="middle">4</text>
                  </g>
                </g>
              </g>
            )}

            {/* 2. Nodal Action Potential Curve */}
            {(tissueType === "nodal" || tissueType === "overlay") && (
              <g>
                <path
                  d="M 60 230 C 140 215 220 200 280 190 C 310 170 330 110 350 80 C 365 75 380 90 400 130 C 430 185 460 225 490 230 C 530 220 570 210 610 200 C 630 195 645 190 660 185"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={tissueType === "nodal" ? "3.5" : "2.5"}
                  strokeDasharray={tissueType === "overlay" ? "4,3" : "none"}
                  strokeLinecap="round"
                />

                {/* Nodal Phase Markers */}
                {tissueType === "nodal" && (
                  <g fontSize="11" fontWeight="bold" fill="#d97706">
                    {/* Pacemaker Phase 4 Slope */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setSelectedPhaseNumber(4)}
                    >
                      <circle cx="180" cy="208" r="10" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="180" y="212" fill="#ffffff" textAnchor="middle">4</text>
                    </g>

                    {/* Phase 0 Upstroke (Cav1.2) */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setSelectedPhaseNumber(0)}
                    >
                      <circle cx="350" cy="80" r="10" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="350" y="84" fill="#ffffff" textAnchor="middle">0</text>
                    </g>

                    {/* Phase 3 Repolarization */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setSelectedPhaseNumber(3)}
                    >
                      <circle cx="430" cy="180" r="10" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="430" y="184" fill="#ffffff" textAnchor="middle">3</text>
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* Legend / Info box in SVG */}
            <g transform="translate(480, 25)" fontSize="10">
              <rect width="180" height="52" rx="6" fill="#1e293b" opacity="0.8" />
              {(tissueType === "ventricular" || tissueType === "overlay") && (
                <g transform="translate(10, 18)">
                  <line x1="0" y1="0" x2="22" y2="0" stroke="#38bdf8" strokeWidth="3" />
                  <text x="28" y="3" fill="#e2e8f0">Ventricular (Nav1.5)</text>
                </g>
              )}
              {(tissueType === "nodal" || tissueType === "overlay") && (
                <g transform="translate(10, 38)">
                  <line x1="0" y1="0" x2="22" y2="0" stroke="#fbbf24" strokeWidth="3" strokeDasharray={tissueType === "overlay" ? "3,2" : "none"} />
                  <text x="28" y="3" fill="#e2e8f0">SA/AV Nodal (Cav1.2/If)</text>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Phase Selector Pills (Touch-friendly, min 44px) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {phases.map((p) => {
            const isSelected = selectedPhaseNumber === p.phase;
            return (
              <button
                key={p.phase}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedPhaseNumber(p.phase)}
                className={cn(
                  "min-h-[46px] rounded-xl px-3 py-2 text-left border transition-all flex flex-col justify-center",
                  isSelected
                    ? "bg-rose-500/15 border-rose-500 text-fg font-semibold shadow-sm"
                    : "bg-surface-2 border-border text-muted hover:bg-surface hover:text-fg",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Phase {p.phase}</span>
                  <span className="text-[10px] font-mono text-muted">
                    {p.phase === 0 ? "INa/ICa" : p.phase === 1 ? "Ito" : p.phase === 2 ? "ICa,L" : p.phase === 3 ? "IKr" : "IK1/If"}
                  </span>
                </div>
                <span className="text-[11px] truncate text-muted">{p.shortName}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Main Navigation Switchboard Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-surface border border-border p-1.5 shadow-[var(--shadow-border)] text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("phases")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-all",
            activeTab === "phases"
              ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] font-bold"
              : "text-muted hover:bg-surface-2/60 hover:text-fg",
          )}
        >
          <Activity className="size-4 text-rose-500" />
          <span>Phase Explorer</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("classes")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-all",
            activeTab === "classes"
              ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] font-bold"
              : "text-muted hover:bg-surface-2/60 hover:text-fg",
          )}
        >
          <BookOpen className="size-4 text-cyan-500" />
          <span>Vaughan Williams Classes</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("mechanisms")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-all",
            activeTab === "mechanisms"
              ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] font-bold"
              : "text-muted hover:bg-surface-2/60 hover:text-fg",
          )}
        >
          <Flame className="size-4 text-amber-500" />
          <span>EADs, DADs &amp; Kinetics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("channels")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-all",
            activeTab === "channels"
              ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] font-bold"
              : "text-muted hover:bg-surface-2/60 hover:text-fg",
          )}
        >
          <Zap className="size-4 text-purple-500" />
          <span>Ion Channels ({allChannels.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tray")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 transition-all",
            activeTab === "tray"
              ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] font-bold"
              : "text-muted hover:bg-surface-2/60 hover:text-fg",
          )}
        >
          <ShieldAlert className="size-4 text-red-500" />
          <span>
            Active Desk Collisions {collisionsOnDesk.length > 0 && `(${collisionsOnDesk.length})`}
          </span>
        </button>
      </nav>

      {/* 4. Tab Content Panes */}

      {/* Pane A: Phase Explorer */}
      {activeTab === "phases" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Detailed Phase Analysis
                </span>
                <h3 className="text-xl font-bold text-fg">{currentPhase.name}</h3>
                <p className="text-xs text-muted mt-0.5">{currentPhase.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-bg-sunken px-2.5 py-1 text-xs font-mono font-medium text-fg border border-border">
                  Ventricular: {currentPhase.voltageRangeVentricular}
                </span>
              </div>
            </div>

            {/* Ventricular vs Nodal Mechanics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-2 border border-border p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                  <Heart className="size-4" />
                  <span>Ventricular Fast Response</span>
                </div>
                <p className="text-xs text-fg leading-relaxed">
                  {currentPhase.ventricularMechanism}
                </p>
              </div>

              <div className="rounded-xl bg-surface-2 border border-border p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                  <Gauge className="size-4" />
                  <span>SA / AV Nodal Pacemaker Response</span>
                </div>
                <p className="text-xs text-fg leading-relaxed">
                  {currentPhase.nodalMechanism}
                </p>
              </div>
            </div>

            {/* Ion Flux Vectors */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Sliders className="size-3.5" />
                Active Ion Flux Vectors &amp; Conductance
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {currentPhase.ionFlux.map((flux, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-bg-sunken border border-border p-3 flex flex-col justify-between text-xs gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fg">{flux.channelOrTransporter}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          flux.direction === "inward"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                            : flux.direction === "outward"
                            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20",
                        )}
                      >
                        {flux.direction}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-muted">
                      Ion: {flux.ion} | Gene: {flux.gene}
                    </div>
                    <p className="text-[11px] text-muted leading-tight">{flux.biophysicalSummary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Surface ECG Correlation & Active Drugs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <Activity className="size-4 text-emerald-600" />
                  Surface ECG Correlation
                </span>
                <p className="text-xs text-muted leading-relaxed">
                  {currentPhase.ecgCorrelation}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Pathology &amp; Vulnerability
                </span>
                <p className="text-xs text-muted leading-relaxed">
                  {currentPhase.vulnerabilityAndPathology}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pane B: Vaughan Williams Classes */}
      {activeTab === "classes" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {vwClasses.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassId(cls.id)}
                className={cn(
                  "min-h-[44px] whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold border transition-all",
                  selectedClassId === cls.id
                    ? "bg-cyan-500/15 border-cyan-500 text-fg shadow-sm"
                    : "bg-surface border-border text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {cls.code}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {currentClass.code}
                </span>
                <h3 className="text-xl font-bold text-fg">{currentClass.name}</h3>
                <p className="text-xs text-muted mt-0.5">{currentClass.subheading}</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                {currentClass.useDependenceProfile}
              </span>
            </div>

            {/* Target & Kinetics Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-bg-sunken border border-border p-3.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted uppercase">Primary Target</span>
                <span className="text-xs font-bold text-fg">{currentClass.primaryTarget}</span>
              </div>
              <div className="rounded-xl bg-bg-sunken border border-border p-3.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted uppercase">Channel Kinetics</span>
                <span className="text-xs font-bold text-fg">{currentClass.channelKinetics}</span>
                <span className="text-[10px] font-mono text-muted">Tau: {currentClass.dissociationTimeTau}</span>
              </div>
              <div className="rounded-xl bg-bg-sunken border border-border p-3.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted uppercase">Refractoriness Effect</span>
                <span className="text-xs font-bold text-fg">{currentClass.refractoryPeriodEffect}</span>
              </div>
            </div>

            {/* ECG Footprint Card */}
            <div className="rounded-xl bg-surface-2 border border-border p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="size-4 text-rose-500" />
                Characteristic ECG Signature / Footprint
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-bg-sunken p-2.5 border border-border/80">
                  <span className="font-semibold text-muted">PR Interval: </span>
                  <span className="font-bold text-fg">{currentClass.ecgFootprint.prInterval}</span>
                </div>
                <div className="rounded-lg bg-bg-sunken p-2.5 border border-border/80">
                  <span className="font-semibold text-muted">QRS Duration: </span>
                  <span className="font-bold text-fg">{currentClass.ecgFootprint.qrsDuration}</span>
                </div>
                <div className="rounded-lg bg-bg-sunken p-2.5 border border-border/80">
                  <span className="font-semibold text-muted">QT Interval: </span>
                  <span className="font-bold text-fg">{currentClass.ecgFootprint.qtInterval}</span>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed italic">
                Morphology: {currentClass.ecgFootprint.morphologyPattern}
              </p>
            </div>

            {/* Prototype Drugs in Class with 1-Tap Loaders */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="size-4 text-accent" />
                Prototype Pharmacological Agents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentClass.prototypeDrugs.map((proto) => {
                  const isOnTray = selectedOnDesk.includes(proto.drugId);
                  return (
                    <div
                      key={proto.drugId}
                      className="rounded-xl bg-surface-2 border border-border p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-fg">{proto.drugName}</span>
                        <button
                          type="button"
                          onClick={() => handleAddDrug(proto.drugId)}
                          disabled={isOnTray}
                          className={cn(
                            "min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                            isOnTray
                              ? "bg-ok/10 text-ok border border-ok/20 cursor-default"
                              : "bg-surface border border-border text-fg hover:bg-surface-2 hover:border-accent",
                          )}
                        >
                          {isOnTray ? (
                            <>
                              <Check className="size-3.5" /> On Tray
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" /> Add to Tray
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-muted leading-snug">
                        {proto.biophysicalMechanism}
                      </p>

                      <div className="rounded-lg bg-bg-sunken p-2 text-[11px] text-muted border border-border/60">
                        <span className="font-semibold text-danger">Safety Pearl: </span>
                        {proto.keySafetyPrecaution}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Proarrhythmic Risks & Clinical Surveillance */}
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="size-4" />
                Key Proarrhythmic Hazards &amp; Surveillance
              </div>
              <ul className="list-disc list-inside text-xs text-fg space-y-1">
                {currentClass.proarrhythmicRisks.map((risk, idx) => (
                  <li key={idx} className="leading-relaxed">{risk}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pane C: Arrhythmia Mechanisms (EADs, DADs, Use-Dependence) */}
      {activeTab === "mechanisms" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mechanisms.map((mech) => (
              <div
                key={mech.id}
                className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-between gap-4 shadow-[var(--shadow-border)]"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-bg-sunken border border-border text-muted">
                      {mech.category}
                    </span>
                    <span className="text-xs font-semibold text-accent">
                      {mech.phaseLocus}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-fg">{mech.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{mech.cellularPhysiology}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 border border-border text-xs">
                  <div className="flex items-start gap-1.5">
                    <Zap className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-fg">Biophysical Currents: </span>
                      <span className="text-muted">{mech.biophysicalCurrents}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Activity className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-fg">ECG Footprint: </span>
                      <span className="text-muted">{mech.ecgFootprint}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="font-bold text-danger text-[11px] uppercase tracking-wider">
                    Aggravating Factors
                  </span>
                  <ul className="list-disc list-inside text-muted space-y-0.5 text-[11px]">
                    {mech.aggravatingFactors.slice(0, 3).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pane D: Ion Channels Catalog */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allChannels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-between gap-3 shadow-[var(--shadow-border)]"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                    {channel.gene}
                  </span>
                  <span className="text-[11px] font-mono text-muted">
                    Ion: {channel.conductanceIon} ({channel.fluxDirection})
                  </span>
                </div>
                <h3 className="text-base font-bold text-fg">{channel.name}</h3>
                <span className="text-xs text-accent font-semibold">{channel.currentName}</span>
                <p className="text-xs text-muted leading-relaxed mt-1">{channel.biophysicalFunction}</p>
              </div>

              <div className="rounded-xl bg-bg-sunken p-3 border border-border flex flex-col gap-1.5 text-xs">
                <div className="flex items-start gap-1.5">
                  <Info className="size-3.5 text-info shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-fg">Channelopathy: </span>
                    <span className="text-muted">{channel.geneticChannelopathy}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-fg">Arrhythmia Trigger: </span>
                    <span className="text-muted">{channel.arrhythmiaTrigger}</span>
                  </div>
                </div>
              </div>

              {channel.pharmacologicBlockers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted">Blockers:</span>
                  {channel.pharmacologicBlockers.slice(0, 4).map((b) => (
                    <button
                      key={b.drugId}
                      type="button"
                      onClick={() => handleAddDrug(b.drugId)}
                      className="rounded-md bg-surface-2 border border-border px-2 py-0.5 text-[11px] font-medium text-fg hover:border-accent hover:bg-surface"
                    >
                      {b.drugName} +
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pane E: Active Desk Tray Collisions & Presets */}
      {activeTab === "tray" && (
        <div className="flex flex-col gap-6">
          {/* Active Drugs on Tray Summary */}
          <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                  <Heart className="size-5 text-rose-500" />
                  Active Desk Formulary Status
                </h3>
                <p className="text-xs text-muted">
                  Inspecting {selectedOnDesk.length} drug(s) on clinical desk tray for cardiac channel collisions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => useDesk.getState().clear()}
                  className="min-h-[38px] px-3 rounded-lg bg-bg-sunken border border-border text-xs font-semibold text-muted hover:text-fg hover:bg-surface"
                >
                  Clear Tray
                </button>
              </div>
            </div>

            {/* Tray Chips */}
            {selectedOnDesk.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedOnDesk.map((drugId) => {
                  const prof = getCardiacElectrophysiologyProfile(drugId);
                  return (
                    <div
                      key={drugId}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 border border-border px-3 py-1.5 text-xs font-medium text-fg"
                    >
                      <span className="font-bold">{prof?.drugName ?? drugId}</span>
                      {prof && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-sunken text-muted">
                          {prof.vaughanWilliamsClass !== "none" ? prof.vaughanWilliamsClass : "Off-target"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => useDesk.getState().remove(drugId)}
                        className="text-muted hover:text-danger ml-1"
                        title="Remove drug from tray"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-bg-sunken border border-dashed border-border p-4 text-center text-xs text-muted">
                No medications currently loaded on the desk tray. Select a high-risk test scenario below to analyze cardiac electrophysiology collisions.
              </div>
            )}
          </div>

          {/* Collisions Alert Banner */}
          {collisionsOnDesk.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-bold text-danger flex items-center gap-2">
                <AlertTriangle className="size-5 text-danger" />
                Detected Electrophysiological Arrhythmia Collisions ({collisionsOnDesk.length})
              </h3>

              <div className="flex flex-col gap-4">
                {collisionsOnDesk.map((collision) => (
                  <div
                    key={collision.id}
                    className="rounded-2xl bg-surface border-2 border-danger/40 p-5 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-danger">
                            {collision.severity} HAZARD
                          </span>
                          <span className="text-xs font-mono text-muted">{collision.category}</span>
                        </div>
                        <h4 className="text-lg font-bold text-fg mt-1">{collision.title}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                          <Zap className="size-3.5 text-amber-500" />
                          Primary Mechanism
                        </span>
                        <p className="text-xs text-muted leading-relaxed">
                          {collision.primaryMechanism}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-danger flex items-center gap-1.5">
                          <Flame className="size-3.5 text-danger" />
                          Arrhythmia &amp; Electrophysiological Risk
                        </span>
                        <p className="text-xs text-fg leading-relaxed">
                          {collision.electrophysiologicalRisk}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-surface-2 p-3.5 border border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-fg">ECG Hallmarks: </span>
                        <span className="text-muted">{collision.ecgMarkers}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-fg">Clinical Surveillance: </span>
                        <span className="text-muted">{collision.clinicalSurveillance}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedOnDesk.length > 0 ? (
            <div className="rounded-2xl bg-ok/10 border border-ok/20 p-5 text-xs text-ok font-medium flex items-center gap-2.5">
              <Check className="size-5 shrink-0" />
              <span>No direct cardiac channel collisions or multi-hit arrhythmia hazards detected among current desk drugs.</span>
            </div>
          ) : null}

          {/* 1-Tap Preset Scenario Loaders */}
          <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-[var(--shadow-border)] flex flex-col gap-3">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              1-Tap High-Risk Electrophysiology Test Presets
            </h3>
            <p className="text-xs text-muted">
              Pre-load canonical multi-channel collision pairs to analyze cellular mechanics and monitor parameters.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => loadPreset(["sotalol", "citalopram"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Dual IKr / EAD Risk</span>
                  <span className="text-[10px] font-mono text-danger font-bold">Critical</span>
                </div>
                <span className="text-[11px] text-muted">Sotalol + Citalopram (TdP)</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(["flecainide", "propafenone"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Nav1.5 Conduction Block</span>
                  <span className="text-[10px] font-mono text-danger font-bold">Critical</span>
                </div>
                <span className="text-[11px] text-muted">Flecainide + Propafenone (CAST)</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(["metoprolol", "verapamil"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Synergistic AV Nodal Block</span>
                  <span className="text-[10px] font-mono text-danger font-bold">Critical</span>
                </div>
                <span className="text-[11px] text-muted">Metoprolol + Verapamil</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(["digoxin", "amiodarone"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Digoxin DAD Amplification</span>
                  <span className="text-[10px] font-mono text-danger font-bold">Critical</span>
                </div>
                <span className="text-[11px] text-muted">Digoxin + Amiodarone (P-gp + Ca2+)</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(["quinidine", "procainamide"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Class IA Dual Nav1.5 / hERG</span>
                  <span className="text-[10px] font-mono text-amber-600 font-bold">High</span>
                </div>
                <span className="text-[11px] text-muted">Quinidine + Procainamide</span>
              </button>

              <button
                type="button"
                onClick={() => loadPreset(["dofetilide", "atenolol"])}
                className="min-h-[50px] rounded-xl bg-surface-2 border border-border p-3 text-left hover:border-danger hover:bg-surface transition-all flex flex-col justify-center"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Reverse Use-Dependence</span>
                  <span className="text-[10px] font-mono text-amber-600 font-bold">High</span>
                </div>
                <span className="text-[11px] text-muted">Dofetilide + Atenolol (Bradycardia Trap)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Peer-Reviewed Literature Citations Footer */}
      <footer className="rounded-2xl bg-surface border border-border p-5 text-xs text-muted flex flex-col gap-2.5 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2 font-bold text-fg">
          <BookOpen className="size-4 text-accent" />
          <span>Peer-Reviewed Electrophysiology References &amp; Consensus Guideline Citations</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted leading-relaxed">
          {ELECTROPHYSIOLOGY_CITATIONS.map((cite, idx) => (
            <li key={idx}>{cite}</li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
