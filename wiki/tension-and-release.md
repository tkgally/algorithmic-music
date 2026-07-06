---
title: Tension and release
tags: [theory, psychology]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Tension is the currency of musical motion — the measurable rise and fall that makes music go somewhere. Covers the parameters that drive it, the Farbood and Lerdahl-Krumhansl models with their empirical fits, and how to budget tension across a piece.
---

# Tension and release

Music that "goes somewhere" does so by continuously raising and lowering **tension** — a felt sense of instability, arousal, and wanting-to-resolve that ebbs and flows over time. Tension is the currency almost every other musical parameter is spent to buy: a dissonance, a rising line, a crescendo, a harmony far from the tonic, a syncopation, and a surprising event all *raise* tension; their resolutions *release* it. This is directly actionable for generation because tension is (a) driven by a fairly short list of parameters, (b) additive and roughly quantifiable, and (c) the thing whose absence made previous project engines feel static or aimless — they had local activity but no managed trajectory of tension. This page lists the tension-raising parameters with evidence, summarizes the two best-validated computational models, and gives a practical scheme for budgeting tension across a piece.

## Tension as the currency of motion

Perceived tension is continuous and time-varying: listeners can move a slider in real time and produce broadly consistent tension curves for the same piece, which is what makes tension empirically tractable. The *shape* of that curve over a phrase, a section, and a whole piece is much of what listeners mean by a piece having direction, drama, or a satisfying arc. Release is not merely the absence of tension but the *resolution* of accumulated tension — which is why a cadence after a build feels rewarding (see [phrase-structure](phrase-structure.md), [pleasure-and-reward](pleasure-and-reward.md)) and why tension with no release feels unresolved and unpleasant.

## Parameters that raise tension

Evidence (Farbood 2012; Granot & Eitan 2011; Lerdahl & Krumhansl 2007; Huron 2006) converges on a set of largely independent contributors:

- **Loudness / dynamics** — the strongest and most consistent single driver. Rising loudness raises tension; it dominates most multi-parameter models.
- **Registral height / pitch height** — rising melodic motion raises tension, falling releases it; higher register generally reads as more tense, though the absolute-register effect is messier than the directional one (Granot & Eitan found very *low* registers can also feel tense, especially for nonmusicians). The second most influential parameter after loudness in several studies.
- **Note density / onset frequency / tempo** — faster events and faster tempo generally raise arousal-tension (though onset frequency's effect is smaller and context-dependent; sometimes weakly negative in models once loudness is accounted for).
- **Dissonance / harmonic roughness** — sensory dissonance (beating between partials) and harmonic instability raise tension; consonance releases it. See [harmony](harmony.md), [auditory-perception-basics](auditory-perception-basics.md).
- **Harmonic distance from the tonic** — chords farther from the tonic in tonal pitch space raise tension; return toward the tonic releases it. This is the core of Lerdahl's model.
- **Rhythmic instability** — syncopation, metric ambiguity, and off-beat accents raise tension; a clear downbeat releases it. See [rhythm-and-meter](rhythm-and-meter.md).
- **Timbral roughness / brightness** — rougher, brighter, noisier timbres raise tension independent of pitch and harmony. See [timbre-and-orchestration](timbre-and-orchestration.md).
- **Unpredictability / expectancy violation** — events that are improbable given the established context raise tension (surprisal); highly predictable continuations release it. This is the predictability-based account below and in [musical-expectation](musical-expectation.md).

A key practical point from the empirical work: these parameters are **partly separable and roughly additive**, so an engine can drive tension by moving several independently and summing their contributions — but they are not equal, and **loudness and pitch height carry disproportionate weight.**

## The Farbood multi-parameter model

Morwaread Farbood's "A Parametric, Temporal Model of Musical Tension" (*Music Perception* 2012) is the reference multi-parameter account. Its core ideas:

- Tension reflects the **combined directional change** (the *slopes*, over time) of multiple features — loudness, pitch height, harmony/tonal tension, onset frequency, tempo — not their static levels.
- Features are integrated over **sliding attentional and memory windows** (roughly a few seconds), and a slope that agrees with the recent direction of change is amplified — i.e., a sustained build compounds.
- The model predicts continuous listener tension ratings well, with reported correlations roughly **r = .60 to .93** across test excerpts.

The takeaway for generation: what listeners track is **change and its direction over a few-second window**, so tension is engineered by *trajectories* (keep pushing loudness/register/density up to build; reverse to release), not by momentary values.

## Lerdahl and Krumhansl's tonal tension model

Fred Lerdahl's tonal tension theory, tested empirically by Lerdahl & Krumhansl ("Modeling Tonal Tension," *Music Perception* 2007), decomposes *harmonic* tension into:

- **Hierarchical / sequential tension** from distances in **tonal pitch space** (how far each chord is from the tonic, weighted by its structural depth in a prolongational hierarchy),
- **Surface dissonance** (non-chord tones, inversions), and
- **Melodic attraction** (the pull of unstable tones toward stable neighbors).

Tested on tonal and chromatic excerpts (e.g. a Bach chorale, a Chopin E-major prelude, chromatic passages), the model's predictions correlate well with listeners' continuous tension judgments. Two caveats for engine builders:

1. The full model is **hard to compute** — it needs a hierarchical prolongational analysis with no automated procedure, and uses hand-tabulated space distances. Downstream work uses simplified proxies (e.g. a *tonal interval space* where a chord-progression tension model combined **hierarchical tension (weight ~0.32), sensory dissonance (~0.30), voice-leading distance (~0.27), and tonal distance (~0.16)**, achieving r ~= 0.75, R^2 ~= 0.56 against listener curves — note hierarchical tension, not raw dissonance, carries the largest weight here).
2. **Tonal tension alone is a weak predictor of overall perceived tension.** The recent TenseMusic model (2024) found that once loudness, pitch height, and roughness are included, computed *tonal* tension adds little (small weight), with cross-validated overall correlations around **r = .59-.61** and 68-71% of pieces reaching r > .5. This echoes the form-perception finding ([form-and-structure](form-and-structure.md)) that abstract tonal relations are less perceptually potent than surface features. Practically: **do not rely on harmony alone to create tension — drive loudness, register, density, and roughness too.**

## Predictability-based accounts

A complementary framework locates tension in **prediction**. Huron's ITPRA theory (2006) posits a pre-outcome **tension response** that raises arousal and attention in proportion to the *uncertainty and imminence* of an anticipated event: as a cadence or downbeat approaches and the outcome is in doubt, tension rises; a confident, high-probability continuation carries low tension. On this account, dissonance and harmonic distance raise tension partly *because* they are statistically improbable and leave the next event uncertain. Information-theoretic surprisal and entropy formalize this and are directly computable from a generative model's own probability estimates. This ties tension to [musical-expectation](musical-expectation.md): an engine that already has a predictive model of its material gets a tension signal (its own uncertainty) for free.

## Tension curves and climax shaping

Effective pieces shape tension into recognizable **curves**:
- At **phrase** scale: rise through the phrase, peak near the approach to the cadence, release at the cadence (the acceleration described in [phrase-structure](phrase-structure.md)).
- At **section/piece** scale: a longer arc, usually asymmetric, building to a **main climax past the midpoint** followed by a shorter resolution (see the climax-placement discussion, with golden-section skepticism, in [form-and-structure](form-and-structure.md)).
- Multiple **nested** arcs: local phrase peaks riding on a slower sectional build, so the music has both moment-to-moment and long-range direction.

The main climax is typically the point of maximal *simultaneous* tension — loudest, highest, densest, most dissonant, most harmonically remote — which is why converging several parameters at once reads as "the peak."

## Practical tension budgeting

Think of a piece as spending and recovering a **tension budget** over time:

- Define a target **tension envelope** for the whole piece (e.g. gentle rise, late peak, resolve) and for each section, before generating notes — analogous to planning the cadence before the phrase.
- **Allocate parameters to the envelope:** map the desired tension level at each point to concrete settings of loudness, register, density, dissonance, harmonic distance, and rhythmic stability. Because contributions are roughly additive, you can trade one for another (e.g. build with density while holding dynamics for a later surge).
- **Spend from stable, return to stable:** start and end sections in low-tension states so departures are felt and returns land. Never leave the final state unresolved unless deliberately (some ambient/[moment form](form-and-structure.md) aims for non-resolution).
- **Reserve extremes.** Keep maximum loudness/register/density/dissonance for the main climax; if everything is at maximum early, there is nowhere to go — a diagnosed failure of "always busy" generative output.
- **Match the budget to the use case.** Attentive-listening pieces want pronounced arcs; background pieces ([attention-and-background-listening](attention-and-background-listening.md)) want a *narrow* tension band with gentle undulation and no jarring peaks.

## Implications for generative engines

- **Plan a tension envelope first**, per section and per piece, then realize it — do not let tension be an accidental byproduct of local note choices. This is the tension analog of planning cadences and form.
- **Drive tension with a weighted parameter vector**, prioritizing the high-leverage ones: loudness and pitch height first, then density/tempo, roughness, dissonance, harmonic distance, and rhythmic instability. Approximate additivity lets you sum contributions.
- **Move in trajectories, not points.** Per Farbood, listeners track directional change over ~a few seconds; build by pushing several parameters up together over seconds-to-tens-of-seconds, release by reversing.
- **Do not lean on harmony alone.** Computed tonal tension is a weak overall predictor; a harmonically adventurous passage at constant soft dynamics and low register will not feel tense. Couple harmonic distance to loudness/register/density.
- **Converge parameters at the climax.** Make the main peak the simultaneous maximum of several tension parameters, placed in the second half, followed by a shorter release.
- **Use the engine's own surprisal as a tension signal.** If the generator has probability estimates (Markov, n-gram, or learned — see [markov-and-statistical-models](markov-and-statistical-models.md), [machine-learning-music](machine-learning-music.md)), treat low-probability events as tension-raising and schedule them where the envelope wants a peak; resolve to high-probability events to release.
- **Always resolve, unless intentionally not.** End phrases and sections by returning tension parameters toward their stable baseline; reserve deliberate non-resolution for specific ambient effects.
- **Parameterize by use case:** wide dynamic tension range and clear arcs for foreground listening; a compressed, gently oscillating band for background.

## Open questions

- What are good default *weights* for combining tension parameters in a browser engine, given that published weights vary by corpus and that loudness dominates? Needs this project's own listening tests ([listening-tests-and-feedback](listening-tests-and-feedback.md)).
- How well do Western-derived tension parameters (especially tonal distance) transfer to modal, non-Western, and purely timbral music? Roughness, loudness, density, and register likely generalize; harmonic distance likely does not.
- Can real-time surprisal from the generator be turned into a reliable, controllable tension knob without expensive computation in-browser?

## Related pages

- [musical-expectation](musical-expectation.md) — predictability/surprisal as a source of tension
- [harmony](harmony.md) — dissonance and harmonic distance
- [phrase-structure](phrase-structure.md) — cadence as tension resolution; approach acceleration
- [form-and-structure](form-and-structure.md) — climax placement and long-range arcs
- [rhythm-and-meter](rhythm-and-meter.md) — rhythmic instability and metric tension
- [timbre-and-orchestration](timbre-and-orchestration.md) — timbral roughness and brightness
- [pleasure-and-reward](pleasure-and-reward.md) — why resolved tension is rewarding
- [attention-and-background-listening](attention-and-background-listening.md) — tension range for background use

## Sources

- Morwaread Farbood, "A Parametric, Temporal Model of Musical Tension," *Music Perception* 29(4): 387-428, 2012, DOI 10.1525/mp.2012.29.4.387 (multi-parameter slope model). The r = .60-.93 range is as characterized in the TenseMusic paper below — https://pmc.ncbi.nlm.nih.gov/articles/PMC10798497/
- Fred Lerdahl & Carol Krumhansl, "Modeling Tonal Tension," *Music Perception* 24(4): 329-366, 2007 — open-access PDF: https://fred-lerdahl.squarespace.com/s/Modeling-Tonal-Tension.pdf
- A. Aljanaki et al., "TenseMusic: An automatic prediction model for musical tension," *PLOS ONE*, 2024 (loudness dominates; tonal tension weak once loudness/pitch/roughness included; cross-val r ~= .59-.61; 68-71% of pieces r > .5) — https://pmc.ncbi.nlm.nih.gov/articles/PMC10798497/
- Manuel Navarro-Cáceres et al., "A Computational Model of Tonal Tension Profile of Chord Progressions in the Tonal Interval Space," *Entropy* 22(11): 1291, 2020 (feature weights hierarchical ~0.32 / dissonance ~0.30 / voice-leading ~0.27 / tonal distance ~0.16; r ~= 0.75, R^2 ~= 0.56) — https://pmc.ncbi.nlm.nih.gov/articles/PMC7712964/
- David Huron, *Sweet Anticipation* (2006), ITPRA tension response — reviewed by Pearce & Müllensiefen — https://www.marcus-pearce.com/assets/papers/huron06-review.pdf
- Roni Granot & Zohar Eitan, "Musical Tension and the Interaction of Dynamic Auditory Parameters," *Music Perception* 28(3): 219-246, 2011, DOI 10.1525/mp.2011.28.3.219 (loudness change the primary tension determinant, then pitch register/direction; lower register can read as more tense).
