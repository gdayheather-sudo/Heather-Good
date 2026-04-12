/**
 * Two-step Canva OAuth setup for The Clarity Hub LinkedIn generator.
 *
 * Step 1 — generate the auth URL:
 *   npm run canva-auth
 *   Opens the URL in your browser, authorise, copy the redirect URL.
 *
 * Step 2 — exchange the code for a token:
 *   npm run canva-auth -- --callback "http://127.0.0.1:8080?code=xxxx..."
 *   Saves CANVA_API_TOKEN to .env automatically.
 */

import crypto from 'crypto';
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
const TOKEN_URL    = 'https://www.canva.com/api/oauth/token';
const STATE_FILE   = path.join(process.cwd(), '.canva-state.json');
const SCOPES       = [
  'design:content:write',
  'design:content:read',
  'design:meta:read',
  'brandtemplate:content:read',
  'brandtemplate:meta:read',
  'asset:read',
].join(' ');

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
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

// ── Step 1: generate URL ──────────────────────────────────────────────────────

function stepGenerate(): void {
  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Save verifier so step 2 can use it
  fs.writeFileSync(STATE_FILE, JSON.stringify({ codeVerifier }), 'utf-8');

  const url = new URL(AUTH_URL);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('code_challenge', codeChallenge);

  console.log('');
  console.log('✦  Canva OAuth — Step 1 of 2');
  console.log('━'.repeat(52));
  console.log('');
  console.log('Open this URL in your browser:');
  console.log('');
  console.log(url.toString());
  console.log('');
  console.log('After clicking "Authorise" in Canva, your browser will');
  console.log('redirect to 127.0.0.1:8080 and show a connection error.');
  console.log('That is expected — just copy the full URL from the');
  console.log('address bar and paste it back to Claude.');
  console.log('');
}

// ── Step 2: exchange code ─────────────────────────────────────────────────────

async function stepExchange(callbackUrl: string): Promise<void> {
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientSecret || clientSecret === 'your_canva_client_secret_here') {
    throw new Error('CANVA_CLIENT_SECRET is not set in .env');
  }

  // Read the saved verifier
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('No auth state found — run "npm run canva-auth" first to generate the URL');
  }
  const { codeVerifier } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as { codeVerifier: string };

  // Extract code from the callback URL
  let code: string | null;
  try {
    const parsed = new URL(callbackUrl);
    const error  = parsed.searchParams.get('error');
    if (error) throw new Error(`Canva returned error: ${error}`);
    code = parsed.searchParams.get('code');
  } catch (err) {
    throw new Error(`Could not parse callback URL: ${(err as Error).message}`);
  }

  if (!code) throw new Error('No "code" parameter in the callback URL');

  console.log('');
  console.log('✦  Canva OAuth — Step 2 of 2');
  console.log('━'.repeat(52));
  console.log('');
  console.log('Exchanging authorisation code for access token...');

  let responseData: Record<string, string>;
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
    responseData = response.data;
  } catch (err) {
    const e = err as AxiosError;
    const detail = e.response
      ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
      : e.message;
    throw new Error(`Token exchange failed — ${detail}`);
  }

  const { access_token, refresh_token, expires_in } = responseData;
  if (!access_token) throw new Error('No access_token in Canva response');

  upsertEnv('CANVA_API_TOKEN', access_token);
  if (refresh_token) upsertEnv('CANVA_REFRESH_TOKEN', refresh_token);

  // Clean up the temporary state file
  fs.unlinkSync(STATE_FILE);

  const hours = Math.round(Number(expires_in) / 3600);
  console.log('');
  console.log('✅ CANVA_API_TOKEN saved to .env');
  if (refresh_token) console.log('✅ CANVA_REFRESH_TOKEN saved to .env');
  console.log(`   Expires in ~${hours}h`);
  console.log('');
  console.log('Tell Claude to run the LinkedIn generator now.');
  console.log('');
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args         = process.argv.slice(2);
  const callbackIdx  = args.indexOf('--callback');
  const callbackUrl  = callbackIdx !== -1 ? args[callbackIdx + 1] : undefined;

  if (callbackUrl) {
    await stepExchange(callbackUrl);
  } else {
    stepGenerate();
  }
}

main().catch(err => {
  console.error('\n❌', (err as Error).message);
  process.exit(1);
});
