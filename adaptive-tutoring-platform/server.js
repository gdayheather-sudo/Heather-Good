/**
 * Adaptive Tutoring Platform - Server
 *
 * Express app exposing:
 *   /api/auth      - role-based login (student / mentor / admin)
 *   /api/students  - profile CRUD (mentor + admin)
 *   /api/lessons   - next lesson selection (adaptive engine)
 *   /api/progress  - record attempts, fetch mastery
 *   /api/curriculum - ACARA v9.0 outcomes
 *   /api/admin     - org-wide reports
 *
 * Persistence is JSON-file based for the MVP. The architecture
 * isolates the data layer (src/data-store.js) so it can be
 * swapped for Postgres/Firestore without touching route logic.
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const store = require('./src/data-store');
const engine = require('./src/adaptive-engine');
const profiles = require('./src/profile-system');
const curriculum = require('./src/curriculum');
const content = require('./src/content');
const reports = require('./src/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────────────────────────────────────
// Lightweight session token (MVP). Replace with proper auth (JWT/SAML) later.
// ──────────────────────────────────────────────────────────────────────────
function authRequired(roles) {
  return (req, res, next) => {
    const token = req.header('x-session-token');
    const session = store.getSession(token);
    if (!session) return res.status(401).json({ error: 'unauthenticated' });
    if (roles && !roles.includes(session.role)) {
      return res.status(403).json({ error: 'forbidden', need: roles });
    }
    req.session = session;
    next();
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, pin, role } = req.body || {};
  const user = store.findUser({ username, pin, role });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const token = store.createSession(user);
  res.json({ token, user: store.publicUser(user) });
});

app.post('/api/auth/logout', authRequired(), (req, res) => {
  store.endSession(req.header('x-session-token'));
  res.json({ ok: true });
});

app.get('/api/auth/me', authRequired(), (req, res) => {
  res.json({ user: store.publicUser(store.getUser(req.session.userId)) });
});

// ── Curriculum (ACARA v9.0) ───────────────────────────────────────────────
app.get('/api/curriculum', authRequired(), (req, res) => {
  res.json({
    framework: 'ACARA v9.0',
    subjects: curriculum.subjects(),
  });
});

app.get('/api/curriculum/:subject/:yearLevel', authRequired(), (req, res) => {
  const data = curriculum.outcomesFor(req.params.subject, req.params.yearLevel);
  if (!data) return res.status(404).json({ error: 'not found' });
  res.json(data);
});

// ── Student profiles (mentors + admins) ───────────────────────────────────
app.get('/api/students', authRequired(['mentor', 'admin']), (req, res) => {
  const list = profiles.listForUser(req.session);
  res.json({ students: list });
});

app.post('/api/students', authRequired(['mentor', 'admin']), (req, res) => {
  const created = profiles.create(req.session, req.body);
  res.json({ student: created });
});

app.get('/api/students/:id', authRequired(), (req, res) => {
  const s = profiles.get(req.params.id, req.session);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json({ student: s });
});

app.patch('/api/students/:id', authRequired(['mentor', 'admin']), (req, res) => {
  const s = profiles.update(req.params.id, req.body, req.session);
  res.json({ student: s });
});

// ── Adaptive learning engine: next lesson + record attempt ────────────────
app.get('/api/lessons/next', authRequired(['student']), (req, res) => {
  const subject = req.query.subject || null;
  const next = engine.selectNext(req.session.userId, { subject });
  res.json(next);
});

app.post('/api/lessons/attempt', authRequired(['student']), (req, res) => {
  const result = engine.recordAttempt(req.session.userId, req.body);
  res.json(result);
});

app.get('/api/progress/:studentId', authRequired(), (req, res) => {
  const summary = profiles.progressSummary(req.params.studentId);
  res.json(summary);
});

// ── Admin reports ─────────────────────────────────────────────────────────
app.get('/api/admin/overview', authRequired(['admin']), (req, res) => {
  res.json(reports.overview());
});

app.get('/api/admin/student/:id/report.csv', authRequired(['admin', 'mentor']), (req, res) => {
  const csv = reports.studentCsv(req.params.id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="student-${req.params.id}.csv"`);
  res.send(csv);
});

// ── Diagnostic baseline ───────────────────────────────────────────────────
app.get('/api/baseline/:studentId', authRequired(), (req, res) => {
  res.json(engine.baselineQuestions(req.params.studentId));
});

app.post('/api/baseline/:studentId', authRequired(), (req, res) => {
  const result = engine.scoreBaseline(req.params.studentId, req.body);
  res.json(result);
});

// ── Health ────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, framework: 'ACARA v9.0' }));

// ── Boot ──────────────────────────────────────────────────────────────────
store.init();
content.init();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Adaptive Tutoring Platform running on http://localhost:${PORT}`);
});

module.exports = app;
