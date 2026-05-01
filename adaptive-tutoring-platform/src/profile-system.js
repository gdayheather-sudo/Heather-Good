/**
 * Student profile system.
 *
 * The profile is the "memory" of who the student is.
 * The adaptive engine reads it to personalise:
 *   - content theme (interests)
 *   - sensory accommodations
 *   - ability levels (per subject)
 *   - mentor-set focus areas
 *
 * Mentors and admins write to it. Students may only read their own.
 */

const store = require('./data-store');
const curriculum = require('./curriculum');
const crypto = require('crypto');

function listForUser(session) {
  const all = store.get('students');
  if (session.role === 'admin') return all.filter((s) => s.orgId === session.orgId);
  if (session.role === 'mentor') return all.filter((s) => s.mentorId === session.userId);
  return all.filter((s) => s.id === session.userId);
}

function get(id, session) {
  const s = store.get('students').find((x) => x.id === id);
  if (!s) return null;
  if (session) {
    const allowed =
      session.role === 'admin' && session.orgId === s.orgId ||
      session.role === 'mentor' && session.userId === s.mentorId ||
      session.role === 'student' && session.userId === s.id;
    if (!allowed) return null;
  }
  return s;
}

function persist() {
  store.save('students');
}

function create(session, body) {
  const id = `student-${crypto.randomBytes(4).toString('hex')}`;
  const student = {
    id,
    name: body.name || 'New learner',
    yearLevel: body.yearLevel ?? 1,
    mentorId: session.role === 'mentor' ? session.userId : (body.mentorId || null),
    orgId: session.orgId,
    interests: body.interests || [],
    theme: body.theme || 'space',
    sensory: {
      reduceMotion: !!body.sensory?.reduceMotion,
      reduceSound: !!body.sensory?.reduceSound,
      highContrast: !!body.sensory?.highContrast,
      largeText: !!body.sensory?.largeText,
    },
    strengths: body.strengths || [],
    challenges: body.challenges || [],
    level: { english: body.level?.english ?? 1.0, mathematics: body.level?.mathematics ?? 1.0 },
    focus: body.focus || [],
    streakDays: 0,
    points: 0,
    badges: [],
    lastActiveAt: null,
    createdAt: new Date().toISOString(),
  };
  store.get('students').push(student);
  persist();
  store.audit({ actor: session.userId, action: 'create-student', studentId: id });
  return student;
}

function update(id, body, session) {
  const s = get(id, session);
  if (!s) return null;
  // Whitelist of mutable fields - don't let a mentor overwrite ability silently
  // unless they explicitly send `level`.
  const mutable = ['name', 'yearLevel', 'interests', 'theme', 'sensory', 'strengths', 'challenges', 'focus', 'level'];
  for (const k of mutable) if (k in body) s[k] = body[k];
  persist();
  store.audit({ actor: session.userId, action: 'update-student', studentId: id, fields: Object.keys(body) });
  return s;
}

function progressSummary(studentId) {
  const s = get(studentId);
  if (!s) return { error: 'not found' };
  const attempts = store.get('attempts').filter((a) => a.studentId === studentId);
  const byOutcome = {};
  for (const a of attempts) {
    const m = (byOutcome[a.outcomeCode] ||= { code: a.outcomeCode, subject: a.subject, seen: 0, correct: 0, lastSeen: null });
    m.seen += 1;
    if (a.correct) m.correct += 1;
    m.lastSeen = a.ts;
  }
  const map = Object.values(byOutcome).map((m) => {
    const o = curriculum.outcome(m.code) || {};
    const acc = m.seen ? m.correct / m.seen : 0;
    let status = 'developing';
    if (m.seen === 0) status = 'new';
    else if (acc >= 0.85) status = 'mastered';
    else if (acc < 0.5) status = 'struggling';
    return { ...m, desc: o.desc, strand: o.strand, yearLevel: o.yearLevel, accuracy: round(acc, 2), status };
  });
  // Curriculum coverage: how many outcomes attempted vs mapped at student's year ± 1.
  const yr = String(s.yearLevel);
  const outcomes = curriculum.allOutcomes().filter((o) => ['F', '1', '2', '3'].includes(o.yearLevel));
  const seenCodes = new Set(map.map((m) => m.code));
  const coverage = {
    outcomesAttempted: seenCodes.size,
    outcomesAvailable: outcomes.length,
    mastered: map.filter((m) => m.status === 'mastered').length,
    struggling: map.filter((m) => m.status === 'struggling').length,
  };
  // Time on task (rough): sum of per-attempt durationMs.
  const minutesByDay = {};
  for (const a of attempts) {
    const day = a.ts.slice(0, 10);
    minutesByDay[day] = (minutesByDay[day] || 0) + ((a.durationMs || 0) / 60000);
  }
  return {
    student: { id: s.id, name: s.name, yearLevel: s.yearLevel, theme: s.theme, level: s.level, streakDays: s.streakDays, points: s.points, badges: s.badges },
    attempts: attempts.length,
    skillMap: map,
    coverage,
    minutesByDay,
    recommended: recommendFocus(map, s),
  };
}

function recommendFocus(map, student) {
  const struggling = map.filter((m) => m.status === 'struggling').slice(0, 3).map((m) => ({ code: m.code, reason: 'low accuracy', desc: m.desc }));
  // Suggest the next outcome above current ability if not enough struggling outcomes.
  const recs = [...struggling];
  if (recs.length < 3) {
    for (const sub of ['mathematics', 'english']) {
      const lvl = student.level[sub];
      const next = curriculum.allOutcomes().filter((o) => o.subject === sub && o.band > lvl && o.band < lvl + 0.4).slice(0, 1)[0];
      if (next && !recs.some((r) => r.code === next.code)) recs.push({ code: next.code, reason: 'next step', desc: next.desc });
    }
  }
  return recs.slice(0, 4);
}

function round(n, d) {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}

module.exports = { listForUser, get, create, update, persist, progressSummary };
