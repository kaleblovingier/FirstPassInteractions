import assert from 'node:assert/strict';
import test from 'node:test';

import { analyze } from './engine.ts';
import { basisFor } from './basis.ts';

function kinds(ids: string[], suffix: string) {
  const f = analyze(ids).findings.find((x) => x.id.endsWith(suffix));
  assert.ok(f, `expected a ${suffix} finding for ${ids.join(' + ')}`);
  return basisFor(f).map((b) => b.kind);
}

test('sodium oxybate plus a CNS depressant cites the oxybate label, not only the desk map', () => {
  const k = kinds(['sodium-oxybate', 'mirtazapine'], 'pd-ghb-cns');
  assert.ok(k.includes('fda-boxed'));
  assert.ok(!k.every((x) => x === 'desk'));
});

test('MAOI plus amphetamine cites the stimulant label contraindication', () => {
  const k = kinds(['selegiline', 'amphetamine'], 'pd-maoi-stim');
  assert.ok(k.includes('fda-boxed'));
});

test('a finding on two drugs does not cite a paper about only one of them', () => {
  // PMID 7870932 is cocaine with ethanol. It says nothing about alprazolam.
  const pmids = analyze(['ethanol', 'alprazolam']).findings.flatMap((f) =>
    basisFor(f).filter((b) => b.kind === 'pubmed').map((b) => b.label),
  );
  assert.ok(!pmids.includes('PMID 7870932'), pmids.join(', '));
});
