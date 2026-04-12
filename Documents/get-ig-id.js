const https = require('https');

const TOKEN = 'EAAStkNXGrqMBRGihOKU6eCT9jLeXL7PnqLY6bqZBePqFS4U6s8rlq5AZB6YLf7Cjaw1Ujca55n9CPudqDV4ogAjcyHTjMCMTuNPYwkOhMdOHrRcZBQOG8UfTMDLvpl6qpKEYZA4mZCZB9aXaZABJjHVmTHv9RB7lGNnuvPn1ht3Eh3ZBasJr1tMyWhs7kU5COW4ZD';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Checking token...');
  const me = await get(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${TOKEN}`);
  if (me.error) { console.error('Token error:', me.error.message); return; }
  console.log('Logged in as:', me.name, '\n');

  // Check what permissions this token actually has
  console.log('Checking token permissions...');
  const perms = await get(`https://graph.facebook.com/v21.0/me/permissions?access_token=${TOKEN}`);
  const granted = (perms.data || []).filter(p => p.status === 'granted').map(p => p.permission);
  console.log('Granted permissions:', granted.join(', ') || 'none found');

  const hasInstagram = granted.includes('instagram_basic') || granted.includes('instagram_manage_content');
  if (!hasInstagram) {
    console.log('\n*** TOKEN IS MISSING INSTAGRAM PERMISSIONS ***');
    console.log('You need to generate a new token with these permissions:');
    console.log('  - pages_show_list');
    console.log('  - instagram_basic');
    console.log('  - instagram_content_publish');
    console.log('  - pages_read_engagement');
    console.log('\nSteps to get new token:');
    console.log('1. Go to: https://developers.facebook.com/tools/explorer/');
    console.log('2. Select your App in the top right dropdown');
    console.log('3. Click "Generate Access Token"');
    console.log('4. Tick these permissions: pages_show_list, instagram_basic,');
    console.log('   instagram_content_publish, pages_read_engagement');
    console.log('5. Click Generate, copy the token, replace TOKEN in this file');
    return;
  }

  console.log('\nFetching pages with Instagram fields...');
  const pages = await get(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account,connected_instagram_account&access_token=${TOKEN}`
  );

  if (!pages.data || pages.data.length === 0) {
    console.log('No pages found.'); return;
  }

  for (const page of pages.data) {
    console.log('\nPage:', page.name, '| ID:', page.id);

    // Try instagram_business_account first
    if (page.instagram_business_account) {
      const igId = page.instagram_business_account.id;
      const ig = await get(`https://graph.facebook.com/v21.0/${igId}?fields=id,username&access_token=${page.access_token}`);
      console.log('  Instagram Business Account: @' + ig.username + ' (ID: ' + ig.id + ')');
      console.log('\n==============================');
      console.log('INSTAGRAM_USER_ID=' + ig.id);
      console.log('INSTAGRAM_ACCESS_TOKEN=' + page.access_token);
      console.log('==============================');
      console.log('\nCopy these two lines and send them back!');
      return;
    }

    // Try connected_instagram_account fallback
    if (page.connected_instagram_account) {
      const igId = page.connected_instagram_account.id;
      const ig = await get(`https://graph.facebook.com/v21.0/${igId}?fields=id,username&access_token=${page.access_token}`);
      console.log('  Connected Instagram: @' + (ig.username || igId) + ' (ID: ' + igId + ')');
      console.log('\n==============================');
      console.log('INSTAGRAM_USER_ID=' + igId);
      console.log('INSTAGRAM_ACCESS_TOKEN=' + page.access_token);
      console.log('==============================');
      console.log('\nCopy these two lines and send them back!');
      return;
    }

    console.log('  No Instagram linked via API (check permissions above)');
  }
}

run();
