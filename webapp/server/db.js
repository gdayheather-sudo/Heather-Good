import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(join(dataDir, 'uploads'), { recursive: true });

export const DATA_DIR = dataDir;
export const UPLOADS_DIR = join(dataDir, 'uploads');

const db = new DatabaseSync(join(dataDir, 'app.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS brands (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  voice         TEXT DEFAULT '',
  guidelines    TEXT DEFAULT '',
  audience      TEXT DEFAULT '',
  website       TEXT DEFAULT '',
  color_primary   TEXT DEFAULT '#6c5ce7',
  color_secondary TEXT DEFAULT '#00b894',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brand_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id   INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'example',  -- example | reference | logo
  platform   TEXT DEFAULT '',
  file_path  TEXT DEFAULT '',                  -- relative path under /uploads
  caption    TEXT DEFAULT '',
  notes      TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id     INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Untitled post',
  concept      TEXT DEFAULT '',                -- the brief / source idea
  status       TEXT NOT NULL DEFAULT 'idea',   -- idea|draft|in_review|approved|scheduled|published
  scheduled_at TEXT,                           -- ISO datetime or NULL
  notes        TEXT DEFAULT '',
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_variants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  body         TEXT DEFAULT '',
  hashtags     TEXT DEFAULT '',                -- space/comma separated
  image_prompt TEXT DEFAULT '',
  image_path   TEXT DEFAULT '',                -- relative path under /uploads
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id   INTEGER REFERENCES brands(id) ON DELETE CASCADE,
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  notes      TEXT DEFAULT '',
  done       INTEGER NOT NULL DEFAULT 0,
  priority   TEXT NOT NULL DEFAULT 'normal',   -- low | normal | high
  due_date   TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

export default db;

// ── tiny query helpers ────────────────────────────────────────────────────────
export function run(sql, params = []) {
  const info = db.prepare(sql).run(...params);
  return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
}
export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}
