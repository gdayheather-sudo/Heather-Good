import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc, toast, fmtDate } from '../ui.js';
import { openPost } from '../postEditor.js';

export default {
  async render(root) {
    if (!store.brands.length) await store.loadBrands();
    const board = await api.board(store.brandQuery());

    root.innerHTML = '';
    root.appendChild(h(`<div class="page-head">
      <div><h1>Pipeline</h1><p>Drag a card to move it through the process — idea to published.</p></div>
    </div>`));

    if (!store.brands.length) {
      root.appendChild(h(`<div class="card empty"><div class="big">▦</div><p>Create a brand and some posts to see your pipeline.</p>
        <a class="btn primary" style="margin-top:10px" href="#/composer">Open Composer</a></div>`));
      return;
    }

    const boardEl = h('<div class="board"></div>');
    const refresh = () => this.render(root);

    for (const status of store.statuses) {
      const items = board[status.id] || [];
      const col = h(`<div class="col" data-status="${status.id}">
        <h3>${esc(status.name)} <span class="count">${items.length}</span></h3>
        <div class="col-body"></div>
      </div>`);
      const colBody = col.querySelector('.col-body');

      for (const p of items) {
        const card = h(`<div class="pcard" draggable="true" data-id="${p.id}" style="border-left-color:${esc(p.brand_color || '#6c5ce7')}">
          <div class="title">${esc(p.title)}</div>
          <div class="meta">
            ${store.filterBrandId ? '' : `<span>${esc(p.brand_name || '')}</span>`}
            <span class="tag muted">${p.variant_count} platform${p.variant_count === 1 ? '' : 's'}</span>
            ${p.scheduled_at ? `<span>🗓 ${esc(fmtDate(p.scheduled_at, true))}</span>` : ''}
          </div>
        </div>`);
        card.onclick = () => openPost(p.id, refresh);
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', String(p.id));
          card.style.opacity = '0.4';
        });
        card.addEventListener('dragend', () => { card.style.opacity = '1'; });
        colBody.appendChild(card);
      }

      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drop');
        const id = Number(e.dataTransfer.getData('text/plain'));
        try {
          await api.updatePost(id, { status: status.id });
          toast(`Moved to ${status.name}`, 'ok');
          refresh();
        } catch (err) { toast(err.message, 'err'); }
      });

      boardEl.appendChild(col);
    }
    root.appendChild(boardEl);
  },
};
