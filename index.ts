import dotenv from 'dotenv';
dotenv.config();

import { runShopAuditor } from './agents/agent-shop-auditor';
import { runCompetitorAnalyst } from './agents/agent-competitor-analyst';
import { runListingReviewer } from './agents/agent-listing-reviewer';
import { runContentGenerator } from './agents/agent-content-generator';
import { runPublisher } from './agents/agent-publisher';

async function runPipeline(): Promise<void> {
  console.log('🐾 Big Little Pup Club — Social Media Agent Pipeline');
  console.log('='.repeat(52));
  console.log(`Mode: ${process.env.DRY_RUN === 'false' ? '🚀 Live Posting' : '📄 Report Only (DRY RUN)'}`);
  console.log(`Min score threshold: ${process.env.MIN_SCORE || 7}`);
  console.log(`Reviewer model: ${process.env.USE_HAIKU_FOR_REVIEW === 'true' ? 'claude-haiku-4-5 (cost-saver)' : 'claude-sonnet-4-6'}`);
  console.log('');

  try {
    console.log('[1/5] 🔍 Shop Auditor — fetching your Etsy listings...');
    const shopData = await runShopAuditor();
    console.log(`      ✓ Found ${shopData.total_active_listings} active listings for "${shopData.shop_name}"`);
    console.log('');

    console.log('[2/5] 🏪 Competitor Analyst — researching the market...');
    const competitorAnalysis = await runCompetitorAnalyst();
    if (competitorAnalysis.competitor_shops.length > 0) {
      console.log(`      ✓ Analysed ${competitorAnalysis.competitor_shops.length} competitor shops`);
    } else {
      console.log(`      ✓ Skipped (no competitor shops configured)`);
    }
    console.log('');

    console.log('[3/5] ✅ Listing Reviewer — scoring your listings...');
    const { approved, rejected } = await runListingReviewer();
    console.log(`      ✓ ${approved} listings approved, ${rejected} below threshold`);
    console.log('');

    console.log('[4/5] ✍️  Content Generator — writing your social posts...');
    const generated = await runContentGenerator();
    console.log(`      ✓ Generated Instagram + Pinterest content for ${generated} listings`);
    console.log('');

    console.log('[5/5] 📤 Publisher — compiling report...');
    await runPublisher();
    console.log('');

    console.log('✨ Pipeline complete!');
    console.log('');
    console.log('📄 Content report: output/social-content-report.md');
    console.log('📁 Individual posts: output/social-content/');

    if (process.env.DRY_RUN === 'false') {
      console.log('📊 Publish log:    output/publish-log.json');
    }

    console.log('');
    if (process.env.DRY_RUN !== 'false') {
      console.log('💡 To enable live posting:');
      console.log('   1. Set DRY_RUN=false in .env');
      console.log('   2. Add PINTEREST_ACCESS_TOKEN to .env');
      console.log('   3. Create a Facebook Page → link to BigLittlePupClub Instagram');
      console.log('   4. Set up Meta Developer app → add INSTAGRAM_USER_ID + INSTAGRAM_ACCESS_TOKEN');
    }

  } catch (err) {
    console.error('');
    console.error('❌ Pipeline failed:', (err as Error).message);
    if ((err as Error).message.includes('ANTHROPIC_API_KEY')) {
      console.error('');
      console.error('   Add your Anthropic API key to .env:');
      console.error('   ANTHROPIC_API_KEY=sk-ant-...');
      console.error('   Get your key at: https://console.anthropic.com');
    }
    process.exit(1);
  }
}

runPipeline();
