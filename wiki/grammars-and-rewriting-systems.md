---
title: Grammars and rewriting systems
tags: [algorithms]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Generative grammars, GTTM, Schenkerian elaboration, Steedman's jazz grammar, and L-systems as engines of hierarchical musical structure — the strongest known lever on long-range coherence.
---

# Grammars and rewriting systems

A grammar generates music top-down: high-level symbols (piece, section, phrase) are recursively rewritten into more detailed symbols until a note-level surface emerges. Because the derivation tree *is* a hierarchical plan, grammars deliver exactly what this project's Markov-based engines lacked — phrase structure, long-range dependency, and goal-directedness — essentially for free. Their historical cost, the effort of hand-writing good rules, is the cost an LLM code-author specifically collapses, which makes this family a prime candidate for the next engines.

## Formal grammars applied to music

Applying Chomsky-style rewriting to music dates to the early 1970s (Lidov & Gabura 1973 for rhythm; Rader 1974's hand-built probabilistic melody grammar; Baroni & Jacoboni 1978's Bach-chorale melody grammar). Fernández & Vico (2013) survey the field and note two persistent findings: nearly all workable systems use regular or context-free grammars (context-sensitive ones have never been made practical beyond toys), and the two central design problems are (a) where rules come from — hand-written from theory, inferred from a corpus, or evolved — and (b) the **mapping problem**: what the symbols denote (notes, chords, melodic segments, or — more interestingly — using the *derivation tree itself* to shape the piece, as in Jones's 1980 "space grammars"). Rules are typically layered: one (sub)grammar for form, one for phrases, one for surface figures. Stochastic grammars attach probabilities to competing productions, which is where Markov-style weighting re-enters ([markov-and-statistical-models.md](markov-and-statistical-models.md)).

## GTTM: the analytical grammar of tonal listening

Lerdahl & Jackendoff's *A Generative Theory of Tonal Music* (1983) is the most influential grammar-flavored music theory. It formalizes the intuitions of an experienced listener via four interlocking components:

1. **Grouping structure** — recursive segmentation into motives, phrases, sections.
2. **Metrical structure** — hierarchical alternation of strong/weak beats.
3. **Time-span reduction** — a tree assigning each event structural importance relative to grouping+meter (which notes are ornaments of which).
4. **Prolongational reduction** — a tree of tension/relaxation: how events extend, prepare, or resolve one another.

Each component has **well-formedness rules** (what structures are legal) and **preference rules** (which legal structure a listener actually hears) (Wikipedia, "Generative theory of tonal music"). Two caveats matter: GTTM is a theory of *analysis*, not a generation procedure — it does not tell you how to compose, only what structure a composition should support; and its preference rules conflict, with no algorithm given for resolving them. That gap is exactly what Hamanaka, Hirata & Tojo spent two decades engineering: ATTA (automatic time-span tree analyzer, ~17 of 26 rules parameterized, needing per-piece manual tuning), FATTA/σGTTM (statistical learning of rule application, σGTTM III using a PCFG), and deepGTTM (learned analyzers) (Hamanaka et al. 2006; Hamanaka et al. 2016). Their "melody morphing" generates variations by editing time-span trees and re-deriving surfaces (Fernández & Vico 2013) — the clearest demonstration that GTTM structures can run generatively. Lesson for us: GTTM's *rule inventory* (especially grouping and metrical preference rules) is a ready-made checklist an engine can enforce during generation, even if full GTTM analysis is overkill; see [phrase-structure.md](phrase-structure.md) and [rhythm-and-meter.md](rhythm-and-meter.md).

## Schenker: generation by elaboration

Schenkerian theory holds that a tonal piece elaborates a simple background (Ursatz: a descending upper line over a I–V–I bass) through recursive layers to the surface; analysis strips ornamentation away layer by layer, and — the generative reading — composition can run the reduction *in reverse*: start from a background, recursively elaborate with passing tones, neighbors, arpeggiations, and repetitions until a full melody/texture emerges. Computational work exists on both directions: Marsden (2010) demonstrated automated Schenkerian *analysis* as a proof of concept (combinatorially hard, needing strong heuristics); Quick (2010) built three-voice counterpoint generation inside a Schenkerian framework (Fernández & Vico 2013); and modern skeleton-first neural systems such as WuYun (2023) — generate a melodic skeleton, then infill ornamentation — report better-structured, more singable melodies than end-to-end generation, which is the same architecture vindicated with different machinery (Zou et al. 2023).

This is arguably the single most promising architecture for this project's melody problem: **a goal-directed background (cadence targets, one structural tone per bar or phrase) plus a library of elaboration operators applied recursively with style-dependent probabilities.** It guarantees that every surface note is *about* something structural, eliminating aimlessness by construction rather than by filtering. Elaboration operators are small, testable, LLM-authorable functions ([melody.md](melody.md), [tension-and-release.md](tension-and-release.md)).

## Steedman's jazz/blues chord grammar

Steedman (1984) wrote a compact generative grammar (six rule schemata) for jazz twelve-bar blues chord sequences: starting from the bare I–IV–I–V–I skeleton, recursive substitution rules (dominant-chains, ii–V insertion, tritone substitution, and similar) derive the sophisticated changes jazz musicians actually play. It was built for analysis but later adapted for generation and real-time improvisation (Chemillier 2004, per Fernández & Vico 2013). It is the cleanest existence proof that **harmonic sophistication = a simple skeleton + a small recursive substitution rule set**, and it generalizes: an engine can hold plain diatonic progressions and apply style-tagged substitution passes at chosen intensities — a tunable "jazziness" knob with theory behind it ([jazz-and-improvisation.md](jazz-and-improvisation.md), [harmony.md](harmony.md)).

## L-systems

Lindenmayer systems rewrite *all* symbols in parallel each step, producing self-similar strings; they are popular in music for their simplicity and the appeal of hierarchical self-similarity (Fernández & Vico 2013). The first musical use interpreted turtle-graphics renderings of plant L-systems as scores (Prusinkiewicz 1986); later work mapped strings to pitches, intervals, or arrangement decisions, with Worth & Stepney (2005) systematically exploring L-system classes × musical mappings and finding pleasing but meandering results. The persistent problem is again the **mapping problem**: L-systems generate structured *strings*, and nothing in the formalism knows about tonality, meter, or phrase syntax, so naive pitch mappings sound like wandering arpeggio lattices. Where they genuinely help: rhythmic/textural pattern families with self-similar density (map symbols to drum strokes or subdivision decisions), and generating *variation families* of a motif (each derivation depth = a variation level). Verdict from the survey literature: raw material, not composition (Fernández & Vico 2013).

## Probabilistic CFGs

PCFGs attach learned or hand-set probabilities to productions, giving grammars the corpus-fitting and sampling abilities of statistical models while keeping tree structure. In music they have been used to model chord-sequence syntax with self-emergent grammars (Tsushima et al. 2017), for melodic reduction, and inside σGTTM III for time-span analysis (Hamanaka et al. 2016). For generation, a PCFG sampled top-down is the natural probabilistic form of everything above: form → phrases → harmonic units → surface. Hand-set probabilities on hand-written productions are entirely practical in JS; inside-outside training is not needed when the LLM sets weights from theory and taste.

## Pros, cons, and the LLM shift

**Pros:** hierarchy and long-range coherence by construction; phrase structure for free; every note explainable by its derivation (useful for debugging and for [evaluation-challenges.md](evaluation-challenges.md)); natural fit with recursion (trivial in JS); composable with Markov weights (stochastic productions) and constraints (filter derivations).

**Cons:** hand-crafting good rules was historically the bottleneck (Fernández & Vico 2013 note grammar quality, not grammar machinery, decides output quality); rigid rules yield stiff, same-shaped pieces unless productions are numerous and context-weighted; pure CFGs cannot express some musical dependencies (voice-leading between non-adjacent constituents, motivic economy across branches) — those need side constraints or attributes threaded through the derivation; and a grammar is only as goal-directed as its symbols (a "phrase" symbol that doesn't carry cadence/tension attributes still produces aimless phrases).

The LLM shift: the main historical con — authoring cost — is largely gone. An LLM can write hundreds of style-specific productions with attributes (key, tension, register, motif-id) and sensible weights, and iterate on them cheaply. The remaining hard part is *rule quality and interaction*, which argues for small testable rule sets per level plus the [improvement-loop.md](improvement-loop.md) rather than one giant grammar.

## Implications for generative engines

- Make the top of every engine a grammar (or grammar-equivalent template system): Piece → Sections → Phrases → HarmonicUnits, with attributes (tension target, cadence type, motif assignment) decorating each node. Markov/stochastic choice belongs *inside* productions, never above them.
- Build melody as Schenker-style elaboration: pick structural tones per phrase (ending on the goal tone), then recursively apply an operator library (neighbor, passing, arpeggiation, suspension, repetition-with-variation) with per-style weights and per-depth budgets. This directly replaces weighted random-walk melody.
- Implement Steedman-style substitution passes over a plain harmonic skeleton as the mechanism for style intensity (diatonic → jazz reharmonization at increasing depth).
- Use GTTM preference rules as *generation-time checks*: grouping symmetry, metrical alignment of harmonic change, stability at group boundaries. Cheap assertions during derivation beat post-hoc repair.
- Reserve L-systems for rhythm/texture families and motif-variation trees; never map raw rewriting strings to pitch without a tonal filter ([constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md)).
- Keep every production and weight in data files with comments; the derivation tree should be dumpable per piece for debugging ("why does section B feel long?" → read the tree) ([engine-architecture.md](engine-architecture.md)).

## Open questions

- What is the minimal attribute set (tension, register, motif-id, cadence type?) that grammar symbols must carry for output to stop sounding formulaic? Needs experiments.
- Can GTTM-style preference rules be inverted into *soft generation costs* efficiently enough to guide (not just filter) derivation in-browser?
- Is there a workable grammar treatment of non-Western forms in scope (gamelan colotomic structure looks grammar-shaped; raga development may not be) — see [gamelan.md](gamelan.md), [indian-classical-music.md](indian-classical-music.md).

## Related pages

- [phrase-structure.md](phrase-structure.md) — what the grammar's mid-levels must produce
- [form-and-structure.md](form-and-structure.md) — the top levels
- [melody.md](melody.md) — elaboration as the melody engine
- [tension-and-release.md](tension-and-release.md) — attributes the tree should carry
- [markov-and-statistical-models.md](markov-and-statistical-models.md) — stochastic weighting inside productions
- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) — constraints as the complement of grammars
- [jazz-and-improvisation.md](jazz-and-improvisation.md) — Steedman's home genre
- [musical-expectation.md](musical-expectation.md) — why hierarchy is heard, not just built

## Sources

- Fernández, J. D. & Vico, F. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013), §3.1. https://arxiv.org/abs/1402.0585
- Lerdahl, F. & Jackendoff, R. *A Generative Theory of Tonal Music.* MIT Press, 1983. Overview: https://en.wikipedia.org/wiki/Generative_theory_of_tonal_music
- Hamanaka, M., Hirata, K. & Tojo, S. "Implementing 'A Generative Theory of Tonal Music'." *Journal of New Music Research* 35(4) (2006). https://www.tandfonline.com/doi/full/10.1080/09298210701563238
- Hamanaka, M., Hirata, K. & Tojo, S. "σGTTM III: Learning-Based Time-Span Tree Generator Based on PCFG." *CMMR* (2016). https://link.springer.com/chapter/10.1007/978-3-319-46282-0_25
- Steedman, M. "A Generative Grammar for Jazz Chord Sequences." *Music Perception* 2(1) (1984). Discussed in Rohrmeier et al., "Principles of structure building in music, language and animal song" (2018): https://arxiv.org/abs/1901.05180
- Marsden, A. "Schenkerian Analysis by Computer: A Proof of Concept." *Journal of New Music Research* 39(3) (2010). https://www.tandfonline.com/doi/abs/10.1080/09298215.2010.503898
- Zou, K. et al. "WuYun: Exploring hierarchical skeleton-guided melody generation." (2023). https://arxiv.org/abs/2301.04488
- Worth, P. & Stepney, S. "Growing Music: Musical Interpretations of L-Systems." *EvoWorkshops* (2005). https://link.springer.com/chapter/10.1007/978-3-540-32003-6_55
- Tsushima, H. et al. "Generative Statistical Models with Self-Emergent Grammar of Chord Sequences." (2017). https://arxiv.org/abs/1708.02255
