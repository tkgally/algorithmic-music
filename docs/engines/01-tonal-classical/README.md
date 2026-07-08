# Engine 01 — Tonal Classical

`tonal-classical@0.3.1` — the launch engine of the [algorithmic-music](../../../README.md) project. A short tonal piece in classical style, generated in the browser, that **finishes**: a theme, a contrasting middle, a varied return, and a real ending.

Open `index.html` in any browser (works from `file://`, no server, no build, no dependencies).

## What it generates

An **intro + rounded ternary (A B A′) + coda**, ~30 bars / ~65–80 s at the default tempo (110 BPM):

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
engine.js     Performer (beats→seconds, an expressive layer — nested phrase-arch tempo +
              dynamics, high-loud, structured articulation, chord roll, a correlated timing
              residual, a square-root closing ritardando) + Synthesizer wiring + a lookahead
              Scheduler. renderPlan() is pure.
synth.js      Instrument voices from stock Web Audio nodes: an FM electric-piano lead (with
              delayed vibrato on held notes), a detuned-triangle string/pad, a sine+triangle
              bass. True-zero, click-safe envelopes.
fx.js         Master chain: per-voice buses, one synthesized-IR convolution reverb (dark,
              band-limited return), gentle saturation → glue compressor → safety limiter → trim.
lib/          Vendored copies of the project's first-party shared libraries (rng, transport,
              theory). Self-contained: the engine fetches nothing at runtime.
```

## What changed in 0.2 (listener-feedback pass)

- **A real expressive performance layer** (`wiki/expressive-performance.md`) replaces the old per-note random jitter — nested phrase-arch tempo and dynamics, high-loud, melody emphasis, structured articulation (détaché lead, separated repeats, ringing cadence notes), a subtle chord roll, delayed vibrato on held melody notes, and a small *correlated* timing residual (an AR(1) walk, never i.i.d. "drunk-drummer" noise). The melody phrases rather than marching.
- **Cleaner sound.** The convolution reverb uses a darker, smoother impulse response with a band-limited return, the master glue is gentler, and every voice's envelope is brought to true zero before its oscillators stop — removing the faint high-frequency "fizz"/click a listener heard on sustained chords and the exposed final note.
- **Faster default tempo** (110 BPM, up from 92) with a wider tempo range.

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
