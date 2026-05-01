/**
 * Data store - JSON file persistence for the MVP.
 *
 * One file per collection, all reads cached in memory and flushed on write.
 * Swap this module for a real database without changing route handlers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  students: path.join(DATA_DIR, 'students.json'),
  attempts: path.join(DATA_DIR, 'attempts.json'),
  schedule: path.join(DATA_DIR, 'schedule.json'),
  audit: path.join(DATA_DIR, 'audit.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
};

const cache = {};
const sessions = new Map();
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function load(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function persist(name) {
  fs.writeFileSync(FILES[name], JSON.stringify(cache[name], null, 2));
}

function init() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  cache.users = load(FILES.users, null);
  cache.students = load(FILES.students, []);
  cache.attempts = load(FILES.attempts, []);
  cache.schedule = load(FILES.schedule, {});
  cache.audit = load(FILES.audit, []);

  // Restore sessions across restarts so a `npm start` doesn't 401 everyone.
  const persisted = load(FILES.sessions, {});
  const now = Date.now();
  for (const [token, data] of Object.entries(persisted)) {
    if (data && data.expiresAt && data.expiresAt > now) {
      sessions.set(token, data.session);
    }
  }

  if (!cache.users) {
    cache.users = seedUsers();
    persist('users');
  }
  if (cache.students.length === 0) {
    cache.students = seedStudents(cache.users);
    persist('students');
  }
}

function seedUsers() {
  return [
    {
      id: 'admin-1',
      role: 'admin',
      username: 'admin',
      pin: '0000',
      name: 'Org Admin',
      orgId: 'org-bright-paths',
    },
    {
      id: 'mentor-1',
      role: 'mentor',
      username: 'heather',
      pin: '1234',
      name: 'Heather (Mentor)',
      orgId: 'org-bright-paths',
    },
    {
      id: 'student-1',
      role: 'student',
      username: 'arlo',
      pin: '11',
      name: 'Arlo',
      orgId: 'org-bright-paths',
      mentorId: 'mentor-1',
    },
    {
      id: 'student-2',
      role: 'student',
      username: 'mia',
      pin: '22',
      name: 'Mia',
      orgId: 'org-bright-paths',
      mentorId: 'mentor-1',
    },
  ];
}

function seedStudents(users) {
  return users
    .filter((u) => u.role === 'student')
    .map((u) => ({
      id: u.id,
      name: u.name,
      yearLevel: 1,
      mentorId: u.mentorId,
      orgId: u.orgId,
      interests: u.id === 'student-1' ? ['dogs', 'space'] : ['ocean', 'art'],
      theme: u.id === 'student-1' ? 'space' : 'ocean',
      sensory: {
        reduceMotion: false,
        reduceSound: u.id === 'student-2',
        highContrast: false,
        largeText: u.id === 'student-2',
      },
      strengths: [],
      challenges: [],
      level: { english: 1.0, mathematics: 1.0 }, // ability-band, decoupled from yearLevel
      streakDays: 0,
      points: 0,
      badges: [],
      lastActiveAt: null,
      createdAt: new Date().toISOString(),
    }));
}

// ── Sessions (persisted to disk so restarts don't kick users out) ────────
function persistSessions() {
  const out = {};
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    out[token] = { session, expiresAt: now + SESSION_TTL_MS };
  }
  fs.writeFileSync(FILES.sessions, JSON.stringify(out));
}
function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId: user.id, role: user.role, orgId: user.orgId });
  persistSessions();
  return token;
}
function getSession(token) {
  return token ? sessions.get(token) : null;
}
function endSession(token) {
  sessions.delete(token);
  persistSessions();
}

// ── User helpers ──────────────────────────────────────────────────────────
function findUser({ username, pin, role }) {
  return cache.users.find(
    (u) => u.username === username && u.pin === pin && (!role || u.role === role)
  );
}
function getUser(id) {
  return cache.users.find((u) => u.id === id);
}
function publicUser(u) {
  if (!u) return null;
  const { pin, ...rest } = u;
  return rest;
}

// ── Generic accessors ─────────────────────────────────────────────────────
function get(name) {
  return cache[name];
}
function save(name) {
  persist(name);
}

function audit(entry) {
  cache.audit.push({ ts: new Date().toISOString(), ...entry });
  persist('audit');
}

module.exports = {
  init,
  createSession,
  getSession,
  endSession,
  findUser,
  getUser,
  publicUser,
  get,
  save,
  audit,
};
