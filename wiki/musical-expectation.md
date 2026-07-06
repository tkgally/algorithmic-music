---
title: Musical expectation
tags: [psychology]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: How listeners predict what comes next in music, why violations and confirmations of those predictions generate affect, and the computational models (IDyOM, predictive coding) that quantify surprise and uncertainty.
---

# Musical expectation

Expectation is the central mechanism connecting musical structure to feeling. As music unfolds, a listener's brain continuously predicts what will happen next; the play between confirmation, delay, and violation of those predictions is a primary source of tension, surprise, and pleasure. For a generative engine this is the most actionable theory in the whole psychology corpus: it says music is not a sequence of pretty sounds but a stream of predictions being set up and paid off, and it comes with computational models that turn "surprise" into a number. Getting the surprise curve right is plausibly the difference between output that is "intriguing but not satisfying" and output that rewards attention.

## Meyer: affect from inhibited expectation

Leonard Meyer's *Emotion and Meaning in Music* (1956) is the founding text. Drawing on Dewey's theory that emotion arises when a tendency to respond is inhibited, Meyer argued that musical affect is aroused when an expected continuation is delayed, blocked, or deviated from within a learned stylistic norm. A phrase that resolves exactly as anticipated is emotionally flat; one that is frustrated and then resolved carries charge. The deceptive cadence (V going to vi instead of the expected I) is the textbook case: the ear is primed for tonic arrival, denied it, and the resulting suspension of resolution is felt as emotion. Meyer distinguished the *absolutist* position (meaning is intramusical, arising from these internal expectation relationships) from the *referentialist* position (music points to extramusical concepts); he championed the absolutist view, which is the more useful one for engine design because it is self-contained.

## Narmour: implication-realization

Eugene Narmour's implication-realization (I-R) model reworked Meyer into a bottom-up, note-to-note system of Gestalt-derived expectations, largely for melody. Its core claim: a small interval *implies* continuation in the same direction (a "process"), while a large interval (a "skip") *implies* a change of direction and a return toward the register just left (a "reversal"), often described as gap-fill. Narmour formalized this as two schemas: A+A→A (repetition breeds expected repetition) and A+B→C (change breeds expected further change). These bottom-up implications are claimed to be relatively innate and cross-cultural, and they operate alongside top-down schematic knowledge. Empirical tests support proximity and gap-fill but treat the fuller archetype taxonomy more skeptically; much of what I-R predicts is now better captured statistically (below).

## Huron: the ITPRA theory

David Huron's *Sweet Anticipation* (2006) is the modern synthesis. His ITPRA theory splits the expectation response into five stages across two phases. Before an event: **Imagination** (imagining outcomes shapes behavior) and **Tension** (physiological/attentional arousal that ramps up as the anticipated moment approaches). After the event: **Prediction** (a reward or penalty purely for having predicted accurately, independent of whether the outcome was good), **Reaction** (a fast, automatic, worst-case response), and **Appraisal** (a slower conscious evaluation). Two ideas are load-bearing for us:

- **Prediction response**: the brain rewards accurate prediction *as such*. Predictable music is intrinsically a little pleasurable because listeners keep being proven right; this is a floor of reward that pure novelty forfeits.
- **Contrastive valence**: a negative fast Reaction (a surprise reads as a threat) can be flipped to positive by the Appraisal that follows ("it was only music, and a clever move"). This explains frisson, laughter, and awe as responses to violated expectation in a safe context.

Huron also compiled the statistical regularities that shape melodic expectation, since listeners internalize the actual statistics of the music around them:

- **Pitch proximity**: successive notes tend to be close, and listeners expect the next note near the last.
- **Step inertia**: after a step, listeners expect another step in the same direction (real melodies show this mainly for descending lines, but listeners over-generalize to both directions because the heuristic is cheap and usually right).
- **Post-skip reversal / regression to the mean**: after a large leap, listeners expect a change of direction. Real melodies reverse after skips only about 70% of the time — this is largely just regression to the mean — yet listeners expect reversal as a fixed rule.
- **Tonal hierarchy**: within a key, unstable scale degrees (tendency tones like the leading tone, MIDI-relative scale-degree 7) generate strong expectations to resolve to stable ones (tonic).

## Statistical learning and enculturation

Where do schematic expectations come from? Statistical learning. Saffran and colleagues showed that infants (and adults) segment continuous tone streams by tracking transitional probabilities between elements, with no feedback or instruction — the same mechanism used for word segmentation in speech. Over years of exposure this yields *enculturation*: implicit knowledge of a culture's scale structure, chord syntax, and phrase norms. Two listeners from different traditions genuinely hear different expectations from the same notes. This matters for a cross-cultural engine: "surprise" is only defined relative to a learned corpus, so an engine aiming at a given style must model that style's statistics, not a universal grammar.

## IDyOM: quantifying surprise and uncertainty

Marcus Pearce's IDyOM (Information Dynamics of Music) is the leading computational model of melodic expectation and the one to steal from. It is an unsupervised, variable-order Markov model that learns note-to-note statistics and, for each event, outputs two numbers:

- **Information content (IC)** = −log2 p(event | context): the *surprise* of the event that actually occurred. High IC = unexpected.
- **Entropy** (H) = expected IC over all possible continuations: the *uncertainty* of the prediction before the event. High H = the model was unsure what would come next.

IDyOM combines a **long-term model** (schematic expectations learned from a training corpus) with a **short-term model** (dynamic expectations learned within the current piece, e.g. picking up a repeated motif). Its IC values correlate well with human surprise ratings, with reaction-time and pupil measures, and with neural responses (the mismatch negativity and later components). IC and entropy are distinct and both matter — a point the reward studies below exploit.

## Predictive coding accounts

Vuust, Koelsch, and others frame all of this as predictive processing: the brain maintains a hierarchical generative model of the auditory stream, propagates predictions downward, and passes *prediction errors* upward to update the model. Crucially, prediction errors are **precision-weighted** — their influence is scaled by how confident (certain) the prediction was. In low-uncertainty contexts a violation produces a large, sharp error signal; in high-uncertainty contexts the same violation is discounted. This gives a mechanistic reason why *both* the surprise of an event and the uncertainty of its context determine the response, and it predicts that stable, confident contexts make violations hit harder.

## Uncertainty × surprise and the pleasure peak

Two studies pinned down how IC and entropy jointly drive pleasure:

- **Cheung et al. (2019, Current Biology)** modeled ~80,000 chords in pop songs and had listeners rate pleasure. Pleasure depended on the *interaction* of uncertainty and surprise: a chord was most pleasurable either when the preceding context was low-uncertainty and the chord was highly surprising, or when the context was high-uncertainty and the chord was unsurprising. Nucleus accumbens activity tracked uncertainty; amygdala, hippocampus, and auditory cortex tracked the interaction. Takeaway: satisfying moments trade off surprise against context uncertainty — you cannot maximize both.
- **Gold et al. (2019, J. Neurosci.)** used IDyOM's IC and entropy to predict liking for melodies and found an inverted-U (Wundt) curve: intermediate IC was preferred, with too-predictable heard as boring and too-random as chaotic. In their studies the IC model explained roughly 26–42% of variance in liking. There was an IC×entropy interaction: in high-entropy (uncertain) contexts, listeners preferred *lower*-IC (more predictable) events. They frame reward as a payoff for successfully reducing uncertainty — "a reward for learning."

## Schematic, veridical, and dynamic expectations

Following Bharucha and Huron, three expectation types coexist and can conflict:

- **Schematic**: general, style-based, learned from a lifetime of listening (a dominant chord "should" resolve to tonic).
- **Veridical**: memory of a *specific* known piece (you expect the exact next note of a familiar tune even where it violates the schema). Veridical knowledge does not erase the schematic surprise — a deceptive cadence in a piece you know by heart still registers as a violation.
- **Dynamic**: expectations built within the current piece as motifs and patterns repeat (IDyOM's short-term model).

A composer plays these against each other; delayed gratification (withholding the tonic, extending a dominant, evading cadences) works precisely because schematic expectation persists even when the listener consciously knows what is coming.

## Implications for generative engines

- **Make prediction the design variable.** Do not think in terms of "notes" but in terms of a running prediction the listener is forming. Every phrase should set up an expectation and then confirm, delay, or violate it deliberately. Aim for a stream that is mostly predictable with well-placed surprises, not uniform novelty.
- **Target intermediate surprise, and tune it.** Gold et al. put the pleasure optimum at intermediate IC. Practically: keep most melodic intervals small (honor pitch proximity and step inertia), reserve large leaps and out-of-key tones as occasional, structurally-placed surprises. A crude but usable heuristic is to keep the bulk of transitions high-probability under a simple learned model and inject low-probability events at phrase boundaries and climaxes.
- **Exploit the uncertainty×surprise trade-off.** Build a stable, low-uncertainty context (clear key, steady meter, an established pattern) *before* delivering a surprising event — that is where Cheung et al. found peak pleasure and where precision-weighting says the violation lands hardest. Conversely, after a passage of high uncertainty, resolve with something expected. Do not stack surprise on top of surprise.
- **Give the prediction response something to reward.** Include genuine repetition and pattern so the listener is often right (see [repetition-and-familiarity.md](repetition-and-familiarity.md)). Endless non-repeating novelty starves the prediction reward and is a likely cause of "intriguing but not satisfying."
- **Use tonal tendency explicitly.** Resolve tendency tones and dominant harmony most of the time to establish the schema, then deploy deceptive cadences (V→vi) and evaded/delayed resolutions sparingly for affect. The violation only works if the schema has been reinforced.
- **Model the target style's statistics.** Surprise is corpus-relative. A variable-order Markov model (see [markov-and-statistical-models.md](markov-and-statistical-models.md)) trained on a genre gives you an IC estimate per note essentially for free, which can be used to grade candidate continuations — accept notes in a target IC band rather than sampling blindly.
- **Separate long-term and short-term structure.** Emulate IDyOM's split: a schematic layer (style priors) plus a dynamic layer that establishes and then references within-piece motifs so the listener can learn the piece as it plays.

## Open questions

- What IC/entropy band should a browser engine target for background vs. attentive listening? Gold's optimum was for short isolated melodies; whole-piece dynamics over minutes are less charted.
- How well do symbolic IC estimates predict perceived surprise once timbre, dynamics, and production are added? Most models are pitch/onset only.
- Can a lightweight in-browser model approximate IDyOM's predictions cheaply enough to run per-note in real time? (See [scheduling-and-timing.md](scheduling-and-timing.md), [audio-worklets-and-performance.md](audio-worklets-and-performance.md).)

## Related pages

- [tension-and-release.md](tension-and-release.md) — the felt arc that expectation drives
- [pleasure-and-reward.md](pleasure-and-reward.md) — the reward circuitry expectation engages
- [repetition-and-familiarity.md](repetition-and-familiarity.md) — how repetition builds the predictions
- [complexity-and-preference.md](complexity-and-preference.md) — the inverted-U at the level of whole pieces
- [emotion-and-meaning.md](emotion-and-meaning.md) — expectancy as one emotion mechanism
- [melody.md](melody.md), [harmony.md](harmony.md) — where these expectations live
- [markov-and-statistical-models.md](markov-and-statistical-models.md), [machine-learning-music.md](machine-learning-music.md) — implementing predictive models

## Sources

- Leonard B. Meyer, *Emotion and Meaning in Music*, University of Chicago Press, 1956 — https://press.uchicago.edu/ucp/books/book/chicago/E/bo28551887.html
- David Huron, *Sweet Anticipation: Music and the Psychology of Expectation*, MIT Press, 2006 (via Pearce's review) — https://www.doc.gold.ac.uk/~mas03dm/papers/huron06-review.pdf
- Rohrmeier & Cross et al., "Artificial Grammar Learning of Melody Is Constrained by Melodic Inconsistency: Narmour's Principles Affect Melodic Learning," 2013 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3706544/
- Hansen & Pearce, "Predictive uncertainty in auditory sequence processing" (IDyOM), 2014 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4171990/
- "Prior Precision Modulates the Minimization of Auditory Prediction Error" (predictive coding, Vuust/Koelsch tradition), 2019 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6385564/
- Cheung et al., "Uncertainty and Surprise Jointly Predict Musical Pleasure...," Current Biology 29(23), 2019 — https://doi.org/10.1016/j.cub.2019.09.067
- Gold, Pearce, Mas-Herrero, Dagher & Zatorre, "Predictability and Uncertainty in the Pleasure of Music: A Reward for Learning?," J. Neurosci., 2019 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6867811/
