/*
 * tonal-classical engine — Performer + Synthesizer wiring + Scheduler.
 *
 * The launch public engine (wiki/project-roadmap.md Phase 2). It takes the
 * whole-piece score from the composer (composePiece — a rounded ternary with an
 * intro and a real ending) and runs the rest of the engine-architecture pipeline
 * (wiki/engine-architecture.md):
 *
 *   composer (beats) -> PERFORMER (beats->seconds, dynamics, ritard) ->
 *   SYNTHESIZER (synth voices -> fx master chain) -> SCHEDULER (lookahead) / offline render.
 *
 * renderPlan() is PURE (no Web Audio) — it turns the symbolic score into timed,
 * dynamically-shaped performance events — so it is unit-testable headless in Node
 * and is the single source of timing/dynamics for both live playback and the
 * offline render-and-measure validation. The audio functions (buildGraph, play,
 * renderOffline) only run in a browser / OfflineAudioContext.
 *
 * v0.2 (feedback pass — wiki/expressive-performance.md, "minimum viable
 * humanization"): the performer now applies a real expressive layer instead of
 * per-note white jitter (which the page calls the "drunk drummer" tell):
 *   - a NESTED PHRASE ARCH on tempo — each 4-bar phrase's edges are a little
 *     slower than its middle — over a square-root FINAL RITARDANDO;
 *   - a coupled DYNAMIC ARCH (swell to mid-phrase, ease at the cadence) plus
 *     HIGH-LOUD (higher notes a touch louder), softened metric accents, and
 *     melody emphasis;
 *   - STRUCTURED ARTICULATION (melody détaché, repeated notes separated, cadence
 *     notes left to ring) with a subtle CHORD ROLL;
 *   - a CORRELATED timing/dynamics residual (an AR(1) random walk per voice),
 *     never i.i.d. per-note noise.
 * The default tempo is raised (a listener found 92 too slow).
 *
 * Dual-format (UMD-lite): require() in Node (exposes the pure planner + the
 * pure helpers), window.AM.engines.tonalClassical via <script src> in a file://
 * browser, where window.AM.{composers,theory,transport,synth,fx} are already set.
 */
;(function (global, factory) {
  'use strict';
  let deps;
  if (typeof module === 'object' && module.exports) {
    deps = {
      composer: require('../../composers/tonal-phrase.js'),
      theory: require('../../lib/theory.js'),
      transport: require('../../lib/transport.js'),
      synth: null, fx: null, // browser-only; not needed for renderPlan
    };
    module.exports = factory(deps);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.engines = AM.engines || {};
    AM.engines.tonalClassical = factory({
      composer: AM.composers.tonalPhrase, theory: AM.theory,
      transport: AM.transport, synth: AM.synth, fx: AM.fx,
    });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { composer, theory, transport, synth, fx } = deps;
  const NAME = 'tonal-classical';
  const VERSION = '0.2.0';
  const DEFAULTS = { bpm: 110, mode: 'major', tonic: 'C4', reverb: 0.24, volume: 0.6 };
  const BEATS_PER_BAR = 4;
  const PHRASE_BEATS = 16; // a 4-bar phrase — the unit of the tempo/dynamic arch

  // Deterministic hash-based value noise in [-1,1] (the innovation source for the
  // correlated residual walks; kept local so the pure planner has no rng wiring).
  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function hashStr(s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }

  // Which phrase-arch segment contains `beat`? Segments are [startBeat, endBeat).
  function segmentAt(segments, beat) {
    for (let i = 0; i < segments.length; i++) if (beat >= segments[i][0] && beat < segments[i][1]) return segments[i];
    return segments.length ? segments[segments.length - 1] : [0, PHRASE_BEATS];
  }

  // Build a beat->seconds map (in 1/4-beat steps) with two expressive tempo
  // effects (wiki/expressive-performance.md "Phrase arch" + "Final ritardando"):
  //   - a nested PHRASE ARCH: within each segment, edges are ~archDepth slower
  //     than the middle (spb multiplier 1 + archDepth·cos(2π·p));
  //   - a FINAL RITARDANDO over the last ritBeats: a square-root-shaped slowing
  //     down to ~ritSlow× the base seconds-per-beat (the stopping-runner model).
  // `opts.segments` (phrase boundaries in beats) defaults to a 16-beat tiling so
  // the function is still meaningful when called standalone (tests).
  function makeBeatToSec(bpm, totalBeats, leadIn, opts) {
    opts = opts || {};
    const spb0 = 60 / bpm, step = 0.25;
    const archDepth = opts.archDepth == null ? 0.06 : opts.archDepth;
    const ritBeats = opts.ritBeats == null ? 8 : opts.ritBeats;
    const ritSlow = opts.ritSlow == null ? 1.35 : opts.ritSlow;
    let segments = opts.segments;
    if (!segments || !segments.length) {
      segments = [];
      for (let b = 0; b < totalBeats; b += PHRASE_BEATS) segments.push([b, Math.min(totalBeats, b + PHRASE_BEATS)]);
      if (!segments.length) segments.push([0, Math.max(step, totalBeats)]);
    }
    const ritStart = totalBeats - ritBeats;
    const map = [leadIn];
    let t = leadIn;
    for (let b = step; b <= totalBeats + step; b += step) {
      const seg = segmentAt(segments, b - step);
      const span = Math.max(step, seg[1] - seg[0]);
      const p = Math.min(1, Math.max(0, (b - step - seg[0]) / span));
      const arch = 1 + archDepth * Math.cos(2 * Math.PI * p);
      let rit = 1;
      if (b > ritStart && totalBeats > ritStart) {
        const frac = Math.min(1, (b - ritStart) / (totalBeats - ritStart));
        rit = 1 + (ritSlow - 1) * Math.sqrt(frac);   // sqrt curve: eases into the stop
      }
      t += spb0 * arch * rit * step;
      map.push(t);
    }
    return (beat) => map[Math.min(Math.max(0, Math.round(beat / step)), map.length - 1)];
  }

  // Phrase segments (in beats) from the composed sections: each section split into
  // <=4-bar phrases so the arch aligns to real phrase boundaries.
  function phraseSegments(sections) {
    const segs = [];
    for (const s of sections) {
      const totalPhr = Math.max(1, Math.ceil(s.bars / 4));
      const barsPer = s.bars / totalPhr;
      for (let i = 0; i < totalPhr; i++) {
        segs.push([Math.round((s.startBar + i * barsPer) * BEATS_PER_BAR),
                   Math.round((s.startBar + (i + 1) * barsPer) * BEATS_PER_BAR)]);
      }
    }
    return segs.length ? segs : [[0, PHRASE_BEATS]];
  }

  // ---- PERFORMER (pure): score -> timed, dynamically-shaped events ----------
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const piece = composer.composePiece({ seed: opts.seed, mode: opts.mode, tonic: opts.tonic });
    const bpm = opts.bpm;
    const totalBeats = piece.meta.bars * BEATS_PER_BAR;
    const leadIn = 0.3;
    const segments = phraseSegments(piece.sections);
    const beatToSec = makeBeatToSec(bpm, totalBeats, leadIn, { segments, ritBeats: 8, ritSlow: 1.35, archDepth: 0.06 });

    const intensity = {};
    for (const s of piece.sections) intensity[s.role] = s.intensity;
    const voiceBase = { melody: 1.0, chord: 0.46, bass: 0.8 };
    const seedNum = hashStr(opts.seed);

    // Melody reference register (for high-loud) + next-pitch table (for
    // articulation: separate repeated notes). Both from the melody line in order.
    const melody = piece.notes.filter((n) => n.voice === 'melody').sort((a, b) => a.beat - b.beat);
    let melRef = 0; for (const n of melody) melRef += n.midi; melRef = melody.length ? melRef / melody.length : 72;
    const nextMelodyPitch = new Map();
    for (let i = 0; i < melody.length; i++) nextMelodyPitch.set(melody[i], i + 1 < melody.length ? melody[i + 1].midi : null);

    // Chord-roll index: for chord notes sharing a beat, order low->high so the
    // triad can be spread (rolled) by a few ms — a pianistic, less "MIDI" attack.
    const chordRollIndex = new Map();
    const byBeat = new Map();
    for (const n of piece.notes) if (n.voice === 'chord') { if (!byBeat.has(n.beat)) byBeat.set(n.beat, []); byBeat.get(n.beat).push(n); }
    for (const list of byBeat.values()) { list.sort((a, b) => a.midi - b.midi); list.forEach((n, i) => chordRollIndex.set(n, i)); }

    // Correlated residual walks (AR(1)) per voice — timing and dynamics. The
    // stationary sigma is chosen below JND (~6 ms / a few %); innovation std is
    // sigma·sqrt(1-phi²) so the *stationary* spread matches the target.
    const phi = 0.82, kInnov = Math.sqrt(1 - phi * phi);
    const walk = {};
    function stepResidual(voice, sigT, sigD) {
      const w = walk[voice] || (walk[voice] = { t: 0, d: 0, n: 0 });
      const vh = hashStr(voice);
      const nT = jitter(seedNum ^ 0x51ed ^ vh, w.n);
      const nD = jitter(seedNum ^ 0x2a11 ^ vh, w.n);
      w.n++;
      w.t = phi * w.t + kInnov * sigT * nT; w.t = Math.max(-2.4 * sigT, Math.min(2.4 * sigT, w.t));
      w.d = phi * w.d + kInnov * sigD * nD; w.d = Math.max(-2.4 * sigD, Math.min(2.4 * sigD, w.d));
      return w;
    }

    const events = [];
    for (const n of piece.notes) {
      const sect = (n.tags.find((t) => t.startsWith('sect:')) || 'sect:A').slice(5);
      const inten = intensity[sect] == null ? 0.6 : intensity[sect];
      const seg = segmentAt(segments, n.beat);
      const span = Math.max(1, seg[1] - seg[0]);
      const p = Math.min(1, Math.max(0, (n.beat - seg[0]) / span));

      // --- dynamics ---
      const inBar = ((n.beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
      const onGrid = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
      let accent = !onGrid ? 0.80 : (inBar === 0 ? 1.0 : (inBar % 2 === 0 ? 0.93 : 0.86));
      if (n.voice === 'chord') accent = 0.9 + 0.1 * accent;          // pads: nearly flat
      else if (n.voice === 'bass') accent = 0.6 + 0.4 * accent;      // steadier than the lead
      const archDyn = 1 + 0.12 * Math.sin(Math.PI * p);              // swell to mid-phrase, ease at edges
      let highLoud = 1;
      if (n.voice === 'melody') highLoud = Math.max(0.82, Math.min(1.25, 1 + 0.20 * ((n.midi - melRef) / 12)));
      const res = stepResidual(n.voice, n.voice === 'melody' ? 0.0045 : 0.0028, n.voice === 'melody' ? 0.05 : 0.035);

      let vel = inten * (voiceBase[n.voice] || 0.6) * accent * archDyn * highLoud * (1 + res.d);
      if (n.tags.includes('apex')) vel *= 1.10;
      if (n.tags.includes('ending')) vel *= 0.9;                     // resolve, don't slam the last note
      vel = Math.max(0.05, Math.min(1, vel));

      // --- timing: grid + correlated residual + subtle chord roll ---
      let timeSec = beatToSec(n.beat) + res.t;
      if (chordRollIndex.has(n)) timeSec += chordRollIndex.get(n) * 0.009; // roll the triad low->high

      // --- articulation: sounding length as a fraction of the notated slot ---
      const slot = beatToSec(n.beat + n.durBeats) - beatToSec(n.beat);
      let artic;
      if (n.voice === 'melody') {
        if (n.tags.includes('ending')) artic = 1.0;
        else if (n.durBeats >= 2) artic = 0.96;                      // phrase-final long notes ring
        else if (nextMelodyPitch.get(n) === n.midi) artic = 0.72;    // separate repeated pitches
        else artic = 0.86;                                           // détaché default
      } else if (n.voice === 'chord') {
        artic = n.tags.includes('ending') ? 1.0 : 0.94;
      } else { // bass
        artic = n.tags.includes('ending') ? 1.0 : 0.92;
      }
      const durSec = Math.max(0.06, slot * artic);

      events.push({ timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: n.voice, beat: n.beat, midi: n.midi, tags: n.tags });
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = beatToSec(totalBeats) + 1.5;    // + reverb tail
    return { name: NAME, version: VERSION, meta: piece.meta, bpm, sections: piece.sections, selfReport: piece.selfReport, notes: piece.notes, events, durationSec };
  }

  // ---- SYNTHESIZER: build the fx master chain for a context ------------------
  function buildGraph(ctx, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    // Deterministic reverb IR from the seed.
    let a = ((function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })(opts.seed)) || 1;
    const rand = () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
    return fx.createMasterChain(ctx, { rand, reverbAmount: opts.reverb, volume: opts.volume });
  }

  function scheduleEvent(ctx, chain, ev) {
    synth.play(ev.voice, ctx, chain.input(ev.voice), { freq: ev.freq, time: ev.time, durSec: ev.durSec, vel: ev.vel });
  }

  // ---- Offline render (browser / OfflineAudioContext) ------------------------
  async function renderOffline(opts, OfflineCtor) {
    const plan = renderPlan(opts);
    const sr = (opts && opts.sampleRate) || 44100;
    const Ctor = OfflineCtor || (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null);
    const ctx = new Ctor(2, Math.ceil(plan.durationSec * sr), sr);
    const chain = buildGraph(ctx, opts);
    for (const ev of plan.events) scheduleEvent(ctx, chain, Object.assign({}, ev, { time: ev.timeSec }));
    const buffer = await ctx.startRendering();
    return { buffer, plan };
  }

  // ---- Live playback (browser AudioContext + lookahead scheduler) ------------
  function play(ctx, opts, hooks) {
    hooks = hooks || {};
    const plan = renderPlan(opts);
    const chain = buildGraph(ctx, opts);
    const startAt = ctx.currentTime + 0.15;
    const scheduler = new transport.Scheduler({ now: () => ctx.currentTime, lookahead: 0.12, interval: 0.025 });
    scheduler.onSchedule((ev, time) => scheduleEvent(ctx, chain, Object.assign({}, ev, { time })));
    for (const ev of plan.events) scheduler.push(startAt + ev.timeSec, ev);
    scheduler.start();

    // playhead + end callbacks
    let raf = null, ended = false;
    const endTime = startAt + plan.durationSec;
    const tick = () => {
      if (ended) return;
      const now = ctx.currentTime;
      if (hooks.onFrame) hooks.onFrame(Math.max(0, now - startAt), plan);
      if (now >= endTime) { ended = true; scheduler.stop(); if (hooks.onEnd) hooks.onEnd(); return; }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return {
      plan, chain, startAt,
      stop() { ended = true; scheduler.stop(); if (raf) cancelAnimationFrame(raf); },
      setVolume(v) { chain.setVolume(v); },
      setReverb(v) { chain.setReverb(v); },
    };
  }

  return { NAME, VERSION, DEFAULTS, renderPlan, buildGraph, renderOffline, play, makeBeatToSec };
});
