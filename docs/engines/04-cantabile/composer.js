/*
 * expressive-chamber — the COMPOSER for Engine 04 ("Cantabile"), a small
 * expressive ensemble whose whole reason to exist is the singing of individual
 * notes. Where tonal-classical is about functional syntax and groove-lofi is
 * about the beat, this engine is about EXPRESSION — and expression only reads if
 * the composition gives it structure to express (wiki/expressive-performance.md:
 * "expression clarifies musical structure"). So this composer's job is to build a
 * clear, lyrical, MODAL dramatic arc with strongly-weighted structural moments for
 * the performer's expression pass to lean into.
 *
 * Original genre, not a pastiche of any one tradition — it borrows the small-group
 * intimacy and per-note expressivity of the string quartet, the jazz combo, and
 * the rock lead trio (the instruments Tom named) without imitating their sound or
 * their forms. The music is modal (no functional V-I cadences — those belong to
 * Engine 01), phrase-first, motivically economical, and shaped as a single tension
 * arc that RISES to a climax and RESOLVES with a real modal ending (R6 — engines
 * must be able to finish; wiki/form-and-structure.md, wiki/composition-craft.md).
 *
 * FORM (a dramatic arc, ~40 bars):
 *   intro     germ motif stated alone/sparse, low intensity — sets the mode
 *   theme A   the lead sings the main melody over the modal bed (medium)
 *   dialogue  a second expressive voice answers — call-and-response (rising)
 *   rise      motif fragmented + sequenced up, harmony tightens (high)
 *   climax    the emotional peak — highest register, brightest/grittiest, widest
 *             vibrato; both voices together (max)
 *   return A' the theme returns, transformed and freer, tension falling
 *   coda      a modal close — the lead holds a final swelling, blooming note
 *
 * OUTPUT (beat-based Note schema, wiki/engine-architecture.md): notes carry a
 * musical ROLE, not a timbre — the ENGINE assigns which of the four expressive
 * instruments (aria/reed/wire/glass) sings `lead`/`counter`/`inner` from the seed
 * and the user's selection, and which support voices play `comp`/`bass`. Each note
 * also carries a structural `weight` (0..1) — how much expression it has earned by
 * its place in the phrase and the arc — which the performer scales by the user's
 * expression sliders. That is how "expression realized in relation to the overall
 * structure" (the brief) is made concrete and testable.
 *
 * Pure + deterministic from the seed (no Web Audio, no Math.random, no globals).
 * Dual-format (UMD-lite): require() in Node, window.AM.composers.expressiveChamber
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
    AM.composers.expressiveChamber = factory(AM.theory, AM.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (theory, rng) {
  'use strict';

  const { Rng } = rng;
  const BEATS_PER_BAR = 4;

  // Expressive modal "colors". Each is a 7-note scale plus the degrees (1-based)
  // usable as chord roots (excluding the mode's half-diminished degree so a long
  // chord is never built on it), the characteristic COLOR degree the climax leans
  // on, and whether the mode reads bright or shadowed. Chosen for lyrical,
  // non-functional harmony (wiki/tuning-and-scales.md, wiki/harmony.md modal set).
  const MODES = {
    dorian:       { scale: 'dorian',        label: 'dorian (wistful, hopeful)',   chordDegs: [1, 2, 4, 5, 7], color: 4, bright: 0.55 },
    aeolian:      { scale: 'naturalMinor',  label: 'aeolian (shadowed)',          chordDegs: [1, 3, 4, 5, 6], color: 6, bright: 0.30 },
    lydian:       { scale: 'lydian',        label: 'lydian (luminous)',           chordDegs: [1, 2, 3, 5, 6], color: 2, bright: 0.85 },
    mixolydian:   { scale: 'mixolydian',    label: 'mixolydian (warm, open)',     chordDegs: [1, 2, 4, 5, 7], color: 7, bright: 0.65 },
    phrygian:     { scale: 'phrygian',      label: 'phrygian (dark, exotic)',     chordDegs: [1, 3, 4, 6, 7], color: 2, bright: 0.20 },
    harmonicMinor:{ scale: 'harmonicMinor', label: 'harmonic minor (yearning)',   chordDegs: [1, 4, 5, 6],    color: 6, bright: 0.35 },
  };
  const MODE_KEYS = Object.keys(MODES);

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function pc(m) { return ((m % 12) + 12) % 12; }

  // Snap `target` MIDI to the nearest member of a MIDI pool.
  function snap(pool, target) {
    let best = pool[0], bd = Infinity;
    for (const m of pool) { const d = Math.abs(m - target); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  // Nearest chord tone (pitch-class match) to `target`, else nearest scale tone.
  function nearestChordTone(scalePool, chordPcs, target) {
    let best = null, bd = Infinity;
    for (const m of scalePool) {
      if (!chordPcs.has(pc(m))) continue;
      const d = Math.abs(m - target); if (d < bd) { bd = d; best = m; }
    }
    return best == null ? snap(scalePool, target) : best;
  }

  // ---- The germ MOTIF -------------------------------------------------------
  // A short, recognizable cell = a rhythm (beat durations) + an opening contour
  // (scale-step deltas). Motivic economy (wiki/composition-craft.md): almost every
  // phrase begins from a transform of this cell, so the piece hangs together.
  function makeMotif(r) {
    // rhythm: 3-5 notes filling ~4 beats, with a longer final note (a gesture end)
    const rhythms = [
      [1, 1, 2],            // short-short-long
      [0.5, 0.5, 1, 2],     // pickup pair into a long
      [1, 0.5, 0.5, 2],
      [2, 1, 1],            // long-short-short
      [1, 1, 1, 1],
      [0.5, 0.5, 0.5, 0.5, 2],
    ];
    const durs = r.pick(rhythms).slice();
    // opening contour: small steps with one characteristic move
    const shapes = [
      [1, 1], [2, -1], [-1, 2], [1, 2], [2, 1], [-2, 1], [1, -1, 2], [3, -1],
    ];
    const head = r.pick(shapes).slice();
    return { durs, head };
  }

  // ---- Form + modal harmony -------------------------------------------------
  function buildForm(r, tonicMidi, modeKey) {
    const mode = MODES[modeKey];
    const scaleName = mode.scale;
    const diat = theory.diatonicChords(tonicMidi, scaleName);
    const usable = mode.chordDegs;

    // A section's chord plan: one root degree per bar, a modal walk that starts
    // and ends near the tonic and favors step/third motion (non-cadential).
    function walk(bars, startDeg, endDeg, rr) {
      const seq = [startDeg];
      for (let b = 1; b < bars; b++) {
        const cur = seq[b - 1];
        // candidates: usable degrees weighted toward step/third distance from cur
        const cand = usable.filter((d) => d !== cur);
        const w = cand.map((d) => {
          const dist = Math.min((d - cur + 7) % 7, (cur - d + 7) % 7);
          return dist === 1 ? 0.28 : dist === 2 ? 0.4 : dist === 3 ? 0.22 : 0.12;
        });
        // as we near the end, bias toward endDeg
        if (b >= bars - 2 && endDeg != null) { const i = cand.indexOf(endDeg); if (i >= 0) w[i] += 1.2; }
        seq.push(rr.weighted(cand, w));
      }
      if (endDeg != null) seq[bars - 1] = endDeg;
      return seq;
    }

    const hr = r.stream('harmony');
    const totalBarsTarget = r.int(38, 42);
    // proportion the sections to hit ~totalBarsTarget
    const plan = [
      { id: 'intro',    role: 'intro',    bars: 3,  intensity: 0.30 },
      { id: 'theme',    role: 'theme',    bars: 8,  intensity: 0.55 },
      { id: 'dialogue', role: 'dialogue', bars: 8,  intensity: 0.70 },
      { id: 'rise',     role: 'rise',     bars: 6,  intensity: 0.85 },
      { id: 'climax',   role: 'climax',   bars: 4,  intensity: 1.00 },
      { id: 'return',   role: 'return',   bars: 8,  intensity: 0.58 },
      { id: 'coda',     role: 'coda',     bars: 3,  intensity: 0.34 },
    ];
    // gently vary a couple of section lengths by seed (keep the arc shape)
    plan[1].bars += hr.int(0, 2);      // theme 8-10
    plan[2].bars += hr.int(0, 2);      // dialogue 8-10
    plan[5].bars = plan[1].bars;       // return mirrors theme length

    let startBar = 0;
    for (const s of plan) {
      let startDeg = 1, endDeg = 1;
      if (s.id === 'dialogue') { startDeg = hr.pick(usable.filter((d) => d !== 1)); endDeg = mode.color; }
      else if (s.id === 'rise') { startDeg = mode.color; endDeg = 5 <= 7 && usable.indexOf(5) >= 0 ? 5 : usable[usable.length - 1]; }
      else if (s.id === 'climax') { startDeg = mode.color; endDeg = 1; }
      s.harmonyDegs = walk(s.bars, startDeg, endDeg, hr);
      // climax bar 1 gets the color chord for its lift
      if (s.id === 'climax') s.harmonyDegs[0] = mode.color;
      s.startBar = startBar; startBar += s.bars;
    }
    const bars = startBar;

    // Precompute a per-bar chord object (root midi in a mid register + pcs + roman)
    const chordByBar = [];
    for (const s of plan) {
      for (let i = 0; i < s.bars; i++) {
        const deg = s.harmonyDegs[i];
        const c = diat[deg - 1];
        const rootMidi = theory.scaleDegree(tonicMidi, scaleName, deg);
        chordByBar.push({ bar: s.startBar + i, deg, roman: c.roman, pcs: new Set(c.seventhNotes.map(pc)), triadPcs: new Set(c.notes.map(pc)), rootMidi, section: s.id, intensity: s.intensity });
      }
    }
    return { plan, bars, scaleName, diat, chordByBar, mode };
  }

  // ---- Melody: motif-driven, phrase-first, structurally weighted ------------
  // Realize one phrase (a run of bars) of the LEAD line. Returns note objects with
  // beat/durBeats/midi/weight/tags. Strong beats favor chord tones; the phrase has
  // one apex and lands on a long goal (chord) tone; the opening uses the motif head.
  function makePhrase(ctx) {
    const { r, motif, form, tonicMidi, startBar, bars, arch, lo, hi, apexBias, sectionId, sectionIntensity, transform } = ctx;
    const { scaleName, chordByBar } = form;
    const scalePool = theory.scale(tonicMidi, scaleName, { octaves: 4 }).filter((m) => m >= lo - 2 && m <= hi + 2);
    const notes = [];
    const totalBeats = bars * BEATS_PER_BAR;

    // choose the starting scale index near a chord tone in the lower-mid of the range
    const startTargetMidi = clamp(lo + (hi - lo) * (0.25 + 0.2 * r.float()), lo, hi);
    let cur = nearestChordTone(scalePool, chordByBar[startBar].pcs, startTargetMidi);
    let curIdx = scalePool.indexOf(cur);
    if (curIdx < 0) { cur = snap(scalePool, startTargetMidi); curIdx = scalePool.indexOf(cur); }

    // per-bar rhythm: bar 0 uses the motif rhythm; others vary around it
    let beat = 0, motifPos = 0, noteNo = 0;
    let lastDelta = 0;
    const apexBeat = totalBeats * clamp(apexBias + r.float(-0.08, 0.08), 0.35, 0.9);
    let apexMidi = -1, apexRef = null;

    while (beat < totalBeats - 1e-6) {
      const bar = startBar + Math.floor(beat / BEATS_PER_BAR);
      const chord = chordByBar[Math.min(bar, chordByBar.length - 1)];
      const inBar = beat - Math.floor(beat / BEATS_PER_BAR) * BEATS_PER_BAR;
      const strong = Math.abs(inBar - 0) < 1e-6 || Math.abs(inBar - 2) < 1e-6;

      // duration for this note
      let dur;
      const beatsLeft = totalBeats - beat;
      if (beatsLeft <= 2.5) { dur = beatsLeft; }            // liquidate: one long goal note
      else if (motifPos < motif.durs.length) { dur = motif.durs[motifPos]; motifPos++; }
      else { dur = r.pick([1, 1, 0.5, 2, 1.5]); }
      dur = Math.min(dur, beatsLeft);
      if (dur < 0.25) dur = 0.25;

      // pitch: opening follows the (transformed) motif head; then constrained walk
      let target;
      const isLast = beatsLeft - dur <= 1e-6;
      if (isLast) {
        // goal tone: a chord tone, prefer root/third near mid register
        target = nearestChordTone(scalePool, chord.triadPcs, clamp(cur, lo, hi - 3));
      } else if (noteNo < motif.head.length + 1 && noteNo >= 1) {
        let step = motif.head[noteNo - 1] || 0;
        if (transform === 'invert') step = -step;
        if (transform === 'up2') step += 0;                 // (sequence handled via lo/hi shift)
        curIdx = clamp(curIdx + step, 0, scalePool.length - 1);
        target = scalePool[curIdx];
      } else {
        // constrained walk: mostly steps, occasional third, post-leap reversal,
        // pull toward the apex before apexBeat and down after
        let step;
        const towardApex = beat < apexBeat;
        if (Math.abs(lastDelta) >= 2) step = lastDelta > 0 ? -1 : 1;      // reverse after a leap
        else {
          const rr = r.float();
          const leap = rr < 0.16;
          const mag = leap ? 2 : 1;
          let dir = towardApex ? 1 : -1;
          if (r.float() < 0.30) dir = -dir;                                // not monotonic
          step = dir * mag;
        }
        curIdx = clamp(curIdx + step, 0, scalePool.length - 1);
        let cand = scalePool[curIdx];
        if (strong) cand = nearestChordTone(scalePool, chord.pcs, cand);   // chord tone on strong beats
        target = cand;
      }
      lastDelta = (scalePool.indexOf(target) - curIdx) || lastDelta;
      cur = target; curIdx = Math.max(0, scalePool.indexOf(cur));

      const rec = { beat: startBar * BEATS_PER_BAR + beat, durBeats: dur, midi: cur, voice: 'lead', role: 'lead', tags: ['sect:' + sectionId] };
      notes.push(rec);
      if (cur > apexMidi) { apexMidi = cur; apexRef = rec; }
      beat += dur; noteNo++;
    }
    if (apexRef) apexRef.tags.push('apex');

    // structural weights: metric + length + phrase-arch position + apex/goal
    const phraseStartBeat = startBar * BEATS_PER_BAR;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const rel = (n.beat - phraseStartBeat) / totalBeats;
      const inBar = ((n.beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
      const metric = (Math.abs(inBar) < 1e-6) ? 1 : (Math.abs(inBar - 2) < 1e-6 ? 0.6 : 0.3);
      const lengthW = clamp(n.durBeats / 2, 0, 1);
      const archW = Math.sin(Math.PI * clamp(rel, 0, 1));                  // rise to phrase middle
      let w = 0.26 + 0.26 * metric + 0.20 * lengthW + 0.16 * archW;
      if (n.tags.includes('apex')) w += 0.22;
      if (i === notes.length - 1) { w += 0.16; n.tags.push('goal'); }
      n.weight = clamp(w, 0, 1);
    }
    return { notes, apexMidi, apexRef };
  }

  function compose(opts) {
    opts = opts || {};
    const seed = opts.seed == null ? 'cantabile-1' : opts.seed;
    const r = new Rng(seed);
    const modeKey = MODES[opts.mode] ? opts.mode : MODE_KEYS[r.int(0, MODE_KEYS.length - 1)];
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi('D4') : opts.tonic);

    const form = buildForm(r, tonicMidi, modeKey);
    const { plan, bars, scaleName, chordByBar, mode } = form;
    const motif = makeMotif(r.stream('motif'));

    const notes = [];
    const scalePoolWide = theory.scale(tonicMidi, scaleName, { octaves: 5 });

    // registers
    const leadLo = tonicMidi + 2, leadHi = tonicMidi + 14;    // singing octave-ish
    const climaxHi = tonicMidi + 19;

    const mr = r.stream('melody');

    // Helper: emit a lead phrase over [startBar, startBar+bars)
    function leadPhrase(startBar, bars, sectionId, intensity, arch, hiBoost, transform) {
      const ph = makePhrase({ r: mr, motif, form, tonicMidi,
        startBar, bars, arch, lo: leadLo, hi: leadHi + (hiBoost || 0),
        apexBias: arch, sectionId, sectionIntensity: intensity, transform });
      for (const n of ph.notes) notes.push(n);
      return ph;
    }

    // ---- Melodic plan across the arc --------------------------------------
    // Each section is realized from the motif; the counter voice trades and
    // doubles at set moments (call-and-response, wiki/melody.md motivic dialogue).
    const sec = {}; for (const s of plan) sec[s.id] = s;

    // INTRO: a spare 2-3 note preview of the motif head, held, low intensity.
    (function intro() {
      const s = sec.intro;
      const base = nearestChordTone(scalePoolWide.filter((m) => m >= leadLo && m <= leadHi), chordByBar[s.startBar].triadPcs, tonicMidi + 5);
      let b = s.startBar * BEATS_PER_BAR + 1;                 // enter after a breath
      let idx = scalePoolWide.indexOf(base);
      const steps = [0].concat(motif.head.slice(0, 2));
      const dursI = [2, 2, s.bars * BEATS_PER_BAR - 5];
      for (let k = 0; k < steps.length; k++) {
        idx = clamp(idx + (k === 0 ? 0 : steps[k]), 0, scalePoolWide.length - 1);
        const m = scalePoolWide[idx];
        const dur = Math.max(1.5, dursI[k]);
        notes.push({ beat: b, durBeats: dur, midi: m, voice: 'lead', role: 'lead', weight: 0.4 + 0.15 * k, tags: ['sect:intro', 'motif', k === steps.length - 1 ? 'goal' : 'phrase'] });
        b += dur;
      }
    })();

    // THEME: two phrases; the lead sings, counter mostly rests (occasional tail).
    (function theme() {
      const s = sec.theme;
      const half = Math.floor(s.bars / 2);
      leadPhrase(s.startBar, half, 'theme', s.intensity, 0.55, 0, 'identity');
      const p2 = leadPhrase(s.startBar + half, s.bars - half, 'theme', s.intensity, 0.62, 0, 'identity');
      // counter answers the very end of the theme with a soft echo of the goal
      if (p2.apexRef) {
        notes.push({ beat: (s.startBar + s.bars) * BEATS_PER_BAR - 2, durBeats: 2, midi: snap(scalePoolWide.filter((m) => m >= leadLo - 7 && m <= leadHi), p2.apexRef.midi - 5),
          voice: 'counter', role: 'counter', weight: 0.5, tags: ['sect:theme', 'echo'] });
      }
    })();

    // DIALOGUE: lead and counter TRADE two-bar phrases (call-and-response).
    (function dialogue() {
      const s = sec.dialogue;
      const nSub = Math.floor(s.bars / 2);
      for (let i = 0; i < nSub; i++) {
        const role = i % 2 === 0 ? 'lead' : 'counter';
        const ph = makePhrase({ r: mr, motif, form, tonicMidi,
          startBar: s.startBar + i * 2, bars: 2, arch: 0.6,
          lo: role === 'lead' ? leadLo : leadLo - 5, hi: role === 'lead' ? leadHi : leadHi - 4,
          apexBias: 0.6, sectionId: 'dialogue', sectionIntensity: s.intensity, transform: i % 3 === 2 ? 'invert' : 'identity' });
        for (const n of ph.notes) { n.voice = role; n.role = role; n.tags.push('trade'); notes.push(n); }
      }
    })();

    // RISE: fragmented motif, sequenced upward, both voices thickening.
    (function rise() {
      const s = sec.rise;
      const ph = leadPhrase(s.startBar, s.bars, 'rise', s.intensity, 0.8, 3, 'identity');
      // counter shadows a sixth below the lead's longer notes for momentum
      for (const n of ph.notes) {
        if (n.durBeats >= 1) {
          const cm = snap(scalePoolWide.filter((m) => m >= leadLo - 9 && m <= leadHi), n.midi - 9);
          notes.push({ beat: n.beat, durBeats: n.durBeats, midi: cm, voice: 'counter', role: 'counter', weight: clamp(n.weight - 0.15, 0.2, 0.9), tags: ['sect:rise', 'shadow'] });
        }
      }
    })();

    // CLIMAX: the peak — lead at the top, counter a third/sixth below (both sing),
    // the highest weights and a 'climax' tag so the performer maxes expression.
    (function climax() {
      const s = sec.climax;
      const ph = leadPhrase(s.startBar, s.bars, 'climax', s.intensity, 0.75, climaxHi - leadHi, 'identity');
      let peak = ph.apexRef;
      for (const n of ph.notes) {
        n.tags.push('climax'); n.weight = clamp(n.weight + 0.18, 0, 1);
        // counter harmonizes a consonant sixth below on sustained notes
        if (n.durBeats >= 1) {
          const cm = snap(scalePoolWide.filter((m) => m >= leadLo - 6 && m <= climaxHi - 3), n.midi - 9);
          notes.push({ beat: n.beat, durBeats: n.durBeats, midi: cm, voice: 'counter', role: 'counter', weight: clamp(n.weight - 0.08, 0.3, 1), tags: ['sect:climax', 'climax', 'harmony'] });
        }
      }
      if (peak) peak.tags.push('peak');
    })();

    // RETURN A': the theme returns, ornamented/freer, falling intensity.
    (function ret() {
      const s = sec.return;
      const half = Math.floor(s.bars / 2);
      leadPhrase(s.startBar, half, 'return', s.intensity, 0.5, 0, 'identity');
      leadPhrase(s.startBar + half, s.bars - half, 'return', s.intensity, 0.45, 0, 'identity');
    })();

    // CODA: a real modal close — one long, swelling, blooming final tonic note.
    (function coda() {
      const s = sec.coda;
      const tonicPc = pc(tonicMidi);
      const tonicInRange = scalePoolWide.filter((m) => m >= leadLo && m <= leadHi && pc(m) === tonicPc);
      const tonicTone = tonicInRange.length ? snap(tonicInRange, tonicMidi + 12) : snap(scalePoolWide.filter((m) => m >= leadLo && m <= leadHi), tonicMidi + 12);
      // a short stepwise descent onto the held tonic (a modal close), then the hold
      const approach = [snap(scalePoolWide, tonicTone + 3), snap(scalePoolWide, tonicTone + 2), tonicTone];
      let b = s.startBar * BEATS_PER_BAR;
      const dursC = [1.5, 1.5, s.bars * BEATS_PER_BAR - 3];
      for (let k = 0; k < approach.length; k++) {
        const isFinal = k === approach.length - 1;
        notes.push({ beat: b, durBeats: Math.max(1, dursC[k]), midi: approach[k], voice: 'lead', role: 'lead',
          weight: isFinal ? 1 : 0.55, tags: ['sect:coda', isFinal ? 'ending' : 'phrase', isFinal ? 'goal' : 'approach'] });
        b += Math.max(1, dursC[k]);
      }
    })();

    // ---- Harmonic bed: comp (chords) + inner (sustained color) + bass -------
    const cr = r.stream('comp');
    const compArp = cr.bool(0.5);       // some pieces arpeggiate the comp, some sustain
    for (const s of plan) {
      for (let i = 0; i < s.bars; i++) {
        const bar = s.startBar + i;
        const chord = chordByBar[bar];
        const c = form.diat[chord.deg - 1];
        const barBeat = bar * BEATS_PER_BAR;
        const sparse = s.id === 'intro' || s.id === 'coda';
        // comp voicing in a mid register (below the lead)
        const voicing = c.seventhNotes.map((m) => {
          let x = m; while (x < tonicMidi - 2) x += 12; while (x > tonicMidi + 9) x -= 12; return x;
        }).sort((a, b) => a - b);
        if (compArp && !sparse) {
          // gentle arpeggio (pluck) across the bar
          const pat = [0, 1, 2, 3].filter((k) => k < voicing.length);
          const step = BEATS_PER_BAR / Math.max(1, pat.length);
          pat.forEach((k, j) => {
            notes.push({ beat: barBeat + j * step, durBeats: step * 1.1, midi: voicing[k % voicing.length], voice: 'comp', role: 'comp', weight: 0.2, tags: ['sect:' + s.id, 'arp'] });
          });
        } else {
          // sustained chord (held bar), softer at edges
          for (const m of voicing.slice(0, sparse ? 2 : 4)) {
            notes.push({ beat: barBeat + (sparse ? 0.5 : 0), durBeats: BEATS_PER_BAR - (sparse ? 0.5 : 0.1), midi: m, voice: 'comp', role: 'comp', weight: 0.18, tags: ['sect:' + s.id, 'pad'] });
          }
        }
        // inner sustained color voice (a third+fifth), only in the fuller sections,
        // rendered by a third expressive timbre as a slow "breathing" pad.
        if (s.id === 'theme' || s.id === 'rise' || s.id === 'climax' || s.id === 'return') {
          const inner = snap(theory.scale(tonicMidi, scaleName, { octaves: 4 }).filter((m) => m >= tonicMidi + 3 && m <= tonicMidi + 12), chord.rootMidi + 7);
          notes.push({ beat: barBeat, durBeats: BEATS_PER_BAR, midi: inner, voice: 'inner', role: 'inner', weight: 0.3 + 0.3 * s.intensity, tags: ['sect:' + s.id, 'inner'] });
        }
        // bass: root on beat 1; a passing approach on beat 3 in busier sections
        const bassRoot = chord.rootMidi - 12 - (chord.rootMidi - 12 > tonicMidi - 12 ? 12 : 0);
        const bRoot = clamp(bassRoot, tonicMidi - 26, tonicMidi - 5);
        notes.push({ beat: barBeat, durBeats: (s.id === 'rise' || s.id === 'climax') ? 2 : BEATS_PER_BAR, midi: bRoot, voice: 'bass', role: 'bass', weight: 0.3, tags: ['sect:' + s.id, 'root'] });
        if (s.id === 'rise' || s.id === 'climax') {
          const nextBar = chordByBar[Math.min(bar + 1, chordByBar.length - 1)];
          const approach = snap(theory.scale(tonicMidi, scaleName, { octaves: 4 }).map((m) => m - 12).filter((m) => m >= tonicMidi - 26 && m <= tonicMidi - 4), (bRoot + nextBar.rootMidi - 12) / 2);
          notes.push({ beat: barBeat + 2, durBeats: 2, midi: approach, voice: 'bass', role: 'bass', weight: 0.28, tags: ['sect:' + s.id, 'walk'] });
        }
      }
    }

    notes.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    // ---- self-report -------------------------------------------------------
    const tonicName = theory.midiToNoteName(tonicMidi).replace(/-?\d+$/, '');
    const sectionReport = plan.map((s) => ({
      role: s.role, bars: s.bars, intensity: s.intensity,
      harmony: s.harmonyDegs.map((d) => form.diat[d - 1].roman).join(' '),
    }));
    const selfReport = {
      engine: 'expressive-chamber',
      form: 'expressive modal arc: intro · theme · dialogue · rise · climax · return · coda',
      key: tonicName + ' ' + mode.label,
      mode: modeKey,
      bars,
      motif: 'rhythm ' + motif.durs.join('-') + ' beats, opening ' + motif.head.map((s) => (s > 0 ? '+' : '') + s).join(' '),
      climax: 'bar ' + (sec.climax.startBar + 1) + ' on the ' + form.diat[mode.color - 1].roman + ' color chord — highest register, widest expression',
      ending: 'a modal close: the lead holds a long swelling tonic (no functional cadence)',
      sections: sectionReport,
      idea: 'A small ensemble that SINGS every note. Expression (scoops, blooming vibrato, swells, grit) is scaled by each note’s structural weight, so the performance intensifies toward the climax and resolves into the coda.',
    };

    return { meta: { seed, tonic: theory.midiToNoteName(tonicMidi), mode: modeKey, scaleName, bars, beatsPerBar: BEATS_PER_BAR }, sections: plan, notes, selfReport };
  }

  return { compose, MODES, MODE_KEYS, makeMotif };
});
