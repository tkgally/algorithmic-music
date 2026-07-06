---
title: Tuning and scales
tags: [theory]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Tuning systems and scale construction across cultures — 12-TET vs just intonation, roughness and harmonicity models of consonance (with their cultural limits), tonal hierarchies, and how to realize any tuning in Web Audio via cents.
---

# Tuning and scales

Web Audio can produce any frequency, so this project is not locked to the piano's 12 equal-tempered pitches — but every scale choice carries perceptual consequences (beating, roughness, learned hierarchies) and cultural meaning. This page covers the physics and psychology of tuning, the main scale systems an engine might target across cultures, why a scale is a *hierarchy* rather than a pitch set, and the two-line code needed to use all of it in a browser.

## 12-TET, just intonation, and beating

12-tone equal temperament divides the octave into 12 steps of exactly 100 cents (frequency ratio 2^(1/12) ≈ 1.05946). Conversion formulas every engine needs: f = 440 × 2^((m−69)/12) for MIDI note m; an interval of c cents scales frequency by 2^(c/1200).

Just intonation (JI) instead builds intervals from small whole-number ratios, aligning partials of harmonic tones so no beating occurs: octave 2:1 (1200.0¢), perfect fifth 3:2 (702.0¢), fourth 4:3 (498.0¢), major third 5:4 (386.3¢), minor third 6:5 (315.6¢), major sixth 5:3 (884.4¢). 12-TET approximates these with errors that are inaudible for fifths but plainly audible for thirds (Wikipedia "Equal temperament"): P5 −1.96¢, P4 +1.96¢, M3 +13.69¢, m3 −15.64¢, m7 −17.60¢ (vs 9:5). A mistuned interval between harmonic tones beats at the difference frequency of its near-coincident partials — a 12-TET major third C4–E4 beats noticeably (~10 Hz among upper partials), which is the slightly restless shimmer of equal-tempered pianos and organs.

Why not just use JI everywhere? Commas: stacking pure intervals doesn't close the circle — 12 pure fifths overshoot 7 octaves by the Pythagorean comma (23.5¢), and the syntonic comma 81:80 (21.5¢) separates, e.g., a pure-third-derived D from a fifths-derived D. Fixed JI therefore favors one key and breaks under modulation (wolf intervals) (Wikipedia "Just intonation"). Software escapes the fixed-pitch constraint: an engine can retune adaptively, giving pure verticals while tracking key — with the caveat that naive adaptive JI drifts in pitch over time (see Open questions).

## Consonance and dissonance: roughness, harmonicity, culture

Three partly competing accounts, all relevant to synthesis choices:

- Roughness (Helmholtz → Plomp & Levelt 1965): two pure tones sound smooth when (nearly) unison or widely separated, and rough in between; maximum roughness occurs at about a quarter of a critical bandwidth separation. Complex-tone dissonance ≈ sum of roughness over all partial pairs; for harmonic timbres this yields consonance valleys exactly at small-integer ratios (Plomp & Levelt 1965; Scheidegger explainer). Two engine-critical corollaries: (1) roughness is register-dependent — critical bands are wide at low frequencies, so a minor third at C2 is rough while the same interval at C5 is smooth (this is the classical "low interval limit"); (2) consonance is timbre-dependent — with inharmonic partials (bells, some FM patches) the valleys move, so scale and timbre can be co-designed (Sethares' program; flagged, not yet verified — see Open questions).
- Harmonicity: preferences track how well a chord's spectrum resembles a single harmonic series, not just its roughness; McDermott and colleagues (2010) found individual consonance preferences correlate with harmonicity preferences rather than roughness aversion (summarized in Lahdelma et al. 2022).
- Culture: the Tsimane', an Amazonian society with minimal exposure to Western music, rated consonant and dissonant chords as equally pleasant, while Bolivian city dwellers showed modest and US listeners (musicians most) strong consonance preferences — a graded effect of Western exposure. Crucially, Tsimane' listeners disliked acoustic roughness about as much as everyone else and shared preferences for non-musical sounds (laughter over gasps); discrimination was intact (McDermott et al. 2016; MIT News summary). Lahdelma, Eerola & Armitage (2022) push further, arguing that measured "harmonicity preference" may itself be familiarity with Western tonal idiom.

Working conclusion for this project: roughness aversion is the near-universal, physics-grounded lever; preference for consonant *harmony* is substantially learned and style-dependent. Control roughness deliberately; treat consonance targets as a style parameter, not a universal good. See [pleasure-and-reward.md](pleasure-and-reward.md) and [musical-universals.md](musical-universals.md).

## Temperament history in one paragraph

Pythagorean tuning (pure fifths, harsh 408¢ major thirds) served medieval music; meantone temperaments (16th–17th c.) narrowed fifths to gain near-pure thirds but left unusable wolf intervals in remote keys; well temperaments (18th c., Bach's era) made all keys usable with distinct "colors"; 12-TET, which spreads the comma equally so every key is identically (and mildly) impure, was adopted gradually and became the Western standard through the 19th century, fitting keyboard design and free modulation (Wikipedia "Equal temperament"). Engines can treat historical temperaments as selectable cent-offset tables for period flavor.

## Stretched tuning on pianos

Real piano strings are stiff, so their partials run sharp of exact harmonics (inharmonicity). Tuners align octaves to actual partials rather than theoretical frequencies, producing the Railsback curve: octaves stretched, treble tuned progressively sharp and bass progressively flat relative to mathematical 12-TET, reaching tens of cents at the extremes (Wikipedia "Railsback curve"). Implication: perfectly harmonic synthesized tones need no stretch — stretch is a property of inharmonic timbre, not of good tuning. If a Web Audio piano patch models inharmonicity, stretch the tuning to match; if oscillators are harmonic, don't.

## Scales across cultures

Scales worldwide are mostly 5–7 tones per octave, unequal steps being the norm rather than the exception. A tour of systems this project targets (each links to its tradition page):

- Pentatonic scales are globally widespread — anhemitonic major pentatonic (C D E G A) and its modes appear across East Asia, Africa, the Andes, and Anglo-American folk. Five tones with no semitones minimizes roughness among any chord subset, making pentatonics nearly "error-proof" for generative layering.
- Heptatonic diatonic: the Western major/minor and church-mode system; steps of 1–2 semitones, asymmetric pattern enabling position-finding (every degree hears unique interval relations to the tonic). See [harmony.md](harmony.md).
- Maqam (Arab world): theory frames a 24-quarter-tone (50¢) gamut, but the quarter tone is never a melodic step; scales are heptatonic, built from tetrachords (ajnas), with the neutral second (~150¢) as the characteristic interval — e.g., maqam Rast ≈ 0, 200, 350, 500, 700, 900, 1050¢. Over 70 maqamat exist; measured performance deviates flexibly from exact 24-TET (Wikipedia "Arab tone system").
- Indian raga: theory names 22 shrutis per octave built from ratios 256:243 (90¢), 25:24 (70¢), and 81:80 (22¢), from which 7 svaras are selected; but the 22-division is contested, and measurement studies find intonation "neither rigidly fixed nor randomly varying" — artists differ on the same raga (Wikipedia "Shruti (music)"). A raga is far more than its scale (ascent/descent rules, characteristic phrases, note hierarchies); see [indian-classical-music.md](indian-classical-music.md).
- Gamelan (Java/Bali): slendro = 5 roughly equal steps (~240¢ each); pelog = 7 markedly unequal steps (sometimes approximated as a subset of 9-TET) of which 5-tone subsets are used in practice. No two gamelans share exact tuning — the tuning belongs to the ensemble, not a standard; Balinese paired instruments are deliberately detuned a few Hz apart to beat (ombak shimmer) (Wikipedia "Slendro", "Pelog"). See [gamelan.md](gamelan.md).
- Japan: the in (miyako-bushi) scale — 1, b2, 4, 5, b6 (e.g., E F A B C) — is the semitone-flavored koto/shamisen pentatonic, organized around nuclear tones a fourth apart; the yo scale (2 3 5 6 8 pattern, no semitones) is its folk counterpart (Wikipedia "In scale"). See [east-asian-traditions.md](east-asian-traditions.md).

Design lesson: a scale system = pitch set + hierarchy + melodic grammar + intonation practice. Borrowing only the pitch set (e.g., "pentatonic = Chinese") produces exotic kitsch, not the tradition's music.

## Scales as hierarchies, not sets (Krumhansl profiles)

Listeners internalize graded stability for each scale degree. Krumhansl & Kessler's probe-tone experiments (1982) quantified this: after a key-establishing context, listeners rated how well each of the 12 chromatic tones fit. Major-key profile (C major, C first): 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88 — tonic highest, then 5̂ (5.19), 3̂ (4.38), then other diatonic degrees, chromatic tones lowest. Minor-key profile (C minor, C first): 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17 — note b3̂ (5.38) outranking 5̂ (4.75) (values via rnhart.net key-finding article). The Krumhansl–Schmuckler algorithm exploits this: correlate a passage's duration-weighted pitch-class distribution against all 24 rotated profiles; the best correlation is the perceived key — which an engine can run on its own output as a sanity check. Hierarchy, more than set membership, is what makes a tonic *felt*; melodies that end phrases on high-profile tones sound anchored ([musical-expectation.md](musical-expectation.md), [melody.md](melody.md)).

## Microtonality in Web Audio

Any frequency is directly available: `osc.frequency.value = f` — tuning is a lookup table, not a hardware constraint. The `detune` AudioParam on OscillatorNode (and AudioBufferSourceNode) applies a cent offset on top of `frequency`: computed frequency = frequency × 2^(detune/1200); e.g., detune = +100 turns 440 Hz into ~466 Hz (MDN). Practical pattern:

```js
// scale as cents-from-root; works for any system above
const slendro = [0, 240, 480, 720, 960];
const rastish = [0, 200, 350, 500, 700, 900, 1050];
const freq = (root, cents) => root * Math.pow(2, cents / 1200);
```

Two oscillators at `freq(f, 0)` and `f + 4` (Hz, not cents) give gamelan-style ombak beating at 4 Hz. JI is a ratio table (`[1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8]`) times a root frequency. Detune everything ±3–8¢ randomly per voice for chorus warmth. See [web-audio-fundamentals.md](web-audio-fundamentals.md) and [synthesis-recipes.md](synthesis-recipes.md).

## Implications for generative engines

- Default: 12-TET via f = 440 × 2^((m−69)/12); it is the only system that supports free modulation with one static table, and Western-genre output should use it.
- For drone/pad-heavy, slow-harmonic-rhythm styles (ambient, gamelan-ish, raga-ish), prefer JI ratios over the drone: pure 3:2 and 5:4 against a sustained root are audibly calmer than tempered ones, and there's no modulation to break ([ambient-and-generative-genre.md](ambient-and-generative-genre.md)).
- Implement a Plomp–Levelt roughness scorer over the actual synthesized partials (the engine knows its timbres exactly — an advantage acoustic composers never had). Use it to: enforce register-dependent spacing (wider intervals below ~C3); voice chords toward a target roughness; and re-derive usable intervals when using inharmonic timbres.
- Treat roughness as the universal control dial; treat consonance/tonal-hierarchy conformity as a style dial. For "background-safe" music, keep roughness low and hierarchy conformity high; for attentive-listening styles, spend both more freely ([attention-and-background-listening.md](attention-and-background-listening.md), [complexity-and-preference.md](complexity-and-preference.md)).
- Encode every scale as {cents[], hierarchyWeights[], grammar}: use Krumhansl weights (normalized) as sampling priors for Western sets, and require phrase-final notes to have weight above a threshold. For non-Western systems, derive provisional weights from the tradition's own theory (e.g., maqam tonic/ghammaz, raga vadi/samvadi) rather than reusing Western profiles.
- Concrete tables to ship: major/minor Krumhansl profiles (above); slendro [0,240,480,720,960]; a pelog-like set (e.g., [0,120,270,540,670,785,950] as one ensemble's flavor — vary per "ensemble," since real gamelans differ); rast-style [0,200,350,500,700,900,1050]; in scale [0,100,500,700,800]; JI major [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8]. Add per-voice random detune ±3–8¢; for gamelan patches, pair voices detuned 3–6 Hz.
- Do not add piano-style stretched octaves to harmonic synth timbres; do stretch if modeling string inharmonicity.
- Microtonal systems come bundled with melodic grammars — implement the grammar (tetrachord focus, characteristic phrases, drone anchoring) or the tuning alone will sound like a detuned mistake ([generative-music-failure-modes.md](generative-music-failure-modes.md)).

## Open questions

- Adaptive JI drift: retuning verticals purely can walk the global pitch center down (comma pump). Options: anchor to a drone, snap phrase starts back to 12-TET anchors, or accept drift as a feature. Needs an experiment.
- Sethares' timbre↔scale matching (retune inharmonic timbres' scales to their partials) is cited everywhere but was not verified from a primary source here; ingest "Tuning, Timbre, Spectrum, Scale" and test with a Web Audio FM patch.
- Probe-tone-style hierarchies reportedly exist for North Indian rag and Balinese contexts (Castellano/Krumhansl lineage) — not read; would give non-Western hierarchyWeights an empirical basis.
- What detune spread (cents) reads as "warm ensemble" vs "out of tune" for sustained synth pads? Cheap listening test for [listening-tests-and-feedback.md](listening-tests-and-feedback.md).

## Related pages

- [auditory-perception-basics.md](auditory-perception-basics.md) — critical bands, beats, virtual pitch
- [gamelan.md](gamelan.md) — slendro/pelog in musical context
- [indian-classical-music.md](indian-classical-music.md) — shruti, raga intonation practice
- [east-asian-traditions.md](east-asian-traditions.md) — in/yo scales and heterophony
- [musical-universals.md](musical-universals.md) — what actually generalizes across cultures
- [harmony.md](harmony.md) — chord syntax atop Western scales
- [web-audio-fundamentals.md](web-audio-fundamentals.md) — oscillators, detune, scheduling
- [synthesis-recipes.md](synthesis-recipes.md) — timbres whose partials interact with tuning
- [musical-expectation.md](musical-expectation.md) — hierarchies as learned expectation

## Sources

- Reinier Plomp & Willem J. M. Levelt, "Tonal Consonance and Critical Bandwidth," Journal of the Acoustical Society of America 38 (1965), 548–560. https://pubs.aip.org/asa/jasa/article/38/4/548/615274 (PDF: https://www.mpi.nl/world/materials/publications/levelt/Plomp_Levelt_Tonal_1965.pdf)
- Carlos Scheidegger, "Consonance and Dissonance" (explainer of the Plomp–Levelt model). https://cscheid.net/v2/explainers/music/consonance-and-dissonance.html
- Josh H. McDermott, Alan F. Schultz, Eduardo A. Undurraga & Ricardo A. Godoy, "Indifference to Dissonance in Native Amazonians Reveals Cultural Variation in the Perception of Musical Harmony," Nature 535 (2016). https://www.nature.com/articles/nature18635 (read via MIT News summary: https://news.mit.edu/2016/music-tastes-cultural-not-hardwired-brain-0713)
- Imre Lahdelma, Tuomas Eerola & James Armitage, "Is Harmonicity a Misnomer for Cultural Familiarity in Consonance Preferences?" Frontiers in Psychology (2022). https://pmc.ncbi.nlm.nih.gov/articles/PMC8833847/
- Wikipedia, "Equal temperament." https://en.wikipedia.org/wiki/Equal_temperament
- Wikipedia, "Just intonation." https://en.wikipedia.org/wiki/Just_intonation
- Wikipedia, "Railsback curve." https://en.wikipedia.org/wiki/Railsback_curve
- Wikipedia, "Slendro." https://en.wikipedia.org/wiki/Slendro ; "Pelog." https://en.wikipedia.org/wiki/Pelog
- Wikipedia, "Arab tone system." https://en.wikipedia.org/wiki/Arab_tone_system
- Wikipedia, "Shruti (music)." https://en.wikipedia.org/wiki/Shruti_(music)
- Wikipedia, "In scale." https://en.wikipedia.org/wiki/In_scale
- Carol L. Krumhansl & Edward J. Kessler, "Tracing the Dynamic Changes in Perceived Tonal Organization in a Spatial Representation of Musical Keys," Psychological Review 89 (1982) — profile values as reproduced in the rnhart.net key-finding article. http://rnhart.net/articles/key-finding/
- MDN Web Docs, "OscillatorNode: detune property." https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/detune
