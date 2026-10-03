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
    for (const id of [
      ...L.perpIds,
      ...(L.contraindicatedWith?.victimIds ?? []),
      ...(L.contraindicatedGroups?.flatMap((g) => g.victimIds) ?? []),
      ...(L.alsoNamed ?? []),
    ]) assert.ok(DRUG_BY_ID[id], id);
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

test('alprazolam rows quote the perpetrator role and call the tier the desk rule', () => {
  // Alprazolam is a sensitive CYP3A substrate these labels do not list as contraindicated.
  for (const [perp, brand] of [
    ['darunavir', 'Prezista'],
    ['darunavir-cobicistat', 'Prezcobix'],
    ['darunavir-cobicistat-ftc-taf', 'Symtuza'],
    ['atazanavir', 'Reyataz'],
    ['atazanavir-cobicistat', 'Evotaz'],
  ] as const) {
    const b = pkBasis(perp, 'alprazolam').find((x) => x.label.startsWith(brand));
    assert.ok(b, perp);
    assert.match(b.detail, /desk's rule/);
    assert.doesNotMatch(b.detail, /does not name this pair/);
  }
});

test('a pinned pair does not also get a role line claiming the label is silent', () => {
  const details = pkBasis('darunavir', 'simvastatin').map((x) => x.detail).join('\n');
  assert.doesNotMatch(details, /does not name this pair as contraindicated/);
});

test('Paxlovid and Kaletra quote the contraindication when the label names the victim', () => {
  const mid = pkBasis('paxlovid', 'midazolam').find((x) => x.label.startsWith('Paxlovid'));
  assert.ok(mid);
  assert.match(mid.detail, /oral midazolam/);
  assert.match(mid.detail, /calls this combination contraindicated/);
  const sim = pkBasis('lopinavir', 'simvastatin').find((x) => x.label.startsWith('Kaletra'));
  assert.ok(sim);
  assert.match(sim.detail, /lovastatin, simvastatin/);
});

test('Paxlovid + alprazolam is the desk rule, and a named inducer does not get that line', () => {
  const a = pkBasis('paxlovid', 'alprazolam').find((x) => x.label.startsWith('Paxlovid'));
  assert.ok(a);
  assert.match(a.detail, /desk's rule/);
  assert.doesNotMatch(a.detail, /calls this combination contraindicated/);
  const rif = pkBasis('paxlovid', 'rifampin').map((x) => x.detail).join('\n');
  assert.doesNotMatch(rif, /desk's rule/);
});
