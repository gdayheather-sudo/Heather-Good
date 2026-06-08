// @ts-check
/**
 * Engine tests — these encode the brief's NON-NEGOTIABLE rules. They run with
 * zero dependencies and zero network:  `node --test`.
 *
 * The "first milestone" of the brief is: can the engine produce a ranking a
 * sceptical, facts-only user finds fair and legible? These tests are how we
 * keep that honest.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreProduct, resolveAttribute, normaliseWeights } from '../src/engine/scoringEngine.js';

/** Convenience evidence factory. */
const ev = (attribute, props) => ({ attribute, ...props });

test('override rule: VERIFIED beats an INFERRED prior for the same attribute', () => {
  const evidence = [
    ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 25, basis: 'no cert found; assumed conventional' }),
    ev('labour', { tier: 'verified', status: 'verified', value: 90, source: { label: 'Fairtrade International' } }),
  ];
  const { winner } = resolveAttribute(evidence);
  assert.equal(winner.tier, 'verified');
  assert.equal(winner.value, 90, 'the transparent brand must not be punished by the disproven prior');
});

test('override rule end-to-end: verified evidence lifts the score above the prior', () => {
  const weights = { labour: 100 };
  const withPrior = scoreProduct({
    productName: 'X', weights,
    evidence: [ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 25, basis: 'assumed' })],
  });
  const withCert = scoreProduct({
    productName: 'X', weights,
    evidence: [
      ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 25, basis: 'assumed' }),
      ev('labour', { tier: 'verified', status: 'verified', value: 90, source: { label: 'Fairtrade' } }),
    ],
  });
  assert.equal(withPrior.overall, 25);
  assert.equal(withCert.overall, 90);
});

test('bug guard: search_inconclusive is EXCLUDED from the score (never penalised)', () => {
  // Two attributes, equal weight. One scores 80, the other is inconclusive.
  const result = scoreProduct({
    productName: 'X',
    weights: { ingredients: 50, price: 50 },
    evidence: [
      ev('ingredients', { tier: 'disclosed', status: 'disclosed', value: 80 }),
      ev('price', { tier: null, status: 'search_inconclusive', value: null }),
    ],
  });
  // Price is dropped from the denominator => overall == ingredients sub-score.
  assert.equal(result.overall, 80);
  assert.ok(result.excluded.includes('price'));
});

test('bug guard: inconclusive still LOWERS confidence even though it does not move the score', () => {
  const result = scoreProduct({
    productName: 'X',
    weights: { ingredients: 50, price: 50 },
    evidence: [
      ev('ingredients', { tier: 'verified', status: 'verified', value: 80 }),
      ev('price', { tier: null, status: 'search_inconclusive', value: null }),
    ],
  });
  // Half the user's weight is inconclusive -> confidence can't be full.
  assert.ok(result.confidence.pct <= 55, `expected confidence dragged down, got ${result.confidence.pct}`);
  assert.ok(result.confidence.weightByKind.inconclusive > 0.4);
});

test('absence as signal: not_disclosed (genuine silence) DOES count, weighted', () => {
  const result = scoreProduct({
    productName: 'X',
    weights: { labour: 100 },
    evidence: [ev('labour', { tier: null, status: 'not_disclosed', value: null })],
  });
  assert.equal(result.overall, 20, 'silence uses the configured low signal score');
  assert.ok(result.excluded.length === 0, 'not_disclosed is included, unlike inconclusive');
});

test('THE CORE PRINCIPLE: the same facts score differently under different weights', () => {
  // Facts: great ingredients (verified 85), labour totally undisclosed (silence).
  const facts = [
    ev('ingredients', { tier: 'verified', status: 'verified', value: 85 }),
    ev('labour', { tier: null, status: 'not_disclosed', value: null }), // silence -> 20
  ];
  const priceFocused = scoreProduct({ productName: 'X', weights: { ingredients: 90, labour: 10 }, evidence: facts });
  const ethicsFocused = scoreProduct({ productName: 'X', weights: { ingredients: 10, labour: 90 }, evidence: facts });

  // Same evidence, the user's weights do the judging.
  assert.ok(priceFocused.overall > ethicsFocused.overall);
  // Sanity on the math: 0.9*85 + 0.1*20 = 78.5 -> 79 ; 0.1*85 + 0.9*20 = 26.5 -> 27
  assert.equal(priceFocused.overall, 79);
  assert.equal(ethicsFocused.overall, 27);
});

test('dismissing an assumption removes it; attribute falls back to inconclusive (no penalty)', () => {
  const base = [
    ev('packaging', { tier: 'disclosed', status: 'disclosed', value: 70 }),
    ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 25, basis: 'assumed conventional', dismissed: true }),
  ];
  const result = scoreProduct({ productName: 'X', weights: { packaging: 50, labour: 50 }, evidence: base });
  // labour's only evidence was a dismissed assumption -> excluded, packaging carries it.
  assert.equal(result.overall, 70);
  assert.ok(result.excluded.includes('labour'));
});

test('confidence level reflects evidence mix: all verified => high', () => {
  const result = scoreProduct({
    productName: 'X',
    weights: { ingredients: 50, environmental: 50 },
    evidence: [
      ev('ingredients', { tier: 'verified', status: 'verified', value: 70 }),
      ev('environmental', { tier: 'verified', status: 'verified', value: 60 }),
    ],
  });
  assert.equal(result.confidence.level, 'high');
});

test('confidence level reflects evidence mix: all inferred => low', () => {
  const result = scoreProduct({
    productName: 'X',
    weights: { labour: 100 },
    evidence: [ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 30, basis: 'prior' })],
  });
  assert.equal(result.confidence.level, 'low');
});

test('every inferred winner carries a visible basis (legal posture, brief §5)', () => {
  const result = scoreProduct({
    productName: 'X',
    weights: { labour: 100 },
    evidence: [ev('labour', { tier: 'inferred', status: 'not_disclosed', value: 30, basis: 'no published supply chain' })],
  });
  const labour = result.attributes.find((a) => a.attribute === 'labour');
  assert.equal(labour.isAssumption, true);
  assert.ok(labour.basis && labour.basis.length > 0, 'inferred winners must expose their basis');
});

test('normaliseWeights coerces junk to zero and keeps the full attribute set', () => {
  const w = normaliseWeights({ ingredients: 30, materials: -5, packaging: NaN, price: '10' });
  assert.equal(w.ingredients, 30);
  assert.equal(w.materials, 0);
  assert.equal(w.packaging, 0);
  assert.equal(w.price, 10);
  assert.equal(w.labour, 0);
});

test('verdict and summary are framed by the user\'s priorities, not as fact', () => {
  const result = scoreProduct({
    productName: 'Acme Bar',
    weights: { ingredients: 100 },
    evidence: [ev('ingredients', { tier: 'disclosed', status: 'disclosed', value: 60 })],
  });
  assert.match(result.verdict, /^By your priorities, Acme Bar scores 60\/100/);
  assert.match(result.summary, /By your priorities/);
});
