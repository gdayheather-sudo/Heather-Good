/**
 * ACARA v9.0 English outcomes (Foundation - Year 3).
 * Strand keys: LA (Language), LIT (Literature), LY (Literacy).
 */

module.exports = {
  name: 'English',
  years: {
    F: {
      strands: ['Language', 'Literature', 'Literacy'],
      outcomes: [
        { code: 'AC9EFLA01', strand: 'Language', desc: 'Recognise that letters represent sounds; identify rhyme and onset.', band: 0.4 },
        { code: 'AC9EFLY02', strand: 'Literacy', desc: 'Identify and produce most letter-sound correspondences (single letters).', band: 0.5 },
        { code: 'AC9EFLY03', strand: 'Literacy', desc: 'Blend and segment phonemes in CVC words.', band: 0.6 },
        { code: 'AC9EFLY05', strand: 'Literacy', desc: 'Read short decodable texts with familiar words.', band: 0.7 },
      ],
    },
    1: {
      strands: ['Language', 'Literature', 'Literacy'],
      outcomes: [
        { code: 'AC9E1LA01', strand: 'Language', desc: 'Understand that words and pictures combine to make meaning.', band: 1.0 },
        { code: 'AC9E1LA03', strand: 'Language', desc: 'Recognise and use simple sentence structures with capital letters and full stops.', band: 1.1 },
        { code: 'AC9E1LIT01', strand: 'Literature', desc: 'Discuss favourite stories, characters and events.', band: 1.0 },
        { code: 'AC9E1LY02', strand: 'Literacy', desc: 'Apply phonological knowledge: blend short vowels and digraphs (sh, ch, th).', band: 1.2 },
        { code: 'AC9E1LY03', strand: 'Literacy', desc: 'Read decodable texts with two-syllable words and high-frequency words.', band: 1.3 },
        { code: 'AC9E1LY04', strand: 'Literacy', desc: 'Spell single-syllable words with consonant blends and common digraphs.', band: 1.4 },
        { code: 'AC9E1LY05', strand: 'Literacy', desc: 'Create short imaginative and informative texts using sentence patterns.', band: 1.5 },
      ],
    },
    2: {
      strands: ['Language', 'Literature', 'Literacy'],
      outcomes: [
        { code: 'AC9E2LA03', strand: 'Language', desc: 'Recognise and use compound sentences and conjunctions (and, but, because).', band: 2.1 },
        { code: 'AC9E2LIT02', strand: 'Literature', desc: 'Discuss how characters and events convey messages.', band: 2.2 },
        { code: 'AC9E2LY02', strand: 'Literacy', desc: 'Read texts with multisyllabic words; use morphology (prefixes, suffixes).', band: 2.3 },
        { code: 'AC9E2LY04', strand: 'Literacy', desc: 'Spell using common letter patterns including vowel digraphs and split digraphs.', band: 2.4 },
        { code: 'AC9E2LY05', strand: 'Literacy', desc: 'Create texts with a clear beginning, middle and end.', band: 2.5 },
      ],
    },
    3: {
      strands: ['Language', 'Literature', 'Literacy'],
      outcomes: [
        { code: 'AC9E3LA03', strand: 'Language', desc: 'Use complex sentences with subordinating conjunctions.', band: 3.2 },
        { code: 'AC9E3LY03', strand: 'Literacy', desc: 'Read fluently with comprehension; identify literal and inferred meaning.', band: 3.4 },
        { code: 'AC9E3LY04', strand: 'Literacy', desc: 'Spell using less common letter patterns and homophones.', band: 3.5 },
      ],
    },
  },
};
