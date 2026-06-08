// @ts-check
/**
 * Open Food Facts client + evidence mapper.
 * =========================================
 *
 * Open Food Facts (https://world.openfoodfacts.org) is a free, open database of
 * food products. It is the brief's recommended first category (§9). This module
 * does two jobs:
 *   1. Fetch a product (by barcode) or search (by text).
 *   2. CLASSIFY the raw fields into tiered Evidence the engine understands.
 *
 * Classification honesty (this is the whole legal/UX posture):
 *   - We only emit VERIFIED for genuine third-party signals (recognised cert
 *     labels, OFF's computed Eco-Score index).
 *   - On-pack facts the manufacturer supplies (ingredients, packaging) are
 *     DISCLOSED.
 *   - When a field is simply absent from OFF we do NOT claim the company is
 *     "silent" — that would be OUR retrieval limitation. We mark it
 *     search_inconclusive (the bug guard, brief §4). The research agent decides
 *     where a labelled INFERRED prior is appropriate instead.
 *
 * @module openFoodFacts
 */

/** @typedef {import('../engine/scoringEngine.js').Evidence} Evidence */

const BASE = 'https://world.openfoodfacts.org';
// OFF asks API users to identify themselves via User-Agent.
const UA = 'EthicalShoppingCompanion/0.1 (MVP; contact via app)';

/** Recognised certification label tags in OFF -> what they verify. */
const CERT_LABELS = [
  { tags: ['en:fairtrade', 'en:fairtrade-international', 'en:fair-trade', 'en:max-havelaar'], attribute: 'labour', value: 88, label: 'Fairtrade' },
  { tags: ['en:b-corporation', 'en:b-corp'], attribute: 'labour', value: 85, label: 'B Corp' },
  { tags: ['en:rainforest-alliance'], attribute: 'environmental', value: 78, label: 'Rainforest Alliance' },
  { tags: ['en:organic', 'en:eu-organic', 'en:usda-organic', 'en:fr-bio-01'], attribute: 'ingredients', value: 80, label: 'Certified Organic' },
  { tags: ['en:fsc', 'en:fsc-mix'], attribute: 'packaging', value: 80, label: 'FSC (packaging)' },
];

/**
 * @typedef {Object} ResolvedProduct
 * @property {string} id            Barcode / OFF code.
 * @property {string} name
 * @property {string} [brand]
 * @property {string} [imageUrl]
 * @property {string} url           Link to the OFF product page (a receipt).
 * @property {Evidence[]} evidence  Classified findings from OFF only.
 * @property {string[]} foundCerts  Human-readable certs detected.
 */

/**
 * Fetch a product by barcode and classify it.
 * @param {string} barcode
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<ResolvedProduct|null>}
 */
export async function fetchByBarcode(barcode, fetchImpl = fetch) {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetchImpl(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.status !== 1 || !data.product) return null;
  return mapProduct(barcode, data.product);
}

/**
 * Text search. Returns lightweight candidates (no classification yet).
 * @param {string} term
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Array<{id:string,name:string,brand?:string,imageUrl?:string}>>}
 */
export async function searchProducts(term, fetchImpl = fetch) {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=12&fields=code,product_name,brands,image_front_small_url`;
  const res = await fetchImpl(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  return products
    .filter((p) => p.code && (p.product_name || p.brands))
    .map((p) => ({
      id: String(p.code),
      name: p.product_name || `${p.brands || 'Unknown'} product`,
      brand: p.brands || undefined,
      imageUrl: p.image_front_small_url || undefined,
    }));
}

/**
 * Map a raw OFF product object into our classified shape. Exported so it can be
 * unit-tested with a fixture (no network).
 * @param {string} id
 * @param {any} p   Raw OFF product.
 * @returns {ResolvedProduct}
 */
export function mapProduct(id, p) {
  const productUrl = `${BASE}/product/${id}`;
  const src = (anchor) => ({ label: 'Open Food Facts', url: anchor ? `${productUrl}#${anchor}` : productUrl });
  /** @type {Evidence[]} */
  const evidence = [];
  const labels = toArray(p.labels_tags);
  const foundCerts = [];

  // --- VERIFIED: recognised certification labels --------------------------
  for (const cert of CERT_LABELS) {
    if (cert.tags.some((t) => labels.includes(t))) {
      foundCerts.push(cert.label);
      evidence.push({
        attribute: /** @type any */ (cert.attribute),
        tier: 'verified', status: 'verified', value: cert.value,
        source: src('labels'),
        note: `Carries the ${cert.label} label.`,
      });
    }
  }

  // --- DISCLOSED: ingredients (on-pack), graded by processing -------------
  if (p.ingredients_text && String(p.ingredients_text).trim()) {
    const nova = Number(p.nova_group); // 1 (unprocessed) .. 4 (ultra-processed)
    const additives = Number(p.additives_n);
    let value;
    if (Number.isFinite(nova)) value = { 1: 88, 2: 72, 3: 52, 4: 32 }[nova] ?? 55;
    else if (Number.isFinite(additives)) value = Math.max(25, 80 - additives * 8);
    else value = 55;
    evidence.push({
      attribute: 'ingredients', tier: 'disclosed', status: 'disclosed', value,
      source: src('ingredients'),
      note: Number.isFinite(nova)
        ? `NOVA group ${nova} (${novaText(nova)})${Number.isFinite(additives) ? `, ${additives} additive(s)` : ''}.`
        : 'Ingredients list published on pack.',
    });
  } else {
    evidence.push(inconclusive('ingredients', src('ingredients'), 'No ingredients list available in Open Food Facts.'));
  }

  // --- VERIFIED-ish: Eco-Score (OFF's computed environmental index) -------
  const eco = String(p.ecoscore_grade || '').toLowerCase();
  if (['a', 'b', 'c', 'd', 'e'].includes(eco)) {
    const value = { a: 90, b: 72, c: 54, d: 36, e: 18 }[eco];
    evidence.push({
      attribute: 'environmental', tier: 'verified', status: 'verified', value,
      source: { label: 'Open Food Facts Eco-Score', url: `${productUrl}#ecoscore` },
      note: `Eco-Score ${eco.toUpperCase()} (independent index combining lifecycle impact & packaging).`,
    });
  } else if (!evidence.some((e) => e.attribute === 'environmental')) {
    evidence.push(inconclusive('environmental', src('ecoscore'), 'No Eco-Score computed for this product yet.'));
  }

  // --- DISCLOSED: packaging ----------------------------------------------
  const packaging = p.packaging || (Array.isArray(p.packagings) && p.packagings.length ? p.packagings.map((x) => x.material || x.shape).filter(Boolean).join(', ') : '');
  if (packaging && String(packaging).trim()) {
    const value = packagingScore(String(packaging).toLowerCase());
    evidence.push({
      attribute: 'packaging', tier: 'disclosed', status: 'disclosed', value,
      source: src('packaging'),
      note: `Packaging declared: ${truncate(String(packaging), 80)}.`,
    });
  } else if (!evidence.some((e) => e.attribute === 'packaging')) {
    evidence.push(inconclusive('packaging', src('packaging'), 'No packaging details published in Open Food Facts.'));
  }

  // Note: labour (when no cert), materials, and price are intentionally left
  // for the research agent to handle (priors / inconclusive). OFF rarely holds
  // them, and silence here is OUR limitation, not the company's.

  const name = p.product_name || (p.brands ? `${p.brands} product` : `Product ${id}`);
  return {
    id, name, brand: p.brands || undefined,
    imageUrl: p.image_front_url || p.image_url || undefined,
    url: productUrl, evidence, foundCerts,
  };
}

/* ------------------------------- helpers -------------------------------- */

/** @param {string} attribute @param {{label:string,url:string}} source @param {string} note @returns {Evidence} */
function inconclusive(attribute, source, note) {
  return { attribute: /** @type any */ (attribute), tier: null, status: 'search_inconclusive', value: null, source, note };
}

/** Crude packaging recyclability heuristic from the declared material string. */
function packagingScore(s) {
  if (/(glass|aluminium|aluminum|steel|cardboard|paper|carton)/.test(s)) return 75;
  if (/(pet|hdpe|recyclable)/.test(s)) return 60;
  if (/(plastic|film|composite|tetra|multi-?layer|pouch)/.test(s)) return 40;
  return 55;
}

function novaText(n) {
  return { 1: 'unprocessed / minimally processed', 2: 'processed culinary ingredient', 3: 'processed food', 4: 'ultra-processed' }[n] || 'unknown';
}
function toArray(x) { return Array.isArray(x) ? x : []; }
function truncate(s, n) { return s.length > n ? `${s.slice(0, n - 1)}…` : s; }
