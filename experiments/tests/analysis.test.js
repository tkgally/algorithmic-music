/* Headless tests for lib/analysis.js — the PCM measurement primitives. Signals
 * are synthesized here in Node (no Web Audio), so the measurement logic is
 * validated deterministically before the harness trusts it on browser renders. */
'use strict';
const { test, eq, ok, approx } = require('./_runner');
const A = require('../lib/analysis.js');

const SR = 44100;
function sine(freq, dur, amp = 1, sr = SR) {
  const n = Math.round(dur * sr), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * freq * i / sr);
  return out;
}

test('analysis: rms of a full-scale sine is ~0.707, and peak is its amplitude', () => {
  const s = sine(440, 0.5, 0.8);
  approx(A.rms(s), 0.8 / Math.SQRT2, 1e-3, 'sine RMS = amp/sqrt(2)');
  approx(A.peak(s), 0.8, 1e-3, 'peak = amplitude');
});

test('analysis: dbfs maps known amplitudes to decibels and floors silence', () => {
  approx(A.dbfs(1), 0, 1e-9, 'full scale = 0 dBFS');
  approx(A.dbfs(0.5), -6.0206, 1e-3, 'half amplitude ~ -6 dB');
  ok(A.dbfs(0) <= -120, 'silence floored, no -Infinity');
});

test('analysis: maxStep is tiny for a smooth sine but ~full-scale for a hard gate', () => {
  const smooth = sine(220, 0.2, 0.9);
  ok(A.maxStep(smooth) < 0.1, 'a 220 Hz sine moves little per sample at 44.1 kHz');
  // Hard gate: silence then an abrupt jump to a DC-like block, then abrupt cut.
  const gated = new Float32Array(1000);
  for (let i = 300; i < 700; i++) gated[i] = 0.8;
  approx(A.maxStep(gated), 0.8, 1e-6, 'the 0 -> 0.8 step is the max discontinuity');
});

test('analysis: detectOnsets recovers blips struck from silence at their true sample times', () => {
  // Three short 1 kHz bursts starting at 0.10, 0.40, 0.85 s.
  const total = new Float32Array(Math.round(1.0 * SR));
  const starts = [0.10, 0.40, 0.85];
  for (const st of starts) {
    const s0 = Math.round(st * SR);
    for (let i = 0; i < Math.round(0.08 * SR); i++) {
      const env = Math.exp(-i / (0.02 * SR)); // fast attack from the first sample, decay
      total[s0 + i] = 0.7 * env * Math.sin(2 * Math.PI * 1000 * i / SR);
    }
  }
  const onsets = A.detectOnsets(total, SR, { thresh: 0.02 });
  eq(onsets.length, 3, 'exactly three onsets');
  for (let k = 0; k < 3; k++) approx(onsets[k], starts[k], 0.002, `onset ${k} within 2 ms of the true start`);
});

test('analysis: detectOnsetsEnergy picks attacks riding on top of a sustained bed', () => {
  // A continuous quiet drone plus three louder bursts on top — the case plain
  // amplitude detection cannot re-arm through, but an energy-rise detector can.
  const total = new Float32Array(Math.round(1.2 * SR));
  const bed = sine(110, 1.2, 0.05);            // never-silent low drone
  total.set(bed, 0);
  const starts = [0.15, 0.55, 0.95];
  for (const st of starts) {
    const s0 = Math.round(st * SR);
    for (let i = 0; i < Math.round(0.1 * SR); i++) {
      const env = Math.exp(-i / (0.03 * SR));
      total[s0 + i] += 0.6 * env * Math.sin(2 * Math.PI * 900 * i / SR);
    }
  }
  const onsets = A.detectOnsetsEnergy(total, SR, { factor: 3 });
  eq(onsets.length, 3, 'three energy-rise onsets recovered over the bed');
  for (let k = 0; k < 3; k++) approx(onsets[k], starts[k], 0.01, `onset ${k} within ~10 ms`);
  // The plain amplitude detector, by contrast, latches on the bed and cannot
  // re-arm — a documented difference, not a bug.
  ok(A.detectOnsets(total, SR, { thresh: 0.02 }).length < 3, 'amplitude detector under-counts over a bed');
});

test('analysis: longestSilenceSec finds the biggest quiet gap and is ~0 for continuous tone', () => {
  const loud = sine(440, 1.0, 0.5);
  ok(A.longestSilenceSec(loud, SR) < 0.15, 'a continuous tone has no long silence');
  const withGap = new Float32Array(Math.round(2.0 * SR));
  const tone = sine(440, 0.5, 0.5);
  withGap.set(tone, 0);                          // 0.0-0.5 s sound
  withGap.set(tone, Math.round(1.5 * SR));       // 1.5-2.0 s sound; 0.5-1.5 s silent
  approx(A.longestSilenceSec(withGap, SR, { winSec: 0.05 }), 1.0, 0.1, '~1 s silent gap detected');
});

test('analysis: onsetTimingError reports low jitter for a constant detection offset', () => {
  const scheduled = [0.5, 1.0, 1.5, 2.0];
  const detected = scheduled.map((t) => t + 0.001); // a uniform +1 ms detection lag, no jitter
  const r = A.onsetTimingError(detected, scheduled);
  eq(r.matched, 4, 'all four matched');
  approx(r.meanMs, 1.0, 1e-6, 'mean offset = the systematic lag');
  ok(r.jitterMs < 1e-6, 'zero jitter for a constant offset');
  eq(r.extras, 0, 'no spurious extra onsets');
});

test('analysis: onsetTimingError counts misses and extras', () => {
  const scheduled = [0.5, 1.0, 1.5];
  const detected = [0.5, 1.5, 1.7]; // 1.0 missed; 1.7 is an extra
  const r = A.onsetTimingError(detected, scheduled, 0.02);
  eq(r.matched, 2, 'two of three scheduled onsets matched');
  eq(r.extras, 1, 'one detected onset was spurious');
});
