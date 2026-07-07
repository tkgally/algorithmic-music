/* Headless tests for lib/rng.js */
'use strict';
const { test, eq, ok, approx } = require('./_runner');
const { Rng, PinkNoise, euclid, onsets } = require('../lib/rng.js');

// ---- Determinism & reproducibility ----------------------------------------

test('rng: same numeric seed -> identical sequence', () => {
  const a = new Rng(42), b = new Rng(42);
  const sa = [], sb = [];
  for (let i = 0; i < 20; i++) { sa.push(a.next()); sb.push(b.next()); }
  eq(sa, sb, 'sequences from equal seeds must match');
});

test('rng: different seeds -> different sequences', () => {
  const a = new Rng(1), b = new Rng(2);
  let differ = false;
  for (let i = 0; i < 20; i++) if (a.next() !== b.next()) { differ = true; break; }
  ok(differ, 'seed 1 and 2 should not produce identical streams');
});

test('rng: string seeds are supported and deterministic', () => {
  const a = new Rng('piece-2026-07-07'), b = new Rng('piece-2026-07-07');
  eq(a.next(), b.next(), 'equal string seeds must match');
  const c = new Rng('piece-2026-07-08');
  ok(a.next() !== c.next(), 'different string seeds should differ');
});

// ---- Named streams --------------------------------------------------------

test('rng: named streams are reproducible and independent', () => {
  const root1 = new Rng(7);
  const root2 = new Rng(7);
  const bass1 = root1.stream('bass');
  const bass2 = root2.stream('bass');
  eq(bass1.next(), bass2.next(), 'same (seed,name) -> same stream');

  const drums = new Rng(7).stream('drums');
  const bass = new Rng(7).stream('bass');
  ok(bass.next() !== drums.next(), 'different stream names should diverge');
});

test('rng: drawing from a child stream does not perturb the parent', () => {
  const root = new Rng(99);
  const firstParentBefore = new Rng(99).next(); // reference
  const child = root.stream('x');
  for (let i = 0; i < 10; i++) child.next(); // consume child
  eq(root.next(), firstParentBefore, 'parent stream must be unaffected by child use');
});

// ---- Distributions --------------------------------------------------------

test('rng: float respects [min,max) bounds', () => {
  const r = new Rng(3);
  for (let i = 0; i < 1000; i++) {
    const x = r.float(-2, 5);
    ok(x >= -2 && x < 5, `float out of range: ${x}`);
  }
});

test('rng: int is inclusive of both bounds and never exceeds them', () => {
  const r = new Rng(5);
  let sawMin = false, sawMax = false;
  for (let i = 0; i < 5000; i++) {
    const x = r.int(1, 6); // a die
    ok(x >= 1 && x <= 6 && Number.isInteger(x), `int out of range: ${x}`);
    if (x === 1) sawMin = true;
    if (x === 6) sawMax = true;
  }
  ok(sawMin && sawMax, 'both inclusive bounds should be reachable');
});

test('rng: weighted choice roughly matches weights', () => {
  const r = new Rng(11);
  const counts = { a: 0, b: 0, c: 0 };
  const N = 30000;
  for (let i = 0; i < N; i++) counts[r.weighted(['a', 'b', 'c'], [1, 3, 6])]++;
  // expected fractions 0.1 / 0.3 / 0.6
  approx(counts.a / N, 0.1, 0.02, 'weight a');
  approx(counts.b / N, 0.3, 0.02, 'weight b');
  approx(counts.c / N, 0.6, 0.02, 'weight c');
});

test('rng: gaussian has ~correct mean and stdev', () => {
  const r = new Rng(13);
  const N = 20000;
  let sum = 0, sum2 = 0;
  for (let i = 0; i < N; i++) { const x = r.gaussian(5, 2); sum += x; sum2 += x * x; }
  const mean = sum / N;
  const variance = sum2 / N - mean * mean;
  approx(mean, 5, 0.1, 'gaussian mean');
  approx(Math.sqrt(variance), 2, 0.1, 'gaussian stdev');
});

test('rng: shuffle is a permutation and does not mutate input', () => {
  const r = new Rng(17);
  const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const snapshot = input.slice();
  const out = r.shuffle(input);
  eq(input, snapshot, 'input array must not be mutated');
  eq(out.slice().sort((x, y) => x - y), snapshot, 'output must be a permutation');
});

test('rng: pick returns an element and is deterministic', () => {
  const arr = ['C', 'E', 'G', 'B'];
  const a = new Rng(21), b = new Rng(21);
  for (let i = 0; i < 10; i++) {
    const x = a.pick(arr);
    ok(arr.includes(x), 'pick must return a member');
    eq(x, b.pick(arr), 'pick must be deterministic under equal seed');
  }
});

// ---- Euclidean rhythms (Bjorklund) ----------------------------------------
// Canonical maximally-even patterns from Toussaint (2005), normalized to start
// on the first onset. 1 = onset, 0 = rest.

test('euclid: iconic rotation-stable patterns match Toussaint (2005)', () => {
  eq(euclid(3, 8), [1, 0, 0, 1, 0, 0, 1, 0], 'E(3,8) Cuban tresillo');
  eq(euclid(5, 8), [1, 0, 1, 1, 0, 1, 1, 0], 'E(5,8) cinquillo');
});

test('euclid: normalized-Bjorklund regression anchors', () => {
  // E(k,n) is only defined up to rotation (a rhythmic necklace); these pin our
  // normalized-Bjorklund rotation so a future change to the convention is
  // caught. Traditional presentations of some are rotations of these (e.g. the
  // cumbia is a rotation of E(3,4)).
  eq(euclid(2, 5), [1, 0, 1, 0, 0], 'E(2,5)');
  eq(euclid(4, 9), [1, 0, 1, 0, 1, 0, 1, 0, 0], 'E(4,9) aksak');
  eq(euclid(5, 12), [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0], 'E(5,12)');
  eq(euclid(7, 16), [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0], 'E(7,16)');
  eq(euclid(3, 4), [1, 1, 1, 0], 'E(3,4)');
  eq(euclid(2, 3), [1, 1, 0], 'E(2,3)');
});

test('euclid: edge cases', () => {
  eq(euclid(0, 4), [0, 0, 0, 0], 'no pulses -> all rests');
  eq(euclid(4, 4), [1, 1, 1, 1], 'full -> all onsets');
  eq(euclid(5, 4), [1, 1, 1, 1], 'pulses>steps clamps to all onsets');
  eq(euclid(1, 4), [1, 0, 0, 0], 'single pulse');
  eq(euclid(3, 0), [], 'zero steps -> empty');
});

test('euclid: maximally even for all 1<=k<=n<=32', () => {
  // The defining property of a Euclidean rhythm: every inter-onset gap is one
  // of two consecutive values, floor(n/k) or ceil(n/k), with exactly (n mod k)
  // of the larger. This is a rotation-invariant proof of correctness.
  for (let n = 1; n <= 32; n++) {
    for (let k = 1; k <= n; k++) {
      const p = euclid(k, n);
      eq(p.length, n, `E(${k},${n}) length`);
      eq(p.reduce((s, x) => s + x, 0), k, `E(${k},${n}) onset count`);
      eq(p[0], 1, `E(${k},${n}) starts on an onset`);
      const os = onsets(p);
      const gaps = os.map((x, i) => (i < os.length - 1 ? os[i + 1] - x : n - x + os[0]));
      const q = Math.floor(n / k), r = n % k;
      const big = gaps.filter((g) => g === q + 1).length;
      const small = gaps.filter((g) => g === q).length;
      ok(r === 0 ? small === k : (big === r && small === k - r),
         `E(${k},${n}) not maximally even: gaps ${JSON.stringify(gaps)}`);
    }
  }
});

test('euclid: rotation shifts the pattern left', () => {
  const base = euclid(3, 8);              // [1,0,0,1,0,0,1,0]
  eq(euclid(3, 8, 1), base.slice(1).concat(base.slice(0, 1)), 'rotate 1');
  eq(euclid(3, 8, 8), base, 'rotate by length == identity');
  eq(onsets(euclid(3, 8)), [0, 3, 6], 'onsets() indices for E(3,8)');
});

// ---- Pink noise -----------------------------------------------------------

test('pink: deterministic, bounded, and lower-variance than white', () => {
  const pink = new PinkNoise(new Rng(1), 5);
  const pink2 = new PinkNoise(new Rng(1), 5);
  const white = new Rng(2);
  let pv = [], wv = [];
  for (let i = 0; i < 4000; i++) {
    const p = pink.next();
    ok(p >= 0 && p <= 1, `pink out of [0,1]: ${p}`);
    eq(p, pink2.next(), 'pink noise must be deterministic under equal seed');
    pv.push(p); wv.push(white.next());
  }
  // 1/f noise is smoother step-to-step than white noise: mean absolute
  // first difference should be clearly smaller.
  const madp = mad(pv), madw = mad(wv);
  ok(madp < madw * 0.8, `pink step change (${madp.toFixed(3)}) should be < white (${madw.toFixed(3)})`);
});

function mad(series) {
  let s = 0;
  for (let i = 1; i < series.length; i++) s += Math.abs(series[i] - series[i - 1]);
  return s / (series.length - 1);
}
