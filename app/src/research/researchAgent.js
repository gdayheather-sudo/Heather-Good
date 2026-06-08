// @ts-check
/**
 * Research agent — the orchestration layer (brief §8).
 * ====================================================
 *
 * This is a per-product RESEARCH agent, not a static lookup. The pipeline:
 *   1. RESOLVE  the product from raw input (barcode / URL / search term).
 *   2. GATHER   evidence (Open Food Facts today; web search is a pluggable hook).
 *   3. CLASSIFY each finding into the evidence stack (done in openFoodFacts.js +
 *      gap-filling priors here). The engine then scores it.
 *   4. CACHE    the gathered evidence per product (the moat).
 *
 * It NEVER fabricates evidence. Where we have no credible signal we either emit
 * a clearly-labelled INFERRED prior (dismissible) or mark the attribute
 * search_inconclusive — the honest bug-guard distinction from brief §4.
 *
 * @module researchAgent
 */

import { ATTRIBUTES } from '../engine/scoringEngine.js';
import { fetchByBarcode, searchProducts } from './openFoodFacts.js';
import { labourPrior } from './categoryPriors.js';
import { readCache, writeCache } from './cache.js';

/** @typedef {import('./openFoodFacts.js').ResolvedProduct} ResolvedProduct */

/**
 * Classify a raw input string into a resolution strategy.
 * @param {string} raw
 * @returns {{kind:'barcode'|'url'|'search', value:string}}
 */
export function classifyInput(raw) {
  const input = raw.trim();
  const digits = input.replace(/\D/g, '');
  // A bare barcode: 8–14 digits and the input is essentially just that number.
  if (/^\d{8,14}$/.test(input)) return { kind: 'barcode', value: input };

  if (/^https?:\/\//i.test(input)) {
    // Open Food Facts URLs embed the barcode: .../product/<code>/...
    const off = input.match(/openfoodfacts\.org\/(?:[a-z-]+\/)?product\/(\d{6,14})/i);
    if (off) return { kind: 'barcode', value: off[1] };
    // Any other URL with a long digit run -> treat as a barcode guess; else
    // fall back to searching the readable slug.
    if (digits.length >= 8 && digits.length <= 14) return { kind: 'barcode', value: digits };
    const slug = decodeURIComponent(input.split('/').filter(Boolean).pop() || input)
      .replace(/[-_]+/g, ' ')
      .replace(/\.(html?|php|aspx?)$/i, '')
      .trim();
    return { kind: 'search', value: slug || input };
  }
  return { kind: 'search', value: input };
}

/**
 * Fill attribute gaps after OFF classification, honouring the bug guard.
 * For each attribute with NO evidence at all we add either a labelled INFERRED
 * prior (labour) or a search_inconclusive marker (materials, price, others) —
 * never a fabricated disclosure.
 *
 * @param {ResolvedProduct} product
 * @returns {ResolvedProduct}
 */
export function fillGaps(product) {
  const present = new Set(product.evidence.map((e) => e.attribute));
  const hasAnyCert = (product.foundCerts || []).length > 0;
  const additions = [];

  for (const attr of ATTRIBUTES) {
    if (present.has(attr)) continue;
    if (attr === 'labour') {
      // We genuinely looked for a labour cert and found none -> a defensible,
      // dismissible assumption with a visible basis.
      additions.push(labourPrior({ hasAnyCert }));
    } else if (attr === 'materials') {
      additions.push(inconclusive('materials', 'Materials are not tracked for packaged food in our current sources — not applicable, so it is excluded rather than penalised.'));
    } else if (attr === 'price') {
      additions.push(inconclusive('price', 'No price data in Open Food Facts. Excluded so a missing field cannot penalise the product.'));
    } else {
      additions.push(inconclusive(attr, 'Not found in our current sources — excluded (search inconclusive), not penalised.'));
    }
  }
  return { ...product, evidence: [...product.evidence, ...additions] };
}

/**
 * Resolve + gather + classify + cache. Cache-first: an already-researched
 * product returns instantly (and is flagged as cached for the UI).
 *
 * @param {string} rawInput
 * @param {Object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {boolean} [opts.forceRefresh]
 * @returns {Promise<{ status:'ok', product:ResolvedProduct, cached:boolean, elapsedMs:number }
 *                  | { status:'choose', candidates:Array<{id:string,name:string,brand?:string,imageUrl?:string}> }
 *                  | { status:'not_found' }
 *                  | { status:'error', message:string }>}
 */
export async function research(rawInput, opts = {}) {
  const { fetchImpl = fetch, forceRefresh = false } = opts;
  const t0 = now();
  const { kind, value } = classifyInput(rawInput);

  try {
    if (kind === 'search') {
      const candidates = await searchProducts(value, fetchImpl);
      if (candidates.length === 0) return { status: 'not_found' };
      // Let the UI pick (or auto-pick the top hit). We don't classify until a
      // specific product is chosen, to avoid wasted research.
      return { status: 'choose', candidates };
    }

    // barcode (resolved directly or extracted from a URL)
    return await researchByBarcode(value, { fetchImpl, forceRefresh, t0 });
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Research a specific, known product id (used after the user picks a candidate,
 * or directly for a barcode).
 * @param {string} id
 * @param {Object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {boolean} [opts.forceRefresh]
 * @param {number} [opts.t0]
 * @returns {Promise<{ status:'ok', product:ResolvedProduct, cached:boolean, elapsedMs:number } | { status:'not_found' } | { status:'error', message:string }>}
 */
export async function researchByBarcode(id, opts = {}) {
  const { fetchImpl = fetch, forceRefresh = false, t0 = now() } = opts;
  try {
    if (!forceRefresh) {
      const hit = readCache(id);
      if (hit) return { status: 'ok', product: hit.product, cached: true, elapsedMs: Math.round(now() - t0) };
    }
    const resolved = await fetchByBarcode(id, fetchImpl);
    if (!resolved) return { status: 'not_found' };
    const product = fillGaps(resolved);
    writeCache(id, product);
    return { status: 'ok', product, cached: false, elapsedMs: Math.round(now() - t0) };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

/* ------------------------------- helpers -------------------------------- */

function inconclusive(attribute, note) {
  return { attribute, tier: null, status: 'search_inconclusive', value: null, source: null, note };
}
function now() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
