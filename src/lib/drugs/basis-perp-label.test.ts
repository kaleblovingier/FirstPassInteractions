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

test('a gold-set quote on the same label page is kept, and the row still says contraindicated', () => {
  const mid = pkBasis('paxlovid', 'midazolam').map((x) => x.detail).join('\n');
  assert.match(mid, /calls this combination contraindicated/);
  assert.doesNotMatch(mid, /desk's rule/);
});

test('Paxlovid + alprazolam is the desk rule, and a named inducer does not get that line', () => {
  const a = pkBasis('paxlovid', 'alprazolam').find((x) => x.label.startsWith('Paxlovid'));
  assert.ok(a);
  assert.match(a.detail, /desk's rule/);
  assert.doesNotMatch(a.detail, /calls this combination contraindicated/);
  const rif = pkBasis('paxlovid', 'rifampin').map((x) => x.detail).join('\n');
  assert.doesNotMatch(rif, /desk's rule/);
});

test('nefazodone quotes the named contraindication and does not call triazolam one', () => {
  const pim = pkBasis('nefazodone', 'pimozide').find((x) => x.label.startsWith('Nefazodone'));
  assert.ok(pim);
  assert.match(pim.detail, /pimozide, or carbamazepine/);
  const tri = pkBasis('nefazodone', 'triazolam').map((x) => x.detail).join('\n');
  assert.doesNotMatch(tri, /Nefazodone label calls this combination contraindicated/);
});

test('rifampin quotes the label when it contraindicates the victim', () => {
  const lura = pkBasis('rifampin', 'lurasidone').find((x) => x.label.startsWith('Rifampin'));
  assert.ok(lura);
  assert.match(lura.detail, /contraindicated in patients receiving lurasidone/);
  const ata = pkBasis('rifampin', 'atazanavir').find((x) => x.label.startsWith('Rifampin'));
  assert.ok(ata);
  assert.match(ata.detail, /also receiving atazanavir, darunavir/);
});

test('clarithromycin, itraconazole, posaconazole, and Norvir quote named contraindications', () => {
  const lura = pkBasis('clarithromycin', 'lurasidone').find((x) => x.label.startsWith('Clarithromycin'));
  assert.ok(lura);
  assert.match(lura.detail, /lurasidone is contraindicated/);
  const tri = pkBasis('itraconazole', 'triazolam').find((x) => x.label.startsWith('Itraconazole'));
  assert.ok(tri);
  assert.match(tri.detail, /contraindicated with itraconazole/);
  const sir = pkBasis('posaconazole', 'sirolimus').find((x) => x.label.startsWith('Posaconazole'));
  assert.ok(sir);
  assert.match(sir.detail, /contraindicated with sirolimus/);
  const sim = pkBasis('ritonavir', 'simvastatin').find((x) => x.label.startsWith('Norvir'));
  assert.ok(sim);
  assert.match(sim.detail, /lovastatin, simvastatin/);
});

test('a conditional contraindication does not get a blanket contraindicated line', () => {
  const v = pkBasis('posaconazole', 'venetoclax').map((x) => x.detail).join('\n');
  assert.doesNotMatch(v, /Posaconazole label calls this combination contraindicated/);
  const c = pkBasis('ritonavir', 'colchicine').map((x) => x.detail).join('\n');
  assert.doesNotMatch(c, /Norvir label calls this combination contraindicated/);
});

test('ciprofloxacin quotes the tizanidine contraindication and stays quiet on theophylline', () => {
  const tiz = pkBasis('ciprofloxacin', 'tizanidine').map((x) => x.detail).join('\n');
  assert.match(tiz, /The Ciprofloxacin label calls this combination contraindicated/);
  assert.match(tiz, /potentiation of hypotensive and sedative effects of tizanidine/);
  const theo = pkBasis('ciprofloxacin', 'theophylline').map((x) => x.detail).join('\n');
  assert.doesNotMatch(theo, /Ciprofloxacin label calls this combination contraindicated/);
  assert.doesNotMatch(theo, /Ciprofloxacin label states the inhibition/);
});

test('fluvoxamine quotes the named contraindications and stays quiet on an unnamed pair', () => {
  // The tablet gold quote also starts with "Fluvoxamine", so match this label's own line.
  const line = /The Fluvoxamine label calls this combination contraindicated/;
  for (const victim of ['tizanidine', 'ramelteon', 'pimozide', 'thioridazine']) {
    const details = pkBasis('fluvoxamine', victim).map((x) => x.detail).join('\n');
    assert.match(details, line, victim);
    assert.match(details, /tizanidine, pimozide, alosetron, or ramelteon/, victim);
  }
  const theo = pkBasis('fluvoxamine', 'theophylline').map((x) => x.detail).join('\n');
  assert.doesNotMatch(theo, line);
});

test('Prevymis quotes pimozide and the ergots, and not simvastatin alone', () => {
  const pim = pkBasis('letermovir', 'pimozide').map((x) => x.detail).join('\n');
  assert.match(pim, /The Prevymis label calls this combination contraindicated/);
  assert.match(pim, /torsades de pointes/);
  const erg = pkBasis('letermovir', 'ergotamine').map((x) => x.detail).join('\n');
  assert.match(erg, /ergotamine and dihydroergotamine/);
  const sim = pkBasis('letermovir', 'simvastatin').map((x) => x.detail).join('\n');
  assert.doesNotMatch(sim, /Prevymis label calls this combination contraindicated/);
});

test('fluconazole quotes the QT contraindication and not an unnamed CYP3A substrate', () => {
  const line = /The Fluconazole label calls this combination contraindicated/;
  for (const victim of ['pimozide', 'quinidine', 'erythromycin']) {
    const details = pkBasis('fluconazole', victim).map((x) => x.detail).join('\n');
    assert.match(details, line, victim);
    assert.match(details, /erythromycin, pimozide, and quinidine/, victim);
  }
  const mid = pkBasis('fluconazole', 'midazolam').map((x) => x.detail).join('\n');
  assert.doesNotMatch(mid, line);
});

test('voriconazole quotes the named contraindications and not an unnamed CYP3A substrate', () => {
  const line = /The Voriconazole label calls this combination contraindicated/;
  for (const victim of ['pimozide', 'quinidine']) {
    const details = pkBasis('voriconazole', victim).map((x) => x.detail).join('\n');
    assert.match(details, line, victim);
    assert.match(details, /pimozide, quinidine or ivabradine/, victim);
  }
  const sir = pkBasis('voriconazole', 'sirolimus').map((x) => x.detail).join('\n');
  assert.match(sir, line);
  assert.match(sir, /significantly increase sirolimus concentrations/);
  const lur = pkBasis('voriconazole', 'lurasidone').map((x) => x.detail).join('\n');
  assert.match(lur, line);
  assert.match(lur, /increases in lurasidone exposure/);
  const mid = pkBasis('voriconazole', 'midazolam').map((x) => x.detail).join('\n');
  assert.doesNotMatch(mid, line);
  const efa = pkBasis('voriconazole', 'efavirenz').map((x) => x.detail).join('\n');
  assert.doesNotMatch(efa, line);
});

test('erythromycin quotes the named contraindications and not an unnamed CYP3A substrate', () => {
  const line = /The Erythromycin label calls this combination contraindicated/;
  const pim = pkBasis('erythromycin', 'pimozide').map((x) => x.detail).join('\n');
  assert.match(pim, line);
  assert.match(pim, /terfenadine, astemizole, cisapride, pimozide, ergotamine, or dihydroergotamine/);
  for (const victim of ['lovastatin', 'simvastatin']) {
    const details = pkBasis('erythromycin', victim).map((x) => x.detail).join('\n');
    assert.match(details, line, victim);
    assert.match(details, /lovastatin or simvastatin/, victim);
  }
  const mid = pkBasis('erythromycin', 'midazolam').map((x) => x.detail).join('\n');
  assert.doesNotMatch(mid, line);
});

test('XOCOVA quotes the named CYP3A contraindications and not an unnamed substrate', () => {
  const line = /The XOCOVA label calls this combination contraindicated/;
  const pim = pkBasis('ensitrelvir', 'pimozide').map((x) => x.detail).join('\n');
  assert.match(pim, line);
  assert.match(pim, /lurasidone, pimozide/);
  const sim = pkBasis('ensitrelvir', 'simvastatin').map((x) => x.detail).join('\n');
  assert.match(sim, line);
  assert.match(sim, /Discontinue use of simvastatin/);
  const tri = pkBasis('ensitrelvir', 'triazolam').map((x) => x.detail).join('\n');
  assert.match(tri, line);
  const mid = pkBasis('ensitrelvir', 'midazolam').map((x) => x.detail).join('\n');
  assert.doesNotMatch(mid, line);
  const col = pkBasis('ensitrelvir', 'colchicine').map((x) => x.detail).join('\n');
  assert.doesNotMatch(col, line);
});
