/*
 * tonal-phrase — a reference COMPOSER for the algorithmic-music project:
 * a phrase-first melody over a goal-directed, cadence-first harmonic
 * progression, worked end to end as one eight-bar parallel period.
 *
 * This is the worked answer to research questions R1 (phrase-first melody)
 * and R2 (goal-directed harmony) in wiki/project-open-questions.md. It is NOT
 * one of the shared foundation libraries (rng/transport/theory/synth/fx/
 * analysis); it is a Composer in the engine pipeline of
 * wiki/engine-architecture.md — engine-level code that CONSUMES the foundation
 * libraries. It exists so that the next session can start building real engines
 * from a validated composition algorithm and a concrete Note-event schema,
 * rather than an unassembled pile of primitives.
 *
 * What it implements (all grounded in the wiki, cited inline):
 *   - Planner: an 8-bar PARALLEL PERIOD — antecedent (4 bars, ends Half
 *     Cadence = the "question") + consequent (4 bars, restates the basic idea,
 *     ends Perfect Authentic Cadence = the "answer"). wiki/phrase-structure.md.
 *   - Harmony (R2): "generate backwards from the cadence" — fix the cadence
 *     chord, then walk backward through Piston's root-progression table
 *     (theory.pistonSuccessors, sampled by theory-weight with rng.weighted) so
 *     pre-dominants fall naturally before the dominant. wiki/harmony.md.
 *   - Melody (R1): contour-first. Fix the phrase-final goal tone (from the
 *     cadence) and one apex, target an arch envelope, then fill scale tones by
 *     a constraint-weighted local choice: chord tones on strong beats, step
 *     bias, post-leap reversal (~0.7), regression-to-the-mean, one apex/phrase,
 *     range bound. wiki/melody.md. The consequent RESTATES the antecedent's
 *     basic idea (parallel period), the strongest audible structure cue.
 *
 * Output is the wiki/engine-architecture.md composer schema: Note events
 * { beat, durBeats, midi, voice, role, tags } in BEATS (no seconds — tempo is
 * the performer's job), fully deterministic from the seed. Everything the piece
 * "meant" is inspectable (selfReport + per-note tags) so metrics/critics can
 * measure achieved-vs-intended (wiki/computational-music-metrics.md).
 *
 * Pure and deterministic (no Web Audio, no Math.random, no globals). Dual-format
 * (UMD-lite), same rationale as the libraries: require() in Node, window.AM.*
 * via <script src> in a file:// browser. Depends on lib/theory.js + lib/rng.js.
 */
;(function (global, factory) {
  'use strict';
  let theory, rng;
  if (typeof module === 'object' && module.exports) {
    theory = require('../lib/theory.js');
    rng = require('../lib/rng.js');
    module.exports = factory(theory, rng);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.composers = AM.composers || {};
    AM.composers.tonalPhrase = factory(AM.theory, AM.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (theory, rng) {
  'use strict';

  const { Rng } = rng;
  const BEATS_PER_BAR = 4;
  const PHRASE_BARS = 4;
  const PHRASE_BEATS = BEATS_PER_BAR * PHRASE_BARS; // 16

  // ---- Harmony (R2): cadence-first, backward Piston walk --------------------
  // Build a reverse index of Piston's major-key table: for a known chord `next`,
  // which chords lead to it, and with what forward weight (P(pred -> next))?
  // Sampling a predecessor in proportion to that weight is a principled
  // "generate backwards from the cadence" (wiki/harmony.md): because Piston lists
  // IV->V and ii->V as the strongest motions, walking backward from V naturally
  // yields the pre-dominants IV/ii most often — pre-dominant-before-dominant
  // falls out of the table, no special case needed.
  function buildPistonReverseIndex() {
    const rev = {};
    for (const roman of Object.keys(theory.PISTON_MAJOR_TRANSITIONS)) {
      const { items, weights } = theory.pistonSuccessors(roman);
      for (let i = 0; i < items.length; i++) {
        (rev[items[i]] || (rev[items[i]] = { items: [], weights: [] }));
        rev[items[i]].items.push(roman);
        rev[items[i]].weights.push(weights[i]);
      }
    }
    return rev;
  }
  const PISTON_REVERSE = buildPistonReverseIndex();

  /** Sample a plausible predecessor of `nextRoman`, weighted by Piston forward-probability. */
  function predecessorOf(nextRoman, r, { avoid = null } = {}) {
    const row = PISTON_REVERSE[nextRoman];
    if (!row || !row.items.length) return 'I'; // fallback: tonic can precede anything
    let { items, weights } = row;
    if (avoid) {
      // Discourage (not forbid) immediately repeating the same chord.
      const it = [], wt = [];
      for (let i = 0; i < items.length; i++) { it.push(items[i]); wt.push(items[i] === avoid ? weights[i] * 0.15 : weights[i]); }
      items = it; weights = wt;
    }
    return r.weighted(items, weights);
  }

  // A major-key roman-numeral progression for one phrase, generated backward
  // from a fixed cadence. Returns an array of PHRASE_BARS roman numerals.
  function harmonizePhraseMajor(cadence, r, openChord = 'I') {
    const chords = new Array(PHRASE_BARS);
    if (cadence === 'HC') {
      chords[PHRASE_BARS - 1] = 'V';                 // half cadence lands ON V
    } else {                                         // PAC / IAC land on I
      chords[PHRASE_BARS - 1] = 'I';
      chords[PHRASE_BARS - 2] = 'V';                 // dominant before the tonic
    }
    const firstFixed = cadence === 'HC' ? PHRASE_BARS - 1 : PHRASE_BARS - 2;
    chords[0] = openChord;                            // periods open over tonic (or a contrasting chord)
    for (let bar = firstFixed - 1; bar >= 1; bar--) {
      chords[bar] = predecessorOf(chords[bar + 1], r, { avoid: bar === 1 ? openChord : null });
    }
    return chords;
  }

  // Minor keys: Piston's table is major-only (an open question in wiki/harmony.md
  // is whether its strong/weak asymmetry even holds in minor), so rather than
  // misuse it we use a small fixed functional skeleton, and take the dominant
  // from the HARMONIC minor so V is a real leading-tone dominant (the
  // "minor-key dominant strength" note in wiki/findings-shared-lib-foundation.md).
  function harmonizePhraseMinor(cadence) {
    return cadence === 'HC' ? ['i', 'iv', 'ii°', 'V'] : ['i', 'iv', 'V', 'i'];
  }

  // ---- Chord realization -----------------------------------------------------
  // Map roman numerals to concrete triads. In minor we splice in harmonicMinor
  // for the (major, leading-tone) V and vii°, natural minor for everything else.
  function buildChordTable(tonicMidi, mode) {
    const table = {};
    const add = (list) => { for (const c of list) if (!(c.roman in table)) table[c.roman] = c; };
    if (mode === 'major') {
      add(theory.diatonicChords(tonicMidi, 'major'));
    } else {
      add(theory.diatonicChords(tonicMidi, 'harmonicMinor')); // provides V (major), vii°
      add(theory.diatonicChords(tonicMidi, 'naturalMinor'));  // i, iv, VI, VII, ii°...
    }
    return table;
  }

  // ---- Melody (R1): contour-first over fixed goal tones ----------------------
  // A fixed, singable rhythmic motif per 4-bar phrase (motivic repetition is
  // cheap memorability — wiki/melody.md). The "basic idea" (beats 0-8) is shared
  // by both phrases (parallel period); the "continuation" (beats 8-12) drives to
  // the cadence, and beats 14-16 are a rest — phrase-final lengthening + a breath
  // (wiki/phrase-structure.md). Onsets are phrase-relative [beat, durBeats].
  const BASIC_IDEA = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2]];
  const CONT_ANTE = [[8, 1], [9, 1], [10, 1], [11, 1], [12, 2]];  // -> HC, half note + breath
  const CONT_CONS = [[8, 1], [9, 1], [10, 1], [11, 1], [12, 4]];  // -> PAC, whole note (strong close)
  const APEX_SLOT = 6; // index into the phrase's onset list: the long note ending the basic idea

  function chordPitchClasses(chord) { return chord.notes.map((m) => ((m % 12) + 12) % 12); }

  // Scale-tone MIDI pool for the melody register (roughly an octave-and-a-bit
  // above the accompaniment), used as the candidate universe.
  function melodyPool(tonicMidi, scaleName) {
    const lo = tonicMidi + 12 - 2;      // a touch below the octave-up tonic
    const hi = tonicMidi + 24 + 2;      // up to ~a ninth above that
    const pool = theory.scale(tonicMidi, scaleName, { octaves: 4 })
      .filter((m) => m >= lo && m <= hi);
    return pool;
  }

  // Nearest pool pitch to `target` that is also in `allowedPcs` (if given).
  function nearestInPool(pool, target, allowedPcs) {
    let best = null, bestD = Infinity;
    for (const m of pool) {
      if (allowedPcs && !allowedPcs.has(((m % 12) + 12) % 12)) continue;
      const d = Math.abs(m - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  // A straight-line contour target from `a` to `b` across n slots.
  function lineContour(n, a, b) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a + (n === 1 ? 0 : (i / (n - 1)) * (b - a));
    return out;
  }

  // Fill one contiguous run of melody onsets toward a contour envelope, obeying
  // the wiki/melody.md constraints. `pins` hard-fixes chosen slots (start, apex,
  // cadence goal tone); `ceiling` caps every non-pinned note (so the apex stays
  // the unique high point of the phrase); `precededBy`/`precededByMove` carry
  // continuity across a run boundary (e.g. descending away from the apex).
  function fillContour(onsets, opts, r) {
    const { pool, contour, pins = {}, ceiling = Infinity, chordForBeat, scalePcs,
      precededBy = null, precededByMove = 0 } = opts;
    const n = onsets.length;
    const out = new Array(n);
    let prev = precededBy, prevMove = precededByMove;

    for (let i = 0; i < n; i++) {
      if (i in pins) { const m = pins[i]; if (prev != null) prevMove = m - prev; out[i] = m; prev = m; continue; }

      const beat = onsets[i][0];
      const strong = (beat % 2) === 0;                 // downbeat or mid-bar beat
      const chordPcs = new Set(chordPitchClasses(chordForBeat(beat)));

      const cands = [], weights = [];
      for (const c of pool) {
        if (c > ceiling) continue;                     // keep the apex unique
        if (prev != null && Math.abs(c - prev) > 12) continue; // no wild leaps
        const pc = ((c % 12) + 12) % 12;
        let score = -Math.abs(c - contour[i]) * 0.6;   // track the contour envelope
        const isChordTone = chordPcs.has(pc);
        if (strong) score += isChordTone ? 1.4 : -1.2; // chord tones on strong beats
        else score += isChordTone ? 0.3 : 0.0;
        if (prev != null) {
          const move = c - prev, step = Math.abs(move);
          if (step === 0) score -= 1.5;                // avoid dead repeats
          else if (step <= 2) score += 1.0;            // step bias (2nds)
          else if (step <= 4) score += 0.1;            // small leaps (3rds) ok
          else score -= 0.6 * (step - 4);              // larger leaps discouraged
          if (Math.abs(prevMove) > 4 && Math.sign(move) === -Math.sign(prevMove) && step <= 2) {
            score += 1.3;                              // post-leap reversal (~0.7)
          }
          const lo = pool[0], hi = pool[pool.length - 1], reg = (hi - lo) || 1;
          const rel = (prev - lo) / reg;               // regression to the mean
          if (rel > 0.8 && move < 0) score += 0.8;
          if (rel < 0.2 && move > 0) score += 0.8;
          if (step > 2 && move > 0) score += 0.2;      // leaps up, steps down
          if (step <= 2 && move < 0) score += 0.15;    // (Vos & Troost)
        }
        // Approach a hard-pinned next note (e.g. the cadential goal tone) by
        // step — cadences resolve 7->1 / 2->1, not by leap (wiki/phrase-structure).
        if ((i + 1) in pins) {
          const gap = Math.abs(c - pins[i + 1]);
          if (gap >= 1 && gap <= 2) score += 1.1; else if (gap === 0) score -= 0.5;
        }
        cands.push(c); weights.push(Math.exp(score));
      }
      const chosen = cands.length ? r.weighted(cands, weights)
        : (nearestInPool(pool.filter((m) => m <= ceiling), contour[i], scalePcs) || prev);
      if (prev != null) prevMove = chosen - prev;
      prev = chosen;
      out[i] = chosen;
    }
    return out;
  }

  // Pick the pinned pitches for a phrase: a mid-register chord-tone start, a high
  // chord-tone apex, and the cadence-dictated final goal tone.
  function pinsForPhrase(phrasePlan, chordTable, tonicMidi, scaleName, mode, r, pinOpts = {}) {
    const pool = melodyPool(tonicMidi, scaleName);
    const center = tonicMidi + 12 + 5 + (pinOpts.centerOffset || 0); // ~a fifth above the octave-up tonic (shift for sectional register contrast)
    const firstChord = chordTable[phrasePlan.chords[0]];
    const startMidi = nearestInPool(pool, center, new Set(chordPitchClasses(firstChord)));

    // Apex: a chord tone of the apex bar's chord, high in the register but not
    // at the very ceiling; one clear peak per phrase (wiki/melody.md).
    const apexBeat = BASIC_IDEA[APEX_SLOT][0];
    const apexChord = chordTable[phrasePlan.chords[Math.floor(apexBeat / BEATS_PER_BAR)]];
    const apexTargets = pool.filter((m) => m >= center + 3 && m <= pool[pool.length - 1] - 1
      && chordPitchClasses(apexChord).includes(((m % 12) + 12) % 12));
    const apexMidi = apexTargets.length ? r.pick(apexTargets) : pool[pool.length - 2];

    // Final goal tone from the cadence (wiki/phrase-structure.md melody targets):
    //  PAC -> do (1); HC -> re (2) or sol (5), taken as a chord tone of V.
    const tonicPc = ((tonicMidi % 12) + 12) % 12;
    let finalMidi;
    if (phrasePlan.cadence === 'PAC' || phrasePlan.cadence === 'IAC') {
      finalMidi = nearestInPool(pool, center - 5, new Set([tonicPc])); // land on do, mid-low
    } else { // HC
      const deg = r.bool(0.6) ? 2 : 5;                 // re (open, questioning) or sol
      const pc = ((theory.scaleDegree(tonicMidi, scaleName, deg) % 12) + 12) % 12;
      finalMidi = nearestInPool(pool, center - 2, new Set([pc]));
    }
    return { pool, startMidi, apexMidi, finalMidi };
  }

  // ---- Assemble one parallel period -----------------------------------------
  function composePeriod(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const mode = opts.mode === 'minor' ? 'minor' : 'major';
    const scaleName = mode === 'minor' ? 'naturalMinor' : 'major';
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi('C4') : opts.tonic);
    const tonicPc = ((tonicMidi % 12) + 12) % 12;

    const master = new Rng(seed);
    const harmonyRng = master.stream('harmony');
    const melodyRng = master.stream('melody');

    // Planner: a parallel period. Antecedent asks (HC), consequent answers (PAC).
    const chordTable = buildChordTable(tonicMidi, mode);
    const anteChords = mode === 'major' ? harmonizePhraseMajor('HC', harmonyRng)
      : harmonizePhraseMinor('HC');
    const consChords = mode === 'major' ? harmonizePhraseMajor('PAC', harmonyRng)
      : harmonizePhraseMinor('PAC');
    // Parallel period: the consequent restates the antecedent's basic idea, so
    // its first two bars reuse the antecedent's first two chords.
    consChords[0] = anteChords[0];
    consChords[1] = anteChords[1];

    const phrases = [
      { role: 'antecedent', cadence: 'HC', chords: anteChords, startBar: 0 },
      { role: 'consequent', cadence: 'PAC', chords: consChords, startBar: PHRASE_BARS },
    ];

    // Melody: generate the antecedent (basic idea + continuation), then reuse the
    // basic-idea pitches for the consequent and generate a fresh continuation.
    const antePins = pinsForPhrase(phrases[0], chordTable, tonicMidi, scaleName, mode, melodyRng);
    const chordForBeatOf = (phrasePlan) => (beat) =>
      chordTable[phrasePlan.chords[Math.min(PHRASE_BARS - 1, Math.floor(beat / BEATS_PER_BAR))]];
    const scalePcs = new Set(theory.scale(tonicMidi, scaleName).map((m) => ((m % 12) + 12) % 12));

    const pool = antePins.pool;
    // Basic idea (beats 0-6): rise from a mid chord-tone start to the apex, which
    // is the run's last note. Non-apex notes are capped just below the apex.
    const anteBasic = fillContour(BASIC_IDEA, {
      pool, scalePcs, chordForBeat: chordForBeatOf(phrases[0]),
      contour: lineContour(BASIC_IDEA.length, antePins.startMidi, antePins.apexMidi),
      pins: { 0: antePins.startMidi, [APEX_SLOT]: antePins.apexMidi },
      ceiling: antePins.apexMidi - 1,
    }, melodyRng);
    const apexMidi = antePins.apexMidi;
    const moveIntoCont = apexMidi - anteBasic[APEX_SLOT - 1]; // usually a leap up into the apex
    // Continuation (beats 8-12): descend from below the apex to the cadence goal
    // tone. Capped strictly below the apex so the apex is the phrase's unique peak.
    const anteCont = fillContour(CONT_ANTE, {
      pool, scalePcs, chordForBeat: chordForBeatOf(phrases[0]),
      contour: lineContour(CONT_ANTE.length, apexMidi - 2, antePins.finalMidi),
      pins: { [CONT_ANTE.length - 1]: antePins.finalMidi },
      ceiling: apexMidi - 1, precededBy: apexMidi, precededByMove: moveIntoCont,
    }, melodyRng);

    const consPins = pinsForPhrase(phrases[1], chordTable, tonicMidi, scaleName, mode, melodyRng);
    const consCont = fillContour(CONT_CONS, {
      pool, scalePcs, chordForBeat: chordForBeatOf(phrases[1]),
      contour: lineContour(CONT_CONS.length, apexMidi - 2, consPins.finalMidi),
      pins: { [CONT_CONS.length - 1]: consPins.finalMidi },
      ceiling: apexMidi - 1, precededBy: apexMidi, precededByMove: moveIntoCont,
    }, melodyRng);

    // ---- Emit Note events (wiki/engine-architecture.md schema, in beats) -----
    const notes = [];
    const emitChords = (phrasePlan) => {
      for (let bar = 0; bar < PHRASE_BARS; bar++) {
        const chord = chordTable[phrasePlan.chords[bar]];
        const beat = (phrasePlan.startBar + bar) * BEATS_PER_BAR;
        const isCadenceBar = bar === PHRASE_BARS - 1;
        const tags = ['chord:' + chord.roman];
        if (chord.function) tags.push('function:' + chord.function);
        if (isCadenceBar) tags.push('cadence:' + phrasePlan.cadence);
        // Bass: chord root an octave below the triad.
        notes.push({ beat, durBeats: BEATS_PER_BAR, midi: chord.notes[0] - 12, voice: 'bass', role: 'harmony', tags: tags.slice() });
        // Pad: the triad, held for the bar.
        for (const m of chord.notes) {
          notes.push({ beat, durBeats: BEATS_PER_BAR, midi: m, voice: 'chord', role: 'harmony', tags: tags.slice() });
        }
      }
    };
    const emitMelody = (phrasePlan, onsets, pitches, isApexRun) => {
      const base = phrasePlan.startBar * BEATS_PER_BAR;
      for (let i = 0; i < onsets.length; i++) {
        const [rbeat, dur] = onsets[i];
        const tags = ['theme:A'];
        if (isApexRun && i === APEX_SLOT) tags.push('apex');
        if (i === onsets.length - 1 && phrasePlan._final) tags.push('cadence:' + phrasePlan.cadence, 'goal-tone');
        notes.push({ beat: base + rbeat, durBeats: dur, midi: pitches[i], voice: 'melody', role: 'lead', tags });
      }
    };

    emitChords(phrases[0]);
    emitChords(phrases[1]);
    phrases[0]._final = false; emitMelody(phrases[0], BASIC_IDEA, anteBasic, true);
    phrases[0]._final = true; emitMelody(phrases[0], CONT_ANTE, anteCont, false);
    phrases[1]._final = false; emitMelody(phrases[1], BASIC_IDEA, anteBasic, true); // restated basic idea
    phrases[1]._final = true; emitMelody(phrases[1], CONT_CONS, consCont, false);

    notes.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    // ---- Self-report: what the composer intended (achieved-vs-intended) ------
    const selfReport = {
      form: 'parallel period',
      bars: PHRASE_BARS * 2,
      beatsPerBar: BEATS_PER_BAR,
      key: theory.midiToNoteName(tonicMidi).replace(/\d+$/, '') + ' ' + mode,
      phrases: phrases.map((p) => ({
        role: p.role, cadence: p.cadence,
        chords: p.chords, cadenceChord: p.chords[PHRASE_BARS - 1],
      })),
      melody: {
        contour: 'arch per phrase, shared apex in the basic idea',
        antecedentGoalTone: theory.midiToNoteName(antePins.finalMidi),
        consequentGoalTone: theory.midiToNoteName(consPins.finalMidi),
        apex: theory.midiToNoteName(antePins.apexMidi),
        restatement: 'consequent basic idea = antecedent basic idea (parallel period)',
      },
    };

    return { meta: { seed, tonic: theory.midiToNoteName(tonicMidi), mode }, plan: { phrases }, chordTable, notes, selfReport };
  }

  // ==========================================================================
  // WHOLE-PIECE COMPOSER — composePiece()
  //
  // Extends the single parallel period (composePeriod) into a complete,
  // *finishable* piece: a short intro, a rounded ternary A B A′, and a cadential
  // coda. This is the launch tonal-classical engine's Planner + Composer. It
  // reuses the period machinery above unchanged (backward-Piston harmony,
  // contour-first melody, pinned goal tones) and adds the three things a single
  // period cannot do — the very gaps the previous experiments never closed:
  //
  //   1. FORM with a returning theme. wiki/form-and-structure.md's highest-
  //      leverage rule is repetition-with-return: state material (A), depart
  //      audibly (B), bring the theme back (A′). Sections contrast on register
  //      and harmony, boundaries are cadence-articulated, and the intensity
  //      peak is placed in the second half (A′) — a late climax, not hard-coded
  //      to any golden-section ratio (the page warns against that).
  //   2. MOTIVIC VARIATION on the return. A′ restates A's basic idea but
  //      ornamented (passing/neighbor eighths over the same on-beat skeleton) —
  //      development, not mere repetition (wiki/melody.md, wiki/repetition-and-
  //      familiarity.md). The return stays recognizable; the surface is fresh.
  //   3. AN ENDING (research question R6 — "engines must be able to finish").
  //      The coda accelerates the harmonic rhythm into the final cadence
  //      (whole-bar chords broadening to a mid-bar ii–V) and lands a lengthened
  //      final tonic — a real close, not a fade-out mid-phrase.
  //
  // Same Note-event schema, in beats, fully deterministic from the seed.
  // ==========================================================================

  const INTRO_BARS = 2;
  const SECTION_BARS = PHRASE_BARS * 2; // 8: a parallel period
  const CODA_BARS = 4;

  // Generate one phrase's melody (basic idea + continuation) with the period
  // helpers. basicPitchesIn (optional) restates a captured theme's basic idea
  // instead of generating a fresh one (used for the parallel-period consequent
  // and the A′ return). contOnsets picks the continuation rhythm/cadence length.
  function generatePhrase(phrasePlan, cctx, o) {
    const { chordTable, tonicMidi, scaleName, mode } = cctx;
    const r = o.rng;
    const pins = pinsForPhrase(phrasePlan, chordTable, tonicMidi, scaleName, mode, r, { centerOffset: o.centerOffset || 0 });
    const pool = pins.pool;
    const scalePcs = new Set(theory.scale(tonicMidi, scaleName).map((m) => ((m % 12) + 12) % 12));
    const chordForBeat = (beat) => chordTable[phrasePlan.chords[Math.min(PHRASE_BARS - 1, Math.floor(beat / BEATS_PER_BAR))]];
    const basicPitches = o.basicPitchesIn ? o.basicPitchesIn.slice() : fillContour(BASIC_IDEA, {
      pool, scalePcs, chordForBeat,
      contour: lineContour(BASIC_IDEA.length, pins.startMidi, pins.apexMidi),
      pins: { 0: pins.startMidi, [APEX_SLOT]: pins.apexMidi },
      ceiling: pins.apexMidi - 1,
    }, r);
    const apexMidi = basicPitches[APEX_SLOT];
    const moveIntoCont = apexMidi - basicPitches[APEX_SLOT - 1];
    const contOnsets = o.contOnsets || CONT_ANTE;
    const contPitches = fillContour(contOnsets, {
      pool, scalePcs, chordForBeat,
      contour: lineContour(contOnsets.length, apexMidi - 2, pins.finalMidi),
      pins: { [contOnsets.length - 1]: pins.finalMidi },
      ceiling: apexMidi - 1, precededBy: apexMidi, precededByMove: moveIntoCont,
    }, r);
    return { pins, basicPitches, apexMidi, contOnsets, contPitches, pool };
  }

  // One scale-step neighbor in `pool` (sorted ascending) from `from`, direction dir.
  function stepInPool(pool, from, dir) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < pool.length; i++) { const d = Math.abs(pool[i] - from); if (d < best) { best = d; idx = i; } }
    const j = idx + (dir >= 0 ? 1 : -1);
    return (j >= 0 && j < pool.length) ? pool[j] : from;
  }

  // Ornament a restated basic idea for the varied return (A′): split 1–2 interior
  // quarter notes into eighth-note pairs, inserting a passing/neighbor scale tone
  // that steps toward the next note. The ON-BEAT pitches are untouched (the return
  // stays recognizable — wiki/repetition-and-familiarity.md); only the surface is
  // elaborated (diminution — wiki/melody.md). Never splits the apex or the note
  // before it, and never inserts a tone at/above the apex, so the apex stays the
  // phrase's unique peak.
  function ornamentedBasic(pitches, pool, apexMidi, r) {
    const cands = [];
    for (let i = 1; i < APEX_SLOT - 1; i++) if (pitches[i] !== undefined) cands.push(i);
    const chosen = new Set(r.shuffle(cands).slice(0, Math.min(2, cands.length)));
    if (!chosen.size && cands.length) chosen.add(cands[0]);
    const onsets = [], out = [];
    for (let i = 0; i < BASIC_IDEA.length; i++) {
      const [b, d] = BASIC_IDEA[i];
      if (chosen.has(i) && d === 1) {
        const dir = (i + 1 < pitches.length ? Math.sign(pitches[i + 1] - pitches[i]) : 1) || 1;
        let mid = stepInPool(pool, pitches[i], dir);
        if (mid >= apexMidi) mid = stepInPool(pool, pitches[i], -dir);
        onsets.push([b, 0.5], [b + 0.5, 0.5]); out.push(pitches[i], mid);
      } else { onsets.push([b, d]); out.push(pitches[i]); }
    }
    return { onsets, pitches: out };
  }

  function composePiece(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const mode = opts.mode === 'minor' ? 'minor' : 'major';
    const scaleName = mode === 'minor' ? 'naturalMinor' : 'major';
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi('C4') : opts.tonic);

    const master = new Rng(seed);
    const hr = master.stream('harmony');
    const mr = master.stream('melody');
    const chordTable = buildChordTable(tonicMidi, mode);
    const cctx = { chordTable, tonicMidi, scaleName, mode };
    const T = mode === 'major' ? 'I' : 'i';

    // Section layout (bars).
    const introStart = 0;
    const aStart = introStart + INTRO_BARS;
    const bStart = aStart + SECTION_BARS;
    const apStart = bStart + SECTION_BARS;
    const codaStart = apStart + SECTION_BARS;
    const totalBars = codaStart + CODA_BARS;

    const notes = [];
    const emitChordBar = (roman, barIndex, sect, beatInBar, lenBeats, cadence) => {
      const chord = chordTable[roman];
      const beat = barIndex * BEATS_PER_BAR + (beatInBar || 0);
      const tags = ['chord:' + chord.roman, 'sect:' + sect];
      if (chord.function) tags.push('function:' + chord.function);
      if (cadence) tags.push('cadence:' + cadence);
      notes.push({ beat, durBeats: lenBeats, midi: chord.notes[0] - 12, voice: 'bass', role: 'harmony', tags: tags.slice() });
      for (const m of chord.notes) notes.push({ beat, durBeats: lenBeats, midi: m, voice: 'chord', role: 'harmony', tags: tags.slice() });
    };
    const emitMelody = (baseBar, onsets, pitches, sect, themeTag, o = {}) => {
      const base = baseBar * BEATS_PER_BAR;
      for (let i = 0; i < onsets.length; i++) {
        const [rb, d] = onsets[i];
        const tags = ['theme:' + themeTag, 'sect:' + sect];
        if (o.apexIndex != null && i === o.apexIndex) tags.push('apex');
        if (o.finalCad && i === onsets.length - 1) tags.push('cadence:' + o.finalCad, 'goal-tone');
        notes.push({ beat: base + rb, durBeats: d, midi: pitches[i], voice: 'melody', role: 'lead', tags });
      }
    };

    // Build one 8-bar period section (A, B, or A′). Returns its captured theme.
    function buildSection(startBar, sect, o = {}) {
      let anteChords, consChords;
      const isB = sect === 'B';
      if (o.theme) {
        // The rounded-form return (A′) restates A's harmony exactly — the return
        // is a true restatement; variation lives in the melody + dynamics.
        anteChords = o.theme.anteChords.slice(); consChords = o.theme.consChords.slice();
      } else if (mode === 'major') {
        if (isB) { anteChords = harmonizePhraseMajor('HC', hr, 'vi'); consChords = harmonizePhraseMajor('HC', hr, 'IV'); }
        else {
          anteChords = harmonizePhraseMajor('HC', hr);
          consChords = harmonizePhraseMajor('PAC', hr);
          consChords[0] = anteChords[0]; consChords[1] = anteChords[1]; // parallel period
        }
      } else {
        if (isB) { anteChords = ['iv', 'ii°', 'iv', 'V']; consChords = ['VI', 'iv', 'ii°', 'V']; }
        else { anteChords = harmonizePhraseMinor('HC'); consChords = harmonizePhraseMinor('PAC'); }
      }
      const antePhrase = { role: 'antecedent', cadence: 'HC', chords: anteChords };
      const consPhrase = { role: 'consequent', cadence: isB ? 'HC' : 'PAC', chords: consChords };
      for (let b = 0; b < PHRASE_BARS; b++) emitChordBar(anteChords[b], startBar + b, sect, 0, BEATS_PER_BAR, b === PHRASE_BARS - 1 ? 'HC' : null);
      for (let b = 0; b < PHRASE_BARS; b++) emitChordBar(consChords[b], startBar + PHRASE_BARS + b, sect, 0, BEATS_PER_BAR, b === PHRASE_BARS - 1 ? consPhrase.cadence : null);

      const theme = o.theme || null;
      const ante = generatePhrase(antePhrase, cctx, { rng: mr, centerOffset: o.centerOffset || 0, basicPitchesIn: theme ? theme.basicPitches : null });
      const basicPitches = ante.basicPitches, apexMidi = ante.apexMidi, pool = ante.pool;
      const cons = generatePhrase(consPhrase, cctx, { rng: mr, centerOffset: o.centerOffset || 0, basicPitchesIn: basicPitches, contOnsets: isB ? CONT_ANTE : CONT_CONS });

      let baO = BASIC_IDEA.map((x) => x.slice()), baP = basicPitches.slice();
      if (o.ornament) { const orn = ornamentedBasic(basicPitches, pool, apexMidi, mr); baO = orn.onsets; baP = orn.pitches; }

      const aOn = baO.concat(ante.contOnsets), aPi = baP.concat(ante.contPitches);
      const cOn = baO.concat(cons.contOnsets), cPi = baP.concat(cons.contPitches);
      emitMelody(startBar, aOn, aPi, sect, sect, { finalCad: antePhrase.cadence, apexIndex: aPi.indexOf(Math.max(...aPi)) });
      emitMelody(startBar + PHRASE_BARS, cOn, cPi, sect, sect, { finalCad: consPhrase.cadence, apexIndex: cPi.indexOf(Math.max(...cPi)) });

      return { basicPitches, apexMidi, pool, anteChords, consChords, cadences: [antePhrase.cadence, consPhrase.cadence] };
    }

    const A = buildSection(aStart, 'A', { centerOffset: 0 });
    const B = buildSection(bStart, 'B', { centerOffset: -3 });                 // contrast: lower tessitura + off-tonic harmony
    const Ap = buildSection(apStart, "A'", { theme: A, ornament: true });       // varied return (climax)

    // INTRO — I then V (a lead-in), thin (bass + chords), with a stepwise
    // two-note anacrusis rising into A's first melody note.
    emitChordBar(T, introStart, 'intro', 0, BEATS_PER_BAR);
    emitChordBar('V', introStart + 1, 'intro', 0, BEATS_PER_BAR);
    const a2 = stepInPool(A.pool, A.basicPitches[0], -1);
    const a1 = stepInPool(A.pool, a2, -1);
    const introBase = (introStart + 1) * BEATS_PER_BAR;
    notes.push({ beat: introBase + 2, durBeats: 1, midi: a1, voice: 'melody', role: 'lead', tags: ['theme:intro', 'sect:intro', 'anacrusis'] });
    notes.push({ beat: introBase + 3, durBeats: 1, midi: a2, voice: 'melody', role: 'lead', tags: ['theme:intro', 'sect:intro', 'anacrusis'] });

    // CODA — the ending. Harmonic rhythm broadens (whole-bar I, IV) then
    // ACCELERATES into a mid-bar ii–V, resolving to a lengthened final tonic.
    const PD = mode === 'major' ? 'IV' : 'iv';
    const SD = mode === 'major' ? 'ii' : 'ii°';
    emitChordBar(T, codaStart, 'coda', 0, BEATS_PER_BAR);                       // tonic prolongation
    emitChordBar(PD, codaStart + 1, 'coda', 0, BEATS_PER_BAR);                  // subdominant (plagal color)
    emitChordBar(SD, codaStart + 2, 'coda', 0, 2);                             // ii  (accelerated)
    emitChordBar('V', codaStart + 2, 'coda', 2, 2);                            // V   (accelerated)
    emitChordBar(T, codaStart + 3, 'coda', 0, BEATS_PER_BAR, 'PAC');           // final tonic (lengthened)
    const codaBase = codaStart * BEATS_PER_BAR;
    for (let i = 0; i < 3; i++) notes.push({ beat: codaBase + i, durBeats: 1, midi: A.basicPitches[i], voice: 'melody', role: 'lead', tags: ['theme:coda', 'sect:coda', 'recall'] }); // head recall
    const doTop = theory.scaleDegree(tonicMidi, scaleName, 8);   // do, upper octave
    const reTop = theory.scaleDegree(tonicMidi, scaleName, 9);   // re
    const miTop = theory.scaleDegree(tonicMidi, scaleName, 10);  // mi / me
    notes.push({ beat: codaBase + 2 * BEATS_PER_BAR + 0, durBeats: 2, midi: miTop, voice: 'melody', role: 'lead', tags: ['theme:coda', 'sect:coda'] });   // 3̂
    notes.push({ beat: codaBase + 2 * BEATS_PER_BAR + 2, durBeats: 2, midi: reTop, voice: 'melody', role: 'lead', tags: ['theme:coda', 'sect:coda'] });   // 2̂
    notes.push({ beat: codaBase + 3 * BEATS_PER_BAR + 0, durBeats: BEATS_PER_BAR, midi: doTop, voice: 'melody', role: 'lead', tags: ['theme:coda', 'sect:coda', 'cadence:PAC', 'goal-tone', 'ending'] }); // 1̂ — the final, longest note

    notes.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    const sections = [
      { role: 'intro', bars: INTRO_BARS, startBar: introStart, intensity: 0.40, harmony: [T, 'V'] },
      { role: 'A', bars: SECTION_BARS, startBar: aStart, intensity: 0.62, harmony: A.anteChords.concat(A.consChords), cadences: A.cadences },
      { role: 'B', bars: SECTION_BARS, startBar: bStart, intensity: 0.74, harmony: B.anteChords.concat(B.consChords), cadences: B.cadences, contrast: 'lower register, off-tonic (opens on vi/iv), ends on the dominant to re-approach A′' },
      { role: "A'", bars: SECTION_BARS, startBar: apStart, intensity: 0.92, harmony: Ap.anteChords.concat(Ap.consChords), cadences: Ap.cadences, variation: 'ornamented restatement of A; the dynamic climax' },
      { role: 'coda', bars: CODA_BARS, startBar: codaStart, intensity: 0.58, harmony: [T, PD, SD + '+V', T], ending: true },
    ];
    const selfReport = {
      engine: 'tonal-classical',
      form: 'intro + rounded ternary (A B A′) + coda',
      bars: totalBars, beatsPerBar: BEATS_PER_BAR,
      key: theory.midiToNoteName(tonicMidi).replace(/-?\d+$/, '') + ' ' + mode,
      sections: sections.map((s) => ({ role: s.role, bars: s.bars, startBar: s.startBar, intensity: s.intensity, harmony: s.harmony, cadences: s.cadences, contrast: s.contrast, variation: s.variation, ending: s.ending })),
      theme: { basicIdea: A.basicPitches.map((m) => theory.midiToNoteName(m)), apex: theory.midiToNoteName(A.apexMidi) },
      climax: "A′ (the varied return), placed in the second half — a late climax, not hard-coded to any ratio",
      ending: 'coda: whole-bar I–IV broadening to a mid-bar ii–V, resolving to a lengthened final tonic (the piece finishes)',
    };

    return { meta: { seed, tonic: theory.midiToNoteName(tonicMidi), mode, bars: totalBars }, sections, chordTable, notes, selfReport };
  }

  // Convenience: flatten to melody-only pitch list (for tests / quick inspection).
  function melodyLine(period) {
    return period.notes.filter((n) => n.voice === 'melody').sort((a, b) => a.beat - b.beat);
  }

  return {
    composePeriod, composePiece, melodyLine,
    // exposed for tests / reuse
    predecessorOf, harmonizePhraseMajor, PISTON_REVERSE,
    BEATS_PER_BAR, PHRASE_BARS, PHRASE_BEATS, BASIC_IDEA, CONT_ANTE, CONT_CONS, APEX_SLOT,
    INTRO_BARS, SECTION_BARS, CODA_BARS,
  };
});
