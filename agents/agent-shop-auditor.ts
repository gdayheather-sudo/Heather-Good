import path from 'path';
import dotenv from 'dotenv';
import { EtsyClient, EtsyListing } from '../utils/etsy-client';
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
  const listings = await etsy.getAllActiveListings(shopId);

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
