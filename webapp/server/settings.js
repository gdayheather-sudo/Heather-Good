import 'dotenv/config';
import { get, run } from './db.js';

// Resolution order for a setting: database value (set via the UI) → env var → default.
const ENV_MAP = {
  anthropic_api_key: 'ANTHROPIC_API_KEY',
  openai_api_key: 'OPENAI_API_KEY',
  anthropic_model: 'ANTHROPIC_MODEL',
  openai_model: 'OPENAI_MODEL',
  openai_image_model: 'OPENAI_IMAGE_MODEL',
};

const DEFAULTS = {
  anthropic_model: 'claude-opus-4-8',
  openai_model: 'gpt-4o',
  openai_image_model: 'gpt-image-1',
};

export function getSetting(key) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  if (row && row.value != null && row.value !== '') return row.value;
  const envKey = ENV_MAP[key];
  if (envKey && process.env[envKey]) return process.env[envKey];
  return DEFAULTS[key] ?? '';
}

export function setSetting(key, value) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value ?? '']
  );
}

// Public, redacted view of settings for the UI (never leak full keys).
export function publicSettings() {
  const anthropic = getSetting('anthropic_api_key');
  const openai = getSetting('openai_api_key');
  return {
    anthropic_model: getSetting('anthropic_model'),
    openai_model: getSetting('openai_model'),
    openai_image_model: getSetting('openai_image_model'),
    has_anthropic_key: !!anthropic,
    has_openai_key: !!openai,
    anthropic_key_hint: anthropic ? `…${anthropic.slice(-4)}` : '',
    openai_key_hint: openai ? `…${openai.slice(-4)}` : '',
  };
}
