/**
 * Content registry - units, items, and the maps that connect them
 * to ACARA outcomes.
 *
 * A unit is the lesson container (Teach -> Practice -> Retrieval -> Review).
 * An item is a single question, modelled as { type, prompt, answer, explain }.
 *
 * The adaptive engine never reaches into a unit directly; it asks for
 * itemsForOutcome(code, ability, mode) so we can swap content sources later.
 */

const maths = require('./maths-units');
const english = require('./english-units');

const ALL = [...maths, ...english];

function init() {
  // hook for future content validation / hashing / hot-reload
  ALL.forEach((u) => {
    if (!u.id || !u.outcomeCode) {
      throw new Error(`Content unit missing id or outcomeCode: ${JSON.stringify(u).slice(0, 80)}`);
    }
  });
}

function unit(id) {
  return ALL.find((u) => u.id === id) || null;
}

function unitsForOutcome(code) {
  return ALL.filter((u) => u.outcomeCode === code);
}

function unitsForSubject(subject) {
  return ALL.filter((u) => u.subject === subject);
}

function unitsForBand(subject, lo, hi) {
  return ALL.filter((u) => u.subject === subject && u.band >= lo && u.band <= hi);
}

function itemsForOutcome(code, mode = 'practice') {
  // Aggregate items across all units mapped to this outcome.
  const units = unitsForOutcome(code);
  const items = [];
  units.forEach((u) => (u.items[mode] || []).forEach((it) => items.push({ ...it, unitId: u.id, outcomeCode: code })));
  return items;
}

function all() {
  return ALL;
}

module.exports = { init, unit, unitsForOutcome, unitsForSubject, unitsForBand, itemsForOutcome, all };
