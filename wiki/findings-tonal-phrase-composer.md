---
title: Findings — tonal-phrase composer (worked R1 + R2)
tags: [findings, algorithms]
status: reviewed
created: 2026-07-08
updated: 2026-07-08
summary: A worked, tested reference composer that assembles the theory + rng foundation libraries into a phrase-first melody over a goal-directed, cadence-first harmonic progression — the concrete resolution of research questions R1 (phrase-first melody) and R2 (goal-directed harmony) as one eight-bar parallel period, with the structural invariants a test suite verifies.
---

# Findings — tonal-phrase composer (worked R1 + R2)

Research questions [R1 (phrase-first melody) and R2 (goal-directed harmony)](project-open-questions.md) each asked for *a worked algorithm*, not just a design sketch: the [failure-mode diagnosis](generative-music-failure-modes.md) of the previous engines is that they generated bar-by-bar with no phrase syntax and wandered harmonically, and the fix is architectural. The [foundation libraries](findings-shared-lib-foundation.md) (`theory`, `rng`, `transport`) gave the primitives — `pistonSuccessors()` + `rng.weighted()` for harmony, `scaleDegree()` + `stability()` for melody — but until now those had not been *assembled* into a generation algorithm. This page records that assembly: `experiments/composers/tonal-phrase.js`, a reference **Composer** (in the [engine-architecture](engine-architecture.md) pipeline sense) that writes one eight-bar **parallel period** — an antecedent that asks and a consequent that answers — deterministically from a seed. Like the other findings pages, every claim here is backed by re-runnable in-repo code (`node experiments/tests/run.js`, now **74 tests**, of which 15 are the composer's structural checks), which is a stronger verification than source-fetching.

It is deliberately *not* a shared foundation library. `theory`/`rng`/`transport`/`synth`/`fx`/`analysis` are reusable primitives; a composer is engine-level policy that *consumes* them. This one is a worked reference the launch engines can adapt, and a concrete exercise of the [Note-event schema](engine-architecture.md) so the next session builds from a validated example rather than an unassembled pile.

## What was built

A pure, deterministic, dual-format (UMD-lite) module exposing `composePeriod({ seed, tonic, mode })`. It runs a minimal slice of the [engine pipeline](engine-architecture.md): a **Planner** (an eight-bar parallel period, two four-bar phrases), a **Composer** proper (harmony then melody, in beats), and it emits [Note events](engine-architecture.md) `{ beat, durBeats, midi, voice, role, tags }` plus a `selfReport` of intent (so [metrics/critics](computational-music-metrics.md) can measure achieved-vs-intended). Tempo is left to a performer — the composer thinks only in beats, per the architecture's first invariant.

A worked C-major example (`seed: "demo-1"`):

```
antecedent  I  iii  IV  V     (half cadence — the question)
consequent  I  iii  V   I     (perfect authentic cadence — the answer)
melody ante  E5 F5 E5 D5 E5 A5 B5 | A5 G5 F5 D5 D5   (arch to apex B5, closes on re)
melody cons  E5 F5 E5 D5 E5 A5 B5 | G5 F5 G5 D5 C5   (basic idea restated, closes on do)
```

## R2: goal-directed harmony as a backward Piston walk

[harmony.md](harmony.md) prescribes "generate backwards from cadences: fix the cadence, fill the approach (pre-dominant slot), then fill the openings from the transition table." The composer does exactly this, and the key finding is that **the pre-dominant-before-dominant behavior falls out of Piston's table for free** when it is walked in reverse:

- Fix the cadence chord: the antecedent ends **on V** (half cadence); the consequent ends **on I** with **V** in the bar before it (authentic cadence). Periods open on **I**.
- Fill the interior backward. To choose the chord before a known chord `next`, build a reverse index of [Piston's "Table of Usual Root Progressions"](harmony.md) and sample a predecessor **in proportion to its forward weight** `P(pred → next)`, using the `0.6/0.3/0.1` tier weights `theory.pistonSuccessors()` already encodes, via `rng.weighted()`.
- Because Piston lists **IV → V** and **ii → V** as the two "usually" motions, walking backward from V surfaces **IV and ii as the most common predecessors** — a pre-dominant lands before the dominant with no special-case rule. A test confirms a pre-dominant (IV or ii) precedes the half cadence's V in the majority of seeds, and that `predecessorOf('V')` yields IV and ii more often than iii.

Minor keys are handled separately and honestly: Piston's table is major-only (whether its strong/weak asymmetry even holds in minor is an [open question in harmony.md](harmony.md)), so rather than misuse it the composer uses a small fixed functional skeleton (`i–iv–ii°–V` / `i–iv–V–i`) and draws the dominant from the **harmonic** minor, so V is a real leading-tone dominant — exercising the "minor-key dominant strength" note from the [foundation findings](findings-shared-lib-foundation.md).

## R1: phrase-first melody, contour-first over fixed goal tones

[melody.md](melody.md) prescribes "generate contour first, pitches second," fixing cadence and goal tones first and elaborating around them. The composer:

1. **Plans the rhythm as a fixed, singable motif** per four-bar phrase (motivic repetition is cheap memorability): a seven-note "basic idea" (beats 0–6) shared by both phrases, then a five-note "continuation" that drives to the cadence, with the final note **lengthened** (half/whole note) and a **breath** (two-beat rest) before the next phrase — the phrase-final lengthening + breath of [phrase-structure.md](phrase-structure.md).
2. **Fixes the goal tones first.** The cadence note is dictated by the cadence: the half cadence closes on **re (2̂)** or **sol (5̂)** (open, questioning); the PAC closes on **do (1̂)** — the most tonally stable pitch class, which a test confirms carries the maximum [Krumhansl–Kessler](tuning-and-scales.md) weight. One **apex** per phrase is pinned high on a chord tone.
3. **Fills the remaining notes** by a constraint-weighted local choice (`rng.weighted` over `exp(score)`), tracking an **arch** contour envelope and applying the [melody.md](melody.md) rules: chord tones on strong beats, a strong step bias, **post-leap reversal** (~0.7), **regression to the mean** at register extremes, "leaps up, steps down" (Vos & Troost), and a **stepwise approach into the cadence** (7̂→1̂ / 2̂→1̂). Non-apex notes are capped below the apex so it stays the phrase's unique peak.
4. **Restates the basic idea** in the consequent (the defining feature of a *parallel* period) — the single strongest audible-structure cue, and free coherence.

## What the tests prove

`node experiments/tests/run.js` (the 15 composer tests): scores are **deterministic** from the seed (same seed → identical Note-event JSON; different seeds differ). Every antecedent reaches **V** and every consequent resolves **V → I**; the consequent restates the antecedent's basic-idea harmony *and* melody. Cadential melody tones are always **re/sol at the HC** and **do at the PAC** (the PAC note verified as the maximum-stability pitch class). All melody notes are **diatonic**; each phrase has **exactly one apex**, tagged and uniquely highest. The interval budget is **step-dominated** (≈71% of motions ≤ 2 semitones, leaps ≥ 5 semitones ≈7%), and **interior leaps reverse ≈68%** of the time — matching von Hippel & Huron's ~72% once the two *deliberate* structural leaps per phrase (the ascent into the apex, the descent into the cadence) are excluded. A quantified side-finding: **the arch contour partly competes with the reversal rule** along its monotonic limbs, so the whole-line reversal rate sits below the free-melody figure — the two melody.md heuristics interact rather than compose independently. Harmony changes only on bar downbeats; the period spans exactly eight bars; the Note events conform to the engine-architecture schema.

The composed period was also **rendered and measured acoustically** through the [OfflineAudioContext harness](findings-shared-lib-foundation.md): it renders clean (no clipping, no silent gap, level in band), confirming the beats→seconds→audio path works end to end.

## Design decisions settled

- **Cadence-first, backward generation is the whole game for direction.** Fixing the goal (cadence chord + melodic goal tone) and generating toward/backward from it is what makes the output sound intentional; it is a small amount of code over the existing `theory` primitives.
- **A reversed transition table needs no hand-written pre-dominant rule.** Sampling predecessors by forward weight reproduces idiomatic pre-dominant→dominant motion directly from Piston's numbers.
- **Contour envelope + a handful of local biases + hard pins** is enough to produce singable, arch-shaped, motivically coherent lines — no grammar or search required at this scale. The pins (start, apex, cadence goal) carry the structure; the biases carry the surface.
- **The parallel-period restatement is the cheapest large-scale coherence available** and should be a default, not an option.
- **Honest scope boundaries:** major mode is the fully Piston-driven demonstration; minor uses a fixed skeleton with a harmonic-minor dominant and is flagged, not dressed up as more general than it is.

## Implications for generative engines

- The launch **tonal-classical phrase engine** ([roadmap](project-roadmap.md)) can start from this composer: extend the Planner from one period to a full form (sentence/period/AABA/verse-chorus — [phrase-structure.md](phrase-structure.md), [form-and-structure.md](form-and-structure.md)), reusing the cadence-first harmony and contour-first melody unchanged.
- **Style becomes data**: swap Piston's table for a corpus-derived one ([corpus-analysis.md](corpus-analysis.md)) or the rock-corpus priors already in `theory` to move the same architecture toward pop; swap the fixed rhythmic motif for a generated one.
- **The Note-event schema held up** exactly as specified — `tags` carrying `cadence:PAC`, `apex`, `function:T` etc. is what lets a critic measure achieved-vs-intended without re-deriving analysis.
- **Thread all randomness through named `rng` streams** (`harmony`, `melody`): a test confirms changing one does not scramble the other, which is what makes A/B iteration on one layer possible.
- The next musical extensions with the highest payoff: **endings** ([R6](project-open-questions.md)), **motivic variation** across repeats (vary, don't just restate — [melody.md](melody.md), [repetition-and-familiarity.md](repetition-and-familiarity.md)), and **cadential harmonic-rhythm acceleration** ([harmony.md](harmony.md)).

## Open questions

- **Minor-key cross-relation.** The melody draws from the natural minor while the V/vii° chords come from harmonic minor, so a melodic G♮ can sound against a chordal G♯ near the cadence. Real minor-key practice mixes scales per-chord (raising 6̂/7̂ in ascending lines); the composer does not yet, so a listening check should confirm whether the cross-relation is audible before this is used in an engine.
- **Cadential approach is a bias, not a guarantee.** The stepwise 7̂→1̂/2̂→1̂ approach is weighted, so a low-probability seed can still leap into the goal tone. Whether that needs hardening (a soft pin on the penultimate note) is a taste question for listening tests.
- **Corpus calibration.** The Piston `0.6/0.3/0.1` tier weights and the melodic scoring constants are informed defaults, not fit to data; [corpus-analysis](corpus-analysis.md) should tune them per style.
- **One period is not a piece.** This proves the phrase unit; whole-piece form, thematic lifecycle across sections, and dynamic/textural arc remain to be built on top.

## Related pages

- [project-open-questions](project-open-questions.md) — R1 and R2, which this resolves
- [melody](melody.md) — the contour/step/leap/apex rules the melody generator implements
- [harmony](harmony.md) — the Piston table, cadences, and "generate backwards" prescription
- [phrase-structure](phrase-structure.md) — the parallel period, cadence targets, breath, hypermeter
- [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the `theory`/`rng` primitives this assembles, and the render harness that measured its output
- [engine-architecture](engine-architecture.md) — the pipeline stage and Note-event schema it exercises
- [generative-music-failure-modes](generative-music-failure-modes.md) — the aimlessness/wandering this is built to avoid
- [tuning-and-scales](tuning-and-scales.md) — the Krumhansl–Kessler stability weights the goal tones use

## Sources

- Reproducible in-repo (original, public-domain CC0): `experiments/composers/tonal-phrase.js`, `experiments/tests/composer.test.js` (run `node experiments/tests/run.js`), `experiments/demos/offline-render.html` (renders the composed period). All claims above re-run from these.
- Music-theoretic content is the operationalization of already-cited wiki pages: Piston's root-progression table and the functional/cadence syntax from [harmony](harmony.md); the arch/step-bias/post-leap-reversal/apex statistics (Huron; von Hippel & Huron 2000; Vos & Troost 1989) from [melody](melody.md); the sentence/period archetypes (Schoenberg/Caplin; Rothstein) and cadence-as-goal-tone targets from [phrase-structure](phrase-structure.md); the Krumhansl & Kessler (1982) tonal-hierarchy weights from [tuning-and-scales](tuning-and-scales.md). No new external sources were fetched; this page assembles existing, verified wiki knowledge into an algorithm and reports what the code does.
