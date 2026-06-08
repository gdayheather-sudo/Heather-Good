// @ts-check
/**
 * Ethical Shopping Companion — Scoring Engine
 * ============================================
 *
 * THIS IS THE CORE MODULE. It is deliberately:
 *   - Pure (no I/O, no network, no DOM, no framework).
 *   - Dependency-free (plain ES module, JSDoc-typed).
 *   - Category-agnostic (it knows about tiers/status/weights, NOT about food
 *     vs fashion). Category knowledge lives in the research layer.
 *
 * The goal is that this file can be lifted, unchanged, into a native app later.
 *
 * ------------------------------------------------------------------------
 * DESIGN PRINCIPLE (non-negotiable, see brief §2):
 *   The USER'S WEIGHTS do the judging, not us. We surface evidence and apply
 *   *their* criteria. The same fact (e.g. "no published supply chain") can
 *   raise a score for a price-focused user and lower it for an ethics-focused
 *   user. The engine never decides a brand is "good" or "bad" — it computes
 *   "by your priorities, here is the score," resting on stated facts.
 *
 * EVIDENCE STACK & PRECEDENCE (brief §3):
 *   VERIFIED (third-party cert/audit/index)  > strongest
 *   DISCLOSED (company's own published claim) > strong, self-reported
 *   INFERRED  (category prior, an assumption) > weakest, always labelled
 *   Higher tiers ALWAYS override lower ones for the same attribute. An
 *   INFERRED prior is a placeholder until real evidence arrives — never a
 *   verdict. A transparent brand must never be punished by a prior it has
 *   disproven.  ->  see resolveAttribute().
 *
 * ABSENCE AS SIGNAL + BUG GUARD (brief §4):
 *   - not_disclosed       = we credibly searched, company is silent
 *                           -> counts as a (low) signal, weighted per prefs.
 *   - search_inconclusive = our retrieval failed / didn't find it
 *                           -> MUST NOT be penalised. Excluded from the score
 *                              denominator, but it DOES lower confidence.
 *
 * @module scoringEngine
 */

/* eslint-disable no-unused-vars */

/**
 * @typedef {'ingredients'|'materials'|'packaging'|'environmental'|'labour'|'price'} AttributeKey
 * @typedef {'verified'|'disclosed'|'inferred'} Tier
 * @typedef {'verified'|'disclosed'|'not_disclosed'|'search_inconclusive'} Status
 *
 * @typedef {Object} Source
 * @property {string} label   Human-readable citation, e.g. "Open Food Facts".
 * @property {string} [url]   Link to the receipt, when one exists.
 *
 * @typedef {Object} Evidence
 *   One finding about ONE attribute of a product. The research layer may emit
 *   several Evidence objects for the same attribute (e.g. an inferred prior AND
 *   a verified certification); the engine resolves precedence.
 * @property {AttributeKey} attribute
 * @property {Tier|null}     tier     null is used for pure "silence" evidence
 *                                     (status not_disclosed, no estimated value).
 * @property {Status}        status
 * @property {number|null}   value    Attribute sub-score 0..100 (higher = better
 *                                     aligned with the ethical/quality axis), or
 *                                     null when there is no estimated value
 *                                     (pure silence / inconclusive).
 * @property {Source|null}  [source]
 * @property {string|null}  [basis]   REQUIRED for tier 'inferred': the visible
 *                                     reasoning behind the assumption (brief §5).
 * @property {string}       [note]    Optional extra human-readable context.
 * @property {boolean}      [dismissed] User dismissed this (assumptions only).
 *
 * @typedef {Partial<Record<AttributeKey, number>>} Weights
 *   Raw user weights per attribute (any non-negative scale; engine normalises).
 *
 * @typedef {Object} EngineConfig
 * @property {number} silenceScore        Sub-score assigned to a genuine
 *                                        not_disclosed silence signal (low).
 * @property {Record<Tier|'silence', number>} confidenceWeight
 *                                        How much each evidence kind counts
 *                                        toward overall confidence (0..1).
 * @property {{high:number, medium:number}} confidenceBands
 */

/** The full, ordered attribute set used across the app. */
export const ATTRIBUTES = /** @type {AttributeKey[]} */ ([
  'ingredients',
  'materials',
  'packaging',
  'environmental',
  'labour',
  'price',
]);

/** Human-friendly labels for UI. */
export const ATTRIBUTE_LABELS = /** @type {Record<AttributeKey,string>} */ ({
  ingredients: 'Ingredients',
  materials: 'Materials',
  packaging: 'Packaging',
  environmental: 'Environmental impact',
  labour: 'Fair labour & wages',
  price: 'Price',
});

/** Default, tunable engine configuration. Centralised so it is auditable. */
export const DEFAULT_CONFIG = /** @type {EngineConfig} */ ({
  // A genuine, searched-and-silent attribute scores low — but only matters as
  // much as the user weights it. Not zero: silence is a soft signal, not proof.
  silenceScore: 20,
  confidenceWeight: {
    verified: 1.0, // third-party — we trust the receipt
    disclosed: 0.6, // self-reported — credible but unverified
    inferred: 0.25, // an assumption — low certainty
    silence: 0.2, // we know they're silent, but not what the truth is
  },
  confidenceBands: { high: 0.7, medium: 0.4 },
});

/** Numeric precedence for the override rule. Higher wins. */
const TIER_RANK = { verified: 3, disclosed: 2, inferred: 1 };

/**
 * Rank a single Evidence for precedence. Pure silence (tier null) ranks below
 * every real tier.
 * @param {Evidence} e
 * @returns {number}
 */
function rankOf(e) {
  return e.tier ? TIER_RANK[e.tier] : 0;
}

/**
 * Resolve the winning Evidence for one attribute, honouring the override rule.
 *
 * Rules:
 *   - Dismissed evidence is ignored (the user rejected that assumption).
 *   - search_inconclusive evidence never wins by itself; it only matters if it
 *     is the *only* thing we have (-> attribute excluded from the score).
 *   - Among the rest, the highest tier wins (VERIFIED > DISCLOSED > INFERRED >
 *     silence). Ties break toward the first listed.
 *
 * This is where "a transparent brand is never punished by a prior it disproved"
 * is enforced: a verified/disclosed finding outranks any inferred prior.
 *
 * @param {Evidence[]} evidenceForAttribute
 * @returns {{winner: Evidence|null, superseded: Evidence[], inconclusiveOnly: boolean}}
 */
export function resolveAttribute(evidenceForAttribute) {
  const live = evidenceForAttribute.filter((e) => !e.dismissed);

  const ranked = live
    .filter((e) => e.status !== 'search_inconclusive')
    .sort((a, b) => rankOf(b) - rankOf(a));

  if (ranked.length === 0) {
    // Nothing decisive survived. Were we simply inconclusive?
    const inconclusiveOnly = live.some((e) => e.status === 'search_inconclusive');
    return { winner: null, superseded: [], inconclusiveOnly };
  }

  const winner = ranked[0];
  const superseded = live.filter((e) => e !== winner);
  return { winner, superseded, inconclusiveOnly: false };
}

/**
 * Compute the 0..100 sub-score for a resolved attribute winner.
 * @param {Evidence} winner
 * @param {EngineConfig} config
 * @returns {number}
 */
function subScoreFor(winner, config) {
  if (winner.status === 'not_disclosed' && winner.value == null) {
    // Pure silence -> the absence-as-signal value.
    return config.silenceScore;
  }
  if (typeof winner.value === 'number') {
    return clamp(winner.value, 0, 100);
  }
  // Defensive: a winner with no usable value behaves like silence.
  return config.silenceScore;
}

/**
 * Map a winning Evidence to a confidence weight (how evidence-backed it is).
 * @param {Evidence} winner
 * @param {EngineConfig} config
 * @returns {number}
 */
function confidenceWeightFor(winner, config) {
  if (winner.tier === 'verified') return config.confidenceWeight.verified;
  if (winner.tier === 'disclosed') return config.confidenceWeight.disclosed;
  if (winner.tier === 'inferred') return config.confidenceWeight.inferred;
  return config.confidenceWeight.silence; // not_disclosed silence
}

/**
 * @typedef {Object} ScoredAttribute
 * @property {AttributeKey} attribute
 * @property {string}       label
 * @property {boolean}      included     False => excluded from score (inconclusive/dismissed).
 * @property {number|null}  subScore     0..100 contribution basis, or null if excluded.
 * @property {Tier|null}    tier
 * @property {Status}       status
 * @property {Source|null}  source
 * @property {string|null}  basis        Visible basis for an inferred assumption.
 * @property {boolean}      isAssumption True when the winner is an INFERRED prior.
 * @property {number}       rawWeight    The user's weight for this attribute.
 * @property {number}       weightShare  Share of the *score* denominator (0..1).
 * @property {string}       reason       Plain-language explanation of treatment.
 * @property {Evidence|null} winner
 * @property {Evidence[]}   superseded
 *
 * @typedef {Object} Confidence
 * @property {'high'|'medium'|'low'} level
 * @property {number} pct            0..100 — share of *total* weight that is evidence-backed.
 * @property {{verified:number, disclosed:number, inferred:number, silence:number, inconclusive:number}} weightByKind
 *                                   Share of total weight (0..1) in each bucket.
 *
 * @typedef {Object} ScoredResult
 * @property {number} overall                  0..100, rounded.
 * @property {string} band                     e.g. "a strong match".
 * @property {string} verdict                  One-sentence, priorities-framed.
 * @property {string} summary                  <=2-sentence plain-language summary.
 * @property {Confidence} confidence
 * @property {ScoredAttribute[]} attributes    In ATTRIBUTES order.
 * @property {AttributeKey[]} excluded         Attributes excluded from the score.
 */

/**
 * Score a product against the user's weights.
 *
 * @param {Object} input
 * @param {string} [input.productName]
 * @param {Evidence[]} input.evidence          All findings (any number per attribute).
 * @param {Weights} input.weights              Raw user weights.
 * @param {EngineConfig} [config]
 * @returns {ScoredResult}
 */
export function scoreProduct({ productName = 'This product', evidence, weights }, config = DEFAULT_CONFIG) {
  // 1. Normalise weights over the full attribute set (ignore negatives/NaN).
  const cleanWeights = normaliseWeights(weights);
  const totalWeight = sum(Object.values(cleanWeights)) || 0;

  // 2. Group evidence by attribute.
  /** @type {Record<string, Evidence[]>} */
  const byAttr = {};
  for (const a of ATTRIBUTES) byAttr[a] = [];
  for (const e of evidence) {
    if (byAttr[e.attribute]) byAttr[e.attribute].push(e);
  }

  // 3. Resolve each attribute and compute its sub-score + bookkeeping.
  /** @type {ScoredAttribute[]} */
  const attributes = [];
  let includedWeight = 0;

  // First pass: resolve winners and decide inclusion.
  const resolved = ATTRIBUTES.map((attr) => {
    const { winner, superseded, inconclusiveOnly } = resolveAttribute(byAttr[attr]);
    const rawWeight = cleanWeights[attr] || 0;
    const included = !!winner; // excluded if nothing decisive survived
    if (included) includedWeight += rawWeight;
    return { attr, winner, superseded, inconclusiveOnly, rawWeight, included };
  });

  // 4. Score: denominator = included weight only (inconclusive NEVER penalised).
  let weightedSum = 0;
  for (const r of resolved) {
    const label = ATTRIBUTE_LABELS[r.attr];
    if (!r.winner) {
      const reason = r.inconclusiveOnly
        ? 'Search was inconclusive — excluded so our retrieval limit cannot penalise the product.'
        : r.rawWeight === 0
          ? 'You gave this no weight.'
          : 'No usable evidence — excluded from the score.';
      attributes.push({
        attribute: r.attr, label, included: false, subScore: null,
        tier: null, status: r.inconclusiveOnly ? 'search_inconclusive' : 'search_inconclusive',
        source: null, basis: null, isAssumption: false,
        rawWeight: r.rawWeight, weightShare: 0, reason, winner: null, superseded: r.superseded,
      });
      continue;
    }
    const w = r.winner;
    const subScore = subScoreFor(w, config);
    const weightShare = includedWeight > 0 ? r.rawWeight / includedWeight : 0;
    weightedSum += subScore * weightShare;

    attributes.push({
      attribute: r.attr, label, included: true, subScore,
      tier: w.tier, status: w.status, source: w.source || null,
      basis: w.basis || null, isAssumption: w.tier === 'inferred',
      rawWeight: r.rawWeight, weightShare, reason: reasonFor(w, config),
      winner: w, superseded: r.superseded,
    });
  }

  const overall = Math.round(weightedSum);

  // 5. Confidence: denominator = TOTAL weight, so inconclusive drags it down
  //    without touching the score. (brief §6)
  const confidence = computeConfidence(resolved, cleanWeights, totalWeight, config);

  const band = bandFor(overall);
  const excluded = attributes.filter((a) => !a.included && a.rawWeight > 0).map((a) => a.attribute);
  const verdict = `By your priorities, ${productName} scores ${overall}/100 — ${band}.`;
  const summary = buildSummary(productName, overall, band, attributes, confidence);

  return { overall, band, verdict, summary, confidence, attributes, excluded };
}

/**
 * @param {Array<{attr:AttributeKey, winner:Evidence|null, rawWeight:number}>} resolved
 * @param {Record<AttributeKey,number>} weights
 * @param {number} totalWeight
 * @param {EngineConfig} config
 * @returns {Confidence}
 */
function computeConfidence(resolved, weights, totalWeight, config) {
  const kind = { verified: 0, disclosed: 0, inferred: 0, silence: 0, inconclusive: 0 };
  let backed = 0;
  for (const r of resolved) {
    const share = totalWeight > 0 ? r.rawWeight / totalWeight : 0;
    if (!r.winner) {
      kind.inconclusive += share;
      continue;
    }
    const cw = confidenceWeightFor(r.winner, config);
    backed += share * cw;
    if (r.winner.tier === 'verified') kind.verified += share;
    else if (r.winner.tier === 'disclosed') kind.disclosed += share;
    else if (r.winner.tier === 'inferred') kind.inferred += share;
    else kind.silence += share;
  }
  const pct = Math.round(backed * 100);
  const level = backed >= config.confidenceBands.high ? 'high' : backed >= config.confidenceBands.medium ? 'medium' : 'low';
  return { level, pct, weightByKind: kind };
}

/**
 * Plain-language reason for how a winning attribute was treated.
 * @param {Evidence} w
 * @param {EngineConfig} config
 * @returns {string}
 */
function reasonFor(w, config) {
  if (w.status === 'verified') return 'Verified by an independent third party — strongest evidence.';
  if (w.status === 'disclosed') return 'Disclosed by the company itself — credible but self-reported.';
  if (w.tier === 'inferred') return 'Assumption from a category prior (see basis). You can dismiss it.';
  if (w.status === 'not_disclosed') return `Not disclosed — counted as a low signal (${config.silenceScore}/100), weighted by your priorities.`;
  return 'Included.';
}

/** @param {number} overall @returns {string} */
function bandFor(overall) {
  if (overall >= 75) return 'a strong match';
  if (overall >= 55) return 'a moderate match';
  if (overall >= 40) return 'a weak match';
  return 'a poor match';
}

/**
 * Build a <=2-sentence plain-language summary. Deterministic by default so the
 * app runs with no API key; the research layer may instead inject an LLM-written
 * summary (brief §8 step 5). It is framed by the user's priorities, never as a
 * factual condemnation.
 * @param {string} name
 * @param {number} overall
 * @param {string} band
 * @param {ScoredAttribute[]} attrs
 * @param {Confidence} confidence
 * @returns {string}
 */
export function buildSummary(name, overall, band, attrs, confidence) {
  const included = attrs.filter((a) => a.included).sort((a, b) => b.weightShare - a.weightShare);
  const top = included[0];
  const driver = top
    ? `${top.label.toLowerCase()} (your heaviest weighting) is ${describeSub(top.subScore)} and ${top.status === 'verified' ? 'independently verified' : top.status === 'disclosed' ? 'company-disclosed' : top.isAssumption ? 'an assumption you can dismiss' : 'not disclosed'}`
    : 'no weighted attribute could be evaluated';
  const conf = `Confidence is ${confidence.level} (${confidence.pct}% of your weighting is evidence-backed).`;
  return `By your priorities, ${name} is ${band} at ${overall}/100, mainly because ${driver}. ${conf}`;
}

/** @param {number|null} sub @returns {string} */
function describeSub(sub) {
  if (sub == null) return 'unscored';
  if (sub >= 75) return 'strong';
  if (sub >= 50) return 'moderate';
  if (sub >= 30) return 'weak';
  return 'poor';
}

/* ----------------------------- small helpers ----------------------------- */

/** @param {Weights} weights @returns {Record<AttributeKey, number>} */
export function normaliseWeights(weights) {
  /** @type {Record<AttributeKey, number>} */
  const out = /** @type {any} */ ({});
  for (const a of ATTRIBUTES) {
    const v = Number(weights?.[a]);
    out[a] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  return out;
}

/** @param {number[]} xs */
function sum(xs) {
  return xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
}

/** @param {number} x @param {number} lo @param {number} hi */
function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
