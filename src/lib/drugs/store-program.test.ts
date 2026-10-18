import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

/*
 * The desk store persists to window.localStorage under firstpass.desk.v7.
 * Node has no window, so give it an in-memory one before the store loads.
 */
const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });

const { useDesk, currentPlan, programFallback } = await import("./store");

const KEY = "firstpass.desk.v7";
const DAY = 86_400_000;
const LIFE = "FP-LIFE-F0571FB9-55F3F1B2";
const ORG_KEY = "FP-ORG-T202703-AB969261-7A955C5D";

/** A desk saved by the release before program keys: no program fields at all. */
const OLD_FOUNDING = {
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

function saved() {
  const raw = mem.get(KEY);
  return raw ? (JSON.parse(raw) as { state: Record<string, unknown>; version: number }) : null;
}

async function load(state: Record<string, unknown>) {
  mem.set(KEY, JSON.stringify({ state, version: 0 }));
  await useDesk.persist.rehydrate();
  return useDesk.getState();
}

function grantEnding(endsAt: number) {
  return { tier: "team" as const, endsAt: new Date(endsAt).toISOString() };
}

beforeEach(() => {
  useDesk.setState(useDesk.getInitialState(), true);
  mem.clear();
});

describe("desk store: saved state from before program keys", () => {
  it("loads an old Founding desk unchanged", async () => {
    const s = await load(OLD_FOUNDING);
    assert.equal(s.plan, "lab");
    assert.equal(s.license, LIFE);
    assert.equal(s.lifetime, true);
    assert.deepEqual(s.selected, OLD_FOUNDING.selected);
    assert.deepEqual(s.phenotypes, OLD_FOUNDING.phenotypes);
    assert.equal(s.smoking, true);
    assert.equal(s.ketamineRoute, "oral");
    assert.equal(s.age, "geriatric");
    assert.deepEqual(s.doses, { ketamine: "50 mg" });
    assert.equal(s.hcpAck, true);
    assert.equal(s.previewUsed, true);
    assert.equal(s.program, null);
    assert.equal(s.programNote, null);
    assert.equal(currentPlan(), "lab");
  });

  it("never expires Founding for life", async () => {
    await load(OLD_FOUNDING);
    assert.equal(useDesk.getState().checkProgram(Date.now() + 50 * 365 * DAY), false);
    assert.equal(useDesk.getState().plan, "lab");
    assert.equal(useDesk.getState().license, LIFE);
    assert.equal(programFallback(useDesk.getState(), Number.MAX_SAFE_INTEGER), null);
  });

  it("loads an old free desk and an empty store", async () => {
    const free = await load({ ...OLD_FOUNDING, plan: "free", license: null, lifetime: false });
    assert.equal(free.plan, "free");
    assert.equal(free.program, null);
    mem.clear();
    await useDesk.persist.rehydrate();
    assert.equal(useDesk.getState().plan, "free");
    assert.equal(useDesk.getState().program, null);
  });

  it("drops a malformed program field without touching a personal key", async () => {
    const s = await load({ ...OLD_FOUNDING, program: { tier: "gold", endsAt: "soon" }, programNote: 7 });
    assert.equal(s.program, null);
    assert.equal(s.programNote, null);
    assert.equal(s.plan, "lab");
    assert.equal(s.license, LIFE);
  });
});

describe("desk store: program licenses", () => {
  it("keeps the program tier and end date in saved state after redeem", () => {
    const grant = grantEnding(Date.now() + 30 * DAY);
    const applied = useDesk.getState().activateLicense({ plan: "lab", license: ORG_KEY, lifetime: false, program: grant });
    assert.equal(applied, true);
    const s = useDesk.getState();
    assert.equal(s.plan, "lab");
    assert.equal(s.lifetime, false);
    assert.deepEqual(s.program, grant);
    assert.equal(s.justActivated, true);
    assert.equal(currentPlan(), "lab");
    assert.deepEqual(saved()?.state.program, grant);
    assert.equal(saved()?.state.license, ORG_KEY);
    assert.equal(saved()?.version, 0);
  });

  it("reloads a live program license as Founding-level", async () => {
    const grant = grantEnding(Date.now() + 30 * DAY);
    const s = await load({ ...OLD_FOUNDING, license: ORG_KEY, lifetime: false, program: grant });
    assert.equal(s.plan, "lab");
    assert.deepEqual(s.program, grant);
    assert.equal(s.programNote, null);
    assert.equal(currentPlan(), "lab");
  });

  it("falls back to the free desk on load once the program has ended", async () => {
    const grant = grantEnding(Date.UTC(2026, 0, 1) - 1);
    const s = await load({
      ...OLD_FOUNDING,
      selected: ["a", "b", "c", "d", "e", "f", "g"],
      doses: { a: "1 mg", f: "2 mg" },
      license: ORG_KEY,
      lifetime: false,
      program: grant,
    });
    assert.equal(s.plan, "free");
    assert.equal(s.license, null);
    assert.equal(s.lifetime, false);
    assert.equal(s.program, null);
    assert.equal(
      s.programNote,
      "Your program key ended on December 31, 2025, so this desk is back to free. Ask your program lead for the renewed key and redeem it on Plans.",
    );
    assert.deepEqual(s.selected, ["a", "b", "c", "d", "e"]);
    assert.deepEqual(s.doses, { a: "1 mg" });
    assert.equal(s.smoking, false);
    assert.equal(s.age, "adult");
    assert.deepEqual(s.phenotypes, { CYP2D6: "NM", CYP2C19: "NM", CYP2C9: "NM", CYP2B6: "NM" });
    // The free ketamine route stays as the learner left it.
    assert.equal(s.ketamineRoute, "oral");
    assert.equal(s.hcpAck, true);
    assert.equal(currentPlan(), "free");
    // The free desk is saved at once, so the next load does not start on the ended key.
    assert.equal(saved()?.state.plan, "free");
    assert.equal(saved()?.state.license, null);
    assert.equal(saved()?.state.program, null);
    assert.equal(saved()?.state.programNote, s.programNote);
    assert.deepEqual(saved()?.state.selected, ["a", "b", "c", "d", "e"]);
  });

  it("does not rewrite saved state on an ordinary load", async () => {
    const before = JSON.stringify({ state: OLD_FOUNDING, version: 0 });
    mem.set(KEY, before);
    await useDesk.persist.rehydrate();
    assert.equal(mem.get(KEY), before);
  });

  it("reads the end from the key when the saved program field is missing", async () => {
    const live = await load({ ...OLD_FOUNDING, license: "FP-ORG-P209912-73AD5D32-AFF466E7", lifetime: false });
    assert.deepEqual(live.program, { tier: "program", endsAt: "2099-12-31T23:59:59.999Z" });
    assert.equal(live.plan, "lab");
    useDesk.setState(useDesk.getInitialState(), true);
    const ended = await load({ ...OLD_FOUNDING, license: "FP-ORG-S202501-73AD5D32-AFF466E7", lifetime: false });
    assert.equal(ended.plan, "free");
    assert.equal(ended.program, null);
    assert.match(ended.programNote ?? "", /ended on January 31, 2025/);
  });

  it("re-checks on focus: works through the end millisecond, falls back one after", () => {
    const end = Date.now() + 5 * DAY;
    useDesk.getState().activateLicense({ plan: "lab", license: ORG_KEY, lifetime: false, program: grantEnding(end) });
    assert.equal(useDesk.getState().checkProgram(end), false);
    assert.equal(useDesk.getState().plan, "lab");
    assert.equal(useDesk.getState().checkProgram(end + 1), true);
    const s = useDesk.getState();
    assert.equal(s.plan, "free");
    assert.equal(s.program, null);
    assert.match(s.programNote ?? "", /back to free/);
    // The fallback is saved, so the next load starts free.
    assert.equal(saved()?.state.plan, "free");
    assert.equal(saved()?.state.program, null);
    assert.equal(useDesk.getState().checkProgram(end + 2), false);
    useDesk.getState().dismissProgramNote();
    assert.equal(useDesk.getState().programNote, null);
    assert.equal(saved()?.state.programNote, null);
  });

  it("gates as free the moment the term ends, even before the re-check runs", () => {
    useDesk.setState({ plan: "lab", license: ORG_KEY, lifetime: false, program: grantEnding(Date.now() - 1) });
    assert.equal(currentPlan(), "free");
    assert.equal(useDesk.getState().plan, "lab");
  });

  it("keeps Founding for life when a program key is redeemed on top", async () => {
    await load(OLD_FOUNDING);
    const applied = useDesk
      .getState()
      .activateLicense({ plan: "lab", license: ORG_KEY, lifetime: false, program: grantEnding(Date.now() + DAY) });
    assert.equal(applied, false);
    const s = useDesk.getState();
    assert.equal(s.license, LIFE);
    assert.equal(s.lifetime, true);
    assert.equal(s.program, null);
  });

  it("a Founding key replaces a program license and clears its end", () => {
    useDesk.getState().activateLicense({ plan: "lab", license: ORG_KEY, lifetime: false, program: grantEnding(Date.now() + DAY) });
    assert.equal(useDesk.getState().activateLicense({ plan: "lab", license: LIFE, lifetime: true }), true);
    const s = useDesk.getState();
    assert.equal(s.lifetime, true);
    assert.equal(s.license, LIFE);
    assert.equal(s.program, null);
    assert.equal(useDesk.getState().checkProgram(Date.now() + 10 * DAY), false);
  });

  it("returning to the free desk clears the program", () => {
    useDesk.getState().activateLicense({ plan: "lab", license: ORG_KEY, lifetime: false, program: grantEnding(Date.now() + DAY) });
    useDesk.getState().downgrade();
    assert.equal(useDesk.getState().program, null);
    assert.equal(useDesk.getState().plan, "free");
  });
});
