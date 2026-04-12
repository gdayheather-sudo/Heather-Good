import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { EtsyClient, EtsyListing } from '../utils/etsy-client';
import { ClaudeClient } from '../utils/claude-client';
import { writeJson, readJson, fileExists } from '../utils/file-helpers';

dotenv.config();

interface CompetitorConfig {
  niche: string;
  my_brand_voice: string;
  competitor_shop_ids: string[];
}

interface CompetitorShopData {
  shop_id: string;
  top_listings: EtsyListing[];
}

export interface CompetitorAnalysis {
  analysed_at: string;
  competitor_shops: string[];
  top_keywords: string[];
  content_themes: string[];
  pricing_patterns: {
    range: string;
    common_price_points: string[];
    positioning: string;
  };
  market_gaps: string[];
  differentiation_ideas: string[];
  trending_breeds: string[];
}

const CONFIG_PATH = path.join('config', 'competitors.json');
const OUTPUT_PATH = path.join('output', 'competitor-analysis.json');

export async function runCompetitorAnalyst(): Promise<CompetitorAnalysis> {
  // Use cached analysis if available and not forcing refresh
  if (process.env.FORCE_REFRESH !== 'true' && fileExists(OUTPUT_PATH)) {
    console.log('      ↩ Using cached competitor analysis (set FORCE_REFRESH=true to re-analyse)');
    const cached = readJson<CompetitorAnalysis>(OUTPUT_PATH);
    if (cached) return cached;
  }

  const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(configRaw) as CompetitorConfig;

  // Filter out placeholder shop IDs
  const shopIds = config.competitor_shop_ids.filter(
    id => !id.startsWith('TODO_PLACEHOLDER')
  );

  if (shopIds.length === 0) {
    console.warn('      ⚠ No competitor shop IDs configured in config/competitors.json — skipping competitor fetch');
    const empty: CompetitorAnalysis = {
      analysed_at: new Date().toISOString(),
      competitor_shops: [],
      top_keywords: [],
      content_themes: [],
      pricing_patterns: { range: 'N/A', common_price_points: [], positioning: 'N/A' },
      market_gaps: [],
      differentiation_ideas: [],
      trending_breeds: [],
    };
    writeJson(OUTPUT_PATH, empty);
    return empty;
  }

  const etsy = new EtsyClient();
  const competitorData: CompetitorShopData[] = [];

  for (const shopId of shopIds) {
    console.log(`      Fetching top listings for competitor: ${shopId}`);
    const listings = await etsy.getTopListingsForShop(shopId, 10);
    if (listings.length > 0) {
      competitorData.push({ shop_id: shopId, top_listings: listings });
    }
  }

  if (competitorData.length === 0) {
    console.warn('      ⚠ No competitor listings fetched — proceeding without competitor data');
    const empty: CompetitorAnalysis = {
      analysed_at: new Date().toISOString(),
      competitor_shops: shopIds,
      top_keywords: [],
      content_themes: [],
      pricing_patterns: { range: 'N/A', common_price_points: [], positioning: 'N/A' },
      market_gaps: ['Unable to fetch competitor data — add valid shop IDs to config/competitors.json'],
      differentiation_ideas: [],
      trending_breeds: [],
    };
    writeJson(OUTPUT_PATH, empty);
    return empty;
  }

  const claude = new ClaudeClient();
  const useHaiku = process.env.USE_HAIKU_FOR_REVIEW === 'true';

  const systemPrompt = `You are an Etsy market analyst specialising in the pet gifts / print-on-demand niche. You provide structured JSON analysis only — no preamble, no commentary outside the JSON.`;

  const userPrompt = `Analyse the following competitor listings from the dog breed gifts / dog mom niche on Etsy.

NICHE: ${config.niche}
MY BRAND VOICE: ${config.my_brand_voice}

COMPETITOR DATA:
${JSON.stringify(competitorData, null, 2)}

Identify and return structured JSON with exactly these fields:
{
  "top_keywords": ["15 keywords/phrases used repeatedly in competitor titles and tags"],
  "content_themes": ["Common content themes: seasonal, breed-specific, gift-giving, lifestyle, etc."],
  "pricing_patterns": {
    "range": "e.g. $15–$45",
    "common_price_points": ["e.g. $18.99", "$24.99", "$32.00"],
    "positioning": "budget / mid-range / premium"
  },
  "market_gaps": ["5 underserved angles or niches not well covered by competitors"],
  "differentiation_ideas": ["5 specific content ideas that would help a competitor stand out"],
  "trending_breeds": ["Dog breeds appearing most frequently across competitor listings"]
}

Return structured JSON only. No preamble.`;

  const analysis = await claude.completeJson<Omit<CompetitorAnalysis, 'analysed_at' | 'competitor_shops'>>(
    systemPrompt,
    userPrompt,
    useHaiku ? 'haiku' : 'sonnet'
  );

  const result: CompetitorAnalysis = {
    analysed_at: new Date().toISOString(),
    competitor_shops: shopIds,
    ...analysis,
  };

  writeJson(OUTPUT_PATH, result);
  return result;
}
