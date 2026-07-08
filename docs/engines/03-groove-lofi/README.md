# Engine 03 — Groove / Lo-Fi

`groove-lofi@0.1.0` — the third engine of the [algorithmic-music](../../../README.md) project, completing the launch trio with a **groove-based** generator: where [Engine 01 (Tonal Classical)](../01-tonal-classical/) is metric-but-through-composed and [Engine 02 (Ambient Drift)](../02-ambient-drift/) is beatless and weightless, this one is a **looped lo-fi hip-hop beat** built to make you nod — the project's first engine with drums, swing, and a backbeat.

Open `index.html` in any browser (works from `file://`, no server, no build, no dependencies).

## What it generates

A looped lo-fi groove built from the design targets in the project's [knowledge base](../../../wiki/groove-and-embodiment.md) — groove as "the pleasurable urge to move," driven by structured pattern and velocity, **not** timing noise:

- **A backbeat groove** — snare on beats 2 and 4 as the loudest recurring accent, a **medium-syncopation** kick that keeps beat 1 (the Witek et al. 2014 inverted-U "sweet spot," not metronomic and not so busy the meter flips), an eighth-note hi-hat ride with a loud/soft accent, and **ghost snares** that enter in the second half.
- **Swing and a laid-back feel** applied by the performer as *structured* microtiming (the correction to this project's old "uniform jitter as humanization" mistake): a single swing knob pushes the offbeats late, and a small fixed per-instrument offset drags the **snare a few ms behind the beat** while the kick stays tight up front.
- **Warm jazzy harmony** — a four-chord 7th/9th progression on a **Rhodes-style electric piano**, looped, over a **weighty bass** that follows the roots (bass carries the timekeeping energy the groove research says it must).
- **A sparse bell lead** in the busier B section, and a quiet **vinyl-crackle bed** for the unmistakable lo-fi color.
- **Form:** a short intro, a main groove that splits into an **A** half and a richer **B** half (ghost notes + lead + fills), and a thinned **outro** — so it isn't a single loop on repeat.

Choose the **mood** (mellow major 7ths, night minor 9ths, warm dorian, tape I–vi–ii–V), tempo, swing, space, and how much vinyl. Everything is deterministic from a **seed**; the full state serializes into the URL, so a shared link reproduces the exact beat.

## Controls

- **Mood** — key/mode + the chord progression.
- **Tempo** — 62–100 BPM (groove sits in the danceable range). **Swing** — 50% (straight) to ~68% (heavy shuffle).
- **Space** — reverb. **Vinyl** — crackle/hiss amount. **Length**, **Key center**, **Seed** — under Advanced.

## Architecture

Follows the project's [engine architecture](../../../wiki/engine-architecture.md) pipeline, reusing the shared libraries and the same performance-event shape as every engine:

```
composer.js   Planner + Composer — a BEATS-based Note score (the shared schema): a looped
              4-chord jazzy progression (rhodes + bass), a backbeat/medium-syncopation drum
              groove with ghost notes and fills, and a sparse bell lead. Pure, seeded.
engine.js     Performer (SWING phase-warp + fixed laid-back per-instrument microtiming +
              a velocity hierarchy + a small correlated residual — no uniform jitter) +
              Synthesizer wiring (+ a vinyl-crackle bed) + a lookahead Scheduler.
              renderPlan() is pure.
lib/synth.js  Drum voices from stock Web Audio nodes: a round pitch-drop 'kick', a
              tone+noise 'snare' (velocity scales the noise, so ghost notes read as brushes),
              a high-passed 'hat' (open/closed), and a warm dusty 'rhodes' electric piano.
lib/fx.js     Master chain with a small warm reverb; kick dry and full-range, drums lightly
              sent, rhodes warmly sent.
lib/          Vendored copies of the project's first-party shared libraries (rng, transport,
              theory, synth, fx). Self-contained: the engine fetches nothing at runtime.
```

The composer, engine, and libraries are maintained canonically in the repo's `experiments/` tree (`experiments/composers/groove-lofi.js`, `experiments/engines/groove-lofi/engine.js`, `experiments/lib/`) and **vendored** (copied) here so this folder is independently downloadable and `file://`-runnable. The drum voices (`kick`/`snare`/`hat`) and the `rhodes` voice were added to the shared `synth.js`/`fx.js` and are reused by all engines.

## Validation

- **Composer + performer** are proven by the headless Node suite (`node experiments/tests/run.js`) — determinism, the full kit + bass + rhodes present, the backbeat on 2 and 4 of every main bar, every kick pattern keeping beat 1, quiet ghost notes confined to the B section, in-mode pitches, the swing phase-warp (offbeats late, downbeats tight), the laid-back backbeat, and BPM length scaling.
- **The audible layer** (drum voices + rhodes + vinyl bed) is measured through an OfflineAudioContext render: `node experiments/tools/render-groove.mjs` renders several seeds/moods and gates them for no clipping, per-sample steps within the percussive bound, a continuous groove (no long silence), and a sensible level. The dev-only host is `_selftest.html` (not part of playback).

## Deviations from the reference architecture (honest)

- **Swing is a performer phase-warp**, not a change to the composer's beat grid — the score stays a clean quantized grid; the *feel* is added at performance time (exactly where the groove research says structured timing belongs).
- **Drum voices carry a nominal GM-ish pitch** (kick 36 / snare 38 / hat 42) only so the visualization has a lane; the synth drum voices are pitch-fixed.
- **A finite piece with a "keep playing" toggle** rather than an endless stream — the finite render is seedable, shareable, and measurable; the toggle chains fresh seeds for continuous listening.
- **Node-graph synthesis only** (no AudioWorklet) to keep `file://` loading trivial.

Public domain (CC0). Part of a project written and built entirely by Claude, directed by Tom Gally.
