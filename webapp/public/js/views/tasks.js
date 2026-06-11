import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc, toast, modal, confirmDialog, relativeDue, withLoading } from '../ui.js';

function taskForm(task = {}) {
  const brandOpts = ['<option value="">No brand</option>']
    .concat(store.brands.map((b) => `<option value="${b.id}" ${String(b.id) === String(task.brand_id) ? 'selected' : ''}>${esc(b.name)}</option>`)).join('');
  return h(`<div>
    <div class="field"><label>Task *</label><input class="input f-title" value="${esc(task.title || '')}" placeholder="e.g. Approve August launch posts" /></div>
    <div class="row">
      <div class="field"><label>Brand</label><select class="input f-brand">${brandOpts}</select></div>
      <div class="field"><label>Priority</label><select class="input f-priority">
        ${['high', 'normal', 'low'].map((p) => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}
      </select></div>
      <div class="field"><label>Due date</label><input type="date" class="input f-due" value="${esc((task.due_date || '').slice(0, 10))}" /></div>
    </div>
    <div class="field"><label>Notes</label><textarea class="input f-notes" style="min-height:48px">${esc(task.notes || '')}</textarea></div>
  </div>`);
}

function openTask(task, onDone) {
  const form = taskForm(task);
  const isEdit = !!task.id;
  modal({
    title: isEdit ? 'Edit task' : 'New task', body: form,
    footer: [
      ...(isEdit ? [{ label: 'Delete', kind: 'danger', onClick: (c) => confirmDialog('Delete this task?', async () => { await api.deleteTask(task.id); c(); onDone(); }) }] : []),
      { label: 'Cancel', onClick: (c) => c() },
      { label: isEdit ? 'Save' : 'Add task', kind: 'primary', onClick: (close, btn) => withLoading(btn, async () => {
        const data = {
          title: form.querySelector('.f-title').value.trim(),
          brand_id: form.querySelector('.f-brand').value || null,
          priority: form.querySelector('.f-priority').value,
          due_date: form.querySelector('.f-due').value || null,
          notes: form.querySelector('.f-notes').value,
        };
        if (!data.title) return toast('Task title is required', 'err');
        try { isEdit ? await api.updateTask(task.id, data) : await api.createTask(data); close(); onDone(); }
        catch (err) { toast(err.message, 'err'); }
      }) },
    ],
  });
}

export default {
  async render(root) {
    if (!store.brands.length) await store.loadBrands();
    const q = store.brandQuery();
    const tasks = await api.tasks(q);

    root.innerHTML = '';
    const head = h(`<div class="page-head">
      <div><h1>To-do</h1><p>Everything that needs your attention, across ${store.filterBrandId ? 'this brand' : 'all brands'}.</p></div>
      <button class="btn primary" id="new">+ New task</button>
    </div>`);
    head.querySelector('#new').onclick = () => openTask({ brand_id: store.filterBrandId }, () => this.render(root));
    root.appendChild(head);

    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);

    if (!tasks.length) {
      root.appendChild(h(`<div class="card empty"><div class="big">✓</div><p>Nothing on the list. Add a task to track what needs doing.</p></div>`));
      return;
    }

    const renderRow = (t) => {
      const due = t.due_date ? relativeDue(t.due_date) : null;
      const row = h(`<div class="lrow">
        <div class="check ${t.done ? 'done' : ''}">${t.done ? '✓' : ''}</div>
        <div class="grow">
          <div class="t" style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(t.title)}</div>
          <div class="s">
            ${t.brand_name ? esc(t.brand_name) + ' · ' : ''}
            <span class="tag ${t.priority === 'high' ? '' : 'muted'}">${esc(t.priority)}</span>
            ${due ? ` · <span style="${due.cls === 'over' ? 'color:var(--danger);font-weight:600' : ''}">${esc(due.text)}</span>` : ''}
            ${t.post_title ? ' · ↪ ' + esc(t.post_title) : ''}
          </div>
        </div>
        <button class="btn ghost sm edit">Edit</button>
      </div>`);
      row.querySelector('.check').onclick = async () => { await api.updateTask(t.id, { done: !t.done }); this.render(root); };
      row.querySelector('.edit').onclick = () => openTask(t, () => this.render(root));
      return row;
    };

    if (open.length) {
      const c = h('<div class="card list"></div>');
      open.forEach((t) => c.appendChild(renderRow(t)));
      root.appendChild(c);
    }
    if (done.length) {
      root.appendChild(h(`<div class="section-title">Done (${done.length})</div>`));
      const c = h('<div class="card list"></div>');
      done.forEach((t) => c.appendChild(renderRow(t)));
      root.appendChild(c);
    }
  },
};
