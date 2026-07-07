---
title: Findings — shared-library foundation prototype
tags: [findings, implementation]
status: reviewed
created: 2026-07-07
updated: 2026-07-07
summary: Results from prototyping the first two first-party shared-library modules (seeded rng + lookahead transport) in experiments/ — what was built, what the 25-test headless suite proves, and the file:// module-format finding that fixes the vendoring format.
---

# Findings — shared-library foundation prototype

The [shared-libraries](shared-libraries.md) plan named a foundation trio — `theory`, `transport`, `rng` — to build first (originally Tom's 2026-07-07 request to start the shared-library groundwork). This session prototyped the two cheapest, highest-leverage of them, `rng` and `transport`, as original dependency-free code in `experiments/lib/`, with a headless Node test suite. This page records what was built, what the tests prove, the design decisions settled, and one finding that changes the recommended *format* for vendored libraries. It is a `findings` page: every claim here is backed by code in the repo that re-runs with `node experiments/tests/run.js` (25 assertions, all passing), which is a stronger form of verification than source-fetching.

## What was built

Two modules, both pure/deterministic, both reusing published *algorithms* while copying no outside project's *source* (the "original code, not original ideas" line from [shared-libraries](shared-libraries.md)):

- **`experiments/lib/rng.js`** — a seeded PRNG (`Rng`) built on mulberry32, with: uniform float/int, `bool`, `pick`, `weighted` choice, Fisher–Yates `shuffle` (non-mutating), Box–Muller `gaussian`, named independent sub-streams (`rng.stream("bass")`), a Voss–McCartney `PinkNoise` (1/f) generator, and standalone `euclid(pulses, steps, rotation)` (Bjorklund) with an `onsets()` helper.
- **`experiments/lib/transport.js`** — `MusicClock` (pure beats↔seconds/bars at constant tempo) and `Scheduler`, a lookahead ("two clocks") note scheduler with dependency-injected `now`/`setTimer`/`clearTimer` so the identical code unit-tests headless in Node and drives a real `AudioContext` in the browser.

A browser demo (`experiments/demos/euclid-transport.html`) wires them to real Web Audio to play a Euclidean rhythm; it runs from `file://` and is the manual/next-harness validation target for actual audio timing (see below).

## What the tests prove

`node experiments/tests/run.js` → **25 passed, 0 failed.** The load-bearing checks:

- **Determinism and named streams.** Equal seeds (numeric *or* string) reproduce identical sequences; different seeds diverge; `rng.stream(name)` is reproducible for a given `(seed, name)` and independent across names; drawing from a child stream does not perturb the parent. This is the [engine-architecture](engine-architecture.md) determinism invariant, demonstrated: one seed → one piece, with independent per-voice streams so adding a drum pattern can't shift the melody's randomness.
- **Distributions.** `weighted` matches its target fractions within 2% over 30k draws; `gaussian` recovers its mean/stdev; `int` hits both inclusive bounds and never exceeds them; `shuffle` is a genuine permutation that leaves its input untouched.
- **Euclidean rhythm is maximally even — proved exhaustively.** For **every** E(k,n) with 1 ≤ k ≤ n ≤ 32 (also spot-checked to 48), the output has exactly k onsets in n slots, starts on an onset, and every inter-onset gap is one of the two consecutive values ⌊n/k⌋ or ⌈n/k⌉ with exactly (n mod k) of the larger — the defining property of a Euclidean rhythm, checked rotation-invariantly. The two iconic patterns match [Toussaint (2005)](rhythm-and-meter.md) exactly: E(3,8) = `10010010` (Cuban tresillo), E(5,8) = `10110110` (cinquillo).
- **Lookahead scheduler correctness.** With a fake clock and manual ticks (no real timers), the scheduler fires each queued event exactly once, in time order, only once its time enters the `[now, now+lookahead)` window — never earlier; an `onRefill` producer drives an open-ended sequence lazily, staying ~one lookahead ahead instead of materializing an infinite score; `start`/`stop` wire correctly to an injected timer and `stop` halts ticks. An integration test drives `MusicClock` + `euclid` + `Rng` together to schedule one bar of a timeline on the exact step grid with reproducible velocities.

## The file:// module-format finding

The plan ([shared-libraries](shared-libraries.md), [engine-architecture](engine-architecture.md)) requires engines to run from `file://` with no build step and no server. Prototyping surfaced a concrete constraint the plan had not pinned down: **how a vendored library is loaded matters.**

- A classic `<script src="rng.js">` loads fine under the `file://` origin.
- A cross-file ES-module `import` **does not** — browsers block it with a CORS error on `file://` (module scripts are fetched with CORS; the `file:` scheme has an opaque origin). Confirmed against the documented browser behavior in [audio-worklets-and-performance](audio-worklets-and-performance.md)'s `file://` discussion.

So the vendorable format for a file://-runnable engine is **a classic script that attaches to a namespace** (or a single concatenated bundle), not `import`/`export`. Both prototype modules are therefore written as **dual-format (UMD-lite)**: the same source loads as CommonJS in Node (`require`) *and* as a browser global via `<script src>` (`window.AM.rng`, `window.AM.transport`) — validated both ways (Node tests + a VM-sandbox check of the browser-global branch). This resolves the "granularity/format" corner of the plan's open questions: several small modules, each a dual-format file, vendored by copy.

## Design decisions settled

- **Injected clock/timer for the scheduler.** Making `now`/`setTimer`/`clearTimer` parameters (rather than reaching for `AudioContext`/`setTimeout` directly) is what makes the lookahead scheduler headless-testable and deterministic. Recommended as a standing pattern for the Web-Audio libraries: take the `AudioContext` (and any timing source) as arguments, create no globals.
- **Named streams via `(seed, name)` hashing.** A child stream's seed is the parent seed folded with a hash of the name, so streams are reproducible and independent without threading counters through the engine. Matches the [engine-architecture](engine-architecture.md) "no `Math.random` anywhere" rule.
- **Euclid returns Bjorklund's arrangement normalized to a first-onset start, plus a `rotation` argument.** E(k,n) is only defined up to rotation (a rhythmic necklace); traditional presentations are specific rotations (the cumbia is a rotation of E(3,4)), so the rotation is exposed as a parameter rather than baked in.
- **Lookahead defaults 100 ms window / 25 ms interval**, matching the values recommended in [scheduling-and-timing](scheduling-and-timing.md) (Wilson's pattern); both are constructor options.

## What this confirms about the wiki plan

- The [scheduling-and-timing](scheduling-and-timing.md) lookahead pattern is real and small: a correct, testable scheduler is **~90 lines**. The claim that these primitives are "a few hundred lines total" ([shared-libraries](shared-libraries.md)) holds so far — `rng.js` + `transport.js` are ~330 lines combined including comments.
- Euclidean rhythm as a generation primitive ([rhythm-and-meter](rhythm-and-meter.md)) is trivially cheap and exactly correct, ready for an engine's rhythm layer.
- Seeded determinism with independent named streams is a clean, tested foundation for the reproducibility that [evaluation-challenges](evaluation-challenges.md) and [listening-tests-and-feedback](listening-tests-and-feedback.md) require (regenerate any piece from its seed for re-judging).

## Implications for generative engines

1. Vendor shared libraries as **classic dual-format scripts** attaching to a namespace (or a concatenated bundle), never as cross-file ES modules — the latter break `file://`. Ship the pure modules (`rng`, future `theory`) unchanged into Node dev-tests and the browser both.
2. Thread all randomness through one seeded `Rng` with **named per-voice streams**; log the seed with every render so pieces regenerate bit-identically.
3. Use the **injected-dependency** shape for any timing/audio library so it stays headless-testable; the composer/theory layers stay pure.
4. The scheduler's `onRefill` (lazy, one-lookahead-ahead) is the right shape for open-ended generative sequences; the `push`/queue shape suits fully-planned finite scores.
5. Next infrastructure step is the **OfflineAudioContext render-and-measure harness** ([computational-music-metrics](computational-music-metrics.md), queue item 7): the Node suite proves the *logic*, but real audio timing/click-safety of `transport` + a future `synth` needs a browser render to measure — the demo is the first target.

## Open questions

- **Audio-timing validation.** The scheduler's *scheduling math* is proven headless; its behavior against a real `AudioContext` clock (drift, hidden-tab throttling, click-safe envelopes) still needs the OfflineAudioContext/Playwright harness. Untested here beyond the manual demo.
- **Canonical source location** (from [shared-libraries](shared-libraries.md)) remains open — the prototype lives in `experiments/lib/`; the extract-on-second-use lean is unchanged, now with a concrete format (dual-format files) to extract.
- **`theory` module** is the remaining foundation piece and the next cheapest pure module; it gates R1/R2 (phrase-first melody, goal-directed harmony).

## Related pages

- [shared-libraries](shared-libraries.md) — the plan this prototypes; its format/granularity open questions are partly resolved here
- [scheduling-and-timing](scheduling-and-timing.md) — the source for `transport`; lookahead pattern confirmed implementable
- [rhythm-and-meter](rhythm-and-meter.md) — Euclidean/Bjorklund rhythm, validated against Toussaint's patterns
- [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md) — 1/f (pink) noise as a musical-random source
- [engine-architecture](engine-architecture.md) — the determinism and self-containment invariants the prototype honors
- [computational-music-metrics](computational-music-metrics.md) — the render-and-measure harness that validates the audio layer next
- [javascript-music-libraries](javascript-music-libraries.md) — the third-party API shapes these originals draw design from

## Sources

- Reproducible in-repo: `experiments/lib/rng.js`, `experiments/lib/transport.js`, `experiments/tests/` (run `node experiments/tests/run.js`), `experiments/demos/euclid-transport.html`, `experiments/README.md`. All original, public-domain (CC0).
- Reimplemented published algorithms (not copied): mulberry32 PRNG (Tommy Ettinger, public domain); xmur3-style seed mixing (bryc, public domain); Voss–McCartney 1/f noise; Bjorklund's Euclidean-rhythm construction (Bjorklund 2003; G. Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms," 2005); Chris Wilson, "A Tale of Two Clocks" (lookahead scheduling), 2013 — all cited on the linked implementation pages.
