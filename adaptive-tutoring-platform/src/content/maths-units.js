/**
 * Maths content units.
 *
 * Each item has a `type` understood by the lesson player:
 *   multiple-choice | numeric | tap-count | order | true-false | drag-match
 *
 * `band` is the difficulty index (0.4 = late Foundation, 1.0 = early Year 1, etc).
 * The adaptive engine uses ability ± 0.3 to select units (desirable difficulty).
 */

const N1 = {
  id: 'm-y1-numbers-to-20',
  subject: 'mathematics',
  outcomeCode: 'AC9M1N01',
  yearLevel: '1',
  band: 1.0,
  title: 'Numbers to 20',
  strand: 'Number',
  prerequisites: ['AC9MFN01'],
  teach: {
    intro: 'Numbers help us count things. Let\'s look at numbers up to 20.',
    visualHint: 'tens-frame',
    examples: [
      { show: '🟢🟢🟢', label: '3' },
      { show: '🟢🟢🟢🟢🟢🟢🟢', label: '7' },
      { show: '🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢', label: '12' },
    ],
  },
  items: {
    practice: [
      { type: 'tap-count', prompt: 'Tap each dot to count them.', count: 5, answer: 5, explain: 'There are 5 dots. Counting one by one helps us be sure.' },
      { type: 'multiple-choice', prompt: 'Which number comes after 11?', options: ['10', '12', '15'], answer: '12', explain: '12 comes right after 11 when we count up.' },
      { type: 'order', prompt: 'Put these in order from smallest to biggest.', items: [13, 7, 18, 4], answer: [4, 7, 13, 18], explain: 'Smallest first, then count up.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'What number comes before 15?', options: ['13', '14', '16'], answer: '14', explain: '14 comes before 15.' },
      { type: 'numeric', prompt: 'How many is this? 🟢🟢🟢🟢🟢🟢🟢🟢', answer: 8, explain: '8 dots.' },
      { type: 'numeric', prompt: 'Type the number twenty.', answer: 20, explain: 'Twenty is written 20.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which is bigger?', options: ['9', '14'], answer: '14', explain: '14 is bigger than 9.' },
    ],
  },
};

const N2 = {
  id: 'm-y1-add-within-20',
  subject: 'mathematics',
  outcomeCode: 'AC9M1N04',
  yearLevel: '1',
  band: 1.3,
  title: 'Adding within 20',
  strand: 'Number',
  prerequisites: ['AC9M1N01'],
  teach: {
    intro: 'When we add, we put two groups together to make a bigger group.',
    visualHint: 'part-part-whole',
    examples: [
      { show: '🐶🐶 + 🐶🐶🐶', label: '2 + 3 = 5' },
      { show: '⭐⭐⭐⭐ + ⭐⭐⭐', label: '4 + 3 = 7' },
    ],
  },
  items: {
    practice: [
      { type: 'numeric', prompt: '3 + 2 = ?', answer: 5, explain: '3 and 2 makes 5. Count on from 3: 4, 5.' },
      { type: 'multiple-choice', prompt: '6 + 4 = ?', options: ['9', '10', '11'], answer: '10', explain: 'Six and four make a ten. Make-ten is a useful strategy.' },
      { type: 'numeric', prompt: '7 + 5 = ?', answer: 12, explain: 'Make ten: 7 + 3 = 10, then add 2 more = 12.' },
    ],
    retrieval: [
      { type: 'numeric', prompt: '8 + 6 = ?', answer: 14, explain: 'Make ten: 8 + 2 = 10, then add 4 more = 14.' },
      { type: 'numeric', prompt: '9 + 9 = ?', answer: 18, explain: 'Doubles: 9 + 9 is the double of 9 = 18.' },
      { type: 'multiple-choice', prompt: 'Which makes 10?', options: ['7 + 2', '6 + 4', '5 + 4'], answer: '6 + 4', explain: '6 and 4 make 10.' },
    ],
    review: [
      { type: 'numeric', prompt: '5 + 5 = ?', answer: 10, explain: 'Double 5 is 10.' },
    ],
  },
};

const N3 = {
  id: 'm-y1-subtract-within-20',
  subject: 'mathematics',
  outcomeCode: 'AC9M1N04',
  yearLevel: '1',
  band: 1.4,
  title: 'Subtracting within 20',
  strand: 'Number',
  prerequisites: ['AC9M1N04'],
  teach: {
    intro: 'When we take some away, we subtract.',
    visualHint: 'cross-out',
    examples: [
      { show: '🍎🍎🍎🍎🍎 take 2', label: '5 - 2 = 3' },
      { show: '🐠🐠🐠🐠🐠🐠🐠 take 3', label: '7 - 3 = 4' },
    ],
  },
  items: {
    practice: [
      { type: 'numeric', prompt: '8 - 3 = ?', answer: 5, explain: 'Count back from 8: 7, 6, 5.' },
      { type: 'numeric', prompt: '12 - 4 = ?', answer: 8, explain: 'From 12 take 4: 11, 10, 9, 8.' },
    ],
    retrieval: [
      { type: 'numeric', prompt: '15 - 7 = ?', answer: 8, explain: 'Think 7 + ? = 15. Add up to 10 (3), then 5 more = 8.' },
      { type: 'multiple-choice', prompt: 'Which is the same as 10 - 6?', options: ['10 + 6', '6 + 4', '4 + 6'], answer: '4 + 6', explain: '10 - 6 = 4, and 4 + 6 = 10.' },
    ],
    review: [
      { type: 'numeric', prompt: '9 - 4 = ?', answer: 5, explain: '9 take 4 is 5.' },
    ],
  },
};

const N4 = {
  id: 'm-y1-word-problems',
  subject: 'mathematics',
  outcomeCode: 'AC9M1N05',
  yearLevel: '1',
  band: 1.5,
  title: 'Story problems',
  strand: 'Number',
  prerequisites: ['AC9M1N04'],
  teach: {
    intro: 'Sometimes maths comes in a story. Read carefully, find the numbers, and decide if you add or take away.',
    examples: [
      { show: 'Mia has 4 shells. She finds 3 more.', label: '4 + 3 = 7 shells' },
    ],
  },
  items: {
    practice: [
      { type: 'numeric', prompt: 'Arlo has 5 toy dogs. His friend gives him 3 more. How many now?', answer: 8, explain: '5 + 3 = 8.' },
      { type: 'numeric', prompt: 'There are 12 fish in a tank. 5 swim away. How many are left?', answer: 7, explain: '12 - 5 = 7.' },
    ],
    retrieval: [
      { type: 'numeric', prompt: 'Mia has 14 stickers. She gives 6 to her brother. How many does she have now?', answer: 8, explain: '14 - 6 = 8.' },
    ],
    review: [
      { type: 'numeric', prompt: 'A kennel has 7 puppies. 4 more arrive. How many puppies?', answer: 11, explain: '7 + 4 = 11.' },
    ],
  },
};

const SP1 = {
  id: 'm-y1-shapes',
  subject: 'mathematics',
  outcomeCode: 'AC9M1SP01',
  yearLevel: '1',
  band: 1.0,
  title: '2D shapes',
  strand: 'Space',
  prerequisites: ['AC9MFSP01'],
  teach: {
    intro: 'Shapes are everywhere. We can sort them by their sides and corners.',
    examples: [
      { show: '▲', label: 'Triangle - 3 sides' },
      { show: '■', label: 'Square - 4 equal sides' },
      { show: '●', label: 'Circle - no corners' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'How many sides does a triangle have?', options: ['2', '3', '4'], answer: '3', explain: 'A triangle has 3 sides and 3 corners.' },
      { type: 'multiple-choice', prompt: 'Which shape has no corners?', options: ['Square', 'Triangle', 'Circle'], answer: 'Circle', explain: 'A circle is round - no corners.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'A shape with 4 equal sides is a...', options: ['Rectangle', 'Square', 'Triangle'], answer: 'Square', explain: 'All four sides equal makes a square.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which has 4 sides?', options: ['Triangle', 'Square', 'Circle'], answer: 'Square', explain: 'A square has 4 sides.' },
    ],
  },
};

const A1 = {
  id: 'm-y1-patterns',
  subject: 'mathematics',
  outcomeCode: 'AC9M1A01',
  yearLevel: '1',
  band: 1.2,
  title: 'Patterns',
  strand: 'Algebra',
  prerequisites: ['AC9M1N01'],
  teach: {
    intro: 'A pattern repeats or grows. Spotting the rule helps us guess what comes next.',
    examples: [
      { show: '🔴🔵🔴🔵🔴__', label: 'Repeating: 🔵' },
      { show: '2, 4, 6, 8, __', label: 'Growing by 2: 10' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'What comes next? 🔴🔵🔴🔵🔴__', options: ['🔴', '🔵', '🟢'], answer: '🔵', explain: 'It alternates red, blue.' },
      { type: 'numeric', prompt: 'What comes next? 5, 10, 15, __', answer: 20, explain: 'It grows by 5 each time.' },
    ],
    retrieval: [
      { type: 'numeric', prompt: 'What comes next? 2, 4, 6, 8, __', answer: 10, explain: 'Skip-counting by 2.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Pattern: 🌟🐶🌟🐶🌟__', options: ['🌟', '🐶'], answer: '🐶', explain: 'Star, dog, repeat.' },
    ],
  },
};

const M1 = {
  id: 'm-y1-time-hour',
  subject: 'mathematics',
  outcomeCode: 'AC9M1M02',
  yearLevel: '1',
  band: 1.4,
  title: 'Time to the hour',
  strand: 'Measurement',
  prerequisites: ['AC9M1N01'],
  teach: {
    intro: 'When the long hand points to 12, it is on the hour. The short hand tells the hour.',
    examples: [
      { show: '🕒', label: '3 o\'clock' },
      { show: '🕘', label: '9 o\'clock' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'The short hand is on 6, the long hand is on 12. What time?', options: ['6 o\'clock', '12 o\'clock', 'half past 6'], answer: '6 o\'clock', explain: 'Long on 12 = on the hour.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Which time is "on the hour"?', options: ['Long hand on 6', 'Long hand on 12', 'Long hand on 3'], answer: 'Long hand on 12', explain: 'On the hour means minute hand on 12.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'What time? Short on 8, long on 12.', options: ['8 o\'clock', '12 o\'clock'], answer: '8 o\'clock', explain: '8 o\'clock.' },
    ],
  },
};

// ── Foundation (below) and Year 2 (above) for cross-year adaptation ──────
const F1 = {
  id: 'm-fnd-numbers-to-10',
  subject: 'mathematics',
  outcomeCode: 'AC9MFN01',
  yearLevel: 'F',
  band: 0.4,
  title: 'Counting to 10',
  strand: 'Number',
  prerequisites: [],
  teach: {
    intro: 'Counting helps us know how many.',
    examples: [
      { show: '🐶', label: '1' },
      { show: '🐶🐶🐶🐶', label: '4' },
    ],
  },
  items: {
    practice: [
      { type: 'tap-count', prompt: 'Tap to count.', count: 4, answer: 4, explain: 'We count one at a time.' },
      { type: 'multiple-choice', prompt: 'Which number is biggest?', options: ['3', '7', '5'], answer: '7', explain: '7 is the biggest.' },
    ],
    retrieval: [
      { type: 'numeric', prompt: 'How many? 🌟🌟🌟', answer: 3, explain: 'Three stars.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'What comes after 6?', options: ['5', '7', '8'], answer: '7', explain: '7 comes after 6.' },
    ],
  },
};

const N5_y2 = {
  id: 'm-y2-numbers-to-1000',
  subject: 'mathematics',
  outcomeCode: 'AC9M2N01',
  yearLevel: '2',
  band: 2.0,
  title: 'Numbers to 1000',
  strand: 'Number',
  prerequisites: ['AC9M1N01'],
  teach: {
    intro: 'Three-digit numbers have hundreds, tens and ones.',
    examples: [
      { show: '247', label: '2 hundreds, 4 tens, 7 ones' },
    ],
  },
  items: {
    practice: [
      { type: 'numeric', prompt: 'What number is 3 hundreds, 5 tens and 2 ones?', answer: 352, explain: '300 + 50 + 2 = 352.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Which is bigger?', options: ['487', '478'], answer: '487', explain: 'Compare tens: 8 tens > 7 tens.' },
    ],
    review: [
      { type: 'numeric', prompt: 'What comes after 199?', answer: 200, explain: '200 comes after 199.' },
    ],
  },
};

module.exports = [F1, N1, N2, N3, N4, A1, SP1, M1, N5_y2];
