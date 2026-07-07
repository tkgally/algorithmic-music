---
title: Counterpoint and voice leading
tags: [theory]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Voice-leading rules as auditory-stream engineering — species counterpoint, Huron's perceptual derivation of the rules, dissonance treatment, chorale norms, contrapuntal devices, and how many voices listeners can actually track.
---

# Counterpoint and voice leading

Previous engines moved voices to the nearest chord tone and got mush: technically smooth, perceptually dead. This page explains counterpoint as perceptual engineering — the traditional rules exist to make simultaneous lines *heard as* independent lines — and lays out the species rules, dissonance treatment, chorale norms, and texture-level limits (how many voices a listener can track) in a form an engine can implement as constraints and cost functions.

## Why voice independence is a perceptual fact

The auditory system organizes incoming sound into streams — inferred sound sources tracked over time (auditory scene analysis; see [auditory-perception-basics.md](auditory-perception-basics.md)). Whether two composed "voices" are actually heard as two lines depends on streaming cues: pitch proximity within each line, temporal continuity, distinct registers, asynchronous onsets, and timbre differences. Huron's landmark study derives the Western voice-leading canon from exactly these principles: "the principal purpose of voice-leading is to create perceptually independent musical lines" (Huron 2001). The rules are therefore not stylistic arbitrariness; violating them produces measurable perceptual effects (fusion, stream-jumping, masking) regardless of style.

## Huron's perceptual principles → traditional rules

Huron (2001) derives the core rules from about six perceptual principles. Mapping:

| Perceptual principle | Traditional rule it explains |
|---|---|
| Toneness: clear virtual pitch for harmonic complex tones in the central pitch region | Write parts roughly within E2–G5 (~82–784 Hz), where pitch is clearest; avoid extremes for load-bearing lines |
| Temporal continuity: streams need sustained, connected sound | Legato part-writing; avoid long silences inside an active voice |
| Minimum masking: partials crowd within critical bands, worst in low register | Wider spacing between low voices; close position is fine above middle C, muddy below (~C3 for thirds) |
| Tonal fusion: unisons, octaves, fifths fuse into one percept (fusion strength: unison > octave > fifth) | Prohibition of parallel/consecutive unisons, octaves, fifths — parallel perfect intervals make two voices momentarily sound like one, destroying independence |
| Pitch proximity: within-stream motion should be small | Prefer steps and common tones; leaps threaten stream continuity; avoid crossing and overlap so streams don't swap identities |
| Pitch co-modulation: lines moving in lockstep fuse | Prefer contrary/oblique motion; ban "direct/hidden" fifths and octaves (similar motion into a perfect interval) |

Onset asynchrony belongs on the list too: staggered attacks (as in suspensions) strongly segregate voices, while synchronized attacks promote chordal fusion — useful in both directions. Historical corroboration: the parallel-fifths/octaves rules were formalized by Zarlino (1558); Bach systematically avoided even isolated exposed octaves/fifths, while Chopin and Debussy later used parallel fifths deliberately when fusion (a thickened single line) was the desired effect (Deruty et al. 2025, citing Huron). So the rules are toggles, not laws: enforce them when independence is wanted, break them when a fused "super-voice" is wanted.

## Species counterpoint: the graded rule set

Fux's Gradus ad Parnassum (1725) teaches counterpoint in five species against a cantus firmus (Wikipedia "Counterpoint"):

| Species | Rhythm vs cantus | New element |
|---|---|---|
| 1st | 1:1 | interval choice and motion rules only |
| 2nd | 2:1 | unaccented passing dissonance |
| 3rd | 4:1 | figuration (double neighbor, cambiata) |
| 4th | syncopated | suspensions: accented, prepared dissonance |
| 5th | florid | free mixture of all of the above |

First-species rules (Open Music Theory, Gotham et al.; two-voice version):

- Begin on a perfect consonance: P1/P5/P8 above the cantus, P1/P8 below. End on P1/P8 (both voices on the tonic), approaching the final interval by contrary stepwise motion (m3→P1 or M6→P8).
- Use consonances only: P1/P5/P8, 3rds, 6ths. Prefer imperfect consonances (3rds/6ths) mid-exercise; unison only at start/end; don't exceed three consecutive identical imperfect intervals (parallel 3rds/6ths are fine, in moderation).
- Never write parallel P5–P5 or P8–P8 (including compounds); never approach any perfect consonance by similar motion (direct/hidden intervals).
- Prefer contrary motion; vary motion types; avoid similar motion combined with leaps.
- Keep voices within a perfect 12th of each other (ideally an octave); no voice crossing or overlap; each line's climax must not coincide with the other's; at most one repeated note.
- Melodic constraints per line: mostly stepwise; recover leaps by step in the opposite direction; single climax; stay roughly within an octave ([melody.md](melody.md) covers melodic shape in depth).

Later species add rhythm-sensitive dissonance: 2nd species allows dissonance only on weak halves as passing/neighbor tones; 4th species inverts this, putting prepared dissonance on strong beats as suspensions.

## Dissonance treatment: the nonchord-tone vocabulary

Every dissonance in this style is categorized by how it is approached and left (Wikipedia "Nonchord tone"):

- Passing tone: step in, step on in the same direction (unaccented by default).
- Neighbor tone: step away and back to the same chord tone.
- Escape tone: step in, leap out (opposite direction). Anticipation: arrive early on the next chord's tone.
- Suspension: the workhorse of tonal tension. Prepare as a consonance, hold it over the chord change so it becomes a strong-beat dissonance, resolve down by step. Standard types 4–3, 7–6, 9–8, and 2–3 in the bass; retardations resolve up (7–8). Chains of 7–6 or 4–3 suspensions over a sequence are a self-driving tension machine.
- Appoggiatura: leap in, resolve by step — the most expressive/marked dissonance.
- Pedal point: a held tonic or dominant against changing harmony (dissonance by stasis; see [harmony.md](harmony.md)).

The pattern behind all of these: dissonance must be metrically and melodically explained — approached and resolved by step (mostly), with resolution downward on the beat for accented dissonance. An engine that tags every nonharmonic note with one of these categories cannot produce unexplained clams; this single mechanism accounts for much of what reads as "craft" ([composition-craft.md](composition-craft.md)).

## Motion types and their balance

Four motion types between two voices: contrary (opposite directions), oblique (one holds), similar (same direction, different intervals), parallel (same direction, same interval). Pedagogy and Huron's principles both favor contrary + oblique for independence; parallel imperfect consonances (3rds/6ths) are idiomatic in moderation; parallel perfects are banned (fusion). No precise corpus percentages were verified for this page — Bach chorale ratios are computable from open corpora, which is the better path anyway (see [corpus-analysis.md](corpus-analysis.md) and Open questions).

## Chorale-style norms (SATB defaults)

As taught in chorale-writing pedagogy (ranges as commonly given; MIDI numbers for engines):

- Ranges — soprano C4–G5 (60–79), alto G3–D5 (55–74), tenor C3–G4 (48–67), bass E2–C4 (40–60).
- Spacing — adjacent upper voices (S–A, A–T) within an octave; T–B may open to a 12th. This matches the minimum-masking principle: more room at the bottom.
- Doubling — in root-position triads double the root; never double the leading tone or any tendency tone (doubling creates parallel-octave risk and weights the tendency wrongly); in diminished triads double the third.
- Tendency resolution — leading tone up to tonic (obligatory in outer voices), chordal 7th down by step; keep common tones where possible, otherwise move each voice to the nearest available chord tone *subject to all constraints above* — nearest-tone alone, without spacing/doubling/tendency/contour constraints, is what made previous engines' textures inert ([previous-experiments-lessons.md](previous-experiments-lessons.md)).

## Contrapuntal devices

- Imitation: a motive stated in one voice is answered in another (at the octave, 5th, or any interval). Cheap coherence: listeners hear the relationship even across register.
- Canon/round: strict continuous imitation; works when the material is designed so that it harmonizes with its own delayed copy — a constraint-satisfaction problem well suited to engines ([constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md)).
- Invertible counterpoint: two lines written so they still work with registers swapped. At the octave, 3rds↔6ths survive but 5ths become 4ths (dissonant) — so treat 5ths as unstable when writing invertible pairs.
- Hocket: one melody split between alternating voices (13th–14th c. Europe); the same interlocking logic appears as Javanese imbal and Balinese kotekan, in mbira and panpipe traditions, and in minimalism and math-pop (Wikipedia "Hocket"; see [gamelan.md](gamelan.md), [minimalism-and-process-music.md](minimalism-and-process-music.md)).
- Pseudo-polyphony (compound melody): one fast monophonic line alternating between registers separated by large intervals is heard as two streams — the classic case is Wessel's timbre/register streaming illusion, discussed in Huron (2001) alongside the auditory-scene-analysis account of the effect (Bregman 1990). Two voices for the price of one oscillator, a genuinely useful trick for thin Web Audio textures.

## Textures and how many voices listeners can track

Texture taxonomy (Wikipedia "Texture (music)"): monophony (one line), homophony (melody + accompaniment; homorhythm when all parts share rhythm), polyphony (multiple independent lines), heterophony (simultaneous variants of one line — central in many East Asian and Middle Eastern traditions; see [east-asian-traditions.md](east-asian-traditions.md)).

Tracking limits: Huron (1989) had trained listeners identify the number of concurrent voices in homogeneous-timbre polyphony (organ works); accuracy is high up to three voices and degrades sharply beyond, with errors overwhelmingly undercounting — a fourth voice is typically absorbed rather than heard. Hence Huron's "principle of limited density": if independence is the goal, keep to about three or fewer concurrent voices. Related findings: the upper voice is the most perceptually salient (Disbergen et al. 2018, citing Palmer & Holleran); and well-formed counterpoint changes attention itself — musicians listening to coherent Baroque duets showed no neural signature of selecting one voice over the other (integrated listening), but reverted to selective attention when the same material was scrambled (Barrett et al. 2021). Good counterpoint is thus literally easier to hear whole. Denser textures (4+ voices) are perceived as figure + ground: melody, bass, and interior filler — which is also how to generate them. See [attention-and-background-listening.md](attention-and-background-listening.md).

## Implications for generative engines

- Architect textures as streams, not note piles: decide voice count and roles first (melody / bass / 1–2 inner or accompaniment layers). Foreground polyphony: ≤3 concurrent independent lines; anything further is ground and may double, pad, or arpeggiate.
- Implement voice leading as hard constraints + weighted costs. Hard: no parallel P1/P5/P8; no similar motion into perfect intervals in outer voices (unless soprano moves by step); no unprepared/unresolved accented dissonance; leading tone up and 7th down at cadences; stay in range. Soft costs (suggested starting weights, to be tuned by listening tests): voice crossing 0.8, overlap 0.5, spacing violation 0.7, leap > P5 without step-back recovery 0.5, similar motion 0.2 per event, >3 consecutive parallel 3rds/6ths 0.3, coinciding climaxes 0.5.
- Numbers for spacing/register: S–A and A–T ≤ 12 semitones, T–B ≤ 19; SATB MIDI ranges 60–79 / 55–74 / 48–67 / 40–60; below ~C3 (MIDI 48) widen intervals to a 5th or more (masking); keep each line's tessitura within ~an octave with one climax per phrase.
- Give every nonharmonic tone an explicit type tag (passing/neighbor/suspension/appoggiatura/anticipation/pedal) with its approach-resolution contract enforced. Sprinkle suspensions at cadences (a 4–3 on V is the default; trying them on ~30–50% of cadences is a reasonable starting rate — informed speculation, tune by ear) and use 7–6 chains over sequences.
- Independence toggles: for two synthesized voices with identical timbre, rely on register separation, contrary motion, and onset staggering; with distinct timbres/pan positions, crossing and similar motion become safer ([timbre-and-orchestration.md](timbre-and-orchestration.md)). Deliberate parallel 5ths/octaves are a legitimate *fusion* effect (organum/power-chord/Debussy mode) — make it a mode, not a bug.
- Cheap wins: imitation at phrase starts (echo the opening motive in another voice at 1–2 beat delay); pseudo-polyphony for solo lines; hocket/kotekan interlock for rhythmic energy with only two thin voices.
- Verify output computationally: parallel-interval detection, spacing checks, dissonance-contract checks are all trivially automatable and should run as a lint pass before audio ([computational-music-metrics.md](computational-music-metrics.md)).

## Open questions

- Exact contrary/oblique/similar/parallel ratios in Bach chorales (and in other repertoires): compute from an open corpus (music21's chorale set) and record in [corpus-analysis.md](corpus-analysis.md); use as generation targets.
- How many voices can listeners track when timbres are clearly distinct (Web Audio synths can be arbitrarily distinct)? Huron 1989 used homogeneous timbres; the limit is presumably higher with heterogeneous ones — find or run the study.
- Does integrated listening (Barrett et al.) hold for non-musicians and for synthesized timbres? Directly testable in this project's listening loop ([listening-tests-and-feedback.md](listening-tests-and-feedback.md)).
- Huron 2001 and 1989 were read via verified abstracts and secondary summaries (paywalled originals); a future session with source access should verify the derivation details and add a source note.

## Related pages

- [auditory-perception-basics.md](auditory-perception-basics.md) — streaming, masking, critical bands behind these rules
- [harmony.md](harmony.md) — the chord syntax these voices realize
- [melody.md](melody.md) — single-line shape rules shared with counterpoint
- [timbre-and-orchestration.md](timbre-and-orchestration.md) — timbre as a voice-separation tool
- [attention-and-background-listening.md](attention-and-background-listening.md) — texture density vs listening mode
- [gamelan.md](gamelan.md) — kotekan interlock as counterpoint
- [western-classical-tradition.md](western-classical-tradition.md) — the repertoire these norms come from
- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) — implementing rules as constraint solving

## Sources

- David Huron, "Tone and Voice: A Derivation of the Rules of Voice-Leading from Perceptual Principles," Music Perception 19/1 (2001), 1–64. https://doi.org/10.1525/mp.2001.19.1.1
- David Huron, "Voice Denumerability in Polyphonic Music of Homogeneous Timbres," Music Perception 6/4 (1989), 361–382. https://doi.org/10.2307/40285438
- Emmanuel Deruty et al., "Evolving Music Theory for Emerging Musical Languages" (2025) — secondary account of Huron's tonal-fusion argument, Zarlino, Bach vs Debussy practice. https://arxiv.org/abs/2506.14504
- Albert S. Bregman, *Auditory Scene Analysis: The Perceptual Organization of Sound* (MIT Press, 1990) — the streaming/fission-illusion account behind pseudo-polyphony (cited via Huron 2001's discussion; not independently re-verified in this pass).
- Mark Gotham et al., Open Music Theory, "First-Species Counterpoint." http://openmusictheory.com/firstSpecies.html (read via project source: https://raw.githubusercontent.com/openmusictheory/openmusictheory.github.io/master/firstSpecies.md)
- Wikipedia, "Counterpoint." https://en.wikipedia.org/wiki/Counterpoint
- Wikipedia, "Nonchord tone." https://en.wikipedia.org/wiki/Nonchord_tone
- Wikipedia, "Texture (music)." https://en.wikipedia.org/wiki/Texture_(music)
- Wikipedia, "Hocket." https://en.wikipedia.org/wiki/Hocket
- Niels R. Disbergen, Giancarlo Valente, Elia Formisano & Robert J. Zatorre, "Assessing Top-Down and Bottom-Up Contributions to Auditory Stream Segregation and Integration With Polyphonic Music," Frontiers in Neuroscience (2018). https://pmc.ncbi.nlm.nih.gov/articles/PMC5845899/
- Karen Chan Barrett, Richard Ashley, Dana L. Strait, Erika Skoe, Charles J. Limb & Nina Kraus, "Multi-Voiced Music Bypasses Attentional Limitations in the Brain," Frontiers in Neuroscience (2021). https://pmc.ncbi.nlm.nih.gov/articles/PMC7877539/
