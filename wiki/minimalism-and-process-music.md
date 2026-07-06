---
title: Minimalism and process music
tags: [genre]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Reich's phasing and audible-process manifesto, Glass's additive rhythm, Riley's In C, and Pärt's tintinnabuli — hand-designed processes that generate good music, and why they work.
---

# Minimalism and process music

Minimalist composers of the 1960s–70s did by hand exactly what this project tries to do in code: they designed small rule systems that, once set running, generate substantial and genuinely loved music. Reich's phasing, Glass's additive rhythm, Riley's In C, and Pärt's tintinnabuli are each specifiable in a few lines of pseudocode, yet produce concert repertoire, not noodling. This page extracts the processes and — more important — the design principles that make them musically successful, since those principles transfer directly to engine design.

## Reich: phasing and the audible process

**It's Gonna Rain (1965)**, Reich's first major work, came from a tape accident: two Wollensak recorders playing identical loops of a Pentecostal preacher (Brother Walter, recorded in San Francisco's Union Square) drifted gradually out of sync. Reich exploited the drift as a compositional principle: the two copies slide from unison through echo, canon, and dense interference, eventually realigning. Eno cites this piece as his own gateway: "tremendously simple" construction yielding "very complex" results.

**Piano Phase (1967)** transfers phasing to live performers. Both pianists repeat the same 12-note pattern — E4 F#4 B4 C#5 D5 F#4 E4 C#5 B4 F#4 D5 C#5, only five pitch classes — in unison; one accelerates slightly until they are exactly one sixteenth apart, then locks back in; the cycle repeats through all 12 offsets. Later sections reduce the pattern to 8 and then 4 notes; performances run about 15–20 minutes. The interest lies in "resultant patterns": emergent sub-melodies the listener assembles from the interference of the two parts — none of them literally played by anyone.

**"Music as a Gradual Process" (1968)** is the manifesto, and reads as a design document for this project:

- "I do not mean the process of composition, but rather pieces of music that are, literally, processes." Processes "determine all the note-to-note (sound-to-sound) details and the over all form simultaneously."
- Audibility is the criterion: "I am interested in perceptible processes. I want to be able to hear the process happening throughout the sounding music" — and it must run "extremely gradually" to be heard (his images: an hourglass; watching a minute hand move).
- Autonomy: "once the process is set up and loaded it runs by itself"; the composer accepts everything it produces.
- The payoff is emergence: "impersonal, unattended, psycho-acoustic by-products" — sub-melodies within repeated patterns, difference tones, spatial effects — which reward attention precisely because they were not composed.
- The contrast case is Cage: chance operations are compositional processes the listener cannot hear; serial rows are "seldom audible." Hidden structure earns nothing perceptually.
- And a warning for interactive designs: "One can't improvise in a musical process — the concepts are mutually exclusive."

## Glass: additive and subtractive process

Glass, starting with 1 + 1 (1968) and continuing through Two Pages, Music in Fifths, and Music in Twelve Parts, builds form by arithmetic on a melodic cell: a figure is repeated, then extended by one unit, then again (schematically 1, 1+2, 1+2+3, 1+2+3+4...), or symmetrically contracted. The surface is motoric even eighths at constant tempo and dynamics; all sense of growth comes from cycle length expanding and contracting. Meter becomes elastic — a listener entrained to a 5-note loop feels the ground shift when it becomes 6 — which is the psychological hook: strong entrainment plus repeated small violations of it ([musical-expectation](musical-expectation.md)).

## Riley: In C (1964) — the most successful generative score

In C is 53 short modules (1 to 64 eighth-notes long; 521 eighth-notes of notated material in total) played in order by any ensemble (Riley suggests ~35 players; "any number of people... on any instrument or instruments"). The rules, from the published performing directions:

- Everyone starts at module 1; each player repeats each module as many times as they wish (typically staying on one for roughly 45–90 seconds) before moving on.
- Stay within 2–3 modules of the group — nobody races ahead or lags behind; listen constantly and adjust.
- A steady eighth-note pulse on high Cs (C5/C6 octaves, "The Pulse" — Steve Reich's rehearsal suggestion, adopted by Riley) holds the ensemble together.
- At module 53 everyone stays until all arrive, the group crescendos and fades; performances run roughly 45–90 minutes.

The pitch material drifts audibly across the modules: diatonic C at the start, F# entering around module 14 (toward E minor/G), a B-flat region from module 49 — slow, unmistakable large-scale motion. Parviainen's analysis frames the score as "a whole universe of possible musical compositions": with 35 players each independently deciding when to advance, every decision point has 2^35 possible ensemble states, yet the 2–3-module window and the fixed module order guarantee that whatever happens is a dense, consonant heterophony moving through the composed harmonic arc. It is a generative system whose constraint design makes bad outputs nearly impossible — the property this project's engines need most.

## Pärt: tintinnabuli as a two-voice algorithm

Pärt's tintinnabuli style (from Für Alina, 1976; then Cantus in Memoriam Benjamin Britten, Spiegel im Spiegel, Summa) is an explicitly rule-defined counterpoint of two voice types:

- The **M-voice** (melodic) moves diatonically, mostly by step, typically in short scale segments ascending toward or descending from a focal pitch.
- The **T-voice** (tintinnabuli) may sound only the notes of the tonic triad. For each M-voice note, the T-voice picks a triad tone by a fixed positional rule: **1st position** = the nearest triad tone to the M note (never the same pitch), **2nd position** = the next-nearest; the T-voice may sit **superior** (always above the M-voice), **inferior** (always below), or **alternate** sides. Hillier's standard analysis (1997) enumerates these positions; the chosen rule is held constant across a section, so the "harmony" is a deterministic function of the melody.
- Pärt describes the two voices as one entity: "One and one, it is one — it is not two" — melody (the subjective, in Hillier's gloss) and triad (the objective) fused.

A 2026 arXiv study ("Algo Pärt") algorithmically reconstructs Summa and shows how far the rules go: the M-voice itself is largely derived from the syllable counts of the Latin text mapped onto scale segments in a fixed mode, with the T-voice then computed by position rules — a substantial portion of the finished, much-loved piece follows from the system. Residual deviations are where Pärt's taste intervened; identifying such "10% hand-tuning" layers on top of clean algorithms is a promising engine pattern.

## Why these processes work musically

Across the four practices the common factors are:

1. **Audibility of process** (Reich's explicit criterion): the listener can form a model of what is happening and track it; the process itself is the form. Hidden cleverness contributes nothing.
2. **Heavily constrained, consonant material**: 5 pitch classes (Piano Phase), one diatonic-to-modal field with two inflections (In C), one triad plus one scale (tintinnabuli), one cell (Glass). The process supplies variety; the material supplies coherence. Steady pulse and consonance are defining features of the style (Wikipedia's summary: consonant harmony, steady rhythms, repetitive patterns, slow harmonic rhythm).
3. **Slow teleology**: every piece has a perceivable goal — loops realigning, the ensemble reaching module 53, the cell reaching maximum length, the text ending. Gradual audible progress toward a goal produces long-range tension without conventional development ([tension-and-release](tension-and-release.md)).
4. **Emergence as reward**: resultant melodies, interference patterns, and ensemble heterophony give attentive listeners more than the rules dictate — Reich's "psycho-acoustic by-products." Repetition is what enables this deep listening; see [repetition-and-familiarity](repetition-and-familiarity.md) for the psychology (Margulis's work belongs there).
5. **Constraint design over output filtering**: In C especially shows quality enforced by the possibility space itself, not by vetting outputs — the central lesson for [generative-music-design-patterns](generative-music-design-patterns.md).

## Post-minimalism (brief)

From the late 1970s (Adams, Andriessen, later Gann's "totalist" generation), composers kept minimalism's pulse and tonal surface but broke the strict frame: freer harmonic motion, expressive climaxes, orchestral color, mixed processes. For engines: post-minimal style permits process machinery plus conventional dramaturgy (dynamics arcs, orchestrational builds) — a natural second step once pure-process engines work.

## Implications for generative engines

- All four processes are directly implementable and cheap; they are strong candidates for early engines because their quality floor is high:
  - **Phasing engine**: one 8–16 note loop (≤6 pitch classes, one mode), two voices, tempo ratio ~1.005–1.02 or stepped one-sixteenth shifts every 4–16 bars; run through all offsets and end at unison. Duration 8–20 minutes. Pan voices apart so resultant patterns read.
  - **Additive engine**: cell of 3–8 notes; append (or remove) one note every 4–16 repetitions; constant tempo, constant dynamics; stop after full expansion+contraction.
  - **In C engine**: 40–60 composed modules ordered along a harmonic arc; N virtual performers (8–35) each repeating the current module 45–90 seconds, advancing stochastically under a hard window constraint (max spread 2–3 modules); constant eighth-note pulse on a high instrument; end by convergence on the final module and a fade. The module set is where the composing happens — the runtime is trivial.
  - **Tintinnabuli engine**: generate M-voice as stepwise scale segments (or derive from any integer sequence); compute T-voice by a chosen position rule (1st/2nd, superior/inferior/alternating); add octave doublings and a drone; slow tempo, long reverb. This is the highest quality-per-line-of-code algorithm known to this wiki.
- Design rules to carry into every engine: make the process audible at the surface; change exactly one thing at a time, gradually; give the process a goal state the listener can sense approaching; keep pitch material small and consonant so emergence stays pleasant; accept the process's output rather than patching it note-by-note (redesign the process instead).
- Failure mode to respect: Reich's Cage/serialism critique — randomness and hidden structure are indistinguishable from noise to listeners. Log this against [generative-music-failure-modes](generative-music-failure-modes.md).

## Open questions

- Phasing depends on precise sub-beat scheduling and may expose Web Audio timing limits — coordinate with [scheduling-and-timing](scheduling-and-timing.md).
- How much of In C's success depends on human micro-variation (touch, timing, timbre) that naive synthesis flattens? An engine test should add per-agent humanization and A/B it.
- Is 45–90 minutes of process viable for browser listening sessions, or should engine processes compress to 5–15 minutes? Riley's and Reich's durations assume concert attention.
- Tintinnabuli's spiritual affect: how much comes from the algorithm vs. from performance practice (dynamics, silence, acoustics)? Test algorithm-only renderings against heavily produced ones.

## Related pages

- [repetition-and-familiarity](repetition-and-familiarity.md) — the psychology repetition-based process music runs on
- [musical-expectation](musical-expectation.md) — entrainment and violation in additive/phasing processes
- [ambient-and-generative-genre](ambient-and-generative-genre.md) — Eno's systems, direct descendants of Reich's tape processes
- [generative-music-design-patterns](generative-music-design-patterns.md) — constraint design over output filtering
- [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md) — the algorithm family tintinnabuli belongs to
- [form-and-structure](form-and-structure.md) — process as form
- [algorithmic-composition-history](algorithmic-composition-history.md) — where these composers sit in the lineage
- [tension-and-release](tension-and-release.md) — slow teleology

## Sources

- Reich, Steve. "Music as a Gradual Process" (1968), full text. https://www.bussigel.com/systemsforplay/wp-content/uploads/2014/02/Reich_Gradual-Process.pdf
- Wikipedia, "It's Gonna Rain." https://en.wikipedia.org/wiki/It%27s_Gonna_Rain
- Wikipedia, "Piano Phase" (pattern, sections, resultant patterns). https://en.wikipedia.org/wiki/Piano_Phase
- Wikipedia, "In C" (modules, pulse, pitch arc, durations). https://en.wikipedia.org/wiki/In_C
- Riley, Terry. In C performing directions (via Third Coast Percussion's performer guide). https://thirdcoastpercussion.com/terry-rileys-in-c/
- Parviainen, Tero. "Terry Riley's 'In C'" (2017), analysis and Web Audio implementation. https://teropa.info/blog/2017/01/23/terry-rileys-in-c.html
- Wikipedia, "Minimal music" (techniques, Glass's additive process, Young's drones, postminimalism). https://en.wikipedia.org/wiki/Minimal_music
- Wikipedia, "Tintinnabuli" (voice types, Pärt's "one and one, it is one"; Hillier 1997 as the standard analysis). https://en.wikipedia.org/wiki/Tintinnabuli
- "Algo Pärt: An Algorithmic Reconstruction of Arvo Pärt's Summa," arXiv, 2026. https://arxiv.org/abs/2603.26989
- Eno, Brian. "Generative Music" talk, In Motion Magazine, 1996 (on It's Gonna Rain). https://www.inmotionmagazine.com/eno1.html
