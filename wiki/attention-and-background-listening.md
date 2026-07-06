---
title: Attention and background listening
tags: [psychology]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: How music interacts with cognitive work — the irrelevant-sound effect, lyrics as distractor, the arousal-mood account, the near-null meta-analytic picture, individual differences, and the design rules that define the background end of this project's listening axis.
---

# Attention and background listening

This project must serve two modes: attentive foreground listening and background/functional use while the listener works. This page defines the **background** end of that axis — what the evidence says about music playing while someone does cognitive work, and the concrete design rules that follow. The headline is sobering: background music is, on average, not a cognitive enhancer; its measurable average effect on cognition is near zero and task-dependent, and the most robust finding is that certain acoustic properties (changing spectra, lyrics) actively disrupt verbal work. The honest design goal for background music is therefore mood support and distraction-masking without harm — predictable, steady, quiet, wordless sound — not a "focus boost." Foreground listening lives at the other end of the axis and follows nearly opposite rules.

## The irrelevant-sound effect: changing-state vs steady-state

The load-bearing result comes from the **irrelevant-sound effect** (ISE) literature (Salamé & Baddeley; Jones & Macken). Task-irrelevant background sound impairs verbal serial recall — remembering ordered lists — even when the listener ignores it. What matters is not loudness but **acoustic variability**: **changing-state** sound, whose spectrum varies unpredictably from token to token, disrupts verbal working memory substantially, while **steady-state** sound (a repeated token, a held texture) barely does. Jones's object-oriented model explains this as the changing stream being involuntarily processed as an ordered sequence that competes with the ordered list the person is trying to hold. The practical reading: **attention capture tracks prediction error, not volume.** Sound that is predictable and slowly varying is largely ignorable; sound full of surprising spectral changes is not.

## Lyrics are the most robust distractor

Speech and sung lyrics are the worst offenders because they carry maximal changing-state variation plus phonological content that collides with verbal processing. For reading and comprehension the ordering is reliably silence > instrumental > vocal. Nick Perham's work adds a sharp point: liking the music does not rescue performance — participants recalled equally poorly with *liked* and *disliked* music, and both were worse than quiet, because disruption is driven by the acoustics (changing state), not by preference or annoyance. For a background-music engine this is close to a hard rule: **no lyrics, and no formant/vocal-like timbres that mimic speech**, at least by default.

## Arousal-mood vs direct cognitive effects

Where background music *does* help, the mechanism is usually indirect. Thompson, Schellenberg & Husain (2001) showed the "Mozart effect" is better explained by **arousal and mood**: music that raises arousal and improves mood yields modest secondary gains on some tasks, and any stimulus doing the same (including non-musical) produces comparable effects. There is little evidence of music directly enhancing the cognitive machinery. So background music's realistic value proposition is: lift mood and arousal to a useful level, and mask a distracting environment — both of which can indirectly help — rather than "make you smarter." See [emotion-and-meaning](emotion-and-meaning.md) and [pleasure-and-reward](pleasure-and-reward.md).

## The meta-analytic picture: near-zero and task-dependent

Kämpfe, Sedlmeier & Renkewitz's 2011 meta-analysis of background music on adult listeners found the overall average effect close to **null**, with the *sign* depending on the outcome: small negative effects on memory and reading, small positive effects on emotional and some behavioral/sport measures. This is the single most important calibration for the project — claims that "the right music boosts focus" are not supported at the population average. A robust **task-difficulty interaction** runs through the literature: background music tends to help easy, automatized, or boring tasks (where added arousal is useful) and hurt hard, verbal, or memory-intensive ones (where it competes for resources). An engine should assume its background mode helps least exactly when the user's work is hardest.

## Individual differences

The average hides large person-to-person variation:

- **Extraversion.** Under Eysenck's arousal theory, introverts (higher baseline cortical arousal) should be over-aroused and impaired by background music while extraverts benefit. Furnham & Bradley (1997) found introverts performed worse than extraverts with pop music on memory and reading-comprehension tasks. But the broader evidence is genuinely mixed — reviews find roughly as much support as refutation — so treat extraversion as a real but unreliable moderator.
- **ADHD and noise.** Göran Söderlund's **moderate brain arousal** model holds that low tonic dopamine (as in ADHD) leaves the system under-aroused, so added **noise** improves performance via **stochastic resonance** (moderate noise makes weak signals detectable). Empirically, white/pink noise helps ADHD-type listeners and *hurts* neurotypical controls on the same task — a population-specific effect. Consequence: noise and texture layers should be **opt-in**, never a default, because they help one group and harm another.

## The lo-fi / study-beats phenomenon

The mass culture of "lo-fi hip hop radio — beats to relax/study to" (the Lofi Girl livestream and its imitators) is a real-world convergence on the lab's prescription. The music is deliberately **steady-state**: slow (~70–90 BPM), repetitive loops, no lyrics, low-pass-filtered and dusted with vinyl crackle, harmonically warm and static, with no fills or climaxes. It adds a nostalgic aesthetic and, importantly, a **ritual** — pressing play becomes a culturally shared cue to begin work, an effect that may matter as much as the acoustics. The lesson is that the ISE-derived design rules are not just theory: an enormous audience selected, by preference, for exactly the steady, wordless, predictable profile the evidence recommends. See [ambient-and-generative-genre](ambient-and-generative-genre.md).

## Brain.fm-style amplitude modulation (hedge heavily)

Some products (Brain.fm, Endel) claim that adding rapid **amplitude modulation** (AM) to music aids attention via neural entrainment. The best evidence is Woods et al. (2024, *Communications Biology*): music with added AM improved sustained-attention (SART) performance, best at a **16 Hz** (beta-band) rate and higher modulation depths, with the benefit concentrated in listeners reporting more **ADHD** symptoms; fMRI showed greater attention-network activation and EEG showed increased 16 Hz stimulus-brain phase-locking. Two large caveats: the study's lead author is a Brain.fm employee and a co-author held company equity (disclosed conflict of interest), and the effect is strongest for a subpopulation. The same literature warns that *irregular* modulation is extra-distracting — so **if** an engine modulates, it should modulate like clockwork. Treat AM as an honestly-labeled, off-by-default experiment, not a validated feature.

## Loudness: quiet, and level-matched

Level matters. A controlled study found **45 dB(A)** white noise produced better sustained attention and creativity and lower stress than a 65 dB level or quiet ambient office noise; ISO 11690 likewise cites ~45 dB(A) as a desirable workplace background. Louder is not better — 65 dB improved working memory in that study but raised stress and errors. The prior prototypes mixed quiet (≈ −22 dBFS RMS) and applied an equal-loudness bass/treble tilt as volume dropped, since the ear loses low and high frequencies at soft levels. Keep background output quiet and level-matched across presets so no option is preferred merely for being louder. See [previous-experiments-lessons](previous-experiments-lessons.md).

## Implications for generative engines

- **Background mode = maximum predictability.** Regular meter, stable tempo, slowly and singly varying parameters (change one thing at a time, tens of seconds apart), and no sudden events. The goal is a low prediction-error stream the brain can safely ignore.
- **No lyrics and no speech-like timbres by default.** Avoid formant-rich pads that read as voice. This is the highest-value single rule.
- **Keep the spectrum steady and mostly low-mid.** Target a low, stable spectral centroid (roughly <900 Hz for texture beds, <1300 Hz even with drums), little energy above 5 kHz, and no bright transient onsets poking above the bed. Bury or omit melody; cap register (≈ C5 ceiling) and soften attacks.
- **Mix quiet and level-matched.** Aim around 45 dB(A) at the listener / ≈ −22 dBFS RMS internally, keep presets within ~1.5 dB of each other, and tilt bass/treble up as user volume falls.
- **Make stimulation adjustable, not fixed.** Because effects are task- and person-dependent, expose an intensity axis from near-texture (hard work) to gentle groove (routine work) rather than a single "focus" setting. See the presence-slider pattern in [film-and-game-music](film-and-game-music.md).
- **Noise and AM are opt-in and honestly labeled.** Texture/noise helps only some listeners; AM has vendor-heavy, subpopulation evidence. Default both off; if AM is offered, make it regular (~16 Hz) and clockwork.
- **Fight habituation with slow generative variety.** A fixed loop loses whatever benefit it had as it habituates; vary within a stable style so the palette stays fresh but never surprising. A daily seed gives a fresh-but-stable piece.
- **Do not claim cognitive enhancement.** Position background mode as mood/arousal support and distraction-masking. The evidence does not support a focus-boost claim, and honesty is a project value.

## Open questions

- Where exactly on the intensity axis does a given task tip from "music helps" to "music hurts," and can the engine infer it from user behavior rather than asking?
- How much of lo-fi's benefit is acoustic versus ritual/placebo? A listening test comparing identical audio with and without the "study" framing would help.
- Does slow generative variation genuinely delay habituation better than a long fixed loop over a multi-hour session? This is directly testable with this project's own engine.
- Can foreground and background modes share one composer, or do their opposite rules (surprise vs predictability) force separate generation paths? See [project-open-questions](project-open-questions.md).

## Related pages

- [auditory-perception-basics](auditory-perception-basics.md) — masking, equal-loudness, streaming
- [musical-expectation](musical-expectation.md) — prediction error as the attention-capture currency
- [repetition-and-familiarity](repetition-and-familiarity.md) — why steady-state is ignorable
- [emotion-and-meaning](emotion-and-meaning.md) and [pleasure-and-reward](pleasure-and-reward.md) — the arousal/mood channel
- [complexity-and-preference](complexity-and-preference.md) — stimulation level and task fit
- [ambient-and-generative-genre](ambient-and-generative-genre.md) and [electronic-and-dance](electronic-and-dance.md) — background-suited styles
- [previous-experiments-lessons](previous-experiments-lessons.md) — the focus-music prototype findings

## Sources

- Juliane Kämpfe, Peter Sedlmeier & Frank Renkewitz, "The impact of background music on adult listeners: A meta-analysis," *Psychology of Music* 39(4) (2011) — https://journals.sagepub.com/doi/10.1177/0305735610376261
- Nick Perham & Harriet Currie, "Can preference for background music mediate the irrelevant sound effect?" *Applied Cognitive Psychology* (2011) — https://onlinelibrary.wiley.com/doi/abs/10.1002/acp.1731
- Sebastian Küssner, "Eysenck's Theory of Personality and the Role of Background Music in Cognitive Task Performance: A Mini-Review" (covers Furnham & Bradley 1997), *Frontiers in Psychology* (2017) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5694457/
- Göran Söderlund et al., "Listen to the noise: noise is beneficial for cognitive performance in ADHD," *J. Child Psychology & Psychiatry* (2007); MBA model — https://www.icben.org/2008/PDFs/Soederlund_Sikstroem.pdf
- Kevin J. P. Woods et al., "Rapid modulation in music supports attention in listeners with attentional difficulties," *Communications Biology* 7:1376 (2024) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11499863/
- Onur Yorulmaz et al., "Cognitive performance, creativity and stress levels of neurotypical young adults under different white noise levels" (45 vs 65 dB), *Scientific Reports* (2022) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9418159/
