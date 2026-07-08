---
title: Findings — shared-library foundation prototype
tags: [findings, implementation]
status: reviewed
created: 2026-07-07
updated: 2026-07-08
summary: Results from prototyping all three first-party shared-library foundation modules (seeded rng, lookahead transport, and theory) in experiments/ — what was built, what the 51-test headless suite (plus a dev-time Tonal oracle check) proves, and the two format/validation findings that fix the vendoring and testing approach.
---

# Findings — shared-library foundation prototype

The [shared-libraries](shared-libraries.md) plan named a foundation trio — `theory`, `transport`, `rng` — to build first (originally Tom's 2026-07-07 request to start the shared-library groundwork). Session 010 prototyped `rng` and `transport`; this page's 2026-07-08 update adds `theory` (session 016), completing the foundation trio. All three are original dependency-free code in `experiments/lib/`, with a headless Node test suite. This page records what was built, what the tests prove, the design decisions settled, and two findings that changed the recommended *format* for vendored libraries and the *validation* approach for pure theory code. It is a `findings` page: every claim here is backed by code in the repo that re-runs with `node experiments/tests/run.js` (51 tests, all passing — several containing many internal checks, e.g. the Euclidean-evenness test alone covers all 528 `(k,n)` pairs with 1 ≤ k ≤ n ≤ 32), which is a stronger form of verification than source-fetching.

## What was built

Three modules, all pure/deterministic, all reusing published *algorithms* or *theory* while copying no outside project's *source* (the "original code, not original ideas" line from [shared-libraries](shared-libraries.md)):

- **`experiments/lib/rng.js`** — a seeded PRNG (`Rng`) built on mulberry32, with: uniform float/int, `bool`, `pick`, `weighted` choice, Fisher–Yates `shuffle` (non-mutating), Box–Muller `gaussian`, named independent sub-streams (`rng.stream("bass")`), a Voss–McCartney `PinkNoise` (1/f) generator, and standalone `euclid(pulses, steps, rotation)` (Bjorklund) with an `onsets()` helper.
- **`experiments/lib/transport.js`** — `MusicClock` (pure beats↔seconds/bars at constant tempo) and `Scheduler`, a lookahead ("two clocks") note scheduler with dependency-injected `now`/`setTimer`/`clearTimer` so the identical code unit-tests headless in Node and drives a real `AudioContext` in the browser.
- **`experiments/lib/theory.js`** (session 016) — note-name/MIDI/frequency conversion (`noteToMidi`, `midiToNoteName`, `midiToFreq`, scientific pitch notation, C4 = MIDI 60), size-only interval naming and transposition, 13 named 12-TET scales as semitone patterns (major, natural/harmonic/melodic minor, the five diatonic modes, major/minor pentatonic, whole tone, and the Japanese *in* scale), the Krumhansl & Kessler (1982) tonal-hierarchy profiles (transcribed from [tuning-and-scales](tuning-and-scales.md)) via `stability()`, generic tertian-stacking chord construction (`triad`/`seventh`/`diatonicChords`) that derives quality and roman numerals from any 7-note scale rather than hand-listing them per scale, T/S/D functional-harmony labels for major and natural-minor keys, Piston's root-progression table and the rock-corpus chord priors (both transcribed from [harmony](harmony.md), pre-weighted 0.6/0.3/0.1 by tier as that page recommends) via `pistonSuccessors()`, and cents-based tuning tables (slendro, a rast-like maqam approximation, the *in* scale in cents, JI major-scale ratios) transcribed from [tuning-and-scales](tuning-and-scales.md)'s "concrete tables to ship" list, via `freqFromCents`/`freqFromRatio`.

A browser demo (`experiments/demos/euclid-transport.html`) wires `rng`+`transport` to real Web Audio to play a Euclidean rhythm; it runs from `file://` and is the manual/next-harness validation target for actual audio timing (see below). `theory` is pure and has no demo; its correctness case is the test suite plus the oracle check below.

## What the tests prove

`node experiments/tests/run.js` → **51 passed, 0 failed.** The load-bearing checks:

- **Determinism and named streams.** Equal seeds (numeric *or* string) reproduce identical sequences; different seeds diverge; `rng.stream(name)` is reproducible for a given `(seed, name)` and independent across names; drawing from a child stream does not perturb the parent. This is the [engine-architecture](engine-architecture.md) determinism invariant, demonstrated: one seed → one piece, with independent per-voice streams so adding a drum pattern can't shift the melody's randomness.
- **Distributions.** `weighted` matches its target fractions within 2% over 30k draws; `gaussian` recovers its mean/stdev; `int` hits both inclusive bounds and never exceeds them; `shuffle` is a genuine permutation that leaves its input untouched.
- **Euclidean rhythm is maximally even — proved exhaustively.** For **every** E(k,n) with 1 ≤ k ≤ n ≤ 32 (also spot-checked to 48), the output has exactly k onsets in n slots, starts on an onset, and every inter-onset gap is one of the two consecutive values ⌊n/k⌋ or ⌈n/k⌉ with exactly (n mod k) of the larger — the defining property of a Euclidean rhythm, checked rotation-invariantly. The two iconic patterns match [Toussaint (2005)](rhythm-and-meter.md) exactly: E(3,8) = `10010010` (Cuban tresillo), E(5,8) = `10110110` (cinquillo).
- **Lookahead scheduler correctness.** With a fake clock and manual ticks (no real timers), the scheduler fires each queued event exactly once, in time order, only once its time enters the `[now, now+lookahead)` window — never earlier; an `onRefill` producer drives an open-ended sequence lazily, staying ~one lookahead ahead instead of materializing an infinite score; `start`/`stop` wire correctly to an injected timer and `stop` halts ticks. An integration test drives `MusicClock` + `euclid` + `Rng` together to schedule one bar of a timeline on the exact step grid with reproducible velocities.
- **Note/interval/frequency math is exact.** MIDI↔note-name round-trips (including sharps, flats, double sharp/flat, case-insensitive letters); `midiToFreq` reproduces A440 and the standard C4 = 261.6256 Hz to 1e-6; the Krumhansl-Kessler profiles are checked verbatim against [tuning-and-scales](tuning-and-scales.md); `pistonSuccessors()` reproduces the harmony.md Piston table's 0.6/0.3/0.1 tier weighting exactly, including the single-tier vii° edge case; cents/ratio tuning helpers reproduce the 12-TET semitone formula and the pure 3:2/5:4 JI intervals to 1e-9.
- **Scale and chord construction hold up against an independent oracle** — see the dedicated section below, which is a stronger check than the hand-picked assertions in the test file alone.

## The file:// module-format finding

The plan ([shared-libraries](shared-libraries.md), [engine-architecture](engine-architecture.md)) requires engines to run from `file://` with no build step and no server. Prototyping surfaced a concrete constraint the plan had not pinned down: **how a vendored library is loaded matters.**

- A classic `<script src="rng.js">` loads fine under the `file://` origin.
- A cross-file ES-module `import` **does not** — browsers block it with a CORS error on `file://` (module scripts are fetched with CORS; the `file:` scheme has an opaque origin). Confirmed against the documented browser behavior in [audio-worklets-and-performance](audio-worklets-and-performance.md)'s `file://` discussion.

So the vendorable format for a file://-runnable engine is **a classic script that attaches to a namespace** (or a single concatenated bundle), not `import`/`export`. All three prototype modules are therefore written as **dual-format (UMD-lite)**: the same source loads as CommonJS in Node (`require`) *and* as a browser global via `<script src>` (`window.AM.rng`, `window.AM.transport`, `window.AM.theory`) — validated both ways (Node tests + a VM-sandbox check of the browser-global branch). This resolves the "granularity/format" corner of the plan's open questions: several small modules, each a dual-format file, vendored by copy.

## Oracle validation of `theory` against Tonal (2026-07-08)

`shared-libraries.md`'s "Oracle practice" open question asked whether keeping a third-party library as a dev-only *test oracle* (never a shipped dependency) should be formalized. This session did exactly that for `theory`, and the practice is now settled:

- **Method:** `npm install @tonaljs/tonal` into a scratch directory *outside the repo* (`/tmp`, no `package.json` or `node_modules` added to the project) and compared its outputs against `theory.js`'s outputs, never its code. Nothing Tonal-related is committed; the repo stays dependency-free exactly as before.
- **Coverage:** full MIDI↔note-name round-trip for all 128 MIDI notes (0-127); every scale in `SCALES` compared against `Scale.get(...)` for all 12 tonic pitch classes (156 scale instances); diatonic triads for `major` and `naturalMinor` compared against `Key.majorKey`/`Key.minorKey(...).natural` for all 12 tonics (24 key instances, root positions compared as sorted pitch-class sets so the check is spelling-independent).
- **Result: zero mismatches.** Every one of those comparisons agreed exactly. This is on top of (not a replacement for) the 26 theory-specific tests committed in `experiments/tests/theory.test.js`, which encode the same facts as permanent, reproducible, dependency-free regression tests — the oracle run itself is not committed or reproducible by a future session without reinstalling Tonal, so the committed test file is the load-bearing artifact; the oracle run is corroborating evidence recorded here.
- **Standing practice for future pure modules:** when a library has small-molecule facts an established library can check (interval spelling, scale/chord construction, corpus-table transcription), do a wide dev-time sweep against that library's *outputs* in a scratch directory, then bake the facts that matter into hand-written, committed assertions. Do not add the oracle library to `package.json`/`node_modules` or otherwise let it touch the shipped repo.

## Design decisions settled

- **Injected clock/timer for the scheduler.** Making `now`/`setTimer`/`clearTimer` parameters (rather than reaching for `AudioContext`/`setTimeout` directly) is what makes the lookahead scheduler headless-testable and deterministic. Recommended as a standing pattern for the Web-Audio libraries: take the `AudioContext` (and any timing source) as arguments, create no globals.
- **Named streams via `(seed, name)` hashing.** A child stream's seed is the parent seed folded with a hash of the name, so streams are reproducible and independent without threading counters through the engine. Matches the [engine-architecture](engine-architecture.md) "no `Math.random` anywhere" rule.
- **Euclid returns Bjorklund's arrangement normalized to a first-onset start, plus a `rotation` argument.** E(k,n) is only defined up to rotation (a rhythmic necklace); traditional presentations are specific rotations (the cumbia is a rotation of E(3,4)), so the rotation is exposed as a parameter rather than baked in.
- **Lookahead defaults 100 ms window / 25 ms interval**, matching the values recommended in [scheduling-and-timing](scheduling-and-timing.md) (Wilson's pattern); both are constructor options.
- **Chord quality falls out of the scale, not a per-scale lookup table.** `theory.js`'s `triad`/`seventh` count diatonic thirds (2 scale-steps) and classify the resulting semitone intervals generically, so the same ~15 lines of code correctly produces major key's 7 diatonic qualities, natural minor's, harmonic minor's augmented III (a byproduct of its raised 7th), and any future modal scale's — no scale gets its own hand-written chord table.
- **Function labels (T/S/D) are provided only where the theory is settled** (major and natural-minor keys, matching [harmony](harmony.md)'s three-category syntax and cross-checked against Tonal's own `chordsHarmonicFunction` convention). Modal/other scales return `function: null` rather than a guessed label — an explicit "don't know" beats a wrong answer that looks authoritative.

## What this confirms about the wiki plan

- The [scheduling-and-timing](scheduling-and-timing.md) lookahead pattern is real and small: a correct, testable scheduler is **~90 lines**. The claim that these primitives are "a few hundred lines total" ([shared-libraries](shared-libraries.md)) holds well past two modules — `rng.js` + `transport.js` + `theory.js` are under 700 lines combined including comments.
- Euclidean rhythm as a generation primitive ([rhythm-and-meter](rhythm-and-meter.md)) is trivially cheap and exactly correct, ready for an engine's rhythm layer.
- Seeded determinism with independent named streams is a clean, tested foundation for the reproducibility that [evaluation-challenges](evaluation-challenges.md) and [listening-tests-and-feedback](listening-tests-and-feedback.md) require (regenerate any piece from its seed for re-judging).
- [Harmony](harmony.md)'s "usable numbers" (Piston tiers, rock-corpus priors) and [tuning-and-scales](tuning-and-scales.md)'s "concrete tables to ship" (Krumhansl profiles, cents scales, JI ratios) were written as prose/table recommendations for a future engine to operationalize — they turn out to transcribe into code exactly as stated, with no numeric surprises, which is a good sign for the "engine-ready" framing those pages use.

## Implications for generative engines

1. Vendor shared libraries as **classic dual-format scripts** attaching to a namespace (or a concatenated bundle), never as cross-file ES modules — the latter break `file://`. Ship the pure modules (`rng`, `transport`'s pure `MusicClock`, `theory`) unchanged into Node dev-tests and the browser both.
2. Thread all randomness through one seeded `Rng` with **named per-voice streams**; log the seed with every render so pieces regenerate bit-identically.
3. Use the **injected-dependency** shape for any timing/audio library so it stays headless-testable; the composer/theory layers stay pure.
4. The scheduler's `onRefill` (lazy, one-lookahead-ahead) is the right shape for open-ended generative sequences; the `push`/queue shape suits fully-planned finite scores.
5. `theory.pistonSuccessors(roman)` returns `{items, weights}` shaped exactly for `rng.weighted(items, weights)` — the two foundation modules compose directly for R2 (goal-directed harmony): pick a cadence target, walk backward or forward through `pistonSuccessors`/`ROCK_CHORD_PRIORS` with a seeded `Rng`, realize each roman numeral via `diatonicChords`.
6. `theory.scaleDegree` + `theory.stability` give R1 (phrase-first melody) a cheap "is this note a good phrase-final?" test: prefer scale degrees with `stability(pc, tonicPc, mode)` above a threshold at cadence points.
7. Next infrastructure step is the **OfflineAudioContext render-and-measure harness** ([computational-music-metrics](computational-music-metrics.md), queue item 7): the Node suite proves the *logic*, but real audio timing/click-safety of `transport` + a future `synth` needs a browser render to measure — the demo is the first target.

## Open questions

- **Audio-timing validation.** The scheduler's *scheduling math* is proven headless; its behavior against a real `AudioContext` clock (drift, hidden-tab throttling, click-safe envelopes) still needs the OfflineAudioContext/Playwright harness. Untested here beyond the manual demo. This is now the sole remaining item before an engine can depend on the foundation trio.
- **Canonical source location** (from [shared-libraries](shared-libraries.md)) remains open — the prototype lives in `experiments/lib/`; the extract-on-second-use lean is unchanged, now with a concrete format (dual-format files) to extract.
- **Minor-key dominant strength.** `diatonicChords(tonic, 'naturalMinor')` gives v its natural (minor-quality, "weak dominant") reading; an engine wanting the stronger leading-tone V should call `diatonicChords(tonic, 'harmonicMinor')` for that one chord and otherwise use the natural-minor set — mixing scales per-chord like real minor-key practice does. Not yet exercised in an actual harmony generator; flag if the split feels awkward once one is built.
- **Interval spelling.** `theory.intervalName` is size-only (semitone count), so it cannot distinguish an augmented 4th from a diminished 5th the way notated music does (both are "TT" here) — adequate for the chord/scale math above, not for notation-accurate output. Would need note-letter-aware spelling if the project ever renders traditional notation.

## Related pages

- [shared-libraries](shared-libraries.md) — the plan this prototypes; its format/granularity/oracle open questions are resolved here
- [scheduling-and-timing](scheduling-and-timing.md) — the source for `transport`; lookahead pattern confirmed implementable
- [rhythm-and-meter](rhythm-and-meter.md) — Euclidean/Bjorklund rhythm, validated against Toussaint's patterns
- [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md) — 1/f (pink) noise as a musical-random source
- [harmony](harmony.md) — the Piston table, functional T/S/D categories, and rock-corpus priors `theory.js` transcribes
- [tuning-and-scales](tuning-and-scales.md) — the Krumhansl profiles and cents-based tuning tables `theory.js` transcribes
- [engine-architecture](engine-architecture.md) — the determinism and self-containment invariants the prototype honors
- [computational-music-metrics](computational-music-metrics.md) — the render-and-measure harness that validates the audio layer next
- [javascript-music-libraries](javascript-music-libraries.md) — the third-party API shapes these originals draw design from, and Tonal specifically as the oracle for `theory`

## Sources

- Reproducible in-repo: `experiments/lib/rng.js`, `experiments/lib/transport.js`, `experiments/lib/theory.js`, `experiments/tests/` (run `node experiments/tests/run.js`), `experiments/demos/euclid-transport.html`, `experiments/README.md`. All original, public-domain (CC0).
- Reimplemented published algorithms/theory (not copied): mulberry32 PRNG (Tommy Ettinger, public domain); xmur3-style seed mixing (bryc, public domain); Voss–McCartney 1/f noise; Bjorklund's Euclidean-rhythm construction (Bjorklund 2003; G. Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms," 2005); Chris Wilson, "A Tale of Two Clocks" (lookahead scheduling), 2013; standard tertian chord-construction theory; Piston's root-progression table and Krumhansl & Kessler's tonal-hierarchy profiles as already transcribed and cited in [harmony](harmony.md) and [tuning-and-scales](tuning-and-scales.md) — all cited on the linked implementation/theory pages.
- Dev-time oracle only (never a runtime or repo dependency): Tonal (`@tonaljs/tonal`, MIT license), used exclusively to compare outputs, not to borrow code — see the "Oracle validation" section above.
