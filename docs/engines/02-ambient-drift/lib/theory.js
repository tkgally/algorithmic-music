/*
 * theory — notes, intervals, scales, chords, keys, and tuning tables for
 * generative music engines.
 *
 * Part of the algorithmic-music project's first-party shared-library
 * foundation (see wiki/shared-libraries.md), the third foundation module
 * after rng.js and transport.js. Original code. It *reimplements* published,
 * public-domain theory (interval/scale/chord construction is centuries-old
 * common knowledge; the tonal-hierarchy numbers and cents tables are cited
 * data transcribed from wiki/tuning-and-scales.md and wiki/harmony.md, which
 * in turn cite their sources) — it copies no other project's source. Its
 * interval/scale/chord math was cross-checked at dev time against Tonal
 * (@tonaljs/tonal) as an oracle per the "oracle practice" open question in
 * wiki/shared-libraries.md; Tonal is not a runtime or repo dependency —
 * only its *outputs* were compared against this file's, never its code.
 *
 * Pure data + pure functions (no Web Audio, no globals, no Math.random) —
 * unit-testable headless in Node, deterministic in an engine.
 *
 * Dual-format (UMD-lite), same rationale as rng.js/transport.js:
 *   - Node/dev:  const theory = require('./theory.js');
 *   - Browser:   <script src="theory.js"></script>  ->  window.AM.theory.*
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.theory = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Note names <-> MIDI --------------------------------------------------
  // Scientific pitch notation: C4 = MIDI 60 ("middle C"), A4 = MIDI 69 = 440 Hz.
  // MIDI = (octave + 1) * 12 + pitchClass, so C-1 = MIDI 0.
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const PC_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const PC_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const NOTE_RE = /^([A-Ga-g])(#+|b+|x)?(-?\d+)$/;

  /** Parse "C4", "F#3", "Bb5", "Cx2" (double sharp) -> MIDI integer. Throws on malformed input. */
  function noteToMidi(name) {
    const m = NOTE_RE.exec(String(name).trim());
    if (!m) throw new Error(`theory.noteToMidi: not a note name: "${name}"`);
    const letter = m[1].toUpperCase();
    const accidental = m[2] || '';
    const octave = parseInt(m[3], 10);
    let acc = 0;
    if (accidental === 'x') acc = 2;
    else if (accidental[0] === '#') acc = accidental.length;
    else if (accidental[0] === 'b') acc = -accidental.length;
    return (octave + 1) * 12 + LETTER_PC[letter] + acc;
  }

  /** MIDI integer -> note name, e.g. 61 -> "C#4" (or "Db4" with {prefer:'flat'}). */
  function midiToNoteName(midi, { prefer = 'sharp' } = {}) {
    const m = Math.round(midi);
    const pc = ((m % 12) + 12) % 12;
    const octave = Math.floor(m / 12) - 1;
    const names = prefer === 'flat' ? PC_NAMES_FLAT : PC_NAMES_SHARP;
    return `${names[pc]}${octave}`;
  }

  /** Pitch class 0-11 of a MIDI number OR a note-name string. */
  function pitchClass(x) {
    const m = typeof x === 'string' ? noteToMidi(x) : x;
    return ((Math.round(m) % 12) + 12) % 12;
  }

  /** MIDI note -> frequency in Hz, 12-TET, A4 (MIDI 69) = 440 Hz. */
  function midiToFreq(midi, a4 = 440) {
    return a4 * Math.pow(2, (midi - 69) / 12);
  }

  function transpose(midi, semitones) { return midi + semitones; }

  // ---- Intervals -------------------------------------------------------------
  // Simple (size-only) interval names by semitone count, 0-12. This is a
  // generic size label, not letter-based spelling (it cannot distinguish an
  // augmented 4th from a diminished 5th — both are semitone 6, "TT" here —
  // because that distinction depends on the note letters involved, not just
  // the semitone distance). Sufficient for chord/scale-interval logic; not a
  // notation-accurate spelling engine.
  const INTERVAL_NAMES = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
  const INTERVAL_SEMITONES = INTERVAL_NAMES.reduce((acc, name, i) => (acc[name] = i, acc), {});

  /** Signed semitone distance from a to b (MIDI numbers or note names). */
  function semitones(a, b) {
    const ma = typeof a === 'string' ? noteToMidi(a) : a;
    const mb = typeof b === 'string' ? noteToMidi(b) : b;
    return mb - ma;
  }

  /** Generic size-only interval name for a semitone count (compound intervals reduce mod 12, octave count reported separately). */
  function intervalName(semis) {
    const n = Math.round(semis);
    const octaves = Math.floor(n / 12);
    const simple = ((n % 12) + 12) % 12;
    return { name: INTERVAL_NAMES[simple], octaves, semitones: n };
  }

  function transposeByInterval(midi, name) {
    if (!(name in INTERVAL_SEMITONES)) throw new Error(`theory.transposeByInterval: unknown interval "${name}"`);
    return midi + INTERVAL_SEMITONES[name];
  }

  // ---- Scales (12-TET, semitone patterns from the tonic) ---------------------
  // Sourced from wiki/tuning-and-scales.md and wiki/harmony.md. The "in" scale
  // (Japanese, semitone-flavored) is included because tuning-and-scales.md
  // gives it a precise degree spelling with a citation; the "yo" scale is
  // deliberately omitted — that page flags its degree spelling as uncertain
  // (the cited source names it only as a contrast, without spelling out
  // degrees), and conventions.md forbids stating unverified specifics as fact.
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11], // ascending form
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    inScale: [0, 1, 5, 7, 8], // Japanese miyako-bushi/in scale (wiki/tuning-and-scales.md)
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };

  /** MIDI notes of `scaleName` built on `tonicMidi`, ascending, spanning `octaves` (default 1) octaves. */
  function scale(tonicMidi, scaleName, { octaves = 1 } = {}) {
    const pattern = SCALES[scaleName];
    if (!pattern) throw new Error(`theory.scale: unknown scale "${scaleName}"`);
    const out = [];
    for (let o = 0; o < octaves; o++) {
      for (const step of pattern) out.push(tonicMidi + o * 12 + step);
    }
    return out;
  }

  /** The MIDI note for `degree` (1-based; may exceed the scale length, wrapping into higher octaves). */
  function scaleDegree(tonicMidi, scaleName, degree) {
    const pattern = SCALES[scaleName];
    if (!pattern) throw new Error(`theory.scaleDegree: unknown scale "${scaleName}"`);
    const len = pattern.length;
    const idx = degree - 1;
    const octaveOffset = Math.floor(idx / len);
    const step = pattern[((idx % len) + len) % len];
    return tonicMidi + octaveOffset * 12 + step;
  }

  // ---- Tonal hierarchy (Krumhansl & Kessler 1982) -----------------------------
  // Probe-tone ratings, tonic-first, transcribed from wiki/tuning-and-scales.md
  // (itself sourced via the rnhart.net key-finding article). Index 0 = tonic
  // pitch class, index i = pitch class i semitones above the tonic.
  const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  /** Krumhansl-Kessler stability weight of pitch class `pc` relative to a tonic pitch class, in 'major' or 'minor'. */
  function stability(pc, tonicPc, mode = 'major') {
    const profile = mode === 'minor' ? KRUMHANSL_MINOR : KRUMHANSL_MAJOR;
    const rel = ((pc - tonicPc) % 12 + 12) % 12;
    return profile[rel];
  }

  // ---- Chords: generic tertian stacking over a 7-note scale -------------------
  // Works for any 7-tone scale by counting diatonic thirds (2 scale steps per
  // stack), then classifying the resulting semitone intervals. This is how
  // "iii" in natural minor is major (a byproduct of the scale), how harmonic
  // minor's bIII becomes augmented, etc. — quality falls out of the scale, it
  // is not hand-listed per scale.
  const ROMAN_BASE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  function triadQuality(third, fifth) {
    if (third === 4 && fifth === 7) return 'major';
    if (third === 3 && fifth === 7) return 'minor';
    if (third === 3 && fifth === 6) return 'diminished';
    if (third === 4 && fifth === 8) return 'augmented';
    return 'other';
  }

  function seventhQuality(third, fifth, seventh) {
    if (third === 4 && fifth === 7 && seventh === 11) return 'maj7';
    if (third === 4 && fifth === 7 && seventh === 10) return '7'; // dominant
    if (third === 3 && fifth === 7 && seventh === 10) return 'min7';
    if (third === 3 && fifth === 6 && seventh === 10) return 'm7b5'; // half-diminished
    if (third === 3 && fifth === 6 && seventh === 9) return 'dim7';
    if (third === 3 && fifth === 7 && seventh === 11) return 'mMaj7';
    if (third === 4 && fifth === 8 && seventh === 11) return 'augMaj7';
    return 'other';
  }

  function romanNumeral(degree, quality) {
    let base = ROMAN_BASE[degree - 1];
    if (quality === 'minor' || quality === 'diminished') base = base.toLowerCase();
    if (quality === 'diminished') base += '°'; // °
    if (quality === 'augmented') base += '+';
    return base;
  }

  /** Diatonic triad on scale degree `degree` (1-7) of `scaleName` built on `tonicMidi`. */
  function triad(tonicMidi, scaleName, degree) {
    const notes = scale(tonicMidi, scaleName, { octaves: 2 });
    const root = notes[degree - 1], third = notes[degree + 1], fifth = notes[degree + 3];
    const quality = triadQuality(third - root, fifth - root);
    return { degree, root, notes: [root, third, fifth], quality, roman: romanNumeral(degree, quality) };
  }

  /** Diatonic seventh chord on scale degree `degree` (1-7) of `scaleName` built on `tonicMidi`. */
  function seventh(tonicMidi, scaleName, degree) {
    const notes = scale(tonicMidi, scaleName, { octaves: 2 });
    const root = notes[degree - 1], third = notes[degree + 1], fifth = notes[degree + 3], sev = notes[degree + 5];
    const tq = triadQuality(third - root, fifth - root);
    const sq = seventhQuality(third - root, fifth - root, sev - root);
    return { degree, root, notes: [root, third, fifth, sev], quality: sq, roman: romanNumeral(degree, tq) };
  }

  // Functional-harmony category (T=tonic, S=subdominant/pre-dominant, D=dominant)
  // per wiki/harmony.md's three-category syntax, indexed by scale degree (1-7).
  // Matches the common convention (also used by Tonal's chordsHarmonicFunction,
  // consulted as a cross-check): iii and vi both read as tonic substitutes.
  // Minor-key functions are for the natural-minor scale; its v is a weak
  // (minor-quality) dominant — harmonicMinor's V (major, leading-tone-bearing)
  // is the conventional stronger substitute (see wiki/harmony.md), available
  // via diatonicChords(tonic, 'harmonicMinor').
  const FUNCTION_MAJOR = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
  const FUNCTION_NATURAL_MINOR = ['T', 'S', 'T', 'S', 'D', 'S', 'S'];

  /** All 7 diatonic triads + sevenths of a scale, with roman numerals and (major/naturalMinor only) T/S/D function. */
  function diatonicChords(tonicMidi, scaleName) {
    const pattern = SCALES[scaleName];
    if (!pattern || pattern.length !== 7) throw new Error(`theory.diatonicChords: needs a 7-note scale, got "${scaleName}"`);
    const fn = scaleName === 'major' ? FUNCTION_MAJOR : scaleName === 'naturalMinor' ? FUNCTION_NATURAL_MINOR : null;
    const out = [];
    for (let d = 1; d <= 7; d++) {
      const t = triad(tonicMidi, scaleName, d);
      const s7 = seventh(tonicMidi, scaleName, d);
      out.push({ degree: d, roman: t.roman, quality: t.quality, notes: t.notes, seventhNotes: s7.notes, seventhQuality: s7.quality, function: fn ? fn[d - 1] : null });
    }
    return out;
  }

  // ---- Root-motion priors (wiki/harmony.md "usable numbers") ------------------
  // Piston's "Table of Usual Root Progressions" (Harmony, 1941; rev. DeVoto
  // 1987), transcribed from wiki/harmony.md, tiered usually/sometimes/less-often
  // and weighted 0.6/0.3/0.1 per that page's recommendation (split evenly
  // within a tier). Weights need not sum to 1 — pass items/weights straight to
  // an rng.weighted()-style picker, which normalizes by their total.
  const PISTON_MAJOR_TRANSITIONS = {
    I: { usually: ['IV', 'V'], sometimes: ['vi'], lessOften: ['ii', 'iii'] },
    ii: { usually: ['V'], sometimes: ['vi'], lessOften: ['I', 'iii', 'IV'] },
    iii: { usually: ['vi'], sometimes: ['IV'], lessOften: ['ii', 'V'] },
    IV: { usually: ['V'], sometimes: ['I', 'ii'], lessOften: ['iii', 'vi'] },
    V: { usually: ['I'], sometimes: ['vi', 'IV'], lessOften: ['iii', 'ii'] },
    vi: { usually: ['ii', 'V'], sometimes: ['iii', 'IV'], lessOften: ['I'] },
    'vii°': { usually: ['iii', 'I'], sometimes: [], lessOften: [] },
  };
  const PISTON_TIER_WEIGHTS = { usually: 0.6, sometimes: 0.3, lessOften: 0.1 };

  /** Flatten PISTON_MAJOR_TRANSITIONS[roman] into {items, weights} for a weighted picker (e.g. rng.weighted(items, weights)). */
  function pistonSuccessors(roman) {
    const row = PISTON_MAJOR_TRANSITIONS[roman];
    if (!row) throw new Error(`theory.pistonSuccessors: no Piston row for "${roman}"`);
    const items = [], weights = [];
    for (const tier of ['usually', 'sometimes', 'lessOften']) {
      const chords = row[tier];
      if (!chords.length) continue;
      const w = PISTON_TIER_WEIGHTS[tier] / chords.length;
      for (const c of chords) { items.push(c); weights.push(w); }
    }
    return { items, weights };
  }

  // de Clercq & Temperley (2011) rock-corpus root priors, transcribed from
  // wiki/harmony.md ("Usable numbers"). Overall = share of all chords;
  // preTonic = share of the slot immediately before a tonic (excl. I itself).
  const ROCK_CHORD_PRIORS = { I: 0.33, IV: 0.23, V: 0.16, bVII: 0.08, vi: 0.07 };
  const ROCK_PRETONIC_PRIORS = { IV: 0.40, V: 0.27, bVII: 0.13 };

  // ---- Cents-based tuning tables (non-12-TET systems) -------------------------
  // From wiki/tuning-and-scales.md "Concrete tables to ship". These are NOT
  // 12-TET semitone patterns; they are cents-from-root and use freqFromCents
  // (or freqFromRatio for the JI table), not the `scale()`/MIDI machinery
  // above. Some are explicitly one ensemble/tradition's flavor, not a
  // universal standard (gamelan tuning belongs to the ensemble; no two share
  // exact tuning) — see the cited page for caveats before using in an engine.
  const CENTS_SCALES = {
    slendro: [0, 240, 480, 720, 960], // Javanese/Balinese, ~5 roughly equal steps
    pelogLikeExample: [0, 120, 270, 540, 670, 785, 950], // one ensemble's flavor, not a standard
    rastLike: [0, 200, 350, 500, 700, 900, 1050], // maqam Rast approximation
    inScaleCents: [0, 100, 500, 700, 800], // Japanese in/miyako-bushi, cents form of SCALES.inScale
  };
  const JI_MAJOR_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8]; // just-intonation major scale, as ratios

  function freqFromCents(rootFreq, cents) { return rootFreq * Math.pow(2, cents / 1200); }
  function freqFromRatio(rootFreq, ratio) { return rootFreq * ratio; }

  return {
    // notes
    noteToMidi, midiToNoteName, pitchClass, midiToFreq, transpose,
    PC_NAMES_SHARP, PC_NAMES_FLAT,
    // intervals
    semitones, intervalName, transposeByInterval, INTERVAL_NAMES, INTERVAL_SEMITONES,
    // scales
    SCALES, scale, scaleDegree,
    // tonal hierarchy
    KRUMHANSL_MAJOR, KRUMHANSL_MINOR, stability,
    // chords & keys
    triad, seventh, diatonicChords, FUNCTION_MAJOR, FUNCTION_NATURAL_MINOR,
    // root-motion priors
    PISTON_MAJOR_TRANSITIONS, pistonSuccessors, ROCK_CHORD_PRIORS, ROCK_PRETONIC_PRIORS,
    // cents-based tuning
    CENTS_SCALES, JI_MAJOR_RATIOS, freqFromCents, freqFromRatio,
  };
});
