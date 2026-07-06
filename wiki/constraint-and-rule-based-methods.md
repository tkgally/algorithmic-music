---
title: Constraint and rule-based methods
tags: [algorithms]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Composition as constraint satisfaction and rule-guided search — CHORAL, Schottstaedt's penalty counterpoint, modern CP systems, and search strategies that run well in vanilla JavaScript.
---

# Constraint and rule-based methods

Music theory pedagogy is already a rule system — "no parallel fifths," "resolve the leading tone," "prefer contrary motion" — so encoding composition as rules plus search is the most direct computational reading of the craft. This family produced the most idiomatically convincing non-corpus systems in the field's history, and it is the family whose main historical cost (hand-writing hundreds of rules) an LLM engine-author erases. This page covers the classic systems, the hard/soft constraint distinction, search strategies that fit a browser, and the generate-and-test architecture that generalizes all of it.

## Composition as constraint satisfaction

Formally: variables (each note/chord slot), domains (allowed pitches/durations/chords), constraints (relations among variables), and a solver that finds assignments satisfying all constraints. Musical knowledge has been formalized as symbolic rules for centuries, which is why constraint programming maps onto composition so naturally (Anders & Miranda 2011, the definitive survey). The generate-and-test pattern goes back to the field's origin: the Illiac Suite (1956–57) generated random material and kept what passed encoded counterpoint rules ([algorithmic-composition-history.md](algorithmic-composition-history.md)). Two properties make CSP formulations attractive beyond quality: **declarativeness** (rules are data — add, remove, reweight without rewriting the generator) and **explainability** — you can ask *why* a note was chosen or rejected by inspecting which constraints bound it. No statistical or neural method offers that; for an LLM-driven [improvement-loop.md](improvement-loop.md), explainability is the difference between debugging and guessing.

## Ebcioğlu's CHORAL: the classic

CHORAL (Ebcioğlu 1988) harmonizes chorale melodies in Bach's style with **~350 rules written in first-order predicate calculus** in BSL, a custom backtracking logic language with optimizations such as backjumping. Key design decisions, per Ebcioğlu and the survey literature (Fernández & Vico 2013):

- **Multiple viewpoints**: rules address the chord skeleton, the fill-in (passing/neighbor eighth-notes), individual melodic lines per voice, and Schenkerian-flavored voice-leading — parallel descriptions of the same music, each with its own constraints. Complex musical adequacy emerges from the *intersection* of viewpoints, not from any single rule set.
- **Three rule types**: production rules (generate candidates), constraints (absolute prohibitions that prune), and **heuristics** (preferences that rank surviving candidates — "prefer the smoothest bass"). The heuristic layer is what lifts output from "legal" to "musical."
- **Generate-and-test with intelligent backtracking** over this rule base; Ebcioğlu judged results at the level of a talented music student.

The replication lesson: 350 is the right order of magnitude. Too few rules tends toward legal-but-dead output; Tsang & Aitken's 20-rule harmonizer was, in Fernández & Vico's (2013) assessment, "grossly inefficient" — needing up to 70 MB to harmonize an 11-note phrase — and never approached CHORAL's idiomatic quality. Style lives in the long tail of small preferences.

## Schottstaedt: penalty-based species counterpoint

Schottstaedt's automatic species counterpoint program (CCRMA report STAN-M-19, 1984; chapter version 1989) encoded Fux's *Gradus ad Parnassum* (1725) as **weighted penalties rather than absolutes**, because Fux himself treats most rules as guidelines: each violation adds its penalty to a solution's cost, with values set partly from Fux's own remarks about importance and partly from listening to program output; search is best-first with backtracking, since exhaustive search is hopeless even for 10-note exercises (~16 move options per note ⇒ 16^10 paths) (Schottstaedt 1984; Fernández & Vico 2013). This is the founding example of the **soft-constraint/cost-function view of style**: a style is a penalty vector, and re-weighting penalties re-styles output without touching the generator. Gjerdingen's schema-based counterpoint and Löthe's textbook-derived minuet rules are kin (Fernández & Vico 2013). Directly relevant to [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md).

## Modern constraint programming for music

The CP-for-music line matured into general systems, surveyed comprehensively by Anders & Miranda (2011): PWConstraints and Situation (PatchWork/OpenMusic), score-PMC for polyphony, PWMC for rhythm+pitch (Sandred 2010), and **Strasheela** (Anders 2007), designed so users define their own theories — its showcase re-implemented Schoenberg's harmony textbook to generate progressions from the rules alone (Anders & Miranda 2009, per Fernández & Vico 2013). Two implementation patterns deserve note:

- **OMClouds** (Truchet et al. 2003) translates constraints into cost functions and runs adaptive tabu (local) search instead of tree search — tolerant of over-constrained problems (returns the best imperfect solution rather than failing), at the price of completeness. For an engine that must always emit *something*, this failure behavior is the right one.
- **MorpheuS** (Herremans & Chew 2017) generates polyphonic (piano) pieces by variable neighborhood search optimizing pitches to (a) match a target tension profile (spiral-array model) and (b) preserve repeated-pattern structure detected from a template piece — long-range structure imposed as constraints on an optimizer, no corpus training at generation time. It is the strongest recent demonstration that "constraint + metaheuristic + explicit tension plan" scales past exercises to whole affect-shaped pieces ([tension-and-release.md](tension-and-release.md)).

## Hard vs. soft constraints, weighted rules, cost functions

Practical consensus across CHORAL, Schottstaedt, OMClouds, MorpheuS:

- **Hard constraints** = grammaticality (range, key membership where absolute, forbidden parallels in strict styles, playability). Keep few; they define the search space.
- **Soft constraints/penalties** = style and taste (melodic smoothness, contour variety, dissonance handling preferences, spacing). Keep many; they define the ranking. Sum of weighted penalties = cost function = "musical critic."
- Over-constraining is the endemic failure: too many hard rules ⇒ no solutions or dead uniform ones. When in doubt, make it soft. Rule weights are the tuning surface — exactly the knob an LLM + [listening-tests-and-feedback.md](listening-tests-and-feedback.md) loop should iterate on.

## Search strategies feasible in browser JS

All of the classics ran on 1980s hardware; a modern browser is orders of magnitude faster, and none of this needs libraries:

- **Chronological backtracking + constraint propagation** — fine for phrase-scale problems (harmonize 8–16 slots, 4 voices). Order variables by most-constrained-first; propagate domain reductions eagerly. CHORAL-style backjumping helps but plain backtracking usually suffices at our sizes.
- **Beam search** — keep the k best partial solutions per step under the running penalty sum; near–anytime, easily bounded per audio callback budget. A good default for melody/voice-leading under cost functions.
- **Best-first** (Schottstaedt's choice) — same machinery, global frontier.
- **Local search: simulated annealing / tabu / variable neighborhood search** — start from any legal draft, repeatedly mutate (change a pitch, swap a rhythm), accept by cost; OMClouds and MorpheuS prove the pattern musically. Best when constraints interact too much for constructive search. Anytime by nature — can keep polishing an upcoming section in idle time ([scheduling-and-timing.md](scheduling-and-timing.md), [audio-worklets-and-performance.md](audio-worklets-and-performance.md)).
- **Genetic algorithms with rule-based fitness** — populations of phrases evolved against a critic. Landmark: Biles's **GenJam** (1994) evolved jazz-solo measure/phrase populations with a *human* pressing good/bad — and Biles named the resulting **fitness bottleneck**: human evaluation is so slow that evolution starves; neural surrogate raters (Biles et al. 1996) largely failed (Fernández & Vico 2013). Moral: GAs add value only when the fitness function is *automatic* — i.e., a rule-based critic — at which point simpler local search over the same critic often does as well with less machinery. GA-vs-annealing is an implementation detail; the critic is the intellectual content.

## Generate-and-test with musical critics: the general architecture

Every success in this family reduces to: **propose candidates cheaply → score them with encoded musical judgment → keep/repair the best**. The proposer can be anything ([markov-and-statistical-models.md](markov-and-statistical-models.md) walks, [grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md) derivations, [stochastic-chaos-and-automata.md](stochastic-chaos-and-automata.md) streams); the critic is where musicianship lives. Critics compose: a voice-leading critic, a melodic-contour critic, a rhythm-interest critic, a tension-trajectory critic, each a weighted penalty module with named, explainable violations. This architecture also gives [computational-music-metrics.md](computational-music-metrics.md) for free — the critics *are* metrics runnable over whole generated corpora offline.

## Style emulation vs. original styles

Rule systems bifurcate: **emulation** (CHORAL, Schottstaedt, Löthe — rules transcribed from treatises for a known style; verifiable against real repertoire but capped at pastiche) vs. **original styles** (Xenakis's formalisms; Strasheela user theories — rules invented to define a new coherent practice; unfalsifiable but unbounded). For this project both matter: emulation rule sets are the fastest route to "genuinely good" in familiar genres because centuries of treatises are effectively pre-authored rule text an LLM already knows; original-style rule sets are how browser-native genres ([ambient-and-generative-genre.md](ambient-and-generative-genre.md)) get internal consistency instead of arbitrariness. In both cases the failure mode is the same: rules guarantee coherence, not interest — a critic for *interestingness* (contour variety, expectation shaping, non-redundancy) must sit alongside the correctness rules ([musical-expectation.md](musical-expectation.md), [complexity-and-preference.md](complexity-and-preference.md)).

## Implications for generative engines

- Build every engine around explicit critic modules: hard-rule filters + weighted soft-penalty scorers with named rules and per-style weight vectors, stored as data. This is the project's single most transferable architecture decision.
- Write many small rules, not few big ones — CHORAL's ~350 vs. Tsang & Aitken's 20 is the canonical quality gap. LLM authorship makes 350 cheap; keep each rule unit-testable against tiny score fragments.
- Default search stack for a browser engine: constructive beam search for line/harmonization problems; annealing/VNS repair passes for whole-section polish; plain backtracking for small strict problems (cadences, voicings). All are ~50–150 lines of vanilla JS each.
- Make every rejection loggable ("bar 12, candidate F#4 rejected: parallel-octaves(rule V17) with tenor") — explainability is what lets a future Claude session diagnose *musical* failures from transcripts instead of re-listening blind.
- Use style = weight-vector: one rule base per broad practice, many named weight presets per genre/mood; interpolate weight vectors for transitions ([style-and-genre-overview.md](style-and-genre-overview.md)).
- Never let a GA/optimizer's fitness be implicit or emergent; the critic must be inspectable, or the fitness bottleneck reappears as "we can't tell why it's better."

## Open questions

- Where is the quality ceiling of critics-plus-search *without* corpus statistics — does pure rule-craft reach "good" for melody, or only for harmony/counterpoint? (Historical evidence is strongest for harmonization tasks.)
- What per-frame compute budget do beam/annealing searches actually need for real-time generation ahead of the playhead? Needs measurement in [audio-worklets-and-performance.md](audio-worklets-and-performance.md) territory.
- Can LLM-authored rules for *non-notated* traditions (groove, gamelan interlocking) reach the fidelity that treatise-based rules give Western styles? ([west-african-rhythm.md](west-african-rhythm.md), [gamelan.md](gamelan.md))

## Related pages

- [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md) — the rule domain where this family is strongest
- [harmony.md](harmony.md) — functional syntax as rules
- [grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md) — grammars propose, constraints dispose
- [markov-and-statistical-models.md](markov-and-statistical-models.md) — statistical proposers under constraints
- [tension-and-release.md](tension-and-release.md) — tension profiles as optimization targets (MorpheuS)
- [computational-music-metrics.md](computational-music-metrics.md) — critics as metrics
- [evaluation-challenges.md](evaluation-challenges.md) — why explainability matters
- [engine-architecture.md](engine-architecture.md) — where critics/search sit in the code

## Sources

- Anders, T. & Miranda, E. R. "Constraint Programming Systems for Modeling Music Theories and Composition." *ACM Computing Surveys* 43(4) (2011). https://dl.acm.org/doi/10.1145/1978802.1978809
- Ebcioğlu, K. "An Expert System for Harmonizing Four-Part Chorales." *Computer Music Journal* 12(3) (1988); expanded in *J. Logic Programming* 8 (1990). Summarized in Fernández & Vico 2013.
- Schottstaedt, W. "Automatic Species Counterpoint." CCRMA Tech. Report STAN-M-19, Stanford (1984). https://ccrma.stanford.edu/files/papers/stanm19.pdf
- Fernández, J. D. & Vico, F. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013), §3.2. https://arxiv.org/abs/1402.0585
- Herremans, D. & Chew, E. "MorpheuS: Generating Structured Music with Constrained Patterns and Tension." *IEEE Trans. Affective Computing* 10(4):510–523 (2019; arXiv 2018). https://doi.org/10.1109/TAFFC.2017.2737984 (arXiv: https://arxiv.org/abs/1812.04832)
- Biles, J. A. "GenJam: A Genetic Algorithm for Generating Jazz Solos." *ICMC* (1994); fitness-bottleneck discussion per Fernández & Vico 2013, §3.5.
