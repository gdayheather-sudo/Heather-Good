import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { NotionClient } from '../utils/notion-client';
import { readJson } from '../utils/file-helpers';
import { ApprovedListings, ReviewedListing } from './agent-listing-reviewer';
import { InstagramContent, PinterestContent } from './agent-content-generator';

dotenv.config();

const APPROVED_PATH = path.join('output', 'approved-listings.json');
const SOCIAL_CONTENT_DIR = path.join('output', 'social-content');

export async function runNotionExporter(): Promise<{ exported: number; skipped: number }> {
  const approvedData = readJson<ApprovedListings>(APPROVED_PATH);
  if (!approvedData) throw new Error('approved-listings.json not found — run Listing Reviewer first');

  const approvedListings = approvedData.listings.filter(l => l.approved);
  if (approvedListings.length === 0) {
    console.log('      No approved listings to export');
    return { exported: 0, skipped: 0 };
  }

  const notion = new NotionClient();
  let exported = 0;
  let skipped = 0;

  for (const listing of approvedListings) {
    // Load generated content
    const igPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-instagram.json`);
    const pinPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-pinterest.json`);

    const ig = readJson<InstagramContent>(igPath);
    const pin = readJson<PinterestContent>(pinPath);

    if (!ig || !pin) {
      console.warn(`      ⚠ Skipping "${listing.title}" — content not generated yet`);
      skipped++;
      continue;
    }

    // Skip if already in Notion (unless force refresh)
    if (process.env.FORCE_REFRESH !== 'true') {
      const exists = await notion.pageExists(listing.listing_id);
      if (exists) {
        console.log(`      ↩ Already in Notion: "${listing.title}"`);
        skipped++;
        continue;
      }
    }

    console.log(`      Exporting to Notion: "${listing.title}"`);

    try {
      await notion.createListingPage({
        listing_id: listing.listing_id,
        title: listing.title,
        score: listing.score,
        content_angle: listing.content_angle,
        price: listing.price,
        url: listing.url,
        image_url: listing.primary_image_url,

        instagram_caption: ig.caption,
        instagram_hashtags: ig.first_comment_hashtags,
        story_slide_1: ig.story_slides[0] ?? '',
        story_slide_2: ig.story_slides[1] ?? '',
        story_slide_3: ig.story_slides[2] ?? '',
        best_posting_time: ig.suggested_posting_time,
        alt_text: ig.alt_text,

        pinterest_title: pin.pin_title,
        pinterest_description: pin.pin_description,
        pinterest_board: pin.suggested_board,
        pinterest_keywords: pin.keyword_phrases.join(', '),
        pinterest_overlay: pin.image_text_overlay,
      });

      exported++;
    } catch (err) {
      console.warn(`      ⚠ Failed to export "${listing.title}": ${(err as Error).message}`);
      skipped++;
    }
  }

  return { exported, skipped };
}

export async function getNotionApprovals(): Promise<Set<string>> {
  const notion = new NotionClient();
  const approved = await notion.getApprovedPages();
  const ids = new Set(approved.map(p => p.listing_id).filter(Boolean));
  console.log(`      Found ${ids.size} listing(s) approved in Notion`);
  return ids;
}
