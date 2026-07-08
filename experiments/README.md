# experiments/

Private, dev-time testbeds and prototypes (Phase 1 allows non-public code — see
`wiki/project-roadmap.md`). Nothing here is shipped product; findings from what
lives here are filed back into the wiki (an experiment without a filed finding
didn't happen). All code is public-domain (CC0), original, and reuses no outside
project's source.

## Layout

```
experiments/
  lib/        first-party shared-library prototypes (see wiki/shared-libraries.md)
    rng.js         seeded PRNG + named streams + distributions + Euclidean rhythm + pink noise
    transport.js   musical-time clock (beats<->seconds) + lookahead note scheduler
    theory.js      notes/MIDI/frequency, intervals, scales, chords, keys, tuning tables
  tests/      headless Node tests (no framework, no dependencies)
    _runner.js     tiny assert/report harness
    rng.test.js
    transport.test.js
    theory.test.js
    run.js         entry point
  demos/      browser demos (run from file://, no server)
    euclid-transport.html   plays a Euclidean rhythm through the lookahead transport
  tools/      dev-time tools
    wiki-lint.mjs  wiki health check (run every session)
```

## Running the tests

```
node experiments/tests/run.js      # 51 tests across rng + transport + theory
```

Exits non-zero on any failure. The Euclidean-rhythm suite includes an exhaustive
maximal-evenness proof over all E(k,n) with 1 ≤ k ≤ n ≤ 32.

## Running the wiki lint

```
node experiments/tools/wiki-lint.mjs           # links, frontmatter, sections, orphans
node experiments/tools/wiki-lint.mjs --index   # dump frontmatter for index maintenance
```

## The library format (why UMD-lite, not ES modules)

`lib/rng.js`, `lib/transport.js`, and `lib/theory.js` are written as
**dual-format (UMD-lite)** files: the same source loads as CommonJS in Node
(`require('./rng.js')`) and as a browser global via a classic `<script src>`
(`window.AM.rng`, `window.AM.transport`, `window.AM.theory`).

This is deliberate. The project's engines must run from `file://` with no build
step and no server (`wiki/engine-architecture.md`). A classic `<script src>`
loads fine under the `file://` origin; **cross-file ES-module `import` does not**
— browsers block it with a CORS error on `file://`. So the vendorable format for
a file://-runnable engine is a classic script that attaches to a namespace, or a
single concatenated bundle — not `import`/`export`. The demo loads the libraries
exactly the way an engine would vendor them. (Filed in
`wiki/findings-shared-lib-foundation.md`.)

## Provenance

`rng.js` reimplements published, public-domain algorithms (mulberry32 PRNG —
Tommy Ettinger; xmur3-style seed mixing — bryc; Voss–McCartney pink noise;
Bjorklund's Euclidean-rhythm construction — Bjorklund 2003 / Toussaint 2005).
`transport.js` reimplements Chris Wilson's two-clock lookahead scheduling pattern
("A Tale of Two Clocks", 2013). `theory.js` reimplements standard, centuries-old
music theory (interval/scale/chord construction) plus cited data tables
(Piston's root-progression table, Krumhansl & Kessler's tonal-hierarchy
profiles) already transcribed in `wiki/harmony.md`/`wiki/tuning-and-scales.md`;
its interval/scale/chord math was cross-checked at dev time against Tonal
(`@tonaljs/tonal`) as an output-only oracle, installed to a scratch directory
outside this repo and never added as a dependency here. Ideas, algorithms, and
theory are borrowed and attributed; no source code is copied.
