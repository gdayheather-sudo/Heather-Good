import https from 'https';
import { EtsyListing } from './etsy-client';

/**
 * Fetches the public Etsy shop RSS feed and converts items to EtsyListing objects.
 * No API key or OAuth required — works for any public Etsy shop.
 *
 * Limitation: Etsy RSS feeds include ~25 most-recent listings only.
 * Use this as a fallback when the Etsy API is unavailable (pending approval).
 */
export async function fetchEtsyRss(shopId: string): Promise<EtsyListing[]> {
  const url = `https://www.etsy.com/shop/${shopId}/rss`;
  const xml = await fetchText(url);
  return parseRssItems(xml);
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BigLittlePupClub-Pipeline/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    }, res => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`RSS fetch failed: HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRssItems(xml: string): EtsyListing[] {
  const listings: EtsyListing[] = [];

  // Extract all <item> blocks
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const item of itemMatches) {
    const title   = extractCdata(item, 'title')   ?? extractTag(item, 'title')   ?? '';
    const link    = extractTag(item, 'link')       ?? '';
    const desc    = extractCdata(item, 'description') ?? extractTag(item, 'description') ?? '';

    // Extract listing ID from URL: /listing/123456/...
    const idMatch = link.match(/\/listing\/(\d+)/);
    if (!idMatch) continue;
    const listingId = parseInt(idMatch[1], 10);

    // Image URL — try media:content, media:thumbnail, then <enclosure>
    let imageUrl = '';
    const mediaContent   = item.match(/<media:content[^>]+url="([^"]+)"/);
    const mediaThumbnail = item.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    const enclosure      = item.match(/<enclosure[^>]+url="([^"]+)"/);
    if (mediaContent)   imageUrl = mediaContent[1];
    else if (mediaThumbnail) imageUrl = mediaThumbnail[1];
    else if (enclosure) imageUrl = enclosure[1];

    // Clean description — strip HTML tags, limit length
    const cleanDesc = desc
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);

    listings.push({
      listing_id: listingId,
      title: title.trim(),
      description: cleanDesc,
      tags: [],        // RSS doesn't include tags
      price: {         // RSS doesn't include price — Claude will work from title
        amount: 0,
        divisor: 100,
        currency_code: 'USD',
      },
      views: 0,
      num_favorers: 0,
      url: link.trim(),
      state: 'active',
      primary_image_url: imageUrl,
    });
  }

  return listings;
}

function extractTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : undefined;
}

function extractCdata(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  return m ? m[1].trim() : undefined;
}
