---
title: Melody
tags: [theory]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: What separates a melody from a note stream — contour, step/leap statistics, tessitura, motivic repetition, galant schemata, and hooks — with the numbers an engine needs to generate lines that sound sung rather than sampled.
---

# Melody

A melody is not a sequence of pitches; it is a *shaped* sequence that a listener can hold in memory, hum back, and recognize when varied. The difference between a melody and a random-walk note stream is almost entirely structural: melodies have a coherent contour, a strong bias toward small intervals broken by deliberate leaps, a bounded tessitura, motivic units that recur with variation, and phrase-scale organization (covered in [phrase-structure](phrase-structure.md)). Previous engines in this project produced note streams, not melodies, because they modeled local pitch transitions without any of these higher-order constraints. This page collects the statistical regularities and craft principles that make a line singable and memorable, with concrete ranges for implementation.

## Contour: the arch bias

Contour — the up/down shape independent of exact intervals — is the most memorable and most cross-culturally robust feature of a melody. Huron's analysis of ~6,000 Western European folksong phrases (the Essen collection) found that the single most common phrase shape is a **convex arch**: rising then falling, an inverted U. He reduced each phrase to first pitch, mean of interior pitches, and last pitch, yielding nine contour classes (ascending, descending, arch, and combinations); the arch and descending types dominate, and phrases very rarely begin and end at registral extremes.

Tierney, Russo & Patel (2011) argue this arch bias plus a general **descending tendency** across a phrase are not stylistic choices but *motor constraints* shared with birdsong: subglottal air pressure rises then falls over a breath, and pitch tends to fall as breath runs out. This matters for the project because it means the arch is a near-universal default, not a Western idiom — a good starting prior for melody in almost any genre.

Caveat: recent work (Savage and colleagues, "Melodic contour does not cluster," 2026) argues contour varies *continuously* and does not fall into clean discrete types — so treat the nine classes as a descriptive vocabulary, not natural categories. For generation, bias toward arch/descending shapes without hard-coding class boundaries.

## Step vs leap, and what happens after a leap

Successive pitches in melodies are overwhelmingly **proximal**: most melodic intervals are steps (a semitone or whole tone) or small (thirds), with leaps comparatively rare and salient. Huron attributes this to a learned expectation ("pitch proximity") grounded in the physics of vibrating sources. Practical distribution to target: the large majority of intervals unisons/seconds/thirds, leaps of a fourth or more a clear minority reserved for emphasis.

Two related asymmetries:
- **Large intervals tend to ascend; small intervals tend to descend** (Vos & Troost 1989), replicated by Huron across many cultures. Leaps up, steps down is a good default.
- **Leaps are usually followed by a change of direction.** von Hippel & Huron (2000) found roughly 70%+ of large leaps are followed by a reversal. This is the phenomenon Meyer (1956) called **gap-fill** (a leap opens a "gap" that stepwise motion then fills in the opposite direction) and that Narmour's **Implication-Realization** model formalizes as: small intervals imply continuation in the same direction; large intervals imply reversal.

The important reinterpretation for engine design: von Hippel & Huron show the *actual* statistical regularity in music is **regression to the mean** — pitches at the extremes of a melody's range tend to be followed by pitches nearer the center — and post-skip reversal is largely a *byproduct*, because leaps tend to land at tessitura extremes, from which the only way back is to reverse. Listeners, however, appear to internalize the simpler heuristic "big leap -> reverse" regardless of absolute pitch height (von Hippel 2002). So an engine can get most of the perceptual payoff cheaply: after any leap of a fourth or more, strongly bias the next motion toward a step in the opposite direction, and additionally pull pitches back toward the center of the current range whenever they stray to an extreme.

## Tessitura, range, and melodic accent

Folk and popular melodies typically span about an **octave to a twelfth** overall, with any single phrase usually staying within an octave; wide-ranging lines are harder to sing and to remember. Keep a running register center and treat departures from it as expressive events that should be resolved, not sustained.

Not every note carries equal weight. **Melodic accent** falls on notes made prominent by: metric position (downbeats — see [rhythm-and-meter](rhythm-and-meter.md)), contour turning points (the peak of an arch, local maxima/minima), agogic length (longer notes), and leap arrivals. The single highest note of a phrase or section — the **melodic peak** or apex — is a powerful structural marker; placing exactly one clear apex per phrase, and one global apex per section, is a reliable way to give a line direction. Apexes clustered late in a phrase read as "building"; early apexes read as "releasing."

## Repetition and varied repetition

A melody becomes *a* melody, rather than passing figuration, through **motivic repetition**. A short cell (a motif — a few notes with a distinctive rhythm and contour) stated, then restated exactly or transposed, then varied, is the engine of memorability. Standard variation operations: exact repeat, sequence (same contour at a new pitch level), rhythmic augmentation/diminution, intervallic expansion/contraction, ornamentation, inversion, retrograde (rare and less perceptible). The craft rule is *repeat enough to establish, vary enough to sustain interest* — the balance discussed under [repetition-and-familiarity](repetition-and-familiarity.md). Previous project engines applied variation operations but without first establishing a motif to vary, so nothing was recognizable as returning.

## Galant schemata: melody and harmony as a joint vocabulary

Robert Gjerdingen's *Music in the Galant Style* (2007) reconstructs how 18th-century composers actually built melodies: not note by note but by stringing together **schemata** — stock two-hand patterns that pair a melodic scale-degree skeleton with a bass and a normative harmonization and a typical position in the phrase. They function like formulae in oral poetry. Key examples (melody / bass, scale degrees):

- **Romanesca** — melody centered on 1 and 5 over a descending bass (often 1-7-6-3 or 1-5-6-3); an *opening gambit*.
- **Prinner** — melody descends 6-5-4-3 over bass 4-3-2-1; a *riposte* answering an opening, often following a Romanesca.
- **Meyer** — paired melodic gestures 1-7 ... 4-3 over bass 1-2 ... 7-1; an opening schema.
- **Do-Re-Mi** — melodic ascent 1-2-3 with tonic-dominant-tonic bass; opening.
- **Fonte / Monte / Ponte** — sequential/prolongational continuation patterns (Fonte descends by step tonicizing ii then I; Monte ascends; Ponte prolongs the dominant).
- **Fenaroli, Indugio, Quiescenza**, and cadence schemata (converging, cadential, half) — pre-cadential and closing formulae.

The load-bearing lesson: real tonal melody is not a Markov walk over scale degrees; it is a *concatenation of ~two-bar chunks* each of which already couples a melodic shape to a harmony and a function (open / answer / sequence / close). An engine that generates from a bank of schema-like chunks, ordered by their conventional roles, will produce far more idiomatic lines than one choosing pitches individually. See [harmony](harmony.md) and [phrase-structure](phrase-structure.md) for the harmonic and syntactic sides of the same chunks.

## Hooks, memorability, and singability

A **hook** is a short, high-salience figure engineered for instant recall — typically distinctive in *both* rhythm and contour, placed at a structurally strong point, and repeated. Uniqueness markers that make a fragment memorable (per Huron): distinctive pitch/rhythm combinations that occur often *within* the piece but are uncommon *in general*, presented early. Singability constraints that keep a line hummable: modest range, mostly stepwise motion, leaps that resolve, phrases short enough to fit one breath (roughly 2-4 seconds), and clear repetition. These are cheap to enforce and pay off directly in "catchiness."

## Non-Western melodic practice (pointers)

The step-bias, arch, and gap-fill regularities recur widely, but many traditions organize melody around principles Western contour statistics miss:
- **Raga** (Indian classical) melody is governed by a grammar of characteristic phrases (*pakad*), permitted ascending/descending scale forms (*aroha/avaroha*), emphasized tones (*vadi/samvadi*), and heavy ornamentation (*gamaka*) — pitch is inseparable from its inflection. See [indian-classical-music](indian-classical-music.md).
- **Maqam** (Arabic) melody follows a *sayr* — a conventional path of registral development and modulation through the mode — again a phrase grammar, not a scale-plus-random-walk.
- East Asian traditions frequently foreground ornament, glissando, and timbre as melodic content. See [east-asian-traditions](east-asian-traditions.md).

The generalizable point: across cultures, melody is governed by *phrase-level grammars and characteristic figures*, not by note-to-note transition probabilities alone.

## Implications for generative engines

- **Generate contour first, pitches second.** Choose an arch or descending phrase shape as a target envelope (arch as default prior), then fill pitches to track it. This alone lifts output above random walk.
- **Interval budget per phrase:** aim for a strong majority of steps/small intervals (seconds and thirds) and a small minority of leaps (fourth+); reserve each leap as a deliberate, accented event rather than a frequent transition.
- **Post-leap rule:** after any leap >= a fourth, bias the next note toward a *step in the opposite direction* with high probability (target ~70%+, matching von Hippel & Huron). Independently, apply a **regression-to-the-mean** pull: when a pitch reaches the top/bottom ~15-20% of the active range, weight the next motion back toward register center.
- **Default motion asymmetry:** leaps up, steps down (Vos & Troost).
- **Bound the range:** keep phrases within ~an octave and whole melodies within ~an octave-to-twelfth around a tracked register center.
- **One apex per phrase, one per section.** Place a single clear high point; make the section's global apex land near a structural climax (see [form-and-structure](form-and-structure.md) and [tension-and-release](tension-and-release.md)).
- **Compose from chunks, not notes.** Build a bank of ~1-2 bar melodic-harmonic cells with functional tags (opening / answer / sequence / cadential), modeled on galant schemata, and sequence them by function. This couples melody to [harmony](harmony.md) and gives idiomatic results a first-order Markov chain cannot.
- **Establish then vary:** state a motif, repeat it (exact or transposed) to lodge it in memory, then apply variation operations. Do not vary material the listener has not yet learned.
- **Enforce singability** as a cheap quality filter: modest range, mostly steps, resolved leaps, breath-length phrases. Good for both foreground themes and background lines.

## Open questions

- How much of the arch/gap-fill prior should carry into non-Western modes, where phrase grammars may override it? Needs A/B listening tests (see [listening-tests-and-feedback](listening-tests-and-feedback.md)).
- Can a compact, hand-authored schema bank cover enough stylistic ground, or does idiomatic melody require corpus-derived chunks? See [corpus-analysis](corpus-analysis.md).
- Contour may not cluster into discrete types; is a continuous contour-target representation better than a categorical one for generation?

## Related pages

- [phrase-structure](phrase-structure.md) — how melodic chunks combine into syntactic units
- [harmony](harmony.md) — the harmonic half of galant schemata
- [rhythm-and-meter](rhythm-and-meter.md) — metric accent and phrase timing
- [repetition-and-familiarity](repetition-and-familiarity.md) — the establish-then-vary balance
- [musical-expectation](musical-expectation.md) — gap-fill and I-R as expectation
- [tension-and-release](tension-and-release.md) — apex placement and melodic tension
- [indian-classical-music](indian-classical-music.md), [east-asian-traditions](east-asian-traditions.md) — non-Western melodic grammars
- [markov-and-statistical-models](markov-and-statistical-models.md) — why note-level Markov walks fall short

## Sources

- Marcus Pearce & Daniel Müllensiefen, review of David Huron, *Sweet Anticipation: Music and the Psychology of Expectation* (MIT Press, 2006) — https://www.marcus-pearce.com/assets/papers/huron06-review.pdf (pitch proximity, regression to the mean vs post-skip reversal, uniqueness markers)
- Paul von Hippel & David Huron, "Why do skips precede reversals? The effect of tessitura on melodic structure," *Music Perception* 18(1), 2000 — https://www.researchgate.net/publication/224982434_Why_Do_Skips_Precede_Reversals_The_Effect_of_Tessitura_on_Melodic_Structure
- David Huron, "The melodic arch in Western folksongs," *Computing in Musicology* 10, 1996 (arch/contour statistics; discussed and critiqued in "Melodic contour does not cluster," 2026) — https://arxiv.org/abs/2604.13119
- Robert Gjerdingen, *Music in the Galant Style* (Oxford, 2007), summarized — https://en.wikipedia.org/wiki/Galant_Schemata
- Eugene Narmour, Implication-Realization model, summarized — https://arxiv.org/pdf/2510.27530
- Adam Tierney, Frank Russo & Aniruddh Patel, "The motor origins of human and avian song structure," *PNAS* 108(37), 2011 — https://www.pnas.org/doi/10.1073/pnas.1103882108
