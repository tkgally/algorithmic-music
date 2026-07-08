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

  // ---- Moods: key/mode + a BANK of 4-chord jazzy loops (by scale degree) ------
  // Each is a 7-note diatonic scale (so tertian 7th/9th stacking is well-defined)
  // plus SEVERAL four-bar progressions of scale degrees — one is picked per seed,
  // so different seeds get genuinely different chord changes (v0.2: before, the
  // progression was mood-fixed and the upper register sounded the same every seed,
  // the listener's report). All are consonant lo-fi staples: turnarounds and ii–V
  // / i–iv motions that loop seamlessly (the last chord leads back to the first).
  // The tonic is a sensible default the UI can override.
  const MOODS = {
    mellow: { scale: 'major',        label: 'mellow (major 7ths)',   tonic: 'F3',
      progs: [[2, 5, 1, 6], [1, 6, 2, 5], [1, 4, 6, 5], [6, 4, 1, 5]] },        // ii-V-I-vi · I-vi-ii-V · I-IV-vi-V · vi-IV-I-V
    night:  { scale: 'naturalMinor', label: 'night (minor 9ths)',    tonic: 'D3',
      progs: [[1, 4, 6, 5], [1, 6, 3, 7], [1, 4, 5, 1], [1, 7, 6, 7]] },        // i-iv-VI-v · i-VI-III-VII · i-iv-v-i · i-VII-VI-VII
    warm:   { scale: 'dorian',       label: 'warm (dorian groove)',  tonic: 'G3',
      progs: [[1, 4, 1, 5], [1, 4, 5, 4], [1, 7, 4, 1], [1, 2, 4, 1]] },        // dorian vamps around the i–IV color
    tape:   { scale: 'major',        label: 'tape (jazzy turnarounds)', tonic: 'C3',
      progs: [[1, 6, 2, 5], [1, 4, 2, 5], [1, 5, 6, 4], [2, 5, 1, 6]] },        // I-vi-ii-V · I-IV-ii-V · I-V-vi-IV · ii-V-I-vi
  };
  const DEFAULT_MOOD = 'mellow';

  // ---- Comping rhythms (per bar, sixteenth-step + sustain in beats) -----------
  // The rhodes comp used to be ONE blocky chord struck on every downbeat and held
  // a bar, which the listener heard as a simple melody. v0.2 picks a comping
  // rhythm per seed — mostly SUSTAINED and legato (durations ring past the bar so
  // there is no gap between chords) with gentle syncopation, so the comp is a
  // continuous bed, not a stab-per-bar. Steps are 0..15 sixteenths; durations in
  // beats. A soft pad drone (below) carries beat 1 when the comp is pushed off it.
  const COMP_PATTERNS = [
    { id: 'held',       hits: [[0, 4.3]] },                 // one chord, held past the bar (a bed)
    { id: 'charleston', hits: [[0, 2.4], [6, 2.3]] },       // 1 + "& of 2" — the classic soft comp
    { id: 'one-three',  hits: [[0, 2.3], [8, 2.3]] },       // 1 and beat 3, each ringing on
    { id: 'pushed',     hits: [[2, 4.2]] },                 // a single laid stab on the "& of 1" (drone holds beat 1)
  ];

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
  // VOICE-LED rhodes voicing (v0.2). The old voicing normalized each chord tone
  // into a wide two-octave window independently, so consecutive chords jumped
  // register — the listener heard "a chord, then one higher, then one lower," a
  // blocky melody. Instead we keep the comp in a STABLE band: HOLD common tones at
  // their previous pitch (a voice that doesn't move), and place genuinely new tones
  // in the octave nearest the piece's register `center`. Minimal motion between
  // chords is exactly what makes a comp read as a bed rather than a tune
  // (wiki/counterpoint-and-voice-leading.md: "the smoothest voice leading moves
  // each voice the shortest distance"). All tones are chord tones from the mode, so
  // the voicing stays diatonic.
  function voiceLead(ct, withNinth, prev, center) {
    const pcs = [ct.third, ct.fifth, ct.seventh];
    if (withNinth) pcs.push(ct.ninth);
    const prevByPc = {};
    if (prev) for (const m of prev) prevByPc[((m % 12) + 12) % 12] = m;
    const voiced = pcs.map((m) => {
      const pc = ((m % 12) + 12) % 12;
      if (prevByPc[pc] != null) return prevByPc[pc];         // hold a common tone where it was
      let best = pc + 60, bd = Infinity;                     // else nearest octave to the register center
      for (let oct = 4; oct <= 7; oct++) { const cand = pc + 12 * oct; const d = Math.abs(cand - center); if (d < bd) { bd = d; best = cand; } }
      return best;
    });
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

    // v0.2 upper-register variety: pick this seed's PROGRESSION, its COMPING RHYTHM,
    // and the register CENTER the voice-led comp sits in. These are what make one
    // seed's harmony sound different from another's (before, all were mood-fixed).
    const prog = hr.pick(mood.progs);
    const comp = hr.pick(COMP_PATTERNS);
    const voiceCenter = hr.int(64, 70);          // ~E4..A#4 — a stable ~1-octave band for the comp
    const alwaysNinth = hr.bool(0.4);            // some seeds are ninthy throughout, some plainer
    const events = [];
    const progression = [];      // roman numerals, for the self-report
    const chordSpans = [];       // {startBar, deg, roman, notes} for the viz/report
    let prevVoicing = null;      // for voice leading between bars

    // ---- Harmony + drone bed + bass, every bar (the loop rides the progression) --
    for (let bar = 0; bar < bars; bar++) {
      const deg = prog[bar % prog.length];
      const ct = chordTones(tonicMidi, scaleName, deg);
      const sev = theory.seventh(tonicMidi, scaleName, deg);
      const inMain = bar >= introBars && bar < bars - outroBars;
      const inB = bar >= bHalfStart && bar < bars - outroBars;
      const withNinth = alwaysNinth || inB;                 // ninth adds color; some seeds always, else in the B half
      const voicing = voiceLead(ct, withNinth, prevVoicing, voiceCenter);
      prevVoicing = voicing;
      const chordBeat = bar * BEATS_PER_BAR;
      const sect = inB ? 'B' : bar < introBars ? 'intro' : bar >= bars - outroBars ? 'outro' : 'A';

      // DRONE BED: a soft, dark, sustained root+fifth in the low-mid register,
      // held across the bar (ringing into the next) — the continuous lo-fi bed the
      // listener missed. It changes with the harmony but is voice-quiet, so it reads
      // as atmosphere under the comp, not a part. On the `pad` voice (slow attack).
      const droneRoot = normInto(ct.root, 46, 55);
      const droneFifth = normInto(ct.fifth, droneRoot + 1, droneRoot + 10);
      for (const m of [droneRoot, droneFifth]) {
        events.push({ beat: chordBeat, durBeats: BEATS_PER_BAR + 1, midi: m, voice: 'pad', role: 'pad',
          vel: 0.22, tags: ['drone', 'deg:' + deg, 'sect:' + sect] });
      }

      // Rhodes comp: struck per the seed's comping rhythm (mostly sustained, soft,
      // legato) rather than one blocky stab per bar; voice-led so it stays in a
      // stable band. Softer than v0.1 so it supports the groove instead of leading.
      const compVel = bar < introBars ? 0.34 : 0.40;
      for (const [step, dur] of comp.hits) {
        for (const m of voicing) {
          events.push({ beat: chordBeat + step * STEP, durBeats: dur, midi: m, voice: 'rhodes', role: 'harmony',
            vel: compVel, tags: ['chord', 'deg:' + deg, 'sect:' + sect] });
        }
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
        comping: comp.id, ninths: alwaysNinth ? 'throughout' : 'B section',
      },
      idea: 'A looped lo-fi hip-hop groove: backbeat snare on 2 & 4, a medium-syncopation kick, ghost notes and a sparse bell lead in the B half, a voice-led 7th/9th rhodes comp (a ' + comp.id + ' rhythm) over a soft sustained drone bed and a weighty bass. Swing and the laid-back feel are added by the performer.',
    };

    return {
      meta: { seed, tonic: theory.midiToNoteName(tonicMidi), mood: moodKey, scaleName, bars, introBars, outroBars, bHalfStart, beatsPerBar: BEATS_PER_BAR },
      chordSpans, progression, events, selfReport,
    };
  }

  return { composeGroove, MOODS, KICK_PATTERNS, GHOST_PATTERNS, DRUM_MIDI };
});
