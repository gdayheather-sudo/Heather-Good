const https = require('https');

// Paste whichever token is currently showing in the Graph API Explorer Access Token box
const TOKEN = 'EAAStkNXGrqMBRGihOKU6eCT9jLeXL7PnqLY6bqZBePqFS4U6s8rlq5AZB6YLf7Cjaw1Ujca55n9CPudqDV4ogAjcyHTjMCMTuNPYwkOhMdOHrRcZBQOG8UfTMDLvpl6qpKEYZA4mZCZB9aXaZABJjHVmTHv9RB7lGNnuvPn1ht3Eh3ZBasJr1tMyWhs7kU5COW4ZD';

// Known Facebook Page ID for Biglittlepupclub
const BIGLITTLEPUPCLUB_PAGE_ID = '1038795102655811';

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
  console.log('Logged in as:', me.name);

  // Get pages to find Biglittlepupclub page access token
  console.log('\nFetching page access tokens...');
  const pages = await get(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${TOKEN}`);

  let pageToken = TOKEN; // fallback to user token
  if (pages.data) {
    const blpPage = pages.data.find(p => p.id === BIGLITTLEPUPCLUB_PAGE_ID || p.name.toLowerCase().includes('biglittle'));
    if (blpPage) {
      pageToken = blpPage.access_token;
      console.log('Found page:', blpPage.name, '| using page access token');
    }
  }

  // Query the page directly for all Instagram-related fields
  console.log('\nQuerying Biglittlepupclub page for Instagram account...');
  const pageData = await get(
    `https://graph.facebook.com/v21.0/${BIGLITTLEPUPCLUB_PAGE_ID}?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${pageToken}`
  );

  console.log('\nRaw page response:');
  console.log(JSON.stringify(pageData, null, 2));

  if (pageData.instagram_business_account) {
    const igId = pageData.instagram_business_account.id;
    const ig = await get(`https://graph.facebook.com/v21.0/${igId}?fields=id,username&access_token=${pageToken}`);
    console.log('\n==============================');
    console.log('SUCCESS! Instagram Business Account found:');
    console.log('INSTAGRAM_USER_ID=' + igId);
    console.log('INSTAGRAM_ACCESS_TOKEN=' + pageToken);
    console.log('==============================');
    return;
  }

  if (pageData.connected_instagram_account) {
    const igId = pageData.connected_instagram_account.id;
    console.log('\n==============================');
    console.log('SUCCESS! Connected Instagram found:');
    console.log('INSTAGRAM_USER_ID=' + igId);
    console.log('INSTAGRAM_ACCESS_TOKEN=' + pageToken);
    console.log('==============================');
    return;
  }

  // If still nothing, show diagnostic info
  console.log('\n--- DIAGNOSTIC INFO ---');
  console.log('The Instagram account is connected in Facebook but not visible via API.');
  console.log('This usually means the connection needs to be made through Facebook Page Settings.');
  console.log('\nTo fix this ON DESKTOP:');
  console.log('1. Go to facebook.com on your browser');
  console.log('2. Click on "Biglittlepupclub" page');
  console.log('3. Click Settings (gear icon or top menu)');
  console.log('4. Look for "Linked accounts" or "Instagram" in the left menu');
  console.log('5. Click "Connect" next to Instagram');
  console.log('6. Log in with your @biglittlepupclub Instagram credentials');
  console.log('7. Run this script again');
}

run();
