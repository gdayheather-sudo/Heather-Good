/**
 * English content units (Foundation - Year 2 spread for cross-year adaptation).
 *
 * Item types added for English:
 *   listen-pick   - learner hears a sound/word, picks the matching letter/word
 *   blend         - shown phonemes, picks the blended word
 *   sentence-build - drag words into order
 */

const E_F_PHONICS = {
  id: 'e-fnd-letter-sounds',
  subject: 'english',
  outcomeCode: 'AC9EFLY02',
  yearLevel: 'F',
  band: 0.5,
  title: 'Letter sounds',
  strand: 'Literacy',
  prerequisites: [],
  teach: {
    intro: 'Letters make sounds. Sounds blend to make words.',
    say: 'Letters make sounds. Sounds blend to make words. Listen: sss like in snake. aaa like in apple. tuh like in tap.',
    examples: [
      { show: 's', say: 'sss, like in snake', label: 'sssss (snake)' },
      { show: 'a', say: 'aaa, like in apple', label: 'aaaa (apple)' },
      { show: 't', say: 'tuh, like in tap',   label: 't (tap)' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'Which letter says "mmmm"?', say: 'Which letter makes the mmm sound?', options: ['m', 's', 'p'], answer: 'm', explain: 'The letter m makes the mmm sound, like in moon.' },
      { type: 'multiple-choice', prompt: 'Which starts with "ssss"?', say: 'Which word starts with the sss sound?', options: ['cat', 'sun', 'dog'], answer: 'sun', explain: 'Sun starts with the sss sound.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Which letter says "t"?', say: 'Which letter makes the tuh sound?', options: ['t', 'd', 'p'], answer: 't', explain: 'The letter t makes the tuh sound.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which starts with "a"?', say: 'Which word starts with the aaa sound?', options: ['ant', 'bat'], answer: 'ant', explain: 'Ant starts with the aaa sound.' },
    ],
  },
};

const E1_BLEND = {
  id: 'e-y1-cvc-blending',
  subject: 'english',
  outcomeCode: 'AC9E1LY02',
  yearLevel: '1',
  band: 1.2,
  title: 'Blending sounds (CVC)',
  strand: 'Literacy',
  prerequisites: ['AC9EFLY03'],
  teach: {
    intro: 'Blend the sounds together: c-a-t says "cat".',
    say: 'Blend the sounds together. Listen: kuh, aaa, tuh, says cat.',
    examples: [
      { show: 'd-o-g', say: 'duh, awe, guh, says dog', label: 'dog' },
      { show: 'p-i-g', say: 'puh, ih, guh, says pig',   label: 'pig' },
      { show: 's-u-n', say: 'sss, uh, nnn, says sun',   label: 'sun' },
    ],
  },
  items: {
    practice: [
      { type: 'blend', prompt: 'Blend these sounds: c - a - t', say: 'Blend these sounds: kuh, aaa, tuh',  options: ['cat', 'cap', 'can'], answer: 'cat', explain: 'kuh, aaa, tuh blends to cat.' },
      { type: 'blend', prompt: 'Blend these sounds: m - a - p', say: 'Blend these sounds: mmm, aaa, puh',  options: ['mat', 'man', 'map'], answer: 'map', explain: 'mmm, aaa, puh makes map.' },
    ],
    retrieval: [
      { type: 'blend', prompt: 'Blend: h - o - p', say: 'Blend these sounds: huh, awe, puh', options: ['hot', 'hop', 'hip'], answer: 'hop', explain: 'huh, awe, puh says hop.' },
      { type: 'multiple-choice', prompt: 'Which word has the same first sound as "fish"?', say: 'Which word has the same first sound as fish?', options: ['fox', 'sun', 'cat'], answer: 'fox', explain: 'Fox and fish both start with the fff sound.' },
    ],
    review: [
      { type: 'blend', prompt: 'Blend: b - i - g', say: 'Blend these sounds: buh, ih, guh', options: ['bag', 'big', 'bog'], answer: 'big', explain: 'buh, ih, guh makes big.' },
    ],
  },
};

const E1_DIGRAPHS = {
  id: 'e-y1-digraphs',
  subject: 'english',
  outcomeCode: 'AC9E1LY02',
  yearLevel: '1',
  band: 1.3,
  title: 'Digraphs: sh, ch, th',
  strand: 'Literacy',
  prerequisites: ['AC9E1LY02'],
  teach: {
    intro: 'Two letters can team up to make one sound: sh, ch, th.',
    // `say` overrides what the read-aloud voice speaks, so it pronounces the
    // digraph as a sound rather than spelling out each letter.
    say: 'Two letters can team up to make one sound. Listen: shhh as in shop. ch as in chip. thhh as in this.',
    examples: [
      { show: 'sh', say: 'shhh, as in shop and ship', label: 'shop, ship' },
      { show: 'ch', say: 'ch, as in chip and chop',   label: 'chip, chop' },
      { show: 'th', say: 'thhh, as in this and that', label: 'this, that' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'Which word starts with "sh"?', say: 'Which word starts with the shhh sound?', options: ['ship', 'chip', 'tip'], answer: 'ship', explain: 'Ship starts with the shhh sound.' },
      { type: 'multiple-choice', prompt: 'Which word ends with "ch"?', say: 'Which word ends with the ch sound?', options: ['fish', 'rich', 'wish'], answer: 'rich', explain: 'Rich ends with the ch sound.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Which word starts with "th"?', say: 'Which word starts with the thhh sound?', options: ['then', 'pen', 'sent'], answer: 'then', explain: '"Then" starts with the thhh sound.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which has the "sh" sound?', say: 'Which word has the shhh sound?', options: ['shoe', 'see'], answer: 'shoe', explain: 'Shoe has the shhh sound.' },
    ],
  },
};

const E1_SENTENCE = {
  id: 'e-y1-simple-sentence',
  subject: 'english',
  outcomeCode: 'AC9E1LA03',
  yearLevel: '1',
  band: 1.1,
  title: 'Simple sentences',
  strand: 'Language',
  prerequisites: [],
  teach: {
    intro: 'A sentence starts with a CAPITAL letter and ends with a full stop.',
    examples: [
      { show: 'The dog runs.', label: 'Capital "T" and full stop "."' },
      { show: 'Mia plays.', label: 'Capital "M" and full stop "."' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'Which is a complete sentence?', options: ['the cat sleeps', 'The cat sleeps.', 'cat sleeps'], answer: 'The cat sleeps.', explain: 'Capital letter at start, full stop at end.' },
      { type: 'sentence-build', prompt: 'Drag words to make a sentence.', words: ['runs', 'The', 'dog'], answer: ['The', 'dog', 'runs'], explain: 'Subject (The dog) before action (runs).' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'What goes at the END of a sentence?', options: ['Capital', 'Full stop', 'Number'], answer: 'Full stop', explain: 'A full stop ends a sentence.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Pick the correct sentence.', options: ['the dog ran', 'The dog ran.', 'The. dog ran'], answer: 'The dog ran.', explain: 'Capital + full stop in the right places.' },
    ],
  },
};

const E1_HFW = {
  id: 'e-y1-high-frequency-words',
  subject: 'english',
  outcomeCode: 'AC9E1LY03',
  yearLevel: '1',
  band: 1.3,
  title: 'High-frequency words',
  strand: 'Literacy',
  prerequisites: [],
  teach: {
    intro: 'Some words pop up everywhere. We learn them by sight: the, was, said, you, my.',
    examples: [
      { show: 'the', label: 'Read it: "thuh"' },
      { show: 'said', label: 'Read it: "sed"' },
      { show: 'you', label: 'Read it: "yoo"' },
    ],
  },
  items: {
    practice: [
      // Cloze: the answer must fit the meaning of the sentence, so the
      // student is recognising the word in real reading - not just matching
      // letters from the prompt.
      { type: 'multiple-choice', prompt: 'Mum ___ , "Time for bed!"', options: ['said', 'sad', 'send'], answer: 'said', explain: '"Said" means spoke. Mum said the words "Time for bed!"' },
      { type: 'multiple-choice', prompt: 'I ___ to the park yesterday.', options: ['went', 'win', 'won'], answer: 'went', explain: '"Went" means already gone. Yesterday is in the past.' },
      { type: 'multiple-choice', prompt: 'This is ___ favourite book.', options: ['my', 'me', 'may'], answer: 'my', explain: '"My" shows it belongs to me.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'How are ___ today?', options: ['you', 'yes', 'yet'], answer: 'you', explain: '"How are you?" is what we ask people we meet.' },
      { type: 'multiple-choice', prompt: 'The cat ___ on the mat.', options: ['was', 'we', 'will'], answer: 'was', explain: '"Was" means it happened before now.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'I saw ___ dog run past.', options: ['this', 'the', 'they'], answer: 'the', explain: '"The dog" - we use "the" before a noun we know about.' },
    ],
  },
};

const E1_LIT = {
  id: 'e-y1-story-elements',
  subject: 'english',
  outcomeCode: 'AC9E1LIT01',
  yearLevel: '1',
  band: 1.0,
  title: 'Stories: characters & events',
  strand: 'Literature',
  prerequisites: [],
  teach: {
    intro: 'Stories have characters (who) and events (what happens).',
    examples: [
      { show: 'A puppy lost its ball. It looked everywhere. It found the ball under the bed.', label: 'Character: puppy. Events: lost ball, looked, found.' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'In the story, who is the main character?', options: ['the bed', 'the puppy', 'the ball'], answer: 'the puppy', explain: 'The puppy is the one doing things in the story.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'What did the puppy lose?', options: ['its bone', 'its ball', 'its bed'], answer: 'its ball', explain: 'The puppy lost the ball.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Where did the puppy find the ball?', options: ['under the bed', 'on the roof', 'in the car'], answer: 'under the bed', explain: 'Under the bed.' },
    ],
  },
};

// Year 2 above-level
const E2_COMPOUND = {
  id: 'e-y2-compound-sentences',
  subject: 'english',
  outcomeCode: 'AC9E2LA03',
  yearLevel: '2',
  band: 2.1,
  title: 'Compound sentences',
  strand: 'Language',
  prerequisites: ['AC9E1LA03'],
  teach: {
    intro: 'We can join two ideas with "and", "but" or "because".',
    examples: [
      { show: 'I like dogs and I like cats.', label: 'Joined with "and".' },
      { show: 'I was tired but I kept trying.', label: 'Joined with "but".' },
    ],
  },
  items: {
    practice: [
      { type: 'multiple-choice', prompt: 'Pick the word that joins: "I went home ___ I was hungry."', options: ['and', 'because', 'but'], answer: 'because', explain: '"Because" gives a reason.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Pick the joiner: "I tried ___ I missed the goal."', options: ['and', 'but', 'because'], answer: 'but', explain: '"But" shows contrast.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which joins ideas?', options: ['and', 'apple', 'an'], answer: 'and', explain: '"And" joins ideas.' },
    ],
  },
};

module.exports = [E_F_PHONICS, E1_BLEND, E1_DIGRAPHS, E1_SENTENCE, E1_HFW, E1_LIT, E2_COMPOUND];
