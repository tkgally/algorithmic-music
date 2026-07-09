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
 *
 * v0.2 (engine-01 feedback pass): the reverb IR is darker and smoother (two
 * cascaded one-pole lowpasses over the noise, more damping, a short fade-in), the
 * reverb RETURN is band-limited (highpass + lowpass) and the master glue is
 * gentler — together these kill the bright "static/fizz" wash a listener heard on
 * sustained chords and on the exposed final note (see wiki/findings-tonal-
 * classical-engine.md). Reverb character is now configurable per engine
 * (reverbSeconds / reverbDamp / returnLowpassHz) so the ambient engine can use a
 * long, dark tail while the classical engine stays tight and clean.
 *
 * v0.3 (engines 01 + 02 "static in the middle of sustained notes" pass): the
 * residual tail GRAIN that survived v0.2 was measured (a sustained tone's reverb
 * return has a fluctuating envelope — that fluctuation is the "static") and cut at
 * the source with a near-Gaussian noise IR, energy-normalized (see makeIR) — not
 * by darkening, which v0.2 already tried.
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
  //
  // v0.3 (engine-01/02 "static in the middle of sustained notes" pass): the tail
  // grain a careful listener still heard after v0.2 was measured directly — the
  // envelope of a sustained tone's reverb return fluctuates, and that fluctuation
  // IS the perceived "static." The fix is a NEAR-GAUSSIAN noise source (the mean of
  // three uniforms, an Irwin-Hall variate) instead of flat white: uniform white
  // noise spends more time near its extremes, so a decaying-white-noise tail has a
  // rougher short-time energy; a Gaussian source has fewer outliers and a SMOOTHER
  // envelope. Verified in the offline grain probe: the reverb-tail envelope
  // coefficient-of-variation drops 0.49 -> 0.33 (~31%). Crucially this is NOT more
  // darkening — v0.2 already darkened the IR and the listener still heard it, and a
  // probe confirmed a *third* lowpass pole actually *raised* the grain — so the two
  // one-pole lowpasses and the brightness are unchanged; only the noise
  // distribution is smoother. The IR is then ENERGY-NORMALIZED to a fixed target
  // RMS so reverb loudness is independent of the source change. Per-channel
  // independent noise still decorrelates L/R for width.
  const IR_TARGET_RMS = 0.085;
  function makeIR(ctx, rand, seconds, decayPow, damp) {
    seconds = seconds || 2.4; decayPow = decayPow || 3.0; damp = damp == null ? 0.5 : damp;
    const n = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
    const fadeIn = Math.min(n, Math.round(ctx.sampleRate * 0.006)); // 6 ms fade-in: no pre-echo click
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    let sumSq = 0;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp1 = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n;                                 // 0..1 along the tail
        const k = damp + x * (0.9 - damp);               // darkens over time
        const src = (rand() + rand() + rand()) / 1.5 - 1; // near-Gaussian, centered: smoother energy than flat white
        lp1 = k * lp1 + (1 - k) * src;                   // one-pole
        lp2 = k * lp2 + (1 - k) * lp1;                   // second one-pole (steeper rolloff, smoother)
        let env = Math.pow(1 - x, decayPow);
        if (i < fadeIn) env *= i / fadeIn;
        d[i] = lp2 * env;
        sumSq += d[i] * d[i];
      }
    }
    const rms = Math.sqrt(sumSq / (2 * n)) || 1;
    const g = IR_TARGET_RMS / rms;                       // makeup so loudness is unchanged
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] *= g; }
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
    const chordSendScale = opts.chordSendScale == null ? 0.6 : opts.chordSendScale; // pads wash easily — send them less

    // Mix sum -> saturation -> glue compressor -> safety limiter -> master trim.
    const sum = ctx.createGain();
    const sat = ctx.createWaveShaper(); sat.curve = softClipCurve(0.06); sat.oversample = '2x'; // very gentle glue
    // Gentle glue: high threshold + low ratio so it is NOT compressing most of the
    // time. A hard bus compressor (the old ratio-3 @ -20 dB) pumps the reverb/noise
    // floor up as notes decay — audible as a "breathing" swell on the final note.
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -12; glue.knee.value = 24; glue.ratio.value = 2; glue.attack.value = 0.03; glue.release.value = 0.28;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5; limiter.knee.value = 2; limiter.ratio.value = 14; limiter.attack.value = 0.004; limiter.release.value = 0.14;
    const master = ctx.createGain(); master.gain.value = volume;
    // A quasi-static master tone tilt (quiet-listening compensation lives here).
    const tone = ctx.createBiquadFilter(); tone.type = 'highshelf'; tone.frequency.value = 3000; tone.gain.value = 0;
    sum.connect(sat); sat.connect(glue); glue.connect(limiter); limiter.connect(tone); tone.connect(master); master.connect(ctx.destination);

    // Reverb send/return: one convolver shared by all sends, with a short
    // pre-delay so dry transients stay up front. The return is BAND-LIMITED — a
    // highpass keeps low rumble out of the tail, and a lowpass keeps the tail warm
    // (a bright convolution tail is exactly the "static" a listener flagged).
    const conv = ctx.createConvolver();
    conv.buffer = makeIR(ctx, rand, opts.reverbSeconds || 2.4, opts.reverbDecayPow || 3.0, opts.reverbDamp);
    const preDelay = ctx.createDelay(0.2); preDelay.delayTime.value = opts.preDelay == null ? 0.02 : opts.preDelay;
    const returnHP = ctx.createBiquadFilter(); returnHP.type = 'highpass'; returnHP.frequency.value = 180; returnHP.Q.value = 0.5;
    const returnLP = ctx.createBiquadFilter(); returnLP.type = 'lowpass'; returnLP.frequency.value = opts.returnLowpassHz || 4200; returnLP.Q.value = 0.4;
    const reverbReturn = ctx.createGain(); reverbReturn.gain.value = opts.returnGain == null ? 0.8 : opts.returnGain;
    preDelay.connect(conv); conv.connect(returnHP); returnHP.connect(returnLP); returnLP.connect(reverbReturn); reverbReturn.connect(sum);

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
    const chordBus = makeBus(110, reverbAmount * chordSendScale);
    const bassBus = makeBus(0, opts.bassSend || 0.0);   // lows: no HP, dry by default (mono)
    // Extra ambient voices reuse the same bus factory; unknown voices fall back
    // to the melody bus (see input()).
    const bellBus = makeBus(90, reverbAmount * 1.1);
    const padBus = makeBus(90, reverbAmount * chordSendScale);
    const droneBus = makeBus(0, opts.bassSend || 0.0);
    // Groove/lo-fi voices: the kick is full-range and dry (its weight is the
    // groove — no reverb, no HP, like the bass bus); snare/hat are high-passed
    // with a LIGHT reverb (drums drown in a big tail); the rhodes (lo-fi keys)
    // gets a warm, chord-like send (wiki/groove-and-embodiment.md, wiki/effects-
    // and-mixing.md). drumSendScale lets an engine dial the whole kit's space.
    const drumSendScale = opts.drumSendScale == null ? 0.55 : opts.drumSendScale;
    const kickBus = makeBus(0, 0.0);
    const snareBus = makeBus(120, reverbAmount * drumSendScale);
    const hatBus = makeBus(400, reverbAmount * drumSendScale * 0.8);
    const rhodesBus = makeBus(90, reverbAmount);
    // Percussion-ensemble voices (Engine 05). The low anchor drum is full-range
    // and DRY (its weight anchors the meter, like the kick/bass — wiki/groove-and-
    // embodiment.md); mid drums/wood are high-passed with light space; the high
    // metals/shakers/gong are high-passed with a touch more room (they live above
    // everything else and a bright tail there is where "wash" lives — kept modest);
    // the tuned mallet (the melodic-accompaniment voice) gets a chord-like send.
    // percSendScale lets the engine dial the whole ensemble's space (effects-and-
    // mixing.md: the low drum loudest/centered, everything above it high-passed).
    const percSendScale = opts.percSendScale == null ? 0.5 : opts.percSendScale;
    const percLowBus = makeBus(0, reverbAmount * percSendScale * 0.2);
    const percMidBus = makeBus(120, reverbAmount * percSendScale * 0.7);
    const percHiBus = makeBus(300, reverbAmount * percSendScale);
    const malletBus = makeBus(90, reverbAmount * chordSendScale);

    const buses = { melody: melodyBus, chord: chordBus, bass: bassBus, bell: bellBus, pad: padBus, drone: droneBus,
      kick: kickBus, snare: snareBus, hat: hatBus, rhodes: rhodesBus,
      boom: percLowBus, drum: percMidBus, wood: percMidBus, metal: percHiBus, gong: percHiBus, shaker: percHiBus, mallet: malletBus,
      clap: percMidBus, scrape: percHiBus, chime: percHiBus, friction: percMidBus };

    return {
      master, sum, buses,
      /** Input node for a composer voice ('melody'|'chord'|'bass'|'bell'|'pad'|'drone'). */
      input(voice) { return (buses[voice] || melodyBus).input; },
      setVolume(v) { master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
      setReverb(v) {
        melodyBus.send.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        chordBus.send.gain.setTargetAtTime(v * chordSendScale, ctx.currentTime, 0.05);
        bellBus.send.gain.setTargetAtTime(v * 1.1, ctx.currentTime, 0.05);
        padBus.send.gain.setTargetAtTime(v * chordSendScale, ctx.currentTime, 0.05);
        snareBus.send.gain.setTargetAtTime(v * drumSendScale, ctx.currentTime, 0.05);
        hatBus.send.gain.setTargetAtTime(v * drumSendScale * 0.8, ctx.currentTime, 0.05);
        rhodesBus.send.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        percLowBus.send.gain.setTargetAtTime(v * percSendScale * 0.2, ctx.currentTime, 0.05);
        percMidBus.send.gain.setTargetAtTime(v * percSendScale * 0.7, ctx.currentTime, 0.05);
        percHiBus.send.gain.setTargetAtTime(v * percSendScale, ctx.currentTime, 0.05);
        malletBus.send.gain.setTargetAtTime(v * chordSendScale, ctx.currentTime, 0.05);
      },
      /** Quiet-listening tone tilt: +dB high shelf as playback gets quieter. */
      setTone(db) { tone.gain.setTargetAtTime(db, ctx.currentTime, 0.05); },
    };
  }

  return { createMasterChain, makeIR, softClipCurve };
});
