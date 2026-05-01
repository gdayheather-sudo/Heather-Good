/**
 * Adaptive learning engine.
 *
 * Combines four mechanisms drawn from learning-science research:
 *   1. Ability tracking (Elo-like update per outcome).
 *   2. Desirable difficulty - select items where p(correct) ~ 0.7-0.85.
 *   3. Spaced repetition - SM-2-inspired scheduling for retrieval/review items.
 *   4. Interleaving - mix subjects/outcomes once mastery threshold is met.
 *
 * The engine has no opinion on UI. It returns a "lesson plan" - an ordered
 * list of items grouped into Teach/Practice/Retrieval/Review phases.
 */

const store = require('./data-store');
const curriculum = require('./curriculum');
const content = require('./content');
const profiles = require('./profile-system');

const DESIRED_P_LOW = 0.65; // below this -> too hard, scaffold down
const DESIRED_P_HIGH = 0.9; // above this -> too easy, push up
const MASTERY_THRESHOLD = 3; // n consecutive correct retrievals
const ABILITY_STEP = 0.15;

// ── Ability + mastery state, derived from attempts ────────────────────────
function masteryFor(studentId) {
  const attempts = store.get('attempts').filter((a) => a.studentId === studentId);
  const byOutcome = {};
  for (const a of attempts) {
    const m = (byOutcome[a.outcomeCode] ||= {
      seen: 0, correct: 0, streak: 0, lastSeen: null, lastCorrect: null, ef: 2.5, interval: 1, reps: 0,
    });
    m.seen += 1;
    m.lastSeen = a.ts;
    if (a.correct) {
      m.correct += 1;
      m.streak += 1;
      m.lastCorrect = a.ts;
    } else {
      m.streak = 0;
    }
  }
  return byOutcome;
}

function abilityFor(studentId, subject) {
  const student = profiles.get(studentId);
  if (!student) return 1.0;
  return student.level?.[subject] ?? 1.0;
}

function statusForOutcome(mastery) {
  if (!mastery || mastery.seen === 0) return 'new';
  const acc = mastery.correct / mastery.seen;
  if (mastery.streak >= MASTERY_THRESHOLD && acc >= 0.8) return 'mastered';
  if (acc >= 0.6) return 'developing';
  return 'struggling';
}

// ── Selection: which outcome to work on next ──────────────────────────────
function chooseOutcome(studentId, subjectFilter) {
  const student = profiles.get(studentId);
  const mastery = masteryFor(studentId);
  const now = Date.now();

  // 1. Honour mentor focus areas first.
  const focus = student.focus || [];
  for (const code of focus) {
    const o = curriculum.outcome(code);
    if (o && (!subjectFilter || o.subject === subjectFilter)) return o;
  }

  // 2. Anything due for spaced review?
  const dueSoon = Object.entries(mastery)
    .map(([code, m]) => ({ code, m }))
    .filter(({ m }) => m.lastSeen && now - new Date(m.lastSeen).getTime() > intervalMs(m.interval))
    .map(({ code }) => curriculum.outcome(code))
    .filter((o) => o && (!subjectFilter || o.subject === subjectFilter));
  if (dueSoon.length) return dueSoon[Math.floor(Math.random() * dueSoon.length)];

  // 3. Otherwise pick an outcome near the student's ability that isn't mastered.
  const subjects = subjectFilter ? [subjectFilter] : ['mathematics', 'english'];
  const candidates = [];
  for (const sub of subjects) {
    const ability = abilityFor(studentId, sub);
    const all = curriculum.allOutcomes().filter((o) => o.subject === sub);
    for (const o of all) {
      const m = mastery[o.code];
      if (statusForOutcome(m) === 'mastered') continue;
      const distance = Math.abs(o.band - ability);
      candidates.push({ o, distance, status: statusForOutcome(m) });
    }
  }
  candidates.sort((a, b) => {
    // Prefer struggling ones (revisit), then nearest band.
    const sw = (s) => (s === 'struggling' ? 0 : s === 'developing' ? 1 : 2);
    return sw(a.status) - sw(b.status) || a.distance - b.distance;
  });
  return candidates[0]?.o || null;
}

// ── Lesson plan assembly ──────────────────────────────────────────────────
function selectNext(studentId, { subject } = {}) {
  const student = profiles.get(studentId);
  if (!student) return { error: 'student not found' };

  // Interleave subjects when no specific subject is requested.
  let chosenSubject = subject;
  if (!chosenSubject) {
    const recent = store.get('attempts').filter((a) => a.studentId === studentId).slice(-5);
    const lastSubject = recent[recent.length - 1]?.subject;
    chosenSubject = lastSubject === 'mathematics' ? 'english' : 'mathematics';
  }

  const outcome = chooseOutcome(studentId, chosenSubject);
  if (!outcome) return { error: 'no outcomes available' };

  const mastery = masteryFor(studentId)[outcome.code];
  const status = statusForOutcome(mastery);
  const ability = abilityFor(studentId, outcome.subject);

  // Choose unit - prefer an exact outcome match within the student's band ± 0.3.
  let units = content.unitsForOutcome(outcome.code);
  if (units.length === 0) {
    units = content.unitsForBand(outcome.subject, ability - 0.3, ability + 0.3);
  }
  const unit = units[0] || content.unitsForSubject(outcome.subject)[0];
  if (!unit) return { error: 'no content for outcome' };

  // Phase mix depends on status:
  //   new           -> Teach + Practice + small Retrieval
  //   developing    -> short Teach reminder + Practice + Retrieval
  //   struggling    -> scaffolded Teach (concrete) + Practice (smaller steps)
  //   mastered      -> Review only (spaced)
  const plan = { unitId: unit.id, unitTitle: unit.title, outcomeCode: outcome.code, subject: outcome.subject, status, items: [] };

  if (status === 'new') {
    plan.teach = unit.teach;
    plan.items = [
      ...sample(unit.items.practice, 3),
      ...sample(unit.items.retrieval, 1),
    ];
  } else if (status === 'developing') {
    plan.teach = { intro: `Quick recap: ${unit.title}.`, examples: unit.teach.examples?.slice(0, 1) || [] };
    plan.items = [
      ...sample(unit.items.practice, 2),
      ...sample(unit.items.retrieval, 2),
    ];
  } else if (status === 'struggling') {
    // Scaffold down: pick prerequisite outcome's unit if available.
    const prereqCode = outcome.prereq || (curriculum.outcome(outcome.code)?.prerequisites?.[0]);
    let scaffoldUnit = null;
    if (prereqCode) scaffoldUnit = content.unitsForOutcome(prereqCode)[0];
    if (scaffoldUnit) {
      plan.teach = scaffoldUnit.teach;
      plan.items = sample(scaffoldUnit.items.practice, 3);
      plan.scaffoldFrom = scaffoldUnit.outcomeCode;
    } else {
      plan.teach = { ...unit.teach, intro: `Let's break it down. ${unit.teach.intro}` };
      plan.items = sample(unit.items.practice, 3);
    }
  } else if (status === 'mastered') {
    plan.items = sample(unit.items.review, 2);
    plan.modeNote = 'Spaced review - keeping it fresh.';
  }

  // Interleave: add one quick retrieval from a different already-seen outcome.
  const interleave = pickInterleaveItem(studentId, outcome.code);
  if (interleave) plan.items.push({ ...interleave, isInterleaved: true });

  return plan;
}

function pickInterleaveItem(studentId, excludeCode) {
  const m = masteryFor(studentId);
  const candidates = Object.keys(m).filter((c) => c !== excludeCode && m[c].seen >= 2 && statusForOutcome(m[c]) !== 'struggling');
  if (!candidates.length) return null;
  const code = candidates[Math.floor(Math.random() * candidates.length)];
  const items = content.itemsForOutcome(code, 'retrieval');
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

// ── Recording an attempt ──────────────────────────────────────────────────
function recordAttempt(studentId, attempt) {
  const { unitId, outcomeCode, correct, prompt, given, expected, mode, durationMs } = attempt;
  const unit = content.unit(unitId);
  if (!unit) return { error: 'unknown unit' };

  const subject = unit.subject;
  const entry = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId,
    unitId,
    outcomeCode,
    subject,
    correct: !!correct,
    prompt,
    given,
    expected,
    mode: mode || 'practice',
    durationMs: durationMs || null,
    ts: new Date().toISOString(),
  };
  store.get('attempts').push(entry);
  store.save('attempts');

  // Update ability (Elo-like): ability shifts toward outcome band on success.
  const student = profiles.get(studentId);
  const band = unit.band;
  const before = student.level[subject] ?? 1.0;
  const expectedP = sigmoid((before - band) * 2.5);
  const score = correct ? 1 : 0;
  const updated = before + ABILITY_STEP * (score - expectedP);
  student.level[subject] = round(updated, 2);
  if (correct) student.points += 5;
  // streak day update
  const today = new Date().toISOString().slice(0, 10);
  const last = student.lastActiveAt ? student.lastActiveAt.slice(0, 10) : null;
  if (last !== today) {
    student.streakDays = last && dayDiff(last, today) === 1 ? student.streakDays + 1 : 1;
  }
  student.lastActiveAt = entry.ts;
  awardBadges(student);
  profiles.persist();

  // Spaced-repetition update (SM-2 inspired) on retrieval/review modes.
  if (entry.mode === 'retrieval' || entry.mode === 'review') {
    updateSchedule(studentId, outcomeCode, correct);
  }

  // Adaptive feedback for the UI.
  const feedback = {
    correct: entry.correct,
    explain: lookupExplanation(unit, prompt) || null,
    abilityBefore: before,
    abilityAfter: student.level[subject],
    nextStep: nextStepHint(entry.correct, before, band),
    pointsAwarded: correct ? 5 : 0,
    streakDays: student.streakDays,
    badgesNew: student.badgesNew || [],
  };
  delete student.badgesNew;
  return feedback;
}

function lookupExplanation(unit, prompt) {
  const all = [
    ...(unit.items.practice || []),
    ...(unit.items.retrieval || []),
    ...(unit.items.review || []),
  ];
  return all.find((it) => it.prompt === prompt)?.explain;
}

function nextStepHint(correct, ability, band) {
  if (!correct && ability < band) return 'scaffold-down';
  if (!correct) return 'try-again';
  if (correct && ability >= band + 0.3) return 'level-up';
  return 'continue';
}

// ── Spaced-repetition (SM-2-inspired) ─────────────────────────────────────
function updateSchedule(studentId, code, correct) {
  const all = store.get('schedule');
  const key = `${studentId}::${code}`;
  const s = all[key] || { ef: 2.5, interval: 1, reps: 0 };
  const q = correct ? 5 : 2;
  s.ef = Math.max(1.3, s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (!correct) {
    s.reps = 0;
    s.interval = 1;
  } else {
    s.reps += 1;
    if (s.reps === 1) s.interval = 1;
    else if (s.reps === 2) s.interval = 3;
    else s.interval = Math.round(s.interval * s.ef);
  }
  s.dueAt = new Date(Date.now() + s.interval * 86400000).toISOString();
  all[key] = s;
  store.save('schedule');
}

function intervalMs(days) {
  return (days || 1) * 86400000;
}

// ── Diagnostic baseline ───────────────────────────────────────────────────
function baselineQuestions(studentId) {
  // Sample one item from a spread of bands so we can estimate ability quickly.
  const subjects = ['mathematics', 'english'];
  const out = [];
  for (const sub of subjects) {
    for (const band of [0.5, 1.0, 1.3, 1.5, 2.0]) {
      const u = content.all().find((c) => c.subject === sub && Math.abs(c.band - band) <= 0.15);
      if (!u) continue;
      const it = u.items.practice?.[0];
      if (!it) continue;
      out.push({ subject: sub, band, unitId: u.id, outcomeCode: u.outcomeCode, ...it });
    }
  }
  return { questions: out };
}

function scoreBaseline(studentId, { answers }) {
  const student = profiles.get(studentId);
  if (!student) return { error: 'no student' };
  const bySubject = {};
  for (const a of answers || []) {
    const list = (bySubject[a.subject] ||= []);
    list.push(a);
  }
  for (const sub of Object.keys(bySubject)) {
    const correct = bySubject[sub].filter((x) => x.correct);
    if (correct.length === 0) {
      student.level[sub] = Math.max(0.4, (bySubject[sub][0].band || 1.0) - 0.4);
    } else {
      // ability ~ highest band correct + 0.1 buffer
      student.level[sub] = round(Math.max(...correct.map((c) => c.band)) + 0.1, 2);
    }
  }
  profiles.persist();
  return { level: student.level };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function sample(arr, n) {
  if (!arr || arr.length === 0) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
function round(n, d) {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}
function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function awardBadges(student) {
  const newOnes = [];
  const has = (id) => student.badges.some((b) => b.id === id);
  if (student.streakDays >= 3 && !has('streak-3')) newOnes.push({ id: 'streak-3', name: '3-day streak', awardedAt: new Date().toISOString() });
  if (student.points >= 50 && !has('points-50')) newOnes.push({ id: 'points-50', name: '50 points', awardedAt: new Date().toISOString() });
  if (student.points >= 200 && !has('points-200')) newOnes.push({ id: 'points-200', name: '200 points', awardedAt: new Date().toISOString() });
  if (newOnes.length) {
    student.badges.push(...newOnes);
    student.badgesNew = newOnes;
  }
}

module.exports = { selectNext, recordAttempt, baselineQuestions, scoreBaseline, masteryFor, statusForOutcome };
