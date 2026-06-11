// ── tiny DOM + helpers ────────────────────────────────────────────────────────
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function toast(msg, kind = '') {
  const root = document.getElementById('toast-root');
  const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .25s'; }, 2600);
  setTimeout(() => el.remove(), 2900);
}

// ── modal ─────────────────────────────────────────────────────────────────────
export function modal({ title, body, footer, size = '' }) {
  const root = document.getElementById('modal-root');
  const overlay = h(`<div class="modal-overlay"></div>`);
  const box = h(`<div class="modal ${size}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="x">✕</button></div>
    <div class="modal-body"></div>
    <div class="modal-foot"></div>
  </div>`);
  const bodyEl = box.querySelector('.modal-body');
  const footEl = box.querySelector('.modal-foot');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);

  const close = () => { overlay.remove(); };
  box.querySelector('.x').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  (footer || []).forEach((b) => {
    const btn = h(`<button class="btn ${b.kind || ''}">${esc(b.label)}</button>`);
    btn.onclick = () => b.onClick && b.onClick(close, btn);
    footEl.appendChild(btn);
  });
  overlay.appendChild(box);
  root.appendChild(overlay);
  return { close, bodyEl, box };
}

export function confirmDialog(message, onYes, { danger = true, yes = 'Delete' } = {}) {
  modal({
    title: 'Are you sure?',
    body: `<p class="muted-text" style="line-height:1.6">${esc(message)}</p>`,
    footer: [
      { label: 'Cancel', onClick: (close) => close() },
      { label: yes, kind: danger ? 'danger' : 'primary', onClick: (close) => { close(); onYes(); } },
    ],
  });
}

// flash a button into a loading state while an async fn runs
export async function withLoading(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${btn.dataset.loading || 'Working…'}`;
  try { return await fn(); }
  finally { btn.disabled = false; btn.innerHTML = orig; }
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') || iso.includes(' ') ? iso : iso + 'T00:00');
  if (isNaN(d)) return iso;
  const opts = withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleString(undefined, opts);
}

export function relativeDue(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00' : ''));
  const days = Math.round((d - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return { text: `${-days}d overdue`, cls: 'over' };
  if (days === 0) return { text: 'Today', cls: 'today' };
  if (days === 1) return { text: 'Tomorrow', cls: '' };
  return { text: `in ${days}d`, cls: '' };
}

export function statusPill(status, statuses) {
  const s = (statuses || []).find((x) => x.id === status);
  return `<span class="status-pill st-${status}"><span class="dot"></span>${esc(s ? s.name : status)}</span>`;
}
