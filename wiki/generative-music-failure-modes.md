---
title: Failure modes of generative music
tags: [algorithms, evaluation, project]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: A diagnostic taxonomy of the ways algorithmically generated music goes wrong, with causes and pointers to remedies — the checklist every engine is tested against.
---

# Failure modes of generative music

Generated music rarely fails by sounding *wrong*; it fails by sounding *pointless*. Local rules keep the surface plausible while nothing gives the whole a reason to be heard. This page catalogs the recurring failure modes — drawn from this project's [previous experiments](previous-experiments-lessons.md), from decades of critique of algorithmic composition, and from listener discourse about AI and generative music. Each entry has a symptom (what a listener reports), a diagnosis (what the engine is doing), and remedies (where in this wiki the fix lives). Treat it as a pre-flight checklist: a new engine should be interrogated against every item, and [listening tests](listening-tests-and-feedback.md) should probe for each symptom explicitly.

## 1. Aimless noodling

**Symptom.** "It wanders." Notes follow notes; nothing begins, arrives, or ends. A listener cannot hum back anything, and stopping playback mid-stream loses nothing.
**Diagnosis.** Melody generated as a per-note random walk (however cleverly weighted) with no phrase plan: no goal tones, no cadences, no question–answer pairing, no breathing. Locally smooth ≠ globally directed.
**Remedies.** Generate phrase-first, note-second: choose phrase shape, goal, and cadence before filling in notes ([phrase-structure](phrase-structure.md)); use skeleton-and-elaboration architectures ([grammars-and-rewriting-systems](grammars-and-rewriting-systems.md)); enforce cadence formulas ([harmony](harmony.md)); test with a cadence detector ([computational-music-metrics](computational-music-metrics.md)).

## 2. Harmony without goals

**Symptom.** Chords are individually fine but the progression feels like a screensaver — motion without departure or return.
**Diagnosis.** First-order chord transitions: each chord chosen only from the previous one. No dominant preparation, no phrase-position awareness, no harmonic rhythm plan, no relationship between harmony and form.
**Remedies.** Plan harmony backward from cadential goals; make harmonic rhythm a function of phrase position; use progression grammars or constraint solving rather than chains ([harmony](harmony.md), [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md), [markov-and-statistical-models](markov-and-statistical-models.md)).

## 3. Nothing to remember

**Symptom.** After ten minutes, the listener cannot say what the piece was "about." No moment of recognition ever arrives.
**Diagnosis.** Material is never designed for memorability, is not restated recognizably, or is varied until identity dissolves. The engine forfeits the repetition–familiarity machinery that drives musical liking ([repetition-and-familiarity](repetition-and-familiarity.md)).
**Remedies.** Design themes deliberately (constrained contour, distinctive rhythm — [melody](melody.md)); schedule literal and varied returns as part of form ([form-and-structure](form-and-structure.md)); track motif recurrence as a metric ([computational-music-metrics](computational-music-metrics.md)).

## 4. Form as wallpaper

**Symptom.** The piece has sections in the code, but the listener hears an endless middle. No trajectory, no climax, no ending — many engines literally cannot end a piece.
**Diagnosis.** "Form" implemented as a slow LFO on density/energy, or as section labels that change generation parameters without changing *material*. Nothing accumulates; nothing is at stake.
**Remedies.** Compose a tension curve as a first-class plan and realize it across parameters ([tension-and-release](tension-and-release.md)); use form archetypes with return and recapitulation ([form-and-structure](form-and-structure.md)); give pieces real endings (cadential, dissolving, or jo-ha-kyū-style acceleration — [east-asian-traditions](east-asian-traditions.md)); audition at full length, never 30 seconds ([evaluation-challenges](evaluation-challenges.md)).

## 5. Mechanical performance

**Symptom.** "MIDI-sounding." Even with good notes, it sounds typed, not played — or, with random jitter added, drunk rather than human.
**Diagnosis.** Quantized timing, flat or randomly jittered velocities, uniform articulation. Real expression is structured deviation — phrase-shaped tempo arcs, accent hierarchies, final ritardandi — not noise.
**Remedies.** Add a performer layer that applies expressive rules to the symbolic score before synthesis ([expressive-performance](expressive-performance.md)); separate composition from performance in the architecture ([engine-architecture](engine-architecture.md)).

## 6. Random ≠ interesting

**Symptom.** "Sounds arbitrary." Surprises occur but carry no meaning; the listener stops forming expectations because expectations never pay off.
**Diagnosis.** Uniform or unmotivated randomness; the mapping problem (stochastic source mapped to musical parameters with no musical constraint); surprise deployed without setup.
**Remedies.** Constrain randomness with musical filters ([stochastic-chaos-and-automata](stochastic-chaos-and-automata.md), [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md)); spend unpredictability where expectation has been built ([musical-expectation](musical-expectation.md)); target intermediate complexity ([complexity-and-preference](complexity-and-preference.md)).

## 7. Uniform density

**Symptom.** Fatiguing despite being pleasant: every bar has the same amount of stuff. No silence, no thinning, no registral air.
**Diagnosis.** All voices active by default; rest probabilities constant; no textural planning; climax and repose have the same event density.
**Remedies.** Texture as a composed dimension — plan density curves, solo/tutti alternation, registral spacing ([timbre-and-orchestration](timbre-and-orchestration.md), [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md)); treat silence as material ([east-asian-traditions](east-asian-traditions.md) on *ma*); meter the onset rate ([computational-music-metrics](computational-music-metrics.md)).

## 8. Timbral poverty

**Symptom.** "Sounds like a demo." Lines blur together; nothing has the presence of an instrument.
**Diagnosis.** Default oscillator patches; identical attack character across voices (so streams fuse — [auditory-perception-basics](auditory-perception-basics.md)); no registral orchestration; no interaction between timbre and musical function.
**Remedies.** Design instruments with attention to attack transients and spectral evolution ([synthesis-recipes](synthesis-recipes.md)); differentiate voices by onset, brightness, and register so they segregate ([timbre-and-orchestration](timbre-and-orchestration.md)).

## 9. Mix mud and mastering neglect

**Symptom.** Harsh or muddy sound, inconsistent loudness between engines/presets, thin sound at low volume.
**Diagnosis.** No gain staging, no frequency carving, no equal-loudness compensation for quiet playback, clipping or over-limiting.
**Remedies.** [effects-and-mixing](effects-and-mixing.md) — highpass discipline, glue compression, loudness targets, level-matched presets (a solved problem in the previous experiments; keep it solved).

## 10. Endless novelty (the generative trap)

**Symptom.** Technically never repeats, musically never matters. Infinite variation defeats familiarity, so nothing can be liked *more* on the tenth hearing.
**Diagnosis.** Novelty treated as the product ("it's always different!") instead of a means. Human music is overwhelmingly repetitive at every timescale ([repetition-and-familiarity](repetition-and-familiarity.md), [musical-universals](musical-universals.md)).
**Remedies.** Repetition budgets: most material repeats, variation is rationed and placed ([minimalism-and-process-music](minimalism-and-process-music.md) shows how far pure repetition-with-process can go); stable daily seeds (previous experiments' date-seed idea) so a listener can re-hear "today's piece."

## 11. Style vacuum

**Symptom.** "Generic." The music belongs to no tradition, so no schematic expectations apply and nothing sounds idiomatic; it reads as placeholder music.
**Diagnosis.** Engine parameters span a style-less average: scales and chords from everywhere, rhythm from nowhere, instrumentation from a synth default palette.
**Remedies.** Commit each engine (or mode) to a specific style as a constraint system ([style-and-genre-overview](style-and-genre-overview.md) and the genre pages); encode idiom in data (voicings, feels, forms per style); verify style-fit in listening tests.

## 12. The 30-second demo illusion

**Symptom.** Sounds impressive briefly; nobody voluntarily listens long. (This is a failure of the *evaluation*, which then hides all the above.)
**Diagnosis.** Builders audition openings, tweak, repeat — selecting for good starts and against long-range qualities. Metrics measure spectra, not discourse.
**Remedies.** Evaluate at 5–15+ minutes; measure desire-to-continue; include symbolic long-range metrics; collect longitudinal feedback ([evaluation-challenges](evaluation-challenges.md), [listening-tests-and-feedback](listening-tests-and-feedback.md), [improvement-loop](improvement-loop.md)).

## Using this page

- **At design time**: for each failure mode, a new engine's design doc should say what mechanism prevents it. "Nothing" is an acceptable answer only with a reason.
- **At review time**: self-critique and listening tests tag observations with failure-mode numbers (e.g., "FM3: no recognizable return at 6′"), giving feedback a shared vocabulary.
- **Over time**: as experiments accumulate, add newly discovered failure modes and link the [findings](improvement-loop.md) that revealed them. This page should grow.

## Related pages

- [previous-experiments-lessons](previous-experiments-lessons.md) — where these diagnoses were first made concrete
- [generative-music-design-patterns](generative-music-design-patterns.md) — the constructive counterpart
- [evaluation-challenges](evaluation-challenges.md) · [computational-music-metrics](computational-music-metrics.md) · [listening-tests-and-feedback](listening-tests-and-feedback.md)

## Sources

- Direct analysis of `previous-experiments/` (2026-07-06), especially `20260705_studio-prototypes/`.
- The failure vocabulary echoes long-running critiques of algorithmic composition (surface plausibility without long-range structure; randomness-as-content) discussed in the survey literature cited in [algorithmic-composition-history](algorithmic-composition-history.md) and [markov-and-statistical-models](markov-and-statistical-models.md), and listener critiques collected in [what-makes-music-good](what-makes-music-good.md).
