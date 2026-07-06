---
title: Markov and statistical models
tags: [algorithms]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: How Markov chains, variable-order models, and HMMs generate music, why they wander and plagiarize, and the constraint and hierarchy fixes that make them usable.
---

# Markov and statistical models

Markov models are the oldest and still most common statistical machinery in algorithmic composition, and they power most of this project's previous engines (the hand-authored `DEG_NEXT` degree-transition table is a first-order Markov chain). This page covers how they work, the state-design decisions that matter more than the math, their two fundamental failures — aimlessness at low order, plagiarism/rehash at high order — and the mitigations (constraints, hierarchy, coupled viewpoints) that determine whether they are usable as more than texture generators.

## The basic model and the design decisions that matter

A Markov chain generates a sequence where the next state's probability depends only on the last n states (order n). Everything musically important lives in three design choices, not in the chain itself:

- **State alphabet.** Pitches, scale degrees, intervals, contour symbols, durations, chords, or tuples of these. Scale degrees beat absolute pitches (transposition-invariant, small alphabet); intervals capture motion but drift out of range; degree-plus-metric-position captures beat-dependent behavior at the cost of alphabet size. For harmony, Roman-numeral functions or chord symbols are the usual states.
- **Order.** First-order chord chains sound plausible bar-to-bar and directionless across eight bars; melody needs at least 2nd–3rd order before local shapes appear.
- **Weights: trained vs. hand-tuned.** Matrices are either induced from a corpus (dominant in research) or written by hand from theory and trial-and-error (dominant in composer tools) (Fernández & Vico 2013). Hand-tuning is fully viable — every music student's harmony textbook chart ("ii goes to V, V goes to I or vi...") *is* a hand-written transition table — and it is this project's default since runtime corpora are unavailable.

Ames (1989) remains the standard tutorial treatment of the compositional use of Markov processes.

## The order dilemma

The failure mode was identified almost immediately (Brooks et al. tried Markov generation of hymn tunes in 1957) and stated crisply by Moorer in 1972, as Fernández & Vico (2013) summarize: low-order chains "produced strange, unmusical compositions that wandered aimlessly, while high-[order] ones essentially rehashed musical segments from the corpus." There is no order that fixes this: the model only ever knows a sliding window. Consequently, by the 1980s Markov chains "came to be seen as a source of raw material, instead of a method to truly compose music" (Fernández & Vico 2013). Every unsatisfying random-walk melody this project has generated is this sixty-year-old finding reproduced; see [previous-experiments-lessons.md](previous-experiments-lessons.md) and [generative-music-failure-modes.md](generative-music-failure-modes.md).

## Variable-order models and PPM

Variable-order (mixed-order) Markov models match the longest context that has support, backing off to shorter contexts — the best of low and high order. Pachet's Continuator (2002) used variable-order chains over prefix trees for real-time call-and-response improvisation convincing enough to fool listeners in a restricted jam-session setting; related structures include Prediction Suffix Trees and Factor Oracles (Fernández & Vico 2013). The same machinery, as Prediction by Partial Match (PPM), underlies Pearce's IDyOM, which models *human melodic expectation*: a long-term model (corpus statistics) plus a short-term model (statistics of the piece so far) over multiple viewpoints, whose information-content output correlates with listeners' surprise ratings (Pearce & Wiggins 2004; see [musical-expectation.md](musical-expectation.md)). Two project-relevant readings: (1) variable order is cheap to implement in JS; (2) IDyOM justifies using a statistical model *as a critic* — score candidate notes by their predictability profile — even when the generator is rule-based, connecting directly to [complexity-and-preference.md](complexity-and-preference.md).

## Hidden Markov models: harmonization as decoding

An HMM adds a layer: hidden states (e.g., chords) emit observations (e.g., melody notes); Viterbi decoding finds the globally best hidden sequence for a given observed sequence. This turns harmonization into inference: given a melody, find the most probable chord sequence. MySong (Simon, Morris & Basu, CHI 2008; shipped as Microsoft Songsmith) trained on ~300 lead sheets and let non-musicians sing a melody and receive chords, blending an HMM with a per-measure pitch-class chord model and exposing "happy/jazzy" knobs that reweight the model. Allan (2002) and others harmonized Bach chorales the same way (Fernández & Vico 2013). The key property vs. plain chains: **HMM decoding is globally optimal over the whole sequence** — a form of lookahead — which is why HMM harmonizations end sensibly while chain walks do not. Dynamic-programming decoding over hand-authored tables runs trivially in a browser. See [harmony.md](harmony.md).

## Unit selection and concatenative generation

Instead of emitting one symbol at a time, select and concatenate larger units — bars, licks, phrases — choosing each unit by fit to context (a Markov decision at the unit level). Cope's EMI is the landmark (recombining beat/phrase units from a corpus under grammar and voice-leading checks; see [algorithmic-composition-history.md](algorithmic-composition-history.md)); Grachten's jazz improviser inserted pre-defined licks into Markov-generated lines, and Wooller & Brown morphed between pieces by alternating two chains (Fernández & Vico 2013). Unit selection trades novelty for guaranteed local quality — the dice-game principle again. For us: an LLM-authored bank of original motifs/fills/cadence units with compatibility tags, selected by weighted context rules, is unit selection without a corpus.

## The fundamental limitation, stated plainly

A Markov model of any order has no representation of *where it is in the piece* — no phrase position, no form, no goals, no memory of its own motifs. Fixes bolt structure on from outside:

1. **Markov constraints (Pachet & Roy 2011).** Reformulate finite-length Markov generation as a constraint-satisfaction problem: impose hard constraints ("last note = tonic," "note 8 = high C," meter constraints) and propagate them backward through the transition structure so that every partial solution remains completable *and* the result still follows the original distribution. This solves the classic "random walk that ends nowhere" problem exactly rather than by rejection sampling, and later work extended it to enforcing meter and to belief-propagation sampling (Pachet & Roy 2011; Roy et al.). Rejection sampling ("regenerate until it cadences") is the poor man's version and is fine at small scale in JS.
2. **Plagiarism control (Papadopoulos, Roy & Pachet 2014).** High-order models quietly copy their corpus. The MaxOrder automaton restricts generation so no subsequence of length > k comes verbatim from the corpus, giving a tunable novelty floor. Mostly moot for hand-authored tables (nothing to copy), acutely relevant if we ever train on encoded corpora; also a useful *metric* idea for [computational-music-metrics.md](computational-music-metrics.md).
3. **Hierarchical Markov.** Run separate models per structural level: one chain over section types, one over phrase/harmonic units within a section, one over notes within a phrase, each conditioning the level below (Thornton 2009's hierarchy of Markov models; Ponsford et al. 1999 annotated structure into the corpus and imposed an output template) (Fernández & Vico 2013). This is the cheapest route to non-trivial form and composes naturally with grammars ([grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md), [phrase-structure.md](phrase-structure.md)).
4. **Coupling models across voices/attributes.** Conklin & Witten's multiple-viewpoint systems (1995) predict from parallel sequences (pitch, interval, contour, duration, position-in-bar) combined by entropy weighting, rather than one flattened alphabet; extensions (MPSGs) generalize suffix trees to multiple attributes (Fernández & Vico 2013). For polyphony, condition each voice's model on the others' current states (or on a shared harmonic state) or decode jointly HMM-style — otherwise voices ignore each other; see [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md).

## Hand-authored transition tables: practical guidance

The previous engine's `DEG_NEXT` (weighted next-degree table over 7 scale degrees, used for chord walks) is the standard composer-tool pattern. What history and the models above say about doing it well:

- A single global table is a *style prior*, not a composer. Author **several tables per style and switch by context**: phrase position (opening/middle/pre-cadence/cadence), section type, tension level. A pre-cadence table that funnels hard toward V–I does more for perceived intention than any tuning of a global table.
- Add **position-aware constraints** on top (Pachet-style, or simple rejection): fix cadence targets, first/last chords, and let the table only fill the middle. The table supplies plausibility; constraints supply direction.
- Encode **asymmetry deliberately**. Tonal harmony's directedness lives in the asymmetries (V→I strong, I→V weak from a functional standpoint, ii→V yes, V→ii rarely). When hand-tuning, write the zero and near-zero cells first; they define the style more than the large weights.
- Weights are only felt in aggregate; audit tables by **stationary distribution and common 3–4-grams** (a 20-line JS script), not by staring at numbers. If the stationary distribution over-weights a degree, every piece will feel parked there.
- Keep orders low (1–2) and put memory elsewhere (phrase plans, motif banks). A hand-authored 3rd-order table over 7+ states is unmaintainable, and an LLM authoring thousands of rules is better spent on rules and schemas than on filling 343-cell tables.

## Implications for generative engines

- Use Markov machinery for **local plausibility only** — never as the top-level composer. Top level = form/phrase plan (grammar or template); Markov fills within slots, under endpoint constraints.
- Implement constrained generation now: fixed endpoints via backward feasibility-pruning (a small dynamic-programming pass over the transition graph before sampling) gives goal-directed lines at negligible cost; it is the single highest-value upgrade over `DEG_NEXT`-style free walks.
- Add HMM/Viterbi decoding as the harmonization workhorse: hand-author emission tables (which scale degrees fit which functions) + transition tables (functional syntax), then decode chords for a generated melody, or the reverse. Globally decoded sequences audibly out-cohere greedy walks.
- Steal from IDyOM for evaluation: track the running information content of generated lines against the engine's own model; flag stretches that are too flat (boring) or too spiky (chaotic). Cheap, runs offline in the [improvement-loop.md](improvement-loop.md).
- Author transition tables per (style × phrase-position × tension-level), audit their stationary behavior, and version them as data files so tables can be tuned independently of engine code ([engine-architecture.md](engine-architecture.md)).

## Open questions

- How far can *purely hand-authored* multi-level Markov + constraints go before grammar/rule machinery is strictly better? Worth one controlled engine experiment.
- Can an LLM reliably author emission/transition tables for non-Western styles (maqam, raga phrase grammars) without a corpus check? Tie-in: [indian-classical-music.md](indian-classical-music.md), [corpus-analysis.md](corpus-analysis.md).
- Is IDyOM-style information content computable cheaply enough in-browser to *steer* generation live, not just evaluate offline?

## Related pages

- [musical-expectation.md](musical-expectation.md) — IDyOM and expectation modeling
- [grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md) — the hierarchy Markov lacks
- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) — the constraint side of Markov constraints
- [harmony.md](harmony.md) / [melody.md](melody.md) — what the states should mean
- [phrase-structure.md](phrase-structure.md) — position-dependence that tables must respect
- [machine-learning-music.md](machine-learning-music.md) — neural successors
- [generative-music-failure-modes.md](generative-music-failure-modes.md) — aimlessness catalogued
- [algorithmic-composition-history.md](algorithmic-composition-history.md) — where this thread started

## Sources

- Fernández, J. D. & Vico, F. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013), §3.3. https://arxiv.org/abs/1402.0585
- Pachet, F. & Roy, P. "Markov constraints: steerable generation of Markov sequences." *Constraints* 16(2) (2011). https://link.springer.com/article/10.1007/s10601-010-9101-4
- Papadopoulos, A., Roy, P. & Pachet, F. "Avoiding Plagiarism in Markov Sequence Generation." *AAAI 2014*. https://ojs.aaai.org/index.php/AAAI/article/view/9126
- Pearce, M. & Wiggins, G. — IDyOM: variable-order PPM, multiple-viewpoint model of melodic expectation (2004–2012). Authoritative review: Pearce, M. T. "Statistical learning and probabilistic prediction in music cognition: mechanisms of stylistic enculturation." *Annals NY Acad. Sci.* 1423(1) (2018), 378–395. https://doi.org/10.1111/nyas.13654 — model home: https://www.marcus-pearce.com/idyom/
- Simon, I., Morris, D. & Basu, S. "MySong: Automatic Accompaniment Generation for Vocal Melodies." *CHI 2008*. https://www.microsoft.com/en-us/research/publication/mysong-automatic-accompaniment-generation-for-vocal-melodies/
- Ames, C. "The Markov Process as a Compositional Model: A Survey and Tutorial." *Leonardo* 22(2) (1989). https://www.jstor.org/stable/1575226
