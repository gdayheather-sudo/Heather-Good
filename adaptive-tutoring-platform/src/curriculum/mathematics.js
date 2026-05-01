/**
 * ACARA v9.0 Mathematics outcomes (Foundation - Year 3).
 *
 * Achievement-standard descriptors are paraphrased for use in the platform;
 * the canonical wording lives at https://v9.australiancurriculum.edu.au/.
 *
 * Strand keys: N (Number), A (Algebra), M (Measurement),
 *              SP (Space), ST (Statistics), P (Probability).
 */

module.exports = {
  name: 'Mathematics',
  years: {
    F: {
      strands: ['Number', 'Algebra', 'Measurement', 'Space', 'Statistics'],
      outcomes: [
        { code: 'AC9MFN01', strand: 'Number', desc: 'Name, represent, and order numbers to at least 20.', band: 0.4 },
        { code: 'AC9MFN02', strand: 'Number', desc: 'Subitise small collections to 5.', band: 0.3 },
        { code: 'AC9MFN03', strand: 'Number', desc: 'Quantify and compare collections to 20.', band: 0.5 },
        { code: 'AC9MFN04', strand: 'Number', desc: 'Combine and separate small groups to model addition and subtraction.', band: 0.6 },
        { code: 'AC9MFM01', strand: 'Measurement', desc: 'Compare directly using length, capacity, mass.', band: 0.5 },
        { code: 'AC9MFSP01', strand: 'Space', desc: 'Sort and name 2D shapes and 3D objects.', band: 0.5 },
      ],
    },
    1: {
      strands: ['Number', 'Algebra', 'Measurement', 'Space', 'Statistics', 'Probability'],
      outcomes: [
        { code: 'AC9M1N01', strand: 'Number', desc: 'Recognise, represent and order numbers to at least 120.', band: 1.0 },
        { code: 'AC9M1N02', strand: 'Number', desc: 'Partition one- and two-digit numbers in different ways.', band: 1.1 },
        { code: 'AC9M1N03', strand: 'Number', desc: 'Quantify and compare collections to 120 using counting strategies.', band: 1.2 },
        { code: 'AC9M1N04', strand: 'Number', desc: 'Add and subtract numbers within 20 using part-part-whole.', band: 1.3 },
        { code: 'AC9M1N05', strand: 'Number', desc: 'Use mathematical modelling to solve simple word problems involving addition/subtraction.', band: 1.5 },
        { code: 'AC9M1A01', strand: 'Algebra', desc: 'Recognise, describe and create growing and repeating patterns.', band: 1.2 },
        { code: 'AC9M1M01', strand: 'Measurement', desc: 'Compare and order objects using uniform informal units of length, mass, capacity.', band: 1.1 },
        { code: 'AC9M1M02', strand: 'Measurement', desc: 'Tell time to the hour and half-hour.', band: 1.4 },
        { code: 'AC9M1SP01', strand: 'Space', desc: 'Make, compare and classify 2D shapes; describe 3D objects.', band: 1.0 },
        { code: 'AC9M1SP02', strand: 'Space', desc: 'Give and follow directions to familiar locations.', band: 1.2 },
        { code: 'AC9M1ST01', strand: 'Statistics', desc: 'Collect, sort and represent data with simple displays.', band: 1.3 },
        { code: 'AC9M1P01', strand: 'Probability', desc: 'Identify outcomes of familiar events as likely or unlikely.', band: 1.5 },
      ],
    },
    2: {
      strands: ['Number', 'Algebra', 'Measurement', 'Space', 'Statistics', 'Probability'],
      outcomes: [
        { code: 'AC9M2N01', strand: 'Number', desc: 'Read, represent and order two- and three-digit numbers.', band: 2.0 },
        { code: 'AC9M2N02', strand: 'Number', desc: 'Partition, rearrange and regroup two- and three-digit numbers.', band: 2.1 },
        { code: 'AC9M2N03', strand: 'Number', desc: 'Add and subtract using counting on, doubles, near-doubles, partitioning.', band: 2.3 },
        { code: 'AC9M2N04', strand: 'Number', desc: 'Recognise and describe halves, quarters and eighths.', band: 2.4 },
        { code: 'AC9M2A01', strand: 'Algebra', desc: 'Recognise, describe and create number patterns with addition.', band: 2.2 },
        { code: 'AC9M2M01', strand: 'Measurement', desc: 'Measure length using uniform informal units.', band: 2.1 },
        { code: 'AC9M2M02', strand: 'Measurement', desc: 'Tell time to the quarter-hour using analog and digital.', band: 2.3 },
        { code: 'AC9M2SP01', strand: 'Space', desc: 'Identify and describe features of 2D shapes and 3D objects.', band: 2.0 },
        { code: 'AC9M2ST01', strand: 'Statistics', desc: 'Acquire and record data; create simple displays.', band: 2.2 },
      ],
    },
    3: {
      strands: ['Number', 'Algebra', 'Measurement', 'Space', 'Statistics', 'Probability'],
      outcomes: [
        { code: 'AC9M3N01', strand: 'Number', desc: 'Recognise, represent and order natural numbers to at least 10 000.', band: 3.0 },
        { code: 'AC9M3N03', strand: 'Number', desc: 'Add and subtract two- and three-digit numbers using place-value.', band: 3.2 },
        { code: 'AC9M3N04', strand: 'Number', desc: 'Multiply and divide one-digit numbers using known facts.', band: 3.4 },
        { code: 'AC9M3N06', strand: 'Number', desc: 'Recognise and represent unit fractions including 1/2, 1/3, 1/4, 1/5, 1/10.', band: 3.5 },
        { code: 'AC9M3M02', strand: 'Measurement', desc: 'Recognise and use the relationship between formal units of length.', band: 3.3 },
      ],
    },
  },
};
