/*
 * ambient-drift engine — Performer + Synthesizer wiring + Scheduler for the
 * generative ambient engine (Engine 02), the deliberate contrast to tonal-
 * classical (wiki/project-roadmap.md Phase 2 shortlist: "an ambient/process
 * engine ... reuses synth/fx, different composer").
 *
 * Pipeline (wiki/engine-architecture.md), same shape as every engine:
 *   composer (composeDrift, SECONDS) -> PERFORMER (pace, gentle correlated
 *   humanization, a global fade in/out) -> SYNTHESIZER (drone/pad/bell voices ->
 *   fx master chain with a LONG, DARK reverb) -> SCHEDULER / offline render.
 *
 * The performer is deliberately minimal — ambient wants no metric accent, no
 * ritardando, no articulation shortening, and full sustains (wiki/ambient-and-
 * generative-genre.md "slow attack and release ... narrow dynamic range with no
 * sudden events"). It only: scales time by a UI "pace"; adds a small CORRELATED
 * (AR(1)) velocity/timing residual so nothing is dead-static; and applies a slow
 * global swell so the piece emerges from and dissolves back into silence.
 *
 * renderPlan() is PURE (no Web Audio) so it is headless-testable and drives both
 * live playback and the offline render-and-measure gate.
 *
 * Dual-format (UMD-lite): require() in Node, window.AM.engines.ambientDrift via
 * <script src> in a file:// browser (window.AM.{composers,theory,transport,synth,
 * fx} already set).
 */
;(function (global, factory) {
  'use strict';
  let deps;
  if (typeof module === 'object' && module.exports) {
    deps = {
      composer: require('../../composers/ambient-drift.js'),
      theory: require('../../lib/theory.js'),
      transport: require('../../lib/transport.js'),
      synth: null, fx: null, // browser-only; not needed for renderPlan
    };
    module.exports = factory(deps);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.engines = AM.engines || {};
    AM.engines.ambientDrift = factory({
      composer: AM.composers.ambientDrift, theory: AM.theory,
      transport: AM.transport, synth: AM.synth, fx: AM.fx,
    });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { composer, theory, transport, synth, fx } = deps;
  const NAME = 'ambient-drift';
  const VERSION = '0.1.0';
  const DEFAULTS = { palette: 'warm', tonic: 'D3', durationSec: 150, pace: 1.0, reverb: 0.5, volume: 0.62 };

  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function hashStr(s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }

  // ---- PERFORMER (pure): seconds-score -> timed, shaped performance events ---
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const score = composer.composeDrift({ seed: opts.seed, tonic: opts.tonic, palette: opts.palette, durationSec: opts.durationSec });
    const pace = Math.max(0.4, Math.min(2.5, opts.pace || 1));
    const totalT = score.meta.durationSec / pace;
    const fadeIn = 6, fadeOut = 12;
    const voiceBase = { drone: 0.9, pad: 0.78, bell: 0.85 };
    const seedNum = hashStr(opts.seed);

    // Correlated residual walks (AR(1)) per voice — gentle life, never i.i.d.
    const phi = 0.85, kInnov = Math.sqrt(1 - phi * phi);
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

    // Bell register reference (for a touch of high-loud shading).
    const bells = score.events.filter((e) => e.voice === 'bell');
    let bellRef = 0; for (const b of bells) bellRef += b.midi; bellRef = bells.length ? bellRef / bells.length : 84;

    const events = [];
    for (const n of score.events) {
      const isBell = n.voice === 'bell';
      const res = stepResidual(n.voice, isBell ? 0.012 : 0.02, isBell ? 0.06 : 0.03);
      const timeSec = Math.max(0, n.t / pace + res.t);
      const durSec = Math.max(0.2, n.dur / pace);

      // global swell: emerge over the first fadeIn seconds, dissolve over the last.
      const gIn = Math.min(1, timeSec / fadeIn);
      const gOut = Math.min(1, Math.max(0, (totalT - timeSec) / fadeOut));
      const globalEnv = Math.min(gIn, 0.15 + 0.85 * gOut);   // never fully silent mid-piece

      let highLoud = 1;
      if (isBell) highLoud = Math.max(0.8, Math.min(1.2, 1 + 0.16 * ((n.midi - bellRef) / 12)));
      let vel = (n.vel == null ? 1 : n.vel) * (voiceBase[n.voice] || 0.8) * globalEnv * highLoud * (1 + res.d);
      vel = Math.max(0.04, Math.min(1, vel));

      events.push({ timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: n.voice, beat: n.t, midi: n.midi, tags: n.tags || [] });
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = totalT + 6.5;   // + long reverb tail to dissolve
    return { name: NAME, version: VERSION, meta: score.meta, pace, regions: score.regions, loops: score.loops, selfReport: score.selfReport, events, durationSec };
  }

  // ---- SYNTHESIZER: build the fx master chain (long, dark ambient reverb) -----
  function buildGraph(ctx, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    let a = ((function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })(opts.seed)) || 1;
    const rand = () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
    return fx.createMasterChain(ctx, {
      rand, reverbAmount: opts.reverb, volume: opts.volume,
      reverbSeconds: 5.5, reverbDamp: 0.6, reverbDecayPow: 2.4, // long, dark room
      returnLowpassHz: 2800, returnGain: 1.0, chordSendScale: 1.0, preDelay: 0.04,
      bassSend: 0.12,                                            // a little space on the drone too
    });
  }

  function scheduleEvent(ctx, chain, ev) {
    synth.play(ev.voice, ctx, chain.input(ev.voice), { freq: ev.freq, time: ev.time, durSec: ev.durSec, vel: ev.vel });
  }

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

  function play(ctx, opts, hooks) {
    hooks = hooks || {};
    const plan = renderPlan(opts);
    const chain = buildGraph(ctx, opts);
    const startAt = ctx.currentTime + 0.15;
    const scheduler = new transport.Scheduler({ now: () => ctx.currentTime, lookahead: 0.2, interval: 0.05 });
    scheduler.onSchedule((ev, time) => scheduleEvent(ctx, chain, Object.assign({}, ev, { time })));
    for (const ev of plan.events) scheduler.push(startAt + ev.timeSec, ev);
    scheduler.start();

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

  return { NAME, VERSION, DEFAULTS, renderPlan, buildGraph, renderOffline, play };
});
