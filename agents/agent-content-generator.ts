import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { ClaudeClient } from '../utils/claude-client';
import { writeJson, readJson, ensureDir } from '../utils/file-helpers';
import { ApprovedListings, ReviewedListing } from './agent-listing-reviewer';

dotenv.config();

export interface InstagramContent {
  listing_id: string;
  caption: string;
  first_comment_hashtags: string;
  story_slides: string[];
  alt_text: string;
  suggested_posting_time: string;
}

export interface PinterestContent {
  listing_id: string;
  pin_title: string;
  pin_description: string;
  suggested_board: string;
  keyword_phrases: string[];
  image_text_overlay: string;
  pin_link: string;
}

const APPROVED_PATH = path.join('output', 'approved-listings.json');
const SOCIAL_CONTENT_DIR = path.join('output', 'social-content');

function getBoardNames(): string[] {
  const boardsPath = path.join('config', 'boards.json');
  if (!fs.existsSync(boardsPath)) return [];
  const raw = fs.readFileSync(boardsPath, 'utf-8');
  const parsed = JSON.parse(raw) as { boards: string[] };
  return parsed.boards ?? [];
}

async function generateInstagramContent(
  listing: ReviewedListing,
  claude: ClaudeClient
): Promise<InstagramContent> {
  const systemPrompt = `You are a social media copywriter for Big Little Pup Club, an Etsy shop selling dog breed gifts. You write warm, playful, relatable content — never corporate. The customer is a dog mum aged 25–55 in the US who treats her dog like family and loves discovering unique, heartfelt gifts. Return structured JSON only — no preamble.`;

  const userPrompt = `Write a complete Instagram post for this listing.

LISTING DATA:
Title: ${listing.title}
Price: ${listing.price}
URL: ${listing.url}
Score rationale: ${listing.score_rationale}
Instagram hook: ${listing.instagram_hook}
Content angle: ${listing.content_angle}

Return structured JSON only:
{
  "caption": "150–220 word caption: open with the hook → build emotional connection → product mention → soft CTA → sign-off with emoji",
  "first_comment_hashtags": "28–30 hashtags across 3 clusters: breed-specific niche, dog mum community, gift/discovery — space-separated",
  "story_slides": [
    "Slide 1: punchy hook, max 8 words",
    "Slide 2: product call-out, max 8 words",
    "Slide 3: CTA, max 8 words"
  ],
  "alt_text": "accessibility description, max 125 chars",
  "suggested_posting_time": "e.g. Tuesday 7pm EST — based on dog niche engagement peaks"
}`;

  const result = await claude.completeJson<Omit<InstagramContent, 'listing_id'>>(
    systemPrompt,
    userPrompt,
    'sonnet'
  );

  return { listing_id: listing.listing_id, ...result };
}

async function generatePinterestContent(
  listing: ReviewedListing,
  boards: string[],
  claude: ClaudeClient
): Promise<PinterestContent> {
  const systemPrompt = `You are a Pinterest content strategist for Big Little Pup Club, an Etsy shop selling dog breed gifts. Pinterest is a search engine — optimise all content for discoverability. Audience: planners, gift-givers, and dog moms searching for ideas. Return structured JSON only — no preamble.`;

  const boardsContext = boards.length > 0
    ? `EXISTING BOARDS: ${boards.join(', ')}`
    : 'No boards configured — suggest the most appropriate board name.';

  const userPrompt = `Write a complete Pinterest pin for this listing.

LISTING DATA:
Title: ${listing.title}
Price: ${listing.price}
URL: ${listing.url}
Score rationale: ${listing.score_rationale}
Pinterest hook: ${listing.pinterest_hook}
Content angle: ${listing.content_angle}

${boardsContext}

Return structured JSON only:
{
  "pin_title": "max 100 chars, front-load primary keywords",
  "pin_description": "max 500 chars, keyword-rich, benefit-led, includes CTA and mention of Etsy shop",
  "suggested_board": "which board this best fits — use an existing board name if listed above",
  "keyword_phrases": ["5 search phrases dog moms would use to find this"],
  "image_text_overlay": "max 8 words, bold and punchy — text overlaid on the pin image",
  "pin_link": "${listing.url}"
}`;

  const result = await claude.completeJson<Omit<PinterestContent, 'listing_id'>>(
    systemPrompt,
    userPrompt,
    'sonnet'
  );

  return { listing_id: listing.listing_id, ...result };
}

export async function runContentGenerator(): Promise<number> {
  const approvedData = readJson<ApprovedListings>(APPROVED_PATH);
  if (!approvedData) throw new Error('approved-listings.json not found — run Listing Reviewer first');

  const approvedListings = approvedData.listings.filter(l => l.approved);
  if (approvedListings.length === 0) {
    console.log('      No approved listings — nothing to generate');
    return 0;
  }

  ensureDir(SOCIAL_CONTENT_DIR);
  const boards = getBoardNames();
  const claude = new ClaudeClient();
  let generated = 0;

  for (const listing of approvedListings) {
    const igPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-instagram.json`);
    const pinPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-pinterest.json`);

    const igExists = fs.existsSync(igPath);
    const pinExists = fs.existsSync(pinPath);

    if (igExists && pinExists && process.env.FORCE_REFRESH !== 'true') {
      console.log(`      ↩ Skipping "${listing.title}" (already generated)`);
      generated++;
      continue;
    }

    console.log(`      Generating content for: "${listing.title}"`);

    try {
      if (!igExists || process.env.FORCE_REFRESH === 'true') {
        const igContent = await generateInstagramContent(listing, claude);
        writeJson(igPath, igContent);
      }

      if (!pinExists || process.env.FORCE_REFRESH === 'true') {
        const pinContent = await generatePinterestContent(listing, boards, claude);
        writeJson(pinPath, pinContent);
      }

      generated++;
    } catch (err) {
      console.warn(`  ⚠ Content generation failed for "${listing.title}": ${(err as Error).message}`);
    }
  }

  return generated;
}
