import assert from 'node:assert/strict';
import test from 'node:test';

import { analyze } from './engine.ts';
import { basisFor } from './basis.ts';
import { LABEL_GOLD_SET } from './reference/label-gold-set.ts';

test('simvastatin + clarithromycin leads with the verbatim label quote', () => {
  const g = LABEL_GOLD_SET.find((x) => [x.drugA, x.drugB].includes('simvastatin') && [x.drugA, x.drugB].includes('clarithromycin'));
  assert.ok(g, 'gold pair present');
  const f = analyze(['simvastatin', 'clarithromycin']).findings.find((x) => x.drugIds.length === 2 && basisFor(x).length);
  assert.ok(f);
  const hit = analyze(['simvastatin', 'clarithromycin']).findings.flatMap(basisFor).find((b) => b.href === g.url);
  assert.ok(hit, 'label quote cited');
  assert.ok(hit.detail.includes(g.quote));
});

test('every gold pair the desk flags carries its label quote on at least one finding', () => {
  const missing: string[] = [];
  for (const g of LABEL_GOLD_SET) {
    const fs = analyze([g.drugA, g.drugB]).findings.filter((x) => x.drugIds.length === 2);
    if (!fs.length) continue;
    if (!fs.some((f) => basisFor(f).some((b) => b.href === g.url && b.detail.includes(g.quote)))) missing.push(g.id);
  }
  assert.deepEqual(missing, []);
});

test('no finding lists the same source link twice under the same kind', () => {
  for (const g of LABEL_GOLD_SET) {
    for (const f of analyze([g.drugA, g.drugB]).findings) {
      const keys = basisFor(f).filter((b) => b.href).map((b) => `${b.kind}|${b.href}`);
      assert.equal(new Set(keys).size, keys.length, f.id);
    }
  }
});
