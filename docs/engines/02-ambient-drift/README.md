# Engine 02 — Ambient Drift

`ambient-drift@0.1.0` — the second engine of the [algorithmic-music](../../../README.md) project, and the deliberate **contrast** to [Engine 01 (Tonal Classical)](../01-tonal-classical/): where that one is metric, cadential, and finishes, this one is weightless and drifting — no beat, no cadences, no foreground melody to track. "As ignorable as it is interesting."

Open `index.html` in any browser (works from `file://`, no server, no build, no dependencies).

## What it generates

A generative ambient texture built from the single highest-value ambient recipe in the project's [knowledge base](../../../wiki/ambient-and-generative-genre.md) — Brian Eno's *Music for Airports* (1978) **incommensurable-loop** pattern, with a slow modal **drift** as the moving element:

- **A drone + pad bed** that sustains a consonant modal voicing and **drifts** through a few regions (the harmony changes root every ~26–40 s, crossfaded, never with a cadence).
- **Sparse bell events on incommensurable loops** — five loops, each repeating on a mutually-prime-ish period (17.5 / 23 / 28.5 / 32.1 / 40 s) so their overlaps never realign within a piece. This is Eno's load-bearing idea: simple overlapping systems that stay fresh because they never exactly repeat.
- **One mode** (choose the palette: *warm* lydian, *calm* major pentatonic, *open* dorian, *shadow* natural minor), long attacks and releases, and a long dark reverb as literal space. The piece **emerges from and dissolves back into silence**.

Everything is deterministic from a **seed**; the full state (seed, palette, key, drift/pace, length, space, volume) serializes into the URL, so a shared link reproduces the exact texture.

## Controls

- **Mode** — the palette (which mode the whole texture lives in).
- **Drift** — a global pace multiplier; slower = longer, more spacious.
- **Space** — reverb amount. **Length** — total duration. **Key center**, **Seed** — under Advanced.

## Architecture

Follows the project's [engine architecture](../../../wiki/engine-architecture.md) pipeline, reusing the shared libraries and the same performance-event shape as every engine:

```
composer.js   Planner + Composer — a SECONDS-based score (ambient is time-based, not
              beat-based): a drifting sequence of consonant modal regions (drone + pad)
              plus incommensurable bell loops. Pure, seeded.
engine.js     Performer (pace, a small correlated velocity/timing residual, a global
              fade in/out — no meter, no ritardando, full sustains) + Synthesizer wiring
              + a lookahead Scheduler. renderPlan() is pure.
lib/synth.js  Ambient voices from stock Web Audio nodes: a modal 'bell' (decaying sines),
              a slow-attack 'pad' with a cutoff LFO for motion, and a deep 'drone'.
lib/fx.js     Master chain with a LONG, DARK convolution reverb (band-limited return).
lib/          Vendored copies of the project's first-party shared libraries (rng, transport,
              theory, synth, fx). Self-contained: the engine fetches nothing at runtime.
```

The composer, engine, and libraries are maintained canonically in the repo's `experiments/` tree (`experiments/composers/ambient-drift.js`, `experiments/engines/ambient-drift/engine.js`, `experiments/lib/`) and **vendored** (copied) here so this folder is independently downloadable and `file://`-runnable — the project's code-reuse-without-runtime-coupling model.

## Validation

- **Composer + performer** are proven by the headless Node suite (`node experiments/tests/run.js`) — determinism, region tiling, the incommensurability of the loop periods (no fast resync), in-mode pitches, valid performance ranges, pace scaling, and the global swell.
- **The audible layer** (synth + fx) is measured through an OfflineAudioContext render: `node experiments/tools/render-ambient.mjs` renders several seeds/palettes and gates them for no clipping, no gross discontinuity, a continuous bed (no long mid-piece silence), and an ambient-quiet level. The dev-only host is `_selftest.html` (not part of playback).

## Deviations from the reference architecture (honest)

- **Seconds-based composer score** rather than the beats-based Note schema — ambient is fundamentally time-based; the performer still emits the same performance-event shape as every engine.
- **Finite piece with a "keep playing" toggle** rather than a truly endless stream (which the pattern also supports) — the finite render is seedable, shareable, and measurable; the toggle chains fresh seeds for continuous listening.
- **Node-graph synthesis only** (no AudioWorklet) to keep `file://` loading trivial.

Public domain (CC0). Part of a project written and built entirely by Claude, directed by Tom Gally.
