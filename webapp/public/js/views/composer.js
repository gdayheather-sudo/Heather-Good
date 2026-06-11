import { api } from '../api.js';
import { store } from '../store.js';
import { h, esc, toast, modal, withLoading } from '../ui.js';
import { platformChips, variantCard } from '../components.js';

export default {
  async render(root) {
    const view = this;
    if (!store.brands.length) await store.loadBrands();

    root.innerHTML = '';
    root.appendChild(h(`<div class="page-head">
      <div><h1>Composer</h1><p>Describe one idea — get a tailored post for every platform, on brand.</p></div>
    </div>`));

    if (!store.brands.length) {
      root.appendChild(h(`<div class="card empty"><div class="big">✎</div>
        <p>You need a brand before composing. Brands carry the voice the AI writes in.</p>
        <a class="btn primary" style="margin-top:10px" href="#/brands">Create a brand</a></div>`));
      return;
    }

    const provGuess = store.providers.anthropic ? 'claude' : (store.providers.openai ? 'openai' : 'claude');
    const brandOpts = store.brands.map((b) => `<option value="${b.id}" ${String(b.id) === String(store.filterBrandId) ? 'selected' : ''}>${esc(b.name)}</option>`).join('');

    const wrap = h(`<div class="composer">
      <div class="card" style="padding:20px;position:sticky;top:20px">
        <div class="field"><label>Brand</label><select class="input c-brand">${brandOpts}</select></div>
        <div class="field"><label>Brief <span class="hint">— the idea, in your words</span></label>
          <textarea class="input c-concept" style="min-height:96px" placeholder="e.g. Launch our new 'adventure' dog bandana collection — outdoorsy, weekend hikes, limited run for autumn."></textarea></div>
        <div class="field"><label>Platforms</label><div class="c-platforms"></div></div>
        <div class="field"><label>Write with</label>
          <select class="input c-provider">
            <option value="claude" ${provGuess === 'claude' ? 'selected' : ''}>Claude (Anthropic)</option>
            <option value="openai" ${provGuess === 'openai' ? 'selected' : ''}>ChatGPT (OpenAI)</option>
          </select></div>
        <div class="field"><label>Extra instructions <span class="hint">— optional</span></label>
          <input class="input c-instructions" placeholder="e.g. mention free shipping, keep it cheeky" /></div>
        <div class="field c-refwrap" style="display:none"><label>Reference images <span class="hint">— click to include</span></label>
          <div class="c-refs chips"></div></div>
        <button class="btn primary c-go" style="width:100%;justify-content:center" data-loading="Generating…">✦ Generate posts</button>
        <div class="muted-text" style="margin-top:10px;text-align:center" class="c-provnote"></div>
      </div>
      <div class="c-results"><div class="empty"><div class="big">✦</div><p>Your generated posts will appear here.</p></div></div>
    </div>`);

    const chips = platformChips(['instagram', 'facebook']);
    wrap.querySelector('.c-platforms').appendChild(chips);
    const results = wrap.querySelector('.c-results');
    const refWrap = wrap.querySelector('.c-refwrap');
    const refsEl = wrap.querySelector('.c-refs');

    // load reference images for the chosen brand
    async function loadRefs(brandId) {
      refsEl.innerHTML = '';
      refWrap.style.display = 'none';
      try {
        const brand = await api.brand(brandId);
        const refs = (brand.assets || []).filter((a) => a.kind === 'reference' && a.file_path);
        if (!refs.length) return;
        refWrap.style.display = 'block';
        for (const r of refs) {
          const chip = h(`<span class="chip" data-id="${r.id}" style="padding:4px;gap:6px">
            <img src="/uploads/${esc(r.file_path)}" style="width:30px;height:30px;border-radius:6px;object-fit:cover">
            ${esc((r.caption || 'reference').slice(0, 18))}</span>`);
          chip.onclick = () => chip.classList.toggle('on');
          refsEl.appendChild(chip);
        }
      } catch { /* ignore */ }
    }
    const brandSel = wrap.querySelector('.c-brand');
    brandSel.onchange = () => loadRefs(brandSel.value);
    loadRefs(brandSel.value);

    wrap.querySelector('.c-go').onclick = (e) => withLoading(e.currentTarget, async () => {
      const brand_id = brandSel.value;
      const concept = wrap.querySelector('.c-concept').value.trim();
      const platforms = chips.selected();
      const provider = wrap.querySelector('.c-provider').value;
      const instructions = wrap.querySelector('.c-instructions').value.trim();
      const reference_asset_ids = [...refsEl.querySelectorAll('.chip.on')].map((c) => Number(c.dataset.id));

      if (!concept) return toast('Write a brief first', 'err');
      if (!platforms.length) return toast('Pick at least one platform', 'err');
      if (provider === 'claude' && !store.providers.anthropic) return toast('Add an Anthropic key in Settings, or switch to ChatGPT', 'err');
      if (provider === 'openai' && !store.providers.openai) return toast('Add an OpenAI key in Settings, or switch to Claude', 'err');

      results.innerHTML = '<div class="empty"><div class="spinner" style="border-color:#ddd;border-top-color:#6c5ce7;width:26px;height:26px"></div><p style="margin-top:12px">Writing your posts…</p></div>';
      try {
        const out = await api.genCopy({ brand_id, concept, platforms, provider, instructions, reference_asset_ids });
        renderResults(out, { brand_id, concept });
      } catch (err) {
        results.innerHTML = `<div class="card empty"><div class="big">⚠</div><p>${esc(err.message)}</p></div>`;
      }
    });

    function renderResults(out, ctx) {
      results.innerHTML = '';
      const cards = [];
      const head = h(`<div class="card" style="padding:16px 18px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div><div style="font-family:var(--sora);font-weight:600">Generated ${out.variants.length} post${out.variants.length === 1 ? '' : 's'}</div>
          <div class="muted-text" style="margin-top:4px">${esc(out.summary || '')}</div></div>
          <button class="btn primary save">Save as post →</button>
        </div></div>`);
      results.appendChild(head);

      const list = h('<div></div>');
      for (const v of out.variants) {
        const card = variantCard(v, { removable: true, onRemove: () => { const i = cards.indexOf(card); if (i > -1) cards.splice(i, 1); } });
        cards.push(card);
        list.appendChild(card);
      }
      results.appendChild(list);

      head.querySelector('.save').onclick = () => openSave(ctx, cards);
    }

    function openSave(ctx, cards) {
      if (!cards.length) return toast('Nothing to save', 'err');
      const statusOpts = store.statuses.map((s) => `<option value="${s.id}" ${s.id === 'draft' ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
      const defaultTitle = ctx.concept.split('\n')[0].slice(0, 60);
      const form = h(`<div>
        <div class="field"><label>Post title</label><input class="input s-title" value="${esc(defaultTitle)}"></div>
        <div class="row">
          <div class="field"><label>Status</label><select class="input s-status">${statusOpts}</select></div>
          <div class="field"><label>Schedule <span class="hint">(optional)</span></label><input type="datetime-local" class="input s-sched"></div>
        </div>
        <p class="muted-text">Saving ${cards.length} platform variant${cards.length === 1 ? '' : 's'}, including any generated images.</p>
      </div>`);
      modal({
        title: 'Save post', body: form,
        footer: [
          { label: 'Cancel', onClick: (c) => c() },
          { label: 'Save post', kind: 'primary', onClick: (close, btn) => withLoading(btn, async () => {
            const sched = form.querySelector('.s-sched').value;
            const variants = cards.map((c) => c.getData());
            try {
              const post = await api.createPost({
                brand_id: ctx.brand_id,
                title: form.querySelector('.s-title').value.trim() || 'Untitled post',
                concept: ctx.concept,
                status: form.querySelector('.s-status').value,
                scheduled_at: sched || null,
                variants,
              });
              close();
              toast('Post saved', 'ok');
              showSaved(post);
            } catch (err) { toast(err.message, 'err'); }
          }) },
        ],
      });
    }

    function showSaved(post) {
      results.innerHTML = `<div class="card empty"><div class="big">✓</div>
        <p>“${esc(post.title)}” saved as a ${esc(post.status)} for ${esc(post.brand_name || '')}.</p>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
          <a class="btn" href="#/pipeline">View in pipeline</a>
          <button class="btn primary again">Compose another</button>
        </div></div>`;
      results.querySelector('.again').onclick = () => view.render(root);
    }

    root.appendChild(wrap);
  },
};
