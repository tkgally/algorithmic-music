/*
 * groove-lofi engine — Performer + Synthesizer wiring + Scheduler (Engine 03).
 *
 * The third public engine (wiki/project-roadmap.md Phase 2 shortlist: a groove
 * engine to complete the metric-classical / ambient / groove trio, "the natural
 * place to build the percussion voices and swing/laid-back timing"). It runs the
 * engine-architecture pipeline (wiki/engine-architecture.md):
 *
 *   composer (composeGroove, BEATS) -> PERFORMER (swing + laid-back microtiming +
 *   velocity hierarchy + gentle correlated residual) -> SYNTHESIZER (drum/bass/
 *   rhodes/bell voices -> fx master chain + a lo-fi vinyl-crackle bed) ->
 *   SCHEDULER (lookahead) / offline render.
 *
 * The performer is where groove actually happens — and it is deliberately NOT
 * uniform jitter (wiki/groove-and-embodiment.md calls that the single worst
 * option and this project's old mistake). It applies, all STRUCTURED:
 *   - SWING: a per-beat phase warp so eighth- and sixteenth-note offbeats land
 *     late (a shuffle), one `swing` knob (0.5 = straight … ~0.66 = heavy lo-fi);
 *   - LAID-BACK microtiming: a small, FIXED, per-instrument offset (the snare
 *     drags a few ms behind the beat, hats sit a hair back, the kick stays tight)
 *     — a known feel, applied identically every cycle, not random;
 *   - a VELOCITY HIERARCHY straight from the composer's base velocities, lightly
 *     shaped (a touch of hat swing-accent, subtle bar dynamics);
 *   - a small CORRELATED (AR(1)) residual per voice so repeats aren't dead-static
 *     — never i.i.d. per-hit noise.
 *
 * renderPlan() is PURE (no Web Audio) so it is headless-testable and is the
 * single source of timing/velocity for both live playback and the offline
 * render-and-measure gate.
 *
 * Dual-format (UMD-lite): require() in Node, window.AM.engines.grooveLofi via
 * <script src> in a file:// browser (window.AM.{composers,theory,transport,synth,
 * fx} already set).
 */
;(function (global, factory) {
  'use strict';
  let deps;
  if (typeof module === 'object' && module.exports) {
    deps = {
      composer: require('../../composers/groove-lofi.js'),
      theory: require('../../lib/theory.js'),
      transport: require('../../lib/transport.js'),
      synth: null, fx: null, // browser-only; not needed for renderPlan
    };
    module.exports = factory(deps);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.engines = AM.engines || {};
    AM.engines.grooveLofi = factory({
      composer: AM.composers.grooveLofi, theory: AM.theory,
      transport: AM.transport, synth: AM.synth, fx: AM.fx,
    });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { composer, theory, transport, synth, fx } = deps;
  const NAME = 'groove-lofi';
  const VERSION = '0.1.0';
  const BEATS_PER_BAR = 4;
  const DEFAULTS = { bpm: 82, mood: 'mellow', tonic: null, bars: 24, swing: 0.6, reverb: 0.24, volume: 0.62, vinyl: 0.5 };

  // Deterministic hash-based value noise in [-1,1] (innovation for the AR(1)
  // residual walks; local so the pure planner needs no rng wiring).
  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function hashStr(s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }

  // Swing as a per-beat phase warp: within each beat, map the local phase x∈[0,1)
  // so the midpoint (the eighth-note offbeat) lands at `sw` instead of 0.5. This
  // pushes BOTH eighth offbeats (0.5 -> sw) and sixteenth offbeats (0.25 -> sw/2,
  // 0.75 -> sw+(1-sw)/2) late — a single-knob shuffle. sw=0.5 is straight.
  // Onsets exactly on the beat (x=0) never move, so the pulse stays tight.
  function swingBeat(beat, sw) {
    if (!(sw > 0.5)) return beat;
    const b0 = Math.floor(beat + 1e-9);
    const x = beat - b0;
    const xw = x <= 0.5 ? (x / 0.5) * sw : sw + ((x - 0.5) / 0.5) * (1 - sw);
    return b0 + xw;
  }

  // ---- PERFORMER (pure): beat-score -> timed, shaped performance events ------
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const piece = composer.composeGroove({ seed: opts.seed, mood: opts.mood, tonic: opts.tonic, bars: opts.bars });
    const bpm = Math.max(50, Math.min(120, opts.bpm || DEFAULTS.bpm));
    const spb = 60 / bpm;
    const sw = Math.max(0.5, Math.min(0.7, opts.swing == null ? DEFAULTS.swing : opts.swing));
    const totalBeats = piece.meta.bars * BEATS_PER_BAR;

    // Fixed, per-instrument laid-back offsets in SECONDS (structured microtiming,
    // wiki/groove-and-embodiment.md). Snare drags most (the classic "behind the
    // beat" backbeat); hats a hair; kick and bass stay tight up front.
    const laidBack = { snare: 0.018, hat: 0.006, rhodes: 0.004, bell: 0.01, kick: 0.0, bass: 0.0 };

    // Correlated residual walks (AR(1)) per voice — tiny, below JND, so cycles
    // breathe without smearing the groove.
    const phi = 0.8, kInnov = Math.sqrt(1 - phi * phi);
    const walk = {};
    const seedNum = hashStr(opts.seed);
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
    for (const n of piece.events) {
      const isDrum = n.voice === 'kick' || n.voice === 'snare' || n.voice === 'hat';
      // timing: swing warp -> seconds -> + laid-back offset + correlated residual
      const sBeat = swingBeat(n.beat, sw);
      const res = stepResidual(n.voice, isDrum ? 0.004 : 0.006, isDrum ? 0.05 : 0.04);
      let timeSec = sBeat * spb + (laidBack[n.voice] || 0) + res.t;
      if (timeSec < 0) timeSec = 0;

      // duration: swing the note-off too (so a chord/bass note fills to the next
      // swung grid point), pitched voices only; drums are fixed one-shots.
      let durSec;
      if (isDrum) durSec = Math.max(0.05, n.durBeats * spb);
      else {
        const offBeat = swingBeat(n.beat + n.durBeats, sw);
        durSec = Math.max(0.08, (offBeat - sBeat) * spb);
      }

      // velocity: the composer's hierarchy + a light hat swing-accent (offbeat
      // hats a touch softer still) + the correlated dynamic residual.
      let vel = n.vel;
      if (n.voice === 'hat') {
        const inBeat = ((n.beat % 1) + 1) % 1;
        if (Math.abs(inBeat - 0.5) < 1e-6) vel *= 0.9;    // eighth offbeat slightly softer
      }
      vel = Math.max(0.03, Math.min(1, vel * (1 + res.d)));

      events.push({ timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: n.voice, beat: n.beat, midi: n.midi, tags: n.tags || [] });
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = totalBeats * spb + 1.6;    // + a little tail
    return { name: NAME, version: VERSION, meta: piece.meta, bpm, swing: sw, chordSpans: piece.chordSpans, selfReport: piece.selfReport, notes: piece.events, events, durationSec };
  }

  // ---- SYNTHESIZER: fx master chain + a lo-fi vinyl-crackle bed ---------------
  function seededRand(seedStr) {
    let a = ((function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })(seedStr)) || 1;
    return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
  }

  function buildGraph(ctx, opts, durationSec) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const rand = seededRand(opts.seed);
    const chain = fx.createMasterChain(ctx, {
      rand, reverbAmount: opts.reverb, volume: opts.volume,
      reverbSeconds: 1.8, reverbDamp: 0.5, reverbDecayPow: 3.0,   // a small, warm room
      returnLowpassHz: 3600, drumSendScale: 0.5,
    });
    // Vinyl-crackle bed: a steady, quiet band-limited noise (tape hiss) plus
    // sparse crackle — the unmistakable lo-fi signature. Deterministic from the
    // seed, very low level so it colors rather than masks. Returns a stop handle.
    const vinylAmt = opts.vinyl == null ? DEFAULTS.vinyl : opts.vinyl;
    let vinyl = null;
    if (vinylAmt > 0.001 && synth) {
      const nb = synth.noiseBuffer(ctx);
      const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
      const hs = ctx.createBiquadFilter(); hs.type = 'highpass'; hs.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.value = 0.02 * vinylAmt;   // ~ -40 dB * amount
      src.connect(bp); bp.connect(hs); hs.connect(g); g.connect(chain.sum);
      src.start(0);
      vinyl = { src, gain: g, setAmount(v) { g.gain.setTargetAtTime(0.02 * v, ctx.currentTime, 0.05); }, stop() { try { src.stop(); } catch (e) {} } };
    }
    chain._vinyl = vinyl;
    return chain;
  }

  function scheduleEvent(ctx, chain, ev) {
    synth.play(ev.voice, ctx, chain.input(ev.voice), { freq: ev.freq, time: ev.time, durSec: ev.durSec, vel: ev.vel, tags: ev.tags });
  }

  async function renderOffline(opts, OfflineCtor) {
    const plan = renderPlan(opts);
    const sr = (opts && opts.sampleRate) || 44100;
    const Ctor = OfflineCtor || (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null);
    const ctx = new Ctor(2, Math.ceil(plan.durationSec * sr), sr);
    const chain = buildGraph(ctx, opts, plan.durationSec);
    for (const ev of plan.events) scheduleEvent(ctx, chain, Object.assign({}, ev, { time: ev.timeSec }));
    const buffer = await ctx.startRendering();
    if (chain._vinyl) chain._vinyl.stop();
    return { buffer, plan };
  }

  function play(ctx, opts, hooks) {
    hooks = hooks || {};
    const plan = renderPlan(opts);
    const chain = buildGraph(ctx, opts, plan.durationSec);
    const startAt = ctx.currentTime + 0.15;
    const scheduler = new transport.Scheduler({ now: () => ctx.currentTime, lookahead: 0.12, interval: 0.025 });
    scheduler.onSchedule((ev, time) => scheduleEvent(ctx, chain, Object.assign({}, ev, { time })));
    for (const ev of plan.events) scheduler.push(startAt + ev.timeSec, ev);
    scheduler.start();

    let raf = null, ended = false;
    const endTime = startAt + plan.durationSec;
    const tick = () => {
      if (ended) return;
      const now = ctx.currentTime;
      if (hooks.onFrame) hooks.onFrame(Math.max(0, now - startAt), plan);
      if (now >= endTime) { ended = true; scheduler.stop(); if (chain._vinyl) chain._vinyl.stop(); if (hooks.onEnd) hooks.onEnd(); return; }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return {
      plan, chain, startAt,
      stop() { ended = true; scheduler.stop(); if (chain._vinyl) chain._vinyl.stop(); if (raf) cancelAnimationFrame(raf); },
      setVolume(v) { chain.setVolume(v); },
      setReverb(v) { chain.setReverb(v); },
      setVinyl(v) { if (chain._vinyl) chain._vinyl.setAmount(v); },
    };
  }

  return { NAME, VERSION, DEFAULTS, renderPlan, buildGraph, renderOffline, play, swingBeat };
});
