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
    // Whole-word `say` values work much better with synthetic voices. For
    // true phoneme audio (sss, aaa, tuh), drop in recorded audio files
    // via the `audio` field below.
    say: 'Letters make sounds. Sounds blend together to make words. Listen to these words: snake, apple, tap.',
    examples: [
      { show: 's', say: 'snake', label: 'sssss (snake)' /* audio: '/audio/sound-s.mp3' */ },
      { show: 'a', say: 'apple', label: 'aaaa (apple)' },
      { show: 't', say: 'tap',   label: 't (tap)' },
    ],
  },
  items: {
    // Picture-based prompts: the answer letter is NOT shown in the
    // prompt text. The student must recognise the picture, know how
    // the word starts, and pick the matching letter.
    practice: [
      { type: 'multiple-choice', prompt: 'Which letter is at the start of this word?', picture: '🌙', say: 'Which letter is at the start of the word moon?', options: ['m', 's', 'p'], answer: 'm', explain: 'Moon starts with the letter m.' },
      { type: 'multiple-choice', prompt: 'Which word starts with the same first sound?', picture: '☀️', say: 'Which word starts with the same first sound as sun?', options: ['cat', 'sock', 'dog'], answer: 'sock', explain: 'Sun and sock both start with the letter s.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Which letter is at the start of this word?', picture: '🐅', say: 'Which letter is at the start of the word tiger?', options: ['t', 'd', 'p'], answer: 't', explain: 'Tiger starts with the letter t.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Which word starts with the same first sound?', picture: '🍎', say: 'Which word starts with the same first sound as apple?', options: ['ant', 'bat'], answer: 'ant', explain: 'Apple and ant both start with the letter a.' },
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
    // Synthetic voices can't say isolated phonemes well, so the spoken
    // narrative uses whole words. The visual "d-o-g" segmentation does
    // the phonics work on screen. Add an `audio` URL on any example
    // (e.g. recorded by the mentor) to play that instead of TTS.
    say: 'When we blend sounds together, they make a word. Listen to these words: dog, pig, sun.',
    examples: [
      { show: 'd-o-g', say: 'dog', label: 'dog' /* audio: '/audio/dog.mp3' */ },
      { show: 'p-i-g', say: 'pig', label: 'pig' },
      { show: 's-u-n', say: 'sun', label: 'sun' },
    ],
  },
  items: {
    practice: [
      { type: 'blend', prompt: 'Blend these sounds: c - a - t', say: 'Which word do these sounds make?', options: ['cat', 'cap', 'can'], answer: 'cat', explain: 'c, a, t blends to make cat.' },
      { type: 'blend', prompt: 'Blend these sounds: m - a - p', say: 'Which word do these sounds make?', options: ['mat', 'man', 'map'], answer: 'map', explain: 'm, a, p blends to make map.' },
    ],
    retrieval: [
      { type: 'blend', prompt: 'Blend: h - o - p', say: 'Which word do these sounds make?', options: ['hot', 'hop', 'hip'], answer: 'hop', explain: 'h, o, p blends to make hop.' },
      { type: 'multiple-choice', prompt: 'Which word has the same first sound as "fish"?', say: 'Which word starts with the same sound as fish?', options: ['fox', 'sun', 'cat'], answer: 'fox', explain: 'Fox and fish both start with the same sound.' },
    ],
    review: [
      { type: 'blend', prompt: 'Blend: b - i - g', say: 'Which word do these sounds make?', options: ['bag', 'big', 'bog'], answer: 'big', explain: 'b, i, g blends to make big.' },
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
    // Picture-based cue words. The visible prompt asks the learner to
    // listen, the spoken question names the cue word ("shoe", "watch",
    // "thumb"), and the picture provides a non-text alternative for
    // students who don't have audio enabled. The answer letter is no
    // longer visible in the prompt.
    practice: [
      { type: 'multiple-choice', prompt: 'Listen to the question. Which word starts with the same first sound?', picture: '👟', say: 'Which word starts with the same first sound as shoe?', options: ['ship', 'chip', 'tip'], answer: 'ship', explain: 'Shoe and ship both start with the sh sound.' },
      { type: 'multiple-choice', prompt: 'Listen to the question. Which word ends with the same sound?',         picture: '⌚', say: 'Which word ends with the same sound as watch?', options: ['fish', 'rich', 'wish'], answer: 'rich', explain: 'Watch and rich both end with the ch sound.' },
    ],
    retrieval: [
      { type: 'multiple-choice', prompt: 'Listen to the question. Which word starts with the same first sound?', picture: '👍', say: 'Which word starts with the same first sound as thumb?', options: ['then', 'pen', 'sent'], answer: 'then', explain: 'Thumb and then both start with the th sound.' },
    ],
    review: [
      { type: 'multiple-choice', prompt: 'Listen to the question. Which word starts with the same first sound?', picture: '🦈', say: 'Which word starts with the same first sound as shark?', options: ['shoe', 'see'], answer: 'shoe', explain: 'Shark and shoe both start with the sh sound.' },
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
      { show: 'The dog runs.', say: 'The dog runs. It starts with a capital letter and ends with a full stop.', label: 'Capital "T" and full stop "."' },
      { show: 'Mia plays.',    say: 'Mia plays. It starts with a capital letter and ends with a full stop.',    label: 'Capital "M" and full stop "."' },
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
    // The visible "thuh"/"sed"/"yoo" guides help a sighted reader, but
    // TTS reads them literally and sounds terrible. `say` overrides
    // make Listen pronounce the actual word instead.
    say: 'Some words pop up everywhere. We learn them by sight. Listen to these words: the. was. said. you. my.',
    examples: [
      { show: 'the',  say: 'the',  label: 'Sounds like "thuh"' },
      { show: 'said', say: 'said', label: 'Sounds like "sed"'  },
      { show: 'you',  say: 'you',  label: 'Sounds like "yoo"'  },
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
      { show: 'I like dogs and I like cats.',  say: 'I like dogs and I like cats. The word and joins the two parts.',  label: 'Joined with "and".' },
      { show: 'I was tired but I kept trying.', say: 'I was tired but I kept trying. The word but joins the two parts.', label: 'Joined with "but".' },
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
