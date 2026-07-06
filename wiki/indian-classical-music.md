---
title: Indian classical music
tags: [genre]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Raga as grammar-constrained melodic improvisation over a fixed drone within cyclic tala, unfolding by gradual intensification — a working blueprint for generative melody engines.
---

# Indian classical music

The two Indian classical traditions — Hindustani (north) and Carnatic (south) — are the world's most developed systems of grammar-constrained melodic improvisation. A performance is not a composition being executed; it is a raga (a melodic grammar far richer than a scale) being explored in real time, over an unchanging drone, inside a cyclic meter, along a form of gradual revelation and intensification. Every one of those components is algorithmically legible, which makes this tradition a primary model for any engine that wants to generate long, coherent, non-repetitive melody without harmony.

*Project note (2026-07-06): this tradition is a **launch-engine priority** — the first-engines shortlist now swaps the gamelan-architecture engine for an **Indian classical + pop** engine, because Tom may have an India-based collaborator to evaluate both idioms ([project-roadmap](project-roadmap.md)). Caveat: this page covers Indian **classical** music only; **Indian popular/film music** (filmi/Bollywood and regional pop) is a declared [coverage gap](index.md) to fill before that engine is built.*

## Raga: a grammar, not a scale

A raga is "a melodic framework for improvisation and composition" (Britannica): a tone set plus rules about how tones move, which phrases identify the raga, and what mood it projects. Several hundred ragas are in active use. The load-bearing components:

- **Aroha / avaroha** — the ascending and descending forms, which often differ: a tone may be permitted going up but skipped or approached obliquely coming down (or vice versa). Melodic legality is direction-dependent.
- **Vadi / samvadi** — the most prominent tone ("king") and the second most prominent ("queen," typically a fourth or fifth away). These are emphasis weights: where phrases rest, which tones get duration and stress.
- **Pakad / characteristic phrases** — a signature phrase or small phrase family that identifies the raga. Two ragas can share a scale and be distinguished entirely by phrase behavior and emphasis.
- **Ornaments as constitutive, not decorative.** Gamaka (oscillations, slides, deflections — at least fifteen named types in Carnatic practice, e.g., kampita; Hindustani meend glides and andolan swings) are part of a raga's identity: some ragas "can never exist without key gamakas" (Wikipedia, Gamaka). A raga rendered as plain discrete pitches is not that raga. Pitch trajectory between notes is first-class content.
- **Extramusical bindings** — traditional time-of-day and seasonal associations and a target mood (rasa); Britannica notes the time rules are "largely ignored in modern concert life," but the mood-identity of a raga is still taken seriously.

## The drone

A tanpura (or electronic substitute) sounds the tonic continuously through the entire performance — typical tuning Pa–sa–sa–Sa (fifth, two middle tonics, lower-octave tonic), with alternatives (e.g., Ma-based) for ragas omitting Pa. Its curved *jivari* bridge with adjustable thread makes each string's harmonic content sweep as it decays, producing a buzzing, overtone-rich halo — "an acoustic dynamic reference chord from which the ragas are anchored" (Wikipedia, Tanpura). There is no harmonic progression anywhere in the system: all tension and release is melodic and rhythmic, heard against this fixed reference. Sa is fixed per performer, not standardized (there is no A440 anchor).

## Tala: cyclic time

Tala is a repeating cycle (avart) of beats (matra) grouped into sections (vibhag), articulated by claps and waves and, on the drum, by a characteristic stroke pattern (theka) whose syllables (bols) define the tala's sound. The Hindustani workhorse is **tintal**: 16 beats as 4+4+4+4, with **sam** — beat 1 — the stressed arrival point (marked X), a **khali** ("empty," shown by a wave, conventionally at beat 9 in tintal, marked 0), and clapped **tali** beats. Carnatic music organizes talas via the suladi sapta system — seven families assembled from angas: laghu (variable length), drutam (2 beats), anudrutam (1 beat) — with **adi tala** (8 beats) most common. Improvisation gains tension by pulling against the cycle's subdivisions and resolves by landing (often via a thrice-repeated cadential figure, tihai, in Hindustani practice) on sam. The cycle is felt even when the surface floats free of it.

## Form: gradual revelation

Both traditions build performances that reveal the raga gradually and intensify monotonically — form as accumulating energy rather than thematic contrast:

- **Hindustani**: *alap* — unmetered, slow, no drum, the raga's tones and phrases introduced from the ground up; *jor* — a pulse appears, still no tala; *jhala* — fast, driving figuration; then the *gat* (instrumental) or *bandish* (vocal), a short fixed composition in a specific raga and tala with tabla, treated at slow (vilambit), medium (madhya), and fast (drut) tempos with expanding improvisation. Dhrupad keeps the older, austere version of this arc (very long alap); khyal is the dominant, more ornamented modern genre. Transmission runs through gharanas (stylistic lineages).
- **Carnatic**: the composed *kriti* (pallavi–anupallavi–charanam) is central, wrapped in improvised forms collectively called *manodharma*: **alapana** (free, unmetered raga exposition), **tanam** (pulsed but uncycled flow), **niraval** (recomposing one line of text/melody many ways while keeping its tala position), **kalpanaswara** (improvised solfege runs that must land on a target note at a target point of the cycle), and the tour-de-force ragam–tanam–pallavi.

Note the shared logic: free rhythm → pulse → cycle; low register → full range; sparse → dense. Intensity has one direction.

## Improvisation as constrained search

The performer is executing a grammar: legal tones (direction-dependent), weighted emphasis (vadi/samvadi, phrase-final seleh-like resting tones), a phrase lexicon (pakad and its family), obligatory ornament shapes per tone, a rhythmic cycle with a mandatory arrival point, and a global intensity schedule. Everything else is free. That this is learnable and formalizable is supported from two directions: perception — Castellano, Bharucha & Krumhansl (1984) showed listeners (including Western listeners with no training) infer a raga's tonal hierarchy from surface statistics (which tones sound often and long), with enculturated listeners adding scale-system knowledge; and computation — the ERC CompMusic project (2011–2017, UPF Barcelona) built corpora and working tools for raga/tala recognition, intonation description, and melodic motif discovery for both Hindustani and Carnatic music, treating the traditions on their own terms rather than through Western feature sets.

## Hindustani vs Carnatic, briefly

Same deep model (raga + tala + drone + manodharma), different accents: Hindustani classifies ragas partly by mood/time and centers long solo improvisation growing out of alap; Carnatic classifies ragas by the technical traits of their scales (the melakarta parent-scale system), centers a large composed repertoire (kritis), uses more continuous and obligatory gamaka, and interleaves improvisation with composition in tighter alternation. Instruments differ (sitar/sarod/tabla vs veena/violin/mridangam), as do concert formats. For engine purposes the Carnatic version is instructive for ornament modeling and composition-plus-variation; the Hindustani version for long-form single-raga development.

## Implications for generative engines

1. **Represent a "raga object," not a scale array.** Minimum viable grammar: tone set with separate ascent/descent transition tables (a first-order Markov or small finite-state machine over scale degrees, direction-conditioned); emphasis weights per tone (vadi/samvadi, allowed resting tones); a phrase lexicon (3–8 pakad-like templates with variation slots); per-tone ornament specs. This is directly buildable with [markov-and-statistical-models](markov-and-statistical-models.md) plus [grammars-and-rewriting-systems](grammars-and-rewriting-systems.md), and constraint filtering ([constraint-and-rule-based-methods](constraint-and-rule-based-methods.md)).
2. **Ornaments are synthesis-level, not note-level.** Implement meend/gamaka as pitch trajectories (glides, controlled oscillations, approach curves) on a continuous-pitch voice — detune envelopes on an oscillator, not grace-note MIDI. Without this the output will sound like a scale exercise, the exotic-wallpaper failure mode. See [synthesis-recipes](synthesis-recipes.md) and [expressive-performance](expressive-performance.md).
3. **Drone as free coherence.** A well-voiced overtone-rich drone (staggered re-articulation, slow spectral movement imitating jivari) makes every melodic tone instantly interpretable against the tonic — enormous coherence gain for near-zero generative cost, and it suits background listening. Fix the tonic per piece; do not modulate.
4. **Tala as cycle-with-addresses.** Implement meter as a cycle where positions have roles (sam = obligatory arrival, khali = light, vibhag boundaries = orientation). Cadence logic: generate phrases backward from their landing point; a tihai-like device (repeat a figure three times to land exactly on sam) is a mechanical, highly effective tension-resolver.
5. **Form = one-way intensity schedule.** Alap → pulse → cycle → acceleration maps to a global driver: start unmetered/sparse/low-register/narrow tone set, admit tones gradually (revelation), then add pulse, then cycle, then density. This gives 10–30+ minutes of shape from one raga object with no thematic contrast needed. See [form-and-structure](form-and-structure.md) and [tension-and-release](tension-and-release.md).
6. **Intonation matters but tonic-relative.** Use just-leaning intervals relative to the drone (and raga-specific shadings) rather than 12-TET; CompMusic's intonation work shows measurable raga-specific pitch distributions. See [tuning-and-scales](tuning-and-scales.md).
7. **Honesty check.** An engine following these rules produces something raga-*like*; real raga performance encodes lineage-specific phrase knowledge (gharana/bani) that a generic grammar will miss. Say "raga-inspired," and prefer depth in a few ragas over shallow coverage of many.

## Open questions

- What is the smallest phrase-lexicon size that reliably evokes a specific raga rather than a generic mode? (Castellano et al. imply hierarchy alone gets partway; pakad likely carries identity.)
- Tihai construction math (fitting 3× phrase + gaps into remaining beats) — worth a worked implementation note in [rhythm-and-meter](rhythm-and-meter.md).
- Which ragas tolerate discrete-pitch approximation best (engine-friendly), and which are meaningless without heavy gamaka (e.g., many Carnatic ragas)?
- Khali placement varies by tala; verify per-tala tables before implementing beyond tintal/adi.

## Related pages

- [melody](melody.md) — general melodic principles this tradition concentrates
- [grammars-and-rewriting-systems](grammars-and-rewriting-systems.md) / [markov-and-statistical-models](markov-and-statistical-models.md) / [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md) — the implementation toolkit for raga grammars
- [form-and-structure](form-and-structure.md), [tension-and-release](tension-and-release.md) — gradual-revelation form generalized
- [tuning-and-scales](tuning-and-scales.md) — drone-referenced intonation
- [expressive-performance](expressive-performance.md) — ornament and timing models
- [jazz-and-improvisation](jazz-and-improvisation.md) — the other big improvisation grammar, chord-driven by contrast
- [musical-expectation](musical-expectation.md) — tonal hierarchies and statistical learning (Castellano et al. is key evidence)
- [gamelan](gamelan.md), [west-african-rhythm](west-african-rhythm.md), [east-asian-traditions](east-asian-traditions.md) — sibling genre studies

## Sources

- Encyclopaedia Britannica, "Raga." https://www.britannica.com/art/raga
- Wikipedia, "Tala (music)" — https://en.wikipedia.org/wiki/Tala_(music); "Hindustani classical music" — https://en.wikipedia.org/wiki/Hindustani_classical_music; "Manodharma" — https://en.wikipedia.org/wiki/Manodharma; "Tanpura" — https://en.wikipedia.org/wiki/Tanpura; "Gamaka (music)" — https://en.wikipedia.org/wiki/Gamaka_(music)
- CompMusic project (X. Serra et al., UPF, 2011–2017) — computational modeling of Hindustani/Carnatic (and other) traditions. https://compmusic.upf.edu/
- M. A. Castellano, J. J. Bharucha, C. L. Krumhansl, "Tonal Hierarchies in the Music of North India," *Journal of Experimental Psychology: General* 113(3), 1984. http://www.brainmusic.org/EducationalActivities/Castellano_Indianmusic1984.pdf
