---
title: Engine architecture
tags: [implementation, project]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: The reference architecture for this project's browser engines — module boundaries, data schemas, determinism rules, UI and deployment conventions, and testability requirements.
---

# Engine architecture

This page defines how this project's engines are structured, so that every engine is comparable, testable, and legible to future sessions. It turns the [design patterns](generative-music-design-patterns.md) into module boundaries and schemas. It is prescriptive where the previous experiments taught clear lessons, and provisional everywhere else — expect revision once the first new engines exist. Individual engines may deviate deliberately, but must document the deviation in their own README.

## Module pipeline

Engines separate five concerns, in one direction of data flow:

```
[Style pack]      declarative data: scales, grammars, feels, palettes, mix targets
     ↓
[Planner]         form plan: sections, key plan, tension curve, theme lifecycle
     ↓
[Composer]        symbolic score: phrases, harmony, voices — in BEATS, no seconds
     ↓
[Performer]       expressive rendering: tempo curves, dynamics, articulation, micro-timing
     ↓                                  (beats → seconds happens here)
[Synthesizer]     Web Audio: instruments, effects, mix bus, master chain
     ↓
[Scheduler/UI]    lookahead scheduling, transport, controls, visualization, state/URL
```

Rationale: the composer must be pure and fast (candidate generation with critics — pattern P7 — requires cheap re-runs); the performer must be swappable (the same score should be renderable mechanically for debugging and expressively for listening); the synthesizer must be replaceable without touching musical logic. The previous experiments blurred composer and performer, which made "mechanical performance" unfixable without surgery ([previous-experiments-lessons](previous-experiments-lessons.md)).

## Data schemas (provisional)

Define these as plain JSON-serializable objects; exact fields will be finalized in the first engine build and recorded here.

- **Note event (composer output)**: `{ beat, durBeats, midi, voice, role, artic?, tags? }` — `tags` carries analytical intent (`cadence:PAC`, `theme:A1`, `tension:0.7`) so critics and metrics can see what the composer meant.
- **Performance event (performer output)**: `{ timeSec, durSec, freqHz, vel, voice, artic, detuneCents? }`.
- **Form plan**: sections with `{ id, role, bars, keyCenter, mode, tensionTarget[], themePlan[] }`.
- **Style pack**: versioned object of tables — see pattern P4.

Two invariants: (1) *composer thinks in beats*, tempo lives in the performer; (2) *everything the piece did is inspectable* — the full symbolic score of a run can be dumped as JSON for metrics, regression tests, and bug reports.

## Determinism and state

- Seeded RNG (e.g., mulberry32/xoshiro) injected everywhere; **no `Math.random()`** anywhere in engine code.
- Distinct named RNG streams per module (planner/composer/performer) so changing one module's consumption pattern doesn't scramble the others' output across versions.
- Full state — engine version, seed, all user parameters — serializes into the URL hash; a shared link reproduces the piece exactly. Date-based default seed (YYMMDD) for a stable daily piece.
- Version every engine (`name@major.minor`); breaking changes to generation bump major. Feedback is only interpretable against `(engine, version, seed, params)` — see [improvement-loop](improvement-loop.md).

## Runtime rules

- Vanilla ES modules or a single classic script; no build step; must run from `file://` and from GitHub Pages. Dependency-free by default — a tiny, vendored, permissively-licensed helper only if ever genuinely needed, copied in and never fetched at runtime.
- Lookahead scheduling per [scheduling-and-timing](scheduling-and-timing.md); hidden-tab safe.
- Audio starts only on user gesture; resume handling and autoplay etiquette per [audio-worklets-and-performance](audio-worklets-and-performance.md).
- Long-session hygiene: no unbounded arrays, nodes disconnected after use, hour-long runs without glitches or growth.
- Master chain with the standing loudness discipline from [effects-and-mixing](effects-and-mixing.md); presets level-matched.

## Testability requirements

Every engine ships with:

1. **Score dump**: a function (or `?dump=1` mode) that generates N bars offline and returns the symbolic score JSON — no audio needed. This is what symbolic [metrics](computational-music-metrics.md) consume.
2. **Offline render**: OfflineAudioContext render of a given seed/duration for acoustic metrics — the successor to the previous experiments' `verify.mjs`.
3. **Self-report**: the engine's own intent (form plan, tension targets, theme lifecycle) exposed alongside the score, so critics can measure achieved-vs-intended, not just statistics.
4. **A/B hooks**: any two versions playable side by side with the same seed (the feedback site depends on this).

## UI conventions

- Two-level controls (a previous-experiments lesson that held up): a simple panel — presets, one headline macro, a few plain-language sliders — and an Advanced disclosure with the full parameter set.
- Every engine page shows: engine name/version, seed (editable), share link, and a feedback affordance (see [listening-tests-and-feedback](listening-tests-and-feedback.md)).
- Visualization is optional but valuable (piece legibility, debugging); never required for the music to function.

## Deployment layout (when public engines begin)

```
docs/
  index.html          hub: catalog of engines + project summary site
  engines/<name>/     one folder per engine (self-contained)
  feedback/           on-page forms that save responses to a downloadable JSON file (no server) — see listening-tests-and-feedback.md
  assets/             shared CSS/JS for the hub only — engines stay self-contained
```

Engines never share runtime code with each other (self-containment beats DRY here: engines must be independently downloadable, and experiments must not couple). Knowledge is shared through the wiki, not through imports.

## Implications for generative engines

This page *is* the implications. The checklist form: pure beat-based composer · swappable performer · style as data · seeded determinism with URL state · score dump + offline render + self-report · dependency-free by default · file:// compatible · two-level UI · level-matched output.

## Open questions

- Single-file engines (easy sharing) vs small multi-file folders (legibility)? Previous experiments did both; decide at first build.
- AudioWorklet use raises `file://` complications — resolve against [audio-worklets-and-performance](audio-worklets-and-performance.md) findings when first needed.
- Feedback transport is decided (2026-07-06): an on-page form that saves responses to a downloadable JSON file, which Tom hands back to Claude — no server, no external service. Remaining detail: the exact JSON schema and how per-piece submissions accumulate into one file. See [listening-tests-and-feedback](listening-tests-and-feedback.md).

## Related pages

- [generative-music-design-patterns](generative-music-design-patterns.md) · [scheduling-and-timing](scheduling-and-timing.md) · [web-audio-fundamentals](web-audio-fundamentals.md) · [effects-and-mixing](effects-and-mixing.md)
- [computational-music-metrics](computational-music-metrics.md) · [improvement-loop](improvement-loop.md) · [previous-experiments-lessons](previous-experiments-lessons.md)

## Sources

- Architecture distilled from analysis of `previous-experiments/` (what blurred boundaries cost) and standard practice in the linked implementation pages; schemas are original to this project and provisional until the first engine validates them.
