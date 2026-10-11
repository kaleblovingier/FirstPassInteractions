import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DrugLookupRequestSchema,
  HostContextSchema,
  InteractionCheckRequestSchema,
  KineticsEvaluationRequestSchema,
  kidneyEgfrConflict,
  validateSchema,
} from "./schemas";

function errorsFor(schema: Parameters<typeof validateSchema>[0], data: unknown) {
  const result = validateSchema(schema, data);
  assert.equal(result.success, false);
  return result.success ? [] : result.errors;
}

test("schemas: unknown keys are rejected and named, with the closest accepted field", () => {
  const cases: [unknown, string, string][] = [
    [{ drugs: ["warfarin"], host: { pregant: true } }, "host.pregant", "pregnant"],
    [{ drugs: ["warfarin"], host: { smoking: true } }, "host.smoking", "smoker"],
    [{ drugs: ["warfarin"], host: { albumin: 3 } }, "host.albumin", "serumAlbumin"],
    [{ drugs: ["warfarin"], host: { pH: 7.3 } }, "host.pH", "ph"],
    [{ drugs: ["warfarin"], drug: "aspirin" }, "drug", "drugs"],
  ];
  for (const [body, name, suggestion] of cases) {
    const errors = errorsFor(InteractionCheckRequestSchema, body);
    const error = errors.find((e) => e.name === name);
    assert.ok(error, `${name} is reported`);
    assert.equal(error.reason, `Unrecognized field. Did you mean "${suggestion}"?`);
  }

  const lookup = errorsFor(DrugLookupRequestSchema, { q: "warfarin", limt: 5 });
  assert.deepEqual(lookup, [
    { name: "limt", reason: 'Unrecognized field. Did you mean "limit"?', value: undefined },
  ]);
});

test("schemas: an unknown key with no close match lists the accepted fields", () => {
  const errors = errorsFor(KineticsEvaluationRequestSchema, { drugs: ["warfarin"], zzz: 1 });
  assert.deepEqual(errors, [
    {
      name: "zzz",
      reason: "Unrecognized field. Accepted fields: drugs, host, modules.",
      value: undefined,
    },
  ]);
});

test("schemas: submitted values are never echoed back", () => {
  const errors = errorsFor(InteractionCheckRequestSchema, {
    drugs: ["warfarin", 42],
    host: { age: -5, egfr: 999, kidney: "kaput" },
  });
  assert.ok(errors.length >= 4);
  for (const error of errors) assert.equal(error.value, undefined);
  const text = JSON.stringify(errors);
  for (const submitted of ["-5", "999", "kaput"]) {
    assert.ok(!text.includes(submitted), `${submitted} is not echoed`);
  }
});

test("schemas: error lists and field names are bounded", () => {
  const host = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`unknownField${i}`, true]));
  const errors = errorsFor(InteractionCheckRequestSchema, { drugs: ["warfarin"], host });
  assert.equal(errors.length, 21);
  assert.deepEqual(errors[20], {
    name: "body",
    reason: "20 more problems not shown.",
    value: undefined,
  });

  const longKey = "x".repeat(500);
  const [error] = errorsFor(InteractionCheckRequestSchema, { drugs: ["warfarin"], [longKey]: 1 });
  assert.equal(error.name, `${"x".repeat(64)}…`);
});

test("schemas: kidney category and eGFR must agree", () => {
  const agree: [Parameters<typeof kidneyEgfrConflict>[0], number][] = [
    ["normal", 90],
    ["normal", 60],
    ["mild", 75],
    ["moderate", 30],
    ["moderate", 59.9],
    ["severe", 15],
    ["severe", 29],
    ["esrd", 0],
    ["esrd", 14.9],
  ];
  for (const [kidney, egfr] of agree) {
    assert.equal(kidneyEgfrConflict(kidney, egfr), undefined, `${kidney} with ${egfr}`);
  }
  const disagree: [Parameters<typeof kidneyEgfrConflict>[0], number][] = [
    ["normal", 59],
    ["mild", 20],
    ["moderate", 60],
    ["moderate", 29],
    ["severe", 30],
    ["severe", 14],
    ["esrd", 15],
  ];
  for (const [kidney, egfr] of disagree) {
    assert.ok(kidneyEgfrConflict(kidney, egfr), `${kidney} with ${egfr}`);
  }
  assert.equal(kidneyEgfrConflict(undefined, 20), undefined);
  assert.equal(kidneyEgfrConflict("severe", undefined), undefined);

  const errors = errorsFor(HostContextSchema, { kidney: "mild", egfr: 20 });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].name, "egfr");
  assert.match(errors[0].reason, /60 mL\/min\/1\.73 m²/);
});

test("schemas: an empty module list is rejected; omitting it runs every module", () => {
  const errors = errorsFor(KineticsEvaluationRequestSchema, { drugs: ["warfarin"], modules: [] });
  assert.equal(errors[0].name, "modules");
  const omitted = validateSchema(KineticsEvaluationRequestSchema, { drugs: ["warfarin"] });
  assert.equal(omitted.success, true);
});
