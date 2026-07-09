/*
 * rng — seeded pseudo-random number generation for generative music engines.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md). Original code. It *reimplements* published,
 * public-domain algorithms — it copies no other project's source:
 *   - mulberry32 PRNG (algorithm by Tommy Ettinger, public domain);
 *   - a multiply-xor-shift string/seed mixer in the spirit of "xmur3" (bryc,
 *     public domain);
 *   - Bjorklund's Euclidean-rhythm construction (Bjorklund 2003; popularized for
 *     music by G. Toussaint 2005).
 * The ideas are general techniques; the code below is written from scratch.
 *
 * Everything here is pure (no Web Audio, no globals, no Math.random) so it is
 * unit-testable headless in Node and deterministic in an engine. Determinism is
 * an engine-architecture invariant: one (seed) reproduces one piece exactly.
 *
 * Dual-format (UMD-lite) so the SAME file works two ways:
 *   - Node/dev:  const { Rng, euclid } = require('./rng.js');
 *   - Browser:   <script src="rng.js"></script>  ->  window.AM.rng.Rng, ...
 * A classic <script src> loads fine from file:// (unlike ES-module imports,
 * which browsers block cross-file under the file:// origin) — so this is the
 * format an engine vendors for no-build, no-server, file:// running.
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.rng = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Seed hashing --------------------------------------------------------
  // Turn a string or number into a well-mixed 32-bit unsigned integer, so that
  // adjacent seeds (0, 1, 2) or similar names ("bass", "bass2") don't start
  // correlated. mulberry32 has 32 bits of state, so one 32-bit output is all we
  // need. Multiply-xor-shift mixing (imul keeps the multiply 32-bit).
  function hashSeed(input) {
    if (typeof input === 'number' && Number.isFinite(input)) {
      let h = input >>> 0;
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
      return (h ^ (h >>> 16)) >>> 0;
    }
    const str = String(input);
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Fold a parent seed together with a child-stream name so that
  // (seed, "bass") and (seed, "drums") are independent but reproducible.
  function combineSeed(seed, name) {
    const b = hashSeed(name);
    let h = ((seed >>> 0) ^ Math.imul(b ^ (b >>> 15), 0x2c1b3c6d)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ---- Core PRNG -----------------------------------------------------------
  // mulberry32: small, fast, 32-bit state. Good enough for music (we are not
  // doing cryptography or high-dimensional Monte Carlo). Returns a function
  // producing floats in [0, 1). Published constants; original implementation.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Rng: the ergonomic wrapper ------------------------------------------
  class Rng {
    constructor(seed = 1) {
      this._seed = hashSeed(seed);
      this._next = mulberry32(this._seed);
      this._spare = null; // cached second Box-Muller variate
    }

    /** Raw uniform float in [0, 1). */
    next() { return this._next(); }

    /** Uniform float in [min, max) (defaults to [0, 1)). */
    float(min = 0, max = 1) { return min + (max - min) * this._next(); }

    /** Uniform integer in [min, max], both inclusive. */
    int(min, max) { return min + Math.floor(this._next() * (max - min + 1)); }

    /** Boolean, true with probability p. */
    bool(p = 0.5) { return this._next() < p; }

    /** Uniform element of a non-empty array. */
    pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }

    /** Weighted choice: items[i] with probability weights[i]/sum(weights). */
    weighted(items, weights) {
      let total = 0;
      for (let i = 0; i < weights.length; i++) total += weights[i];
      let r = this._next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1]; // float round-off fallthrough
    }

    /** Fisher-Yates shuffle returning a NEW array (input untouched). */
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(this._next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    }

    /** Gaussian (normal) deviate via Box-Muller; caches the paired variate. */
    gaussian(mean = 0, stdev = 1) {
      if (this._spare !== null) {
        const v = this._spare; this._spare = null;
        return mean + stdev * v;
      }
      let u1 = 0;
      while (u1 === 0) u1 = this._next(); // avoid log(0)
      const u2 = this._next();
      const mag = Math.sqrt(-2 * Math.log(u1));
      this._spare = mag * Math.sin(2 * Math.PI * u2);
      return mean + stdev * (mag * Math.cos(2 * Math.PI * u2));
    }

    /** A named, independent, reproducible child stream. */
    stream(name) { return new Rng(combineSeed(this._seed, name)); }

    /** The resolved 32-bit seed (for logging/inspection). */
    get seed() { return this._seed; }
  }

  // ---- Pink (1/f) noise: a musical-random source ---------------------------
  // Voss-McCartney algorithm (reimplemented): sum of several octave-spaced
  // random sources refreshed at halving rates, giving a ~1/f spectrum. 1/f
  // sequences sit between white noise (too random) and Brownian (too smooth)
  // and are a classic model for "natural"-sounding melodic/dynamic drift
  // (see wiki/stochastic-chaos-and-automata.md). Each call returns the next
  // value, normalized to roughly [0, 1).
  class PinkNoise {
    constructor(rng, octaves = 5) {
      this._rng = rng;
      this._rows = new Array(octaves).fill(0).map(() => rng.next());
      this._counter = 0;
      this._octaves = octaves;
    }
    next() {
      this._counter = (this._counter + 1) >>> 0;
      // Refresh row k when the k-th bit flips (McCartney's trick): lowest set
      // bit of the counter selects which single row to update this step.
      let n = this._counter;
      let k = 0;
      while ((n & 1) === 0 && k < this._octaves - 1) { n >>= 1; k++; }
      this._rows[k] = this._rng.next();
      let sum = 0;
      for (let i = 0; i < this._octaves; i++) sum += this._rows[i];
      return sum / this._octaves;
    }
  }

  // ---- Euclidean rhythms (Bjorklund) ---------------------------------------
  // Distribute `pulses` onsets as evenly as possible over `steps` slots. This
  // maximally-even construction generates many traditional timelines:
  // E(3,8) = Cuban tresillo, E(5,8) = cinquillo, E(4,9) = Turkish aksak,
  // E(7,16) = a samba/necklace pattern (Toussaint 2005). See
  // wiki/rhythm-and-meter.md. Reimplemented from Bjorklund's algorithm via the
  // Euclidean remainder recursion — the reference form — not copied from any
  // source. E(k,n) is defined only up to rotation (it is a rhythmic necklace);
  // we return Bjorklund's arrangement normalized so the first onset is at index
  // 0, then rotated left by `rotation` steps. Traditional presentations of a
  // given rhythm are often a specific rotation of E(k,n) (e.g. the cumbia is a
  // rotation of E(3,4)), which is what the `rotation` argument is for.
  //
  // Returns an array of length `steps` of 1 (onset) / 0 (rest).
  function euclid(pulses, steps, rotation = 0) {
    steps = Math.max(0, Math.floor(steps));
    pulses = Math.floor(pulses);
    if (steps === 0) return [];
    if (pulses <= 0) return new Array(steps).fill(0);
    if (pulses >= steps) return new Array(steps).fill(1);

    // Build the count/remainder ladder from the Euclidean algorithm on
    // (pulses, steps-pulses).
    const counts = [];
    const remainders = [pulses];
    let divisor = steps - pulses;
    let level = 0;
    for (;;) {
      counts.push(Math.floor(divisor / remainders[level]));
      remainders.push(divisor % remainders[level]);
      divisor = remainders[level];
      level++;
      if (remainders[level] <= 1) break;
    }
    counts.push(divisor);

    // Recursively expand the ladder into the bit pattern.
    const pattern = [];
    const build = (lvl) => {
      if (lvl === -1) pattern.push(0);
      else if (lvl === -2) pattern.push(1);
      else {
        for (let i = 0; i < counts[lvl]; i++) build(lvl - 1);
        if (remainders[lvl] !== 0) build(lvl - 2);
      }
    };
    build(level);

    // Normalize so the first onset is at index 0.
    const first = pattern.indexOf(1);
    const normalized = first > 0
      ? pattern.slice(first).concat(pattern.slice(0, first))
      : pattern;

    const r = ((rotation % steps) + steps) % steps;
    return r ? normalized.slice(r).concat(normalized.slice(0, r)) : normalized;
  }

  /** Onset step indices of a 0/1 pattern, e.g. euclid then onsets -> [0,3,6]. */
  function onsets(pattern) {
    const out = [];
    for (let i = 0; i < pattern.length; i++) if (pattern[i]) out.push(i);
    return out;
  }

  return { Rng, PinkNoise, mulberry32, hashSeed, combineSeed, euclid, onsets };
});
