// @ts-check
/**
 * Root application. Wires preferences -> research agent -> scoring engine -> UI,
 * and re-scores cached results LIVE whenever the user edits their weights or
 * dismisses an assumption (brief §7).
 */
import React, { html, useState, useEffect, useMemo, useCallback } from './html.js';
import { createRoot } from 'react-dom/client';
import { scoreProduct } from '../engine/scoringEngine.js';
import { research, researchByBarcode } from '../research/researchAgent.js';
import { cacheSize } from '../research/cache.js';
import { loadWeights, saveWeights, isOnboarded, setOnboarded, PRESETS, defaultWeights } from '../state/preferences.js';
import { WeightSliders, ProductResult } from './components.js';

function useWeights() {
  const [weights, setWeights] = useState(loadWeights);
  const update = useCallback((key, value) => {
    setWeights((w) => {
      const next = { ...w, [key]: value };
      saveWeights(next);
      return next;
    });
  }, []);
  const replace = useCallback((next) => {
    setWeights(next);
    saveWeights(next);
  }, []);
  return { weights, update, replace };
}

/* ------------------------------ onboarding ------------------------------ */

function Onboarding({ weights, onChange, onApplyPreset, onDone }) {
  return html`
    <div class="mx-auto max-w-xl">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 class="text-xl font-semibold text-slate-900">Set your priorities</h1>
        <p class="mt-2 text-sm text-slate-600">
          This app doesn't decide if a brand is "good" or "bad." <strong>Your weights do the judging.</strong>
          We gather the evidence and score each product <em>by your priorities</em>. Move the sliders, or start from a preset.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          ${Object.entries(PRESETS).map(([k, p]) => html`
            <button key=${k} onClick=${() => onApplyPreset(p.weights)}
              class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">
              ${p.label}
            </button>`)}
        </div>
        <div class="mt-5"><${WeightSliders} weights=${weights} onChange=${onChange} /></div>
        <button onClick=${onDone}
          class="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700">
          Start scoring →
        </button>
        <p class="mt-3 text-center text-xs text-slate-400">Stored only on this device. No account needed. Editable any time.</p>
      </div>
    </div>`;
}

/* ------------------------------ search bar ------------------------------ */

function SearchBar({ onSearch, busy }) {
  const [value, setValue] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };
  return html`
    <form onSubmit=${submit} class="flex gap-2">
      <input value=${value} onInput=${(e) => setValue(e.target.value)} disabled=${busy}
        placeholder="Search a food product, paste a barcode or a URL…"
        class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50" />
      <button type="submit" disabled=${busy || !value.trim()}
        class="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        ${busy ? 'Researching…' : 'Score it'}
      </button>
    </form>`;
}

function CandidateList({ candidates, onPick }) {
  return html`
    <div class="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pick the exact product</p>
      <ul class="divide-y divide-slate-100">
        ${candidates.map((c) => html`
          <li key=${c.id}>
            <button onClick=${() => onPick(c)} class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
              ${c.imageUrl
                ? html`<img src=${c.imageUrl} alt="" class="h-10 w-10 rounded object-cover ring-1 ring-slate-200" />`
                : html`<div class="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-300">📦</div>`}
              <div class="min-w-0">
                <div class="truncate text-sm font-medium text-slate-800">${c.name}</div>
                ${c.brand && html`<div class="truncate text-xs text-slate-400">${c.brand}</div>`}
              </div>
            </button>
          </li>`)}
      </ul>
    </div>`;
}

/* ------------------------------- root ----------------------------------- */

function App() {
  const { weights, update, replace } = useWeights();
  const [onboarded, setOnboardedState] = useState(isOnboarded);
  const [phase, setPhase] = useState('idle'); // idle|loading|choosing|result|error
  const [candidates, setCandidates] = useState([]);
  const [product, setProduct] = useState(null);
  const [meta, setMeta] = useState({ cached: false, elapsedMs: 0 });
  const [error, setError] = useState('');
  const [showWeights, setShowWeights] = useState(false);
  const [tick, setTick] = useState(0); // bump to re-score after a mutation

  // Live scoring: recompute whenever product, weights, or a dismiss/restore changes.
  const result = useMemo(() => {
    if (!product) return null;
    return scoreProduct({ productName: product.name, evidence: product.evidence, weights });
  }, [product, weights, tick]);

  const runResearch = useCallback(async (input) => {
    setPhase('loading'); setError(''); setCandidates([]); setProduct(null);
    const r = await research(input);
    if (r.status === 'choose') { setCandidates(r.candidates); setPhase('choosing'); }
    else if (r.status === 'ok') { setProduct(r.product); setMeta({ cached: r.cached, elapsedMs: r.elapsedMs }); setPhase('result'); }
    else if (r.status === 'not_found') { setError('No product found. Try a barcode or a more specific name.'); setPhase('error'); }
    else { setError(r.message || 'Something went wrong while researching.'); setPhase('error'); }
  }, []);

  const pickCandidate = useCallback(async (c) => {
    setPhase('loading');
    const r = await researchByBarcode(c.id);
    if (r.status === 'ok') { setProduct(r.product); setMeta({ cached: r.cached, elapsedMs: r.elapsedMs }); setPhase('result'); }
    else { setError(r.status === 'not_found' ? 'That product had no detail record.' : r.message); setPhase('error'); }
  }, []);

  const setDismissed = useCallback((attribute, dismissed) => {
    setProduct((p) => {
      if (!p) return p;
      const evidence = p.evidence.map((e) =>
        e.attribute === attribute && e.tier === 'inferred' ? { ...e, dismissed } : e);
      return { ...p, evidence };
    });
    setTick((t) => t + 1);
  }, []);

  if (!onboarded) {
    return html`
      <${Shell}>
        <${Onboarding}
          weights=${weights}
          onChange=${update}
          onApplyPreset=${replace}
          onDone=${() => { setOnboarded(); setOnboardedState(true); }} />
      <//>`;
  }

  return html`
    <${Shell}>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-slate-500">Scoring <strong class="text-slate-700">by your priorities</strong>.</p>
          <button onClick=${() => setShowWeights((s) => !s)} class="text-sm font-medium text-indigo-600 hover:underline">
            ${showWeights ? 'Hide priorities' : 'Edit priorities'}
          </button>
        </div>

        ${showWeights && html`
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="mb-3 flex flex-wrap gap-2">
              ${Object.entries(PRESETS).map(([k, p]) => html`
                <button key=${k} onClick=${() => replace(p.weights)}
                  class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">${p.label}</button>`)}
              <button onClick=${() => replace(defaultWeights())} class="rounded-full px-3 py-1 text-sm text-slate-400 hover:text-slate-600">reset</button>
            </div>
            <${WeightSliders} weights=${weights} onChange=${update} />
            <p class="mt-3 text-xs text-slate-400">Changes re-score the current result instantly.</p>
          </div>`}

        <${SearchBar} onSearch=${runResearch} busy=${phase === 'loading'} />

        ${phase === 'loading' && html`<${Notice} tone="info">Researching live — first lookups take a few seconds, cached ones are instant.<//>`}
        ${phase === 'error' && html`<${Notice} tone="error">${error}<//>`}
        ${phase === 'choosing' && html`<${CandidateList} candidates=${candidates} onPick=${pickCandidate} />`}
        ${phase === 'result' && product && result && html`
          <${ProductResult}
            product=${product}
            result=${result}
            cached=${meta.cached}
            elapsedMs=${meta.elapsedMs}
            onDismiss=${(a) => setDismissed(a, true)}
            onRestore=${(a) => setDismissed(a, false)} />`}

        ${phase === 'idle' && html`<${EmptyState} />`}
      </div>
    <//>`;
}

function Shell({ children }) {
  return html`
    <div class="min-h-screen bg-slate-50">
      <div class="mx-auto max-w-2xl px-4 py-8">
        <header class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Ethical Shopping Companion</h1>
          <p class="text-sm text-slate-500">Facts and independent verification — scored against <em>your</em> priorities. No star ratings, no crowd reviews.</p>
        </header>
        ${children}
        <${LegalFooter} />
      </div>
    </div>`;
}

function Notice({ tone, children }) {
  const cls = tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-indigo-200 bg-indigo-50 text-indigo-700';
  return html`<div class=${`rounded-xl border px-4 py-3 text-sm ${cls}`}>${children}</div>`;
}

function EmptyState() {
  return html`
    <div class="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
      <div class="text-3xl">🔎</div>
      <p class="mt-2 text-sm text-slate-600">Try a barcode like <code class="rounded bg-slate-100 px-1">3017620422003</code>, a product name, or paste an Open Food Facts URL.</p>
      <p class="mt-1 text-xs text-slate-400">Food first (via Open Food Facts). More categories as the engine earns trust.</p>
    </div>`;
}

function LegalFooter() {
  return html`
    <footer class="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400">
      <p>
        Every result is an <strong>opinion framed by your stated priorities</strong>, resting on the facts shown with their source and
        evidence tier — not a factual claim that any brand is "good" or "bad". Items marked <em>assumption</em> are inferred category
        priors you can dismiss; <em>not disclosed</em> means we searched and found silence; <em>searched, not found</em> is our own
        retrieval limit and never lowers a score. This is not legal advice.
      </p>
    </footer>`;
}

const rootEl = document.getElementById('root');
createRoot(rootEl).render(html`<${App} />`);
