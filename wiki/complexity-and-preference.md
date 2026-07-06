---
title: Complexity and preference
tags: [psychology]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Berlyne's inverted-U (Wundt curve) linking complexity/arousal-potential to liking, how musical complexity is operationalized, the messy and partly-contradictory evidence, and the moderating roles of familiarity, training, and individual differences.
---

# Complexity and preference

"How complex should the music be?" is a question a generative engine must answer numerically — how many notes per bar, how much harmonic surprise, how dense the texture — and the psychology of aesthetics has a famous answer: the **inverted-U**. Music that is too simple bores; music that is too complex overwhelms; liking peaks somewhere in the middle. This is one of the most cited ideas in the field and a natural target for an engine, but the evidence is genuinely messy: the peak moves with familiarity, training, and personality, some careful studies fail to find the curve at all, and one influential account says the whole thing is an artifact of averaging over people who disagree. This page lays out the theory, the operationalizations, and — honestly — the contradictions, because designing to a wrong constant would be worse than designing to a tunable range.

## Berlyne and the Wundt curve

Daniel Berlyne's experimental aesthetics (1970s) is the source. He proposed that aesthetic preference is governed by a stimulus's **arousal potential**, driven by **collative variables** — properties that require comparison to resolve: Berlyne's fuller list (per Chmiel & Schubert 2017, citing Berlyne 1960/1971) is **complexity, novelty/familiarity, change, conflict, surprisingness, uncertainty, interestingness, and ambiguity**; this page focuses on complexity, novelty, surprise, and uncertainty as the most engine-actionable of the set. Arousal potential relates to hedonic value (liking) through an **inverted-U**, often called the **Wundt curve**: low arousal potential yields indifference, moderate yields maximum pleasure, high yields aversion. Berlyne (1969, p. 1068, quoted in Chmiel & Schubert 2017) modeled this as two overlapping systems — "a reward system that responds to initial increases of stimulus arousal, and an aversion system that gradually becomes activated beyond a critical level of arousal, and that opposes the effect of the reward system"; their sum is the inverted-U. The practical claim is a preference for **intermediate** complexity/novelty, and the appeal to an engine is obvious: it names a target.

## Operationalizing musical complexity

"Complexity" only becomes actionable once measured. Common operationalizations, roughly from naive to principled:

- **Event density** — notes/onsets per unit time; number of simultaneous voices; textural thickness. Easy to compute and control, but crude (dense is not always "complex").
- **Structural/theoretic complexity** — harmonic vocabulary size, rhythmic irregularity/syncopation, number of distinct sections, degree of variation.
- **Information-theoretic complexity** — **entropy** (uncertainty of what comes next) and **information content / IC** (surprise of what did come), computed by a predictive model such as IDyOM (see [musical-expectation.md](musical-expectation.md)). This is the most principled operationalization because it is *listener-relative*: it measures complexity as experienced by a mind with particular expectations, not as an abstract property of the score. Gold et al. (2019) used exactly this and found an inverted-U of liking against IC — intermediate surprise preferred.

The choice matters: studies disagree partly because they measure different "complexities." An engine should prefer the information-theoretic framing, since perceived complexity — not note count — is what drives preference, and it varies with the listener's familiarity.

## The evidence is messy — record the disagreement

The inverted-U is widely assumed but inconsistently found. The honest summary is that support is real but partial and heavily moderated:

- **Supporting**: many studies report intermediate-complexity preference; Gold et al. (2019) found an IDyOM-based inverted-U for melody liking; reviews (Chmiel & Schubert, 2017) conclude the inverted-U has meaningful support once arousal potential is properly manipulated and familiarity controlled.
- **Failing / linear**: other studies find monotonic relationships (liking rises, or falls, roughly linearly with complexity) rather than a peak. Madison & Schiölde (2017), with 28 exposures over ~4 weeks, found liking rose with repeated listening at *all* complexity levels and reported **no inverted-U and no complexity×exposure interaction** — directly contradicting the tidy story. In their data familiarity with the style dwarfed complexity as a predictor.
- **Artifact of averaging (the strongest challenge)**: Güçlütürk et al. (2016), "decomposing the inverted U-curve," found the aggregate curve is produced by *combining opposite individual functions*. Splitting participants, ~67% showed liking *decreasing* with complexity (r ≈ −0.79) and ~33% showed liking *increasing* with complexity (r ≈ +0.87); a two-linear-groups model beat the quadratic model on fit. (Their stimuli were digitally generated grayscale images, not music, so the finding is imported from visual aesthetics — taken here as informative for the general complexity-preference relationship rather than music-specific evidence.) Their caution is pointed: averaging across people can conjure "a non-existent average observer." The group-level inverted-U may be, at least sometimes, a statistical mirage over a population that actually splits into complexity-likers and complexity-dislikers.

The takeaway is not "the inverted-U is false" but "there is no single universal optimum." Complexity preference is strongly individual and context-dependent, so an engine should treat the optimum as a **tunable parameter with a population distribution**, not a constant.

## Familiarity × complexity

A key modulator: complexity is not fixed — repeated exposure makes a piece *feel* simpler (more predictable), which should shift its position on the curve. The classic hypothesis (North & Hargreaves, and Berlynean logic): **complex music gains with exposure while simple music wears out** — because complex pieces take several hearings to become predictable enough to be enjoyable, whereas simple pieces are exhausted quickly. There is some support (Schellenberg found focused listening yields an inverted-U over exposures, and incidental listening near-linear increases), but it is *not* robust: Madison & Schiölde found no such interaction — repeated listening raised liking regardless of complexity. So treat "complex music needs repeated listening to be liked" as a plausible but empirically shaky rule, not a certainty. What is better supported is the broader point from [repetition-and-familiarity.md](repetition-and-familiarity.md): familiarity is a very strong, often dominant, driver of liking, and it interacts with perceived complexity by reducing it.

## Individual differences shift the optimum

Whatever the population curve, the peak location varies systematically with the listener:

- **Musical training / expertise** shifts the optimum *rightward*: trained and expert listeners tolerate and prefer more complexity; some evidence suggests the inverted-U flattens or is replaced by learned, criteria-based preferences as expertise grows. This matters for evaluation — the developer's trained ear will prefer more complexity than a general audience.
- **Openness to Experience** (personality) predicts preference for more complex, challenging music.
- **Age**: complexity tolerance and taste shift over the lifespan (often rising through adolescence/young adulthood).
- **Repeated-exposure state**: as above, the more familiar a listener is with a piece or style, the more complexity they can enjoy in it.

## Prototypicality: a competing account

Colin Martindale challenged Berlyne head-on: the main driver of aesthetic preference is not collative complexity but **prototypicality** — how *typical* a stimulus is of its category ("how much it sounds like good music of its kind"). In his studies, typicality accounted for roughly **eight or nine times** more variance in music preference than novelty or mere exposure. The two accounts are not fully independent — what counts as prototypical is itself shaped by exposure and by collative properties, and North & Hargreaves argued some anti-Berlyne results used materials that varied more in typicality than in complexity. But the practical lesson stands and partly *opposes* the "seek novelty/complexity" reading of Berlyne: listeners strongly prefer things that are *characteristic and well-formed examples of a recognizable style*. For a generative engine this aligns with the familiarity findings — squarely-in-genre, prototypical output is a strong default, with complexity/novelty added in measured, structurally-placed doses.

## Implications for generative engines

- **Target intermediate complexity, but make it a tunable parameter, not a constant.** The population splits into complexity-likers and -dislikers (Güçlütürk) and the optimum moves with familiarity, training, and personality. Expose a complexity/novelty control (or infer it from listener behavior) rather than hard-coding one "ideal" density.
- **Measure complexity as perceived surprise, not note count.** Use an information-theoretic proxy (entropy / IC from a lightweight predictive model — see [markov-and-statistical-models.md](markov-and-statistical-models.md)) to grade candidate output, since it is listener- and familiarity-relative. Aim for an intermediate IC band; Gold et al. found the melodic-liking peak at intermediate IC.
- **Default toward prototypicality; add complexity in doses.** Martindale and the familiarity literature both say a clearly-in-genre, well-formed piece is a strong baseline. Generate a recognizable, prototypical frame and inject complexity/novelty at structural points (phrase ends, climaxes) rather than raising it uniformly.
- **Let perceived complexity fall as a piece plays, then reintroduce.** Since repetition reduces perceived complexity, an engine can start slightly richer and let familiarity do the simplifying, or periodically refresh with new material to keep perceived complexity in the target band — a dynamic, not static, complexity budget.
- **Separate the audience from the developer.** Trained ears prefer more complexity; the general/background audience prefers less. Evaluate with the target population and report the *distribution* of preferred complexity, not a mean that hides the split (see [listening-tests-and-feedback.md](listening-tests-and-feedback.md)).
- **Tune complexity to listening mode.** Attentive listening rewards more complexity and structure; background listening wants lower perceived complexity and higher predictability (see [attention-and-background-listening.md](attention-and-background-listening.md)).

## Open questions

- Which complexity operationalization best predicts liking for *generated* instrumental music — event density, IDyOM IC, or a hybrid — and does it hold across genres?
- Is the population really bimodal (complexity-likers vs. -dislikers), and if so can an engine classify a listener quickly and adapt?
- How reliable is "complex music gains with exposure, simple wears out" for generated loops specifically, given Madison & Schiölde's null and the fast satiation of synthetic material?
- Do prototypicality and intermediate-complexity targets ever conflict in practice, and which wins?

## Related pages

- [musical-expectation.md](musical-expectation.md) — IC/entropy as the principled complexity measure
- [repetition-and-familiarity.md](repetition-and-familiarity.md) — familiarity reduces perceived complexity
- [pleasure-and-reward.md](pleasure-and-reward.md) — intermediate complexity and reward-for-learning
- [emotion-and-meaning.md](emotion-and-meaning.md) — arousal as an emotional dimension
- [attention-and-background-listening.md](attention-and-background-listening.md) — mode-dependent complexity targets
- [what-makes-music-good.md](what-makes-music-good.md) — complexity as one axis of quality
- [computational-music-metrics.md](computational-music-metrics.md) — computing complexity/entropy from output

## Sources

- Daniel Berlyne, arousal potential, collative variables, and the reward/aversion two-system account of the Wundt curve (1969, 1971), as summarized in Chmiel & Schubert 2017 below; also reviewed (general multifaceted-hedonics evidence) in "Berlyne Revisited: Evidence for the Multifaceted Nature of Hedonic Tone in the Appreciation of Paintings and Music," Frontiers in Human Neuroscience, 2016 — https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2016.00536/full
- Güçlütürk, Jacobs & van Lier, "Liking versus Complexity: Decomposing the Inverted U-curve," Frontiers in Human Neuroscience, 2016 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4796011/
- Madison & Schiölde, "Repeated Listening Increases the Liking for Music Regardless of Its Complexity," Frontiers in Neuroscience, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5374342/
- Chmiel & Schubert, "Back to the inverted-U for music preference: A review of the literature," Psychology of Music, 2017 — https://anthonychmiel.com/wp-content/uploads/2025/08/Chmiel2017_BackToTheInvertedU.pdf
- Martindale, Moore & West, "Relationship of Preference Judgments to Typicality, Novelty, and Mere Exposure" (prototypicality vs collative variables), 1988 — https://journals.sagepub.com/doi/10.2190/MCAJ-0GQT-DJTL-LNQD
- Gold, Pearce, Mas-Herrero, Dagher & Zatorre, "Predictability and Uncertainty in the Pleasure of Music," J. Neurosci., 2019 (IDyOM-based inverted-U) — https://pmc.ncbi.nlm.nih.gov/articles/PMC6867811/
