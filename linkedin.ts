import dotenv from 'dotenv';
dotenv.config();

import { runLinkedInDesigner, LinkedInPostInput } from './agents/agent-linkedin-designer';

// ── CLI argument parser ───────────────────────────────────────────────────────

function parseArgs(): LinkedInPostInput {
  const args = process.argv.slice(2);

  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return undefined;
    return args[idx + 1];
  };

  const postText = get('--post-text');
  const hook     = get('--hook');
  const cta      = get('--cta');

  if (!postText || !hook) {
    console.error('');
    console.error('Usage:');
    console.error('  ts-node linkedin.ts --post-text "..." --hook "..." [--cta "..."]');
    console.error('');
    console.error('Arguments:');
    console.error('  --post-text   Full post copy (required)');
    console.error('  --hook        First line / headline (required)');
    console.error('  --cta         Closing call-to-action (optional)');
    console.error('');
    console.error('Example:');
    console.error(
      `  ts-node linkedin.ts \\\n` +
      `    --post-text "I spent 10 years in finance before I realised the system wasn't broken. I just didn't have the right tools. That's why I built The Clarity Hub." \\\n` +
      `    --hook "I spent 10 years in finance before I realised the system wasn't broken." \\\n` +
      `    --cta "Follow for more."`
    );
    console.error('');
    process.exit(1);
  }

  return { postText, hook, optionalCta: cta };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('');
  console.log('✦  The Clarity Hub — LinkedIn Graphic Generator');
  console.log('━'.repeat(50));

  const input = parseArgs();

  const hookWordCount = input.hook.trim().split(/\s+/).filter(Boolean).length;

  console.log('');
  console.log('Post details:');
  console.log(`  Hook (${hookWordCount} words): "${input.hook}"`);
  if (input.optionalCta) {
    console.log(`  CTA: "${input.optionalCta}"`);
  }
  console.log('');
  console.log('Generating graphics via Canva Connect API...');
  console.log('');

  try {
    const result = await runLinkedInDesigner(input);

    // ── Output confirmation (spec format) ─────────────────────────────────
    console.log('');
    console.log('━'.repeat(50));
    console.log('');
    console.log(`✅ Square:   ${result.squarePath}`);
    console.log(`✅ Portrait: ${result.portraitPath}`);
    console.log(`📐 Hook used: "${result.hookUsed}"`);

    if (result.squareEditUrl || result.portraitEditUrl) {
      console.log('');
      console.log('🔗 Edit in Canva:');
      if (result.squareEditUrl)   console.log(`   Square:   ${result.squareEditUrl}`);
      if (result.portraitEditUrl) console.log(`   Portrait: ${result.portraitEditUrl}`);
    }

    if (result.flags.length > 0) {
      console.log('');
      result.flags.forEach(f => console.log(`⚠️  ${f}`));
    }

    console.log('');

  } catch (err) {
    const message = (err as Error).message;
    console.error('');
    console.error('❌ Generator failed');
    console.error('');

    // Surface setup errors cleanly without a raw stack trace
    if (
      message.includes('CANVA_API_TOKEN') ||
      message.includes('CANVA_SQUARE_TEMPLATE_ID') ||
      message.includes('CANVA_PORTRAIT_TEMPLATE_ID')
    ) {
      // Multi-line setup instructions — print each line cleanly
      message.split('\n').forEach(line => console.error(`   ${line}`));
    } else {
      console.error(`   ${message}`);
    }

    console.error('');
    process.exit(1);
  }
}

main();
