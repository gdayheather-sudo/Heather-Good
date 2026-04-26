// Netlify Function — proxy to OpenAI's Whisper transcription API.
// Keeps OPENAI_API_KEY server-side and rate-limits per client IP.
//
// We intentionally bypass the OpenAI Node SDK for this call. Several SDK
// input types (global File, toFile-wrapped Buffer, fs.createReadStream) all
// produced "Invalid Content-Type header value" errors from the Whisper API
// when running on Netlify's v2 function runtime — the SDK wasn't serialising
// the request as multipart/form-data. Building the multipart body by hand
// and POSTing with plain fetch takes the SDK out of the equation.

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'whisper-1';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper's upload cap.

// Rate limiting — per-instance in-memory counter keyed by client IP. Slightly
// higher limit than generate-sop because one generation often involves a
// couple of recording segments.
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

// Build a multipart/form-data body with two fields: the model name and the
// audio file. Returns { body, contentType } ready to hand to fetch().
function buildMultipart(audioBuffer, filename, fileMime) {
  const boundary =
    '----clarity-hub-' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2);

  const CRLF = '\r\n';
  const enc = (s) => Buffer.from(s, 'utf-8');

  const parts = [
    enc(`--${boundary}${CRLF}`),
    enc(`Content-Disposition: form-data; name="model"${CRLF}${CRLF}`),
    enc(`${MODEL}${CRLF}`),
    enc(`--${boundary}${CRLF}`),
    enc(
      `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`
    ),
    enc(`Content-Type: ${fileMime}${CRLF}${CRLF}`),
    Buffer.from(audioBuffer),
    enc(`${CRLF}--${boundary}--${CRLF}`),
  ];

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
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

  // Derive filename + mime from the Content-Type the client sent.
  const incomingCT = req.headers.get('content-type') || 'audio/webm';
  const fileMime = incomingCT.split(';')[0].trim();
  const ext = fileMime.split('/')[1] || 'webm';
  const filename = 'recording.' + ext;

  const { body, contentType } = buildMultipart(audioBuffer, filename, fileMime);

  // TEMP diagnostic: log the key shape so we can verify Netlify is serving
  // the value we expect. Logs only the first 8 + last 4 characters and the
  // length — never the full secret.
  const apiKey = process.env.OPENAI_API_KEY || '';
  console.log('transcribe: key check', {
    length: apiKey.length,
    prefix: apiKey.slice(0, 8),
    suffix: apiKey.slice(-4),
    starts_with: apiKey.startsWith('sk-proj-')
      ? 'sk-proj-'
      : apiKey.startsWith('sk-')
        ? 'sk-'
        : '(other)',
  });

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': contentType,
        'Content-Length': String(body.length),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('transcribe error:', {
        status: response.status,
        body: text.slice(0, 500),
      });
      return jsonResponse(500, {
        error: 'Transcription failed. Try again or type instead.',
      });
    }

    const result = await response.json();
    return jsonResponse(200, { text: result.text || '' });
  } catch (err) {
    console.error('transcribe error (network):', {
      name: err?.name,
      message: err?.message,
    });
    return jsonResponse(500, {
      error: 'Transcription failed. Try again or type instead.',
    });
  }
};

export const config = {
  path: '/api/transcribe',
};
