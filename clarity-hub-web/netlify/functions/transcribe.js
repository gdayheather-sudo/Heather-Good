// Netlify Function — proxy to OpenAI's Whisper transcription API.
// Keeps OPENAI_API_KEY server-side and rate-limits per client IP.
//
// Body handling note: earlier this parsed req.formData(), but Netlify's v2
// function runtime was rejecting the multipart body with a Content-Type
// error. The client now POSTs the raw webm blob with Content-Type: audio/webm
// and we wrap it with OpenAI's toFile helper for the SDK.

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'whisper-1';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — OpenAI's Whisper upload cap.

// Rate limiting — same shape as generate-sop, slightly higher limit because one
// generation often involves two or three transcription round-trips (multiple
// recording segments).
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

function rateLimitOk(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.length || v[v.length - 1] < now - WINDOW_MS) hits.delete(k);
    }
  }
  return true;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (!rateLimitOk(ip)) {
    return jsonResponse(429, {
      error:
        "You've hit the hourly limit. Come back in an hour or reach out at hello@clarityhub.com.au.",
    });
  }

  let audioBuffer;
  try {
    audioBuffer = await req.arrayBuffer();
  } catch (err) {
    console.error('transcribe: body read failed', err);
    return jsonResponse(400, { error: 'Invalid upload' });
  }

  if (!audioBuffer || audioBuffer.byteLength === 0) {
    return jsonResponse(400, { error: 'No audio received' });
  }
  if (audioBuffer.byteLength > MAX_BYTES) {
    return jsonResponse(400, { error: 'Audio too large (max 25 MB)' });
  }

  // Derive a filename + mime from the Content-Type so Whisper knows the format.
  const contentType = req.headers.get('content-type') || 'audio/webm';
  // Content-Type may include parameters like "audio/webm;codecs=opus"; strip them.
  const mime = contentType.split(';')[0].trim();
  const ext = mime.split('/')[1] || 'webm';
  const filename = 'recording.' + ext;

  try {
    // Node 20+ exposes File as a global; no need for openai/uploads helper.
    const audioFile = new File([audioBuffer], filename, { type: mime });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: MODEL,
    });
    return jsonResponse(200, { text: transcription.text || '' });
  } catch (err) {
    // Log more detail so we can see OpenAI's actual reason in Netlify logs.
    console.error('transcribe error:', {
      name: err?.name,
      message: err?.message,
      status: err?.status,
      code: err?.code,
      type: err?.type,
    });
    return jsonResponse(500, { error: 'Transcription failed. Try again or type instead.' });
  }
};

export const config = {
  path: '/api/transcribe',
};
