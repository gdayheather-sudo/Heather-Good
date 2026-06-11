import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc, fmtDate, relativeDue, statusPill } from '../ui.js';
import { openPost } from '../postEditor.js';

export default {
  async render(root) {
    if (!store.brands.length) await store.loadBrands();
    const q = store.brandQuery();
    const [posts, tasks, upcoming] = await Promise.all([
      api.posts(q),
      api.tasks(q + (q ? '&' : '?') + 'done=0'),
      api.calendar(q + (q ? '&' : '?') + `from=${new Date().toISOString().slice(0, 10)}`),
    ]);

    const count = (s) => posts.filter((p) => p.status === s).length;
    const needsAttention = posts.filter((p) => p.status === 'in_review');

    root.innerHTML = '';
    const brandName = store.filterBrandId ? (store.brands.find((b) => String(b.id) === String(store.filterBrandId)) || {}).name : '';
    root.appendChild(h(`<div class="page-head">
      <div><h1>${brandName ? esc(brandName) : 'Dashboard'}</h1><p>Your social command centre${brandName ? '' : ' across all brands'}.</p></div>
      <a class="btn primary" href="#/composer">✎ Compose a post</a>
    </div>`));

    if (!store.brands.length) {
      root.appendChild(h(`<div class="card empty"><div class="big">✦</div>
        <p>Welcome to Social Studio. Start by creating a brand, then compose your first post.</p>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
          <a class="btn primary" href="#/brands">Create a brand</a>
          <a class="btn" href="#/settings">Add API keys</a>
        </div></div>`));
      return;
    }

    // stat cards
    const stats = h(`<div class="grid cols-4" style="margin-bottom:8px">
      <div class="card stat"><span class="ic">✎</span><div class="n">${count('draft')}</div><div class="l">Drafts</div></div>
      <div class="card stat"><span class="ic">◷</span><div class="n">${needsAttention.length}</div><div class="l">In review</div></div>
      <div class="card stat"><span class="ic">🗓</span><div class="n">${count('scheduled')}</div><div class="l">Scheduled</div></div>
      <div class="card stat"><span class="ic">✓</span><div class="n">${tasks.length}</div><div class="l">Open to-dos</div></div>
    </div>`);
    root.appendChild(stats);

    const cols = h('<div class="grid" style="grid-template-columns:1fr 1fr;align-items:start"></div>');

    // Needs attention (review + tasks)
    const left = h(`<div><div class="section-title" style="margin-top:10px">Needs your attention</div></div>`);
    const attnCard = h('<div class="card list"></div>');
    let any = false;
    for (const p of needsAttention.slice(0, 5)) {
      any = true;
      const row = h(`<div class="lrow"><div class="grow"><div class="t">${esc(p.title)}</div>
        <div class="s">${store.filterBrandId ? '' : esc(p.brand_name || '') + ' · '}Awaiting review</div></div>
        ${statusPill(p.status, store.statuses)}</div>`);
      row.style.cursor = 'pointer';
      row.onclick = () => openPost(p.id, () => this.render(root));
      attnCard.appendChild(row);
    }
    for (const t of tasks.slice(0, 6)) {
      any = true;
      const due = t.due_date ? relativeDue(t.due_date) : null;
      const row = h(`<div class="lrow">
        <div class="check"></div>
        <div class="grow"><div class="t">${esc(t.title)}</div>
        <div class="s">${t.brand_name ? esc(t.brand_name) + ' · ' : ''}<span class="tag ${t.priority === 'high' ? '' : 'muted'}">${esc(t.priority)}</span>${due ? ' · <span style="' + (due.cls === 'over' ? 'color:var(--danger);font-weight:600' : '') + '">' + esc(due.text) + '</span>' : ''}</div></div>
      </div>`);
      row.querySelector('.check').onclick = async () => { await api.updateTask(t.id, { done: true }); this.render(root); };
      attnCard.appendChild(row);
    }
    if (!any) attnCard.appendChild(h('<div class="lrow"><div class="grow muted-text">All clear — nothing needs attention. 🎉</div></div>'));
    left.appendChild(attnCard);
    left.appendChild(h('<div style="margin-top:10px"><a class="btn ghost sm" href="#/tasks">View all to-dos →</a></div>'));
    cols.appendChild(left);

    // Upcoming schedule
    const right = h(`<div><div class="section-title" style="margin-top:10px">Coming up</div></div>`);
    const upCard = h('<div class="card list"></div>');
    if (!upcoming.length) {
      upCard.appendChild(h('<div class="lrow"><div class="grow muted-text">Nothing scheduled. Plan a post in the Composer.</div></div>'));
    }
    for (const p of upcoming.slice(0, 7)) {
      const row = h(`<div class="lrow" style="cursor:pointer">
        <div style="width:6px;height:34px;border-radius:4px;background:${esc(p.brand_color || '#6c5ce7')}"></div>
        <div class="grow"><div class="t">${esc(p.title)}</div>
        <div class="s">${(p.platforms || []).map((x) => esc(store.platformName(x))).join(', ')}</div></div>
        <div class="muted-text" style="text-align:right">${esc(fmtDate(p.scheduled_at, true))}</div>
      </div>`);
      row.onclick = () => openPost(p.id, () => this.render(root));
      upCard.appendChild(row);
    }
    right.appendChild(upCard);
    right.appendChild(h('<div style="margin-top:10px"><a class="btn ghost sm" href="#/calendar">Open calendar →</a></div>'));
    cols.appendChild(right);

    root.appendChild(cols);

    // recent posts
    if (posts.length) {
      root.appendChild(h('<div class="section-title">Recent posts</div>'));
      const list = h('<div class="card list"></div>');
      for (const p of posts.slice(0, 8)) {
        const row = h(`<div class="lrow" style="cursor:pointer">
          <div style="width:6px;height:34px;border-radius:4px;background:${esc(p.brand_color || '#6c5ce7')}"></div>
          <div class="grow"><div class="t">${esc(p.title)}</div>
          <div class="s">${store.filterBrandId ? '' : esc(p.brand_name || '') + ' · '}${p.variant_count} platform${p.variant_count === 1 ? '' : 's'} · updated ${esc(fmtDate(p.updated_at, true))}</div></div>
          ${statusPill(p.status, store.statuses)}
        </div>`);
        row.onclick = () => openPost(p.id, () => this.render(root));
        list.appendChild(row);
      }
      root.appendChild(list);
    }
  },
};
