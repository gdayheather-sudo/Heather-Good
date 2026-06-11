import { store } from './store.js';
import { api } from './api.js';
import { h, esc, toast, withLoading } from './ui.js';

export function copyText(text) {
  navigator.clipboard?.writeText(text).then(
    () => toast('Copied to clipboard', 'ok'),
    () => toast('Could not copy', 'err')
  );
}

export function platformChips(selectedIds = []) {
  const wrap = h('<div class="chips"></div>');
  for (const p of store.platforms) {
    const chip = h(`<span class="chip ${selectedIds.includes(p.id) ? 'on' : ''}" data-id="${p.id}">${esc(p.name)}</span>`);
    chip.onclick = () => chip.classList.toggle('on');
    wrap.appendChild(chip);
  }
  wrap.selected = () => [...wrap.querySelectorAll('.chip.on')].map((c) => c.dataset.id);
  return wrap;
}

/**
 * Editable variant card. Returns an element with:
 *  - .getData()  → { platform, body, hashtags, image_prompt, image_path }
 * `opts.onChange(data)` fires when the image changes (used to persist on existing posts).
 */
export function variantCard(variant, opts = {}) {
  const p = store.platform(variant.platform) || { name: variant.platform, char_limit: 2200 };
  const hashtags = Array.isArray(variant.hashtags)
    ? variant.hashtags.map((t) => '#' + String(t).replace(/^#/, '')).join(' ')
    : (variant.hashtags || '');

  const el = h(`<div class="card variant-card" data-platform="${esc(variant.platform)}">
    <div class="vhead">
      <div class="pname"><span class="tag">${esc(p.name)}</span></div>
      <div style="display:flex;gap:6px">
        <button class="btn ghost sm copy">⧉ Copy</button>
        ${opts.removable ? '<button class="btn ghost sm rm">✕</button>' : ''}
      </div>
    </div>
    <textarea class="input body" placeholder="Caption…">${esc(variant.body || '')}</textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
      <span class="hint" style="font-size:11.5px;color:var(--muted)">${esc(p.aspect ? 'Image ' + p.aspect : '')}</span>
      <span class="charcount"></span>
    </div>
    <input class="input hashtags-in" style="margin-top:10px" placeholder="#hashtags" value="${esc(hashtags)}" />
    <div class="field" style="margin:12px 0 0">
      <label style="font-size:11.5px">Image prompt <span class="hint">— what to generate</span></label>
      <textarea class="input imgprompt" style="min-height:54px">${esc(variant.image_prompt || '')}</textarea>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
      <button class="btn sm genimg" data-loading="Generating…">✦ Generate image</button>
      <label class="btn ghost sm" style="margin:0">⬆ Upload<input type="file" accept="image/*" hidden class="upimg"></label>
    </div>
    <div class="variant-img" style="display:${variant.image_path ? 'block' : 'none'}">
      <img class="preview" src="${variant.image_path ? '/uploads/' + esc(variant.image_path) : ''}" />
    </div>
  </div>`);

  const body = el.querySelector('.body');
  const cc = el.querySelector('.charcount');
  const updateCount = () => {
    const n = body.value.length;
    cc.textContent = `${n} / ${p.char_limit}`;
    cc.classList.toggle('over', n > p.char_limit);
  };
  body.addEventListener('input', updateCount);
  updateCount();

  let imagePath = variant.image_path || '';
  const imgWrap = el.querySelector('.variant-img');
  const preview = el.querySelector('.preview');
  const setImage = (path) => {
    imagePath = path;
    preview.src = '/uploads/' + path;
    imgWrap.style.display = 'block';
    opts.onChange && opts.onChange(getData());
  };

  el.querySelector('.copy').onclick = () => {
    const d = getData();
    copyText([d.body, d.hashtags].filter(Boolean).join('\n\n'));
  };
  if (opts.removable) el.querySelector('.rm').onclick = () => { el.remove(); opts.onRemove && opts.onRemove(); };

  el.querySelector('.genimg').onclick = (e) => withLoading(e.currentTarget, async () => {
    const prompt = el.querySelector('.imgprompt').value.trim();
    if (!prompt) return toast('Add an image prompt first', 'err');
    if (!store.providers.openai) return toast('Add an OpenAI key in Settings to generate images', 'err');
    try {
      const r = await api.genImage({ prompt, platform: variant.platform });
      setImage(r.image_path);
      toast('Image generated', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });

  el.querySelector('.upimg').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (opts.postId && variant.id) {
      const fd = new FormData(); fd.append('image', file);
      try {
        const r = await api.upload(`/api/posts/${opts.postId}/variants/${variant.id}/image`, fd);
        setImage(r.image_path);
        toast('Image attached', 'ok');
      } catch (err) { toast(err.message, 'err'); }
    } else {
      // not yet persisted — preview locally only
      const reader = new FileReader();
      reader.onload = () => { preview.src = reader.result; imgWrap.style.display = 'block'; };
      reader.readAsDataURL(file);
    }
  };

  function getData() {
    return {
      id: variant.id,
      platform: variant.platform,
      body: body.value,
      hashtags: el.querySelector('.hashtags-in').value,
      image_prompt: el.querySelector('.imgprompt').value,
      image_path: imagePath,
    };
  }
  el.getData = getData;
  return el;
}
