import assert from 'node:assert/strict';
import test from 'node:test';

import { analyze } from './engine.ts';
import { basisFor } from './basis.ts';

test('a strong CYP3A inhibitor row cites the FDA interaction table', () => {
  const f = analyze(['ketoconazole', 'midazolam']).findings.find((x) => x.id.includes('pk-CYP3A4-inhibitor-ketoconazole'));
  assert.ok(f, 'expected a ketoconazole CYP3A4 inhibitor finding');
  const b = basisFor(f).find((x) => x.kind === 'fda-ddi');
  assert.ok(b, 'expected an fda-ddi basis');
  assert.match(b.detail, /Ketoconazole as a strong CYP3A inhibitor/i);
  assert.match(b.detail, /severity tier on this row is the desk's rule/);
  assert.match(b.href ?? '', /fda\.gov/);
});

test('pd rows never get an FDA interaction-table basis', () => {
  for (const f of analyze(['sertraline', 'tramadol']).findings.filter((x) => x.kind !== 'pk')) {
    assert.equal(basisFor(f).some((x) => x.kind === 'fda-ddi'), false);
  }
});
