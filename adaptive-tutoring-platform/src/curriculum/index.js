/**
 * ACARA v9.0 curriculum mapping.
 *
 * Each outcome has a stable code (e.g. AC9M1N01) that maps to one or more
 * content units in /src/content. Codes follow the official ACARA v9.0 scheme:
 *   AC9 + subject(M/E/S) + year(F/1..10) + strand-letter + sequence.
 *
 * This file ships Foundation–Year 3 for English and Mathematics so the engine
 * can move a Year 1 student up or down by ability without leaving the
 * mapped curriculum. Add further years by appending entries.
 */

const english = require('./english');
const mathematics = require('./mathematics');

const SUBJECTS = {
  english,
  mathematics,
};

function subjects() {
  return Object.keys(SUBJECTS).map((s) => ({
    id: s,
    name: SUBJECTS[s].name,
    yearLevels: Object.keys(SUBJECTS[s].years),
  }));
}

function outcomesFor(subject, yearLevel) {
  const sub = SUBJECTS[subject];
  if (!sub) return null;
  const yr = sub.years[yearLevel];
  if (!yr) return null;
  return { subject, yearLevel, strands: yr.strands, outcomes: yr.outcomes };
}

function outcome(code) {
  for (const subKey of Object.keys(SUBJECTS)) {
    const sub = SUBJECTS[subKey];
    for (const yKey of Object.keys(sub.years)) {
      const o = sub.years[yKey].outcomes.find((x) => x.code === code);
      if (o) return { ...o, subject: subKey, yearLevel: yKey };
    }
  }
  return null;
}

function allOutcomes() {
  const out = [];
  for (const subKey of Object.keys(SUBJECTS)) {
    const sub = SUBJECTS[subKey];
    for (const yKey of Object.keys(sub.years)) {
      for (const o of sub.years[yKey].outcomes) {
        out.push({ ...o, subject: subKey, yearLevel: yKey });
      }
    }
  }
  return out;
}

module.exports = { subjects, outcomesFor, outcome, allOutcomes };
