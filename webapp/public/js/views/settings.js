import { api } from '../api.js';
import { h, esc, toast, withLoading } from '../ui.js';

export default {
  async render(root) {
    const s = await api.settings();
    root.innerHTML = '';
    root.appendChild(h(`<div class="page-head">
      <div><h1>Settings</h1><p>Your API keys are stored locally in this app's database — they never leave your machine.</p></div>
    </div>`));

    const card = h(`<div class="card" style="padding:24px;max-width:640px">
      <div class="section-title" style="margin-top:0">AI providers</div>
      <div class="field">
        <label>Anthropic API key <span class="hint">— for Claude captions ${s.has_anthropic_key ? '· saved ' + esc(s.anthropic_key_hint) : ''}</span></label>
        <input class="input" id="anthropic_api_key" type="password" placeholder="${s.has_anthropic_key ? '•••••••• (leave blank to keep)' : 'sk-ant-…'}" />
        <div style="margin-top:6px"><a class="muted-text" href="https://console.anthropic.com/settings/keys" target="_blank">Get a Claude key →</a></div>
      </div>
      <div class="field">
        <label>OpenAI API key <span class="hint">— for ChatGPT captions + image generation ${s.has_openai_key ? '· saved ' + esc(s.openai_key_hint) : ''}</span></label>
        <input class="input" id="openai_api_key" type="password" placeholder="${s.has_openai_key ? '•••••••• (leave blank to keep)' : 'sk-…'}" />
        <div style="margin-top:6px"><a class="muted-text" href="https://platform.openai.com/api-keys" target="_blank">Get an OpenAI key →</a></div>
      </div>
      <div class="divider"></div>
      <div class="section-title" style="margin-top:0">Models <span class="hint" style="font-weight:400">(advanced — defaults are recommended)</span></div>
      <div class="row">
        <div class="field"><label>Claude model</label><input class="input" id="anthropic_model" value="${esc(s.anthropic_model)}" /></div>
        <div class="field"><label>OpenAI chat model</label><input class="input" id="openai_model" value="${esc(s.openai_model)}" /></div>
      </div>
      <div class="field" style="max-width:50%"><label>OpenAI image model</label><input class="input" id="openai_image_model" value="${esc(s.openai_image_model)}" /></div>
      <div style="margin-top:8px"><button class="btn primary" id="save" data-loading="Saving…">Save settings</button></div>
    </div>`);

    card.querySelector('#save').onclick = (e) => withLoading(e.currentTarget, async () => {
      const payload = {};
      for (const id of ['anthropic_api_key', 'openai_api_key', 'anthropic_model', 'openai_model', 'openai_image_model']) {
        payload[id] = card.querySelector('#' + id).value;
      }
      try {
        await api.saveSettings(payload);
        await window.__app.refreshProviders();
        toast('Settings saved', 'ok');
        card.querySelector('#anthropic_api_key').value = '';
        card.querySelector('#openai_api_key').value = '';
        window.__app.render();
      } catch (err) { toast(err.message, 'err'); }
    });

    root.appendChild(card);
  },
};
