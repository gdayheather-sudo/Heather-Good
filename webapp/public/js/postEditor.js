import { api } from './api.js';
import { store } from './store.js';
import { h, esc, toast, modal, confirmDialog, withLoading } from './ui.js';
import { variantCard } from './components.js';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function openPost(postId, onChange) {
  let post;
  try { post = await api.post(postId); }
  catch (err) { return toast(err.message, 'err'); }

  const statusOpts = store.statuses.map((s) => `<option value="${s.id}" ${s.id === post.status ? 'selected' : ''}>${esc(s.name)}</option>`).join('');

  const body = h(`<div>
    <div class="field">
      <label>Title</label>
      <input class="input f-title" value="${esc(post.title)}" />
    </div>
    <div class="row">
      <div class="field">
        <label>Status</label>
        <select class="input f-status">${statusOpts}</select>
      </div>
      <div class="field">
        <label>Schedule date / time</label>
        <input type="datetime-local" class="input f-sched" value="${toLocalInput(post.scheduled_at)}" />
      </div>
    </div>
    <div class="field">
      <label>Brief / concept</label>
      <textarea class="input f-concept" style="min-height:54px">${esc(post.concept || '')}</textarea>
    </div>
    <div class="field">
      <label>Notes</label>
      <textarea class="input f-notes" style="min-height:48px">${esc(post.notes || '')}</textarea>
    </div>
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="section-title" style="margin:0">Platform content</div>
      <select class="input addplat" style="max-width:200px"><option value="">+ Add platform…</option>
        ${store.platforms.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <div class="variants" style="margin-top:14px"></div>
  </div>`);

  const variantsEl = body.querySelector('.variants');
  const cards = [];
  const addCard = (v) => {
    const card = variantCard(v, {
      postId: post.id,
      removable: true,
      onRemove: () => { const i = cards.indexOf(card); if (i > -1) cards.splice(i, 1); },
      onChange: () => {}, // persisted on save
    });
    cards.push(card);
    variantsEl.appendChild(card);
  };
  (post.variants || []).forEach(addCard);

  body.querySelector('.addplat').onchange = (e) => {
    if (!e.target.value) return;
    addCard({ platform: e.target.value, body: '', hashtags: '', image_prompt: '', image_path: '' });
    e.target.value = '';
  };

  const m = modal({
    title: `${post.brand_name || 'Post'}`,
    size: 'lg',
    body,
    footer: [
      { label: 'Delete', kind: 'danger', onClick: (close) => {
        confirmDialog(`Delete “${post.title}”? This cannot be undone.`, async () => {
          await api.deletePost(post.id); close(); toast('Post deleted', 'ok'); onChange && onChange();
        });
      } },
      { label: 'Save changes', kind: 'primary', onClick: async (close, btn) => {
        await withLoading(btn, async () => {
          const sched = body.querySelector('.f-sched').value;
          await api.updatePost(post.id, {
            title: body.querySelector('.f-title').value.trim() || 'Untitled post',
            status: body.querySelector('.f-status').value,
            scheduled_at: sched ? sched : '',
            concept: body.querySelector('.f-concept').value,
            notes: body.querySelector('.f-notes').value,
          });
          // sync variants: update existing, create new, delete removed
          const present = new Set();
          for (const c of cards) {
            const d = c.getData();
            if (d.id) { present.add(d.id); await api.updateVariant(post.id, d.id, d); }
            else { const created = await api.addVariant(post.id, d); present.add(created.id); }
          }
          for (const v of post.variants) {
            if (!present.has(v.id)) await api.deleteVariant(post.id, v.id);
          }
          close();
          toast('Saved', 'ok');
          onChange && onChange();
        });
      } },
    ],
  });
  return m;
}
