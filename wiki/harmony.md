---
title: Harmony
tags: [theory]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Functional syntax, root-motion norms, cadences, harmonic rhythm, and corpus statistics (classical and rock) that separate goal-directed progressions from wandering ones, with engine-ready transition tables.
---

# Harmony

Harmony is where this project's previous engines failed most audibly: first-order Markov chord walks produce successions that are locally plausible but globally directionless. This page collects the syntax of functional tonality, quantitative root-motion and chord-transition norms from both common-practice theory and rock/pop corpora, cadence and harmonic-rhythm mechanics, and the main non-functional alternatives (modal, pandiatonic, neo-Riemannian, drone-based) — with an explicit analysis of what makes a progression sound goal-directed rather than wandering.

## Functional tonality: a three-category syntax

Common-practice (roughly 1650–1900) harmony behaves like a grammar over three functional categories: tonic (T: I, vi as weak substitute), subdominant/pre-dominant (S: IV, ii), and dominant (D: V, vii°). The normative flow is T → S → D → T. Tonic can move anywhere; pre-dominants move to dominants; dominants discharge to tonic. Reversals ("retrogressions" like V–IV or ii–I) are rare and marked in this style. The functional categories are not just theorist convenience: they act as an approximate first-order transition system over chord roots, which is why they are directly implementable. Two chords per function also means the grammar underdetermines the surface — variety comes from substitution within a category (ii for IV, vi for I) while the functional skeleton stays fixed.

Two structural asymmetries give the system its arrow of time:

- Root-motion asymmetry (Meeùs/Schoenberg): progressions by descending fifth (e.g., ii–V, V–I), descending third (e.g., I–vi, IV–ii), and ascending second (e.g., IV–V, V–vi) are "strong" and frequent; their mirror images (ascending fifth, ascending third, descending second) are "weak" and infrequent (Quinn 2010, summarizing Meeùs 2000). A transition matrix with this asymmetry, unlike a symmetric one, has a preferred direction of flow that terminates on I.
- Tendency tones: the leading tone (7̂) resolves up by semitone to 1̂ and chordal sevenths resolve down by step. V7–I is the strongest progression because it discharges two tendency tones at once. See [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md) for resolution mechanics and [tension-and-release.md](tension-and-release.md) for the psychology.

## Root-motion norms: Piston's table

Walter Piston's "Table of Usual Root Progressions" (Harmony, 1941; rev. DeVoto 1987) is an approximate first-order transition table that empirical researchers still use as ground truth; rules take the form "IV is followed by V, sometimes I or II, less often III or VI" (quoted in Quinn 2010). As commonly reproduced (the IV row is verified verbatim from Quinn; verify other rows against a print copy when possible):

| Chord | usually goes to | sometimes | less often |
|---|---|---|---|
| I | IV, V | vi | ii, iii |
| ii | V | vi | I, iii, IV |
| iii | vi | IV | ii, V |
| IV | V | I, ii | iii, vi |
| V | I | vi, IV | iii, ii |
| vi | ii, V | iii, IV | I |
| vii° | iii (I) | — | — |

Woolhouse's interval-cycle model of tonal attraction rank-correlates with Piston's table at rs = 0.68 (0.81 against the DeVoto revision), and Quinn shows the fit is mostly explained by exactly the strong/weak directionality classification above (Quinn 2010). Tymoczko's Bach and Mozart corpora, used in the same debate, confirm the descending-fifth dominance in actual common-practice music.

## What rock and pop corpora show

de Clercq & Temperley (2011) hand-analyzed 100 songs (top 20 per decade, 1950s–90s, from Rolling Stone's "500 Greatest Songs"; inter-analyst agreement 92.4% on relative root, 94.4% on absolute root). Key numbers (proportions of all chords):

| Root | Overall | Pre-tonic (excl. I) | Notes |
|---|---|---|---|
| I | 0.328 | — | in 99/100 songs |
| IV | 0.226 | 0.396 | most common non-tonic chord |
| V | 0.163 | 0.269 | |
| bVII | 0.081 | 0.132 | modal/Mixolydian marker |
| vi | 0.072 | 0.050 | common after I, rare before it |
| bVI | 0.040 | 0.071 | |
| ii | 0.036 | 0.041 | |
| bIII | 0.026 | 0.017 | |
| iii | 0.019 | 0.005 | |

(The **Overall** column is each chord's share of *all* chords; **Pre-tonic** is its share of the slots immediately before a tonic, excluding I — different denominators, so the two columns are not meant to reconcile.)

Findings that matter for engine design:

- IV is the most common chord after I and is especially common immediately before I. Pre-tonic and post-tonic distributions have the same top three (IV, V, bVII) — post-tonic IV .356, V .240, bVII .159, vi .102 — so rock harmony is closer to a context-free preference hierarchy than to classical directed syntax.
- Root motions are directionally symmetric in rock: ascending perfect fourths (2,266 instances) ≈ descending perfect fourths (2,220); seconds and thirds likewise balanced. The classical strong/weak asymmetry does not hold. Chord frequency instead falls off smoothly with circle-of-fifths distance from I.
- Trigram data: when V is the pre-tonic chord, the chord before it is overwhelmingly IV — so IV–V–I survives as a schema even in a flat syntax.
- Temperley's follow-up on a 200-song corpus found V–I still the most common sectional cadence (~32% of songs) with IV–I plagal closes second (~18.5%), and argues classical functional categories "fail immediately" for rock (Temperley 2011, MTO).

Data-driven grammars are practical: the Hooktheory/TheoryTab community database encodes melody + Roman-numeral chords for tens of thousands of pop song sections; a cleaned research subset contains 9,226 melody/chord pairs (Yeh et al. 2021). Training separate transition tables per style corpus is the obvious move — see [corpus-analysis.md](corpus-analysis.md) and [markov-and-statistical-models.md](markov-and-statistical-models.md).

## Cadences: harmonic goals

Cadence types, in descending order of finality (Wikipedia "Cadence"):

- Perfect authentic (PAC): V(7)–I, both root position, 1̂ in the melody. Full stop.
- Imperfect authentic (IAC): V–I weakened by inversion or 3̂/5̂ in melody. Comma.
- Half cadence (HC): anything → V. Open, demands continuation — the standard mid-phrase or antecedent goal.
- Plagal (IV–I): "Amen"; in classical practice often post-cadential confirmation, but in rock a primary close (see above).
- Deceptive (V–vi): sets up PAC expectation and swerves; extends the phrase.

Cadences are what make harmony goal-directed: they are scheduled events at phrase endings, landing on hypermetrically strong downbeats (typically bar 4 or 8 of a phrase — see [phrase-structure.md](phrase-structure.md)). A progression without scheduled cadences is a walk; the same chords with a cadence every 4–8 bars is a journey. The antecedent–consequent pattern (phrase 1 ends HC, phrase 2 ends PAC) is the minimal complete tension–resolution arc.

## Harmonic rhythm

Harmonic rhythm is the rate of chord change relative to surface rhythm (Wikipedia "Harmonic rhythm"). Norms worth encoding: chords change on strong beats (downbeats above all); "strong" harmonic rhythm = root-position chords, on downbeats, relatively long durations. Typical rates: 1 chord per bar or per 2 bars in pop loops; classical phrases often start slow (1–2 changes/bar) and accelerate into the cadence (faster changes, e.g., cadential ii6–V7–I compressed into 1–2 bars) — this cadential acceleration is a standard textbook observation and a cheap, strong directionality cue. Aligning harmonic rhythm with meter and phrase is covered from the rhythm side in [rhythm-and-meter.md](rhythm-and-meter.md).

## Sequences: direction without cadence

A harmonic sequence repeats a unit transposed by a regular interval, giving strong local predictability and a sense of motion between cadences:

- Descending fifths (circle of fifths): I–IV–vii°–iii–vi–ii–V–I; the workhorse. Jazz runs it with sevenths on every chord.
- Descending thirds / descending 5-6: the Pachelbel/romanesca family (I–V–vi–iii–IV–I–IV–V).
- Ascending 5-6: rising stepwise pattern for building intensity.

Practical norms: state the model, repeat it one to two times (rarely more), then break the pattern into a cadence. Sequences are the safest way for an engine to traverse harmonic distance while sounding intentional; they also tolerate full-diatonic or chromatic (applied-dominant) versions.

## Loop harmony and the Axis family

Most post-1990 pop is loop-based: a 4-chord, 4- or 8-bar cycle repeats through whole sections with no cadence in the classical sense. The dominant family is the "Axis" progression I–V–vi–IV and its rotations (V–vi–IV–I, vi–IV–I–V "sensitive female" ordering, IV–I–V–vi); Wikipedia lists ~200 songs using it (a partial list of 204 entries; it gives no aggregate total), popularized by Axis of Awesome's "Four Chords" medley (2008). Other staples: doo-wop I–vi–IV–V, 12-bar blues, two-chord shuttles (e.g., i–bVII). In loops, goal-direction is deliberately traded for hypnotic circularity; interest must come from melody, arrangement, and sectional contrast instead ([form-and-structure.md](form-and-structure.md), [melody.md](melody.md)). Loop rotations matter: the same four chords starting on vi read as melancholic, starting on I as affirmative — the loop's first and last slots carry tonal weight.

## Color and departure: mixture, secondary dominants, modulation

- Modal mixture: borrowing from the parallel minor (iv, bVI, bVII, bIII in major) darkens color without leaving the tonic; bVI–bVII–I is a common triumphant close in film and game scoring.
- Secondary dominants: V/x tonicizes any major or minor diatonic chord; V/V is the most common (Wikipedia "Secondary chord"). Insertion recipe: before chord X, optionally insert the major triad or dominant seventh a perfect fifth above X. Secondary leading-tone diminished sevenths resolve up by semitone into X. These add local goal-direction anywhere.
- Modulation routes, most common first: to V (major), to relative major/minor, to IV, then step-wise shifts. Standard method is a pivot chord shared by both keys, followed by the new key's cadence; pop also uses direct "truck driver" shifts up a semitone or whole step for final choruses. A modulation only registers if confirmed by a cadence in the new key.

## Neo-Riemannian moves and chromatic third relations

Neo-Riemannian theory treats major/minor triads as nodes connected by parsimonious voice-leading operations (Wikipedia "Neo-Riemannian theory"): P (parallel: C↔Cm, third moves a semitone), R (relative: C↔Am, fifth moves up a whole tone), L (leading-tone exchange: C↔Em, root moves down a semitone). Each preserves two common tones and moves one voice by 1–2 semitones. Chains (e.g., the PL hexatonic cycle C–Cm–Ab–Abm–E–Em) produce the dreamlike chromatic drift of late Romanticism and modern film scoring ([film-and-game-music.md](film-and-game-music.md)). Caveat for engines: these progressions have no built-in tonic, so unanchored chains wander luxuriously; anchor them with a pedal point or return to a home triad every 4–8 chords.

## Drones, pedal points, pandiatonicism, quartal color

A pedal point (usually tonic or dominant in the bass) holds through changing harmonies and instantly stabilizes anything above it — the cheapest anti-wandering device available, and the structural basis of drone traditions (see [indian-classical-music.md](indian-classical-music.md), [ambient-and-generative-genre.md](ambient-and-generative-genre.md)). Pandiatonicism (Slonimsky's term) uses the seven diatonic notes "in democratic equality" — added-note chords (2nds, 6ths, 7ths), quartal/quintal spacings, non-functional bass motion — keeping strong tonality by pure scale membership while abandoning functional syntax (Copland, Stravinsky, Reich; Wikipedia "Pandiatonicism"). Quartal voicings (stacked fourths) read as modern/open and dodge major/minor commitment; jazz uses them over modal vamps. Jazz harmony more broadly — extensions (9, 11, 13), tritone substitution, ii–V–I chains — is treated in [jazz-and-improvisation.md](jazz-and-improvisation.md).

## What makes harmony goal-directed vs wandering

Synthesis of the above, ranked roughly by effect size (informed judgment, not measured):

1. Scheduled cadences at phrase boundaries — a harmonic goal every 4/8/16 bars, known in advance to the generator.
2. Asymmetric transition structure — strong root motions (down a 5th, down a 3rd, up a 2nd) predominating outside deliberately static passages.
3. Tendency-tone resolution — 7̂→1̂ and chordal 7ths down, realized in actual voices.
4. Harmonic rhythm that accelerates into cadences and changes chords on strong beats.
5. Bass line with scale-degree logic (e.g., descending 1̂–7̂–6̂–5̂, or 4̂–5̂–1̂ at cadences) rather than root-hopping.
6. Hierarchy: a background I–(x)–V–I skeleton prolonged by foreground chords, rather than a flat chain. Even loop music has hierarchy via section-level key plans.

Previous engines had none of these: symmetric first-order transitions with no cadence scheduling reproduce, at best, rock's flat preference hierarchy without the riffs, melody, and form that make flat harmony work — hence "wandering" ([previous-experiments-lessons.md](previous-experiments-lessons.md)).

## Implications for generative engines

- Implement two distinct grammars, not one: (a) functional mode — categories T/S/D, strong-motion-biased transitions, mandatory cadence scheduling; (b) loop mode — pick a 4-chord loop from a curated/corpus-derived set (Axis rotations, doo-wop, i–bVII–bVI–bVII, etc.) and hold it, putting variation elsewhere. Do not blend them accidentally.
- Generate backwards from cadences: choose phrase length (4/8 bars), fix the cadence (PAC/HC/deceptive/plagal per style), fill the approach (pre-dominant slot ~1–2 chords before), then fill openings from the transition table. Goal-first generation is the single biggest fix for wandering.
- Usable numbers: rock chord priors I .33, IV .23, V .16, bVII .08, vi .07 (de Clercq & Temperley); pre-tonic priors IV .40, V .27, bVII .13. Classical: use the Piston table with "usually/sometimes/less often" ≈ 0.6/0.3/0.1 within-row weights (calibrate against a corpus later).
- Harmonic rhythm: default 1 chord/bar (pop: per 1–2 bars); halve chord durations in the cadential bar; always change chords on beat 1, optionally beat 3 in 4/4.
- Cadence realization checklist: root-position V and I, 2̂→1̂ or 7̂→1̂ in the top voice, bass 5̂→1̂, suspension optional (see [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md)), hypermetric downbeat arrival.
- Spice operators, applied sparingly with probabilities on the order of 0.1–0.2 per phrase: secondary dominant insertion before a non-tonic chord; mixture substitution (IV→iv, vi→bVI) in the second half of a phrase; deceptive cadence at most once before the final PAC of a section.
- Neo-Riemannian chains (3–6 P/L/R moves) as a separate "drift" texture for ambient/film-ish sections; anchor with tonic or dominant pedal, and re-enter functional mode via a dominant of the home key.
- Sequences as middle-of-phrase filler: descending-fifths or Pachelbel pattern, 1–2 repetitions, then cadence. Never let a sequence end a section.
- Log which grammar/parameters generated each passage so listening feedback can attribute wandering vs directedness to specific settings ([improvement-loop.md](improvement-loop.md), [listening-tests-and-feedback.md](listening-tests-and-feedback.md)).

## Open questions

- Jacoby, Tishby & Tymoczko (2015, J. New Music Research) reportedly recover T/S/D-like categories from corpora by information-theoretic clustering — not yet read; ingest and, if solid, use their optimal category count/assignments instead of textbook categories.
- The famous Hooktheory blog analyses ("I analyzed the chords of 1300 popular songs") were unreachable (HTTP 403); their per-transition percentages would sharpen the loop-mode tables. Retry, or recompute equivalent statistics from an accessible TheoryTab-derived dataset.
- How much cadential acceleration of harmonic rhythm is typical, quantitatively, by style? No fetched source gave numbers; measurable via corpus analysis.
- Does the strong/weak root-motion asymmetry hold in minor keys and in non-Western-influenced pop (e.g., J-pop, reggaeton)? Style-specific tables needed.

## Related pages

- [phrase-structure.md](phrase-structure.md) — where cadences land; antecedent–consequent design
- [tension-and-release.md](tension-and-release.md) — the psychology harmony syntax serves
- [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md) — realizing chords as voices
- [melody.md](melody.md) — melodic–harmonic coordination and divorce
- [markov-and-statistical-models.md](markov-and-statistical-models.md) — why first-order chains wander and what to add
- [corpus-analysis.md](corpus-analysis.md) — building style-specific transition tables
- [jazz-and-improvisation.md](jazz-and-improvisation.md) — extensions, substitutions, ii–V–I
- [previous-experiments-lessons.md](previous-experiments-lessons.md) — the failure this page exists to fix
- [tuning-and-scales.md](tuning-and-scales.md) — scales and hierarchies underneath the chords

## Sources

- Trevor de Clercq & David Temperley, "A Corpus Analysis of Rock Harmony," Popular Music 30/1 (2011). https://rockcorpus.midside.com/2011_paper/declercq_temperley_2011.pdf
- David Temperley, "The Cadential IV in Rock," Music Theory Online 17/1 (2011). https://mtosmt.org/issues/mto.11.17.1/mto.11.17.1.temperley.html
- Ian Quinn, "What Do Interval Cycles Have To Do With Tonal Harmony?" Empirical Musicology Review 5/3 (2010) — Piston's table, Meeùs strong/weak classification, Woolhouse correlations. https://pdfs.semanticscholar.org/b181/a79e6509ab4962790f50f7f0ac9997130efd.pdf
- Wikipedia, "I–V–vi–IV progression." https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression
- Wikipedia, "Cadence." https://en.wikipedia.org/wiki/Cadence
- Wikipedia, "Harmonic rhythm." https://en.wikipedia.org/wiki/Harmonic_rhythm
- Wikipedia, "Neo-Riemannian theory." https://en.wikipedia.org/wiki/Neo-Riemannian_theory
- Wikipedia, "Secondary chord." https://en.wikipedia.org/wiki/Secondary_chord
- Wikipedia, "Pandiatonicism." https://en.wikipedia.org/wiki/Pandiatonicism
- Yin-Cheng Yeh et al., "Automatic Melody Harmonization with Triad Chords: A Comparative Study" (2021) — TheoryTab-derived dataset of 9,226 melody/chord pairs. https://arxiv.org/abs/2001.02360
