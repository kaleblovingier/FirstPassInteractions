import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER,
  ELECTROPHYSIOLOGY_CITATIONS,
  ACTION_POTENTIAL_PHASES,
  TISSUE_MODELS,
  ION_CHANNEL_FAMILIES,
  VAUGHAN_WILLIAMS_CLASSES,
  ARRHYTHMIA_MECHANISMS,
  CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE,
  getActionPotentialPhases,
  getIonChannelById,
  getAllIonChannels,
  getVaughanWilliamsClasses,
  getTissueModel,
  getArrhythmiaMechanisms,
  getCardiacElectrophysiologyProfile,
  detectArrhythmiaCollisions,
} from "./cardiac-electrophysiology";

describe("Cardiac Electrophysiology & Ion Channel Database", () => {
  it("exports FDA 520(o)(1)(E) non-prescriptive regulatory disclaimer", () => {
    assert.ok(ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER);
    assert.match(ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/i);
    assert.match(ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER, /non-prescriptive/i);
    assert.match(ELECTROPHYSIOLOGY_REGULATORY_DISCLAIMER, /educational decision-support/i);
    assert.ok(ELECTROPHYSIOLOGY_CITATIONS.length >= 6);
  });

  it("maintains non-prescriptive posture across all clinical mechanics", () => {
    // Verify no prescriptive directives like "administer X mg" or "prescribe" in data definitions
    const jsonStr = JSON.stringify({
      phases: ACTION_POTENTIAL_PHASES,
      classes: VAUGHAN_WILLIAMS_CLASSES,
      mechanisms: ARRHYTHMIA_MECHANISMS,
      database: CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE,
    });

    assert.doesNotMatch(jsonStr, /administer\s+\d+\s*mg/i);
    assert.doesNotMatch(jsonStr, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(jsonStr, /give\s+\d+\s*mg/i);
  });

  it("defines all 5 cardiac action potential phases (Phases 0 through 4)", () => {
    const phases = getActionPotentialPhases();
    assert.equal(phases.length, 5);

    for (let i = 0; i < 5; i++) {
      const p = phases.find((phase) => phase.phase === i);
      assert.ok(p, `Missing Phase ${i}`);
      assert.ok(p.name.length > 0);
      assert.ok(p.shortName.length > 0);
      assert.ok(p.subtitle.length > 0);
      assert.ok(p.ventricularMechanism.length > 0);
      assert.ok(p.nodalMechanism.length > 0);
      assert.ok(p.primaryCurrents.length > 0);
      assert.ok(p.ionFlux.length > 0);
      assert.ok(p.ecgCorrelation.length > 0);
      assert.ok(p.vulnerabilityAndPathology.length > 0);
    }

    // Phase 0: Rapid Upstroke (Nav1.5 ventricular vs Cav1.2 nodal)
    const p0 = phases.find((p) => p.phase === 0)!;
    assert.match(p0.primaryCurrents.join(" "), /Nav1\.5|SCN5A/i);
    assert.match(p0.primaryCurrents.join(" "), /Cav1\.2|CACNA1C/i);
    assert.match(p0.ventricularMechanism, /Nav1\.5/i);
    assert.match(p0.nodalMechanism, /Cav1\.2/i);

    // Phase 1: Transient Early Repolarization (Ito)
    const p1 = phases.find((p) => p.phase === 1)!;
    assert.match(p1.primaryCurrents.join(" "), /Ito|Kv4\.3|KCND3/i);

    // Phase 2: Plateau (ICa,L vs IKr/IKs)
    const p2 = phases.find((p) => p.phase === 2)!;
    assert.match(p2.primaryCurrents.join(" "), /Cav1\.2|ICa,L/i);
    assert.match(p2.primaryCurrents.join(" "), /IKr|IKs/i);

    // Phase 3: Rapid Repolarization (IKr hERG & IKs)
    const p3 = phases.find((p) => p.phase === 3)!;
    assert.match(p3.primaryCurrents.join(" "), /hERG|Kv11\.1|IKr/i);
    assert.match(p3.primaryCurrents.join(" "), /Kv7\.1|IKs/i);

    // Phase 4: Resting / Pacemaker Potential (IK1, If, Na+/K+ ATPase, NCX1)
    const p4 = phases.find((p) => p.phase === 4)!;
    assert.match(p4.primaryCurrents.join(" "), /IK1|Kir2\.1/i);
    assert.match(p4.primaryCurrents.join(" "), /If|HCN4/i);
    assert.match(p4.primaryCurrents.join(" "), /Na\+\/K\+\s*ATPase/i);
  });

  it("accurately models Ventricular vs Nodal tissue biophysics", () => {
    const vent = getTissueModel("ventricular");
    const nodal = getTissueModel("nodal");

    // Ventricular fast response
    assert.equal(vent.restingPotentialMv, -90);
    assert.equal(vent.peakPotentialMv, 30);
    assert.equal(vent.thresholdPotentialMv, -65);
    assert.match(vent.phase0Driver, /Nav1\.5/i);
    assert.match(vent.phase4Characteristics, /IK1/i);
    assert.ok(vent.svgCurvePoints.length >= 8);

    // Nodal slow response
    assert.equal(nodal.restingPotentialMv, -60);
    assert.equal(nodal.peakPotentialMv, 10);
    assert.equal(nodal.thresholdPotentialMv, -40);
    assert.match(nodal.phase0Driver, /Cav1\.2/i);
    assert.match(nodal.autonomicControl.sympatheticEffect, /Beta-1|Gs|cAMP|HCN4/i);
    assert.match(nodal.autonomicControl.parasympatheticEffect, /M2|Gi|IK,ACh|GIRK/i);
    assert.ok(nodal.svgCurvePoints.length >= 8);
  });

  it("defines all major cardiac ion channel families", () => {
    const channels = getAllIonChannels();
    assert.ok(channels.length >= 8);

    const requiredIds = [
      "nav15",
      "cav12",
      "herg",
      "kv71",
      "kir21",
      "hcn4",
      "ncx1",
      "nakatpase",
    ];

    for (const reqId of requiredIds) {
      const ch = getIonChannelById(reqId);
      assert.ok(ch, `Missing ion channel family: ${reqId}`);
      assert.ok(ch.name.length > 0);
      assert.ok(ch.gene.length > 0);
      assert.ok(ch.currentName.length > 0);
      assert.ok(ch.phasesActive.length > 0);
      assert.ok(ch.biophysicalFunction.length > 0);
      assert.ok(ch.pharmacologicBlockers.length > 0);
      assert.ok(ch.geneticChannelopathy.length > 0);
      assert.ok(ch.arrhythmiaTrigger.length > 0);
    }

    // Inspect Nav1.5
    const nav = getIonChannelById("nav15")!;
    assert.equal(nav.gene, "SCN5A");
    assert.equal(nav.conductanceIon, "Na+");
    assert.match(nav.geneticChannelopathy, /Brugada|LQT3/i);

    // Inspect Cav1.2
    const cav = getIonChannelById("cav12")!;
    assert.equal(cav.gene, "CACNA1C");
    assert.equal(cav.conductanceIon, "Ca2+");

    // Inspect hERG
    const herg = getIonChannelById("herg")!;
    assert.equal(herg.gene, "KCNH2");
    assert.equal(herg.conductanceIon, "K+");
    assert.match(herg.geneticChannelopathy, /LQT2/i);

    // Inspect HCN4
    const hcn = getIonChannelById("hcn4")!;
    assert.equal(hcn.gene, "HCN4");
    assert.match(hcn.currentName, /If|Funny/i);

    // Inspect NCX1
    const ncx = getIonChannelById("ncx1")!;
    assert.equal(ncx.gene, "SLC8A1");
    assert.equal(ncx.conductanceIon, "Na+/Ca2+");
    assert.match(ncx.arrhythmiaTrigger, /DAD|Delayed Afterdepolarization|Iti/i);

    // Inspect Na+/K+ ATPase
    const atpase = getIonChannelById("nakatpase")!;
    assert.match(atpase.gene, /ATP1A1/i);
    assert.equal(atpase.conductanceIon, "Na+/K+");
  });

  it("defines comprehensive Vaughan Williams classification with all subclasses", () => {
    const classes = getVaughanWilliamsClasses();
    assert.ok(classes.length >= 7);

    const classCodes = ["IA", "IB", "IC", "II", "III", "IV"];
    for (const code of classCodes) {
      const cls = classes.find((c) => c.code.includes(code));
      assert.ok(cls, `Missing Vaughan Williams class: ${code}`);
      assert.ok(cls.primaryTarget.length > 0);
      assert.ok(cls.channelKinetics.length > 0);
      assert.ok(cls.ecgFootprint.prInterval.length > 0);
      assert.ok(cls.ecgFootprint.qrsDuration.length > 0);
      assert.ok(cls.ecgFootprint.qtInterval.length > 0);
      assert.ok(cls.prototypeDrugs.length > 0);
      assert.ok(cls.proarrhythmicRisks.length > 0);
      assert.ok(cls.clinicalMonitoredParameters.length > 0);
    }

    // Class IA: moderate Nav1.5 block + prolongs repolarization/hERG
    const c1a = classes.find((c) => c.id === "IA")!;
    assert.match(c1a.subheading, /Moderate Nav1\.5 Block \+ Concomitant IKr/i);
    assert.match(c1a.channelKinetics, /Intermediate/i);
    assert.match(c1a.ecgFootprint.qrsDuration, /Widened/i);
    assert.match(c1a.ecgFootprint.qtInterval, /Prolonged/i);
    assert.ok(c1a.prototypeDrugs.some((d) => d.drugId === "quinidine"));
    assert.ok(c1a.prototypeDrugs.some((d) => d.drugId === "procainamide"));

    // Class IB: mild Nav1.5 block + shortens repolarization (rapid dissociation, ischemic)
    const c1b = classes.find((c) => c.id === "IB")!;
    assert.match(c1b.subheading, /Rapid Dissociation Kinetics/i);
    assert.match(c1b.dissociationTimeTau, /< 0\.5 seconds/i);
    assert.match(c1b.ecgFootprint.qtInterval, /Shortened/i);
    assert.ok(c1b.prototypeDrugs.some((d) => d.drugId === "lidocaine"));
    assert.ok(c1b.prototypeDrugs.some((d) => d.drugId === "mexiletine"));

    // Class IC: marked Nav1.5 block + unchanged repolarization + marked use-dependence
    const c1c = classes.find((c) => c.id === "IC")!;
    assert.match(c1c.subheading, /Slow Dissociation Kinetics.*Marked Use-Dependence/i);
    assert.match(c1c.dissociationTimeTau, /> 10 to 20 seconds/i);
    assert.match(c1c.ecgFootprint.qrsDuration, /Markedly Widened/i);
    assert.match(c1c.ecgFootprint.qtInterval, /Unchanged/i);
    assert.ok(c1c.proarrhythmicRisks.some((r) => /CAST/i.test(r)));
    assert.ok(c1c.prototypeDrugs.some((d) => d.drugId === "flecainide"));
    assert.ok(c1c.prototypeDrugs.some((d) => d.drugId === "propafenone"));

    // Class II: Beta-blockers
    const c2 = classes.find((c) => c.id === "II")!;
    assert.match(c2.primaryTarget, /Beta-1 Adrenergic/i);
    assert.match(c2.ecgFootprint.prInterval, /Prolonged/i);
    assert.ok(c2.prototypeDrugs.some((d) => d.drugId === "metoprolol"));
    assert.ok(c2.prototypeDrugs.some((d) => d.drugId === "propranolol"));

    // Class III: Potassium channel blockers (IKr) + reverse use-dependence
    const c3 = classes.find((c) => c.id === "III")!;
    assert.match(c3.primaryTarget, /hERG|IKr/i);
    assert.match(c3.useDependenceProfile, /Reverse Use-Dependence/i);
    assert.match(c3.ecgFootprint.qtInterval, /Markedly Prolonged/i);
    assert.ok(c3.prototypeDrugs.some((d) => d.drugId === "amiodarone"));
    assert.ok(c3.prototypeDrugs.some((d) => d.drugId === "sotalol"));
    assert.ok(c3.prototypeDrugs.some((d) => d.drugId === "dofetilide"));

    // Class IV: Non-DHP CCBs
    const c4 = classes.find((c) => c.id === "IV")!;
    assert.match(c4.primaryTarget, /Cav1\.2|ICa,L/i);
    assert.match(c4.ecgFootprint.prInterval, /Prolonged/i);
    assert.ok(c4.prototypeDrugs.some((d) => d.drugId === "verapamil"));
    assert.ok(c4.prototypeDrugs.some((d) => d.drugId === "diltiazem"));

    // Unclassified: Digoxin, Adenosine, Ivabradine
    const cDig = classes.find((c) => c.id === "unclassified-digoxin")!;
    assert.match(cDig.primaryTarget, /Na\+\/K\+\s*ATPase/i);
    assert.match(cDig.ecgFootprint.morphologyPattern, /Scooped ST-segment/i);

    const cAde = classes.find((c) => c.id === "unclassified-adenosine")!;
    assert.match(cAde.primaryTarget, /Adenosine A1|IK,ACh/i);

    const cIva = classes.find((c) => c.id === "unclassified-ivabradine")!;
    assert.match(cIva.primaryTarget, /HCN4|If/i);
  });

  it("defines biophysical mechanisms for EADs, DADs, and Gating Kinetics", () => {
    const mechs = getArrhythmiaMechanisms();
    assert.equal(mechs.length, 4);

    const ead = mechs.find((m) => m.id === "ead")!;
    assert.match(ead.phaseLocus, /Phase 2.*Phase 3/i);
    assert.match(ead.biophysicalCurrents, /Cav1\.2.*window current/i);
    assert.match(ead.ecgFootprint, /Torsades de Pointes|QTc/i);

    const dad = mechs.find((m) => m.id === "dad")!;
    assert.match(dad.phaseLocus, /Phase 4/i);
    assert.match(dad.triggerEvent, /calcium overload.*RyR2/i);
    assert.match(dad.biophysicalCurrents, /NCX1.*Iti/i);
    assert.match(dad.ecgFootprint, /bidirectional ventricular tachycardia|PVCs/i);

    const useDep = mechs.find((m) => m.id === "use-dependence")!;
    assert.match(useDep.triggerEvent, /open or inactivated/i);
    assert.match(useDep.ecgFootprint, /QRS.*widening.*heart rate/i);

    const revUseDep = mechs.find((m) => m.id === "reverse-use-dependence")!;
    assert.match(revUseDep.triggerEvent, /slower heart rates/i);
    assert.match(revUseDep.cellularPhysiology, /IKr/i);
  });

  it("validates that EVERY referenced drugId exists in catalog DRUG_BY_ID", () => {
    let checkedCount = 0;

    // 1. Check CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE
    for (const [key, profile] of Object.entries(CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE)) {
      assert.equal(key, profile.drugId);
      assert.ok(
        DRUG_BY_ID[profile.drugId],
        `Drug '${profile.drugId}' in CARDIAC_ELECTROPHYSIOLOGY_DRUG_DATABASE missing from DRUG_BY_ID!`,
      );
      checkedCount++;
    }

    // 2. Check prototype drugs in classes
    for (const cls of VAUGHAN_WILLIAMS_CLASSES) {
      for (const proto of cls.prototypeDrugs) {
        assert.ok(
          DRUG_BY_ID[proto.drugId],
          `Prototype drug '${proto.drugId}' in class '${cls.id}' missing from DRUG_BY_ID!`,
        );
        checkedCount++;
      }
    }

    // 3. Check pharmacologic blockers in ion channels
    for (const ch of ION_CHANNEL_FAMILIES) {
      for (const blocker of ch.pharmacologicBlockers) {
        assert.ok(
          DRUG_BY_ID[blocker.drugId],
          `Blocker '${blocker.drugId}' in channel '${ch.id}' missing from DRUG_BY_ID!`,
        );
        checkedCount++;
      }
    }

    assert.ok(checkedCount >= 40, `Expected at least 40 verified drug references, checked ${checkedCount}`);
  });

  it("detects multi-hit IKr / hERG repolarization reserve collapse collisions", () => {
    // Sotalol + Citalopram
    const collisions1 = detectArrhythmiaCollisions(["sotalol", "citalopram"]);
    const ikrColl1 = collisions1.find((c) => c.category === "qt-ead-collision");
    assert.ok(ikrColl1);
    assert.equal(ikrColl1.severity, "critical");
    assert.ok(ikrColl1.drugIds.includes("sotalol"));
    assert.ok(ikrColl1.drugIds.includes("citalopram"));
    assert.match(ikrColl1.electrophysiologicalRisk, /Early Afterdepolarizations|Torsades de Pointes/i);

    // Amiodarone + Ondansetron
    const collisions2 = detectArrhythmiaCollisions(["amiodarone", "ondansetron"]);
    const ikrColl2 = collisions2.find((c) => c.category === "qt-ead-collision");
    assert.ok(ikrColl2);
    assert.ok(ikrColl2.drugIds.includes("amiodarone"));
    assert.ok(ikrColl2.drugIds.includes("ondansetron"));
  });

  it("detects dual Nav1.5 sodium channel blockade collisions with CAST implications", () => {
    // Flecainide + Propafenone
    const collisions = detectArrhythmiaCollisions(["flecainide", "propafenone"]);
    const navColl = collisions.find((c) => c.category === "qrs-conduction-collision");
    assert.ok(navColl);
    assert.equal(navColl.severity, "critical");
    assert.ok(navColl.drugIds.includes("flecainide"));
    assert.ok(navColl.drugIds.includes("propafenone"));
    assert.match(navColl.electrophysiologicalRisk, /dV\/dt max|conduction velocity/i);
    assert.match(navColl.ecgMarkers, /QRS/i);
  });

  it("detects synergistic AV nodal conduction block collisions", () => {
    // Metoprolol (Class II) + Verapamil (Class IV)
    const collisions = detectArrhythmiaCollisions(["metoprolol", "verapamil"]);
    const avColl = collisions.find((c) => c.category === "av-block-collision");
    assert.ok(avColl);
    assert.equal(avColl.severity, "critical");
    assert.ok(avColl.drugIds.includes("metoprolol"));
    assert.ok(avColl.drugIds.includes("verapamil"));
    assert.match(avColl.electrophysiologicalRisk, /third-degree AV block|bradycardia/i);
    assert.match(avColl.ecgMarkers, /PR interval/i);
  });

  it("detects Digoxin DAD amplification and AV nodal collisions", () => {
    // Digoxin + Amiodarone
    const collisions1 = detectArrhythmiaCollisions(["digoxin", "amiodarone"]);
    const dadColl = collisions1.find((c) => c.category === "dad-calcium-collision");
    assert.ok(dadColl);
    assert.equal(dadColl.severity, "critical");
    assert.ok(dadColl.drugIds.includes("digoxin"));
    assert.ok(dadColl.drugIds.includes("amiodarone"));
    assert.match(dadColl.electrophysiologicalRisk, /Delayed Afterdepolarizations|DADs/i);

    // Digoxin + Metoprolol
    const collisions2 = detectArrhythmiaCollisions(["digoxin", "metoprolol"]);
    const nodalColl = collisions2.find((c) => c.category === "av-block-collision");
    assert.ok(nodalColl);
    assert.ok(nodalColl.drugIds.includes("digoxin"));
    assert.ok(nodalColl.drugIds.includes("metoprolol"));
  });

  it("detects Reverse Use-Dependence bradycardia trapping collisions", () => {
    // Sotalol (Class III reverse use) + Atenolol (Beta blocker)
    const collisions = detectArrhythmiaCollisions(["sotalol", "atenolol"]);
    const trapColl = collisions.find((c) => c.category === "reverse-use-dependence-collision");
    assert.ok(trapColl);
    assert.ok(trapColl.drugIds.includes("sotalol"));
    assert.ok(trapColl.drugIds.includes("atenolol"));
    assert.match(trapColl.electrophysiologicalRisk, /reverse use-dependence/i);
  });

  it("returns empty collisions for empty or single safe drug tray", () => {
    assert.deepEqual(detectArrhythmiaCollisions([]), []);
    assert.deepEqual(detectArrhythmiaCollisions(["lidocaine"]), []);
    assert.deepEqual(detectArrhythmiaCollisions(["ivabradine"]), []);
  });

  it("returns individual drug electrophysiology profile correctly", () => {
    const ami = getCardiacElectrophysiologyProfile("amiodarone");
    assert.ok(ami);
    assert.equal(ami.drugName, "Amiodarone");
    assert.equal(ami.vaughanWilliamsClass, "III");
    assert.equal(ami.ikRBlocker, true);
    assert.equal(ami.nav15Blocker, true);
    assert.equal(ami.cav12Blocker, true);
    assert.equal(ami.ecgImpact.qtChange, "prolonged");

    const nonExistent = getCardiacElectrophysiologyProfile("unknown_compound_xyz");
    assert.equal(nonExistent, null);
  });
});
