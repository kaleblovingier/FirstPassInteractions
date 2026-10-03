import assert from 'node:assert/strict';
import test from 'node:test';

import { analyze } from './engine.ts';
import { basisFor } from './basis.ts';
import { DRUG_BY_ID } from './catalog.ts';
import { PERPETRATOR_LABELS } from './reference/label-perpetrators.ts';

const pkBasis = (a: string, b: string) =>
  analyze([a, b]).findings.filter((f) => f.kind === 'pk' && f.drugIds[0] === a).flatMap(basisFor);

test('every perpetrator and named victim id is a real catalog row', () => {
  for (const L of PERPETRATOR_LABELS) {
    for (const id of [...L.perpIds, ...(L.contraindicatedWith?.victimIds ?? [])]) assert.ok(DRUG_BY_ID[id], id);
    assert.match(L.url, /dailymed\.nlm\.nih\.gov/);
  }
});

test('mifepristone + simvastatin quotes the Korlym contraindication', () => {
  const b = pkBasis('mifepristone', 'simvastatin').find((x) => x.label.startsWith('Korlym'));
  assert.ok(b);
  assert.match(b.detail, /calls this combination contraindicated/);
});

test('mifepristone + an unnamed CYP3A substrate cites the role only and says the tier is the desk rule', () => {
  const b = pkBasis('mifepristone', 'midazolam').find((x) => x.label.startsWith('Korlym'));
  assert.ok(b);
  assert.match(b.detail, /does not name this pair as contraindicated/);
  assert.doesNotMatch(b.detail, /calls this combination contraindicated/);
});

test('rifapentine and fosphenytoin inducer rows cite their own labels', () => {
  assert.ok(pkBasis('rifapentine', 'midazolam').some((x) => x.label.startsWith('Priftin')));
  assert.ok(pkBasis('fosphenytoin', 'midazolam').some((x) => x.label.startsWith('Cerebyx')));
});
