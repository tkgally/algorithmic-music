/*
 * analysis — pure PCM measurement primitives for rendered audio.
 *
 * Part of the algorithmic-music project's first-party shared-library plan
 * (see wiki/shared-libraries.md: "theory, timing, seeded RNG, synthesis,
 * effects, analysis"). This is the measurement half of the analysis module —
 * the functions the OfflineAudioContext render-and-measure harness
 * (experiments/tools/render-measure.mjs) needs to score a rendered buffer, and
 * the in-browser acoustic-metric core described in
 * wiki/computational-music-metrics.md ("Audio metrics (computable in-browser)").
 *
 * Everything here operates on a plain array / Float32Array of mono samples plus
 * a sample rate — NO Web Audio, no globals, no Math.random — so the exact same
 * code unit-tests headless in Node against synthesized signals AND measures a
 * real OfflineAudioContext render in the browser (vendored as a classic script).
 * That is the whole point: the measurement logic is validated deterministically
 * in Node, then trusted to measure browser audio the harness cannot re-derive.
 *
 * Original code; standard DSP (RMS, dBFS, short-time energy onset picking,
 * first-difference discontinuity, silence runs). Dual-format (UMD-lite), same
 * rationale as rng.js/transport.js/theory.js.
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.analysis = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Amplitude (linear, 0..1) -> dBFS. Guards log(0) with a -120 dB floor. */
  function dbfs(amp) { return 20 * Math.log10(Math.max(1e-6, Math.abs(amp))); }

  /** Root-mean-square amplitude of a sample buffer. */
  function rms(samples) {
    let s = 0;
    for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
    return samples.length ? Math.sqrt(s / samples.length) : 0;
  }

  /** Peak absolute amplitude (clipping check: >= 1.0 means the mix clipped). */
  function peak(samples) {
    let p = 0;
    for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > p) p = a; }
    return p;
  }

  /** RMS expressed in dBFS. */
  function rmsDbfs(samples) { return dbfs(rms(samples)); }

  /**
   * Largest one-sample amplitude jump |x[n] - x[n-1]| in the buffer — a proxy
   * for clicks/discontinuities. A click-safe render (ramped gains, no hard gate
   * onto a nonzero waveform value) keeps this small (bounded by the waveform's
   * own per-sample slope); an abrupt gate produces a large step. See
   * wiki/web-audio-fundamentals.md on click-safety.
   */
  function maxStep(samples) {
    let m = 0;
    for (let i = 1; i < samples.length; i++) { const d = Math.abs(samples[i] - samples[i - 1]); if (d > m) m = d; }
    return m;
  }

  /**
   * Onset times (in seconds) of near-silence-to-sound attacks. Simple, precise
   * amplitude-threshold state machine intended for controlled renders (blips
   * struck from digital silence), where it recovers each onset to within a
   * couple of samples — good enough to validate that the scheduler placed a note
   * at the right sample. `thresh` is the absolute amplitude that counts as
   * "sounding"; the detector re-arms after the signal falls below `thresh*rearm`
   * for `rearmSec`, and enforces a `refractorySec` minimum gap between onsets.
   */
  function detectOnsets(samples, sampleRate, opts = {}) {
    const thresh = opts.thresh == null ? 0.02 : opts.thresh;
    const rearm = opts.rearm == null ? 0.5 : opts.rearm;
    const refractory = Math.round((opts.refractorySec == null ? 0.03 : opts.refractorySec) * sampleRate);
    const rearmSamples = Math.round((opts.rearmSec == null ? 0.01 : opts.rearmSec) * sampleRate);
    const onsets = [];
    let armed = true, quiet = 0, last = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const a = Math.abs(samples[i]);
      if (armed && a >= thresh && (i - last) >= refractory) {
        onsets.push(i / sampleRate); last = i; armed = false; quiet = 0;
      } else if (!armed) {
        if (a < thresh * rearm) { quiet++; if (quiet >= rearmSamples) armed = true; } else quiet = 0;
      }
    }
    return onsets;
  }

  /**
   * Onset times (seconds) by short-time ENERGY RISE over a trailing-median
   * baseline — the method the previous experiments' verify.mjs used. Unlike
   * detectOnsets (absolute amplitude, for blips struck from silence), this fires
   * on an energy JUMP relative to the recent local level, so it can pick new
   * attacks over a sustained bed. It is approximate on dense polyphony (the
   * documented better tool is spectral flux — wiki/computational-music-metrics.md)
   * but robust for activity/onset-rate diagnostics. `factor` is how many times
   * the trailing-median block energy a block must exceed to count as an onset.
   */
  function detectOnsetsEnergy(samples, sampleRate, opts = {}) {
    const block = opts.block == null ? 256 : opts.block;
    const factor = opts.factor == null ? 2 : opts.factor;
    const winBlocks = opts.winBlocks == null ? 6 : opts.winBlocks;
    const refractory = Math.round((opts.refractorySec == null ? 0.1 : opts.refractorySec) * sampleRate / block);
    const energies = [];
    for (let i = 0; i + block <= samples.length; i += block) {
      let e = 0; for (let j = i; j < i + block; j++) e += samples[j] * samples[j];
      energies.push(e / block);
    }
    const onsets = [];
    let last = -Infinity;
    const scratch = [];
    for (let i = winBlocks; i < energies.length; i++) {
      scratch.length = 0;
      for (let k = i - winBlocks; k < i; k++) scratch.push(energies[k]);
      scratch.sort((a, b) => a - b);
      const base = scratch[scratch.length >> 1] || 1e-9;
      if (energies[i] > base * factor && energies[i] > 1e-6 && (i - last) > refractory) {
        onsets.push(i * block / sampleRate); last = i;
      }
    }
    return onsets;
  }

  /**
   * Longest run (seconds) of consecutive `winSec` windows whose RMS is below
   * `thresholdDb` dBFS — "music must not vanish" (wiki/computational-music-metrics.md).
   */
  function longestSilenceSec(samples, sampleRate, opts = {}) {
    const thresholdDb = opts.thresholdDb == null ? -55 : opts.thresholdDb;
    const winSec = opts.winSec == null ? 0.1 : opts.winSec;
    const win = Math.max(1, Math.round(winSec * sampleRate));
    let longest = 0, run = 0;
    for (let i = 0; i + win <= samples.length; i += win) {
      let s = 0;
      for (let j = i; j < i + win; j++) s += samples[j] * samples[j];
      const wdb = dbfs(Math.sqrt(s / win));
      if (wdb < thresholdDb) { run += winSec; if (run > longest) longest = run; } else run = 0;
    }
    return longest;
  }

  /**
   * Compare detected onsets against the times a scheduler intended. Pairs each
   * scheduled time with the nearest detected onset and reports the error
   * statistics that matter for "did the timing math land on the right samples":
   * mean offset (systematic attack-detection lag), jitter (std of the error —
   * this is the real precision measure), max abs error, and any misses/extras.
   * Times in seconds; results in milliseconds.
   */
  function onsetTimingError(detected, scheduled, tolSec = 0.03) {
    const errors = [];
    let matched = 0;
    const used = new Array(detected.length).fill(false);
    for (const t of scheduled) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < detected.length; i++) {
        if (used[i]) continue;
        const d = Math.abs(detected[i] - t);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0 && bestD <= tolSec) { used[best] = true; matched++; errors.push(detected[best] - t); }
    }
    const n = errors.length || 1;
    const mean = errors.reduce((a, b) => a + b, 0) / n;
    const variance = errors.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
    const maxAbs = errors.reduce((m, e) => Math.max(m, Math.abs(e)), 0);
    return {
      matched, scheduled: scheduled.length, detected: detected.length,
      extras: detected.length - matched,
      meanMs: mean * 1000, jitterMs: Math.sqrt(variance) * 1000, maxAbsMs: maxAbs * 1000,
    };
  }

  return { dbfs, rms, peak, rmsDbfs, maxStep, detectOnsets, detectOnsetsEnergy, longestSilenceSec, onsetTimingError };
});
