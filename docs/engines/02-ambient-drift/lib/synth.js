/*
 * synth — sample-free Web Audio instrument voices for generative engines.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md — "synth" is build-order item 2, the audible
 * layer). Original code implementing the standard topologies catalogued in
 * wiki/synthesis-recipes.md: a 2-operator FM electric-piano (Chowning FM), a
 * detuned-ensemble string/pad (subtractive), a sine+triangle bass, plus (v0.2) a
 * modal bell, a slow-attack ambient pad, and a deep drone for the ambient engine.
 * Every voice obeys the anti-click discipline of wiki/web-audio-fundamentals.md —
 * the output gain starts at 0, is ramped, and is brought to TRUE zero by a short
 * final linear ramp before the source is stopped (v0.2: the exponential release
 * can only reach ~-56 dB, so a stop there can leave a faint click; the linear tail
 * removes it). The render-and-measure harness checks the largest one-sample step.
 *
 * Each voice is a fire-and-forget factory: play(ctx, dest, note) builds a small
 * node graph, schedules it at note.time (audio-clock seconds), and disconnects
 * everything onended — no unbounded growth over an hour (wiki/audio-worklets-
 * and-performance.md). note = { freq, time, durSec, vel } (vel in 0..1).
 *
 * Dual-format (UMD-lite), same rationale as the other libs: window.AM.synth via
 * <script src> in a file:// browser (its only real runtime); require() in Node
 * just exposes the factory registry for inspection (the voices need a real
 * AudioContext to run, so they are exercised through the render harness, not the
 * headless Node suite).
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.synth = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Clamp a gain ramp so the envelope always starts from true zero (no click),
  // schedule the standard attack/decay/release shape used by every voice, and
  // bring the tail to EXACT zero with a short linear ramp before stop (an
  // exponential ramp cannot reach 0; stopping at ~-56 dB leaves a faint click on
  // exposed notes — the very artifact reported on engine 01's final note).
  // Returns { gain, stopAt }. `peak` target level; `attack`/`release` in seconds.
  function envGain(ctx, t, durSec, peak, attack, release) {
    const g = ctx.createGain();
    const p = Math.max(peak, 0.0002);
    const atkEnd = t + attack;
    const end = t + Math.max(durSec, attack + 0.02);
    const relStart = Math.max(atkEnd, end - release);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p, atkEnd);
    g.gain.setValueAtTime(p, relStart);
    g.gain.exponentialRampToValueAtTime(0.0016, end);          // release to ~-56 dB
    g.gain.linearRampToValueAtTime(0, end + 0.006);            // then to TRUE zero — no stop click
    return { gain: g, stopAt: end + 0.02 };
  }

  function disconnectOnEnd(node, list) {
    node.onended = () => { for (const n of list) { try { n.disconnect(); } catch (e) {} } };
  }

  // ---- keys: 2-operator FM electric piano (Rhodes-ish) ----------------------
  // wiki/synthesis-recipes.md "Two-operator FM": carrier:modulator 1:1, index
  // ~1.5–3 with a fast decay so brightness fades faster than amplitude — the
  // signature EP gesture. Velocity scales index (brightness) more than level.
  // v0.2: sustained notes get a delayed, gentle vibrato (via car.detune) — a
  // perfectly static sustain is one of the strongest "mechanical" tells
  // (wiki/expressive-performance.md); the delay + shallow depth keep it tasteful.
  function keys(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const dev = ctx.createGain();   // modulation depth in Hz (= index * modFreq)
    car.type = 'sine'; mod.type = 'sine';
    car.frequency.setValueAtTime(freq, time);
    mod.frequency.setValueAtTime(freq, time);          // ratio 1:1 -> harmonic
    const index = 1.0 + 1.5 * vel;                     // brighter when louder (kept moderate: a soft, singing lead)
    dev.gain.setValueAtTime(index * freq, time);
    dev.gain.setTargetAtTime(index * freq * 0.12, time, Math.max(0.06, durSec * 0.25)); // brightness decay
    const env = envGain(ctx, time, durSec, 0.34 * (0.5 + 0.5 * vel), 0.006, Math.min(0.5, 0.25 + durSec * 0.3));
    mod.connect(dev); dev.connect(car.frequency); car.connect(env.gain); env.gain.connect(dest);
    car.start(time); mod.start(time);
    car.stop(env.stopAt); mod.stop(env.stopAt);
    const nodes = [car, mod, dev, env.gain];
    if (durSec > 0.7) {                                // delayed vibrato on held notes
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.setValueAtTime(5.6, time);
      const depth = ctx.createGain();                 // depth in cents into detune
      depth.gain.setValueAtTime(0, time);
      depth.gain.setValueAtTime(0, time + 0.34);      // delayed onset ~0.34 s
      depth.gain.linearRampToValueAtTime(16, Math.min(env.stopAt, time + 0.34 + 0.6)); // blooms to ±16 cents
      lfo.connect(depth); depth.connect(car.detune);
      lfo.start(time); lfo.stop(env.stopAt);
      nodes.push(lfo, depth);
    }
    disconnectOnEnd(car, nodes);
  }

  // ---- strings: detuned-ensemble pad (subtractive) --------------------------
  // wiki/synthesis-recipes.md "Pads"/"Subtractive": a few detuned oscillators
  // through a dark lowpass with a slow attack; kept under the lead. The detuning
  // IS the ensemble width. We use triangles (odd harmonics, 1/k² rolloff) rather
  // than saws for a softer, warmer bed appropriate to a background classical piece.
  // v0.2: the cutoff now drifts DOWN (darkens) over the note rather than up —
  // brightening a sustained pad pushes more high-frequency energy into the reverb
  // as the note rings, which is the main source of the "fizz" wash; darkening is
  // both cleaner and more natural (energy decays).
  function strings(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const mix = ctx.createGain();
    const detunes = [-8, 0, 7];                        // cents; odd count keeps a center anchor
    const oscs = [];
    for (const d of detunes) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, time);
      o.detune.setValueAtTime(d, time);
      o.connect(mix);
      oscs.push(o);
    }
    mix.gain.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(1900, freq * 5), time);
    lp.Q.setValueAtTime(0.7, time);
    // slow cutoff drift DOWNWARD so the pad settles and darkens as it rings
    lp.frequency.setTargetAtTime(Math.max(650, freq * 2.6), time + durSec * 0.3, durSec * 0.6);
    const env = envGain(ctx, time, durSec, 0.20 * (0.6 + 0.4 * vel), Math.min(0.5, 0.12 + durSec * 0.15), Math.min(1.2, 0.3 + durSec * 0.5));
    mix.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    for (const o of oscs) o.start(time);
    for (const o of oscs) o.stop(env.stopAt);
    disconnectOnEnd(oscs[0], oscs.concat([mix, lp, env.gain]));
  }

  // ---- bass: sine + quiet triangle, mono, dark ------------------------------
  // wiki/synthesis-recipes.md "Subtractive: bass variant": sub sine + a filtered
  // triangle for definition, mono (no detune width below ~150 Hz — wiki/effects-
  // and-mixing.md keeps lows mono/centered). Medium attack, longer body.
  function bass(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const sine = ctx.createOscillator();
    const saw = ctx.createOscillator();
    sine.type = 'sine'; saw.type = 'triangle';         // triangle upper layer: definition without the saw's steep edge
    sine.frequency.setValueAtTime(freq, time);
    saw.frequency.setValueAtTime(freq, time);
    const sawG = ctx.createGain(); sawG.gain.value = 0.32;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.max(160, freq * 2.4), time);
    lp.Q.setValueAtTime(0.6, time);
    const env = envGain(ctx, time, durSec, 0.42 * (0.7 + 0.3 * vel), 0.012, Math.min(0.4, 0.2 + durSec * 0.2));
    saw.connect(sawG); sawG.connect(lp); sine.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    sine.start(time); saw.start(time);
    sine.stop(env.stopAt); saw.stop(env.stopAt);
    disconnectOnEnd(sine, [sine, saw, sawG, lp, env.gain]);
  }

  // ---- bell: modal decaying sines (soft mallet/bell) ------------------------
  // wiki/synthesis-recipes.md "Modal synthesis": a few inharmonic partials, each
  // an exponentially-decaying sine, higher partials shorter (τ ∝ 1/f). Pure sines
  // means no aliasing and a clean, glassy ring — ideal for a sparse ambient lead.
  // The ambient engine's melody voice.
  function bell(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const out = ctx.createGain(); out.gain.value = 1;
    // [ratio, relative gain, decay scale]; ratios lightly inharmonic for shimmer.
    const partials = [[1, 1.0, 1.0], [2.01, 0.5, 0.66], [2.98, 0.26, 0.46], [4.2, 0.1, 0.3]];
    const level = 0.24 * (0.45 + 0.55 * vel);
    const bodyDecay = Math.max(1.4, Math.min(7, durSec * 0.7 + 1.8)); // long, soft ring
    const nodes = [out];
    let longest = null, longestEnd = -1;
    for (const [ratio, g, ds] of partials) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * ratio, time);
      const ge = ctx.createGain();
      const dec = bodyDecay * ds;
      ge.gain.setValueAtTime(0.0001, time);
      ge.gain.exponentialRampToValueAtTime(level * g, time + 0.004);
      ge.gain.exponentialRampToValueAtTime(0.0016, time + 0.004 + dec);
      ge.gain.linearRampToValueAtTime(0, time + 0.012 + dec);
      o.connect(ge); ge.connect(out);
      const endAt = time + 0.03 + dec;
      o.start(time); o.stop(endAt);
      nodes.push(o, ge);
      if (endAt > longestEnd) { longestEnd = endAt; longest = o; }
    }
    out.connect(dest);
    disconnectOnEnd(longest, nodes);
  }

  // ---- pad: slow-attack ambient wash with internal motion -------------------
  // wiki/synthesis-recipes.md "Pads": 4 detuned triangles, slow attack, dark
  // lowpass whose cutoff drifts on a slow LFO (the anti-"static pad" motion
  // budget), long release. The ambient engine's harmony voice.
  function pad(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const mix = ctx.createGain(); mix.gain.value = 0.34;
    const detunes = [-11, -4, 5, 12];
    const oscs = [];
    for (const d of detunes) {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(freq, time); o.detune.setValueAtTime(d, time);
      o.connect(mix); oscs.push(o);
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    const baseCut = Math.min(1500, freq * 4.5);
    lp.frequency.setValueAtTime(baseCut, time); lp.Q.setValueAtTime(0.5, time);
    // slow cutoff LFO for motion (period ~14 s)
    const clfo = ctx.createOscillator(); clfo.type = 'sine'; clfo.frequency.setValueAtTime(0.07, time);
    const cdepth = ctx.createGain(); cdepth.gain.setValueAtTime(baseCut * 0.35, time);
    clfo.connect(cdepth); cdepth.connect(lp.frequency);
    const env = envGain(ctx, time, durSec, 0.17 * (0.6 + 0.4 * vel),
      Math.min(2.2, 0.6 + durSec * 0.25), Math.min(4.0, 1.0 + durSec * 0.5));
    mix.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    for (const o of oscs) o.start(time);
    clfo.start(time);
    for (const o of oscs) o.stop(env.stopAt);
    clfo.stop(env.stopAt);
    disconnectOnEnd(oscs[0], oscs.concat([mix, lp, clfo, cdepth, env.gain]));
  }

  // ---- drone: deep sustained sub + fifth, mono, dark ------------------------
  // A long, slow-swelling foundation for the ambient engine: a sine sub with a
  // quiet fifth, mono and lowpassed. Long attack and release so it breathes under
  // the pad and bell.
  function drone(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const out = ctx.createGain();
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(freq, time);
    const fifth = ctx.createOscillator(); fifth.type = 'sine'; fifth.frequency.setValueAtTime(freq * 1.5, time);
    const fifthG = ctx.createGain(); fifthG.gain.value = 0.16;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(220, freq * 4); lp.Q.value = 0.5;
    const env = envGain(ctx, time, durSec, 0.4 * (0.7 + 0.3 * vel),
      Math.min(2.0, 0.5 + durSec * 0.2), Math.min(3.0, 0.8 + durSec * 0.4));
    sub.connect(lp); fifth.connect(fifthG); fifthG.connect(lp); lp.connect(env.gain); env.gain.connect(out); out.connect(dest);
    sub.start(time); fifth.start(time);
    sub.stop(env.stopAt); fifth.stop(env.stopAt);
    disconnectOnEnd(sub, [sub, fifth, fifthG, lp, env.gain, out]);
  }

  // Voice registry, keyed by the composer's `voice` field.
  const VOICES = { melody: keys, chord: strings, bass: bass, bell: bell, pad: pad, drone: drone };

  /** Play a composer voice by name: play('melody', ctx, dest, note). */
  function play(voice, ctx, dest, note) {
    const fn = VOICES[voice] || keys;
    fn(ctx, dest, note);
  }

  return { play, keys, strings, bass, bell, pad, drone, VOICES, envGain };
});
