import { store } from './store.js';
import { esc, toast } from './ui.js';

import dashboard from './views/dashboard.js';
import composer from './views/composer.js';
import pipeline from './views/pipeline.js';
import calendar from './views/calendar.js';
import tasks from './views/tasks.js';
import brands from './views/brands.js';
import settings from './views/settings.js';

const routes = { dashboard, composer, pipeline, calendar, tasks, brands, settings };
const viewEl = document.getElementById('view');

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  return hash.split('/')[0];
}

async function render() {
  const route = currentRoute();
  document.querySelectorAll('#nav a, .settings-link').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  const view = routes[route] || dashboard;
  viewEl.innerHTML = '<div class="empty"><div class="spinner" style="border-color:#ccc;border-top-color:#6c5ce7;width:26px;height:26px"></div></div>';
  try {
    await view.render(viewEl);
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="empty"><div class="big">⚠</div><p>${esc(err.message || 'Failed to load this page.')}</p></div>`;
  }
}

function renderBrandFilter() {
  const sel = document.getElementById('brandFilter');
  const opts = ['<option value="">All brands</option>']
    .concat(store.brands.map((b) => `<option value="${b.id}" ${String(b.id) === String(store.filterBrandId) ? 'selected' : ''}>${esc(b.name)}</option>`));
  sel.innerHTML = opts.join('');
  sel.onchange = () => { store.setFilter(sel.value); render(); };
}

function renderProviderBadges() {
  const el = document.getElementById('providerBadges');
  const p = store.providers;
  el.innerHTML = `
    <span class="pbadge ${p.anthropic ? 'on' : ''}" title="Claude / Anthropic"><span class="dot"></span>Claude</span>
    <span class="pbadge ${p.openai ? 'on' : ''}" title="ChatGPT / OpenAI"><span class="dot"></span>OpenAI</span>`;
}

// expose refreshers so views can trigger global UI updates after changes
export const app = {
  render,
  refreshBrandFilter: renderBrandFilter,
  refreshProviders: async () => { await store.loadProviders(); renderProviderBadges(); },
  async reloadBrands() { await store.loadBrands(); renderBrandFilter(); },
};
window.__app = app;

async function boot() {
  try {
    await Promise.all([store.loadMeta(), store.loadBrands(), store.loadProviders()]);
  } catch (err) {
    toast('Could not reach the server. Is it running?', 'err');
  }
  renderBrandFilter();
  renderProviderBadges();
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/dashboard';
  render();
}

boot();
