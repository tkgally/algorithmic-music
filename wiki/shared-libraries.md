---
title: Shared libraries
tags: [implementation, project]
status: reviewed
created: 2026-07-07
updated: 2026-07-08
summary: The plan for this project's own original, first-party libraries — the reusable core (theory, timing, seeded RNG, synthesis, effects, analysis) that engines vendor instead of importing outside code, why they are built from scratch, and in what order.
---

# Shared libraries

Every engine this project will build needs the same machinery underneath: a music-theory module, a note scheduler, seeded randomness, synthesizer voices, an effects and master chain, and an analysis path for self-evaluation. Left unmanaged, that machinery gets re-derived in each engine or imported from an outside library. Tom's decision of 2026-07-07 sets a third path: build this shared machinery as the project's **own original, first-party libraries** — written from scratch, reusing published *ideas and algorithms* but no other project's *code*, kept dependency-free at runtime, and vendored (copied) into each engine rather than fetched. This page is the constructive plan — which libraries to build, the principles they share, and the order to build them. It is the counterpart to the third-party survey in [javascript-music-libraries](javascript-music-libraries.md): that page mines existing libraries for design lessons; this page turns those lessons into a build list for code we own.

## Why original, first-party libraries

The policy is a strengthening of the long-standing dependency-free default, not a reversal. External libraries were never absolutely banned and still are not; the change is that when a shared need is genuine, the *preferred* answer is now first-party original code rather than a vendored third-party helper. The reasons are the same ones argued in the [for-and-against ledger](javascript-music-libraries.md) and now settled in the project's favor:

- **Longevity and no supply chain.** A self-contained vanilla engine has nothing to rot; `@magenta/music` (no release since 2021) is the cautionary case. Original code we control will still run in a browser in ten years.
- **Zero license entanglement.** Everything the project creates is dedicated to the public domain under CC0 1.0 (`LICENSE`). Original first-party libraries keep that clean automatically — no AGPL (Strudel) or commercial (RNBO) terms to track, no attribution obligations beyond good manners.
- **Learning value.** Reimplementing a scheduler, a theory module, and Euclidean rhythms teaches what a black-box import hides — and the wiki is the memory of that learning. This is a stated project purpose, not incidental.
- **Small surface.** The primitives an engine actually needs — a lookahead scheduler, pure theory helpers, a few synth voices, basic effects, a feature extractor — are a few hundred lines total, well within scope.

The one line to hold carefully: **original code, not original ideas.** Reusing a published algorithm (Bjorklund's Euclidean-rhythm construction, mulberry32 PRNG arithmetic, the Chris Wilson two-clock scheduling pattern, standard DSP for a comb-filter reverb) by reimplementing it in our own code is expected and fine — those are general techniques, not a project's code. What we do not do is copy or port source out of another library. Attribute the idea in a comment and in [log.md](log.md); write the code ourselves.

## How sharing works without a runtime dependency

This must be reconciled with the self-containment rule in [engine-architecture](engine-architecture.md) (every engine independently downloadable, `file://`-runnable, no runtime coupling to another engine). The reconciliation is the **vendoring model**:

- The canonical source for each library lives once in the repo. Each engine **copies in** the modules it uses; it does not import them across engine boundaries or fetch them at runtime. Concretely, each module is a dual-format (UMD-lite) **classic script** — a Node `require` and a browser `<script src>` global (`window.AM.*`) in one file — because cross-file ES-module `import` is CORS-blocked under `file://` ([engine-architecture](engine-architecture.md) "Runtime rules"; validated in [findings-shared-lib-foundation](findings-shared-lib-foundation.md)).
- A library is therefore a shared *source of truth*, not a shared *runtime dependency*. Two engines can carry different pinned copies; evolving the canonical library never silently breaks a shipped engine.
- Result: code reuse (write the theory module once, not five times) without giving up self-containment (each engine is still a self-contained folder that runs from `file://`).

This is the same "copied in, never fetched" discipline the old policy applied to a third-party helper — only now the thing copied in is our own original library, and it can be a deliberate, documented core rather than a grudging exception.

## The library catalog (candidates)

Drawn from the "Implications" sections already scattered across the implementation and theory pages. Names are provisional. "Nature" flags whether a library touches Web Audio (and so needs an `AudioContext`) or is pure (headless-testable in Node).

| Library | What it provides | Draws its design from | Nature | Priority |
|---|---|---|---|---|
| `theory` | notes, intervals, scales, chords, keys; transposition, enharmonic spelling — pure functions over data | [harmony](harmony.md), [tuning-and-scales](tuning-and-scales.md), [melody](melody.md); Tonal's *API shape* | pure | 1 — foundational |
| `transport` | lookahead scheduler + musical-time clock (beats↔seconds, tempo map), sample-accurate `time`-argument callbacks, hidden-tab safe | [scheduling-and-timing](scheduling-and-timing.md); Tone's Transport *idea*, Wilson's two-clock pattern | Web Audio timing | 1 — foundational |
| `rng` | seeded PRNG (e.g. mulberry32), named independent streams, distributions (uniform, weighted choice, Gaussian, 1/f/brown), Euclidean rhythm (Bjorklund) | [engine-architecture](engine-architecture.md) determinism, [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md), [rhythm-and-meter](rhythm-and-meter.md) | pure | 1 — foundational |
| `synth` | oscillator/filter/noise voice factories, click-safe (ramped) envelopes, the synthesis recipes as reusable voices | [synthesis-recipes](synthesis-recipes.md), [web-audio-fundamentals](web-audio-fundamentals.md) | Web Audio | 2 |
| `fx` | reverb, delay, modulation, saturation, compression, EQ; a master chain with the standing loudness discipline | [effects-and-mixing](effects-and-mixing.md) | Web Audio | 2 |
| `analysis` | offline-render feature extraction (RMS, spectral centroid/flatness, chroma, loudness) + symbolic score metrics | [computational-music-metrics](computational-music-metrics.md), [improvement-loop](improvement-loop.md); Meyda's *feature menu* | Web Audio + pure | 3 — improvement loop |
| `pattern` (optional) | pattern-as-function-of-time plus a compact mini-notation for rhythms and motifs | [rhythm-and-meter](rhythm-and-meter.md), [generative-music-design-patterns](generative-music-design-patterns.md); Strudel's *model* | pure | later / experimental |

The first three (`theory`, `transport`, `rng`) are the foundation: the composer stage is built on `theory` + `rng` (+ optional `pattern`), and the performer/synthesizer stages on `transport` + `synth` + `fx`. `analysis` closes the render→measure→adjust loop. `pattern` is a strong idea (algebraic, lazy transformation of rhythm/melody) but not required for a first engine; treat it as experimental until a rhythm-forward engine wants it.

## Design principles

- **Pure where possible.** `theory`, `rng`, and `pattern` have no Web Audio and are unit-testable headless in Node — the cheapest, highest-leverage code in the stack. The Web-Audio libraries (`synth`, `fx`, `analysis`) take an `AudioContext` as a parameter and create no global state.
- **Small, stable, documented API per library.** Each is independently versioned and independently tested. Engines depend on the API, not on internals.
- **Determinism throughout.** `rng` threads named streams into everything; no `Math.random()` anywhere in engine or library code (an [engine-architecture](engine-architecture.md) invariant).
- **Validate against oracles at dev time.** Check `theory`'s interval/enharmonic math against Tonal's outputs; check `transport` timing against a known-good reference; check `analysis` features against synthetic signals with known values. Using an external library *as a dev-time test oracle* is fine — its code is never shipped, only its outputs are compared against ours.
- **Provenance discipline.** Original code; attribute any borrowed algorithm or idea in a comment and in [log.md](log.md); never copy source; never touch copyleft code even as reference-to-copy. Everything lands public-domain (CC0).
- **Vendored and pinned.** Each engine carries its own copy; the canonical source evolves without breaking shipped engines.

## Build order

1. **Foundation — `theory`, `transport`, `rng` — all three prototyped, validated, and now audio-timing-confirmed as of 2026-07-08.** These gate the first engine and several research questions: R1 (phrase-first melody) and R2 (goal-directed harmony) sit on `theory` + `rng` — and are now *worked end to end* in `experiments/composers/tonal-phrase.js` ([findings-tonal-phrase-composer](findings-tonal-phrase-composer.md)), which uses `theory.pistonSuccessors()` + `rng.weighted()` for a backward, cadence-first chord walk and `theory.stability()` for the melodic goal tone; R4 (cadence detector + motif-recurrence metric) needs the symbolic representation these establish. Proven in `experiments/` testbeds (Phase 1 permits non-public prototypes; see [findings-shared-lib-foundation](findings-shared-lib-foundation.md)); the previously-remaining real-audio-timing gap is now closed by the render-and-measure harness (item 2), so the foundation trio is engine-ready.
2. **Audible layer** — `synth`, `fx`. Needed for anything that makes level-matched sound; validate against the parameter tables in [synthesis-recipes](synthesis-recipes.md) and the loudness targets in [effects-and-mixing](effects-and-mixing.md) with the **OfflineAudioContext render-and-measure harness, now built** (`experiments/tools/render-measure.mjs` — it already validated `transport`'s sample-accurate timing and click-safety, and is the standing rig for `synth`/`fx`).
3. **Improvement loop** — `analysis`. Its **measurement core is prototyped** (`experiments/lib/analysis.js`, session 017: RMS/peak/dBFS, discontinuity, onset detection, silence, onset-timing error) as the harness's measurement half; the remaining work is the spectral/chroma feature extraction of [computational-music-metrics](computational-music-metrics.md) and the symbolic score metrics, so render → extract → score is fully closed.
4. **Optional** — `pattern`, and any DSP-heavy `AudioWorklet` voices (the [worklet](audio-worklets-and-performance.md) escape hatch), adopted only when a specific engine needs them.

None of this is public engine code — it is dev-time design and prototyping, allowed in Phase 1. The libraries become real code when the first engine is built (Phase 2, gated on Tom).

## Prototype status (2026-07-08)

**The three foundation modules are prototyped and validated headless in `experiments/lib/`, their real audio timing is now confirmed by an OfflineAudioContext harness, the `analysis` measurement core exists, and R1/R2 are worked end to end in a reference composer** — see [findings-shared-lib-foundation](findings-shared-lib-foundation.md) and [findings-tonal-phrase-composer](findings-tonal-phrase-composer.md) for the full results:

- **`rng`** (`experiments/lib/rng.js`) — seeded PRNG (mulberry32), named independent streams, the distributions (uniform, weighted, Gaussian, 1/f pink noise), and Euclidean rhythm (Bjorklund). Euclidean output proven maximally even for all E(k,n), 1 ≤ k ≤ n ≤ 32; determinism and named-stream independence tested.
- **`transport`** (`experiments/lib/transport.js`) — `MusicClock` (beats↔seconds) and a lookahead `Scheduler` with injected clock/timer so the same code is headless-testable in Node and drives a real `AudioContext` in the browser.
- **`theory`** (`experiments/lib/theory.js`, added 2026-07-08) — note-name/MIDI/frequency conversion, size-only interval naming, 13 named 12-TET scales, Krumhansl-Kessler tonal-hierarchy weights, generic tertian chord construction (triads/sevenths/roman numerals from any 7-note scale), T/S/D functional labels, Piston's root-progression table and rock-corpus chord priors pre-weighted for a seeded picker, and cents-based tuning tables (slendro, a rast-like approximation, JI ratios) for the non-12-TET traditions. Cross-checked at dev time against Tonal (oracle only, never a dependency) across all 12 tonics for every scale and for major/natural-minor diatonic chords: zero mismatches.
- **`analysis` measurement core** (`experiments/lib/analysis.js`, added 2026-07-08, session 017) — pure PCM measurement on a mono sample buffer: RMS/peak/dBFS, `maxStep` (click proxy), `detectOnsets`/`detectOnsetsEnergy`, `longestSilenceSec`, `onsetTimingError`. No Web Audio in the module, so it is unit-tested in Node against synthesized signals, then used to measure real browser renders. This is the measurement half of the render-and-measure harness (`experiments/tools/render-measure.mjs` + `experiments/demos/offline-render.html`), which validated `transport`'s timing as **sample-accurate** (all onsets detected, jitter 0.015 ms, max error 0.24 ms) and confirmed the click-safe envelope (safe `maxStep` 0.018 vs 0.50 for a hard gate).

`node experiments/tests/run.js` runs 74 passing tests (several containing many internal checks — e.g. the Euclidean-evenness test alone checks all 528 `(k,n)` pairs with 1 ≤ k ≤ n ≤ 32), plus `node experiments/tools/render-measure.mjs` for the audio harness. Things the prototypes settled:

- **Format = dual-format (UMD-lite) classic scripts, not ES modules.** A vendored library must load from `file://`; a classic `<script src>` does, but a cross-file ES-module `import` is CORS-blocked under `file://`. So each module is one file that works as both a Node `require` and a browser global (`window.AM.*`). This resolves the granularity/format open question below.
- **Injected dependencies** (pass the `AudioContext`/timing source in; no globals) is the standing pattern for the Web-Audio libraries, and is what makes them testable.
- **Oracle practice** (resolved, see below): a dev-time-only `npm install` of a reference library into a scratch directory outside the repo, used to compare *outputs* (never code) at a wide sweep, backed by a smaller set of committed, dependency-free regression tests that encode the facts that matter.

The previously-open item — validating the audio layer's *real* timing — is now **resolved** by the OfflineAudioContext harness (session 017): `transport`'s beats→seconds math is sample-accurate in a real render. The foundation trio is engine-ready, and R1/R2 are worked end to end in `experiments/composers/tonal-phrase.js`. What remains for the *audible* layer is `synth`/`fx` (build-order item 2), which the harness now stands ready to validate.

## Implications for generative engines

- The [engine-architecture](engine-architecture.md) pipeline maps cleanly onto these libraries: **Planner/Composer** use `theory` + `rng` (+ `pattern`); **Performer** + **Synthesizer** use `transport` + `synth` + `fx`; the **improvement loop** uses `analysis`. An engine is then mostly *style* (data) plus glue, with the hard infrastructure vendored in.
- Start `theory`, `transport`, and `rng` first and share them across all launch engines; let engines add their own style-specific voices on top of `synth` rather than forking it.
- Keep every library dependency-free and (for the pure ones) framework-free, so an engine folder stays a self-contained thing that opens from `file://`.
- Because the libraries are original and public-domain, an engine can be published, copied, and remixed by anyone with zero license bookkeeping — which also serves the project's openness goal.

## Open questions

- **Where does the canonical source live?** A dev-time `lib/` at the repo root, a `docs/lib/` promoted at Phase 2, or authored inside the first engine and extracted once a second engine needs it? Decide at first engine build; leaning toward extract-on-second-use to avoid speculative abstraction.
- **Granularity.** One "std" library or several small modules? *Resolved toward several small modules* by the 2026-07-07 prototype ([findings-shared-lib-foundation](findings-shared-lib-foundation.md)): each is one dual-format (UMD-lite) file that an engine vendors by copy and loads with a classic `<script src>` (the file://-safe format).
- **Shared vs specialized.** How much synthesis is genuinely shareable when a lo-fi engine and a classical engine want very different timbres? Working answer: shared primitives (`synth`'s voice factories, envelopes) with engine-specific presets and voices layered on top.
- **Oracle practice** *(resolved 2026-07-08)*: keep the reference library entirely outside the repo (a scratch-directory `npm install`, no `package.json`/`node_modules` committed), compare only its *outputs* against the module's outputs in a wide dev-time sweep, then encode the facts that matter as permanent, dependency-free, committed test assertions. Full method and results in [findings-shared-lib-foundation](findings-shared-lib-foundation.md)'s "Oracle validation" section (used for `theory` against Tonal, zero mismatches across 128 MIDI notes, 156 scale instances, 24 diatonic-key instances).

## Related pages

- [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the `rng` + `transport` + `theory` + `analysis` prototypes and their validation (Tonal oracle for `theory`; the OfflineAudioContext harness for `transport` timing)
- [findings-tonal-phrase-composer](findings-tonal-phrase-composer.md) — the worked R1/R2 composer built on `theory` + `rng` (engine-level, not itself a shared library)
- [javascript-music-libraries](javascript-music-libraries.md) — the third-party survey these lessons are mined from
- [engine-architecture](engine-architecture.md) — the module pipeline these libraries populate
- [scheduling-and-timing](scheduling-and-timing.md), [synthesis-recipes](synthesis-recipes.md), [effects-and-mixing](effects-and-mixing.md), [web-audio-fundamentals](web-audio-fundamentals.md) — implementation sources for `transport`, `synth`, `fx`
- [harmony](harmony.md), [tuning-and-scales](tuning-and-scales.md), [melody](melody.md) — what `theory` serves
- [computational-music-metrics](computational-music-metrics.md), [improvement-loop](improvement-loop.md) — what `analysis` serves
- [rhythm-and-meter](rhythm-and-meter.md), [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md) — `pattern` and `rng` design
- [project-open-questions](project-open-questions.md) — the dependency decision (2026-07-06, refined 2026-07-07); [project-roadmap](project-roadmap.md) — Phase 1 shared-library groundwork

## Sources

- This page is original project design, synthesizing the "Implications for generative engines" sections of the linked implementation and theory pages. The catalog, priorities, and build order are provisional until the first engine validates them (same status as [engine-architecture](engine-architecture.md)).
- External design references — all reimplemented, never copied — are cited on the pages above: Chris Wilson, "A Tale of Two Clocks" (lookahead scheduling); E. Bjorklund / G. Toussaint (Euclidean rhythm); Tonal, Tone.js, Strudel, Meyda (API shapes and feature menus, per [javascript-music-libraries](javascript-music-libraries.md)).
