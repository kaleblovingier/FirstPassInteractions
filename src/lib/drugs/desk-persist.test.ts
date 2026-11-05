import assert from "node:assert/strict";
import { describe, it } from "node:test";
import vm from "node:vm";
import { DEFAULT_PHENOTYPES } from "./types";
import {
  DESK_PREHYDRATE_SCRIPT,
  DESK_STORAGE_KEY,
  canonicalLicense,
  defaultPersistedDesk,
  deskEnvelope,
  readDeskStorageState,
} from "./desk-persist";

const LIFE = "FP-LIFE-F0571FB9-55F3F1B2";
const PRO = "FP-PRO-73CEF708-49A01A63";
const ORG = "FP-ORG-T202703-AB969261-7A955C5D";

const FOUNDING = {
  selected: ["ketamine", "alprazolam", "grapefruit"],
  phenotypes: { CYP2D6: "PM", CYP2C19: "NM", CYP2C9: "NM", CYP2B6: "IM" },
  smoking: true,
  ketamineRoute: "oral",
  cannabisRoute: "smoked",
  alcohol: "off",
  age: "geriatric",
  kidney: "ok",
  preg: "off",
  doses: { ketamine: "50 mg" },
  studyMarks: {},
  plan: "lab",
  license: LIFE,
  lifetime: true,
  previewUntil: null,
  previewUsed: true,
  hcpAck: true,
};

function paint(stored: string | null) {
  const attrs = new Map<string, string>();
  vm.runInNewContext(DESK_PREHYDRATE_SCRIPT, {
    localStorage: { getItem: () => stored },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => attrs.set(name, value),
      },
    },
  });
  return attrs;
}

describe("readDeskStorageState", () => {
  it("keeps a founding desk saved before program keys", () => {
    const read = readDeskStorageState(FOUNDING);
    assert.equal(read.rewrite, false);
    assert.equal(read.state.plan, "lab");
    assert.equal(read.state.license, LIFE);
    assert.equal(read.state.lifetime, true);
    assert.equal(read.state.program, null);
    assert.deepEqual(read.state.selected, FOUNDING.selected);
    assert.deepEqual(read.state.phenotypes, FOUNDING.phenotypes);
    assert.equal(read.state.smoking, true);
    assert.equal(read.state.ketamineRoute, "oral");
    assert.equal(read.state.age, "geriatric");
    assert.deepEqual(read.state.doses, { ketamine: "50 mg" });
    assert.equal(read.state.hcpAck, true);
    assert.equal(read.state.previewUsed, true);
  });

  it("treats a missing blob as an empty partial, not a wipe of the tray", () => {
    const current = defaultPersistedDesk();
    current.selected = ["ketamine"];
    current.plan = "free";
    const read = readDeskStorageState(undefined, current);
    assert.equal(read.rewrite, false);
    assert.deepEqual(read.state.selected, ["ketamine"]);
    assert.equal(read.state.plan, "free");
    assert.deepEqual(read.state.phenotypes, DEFAULT_PHENOTYPES);
    assert.deepEqual(read.state.doses, {});
  });

  it("resets a non-object blob to the free desk and asks for a rewrite", () => {
    for (const bad of ["ketamine", 4, true, ["ketamine"]]) {
      const read = readDeskStorageState(bad);
      assert.equal(read.rewrite, true, JSON.stringify(bad));
      assert.deepEqual(read.state.selected, []);
      assert.equal(read.state.plan, "free");
      assert.equal(read.state.license, null);
      assert.equal(typeof read.state.doses, "object");
      assert.ok(!Array.isArray(read.state.doses));
    }
  });

  it("replaces a non-array selected and keeps a real key", () => {
    const read = readDeskStorageState({ ...FOUNDING, selected: "ketamine" });
    assert.equal(read.rewrite, true);
    assert.deepEqual(read.state.selected, []);
    assert.equal(read.state.plan, "lab");
    assert.equal(read.state.license, LIFE);
  });

  it("drops non-strings and duplicates from selected", () => {
    const read = readDeskStorageState({
      ...FOUNDING,
      selected: ["ketamine", 3, null, "ketamine", "grapefruit", ""],
    });
    assert.equal(read.rewrite, true);
    assert.deepEqual(read.state.selected, ["ketamine", "grapefruit"]);
  });

  it("defaults bad host objects", () => {
    const read = readDeskStorageState({
      ...FOUNDING,
      phenotypes: 4,
      doses: ["50 mg"],
      studyMarks: "got",
      smoking: "yes",
      ketamineRoute: "smoked",
      age: "child",
      kidney: "bad",
      preg: "maybe",
      alcohol: "lots",
      cannabisRoute: "vape",
    });
    assert.equal(read.rewrite, true);
    assert.deepEqual(read.state.phenotypes, DEFAULT_PHENOTYPES);
    assert.deepEqual(read.state.doses, {});
    assert.deepEqual(read.state.studyMarks, {});
    assert.equal(read.state.smoking, false);
    assert.equal(read.state.ketamineRoute, "iv");
    assert.equal(read.state.age, "adult");
    assert.equal(read.state.kidney, "ok");
    assert.equal(read.state.preg, "off");
    assert.equal(read.state.alcohol, "off");
    assert.equal(read.state.cannabisRoute, "smoked");
  });

  it("keeps a partial phenotype and fills the rest from the defaults", () => {
    const read = readDeskStorageState({
      ...FOUNDING,
      phenotypes: { CYP2D6: "UM", extra: "nope" },
    });
    assert.equal(read.rewrite, true);
    assert.equal(read.state.phenotypes.CYP2D6, "UM");
    assert.equal(read.state.phenotypes.CYP2C19, "NM");
    assert.equal(read.state.phenotypes.CYP2B6, "NM");
  });

  it("does not keep a paid plan without a license-shaped key or program grant", () => {
    const read = readDeskStorageState({ ...FOUNDING, plan: "lab", license: "please", lifetime: true });
    assert.equal(read.rewrite, true);
    assert.equal(read.state.plan, "free");
    assert.equal(read.state.license, null);
    assert.equal(read.state.lifetime, false);
    assert.equal(read.state.program, null);
  });

  it("rejects an unknown plan id when nothing else unlocks the desk", () => {
    const read = readDeskStorageState({ ...FOUNDING, plan: "owner", license: null, lifetime: true });
    assert.equal(read.rewrite, true);
    assert.equal(read.state.plan, "free");
    assert.equal(read.state.lifetime, false);
  });

  it("derives plan and lifetime from the personal key, not the stored plan", () => {
    const pro = readDeskStorageState({ ...FOUNDING, plan: "lab", license: PRO, lifetime: true });
    assert.equal(pro.rewrite, true);
    assert.equal(pro.state.plan, "pro");
    assert.equal(pro.state.lifetime, false);
    assert.equal(pro.state.license, PRO);

    const life = readDeskStorageState({ ...FOUNDING, plan: "pro", license: `  ${LIFE.toLowerCase()}  `, lifetime: false });
    assert.equal(life.rewrite, true);
    assert.equal(life.state.plan, "lab");
    assert.equal(life.state.lifetime, true);
    assert.equal(life.state.license, LIFE);
  });

  it("keeps a free desk with an empty license", () => {
    const read = readDeskStorageState({ ...FOUNDING, plan: "free", license: null, lifetime: false });
    assert.equal(read.rewrite, false);
    assert.equal(read.state.plan, "free");
    assert.equal(read.state.license, null);
    assert.equal(read.state.program, null);
  });

  it("drops a malformed program field and leaves a personal key", () => {
    const read = readDeskStorageState({
      ...FOUNDING,
      program: { tier: "gold", endsAt: "soon" },
      programNote: 7,
    });
    assert.equal(read.rewrite, true);
    assert.equal(read.state.program, null);
    assert.equal(read.state.programNote, null);
    assert.equal(read.state.plan, "lab");
    assert.equal(read.state.license, LIFE);
  });

  it("keeps a stored program grant on a program key", () => {
    const grant = { tier: "team" as const, endsAt: new Date(Date.now() + 86_400_000).toISOString() };
    const read = readDeskStorageState({
      ...FOUNDING,
      license: ORG,
      lifetime: false,
      program: grant,
    });
    assert.equal(read.rewrite, false);
    assert.equal(read.state.plan, "lab");
    assert.equal(read.state.lifetime, false);
    assert.deepEqual(read.state.program, grant);
  });

  it("reads the program end from the key when the grant was not saved", () => {
    const read = readDeskStorageState({
      ...FOUNDING,
      license: "FP-ORG-P209912-73AD5D32-AFF466E7",
      lifetime: false,
    });
    assert.equal(read.rewrite, false);
    assert.deepEqual(read.state.program, { tier: "program", endsAt: "2099-12-31T23:59:59.999Z" });
    assert.equal(read.state.plan, "lab");
  });

  it("accepts the older got/miss study marks without a rewrite", () => {
    const read = readDeskStorageState({ ...FOUNDING, studyMarks: { ketamine: "got", alprazolam: "miss" } });
    assert.equal(read.rewrite, false);
    assert.equal(read.state.studyMarks.ketamine?.mark, "got");
    assert.equal(read.state.studyMarks.alprazolam?.mark, "miss");
  });

  it("ignores keys that are not part of the desk slice", () => {
    const read = readDeskStorageState({ ...FOUNDING, add: null, checkout: "bad", view: "plans" });
    assert.equal(read.rewrite, true);
    assert.equal(read.state.plan, "lab");
    assert.equal("add" in read.state, false);
  });
});

describe("canonicalLicense", () => {
  it("accepts personal and program shapes and rejects anything else", () => {
    assert.equal(canonicalLicense(LIFE), LIFE);
    assert.equal(canonicalLicense(PRO), PRO);
    assert.equal(canonicalLicense(ORG), ORG);
    assert.equal(canonicalLicense("fp-lab-c941fcdf-5aaea346"), "FP-LAB-C941FCDF-5AAEA346");
    assert.equal(canonicalLicense("please"), null);
    assert.equal(canonicalLicense("FP-ORG-T202713-AB969261-7A955C5D"), null);
    assert.equal(canonicalLicense(12), null);
  });
});

describe("desk JSON envelope", () => {
  it("keeps a real envelope and drops JSON that is not one", () => {
    assert.equal(deskEnvelope(null).drop, false);
    assert.equal(deskEnvelope("{").drop, true);
    assert.equal(deskEnvelope("{").value, null);
    assert.equal(deskEnvelope(JSON.stringify(["nope"])).drop, true);
    assert.equal(deskEnvelope(JSON.stringify({ version: 0 })).drop, true);

    const good = JSON.stringify({ state: FOUNDING, version: 0 });
    const kept = deskEnvelope(good);
    assert.equal(kept.drop, false);
    assert.equal(kept.value, good);
    assert.equal(DESK_STORAGE_KEY, "firstpass.desk.v7");
  });
});

describe("desk prehydrate script", () => {
  it("paints paid only for a key shape, and the disclaimer only after a real ack", () => {
    const paid = paint(JSON.stringify({ state: { plan: "lab", license: LIFE, hcpAck: true } }));
    assert.equal(paid.has("data-fp-paid"), true);
    assert.equal(paid.has("data-fp-ack"), true);

    const forged = paint(JSON.stringify({ state: { plan: "lab", license: "please", hcpAck: "yes" } }));
    assert.equal(forged.has("data-fp-paid"), false);
    assert.equal(forged.has("data-fp-ack"), false);

    const org = paint(JSON.stringify({ state: { plan: "free", license: ORG, hcpAck: false } }));
    assert.equal(org.has("data-fp-paid"), true);
    assert.equal(org.has("data-fp-ack"), false);

    assert.doesNotThrow(() => paint("{"));
    assert.equal(paint("{").size, 0);
    assert.equal(paint(JSON.stringify({ state: "nope" })).size, 0);
  });
});
