// @ts-check
/**
 * Presentational components. All copy is written to the legal posture (brief
 * §12): output is "by your priorities", assumptions are labelled and dismissible,
 * and every value shows its tier, status and source ("the receipts", §6).
 */
import { html } from './html.js';
import { ATTRIBUTE_LABELS } from '../engine/scoringEngine.js';

/* --------------------------- tiny atoms --------------------------------- */

const TIER_STYLE = {
  verified: { cls: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20', label: 'Verified' },
  disclosed: { cls: 'bg-sky-100 text-sky-800 ring-sky-600/20', label: 'Disclosed' },
  inferred: { cls: 'bg-amber-100 text-amber-800 ring-amber-600/20', label: 'Inferred' },
};

export function TierBadge({ tier, status }) {
  if (!tier) {
    if (status === 'not_disclosed') {
      return html`<span class="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20">Not disclosed</span>`;
    }
    return html`<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">Searched, not found</span>`;
  }
  const s = TIER_STYLE[tier];
  return html`<span class=${`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>${s.label}</span>`;
}

const STATUS_LABEL = {
  verified: 'third-party verified',
  disclosed: 'company-disclosed',
  not_disclosed: 'not disclosed',
  search_inconclusive: 'searched, not found',
};

export function ConfidenceBadge({ confidence }) {
  const map = {
    high: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    low: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  };
  return html`
    <div class=${`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${map[confidence.level]}`}
         title="How much of your weighting is backed by verified / disclosed evidence vs inferred or not found.">
      <span class="capitalize">${confidence.level} confidence</span>
      <span class="opacity-70">·</span>
      <span>${confidence.pct}% evidence-backed</span>
    </div>`;
}

export function ScoreRing({ value }) {
  const hue = value >= 75 ? '#059669' : value >= 55 ? '#0284c7' : value >= 40 ? '#d97706' : '#e11d48';
  const deg = Math.round((value / 100) * 360);
  return html`
    <div class="relative h-28 w-28 shrink-0" aria-label=${`Score ${value} out of 100`}>
      <div class="h-28 w-28 rounded-full" style=${{ background: `conic-gradient(${hue} ${deg}deg, #e2e8f0 ${deg}deg)` }}></div>
      <div class="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
        <span class="text-3xl font-bold tabular-nums" style=${{ color: hue }}>${value}</span>
        <span class="text-[10px] uppercase tracking-wide text-slate-400">/ 100</span>
      </div>
    </div>`;
}

/* --------------------------- attribute breakdown ------------------------ */

export function AttributeRow({ attr, onDismiss, onRestore }) {
  const weightPct = Math.round(attr.weightShare * 100);
  return html`
    <li class="px-4 py-3 sm:px-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium text-slate-800">${attr.label}</span>
            <${TierBadge} tier=${attr.tier} status=${attr.status} />
            ${attr.included
              ? html`<span class="text-xs text-slate-400">weight in score: ${weightPct}%</span>`
              : html`<span class="text-xs italic text-slate-400">excluded from score</span>`}
          </div>
          <p class="mt-1 text-sm text-slate-500">${attr.reason}</p>
          ${attr.winner?.note && html`<p class="mt-0.5 text-xs text-slate-400">${attr.winner.note}</p>`}
          ${attr.isAssumption && attr.basis && html`
            <div class="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <span class="font-semibold">Assumption — basis: </span>${attr.basis}
              ${attr.winner?.dismissed
                ? html`<button class="ml-2 font-medium text-amber-700 underline" onClick=${() => onRestore(attr.attribute)}>restore</button>`
                : html`<button class="ml-2 font-medium text-amber-700 underline" onClick=${() => onDismiss(attr.attribute)}>dismiss</button>`}
            </div>`}
          ${attr.source && html`
            <div class="mt-1 text-xs">
              ${attr.source.url
                ? html`<a class="text-sky-600 underline" href=${attr.source.url} target="_blank" rel="noreferrer">${attr.source.label} ↗</a>`
                : html`<span class="text-slate-400">${attr.source.label}</span>`}
            </div>`}
        </div>
        <div class="text-right">
          ${attr.included
            ? html`<span class="text-lg font-semibold tabular-nums text-slate-700">${attr.subScore}</span>`
            : html`<span class="text-lg text-slate-300">—</span>`}
        </div>
      </div>
    </li>`;
}

export function ProductResult({ product, result, cached, elapsedMs, onDismiss, onRestore }) {
  return html`
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-start gap-4 p-5">
        ${product.imageUrl
          ? html`<img src=${product.imageUrl} alt="" class="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />`
          : html`<div class="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-300">📦</div>`}
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold text-slate-900">${product.name}</h2>
          ${product.brand && html`<p class="text-sm text-slate-500">${product.brand}</p>`}
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <${ConfidenceBadge} confidence=${result.confidence} />
            <span class=${`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cached ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
              ${cached ? `Instant · cached` : `Live research · ${(elapsedMs / 1000).toFixed(1)}s`}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-5 border-t border-slate-100 bg-slate-50/60 px-5 py-5">
        <${ScoreRing} value=${result.overall} />
        <div>
          <p class="text-base font-semibold text-slate-800">${result.verdict}</p>
          <p class="mt-1 text-sm text-slate-600">${result.summary}</p>
        </div>
      </div>

      <div class="border-t border-slate-100">
        <div class="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          The receipts — every value · tier · status · source
        </div>
        <ul class="divide-y divide-slate-100">
          ${result.attributes.map((a) => html`<${AttributeRow} key=${a.attribute} attr=${a} onDismiss=${onDismiss} onRestore=${onRestore} />`)}
        </ul>
      </div>
    </div>`;
}

/* --------------------------- preferences UI ----------------------------- */

export function WeightSliders({ weights, onChange }) {
  const total = Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0) || 1;
  return html`
    <div class="space-y-4">
      ${Object.keys(ATTRIBUTE_LABELS).map((key) => {
        const v = Number(weights[key]) || 0;
        const share = Math.round((v / total) * 100);
        return html`
          <div key=${key}>
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium text-slate-700">${ATTRIBUTE_LABELS[key]}</label>
              <span class="text-xs text-slate-400">${share}% of your judgement</span>
            </div>
            <div class="flex items-center gap-3">
              <input type="range" min="0" max="100" value=${v}
                class="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
                onInput=${(e) => onChange(key, Number(e.target.value))} />
              <span class="w-8 text-right text-sm tabular-nums text-slate-600">${v}</span>
            </div>
          </div>`;
      })}
    </div>`;
}
