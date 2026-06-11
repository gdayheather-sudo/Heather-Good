import { Router } from 'express';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { all, get, run, UPLOADS_DIR } from '../db.js';
import { upload } from '../services/upload.js';

const router = Router();

const BRAND_FIELDS = ['name', 'description', 'voice', 'guidelines', 'audience', 'website', 'color_primary', 'color_secondary'];

function brandWithAssets(id) {
  const brand = get('SELECT * FROM brands WHERE id = ?', [id]);
  if (!brand) return null;
  brand.assets = all('SELECT * FROM brand_assets WHERE brand_id = ? ORDER BY created_at DESC', [id]);
  return brand;
}

// List brands with light counts for the dashboard.
router.get('/', (req, res) => {
  const brands = all('SELECT * FROM brands ORDER BY name COLLATE NOCASE');
  for (const b of brands) {
    const c = get('SELECT COUNT(*) n FROM posts WHERE brand_id = ?', [b.id]);
    b.post_count = c ? c.n : 0;
  }
  res.json(brands);
});

router.get('/:id', (req, res) => {
  const brand = brandWithAssets(Number(req.params.id));
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
});

router.post('/', (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.name.trim()) return res.status(400).json({ error: 'Brand name is required.' });
  const defaults = { color_primary: '#6c5ce7', color_secondary: '#00b894' };
  const vals = BRAND_FIELDS.map((f) => {
    if (body[f] != null && body[f] !== '') return String(body[f]);
    return defaults[f] ?? '';
  });
  const { lastInsertRowid } = run(
    `INSERT INTO brands (${BRAND_FIELDS.join(',')}) VALUES (${BRAND_FIELDS.map(() => '?').join(',')})`,
    vals
  );
  res.status(201).json(brandWithAssets(lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM brands WHERE id = ?', [id])) return res.status(404).json({ error: 'Brand not found' });
  const body = req.body || {};
  const sets = [];
  const vals = [];
  for (const f of BRAND_FIELDS) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(String(body[f])); }
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    run(`UPDATE brands SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  }
  res.json(brandWithAssets(id));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  run('DELETE FROM brands WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ── Brand assets (examples of existing work, reference images, logos) ─────────
router.post('/:id/assets', upload.single('image'), (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM brands WHERE id = ?', [id])) return res.status(404).json({ error: 'Brand not found' });
  const { kind = 'example', platform = '', caption = '', notes = '' } = req.body || {};
  const file_path = req.file ? req.file.filename : '';
  const { lastInsertRowid } = run(
    `INSERT INTO brand_assets (brand_id, kind, platform, file_path, caption, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, kind, platform, file_path, caption, notes]
  );
  res.status(201).json(get('SELECT * FROM brand_assets WHERE id = ?', [lastInsertRowid]));
});

router.delete('/:id/assets/:assetId', async (req, res) => {
  const asset = get('SELECT * FROM brand_assets WHERE id = ?', [Number(req.params.assetId)]);
  if (asset && asset.file_path) {
    try { await unlink(join(UPLOADS_DIR, asset.file_path)); } catch { /* already gone */ }
  }
  run('DELETE FROM brand_assets WHERE id = ?', [Number(req.params.assetId)]);
  res.json({ ok: true });
});

export default router;
