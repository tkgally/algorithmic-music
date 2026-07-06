---
title: JavaScript music libraries
tags: [implementation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: A survey of Tone.js, Tonal, Magenta.js, Strudel/Gibber, scribbletune, WebPd/RNBO/Faust, Elementary, and Meyda — mined for design lessons a dependency-free engine should steal, plus the case for and against the no-dependency constraint.
---

# JavaScript music libraries

This project stays dependency-free (vanilla JS + Web Audio), so this page is a survey for *design lessons*, not a shopping list: each library encodes hard-won decisions about how to represent musical time, theory, patterns, DSP graphs, and analysis in the browser, and we want the good ideas without the payload. For each, the questions are: what abstraction does it get right, what does it get wrong for generative use, and what should a hand-rolled engine borrow? The page closes with the honest argument for and against writing everything ourselves — an open project decision recorded in [project-open-questions.md](project-open-questions.md). Version/size facts below were checked against the npm registry on 2026-07-06.

## Tone.js — scheduling and instrument/effect abstractions

Tone.js (MIT; v15.1.x, April 2025; ~5.4 MB unpacked, though tree-shaken bundles are far smaller) is the de-facto Web Audio framework. Its central idea is the Transport: a musical-time clock you schedule against in beats and bars ("4n", "8t", "1m") at a settable BPM, decoupled from the audio hardware clock. Under the hood it uses the standard lookahead-scheduler pattern (a `setInterval`/worker timer that schedules Web Audio events a little ahead of time so timing is sample-accurate — the technique from Chris Wilson's "A Tale of Two Clocks"; see [scheduling-and-timing.md](scheduling-and-timing.md)). It wraps oscillators/envelopes into `Synth`, `FMSynth`, `AMSynth`, `PolySynth`, `Sampler`, and gives a chainable effects/`Signal` graph modeled on DAW concepts.

- Borrow: the Transport/musical-time abstraction and the lookahead scheduler are the single most important pattern to reimplement natively — never schedule note-by-note off `setTimeout`. Borrow the idea of a callback receiving an exact `time` argument for every scheduled event. Borrow the `Signal` idea that control parameters are themselves audio-rate and can be automated/ramped.
- Watch out: Tone's convenience objects hide the raw `AudioNode` graph and add allocation/GC pressure; `PolySynth` voice management and its global Transport are awkward when you want many independent generative streams with their own tempi or micro-timing. For generative use we want the scheduler and time model, not the instrument wrappers.
- Lesson for us: implement a minimal Transport + lookahead scheduler (a few dozen lines) and build voices directly on `OscillatorNode`/`GainNode`. See [engine-architecture.md](engine-architecture.md), [synthesis-recipes.md](synthesis-recipes.md).

## Tonal — music theory as pure data

Tonal (MIT; v6.4.x, January 2026; ~0.3 MB; no audio at all) is a model of what a theory module should be: pure functions over strings/data, no mutation, tree-shakeable `@tonaljs/*` modules. `Note.transpose("C4","5P") → "G4"`, `Scale.get("C major").notes`, chord detection, key/interval math, all as data transformations.

- Borrow: the *architecture*. A generative engine needs exactly this — a side-effect-free theory layer (notes, intervals, scales, chords, keys, transposition, enharmonics) that the composition logic queries, cleanly separated from anything that makes sound. Tonal is the reference for the API shape and for the note/interval encodings (pitch classes, interval qualities). Reading its source is a fast way to get the edge cases right (enharmonic spelling, interval arithmetic, negative intervals).
- Watch out: it is comprehensive (many chord types, voicings, Roman-numeral analysis) — we only need the slice a given engine uses. Don't port it wholesale; port the primitives.
- Lesson for us: build a small pure theory module first; it is the cheapest high-leverage code in the engine and makes everything downstream declarative. See [harmony.md](harmony.md), [tuning-and-scales.md](tuning-and-scales.md).

## Magenta.js — pretrained ML models in the browser

Magenta.js `@magenta/music` (Apache-2.0; v1.23.1, last published November 2021; ~12 MB unpacked) runs Magenta's symbolic models — MusicVAE, MelodyRNN, DrumsRNN, PerformanceRNN, ImprovRNN — in the browser via TensorFlow.js, loading checkpoints from a remote host. It is the practical face of ML music generation client-side.

- Reality check: the package hasn't had a release since 2021 (TF.js itself continues, but the JS bindings are effectively dormant), and it is heavy — the library plus model checkpoints is megabytes to tens of megabytes downloaded before a note plays, versus this whole project's dependency-free budget. Latency and cold-start are real.
- Borrow (conceptually, not code): the interface pattern of "sample a continuation / interpolate between two melodies in a learned latent space" is a useful mental model even for non-ML generation — MusicVAE's interpolation is a design idea (morph between two motifs) implementable with simple interpolation heuristics. Its data representations (NoteSequence, quantization) are worth studying.
- Lesson for us: pretrained-model generation is out of scope for a lightweight, transparent, offline-capable engine, but Magenta marks the ceiling of "browser ML music" and its size/practicality trade-offs justify the project's non-ML stance. See [machine-learning-music.md](machine-learning-music.md).

## Strudel and Gibber — live-coding pattern algebra

Strudel (`@strudel/core`, AGPL-3.0; v1.2.x, January 2026; small core ~0.6 MB) is the official JavaScript port of TidalCycles, and its pattern algebra is the richest idea in this survey. Everything is a *pattern* — a pure function from a time span (a "cycle") to a set of timed events — and patterns compose through combinators (`fast`, `slow`, `rev`, `every`, `jux`, `superimpose`, `degradeBy`). The mini-notation is a compact rhythm/melody DSL worth learning from in detail:

- space = sequence within one cycle (`"c e g"` = three events per cycle); `[]` subdivides; `<>` picks one element per cycle (alternation); `*` speeds/repeats; `/` slows; `!` replicates; `,` layers in parallel; `~`/`-` is a rest; `@` elongates; `?` randomly drops events (`?0.3`); `(3,8)` is a Euclidean rhythm (3 hits spread over 8 slots). `s("bd(3,8)")` is an entire clave in nine characters.

- Borrow: (1) the pattern-as-function-of-time abstraction is a genuinely better substrate for generative rhythm/melody than event lists — it makes transformation and layering algebraic and lazy. (2) Euclidean-rhythm generation is a tiny, high-value algorithm to implement natively (Bjorklund). (3) A mini-notation-style compact string DSL is an excellent authoring and logging format for motifs and grooves. See [rhythm-and-meter.md](rhythm-and-meter.md), [groove-and-embodiment.md](groove-and-embodiment.md), [generative-music-design-patterns.md](generative-music-design-patterns.md).
- Watch out: AGPL is copyleft — do not copy Strudel source into a permissive/closed project; reimplement the concepts. Sound is made by its `superdough`/Web Audio layer, separate from the pattern core (a clean separation worth imitating).
- Gibber (MIT) is the other live-coding reference: an in-browser audiovisual environment whose audio runs on sample-accurate callback engines (genish.js/gibberish compiling DSP to tight callbacks). Lesson: compiling a per-sample DSP inner loop (or using an AudioWorklet) beats node-graph overhead for dense synthesis — relevant to [audio-worklets-and-performance.md](audio-worklets-and-performance.md).

## scribbletune — patterns to MIDI/clips

scribbletune (MIT; v5.5.x, April 2026; small) turns pattern strings (`"x-x-"`, where `x`=note, `-`=rest, `_`=sustain) plus named scales/chords ("C4 major") into clips — MIDI files in Node, or live playback via Tone.js in the browser. `clip()`, `scale()`, `chord()`, `arp()`, `midi()`.

- Borrow: the ergonomics of the tiny `x-_-` notation for rhythm and the "pattern + note source → note events" pipeline; it's a proven, minimal authoring model. Its MIDI-export path is a reminder that an engine that emits a portable event representation (not just audio) is more testable and reusable.
- Lesson for us: keep an intermediate symbolic representation (note/timing events) between composition and synthesis, so output can be inspected, exported (MIDI), and unit-tested without listening. See [engine-architecture.md](engine-architecture.md), [computational-music-metrics.md](computational-music-metrics.md).

## WebPd / RNBO / Faust — porting DSP graphs to the web

Three routes exist for reusing existing DSP work rather than hand-writing nodes:

- WebPd (LGPL/GPL; alpha): compiles a subset of Pure Data `.pd` patches to JavaScript or AssemblyScript/WebAssembly running in an AudioWorklet. Good if you already have Pd patches; alpha-quality coverage.
- RNBO (Cycling '74, commercial license): exports Max/MSP-subset patches to C++ and to Web Audio (wasm + AudioWorklet). Polished but proprietary and licensed — unsuitable for a dependency-free/open project except as a design reference.
- Faust (GRAME): a DSP language that compiles to WebAssembly via `faustwasm`, wrapped as AudioWorklet nodes; `<faust-editor>`/`<faust-widget>` web components exist. The strongest option for authoring a custom efficient synth/effect and shipping it as a self-contained wasm module.

- Lesson for us: we won't adopt these, but they mark the boundary — if native Web Audio node graphs ever prove too slow or too limited for a synth we want, hand-writing an AudioWorklet (optionally from Faust-generated wasm as a one-off, not a runtime dependency) is the escape hatch. The design principle to borrow is the AudioWorklet + wasm inner loop for anything DSP-heavy. See [audio-worklets-and-performance.md](audio-worklets-and-performance.md), [synthesis-recipes.md](synthesis-recipes.md).

## Elementary Audio — the functional audio graph

Elementary (`@elemaudio/core`, MIT; v4.0.x, December 2024; ~0.1 MB core) describes an audio graph as a pure function of application state and reconciles changes with a virtual-DOM-like diff, so `el.mul(el.cycle(440), 0.5)` is a value you render, and re-rendering with new state efficiently updates only the changed nodes. Runs on a web (wasm) renderer, offline, and native.

- Borrow: the declarative model — describe the desired audio graph as data derived from state, then diff against the running graph — is an elegant answer to the imperative-node-management mess you get building raw Web Audio by hand. Even a lightweight version (a function that maps composition state to a target node set, plus a small reconciler) would make an engine's synthesis layer far more maintainable and would make parameter changes glitch-free.
- Watch out: full reconciliation is nontrivial to build; adopt the *idea* (state → graph description → apply diff) proportionally to need, not the whole framework.
- Lesson for us: prefer a "render the graph from state" mental model over scattered `connect()`/`disconnect()` calls. See [engine-architecture.md](engine-architecture.md).

## Meyda — audio feature extraction in the browser

Meyda (MIT; v5.6.x, April 2024; small) extracts audio features in real time or offline from Web Audio: RMS/energy, spectral centroid/rolloff/flatness/spread, MFCCs, chroma, ZCR, perceptual loudness, and more, via an analyzer node (originally ScriptProcessor; AudioWorklet-compatible usage exists).

- Borrow: this is the direct model for *in-browser evaluation*. If the engine is to measure its own output — brightness (centroid), noisiness (flatness), loudness, harmonic content (chroma) — Meyda's feature set is the menu, and the algorithms are standard enough to reimplement the few we need. Feature extraction closes the improvement loop: render → analyze → score → adjust. See [computational-music-metrics.md](computational-music-metrics.md), [improvement-loop.md](improvement-loop.md), [listening-tests-and-feedback.md](listening-tests-and-feedback.md).
- Lesson for us: plan for an analysis path from the start (an offline render tapped by a small feature extractor), so quality can be measured programmatically, not only by ear.

## The no-dependency constraint: for and against

This is an open project decision ([project-open-questions.md](project-open-questions.md)); the honest ledger:

For staying vanilla:
- Bundle size and load time: the whole point of client-side generation is a page that loads and plays instantly; Magenta-scale downloads (megabytes) defeat that, and even Tone.js adds weight we mostly don't use.
- Longevity: `@magenta/music` (no release since 2021) and the general churn of the JS ecosystem show dependencies rot; a self-contained vanilla engine has no supply chain to break and will still run in a browser in ten years.
- Learning value: this project's purpose includes *understanding* the craft; reimplementing a scheduler, a theory module, and Euclidean rhythms teaches what a black-box import hides. The wiki is the memory of that learning.
- Control and transparency: no license entanglements (note Strudel's AGPL, RNBO's commercial terms), and every line is auditable — which matters for the "specificity and legible intention" argument in [what-makes-music-good.md](what-makes-music-good.md).
- Small surface: the primitives we actually need (lookahead scheduler, pure theory helpers, a few synth voices, basic effects, a feature extractor) are a few hundred lines total, well within scope.

Against (costs we accept):
- Reinvention risk: our hand-rolled scheduler/theory code will have bugs these libraries already fixed; we must test against known-good behavior (e.g., check interval math against Tonal's outputs).
- Opportunity cost: time spent rebuilding infrastructure is time not spent on composition quality; borrow algorithms aggressively (with attribution) rather than deriving from scratch.
- Ceiling: we forgo pretrained ML generation entirely; if a future engine wants learned models, the no-dependency stance would have to be revisited.

Current stance: vanilla, borrowing *designs and algorithms* (not code, and never copyleft code) from the libraries above. Revisit if a specific need (heavy DSP, learned models) makes a targeted, self-contained wasm module clearly worth it.

## Implications for generative engines

- Reimplement Tone's lookahead scheduler and musical-time Transport natively; build voices on raw `AudioNode`s. This is non-negotiable infrastructure — see [scheduling-and-timing.md](scheduling-and-timing.md).
- Build a pure, side-effect-free theory module in Tonal's shape (notes/intervals/scales/chords as data); validate its interval/enharmonic math against Tonal's outputs during development.
- Adopt Strudel's pattern-as-function-of-time model and a compact mini-notation string for authoring/logging rhythms and motifs; implement Euclidean rhythms (Bjorklund) natively.
- Keep a symbolic event representation between composition and synthesis (scribbletune lesson) so output is inspectable, MIDI-exportable, and unit-testable without audio.
- Model the synthesis layer as state → graph-description → diff (Elementary's idea) rather than ad-hoc `connect()`/`disconnect()`.
- Build an offline-render + feature-extraction path early (Meyda's feature menu) so the engine can measure brightness, loudness, noisiness, and harmonic content of its own output — the backbone of the improvement loop.
- Reserve AudioWorklet + wasm (Faust/Gibber lesson) for DSP-heavy voices only, as a self-contained escape hatch, not a runtime dependency.
- Do not copy code from AGPL (Strudel) or commercial (RNBO) sources; reimplement concepts; attribute algorithm sources in comments and in [log.md](log.md).

## Open questions

- Where exactly is the vanilla ceiling? Which single capability, if any, would justify importing or hand-porting a wasm module (heavy granular/physical-modeling synthesis? a learned melody model)?
- Is a full Elementary-style reconciler worth building, or does a minimal "rebuild the graph on structural change" suffice for our voice counts (≤3–4 real parts, per [auditory-perception-basics.md](auditory-perception-basics.md))?
- How faithfully should our mini-notation track Strudel's, to reuse its documentation/mental model, versus a simpler bespoke syntax?

## Related pages

- [web-audio-fundamentals.md](web-audio-fundamentals.md), [scheduling-and-timing.md](scheduling-and-timing.md) — the platform these libraries wrap
- [engine-architecture.md](engine-architecture.md) — where the borrowed patterns land
- [synthesis-recipes.md](synthesis-recipes.md), [audio-worklets-and-performance.md](audio-worklets-and-performance.md) — voice building and the wasm escape hatch
- [generative-music-design-patterns.md](generative-music-design-patterns.md), [rhythm-and-meter.md](rhythm-and-meter.md) — pattern algebra and Euclidean rhythm
- [computational-music-metrics.md](computational-music-metrics.md), [improvement-loop.md](improvement-loop.md) — Meyda-style self-evaluation
- [machine-learning-music.md](machine-learning-music.md) — the Magenta/ML context
- [harmony.md](harmony.md), [tuning-and-scales.md](tuning-and-scales.md) — what the theory module serves
- [project-open-questions.md](project-open-questions.md) — the no-dependency decision

## Sources

- Tone.js — repository and docs (MIT; Transport/scheduling design) — https://github.com/Tonejs/Tone.js ; version/size via npm registry (v15.1.22, 2025-04-27) — https://registry.npmjs.org/tone
- Chris Wilson, "A Tale of Two Clocks" (the lookahead scheduling pattern Tone uses) — https://web.dev/articles/audio-scheduling
- Tonal — repository (MIT; pure-function theory) — https://github.com/tonaljs/tonal ; npm (v6.4.3, 2026-01-18) — https://registry.npmjs.org/tonal
- Magenta.js `@magenta/music` — repository (Apache-2.0; TF.js models) — https://github.com/magenta/magenta-js ; npm (v1.23.1, last publish 2021-11-01, ~12 MB) — https://registry.npmjs.org/@magenta/music
- Strudel — mini-notation and pattern docs (AGPL-3.0; TidalCycles port) — https://strudel.cc/learn/mini-notation/ ; getting started — https://strudel.cc/workshop/getting-started/
- Gibber — repository (MIT; live-coding, genish/gibberish) — https://github.com/gibber-cc/gibber
- scribbletune — repository and docs (MIT; patterns→MIDI/Tone.js) — https://github.com/scribbletune/scribbletune
- WebPd — repository (LGPL/GPL; Pd→JS/wasm) — https://github.com/sebpiq/WebPd
- RNBO (Cycling '74) — docs (commercial; Max→C++/Web Audio export) — https://rnbo.cycling74.com/learn/welcome-to-rnbo
- Faust web deployment — GRAME docs (faustwasm/AudioWorklet) — https://faustdoc.grame.fr/manual/deploying/
- Elementary Audio — repository (MIT; functional graph, reconciliation) — https://github.com/elemaudio/elementary
- Meyda — docs (MIT; audio feature extraction) — https://meyda.js.org/
