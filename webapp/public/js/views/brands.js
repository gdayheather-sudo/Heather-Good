import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc, toast, modal, confirmDialog, withLoading } from '../ui.js';

function brandForm(brand = {}) {
  return h(`<div>
    <div class="field"><label>Brand name *</label><input class="input f-name" value="${esc(brand.name || '')}" placeholder="e.g. Big Little Pup Club" /></div>
    <div class="field"><label>What they do <span class="hint">— short description</span></label><textarea class="input f-description" style="min-height:54px">${esc(brand.description || '')}</textarea></div>
    <div class="field"><label>Voice & tone <span class="hint">— how they sound</span></label><textarea class="input f-voice" style="min-height:54px" placeholder="warm, playful, relatable…">${esc(brand.voice || '')}</textarea></div>
    <div class="field"><label>Audience</label><input class="input f-audience" value="${esc(brand.audience || '')}" placeholder="dog moms who treat their pets like family" /></div>
    <div class="field"><label>Brand guidelines / rules <span class="hint">— do's & don'ts</span></label><textarea class="input f-guidelines" style="min-height:64px">${esc(brand.guidelines || '')}</textarea></div>
    <div class="row">
      <div class="field"><label>Website</label><input class="input f-website" value="${esc(brand.website || '')}" placeholder="https://…" /></div>
      <div class="field"><label>Primary colour</label><input type="color" class="input f-color_primary" style="height:42px;padding:4px" value="${esc(brand.color_primary || '#6c5ce7')}" /></div>
      <div class="field"><label>Accent colour</label><input type="color" class="input f-color_secondary" style="height:42px;padding:4px" value="${esc(brand.color_secondary || '#00b894')}" /></div>
    </div>
  </div>`);
}

function readForm(formEl) {
  const data = {};
  for (const f of ['name', 'description', 'voice', 'audience', 'guidelines', 'website', 'color_primary', 'color_secondary']) {
    const el = formEl.querySelector('.f-' + f);
    if (el) data[f] = el.value;
  }
  return data;
}

function openCreate(onDone) {
  const form = brandForm();
  modal({
    title: 'New brand', size: 'lg', body: form,
    footer: [
      { label: 'Cancel', onClick: (c) => c() },
      { label: 'Create brand', kind: 'primary', onClick: (close, btn) => withLoading(btn, async () => {
        const data = readForm(form);
        if (!data.name.trim()) return toast('Brand name is required', 'err');
        try { await api.createBrand(data); close(); toast('Brand created', 'ok'); onDone(); }
        catch (err) { toast(err.message, 'err'); }
      }) },
    ],
  });
}

async function openEdit(id, onDone) {
  const brand = await api.brand(id);
  const form = brandForm(brand);

  // assets section
  const assetsBox = h(`<div style="margin-top:8px">
    <div class="divider"></div>
    <div class="section-title" style="margin-top:0">Examples & reference images
      <span class="hint" style="font-weight:400">— help the AI learn this brand</span></div>
    <div class="row" style="align-items:flex-end">
      <div class="field" style="flex:2"><label>Add an example / reference</label>
        <input class="input a-caption" placeholder="Caption or note (e.g. a great past post)" /></div>
      <div class="field" style="flex:1"><label>Type</label>
        <select class="input a-kind"><option value="example">Example post (text)</option><option value="reference">Reference image</option><option value="logo">Logo</option></select></div>
      <div class="field" style="flex:0 0 auto"><label>Image</label>
        <label class="btn" style="margin:0">⬆ File<input type="file" accept="image/*" hidden class="a-file"></label></div>
      <div class="field" style="flex:0 0 auto"><label>&nbsp;</label>
        <button class="btn primary a-add" data-loading="Adding…">Add</button></div>
    </div>
    <div class="asset-list grid cols-3" style="margin-top:8px"></div>
  </div>`);

  const list = assetsBox.querySelector('.asset-list');
  const fileBtnLabel = assetsBox.querySelector('.a-file').closest('label');
  let fileRef = null;
  assetsBox.querySelector('.a-file').onchange = (e) => {
    fileRef = e.target.files[0] || null;
    fileBtnLabel.firstChild.textContent = fileRef ? '✓ ' + fileRef.name.slice(0, 14) : '⬆ File';
  };

  function renderAssets(assets) {
    list.innerHTML = '';
    if (!assets.length) { list.appendChild(h('<div class="muted-text">No examples yet.</div>')); return; }
    for (const a of assets) {
      const card = h(`<div class="card" style="padding:10px">
        ${a.file_path ? `<div class="variant-img" style="margin:0 0 8px"><img src="/uploads/${esc(a.file_path)}"></div>` : ''}
        <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start">
          <div><span class="tag muted">${esc(a.kind)}</span><div style="font-size:12.5px;margin-top:6px">${esc(a.caption || '—')}</div></div>
          <button class="btn ghost sm del">✕</button>
        </div>
      </div>`);
      card.querySelector('.del').onclick = () => confirmDialog('Remove this item?', async () => {
        await api.del(`/api/brands/${id}/assets/${a.id}`);
        const fresh = await api.brand(id); renderAssets(fresh.assets);
      });
      list.appendChild(card);
    }
  }
  renderAssets(brand.assets || []);

  assetsBox.querySelector('.a-add').onclick = (e) => withLoading(e.currentTarget, async () => {
    const fd = new FormData();
    fd.append('kind', assetsBox.querySelector('.a-kind').value);
    fd.append('caption', assetsBox.querySelector('.a-caption').value);
    if (fileRef) fd.append('image', fileRef);
    if (!fileRef && !assetsBox.querySelector('.a-caption').value.trim()) return toast('Add a caption or an image', 'err');
    try {
      await api.upload(`/api/brands/${id}/assets`, fd);
      assetsBox.querySelector('.a-caption').value = '';
      fileRef = null;
      fileBtnLabel.firstChild.textContent = '⬆ File';
      const fresh = await api.brand(id); renderAssets(fresh.assets);
      toast('Added', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });

  const wrap = h('<div></div>');
  wrap.appendChild(form);
  wrap.appendChild(assetsBox);

  modal({
    title: `Edit ${brand.name}`, size: 'lg', body: wrap,
    footer: [
      { label: 'Delete brand', kind: 'danger', onClick: (close) => confirmDialog(
        `Delete “${brand.name}” and all its posts? This cannot be undone.`,
        async () => { await api.deleteBrand(id); close(); toast('Brand deleted', 'ok'); onDone(); }) },
      { label: 'Save', kind: 'primary', onClick: (close, btn) => withLoading(btn, async () => {
        try { await api.updateBrand(id, readForm(form)); close(); toast('Saved', 'ok'); onDone(); }
        catch (err) { toast(err.message, 'err'); }
      }) },
    ],
  });
}

export default {
  async render(root) {
    await store.loadBrands();
    root.innerHTML = '';
    const head = h(`<div class="page-head">
      <div><h1>Brands</h1><p>Each brand carries its own voice, examples and reference images that guide every post.</p></div>
      <button class="btn primary" id="new">+ New brand</button>
    </div>`);
    head.querySelector('#new').onclick = () => openCreate(() => window.__app.reloadBrands().then(() => this.render(root)));
    root.appendChild(head);

    if (!store.brands.length) {
      root.appendChild(h(`<div class="card empty"><div class="big">❖</div><p>No brands yet.</p>
        <button class="btn primary" style="margin-top:10px" id="new2">Create your first brand</button></div>`));
      root.querySelector('#new2').onclick = () => openCreate(() => window.__app.reloadBrands().then(() => this.render(root)));
      return;
    }

    const grid = h('<div class="grid cols-2"></div>');
    for (const b of store.brands) {
      const card = h(`<div class="card" style="padding:18px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:34px;height:34px;border-radius:9px;background:${esc(b.color_primary)};display:grid;place-items:center;color:#fff;font-family:var(--sora);font-weight:700">${esc((b.name || '?')[0].toUpperCase())}</span>
          <div><div style="font-family:var(--sora);font-weight:600;font-size:16px">${esc(b.name)}</div>
          <div class="muted-text">${b.post_count} post${b.post_count === 1 ? '' : 's'}</div></div>
        </div>
        <div class="muted-text" style="line-height:1.5;min-height:38px">${esc((b.voice || b.description || 'No voice set yet').slice(0, 120))}</div>
      </div>`);
      card.onclick = () => openEdit(b.id, () => window.__app.reloadBrands().then(() => this.render(root)));
      grid.appendChild(card);
    }
    root.appendChild(grid);
  },
};
