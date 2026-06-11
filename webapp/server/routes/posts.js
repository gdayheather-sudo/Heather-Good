import { Router } from 'express';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { all, get, run, UPLOADS_DIR } from '../db.js';
import { upload } from '../services/upload.js';
import { STATUS_IDS } from '../constants.js';

const router = Router();

function postWithVariants(id) {
  const post = get('SELECT * FROM posts WHERE id = ?', [id]);
  if (!post) return null;
  const brand = get('SELECT name, color_primary FROM brands WHERE id = ?', [post.brand_id]);
  post.brand_name = brand ? brand.name : null;
  post.brand_color = brand ? brand.color_primary : null;
  post.variants = all('SELECT * FROM post_variants WHERE post_id = ? ORDER BY id', [id]);
  return post;
}

function listFilter(req) {
  const where = [];
  const params = [];
  if (req.query.brand_id) { where.push('brand_id = ?'); params.push(Number(req.query.brand_id)); }
  if (req.query.status && STATUS_IDS.includes(req.query.status)) { where.push('status = ?'); params.push(req.query.status); }
  return { clause: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

// Flat list (most recent first).
router.get('/', (req, res) => {
  const { clause, params } = listFilter(req);
  const posts = all(`SELECT * FROM posts ${clause} ORDER BY updated_at DESC`, params);
  for (const p of posts) {
    const b = get('SELECT name, color_primary FROM brands WHERE id = ?', [p.brand_id]);
    p.brand_name = b ? b.name : null;
    p.brand_color = b ? b.color_primary : null;
    const v = get('SELECT COUNT(*) n FROM post_variants WHERE post_id = ?', [p.id]);
    p.variant_count = v ? v.n : 0;
  }
  res.json(posts);
});

// Posts grouped by pipeline status (for the board).
router.get('/board', (req, res) => {
  const { clause, params } = listFilter(req);
  const posts = all(`SELECT * FROM posts ${clause} ORDER BY updated_at DESC`, params);
  const board = Object.fromEntries(STATUS_IDS.map((s) => [s, []]));
  for (const p of posts) {
    const b = get('SELECT name, color_primary FROM brands WHERE id = ?', [p.brand_id]);
    p.brand_name = b ? b.name : null;
    p.brand_color = b ? b.color_primary : null;
    const v = get('SELECT COUNT(*) n FROM post_variants WHERE post_id = ?', [p.id]);
    p.variant_count = v ? v.n : 0;
    (board[p.status] || (board[p.status] = [])).push(p);
  }
  res.json(board);
});

// Scheduled posts within a date range (for the calendar).
router.get('/calendar', (req, res) => {
  const where = ['scheduled_at IS NOT NULL'];
  const params = [];
  if (req.query.brand_id) { where.push('brand_id = ?'); params.push(Number(req.query.brand_id)); }
  if (req.query.from) { where.push('scheduled_at >= ?'); params.push(req.query.from); }
  if (req.query.to) { where.push('scheduled_at <= ?'); params.push(req.query.to); }
  const posts = all(`SELECT * FROM posts WHERE ${where.join(' AND ')} ORDER BY scheduled_at ASC`, params);
  for (const p of posts) {
    const b = get('SELECT name, color_primary FROM brands WHERE id = ?', [p.brand_id]);
    p.brand_name = b ? b.name : null;
    p.brand_color = b ? b.color_primary : null;
    p.platforms = all('SELECT DISTINCT platform FROM post_variants WHERE post_id = ?', [p.id]).map((r) => r.platform);
  }
  res.json(posts);
});

router.get('/:id', (req, res) => {
  const post = postWithVariants(Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.brand_id) return res.status(400).json({ error: 'A brand is required.' });
  const status = STATUS_IDS.includes(b.status) ? b.status : 'idea';
  const { lastInsertRowid: postId } = run(
    `INSERT INTO posts (brand_id, title, concept, status, scheduled_at, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [Number(b.brand_id), (b.title || 'Untitled post').trim(), b.concept || '', status, b.scheduled_at || null, b.notes || '']
  );
  if (Array.isArray(b.variants)) {
    for (const v of b.variants) insertVariant(postId, v);
  }
  res.status(201).json(postWithVariants(postId));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM posts WHERE id = ?', [id])) return res.status(404).json({ error: 'Post not found' });
  const allowed = ['title', 'concept', 'status', 'scheduled_at', 'notes', 'brand_id'];
  const sets = [];
  const vals = [];
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      if (f === 'status' && !STATUS_IDS.includes(req.body[f])) continue;
      sets.push(`${f} = ?`);
      vals.push(req.body[f] === '' ? null : req.body[f]);
    }
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    run(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  }
  res.json(postWithVariants(id));
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM posts WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// ── Variants ──────────────────────────────────────────────────────────────────
function insertVariant(postId, v) {
  const hashtags = Array.isArray(v.hashtags)
    ? v.hashtags.map((h) => '#' + String(h).replace(/^#/, '')).join(' ')
    : (v.hashtags || '');
  const { lastInsertRowid } = run(
    `INSERT INTO post_variants (post_id, platform, body, hashtags, image_prompt, image_path)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, v.platform || '', v.body || '', hashtags, v.image_prompt || '', v.image_path || '']
  );
  return lastInsertRowid;
}

router.post('/:id/variants', (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM posts WHERE id = ?', [id])) return res.status(404).json({ error: 'Post not found' });
  const vid = insertVariant(id, req.body || {});
  run("UPDATE posts SET updated_at = datetime('now') WHERE id = ?", [id]);
  res.status(201).json(get('SELECT * FROM post_variants WHERE id = ?', [vid]));
});

router.put('/:id/variants/:vid', (req, res) => {
  const vid = Number(req.params.vid);
  if (!get('SELECT id FROM post_variants WHERE id = ?', [vid])) return res.status(404).json({ error: 'Variant not found' });
  const allowed = ['platform', 'body', 'hashtags', 'image_prompt', 'image_path'];
  const sets = [];
  const vals = [];
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      let val = req.body[f];
      if (f === 'hashtags' && Array.isArray(val)) val = val.map((h) => '#' + String(h).replace(/^#/, '')).join(' ');
      sets.push(`${f} = ?`); vals.push(val);
    }
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    run(`UPDATE post_variants SET ${sets.join(', ')} WHERE id = ?`, [...vals, vid]);
  }
  res.json(get('SELECT * FROM post_variants WHERE id = ?', [vid]));
});

router.delete('/:id/variants/:vid', async (req, res) => {
  const variant = get('SELECT * FROM post_variants WHERE id = ?', [Number(req.params.vid)]);
  if (variant && variant.image_path) {
    try { await unlink(join(UPLOADS_DIR, variant.image_path)); } catch { /* gone */ }
  }
  run('DELETE FROM post_variants WHERE id = ?', [Number(req.params.vid)]);
  res.json({ ok: true });
});

// Attach an uploaded image to a variant.
router.post('/:id/variants/:vid/image', upload.single('image'), (req, res) => {
  const vid = Number(req.params.vid);
  if (!get('SELECT id FROM post_variants WHERE id = ?', [vid])) return res.status(404).json({ error: 'Variant not found' });
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  run("UPDATE post_variants SET image_path = ?, updated_at = datetime('now') WHERE id = ?", [req.file.filename, vid]);
  res.json(get('SELECT * FROM post_variants WHERE id = ?', [vid]));
});

export default router;
