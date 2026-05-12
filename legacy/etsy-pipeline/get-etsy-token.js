/**
 * get-etsy-token.js
 *
 * Completes the Etsy OAuth 2.0 PKCE flow and saves your access token to .env
 *
 * BEFORE running:
 *   1. Go to https://www.etsy.com/developers/your-apps
 *   2. Click/edit your app and add this redirect URI:
 *        http://localhost:3003/callback
 *   3. Save the app settings
 *   4. Run: node get-etsy-token.js
 */

const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Load .env manually ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });
}

const KEYSTRING    = envVars.ETSY_API_KEY || '';
const REDIRECT_URI = 'http://localhost:3003/callback';
const SCOPES       = 'listings_r shops_r';
const PORT         = 3003;

if (!KEYSTRING) {
  console.error('ERROR: ETSY_API_KEY not found in .env');
  process.exit(1);
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
const codeVerifier  = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
const state         = base64url(crypto.randomBytes(16));

// ── Build authorization URL ───────────────────────────────────────────────────
const authUrl =
  'https://www.etsy.com/oauth/connect' +
  '?response_type=code' +
  '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
  '&scope='        + encodeURIComponent(SCOPES) +
  '&client_id='    + KEYSTRING +
  '&state='        + state +
  '&code_challenge=' + codeChallenge +
  '&code_challenge_method=S256';

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log(' Etsy OAuth Setup — Big Little Pup Club Pipeline');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Step 1 — Make sure your Etsy app has this redirect URI:');
console.log('');
console.log('   http://localhost:3003/callback');
console.log('');
console.log('   (Go to https://www.etsy.com/developers/your-apps →');
console.log('    click/edit your app → add the redirect URI above → save)');
console.log('');
console.log('Step 2 — Open this URL in your browser:');
console.log('');
console.log(authUrl);
console.log('');
console.log('Waiting for Etsy to redirect back on port 3003...');
console.log('(Keep this terminal open)');
console.log('');

// ── Local callback server ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  if (url.pathname !== '/callback') { res.end('Waiting...'); return; }

  const code          = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error         = url.searchParams.get('error');

  if (error) {
    const desc = url.searchParams.get('error_description') || '';
    console.error('Etsy returned an error:', error, desc);
    res.end('<h2>Error: ' + error + '</h2><p>' + desc + '</p>');
    server.close();
    return;
  }

  if (!code) {
    console.error('No code received from Etsy');
    res.end('<h2>No code received</h2>');
    server.close();
    return;
  }

  if (returnedState !== state) {
    console.error('State mismatch — possible CSRF attack');
    res.end('<h2>State mismatch</h2>');
    server.close();
    return;
  }

  console.log('✓ Authorization code received — exchanging for token...');

  // ── Exchange code for token ─────────────────────────────────────────────────
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     KEYSTRING,
    redirect_uri:  REDIRECT_URI,
    code:          code,
    code_verifier: codeVerifier,
  }).toString();

  const tokenData = await httpsPost('https://api.etsy.com/v3/public/oauth/token', body);

  if (tokenData.error || !tokenData.access_token) {
    const msg = JSON.stringify(tokenData, null, 2);
    console.error('Token exchange failed:\n', msg);
    res.end('<h2>Token exchange failed</h2><pre>' + msg + '</pre>');
    server.close();
    return;
  }

  // ── Save to .env ────────────────────────────────────────────────────────────
  setEnvVar('ETSY_ACCESS_TOKEN',  tokenData.access_token);
  if (tokenData.refresh_token) {
    setEnvVar('ETSY_REFRESH_TOKEN', tokenData.refresh_token);
  }

  console.log('');
  console.log('✓ SUCCESS! Access token saved to .env');
  console.log('');
  console.log('Access Token (first 40 chars):',
    tokenData.access_token.slice(0, 40) + '...');
  if (tokenData.expires_in) {
    const mins = Math.round(tokenData.expires_in / 60);
    console.log('Expires in:', mins, 'minutes');
  }
  console.log('');
  console.log('Now run:  npm run pipeline');
  console.log('');

  res.end(
    '<html><body style="font-family:sans-serif;padding:2rem">' +
    '<h2 style="color:green">✓ Success! Access token saved.</h2>' +
    '<p>You can close this tab and return to the terminal.</p>' +
    '<p>Run <code>npm run pipeline</code> to start the pipeline.</p>' +
    '</body></html>'
  );
  server.close();
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3003 is already in use. Close the other process and try again.');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT);

// ── Helpers ───────────────────────────────────────────────────────────────────
function httpsPost(url, body) {
  return new Promise(resolve => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: 'parse_error', raw: data.slice(0, 300) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

function setEnvVar(key, value) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const regex = new RegExp('^' + key + '=.*$', 'm');
  if (regex.test(content)) {
    content = content.replace(regex, key + '=' + value);
  } else {
    // Append after the ETSY section if possible, else at end
    content += '\n' + key + '=' + value + '\n';
  }
  fs.writeFileSync(envPath, content, 'utf-8');
}
