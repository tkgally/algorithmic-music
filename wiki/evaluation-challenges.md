---
title: Evaluation challenges
tags: [evaluation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Why judging generated music is intrinsically hard — subjectivity, listening context, exposure effects, Turing-test traps, short-clip bias — and the pragmatic evaluation stance this project takes.
---

# Evaluation challenges

Previous engines in this project failed partly because no one could say precisely *how* they failed: there was no evaluation machinery, only a vague sense of "lifeless" ([previous-experiments-lessons](previous-experiments-lessons.md)). Before building that machinery ([listening-tests-and-feedback](listening-tests-and-feedback.md), [computational-music-metrics](computational-music-metrics.md)), this page records why evaluating generated music is intrinsically hard, what the research community has learned (often the hard way), and the stance this project takes: evaluation here is an iterative improvement signal for a tiny team, not academic benchmarking.

## Why there is no ground truth

- Musical quality is not a scalar property of the artifact. Judgments vary across listeners (taste, training, culture), and within one listener across moods, days, and repeated hearings. [what-makes-music-good](what-makes-music-good.md) unpacks the criterion side; this page covers the measurement side.
- Listening mode changes the verdict. A piece that is pleasant as background while working can be boring under attentive listening, and vice versa. This project targets long-running instrumental music that often plays in the background, so evaluation must happen in (or at least simulate) that mode — see [attention-and-background-listening](attention-and-background-listening.md).
- An engine is a distribution over pieces, not a piece. Judging one output tells you little about the distribution, and hand-picking outputs for evaluation measures the curator, not the system — Sturm calls this the "curator factor." Evaluate sets of seeds, never single cherry-picked renders.
- There is no reference signal. Audio-quality methods like MUSHRA assume a known-good reference to compare against; generated compositions have none (see [listening-tests-and-feedback](listening-tests-and-feedback.md)).

## The musical Turing test and its critiques

Discrimination tests — "was this composed by a human or a computer?" — are the most seductive and least useful evaluation. Ariza (2009) argues that these are not Turing tests at all: Turing's imitation game requires interactive natural-language interrogation, so a one-shot listening judgment is better named a "musical output toy test." More damning than the naming:

- Passing measures surface plausibility, not value. A system can be indistinguishable from mediocre human music, or distinguishable from great human music, and the test result says nothing about whether the output is worth listening to. The 2025 survey of generative-music evaluation makes the same point: discrimination conflates "lack of distinction with aesthetic or creative success" and over-rewards imitation.
- Results are hostage to material selection, listener expertise, small samples, and misapplied significance testing.
- Ariza's conclusion, quoted because it is the page's thesis: "Generative music systems gain nothing from associating their output with the Turing Test."

The practical replacement: comparative preference between engine versions ("which of these would you keep listening to?"), which is the decision this project actually needs to make.

## Short-clip bias

Most published evaluations judge seconds-long excerpts — a 2025 benchmark ran 15,600 pairwise comparisons of 10-second clips. Short clips reward local polish and hide exactly the failures this project's previous engines exhibited: stasis, aimlessness, mechanical repetition, absence of arc — failures that only manifest over minutes ([form-and-structure](form-and-structure.md), [generative-music-failure-modes](generative-music-failure-modes.md)). The same survey notes that higher-level features like form and repetition are acknowledged as critical but have no accepted metrics yet.

Project rule: the primary evaluation unit is 5–15 minutes of continuous listening. Thirty-second checks are smoke tests for gross defects, never evidence of quality.

## Exposure, novelty, and fatigue

Repetition changes liking independent of quality. The mere-exposure literature in music mostly finds an inverted-U: liking rises over early exposures, peaks, then declines with overexposure (Berlyne's two-factor account: habituation plus tedium), with the peak arriving later for more complex material — though at least one naturalistic study found liking rising monotonically at all complexity levels, so the shape is contested. See [repetition-and-familiarity](repetition-and-familiarity.md) and [complexity-and-preference](complexity-and-preference.md).

Consequences for a small panel:

- Familiarity inflation: an evaluator hearing engine v12's idiom for the fortieth time is not the listener the music is for. Ratings drift up (idiom becomes familiar) and then down (idiom becomes tiresome) with no change in the engine.
- Novelty effect: a new engine version sounds interesting because it is *different*, not because it is better. First-session enthusiasm for a new version is weak evidence.
- Within-session fatigue: attention and criteria drift over a long rating session. Keep sessions short, randomize presentation order.

Mitigations: comparative (paired) judgments rather than absolute ratings, wash-out gaps between sessions, occasionally recruiting a fresh-eared listener and tracking their responses separately.

## Demand characteristics and expertise effects

- Demand characteristics: volunteers recruited by the project owner know what the "right" answer is and want to be encouraging. Mitigate with blind version labels, not announcing what changed, forced-choice comparisons (harder to be polite in), and explicitly inviting negative detail ("what annoyed you most?").
- Expertise changes what is heard. Musicians attend to voice leading, meter, and idiom violations that non-musicians miss, and they rate more harshly: in a jazz micro-timing study, professional musicians gave lower swing ratings across all stimulus versions than less experienced listeners. Neither group is "correct" — they are different instruments. With a mixed panel, record expertise and read the two signals separately rather than averaging them away.

## Decomposing "good"

A single overall score hides everything actionable. This project decomposes judgments into criteria, each defined in one sentence on the feedback form itself (the survey stresses operational definitions, since criteria like "melodiousness" and "naturalness" bleed into each other):

pleasantness · interestingness · coherence (does it hang together / go somewhere) · style-fit · emotional impact · desire-to-continue · memorability (next-day recall probe)

Desire-to-continue is the primary criterion for this project's use case; memorability is the cheapest probe of whether anything stuck. [emotion-and-meaning](emotion-and-meaning.md) and [pleasure-and-reward](pleasure-and-reward.md) give the psychological background for the middle criteria.

## Computational-creativity frameworks, used pragmatically

Three frameworks recur in the literature; none is standard practice, and all require human judgment somewhere. Their value here is as checklists that force explicit definitions, not as scoring systems.

- Ritchie (2007): rate the *set* of outputs for novelty, value, and typicality, and compute ratios over the set (e.g., what fraction of outputs are both typical of the genre and valuable). The durable idea: judge output sets, and track the valuable fraction, not the best case.
- Colton's creative tripod (2008): a system should exhibit skill, appreciation, and imagination. Read as an architecture hint: "appreciation" means the system evaluates its own output — which is exactly the metrics-gate layer planned in [engine-architecture](engine-architecture.md).
- Jordanous's SPECS (2012): (1) state your working definition of creativity/success for the domain, (2) choose standards for each component, (3) test against them and report. Fourteen candidate components are offered. The durable idea: write down what "better" means *before* listening, per experiment.

## This project's evaluation stance

Academic benchmarking optimizes for cross-lab comparability and statistical defensibility. This project optimizes for something else: a sensitive, diagnostic, repeatable signal that tells a small team whether change X made the music better and why. Concretely:

- Sensitive: within-subject paired comparisons of engine versions on identical seeds detect smaller differences than absolute ratings from tiny panels.
- Diagnostic: decomposed criteria, free-text complaints, and computational metrics that localize *what* changed ([computational-music-metrics](computational-music-metrics.md)).
- Repeatable: seeded deterministic generation; every judgment logged with seed, engine version, and parameters; the same piece can be regenerated and re-judged months later.
- Triangulated: trust arises when computational metrics, panel preference, and the owner's ear move together; any one alone is noise ([improvement-loop](improvement-loop.md)).

## Implications for generative engines

1. Determinism is an evaluation requirement: every render must be reproducible from (seed, engine version, parameters), and all three must be logged with every piece and every judgment.
2. Judge distributions, not instances: run each evaluation over ≥5 fresh seeds per version; report the median and the worst seed, since the worst output is what a background listener eventually hits.
3. Aim primary evaluation at 5–15 minutes of continuous listening; treat sub-1-minute impressions as smoke tests only.
4. Never run human-vs-computer discrimination tests; run version-vs-version preference with "would you keep listening?" as the headline question.
5. Decompose ratings into the seven criteria above, each with a one-sentence definition visible on the form.
6. Blind version identity, randomize order, cap rating sessions around 20–30 minutes, and space repeat sessions days apart to dodge fatigue and exposure drift.
7. Record listener expertise; read musician and non-musician signals separately.
8. Before each engine experiment, write the operational success definition into the wiki (SPECS step 1) so post-hoc rationalization is visible as such.

## Open questions

- Where is the exposure/liking peak for this project's ambient-leaning output — how many hearings before panel ratings stop being trustworthy for a given piece?
- Can desire-to-continue be measured implicitly (listen duration on the public site) with enough signal at n<10, or only explicitly?
- The whole loop optimizes toward one primary listener (Tom). How do we detect overfitting to one person's taste — and does it matter for this project's goals?

## Related pages

- [listening-tests-and-feedback](listening-tests-and-feedback.md) — the concrete methods chosen for this project
- [computational-music-metrics](computational-music-metrics.md) — the automatic half of the signal
- [what-makes-music-good](what-makes-music-good.md) — the criterion question itself
- [repetition-and-familiarity](repetition-and-familiarity.md), [complexity-and-preference](complexity-and-preference.md) — exposure effects in depth
- [attention-and-background-listening](attention-and-background-listening.md) — the listening mode being evaluated
- [generative-music-failure-modes](generative-music-failure-modes.md), [previous-experiments-lessons](previous-experiments-lessons.md) — what evaluation must catch
- [improvement-loop](improvement-loop.md) — where the signal feeds

## Sources

- Ariza, C. "The Interrogator as Critic: The Turing Test and the Evaluation of Generative Music Systems." Computer Music Journal 33(2), 2009. https://direct.mit.edu/comj/article-abstract/33/2/48/94244/
- Sturm, B. "Paper of the Day: The Turing Test and the Evaluation of Generative Music Systems." Blog commentary on Ariza, 2016. https://highnoongmt.wordpress.com/2016/02/18/paper-of-the-day-pod-the-turing-test-and-the-evaluation-of-generative-music-systems-edition/
- "Survey on the Evaluation of Generative Models in Music." arXiv:2506.05104, 2025. https://arxiv.org/abs/2506.05104
- Jordanous, A. "A Standardised Procedure for Evaluating Creative Systems." Cognitive Computation 4, 2012. https://link.springer.com/article/10.1007/s12559-012-9156-1
- Ritchie, G. "Some Empirical Criteria for Attributing Creativity to a Computer Program." Minds and Machines 17, 2007. https://link.springer.com/article/10.1007/s11023-007-9066-2
- Colton, S. "Creativity Versus the Perception of Creativity in Computational Systems." AAAI Spring Symposium, 2008. https://classes.cc.gatech.edu/AY2013/cs7601_spring/papers/Colton-PerceptionofCreativity.pdf
- "Benchmarking Music Generation Models and Metrics via Human Preference Studies." arXiv:2506.19085, 2025. https://arxiv.org/html/2506.19085
- Madison, G. & Schiölde, G. "Repeated Listening Increases the Liking for Music Regardless of Its Complexity." Frontiers in Neuroscience, 2017. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5374342/
- Datseris, G. et al. "Microtiming Deviations and Swing Feel in Jazz." Scientific Reports 9, 2019 (expertise effect on ratings). https://pmc.ncbi.nlm.nih.gov/articles/PMC6934603/
