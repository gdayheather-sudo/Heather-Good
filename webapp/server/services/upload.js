import multer from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOADS_DIR } from '../db.js';

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `up-${Date.now()}-${randomUUID().slice(0, 8)}${ALLOWED.has(ext) ? ext : '.png'}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.has(extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only PNG, JPG, WEBP or GIF images are allowed.'), ok);
  },
});
