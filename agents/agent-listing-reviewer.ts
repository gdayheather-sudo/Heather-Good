import path from 'path';
import dotenv from 'dotenv';
import { ClaudeClient } from '../utils/claude-client';
import { writeJson, readJson } from '../utils/file-helpers';
import { ShopAudit } from './agent-shop-auditor';
import { CompetitorAnalysis } from './agent-competitor-analyst';
import { EtsyListing } from '../utils/etsy-client';

dotenv.config();

export interface ReviewedListing {
  listing_id: string;
  title: string;
  primary_image_url: string;
  url: string;
  price: string;
  score: number;
  score_rationale: string;
  instagram_hook: string;
  pinterest_hook: string;
  content_angle: 'gift_idea' | 'lifestyle' | 'breed_spotlight' | 'humour' | 'product_feature' | 'seasonal';
  approved: boolean;
  rejection_reason: string | null;
}

export interface ApprovedListings {
  reviewed_at: string;
  min_score: number;
  total_reviewed: number;
  approved_count: number;
  rejected_count: number;
  listings: ReviewedListing[];
}

const SHOP_AUDIT_PATH = path.join('output', 'shop-audit.json');
const COMPETITOR_PATH = path.join('output', 'competitor-analysis.json');
const OUTPUT_PATH = path.join('output', 'approved-listings.json');

const BATCH_SIZE = 10; // Process in batches to respect Claude rate limits

function formatPrice(listing: EtsyListing): string {
  const { amount, divisor, currency_code } = listing.price;
  return `${currency_code} ${(amount / divisor).toFixed(2)}`;
}

async function reviewListing(
  listing: EtsyListing,
  competitorAnalysis: CompetitorAnalysis,
  claude: ClaudeClient,
  minScore: number
): Promise<ReviewedListing> {
  const useHaiku = process.env.USE_HAIKU_FOR_REVIEW === 'true';

  const systemPrompt = `You are a social media content strategist for an Etsy POD shop selling dog breed gifts targeting dog moms aged 25–55 in the US market. You return structured JSON only — no preamble or commentary outside the JSON.`;

  const listingForPrompt = {
    listing_id: String(listing.listing_id),
    title: listing.title,
    description: listing.description.slice(0, 500),
    tags: listing.tags,
    price: formatPrice(listing),
    views: listing.views,
    num_favorers: listing.num_favorers,
  };

  const userPrompt = `Score this Etsy listing for Instagram and Pinterest social content potential.

LISTING:
${JSON.stringify(listingForPrompt, null, 2)}

COMPETITOR MARKET CONTEXT:
Top keywords in niche: ${competitorAnalysis.top_keywords.join(', ')}
Content themes: ${competitorAnalysis.content_themes.join(', ')}
Trending breeds: ${competitorAnalysis.trending_breeds.join(', ')}
Market gaps: ${competitorAnalysis.market_gaps.join('; ')}

Score 1–10 considering:
- Visual appeal potential (inferred from title, description, product type)
- Emotional resonance with dog owners / dog moms
- Keyword strength vs competitor data
- Uniqueness and differentiation from competitors
- Seasonality or gift occasion relevance

Return structured JSON only:
{
  "listing_id": "${listing.listing_id}",
  "title": "${listing.title.replace(/"/g, '\\"')}",
  "score": 0,
  "score_rationale": "one sentence explanation",
  "instagram_hook": "one punchy hook line for Instagram",
  "pinterest_hook": "one searchable, keyword-rich hook line for Pinterest",
  "content_angle": "gift_idea | lifestyle | breed_spotlight | humour | product_feature | seasonal",
  "approved": true,
  "rejection_reason": null
}

Set approved to true if score >= ${minScore}, false otherwise.
If approved is false, set rejection_reason to a brief reason.`;

  try {
    const result = await claude.completeJson<ReviewedListing>(
      systemPrompt,
      userPrompt,
      useHaiku ? 'haiku' : 'sonnet'
    );

    // Enforce the min score rule in case Claude doesn't follow it exactly
    result.approved = result.score >= minScore;
    if (!result.approved && !result.rejection_reason) {
      result.rejection_reason = `Score ${result.score} below minimum threshold of ${minScore}`;
    }

    // Attach image and URL from original listing
    result.primary_image_url = listing.primary_image_url;
    result.url = listing.url;
    result.price = formatPrice(listing);

    return result;
  } catch (err) {
    console.warn(`  ⚠ Failed to review listing "${listing.title}": ${(err as Error).message}`);
    return {
      listing_id: String(listing.listing_id),
      title: listing.title,
      primary_image_url: listing.primary_image_url,
      url: listing.url,
      price: formatPrice(listing),
      score: 0,
      score_rationale: 'Review failed — skipped',
      instagram_hook: '',
      pinterest_hook: '',
      content_angle: 'product_feature',
      approved: false,
      rejection_reason: `Review error: ${(err as Error).message}`,
    };
  }
}

export async function runListingReviewer(): Promise<{ approved: number; rejected: number }> {
  const shopAudit = readJson<ShopAudit>(SHOP_AUDIT_PATH);
  if (!shopAudit) throw new Error('shop-audit.json not found — run Shop Auditor first');

  const competitorAnalysis = readJson<CompetitorAnalysis>(COMPETITOR_PATH) ?? {
    analysed_at: '',
    competitor_shops: [],
    top_keywords: [],
    content_themes: [],
    pricing_patterns: { range: 'N/A', common_price_points: [], positioning: 'N/A' },
    market_gaps: [],
    differentiation_ideas: [],
    trending_breeds: [],
  };

  const minScore = parseInt(process.env.MIN_SCORE || '7', 10);
  const claude = new ClaudeClient();
  const reviewed: ReviewedListing[] = [];

  const listings = shopAudit.listings;
  const totalBatches = Math.ceil(listings.length / BATCH_SIZE);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batch = listings.slice(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE);
    const batchLabel = `batch ${batchNum + 1}/${totalBatches}`;
    console.log(`      Reviewing ${batchLabel} (${batch.length} listings)...`);

    // Process each listing in the batch sequentially to respect rate limits
    for (const listing of batch) {
      const result = await reviewListing(listing, competitorAnalysis, claude, minScore);
      reviewed.push(result);
    }
  }

  const approved = reviewed.filter(r => r.approved).length;
  const rejected = reviewed.length - approved;

  const output: ApprovedListings = {
    reviewed_at: new Date().toISOString(),
    min_score: minScore,
    total_reviewed: reviewed.length,
    approved_count: approved,
    rejected_count: rejected,
    listings: reviewed,
  };

  writeJson(OUTPUT_PATH, output);
  return { approved, rejected };
}
