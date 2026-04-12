/**
 * Big Little Pup Club — Instagram Setup Helper
 *
 * Run this once to find your Instagram Business Account ID and check
 * what Facebook Pages and Instagram accounts are linked to your token.
 *
 * Usage:
 *   npx ts-node setup/get-instagram-id.ts
 *
 * It will print your INSTAGRAM_USER_ID and update your .env automatically.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.INSTAGRAM_ACCESS_TOKEN || '';
if (!token) {
  console.error('❌ INSTAGRAM_ACCESS_TOKEN is not set in .env');
  console.error('   Paste your Facebook token into .env as INSTAGRAM_ACCESS_TOKEN=...');
  process.exit(1);
}

const BASE = 'https://graph.facebook.com/v21.0';

async function run(): Promise<void> {
  console.log('🔍 Checking your Facebook token...\n');

  // Step 1: Get basic user info
  let meData: { id: string; name: string };
  try {
    const res = await axios.get<{ id: string; name: string }>(`${BASE}/me`, {
      params: { fields: 'id,name', access_token: token },
    });
    meData = res.data;
    console.log(`✓ Token valid — logged in as: ${meData.name} (FB User ID: ${meData.id})`);
  } catch (err) {
    const errData = (err as { response?: { data: unknown } }).response?.data;
    console.error('❌ Token invalid or expired:', JSON.stringify(errData));
    console.error('\n   Get a fresh token at: https://developers.facebook.com/tools/explorer/');
    process.exit(1);
  }

  // Step 2: Get Facebook Pages linked to the user
  console.log('\n📄 Fetching your Facebook Pages...');
  interface Page {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }
  let pages: Page[] = [];
  try {
    const res = await axios.get<{ data: Page[] }>(`${BASE}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,instagram_business_account',
        access_token: token,
      },
    });
    pages = res.data.data ?? [];
  } catch (err) {
    const errData = (err as { response?: { data: unknown } }).response?.data;
    console.error('❌ Could not fetch Facebook Pages:', JSON.stringify(errData));
    console.error('\n   Make sure your token has the "pages_show_list" permission.');
    console.error('   Re-generate at: https://developers.facebook.com/tools/explorer/');
    process.exit(1);
  }

  if (pages.length === 0) {
    console.log('\n⚠️  No Facebook Pages found on this account.');
    console.log('   You need a Facebook Page linked to your BigLittlePupClub Instagram.');
    console.log('\n   Steps:');
    console.log('   1. Create a Facebook Page: https://www.facebook.com/pages/create');
    console.log('   2. In Instagram app → Settings → Account → Linked Accounts → link your new Page');
    console.log('   3. Re-run this script');
    process.exit(0);
  }

  console.log(`\n✓ Found ${pages.length} Facebook Page(s):\n`);

  let instagramUserId: string | null = null;
  let instagramPageToken: string | null = null;

  for (const page of pages) {
    console.log(`   📄 Page: "${page.name}" (ID: ${page.id})`);

    if (page.instagram_business_account?.id) {
      const igId = page.instagram_business_account.id;
      console.log(`   📱 Linked Instagram Business Account ID: ${igId}`);

      // Verify the Instagram account
      try {
        const igRes = await axios.get<{ id: string; username: string; name: string }>(
          `${BASE}/${igId}`,
          {
            params: {
              fields: 'id,username,name,followers_count',
              access_token: page.access_token,
            },
          }
        );
        const ig = igRes.data;
        console.log(`   ✓ Instagram username: @${ig.username}`);

        if (!instagramUserId) {
          instagramUserId = ig.id;
          instagramPageToken = page.access_token;
        }
      } catch {
        console.warn(`   ⚠ Could not verify Instagram account ${igId}`);
      }
    } else {
      console.log(`   ⚠ No Instagram Business Account linked to this Page`);
      console.log(`     → In Instagram: Settings → Account → Linked Accounts → Facebook → link "${page.name}"`);
    }

    console.log('');
  }

  if (!instagramUserId || !instagramPageToken) {
    console.log('⚠️  No Instagram Business Account found linked to any of your Facebook Pages.');
    console.log('\n   To fix:');
    console.log('   1. Open Instagram app');
    console.log('   2. Go to Settings → Account → Linked Accounts → Facebook');
    console.log('   3. Select one of your Facebook Pages listed above');
    console.log('   4. Re-run this script');
    process.exit(0);
  }

  // Step 3: Update .env with the Instagram User ID and Page token
  console.log('✅ Success! Updating .env...\n');

  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  function setEnvVar(content: string, key: string, value: string): string {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  envContent = setEnvVar(envContent, 'INSTAGRAM_USER_ID', instagramUserId);
  envContent = setEnvVar(envContent, 'INSTAGRAM_ACCESS_TOKEN', instagramPageToken);

  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log(`   INSTAGRAM_USER_ID=${instagramUserId} ✓`);
  console.log(`   INSTAGRAM_ACCESS_TOKEN=...${instagramPageToken.slice(-8)} ✓`);
  console.log('\n⚠️  Note: This Page access token is long-lived but check expiry.');
  console.log('   Set a calendar reminder to refresh in 60 days.');
  console.log('   Refresh at: https://developers.facebook.com/tools/explorer/');
  console.log('\n🎉 Instagram is ready! Set DRY_RUN=false in .env to enable live posting.');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
