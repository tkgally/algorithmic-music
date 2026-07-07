---
title: Design patterns for generative music
tags: [algorithms, project]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: A catalog of architectural and compositional patterns for building generative engines — the constructive counterpart to the failure-mode taxonomy.
---

# Design patterns for generative music

Where [generative-music-failure-modes](generative-music-failure-modes.md) says what goes wrong, this page says what to build. Each pattern names an intent, sketches the mechanism, points to prior art, and warns about pitfalls. Patterns compose: a serious engine will use most of them. They are hypotheses until experiments confirm them — as engines get built and evaluated, each pattern should accumulate links to findings that support, refine, or refute it.

## Structural patterns

### P1. Plan-then-realize (top-down skeleton)
**Intent.** Defeat aimlessness by making global decisions before local ones.
**Mechanism.** Generate in passes: (1) form plan — sections, proportions, key plan, tension targets; (2) phrase plan per section — phrase lengths, cadence types, question/answer roles; (3) harmonic skeleton honoring the cadential goals; (4) melodic/rhythmic surface elaborating the skeleton; (5) performance rendering. Each pass constrains the next; later passes never contradict earlier ones.
**Prior art.** Schenkerian elaboration; GTTM reductions run generatively ([grammars-and-rewriting-systems](grammars-and-rewriting-systems.md)); classical sketch-then-compose practice ([composition-craft](composition-craft.md)).
**Pitfalls.** Over-rigid plans sound schematic; allow surface events to occasionally push back (a planned cadence delayed a bar is often better than one delivered on schedule — see [musical-expectation](musical-expectation.md)).

### P2. Tension curve as specification
**Intent.** Give the piece a reason to move — form as narrative, not LFO.
**Mechanism.** The form plan includes an explicit target tension curve (e.g., control points over time). Realization maps tension to correlated parameters: dissonance, register, density, dynamics, harmonic distance, rhythmic instability ([tension-and-release](tension-and-release.md)). A self-check pass extracts the achieved curve from the generated score and compares it to the target ([computational-music-metrics](computational-music-metrics.md)).
**Pitfalls.** Mapping tension to *one* parameter (just louder = crescendo wallpaper); ignoring release (relaxation needs as much design as buildup).

### P3. Theme bank with a development budget
**Intent.** Give listeners something to remember and the piece something to be about.
**Mechanism.** Compose 1–3 themes *as designed objects* (constrained contour, distinctive rhythm, singable range — [melody](melody.md)), store them symbolically, and schedule their lifecycle in the form plan: exposition (literal), restatements (recognizable variation), development (fragmentation, sequence, reharmonization), return (near-literal, marked as an arrival). Ration novelty: most bars derive from the bank.
**Prior art.** Motivic development and developing variation ([composition-craft](composition-craft.md)); leitmotif practice ([film-and-game-music](film-and-game-music.md)).
**Pitfalls.** Varying identity away (keep an invariant core — usually rhythm + contour); restating so literally it bores ([repetition-and-familiarity](repetition-and-familiarity.md) for the tolerances).

### P4. Style pack as data
**Intent.** Escape the style vacuum; make idioms swappable and auditable.
**Mechanism.** Encode each style as a declarative bundle: scale/tuning systems, chord vocabulary and progression grammar, rhythm feels and timelines, form archetypes, instrumentation/timbre palette, performance rules, mix targets. The engine core is style-agnostic; a style pack instantiates it ([style-and-genre-overview](style-and-genre-overview.md) and genre pages supply the contents).
**Pitfalls.** Averaging styles into mush; packs that only change surface (timbre) without changing syntax (harmony/rhythm grammar).

### P5. Ensemble roles with contracts
**Intent.** Textural clarity; voices that read as instruments with jobs.
**Mechanism.** Each voice gets a role contract: register window, function (bass foundation / harmonic bed / lead / counterline / ornament / percussion), density ceiling, and segregation guarantees against other roles (onset timing, timbre brightness, register — [auditory-perception-basics](auditory-perception-basics.md)). A texture planner turns roles on/off across the form (solo/tutti thinking).
**Prior art.** Orchestration practice ([timbre-and-orchestration](timbre-and-orchestration.md)); big-band/EDM arranging; the previous experiments' pad/lead/bass/perc split (kept, but now with contracts).

## Generation patterns

### P6. Constrained randomness (generate-and-test)
**Intent.** Keep stochastic variety without arbitrary results.
**Mechanism.** Sample candidates from weighted distributions, then filter/repair against hard constraints (voice-leading rules, range, cadence targets, style grammar). Reject-and-resample or local-repair; log rejection rates (a high rate means the distributions and constraints disagree — fix the distributions).
**Prior art.** Illiac Suite's generate-and-test; CHORAL's rule filters; Markov constraints ([constraint-and-rule-based-methods](constraint-and-rule-based-methods.md), [markov-and-statistical-models](markov-and-statistical-models.md)).

### P7. Critics before the speaker (self-evaluation gate)
**Intent.** Never play the engine's first draft.
**Mechanism.** Because generation is symbolic and fast, generate N candidate phrases/sections, score them with cheap critics (cadence presence, contour quality, motif adherence, tension-curve fit, voice-leading smoothness), and keep the best. Critics are the same functions used in offline evaluation ([computational-music-metrics](computational-music-metrics.md)), so improving one improves both.
**Pitfalls.** Goodhart: critics are diagnostics, not objectives; cap their authority (top-of-N selection, not gradient-following into weirdness).

### P8. Layered clocks and processes
**Intent.** Cheap, legible evolution over long durations.
**Mechanism.** Independent slow processes (incommensurate loop lengths, phase patterns, gradual mutations) layered over a stable core. This is the ambient/minimalist engine room — Eno's loops, Reich's phasing, In C's module ladder ([ambient-and-generative-genre](ambient-and-generative-genre.md), [minimalism-and-process-music](minimalism-and-process-music.md)).
**Pitfalls.** Works for texture-forward music; does not by itself produce discourse (combine with P1–P3 for foreground listening).

### P9. Adaptive state machine (interactive form)
**Intent.** Music that responds to user controls or session context without lurching.
**Mechanism.** Treat user macro-controls as state variables; implement transitions as musical events (vertical layer adds/removes, horizontal resequencing at phrase boundaries, pivot bars for key/mode changes) rather than parameter jumps ([film-and-game-music](film-and-game-music.md) for the pattern vocabulary).
**Prior art.** Game-audio middleware; the previous experiments' Presence macro and pivot-breath modulation.

## Performance and sound patterns

### P10. Separate performer layer
**Intent.** Kill "MIDI-sounding" output without touching the composer.
**Mechanism.** Composition emits a symbolic score (beats, not seconds). A performer pass applies expressive rules — phrase-arch tempo and dynamics, accent hierarchy, articulation, micro-timing by rule not noise, final ritardando — producing timed, velocity-shaped events for the synth ([expressive-performance](expressive-performance.md)).
**Pitfalls.** Uniform random jitter is not a performer; rules first, tiny noise last.

### P11. Instruments as designed objects
**Intent.** Timbral presence and voice separation.
**Mechanism.** Each role's instrument is a documented recipe (topology + envelope + register behavior + velocity response — [synthesis-recipes](synthesis-recipes.md)) with attack character deliberately differentiated across roles; the mix bus applies the project's standing gain-staging/loudness discipline ([effects-and-mixing](effects-and-mixing.md)).

## Infrastructure patterns (carried over from previous experiments — solved, keep solved)

### P12. Deterministic seeds, shareable state
Seeded RNG everywhere; full state reproducible from URL; date-based default seeds for a stable "today's piece." Enables A/B comparison, bug reports, and feedback tied to exact pieces ([engine-architecture](engine-architecture.md), [improvement-loop](improvement-loop.md)).

### P13. Lookahead scheduling, hidden-tab safety
The two-clock lookahead pattern with a generous horizon; background-tab throttling handled ([scheduling-and-timing](scheduling-and-timing.md)).

### P14. Headless render for metrics
Every engine renders faster-than-realtime via OfflineAudioContext and exposes its symbolic score, so metrics and regression tests run without ears ([computational-music-metrics](computational-music-metrics.md), [web-audio-fundamentals](web-audio-fundamentals.md)).

## Anti-patterns (do not build)

- **Novelty as product** — see failure mode 10.
- **One giant probability soup** — a single flat generator with 40 interacting weights nobody can tune; prefer explicit passes (P1) and data-encoded style (P4).
- **Humanize = add noise** — see P10.
- **Demo-driven development** — tuning by auditioning openings; see failure mode 12.

## Related pages

- [generative-music-failure-modes](generative-music-failure-modes.md) — what these patterns prevent
- [engine-architecture](engine-architecture.md) — how patterns become modules
- [previous-experiments-lessons](previous-experiments-lessons.md) — which patterns existed already and which were missing

## Sources

- Synthesized from this wiki's theory, psychology, and algorithm pages (each pattern links its evidence); prior art citations live in the linked pages. Patterns P1–P3 and P6–P7 additionally reflect the survey literature in [algorithmic-composition-history](algorithmic-composition-history.md) and the compositional practice literature in [composition-craft](composition-craft.md).
