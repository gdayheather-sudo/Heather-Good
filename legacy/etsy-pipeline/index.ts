import dotenv from 'dotenv';
dotenv.config();

import { runShopAuditor } from './agents/agent-shop-auditor';
import { runCompetitorAnalyst } from './agents/agent-competitor-analyst';
import { runListingReviewer } from './agents/agent-listing-reviewer';
import { runContentGenerator } from './agents/agent-content-generator';
import { runPublisher } from './agents/agent-publisher';
import { runNotionExporter, getNotionApprovals } from './agents/agent-notion-exporter';

const useNotion = !!process.env.NOTION_API_KEY && process.env.NOTION_API_KEY !== 'your_notion_api_key_here';
const isDryRun = process.env.DRY_RUN !== 'false';

async function runPipeline(): Promise<void> {
  console.log('🐾 Big Little Pup Club — Social Media Agent Pipeline');
  console.log('='.repeat(52));
  console.log(`Mode:          ${isDryRun ? '📄 Report Only (DRY RUN)' : '🚀 Live Posting'}`);
  console.log(`Approvals:     ${useNotion ? '✅ Notion approval gate enabled' : '⚠️  No Notion key — skipping approval gate'}`);
  console.log(`Min score:     ${process.env.MIN_SCORE || 7}`);
  console.log(`Review model:  ${process.env.USE_HAIKU_FOR_REVIEW === 'true' ? 'claude-haiku-4-5 (cost-saver)' : 'claude-sonnet-4-6'}`);
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

    // ── Notion approval gate ──────────────────────────────────────────────────
    if (useNotion) {
      console.log('[4b] 📋 Notion Exporter — pushing content for your review...');
      const { exported, skipped } = await runNotionExporter();
      console.log(`      ✓ ${exported} new listing(s) pushed to Notion, ${skipped} skipped`);

      if (!isDryRun) {
        console.log('');
        console.log('      ⏸  APPROVAL REQUIRED');
        console.log('      Open your Notion database and change Status to "Approved"');
        console.log('      for each post you want to go live, then re-run:');
        console.log('      npm run publish');
        console.log('');
        console.log('      (Run "npm run pipeline" to regenerate + re-export content)');
        return;
      }
      console.log('');
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[5/5] 📤 Publisher — compiling report...');
    await runPublisher();
    console.log('');

    console.log('✨ Pipeline complete!');
    console.log('');
    console.log('📄 Content report: output/social-content-report.md');
    console.log('📁 Individual posts: output/social-content/');

    if (!isDryRun) {
      console.log('📊 Publish log:    output/publish-log.json');
    }

    console.log('');
    if (isDryRun) {
      console.log('💡 Next steps:');
      if (useNotion) {
        console.log('   1. Review and approve posts in your Notion database');
        console.log('   2. Set DRY_RUN=false in .env');
        console.log('   3. Run: npm run publish');
      } else {
        console.log('   1. Add NOTION_API_KEY + NOTION_DATABASE_ID to .env for approval workflow');
        console.log('   2. Or set DRY_RUN=false to post directly (no approval gate)');
      }
    }

  } catch (err) {
    console.error('');
    console.error('❌ Pipeline failed:', (err as Error).message);
    if ((err as Error).message.includes('ANTHROPIC_API_KEY')) {
      console.error('\n   Add your Anthropic API key to .env:');
      console.error('   ANTHROPIC_API_KEY=sk-ant-...');
      console.error('   Get your key at: https://console.anthropic.com');
    }
    process.exit(1);
  }
}

// ── Standalone publish command ────────────────────────────────────────────────
// Run with: npm run publish
// Reads Notion approvals and posts only approved listings
async function runPublishOnly(): Promise<void> {
  console.log('🐾 Big Little Pup Club — Publish Approved Posts');
  console.log('='.repeat(52));
  console.log('');

  try {
    if (useNotion) {
      console.log('📋 Reading approvals from Notion...');
      const approvedIds = await getNotionApprovals();
      if (approvedIds.size === 0) {
        console.log('   No listings approved in Notion yet.');
        console.log('   Open your Notion database and set Status → "Approved" for posts to publish.');
        return;
      }
      process.env.NOTION_APPROVED_IDS = [...approvedIds].join(',');
    }

    console.log('📤 Publishing...');
    await runPublisher();

    console.log('\n✨ Done! Check output/publish-log.json for results.');
  } catch (err) {
    console.error('❌ Publish failed:', (err as Error).message);
    process.exit(1);
  }
}

// Entry point — check if running as publish-only
const isPublishOnly = process.argv.includes('--publish-only');
if (isPublishOnly) {
  runPublishOnly();
} else {
  runPipeline();
}
