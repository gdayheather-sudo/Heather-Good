// @ts-check
/**
 * User preferences — the weights that DO THE JUDGING (brief §7).
 * =============================================================
 *
 * Stored locally (no accounts in the MVP, brief §13). Weights are a 0..100
 * allocation per attribute; the engine normalises them, so they need not sum to
 * exactly 100. Editable any time; the UI re-scores cached results live.
 *
 * @module preferences
 */

import { ATTRIBUTES } from '../engine/scoringEngine.js';

const KEY = 'esc:weights';
const FLAG = 'esc:onboarded';

/** Even split across all attributes — a neutral starting point. */
export function defaultWeights() {
  const per = Math.round(100 / ATTRIBUTES.length);
  /** @type {Record<string, number>} */
  const w = {};
  for (const a of ATTRIBUTES) w[a] = per;
  return w;
}

/**
 * Named presets. These exist mainly to *demonstrate the core principle*: the
 * same product evidence yields very different scores depending on the lens.
 */
export const PRESETS = {
  balanced: { label: 'Balanced', weights: defaultWeights() },
  ethicsFirst: {
    label: 'Ethics-first',
    weights: { ingredients: 10, materials: 10, packaging: 15, environmental: 25, labour: 35, price: 5 },
  },
  priceFirst: {
    label: 'Price-first',
    weights: { ingredients: 15, materials: 5, packaging: 5, environmental: 5, labour: 5, price: 65 },
  },
  planetFirst: {
    label: 'Planet-first',
    weights: { ingredients: 10, materials: 10, packaging: 25, environmental: 45, labour: 5, price: 5 },
  },
  ingredientsFirst: {
    label: 'Clean ingredients',
    weights: { ingredients: 55, materials: 5, packaging: 10, environmental: 15, labour: 10, price: 5 },
  },
};

/** @returns {Record<string, number>} */
export function loadWeights() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWeights();
    const parsed = JSON.parse(raw);
    const out = defaultWeights();
    for (const a of ATTRIBUTES) {
      const v = Number(parsed?.[a]);
      if (Number.isFinite(v) && v >= 0) out[a] = v;
    }
    return out;
  } catch {
    return defaultWeights();
  }
}

/** @param {Record<string, number>} weights */
export function saveWeights(weights) {
  try {
    localStorage.setItem(KEY, JSON.stringify(weights));
  } catch {
    /* storage disabled — non-fatal */
  }
}

export function isOnboarded() {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function setOnboarded() {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* non-fatal */
  }
}
