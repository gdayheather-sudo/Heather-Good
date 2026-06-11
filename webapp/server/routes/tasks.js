import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

function decorate(tasks) {
  for (const t of tasks) {
    if (t.brand_id) {
      const b = get('SELECT name FROM brands WHERE id = ?', [t.brand_id]);
      t.brand_name = b ? b.name : null;
    }
    if (t.post_id) {
      const p = get('SELECT title FROM posts WHERE id = ?', [t.post_id]);
      t.post_title = p ? p.title : null;
    }
  }
  return tasks;
}

// List tasks, optionally filtered by brand or completion.
router.get('/', (req, res) => {
  const where = [];
  const params = [];
  if (req.query.brand_id) { where.push('brand_id = ?'); params.push(Number(req.query.brand_id)); }
  if (req.query.done === '0' || req.query.done === '1') { where.push('done = ?'); params.push(Number(req.query.done)); }
  const sql = `SELECT * FROM tasks ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY done ASC,
                 CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                 (due_date IS NULL), due_date ASC, created_at DESC`;
  res.json(decorate(all(sql, params)));
});

router.post('/', (req, res) => {
  const { title, notes = '', brand_id = null, post_id = null, priority = 'normal', due_date = null } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Task title is required.' });
  const { lastInsertRowid } = run(
    `INSERT INTO tasks (title, notes, brand_id, post_id, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title.trim(), notes, brand_id || null, post_id || null, priority, due_date || null]
  );
  res.status(201).json(decorate([get('SELECT * FROM tasks WHERE id = ?', [lastInsertRowid])])[0]);
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM tasks WHERE id = ?', [id])) return res.status(404).json({ error: 'Task not found' });
  const allowed = ['title', 'notes', 'done', 'priority', 'due_date', 'brand_id', 'post_id'];
  const sets = [];
  const vals = [];
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(f === 'done' ? (req.body[f] ? 1 : 0) : (req.body[f] === '' ? null : req.body[f]));
    }
  }
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  }
  res.json(decorate([get('SELECT * FROM tasks WHERE id = ?', [id])])[0]);
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM tasks WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

export default router;
