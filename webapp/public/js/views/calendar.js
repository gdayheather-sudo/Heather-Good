import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc } from '../ui.js';
import { openPost } from '../postEditor.js';

let cursor = new Date(); // first day shown month

function ymd(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default {
  async render(root) {
    if (!store.brands.length) await store.loadBrands();

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const gridStart = new Date(year, month, 1 - startDow);
    const from = ymd(gridStart);
    const to = ymd(new Date(year, month, 42 - startDow));

    const q = `?from=${from}&to=${to}` + (store.filterBrandId ? `&brand_id=${store.filterBrandId}` : '');
    const posts = await api.calendar(q);
    const byDay = {};
    for (const p of posts) {
      const key = (p.scheduled_at || '').slice(0, 10);
      (byDay[key] || (byDay[key] = [])).push(p);
    }

    root.innerHTML = '';
    const head = h(`<div class="page-head">
      <div><h1>Calendar</h1><p>Scheduled posts ${store.filterBrandId ? 'for this brand' : 'across all brands'}.</p></div>
    </div>`);
    root.appendChild(head);

    const monthName = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const bar = h(`<div class="cal-head">
      <button class="btn sm" id="prev">‹</button>
      <button class="btn sm" id="today">Today</button>
      <button class="btn sm" id="next">›</button>
      <div class="month">${esc(monthName)}</div>
    </div>`);
    bar.querySelector('#prev').onclick = () => { cursor = new Date(year, month - 1, 1); this.render(root); };
    bar.querySelector('#next').onclick = () => { cursor = new Date(year, month + 1, 1); this.render(root); };
    bar.querySelector('#today').onclick = () => { cursor = new Date(); this.render(root); };
    root.appendChild(bar);

    const cal = h('<div class="calendar"></div>');
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => cal.appendChild(h(`<div class="cal-dow">${d}</div>`)));

    const todayKey = ymd(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const key = ymd(d);
      const inMonth = d.getMonth() === month;
      const cell = h(`<div class="cal-cell ${inMonth ? '' : 'muted'} ${key === todayKey ? 'today' : ''}">
        <div class="day">${d.getDate()}</div></div>`);
      for (const p of byDay[key] || []) {
        const ev = h(`<div class="cal-ev" style="background:${esc(p.brand_color || '#6c5ce7')}" title="${esc(p.title)}">${esc(p.title)}</div>`);
        ev.onclick = () => openPost(p.id, () => this.render(root));
        cell.appendChild(ev);
      }
      cal.appendChild(cell);
    }
    root.appendChild(cal);

    if (!posts.length) {
      root.appendChild(h(`<div class="muted-text" style="text-align:center;margin-top:18px">
        No scheduled posts this month. Set a schedule date on any post (in the Composer or Pipeline) to see it here.</div>`));
    }
  },
};
