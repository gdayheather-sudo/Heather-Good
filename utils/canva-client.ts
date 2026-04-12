import axios, { AxiosInstance, AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ── Constants ───────────────────────────────────────────────────────────────
const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // 60s total

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AutofillTextField {
  type: 'text';
  text: string;
}

export interface AutofillImageField {
  type: 'image';
  asset_id: string;
}

export type AutofillField = AutofillTextField | AutofillImageField;

/** Named field map matching your Canva template's text/image elements */
export interface AutofillData {
  [fieldName: string]: AutofillField;
}

export interface CanvaDesignUrls {
  edit_url: string;
  view_url: string;
}

export interface CanvaDesign {
  id: string;
  title: string;
  urls: CanvaDesignUrls;
}

export interface BrandKitColor {
  name?: string;
  color: { hex: string };
}

export interface BrandKitFont {
  name: string;
  weights?: string[];
}

export interface BrandKit {
  id: string;
  name: string;
  colors?: { palette: BrandKitColor[] };
  fonts?: { primary: BrandKitFont[] };
}

// ── Client ───────────────────────────────────────────────────────────────────

export class CanvaClient {
  private http: AxiosInstance;

  constructor() {
    const token = process.env.CANVA_API_TOKEN;
    if (!token || token === 'your_canva_api_token_here') {
      throw new Error(
        'CANVA_API_TOKEN is not set in .env\n' +
        'Generate a token at: https://www.canva.com/developers/'
      );
    }

    this.http = axios.create({
      baseURL: CANVA_API_BASE,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Autofill a brand template with text/image data and return the
   * resulting design once the async job completes.
   *
   * The brand template must have named text fields matching the keys
   * in `data` — set these in Canva using the "Make it a template" flow.
   * Required fields for The Clarity Hub templates:
   *   hook | body_text | cta | footer
   */
  async autofillBrandTemplate(
    brandTemplateId: string,
    title: string,
    data: AutofillData
  ): Promise<CanvaDesign> {
    // 1. Start the autofill job
    let jobId: string;
    try {
      const response = await this.http.post('/autofills', {
        brand_template_id: brandTemplateId,
        title,
        data,
      });
      jobId = response.data.job?.id;
    } catch (err) {
      const e = err as AxiosError;
      const detail = e.response
        ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
        : e.message;
      throw new Error(`Canva autofill request failed — ${detail}`);
    }

    if (!jobId) {
      throw new Error('Canva autofill: no job ID in response');
    }

    // 2. Poll until success or failure
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const { data: pollData } = await this.http.get(`/autofills/${jobId}`);
      const job = pollData.job;

      if (job.status === 'success') {
        const design = job.result?.design as CanvaDesign | undefined;
        if (!design?.id) {
          throw new Error('Autofill succeeded but no design returned in job result');
        }
        return design;
      }

      if (job.status === 'failed') {
        throw new Error(`Canva autofill job failed: ${JSON.stringify(job.error)}`);
      }

      // status === 'in_progress' — keep polling
    }

    const timeoutSecs = (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000;
    throw new Error(`Canva autofill job timed out after ${timeoutSecs}s`);
  }

  /**
   * Export a design as PNG (pro quality) and download it to outputPath.
   * Polls until the async export job completes.
   */
  async exportDesignAsPng(designId: string, outputPath: string): Promise<void> {
    // 1. Start the export job
    let exportId: string;
    try {
      const response = await this.http.post('/exports', {
        design_id: designId,
        format: 'png',
        export_quality: 'pro',
      });
      exportId = response.data.job?.id;
    } catch (err) {
      const e = err as AxiosError;
      const detail = e.response
        ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
        : e.message;
      throw new Error(`Canva export request failed — ${detail}`);
    }

    if (!exportId) {
      throw new Error('Canva export: no job ID in response');
    }

    // 2. Poll until success or failure
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const { data: pollData } = await this.http.get(`/exports/${exportId}`);
      const job = pollData.job;

      if (job.status === 'success') {
        const downloadUrl: string | undefined = job.result?.urls?.[0];
        if (!downloadUrl) {
          throw new Error('Export succeeded but no download URL found in result');
        }
        await this.downloadFile(downloadUrl, outputPath);
        return;
      }

      if (job.status === 'failed') {
        throw new Error(`Canva export job failed: ${JSON.stringify(job.error)}`);
      }

      // status === 'in_progress' — keep polling
    }

    const timeoutSecs = (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000;
    throw new Error(`Canva export job timed out after ${timeoutSecs}s`);
  }

  /**
   * Fetch a brand kit by ID. Used to surface brand colours/fonts in
   * confirmation output and to validate the token has brandkit:content:read scope.
   */
  async getBrandKit(brandKitId: string): Promise<BrandKit> {
    try {
      const { data } = await this.http.get(`/brand-kits/${brandKitId}`);
      return data.brand_kit as BrandKit;
    } catch (err) {
      const e = err as AxiosError;
      const detail = e.response
        ? `HTTP ${e.response.status}: ${JSON.stringify(e.response.data)}`
        : e.message;
      throw new Error(`Failed to fetch brand kit ${brandKitId} — ${detail}`);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(outputPath, Buffer.from(response.data));
  }
}
