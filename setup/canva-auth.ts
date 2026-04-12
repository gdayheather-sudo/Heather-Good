/**
 * One-time Canva OAuth setup for The Clarity Hub LinkedIn generator.
 *
 * Run:  npm run canva-auth
 *
 * What it does:
 *   1. Generates PKCE code_verifier + code_challenge
 *   2. Prints the authorisation URL — open it in your browser
 *   3. Canva redirects to http://127.0.0.1:8080 with an auth code
 *   4. This script catches the code, exchanges it for tokens, and saves
 *      CANVA_API_TOKEN (+ CANVA_REFRESH_TOKEN) straight into .env
 */

import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ── Constants ─────────────────────────────────────────────────────────────────

const CLIENT_ID    = 'OC-AZ1_ucdeUUtm';
const REDIRECT_URI = 'http://127.0.0.1:8080';
const AUTH_URL     = 'https://www.canva.com/api/oauth/authorize';
const TOKEN_URL    = 'https://api.canva.com/rest/v1/oauth/token';
const SCOPES       = [
  'design:content:write',
  'design:content:read',
  'design:meta:read',
  'brandtemplate:content:read',
  'brandtemplate:meta:read',
  'brandkit:content:read',
  'asset:read',
].join(' ');

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  // 32 random bytes → 43-char base64url string (within RFC 7636 range)
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ── .env writer ───────────────────────────────────────────────────────────────

function upsertEnv(key: string, value: string): void {
  const envPath = path.join(process.cwd(), '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  const lineRegex = new RegExp(`^${key}=.*$`, 'm');
  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
}

// ── Token exchange ────────────────────────────────────────────────────────────

async function exchangeCode(
  code: string,
  codeVerifier: string,
  clientSecret: string
): Promise<void> {
  let data: Record<string, string>;

  try {
    const response = await axios.post<Record<string, string>>(
      TOKEN_URL,
      new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id:     CLIENT_ID,
        client_secret: clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    data = response.data;
  } catch (err) {
    const e = err as AxiosError;
    const detail = e.response
      ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
      : e.message;
    throw new Error(`Token exchange failed — ${detail}`);
  }

  const { access_token, refresh_token, expires_in } = data;

  upsertEnv('CANVA_API_TOKEN', access_token);
  if (refresh_token) upsertEnv('CANVA_REFRESH_TOKEN', refresh_token);

  console.log('');
  console.log('━'.repeat(50));
  console.log('');
  console.log('✅ CANVA_API_TOKEN saved to .env');
  if (refresh_token) console.log('✅ CANVA_REFRESH_TOKEN saved to .env');
  const hours = Math.round(Number(expires_in) / 3600);
  console.log(`   Token expires in ~${hours}h`);
  console.log('');
  console.log('You\'re ready. Run your LinkedIn generator:');
  console.log('');
  console.log('  npm run linkedin -- \\');
  console.log('    --post-text "Your full post..." \\');
  console.log('    --hook "Your hook line." \\');
  console.log('    --cta "Follow for more."');
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientSecret || clientSecret === 'your_canva_client_secret_here') {
    console.error('');
    console.error('❌ CANVA_CLIENT_SECRET is not set in .env');
    console.error('   Find it in your Canva integration → Configuration tab');
    console.error('');
    process.exit(1);
  }

  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const url = new URL(AUTH_URL);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('code_challenge', codeChallenge);

  console.log('');
  console.log('✦  Canva OAuth — one-time setup');
  console.log('━'.repeat(50));
  console.log('');
  console.log('Open this URL in your browser:');
  console.log('');
  console.log(`  ${url.toString()}`);
  console.log('');
  console.log('Authorise the "LinkedIn graphics" integration when prompted.');
  console.log('This script will catch the redirect and save your token automatically.');
  console.log('');
  console.log('Waiting...');

  // ── Local callback server ──────────────────────────────────────────────────
  const server = http.createServer(async (req, res) => {
    if (!req.url) return;

    const incoming = new URL(req.url, `http://127.0.0.1:8080`);
    const code     = incoming.searchParams.get('code');
    const error    = incoming.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h2>Authorisation failed: ${error}</h2><p>Close this tab and check the terminal.</p>`);
      server.close();
      console.error(`\n❌ Canva returned an error: ${error}`);
      process.exit(1);
    }

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<h2 style="font-family:sans-serif;color:#2d6a4f">✅ Authorised!</h2>' +
        '<p style="font-family:sans-serif">Token saved to .env. You can close this tab.</p>'
      );
      server.close();

      try {
        await exchangeCode(code, codeVerifier, clientSecret!);
      } catch (err) {
        console.error('\n❌', (err as Error).message);
        process.exit(1);
      }
    }
  });

  server.listen(8080, '127.0.0.1', () => {
    // Listening — waiting for Canva's redirect
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n❌ Port 8080 is already in use.');
      console.error('   Close whatever is running on that port and try again.');
    } else {
      console.error('\n❌ Server error:', err.message);
    }
    process.exit(1);
  });
}

main();
