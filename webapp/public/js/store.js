import { api } from './api.js';

export const store = {
  platforms: [],
  statuses: [],
  brands: [],
  providers: { anthropic: false, openai: false },
  filterBrandId: localStorage.getItem('filterBrandId') || '', // '' = all brands

  async loadMeta() {
    const m = await api.meta();
    this.platforms = m.platforms;
    this.statuses = m.statuses;
  },
  async loadBrands() {
    this.brands = await api.brands();
    return this.brands;
  },
  async loadProviders() {
    try { this.providers = await api.genStatus(); } catch { /* offline */ }
  },
  setFilter(id) {
    this.filterBrandId = id || '';
    if (id) localStorage.setItem('filterBrandId', id);
    else localStorage.removeItem('filterBrandId');
  },
  brandQuery() {
    return this.filterBrandId ? `?brand_id=${this.filterBrandId}` : '';
  },
  platform(id) { return this.platforms.find((p) => p.id === id); },
  platformName(id) { const p = this.platform(id); return p ? p.name : id; },
};
