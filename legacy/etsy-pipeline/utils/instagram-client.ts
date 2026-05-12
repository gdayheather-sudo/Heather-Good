import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GRAPH_BASE_URL = 'https://graph.facebook.com/v21.0';
const RATE_LIMIT_MS = 800; // Stay well under 200 calls/hour

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface InstagramPost {
  caption: string;
  image_url: string;
  listing_id: string;
}

export interface PostResult {
  listing_id: string;
  success: boolean;
  media_id?: string;
  permalink?: string;
  error?: string;
  token_expires_warning?: string;
}

export class InstagramClient {
  private client: AxiosInstance;
  private userId: string;
  private accessToken: string;

  constructor() {
    this.userId = process.env.INSTAGRAM_USER_ID || '';
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';

    if (!this.userId || !this.accessToken) {
      throw new Error(
        'INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN must be set in .env\n\n' +
        'Setup steps:\n' +
        '  1. Create a Facebook Page for Big Little Pup Club (required by Meta)\n' +
        '     → https://www.facebook.com/pages/create\n' +
        '  2. Link it to your BigLittlePupClub Instagram in Instagram Settings\n' +
        '     → Settings → Account → Linked Accounts\n' +
        '  3. Create a Meta Developer app at https://developers.facebook.com\n' +
        '  4. Add the Instagram Graph API product to your app\n' +
        '  5. Generate a long-lived User Access Token\n' +
        '  6. Find your Instagram User ID via:\n' +
        '     GET https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_TOKEN\n\n' +
        'Note: Long-lived tokens last 60 days — set a calendar reminder to refresh.'
      );
    }

    this.client = axios.create({
      baseURL: GRAPH_BASE_URL,
      timeout: 30000,
    });
  }

  // Step 1: Create a media container
  private async createMediaContainer(imageUrl: string, caption: string): Promise<string> {
    await sleep(RATE_LIMIT_MS);

    const response = await this.client.post<{ id: string }>(
      `/${this.userId}/media`,
      null,
      {
        params: {
          image_url: imageUrl,
          caption: caption.slice(0, 2200), // Instagram caption limit
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  // Step 2: Publish the container
  private async publishContainer(containerId: string): Promise<string> {
    await sleep(RATE_LIMIT_MS);

    const response = await this.client.post<{ id: string }>(
      `/${this.userId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  async postImage(post: InstagramPost): Promise<PostResult> {
    try {
      const containerId = await this.createMediaContainer(post.image_url, post.caption);

      // Wait for container to be ready (Meta recommends a short delay)
      await sleep(3000);

      const mediaId = await this.publishContainer(containerId);
      const permalink = `https://www.instagram.com/p/${mediaId}/`;

      // Warn if token is likely expiring soon (we log this, can't check expiry without an extra call)
      return {
        listing_id: post.listing_id,
        success: true,
        media_id: mediaId,
        permalink,
        token_expires_warning:
          'Reminder: Instagram long-lived tokens expire after 60 days. ' +
          'Refresh before expiry at: https://developers.facebook.com/tools/explorer',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        listing_id: post.listing_id,
        success: false,
        error: message,
      };
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      await sleep(RATE_LIMIT_MS);
      await this.client.get(`/${this.userId}`, {
        params: {
          fields: 'id,username',
          access_token: this.accessToken,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
