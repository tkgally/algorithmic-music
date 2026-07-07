---
title: Shared libraries
tags: [implementation, project]
status: draft
created: 2026-07-07
updated: 2026-07-07
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

- The canonical source for each library lives once in the repo. Each engine **copies in** the modules it uses; it does not import them across engine boundaries or fetch them at runtime.
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

1. **Foundation** — `theory`, `transport`, `rng`. These gate the first engine and several research questions: R1 (phrase-first melody) and R2 (goal-directed harmony) sit on `theory` + `rng`; R4 (cadence detector + motif-recurrence metric) needs the symbolic representation these establish. Prove each in an `experiments/` testbed (Phase 1 permits non-public prototypes) before any engine depends on it.
2. **Audible layer** — `synth`, `fx`. Needed for anything that makes level-matched sound; validate against the parameter tables in [synthesis-recipes](synthesis-recipes.md) and the loudness targets in [effects-and-mixing](effects-and-mixing.md), ideally with the OfflineAudioContext render-and-measure harness.
3. **Improvement loop** — `analysis`. Render → extract features → score, per [computational-music-metrics](computational-music-metrics.md); this is what lets the engine (and future sessions) measure output, not just hear it.
4. **Optional** — `pattern`, and any DSP-heavy `AudioWorklet` voices (the [worklet](audio-worklets-and-performance.md) escape hatch), adopted only when a specific engine needs them.

None of this is public engine code — it is dev-time design and prototyping, allowed in Phase 1. The libraries become real code when the first engine is built (Phase 2, gated on Tom).

## Implications for generative engines

- The [engine-architecture](engine-architecture.md) pipeline maps cleanly onto these libraries: **Planner/Composer** use `theory` + `rng` (+ `pattern`); **Performer** + **Synthesizer** use `transport` + `synth` + `fx`; the **improvement loop** uses `analysis`. An engine is then mostly *style* (data) plus glue, with the hard infrastructure vendored in.
- Start `theory`, `transport`, and `rng` first and share them across all launch engines; let engines add their own style-specific voices on top of `synth` rather than forking it.
- Keep every library dependency-free and (for the pure ones) framework-free, so an engine folder stays a self-contained thing that opens from `file://`.
- Because the libraries are original and public-domain, an engine can be published, copied, and remixed by anyone with zero license bookkeeping — which also serves the project's openness goal.

## Open questions

- **Where does the canonical source live?** A dev-time `lib/` at the repo root, a `docs/lib/` promoted at Phase 2, or authored inside the first engine and extracted once a second engine needs it? Decide at first engine build; leaning toward extract-on-second-use to avoid speculative abstraction.
- **Granularity.** One "std" library or several small modules? Leaning several small, hand-tree-shakeable modules so an engine vendors only what it uses.
- **Shared vs specialized.** How much synthesis is genuinely shareable when a lo-fi engine and a classical engine want very different timbres? Working answer: shared primitives (`synth`'s voice factories, envelopes) with engine-specific presets and voices layered on top.
- **Oracle practice.** Formalize keeping Tonal (and similar) as dev-only test oracles — recorded here so a future session does not mistake an oracle for a shipped dependency.

## Related pages

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
