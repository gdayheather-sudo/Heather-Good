import path from 'path';
import dotenv from 'dotenv';
import { EtsyClient, EtsyListing } from '../utils/etsy-client';
import { parseEtsyCsv } from '../utils/etsy-csv-parser';
import { fetchEtsyRss } from '../utils/etsy-rss-parser';
import { writeJson, readJson, fileExists } from '../utils/file-helpers';

dotenv.config();

export interface ShopAudit {
  shop_id: string;
  shop_name: string;
  total_active_listings: number;
  fetched_at: string;
  listings: EtsyListing[];
}

const CACHE_PATH = path.join('output', 'cache', 'etsy-raw.json');
const OUTPUT_PATH = path.join('output', 'shop-audit.json');
const CSV_FALLBACK_PATH = path.join('listings.csv');

export async function runShopAuditor(): Promise<ShopAudit> {
  const shopId = process.env.ETSY_SHOP_ID || '';
  if (!shopId) throw new Error('ETSY_SHOP_ID is not set in .env');

  const forceRefresh = process.env.FORCE_REFRESH === 'true';

  // Use cached data if available and not forcing refresh
  if (!forceRefresh && fileExists(CACHE_PATH)) {
    console.log('      ↩ Using cached Etsy data (set FORCE_REFRESH=true to re-fetch)');
    const cached = readJson<ShopAudit>(CACHE_PATH);
    if (cached) {
      writeJson(OUTPUT_PATH, cached);
      return cached;
    }
  }

  // ── CSV fallback ─────────────────────────────────────────────────────────────
  // If the Etsy API key is not yet approved, drop a listings.csv export in the
  // project root (Sell on Etsy → Listings → Download) and we'll use that instead.
  if (fileExists(CSV_FALLBACK_PATH)) {
    console.log(`      ↩ Etsy API not available — reading from ${CSV_FALLBACK_PATH}`);
    const listings = parseEtsyCsv(CSV_FALLBACK_PATH);
    if (listings.length === 0) {
      throw new Error(`${CSV_FALLBACK_PATH} was found but contains no valid listings — check the file format`);
    }
    listings.sort((a, b) => b.num_favorers - a.num_favorers);
    const audit: ShopAudit = {
      shop_id: shopId,
      shop_name: shopId,
      total_active_listings: listings.length,
      fetched_at: new Date().toISOString(),
      listings,
    };
    writeJson(CACHE_PATH, audit);
    writeJson(OUTPUT_PATH, audit);
    return audit;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const etsy = new EtsyClient();

  // Fetch shop info
  let shopName = shopId;
  let shopDbId = shopId;
  try {
    const shop = await etsy.getShop(shopId);
    shopName = shop.shop_name;
    shopDbId = String(shop.shop_id);
  } catch (err) {
    console.warn(`  ⚠ Could not fetch shop info — using shop ID "${shopId}" directly`);
  }

  // Fetch all active listings
  console.log(`      Fetching listings for shop: ${shopName}...`);
  let listings: EtsyListing[];
  try {
    listings = await etsy.getAllActiveListings(shopId);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      // ── RSS fallback: fetch from public shop feed ─────────────────────────
      console.log('      ⚠ Etsy API pending approval — falling back to public RSS feed...');
      console.log('      (RSS includes ~25 most-recent listings; use CSV export for all 472)');
      try {
        const rssListings = await fetchEtsyRss(shopId);
        if (rssListings.length > 0) {
          console.log(`      ✓ Fetched ${rssListings.length} listings via RSS`);
          const audit: ShopAudit = {
            shop_id: shopId,
            shop_name: shopId,
            total_active_listings: rssListings.length,
            fetched_at: new Date().toISOString(),
            listings: rssListings,
          };
          writeJson(CACHE_PATH, audit);
          writeJson(OUTPUT_PATH, audit);
          return audit;
        }
      } catch (rssErr) {
        console.warn(`      ⚠ RSS fallback also failed: ${(rssErr as Error).message}`);
      }
      throw new Error(
        'Etsy API returned 403 — app is still "Pending Personal Approval".\n\n' +
        'While waiting for approval, use the CSV fallback:\n' +
        '  1. Go to Sell on Etsy → Listings → select all → Editing options → Download\n' +
        '  2. Save the file as "listings.csv" in your Heather-Good project folder\n' +
        '  3. Run npm run pipeline again\n'
      );
    }
    throw err;
  }

  // Sort by num_favorers descending
  listings.sort((a, b) => b.num_favorers - a.num_favorers);

  const audit: ShopAudit = {
    shop_id: shopDbId,
    shop_name: shopName,
    total_active_listings: listings.length,
    fetched_at: new Date().toISOString(),
    listings,
  };

  // Cache raw response and write output
  writeJson(CACHE_PATH, audit);
  writeJson(OUTPUT_PATH, audit);

  return audit;
}
