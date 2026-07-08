# Engine 01 — Tonal Classical

`tonal-classical@0.1.0` — the launch engine of the [algorithmic-music](../../../README.md) project. A short tonal piece in classical style, generated in the browser, that **finishes**: a theme, a contrasting middle, a varied return, and a real ending.

Open `index.html` in any browser (works from `file://`, no server, no build, no dependencies).

## What it generates

An **intro + rounded ternary (A B A′) + coda**, ~30 bars / 70–90 s at the default tempo:

- **Intro** (2 bars) — tonic→dominant lead-in with a stepwise anacrusis into the theme.
- **A** (8-bar parallel period) — an *antecedent* that asks (ends on a half cadence) and a *consequent* that answers (perfect authentic cadence), over harmony generated **backward from its cadences**.
- **B** (8-bar contrasting period) — lower register, opens off the tonic (on vi/iv), and ends on the dominant to re-approach the return.
- **A′** (varied return) — the theme restated with its melody **ornamented** (passing/neighbor eighths over the same on-beat skeleton); the dynamic **climax**, placed in the second half.
- **Coda** (4 bars) — the **ending**: the harmonic rhythm broadens then **accelerates** into a mid-bar ii–V, resolving to a lengthened final tonic, with a closing ritardando.

Everything is deterministic from a **seed**; the full state (seed, key, mode, tempo, reverb, volume) serializes into the URL, so a shared link reproduces the exact piece.

## Architecture

Follows the project's [engine architecture](../../../wiki/engine-architecture.md) pipeline:

```
composer.js   Planner + Composer — symbolic score in BEATS (rounded ternary, cadence-first
              harmony, contour-first melody, motivic variation, a real coda). Pure, seeded.
engine.js     Performer (beats→seconds, dynamics from the section intensity curve, a closing
              ritardando) + Synthesizer wiring + a lookahead Scheduler. renderPlan() is pure.
synth.js      Instrument voices from stock Web Audio nodes: an FM electric-piano lead, a
              detuned-triangle string/pad, a sine+triangle bass. Click-safe envelopes.
fx.js         Master chain: per-voice buses, one synthesized-IR convolution reverb, gentle
              saturation → glue compressor → safety limiter → trim.
lib/          Vendored copies of the project's first-party shared libraries (rng, transport,
              theory). Self-contained: the engine fetches nothing at runtime.
```

The composer and libraries are maintained canonically in the repo's `experiments/` tree (`experiments/composers/tonal-phrase.js`, `experiments/lib/`, `experiments/engines/tonal-classical/engine.js`) and **vendored** (copied) here so this folder is independently downloadable and `file://`-runnable — the project's code-reuse-without-runtime-coupling model.

## Validation

- **Composer + performer** are proven by the headless Node suite (`node experiments/tests/run.js`) — determinism, the form, the A′ return and its ornamentation, the contrasting B, the accelerated coda and lengthened tonic ending, diatonic melody, and the timing/dynamics math.
- **The audible layer** (synth + fx) is measured through an OfflineAudioContext render: `node experiments/tools/render-engine.mjs` renders several seeds/modes and gates them for no clipping, no gross discontinuity, no silent gap, background-quiet level, and a full-length piece. The dev-only host is `_selftest.html` (not part of playback).

## Deviations from the reference architecture

- **Single fixed tempo** (with a closing ritardando in the performer) rather than a full tempo map — sufficient for this piece; a piecewise tempo map is a documented `transport` extension.
- **Finite piece, then stop** rather than an endless stream — the whole point of this engine is that it *ends*. A "keep playing" toggle chains fresh seeds for continuous listening.
- **Node-graph synthesis only** (no AudioWorklet) to keep `file://` loading trivial.

## Known limitations (honest)

- Minor mode mixes a natural-minor melody with a harmonic-minor dominant, so a melodic ♮7 can brush a chordal ♯7 near cadences (a documented listening-check item).
- Full-mix onset detection in the render harness is a diagnostic, not a precision claim (spectral flux is the documented upgrade).
- The chord voicings are close-position triads with an octave-down bass; richer voice-leading between chords is a natural next increment.

Public domain (CC0). Part of a project written and built entirely by Claude, directed by Tom Gally.
