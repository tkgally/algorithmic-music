/*
 * synth — sample-free Web Audio instrument voices for generative engines.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md — "synth" is build-order item 2, the audible
 * layer). Original code implementing the standard topologies catalogued in
 * wiki/synthesis-recipes.md: a 2-operator FM electric-piano (Chowning FM), a
 * detuned-ensemble string/pad (subtractive), and a sine+saw bass. Every voice
 * obeys the anti-click discipline of wiki/web-audio-fundamentals.md — the output
 * gain starts at 0 and is ramped, never gated — which the OfflineAudioContext
 * render-and-measure harness (experiments/tools/render-measure.mjs) checks by
 * measuring the largest one-sample step of a real render.
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
  // and schedule the standard attack/decay/release shape used by every voice.
  // Returns the gain node so the caller can also route it. `peak` is the target
  // level; `attack`/`release` in seconds; the note holds until t+durSec then
  // releases. exponentialRamp cannot reach 0, so we floor at 1e-4 and stop after.
  function envGain(ctx, t, durSec, peak, attack, release) {
    const g = ctx.createGain();
    const end = t + Math.max(durSec, attack + 0.02);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), Math.max(t + attack, end - release));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    return { gain: g, stopAt: end + 0.02 };
  }

  function disconnectOnEnd(node, list) {
    node.onended = () => { for (const n of list) { try { n.disconnect(); } catch (e) {} } };
  }

  // ---- keys: 2-operator FM electric piano (Rhodes-ish) ----------------------
  // wiki/synthesis-recipes.md "Two-operator FM": carrier:modulator 1:1, index
  // ~1.5–3 with a fast decay so brightness fades faster than amplitude — the
  // signature EP gesture. Velocity scales index (brightness) more than level.
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
    disconnectOnEnd(car, [car, mod, dev, env.gain]);
  }

  // ---- strings: detuned-ensemble pad (subtractive) --------------------------
  // wiki/synthesis-recipes.md "Pads"/"Subtractive": a few detuned oscillators
  // through a dark lowpass with a slow attack; kept under the lead (cutoff <=
  // ~2 kHz). The detuning IS the ensemble width; a gentle cutoff drift keeps it
  // from being static (the pad failure mode). We use triangles (odd harmonics,
  // 1/k² rolloff) rather than saws for a softer, warmer bed appropriate to a
  // background classical piece — and, per wiki/synthesis-recipes.md's anti-click
  // note, gentler per-sample slopes. Used for the chord voice.
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
    lp.frequency.setValueAtTime(Math.min(2000, freq * 6), time);
    lp.Q.setValueAtTime(0.7, time);
    // slow cutoff drift so the pad breathes
    lp.frequency.setTargetAtTime(Math.min(2400, freq * 7.5), time + durSec * 0.4, durSec * 0.5);
    const env = envGain(ctx, time, durSec, 0.20 * (0.6 + 0.4 * vel), Math.min(0.5, 0.12 + durSec * 0.15), Math.min(1.2, 0.3 + durSec * 0.5));
    mix.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    for (const o of oscs) o.start(time);
    for (const o of oscs) o.stop(env.stopAt);
    disconnectOnEnd(oscs[0], oscs.concat([mix, lp, env.gain]));
  }

  // ---- bass: sine + quiet saw, mono, dark ------------------------------------
  // wiki/synthesis-recipes.md "Subtractive: bass variant": sub sine + a filtered
  // saw for definition, mono (no detune width below ~150 Hz — wiki/effects-and-
  // mixing.md keeps lows mono/centered). Medium attack, longer body.
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

  // Voice registry, keyed by the composer's `voice` field.
  const VOICES = { melody: keys, chord: strings, bass: bass };

  /** Play a composer voice by name: play('melody', ctx, dest, note). */
  function play(voice, ctx, dest, note) {
    const fn = VOICES[voice] || keys;
    fn(ctx, dest, note);
  }

  return { play, keys, strings, bass, VOICES, envGain };
});
