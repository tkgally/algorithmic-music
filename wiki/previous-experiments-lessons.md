---
title: Lessons from the previous experiments
tags: [project, findings]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Analysis of the six 2025–2026 experiments in previous-experiments/ — what they already solved, and a diagnosis of why their music still falls short.
---

# Lessons from the previous experiments

`previous-experiments/` contains six generations of browser music engines vibe-coded between July 2025 and July 2026. Per project rules they are **immutable reference material**: nothing in them may be modified, and their code must not be reused directly in new work. But they are the best available evidence about what the naive approach achieves and where it stops, so this page records what they do, what they got right, and a diagnosis of the gap the whole project exists to close. Claims here come from reading the code and internal documentation; once engines can be rendered and measured, these diagnoses should be re-verified by ear and by metric.

## Inventory

| Folder | Date | What it is |
|---|---|---|
| `20250701_synthesizer-gemini2` | 2025-07 | First generative polyphonic synth (Gemini-built): voices with call-and-response, metaphorical controls (Conversation Density, Harmonic Magnetism, …) |
| `20250917_rhythmdrone` | 2025-09 | Rhythm-plus-drone engine (~1,500 lines) |
| `20260610_fable-synthesizer` | 2026-06 | Larger single-engine synth (~1,900 lines of JS) |
| `20260701_Fable_synthesizer_2_with_prompt_by_Fable` | 2026-07 | Single-file engine built from a carefully engineered prompt (the prompt, included, is itself a design document: voice interaction, imitation, harmonic negotiation, metaphorical macro controls) |
| `20260701_Fable_synthesizer_3_with_direct_metaprompt` | 2026-07 | Same idea, prompt produced by metaprompting |
| `20260705_studio-prototypes` | 2026-07 | Five focused prototypes (Tides, Drift, Pulse, Dust, Deep Work) targeting background music for knowledge workers, adapted from a sibling project ("Daysong"); includes a research-grounded README and a headless acoustic-verification tool |

## Techniques the previous work already has

The naive phase was not naive about implementation. Already solved, and worth keeping as *concepts* (re-implemented, not copied):

- **Scheduling**: lookahead scheduling against the Web Audio clock with a 6–12 s horizon, hidden-tab safety (Chrome throttles timers in hidden tabs; audible tabs are exempted from the harshest throttling).
- **Determinism**: seeded RNG (mulberry32) everywhere; full state in the URL hash; date-based default seeds so every visitor hears the same piece on the same day.
- **Harmony machinery**: diatonic modes, hand-tuned first-order degree-transition weights, sevenths, modal borrowing, secondary dominants, fifth-down/relative modulations with pad-only "pivot breath" bars.
- **Voice-leading**: nearest-tone pad voicings that move minimally between chords.
- **Melody machinery**: weighted random walk with interval-size penalties, chord-tone weighting on strong beats, register windows, post-leap direction reversal, repeat penalties, chromatic approach tones.
- **Motifs**: per-theme motif capture with development operations (exact, transpose, embellish, invert, retrograde).
- **Rhythm**: meter grids with accent-strength arrays, recursive subdivision for rhythm generation, swing, rest probabilities.
- **Structure**: section types (flow/thin/swell) of 6–16 bars, a movement counter, energy as a slow sinusoid plus drift.
- **Sound**: FM keys, detuned-saw drones in just intonation, filtered pads, synthesized drums, lo-fi treatments (wow/flutter, vinyl crackle), macro controls driving ~10 parameters at once.
- **Evaluation seed**: `studio-prototypes/tools/verify.mjs` renders a prototype headlessly and reports RMS, level spread, spectral centroid, high-frequency energy, onset rates — the germ of the project's [computational-music-metrics](computational-music-metrics.md).

## Diagnosis: why the music still isn't satisfying

The engines produce competent *texture* and fail at *music as discourse*. Specific gaps, ordered roughly by importance:

1. **No phrase syntax.** Melody is generated bar-by-bar by a random walk. Phrases never begin with intent, breathe, or close; there are no cadences, no antecedent–consequent pairing, no upbeats, no phrase-final lengthening. This is the single largest gap. See [phrase-structure](phrase-structure.md).
2. **Harmony without goals.** First-order chord transitions produce locally plausible, globally directionless progressions. Chord choice never knows where the phrase is going, so nothing prepares a cadence; harmonic rhythm is disconnected from phrase position. See [harmony](harmony.md), [markov-and-statistical-models](markov-and-statistical-models.md).
3. **Weak thematic identity.** One motif per section-letter, captured from whatever the walk first produced, then blurred by generic operations. Nothing is designed to be memorable; nothing returns often enough (or literally enough) to be recognized. The repetition–familiarity machinery of musical pleasure is forfeited. See [repetition-and-familiarity](repetition-and-familiarity.md).
4. **Form as LFO, not narrative.** Energy follows a 48-bar sinusoid; sections are labeled but barely differentiated. There is no build toward anything, no structural climax, no return-with-recognition, no ending. See [form-and-structure](form-and-structure.md), [tension-and-release](tension-and-release.md).
5. **Mechanical performance.** "Humanization" is uniform random jitter on timing and velocity. Real performance expression is *rule-shaped* — phrase-final ritardando, accent hierarchy, dynamic arcs spanning phrases — not noise. See [expressive-performance](expressive-performance.md).
6. **Counterpoint in name only.** The counter-voice prefers contrary motion and sings in melody gaps (good instincts), but nothing prevents parallels, voice collisions, or mud; dissonance is never treated (prepared/resolved), just avoided. See [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md).
7. **Timbral sameness.** A handful of synth patches, similar attack character across voices, little registral orchestration; ensembles do not read as instruments with roles. See [timbre-and-orchestration](timbre-and-orchestration.md), [synthesis-recipes](synthesis-recipes.md).
8. **Optimized for inoffensiveness.** The 2026-07 prototypes deliberately target background listening (velocities compressed to 0.30–0.55, melody ceilings, no climaxes). That is a legitimate use case, but it must not define the project's ceiling: the same architecture cannot currently produce foreground music worth attending to.
9. **Evaluation was acoustic, not musical.** verify.mjs measures loudness, spectrum, onsets — it cannot see aimless phrases or absent cadences. Symbolic (note-level) metrics are missing entirely. See [computational-music-metrics](computational-music-metrics.md).

## Meta-lessons about process

- **Better prompts were not enough.** The three prompt generations (2025-07 → 2026-07) grew increasingly sophisticated — the final ones explicitly demand voice interaction, motif memory, emergent form — yet the musical gaps above persisted. Asking harder does not substitute for knowledge plus an evaluation loop; that is this project's founding premise.
- **One-shot builds plateau.** Each experiment was built, then abandoned. Without instrumentation, feedback capture, and iteration, quality plateaus at whatever the first build achieves.
- **Research helps when it is specific.** The studio-prototypes README shows that targeted research (attention/distraction literature, product landscape) translated directly into concrete, checkable design decisions (steady-state spectra, C5 melody ceiling, level-matched presets). The wiki generalizes that approach to all of music.

## Implications for generative engines

- Build top-down as well as bottom-up: plan form → phrases → harmony-with-cadential-goals → notes, rather than emitting bars and hoping form emerges. See [generative-music-design-patterns](generative-music-design-patterns.md).
- Give every piece something to remember: designed themes, stated clearly, restated recognizably, developed deliberately.
- Separate composition from performance: a performer layer applying expressive rules to a symbolic score will do more for perceived quality than more synthesis polish.
- Keep what works: seeded determinism, lookahead scheduling, macro controls, voice-leading, headless verification — these are solved problems; re-derive them from this wiki's implementation pages, not by copying old code.
- Evaluate at the level that failed: add symbolic metrics (cadence presence, motif recurrence, tension-curve shape), not just spectral ones, and always audition at 10+ minutes, not 30 seconds.

## Related pages

- [project-mission](project-mission.md) · [generative-music-failure-modes](generative-music-failure-modes.md) · [generative-music-design-patterns](generative-music-design-patterns.md)
- [phrase-structure](phrase-structure.md) · [harmony](harmony.md) · [expressive-performance](expressive-performance.md) · [computational-music-metrics](computational-music-metrics.md)

## Sources

- The six experiment folders in `previous-experiments/` (code and internal READMEs/prompts), read 2026-07-06. Primary artifacts: `20260705_studio-prototypes/README.md`, `05-deepwork/composer.js`, `05-deepwork/theory.js`, `20260701_Fable_synthesizer_2_with_prompt_by_Fable/generative-synth-prompt.md`, `20250701_synthesizer-gemini2/prompt.md`.
