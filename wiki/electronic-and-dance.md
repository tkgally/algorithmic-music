---
title: Electronic and dance music
tags: [genre]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: EDM as a grid-locked, layer-based, drop-driven form — its 8/16/32-bar phrasing, tension-engineering toolkit, subgenre map, and why it is unusually amenable to algorithmic generation.
---

# Electronic and dance music

Electronic dance music (EDM, used here broadly for four-on-the-floor and breakbeat club styles) is the genre family most naturally suited to algorithmic generation: it is built on a quantized grid, arranged by adding and removing layers, and organized into a small vocabulary of formulaic sections. Its emotional peaks are openly engineered — the drop is a designed payoff for a build-up of expectation. This page extracts the generative principles: phrase structure in powers of two, the tension-engineering toolkit (risers, filter sweeps, snare rolls, silence), the sound-design conventions (sidechain pumping, sub-bass discipline, supersaws), a subgenre map, and the loop-plus-mute-automation workflow. It also marks where human producers add the roughly 10% that formulas cannot.

## Structure: phrasing in powers of two

EDM is metrically regular to an extreme. Tracks are almost always in 4/4 and phrased in **8-, 16-, and 32-bar** units; arrangement decisions land on those boundaries. Mark Butler's *Unlocking the Groove* (2006) analyzes how techno and house build **multimeasure patterns** and **hypermeter** — 8- and 16-bar groupings that function as higher-level "measures" — out of short looped cells. Butler's central claim is that these grooves support **interpretive multiplicity**: metrically ambiguous passages invite the listener to actively *construe* the meter (his term is "metering") rather than receive it passively, and that active participation is part of the music's appeal. He also notes techno's frequent "rejection of harmonic patterning" and consequent "total lack of cadences" — closure comes from rhythm and texture, not chord progression.

The canonical arrangement is a cycle of section types:

- **Intro** — drums and a few elements, DJ-friendly, often 16–32 bars.
- **Build-up** — rising tension: risers, filter opening, snare rolls, additive layering.
- **Drop / core** — the release: full kick and bass return, maximum energy.
- **Breakdown** — energy removed (often no kick), harmonic/atmospheric, sets up the next build.

Robert Smith's *Music Theory Online* study distinguishes **discrete** processes (a layer entering or exiting, a beat dropping out) from **continuous** processes (pitch slides, crescendos, filter sweeps, accelerandos) and shows contemporary EDM leans heavily on the continuous kind to steer the listener through these "emotional waves."

## Tension engineering and the drop

The build-and-drop is the genre's signature expectation device (see [musical-expectation](musical-expectation.md) and [tension-and-release](tension-and-release.md)). Ragnhild Solberg's "Waiting for the Bass to Drop" (2014) correlates specific production techniques with intense emotional response, framed through Huron's ITPRA theory of expectation. The reliable ingredients:

- **Risers / uplifters ("soars")** — ascending pitch or filtered-noise sweeps over the final 4–16 bars of a build.
- **Snare / drum rolls** — accelerating subdivision (8ths → 16ths → 32nds) that raises event density toward the drop.
- **Filter sweeps** — opening a low-pass cutoff to brighten and "lift" the whole mix.
- **White-noise crescendo** — a broadband riser adding energy without pitch commitment.
- **Bass and kick removal, then reintroduction** — stripping the low end during the build so its return at the drop is maximally felt.
- **A pre-drop pause / "the cue"** — a brief silence or a 1–4-beat anacrustic hit right before the drop. Momentary silence sharpens the prediction and makes the payoff land harder.

The drop works because it resolves a deliberately inflated expectation: the build tells the listener exactly what is coming and roughly when, and the payoff arrives on a strong hypermetric boundary. This is engineered anticipation, not surprise.

## Rhythmic families and sound design

Two rhythmic lineages organize most of the field:

- **Four-on-the-floor** — kick on every beat (house, techno, trance). Steady, hypnotic, dancer-locked.
- **Breakbeat** — syncopated, sampled/programmed break patterns (drum and bass, jungle, breaks, much of dubstep's half-time feel). Butler treats the four-on-the-floor/breakbeat split as a primary rhythmic and cultural divide.

Core sound-design conventions:

- **Sidechain compression ("pumping")** — the kick's envelope ducks the volume of pads and bass, carving rhythmic space for the low end and producing the characteristic breathing/pumping motion. A release of roughly a quarter- to eighth-note at the track tempo gives the classic pump.
- **Sub-bass management** — one bass element at a time in the low end, summed to mono below ~100–120 Hz to keep it solid on club systems; the kick and bass are arranged (by sidechain or note timing) not to fight.
- **Supersaw and detuned stacks** — multiple slightly detuned sawtooth oscillators create the wide, shimmering leads and pads of trance and big-room; detune spread and voice count set the width.

Synthesis and mixing detail live in [synthesis-recipes](synthesis-recipes.md) and [effects-and-mixing](effects-and-mixing.md).

## Subgenre map

Tempo plus drum feel plus bass/sound palette identifies a subgenre better than any single cue. Approximate, contested ranges (DJ/production references disagree at the edges):

| Subgenre | Tempo (BPM) | Rhythm | Defining sound |
|---|---|---|---|
| House | 115–130 | Four-on-the-floor | Warm kick, off-beat hats, soul/piano stabs, vocal hooks |
| Techno | 125–150 | Four-on-the-floor | Machine timbres, minimal harmony, hypnotic repetition |
| Trance | 130–150 | Four-on-the-floor | Supersaw leads, euphoric breakdowns, arpeggios |
| Drum & bass | 160–180 | Breakbeat | Fast breaks, half-time sub-bass, rolling energy |
| Dubstep | 135–145 (~140) | Half-time breakbeat | Wobble/growl bass, sparse heavy drops |
| Downtempo / trip-hop | 60–100 | Backbeat/broken | Relaxed grooves, dusty samples, space |
| IDM | variable | Irregular/glitch | Complex programming, non-grid rhythms, texture focus |

IDM is the deliberate exception that proves the rule: it earns interest by *breaking* the grid and formula the rest of the family depends on.

## Loop-based composition workflow

EDM is typically composed as loops, not linear scores. The producer builds 1-, 2-, or 4-bar loops for each element (kick, bass, hats, chords, lead, riser, FX) and then *arranges by muting and unmuting* those layers across 8/16/32-bar sections, plus automating a few continuous parameters (filter cutoff, reverb send, volume). Arrangement is, to a first approximation, a timeline of which layers are active and how a handful of automations move. This maps almost directly onto a generative architecture: a bank of pattern generators plus a section timeline plus automation envelopes. See [form-and-structure](form-and-structure.md).

## Why EDM is amenable to generation (and the human 10%)

Three properties make EDM tractable:

- **Grid-locked** — everything quantizes to a 16th-note grid at a fixed tempo, so timing is a solved problem (see [scheduling-and-timing](scheduling-and-timing.md)).
- **Layer-based** — texture is controlled by adding/removing stems, an operation trivial to automate.
- **Formulaic form** — the intro/build/drop/breakdown cycle on power-of-two boundaries is close to a deterministic template.

What producers add that formula does not capture — the non-formulaic remainder — is real and is where tracks live or die: the *sound design* (a signature bass patch), the exact shape and timing of automation curves, the "ear" for when to break the grid or hold a build one bar longer, ghost-note and swing detail, the single track-defining hook, and the final mix/master. An engine can generate a competent, in-genre track from the formula; making it feel authored rather than generated is the hard part. See [generative-music-failure-modes](generative-music-failure-modes.md).

## Implications for generative engines

- **Default to 4/4 at a subgenre-appropriate tempo:** ~124–128 BPM for house/techno, ~138 for trance/dubstep, ~174 for DnB. Lock the whole piece to one tempo and a 16th-note grid.
- **Phrase everything in powers of two.** Sections are multiples of 8 bars (commonly 16 or 32). Trigger arrangement changes only on 8/16/32-bar boundaries; this alone makes output read as "correct."
- **Model arrangement as a layer-activation timeline plus automation envelopes**, not as note-by-note composition. Keep a bank of 1–4-bar loop generators and mute/unmute them per section.
- **Implement the build explicitly:** over the last 8–16 bars before a drop, ramp a riser upward, open a low-pass filter, accelerate a snare roll from 8ths to 16ths to 32nds, and drop the kick/bass out; insert a 1-beat (or up to 1-bar) gap immediately before the drop, then re-enter full on the downbeat.
- **Sidechain pads and bass to the kick** with a fast attack and ~1/8–1/4-note release; sum sub-bass to mono below ~120 Hz and allow only one element in the low end at a time.
- **Put the human 10% under user or seed control:** expose sound-design choices, automation-curve shapes, and a "grid-break" amount so pieces vary beyond the template. Seed the RNG for reproducibility.
- **Prefer rhythmic/textural closure over harmonic cadence.** Many subgenres (techno especially) have no cadences; end sections by subtraction and filtering, not by a V–I.

## Open questions

- How much harmonic movement does each subgenre tolerate before it stops sounding like the genre? Techno wants near-static harmony; trance wants clear progressions.
- Can an engine learn to place the "break the grid" moments that distinguish authored tracks, or must those be hand-authored per style pack?
- Where does functional/background use (see [attention-and-background-listening](attention-and-background-listening.md)) sit for EDM — downtempo and minimal techno work as background; big-room and DnB do not.

## Related pages

- [musical-expectation](musical-expectation.md) — the prediction the drop exploits
- [tension-and-release](tension-and-release.md) — build/drop as tension curve
- [rhythm-and-meter](rhythm-and-meter.md) and [groove-and-embodiment](groove-and-embodiment.md) — the grid and its feel
- [synthesis-recipes](synthesis-recipes.md) and [effects-and-mixing](effects-and-mixing.md) — supersaws, sub-bass, sidechain
- [form-and-structure](form-and-structure.md) — section timelines
- [ambient-and-generative-genre](ambient-and-generative-genre.md) — the low-energy neighbor
- [style-and-genre-overview](style-and-genre-overview.md) — the genre hub

## Sources

- Mark J. Butler, *Unlocking the Groove: Rhythm, Meter, and Musical Design in Electronic Dance Music* (2006); reviewed by Wayne Marshall, *Music Theory Spectrum* 31 (2009) — https://wayneandwax.com/academic/mts-butler-unlocking-groove.pdf
- Ragnhild Torvanger Solberg, "'Waiting for the Bass to Drop': Correlations Between Intense Emotional Experiences and Production Techniques in Build-up and Drop Sections of EDM," *Dancecult* 6(1) (2014) — https://dj.dancecult.net/index.php/dancecult/article/view/451
- Robert Smith, "Continuous Processes in Contemporary Electronic Dance Music," *Music Theory Online* 27.2 (2021) — https://mtosmt.org/issues/mto.21.27.2/mto.21.27.2.smith.html
- Ableton, "Tempo and genre" (Learning Music) — https://learningmusic.ableton.com/make-beats/tempo-and-genre.html
- ZIPDJ, "EDM BPM: The Ultimate Guide for DJs" (2026) — https://www.zipdj.com/blog/edm-bpm
