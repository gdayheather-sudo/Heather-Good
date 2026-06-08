// @ts-check
/**
 * Research-layer tests — fixtures only, no network. Verifies that OFF fields are
 * classified into the correct tiers/status and that the bug guard holds.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapProduct } from '../src/research/openFoodFacts.js';
import { classifyInput, fillGaps } from '../src/research/researchAgent.js';
import { ATTRIBUTES, scoreProduct } from '../src/engine/scoringEngine.js';

const fairtradeOrganicBar = {
  product_name: 'Dark Chocolate 70%',
  brands: 'Acme',
  ingredients_text: 'cocoa mass, cane sugar, cocoa butter',
  nova_group: 2,
  additives_n: 0,
  ecoscore_grade: 'b',
  packaging: 'Cardboard box, aluminium foil',
  labels_tags: ['en:organic', 'en:fairtrade'],
};

test('certifications classify as VERIFIED on the right attributes', () => {
  const p = mapProduct('123', fairtradeOrganicBar);
  const labour = p.evidence.find((e) => e.attribute === 'labour');
  const ingredients = p.evidence.filter((e) => e.attribute === 'ingredients');
  assert.equal(labour.tier, 'verified', 'Fairtrade -> verified labour');
  assert.ok(ingredients.some((e) => e.tier === 'verified'), 'Organic -> verified ingredients signal');
  assert.ok(p.foundCerts.includes('Fairtrade'));
  assert.ok(p.foundCerts.includes('Certified Organic'));
});

test('on-pack ingredients + packaging classify as DISCLOSED; Eco-Score as VERIFIED', () => {
  const p = mapProduct('123', fairtradeOrganicBar);
  const disclosedIngredients = p.evidence.find((e) => e.attribute === 'ingredients' && e.tier === 'disclosed');
  const packaging = p.evidence.find((e) => e.attribute === 'packaging');
  const env = p.evidence.find((e) => e.attribute === 'environmental');
  assert.ok(disclosedIngredients, 'ingredients list is a disclosed finding');
  assert.equal(packaging.tier, 'disclosed');
  assert.equal(env.tier, 'verified'); // Eco-Score is an independent index
});

test('END TO END override: a Fairtrade product is NOT punished by the labour prior', () => {
  const certified = fillGaps(mapProduct('123', fairtradeOrganicBar));
  const plain = fillGaps(mapProduct('999', { ...fairtradeOrganicBar, labels_tags: [] }));
  const weights = { labour: 100 };
  const certScore = scoreProduct({ productName: 'c', weights, evidence: certified.evidence }).overall;
  const plainScore = scoreProduct({ productName: 'p', weights, evidence: plain.evidence }).overall;
  assert.ok(certScore > plainScore, 'verified labour must beat the inferred prior');
  assert.equal(certScore, 88); // the Fairtrade verified value
});

test('missing fields become search_inconclusive, NOT a false "company is silent"', () => {
  const sparse = mapProduct('555', { product_name: 'Mystery', brands: 'X' });
  // No ingredients/eco/packaging -> all inconclusive (our limitation), not penalised.
  const filled = fillGaps(sparse);
  const price = filled.evidence.find((e) => e.attribute === 'price');
  const materials = filled.evidence.find((e) => e.attribute === 'materials');
  assert.equal(price.status, 'search_inconclusive');
  assert.equal(materials.status, 'search_inconclusive');
  // every attribute is represented after gap-filling
  for (const a of ATTRIBUTES) assert.ok(filled.evidence.some((e) => e.attribute === a), `missing ${a}`);
});

test('labour gap becomes a dismissible INFERRED prior with a visible basis', () => {
  const filled = fillGaps(mapProduct('555', { product_name: 'X', brands: 'Y', ingredients_text: 'water' }));
  const labour = filled.evidence.find((e) => e.attribute === 'labour');
  assert.equal(labour.tier, 'inferred');
  assert.ok(labour.basis && /certification/i.test(labour.basis));
  assert.equal(labour.dismissed, false);
});

test('classifyInput distinguishes barcode / URL / search', () => {
  assert.deepEqual(classifyInput('737628064502'), { kind: 'barcode', value: '737628064502' });
  assert.deepEqual(classifyInput('  3017620422003 '), { kind: 'barcode', value: '3017620422003' });
  assert.equal(classifyInput('https://world.openfoodfacts.org/product/3017620422003/nutella').kind, 'barcode');
  assert.equal(classifyInput('https://world.openfoodfacts.org/product/3017620422003/nutella').value, '3017620422003');
  assert.equal(classifyInput('organic peanut butter').kind, 'search');
});
