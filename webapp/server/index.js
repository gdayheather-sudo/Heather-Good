import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import './db.js'; // initialise database + schema
import { UPLOADS_DIR } from './db.js';

import metaRoutes from './routes/meta.js';
import settingsRoutes from './routes/settings.js';
import brandRoutes from './routes/brands.js';
import postRoutes from './routes/posts.js';
import taskRoutes from './routes/tasks.js';
import generateRoutes from './routes/generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '2mb' }));

// API
app.use('/api/meta', metaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/generate', generateRoutes);

// Uploaded + generated images
app.use('/uploads', express.static(UPLOADS_DIR));

// Static front-end
const publicDir = join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*splat', (req, res) => res.sendFile(join(publicDir, 'index.html')));

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 400).json({ error: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 4477;
app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Social Studio is running');
  console.log(`  ✦ Open  http://localhost:${PORT}`);
  console.log('');
});
