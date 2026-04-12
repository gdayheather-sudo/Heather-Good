import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ETSY_BASE_URL = 'https://openapi.etsy.com/v3';
const RATE_LIMIT_MS = 500; // 500ms between requests to stay well under 10 req/sec

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  views: number;
  num_favorers: number;
  url: string;
  state: string;
  primary_image_url: string;
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  listing_active_count: number;
}

interface EtsyListingsResponse {
  count: number;
  results: EtsyRawListing[];
}

interface EtsyRawListing {
  listing_id: number;
  title: string;
  description: string;
  tags: string[];
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  views: number;
  num_favorers: number;
  url: string;
  state: string;
  images?: EtsyImage[];
  primary_image?: EtsyImage;
}

interface EtsyImage {
  url_fullxfull: string;
  url_570xN: string;
  rank: number;
}

export class EtsyClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ETSY_API_KEY || '';
    if (!this.apiKey) throw new Error('ETSY_API_KEY is not set in .env');

    this.client = axios.create({
      baseURL: ETSY_BASE_URL,
      headers: {
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
  }

  async getShop(shopId: string): Promise<EtsyShop> {
    await sleep(RATE_LIMIT_MS);
    const response = await this.client.get(`/application/shops/${shopId}`);
    return response.data as EtsyShop;
  }

  async getAllActiveListings(shopId: string): Promise<EtsyListing[]> {
    const allListings: EtsyListing[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      await sleep(RATE_LIMIT_MS);
      const response = await this.client.get<EtsyListingsResponse>(
        `/application/shops/${shopId}/listings/active`,
        {
          params: {
            limit,
            offset,
            sort_on: 'num_favorers',
            sort_order: 'desc',
            includes: ['Images', 'MainImage'],
          },
        }
      );

      const { count, results } = response.data;

      for (const raw of results) {
        allListings.push(this.normalise(raw));
      }

      offset += results.length;
      hasMore = results.length === limit && offset < count;
    }

    return allListings;
  }

  async getTopListingsForShop(shopId: string, limit = 10): Promise<EtsyListing[]> {
    await sleep(RATE_LIMIT_MS);
    try {
      const response = await this.client.get<EtsyListingsResponse>(
        `/application/shops/${shopId}/listings/active`,
        {
          params: {
            limit,
            offset: 0,
            sort_on: 'num_favorers',
            sort_order: 'desc',
            includes: ['Images', 'MainImage'],
          },
        }
      );
      return response.data.results.map(r => this.normalise(r));
    } catch (err) {
      console.warn(`  ⚠ Could not fetch listings for shop "${shopId}" — skipping`);
      return [];
    }
  }

  private normalise(raw: EtsyRawListing): EtsyListing {
    // Resolve image URL: prefer MainImage, fall back to first image, fall back to empty string
    let primaryImageUrl = '';
    if (raw.primary_image?.url_570xN) {
      primaryImageUrl = raw.primary_image.url_570xN;
    } else if (raw.images && raw.images.length > 0) {
      const sorted = [...raw.images].sort((a, b) => a.rank - b.rank);
      primaryImageUrl = sorted[0].url_570xN || sorted[0].url_fullxfull || '';
    }

    return {
      listing_id: raw.listing_id,
      title: raw.title,
      description: raw.description?.slice(0, 1000) ?? '',
      tags: raw.tags ?? [],
      price: raw.price,
      views: raw.views ?? 0,
      num_favorers: raw.num_favorers ?? 0,
      url: raw.url,
      state: raw.state,
      primary_image_url: primaryImageUrl,
    };
  }
}
