/**
 * Cloud TTS provider wrapper.
 *
 * Uses ElevenLabs neural TTS, which produces dramatically more natural
 * audio than browser SpeechSynthesis - especially for phonics work like
 * digraphs (sh, ch, th) and isolated phonemes that browser voices butcher.
 *
 * Configuration (env vars, all optional):
 *   ELEVENLABS_API_KEY    - if unset, the cloud TTS is disabled and the
 *                           lesson player falls back to browser TTS
 *   ELEVENLABS_VOICE_ID   - voice to use. Default is "Charlotte" (en-GB
 *                           female, closest accessible match to en-AU);
 *                           you can also clone your own voice on the
 *                           paid tier and paste its ID here
 *   ELEVENLABS_MODEL      - default "eleven_turbo_v2_5" (fast, cheap)
 *
 * Files are cached on disk in public/audio/tts-cache/<sha>.mp3 so a
 * given (text, voice) pair only ever costs one API call.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', 'public', 'audio', 'tts-cache');

function isConfigured() {
  return !!process.env.ELEVENLABS_API_KEY;
}

function defaultVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa'; // Charlotte (en-GB female)
}

function defaultModel() {
  return process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
}

function cacheKey(text, voiceId, model) {
  return crypto.createHash('sha256').update(`${voiceId}::${model}::${text}`).digest('hex').slice(0, 24);
}

function cachedPath(text, voiceId, model) {
  return path.join(CACHE_DIR, `${cacheKey(text, voiceId, model)}.mp3`);
}

async function generate(text, { voiceId, model } = {}) {
  if (!isConfigured()) throw new Error('cloud TTS not configured');
  voiceId ||= defaultVoiceId();
  model ||= defaultModel();

  const cached = cachedPath(text, voiceId, model);
  if (fs.existsSync(cached)) return { path: cached, fromCache: true };

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.1, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cached, buf);
  return { path: cached, fromCache: false };
}

module.exports = { isConfigured, defaultVoiceId, defaultModel, generate, cachedPath };
