import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const NOTION_VERSION = '2022-06-28';
const RATE_LIMIT_MS = 400; // Notion allows 3 req/sec

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type ApprovalStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Needs Changes';

export interface NotionPage {
  id: string;
  listing_id: string;
  title: string;
  status: ApprovalStatus;
  notes: string;
}

export class NotionClient {
  private client: AxiosInstance;
  private databaseId: string;

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    this.databaseId = process.env.NOTION_DATABASE_ID || '';

    if (!apiKey || apiKey === 'your_notion_api_key_here') {
      throw new Error(
        'NOTION_API_KEY is not set in .env\n' +
        'Setup: https://www.notion.so/my-integrations → New integration → copy Secret'
      );
    }
    if (!this.databaseId || this.databaseId === 'your_notion_database_id_here') {
      throw new Error(
        'NOTION_DATABASE_ID is not set in .env\n' +
        'Open your Notion database → Share → Copy link → the ID is in the URL'
      );
    }

    this.client = axios.create({
      baseURL: 'https://api.notion.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  private text(content: string, maxLen = 2000): { type: 'text'; text: { content: string } }[] {
    // Notion rich text blocks have a 2000 char limit per element
    const truncated = content?.slice(0, maxLen) ?? '';
    return [{ type: 'text', text: { content: truncated } }];
  }

  async createListingPage(data: {
    listing_id: string;
    title: string;
    score: number;
    content_angle: string;
    price: string;
    url: string;
    image_url: string;
    instagram_caption: string;
    instagram_hashtags: string;
    story_slide_1: string;
    story_slide_2: string;
    story_slide_3: string;
    best_posting_time: string;
    alt_text: string;
    pinterest_title: string;
    pinterest_description: string;
    pinterest_board: string;
    pinterest_keywords: string;
    pinterest_overlay: string;
  }): Promise<string> {
    await sleep(RATE_LIMIT_MS);

    const response = await this.client.post<{ id: string }>('/pages', {
      parent: { database_id: this.databaseId },
      properties: {
        // Title
        'Name': {
          title: this.text(data.title),
        },
        'Listing ID': {
          rich_text: this.text(data.listing_id),
        },
        'Score': {
          number: data.score,
        },
        'Content Angle': {
          select: { name: data.content_angle },
        },
        'Status': {
          select: { name: 'Pending Review' },
        },
        'Price': {
          rich_text: this.text(data.price),
        },
        'Etsy URL': {
          url: data.url || null,
        },
        'Image URL': {
          url: data.image_url || null,
        },
        'Best Posting Time': {
          rich_text: this.text(data.best_posting_time),
        },
        'Alt Text': {
          rich_text: this.text(data.alt_text),
        },
        'Pinterest Board': {
          rich_text: this.text(data.pinterest_board),
        },
        'Pinterest Keywords': {
          rich_text: this.text(data.pinterest_keywords),
        },
        'Image Text Overlay': {
          rich_text: this.text(data.pinterest_overlay),
        },
        'Notes': {
          rich_text: this.text(''),
        },
      },
      // Long content goes in page body blocks (property limit is 2000 chars)
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: this.text('📱 Instagram') },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: this.text('Caption') },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: this.text(data.instagram_caption, 2000) },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: this.text('First Comment Hashtags') },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: this.text(data.instagram_hashtags, 2000) },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: this.text('Story Slides') },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: this.text(`Slide 1: ${data.story_slide_1}`) },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: this.text(`Slide 2: ${data.story_slide_2}`) },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: this.text(`Slide 3: ${data.story_slide_3}`) },
        },
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: this.text('📌 Pinterest') },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: this.text('Pin Title') },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: this.text(data.pinterest_title) },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: this.text('Pin Description') },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: this.text(data.pinterest_description, 2000) },
        },
      ],
    });

    return response.data.id;
  }

  async getApprovedPages(): Promise<NotionPage[]> {
    await sleep(RATE_LIMIT_MS);

    const response = await this.client.post<{
      results: Array<{
        id: string;
        properties: {
          'Name': { title: Array<{ plain_text: string }> };
          'Listing ID': { rich_text: Array<{ plain_text: string }> };
          'Status': { select: { name: ApprovalStatus } | null };
          'Notes': { rich_text: Array<{ plain_text: string }> };
        };
      }>;
    }>(`/databases/${this.databaseId}/query`, {
      filter: {
        property: 'Status',
        select: { equals: 'Approved' },
      },
    });

    return response.data.results.map(page => ({
      id: page.id,
      listing_id: page.properties['Listing ID']?.rich_text?.[0]?.plain_text ?? '',
      title: page.properties['Name']?.title?.[0]?.plain_text ?? '',
      status: page.properties['Status']?.select?.name ?? 'Pending Review',
      notes: page.properties['Notes']?.rich_text?.[0]?.plain_text ?? '',
    }));
  }

  async pageExists(listingId: string): Promise<boolean> {
    await sleep(RATE_LIMIT_MS);

    const response = await this.client.post<{ results: unknown[] }>(
      `/databases/${this.databaseId}/query`,
      {
        filter: {
          property: 'Listing ID',
          rich_text: { equals: listingId },
        },
      }
    );

    return response.data.results.length > 0;
  }
}
