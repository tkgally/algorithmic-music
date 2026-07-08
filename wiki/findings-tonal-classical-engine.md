---
title: Findings — the tonal-classical engine (launch engine, Phase 2)
tags: [findings, implementation, project]
status: reviewed
created: 2026-07-08
updated: 2026-07-08
summary: The project's first public engine — how the single parallel period grew into a whole finishable piece (rounded ternary with intro, motivic variation on the return, and a cadential coda), how the audible synth/fx layer was built from stock Web Audio nodes and validated by offline render, and the deployment/vendoring model for docs/.
---

# Findings — the tonal-classical engine (launch engine, Phase 2)

Tom opened **Phase 2** (2026-07-08) by asking for the launch engine: extend the [worked composer](findings-tonal-phrase-composer.md) "from one period to a whole piece (add endings, motivic variation, a full form) and build the audible synth/fx layer," then ship it under `docs/`. This page records what was built and what the validation shows. Like the other findings pages, every structural claim is backed by re-runnable in-repo code — `node experiments/tests/run.js` (**88 tests**, of which 8 are whole-piece composer checks and 6 are performer checks) and `node experiments/tools/render-engine.mjs` (the offline audio gate) — which is a stronger check than source-fetching.

The engine is **`tonal-classical@0.1.0`**, live at `docs/engines/01-tonal-classical/`. The hub `docs/index.html` catalogs it as **Engine 01** and holds a slot for future numbered engines.

## From one period to a whole piece

The [previous experiments](previous-experiments-lessons.md) could not *finish* a piece and drifted between disconnected sections or endless repetition ([failure modes](generative-music-failure-modes.md)). The composer extension (`composePiece()` in `experiments/composers/tonal-phrase.js`, added alongside the untouched `composePeriod()`) answers those three gaps directly, following [form-and-structure](form-and-structure.md)'s highest-leverage rule — **repetition-with-return**:

- **Form: intro + rounded ternary (A B A′) + coda**, ~30 bars. A is the [parallel period](phrase-structure.md) from the earlier finding (antecedent asks with a half cadence, consequent answers with a PAC). **A′ is a literal-enough return** — [form-and-structure](form-and-structure.md) is emphatic that listeners track *themes, not keys*, so A′ restates A's exact harmony and on-beat melodic skeleton. A short intro establishes the key; the coda ends it.
- **Contrast on audible axes, not key alone.** B drops to a lower register (a `centerOffset` on the melodic pins), opens **off the tonic** (on vi/iv), uses fresh melodic material, and ends **on the dominant** (a half cadence) to re-approach the return — the rounded-form "re-approach." This is the deliberate *departure* that makes the return feel like homecoming.
- **A late climax, not a hard-coded ratio.** The performer gives each section an intensity; the peak is A′ (the varied return), in the second half. [form-and-structure](form-and-structure.md) warns against hard-coding the golden section, so the climax is *placed late by construction* rather than at 0.618.

## Motivic variation on the return

A pure restatement would be monotony; a fresh theme would be a medley. [form-and-structure](form-and-structure.md) calls for **development** — vary shared material so contrast and coherence coexist. A′'s basic idea is **ornamented**: one or two interior quarter notes are split into eighth-note pairs with an inserted passing/neighbor scale tone that steps toward the next note (rhythmic **diminution** — [melody](melody.md)). The **on-beat pitches are untouched**, so the return is recognizable ([repetition-and-familiarity](repetition-and-familiarity.md)); only the surface is more florid. The ornament never touches the apex or the note before it, so the apex stays the phrase's unique peak. A test confirms A′'s on-beat skeleton equals A's while its note count is higher in ~19/20 seeds.

## Endings — the R6 gap, closed

[R6](project-open-questions.md) asked how engines *finish*. The coda is a real close, not a fade:

- **Harmonic-rhythm acceleration.** The coda runs whole-bar I then IV (broadening), then **accelerates** to a mid-bar **ii–V** (two chords in one bar — the only place in the piece harmony changes off the downbeat, which a test asserts), resolving to a **lengthened final tonic** held a whole bar. This is the cadential acceleration flagged as a next step in the [period finding](findings-tonal-phrase-composer.md).
- **A melodic cadential descent** (3̂–2̂–1̂ in the upper octave) lands on **do** as the longest note of the piece, tagged `ending`/`cadence:PAC`. A head-motif recall opens the coda so it develops rather than merely stops.
- **A closing ritardando.** The performer stretches the final two bars (beat→seconds map ramps ~30% slower), the standard "we are ending" cue from [expressive-performance](expressive-performance.md).

A test verifies across major and minor that the final note is the tonic, is the longest melody note, and carries the ending tags.

## The audible layer: synth and fx (shared-library build-order item 2)

The [shared-libraries](shared-libraries.md) plan's "audible layer" is now built as two first-party, dual-format libraries, implementing the cited topologies from [synthesis-recipes](synthesis-recipes.md) and [effects-and-mixing](effects-and-mixing.md) from **stock Web Audio nodes, no samples**:

- **`experiments/lib/synth.js`** — three voices, each a fire-and-forget factory that ramps its output gain from ~0 (the [anti-click discipline](web-audio-fundamentals.md)) and disconnects `onended`: an **FM electric-piano lead** (2-operator, ratio 1:1, index decaying so brightness fades faster than amplitude — Chowning; velocity→index), a **detuned-triangle string/pad** (ensemble width from detuning, a dark drifting lowpass so it isn't static), and a **sine+triangle bass** (mono, filtered). Triangles rather than saws keep the bed soft and warm for a background classical piece.
- **`experiments/lib/fx.js`** — the shared master chain: per-voice buses (non-bass **high-passed**, lows kept **mono and dry**), one **synthesized-IR convolution reverb** (decaying, channel-decorrelated noise darkening along the tail — deterministic from the seed, no sample files), and a master path of gentle saturation → glue compressor → **safety limiter** → trim, with the standing loudness discipline (the default undershoots to ~−12 dBFS RMS for comfortable listening).

## What the validation shows

- **Composer + performer** (`node experiments/tests/run.js`, +14 new tests): the piece is deterministic; the form is intro/A/B/A′/coda over exactly 30 bars; A′ restates A's harmony and on-beat basic idea *and* is ornamented; B opens off-tonic and ends on V; the coda accelerates the harmonic rhythm and lands a lengthened tonic; every melody note is diatonic; the climax is A′ in the second half; the performer emits one time-ordered event per note with velocities in (0,1], and the closing ritardando measurably stretches the final beats; a higher tempo yields a shorter piece.
- **The audible layer** (`node experiments/tools/render-engine.mjs`, 16/16 gates): the engine's own `synth`/`fx` render a full ~70–90 s piece across three seeds/modes to **no clipping** (peak ≈ 0.78), **no gross discontinuity** (`maxStep` ≈ 0.12–0.25), **no silent gap**, and a **background-quiet level** (≈ −11 to −12 dBFS RMS), with no console errors. The offline render uses the exact shipped code via a dev-only `_selftest.html`.
  - *Honest note on the click metric:* `maxStep` here is a gross-discontinuity **regression** bound, not an absolute click test. Envelope click-safety is guaranteed by construction (every voice ramps from ~0) and is separately *proven* by `render-measure.mjs`, whose discriminating blip test scores a click-safe attack at ~0.02 and a deliberate hard-gate at ~0.50. A full FM-lead + ensemble + reverb mix legitimately steps far more than a lone sine blip, so the engine gate is set to catch a new gross discontinuity (< 0.4, well below the ~0.78 peak) rather than to re-assert the by-construction guarantee.

## Deployment and the vendoring model (validated in practice)

The [engine-architecture](engine-architecture.md) deployment layout held up as specified. `docs/index.html` is the hub; `docs/engines/01-tonal-classical/` is the self-contained engine. The engine **vendors** (copies in) the shared libraries and the composer — `lib/{rng,transport,theory,synth,fx}.js`, `composer.js`, `engine.js` — maintained canonically in `experiments/` and copied here, so the folder is independently downloadable and `file://`-runnable with **no runtime coupling** to the rest of the repo. Numbering the folder (`01-…`) and the hub card ("Engine 01") makes engines easy to reference as the catalog grows.

The engine page realizes the architecture's UI conventions: two-level controls (a simple panel plus an Advanced disclosure), an **editable seed**, **full state serialized into the URL hash** (a shared link reproduces the exact piece), a **self-report** table of what each section is doing, a piano-roll **visualization** with a moving playhead, and a **feedback affordance** that saves a JSON file locally (the decided no-server feedback transport — [listening-tests-and-feedback](listening-tests-and-feedback.md)). Audio starts only on the user's Play gesture.

## Design decisions settled

- **The return restates harmony *and* the on-beat melody; variation is ornamentation + dynamics.** This keeps A′ unmistakably "the same theme" while still developing it — the split that [form-and-structure](form-and-structure.md) says listeners actually track.
- **Contrast lives in register + harmonic opening + cadence, not key change.** A simple home-key frame is enough; B never modulates, it just opens off-tonic and hangs on the dominant.
- **A finite piece that stops is a feature, not a limitation.** The engine's reason for existing is that it *ends*; a "keep playing" toggle chains new seeds for those who want continuous background sound.
- **A soft, dark palette beats a bright one for background classical.** Moderate FM index and triangle-based ensemble/bass read as warm and unobtrusive, and render cleaner.
- **Validate the shipped artifact, not a copy.** The offline render harness drives the engine's own vendored files, so what is measured is what ships.

## Open questions and next increments

- **Voice-leading.** Chords are close-position triads with an octave-down bass; smooth inter-chord voice-leading ([counterpoint-and-voice-leading](counterpoint-and-voice-leading.md)) is the highest-value musical upgrade.
- **Minor-key cross-relation** (carried over from the [period finding](findings-tonal-phrase-composer.md)): natural-minor melody against a harmonic-minor V — a listening-check item, now audible in a real render.
- **B could be more than contrast** — a brief tonicization of the dominant or relative would deepen the middle without a perceptible long-range key scheme (which [form-and-structure](form-and-structure.md) says listeners barely track anyway).
- **Expressive magnitudes (R3).** The performer applies section dynamics, metric accent, humanization, and a final ritard; validating the [KTH magnitudes](expressive-performance.md) on these synthesized timbres against listener judgments is now possible with a shipping engine and the render harness.
- **Style as data.** Swapping Piston's table and the fixed rhythmic motifs for corpus-derived ones ([corpus-analysis](corpus-analysis.md)) would move the same architecture toward other idioms — the path to Engine 02+.

## Related pages

- [findings-tonal-phrase-composer](findings-tonal-phrase-composer.md) — the single parallel period this extends; the harmony/melody algorithm reused unchanged
- [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the `rng`/`transport`/`theory`/`analysis` primitives and the render harness this builds on
- [engine-architecture](engine-architecture.md) — the pipeline, schemas, UI conventions, and deployment layout this realizes
- [form-and-structure](form-and-structure.md) — rounded ternary, repetition-with-return, contrast axes, late climax
- [synthesis-recipes](synthesis-recipes.md), [effects-and-mixing](effects-and-mixing.md) — the synth voices and master chain `synth`/`fx` implement
- [shared-libraries](shared-libraries.md) — the build plan whose "audible layer" (item 2) this completes
- [project-open-questions](project-open-questions.md) — R6 (endings), R3 (expressive magnitudes)
- [project-roadmap](project-roadmap.md) — Phase 2, now started

## Sources

- Reproducible in-repo (original, public-domain CC0): `experiments/composers/tonal-phrase.js` (`composePiece`), `experiments/engines/tonal-classical/engine.js`, `experiments/lib/synth.js`, `experiments/lib/fx.js`, `experiments/tests/composer.test.js` + `experiments/tests/engine.test.js` (run `node experiments/tests/run.js`), `experiments/tools/render-engine.mjs`, and the shipped `docs/engines/01-tonal-classical/`. All claims above re-run from these.
- Music-theoretic and audio content operationalizes already-cited wiki pages: rounded-ternary form, repetition-with-return, contrast axes, and late-climax placement from [form-and-structure](form-and-structure.md); cadences, period structure, and the coda's cadential accents from [phrase-structure](phrase-structure.md)/[harmony](harmony.md); ornamentation/diminution and the melodic rules from [melody](melody.md); FM and detuned-ensemble synthesis from [synthesis-recipes](synthesis-recipes.md); the reverb IR, bus/highpass/mono-lows discipline, master chain, and loudness targets from [effects-and-mixing](effects-and-mixing.md); the closing ritardando from [expressive-performance](expressive-performance.md). No new external sources were fetched.
