/* Headless tests for lib/theory.js */
'use strict';
const { test, eq, ok, approx } = require('./_runner');
const theory = require('../lib/theory.js');

// ---- Note names <-> MIDI ---------------------------------------------------

test('theory: noteToMidi matches scientific-pitch-notation convention (C4=60, A4=69, C-1=0)', () => {
  eq(theory.noteToMidi('C4'), 60);
  eq(theory.noteToMidi('A4'), 69);
  eq(theory.noteToMidi('C-1'), 0);
  eq(theory.noteToMidi('C5'), 72);
});

test('theory: noteToMidi handles sharps, flats, double sharp, lowercase letters', () => {
  eq(theory.noteToMidi('C#4'), 61);
  eq(theory.noteToMidi('c#4'), 61, 'letter case should not matter');
  eq(theory.noteToMidi('Db4'), 61);
  eq(theory.noteToMidi('Bb3'), 58);
  eq(theory.noteToMidi('Cx4'), 62, 'double sharp = +2 semitones');
  eq(theory.noteToMidi('Fbb4'), 63, 'double flat = -2 semitones');
});

test('theory: midiToNoteName round-trips and respects prefer:flat', () => {
  eq(theory.midiToNoteName(60), 'C4');
  eq(theory.midiToNoteName(61), 'C#4');
  eq(theory.midiToNoteName(61, { prefer: 'flat' }), 'Db4');
  eq(theory.midiToNoteName(theory.noteToMidi('G#3')), 'G#3');
});

test('theory: pitchClass accepts both note names and MIDI numbers', () => {
  eq(theory.pitchClass('C4'), 0);
  eq(theory.pitchClass('C5'), 0);
  eq(theory.pitchClass(61), 1);
  eq(theory.pitchClass('D#2'), 3);
});

test('theory: midiToFreq matches A440 standard', () => {
  approx(theory.midiToFreq(69), 440, 1e-9);
  approx(theory.midiToFreq(60), 261.6255653005986, 1e-6, 'C4 frequency');
  approx(theory.midiToFreq(81), 880, 1e-9, 'A5 is one octave above A4');
});

// ---- Intervals --------------------------------------------------------------

test('theory: semitones is signed distance, note names or MIDI', () => {
  eq(theory.semitones('C4', 'E4'), 4);
  eq(theory.semitones('E4', 'C4'), -4);
  eq(theory.semitones(60, 67), 7);
});

test('theory: intervalName gives standard size-only names and reduces compounds', () => {
  eq(theory.intervalName(0).name, 'P1');
  eq(theory.intervalName(4).name, 'M3');
  eq(theory.intervalName(7).name, 'P5');
  eq(theory.intervalName(6).name, 'TT');
  eq(theory.intervalName(12).name, 'P1', 'an octave reduces to the simple unison name; octaves:1 carries the octave count');
  eq(theory.intervalName(12).octaves, 1);
  const tenth = theory.intervalName(16); // major 10th = octave + major 3rd
  eq(tenth.name, 'M3');
  eq(tenth.octaves, 1);
});

test('theory: transposeByInterval matches transpose(midi, semitones)', () => {
  eq(theory.transposeByInterval(60, 'M3'), theory.transpose(60, 4));
  eq(theory.transposeByInterval(60, 'P5'), 67);
});

// ---- Scales -------------------------------------------------------------------
// Cross-checked at dev time against Tonal (@tonaljs/tonal) Scale.get(...).notes,
// converted to pitch classes relative to C, for every scale in SCALES.

test('theory: scale() produces the documented pattern for every SCALES entry', () => {
  const expected = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    inScale: [0, 1, 5, 7, 8],
    wholeTone: [0, 2, 4, 6, 8, 10],
  };
  for (const [name, pattern] of Object.entries(expected)) {
    const notes = theory.scale(60, name);
    eq(notes.map((m) => m - 60), pattern, `scale ${name}`);
  }
});

test('theory: scale() with octaves>1 tiles the pattern', () => {
  const two = theory.scale(60, 'majorPentatonic', { octaves: 2 });
  eq(two.length, 10);
  eq(two[5] - two[0], 12, 'second octave starts 12 semitones above the first');
});

test('theory: scaleDegree is 1-based and wraps into higher octaves past the scale length', () => {
  eq(theory.scaleDegree(60, 'major', 1), 60);
  eq(theory.scaleDegree(60, 'major', 5), 67); // G4
  eq(theory.scaleDegree(60, 'major', 8), 72); // octave above tonic
  eq(theory.scaleDegree(60, 'major', 9), 74); // D5, second degree one octave up
});

// ---- Tonal hierarchy ----------------------------------------------------------

test('theory: Krumhansl profiles match wiki/tuning-and-scales.md verbatim', () => {
  eq(theory.KRUMHANSL_MAJOR, [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]);
  eq(theory.KRUMHANSL_MINOR, [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]);
});

test('theory: stability() is tonic-relative and the tonic is always most stable in each mode', () => {
  eq(theory.stability(0, 0, 'major'), 6.35);
  eq(theory.stability(7, 0, 'major'), 5.19, 'perfect fifth above tonic, major');
  eq(theory.stability(2, 2, 'major'), 6.35, 'stability tracks relative pc, not absolute pc');
  const majorProfile = theory.KRUMHANSL_MAJOR.slice();
  ok(Math.max(...majorProfile) === majorProfile[0], 'tonic (index 0) is the peak of the major profile');
  const minorProfile = theory.KRUMHANSL_MINOR.slice();
  ok(Math.max(...minorProfile) === minorProfile[0], 'tonic (index 0) is the peak of the minor profile');
});

// ---- Chords & keys --------------------------------------------------------------
// Cross-checked at dev time against Tonal's Key.majorKey('C') / Key.minorKey('A')
// .natural triads, chords (sevenths), and chordsHarmonicFunction (SD relabeled S
// to match wiki/harmony.md's T/S/D terminology).

test('theory: diatonicChords(C major) matches Tonal Key.majorKey(C) triads/qualities/roman numerals', () => {
  const chords = theory.diatonicChords(60, 'major');
  const expectedRoman = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const expectedQuality = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
  eq(chords.map((c) => c.roman), expectedRoman);
  eq(chords.map((c) => c.quality), expectedQuality);
});

test('theory: diatonicChords(C major) sevenths match Tonal (maj7,m7,m7,maj7,7,m7,m7b5)', () => {
  const chords = theory.diatonicChords(60, 'major');
  eq(chords.map((c) => c.seventhQuality), ['maj7', 'min7', 'min7', 'maj7', '7', 'min7', 'm7b5']);
});

test('theory: diatonicChords(C major) function labels match harmony.md T/S/D categories', () => {
  const chords = theory.diatonicChords(60, 'major');
  eq(chords.map((c) => c.function), ['T', 'S', 'T', 'S', 'D', 'T', 'D']);
});

test('theory: diatonicChords(A natural minor) matches Tonal Key.minorKey(A).natural', () => {
  // Tonal: triads [Am,Bdim,C,Dm,Em,F,G]; chords (sevenths) [Am7,Bm7b5,Cmaj7,Dm7,Em7,Fmaj7,G7]
  const chords = theory.diatonicChords(theory.noteToMidi('A3'), 'naturalMinor');
  eq(chords.map((c) => c.quality), ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major']);
  eq(chords.map((c) => c.seventhQuality), ['min7', 'm7b5', 'maj7', 'min7', 'min7', 'maj7', '7']);
  eq(chords.map((c) => c.function), ['T', 'S', 'T', 'S', 'D', 'S', 'S'], 'SD relabeled S vs Tonal chordsHarmonicFunction');
});

test('theory: triad() and seventh() notes are correct absolute MIDI', () => {
  const t = theory.triad(60, 'major', 5); // V in C major = G4 B4 D5
  eq(t.notes, [67, 71, 74]);
  const s = theory.seventh(60, 'major', 5); // V7 = G4 B4 D5 F5
  eq(s.notes, [67, 71, 74, 77]);
  eq(s.quality, '7');
});

test('theory: harmonic minor produces an augmented III (a byproduct of the raised 7th)', () => {
  const chords = theory.diatonicChords(60, 'harmonicMinor');
  eq(chords[2].quality, 'augmented', 'III+ in harmonic minor');
  eq(chords[2].roman, 'III+');
});

// ---- Root-motion priors -----------------------------------------------------

test('theory: pistonSuccessors flattens the harmony.md Piston table with 0.6/0.3/0.1 tier weights', () => {
  const { items, weights } = theory.pistonSuccessors('I');
  eq(items, ['IV', 'V', 'vi', 'ii', 'iii']);
  approx(weights[0], 0.3); approx(weights[1], 0.3); // usually: 0.6 / 2
  approx(weights[2], 0.3); // sometimes: 0.3 / 1
  approx(weights[3], 0.05); approx(weights[4], 0.05); // lessOften: 0.1 / 2
});

test('theory: pistonSuccessors handles a single-tier row (vii°) without empty-tier NaNs', () => {
  const { items, weights } = theory.pistonSuccessors('vii°');
  eq(items, ['iii', 'I']);
  ok(weights.every((w) => Number.isFinite(w) && w > 0), 'all weights finite and positive');
});

test('theory: every roman numeral referenced in PISTON_MAJOR_TRANSITIONS values is also a valid row key or "I"/"vii°" family', () => {
  const rows = Object.keys(theory.PISTON_MAJOR_TRANSITIONS);
  for (const roman of rows) {
    const { items } = theory.pistonSuccessors(roman);
    for (const target of items) {
      ok(rows.includes(target), `Piston successor "${target}" (from ${roman}) should be a row key`);
    }
  }
});

test('theory: ROCK_CHORD_PRIORS and ROCK_PRETONIC_PRIORS match harmony.md numbers', () => {
  eq(theory.ROCK_CHORD_PRIORS, { I: 0.33, IV: 0.23, V: 0.16, bVII: 0.08, vi: 0.07 });
  eq(theory.ROCK_PRETONIC_PRIORS, { IV: 0.40, V: 0.27, bVII: 0.13 });
});

// ---- Cents-based tuning ------------------------------------------------------

test('theory: freqFromCents matches the 12-TET semitone formula at 100-cent steps', () => {
  const root = 220;
  approx(theory.freqFromCents(root, 1200), root * 2, 1e-9, 'one octave = 1200 cents = double frequency');
  approx(theory.freqFromCents(root, 700), root * Math.pow(2, 7 / 12), 1e-9, '700 cents ~ perfect fifth');
});

test('theory: freqFromRatio and JI_MAJOR_RATIOS reproduce the just-intonation intervals from wiki/tuning-and-scales.md', () => {
  const root = 261.6255653005986; // C4
  approx(theory.freqFromRatio(root, theory.JI_MAJOR_RATIOS[4]), root * 1.5, 1e-9, 'pure fifth 3:2');
  approx(theory.freqFromRatio(root, theory.JI_MAJOR_RATIOS[2]), root * 1.25, 1e-9, 'pure major third 5:4');
});

test('theory: CENTS_SCALES entries match the wiki/tuning-and-scales.md tables exactly', () => {
  eq(theory.CENTS_SCALES.slendro, [0, 240, 480, 720, 960]);
  eq(theory.CENTS_SCALES.rastLike, [0, 200, 350, 500, 700, 900, 1050]);
  eq(theory.CENTS_SCALES.inScaleCents, [0, 100, 500, 700, 800]);
  eq(theory.CENTS_SCALES.inScaleCents, theory.SCALES.inScale.map((s) => s * 100), 'cents form agrees with the semitone form');
});
