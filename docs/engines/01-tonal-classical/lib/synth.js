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

  // Shared, DETERMINISTIC white-noise buffer, one per AudioContext (built lazily
  // and cached) — the drum voices below play offset slices of it rather than
  // allocating a new noise buffer per hit (wiki/synthesis-recipes.md "Drums":
  // "generate one seeded noise AudioBuffer at startup and play offset slices per
  // hit — deterministic and allocation-free"). A fixed internal seed keeps the
  // synthesized audio reproducible (the render-and-measure gate wants stable
  // metrics), independent of Math.random.
  const _noiseCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function noiseBuffer(ctx) {
    if (_noiseCache && _noiseCache.has(ctx)) return _noiseCache.get(ctx);
    const len = Math.max(1, Math.floor(ctx.sampleRate * 2));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let a = 0x2545f491 >>> 0;                       // fixed seed -> deterministic
    for (let i = 0; i < len; i++) { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; d[i] = (a / 4294967296) * 2 - 1; }
    if (_noiseCache) _noiseCache.set(ctx, buf);
    return buf;
  }
  // A per-hit noise read offset (seconds) so successive hits don't play the exact
  // same slice — deterministic from the scheduled time, no Math.random.
  function noiseOffset(time) { const x = Math.abs(time) * 7.13; return (x - Math.floor(x)) * 1.6; }

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

  // ---- kick: sine with a fast downward pitch drop (round, lo-fi) ------------
  // wiki/synthesis-recipes.md "Drums": a sine whose frequency drops exponentially
  // (≈130→46 Hz over ~60 ms) with a fast amp decay. Kept deliberately ROUND —
  // little beater click — for the warm, dusty lo-fi character (a bright click
  // would fight the tape aesthetic). The weight is the point (wiki/groove-and-
  // embodiment.md: "put timekeeping and energy in the bass … a thin, bass-light
  // mix will not groove"). vel scales both peak and how far the pitch starts up.
  function kick(ctx, dest, note) {
    const { time, vel } = note;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const f1 = 118 + 34 * vel, f0 = 46;
    osc.frequency.setValueAtTime(f1, time);
    osc.frequency.exponentialRampToValueAtTime(f0, time + 0.06);
    const g = ctx.createGain();
    const peak = 0.92 * (0.62 + 0.38 * vel);
    const dec = 0.15 + 0.05 * vel;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.004);   // 4 ms attack
    g.gain.exponentialRampToValueAtTime(0.0016, time + dec);
    g.gain.linearRampToValueAtTime(0, time + dec + 0.012);     // true zero, no click
    osc.connect(g); g.connect(dest);
    const endAt = time + dec + 0.03;
    osc.start(time); osc.stop(endAt);
    disconnectOnEnd(osc, [osc, g]);
  }

  // ---- snare: two tone partials + band-passed noise -------------------------
  // wiki/synthesis-recipes.md "Snare": ~185 + ~330 Hz triangles (fast τ) plus
  // white noise through a ~1.9 kHz bandpass; VELOCITY SCALES THE NOISE MORE THAN
  // THE TONE, which is exactly what makes ghost notes (low-vel snare taps) read as
  // soft brushes rather than quiet full hits (wiki/groove-and-embodiment.md).
  function snare(ctx, dest, note) {
    const { time, vel } = note;
    const out = ctx.createGain(); out.gain.value = 1; out.connect(dest);
    // tone
    const toneG = ctx.createGain();
    const t1 = ctx.createOscillator(); t1.type = 'triangle'; t1.frequency.setValueAtTime(185, time);
    const t2 = ctx.createOscillator(); t2.type = 'triangle'; t2.frequency.setValueAtTime(328, time);
    const tonePeak = 0.16 * (0.5 + 0.5 * vel);
    toneG.gain.setValueAtTime(0.0001, time);
    toneG.gain.exponentialRampToValueAtTime(tonePeak, time + 0.003);
    toneG.gain.exponentialRampToValueAtTime(0.0016, time + 0.055);
    toneG.gain.linearRampToValueAtTime(0, time + 0.066);
    t1.connect(toneG); t2.connect(toneG); toneG.connect(out);
    // noise body
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1900, time); bp.Q.setValueAtTime(0.7, time);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(700, time);
    const nG = ctx.createGain();
    const nPeak = 0.5 * (0.3 + 0.7 * vel);                     // noise dominated by velocity
    const nDec = 0.085 + 0.06 * vel;
    nG.gain.setValueAtTime(0.0001, time);
    nG.gain.exponentialRampToValueAtTime(nPeak, time + 0.003);
    nG.gain.exponentialRampToValueAtTime(0.0016, time + nDec);
    nG.gain.linearRampToValueAtTime(0, time + nDec + 0.01);
    noise.connect(bp); bp.connect(hp); hp.connect(nG); nG.connect(out);
    const endAt = time + Math.max(0.066, nDec + 0.02);
    t1.start(time); t2.start(time); noise.start(time, noiseOffset(time));
    t1.stop(endAt); t2.stop(endAt); noise.stop(endAt);
    disconnectOnEnd(noise, [t1, t2, toneG, noise, bp, hp, nG, out]);
  }

  // ---- hat: high-passed noise, closed (short) or open (long) ----------------
  // wiki/synthesis-recipes.md "Hi-hats": highpassed white noise (≥7–8 kHz) is the
  // acceptable cheap substitute; closed τ ≈ 0.03–0.06 s, open τ ≈ 0.3–0.6 s. Tag
  // 'open' selects the long decay. Level is kept modest so the shimmer sits under
  // the backbeat and the per-sample steps of the bright noise stay bounded.
  function hat(ctx, dest, note) {
    const { time, vel, tags } = note;
    const open = tags && tags.indexOf('open') !== -1;
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(7600, time); hp.Q.setValueAtTime(0.7, time);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(10500, time); bp.Q.setValueAtTime(1.1, time);
    const g = ctx.createGain();
    const dec = open ? 0.26 : 0.045;
    const peak = 0.11 * (0.4 + 0.6 * vel);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0016, time + dec);
    g.gain.linearRampToValueAtTime(0, time + dec + 0.008);
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(dest);
    const endAt = time + dec + 0.02;
    noise.start(time, noiseOffset(time)); noise.stop(endAt);
    disconnectOnEnd(noise, [noise, hp, bp, g]);
  }

  // ---- rhodes: warm, dusty 2-op FM electric piano (lo-fi chord/keys voice) ---
  // The signature lo-fi timbre (wiki/synthesis-recipes.md "Two-operator FM":
  // Rhodes-like EP, 1:1 ratio, index with a fast decay). Distinguished from the
  // brighter `keys` lead by a WARM LOWPASS (the "dusty"/filtered character) and a
  // gentler index, so stacked chord tones stay mellow and never fizz.
  function rhodes(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const car = ctx.createOscillator(); const mod = ctx.createOscillator();
    car.type = 'sine'; mod.type = 'sine';
    car.frequency.setValueAtTime(freq, time);
    mod.frequency.setValueAtTime(freq, time);          // 1:1 -> harmonic
    const dev = ctx.createGain();
    const index = 0.7 + 1.1 * vel;
    dev.gain.setValueAtTime(index * freq, time);
    dev.gain.setTargetAtTime(index * freq * 0.1, time, Math.max(0.05, durSec * 0.2));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(2600, freq * 6), time); lp.Q.setValueAtTime(0.4, time);
    const env = envGain(ctx, time, durSec, 0.2 * (0.5 + 0.5 * vel), 0.006, Math.min(0.7, 0.25 + durSec * 0.35));
    mod.connect(dev); dev.connect(car.frequency); car.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    car.start(time); mod.start(time);
    car.stop(env.stopAt); mod.stop(env.stopAt);
    disconnectOnEnd(car, [car, mod, dev, lp, env.gain]);
  }

  // Voice registry, keyed by the composer's `voice` field.
  const VOICES = { melody: keys, chord: strings, bass: bass, bell: bell, pad: pad, drone: drone,
    kick: kick, snare: snare, hat: hat, rhodes: rhodes };

  /** Play a composer voice by name: play('melody', ctx, dest, note). */
  function play(voice, ctx, dest, note) {
    const fn = VOICES[voice] || keys;
    fn(ctx, dest, note);
  }

  return { play, keys, strings, bass, bell, pad, drone, kick, snare, hat, rhodes, VOICES, envGain, noiseBuffer };
});
