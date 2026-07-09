---
title: Findings — the percussion engine (Engine 05)
tags: [findings, implementation, craft, project]
status: reviewed
created: 2026-07-09
updated: 2026-07-09
summary: The project's fifth public engine and its first built around rhythm and timbre as the primary content — an ensemble of original synthesized percussion voices playing three worlds (concert, folk, drum circle) over a density-arc form, fully meter-parametric, with the whole kit reshapeable by four timbre macros and an optional subordinate mallet ostinato; the voice synthesis, the style/meter composer, the feel performer, and the offline-render validation.
---

# Findings — the percussion engine (Engine 05)

Engine 05 — **`percussion@0.1.0`**, live at `docs/engines/05-percussion/` and cataloged in the hub as "Percussion Ensemble" — is the project's first engine whose primary content is **rhythm and timbre**, not melody or harmony. Tom's brief (2026-07-09): music ranging from **formal concert-hall percussion**, through **folk percussion ensembles of various cultures**, to **informal improvisational drum circles**; a variety of **original** percussion voices (inspired by, but not copying, real instruments) each with **distinctive and adjustable timbre, attack, and fade**; default **2/4 or 4/4 with 4/8/16-bar groupings** but other meters selectable; **every piece has an overall structure and form**; an optional **melodic component that only ever accompanies**. Every structural claim here is backed by re-runnable in-repo code: `node experiments/tests/run.js` (**138 tests**, 15 for this engine) and `node experiments/tools/render-percussion.mjs` (the offline audio gate, **31/31** across three styles and five meters). It was designed from two new wiki pages written first, per the brief — [percussion-music](percussion-music.md) (structure) and [percussion-sound-design](percussion-sound-design.md) (sound).

## The gap this engine fills: form without harmony, and a whole kit of original voices

Every prior engine leaned on pitch to carry the piece. A percussion engine has to answer two questions the others never faced: **what carries large-scale form when there is no harmony to modulate?**, and **how do you build a *variety* of convincing struck voices from scratch?** The two new wiki pages settle the design, and the engine implements it.

## Original percussion voices: three generators, one control surface

Rather than a fixed drum kit, `synth.js` gains **seven new voices built on three reusable *generators*** ([percussion-sound-design](percussion-sound-design.md)) — all original, sample-free, and imitating no named instrument:

- **Membrane drums** (`boom` low anchor, `drum` mid hand-drum) — a **pitch-dropping fundamental** (the tension-release glide that identifies a struck skin) plus a few **inharmonic 2-D membrane partials** (the ideal ratios 1.59 / 2.14 / 2.30) plus an **attack noise transient**. `drum` takes hand-drum stroke tags — `bass`/`tone`/`slap`/`mute` — that reselect the noise/brightness/decay, the three-strokes idiom of [west-african-rhythm](west-african-rhythm.md).
- **Modal banks** (`wood`, `metal`, `mallet`) — a small bank of decaying inharmonic sinusoids via a shared `modalBank` helper, ratios set by material: an ideal free bar (**1 : 2.76 : 5.4**) for wood, a strongly inharmonic clang keeping a **~1.2 minor-third tierce** for struck metal, and a **tuned marimba (1 : 4) / xylophone (1 : 3)** bar for the pitched `mallet`. Higher modes decay faster (the natural bright-attack/dark-tail).
- **Shaped noise** (`gong`, `shaker`) — the `gong` is a **dense inharmonic cluster + a highpassed noise cloud with a slow attack "bloom"** (a real gong's energy cascades upward for a moment before it decays) and a long tail; the `shaker` is a **fast two-phase noise burst**.

Every voice reads an optional `note.p` params object (**tune, decay, attack, bright, noise, inharm**) and a `note.pan`. The change to `synth.js`/`fx.js` is purely **additive** (seven voices + two helpers + four percussion buses); engines 01–04 keep their own vendored copies untouched, so **they are byte-for-byte unaffected** — the regression evidence is that only `docs/engines/05-percussion/` was re-vendored and the 138-test suite (which loads the canonical libs) still passes, and ui-smoke plays all five engines with zero errors.

## Three worlds, one composer

`experiments/composers/percussion.js` produces the shared beat-based Note schema and covers the brief's three ranges as three **styles**, each a different way to give a percussion piece form ([percussion-music](percussion-music.md)):

- **`ensemble` (concert / art percussion)** — states one **rhythmic cell** (seeded from a Euclidean spread) and **develops it across the ensemble** (rotation / displacement / augmentation / diminution / thinning) over a rising **density arc**, with **unison hits** at high intensity, a **break** of near-silence, a **metallic climax**, and a **real gong ending** (the Varèse-lineage "pitch/metal reserved for the climax"). A test asserts a cell exists, a gong lands in the closing stretch, and the density arc rises to a `1.0` climax and falls.
- **`folk`** — an **inviolable timeline** (a son/rumba clave on 4/4, the 12-pulse standard bell on 12/8, or a Euclidean timeline on odd meters) anchors **interlocking Euclidean support ostinati** and a **low drum**, while a **lead drum improvises** variations and calls, and layers **enter one at a time and shed at the end** ("loop the core, vary the edges"). A test asserts a timeline stroke in every bar and a lead that improvises.
- **`circle`** — a shared **heartbeat** pulse that parts **join loosely** (probabilistic, so repeats aren't identical), a **rumble** that swells in density, a **stop-cut** of near-silence, **call-and-echo**, and a **fade**. A test asserts a heartbeat and that the stop-cut is far sparser than the rumble.

**Meter is fully parametric** (the brief). Every meter reduces to a bar of eighth-pulses grouped into beats over a sixteenth onset grid; onsets and durations are emitted in quarter-note beats, so **additive (aksak) meters are just unequal beat-groups** and the performer maps beats→seconds linearly. Nine meters ship — the defaults **2/4 and 4/4**, plus 3/4, **6/8 and 12/8** (the bell homes), the aksak **5/8 (2+3) and 7/8 (2+2+3)**, and 5/4 / 7/4 — and bars **snap toward the 4/8/16-bar phrase group** the brief asks for. A test walks every meter and asserts all onsets land on the meter's grid inside the bar.

The **optional melodic layer** is a quiet `mallet` ostinato (a short riff from a mode — whole-tone for concert, pentatonic for folk, dorian for circle) over a soft bass pulse, locked to the timeline and kept **under the drums** (a test asserts mallet pitches are in the mode, sit below the anchor drum's velocity, and vanish at `melody = 0`). It accompanies; it never leads.

## The performer: structured feel, macros, and accel/rit

`experiments/engines/percussion/engine.js` is a pure `renderPlan` (headless-testable, the single source for live play and the offline gate). The feel is **structured, never uniform jitter** ([groove-and-embodiment](groove-and-embodiment.md)):

- **Fixed per-voice laid-back offsets** (the low anchor tight up front; metals/shakers a hair behind), a **correlated AR(1) residual** whose magnitude scales with a **Feel** knob and with the **style** (a drum circle breathes ~1.6× a concert ensemble — a test asserts the circle's timing spread exceeds the ensemble's), and **swing on duple feels only** (a per-beat phase warp; odd/compound meters stay straight — asserted).
- **Per-section tempo shaping**: a **ritardando** into a concert ending / a circle fade and an **accelerando** through a rumble/climax (both real percussion devices — the taiko oroshi, the concert accel), implemented as a per-bar local tempo so the pure planner stays deterministic.
- **The four timbre macros** — **Tune / Ring / Attack / Brightness** — fold into each note's `p` params and **reshape the whole kit's timbre, attack, and fade** while the intrinsic partial structures keep the voices distinct (a test asserts Ring changes the decay, Brightness the tone, Tune the pitch). This is the concrete answer to "each voice with distinctive and adjustable timbre, attack, fade."

## The audible layer and validation

The engine adds four percussion buses to `fx.js` (`percLow` full-range and near-dry for the anchor; `percMid`/`percHi` high-passed with light space for tone drums and metals/shakers; `malletBus` chord-like) plus in-voice stereo seating — the ensemble mix of [effects-and-mixing](effects-and-mixing.md) (low drum loud and centered, everything above it high-passed and spread). Offline render across six cases (all three styles; 4/4, 12/8, 7/8; a dry short-ring stress case): **peak ≤ 0.73** (no clip), **max sample step ≤ 0.11** (within the percussive-transient bound — struck sounds legitimately step more than sustained voices, and every voice still ends on a true-zero ramp), **RMS −17.8 to −25.5 dBFS**, continuous (no long silence except the deliberate stop-cut), zero console errors. `ui-smoke.mjs` plays all five engines live (**17/17**).

## Implications for generative engines

1. **A percussion engine wants voice *generators*, not a kit.** Three functions — pitch-drop membrane, modal bank, shaped noise — plus a six-macro control surface produce a whole palette and make new colors a one-line preset. Reusable by any future engine that needs a struck sound.
2. **Density/intensity is the form when there is no harmony.** A per-section intensity target driving layer count, onset density, dynamics, register spread, and tempo carries a percussion piece's beginning–middle–end and climax; the "fixed timeline + free lead" polarity organizes the texture. This generalizes the [form-and-structure](form-and-structure.md) "cumulative layering + intensity trajectory" pattern.
3. **Meter parametricity is cheap** if you represent a bar as eighth-pulse beat-groups over a fine grid and emit in quarter-beats — additive meters fall out for free, and the performer stays a linear beat→seconds map.
4. **Give the user the timbre, not just the mix.** Four macros (Tune/Ring/Attack/Brightness) that reshape the whole kit are more legible and more fun than a per-voice matrix, and map one-to-one onto real synthesis parameters — the same lesson Engine 04 found for expression sliders.
5. **Confirm by ear.** The render proves the voices are *clean, click-safe, and level-matched* and the structures are *present*; whether the membrane partials read as "a skin," whether the gong bloom sounds like metal, whether the concert climax lands, and whether the default macro values are tasteful are listener questions.

## Open questions (awaiting Tom's ear)

- **Do the original voices read as their families** — does `boom` anchor, does `drum`'s slap crack, does `metal` clang rather than ping, does the `gong` bloom sound like a struck plate, does the `mallet` sit *under* the drums? If any voice is weak, it is a partial-ratio/decay tweak in one `synth.js` function.
- **Are the three worlds distinct** — does the concert style feel through-composed and build to its climax; does the folk style groove and cycle; does the circle feel loose and human with a real rumble/stop-cut?
- **Are the default timbre-macro ranges and the Feel/swing defaults tasteful?** The render proves them *safe*; only listening says whether e.g. Ring at 2.2 rings too long or the circle's looseness smears the pulse.
- **Meter/tempo defaults** — is the default 108 BPM / 4/4 / folk the right first impression; do the aksak meters (5/8, 7/8) feel right rather than merely correct?
- **Fidelity vs. generality** — the folk style is deliberately *generic* (a clave/bell timeline + Euclidean parts) rather than a specific tradition, to avoid the exoticism trap ([west-african-rhythm](west-african-rhythm.md) on Agawu). Is that the right call, or would named-tradition presets (a real samba bateria, a real rumba) be worth the specificity?

## Related pages

- [percussion-music](percussion-music.md) — the structural design (three worlds, forms, meters) this engine implements
- [percussion-sound-design](percussion-sound-design.md) — the voice synthesis this engine ships
- [rhythm-and-meter](rhythm-and-meter.md), [west-african-rhythm](west-african-rhythm.md), [gamelan](gamelan.md) — the rhythm technology (timelines, Euclidean rhythms, interlock, colotomy)
- [groove-and-embodiment](groove-and-embodiment.md) — structured microtiming, velocity hierarchy, entrainment
- [engine-architecture](engine-architecture.md) — the composer/performer/synth boundaries and the Note schema
- [shared-libraries](shared-libraries.md), [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the libraries this engine vendors and extended
- [findings-groove-lofi-engine](findings-groove-lofi-engine.md), [findings-cantabile-engine](findings-cantabile-engine.md) — the sibling engines and the shared synth/fx they extend

## Sources

- Design distilled from [percussion-music](percussion-music.md) and [percussion-sound-design](percussion-sound-design.md) (both written this session, fully cited there). The engine, its seven voices and three generators, the three-style composer, the meter model, the timbre macros, and the feel performer are original to this project; all quantitative claims (test counts, render metrics) are produced by the in-repo `experiments/tests/run.js` and `experiments/tools/render-percussion.mjs`, re-runnable from the repo.
