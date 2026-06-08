// @ts-check
/**
 * Evidence cache — "the proprietary moat" (brief §8).
 * ===================================================
 *
 * The per-product evidence we gather is expensive to produce (live research).
 * Caching it keyed by the product identifier (barcode/OFF code) makes the app
 * faster and cheaper over time and becomes an asset independent of the app: the
 * next user who looks up the same product gets an instant, already-researched
 * answer instead of a fresh round of API + web-search calls.
 *
 * For the MVP this is localStorage (brief §7 "store locally"). The interface is
 * deliberately tiny so it can be swapped for a shared serverless KV store later
 * without touching callers.
 *
 * @module cache
 */

const KEY_PREFIX = 'esc:evidence:';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days — stale evidence is re-gathered.

/** @returns {Storage|null} */
function store() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // private mode / disabled storage
  }
}

/**
 * @param {string} id
 * @returns {{ product: any, cachedAt: number }|null}
 */
export function readCache(id) {
  const s = store();
  if (!s || !id) return null;
  try {
    const raw = s.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      s.removeItem(KEY_PREFIX + id);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {string} id
 * @param {any} product   The ResolvedProduct (incl. its evidence array).
 */
export function writeCache(id, product) {
  const s = store();
  if (!s || !id) return;
  try {
    s.setItem(KEY_PREFIX + id, JSON.stringify({ product, cachedAt: Date.now() }));
  } catch {
    /* quota / disabled — caching is best-effort, never fatal */
  }
}

/** Diagnostics for the UI ("N products cached"). @returns {number} */
export function cacheSize() {
  const s = store();
  if (!s) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(KEY_PREFIX)) n++;
  }
  return n;
}

export function clearCache() {
  const s = store();
  if (!s) return;
  const keys = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => s.removeItem(k));
}
