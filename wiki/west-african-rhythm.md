---
title: West African rhythm
tags: [genre]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Timeline-anchored ostinato ensembles with systematic cross-rhythm, master-drummer variation, and interlocking parts — an engine architecture for rhythm-forward music, read with Agawu's cautions against exoticism.
---

# West African rhythm

The percussion-ensemble traditions of West Africa (Ewe, Yoruba, Akan, Mande/djembe, and relatives) and the related lamellophone traditions of southern/eastern Africa (Shona mbira, Ugandan amadinda) organize music around a repeating asymmetric timeline, a stack of fixed ostinato parts, and one privileged variable voice — a lead drummer working from a known repertoire of variations. This is a complete, proven architecture for music whose primary content is rhythm and texture rather than melody or harmony, and nearly every component is directly implementable. One caution frames the whole page: these are many distinct repertoires with names, owners, and dance/social functions, not one "African rhythm" — a generalization Kofi Agawu has shown to be largely a Western construction.

## The timeline: an asymmetric timekeeper

Most of these musics are anchored by a short repeating *timeline* (bell/key pattern), usually on an iron bell or high idiophone. The most widespread is the seven-stroke **standard pattern**: 12 fast pulses with strokes spaced 2+2+1+2+2+2+1 (onsets at pulses 0,2,4,5,7,9,11):

```
pulse:  0 1 2 3 4 5 6 7 8 9 10 11
bell:   x . x . x x . x . x .  x
```

A five-stroke reduction of it is common, and its duple-pulse (16-pulse) relatives include the Cuban son clave and the 3+3+2 *tresillo* — the diaspora forms are transformations of the same family (Wikipedia, Bell pattern). The pattern's distribution correlates with the Niger–Congo language family; Kubik links its spread to ancient migrations. Functionally the timeline is not a melody and not the meter itself: it is an asymmetric *key* against which every other part is phased — Peñalosa's formulation is that key patterns define rhythmic structure the way scales define harmonic structure. Because it is asymmetric, any moment in the cycle is uniquely identifiable by ear — the timeline is a positional address system.

## Cross-rhythm: 3:2 as structural principle

Beneath the timeline runs a regular beat scheme — typically four ternary beats per 12-pulse cycle, grounded in the dancers' feet. The same 12 pulses simultaneously support six duple beats, and this two-in-the-time-of-three duality is generative, not occasional: Novotney calls 3:2 "the foundation of most typical... polyrhythmic textures found in West African musics," and Locke writes that "ternary beats invariably imply their binary counterparts; in other words, 3:2 is an inseparable twinning." Locke's "metric matrix" describes the result: an implicit grid of coexisting beat streams (4-feel and 6-feel over the same cycle) from which parts and listeners can select perspectives — his "simultaneous multidimensionality." Willie Anku's set-theoretic model makes the machine explicit: music perceived as circular, one regulative beat per cycle dividing it into four equidistant beats, with 12-time-point and 16-time-point sets as the two basic cycle types. Two cautions from insiders and critics alike: the components are not independent layers but "a single Gestalt" (Agawu/Ladzekpo — hence skepticism about "polymeter" notation), and meter is embodied — Agawu: "many misinterpretations of African rhythm and meter stem from a failure to observe the dance" (*African Rhythm: A Northern Ewe Perspective*, 1995). See [groove-and-embodiment](groove-and-embodiment.md).

## Ensemble roles: fixed ostinati plus one variable voice

The role hierarchy is consistent across repertoires (Ewe drumming is the best-documented case — Locke, Anku):

- **Timekeepers**: bell (timeline) and rattle; unvarying.
- **Support drums**: each locks a short ostinato to a specific phase of the timeline, often deliberately off-beat, forming a composite lattice. Parts are quasi-immutable; identity of the piece lives here.
- **Response/middle drum**: semi-fixed, in dialogue with the lead.
- **Lead (master) drum**: the one free agent — but Anku stresses that the lead drummer structurally manipulates relatively few set rhythms — drawn from a stock of generative rhythmic vocabulary, not invented on the spur of the moment — recombining stock variations by rotation, substitution, and interpolation against the stable background, and signaling section changes to drummers and dancers.
- **Call-and-response** pervades both drum dialogue and song above it.

The Mande djembe ensemble instantiates the same design: dunun trio (kenkeni, sangban, dundunba) as pitched interlocking ostinati with cycles of different lengths, accompaniment djembes on short repeating patterns built from three strokes (bass/tone/slap), and one lead djembe playing solo phrases that cue the dancers and mark the choreography (Wikipedia, Djembe).

## Interlocking and inherent patterns

Several traditions split fast composite lines between players in strict alternation. On the Ugandan amadinda xylophone, two players interlock so their strokes fall exactly between each other; Kubik documented how *inherent patterns* — melodies nobody is individually playing — emerge perceptually from the composite as the ear streams it by register (an auditory-gestalt effect; the full figure exists only at ensemble speed). Shona mbira music works the same way: the *kushaura* (lead) part and *kutsinhira* (interlocking second) part — "one player sounds in the silence of the other" (Scherzinger) — over cycles of 12/36/48 pulses, with hosho rattles keeping the ternary pulse, in the bira spirit-ceremony context documented by Berliner. Scherzinger's analysis adds two engine-relevant facts: buzzing timbre (bottle-cap rattles on the soundboard) is a designed feature, and the cyclical patterns are built to support *multiple valid metric hearings* — harmonic rhythm, bass placement, and figuration each imply different downbeats, so long repetition keeps revealing new orientations instead of going stale. Same principle as Balinese kotekan ([gamelan](gamelan.md)).

## Agawu's critique: respect before modeling

Agawu ("The Invention of 'African Rhythm'," 1995; *Representing African Music*, 2003) argues that Western scholarship, driven by "a constant search for difference," constructed "African rhythm" as an exotic monolith — overstating rhythmic complexity and otherness, understating melody, song, language, and everything African musics share with other musics — and he recommends de-exoticizing by emphasizing affinity. Locke's and Scherzinger's responses accept the critique while defending close analysis (Scherzinger: use African cases to improve *general* meter theory). For this project the practical readings are: (1) name the tradition an engine draws on (Ewe agbekor-family, Mande djembe, Shona mbira), don't ship an "African mode"; (2) these musics are precise ensemble craft with known parts and owners, not a texture of generic syncopation; (3) rhythmic devices here (timelines, hemiola) also exist elsewhere — treat them as musical technology, with attribution, not as ethnic flavor.

## Implications for generative engines

1. **Timeline as clock-key.** Implement the cycle as N fast pulses (12 or 16) with an asymmetric key pattern owning fixed onsets. Every generated part is defined by its phase relation to the key pattern, not to "beat 1." This buys: positional identifiability, built-in syncopation, and diaspora portability (12-pulse standard pattern ↔ 16-pulse clave family).
2. **Two-level pulse model.** Represent time as pulses grouped simultaneously into 4 ternary beats and 6 binary beats (and let parts reference either). Cross-rhythm then falls out of part placement instead of being faked with random syncopation. Dance grounding suggests keeping one stream (the 4-beat "feet" layer) sonically or dynamically privileged.
3. **Ostinato ensemble + one free agent.** Architecture: k fixed short loops (different lengths/phases, interlocking registers) + one lead voice choosing from a finite set of variation cells with rotation/substitution/interpolation operators (Anku's model is nearly pseudocode), plus occasional signal phrases that trigger global section changes. This concentrates all generative intelligence in one voice — cheap and effective.
4. **Interlock generator.** Split a target composite line between two voices in strict alternation (or silence-filling), with register separation tuned so inherent patterns emerge. Emergent melody from dumb parts is one of the highest richness-per-line-of-code tricks available. Buzz/noise components in timbre are idiomatic, not dirt ([timbre-and-orchestration](timbre-and-orchestration.md), [synthesis-recipes](synthesis-recipes.md)).
5. **Design for metric ambiguity.** Compose ostinati whose accents support 2–3 different downbeat hearings (Scherzinger). Long repetition then sustains attention without new material — directly relevant to [repetition-and-familiarity](repetition-and-familiarity.md) and [ambient-and-generative-genre](ambient-and-generative-genre.md).
6. **Call-and-response scheduling.** Alternate a "call" generator and constrained "response" generator across voices; also works melodically.
7. **Microtiming caution.** Swing/non-isochronous pulse spacing in these traditions is real but repertoire-specific (see [groove-and-embodiment](groove-and-embodiment.md)); start with even pulses plus stroke-level dynamics, add measured swing ratios only from tradition-specific data.

## Open questions

- Per-repertoire swing ratios (e.g., Malian jembe studies by Polak) — collect concrete numbers before implementing microtiming.
- How rigid are support-drum parts across performances of one Ewe piece in practice? (Sources say near-fixed; degree of tolerated variation unclear.)
- Lead-drum variation grammars: Anku gives the theory; a concrete variation-cell table for one piece (e.g., from Locke's Gahu materials) would make the engine spec executable.
- Mbira harmonic sequence (the 4-phrase, 12-beat harmonic cycle) deserves its own treatment — it is pitch architecture, not just rhythm.

## Related pages

- [groove-and-embodiment](groove-and-embodiment.md) — microtiming, dance grounding, entrainment research
- [rhythm-and-meter](rhythm-and-meter.md) — pulse, meter, and cross-rhythm fundamentals
- [repetition-and-familiarity](repetition-and-familiarity.md) — why cycle + variation holds attention
- [gamelan](gamelan.md) — the other great interlocking-cycle architecture
- [electronic-and-dance](electronic-and-dance.md) — clave/tresillo descendants in modern dance idioms
- [generative-music-design-patterns](generative-music-design-patterns.md) — ostinato-plus-soloist as a reusable pattern
- [musical-universals](musical-universals.md) — small-integer rhythm categories incl. 3:3:2 cross-culturally
- [style-and-genre-overview](style-and-genre-overview.md) — where these traditions sit in the project's genre map

## Sources

- D. Locke, "Yewevu in the Metric Matrix," *Music Theory Online* 16.4 (2010). https://mtosmt.org/issues/mto.10.16.4/mto.10.16.4.locke.html
- W. Anku, "Circles and Time: A Theory of Structural Organization of Rhythm in African Music," *Music Theory Online* 6.1 (2000). https://mtosmt.org/issues/mto.00.6.1/mto.00.6.1.anku.html
- M. Scherzinger, "Temporal Geometries of an African Music: A Preliminary Sketch," *Music Theory Online* 16.4 (2010). https://www.mtosmt.org/issues/mto.10.16.4/mto.10.16.4.scherzinger.html
- Wikipedia, "Bell pattern" — https://en.wikipedia.org/wiki/Bell_pattern; "Rhythm in Sub-Saharan Africa" — https://en.wikipedia.org/wiki/Rhythm_in_Sub-Saharan_Africa; "Mbira" — https://en.wikipedia.org/wiki/Mbira; "Djembe" — https://en.wikipedia.org/wiki/Djembe
- K. Agawu, "The Invention of 'African Rhythm'," *Journal of the American Musicological Society* 48/3 (1995); *African Rhythm: A Northern Ewe Perspective* (Cambridge Univ. Press, 1995) — source of the "failure to observe the dance" quote; and *Representing African Music: Postcolonial Notes, Queries, Positions* (Routledge, 2003). https://books.google.com/books/about/Representing_African_Music.html?id=30JpAwAAQBAJ (positions corroborated via Scherzinger 2010 and secondary summaries)
- G. Kubik, *Theory of African Music*, Vol. I (Univ. of Chicago Press) — amadinda interlocking, inherent patterns. https://press.uchicago.edu/ucp/books/book/chicago/T/bo8648201.html
- P. Berliner, *The Soul of Mbira* (Univ. of California Press, 1978) — mbira practice and bira context (cited via Mbira sources above).
