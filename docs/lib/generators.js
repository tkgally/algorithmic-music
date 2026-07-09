/*
 * generators — three small deterministic pattern generators the style system
 * feeds on: Schillinger interference resultants, Xenakis sieves (residue
 * classes), and Koenig tendency masks.
 *
 * Part of the algorithmic-music comprehensive site's first-party shared
 * libraries (docs/lib). Original code. It reimplements published, public-domain
 * *ideas* — Joseph Schillinger's rhythmic resultants (System of Musical
 * Composition, 1946), Iannis Xenakis's sieve theory (Formalized Music, 1971),
 * and G. M. Koenig's tendency masks (Project 2, 1970) — as specified in
 * wiki/meta-composition-and-style-machines.md and the style-vector schema
 * design doc (docs/design/style-vector-schema.html §9). No other project's
 * source is copied.
 *
 * The standing caveat from the wiki carries over (Backus's critique of
 * Schillinger): these produce POSSIBILITY, never VALUE — every output still
 * feeds a constraint/selection layer that carries the musical judgment.
 *
 * All functions are pure and deterministic (any randomness comes from a
 * caller-supplied rng), so same-seed-same-piece holds. Dual-format (UMD-lite):
 * Node require() for tests, <script src> -> window.AM.generators in the site.
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.generators = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return Math.abs(a * b) / (gcd(a, b) || 1); }

  // ---- Schillinger interference resultant -----------------------------------
  // Two pulse streams with periods a and b, superimposed over one common cycle
  // lcm(a,b): every attack of either stream is an attack of the resultant; the
  // durations between consecutive attacks form the rhythm. resultant(3,4) ->
  // [3,1,2,2,1,3] in 12 — the classic 3:4 cross-rhythm cell. Returns
  // { cycle, attacks[], durations[] } with attacks as offsets in [0, cycle).
  function resultant(a, b) {
    a = Math.max(1, Math.floor(a)); b = Math.max(1, Math.floor(b));
    const cycle = lcm(a, b);
    const set = new Set();
    for (let t = 0; t < cycle; t += a) set.add(t);
    for (let t = 0; t < cycle; t += b) set.add(t);
    const attacks = Array.from(set).sort((x, y) => x - y);
    const durations = attacks.map((t, i) => (i + 1 < attacks.length ? attacks[i + 1] - t : cycle - t));
    return { cycle, attacks, durations };
  }

  // ---- Xenakis sieves --------------------------------------------------------
  // A sieve is a logical combination of residue classes (mod, res) over the
  // integers. Build one with the tiny combinators below, then take(sieve, n)
  // yields the members in [0, n). Example: union(rc(3,0), rc(4,1)) is
  // "multiples of 3, or 1 mod 4" — a pitch or onset alphabet.
  function rc(mod, res) {
    mod = Math.max(1, Math.floor(mod));
    res = ((Math.floor(res) % mod) + mod) % mod;
    return (x) => ((x % mod) + mod) % mod === res;
  }
  function union() { const fs = Array.prototype.slice.call(arguments); return (x) => fs.some((f) => f(x)); }
  function intersection() { const fs = Array.prototype.slice.call(arguments); return (x) => fs.every((f) => f(x)); }
  function complement(f) { return (x) => !f(x); }
  /** Members of `sieve` in [0, n). */
  function take(sieve, n) {
    const out = [];
    for (let x = 0; x < n; x++) if (sieve(x)) out.push(x);
    return out;
  }
  /** A seeded random sieve with a target density; always keeps 0 (a stable anchor). */
  function randomSieve(rng, opts) {
    opts = opts || {};
    const mods = opts.mods || [2, 3, 4, 5, 7, 8];
    const terms = Math.max(1, Math.min(3, opts.terms == null ? 2 : opts.terms));
    const fs = [rc(1, 0)];
    fs.length = 0;
    for (let i = 0; i < terms; i++) {
      const m = mods[Math.floor(rng.next() * mods.length)];
      const r = Math.floor(rng.next() * m);
      fs.push(rc(m, i === 0 ? 0 : r)); // first term anchored at 0
    }
    return union.apply(null, fs);
  }

  // ---- Koenig tendency masks --------------------------------------------------
  // A [min,max]-over-time envelope pair; sampling inside the moving band makes a
  // parameter evolve deterministically without literal repetition. `shape` names
  // are the site's intensity-arc vocabulary (percussion engine v0.2's nine
  // shapes, wiki/tempo-duration-and-pacing.md); arcValue(shape, t) returns the
  // 0..1 arc height at t in 0..1, and tendency() wraps it as a mask sampler.
  const ARC_SHAPES = ['rise', 'arch', 'lateArch', 'terraced', 'waves', 'joHaKyu', 'frontLoaded', 'level', 'swellCut'];

  function arcValue(shape, t) {
    t = Math.max(0, Math.min(1, t));
    switch (shape) {
      case 'rise': return t;
      case 'arch': return Math.sin(Math.PI * t);
      case 'lateArch': return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.65)), 1.2);
      case 'terraced': { const steps = 4; const k = Math.min(steps - 1, Math.floor(t * steps)); return (k + 1) / steps * (t < 0.94 ? 1 : 0.55); }
      case 'waves': return 0.55 + 0.45 * Math.sin(2 * Math.PI * (2.5 * t - 0.25)) * (0.5 + 0.5 * t);
      case 'joHaKyu': return t < 0.55 ? 0.25 + 0.35 * (t / 0.55) : t < 0.9 ? 0.6 + 0.4 * ((t - 0.55) / 0.35) : 1 - 0.9 * ((t - 0.9) / 0.1);
      case 'frontLoaded': return 1 - 0.65 * t;
      case 'level': return 0.62;
      case 'swellCut': return t < 0.85 ? 0.3 + 0.7 * Math.pow(t / 0.85, 1.4) : 0.12;
      default: return Math.sin(Math.PI * t);
    }
  }

  /**
   * tendency(minFn, maxFn) -> sample(rng, t): a value drawn inside the moving
   * band. minFn/maxFn may be numbers or (t)=>number.
   */
  function tendency(minFn, maxFn) {
    const lo = typeof minFn === 'function' ? minFn : () => minFn;
    const hi = typeof maxFn === 'function' ? maxFn : () => maxFn;
    return (rng, t) => {
      const a = lo(t), b = hi(t);
      return a + (b - a) * rng.next();
    };
  }

  return { gcd, lcm, resultant, rc, union, intersection, complement, take, randomSieve, ARC_SHAPES, arcValue, tendency };
});
