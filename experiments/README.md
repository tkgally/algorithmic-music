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
    analysis.js    pure PCM measurement (RMS/peak/dBFS, click proxy, onsets, silence, timing error)
  composers/  engine-level composition algorithms (consume lib/, not shared libraries themselves)
    tonal-phrase.js  worked R1+R2: phrase-first melody over a goal-directed, cadence-first progression
  tests/      headless Node tests (no framework, no dependencies)
    _runner.js     tiny assert/report harness
    rng.test.js  transport.test.js  theory.test.js  composer.test.js  analysis.test.js
    run.js         entry point
  demos/      browser demos (run from file://, no server)
    euclid-transport.html   plays a Euclidean rhythm through the lookahead transport
    offline-render.html     OfflineAudioContext render + measure (also the harness's render target)
  tools/      dev-time tools
    wiki-lint.mjs       wiki health check (run every session)
    render-measure.mjs  headless OfflineAudioContext render-and-measure harness (Playwright)
```

## Running the tests

```
node experiments/tests/run.js               # 74 tests: rng + transport + theory + composer + analysis
node experiments/tools/render-measure.mjs   # audio harness: renders in headless Chromium, measures, gates
```

`run.js` exits non-zero on any failure; the Euclidean-rhythm suite includes an
exhaustive maximal-evenness proof over all E(k,n) with 1 ≤ k ≤ n ≤ 32. The audio
harness renders through an `OfflineAudioContext` in headless Chromium (Playwright,
a dev-time tool — never a repo dependency, same as the previous experiments'
`verify.mjs`) and checks that `transport`-scheduled onsets land sample-accurately,
that the click-safe envelope is click-safe, and that a fully composed period
renders clean. It exits non-zero if any acceptance gate fails.

## Running the wiki lint

```
node experiments/tools/wiki-lint.mjs           # links, frontmatter, sections, orphans
node experiments/tools/wiki-lint.mjs --index   # dump frontmatter for index maintenance
```

## The library format (why UMD-lite, not ES modules)

`lib/rng.js`, `lib/transport.js`, `lib/theory.js`, `lib/analysis.js`, and
`composers/tonal-phrase.js` are written as **dual-format (UMD-lite)** files: the
same source loads as CommonJS in Node (`require('./rng.js')`) and as a browser
global via a classic `<script src>` (`window.AM.rng`, `window.AM.transport`,
`window.AM.theory`, `window.AM.analysis`, `window.AM.composers.tonalPhrase`).

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
outside this repo and never added as a dependency here. `analysis.js` is standard
DSP (RMS, dBFS, short-time energy onset picking, first-difference discontinuity,
silence runs). `composers/tonal-phrase.js` operationalizes already-cited wiki
theory (Piston's table from `harmony.md`; the melodic contour/step/leap/apex
statistics from `melody.md`; the sentence/period archetypes from
`phrase-structure.md`; Krumhansl–Kessler weights from `tuning-and-scales.md`).
`tools/render-measure.mjs` drives headless Chromium via Playwright — a dev-time
tool used exactly as the previous experiments' `verify.mjs` did (the globally
installed package, never a dependency of this repo). Ideas, algorithms, and
theory are borrowed and attributed; no source code is copied.
