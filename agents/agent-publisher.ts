import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { PinterestClient, PinterestPin } from '../utils/pinterest-client';
import { InstagramClient } from '../utils/instagram-client';
import { writeJson, writeText, readJson, ensureDir } from '../utils/file-helpers';
import { ApprovedListings, ReviewedListing } from './agent-listing-reviewer';
import { InstagramContent, PinterestContent } from './agent-content-generator';

dotenv.config();

interface PublishLogEntry {
  listing_id: string;
  title: string;
  platform: 'instagram' | 'pinterest';
  success: boolean;
  url?: string;
  error?: string;
  timestamp: string;
  note?: string;
}

interface PublishLog {
  run_at: string;
  dry_run: boolean;
  entries: PublishLogEntry[];
  token_reminder?: string;
}

const APPROVED_PATH = path.join('output', 'approved-listings.json');

// Filter listings to only Notion-approved ones when running in live mode
function filterByNotionApprovals(listings: ReviewedListing[]): ReviewedListing[] {
  const notionIds = process.env.NOTION_APPROVED_IDS;
  if (!notionIds) return listings; // no filter — use all approved
  const approvedSet = new Set(notionIds.split(',').filter(Boolean));
  return listings.filter(l => approvedSet.has(l.listing_id));
}
const SOCIAL_CONTENT_DIR = path.join('output', 'social-content');
const REPORT_PATH = path.join('output', 'social-content-report.md');
const PUBLISH_LOG_PATH = path.join('output', 'publish-log.json');

function formatPrice(price: string): string {
  return price || 'N/A';
}

function buildMarkdownReport(
  approvedListings: ReviewedListing[],
  igMap: Map<string, InstagramContent>,
  pinMap: Map<string, PinterestContent>
): string {
  const lines: string[] = [
    '# Big Little Pup Club — Social Media Content Report',
    `_Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST_`,
    `_Listings approved: ${approvedListings.length}_`,
    '',
    '---',
    '',
  ];

  for (const listing of approvedListings) {
    const ig = igMap.get(listing.listing_id);
    const pin = pinMap.get(listing.listing_id);

    lines.push(`## ${listing.title}`);
    lines.push(`**Score:** ${listing.score}/10 | **Angle:** ${listing.content_angle} | **Price:** ${formatPrice(listing.price)}`);
    lines.push(`**URL:** ${listing.url}`);
    if (listing.primary_image_url) {
      lines.push(`**Image:** ${listing.primary_image_url}`);
    }
    lines.push('');

    if (ig) {
      lines.push('### 📱 Instagram');
      lines.push('**Caption:**');
      lines.push(ig.caption);
      lines.push('');
      lines.push('**First Comment Hashtags:**');
      lines.push(ig.first_comment_hashtags);
      lines.push('');
      lines.push('**Story Slides:**');
      for (const slide of ig.story_slides) {
        lines.push(`- ${slide}`);
      }
      lines.push('');
      lines.push(`**Alt Text:** ${ig.alt_text}`);
      lines.push(`**Best Posting Time:** ${ig.suggested_posting_time}`);
      lines.push('');
    } else {
      lines.push('### 📱 Instagram');
      lines.push('_Content not generated for this listing_');
      lines.push('');
    }

    if (pin) {
      lines.push('### 📌 Pinterest');
      lines.push(`**Pin Title:** ${pin.pin_title}`);
      lines.push('');
      lines.push('**Pin Description:**');
      lines.push(pin.pin_description);
      lines.push('');
      lines.push(`**Suggested Board:** ${pin.suggested_board}`);
      lines.push(`**Image Text Overlay:** ${pin.image_text_overlay}`);
      lines.push(`**Keywords:** ${pin.keyword_phrases.join(', ')}`);
      lines.push('');
    } else {
      lines.push('### 📌 Pinterest');
      lines.push('_Content not generated for this listing_');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export async function runPublisher(): Promise<void> {
  const approvedData = readJson<ApprovedListings>(APPROVED_PATH);
  if (!approvedData) throw new Error('approved-listings.json not found — run Listing Reviewer first');

  const allApproved = approvedData.listings.filter(l => l.approved);
  const approvedListings = filterByNotionApprovals(allApproved);
  if (process.env.NOTION_APPROVED_IDS) {
    console.log(`      Notion filter active: ${approvedListings.length}/${allApproved.length} listings approved for publishing`);
  }
  ensureDir(SOCIAL_CONTENT_DIR);

  // Load all generated content
  const igMap = new Map<string, InstagramContent>();
  const pinMap = new Map<string, PinterestContent>();

  for (const listing of approvedListings) {
    const igPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-instagram.json`);
    const pinPath = path.join(SOCIAL_CONTENT_DIR, `${listing.listing_id}-pinterest.json`);

    const ig = readJson<InstagramContent>(igPath);
    if (ig) igMap.set(listing.listing_id, ig);

    const pin = readJson<PinterestContent>(pinPath);
    if (pin) pinMap.set(listing.listing_id, pin);
  }

  // Always build the Markdown report
  const report = buildMarkdownReport(approvedListings, igMap, pinMap);
  writeText(REPORT_PATH, report);
  console.log(`      ✓ Report written to ${REPORT_PATH}`);

  const isDryRun = process.env.DRY_RUN !== 'false';

  if (isDryRun) {
    console.log('      ℹ DRY_RUN=true — skipping live posting. Set DRY_RUN=false to enable.');
    return;
  }

  // Live posting mode
  const publishLog: PublishLog = {
    run_at: new Date().toISOString(),
    dry_run: false,
    entries: [],
    token_reminder:
      'Instagram long-lived tokens expire after 60 days. ' +
      'Refresh at: https://developers.facebook.com/tools/explorer — set a calendar reminder!',
  };

  // Pinterest posting
  const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN;
  if (pinterestToken) {
    console.log('      📌 Posting to Pinterest...');
    try {
      const pinterest = new PinterestClient();
      const tokenValid = await pinterest.verifyToken();
      if (!tokenValid) {
        console.warn('      ⚠ Pinterest token invalid — skipping Pinterest posting');
      } else {
        const boards = await pinterest.getBoards();

        for (const listing of approvedListings) {
          const pin = pinMap.get(listing.listing_id);
          if (!pin || !listing.primary_image_url) continue;

          // Find matching board ID
          let boardId = await pinterest.findBoardByName(pin.suggested_board, boards);
          if (!boardId && boards.length > 0) {
            boardId = boards[0].id; // Fall back to first board
          }
          if (!boardId) {
            publishLog.entries.push({
              listing_id: listing.listing_id,
              title: listing.title,
              platform: 'pinterest',
              success: false,
              error: 'No Pinterest boards found — create a board first',
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          const pinPayload: PinterestPin = {
            pin_title: pin.pin_title,
            pin_description: pin.pin_description,
            suggested_board: pin.suggested_board,
            keyword_phrases: pin.keyword_phrases,
            image_text_overlay: pin.image_text_overlay,
            pin_link: listing.url,
            image_url: listing.primary_image_url,
            board_id: boardId,
          };

          const result = await pinterest.createPin(pinPayload, boardId);
          publishLog.entries.push({
            listing_id: listing.listing_id,
            title: listing.title,
            platform: 'pinterest',
            success: result.success,
            url: result.pin_url,
            error: result.error,
            timestamp: new Date().toISOString(),
          });

          if (result.success) {
            console.log(`      ✓ Pinned: ${listing.title} → ${result.pin_url}`);
          } else {
            console.warn(`      ✗ Pin failed: ${listing.title} — ${result.error}`);
          }
        }
      }
    } catch (err) {
      console.warn(`      ⚠ Pinterest posting error: ${(err as Error).message}`);
    }
  } else {
    console.log('      ℹ PINTEREST_ACCESS_TOKEN not set — skipping Pinterest posting');
  }

  // Instagram posting
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (igUserId && igToken) {
    console.log('      📱 Posting to Instagram...');
    try {
      const instagram = new InstagramClient();
      const tokenValid = await instagram.verifyToken();
      if (!tokenValid) {
        console.warn('      ⚠ Instagram token invalid — skipping Instagram posting');
        console.warn('         Set up your Facebook Page and Meta app first (see .env.example for steps)');
      } else {
        for (const listing of approvedListings) {
          const ig = igMap.get(listing.listing_id);
          if (!ig || !listing.primary_image_url) continue;

          const result = await instagram.postImage({
            caption: ig.caption,
            image_url: listing.primary_image_url,
            listing_id: listing.listing_id,
          });

          publishLog.entries.push({
            listing_id: listing.listing_id,
            title: listing.title,
            platform: 'instagram',
            success: result.success,
            url: result.permalink,
            error: result.error,
            timestamp: new Date().toISOString(),
            note: result.token_expires_warning,
          });

          if (result.success) {
            console.log(`      ✓ Posted to Instagram: ${listing.title} → ${result.permalink}`);
          } else {
            console.warn(`      ✗ Instagram post failed: ${listing.title} — ${result.error}`);
          }
        }
      }
    } catch (err) {
      const message = (err as Error).message;
      console.warn(`      ⚠ Instagram posting error:\n${message}`);
    }
  } else {
    console.log('      ℹ Instagram tokens not set — skipping Instagram posting');
    console.log('         See .env.example for setup instructions (requires Facebook Page link)');
  }

  writeJson(PUBLISH_LOG_PATH, publishLog);
  console.log(`      ✓ Publish log saved to ${PUBLISH_LOG_PATH}`);
}
