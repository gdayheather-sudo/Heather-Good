import { Router } from 'express';
import { all, get } from '../db.js';
import { generateCopy, generateImage, providerStatus } from '../services/ai.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json(providerStatus());
});

// Generate multi-platform copy from a brief. Does NOT persist — the client
// reviews the result and decides what to save as a post.
router.post('/copy', async (req, res) => {
  try {
    const { brand_id, concept, platforms, provider = 'claude', instructions = '', reference_asset_ids = [] } = req.body || {};
    const brand = get('SELECT * FROM brands WHERE id = ?', [Number(brand_id)]);
    if (!brand) return res.status(400).json({ error: 'Pick a brand first.' });

    const assets = all('SELECT * FROM brand_assets WHERE brand_id = ?', [brand.id]);
    let referenceAssets = assets.filter((a) => a.kind === 'reference' && a.file_path);
    if (Array.isArray(reference_asset_ids) && reference_asset_ids.length) {
      const wanted = new Set(reference_asset_ids.map(Number));
      referenceAssets = assets.filter((a) => wanted.has(a.id) && a.file_path);
    }

    const result = await generateCopy({
      provider, brand, assets, concept,
      platforms: Array.isArray(platforms) ? platforms : [],
      instructions, referenceAssets,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Generation failed.' });
  }
});

// Generate an image for a given prompt/platform. Saves the image and returns its path.
router.post('/image', async (req, res) => {
  try {
    const { prompt, platform } = req.body || {};
    const result = await generateImage({ prompt, platform });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Image generation failed.' });
  }
});

export default router;
