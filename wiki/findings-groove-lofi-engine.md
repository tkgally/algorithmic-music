---
title: Findings — the groove-lofi engine (Engine 03)
tags: [findings, implementation, psychology, genre, project]
status: reviewed
created: 2026-07-08
updated: 2026-07-08
summary: The project's third public engine and the first with drums — a looped lo-fi hip-hop groove built from the design targets in groove-and-embodiment.md (backbeat, medium syncopation, velocity hierarchy, structured swing/laid-back timing instead of uniform jitter), adding kick/snare/hat and a Rhodes voice to the shared synth/fx, validated by offline render.
---

# Findings — the groove-lofi engine (Engine 03)

Engine 03 — **`groove-lofi@0.1.0`**, live at `docs/engines/03-groove-lofi/` and cataloged in the hub as Engine 03 — completes the launch trio (metric-classical / beatless-ambient / groove) called for in [project-roadmap](project-roadmap.md)'s Phase 2 shortlist. It is the project's **first engine with drums**, and the natural home for the two things the knowledge base had specified but no engine had yet built: the **percussion voices** ([synthesis-recipes](synthesis-recipes.md)) and **swing / laid-back timing** ([groove-and-embodiment](groove-and-embodiment.md), [rhythm-and-meter](rhythm-and-meter.md)). Every structural claim is backed by re-runnable in-repo code — `node experiments/tests/run.js` (**105 tests**, of which 10 are groove) and `node experiments/tools/render-groove.mjs` (the offline audio gate, 16/16).

## Why lo-fi, and why it is the right test of the groove research

[groove-and-embodiment](groove-and-embodiment.md) is the most design-directive psychology page in the wiki, and its central correction to this project's past work is blunt: groove comes from **structured pattern and a velocity hierarchy, not from timing noise** — "uniform random jitter is the worst option the literature identifies." Lo-fi hip-hop is the ideal first groove idiom to test that claim because it is *built* from the page's levers: a hard backbeat, a small palette of syncopated kick figures, ghost notes, a swung/laid-back feel, and bass weight — all over a short repeated loop. It is also forgiving of node-graph synthesis (warm, dark, deliberately un-hi-fi) and pairs naturally with jazzy 7th/9th harmony the [theory](harmony.md) library already generates.

The engine realizes each of the page's "implications for generative engines" directly:

- **A structural backbeat.** Snare on beats 2 and 4 as the loudest recurring accent, kick on beat 1 (+ a syncopated hit) as the tight low anchor. A test asserts the 2-and-4 backbeat in *every* main bar.
- **Medium syncopation (the Witek et al. 2014 inverted-U peak).** Every kick pattern in the bank keeps beat 1 and adds only a handful of weak-position onsets (the "&" of 2/3), so the meter never flips — a test asserts beat 1 is always articulated across all four moods.
- **A velocity hierarchy, not jitter.** Accented backbeat/downbeat loud (~0.95), **ghost snares ≈ 0.22** (a test asserts they stay < 0.35 and enter only in the B section), hi-hats alternating loud/soft on/off the beat. The snare voice makes velocity scale the *noise* more than the tone, so a low-velocity ghost reads as a soft brush, not a quiet full hit.
- **Bass weight.** The bass carries the roots in the low register (mono, dark), where [the low-frequency timing findings](groove-and-embodiment.md) say the timekeeping energy belongs.
- **Loop the core, vary at the edges.** A four-chord progression and a two-bar drum feel ride unchanged through the main section; variation is applied sparingly — the B half swaps the kick figure, adds ghost notes and a sparse bell lead, and one-bar snare fills mark the hand-offs.

## Swing and laid-back feel: the performer's structured job

The single most important design decision follows the page's microtiming synthesis: **swing and the laid-back feel are added by the performer as structured timing, and the composer's grid stays perfectly quantized.** This keeps the "feel" exactly where the research says it belongs (performance time) and out of the symbolic score.

- **Swing** is a per-beat **phase warp**: within each beat, the local phase is remapped so the midpoint (the eighth-note offbeat) lands at `sw` instead of 0.5, which pushes both eighth *and* sixteenth offbeats late from one knob (0.5 = straight … ~0.66 = heavy lo-fi shuffle). Onsets exactly on the beat never move, so the pulse stays tight. Tests assert offbeats move late, downbeats stay on the grid, and the map is monotonic within the beat.
- **Laid-back microtiming** is a small **fixed, per-instrument** offset in seconds — the snare drags ~18 ms behind the beat (the classic "behind-the-beat" backbeat), hats sit a hair back, the kick and bass stay tight up front — applied identically every cycle. This is precisely the "small, fixed, per-instrument, style-labeled offset applied identically every cycle" the page endorses, and the antithesis of the i.i.d. per-note noise the page (and [previous-experiments-lessons](previous-experiments-lessons.md)) condemn. A test confirms the backbeat lands *after* its nominal beat time but by only a few tens of ms.
- A tiny **correlated (AR(1)) residual** per voice keeps repeated cycles from being dead-static without smearing the groove — the one humanization idea that transfers, kept below JND.

## The audible layer: four new shared voices + a vinyl bed

The engine reuses the shared [synth](shared-libraries.md)/[fx](shared-libraries.md) libraries, extended with the drum and lo-fi-keys voices the roadmap had earmarked, all from stock Web Audio nodes per [synthesis-recipes](synthesis-recipes.md) — and vendored into every engine so the palette stays in sync:

- **`kick`** — a sine with a fast exponential pitch drop (≈ 118→46 Hz over 60 ms), kept deliberately **round** (little beater click) for the warm, dusty character; the weight is the point.
- **`snare`** — two triangle tone partials (~185 + ~328 Hz, fast decay) plus band-passed white noise, with **velocity scaling the noise more than the tone** (what makes ghost notes work).
- **`hat`** — high-passed white noise (≥ 7.6 kHz), closed (τ ≈ 0.045 s) or open (τ ≈ 0.26 s, tag-selected); level kept modest so the bright noise's per-sample steps stay bounded.
- **`rhodes`** — a warm, dusty 2-operator FM electric piano (1:1 ratio, index with a fast decay) through a lowpass — the signature lo-fi chord timbre, distinct from the brighter `keys` lead.
- The drums share **one deterministic, cached white-noise buffer per context** (offset slices per hit), per the [synthesis-recipes](synthesis-recipes.md) "seeded noise buffer" prescription — reproducible and allocation-free.
- A quiet **vinyl-crackle bed** (band-limited looped noise at ≈ −40 dB × amount) added in the engine's graph gives the unmistakable lo-fi color; it is deterministic and dial-able (the **Vinyl** control) and renders in the offline gate.
- The **`fx`** buses were extended: the kick is full-range and **dry** (its weight is the groove, like the bass bus), snare/hat are high-passed with a **light** reverb send (drums drown in a big tail), and the rhodes gets a warm chord-like send — with a small, warm room (≈ 1.8 s) rather than the ambient engine's long dark tail.

## What the validation shows

- **Composer + performer** (`node experiments/tests/run.js`, +10 tests): the score is deterministic; the full kit + bass + rhodes are present and drums are confined to the main section; the backbeat is on 2 and 4 of every main bar; every kick pattern keeps beat 1 across all four moods; ghost notes are quiet (< 0.35) and only in the B half; all bass/rhodes/bell pitches are in the chosen mode; the performer emits time-ordered events with valid ranges; the swing warp pushes offbeats late while leaving downbeats tight; the backbeat drags behind its beat but only slightly; and BPM scales the piece length.
- **The audible layer** (`node experiments/tools/render-groove.mjs`, 16/16 gates): the engine's own `synth`/`fx` render several seeds/moods to **no clipping** (peak ≈ 0.62), **no gross discontinuity** within the percussive bound (`maxStep` ≈ 0.15–0.17 — higher than the sustained engines, as expected from high-passed hats and snare noise, which is *designed* shaped-noise transient content, not an envelope click), a **continuous groove** (no silence, thanks to the per-bar kit and the vinyl bed), and a sensible level (≈ −14 dBFS RMS, louder than the ambient engine, as a beat should be), with no console errors. A headless UI smoke test loads the hub and all three engines and plays Engine 03 with zero console errors.

## Design decisions settled

- **Groove is a performer phenomenon over a quantized grid.** The composer emits a clean beat grid; swing (a phase warp) and the laid-back backbeat (a fixed per-instrument offset) are added at performance time. This is the concrete implementation of [groove-and-embodiment](groove-and-embodiment.md)'s central correction and keeps the symbolic score honest and measurable.
- **Velocity hierarchy does the "human feel" work.** Ghost notes at ≈ 0.2 (with noise-dominant snare synthesis), backbeat accents, and hat loud/soft alternation carry the life — no timing noise required.
- **The kick must be weighty and dry.** A full-range, reverb-free kick anchors the low end; sending it to the room would sap exactly the low-frequency energy the groove research says drives movement.
- **The percussion voices belong in the shared library.** `kick`/`snare`/`hat`/`rhodes` were added to the shared `synth.js`/`fx.js` (not the engine folder) so future groove/electronic engines reuse them — the same first-party-library model as the tonal and ambient voices.

## Open questions and next increments

- **Is the swing/laid-back feel actually grooving?** The magnitudes (60% swing default, ~18 ms snare drag) are informed estimates from [groove-and-embodiment](groove-and-embodiment.md); the page itself flags that no portable, quantitative microtiming recipe exists. This needs [listening tests](listening-tests-and-feedback.md) — the download-feedback affordance is the first collector.
- **Scoring syncopation automatically.** The kick patterns are a hand-curated "medium syncopation" bank; wiring the polyphonic Witek/LHL index from [rhythm-and-meter](rhythm-and-meter.md) into a selector (pick from the middle of the range) would make the inverted-U target explicit rather than assumed — a natural use of the [analysis](shared-libraries.md) module and a step toward the [R4 self-evaluation loop](project-open-questions.md).
- **Richer harmony and bass.** Chords are fixed rootless-ish voicings; inter-chord voice-leading and a walking/melodic bass option would deepen the jazz color. Chord extensions currently vary by section/mood rather than by a harmonic plan.
- **A real ending vs. a loop.** The engine thins to an outro but does not cadence; a "final turnaround" option (or a filter-down/tape-stop) would give it a genuine finish like Engine 01's coda.
- **Structured, per-genre microtiming templates.** Only one feel ships (lo-fi laid-back); the performer is built to carry a table of them (a pushed house feel, a J-Dilla "drunk" snare-vs-hat split), which the page lists as an open research target.

## Related pages

- [groove-and-embodiment](groove-and-embodiment.md) — the design targets (backbeat, syncopation inverted-U, velocity hierarchy, structured-not-random microtiming, bass weight) this engine realizes
- [rhythm-and-meter](rhythm-and-meter.md) — swing ratios, syncopation measurement, the metrical grid the swing warp and patterns build on
- [synthesis-recipes](synthesis-recipes.md) — the kick/snare/hi-hat and FM-EP recipes the new voices implement; the shared seeded-noise-buffer prescription
- [findings-tonal-classical-engine](findings-tonal-classical-engine.md), [findings-ambient-drift-engine](findings-ambient-drift-engine.md) — the other two engines of the trio; the shared beat schema and synth/fx this extends
- [engine-architecture](engine-architecture.md) — the composer→performer→synth pipeline, UI conventions, and deploy layout this reuses
- [effects-and-mixing](effects-and-mixing.md) — the dry-kick / lightly-sent-drums mixing choices and bass-weight discipline
- [shared-libraries](shared-libraries.md) — the `synth`/`fx` libraries the drum and rhodes voices extend
- [electronic-and-dance](electronic-and-dance.md) — the downtempo/lo-fi tradition this idiom sits in
- [previous-experiments-lessons](previous-experiments-lessons.md) — where "uniform jitter as humanization" went wrong (the mistake this engine's structured timing corrects)
- [project-roadmap](project-roadmap.md) — Phase 2, the contrasting-engine shortlist that named a groove engine

## Sources

- Reproducible in-repo (original, public-domain CC0): `experiments/composers/groove-lofi.js`, `experiments/engines/groove-lofi/engine.js`, the shared `experiments/lib/synth.js` (`kick`/`snare`/`hat`/`rhodes` + the cached noise buffer) and `experiments/lib/fx.js` (drum + rhodes buses), `experiments/tests/groove.test.js` (run `node experiments/tests/run.js`), `experiments/tools/render-groove.mjs`, and the shipped `docs/engines/03-groove-lofi/`. All claims above re-run from these.
- Psychology/genre content operationalizes already-cited wiki pages: the backbeat, syncopation inverted-U (Witek et al. 2014), velocity hierarchy and ghost-note magnitudes, structured-vs-random microtiming synthesis, and bass-weight findings from [groove-and-embodiment](groove-and-embodiment.md); swing ratios and syncopation measurement from [rhythm-and-meter](rhythm-and-meter.md); the drum and FM-EP synthesis topologies from [synthesis-recipes](synthesis-recipes.md). No new external sources were fetched.
