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

  // The output-gain envelope shared by most voices. Two anti-artifact disciplines:
  //
  // (1) TRUE-ZERO tail: an exponential ramp cannot reach 0, and stopping at ~-56 dB
  //     leaves a faint click on exposed notes; a short final LINEAR ramp to exact 0
  //     before the source stops removes it (the v0.2 final-note fix).
  //
  // (2) NO FLAT-HOLD CORNER (v0.3.1): the old shape held the gain perfectly FLAT at
  //     the peak and then switched abruptly to a fast exponential release. That
  //     slope discontinuity splatters a broadband energy burst — an audible
  //     "static" puff — at the release onset, which on a long note falls in the
  //     MIDDLE of the note (the artifact a listener localized to the extended notes
  //     at phrase ends). The fix is to GLIDE, never hold flat: setTargetAtTime eases
  //     the gain from the attack peak toward a sustain level, then eases it toward
  //     silence at the release — both are smooth (no corner). `sustain` (0..1, of
  //     peak) picks the character: low = a struck voice that decays like a real
  //     electric piano; high = a sustained pad that barely droops. Either way there
  //     is no discontinuity in the envelope OR its slope, so no puff.
  //
  // Returns { gain, stopAt }. `peak` target level; `attack`/`release` in seconds;
  // `sustain` fraction of peak held (default 0.85 — gently sustained, corner-free).
  // Implemented with ONLY exponential ramps (each has a defined endpoint), never a
  // ramp after setTargetAtTime — that transition has an implementation-defined
  // start value that differs between Chrome/Firefox/Safari, and the output must be
  // identical in every browser.
  function envGain(ctx, t, durSec, peak, attack, release, sustain) {
    const g = ctx.createGain();
    const p = Math.max(peak, 0.0002);
    sustain = sustain == null ? 0.85 : sustain;
    const atkEnd = t + attack;
    const end = t + Math.max(durSec, attack + 0.02);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p, atkEnd);            // attack
    if (sustain <= 0.35) {
      // STRUCK voices (electric piano, plucked bass): ONE continuous exponential
      // decay from the attack peak to a low floor across the whole note. There is
      // NO sustain shelf and therefore NO mid-note corner — the only slope change
      // is the final ramp to zero, which is at the note's quiet end, not its
      // middle. This is what removes the release-onset "static" puff on the
      // exposed melody, and it is also the natural amplitude shape of a real EP.
      g.gain.exponentialRampToValueAtTime(Math.max(0.0016, 0.04 * p), end);
    } else {
      // SUSTAINED voices (pad/strings/drone): a GENTLE decay to the sustain level
      // (never a flat shelf) then a release that continues the decay — the corner
      // is small (decay->decay, not flat->steep) and these voices have long
      // releases, so any residual is negligible.
      const relStart = Math.max(atkEnd + 0.01, end - release);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0016, sustain * p), relStart);
      g.gain.exponentialRampToValueAtTime(0.0016, end);
    }
    g.gain.linearRampToValueAtTime(0, end + 0.008);           // then to TRUE zero — no stop click
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
    const env = envGain(ctx, time, durSec, 0.34 * (0.5 + 0.5 * vel), 0.006, Math.min(0.5, 0.25 + durSec * 0.3), 0.22); // struck EP: decays
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
    const env = envGain(ctx, time, durSec, 0.20 * (0.6 + 0.4 * vel), Math.min(0.5, 0.12 + durSec * 0.15), Math.min(1.2, 0.3 + durSec * 0.5), 0.86); // ensemble pad: sustained
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
    const env = envGain(ctx, time, durSec, 0.42 * (0.7 + 0.3 * vel), 0.012, Math.min(0.4, 0.2 + durSec * 0.2), 0.4); // bass: partial decay
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
      Math.min(2.2, 0.6 + durSec * 0.25), Math.min(4.0, 1.0 + durSec * 0.5), 0.92); // ambient pad: fully sustained
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
      Math.min(2.0, 0.5 + durSec * 0.2), Math.min(3.0, 0.8 + durSec * 0.4), 0.92); // drone: fully sustained
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
    const env = envGain(ctx, time, durSec, 0.2 * (0.5 + 0.5 * vel), 0.006, Math.min(0.7, 0.25 + durSec * 0.35), 0.24); // struck lo-fi EP: decays
    mod.connect(dev); dev.connect(car.frequency); car.connect(lp); lp.connect(env.gain); env.gain.connect(dest);
    car.start(time); mod.start(time);
    car.stop(env.stopAt); mod.stop(env.stopAt);
    disconnectOnEnd(car, [car, mod, dev, lp, env.gain]);
  }

  // ==========================================================================
  // EXPRESSIVE VOICES (Engine 04 — "Cantabile"): continuous intra-note control
  // ==========================================================================
  //
  // Every voice ABOVE sets its pitch ONCE (setValueAtTime) and cannot shape a
  // note after its onset. The instruments Engine 04 is built around — bowed
  // strings, a singing reed, an electric lead — get their expressivity from what
  // happens DURING each note: the pitch scoops or glides into place and can bend
  // on release, a delayed vibrato blooms, the amplitude swells (messa di voce),
  // and the timbre brightens or growls as the player leans in. These voices
  // therefore take a richer note: `note.expr` (all fields optional, sane
  // defaults) carries the per-note gesture the PERFORMER computed from the note's
  // place in the phrase and the piece's tension arc — so expression is
  // structural, not per-note jitter (wiki/expressive-performance.md). `note.pan`
  // (-1..1) seats the voice in the stereo field (a small ensemble is laid out in
  // space — wiki/effects-and-mixing.md, wiki/auditory-perception-basics.md
  // streaming).
  //
  // These are ORIGINAL synthetic instruments, not sampled or modeled imitations:
  // aria/reed/wire/glass share ONE expression control surface but each GENERATES
  // its tone differently, so the ear separates them the way it separates real
  // chamber voices (wiki/timbre-and-orchestration.md — attack + spectrum identify
  // an instrument). All keep the anti-click discipline (output gain from ~0, a
  // final linear ramp to TRUE zero) and disconnect onended (no growth over an
  // hour). Fixed ensemble/chorus offsets are baked into each oscillator's
  // FREQUENCY so the `detune` AudioParam is reserved entirely for expression.

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function centsRatio(c) { return Math.pow(2, (c || 0) / 1200); }

  // Local soft-clip curve for the electric-lead overdrive (fx.js keeps its own for
  // master glue; synth.js stays self-contained). Tarrabia/de Jong shape, a in (0,1).
  function softClip(a) {
    const k = 2 * a / (1 - a), N = 1024, c = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }

  // Expressive AMPLITUDE envelope with an optional intra-note SWELL (messa di
  // voce): attack -> [swell up to a peak, then ease down] -> release, all
  // exponential ramps to DEFINED endpoints (deterministic + identical in every
  // browser) plus a final linear ramp to TRUE zero. This is the amplitude "life"
  // a sustained expressive note has and a struck note cannot.
  //   e = { peak, attackSec, releaseSec, swell(0..1), swellPeak(0..1 pos), sustain(0..1 of peak) }
  function exprEnv(ctx, t, durSec, e) {
    const g = ctx.createGain();
    const peak = Math.max(0.0006, e.peak);
    const atk = Math.max(0.004, e.attackSec == null ? 0.02 : e.attackSec);
    const rel = Math.max(0.05, e.releaseSec == null ? 0.2 : e.releaseSec);
    const body = Math.max(atk + 0.05, durSec);
    const end = t + body;
    const atkEnd = t + Math.min(atk, body * 0.5);
    const sustain = Math.max(0.001, clamp(e.sustain == null ? 0.72 : e.sustain, 0.12, 1) * peak);
    const swell = clamp(e.swell || 0, 0, 1);
    const relStart = Math.max(atkEnd + 0.03, end - rel);
    g.gain.setValueAtTime(0.0006, t);
    if (swell > 0.05 && relStart > atkEnd + 0.09) {
      // rise to a lower initial level so the swell climbs INTO the peak.
      const start = Math.max(0.001, peak * (0.5 - 0.32 * swell));
      g.gain.exponentialRampToValueAtTime(start, atkEnd);
      const peakT = clamp(atkEnd + (relStart - atkEnd) * clamp(e.swellPeak == null ? 0.62 : e.swellPeak, 0.2, 0.9), atkEnd + 0.03, relStart - 0.03);
      g.gain.exponentialRampToValueAtTime(peak, peakT);
      g.gain.exponentialRampToValueAtTime(sustain, relStart);
    } else {
      g.gain.exponentialRampToValueAtTime(peak, atkEnd);
      g.gain.exponentialRampToValueAtTime(Math.max(sustain, peak * 0.5), relStart);
    }
    g.gain.exponentialRampToValueAtTime(0.0014, end);
    g.gain.linearRampToValueAtTime(0, end + 0.01);
    return { gain: g, stopAt: end + 0.02 };
  }

  // Apply PITCH expression to the given detune AudioParams (cents; additive on top
  // of each oscillator's fixed frequency). An onset glide (scoop/fall or legato
  // portamento) eases a starting offset to 0; an optional release bend eases to a
  // final offset; a delayed, blooming vibrato LFO is summed in (a static sustain is
  // a strong "mechanical" tell — wiki/expressive-performance.md). All ramps have
  // defined endpoints. Returns nodes to stop/disconnect.
  //   e = { onsetCents, onsetSec, releaseCents, releaseSec, vibRate, vibDepth(cents),
  //         vibDelay, vibRamp, vibEndRateMul }
  function pitchExpr(ctx, detunes, t, durSec, e) {
    const extra = [];
    const onset = e.onsetCents || 0;
    const onsetSec = clamp(e.onsetSec || 0.08, 0.02, Math.max(0.03, durSec * 0.6));
    const end = t + durSec;
    for (const dp of detunes) {
      if (onset) { dp.setValueAtTime(onset, t); dp.linearRampToValueAtTime(0, t + onsetSec); }
      else dp.setValueAtTime(0, t);
      if (e.releaseCents) {
        const relSec = clamp(e.releaseSec2 || 0.12, 0.04, Math.max(0.05, durSec * 0.5));
        const relStart = Math.max(t + onsetSec + 0.02, end - relSec);
        dp.setValueAtTime(0, relStart);
        dp.linearRampToValueAtTime(e.releaseCents, end);
      }
    }
    const depthC = e.vibDepth || 0;
    const delay = Math.max(0, e.vibDelay == null ? 0.25 : e.vibDelay);
    if (depthC > 0.5 && durSec > delay + 0.14) {
      const lfo = ctx.createOscillator(); lfo.type = 'sine';
      const rate = e.vibRate || 5.5;
      lfo.frequency.setValueAtTime(rate, t);
      if (e.vibEndRateMul && e.vibEndRateMul !== 1) lfo.frequency.linearRampToValueAtTime(rate * e.vibEndRateMul, end);
      const depth = ctx.createGain();
      const ramp = Math.max(0.06, e.vibRamp == null ? 0.5 : e.vibRamp);
      depth.gain.setValueAtTime(0.0001, t);
      depth.gain.setValueAtTime(0.0001, t + delay);
      depth.gain.linearRampToValueAtTime(depthC, Math.min(end, t + delay + ramp));
      lfo.connect(depth);
      for (const dp of detunes) depth.connect(dp);
      lfo.start(t); lfo.stop(end + 0.05);
      extra.push(lfo, depth);
    }
    return extra;
  }

  // A soft breath/bow NOISE layer (the "grain" of a real instrument): band-limited
  // noise tracking the note, enveloped like the tone. amount 0..1.
  function breathLayer(ctx, dest, t, durSec, freq, amount, hpHz) {
    if (amount < 0.02) return [];
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(hpHz || Math.min(3200, freq * 2.2), t);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(Math.min(6500, freq * 3), t); bp.Q.setValueAtTime(0.6, t);
    const g = ctx.createGain();
    const peak = 0.045 * clamp(amount, 0, 1);
    const atk = Math.min(0.12, 0.02 + durSec * 0.1);
    const end = t + Math.max(atk + 0.05, durSec);
    g.gain.setValueAtTime(0.0004, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0006, peak), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0012, end);
    g.gain.linearRampToValueAtTime(0, end + 0.01);
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(dest);
    noise.start(t, noiseOffset(t)); noise.stop(end + 0.03);
    return [noise, hp, bp, g];
  }

  // Chamber seating: a StereoPanner (or a plain gain fallback) connected to dest.
  function panTo(ctx, dest, pan) {
    let node;
    if (ctx.createStereoPanner) { node = ctx.createStereoPanner(); node.pan.value = clamp(pan || 0, -1, 1); }
    else node = ctx.createGain();
    node.connect(dest);
    return node;
  }

  // ==========================================================================
  // ORGANIC-TIMBRE helpers (Engine 04 v0.2): why do the expressive voices, for
  // all their intra-note motion, still read as "synthesized"? Three reasons,
  // straight from wiki/timbre-and-orchestration.md and wiki/synthesis-recipes.md:
  //
  //   (1) A synth's pitch is DEAD STEADY. A real bowed/blown/sung tone micro-
  //       wanders a few cents constantly — the single strongest "alive vs.
  //       electronic" cue. (`microDrift`)
  //   (2) A synth's spectrum comes straight from an oscillator through a pitch-
  //       TRACKING filter, so it has no fixed resonant body. Every real instrument
  //       colours all its pitches through the same UNMOVING formants of a physical
  //       body/cavity — a stable spectral-envelope signature. (`bodyResonance`)
  //   (3) The identifying ATTACK TRANSIENT (bow scratch, breath chiff, pick click)
  //       — "worth more than an elaborate sustain" — is missing or too clean.
  //       (`onsetTransient`)
  //
  // These are ORIGINAL synthesis, not sampling or a model of any specific
  // instrument; they stay deterministic + browser-identical (fixed-rate LFOs and
  // band-limited slices of the shared seeded noise buffer; every ramp has a
  // defined endpoint). Findings: wiki/original-sound-design.md.

  // (1) A slow, small, quasi-random pitch WANDER summed into `detune` (cents),
  // separate from — and under — vibrato. A few incommensurate sub-Hz sine LFOs
  // sum to a drift that reads as "human/analog", never as a wobble. Rates vary
  // per voice so simultaneous voices don't wander in lockstep (they beat, like a
  // real section). All LFOs start at phase 0 (drift begins at 0 — no jump).
  function microDrift(ctx, detunes, t, durSec, cents, rates) {
    if (!(cents > 0.03)) return [];
    const end = t + durSec + 0.05;
    const rs = rates || [0.11, 0.19, 0.31];
    const per = cents / rs.length;
    const nodes = [];
    for (const f of rs) {
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.setValueAtTime(f, t);
      const g = ctx.createGain(); g.gain.setValueAtTime(per, t);
      lfo.connect(g);
      for (const dp of detunes) g.connect(dp);
      lfo.start(t); lfo.stop(end);
      nodes.push(lfo, g);
    }
    return nodes;
  }

  // (2) A small stack of FIXED `peaking` filters — a formant "body" the tone always
  // passes through, at frequencies that DON'T track the played pitch. This is the
  // cue that a physical resonator is colouring the sound (the spectral-envelope
  // signature the ear reads as an instrument's identity). peaks = [[hz, dB, Q]…];
  // a post-trim keeps the +dB peaks from raising the note's level. Returns an
  // input node, an output node, and the node list for cleanup.
  function bodyResonance(ctx, peaks, t, trim) {
    const input = ctx.createGain(); input.gain.value = 1;
    let last = input; const nodes = [input];
    for (const p of peaks) {
      const f = ctx.createBiquadFilter(); f.type = 'peaking';
      f.frequency.setValueAtTime(p[0], t); f.gain.setValueAtTime(p[1], t); f.Q.setValueAtTime(p[2], t);
      last.connect(f); last = f; nodes.push(f);
    }
    const out = ctx.createGain(); out.gain.value = trim == null ? 0.8 : trim;
    last.connect(out); nodes.push(out);
    return { input: input, output: out, nodes: nodes };
  }

  // (3) A very short band-limited noise burst at the attack — the bow scratch /
  // breath chiff / pick click that IDENTIFIES the instrument (the first tens of ms
  // carry most of the identification). `kind` selects the colour; routes to the
  // voice's pan node so it sits in the same seat as the tone.
  function onsetTransient(ctx, dest, t, freq, amount, kind) {
    if (!(amount > 0.02)) return [];
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dec = 0.04, peak = 0.06 * clamp(amount, 0, 1);
    if (kind === 'scratch') { bp.type = 'bandpass'; bp.frequency.setValueAtTime(clamp(freq * 3, 700, 5000), t); bp.Q.setValueAtTime(0.8, t); dec = 0.05; }
    else if (kind === 'breath') { bp.type = 'highpass'; bp.frequency.setValueAtTime(clamp(freq * 2.4, 1100, 6000), t); bp.Q.setValueAtTime(0.5, t); dec = 0.07; peak *= 0.85; }
    else if (kind === 'click') { bp.type = 'bandpass'; bp.frequency.setValueAtTime(clamp(freq * 2.2, 900, 4200), t); bp.Q.setValueAtTime(1.2, t); dec = 0.02; peak *= 1.25; }
    else { bp.type = 'bandpass'; bp.frequency.setValueAtTime(clamp(freq * 3, 1500, 7000), t); bp.Q.setValueAtTime(0.7, t); }
    g.gain.setValueAtTime(0.0004, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0006, peak), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
    g.gain.linearRampToValueAtTime(0, t + dec + 0.008);
    noise.connect(bp); bp.connect(g); g.connect(dest);
    noise.start(t, noiseOffset(t)); noise.stop(t + dec + 0.03);
    return [noise, bp, g];
  }

  // ---- aria: warm bowed-string/voice hybrid (the mid "singer") --------------
  // Saw + triangle, a subtle baked chorus, through a resonant lowpass whose cutoff
  // opens toward the swell peak ("bow pressure") and eases back. The warm middle
  // voice; the largest swell affinity. Optional bow-noise grain.
  function aria(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq * centsRatio(-4), time);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * centsRatio(4), time);
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    const o2g = ctx.createGain(); o2g.gain.value = 0.85;
    const bright = clamp(e.bright == null ? 0.4 : e.bright, 0, 1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.9, time);
    const cut = clamp(freq * (2.4 + 3.6 * bright), 500, 7000);
    lp.frequency.setValueAtTime(cut * 0.7, time);
    lp.frequency.linearRampToValueAtTime(cut, time + Math.min(durSec * 0.5, 0.6));
    lp.frequency.linearRampToValueAtTime(cut * 0.8, time + Math.max(0.61, durSec));
    const env = exprEnv(ctx, time, durSec, { peak: 0.23 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.05 : e.attackSec, releaseSec: e.releaseSec == null ? 0.28 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.72 : e.sustain });
    // a warm string-ish body: fixed low-mid resonances + a presence peak
    const body = bodyResonance(ctx, [[280, 3, 1.4], [620, 2.4, 2.2], [2600, 2.6, 3]], time, 0.82);
    o1.connect(mix); o2.connect(o2g); o2g.connect(mix); mix.connect(lp); lp.connect(body.input); body.output.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, [o1.detune, o2.detune], time, durSec, e);
    const drift = microDrift(ctx, [o1.detune, o2.detune], time, durSec, (e.drift || 0) * 1.0, [0.11, 0.19, 0.31]);
    const on = onsetTransient(ctx, pan, time, freq, (e.grain == null ? 0.3 : e.grain) * 0.7 + 0.12, 'scratch');
    const br = breathLayer(ctx, pan, time, durSec, freq, (e.grain || 0) * 0.7, freq * 1.6);
    o1.start(time); o2.start(time); o1.stop(env.stopAt); o2.stop(env.stopAt);
    disconnectOnEnd(o1, [o1, o2, o2g, mix, lp, env.gain, pan].concat(body.nodes).concat(extra).concat(drift).concat(on).concat(br));
  }

  // ---- reed: bright, hollow, slightly nasal (the "horn") --------------------
  // A sawtooth split into a resonant "formant" bandpass (the nasal vowel peak) plus
  // a flat body path, through a lowpass. Breath-forward (highest grain floor). The
  // reediest, most vocal-forward of the four.
  function reed(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq, time);
    const bright = clamp(e.bright == null ? 0.5 : e.bright, 0, 1);
    const formant = ctx.createBiquadFilter(); formant.type = 'bandpass';
    formant.frequency.setValueAtTime(clamp(900 + 700 * bright, 500, 2200), time); formant.Q.setValueAtTime(1.4, time);
    const flatG = ctx.createGain(); flatG.gain.value = 0.6;
    const sum = ctx.createGain(); sum.gain.value = 1;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.6, time);
    lp.frequency.setValueAtTime(clamp(freq * (3 + 4 * bright), 700, 8000), time);
    const env = exprEnv(ctx, time, durSec, { peak: 0.2 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.035 : e.attackSec, releaseSec: e.releaseSec == null ? 0.2 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.8 : e.sustain });
    // a fixed nasal/hollow reed body under the pitch-tracking brightness formant
    const body = bodyResonance(ctx, [[560, 3.5, 2], [1500, 4, 3.2]], time, 0.8);
    o1.connect(formant); o1.connect(flatG); formant.connect(sum); flatG.connect(sum); sum.connect(lp); lp.connect(body.input); body.output.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, [o1.detune], time, durSec, e);
    const drift = microDrift(ctx, [o1.detune], time, durSec, (e.drift || 0) * 1.1, [0.13, 0.23, 0.41]);
    const on = onsetTransient(ctx, pan, time, freq, (e.grain == null ? 0.4 : e.grain) * 0.8 + 0.16, 'breath');
    const br = breathLayer(ctx, pan, time, durSec, freq, (e.grain == null ? 0.4 : e.grain) + 0.15, freq * 2);
    o1.start(time); o1.stop(env.stopAt);
    disconnectOnEnd(o1, [o1, formant, flatG, sum, lp, env.gain, pan].concat(body.nodes).concat(extra).concat(drift).concat(on).concat(br));
  }

  // ---- wire: electric lead with blooming grit (the "lead guitar") -----------
  // Two detuned saws -> a soft-clip overdrive whose DRIVE blooms toward the note's
  // peak (grit that grows as the player leans in) -> a resonant lowpass. Longest
  // sustain, widest default vibrato. The edgy voice.
  function wire(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq * centsRatio(-6), time);
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(freq * centsRatio(6), time);
    const pre = ctx.createGain(); pre.gain.value = 0.5;
    const bright = clamp(e.bright == null ? 0.55 : e.bright, 0, 1);
    const grit = clamp(e.grit == null ? 0.3 : e.grit, 0, 1);
    const drive = ctx.createGain();
    const driveBase = 1 + 3 * grit;
    drive.gain.setValueAtTime(driveBase * 0.6, time);
    drive.gain.linearRampToValueAtTime(driveBase, time + Math.min(durSec * 0.55, 0.7));
    drive.gain.linearRampToValueAtTime(driveBase * 0.7, time + Math.max(0.71, durSec));
    const shaper = ctx.createWaveShaper(); shaper.curve = softClip(clamp(0.2 + 0.72 * grit, 0.05, 0.95)); shaper.oversample = '2x';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(3 + 4 * bright, time);
    lp.frequency.setValueAtTime(clamp(freq * (2 + 4 * bright), 500, 6500), time);
    const post = ctx.createGain(); post.gain.value = 0.5 / (1 + grit);
    const env = exprEnv(ctx, time, durSec, { peak: 0.22 * (0.55 + 0.45 * vel), attackSec: e.attackSec == null ? 0.02 : e.attackSec, releaseSec: e.releaseSec == null ? 0.24 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.85 : e.sustain });
    // a fixed "cabinet"/body colour for the electric lead (amp-speaker resonances)
    const body = bodyResonance(ctx, [[520, 2.5, 1.5], [1900, 3.5, 2.4]], time, 0.82);
    o1.connect(pre); o2.connect(pre); pre.connect(drive); drive.connect(shaper); shaper.connect(lp); lp.connect(post); post.connect(body.input); body.output.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, [o1.detune, o2.detune], time, durSec, e);
    const drift = microDrift(ctx, [o1.detune, o2.detune], time, durSec, (e.drift || 0) * 1.3, [0.17, 0.29, 0.47]);
    const on = onsetTransient(ctx, pan, time, freq, (e.grain == null ? 0.1 : e.grain) * 0.5 + 0.14, 'click');
    o1.start(time); o2.start(time); o1.stop(env.stopAt); o2.stop(env.stopAt);
    disconnectOnEnd(o1, [o1, o2, pre, drive, shaper, lp, post, env.gain, pan].concat(body.nodes).concat(extra).concat(drift).concat(on));
  }

  // ---- glass: pure, shimmering, ethereal high voice -------------------------
  // A sine fundamental plus two faint, slightly-shimmered partials, softly
  // lowpassed, with a tiny breath chiff at onset. The clearest, most crystalline
  // voice (an original continuous-pitch instrument — musical-saw/theremin family
  // in spirit, imitating none). Gentle, slow vibrato reads best here.
  function glass(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const bright = clamp(e.bright == null ? 0.5 : e.bright, 0, 1);
    const partials = [[1, 1.0, 0], [2, 0.26 + 0.2 * bright, 4], [3, 0.1 * bright, -5]];
    const sum = ctx.createGain(); sum.gain.value = 0.85;
    const oscs = [], detunes = [];
    for (const [ratio, gg, shim] of partials) {
      if (gg < 0.012) continue;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * ratio * centsRatio(shim), time);
      const og = ctx.createGain(); og.gain.value = gg; o.connect(og); og.connect(sum);
      oscs.push(o); detunes.push(o.detune);
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.4, time);
    lp.frequency.setValueAtTime(clamp(freq * (3 + 5 * bright), 900, 9000), time);
    const env = exprEnv(ctx, time, durSec, { peak: 0.2 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.06 : e.attackSec, releaseSec: e.releaseSec == null ? 0.4 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.8 : e.sustain });
    // one gentle body peak only — glass stays the purest voice
    const body = bodyResonance(ctx, [[1900, 2, 1.8]], time, 0.9);
    sum.connect(lp); lp.connect(body.input); body.output.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, detunes, time, durSec, e);
    const drift = microDrift(ctx, detunes, time, durSec, (e.drift || 0) * 0.7, [0.09, 0.16, 0.27]);
    const br = breathLayer(ctx, pan, time, Math.min(0.12, durSec), freq, (e.grain || 0) * 0.5, freq * 3);
    for (const o of oscs) o.start(time);
    for (const o of oscs) o.stop(env.stopAt);
    disconnectOnEnd(oscs[0], oscs.concat([sum, lp, env.gain, pan]).concat(body.nodes).concat(extra).concat(drift).concat(br));
  }

  // ---- pluck: soft plucked harmonic — a SUPPORT voice -----------------------
  // Deliberately NOT expressive note-wise (fixed pitch, one decay): the quiet,
  // steady foil to the singing leads (wiki/timbre-and-orchestration.md
  // foreground/background). Two lightly-detuned triangles, a lowpass whose
  // brightness decays like a plucked string.
  function pluck(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.setValueAtTime(freq * centsRatio(-4), time);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * centsRatio(5), time);
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.6, time);
    lp.frequency.setValueAtTime(clamp(freq * 5, 800, 6000), time);
    lp.frequency.exponentialRampToValueAtTime(clamp(freq * 2.2, 400, 3000), time + Math.min(0.6, Math.max(0.1, durSec)));
    const dur = Math.max(0.18, durSec);
    const g = ctx.createGain();
    const peak = 0.2 * (0.5 + 0.5 * vel);
    g.gain.setValueAtTime(0.0005, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.006);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0016, 0.05 * peak), time + dur);
    g.gain.linearRampToValueAtTime(0, time + dur + 0.01);
    o1.connect(mix); o2.connect(mix); mix.connect(lp); lp.connect(g); g.connect(pan);
    const endAt = time + dur + 0.03;
    o1.start(time); o2.start(time); o1.stop(endAt); o2.stop(endAt);
    disconnectOnEnd(o1, [o1, o2, mix, lp, g, pan]);
  }

  // ---- organ: glowing additive sustain (drawbar family in spirit, imitating
  // none) — session 039's "richer, more complex tones" request. A small stack
  // of pure partials in two slightly-detuned ranks (the detuning beats gently,
  // so the sustain is never static), a delayed TREMULANT (amplitude LFO) whose
  // depth follows the expression drive, and a fixed wooden-case body. The
  // steadiest of the sustained voices: pitch drift is minimal; the life is in
  // the rank beating and the tremulant. Reads note.expr like aria/reed.
  function organ(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const bright = clamp(e.bright == null ? 0.45 : e.bright, 0, 1);
    // [ratio, gain] — fundamental doubled as two detuned ranks
    const partials = [[1, 0.62, -4], [1, 0.62, 4], [2, 0.5, 2], [3, 0.26, -2], [4, 0.18, 3], [6, 0.09 + 0.08 * bright, -3]];
    const sum = ctx.createGain(); sum.gain.value = 0.55;
    const oscs = [], detunes = [];
    for (const [ratio, gg, dc] of partials) {
      if (gg < 0.012) continue;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq * ratio * centsRatio(dc), time);
      const og = ctx.createGain(); og.gain.value = gg;
      o.connect(og); og.connect(sum);
      oscs.push(o); detunes.push(o.detune);
    }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.5, time);
    lp.frequency.setValueAtTime(clamp(freq * (3.5 + 4 * bright), 900, 9000), time);
    // tremulant: delayed, gentle amplitude wobble (the organ's vibrato reads
    // as tremolo; pitch vibrato via note.expr stays available on top)
    const trem = ctx.createGain(); trem.gain.setValueAtTime(1, time);
    const env = exprEnv(ctx, time, durSec, { peak: 0.2 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.05 : e.attackSec, releaseSec: e.releaseSec == null ? 0.3 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.92 : e.sustain });
    const nodes = [sum, lp, trem, env.gain, pan];
    if (durSec > 0.5) {
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.setValueAtTime(5.2, time);
      const depth = ctx.createGain();
      const tdep = 0.04 + 0.09 * clamp(e.swell == null ? 0.3 : e.swell, 0, 1);
      depth.gain.setValueAtTime(0.0001, time);
      depth.gain.setValueAtTime(0.0001, time + 0.4);
      depth.gain.linearRampToValueAtTime(tdep, Math.min(env.stopAt, time + 1.1));
      lfo.connect(depth); depth.connect(trem.gain);
      lfo.start(time); lfo.stop(env.stopAt);
      nodes.push(lfo, depth);
    }
    // a fixed case/pipe body colour
    const body = bodyResonance(ctx, [[350, 2.2, 1.3], [1600, 2, 2.2]], time, 0.85);
    sum.connect(lp); lp.connect(body.input); body.output.connect(trem); trem.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, detunes, time, durSec, e);
    const drift = microDrift(ctx, detunes, time, durSec, (e.drift || 0) * 0.5, [0.07, 0.13, 0.23]);
    const on = onsetTransient(ctx, pan, time, freq, 0.08, 'click'); // faint key chiff
    for (const o of oscs) o.start(time);
    for (const o of oscs) o.stop(env.stopAt);
    disconnectOnEnd(oscs[0], oscs.concat(nodes).concat(body.nodes).concat(extra).concat(drift).concat(on));
  }

  // ---- horn: dark, warm, blooming brass-like lead (imitating none) ----------
  // Two detuned saws + a soft sub-octave through a lowpass that OPENS through
  // the note ("the bloom" — the defining brass gesture: brightness arrives
  // after the onset, grows toward the swell peak, and eases back), with fixed
  // bell/tube formants and a breath-chiff onset. Reads note.expr fully.
  function horn(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq * centsRatio(-3), time);
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(freq * centsRatio(3), time);
    const sub = ctx.createOscillator(); sub.type = 'triangle'; sub.frequency.setValueAtTime(freq * 0.5, time);
    const subG = ctx.createGain(); subG.gain.value = 0.3;
    const pre = ctx.createGain(); pre.gain.value = 0.52;
    const bright = clamp(e.bright == null ? 0.45 : e.bright, 0, 1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(1.1, time);
    const cutLo = clamp(freq * 1.6, 300, 2400);
    const cutHi = clamp(freq * (2.6 + 3.2 * bright), 700, 7000);
    lp.frequency.setValueAtTime(cutLo, time);
    lp.frequency.linearRampToValueAtTime(cutHi, time + Math.min(0.7, Math.max(0.12, durSec * 0.45)));
    lp.frequency.linearRampToValueAtTime((cutLo + cutHi) * 0.55, time + Math.max(0.71, durSec));
    const env = exprEnv(ctx, time, durSec, { peak: 0.21 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.055 : e.attackSec, releaseSec: e.releaseSec == null ? 0.22 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.85 : e.sustain });
    // a fixed dark bell/tube body
    const body = bodyResonance(ctx, [[480, 3, 1.6], [1150, 2.6, 2.2]], time, 0.8);
    o1.connect(pre); o2.connect(pre); sub.connect(subG); subG.connect(pre);
    pre.connect(lp); lp.connect(body.input); body.output.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, [o1.detune, o2.detune, sub.detune], time, durSec, e);
    const drift = microDrift(ctx, [o1.detune, o2.detune, sub.detune], time, durSec, (e.drift || 0) * 1.1, [0.12, 0.2, 0.37]);
    const on = onsetTransient(ctx, pan, time, freq, (e.grain == null ? 0.3 : e.grain) * 0.6 + 0.12, 'breath');
    const br = breathLayer(ctx, pan, time, durSec, freq, (e.grain || 0) * 0.5, freq * 1.8);
    o1.start(time); o2.start(time); sub.start(time);
    o1.stop(env.stopAt); o2.stop(env.stopAt); sub.stop(env.stopAt);
    disconnectOnEnd(o1, [o1, o2, sub, subG, pre, lp, env.gain, pan].concat(body.nodes).concat(extra).concat(drift).concat(on).concat(br));
  }

  // ---- voce: soft singing vowel voice (the most vocal, imitating none) ------
  // A saw+triangle source split through two resonant vowel-formant bandpasses
  // that MORPH slowly during the note (an "ah" opening toward "eh" — a mouth
  // is never still) over a dark fundamental path, with breath grain and a
  // deeper default vibrato. The strongest carrier of variable pitch: scoops,
  // portamento, and vibrato all read as singing. Reads note.expr fully.
  function voce(ctx, dest, note) {
    const { freq, time, durSec, vel } = note;
    const e = note.expr || {};
    const pan = panTo(ctx, dest, note.pan);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq * centsRatio(-3), time);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * centsRatio(3), time);
    const src = ctx.createGain(); src.gain.value = 0.5;
    const o2g = ctx.createGain(); o2g.gain.value = 0.8;
    o1.connect(src); o2.connect(o2g); o2g.connect(src);
    // vowel formants: centers keep a floor above the fundamental so high notes
    // stay full; F2 glides up a little during the note (the vowel opens)
    const morphT = Math.min(1.2, Math.max(0.25, durSec * 0.7));
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.setValueAtTime(5, time);
    const f1c = clamp(freq * 1.15, 480, 950);
    f1.frequency.setValueAtTime(f1c, time);
    f1.frequency.linearRampToValueAtTime(f1c * 0.88, time + morphT);
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.setValueAtTime(7, time);
    const f2c = clamp(freq * 2.4, 1150, 2300);
    f2.frequency.setValueAtTime(f2c, time);
    f2.frequency.linearRampToValueAtTime(Math.min(2600, f2c * 1.22), time + morphT);
    const f1g = ctx.createGain(); f1g.gain.value = 1.1;
    const f2g = ctx.createGain(); f2g.gain.value = 0.55;
    // dark fundamental path so the tone has a chest under the vowels
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.setValueAtTime(0.5, time);
    lp.frequency.setValueAtTime(clamp(freq * 2.2, 500, 2600), time);
    const lpg = ctx.createGain(); lpg.gain.value = 0.6;
    const sum = ctx.createGain(); sum.gain.value = 1.7; // the resonant formant paths are lossy — bring the voice up to lead level
    src.connect(f1); f1.connect(f1g); f1g.connect(sum);
    src.connect(f2); f2.connect(f2g); f2g.connect(sum);
    src.connect(lp); lp.connect(lpg); lpg.connect(sum);
    const env = exprEnv(ctx, time, durSec, { peak: 0.22 * (0.5 + 0.5 * vel), attackSec: e.attackSec == null ? 0.07 : e.attackSec, releaseSec: e.releaseSec == null ? 0.32 : e.releaseSec, swell: e.swell, swellPeak: e.swellPeak, sustain: e.sustain == null ? 0.8 : e.sustain });
    sum.connect(env.gain); env.gain.connect(pan);
    const extra = pitchExpr(ctx, [o1.detune, o2.detune], time, durSec, e);
    const drift = microDrift(ctx, [o1.detune, o2.detune], time, durSec, (e.drift || 0) * 1.2 + 1.2, [0.12, 0.21, 0.34]);
    const on = onsetTransient(ctx, pan, time, freq, 0.1, 'breath');
    const br = breathLayer(ctx, pan, time, durSec, freq, (e.grain == null ? 0.3 : e.grain) * 0.8 + 0.1, freq * 2);
    o1.start(time); o2.start(time); o1.stop(env.stopAt); o2.stop(env.stopAt);
    disconnectOnEnd(o1, [o1, o2, o2g, src, f1, f2, f1g, f2g, lp, lpg, sum, env.gain, pan].concat(extra).concat(drift).concat(on).concat(br));
  }

  // ==========================================================================
  // PERCUSSION VOICES (Engine 05 — "Percussion Ensemble")
  // --------------------------------------------------------------------------
  // Original struck-percussion voices built from the acoustic first principles
  // in wiki/percussion-sound-design.md — NOT samples and NOT a copy of any named
  // instrument (the brief: "seek inspiration from but do not copy the voices of
  // actual percussion instruments"). Three synthesis families cover the palette:
  //
  //   1. MEMBRANE drums (boom/drum) — a pitch-dropping fundamental plus a few
  //      INHARMONIC 2-D circular-membrane partials. An ideal circular membrane's
  //      modes are inharmonic: 1 : 1.59 : 2.14 : 2.30 : 2.65 : 2.92 … (Rossing,
  //      Science of Percussion Instruments). Real drumheads pull these toward
  //      harmonic via air loading; we keep them mildly inharmonic — that spread
  //      is exactly what reads as "a struck skin" rather than "a synth sine," and
  //      the downward pitch glide during the attack is the identifying gesture.
  //   2. MODAL bars/wood/metal (wood/metal/mallet) — a small bank of decaying
  //      inharmonic sinusoids. Ratios + decay set the material: an ideal free bar
  //      is 1 : 2.756 : 5.404 (wood, short, low-Q character); a tuned marimba bar
  //      is undercut to 1 : 4 : 10 (a pitched mallet); a struck idiophone/bell
  //      keeps a minor-third "tierce" partial (~1.2) so it stays bell-like.
  //   3. NOISE plates/shakers (shaker/gong) — shaped filtered noise (a fast
  //      two-phase burst for a shaker; a long, blooming, dense inharmonic cluster
  //      + noise wash for a gong/crash).
  //
  // Every voice reads an OPTIONAL note.p params object so the engine's global
  // timbre macros (Tune / Ring / Attack / Brightness) can reshape the whole kit —
  // the "adjustable timbre, attack, fade" the brief asks for — while the intrinsic
  // partial structure keeps each voice DISTINCT. All deterministic (shared seeded
  // noise buffer + fixed ratios, no Math.random) and click-safe (true-zero tails).
  // note.p fields (all optional, neutral defaults): tune (cents), decay (mult),
  // attack (mult), bright (mult, filter cutoff), noise (0..1 extra grit), inharm
  // (mult, partial-ratio spread). note.pan (-1..1) seats the voice in the field.
  // ==========================================================================
  const _EMPTY = {};
  function pv(p, k, d) { const v = p[k]; return (typeof v === 'number' && isFinite(v)) ? v : d; }

  // Modal strike: sum decaying sines at `partials` = [[ratio, gain, decayScale]…]
  // of `baseFreq`. `decay` = fundamental decay seconds; higher partials decay
  // faster (decayScale < 1 -> "brighter attack, darker tail", the natural τ∝1/f).
  // `inharm` spreads ratios away from 1 (>1 = more clangy/metallic). Each partial
  // is one exponential decay to a floor then a linear ramp to TRUE zero.
  function modalBank(ctx, baseFreq, time, partials, level, decay, attack, inharm) {
    const out = ctx.createGain(); out.gain.value = 1;
    const nodes = [out];
    let endAt = time + 0.05;
    const sp = inharm == null ? 1 : inharm;
    for (const pr of partials) {
      const ratio = 1 + (pr[0] - 1) * sp;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(Math.max(20, baseFreq * ratio), time);
      const ge = ctx.createGain();
      const dec = Math.max(0.015, decay * pr[2]);
      ge.gain.setValueAtTime(0.0001, time);
      ge.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * pr[1]), time + attack);
      ge.gain.exponentialRampToValueAtTime(0.0009, time + attack + dec);
      ge.gain.linearRampToValueAtTime(0, time + attack + dec + 0.01);
      o.connect(ge); ge.connect(out);
      const e = time + attack + dec + 0.02;
      o.start(time); o.stop(e);
      nodes.push(o, ge);
      if (e > endAt) endAt = e;
    }
    return { out, nodes, endAt };
  }

  // A short band-limited noise transient (the strike/attack of a struck object),
  // scaled and colored — returns nodes for cleanup. Reuses the shared seeded
  // noise buffer (deterministic slices), like snare/hat.
  function noiseBurst(ctx, dest, time, peak, dec, hpHz, bpHz, bpQ) {
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    let head = noise;
    const chain = [noise];
    if (hpHz) { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(hpHz, time); head.connect(hp); head = hp; chain.push(hp); }
    if (bpHz) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(bpHz, time); bp.Q.setValueAtTime(bpQ || 0.8, time); head.connect(bp); head = bp; chain.push(bp); }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0004, peak), time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0009, time + dec);
    g.gain.linearRampToValueAtTime(0, time + dec + 0.006);
    head.connect(g); g.connect(dest);
    const endAt = time + dec + 0.02;
    noise.start(time, noiseOffset(time)); noise.stop(endAt);
    chain.push(g);
    return { chain, endAt };
  }

  // ---- boom: deep anchor drum (bass drum / surdo / dundun family) ------------
  // The low weight of the ensemble — a fast pitch-drop fundamental with a soft
  // beater click and one faint membrane partial for body. Kept round; the point
  // is the low thump that anchors the meter (wiki/groove-and-embodiment.md: put
  // timekeeping weight in the low drum). Pitched via freq so it can be tuned.
  function boom(ctx, dest, note) {
    const { time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(40, Math.min(110, (note.freq || 70) * centsRatio(pv(p, 'tune', 0))));
    const attackMul = pv(p, 'attack', 1), decMul = pv(p, 'decay', 1);
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(base * (2.0 + 0.5 * vel), time);
    osc.frequency.exponentialRampToValueAtTime(base, time + 0.07);
    const g = ctx.createGain();
    const peak = 0.95 * (0.55 + 0.45 * vel);
    const dec = (0.24 + 0.12 * vel) * decMul;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0016, time + dec);
    g.gain.linearRampToValueAtTime(0, time + dec + 0.012);
    osc.connect(g); g.connect(pan);
    const endAt = time + dec + 0.03;
    osc.start(time); osc.stop(endAt);
    const extra = [osc, g, pan];
    // soft beater click (a little wooden knock), scaled by the attack macro
    const clk = noiseBurst(ctx, pan, time, 0.10 * (0.4 + 0.6 * vel) * attackMul, 0.012, 900, 2400, 0.9);
    extra.push.apply(extra, clk.chain);
    disconnectOnEnd(osc, extra);
  }

  // ---- drum: mid membrane hand-drum (conga/djembe/tom family) ----------------
  // The ensemble's tonal workhorse. Fundamental pitch-drop + INHARMONIC membrane
  // partials (1.59, 2.14 — the ideal-membrane ratios) + an attack noise transient.
  // Three strokes via tags, the hand-drum idiom (wiki/west-african-rhythm.md,
  // three strokes bass/tone/slap): 'slap' = bright, noisy, short crack; 'mute' =
  // damped/short; default 'tone' = ringing skin; 'open'/'bass' = fuller/longer.
  function drum(ctx, dest, note) {
    const { time, vel, tags } = note; const p = note.p || _EMPTY;
    const t = tags || [];
    const slap = t.indexOf('slap') !== -1, mute = t.indexOf('mute') !== -1, bassStroke = t.indexOf('bass') !== -1 || t.indexOf('open') !== -1;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(70, Math.min(400, (note.freq || 180) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1), brightMul = pv(p, 'bright', 1);
    const noiseAmt = (slap ? 0.9 : bassStroke ? 0.22 : 0.4) + pv(p, 'noise', 0);
    const decBase = (slap ? 0.10 : mute ? 0.07 : bassStroke ? 0.34 : 0.22) * decMul;
    // fundamental with a short downward glide (skin tension release)
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(base * (slap ? 1.9 : 1.5), time);
    osc.frequency.exponentialRampToValueAtTime(base, time + (slap ? 0.03 : 0.05));
    const og = ctx.createGain();
    const tonePeak = 0.5 * (slap ? 0.5 : 1) * (0.5 + 0.5 * vel);
    og.gain.setValueAtTime(0.0001, time);
    og.gain.exponentialRampToValueAtTime(tonePeak, time + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0016, time + decBase);
    og.gain.linearRampToValueAtTime(0, time + decBase + 0.01);
    osc.connect(og); og.connect(pan);
    // inharmonic membrane partials (the "skin" color) — quiet, faster decay
    const bank = modalBank(ctx, base, time, [[1.59, 0.22, 0.6], [2.14, 0.13, 0.42], [2.30, 0.08, 0.34]],
      0.4 * (0.5 + 0.5 * vel) * (mute ? 0.5 : 1), decBase * 0.9, 0.003, 1);
    const bankG = ctx.createGain(); bankG.gain.value = bassStroke ? 0.5 : 0.8;
    bank.out.connect(bankG); bankG.connect(pan);
    // attack noise (skin slap / stick), brighter for a slap
    const nb = noiseBurst(ctx, pan, time, 0.34 * noiseAmt * (0.4 + 0.6 * vel), slap ? 0.05 : 0.02,
      slap ? 1200 : 500, (slap ? 3200 : 1700) * brightMul, slap ? 0.8 : 0.6);
    osc.start(time); osc.stop(time + decBase + 0.04);
    const nodes = [osc, og, bankG, pan].concat(bank.nodes, nb.chain);
    disconnectOnEnd(osc, nodes);
  }

  // ---- wood: struck wood (woodblock / clave / temple block / log drum) -------
  // Short, dry, hollow "pock." Modal bank at ideal-bar ratios (1 : 2.76 : 5.4),
  // fast decay, a hard knock transient. Pitched via freq (temple blocks and log
  // drums are tuned across a range). p.bright hardens the mallet.
  function wood(ctx, dest, note) {
    const { time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(120, Math.min(2200, (note.freq || 900) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1), brightMul = pv(p, 'bright', 1);
    const bank = modalBank(ctx, base, time, [[1, 1.0, 1.0], [2.76, 0.34, 0.5], [5.4, 0.12, 0.28]],
      0.34 * (0.5 + 0.5 * vel), (0.05 + 0.04 * vel) * decMul, 0.002, pv(p, 'inharm', 1));
    bank.out.connect(pan);
    // a dry click for the "knock"
    const nb = noiseBurst(ctx, pan, time, 0.12 * (0.4 + 0.6 * vel), 0.008, 1200, Math.min(6000, base * 2.4) * brightMul, 1.1);
    disconnectOnEnd(bank.nodes[1] || bank.out, bank.nodes.concat(nb.chain, [pan]));
  }

  // ---- metal: struck idiophone bell (cowbell / agogô / bell-plate / triangle) -
  // A metallic "clang/ping" — a small bank of strongly inharmonic partials with a
  // longer, brighter ring than wood. Keeps a minor-third-ish partial so it reads
  // as a bell. p.inharm spreads the ratios (cowbell clang ↔ pure ping); p.decay
  // covers a damped cowbell (short) to a triangle (long). Distinct from the
  // ambient `bell` voice (which is soft/long); this one bites.
  function metal(ctx, dest, note) {
    const { time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(160, Math.min(3200, (note.freq || 540) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1);
    const bank = modalBank(ctx, base, time,
      [[1, 1.0, 1.0], [1.19, 0.6, 0.9], [1.56, 0.5, 0.8], [2.0, 0.38, 0.66], [2.66, 0.22, 0.5], [3.01, 0.14, 0.4]],
      0.16 * (0.45 + 0.55 * vel), (0.5 + 0.5 * vel) * decMul, 0.002, pv(p, 'inharm', 1));
    // a bright metallic click on the strike
    const nb = noiseBurst(ctx, pan, time, 0.06 * (0.4 + 0.6 * vel) * pv(p, 'bright', 1), 0.01, 3000, 7000, 0.7);
    bank.out.connect(pan);
    disconnectOnEnd(bank.nodes[1] || bank.out, bank.nodes.concat(nb.chain, [pan]));
  }

  // ---- gong: plate / tam-tam / crash cymbal ----------------------------------
  // A dense, blooming inharmonic wash — many close inharmonic partials plus a
  // highpassed noise cloud, with a slow attack "bloom" (a real gong's energy
  // rises for a moment before it decays) and a long tail. The ensemble's big
  // colour and climax voice. p.decay sets size (a splash cymbal ↔ a huge tam-tam),
  // p.bright the shimmer. Deterministic fixed partial set (no Math.random).
  function gong(ctx, dest, note) {
    const { time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(150, Math.min(700, (note.freq || 300) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1), brightMul = pv(p, 'bright', 1);
    const dur = (1.8 + 1.6 * vel) * decMul;
    const bloom = Math.min(0.4, 0.12 + 0.18 * vel);   // energy rises for a moment
    // dense inharmonic cluster (fixed irrational-ish ratios)
    const ratios = [1, 1.31, 1.68, 2.07, 2.53, 3.11, 3.74, 4.51, 5.36];
    const out = ctx.createGain(); out.gain.value = 1; out.connect(pan);
    const nodes = [out, pan];
    let endAt = time + dur;
    for (let i = 0; i < ratios.length; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base * ratios[i], time);
      const ge = ctx.createGain();
      const g = 0.05 * (0.5 + 0.5 * vel) / (1 + i * 0.5);
      const dec = dur * (0.9 - i * 0.06);
      ge.gain.setValueAtTime(0.0001, time);
      ge.gain.exponentialRampToValueAtTime(Math.max(0.0003, g), time + bloom * (0.5 + i * 0.05));
      ge.gain.exponentialRampToValueAtTime(0.0006, time + dec);
      ge.gain.linearRampToValueAtTime(0, time + dec + 0.02);
      o.connect(ge); ge.connect(out);
      const e = time + dec + 0.04; o.start(time); o.stop(e);
      nodes.push(o, ge);
      if (e > endAt) endAt = e;
    }
    // shimmer: highpassed noise cloud that blooms and fades
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(1800 * brightMul, time);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(12000, 6000 * brightMul), time);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, time);
    ng.gain.exponentialRampToValueAtTime(0.05 * (0.4 + 0.6 * vel), time + bloom);
    ng.gain.exponentialRampToValueAtTime(0.0006, time + dur * 0.85);
    ng.gain.linearRampToValueAtTime(0, time + dur * 0.85 + 0.03);
    noise.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(out);
    noise.start(time, noiseOffset(time)); noise.stop(endAt);
    nodes.push(noise, hp, lp, ng);
    disconnectOnEnd(noise, nodes);
  }

  // ---- shaker: enveloped filtered noise (maraca / cabasa / ganzá / shekere) ---
  // A grain of shaped noise. Real shakers are a burst of many bead collisions —
  // a fast attack and a short decay; a stressed "accent" hit is louder/longer.
  // p.bright picks bright cabasa ↔ darker maraca; p.decay the length. Doubles as
  // a closed-hat-like tick at high brightness. tag 'accent' = louder/longer.
  function shaker(ctx, dest, note) {
    const { time, vel, tags } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const accent = (tags || []).indexOf('accent') !== -1;
    const decMul = pv(p, 'decay', 1), brightMul = pv(p, 'bright', 1);
    const dec = (accent ? 0.075 : 0.045) * decMul;
    const nb = noiseBurst(ctx, pan, time, 0.14 * (0.35 + 0.65 * vel) * (accent ? 1.25 : 1), dec,
      3500 * brightMul, 7200 * brightMul, 0.6 + pv(p, 'inharm', 0) * 0.4);
    disconnectOnEnd(nb.chain[0], nb.chain.concat([pan]));
  }

  // ---- mallet: tuned bar (marimba / kalimba / xylophone) ----------------------
  // The optional MELODIC ACCOMPANIMENT voice — pitched, warm, modal. A tuned bar
  // is undercut so its first overtone is a clean 4:1 (marimba) or 3:1 (xylophone,
  // via the 'xylo' tag — brighter, drier), which is why it reads as a definite
  // pitch. A soft mallet lowpass keeps it warm; medium decay. Kept quiet in the
  // engine so it accompanies the drums rather than leading them.
  function mallet(ctx, dest, note) {
    const { freq, time, vel, tags } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const xylo = (tags || []).indexOf('xylo') !== -1;
    const base = (freq || 220) * centsRatio(pv(p, 'tune', 0));
    const decMul = pv(p, 'decay', 1), brightMul = pv(p, 'bright', 1);
    const partials = xylo ? [[1, 1.0, 1.0], [3.0, 0.34, 0.4], [6.0, 0.1, 0.22]]
                          : [[1, 1.0, 1.0], [4.0, 0.28, 0.42], [10.0, 0.08, 0.2]];
    const bank = modalBank(ctx, base, time, partials, 0.26 * (0.45 + 0.55 * vel),
      (xylo ? 0.18 : 0.5) * decMul, 0.003, 1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, base * (xylo ? 8 : 5) * brightMul), time); lp.Q.setValueAtTime(0.4, time);
    bank.out.connect(lp); lp.connect(pan);
    disconnectOnEnd(bank.nodes[1] || bank.out, bank.nodes.concat([lp, pan]));
  }

  // ---- clap: hand-clap / stick (body-percussion impact) ----------------------
  // A clap is several hands striking slightly spread in time — a short comb of
  // band-passed noise bursts (~1 kHz) plus a brief body tail; the 808-clap idea,
  // built originally. The `stick` tag collapses it to one sharp high click (a
  // rimshot/claves-stick). Enables hand-clap ensembles (Reich, flamenco palmas,
  // gospel) as a distinct timbral type. p.bright shifts the band, p.decay the tail.
  function clap(ctx, dest, note) {
    const { time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const bright = pv(p, 'bright', 1), decMul = pv(p, 'decay', 1);
    const single = (note.tags || []).indexOf('stick') !== -1;
    const lvl = 0.42 * (0.4 + 0.6 * vel);
    const nodes = [pan]; let lastSrc = null;
    // taps: [offsetSec, levelScale, decaySec] — a spread hand-clap, or one stick click
    const taps = single
      ? [[0, 1.15, 0.013 * decMul]]
      : [[0, 1.0, 0.006], [0.008, 0.82, 0.006], [0.017, 0.6, 0.006], [0.024, 0.95, 0.08 * decMul]];
    for (const t of taps) {
      const b = noiseBurst(ctx, pan, time + t[0], lvl * t[1], t[2], single ? 900 : 620, (single ? 1750 : 1150) * bright, single ? 1.5 : 1.1);
      nodes.push.apply(nodes, b.chain); lastSrc = b.chain[0];
    }
    disconnectOnEnd(lastSrc, nodes);
  }

  // ---- scrape: guiro / cabasa / rasp (scraped idiophone) ---------------------
  // A scraped, not struck, sound — a short "rrrip" of band-passed noise gated by a
  // fast tremolo (the instrument's ridges). Distinct gesture-type from the shaker's
  // single burst. p.bright picks the band, p.decay the stroke length; a longer
  // note.durBeats makes a longer scrape.
  function scrape(ctx, dest, note) {
    const { time, vel, durSec } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const bright = pv(p, 'bright', 1), decMul = pv(p, 'decay', 1);
    const dur = Math.max(0.07, Math.min(0.4, (durSec ? Math.min(durSec, 0.3) : 0.13) * decMul));
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(ctx); noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2800 * bright, time); bp.Q.setValueAtTime(1.4, time);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(1100, time);
    const g = ctx.createGain();
    const lvl = 0.16 * (0.4 + 0.6 * vel);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(lvl, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0012, time + dur);
    g.gain.linearRampToValueAtTime(0, time + dur + 0.01);
    // grain buzz: a fast square tremolo gates an inner gain 0..1 (the ridges)
    const trem = ctx.createOscillator(); trem.type = 'square'; trem.frequency.setValueAtTime(42 + 20 * bright, time);
    const tremG = ctx.createGain(); tremG.gain.setValueAtTime(0.5, time);
    const inner = ctx.createGain(); inner.gain.setValueAtTime(0.5, time);
    trem.connect(tremG); tremG.connect(inner.gain);
    noise.connect(bp); bp.connect(hp); hp.connect(inner); inner.connect(g); g.connect(pan);
    const endAt = time + dur + 0.03;
    noise.start(time, noiseOffset(time)); trem.start(time); noise.stop(endAt); trem.stop(endAt);
    disconnectOnEnd(noise, [noise, bp, hp, inner, g, trem, tremG, pan]);
  }

  // ---- chime: pitched ringing metal (steel pan / hang / crotale spirit) -------
  // A CLEAR, tonal metal — a near-harmonic modal bank (octave + twelfth strong,
  // lightly stretched) with a bright strike shimmer and a long-ish ring. Distinct
  // from the clangy inharmonic `metal` and the wooden `mallet`; PITCHED, so it can
  // carry melody/sparkle. p.tune/decay/bright/inharm.
  function chime(ctx, dest, note) {
    const { freq, time, vel } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const base = Math.max(180, Math.min(2400, (freq || 520) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1), bright = pv(p, 'bright', 1);
    const bank = modalBank(ctx, base, time,
      [[1, 1.0, 1.0], [2.01, 0.5, 0.72], [3.0, 0.34, 0.54], [4.04, 0.2, 0.4], [5.42, 0.1, 0.28]],
      0.15 * (0.45 + 0.55 * vel), (0.7 + 0.6 * vel) * decMul, 0.002, pv(p, 'inharm', 1));
    const nb = noiseBurst(ctx, pan, time, 0.04 * (0.4 + 0.6 * vel) * bright, 0.02, 4000, 9000, 0.7);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(12000, base * 8 * bright), time); lp.Q.setValueAtTime(0.3, time);
    bank.out.connect(lp); lp.connect(pan);
    disconnectOnEnd(bank.nodes[1] || bank.out, bank.nodes.concat(nb.chain, [lp, pan]));
  }

  // ---- friction: cuíca-style friction drum (pitch-bending "whoop") -----------
  // A resonant, vocal, PITCH-BENDING tone — a sawtooth through two vowel-formant
  // band-passes with a glide up (default) or down (`down` tag), plus a friction
  // squeak. The organic, voice-like member of the palette; a very different
  // gesture-type. p.tune/decay/bright.
  function friction(ctx, dest, note) {
    const { freq, time, durSec, vel, tags } = note; const p = note.p || _EMPTY;
    const pan = panTo(ctx, dest, note.pan);
    const down = (tags || []).indexOf('down') !== -1;
    const base = Math.max(90, Math.min(600, (freq || 220) * centsRatio(pv(p, 'tune', 0))));
    const decMul = pv(p, 'decay', 1), bright = pv(p, 'bright', 1);
    const dur = Math.max(0.12, Math.min(0.6, (durSec ? Math.min(durSec, 0.5) : 0.26) * decMul));
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const f0 = down ? base * 1.5 : base * 0.7, f1 = down ? base * 0.7 : base * 1.5;
    osc.frequency.setValueAtTime(f0, time);
    osc.frequency.exponentialRampToValueAtTime(f1, time + dur * 0.8);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(600 * bright, time); bp.Q.setValueAtTime(4, time);
    const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.setValueAtTime(1200 * bright, time); bp2.Q.setValueAtTime(6, time);
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    const g = ctx.createGain();
    const lvl = 0.28 * (0.4 + 0.6 * vel);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(lvl, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0016, time + dur);
    g.gain.linearRampToValueAtTime(0, time + dur + 0.01);
    const nb = noiseBurst(ctx, pan, time, 0.05 * (0.3 + 0.7 * vel), dur * 0.7, 700, 1400 * bright, 3);
    osc.connect(bp); osc.connect(bp2); bp.connect(mix); bp2.connect(mix); mix.connect(g); g.connect(pan);
    const endAt = time + dur + 0.03;
    osc.start(time); osc.stop(endAt);
    disconnectOnEnd(osc, [osc, bp, bp2, mix, g, pan].concat(nb.chain));
  }

  // Voice registry, keyed by the composer's `voice` field.
  const VOICES = { melody: keys, chord: strings, bass: bass, bell: bell, pad: pad, drone: drone,
    kick: kick, snare: snare, hat: hat, rhodes: rhodes,
    aria: aria, reed: reed, wire: wire, glass: glass, pluck: pluck,
    organ: organ, horn: horn, voce: voce,
    boom: boom, drum: drum, wood: wood, metal: metal, gong: gong, shaker: shaker, mallet: mallet,
    clap: clap, scrape: scrape, chime: chime, friction: friction };

  /** Play a composer voice by name: play('melody', ctx, dest, note). */
  function play(voice, ctx, dest, note) {
    const fn = VOICES[voice] || keys;
    fn(ctx, dest, note);
  }

  return { play, keys, strings, bass, bell, pad, drone, kick, snare, hat, rhodes,
    aria, reed, wire, glass, pluck, organ, horn, voce,
    boom, drum, wood, metal, gong, shaker, mallet,
    clap, scrape, chime, friction, VOICES, envGain, noiseBuffer,
    exprEnv, pitchExpr, panTo, microDrift, bodyResonance, onsetTransient };
});
