/*
 * percussion engine — Performer + Synthesizer wiring + Scheduler (Engine 05,
 * "Percussion Ensemble"). It runs the engine-architecture pipeline
 * (wiki/engine-architecture.md):
 *
 *   composer (composePercussion, BEATS) -> PERFORMER (feel microtiming + a
 *   velocity/dynamics shape + per-SECTION tempo (accel/rit) + the timbre macros)
 *   -> SYNTHESIZER (original percussion voices boom/drum/wood/metal/gong/shaker/
 *   mallet + bass -> fx master chain) -> SCHEDULER (lookahead) / offline render.
 *
 * The performer is where the FEEL lives, and — as everywhere in this project — it
 * is STRUCTURED, not uniform jitter (wiki/groove-and-embodiment.md names uniform
 * per-note timing noise as the worst option). It applies:
 *   - a small, FIXED, per-voice laid-back offset (a hand-drum ensemble is not a
 *     drum machine; the high metals/shakers sit a hair back, the low anchor is
 *     tight up front);
 *   - optional SWING on duple feels (a per-beat phase warp, like the groove
 *     engine) — grooves can shuffle, concert/odd meters stay straight;
 *   - a correlated (AR(1)) residual per voice, scaled by a FEEL knob and by the
 *     style (a drum circle is looser than a concert ensemble) — never i.i.d.;
 *   - per-SECTION tempo shaping: a ritardando into a concert ending, an
 *     accelerando through a drum-circle "rumble" (both real percussion devices;
 *     wiki/expressive-performance.md final ritardando, wiki/east-asian-traditions.md
 *     oroshi accelerating roll) — implemented as a per-bar local tempo so the pure
 *     planner stays deterministic;
 *   - the TIMBRE MACROS (Tune / Ring / Attack / Brightness) folded into each
 *     note's `p` params so the user reshapes the whole kit's timbre/attack/fade
 *     (the brief's "adjustable timbre, attack, fade") while the voices stay
 *     intrinsically distinct (wiki/percussion-sound-design.md).
 *
 * renderPlan() is PURE (no Web Audio) so it is headless-testable and is the single
 * source of timing/velocity/params for both live playback and the offline gate.
 *
 * Dual-format (UMD-lite): require() in Node, window.AM.engines.percussion via
 * <script src> in a file:// browser (window.AM.{composers,theory,transport,synth,
 * fx} already set).
 */
;(function (global, factory) {
  'use strict';
  let deps;
  if (typeof module === 'object' && module.exports) {
    deps = {
      composer: require('../../composers/percussion.js'),
      theory: require('../../lib/theory.js'),
      transport: require('../../lib/transport.js'),
      synth: null, fx: null, // browser-only; not needed for renderPlan
    };
    module.exports = factory(deps);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.engines = AM.engines || {};
    AM.engines.percussion = factory({
      composer: AM.composers.percussion, theory: AM.theory,
      transport: AM.transport, synth: AM.synth, fx: AM.fx,
    });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { composer, theory, transport, synth, fx } = deps;
  const NAME = 'percussion';
  const VERSION = '0.2.0';
  const DEFAULTS = {
    bpm: 108, style: 'auto', meter: '4/4', group: 8, bars: 32,
    feel: 0.5, swing: 0.5, reverb: 0.2, volume: 0.72,
    tune: 0, ring: 1.0, attack: 1.0, bright: 1.0,   // timbre macros
    // recipe axes: all default to 'auto'/undefined so the SEED decides; any set
    // here or in opts overrides the seed (the sliding-scale controls).
    // development, density, looseness, pitched, arc, timeline, form, ensemble, lead
  };
  // recipe axes forwarded verbatim to the composer (undefined/'auto' => seed samples)
  const AXES = ['development', 'density', 'looseness', 'pitched', 'arc', 'timeline', 'form', 'ensemble', 'lead', 'call', 'interlock', 'sections', 'melody'];

  // Deterministic hash value-noise in [-1,1] (AR(1) innovations); local so the
  // pure planner needs no rng wiring (same approach as the groove engine).
  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function hashStr(s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // Swing warp (duple feels only): map local eighth phase so the offbeat lands at
  // `sw` instead of 0.5; downbeats never move. Identical to the groove engine's.
  function swingBeat(beat, sw) {
    if (!(sw > 0.5)) return beat;
    const b0 = Math.floor(beat + 1e-9);
    const x = beat - b0;
    const xw = x <= 0.5 ? (x / 0.5) * sw : sw + ((x - 0.5) / 0.5) * (1 - sw);
    return b0 + xw;
  }

  // Per-section local tempo scale (a real percussion device): a ritardando into a
  // concert ending / a circle fade, an accelerando through a rumble/climax. Ramps
  // linearly across the section's bars. Scaled by `drive` (the feel knob).
  function sectionTempoShape(role, phase, drive) {
    // phase 0..1 through the section; returns a multiplier on BPM.
    if (role === 'close' || role === 'coda') return 1 - 0.16 * drive * phase;      // ritardando to the end
    if (role === 'fade' || role === 'shed' || role === 'out') return 1 - 0.10 * drive * phase;
    if (role === 'swell') return 1 + 0.10 * drive * phase;                          // rumble accelerates
    if (role === 'climax') return 1 + 0.04 * drive * phase;
    return 1;
  }

  // ---- PERFORMER (pure): beat-score -> timed, shaped performance events -------
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const cOpts = { seed: opts.seed, style: opts.style, meter: opts.meter, group: opts.group, bars: opts.bars, tonic: opts.tonic };
    for (const k of AXES) if (opts[k] != null && opts[k] !== 'auto' && opts[k] !== '') cOpts[k] = opts[k];
    const piece = composer.composePercussion(cOpts);
    const meta = piece.meta;
    const recipe = meta.recipe || {};
    const bpm = clamp(opts.bpm || DEFAULTS.bpm, 50, 200);
    const barBeats = meta.barBeats;
    const style = meta.style;
    const feel = clamp(opts.feel == null ? DEFAULTS.feel : opts.feel, 0, 1);
    // swing only on duple feels; compound/odd stay straight
    const swingOn = meta.feel === 'duple';
    const sw = swingOn ? clamp(opts.swing == null ? 0.5 : opts.swing, 0.5, 0.7) : 0.5;

    // Per-bar local tempo (seconds) from the section shape, integrated to bar
    // start times so accel/rit is exact and deterministic.
    const sectionByBar = [];
    for (const s of piece.sections) for (let b = 0; b < s.bars; b++) sectionByBar.push({ role: s.role, phase: s.bars > 1 ? b / (s.bars - 1) : 0, intensity: s.intensity });
    const drive = 0.5 + 0.9 * feel;         // how strong accel/rit is (feel-scaled)
    const barStart = new Array(meta.bars);
    const barSpb = new Array(meta.bars);
    let t = 0;
    for (let bar = 0; bar < meta.bars; bar++) {
      const sec = sectionByBar[bar] || { role: 'groove', phase: 0 };
      const tScale = clamp(sectionTempoShape(sec.role, sec.phase, drive), 0.6, 1.4);
      const spb = 60 / (bpm * tScale);
      barStart[bar] = t;
      barSpb[bar] = spb;
      t += barBeats * spb;
    }
    const totalSec = t;

    // Fixed per-voice laid-back offsets (structured microtiming). The low anchor
    // stays tight; mid tone drums a hair back; metals/shakers sit slightly behind
    // (a real ensemble breathes). Scaled by feel.
    const laidBack = { boom: 0.0, drum: 0.006, wood: 0.004, metal: 0.010, gong: 0.0, shaker: 0.012, scrape: 0.010, mallet: 0.008, chime: 0.007, clap: 0.005, friction: 0.008, bass: 0.0 };
    // Correlated residual scale from the recipe's continuous LOOSENESS axis (a
    // tight concert ensemble ↔ a loose drum circle), not three discrete styles.
    const styleLoose = 0.5 + 1.3 * (recipe.looseness == null ? 0.5 : recipe.looseness);
    const phi = 0.75, kInnov = Math.sqrt(1 - phi * phi);
    const walk = {};
    const seedNum = hashStr(opts.seed);
    function residual(voice, sigT, sigV) {
      const w = walk[voice] || (walk[voice] = { t: 0, v: 0, n: 0 });
      const vh = hashStr(voice);
      const nT = jitter(seedNum ^ 0x51ed ^ vh, w.n);
      const nV = jitter(seedNum ^ 0x2a11 ^ vh, w.n);
      w.n++;
      w.t = phi * w.t + kInnov * sigT * nT; w.t = clamp(w.t, -2.4 * sigT, 2.4 * sigT);
      w.v = phi * w.v + kInnov * sigV * nV; w.v = clamp(w.v, -2.4 * sigV, 2.4 * sigV);
      return w;
    }

    // Timbre macros -> a per-note `p` params object (reshapes the whole kit).
    const tuneCents = clamp(opts.tune == null ? 0 : opts.tune, -12, 12) * 100;
    const ring = clamp(opts.ring == null ? 1 : opts.ring, 0.4, 2.2);
    const atk = clamp(opts.attack == null ? 1 : opts.attack, 0.3, 2.0);
    const bright = clamp(opts.bright == null ? 1 : opts.bright, 0.5, 1.8);
    // mallet/bass (the melodic layer) get the tune but keep their own natural ring.
    function paramsFor(voice) {
      if (voice === 'mallet') return { tune: tuneCents, decay: ring, bright: bright };
      if (voice === 'bass') return { tune: tuneCents };
      return { tune: tuneCents, decay: ring, attack: atk, bright: bright };
    }

    const events = [];
    for (const n of piece.events) {
      const bar = Math.max(0, Math.min(meta.bars - 1, Math.floor((n.beat + 1e-6) / barBeats)));
      const beatInBar = n.beat - bar * barBeats;
      const spb = barSpb[bar];
      const sw2 = swingOn ? swingBeat(beatInBar, sw) : beatInBar;
      const res = residual(n.voice, (n.voice === 'boom' ? 0.003 : 0.006) * feel, 0.06);
      let timeSec = barStart[bar] + sw2 * spb + (laidBack[n.voice] || 0) * (0.5 + feel) * styleLoose + res.t * styleLoose;
      if (timeSec < 0) timeSec = 0;

      // duration: pitched/melodic voices fill to a swung note-off; drums are one-shots
      let durSec;
      const melodic = n.voice === 'mallet' || n.voice === 'bass';
      if (melodic) {
        const off = swingOn ? swingBeat(beatInBar + n.durBeats, sw) : (beatInBar + n.durBeats);
        durSec = Math.max(0.1, (off - sw2) * spb);
      } else {
        durSec = Math.max(0.05, n.durBeats * spb);
      }

      // dynamics: composer velocity + a gentle correlated residual; ghost/soft tags
      // already carry low velocity. Keep the low anchor consistent (don't wobble it).
      let vel = n.vel;
      if (n.voice !== 'boom') vel = vel * (1 + res.v);
      vel = clamp(vel, 0.03, 1);

      events.push({
        timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: n.voice,
        beat: n.beat, midi: n.midi, pan: n.pan == null ? 0 : n.pan, tags: n.tags || [],
        p: paramsFor(n.voice),
      });
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = totalSec + 2.0;   // + a tail for the last gong/ring
    return {
      name: NAME, version: VERSION, meta, bpm, swing: sw, feel,
      sections: piece.sections, selfReport: piece.selfReport, cell: piece.cell,
      notes: piece.events, events, durationSec,
    };
  }

  // ---- SYNTHESIZER: fx master chain ------------------------------------------
  function seededRand(seedStr) {
    let a = ((function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })(seedStr)) || 1;
    return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
  }

  function buildGraph(ctx, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const rand = seededRand(opts.seed);
    // A medium, natural room — a percussion ensemble wants some space but the low
    // anchor stays dry (fx routes boom to a near-dry bus). Kept modest so dense
    // patterns stay legible (wiki/effects-and-mixing.md).
    return fx.createMasterChain(ctx, {
      rand, reverbAmount: opts.reverb, volume: opts.volume,
      reverbSeconds: 2.2, reverbDamp: 0.5, reverbDecayPow: 3.0,
      returnLowpassHz: 5200, percSendScale: 0.5,
    });
  }

  function scheduleEvent(ctx, chain, ev) {
    synth.play(ev.voice, ctx, chain.input(ev.voice), {
      freq: ev.freq, time: ev.time, durSec: ev.durSec, vel: ev.vel,
      tags: ev.tags, pan: ev.pan, p: ev.p,
    });
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

  return { NAME, VERSION, DEFAULTS, renderPlan, buildGraph, renderOffline, play, swingBeat };
});
