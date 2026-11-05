import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ISSUED_STORAGE_KEY,
  PAY_NOTE_STORAGE_KEY,
  PIPE_LIMIT,
  attachHuntLicenseKeys,
  copyDeskText,
  directorySliceLabel,
  filterIssued,
  issuedPlanLabel,
  nextIssuedStorage,
  nextPipeStorage,
  pipeExportName,
  pipeLicenseExportName,
  pipeLicensesToCsv,
  pipeLicensesToJson,
  pipeStatusCounts,
  pipeToCsv,
  pipeToJson,
  saveIssuedList,
  savePayNoteText,
  stepStatus,
  storedPipeHasRows,
  storedPipeIsReadable,
  type DeskListStorage,
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

function memoryStorage(
  initial?: [string, string][],
): DeskListStorage & { mem: Map<string, string> } {
  const mem = new Map(initial);
  return {
    mem,
    getItem: (key) => (mem.has(key) ? (mem.get(key) ?? null) : null),
    setItem: (key, value) => {
      mem.set(key, value);
    },
  };
}

test("unreadable issued keys are not replaced unless that replace is explicit", () => {
  const broken = "{not-json";
  assert.equal(nextIssuedStorage(broken, [{ key: "FP-1" }]), null);
  assert.equal(nextIssuedStorage(broken, [], { allowEmpty: true }), null);
  const replaced = nextIssuedStorage(broken, [{ key: "FP-1" }], { replaceUnreadable: true });
  assert.ok(replaced);
  assert.match(replaced, /FP-1/);
  const stored = JSON.stringify([{ key: "FP-KEEP" }]);
  assert.equal(nextIssuedStorage(stored, []), null);
  assert.match(nextIssuedStorage("[]", [{ key: "FP-1" }]) ?? "", /FP-1/);
});

test("a throwing setItem leaves issued keys and the pay note unwritten", () => {
  const broken = memoryStorage([[ISSUED_STORAGE_KEY, "{not-json"]]);
  assert.equal(saveIssuedList(broken, [{ key: "FP-1" }]), false);
  assert.equal(broken.mem.get(ISSUED_STORAGE_KEY), "{not-json");
  assert.equal(saveIssuedList(broken, [{ key: "FP-1" }], { replaceUnreadable: true }), true);
  assert.match(broken.mem.get(ISSUED_STORAGE_KEY) ?? "", /FP-1/);

  let writes = 0;
  const quota: DeskListStorage = {
    getItem: () => "[]",
    setItem: () => {
      writes += 1;
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(saveIssuedList(quota, [{ key: "FP-1", soldTo: "Salish" }]), false);
  assert.equal(writes, 1);
  assert.equal(
    saveIssuedList(
      {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("should not write");
        },
      },
      [{ key: "FP-1" }],
      { replaceUnreadable: true },
    ),
    false,
  );

  const pay: DeskListStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(savePayNoteText(pay, "Venmo @firstpass"), false);
  const saved = memoryStorage();
  assert.equal(savePayNoteText(saved, "Venmo @firstpass"), true);
  assert.equal(saved.mem.get(PAY_NOTE_STORAGE_KEY), "Venmo @firstpass");
});

test("collect keeps the outreach note and stores the license key beside it", () => {
  const next = attachHuntLicenseKeys(
    [
      { name: "Salish Ketamine", status: "waiting", note: "Wrote Nate" },
      { name: "Other Clinic", status: "sent", note: "left alone" },
      { name: "No Match", status: "waiting", note: "" },
    ],
    new Map([["salish ketamine", "FP-LIFE-AAAA"]]),
  );
  assert.equal(next[0]?.note, "Wrote Nate");
  assert.equal(next[0]?.status, "keyed");
  assert.equal(next[0]?.licenseKey, "FP-LIFE-AAAA");
  assert.notEqual(next[0]?.note, next[0]?.licenseKey);
  assert.equal(next[1]?.note, "left alone");
  assert.equal(next[1]?.status, "sent");
  assert.equal(next[1]?.licenseKey, undefined);
  assert.equal(next[2]?.note, "");
  assert.equal(next[2]?.status, "waiting");
});

test("book CSV and JSON omit license keys; key export is a separate labeled file", () => {
  assert.doesNotMatch(pipeToCsv([row]), /licenseKey|FP-LIFE/);
  assert.doesNotMatch(pipeToJson([row]), /licenseKey/);
  const csv = pipeLicensesToCsv([
    { name: "=HYPERLINK()", who: "A, B", status: "keyed", licenseKey: "FP-LIFE-AAAA" },
  ]);
  assert.ok(csv.startsWith("name,who,status,licenseKey\n"));
  assert.match(csv, /'=HYPERLINK\(\)/);
  assert.match(csv, /"A, B"/);
  assert.match(csv, /FP-LIFE-AAAA/);
  const parsed = JSON.parse(
    pipeLicensesToJson([
      { name: "Salish Ketamine", who: "Nate", status: "keyed", licenseKey: "FP-LIFE-AAAA" },
    ]),
  ) as { licenseKey: string; note?: string }[];
  assert.equal(parsed[0]?.licenseKey, "FP-LIFE-AAAA");
  assert.equal(parsed[0]?.note, undefined);
  assert.equal(
    pipeLicenseExportName("csv", new Date("2026-10-29T18:00:00.000Z")),
    "firstpass-hunt-keys-2026-10-29.csv",
  );
});

test("a rejected clipboard does not count as copied", async () => {
  assert.equal(
    await copyDeskText(async () => {
      throw new DOMException("denied", "NotAllowedError");
    }, "FP-LIFE-AAAA"),
    false,
  );
  let written = "";
  assert.equal(
    await copyDeskText(async (text) => {
      written = text;
    }, "FP-LIFE-AAAA"),
    true,
  );
  assert.equal(written, "FP-LIFE-AAAA");
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
  assert.match(hunts, /licenseKey/);
  assert.doesNotMatch(save, /localStorage\.setItem\(PIPE_KEY, JSON\.stringify\(rows/);

  const hunt = await readFile(new URL("../../components/desk/hunt.tsx", import.meta.url), "utf8");
  assert.match(hunt, /bookReady/);
  assert.match(hunt, /allowEmpty: true/);
  assert.match(hunt, /pipeToCsv/);
  assert.match(hunt, /pipeToJson/);
  assert.match(hunt, /pipeLicensesToCsv/);
  assert.match(hunt, /pipeLicensesToJson/);
  assert.match(hunt, /Download keys CSV/);
  assert.match(hunt, /Download keys JSON/);
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
  assert.match(foundry, /saveIssuedList/);
  assert.match(foundry, /savePayNoteText/);
  assert.match(foundry, /attachHuntLicenseKeys/);
  assert.match(foundry, /copyDeskText/);
  assert.match(foundry, /fulfillCopied/);
  assert.match(foundry, /replaceUnreadable: true/);
  assert.match(foundry, /Clipboard was blocked\. Use Download instead\./);
  assert.doesNotMatch(foundry, /note:\s*key/);
  assert.doesNotMatch(foundry, /localStorage\.setItem/);
  const copyFn = foundry.slice(
    foundry.indexOf("async function copy"),
    foundry.indexOf("async function collect"),
  );
  assert.ok(copyFn.indexOf("copyDeskText") >= 0);
  assert.ok(copyFn.indexOf("setFulfillCopied(true)") > copyFn.indexOf("copyDeskText"));
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
