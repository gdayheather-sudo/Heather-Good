import fs from 'fs';
import path from 'path';
import { EtsyListing } from './etsy-client';

/**
 * Parses an Etsy listings CSV export into EtsyListing objects.
 *
 * Export your CSV from:
 *   Sell on Etsy → Listings → Download
 *
 * Etsy's CSV columns (approximate — varies by region):
 *   LISTING ID, TITLE, DESCRIPTION, PRICE, CURRENCY CODE, QUANTITY,
 *   TAGS, MATERIALS, IMAGE1 ... IMAGE10, URL / LISTING URL, STATUS
 */
export function parseEtsyCsv(csvPath: string): EtsyListing[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');

  // Split into lines, handling Windows CRLF
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header row — normalise to uppercase + trim
  const headers = parseCsvRow(lines[0]).map(h => h.toUpperCase().trim());

  const col = (name: string): number => {
    // Try exact match first, then partial match
    const exact = headers.indexOf(name);
    if (exact !== -1) return exact;
    return headers.findIndex(h => h.includes(name));
  };

  const idCol    = col('LISTING ID');
  const titleCol = col('TITLE');
  const descCol  = col('DESCRIPTION');
  const priceCol = col('PRICE');
  const currCol  = col('CURRENCY');
  const tagsCol  = col('TAGS');
  const urlCol   = col('URL');     // might be "LISTING URL" or "URL"

  // Image columns: IMAGE1 … IMAGE10
  const imageCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^IMAGE\d+$/.test(h))
    .sort((a, b) => {
      const na = parseInt(a.h.replace('IMAGE', ''), 10);
      const nb = parseInt(b.h.replace('IMAGE', ''), 10);
      return na - nb;
    })
    .map(({ i }) => i);

  const listings: EtsyListing[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = parseCsvRow(lines[r]);
    if (row.length < 2) continue;

    const get = (c: number): string => (c >= 0 && c < row.length ? row[c].trim() : '');

    const listingId = parseInt(get(idCol), 10);
    if (!listingId) continue; // skip rows without a valid ID

    const title = get(titleCol);
    const description = get(descCol).slice(0, 1000);
    const priceRaw = parseFloat(get(priceCol).replace(/[^0-9.]/g, '')) || 0;
    const currency = get(currCol) || 'USD';
    const tags = get(tagsCol)
      .split(/[,|]/)
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 13);

    // First non-empty image URL
    let primaryImageUrl = '';
    for (const ic of imageCols) {
      const url = get(ic);
      if (url && url.startsWith('http')) {
        primaryImageUrl = url;
        break;
      }
    }

    // Listing URL — Etsy CSV sometimes omits it; reconstruct from ID
    let url = get(urlCol);
    if (!url || !url.startsWith('http')) {
      url = `https://www.etsy.com/listing/${listingId}`;
    }

    listings.push({
      listing_id: listingId,
      title,
      description,
      tags,
      price: {
        amount: Math.round(priceRaw * 100),
        divisor: 100,
        currency_code: currency,
      },
      views: 0,
      num_favorers: 0,
      url,
      state: 'active',
      primary_image_url: primaryImageUrl,
    });
  }

  return listings;
}

/** Minimal CSV row parser that handles quoted fields with embedded commas/newlines. */
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
