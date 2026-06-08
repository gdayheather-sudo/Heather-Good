// @ts-check
/**
 * Category priors — the ONLY place INFERRED assumptions are minted.
 * ================================================================
 *
 * An INFERRED prior is the weakest tier (brief §3). It is a *placeholder until
 * evidence arrives*, never a verdict, and it must ALWAYS ship with a visible,
 * dismissible basis (brief §5). The research agent uses these only to fill gaps
 * where no VERIFIED or DISCLOSED evidence exists for an attribute; the engine's
 * override rule then discards the prior the moment real evidence shows up.
 *
 * Keeping priors as data (not logic) makes them auditable and easy to tune
 * without touching the engine.
 *
 * @module categoryPriors
 */

/**
 * @typedef {import('../engine/scoringEngine.js').AttributeKey} AttributeKey
 * @typedef {import('../engine/scoringEngine.js').Evidence} Evidence
 */

/**
 * Build an INFERRED evidence object with a mandatory visible basis.
 * @param {AttributeKey} attribute
 * @param {number} value
 * @param {string} basis
 * @returns {Evidence}
 */
export function inferred(attribute, value, basis) {
  return {
    attribute,
    tier: 'inferred',
    status: 'not_disclosed', // the company is silent; the value is our estimate
    value,
    source: null,
    basis,
    note: 'Assumption — dismiss to remove it from your score.',
    dismissed: false,
  };
}

/**
 * Labour prior for a packaged-food product with no recognised labour/wage
 * certification found in the source data. Deliberately conservative and clearly
 * an assumption. The basis is rendered verbatim in the UI.
 *
 * @param {{ hasAnyCert: boolean }} ctx
 * @returns {Evidence}
 */
export function labourPrior({ hasAnyCert }) {
  const basis = hasAnyCert
    ? 'No recognised fair-labour or living-wage certification (e.g. Fairtrade) was found for this product in Open Food Facts, though it carries other certifications. Assumption: labour conditions are undisclosed and unverified.'
    : 'No recognised fair-labour or living-wage certification (e.g. Fairtrade) and no published supply-chain transparency were found in Open Food Facts. Assumption: conventional, undisclosed supply chain.';
  return inferred('labour', 30, basis);
}

/**
 * Materials does not meaningfully apply to most packaged food (it is a fashion /
 * durable-goods attribute). We return null so the research agent marks it
 * search_inconclusive rather than inventing a signal.
 * @returns {null}
 */
export function materialsPrior() {
  return null;
}
