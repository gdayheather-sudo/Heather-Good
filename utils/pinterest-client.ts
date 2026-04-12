import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PINTEREST_BASE_URL = 'https://api.pinterest.com/v5';
const RATE_LIMIT_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface PinterestPin {
  pin_title: string;
  pin_description: string;
  suggested_board: string;
  keyword_phrases: string[];
  image_text_overlay: string;
  pin_link: string;
  image_url: string;
  board_id?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
}

export interface PinResult {
  listing_id: string;
  success: boolean;
  pin_id?: string;
  pin_url?: string;
  error?: string;
}

export class PinterestClient {
  private client: AxiosInstance;
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.PINTEREST_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      throw new Error(
        'PINTEREST_ACCESS_TOKEN is not set in .env\n' +
        'Setup: https://developers.pinterest.com → your app → Generate access token\n' +
        'Required scopes: pins:write, boards:read'
      );
    }

    this.client = axios.create({
      baseURL: PINTEREST_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
  }

  async getBoards(): Promise<PinterestBoard[]> {
    await sleep(RATE_LIMIT_MS);
    const response = await this.client.get<{ items: PinterestBoard[] }>('/boards');
    return response.data.items ?? [];
  }

  async findBoardByName(name: string, boards: PinterestBoard[]): Promise<string | null> {
    const normalised = name.toLowerCase().trim();
    const match = boards.find(b => b.name.toLowerCase().trim() === normalised);
    return match?.id ?? null;
  }

  async createPin(pin: PinterestPin, boardId: string): Promise<PinResult & { listing_id: string }> {
    await sleep(RATE_LIMIT_MS);

    try {
      const payload = {
        board_id: boardId,
        title: pin.pin_title.slice(0, 100),
        description: pin.pin_description.slice(0, 500),
        link: pin.pin_link,
        media_source: {
          source_type: 'image_url',
          url: pin.image_url,
        },
        alt_text: pin.pin_title.slice(0, 500),
      };

      const response = await this.client.post<{ id: string }>('/pins', payload);
      const pinId = response.data.id;

      return {
        listing_id: '',
        success: true,
        pin_id: pinId,
        pin_url: `https://pinterest.com/pin/${pinId}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        listing_id: '',
        success: false,
        error: message,
      };
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      await sleep(RATE_LIMIT_MS);
      await this.client.get('/user_account');
      return true;
    } catch {
      return false;
    }
  }
}
