/*
 * fx — the shared master chain: per-instrument buses, one synthesized-IR
 * convolution reverb, and a glue/limiter master bus, from stock Web Audio nodes.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md — "fx" is build-order item 2, with synth). It
 * implements wiki/effects-and-mixing.md's prescriptions: reverb by convolution
 * with a procedurally generated impulse response (decaying, channel-decorrelated
 * noise that darkens along the tail — no sample files, deterministic from the
 * seed); non-bass buses high-passed; lows kept mono; a master chain of
 * sum -> gentle saturation -> glue compressor -> safety limiter -> trim; and the
 * standing loudness discipline (undershoot deliberately for background listening).
 *
 * createMasterChain(ctx, opts) wires it all and returns handles the engine uses:
 * an input node per composer voice, plus setVolume / setReverb / setTone macros
 * for the UI. All effects run from file:// with no assets. Dual-format (UMD-lite);
 * window.AM.fx in the browser — its only runtime — require() in Node for
 * inspection (needs a real/offline AudioContext to run; validated via the render
 * harness, not the headless Node suite).
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.fx = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Synthesized reverb impulse response: decaying noise whose brightness darkens
  // along the tail (real rooms absorb highs faster), independent per channel so
  // L/R decorrelate — that decorrelation IS the stereo width. wiki/effects-and-
  // mixing.md "Reverb 1". `rand` is a () => [0,1) source (seed it for determinism).
  function makeIR(ctx, rand, seconds, decayPow, damp) {
    seconds = seconds || 2.2; decayPow = decayPow || 2.6; damp = damp == null ? 0.25 : damp;
    const n = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n;                                 // 0..1 along the tail
        const k = damp + x * (0.985 - damp);             // one-pole darkens over time
        lp = k * lp + (1 - k) * (rand() * 2 - 1);
        d[i] = lp * Math.pow(1 - x, decayPow);
      }
    }
    return buf;
  }

  // Soft-clip curve (musicdsp Tarrabia/de Jong) for gentle master saturation —
  // "glue harmonics at -40 dB, not fuzz" (wiki/effects-and-mixing.md).
  function softClipCurve(a) {
    const k = 2 * a / (1 - a), N = 1024, c = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }

  function createMasterChain(ctx, opts) {
    opts = opts || {};
    const rand = opts.rand || Math.random;
    const reverbAmount = opts.reverbAmount == null ? 0.22 : opts.reverbAmount;
    const volume = opts.volume == null ? 0.8 : opts.volume;

    // Mix sum -> saturation -> glue compressor -> safety limiter -> master trim.
    const sum = ctx.createGain();
    const sat = ctx.createWaveShaper(); sat.curve = softClipCurve(0.1); sat.oversample = '2x';
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20; glue.knee.value = 25; glue.ratio.value = 3; glue.attack.value = 0.02; glue.release.value = 0.2;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.1;
    const master = ctx.createGain(); master.gain.value = volume;
    // A quasi-static master tone tilt (quiet-listening compensation lives here).
    const tone = ctx.createBiquadFilter(); tone.type = 'highshelf'; tone.frequency.value = 3000; tone.gain.value = 0;
    sum.connect(sat); sat.connect(glue); glue.connect(limiter); limiter.connect(tone); tone.connect(master); master.connect(ctx.destination);

    // Reverb send/return: one convolver shared by all sends, with a short
    // pre-delay so dry transients stay up front.
    const conv = ctx.createConvolver();
    conv.buffer = makeIR(ctx, rand, opts.reverbSeconds || 2.4, 2.6, 0.28);
    const preDelay = ctx.createDelay(0.1); preDelay.delayTime.value = 0.02;
    const reverbReturn = ctx.createGain(); reverbReturn.gain.value = 0.9;
    preDelay.connect(conv); conv.connect(reverbReturn); reverbReturn.connect(sum);

    // Per-voice buses. Non-bass buses are high-passed (cumulative low-mid mud is
    // the default enemy); the bass bus stays full-range and mono-centered.
    function makeBus(hpHz, sendAmt) {
      const bus = ctx.createGain();
      let node = bus;
      if (hpHz) { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpHz; bus.connect(hp); node = hp; }
      node.connect(sum);
      const send = ctx.createGain(); send.gain.value = sendAmt;
      node.connect(send); send.connect(preDelay);
      return { input: bus, send };
    }
    const melodyBus = makeBus(90, reverbAmount);
    const chordBus = makeBus(110, reverbAmount * 0.8);
    const bassBus = makeBus(0, 0.0);                    // lows: no HP, no reverb (mono, dry)

    const buses = { melody: melodyBus, chord: chordBus, bass: bassBus };

    return {
      master, sum, buses,
      /** Input node for a composer voice ('melody'|'chord'|'bass'). */
      input(voice) { return (buses[voice] || melodyBus).input; },
      setVolume(v) { master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      setReverb(v) {
        melodyBus.send.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        chordBus.send.gain.setTargetAtTime(v * 0.8, ctx.currentTime, 0.05);
      },
      /** Quiet-listening tone tilt: +dB high shelf as playback gets quieter. */
      setTone(db) { tone.gain.setTargetAtTime(db, ctx.currentTime, 0.05); },
    };
  }

  return { createMasterChain, makeIR, softClipCurve };
});
