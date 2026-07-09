---
title: Findings — the cantabile engine (Engine 04)
tags: [findings, implementation, craft, project]
status: reviewed
created: 2026-07-08
updated: 2026-07-08
summary: The project's fourth public engine and its first built around per-note EXPRESSION — four original synthetic instruments (aria/reed/wire/glass) that scoop, bend, swell, and vibrate each sustained note, driven by a per-note structural weight so the performance intensifies toward a composed climax; the continuous intra-note synthesis, the modal dramatic-arc composer, the original expression sliders, and the offline-render validation.
---

# Findings — the cantabile engine (Engine 04)

Engine 04 — **`cantabile@0.1.0`**, live at `docs/engines/04-cantabile/` and cataloged in the hub as Engine 04 — is the project's first engine built around the thing every previous engine could only approximate: **the expressive realization of an individual note**. It is inspired by the small groups Tom named — the string quartet, the jazz combo's saxophone, the rock lead guitar — whose power lives not in fast notes but in what a player does *while a single note sounds*: a scoop or slide into the pitch, a vibrato that blooms late, a swell and taper, a growl as they lean in, a fall on the release. The engine invents **four original synthetic voices** that share that continuous-control expressivity without imitating any real instrument, and — the load-bearing idea — makes their expression **track the composition's structure**, not per-note chance. Every structural claim here is backed by re-runnable in-repo code: `node experiments/tests/run.js` (**118 tests**, 13 of them for this engine) and `node experiments/tools/render-cantabile.mjs` (the offline audio gate, **25/25** across four seeds/modes/ensembles including a maximum-expression stress case).

## The gap this engine fills: notes with an inner life

Every voice in the shared [synth](shared-libraries.md) library before this engine set its pitch **once** (`osc.frequency.setValueAtTime`) and could not reshape the note afterward — perfect for struck and plucked timbres (electric piano, bell, pluck) and for slow pads, but structurally incapable of the gestures that make a bowed or blown or bent note expressive. Those gestures are all **continuous intra-note automation**: pitch that glides, vibrato that grows, amplitude that swells. So the first piece of work was a new class of voice.

The four expressive voices take a richer note object — `note.expr` (every field optional, defaulted) plus `note.pan` — and realize it through three shared helpers added to `synth.js`:

- **`pitchExpr`** automates each oscillator's `detune` param (cents, additive on top of a fixed base frequency, so the ensemble/chorus offset baked into `frequency` is never disturbed): an **onset glide** (a scoop from below, a fall from above, or a legato *portamento* from the previous note's pitch), an optional **release bend** (a sax-like fall / guitar release), and a **delayed, blooming vibrato** LFO summed into the same param (depth ramps in after a delay, rate lifts ~12% toward the note's end per Prame's singer measurements — [expressive-performance](expressive-performance.md)).
- **`exprEnv`** is an amplitude envelope with an intra-note **swell** (*messa di voce*): attack → rise into a peak partway through the note → ease to a sustain → release, all exponential ramps to **defined endpoints** (deterministic, identical in every browser) plus a final linear ramp to **true zero** (the anti-click discipline of [web-audio-fundamentals](web-audio-fundamentals.md)). A held note therefore *breathes*, which a fixed ADSR cannot do.
- **`breathLayer`** adds band-limited bow/breath noise (the "grain" of a real instrument), and **`panTo`** seats each voice in the stereo field (a small ensemble is spatially laid out — [effects-and-mixing](effects-and-mixing.md), streaming in [auditory-perception-basics](auditory-perception-basics.md)).

Because all pitch expression rides on `detune` and all amplitude expression is a gain envelope, the same control surface drives every expressive voice; the voices differ only in how they *generate* their tone.

## Four original voices, one expressive surface

The brief asked for four distinct instruments that share the expressivity, with the choice and combination varying by seed and user selection, and for **original** voices that do not imitate real instruments. The four (all in `synth.js`, all from stock Web Audio nodes):

- **`aria`** — saw + triangle through a resonant lowpass whose cutoff opens toward the swell peak ("bow pressure") and eases back. The warm middle voice, largest swell affinity.
- **`reed`** — a sawtooth split into a resonant "formant" bandpass (a nasal vowel peak) plus a flat body path; breath-forward. The reediest, most vocal.
- **`wire`** — two detuned saws through a soft-clip **overdrive whose drive blooms toward the note's peak** (grit that grows as the player leans in), then a resonant lowpass. Longest sustain, widest vibrato; the edgy electric lead.
- **`glass`** — a sine fundamental plus two faint shimmered partials, softly lowpassed, with a breath chiff; the clearest, most crystalline voice (a continuous-pitch instrument in the musical-saw/theremin family in *spirit*, imitating none). Gentle, slow vibrato.

Each also carries an **expressive personality** in the performer (`TIMBRE` profiles: scoop/vibrato magnitudes, breath affinity, default stereo seat), so the same slider settings still read differently per voice — `wire` bends and growls most, `glass` is purest, `reed` breathiest, `aria` the warmest swell. A deterministic per-seed shuffle assigns which voice **leads**, which **partners** (answers), and which sits **inside** as sustained color; the user can override lead and partner (or choose a solo lead). Over many seeds all four lead; a test asserts it. Two less-expressive support voices — a new **`pluck`** (soft plucked-harmonic comp/arpeggio) and the existing `bass` — are the deliberate steady foil to the singing leads ([timbre-and-orchestration](timbre-and-orchestration.md) foreground/background).

## Expression tied to structure, not chance

The central design claim — and the correction to "mechanical performance" that this whole project exists to fix ([previous-experiments-lessons](previous-experiments-lessons.md), [expressive-performance](expressive-performance.md)) — is that **expression is structural**. The composer (`experiments/composers/expressive-chamber.js`) is therefore built to hand the performer structure to express:

- **An original modal genre, shaped as a dramatic arc.** Six lyrical modes (dorian, aeolian, lydian, mixolydian, phrygian, harmonic minor), non-functional / plagal harmony (no V–I cadences — those are Engine 01's), and a seven-section form: **intro · theme · dialogue · rise · climax · return · coda**, with a rising-then-falling **intensity** target per section (a test asserts the arc rises to a `1.0` climax and falls after it). The **dialogue** section trades two-bar phrases between the lead and partner (call-and-response); the **rise** fragments and sequences the motif upward; the **coda** is a real modal close on a long, held, swelling tonic (R6 — [form-and-structure](form-and-structure.md); a test asserts exactly one held tonic ending note).
- **Motivic economy.** A germ motif (a rhythm + an opening contour) generated per seed seeds most phrases, so the piece coheres ([composition-craft](composition-craft.md), [melody](melody.md)).
- **A per-note structural `weight` (0..1).** The composer stamps every note with how much expression it has *earned* — from metric position, note length, phrase-arch position, and whether it is a phrase apex, a phrase goal, or in the climax. This is the interface between composition and performance.

The performer (`experiments/engines/cantabile/engine.js`) then computes a per-note **drive** = `Expression × weight × (0.5 + 0.7 · Ardor · sectionIntensity)`, and scales every gesture by it: scoop/portamento depth, vibrato depth, swell amount, brightness, and (for `wire`) grit. The consequence is exactly the brief's "expression realized … in relation to the overall melodic and compositional structure": measured over a rendered piece, the **climax notes carry ~3–4× the vibrato depth and markedly higher brightness of the intro notes** (a test asserts climax > intro for both), and turning **Ardor** up widens that gap (a test asserts it). The macro shape of the performance *is* the tension arc.

## Original expression sliders

The brief asked for original parameters for the "type and degree of expressivity." The engine exposes a master plus four named axes (headline four in the simple panel, the rest under Advanced), each mapping to a distinct expressive mechanism rather than a generic mix control:

| Slider | What it controls | Mechanism |
|---|---|---|
| **Expression** | master depth — "played straight" ↔ "highly expressive" | scales the whole `drive` (a KTH global-*k* analog — [expressive-performance](expressive-performance.md)) |
| **Song** | how vocal the pitch is | scoop and portamento depth on the `detune` glide |
| **Bloom** | how a held note develops | vibrato depth growth + amplitude swell (*messa di voce*) |
| **Ardor** | how dramatic the arc is | how strongly `sectionIntensity` lifts drive, brightness, grit, vibrato at peaks |
| **Rubato** | timing breath | phrase-arch tempo depth + a laid-back lead lag + a small correlated residual |
| **Grain** | breath/bow/air texture | the `breathLayer` amount and a brightness/grit floor |

A test confirms the gating is honest: at `Expression = 0` the render has **no vibrato and no scoops** (played straight); at `1` with `Song`/`Bloom` up, real pitch inflection and vibrato appear.

## The audible layer and mix

The engine reuses the shared `synth`/`fx` libraries; the only library change is **additive** (the five new voices + expression helpers in `synth.js`) — `fx.js` is untouched, so engines 01–03 are byte-for-byte unaffected (they keep their own vendored copies; a check confirms their `synth.js` has none of the new voices). Rather than add buses, the engine routes the expressive voices through the existing **melody** bus (leads), `pluck` through the **chord** bus, and `bass`/comp through their buses, and does its stereo seating **inside** each voice (a `StereoPanner` per note). The master chain is a warm medium plate (2.8 s IR, moderate damping) so the voices have space to sing. Offline render across four cases (seed-picked, dark/low, luminous, and a maximum-expression stress test): **peak ≤ 0.63** (no clip), **max sample step ≤ 0.09** (cleaner than Engine 01's FM lead — the smooth filtered voices and true-zero tails), **RMS a consistent ≈ −16 dBFS** (background-quiet), no silent gap, zero console errors.

## v0.2 — the improvement pass

Tom listened to v0.1 and named three things to improve; all three were addressed in **v0.2** (additive, engine-04-local — shared voices `bass`/`rhodes` and `fx.js` untouched, so engines 01–03 stay byte-for-byte the same):

- **The plucked comp and bass were boring — "notes of the same length and the same interval."** The v0.1 comp was a single metronomic ascending arpeggio of equal-length notes, and the bass a bare root on beat 1, every bar. The composer's harmonic bed was rewritten around **per-seed comping templates** (broken chord, bass-chord "boom-chick," syncopated stabs, a flowing mixed-length arpeggio, sustained pad) chosen per bar from a section-appropriate set and never repeated two bars running, with **inter-chord voice leading** (each bar's voicing chosen nearest the previous one, so the bed moves smoothly rather than jumping) and a **varied bass** (root/fifth alternation, octave motion, walking approach tones into the next chord, anticipations, rhythmic variety). Density tracks the section (sparse in intro/coda and under the dialogue's call-and-response, more active in rise/climax) and levels stay low — comp velocity ≈ 0.32 against the leads' ≈ 0.65 — so the bed supports without ever covering the singing voices ([timbre-and-orchestration](timbre-and-orchestration.md) foreground/background). Comp onsets per bar went from a fixed 1 or 4 to a 2–8 range with nine distinct note durations; the bass gained eight distinct durations and pitch-class roles.
- **The lead voices sounded very much like synthesized tones.** This is a general problem for the project, so the diagnosis and cure were written up as their own page — [original-sound-design](original-sound-design.md) — and three of its techniques were added to the four expressive voices as additive `synth.js` helpers: **`microDrift`** (a few cents of slow, quasi-random pitch wander, always on, because a real instrument's pitch is alive even "played straight" — the single strongest fix), **`bodyResonance`** (a fixed per-voice `peaking`-filter formant body that does *not* track pitch — the cue that a physical object is resonating), and **`onsetTransient`** (a short per-voice attack noise — bow scratch for `aria`, breath chiff for `reed`, pick click for `wire` — the transient that identifies an instrument). All deterministic and browser-identical; the render stayed clipping-free and click-safe.
- **The phrasing could be more vocal.** Lead lines now segment into **breath-delimited, motif-seeded sub-phrases** (2–3 bars, each opening from the germ motif and landing on a resting goal tone tagged `breath`), and the performer realizes each breath as a real **silence** (it releases the phrase-final note a little early — a lift, not a clip — scaled by Rubato), **blocks portamento across a breath** so the next phrase starts on a fresh onset, adds a small **agogic hesitation** entering a new phrase (a breath takes time), and eases the dynamics down into the breath. The result is the breathing pauses and unified phrases the singing-style genre asks for ([phrase-structure](phrase-structure.md), [expressive-performance](expressive-performance.md) punctuation).

## Implications for generative engines

1. **Continuous intra-note control is a synthesis primitive worth building once and reusing.** The `note.expr` → `pitchExpr`/`exprEnv` pattern (pitch on additive `detune`, amplitude as a swelling gain, all ramps to defined endpoints) is the reusable core; any future "singing" voice can adopt it. It composes cleanly with the existing fire-and-forget voice model.
2. **A per-note structural weight is the right interface between a composer and an expressive performer.** It lets the composer own "what matters" and the performer own "how to show it," keeping them separately testable ([engine-architecture](engine-architecture.md)) while guaranteeing expression is structural, not random — the [expressive-performance](expressive-performance.md) mandate, made measurable.
3. **Give the user the expression, not just the mix.** Sliders named for musical behaviors (Song, Bloom, Ardor, Rubato, Grain) are more legible and more fun than generic knobs, and they map one-to-one onto distinct mechanisms, so they stay independent.
4. **Slow, sparse, sustained textures expose synthesis** (the lesson from Engine 02's "static") — but here that exposure is the *point*: a slow expressive line showcases exactly what a fast line would hide, so the engine leans into moderate tempo and long notes rather than fighting them.
5. **Confirm the transferred rules by ear.** Phrase arch, vibrato bloom, and swell are validated offline as clean and structural; whether the *magnitudes* (scoop cents, vibrato depth, laid-back lag) sit in the tasteful range on real timbres is a listener question, exactly the open transfer question [expressive-performance](expressive-performance.md) flags.

## Open questions

- **Do the four voices read as genuinely distinct and expressive to the ear**, or do the shared control surface and the melody-bus routing blur them? (If they blur, per-voice buses / EQ are the next step.)
- **Are the default slider magnitudes tasteful?** The render proves they are *safe* (no clip/click) and *structural*; only listening tells whether e.g. `Song ≈ 0.5` scoops are singing or seasick. Ship gentle, A/B via the feedback JSON.
- **Portamento correctness.** Legato glide currently fires between any same-role notes ≤ 5 semitones apart within half a beat; whether that matches where a real player would slur (vs re-articulate) needs an ear.
- **Is the coda's held final note long enough to feel like an ending** without dragging? The render shows a 1.5–1.9 s low-energy tail — musical space or a dropout? A listener check.
- **Does the dialogue section's call-and-response come across as two players in conversation**, or just as one line with gaps?

## Related pages

- [expressive-performance](expressive-performance.md) — the rule system and deviation magnitudes this engine operationalizes
- [engine-architecture](engine-architecture.md) — the composer/performer/synth boundaries; the per-note-weight interface extends its schema
- [timbre-and-orchestration](timbre-and-orchestration.md) — why four voices read as distinct; foreground/background
- [melody](melody.md), [composition-craft](composition-craft.md), [form-and-structure](form-and-structure.md) — the motif, arc, and real-ending craft
- [tuning-and-scales](tuning-and-scales.md), [harmony](harmony.md) — the modal, non-functional harmonic language
- [findings-tonal-classical-engine](findings-tonal-classical-engine.md), [findings-ambient-drift-engine](findings-ambient-drift-engine.md), [findings-groove-lofi-engine](findings-groove-lofi-engine.md) — the sibling engines and the shared synth/fx they extend
- [shared-libraries](shared-libraries.md), [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the libraries this engine vendors and extended

## Sources

- Design distilled from the wiki pages linked above (chiefly [expressive-performance](expressive-performance.md) — KTH rule system, phrase arch, final ritardando, vibrato bloom, structured-not-random microtiming; Prame 1994 for vibrato rate rising toward note ends). The engine, its four voices, the composer, the structural-weight interface, and the expression sliders are original to this project; all quantitative claims (test counts, render metrics, the climax-vs-intro expression ratios) are produced by the in-repo `experiments/tests/run.js` and `experiments/tools/render-cantabile.mjs`, re-runnable from the repo.
