import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PIPE_LIMIT,
  directorySliceLabel,
  filterIssued,
  issuedPlanLabel,
  nextPipeStorage,
  pipeExportName,
  pipeStatusCounts,
  pipeToCsv,
  pipeToJson,
  stepStatus,
  storedPipeHasRows,
  storedPipeIsReadable,
  type PipeExportRow,
} from "./operator-desk";

const row: PipeExportRow = {
  id: "salish-ketamine",
  name: "Salish Ketamine",
  prey: "clinic",
  range: "whatcom",
  city: "Bellingham",
  who: "Nate Stephens, DO",
  site: "https://www.salishketamine.com/",
  hook: "Oral vs IV, first line.",
  status: "queued",
  note: 'Wrote Nate, "Tuesday"',
  added: "2026-10-29T00:00:00.000Z",
};

test("empty writes do not replace a readable book unless allowed", () => {
  const stored = JSON.stringify([{ id: "a", name: "A" }]);
  assert.equal(storedPipeHasRows(stored), true);
  assert.equal(nextPipeStorage(stored, []), null);
  assert.equal(nextPipeStorage(stored, [], { allowEmpty: true }), "[]");
  assert.equal(nextPipeStorage(null, []), "[]");
  assert.equal(nextPipeStorage("[]", []), "[]");
  assert.equal(nextPipeStorage("", []), "[]");
});

test("unreadable storage is left untouched unless replace is explicit", () => {
  const broken = "{not-json";
  assert.equal(storedPipeIsReadable(broken), false);
  assert.equal(storedPipeHasRows(broken), true);
  assert.equal(nextPipeStorage(broken, []), null);
  assert.equal(nextPipeStorage(broken, [], { allowEmpty: true }), null);
  assert.equal(nextPipeStorage(broken, [{ id: "new" }]), null);
  assert.equal(nextPipeStorage(broken, [], { allowEmpty: true, replaceUnreadable: true }), "[]");
  assert.equal(storedPipeIsReadable("[]"), true);
  assert.equal(storedPipeIsReadable(null), true);
  assert.equal(storedPipeIsReadable('{"id":1}'), false);
});

test("pipe storage keeps the newest rows up to the cap", () => {
  const rows = Array.from({ length: PIPE_LIMIT + 5 }, (_, i) => ({ id: `n-${i}` }));
  const payload = nextPipeStorage("[]", rows);
  assert.ok(payload);
  const parsed = JSON.parse(payload) as { id: string }[];
  assert.equal(parsed.length, PIPE_LIMIT);
  assert.equal(parsed[0]?.id, "n-0");
  assert.equal(parsed.at(-1)?.id, `n-${PIPE_LIMIT - 1}`);
});

test("CSV escapes commas, quotes, and spreadsheet formulas", () => {
  const csv = pipeToCsv([
    row,
    { ...row, id: "formula", name: "=HYPERLINK()", note: "line\nbreak", who: "A, B" },
  ]);
  assert.ok(csv.startsWith("name,status,prey,range,city,who,site,note,added,id,hook\n"));
  assert.match(csv, /"Wrote Nate, ""Tuesday"""/);
  assert.match(csv, /'=HYPERLINK\(\)/);
  assert.match(csv, /"line\nbreak"/);
  assert.match(csv, /"A, B"/);
  assert.ok(csv.endsWith("\n"));
});

test("JSON export is a pretty backup of the book fields", () => {
  const json = pipeToJson([row]);
  const parsed = JSON.parse(json) as PipeExportRow[];
  assert.deepEqual(parsed, [row]);
  assert.match(json, /"name": "Salish Ketamine"/);
  assert.equal(
    pipeExportName("csv", new Date("2026-10-29T18:00:00.000Z")),
    "firstpass-hunt-book-2026-10-29.csv",
  );
  assert.equal(
    pipeExportName("json", new Date("2026-10-29T18:00:00.000Z")),
    "firstpass-hunt-book-2026-10-29.json",
  );
});

test("status counts and arrow-key steps wrap the book", () => {
  const order = ["queued", "sent", "waiting", "keyed", "skip"] as const;
  const counts = pipeStatusCounts(
    [{ status: "sent" }, { status: "sent" }, { status: "skip" }, { status: "other" }],
    order,
  );
  assert.equal(counts.queued, 0);
  assert.equal(counts.sent, 2);
  assert.equal(counts.skip, 1);
  assert.equal(counts.other, 1);
  assert.equal(stepStatus(order, "queued", 1), "sent");
  assert.equal(stepStatus(order, "queued", -1), "skip");
  assert.equal(stepStatus(order, "skip", 1), "queued");
  assert.equal(stepStatus(order, "nope", 1), "sent");
});

test("directory slice label counts parked rows that stay off the list", () => {
  assert.equal(directorySliceLabel(12, 40, 0), "Showing 12 of 40 · 0 parked, off this list");
  assert.equal(directorySliceLabel(0, 40, 1), "Showing 0 of 40 · 1 parked, off this list");
});

test("issued-key search matches key, buyer, and plan, and program plans get a label", () => {
  const rows = [
    { key: "FP-LIFE-AAAA", soldTo: "Salish Ketamine", plan: "life" },
    { key: "FP-ORG-T202703", soldTo: "UW School of Pharmacy", plan: "program:team" },
  ];
  assert.equal(filterIssued(rows, "  ").length, 2);
  assert.deepEqual(
    filterIssued(rows, "uw").map((r) => r.soldTo),
    ["UW School of Pharmacy"],
  );
  assert.equal(filterIssued(rows, "ORG")[0]?.plan, "program:team");
  assert.equal(filterIssued(rows, "life")[0]?.key, "FP-LIFE-AAAA");
  assert.equal(issuedPlanLabel("life"), "life");
  assert.equal(issuedPlanLabel("program:team"), "Program · team");
  assert.equal(issuedPlanLabel("program:"), "Program");
});

test("Hunt save and the desks wire the book guard, export, and issued history", async () => {
  const hunts = await readFile(new URL("./hunts.ts", import.meta.url), "utf8");
  const save = hunts.slice(
    hunts.indexOf("export function savePipe"),
    hunts.indexOf("export function toPipe"),
  );
  assert.match(save, /nextPipeStorage/);
  assert.match(save, /PIPE_KEY/);
  assert.doesNotMatch(save, /localStorage\.setItem\(PIPE_KEY, JSON\.stringify\(rows/);

  const hunt = await readFile(new URL("../../components/desk/hunt.tsx", import.meta.url), "utf8");
  assert.match(hunt, /bookReady/);
  assert.match(hunt, /allowEmpty: true/);
  assert.match(hunt, /pipeToCsv/);
  assert.match(hunt, /pipeToJson/);
  assert.match(hunt, /role="radiogroup"/);
  assert.match(hunt, /PARKED\.length/);
  assert.match(hunt, /directorySliceLabel/);
  assert.match(hunt, /stepStatus/);
  assert.match(hunt, /replaceUnreadable: true/);

  const foundry = await readFile(
    new URL("../../components/desk/foundry.tsx", import.meta.url),
    "utf8",
  );
  assert.match(foundry, /filterIssued/);
  assert.match(foundry, /issuedPlanLabel/);
  assert.match(foundry, /program:\$\{res\.tier\}/);
  assert.match(foundry, /programFromLicense/);
  assert.match(foundry, /issuedProgramNote/);
  assert.match(foundry, /Onboarding note for the program lead/);
  assert.match(foundry, /operator-pin/);
  assert.match(foundry, /Show/);
  assert.match(foundry, /Hide/);
  assert.doesNotMatch(foundry, /\$12\/mo/);
  assert.doesNotMatch(foundry, /Stripe/);
});
