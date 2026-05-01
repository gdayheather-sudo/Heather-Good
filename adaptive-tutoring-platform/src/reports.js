/**
 * Reporting layer (org/admin-facing).
 *
 * Builds the data shapes used by the admin dashboard plus an NDIS-friendly
 * CSV export for individual students.
 */

const store = require('./data-store');
const profiles = require('./profile-system');
const curriculum = require('./curriculum');

function overview() {
  const students = store.get('students');
  const attempts = store.get('attempts');
  const now = Date.now();

  const perStudent = students.map((s) => {
    const sa = attempts.filter((a) => a.studentId === s.id);
    const minutes = sa.reduce((acc, a) => acc + (a.durationMs || 0) / 60000, 0);
    const acc = sa.length ? sa.filter((a) => a.correct).length / sa.length : 0;
    const last = sa[sa.length - 1]?.ts || s.lastActiveAt;
    const daysSince = last ? Math.round((now - new Date(last).getTime()) / 86400000) : null;
    return {
      id: s.id,
      name: s.name,
      yearLevel: s.yearLevel,
      level: s.level,
      attempts: sa.length,
      accuracy: round(acc, 2),
      minutes: round(minutes, 1),
      lastActiveAt: last,
      daysSinceActive: daysSince,
      streakDays: s.streakDays,
    };
  });

  return {
    org: 'org-bright-paths',
    students: perStudent,
    totals: {
      students: students.length,
      attemptsThisOrg: attempts.length,
      avgAccuracy: round(perStudent.reduce((a, b) => a + (b.accuracy || 0), 0) / Math.max(1, perStudent.length), 2),
    },
  };
}

function studentCsv(studentId) {
  const summary = profiles.progressSummary(studentId);
  if (summary.error) return 'error,not found\n';
  const rows = [
    ['Adaptive Tutoring Platform - Student Progress Report'],
    ['Framework', 'ACARA v9.0'],
    ['Student', summary.student.name],
    ['Year level', summary.student.yearLevel],
    ['Maths ability band', summary.student.level.mathematics],
    ['English ability band', summary.student.level.english],
    ['Total attempts', summary.attempts],
    ['Streak (days)', summary.student.streakDays],
    [],
    ['Outcome', 'Subject', 'Year', 'Strand', 'Description', 'Attempts', 'Accuracy', 'Status'],
  ];
  for (const m of summary.skillMap) {
    rows.push([m.code, m.subject, m.yearLevel || '', m.strand || '', csvSafe(m.desc || ''), m.seen, m.accuracy, m.status]);
  }
  rows.push([]);
  rows.push(['Recommended focus areas']);
  for (const r of summary.recommended) rows.push([r.code, csvSafe(r.desc || ''), r.reason]);
  return rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n';
}

function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvSafe(s) {
  return String(s).replace(/\n/g, ' ');
}
function round(n, d) {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}

module.exports = { overview, studentCsv };
