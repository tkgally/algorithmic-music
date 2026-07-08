/*
 * groove-lofi — a reference COMPOSER for a GROOVE / lo-fi engine (Engine 03),
 * the third member of the launch trio and the deliberate counterpart to the
 * metric-classical (Engine 01) and beatless-ambient (Engine 02) engines. It is
 * the browser realization of wiki/groove-and-embodiment.md's design targets set
 * in a lo-fi hip-hop idiom (wiki/electronic-and-dance.md's downtempo relative).
 *
 * The load-bearing ideas, all straight from wiki/groove-and-embodiment.md:
 *   - a LOOPED ostinato (groove is a steady-state phenomenon — it emerges over
 *     cycles), with variation applied sparingly at the edges (fills, ghost-note
 *     reshuffles) over an unchanging core;
 *   - a structural BACKBEAT: snare on beats 2 and 4 as the loudest recurring
 *     accent, kick on 1 (+ a syncopated hit) as the tight low anchor;
 *   - MEDIUM SYNCOPATION (the Witek inverted-U peak): kick patterns place a
 *     handful of weak-position onsets while keeping beat 1 and the backbeat, so
 *     the meter never flips;
 *   - a VELOCITY HIERARCHY, not timing noise: accented backbeat/downbeat loud,
 *     ghost snares ≈0.2, hi-hats alternating loud/soft — the correction to this
 *     project's old "uniform jitter as humanization" mistake (the swing and the
 *     laid-back feel are the PERFORMER's structured job, in engine.js);
 *   - BASS WEIGHT: root motion following the harmony, kept in the low register.
 * Over that groove sits the genre's signature warm jazzy harmony: mid-register
 * 7th/9th chords on the `rhodes` voice, with a sparse `bell` lead in the busier
 * middle section (lo-fi leads are minimal by nature).
 *
 * OUTPUT is the shared beat-based Note schema (wiki/engine-architecture.md), the
 * same as the tonal-classical composer: { beat, durBeats, midi, voice, role,
 * tags } in BEATS — tempo, swing, laid-back microtiming and the velocity shaping
 * are the performer's job (engine.js). Drum voices carry a nominal GM-ish midi
 * (kick 36 / snare 38 / hat 42) purely so the visualization has a row for them;
 * the synth drum voices are pitch-fixed. Pitched voices ('bass','rhodes','bell')
 * carry real pitches. `vel` (0..1) is a per-hit BASE the performer refines.
 *
 * Pure and deterministic from the seed (no Web Audio, no Math.random, no
 * globals). Dual-format (UMD-lite): require() in Node, window.AM.composers.
 * grooveLofi via <script src> in a file:// browser. Depends on lib/theory.js +
 * lib/rng.js.
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
    AM.composers.grooveLofi = factory(AM.theory, AM.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (theory, rng) {
  'use strict';

  const { Rng } = rng;
  const BEATS_PER_BAR = 4;
  const STEPS_PER_BAR = 16;                 // sixteenth-note grid
  const STEP = BEATS_PER_BAR / STEPS_PER_BAR; // 0.25 beat

  // Drum visualization rows (nominal GM pitches; the synth drum voices are
  // pitch-fixed — these only give the canvas a lane).
  const DRUM_MIDI = { kick: 36, snare: 38, hat: 42 };

  // ---- Moods: key/mode + a 4-chord jazzy loop (by scale degree) --------------
  // Each is a 7-note diatonic scale (so tertian 7th/9th stacking is well-defined)
  // plus a four-bar progression of scale degrees. Progressions are consonant
  // lo-fi staples: turnarounds and ii–V motions that loop seamlessly (the last
  // chord leads back to the first). The tonic is a sensible default the UI can
  // override.
  const MOODS = {
    mellow: { scale: 'major',        label: 'mellow (major 7ths)',   tonic: 'F3', prog: [2, 5, 1, 6] }, // ii V I vi
    night:  { scale: 'naturalMinor', label: 'night (minor 9ths)',    tonic: 'D3', prog: [1, 4, 6, 5] }, // i iv VI v
    warm:   { scale: 'dorian',       label: 'warm (dorian groove)',  tonic: 'G3', prog: [1, 4, 1, 5] }, // i IV i v
    tape:   { scale: 'major',        label: 'tape (I vi ii V)',      tonic: 'C3', prog: [1, 6, 2, 5] }, // I vi ii V
  };
  const DEFAULT_MOOD = 'mellow';

  // ---- Kick patterns (per bar, 16 steps): medium syncopation -----------------
  // Every pattern keeps step 0 (beat 1) so the meter stays anchored; the other
  // onset(s) are weak-position (the "&" of 2/3), giving the inverted-U's medium
  // syncopation without flipping the meter. Represented as sixteenth-step indices.
  const KICK_PATTERNS = [
    [0, 6, 10],   // 1, & of 2, & of 3 — classic boom-bap
    [0, 7],       // 1, laid "& of 2" pushed — sparse
    [0, 6, 11],   // 1, & of 2, "a" of 3
    [0, 3, 10],   // 1, "a" of 1, & of 3
  ];
  // Ghost-snare positions (weak sixteenths between the backbeats) — quiet, they
  // add forward motion far better than timing jitter (wiki/groove-and-embodiment.md).
  const GHOST_PATTERNS = [
    [7, 14],
    [10, 15],
    [3, 11],
  ];

  function pushDrum(events, voice, bar, step, vel, tags) {
    const beat = bar * BEATS_PER_BAR + step * STEP;
    events.push({ beat, durBeats: 0.12, midi: DRUM_MIDI[voice], voice, role: 'drums', vel, tags: tags || [] });
  }

  // Build one bar of the drum groove into `events`.
  function drumBar(events, bar, kickPat, ghostPat, opts) {
    // Kick.
    for (const s of kickPat) pushDrum(events, 'kick', bar, s, s === 0 ? 0.98 : 0.82, ['kick', s === 0 ? 'downbeat' : 'synco']);
    // Backbeat snare on beats 2 and 4 (steps 4 and 12) — the loudest recurring accent.
    pushDrum(events, 'snare', bar, 4, 0.96, ['backbeat']);
    pushDrum(events, 'snare', bar, 12, 0.96, ['backbeat']);
    // Ghost snares (only when enabled — the B section adds them).
    if (ghostPat) for (const s of ghostPat) pushDrum(events, 'snare', bar, s, 0.22, ['ghost']);
    // Hi-hats: eighth-note ride, accent on the beat, lighter offbeat; an open hat
    // on the last "&" as a bar lead-in (varied so it isn't every bar).
    for (let s = 0; s < STEPS_PER_BAR; s += 2) {
      const onBeat = (s % 4) === 0;
      const isLast = s === 14;
      const openHere = isLast && opts.openHats;
      const vel = openHere ? 0.5 : (onBeat ? 0.6 : 0.4);
      pushDrum(events, 'hat', bar, s, vel, openHere ? ['open'] : ['closed']);
    }
  }

  // ---- Harmony: a mid-register 7th/9th voicing + a bass root -----------------
  // Chord tones come straight from the scale by tertian stacking (root=deg,
  // third=deg+2, fifth=deg+4, seventh=deg+6, ninth=deg+8 — scaleDegree wraps
  // octaves), so quality (maj7/min7/dom7…) falls out of the mode. We voice the
  // upper structure (3rd, 5th, 7th, +9th for color) in the rhodes register and
  // octave-normalize into a tight cluster; the bass takes the root, low.
  function chordTones(tonicMidi, scaleName, deg) {
    return {
      root: theory.scaleDegree(tonicMidi, scaleName, deg),
      third: theory.scaleDegree(tonicMidi, scaleName, deg + 2),
      fifth: theory.scaleDegree(tonicMidi, scaleName, deg + 4),
      seventh: theory.scaleDegree(tonicMidi, scaleName, deg + 6),
      ninth: theory.scaleDegree(tonicMidi, scaleName, deg + 8),
    };
  }
  function normInto(m, lo, hi) { while (m < lo) m += 12; while (m > hi) m -= 12; return m; }
  function rhodesVoicing(ct, withNinth) {
    // 3rd / 5th / 7th (+ optional 9th) placed in [57..81], sorted, de-duplicated.
    const pool = [ct.third, ct.fifth, ct.seventh];
    if (withNinth) pool.push(ct.ninth);
    const voiced = pool.map((m) => normInto(m, 57, 81));
    voiced.sort((a, b) => a - b);
    const out = [];
    for (const m of voiced) if (!out.length || m - out[out.length - 1] >= 1) out.push(m);
    return out;
  }

  function composeGroove(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const moodKey = MOODS[opts.mood] ? opts.mood : DEFAULT_MOOD;
    const mood = MOODS[moodKey];
    const scaleName = mood.scale;
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi(mood.tonic) : opts.tonic);
    // Total bars: intro (2) + main (>=8, split A/B) + outro (2). Clamp so the
    // form always has a real main section.
    let bars = opts.bars == null ? 24 : Math.max(12, Math.min(48, opts.bars | 0));
    const introBars = 2, outroBars = 2;
    const mainBars = bars - introBars - outroBars;
    const bHalfStart = introBars + Math.ceil(mainBars / 2); // B section begins mid-main

    const master = new Rng(seed);
    const dr = master.stream('drums');
    const hr = master.stream('harmony');
    const lr = master.stream('lead');

    // Pick this piece's groove: a kick pattern for A, a (different) one for B, a
    // ghost pattern for B, whether open hats ride, and whether a lead appears.
    const kickA = dr.pick(KICK_PATTERNS);
    let kickB = dr.pick(KICK_PATTERNS); if (kickB === kickA) kickB = KICK_PATTERNS[(KICK_PATTERNS.indexOf(kickA) + 1) % KICK_PATTERNS.length];
    const ghost = dr.pick(GHOST_PATTERNS);
    const openHats = dr.bool(0.6);
    const wantLead = lr.bool(0.75);

    const prog = mood.prog;
    const events = [];
    const progression = [];      // roman numerals, for the self-report
    const chordSpans = [];       // {startBar, deg, roman, notes} for the viz/report

    // ---- Harmony + bass, every bar (the loop rides the 4-chord progression) --
    for (let bar = 0; bar < bars; bar++) {
      const deg = prog[bar % prog.length];
      const ct = chordTones(tonicMidi, scaleName, deg);
      const sev = theory.seventh(tonicMidi, scaleName, deg);
      const inMain = bar >= introBars && bar < bars - outroBars;
      const inB = bar >= bHalfStart && bar < bars - outroBars;
      const withNinth = inB || moodKey === 'night' || moodKey === 'tape'; // richer color later / for jazzier moods
      const voicing = rhodesVoicing(ct, withNinth);

      // Rhodes chord: struck near the start of the bar, sustained ~ the bar. In
      // the intro the very first chord swells in a touch softer.
      const chordBeat = bar * BEATS_PER_BAR;
      const chordDur = BEATS_PER_BAR * (hr.bool(0.5) ? 1.0 : 0.9);
      const chordVel = bar < introBars ? 0.42 : 0.5;
      for (const m of voicing) {
        events.push({ beat: chordBeat, durBeats: chordDur, midi: m, voice: 'rhodes', role: 'harmony',
          vel: chordVel, tags: ['chord', 'deg:' + deg, 'sect:' + (inB ? 'B' : bar < introBars ? 'intro' : bar >= bars - outroBars ? 'outro' : 'A')] });
      }

      // Bass: root on beat 1 (low), plus one syncopated movement note (fifth or
      // octave) on a weak position in the main groove — weight + a little motion.
      const bassRoot = normInto(ct.root, 33, 45);
      events.push({ beat: chordBeat, durBeats: 1.4, midi: bassRoot, voice: 'bass', role: 'bass', vel: 0.82, tags: ['root', 'deg:' + deg] });
      if (inMain) {
        const moveStep = hr.pick([6, 8, 10]);              // & of 2, beat 3, & of 3
        const moveDeg = hr.bool(0.5) ? 5 : 8;              // fifth or octave above the root
        const moveMidi = normInto(theory.scaleDegree(tonicMidi, scaleName, deg + moveDeg - 1), bassRoot, bassRoot + 12);
        events.push({ beat: chordBeat + moveStep * STEP, durBeats: 1.0, midi: moveMidi, voice: 'bass', role: 'bass', vel: 0.68, tags: ['move'] });
      }

      progression.push(sev.roman);
      chordSpans.push({ startBar: bar, deg, roman: sev.roman, root: theory.midiToNoteName(ct.root), notes: voicing.map((m) => theory.midiToNoteName(m)) });
    }

    // ---- Drums: main section only; a one-bar fill before B and at the end -----
    for (let bar = introBars; bar < bars - outroBars; bar++) {
      const inB = bar >= bHalfStart;
      const kickPat = inB ? kickB : kickA;
      const ghostPat = inB ? ghost : null;               // ghost notes enter in B
      drumBar(events, bar, kickPat, ghostPat, { openHats });
      // A snare fill on the last bar of A (the hand-off into B) and the last main bar.
      const isHandoff = bar === bHalfStart - 1;
      const isLastMain = bar === bars - outroBars - 1;
      if (isHandoff || isLastMain) {
        for (const s of [10, 12, 14]) pushDrum(events, 'snare', bar, s, 0.4 + 0.12 * ((s - 10) / 4), ['fill']);
      }
    }
    // A light hat ride through the outro so it doesn't die abruptly (drums thin,
    // not gone) — closed hats on the beat only.
    for (let bar = bars - outroBars; bar < bars; bar++) {
      for (let s = 0; s < STEPS_PER_BAR; s += 4) pushDrum(events, 'hat', bar, s, 0.34, ['closed', 'outro']);
      pushDrum(events, 'kick', bar, 0, 0.8, ['kick', 'downbeat']);
    }

    // ---- Sparse bell lead in the B section (optional, minimal) ----------------
    if (wantLead) {
      const bellLo = tonicMidi + 24, bellHi = tonicMidi + 38;
      const bellPool = theory.scale(tonicMidi, scaleName, { octaves: 3 }).filter((m) => m >= bellLo && m <= bellHi);
      for (let bar = bHalfStart; bar < bars - outroBars; bar++) {
        if (!lr.bool(0.6)) continue;                       // not every bar — sparse
        const deg = prog[bar % prog.length];
        const ct = chordTones(tonicMidi, scaleName, deg);
        // land on a chord tone, on a weak (offbeat) sixteenth for a laid feel
        const chordPcs = [ct.root, ct.third, ct.fifth, ct.seventh, ct.ninth].map((m) => ((m % 12) + 12) % 12);
        const cands = bellPool.filter((m) => chordPcs.indexOf(((m % 12) + 12) % 12) !== -1);
        const pitch = (cands.length ? lr.pick(cands) : lr.pick(bellPool));
        const step = lr.pick([2, 6, 10, 14]);
        events.push({ beat: bar * BEATS_PER_BAR + step * STEP, durBeats: 1.5, midi: pitch, voice: 'bell', role: 'lead', vel: 0.6, tags: ['lead'] });
      }
    }

    events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    const tonicName = theory.midiToNoteName(tonicMidi).replace(/-?\d+$/, '');
    const selfReport = {
      engine: 'groove-lofi',
      form: 'looped lo-fi groove — intro / A / B (ghosts + lead) / outro',
      key: tonicName + ' ' + mood.label,
      bars,
      progression: prog.map((d, i) => chordSpans[i] ? chordSpans[i].roman : d).slice(0, prog.length),
      progressionRoman: progression.slice(0, prog.length).join(' – '),
      groove: {
        kickA: kickA.join(','), kickB: kickB.join(','),
        backbeat: 'snare on 2 & 4', ghostNotes: ghost.join(','), openHats, lead: wantLead,
      },
      idea: 'A looped lo-fi hip-hop groove: backbeat snare on 2 & 4, a medium-syncopation kick, ghost notes and a sparse bell lead in the B half, warm 7th/9th rhodes chords and a weighty bass. Swing and the laid-back feel are added by the performer.',
    };

    return {
      meta: { seed, tonic: theory.midiToNoteName(tonicMidi), mood: moodKey, scaleName, bars, introBars, outroBars, bHalfStart, beatsPerBar: BEATS_PER_BAR },
      chordSpans, progression, events, selfReport,
    };
  }

  return { composeGroove, MOODS, KICK_PATTERNS, GHOST_PATTERNS, DRUM_MIDI };
});
