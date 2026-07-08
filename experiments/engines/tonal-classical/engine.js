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
  const VERSION = '0.1.0';
  const DEFAULTS = { bpm: 92, mode: 'major', tonic: 'C4', reverb: 0.24, volume: 0.6 };

  // Simple seeded value noise for humanization (kept local so the pure planner
  // has no rng dependency wiring): a hash-based deterministic jitter in [-1,1].
  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }

  // Build a beat->seconds map with a gentle closing ritardando over the final two
  // bars (expressive-performance.md: a final ritard is a strong "ending" cue).
  function makeBeatToSec(bpm, totalBeats, leadIn) {
    const spb0 = 60 / bpm, step = 0.25;
    const ritStart = totalBeats - 8, slow = 1.3;       // final note ~30% slower
    const map = [leadIn];
    let t = leadIn;
    for (let b = step; b <= totalBeats + step; b += step) {
      const frac = b > ritStart && totalBeats > ritStart ? Math.min(1, (b - ritStart) / (totalBeats - ritStart)) : 0;
      const spb = spb0 * (1 + (slow - 1) * frac);
      t += spb * step;
      map.push(t);
    }
    return (beat) => map[Math.min(Math.round(beat / step), map.length - 1)];
  }

  // ---- PERFORMER (pure): score -> timed, dynamically-shaped events ----------
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const piece = composer.composePiece({ seed: opts.seed, mode: opts.mode, tonic: opts.tonic });
    const bpm = opts.bpm;
    const totalBeats = piece.meta.bars * 4;
    const leadIn = 0.3;
    const beatToSec = makeBeatToSec(bpm, totalBeats, leadIn);

    const intensity = {};
    for (const s of piece.sections) intensity[s.role] = s.intensity;
    const voiceBase = { melody: 1.0, chord: 0.5, bass: 0.82 };
    const seedNum = (function (s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; })(opts.seed);

    const events = [];
    let idx = 0;
    for (const n of piece.notes) {
      const sect = (n.tags.find((t) => t.startsWith('sect:')) || 'sect:A').slice(5);
      const inten = intensity[sect] == null ? 0.6 : intensity[sect];
      const inBar = ((n.beat % 4) + 4) % 4;
      const accent = inBar === 0 ? 1.0 : (inBar % 2 === 0 ? 0.9 : 0.8);
      let vel = inten * (voiceBase[n.voice] || 0.7) * accent;
      if (n.tags.includes('apex')) vel *= 1.12;
      if (n.tags.includes('ending')) vel *= 0.9;        // resolve, don't slam the last note
      vel *= 1 + 0.05 * jitter(seedNum, idx);           // humanize dynamics
      vel = Math.max(0.05, Math.min(1, vel));

      let timeSec = beatToSec(n.beat);
      if (n.voice === 'melody') timeSec += 0.006 * jitter(seedNum ^ 0x5bd1e995, idx); // subtle micro-timing
      const durSec = Math.max(0.05, beatToSec(n.beat + n.durBeats) - beatToSec(n.beat));
      events.push({ timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: n.voice, beat: n.beat, midi: n.midi, tags: n.tags });
      idx++;
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = beatToSec(totalBeats) + 1.2;    // + reverb tail
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
