---
title: Repetition and familiarity
tags: [psychology]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Why repetition is a near-universal feature of music, how it and familiarity breed liking (with an overexposure ceiling), and why endlessly novel generative music forfeits the strongest lever on enjoyment.
---

# Repetition and familiarity

Music is astonishingly repetitive — far more than speech or almost any other human artifact — and that repetitiveness is not a stylistic accident but a load-bearing part of why music works on us. Repetition builds the predictions that expectation theory (see [musical-expectation.md](musical-expectation.md)) then pays off; it shifts attention from surface to structure; and, together with familiarity, it is arguably the single strongest predictor of how much a listener likes a piece. This page collects the evidence, because it points at a specific failure mode of generative systems: an engine that never repeats itself, prizing perpetual novelty, throws away the repetition-and-familiarity machinery that human enjoyment leans on hardest.

## Repetition as a quasi-universal

Elizabeth Margulis's *On Repeat* (2014) is the key synthesis. Ethnomusicologist Bruno Nettl lists repetitiveness among the handful of near-universals found in music across cultures and eras; Margulis argues that stable, cross-cultural perceptual tendencies constrain and generate how music uses repetition. Repetition operates at every timescale — the immediate repeat of a note or beat, the looped one- or two-bar groove, the repeated phrase, the returning chorus or theme, the recapitulation. Estimates cited by Margulis suggest that well over 90% of the music people actually hear consists of passages they have heard before, whether within the piece or from prior listens. Repetition is so bound up with musicality that it can act, in her phrase, as a "quasi-magical" agent that turns non-musical material into music.

## The speech-to-song illusion

Diana Deutsch's speech-to-song illusion (1995, formalized 2011) is the cleanest demonstration. A short spoken phrase, looped without any alteration, comes to sound *sung* rather than spoken after several repeats — the pitches of ordinary speech start to be heard as a melody. The transformation requires *exact* repetition: it does not occur if the repeats are transposed or the syllables reordered. Deutsch's interpretation is that exact repetition disinhibits pitch-perception circuitry (so pitch becomes salient) and simultaneously acts as a cue that the material should be parsed as music. The lesson for us is strong: repetition itself is a musicalizing signal, independent of the material's content.

## Repetition shifts attention and breeds liking

Margulis argues repetition changes *how* we listen. On re-hearing, attention moves off the note-by-note surface and onto larger-scale relationships, expressive nuance, and structure; passages come to feel like they are moving "with" the listener, and repeated musical fragments invite a kind of participatory, almost subvocal engagement. Neuroimaging cited in this literature finds greater activity in emotion-related regions for familiar music — even music people report not liking — suggesting familiarity engages affect somewhat independently of stated preference. Repetition also enables anticipation: once you know the loop, you predict its continuation and get the prediction reward (see [pleasure-and-reward.md](pleasure-and-reward.md)).

## The mere exposure effect and its ceiling

Zajonc's mere exposure effect is the foundational finding: repeated exposure to a stimulus, even without reinforcement, increases liking for it. In music this is robust — a track that grates on first hearing can become a favorite after several plays. But the relationship is not monotonic. A two-factor account (habituation increasing affect, plus tedium/satiation from overexposure) predicts an **inverted-U**: liking rises with the first several exposures, peaks, then declines with continued repetition. Empirically the peak and its location depend heavily on context:

- **Focused vs. incidental listening**: Schellenberg and colleagues found focused listening produced an inverted-U (liking up after ~2 exposures, down after 8–32), while incidental (background) listening produced roughly linear increases in liking across the same range. This is directly relevant to a project spanning attentive and background use — background music tolerates far more repetition before satiation.
- **Compressed vs. spaced**: overexposure within a single session is the main driver of decline; the same number of plays spread over days is more likely to keep increasing liking.
- **Material**: declines with repetition show up most for monophonic, synthetic, or short stimuli — precisely the kind of thin material a naive generative engine might produce, which raises its satiation risk.
- **Real-world data**: for newly released tracks, streaming-listen probability follows an inverted-U over exposures; for long-known classics it decays monotonically, consistent with long-past-peak satiation.

## Familiarity as the strongest predictor of liking

When researchers put familiarity head-to-head with other predictors, it tends to win. Madison and Schiölde (2017) had listeners rate music of varying complexity across 28 exposures over ~4 weeks; the strongest predictor of liking was *familiarity with similar music* (standardized β ≈ 0.55), ahead of number of presentations (β ≈ 0.46) and complexity (β ≈ 0.23), the model explaining ~57% of variance. Note this is familiarity with the *style*, not just the specific track: prior exposure to a genre's statistics primes liking for new instances of it. This dovetails with enculturation (see [musical-expectation.md](musical-expectation.md)) — a listener likes what sounds like what they already know.

## Earworms: repetition that runs on its own

Involuntary musical imagery (INMI, "earworms") — a fragment of music replaying in the mind unbidden and on loop — is a vivid demonstration of how repetitive musical memory is. It is near-universal (most people experience earworms regularly) and reactions are usually neutral-to-positive. Jakubowski et al. (2017), comparing 100 frequently-named earworm tunes to 100 never named, found earworm-prone tunes tend to have (a) *faster* average tempo, (b) a common, generic overall melodic contour (the global up-down shape typical of pop melodies), yet (c) *distinctive* local features — unusual intervals or repetitions that set the tune apart (their examples: the "Smoke on the Water" riff, the "Bad Romance" chorus). So the recipe is a conventional, easy-to-process frame carrying one memorable irregularity — a small, structurally-placed surprise inside a familiar shape.

## Verbatim repetition: tolerated in music, not in speech

A striking asymmetry: near-exact ("verbatim") repetition that would be intolerable in speech or prose is not merely accepted but sought in music. Saying the same sentence four times reads as a malfunction; playing the same four-bar phrase four times is normal and often pleasurable. Margulis ties this to the participatory, anticipatory mode repetition induces — in music the point is often the *re-experience*, not new information. This licenses generative engines to reuse material far more aggressively than a text-generation intuition would suggest.

## Exact vs. varied repetition

The craft question is not *whether* to repeat but *how much to vary*. Pure verbatim repetition maximizes recognizability and the prediction reward but hits satiation soonest, especially under attentive listening. Varied repetition (the same idea with a changed ending, added voice, new orchestration, transposition, or ornament) refreshes attention while preserving identity — theme-and-variations, the developing groove, the chorus that returns with a new counter-melody. The general principle: **keep an identifiable invariant and vary around it.** Enough sameness to be recognized and predicted; enough change to defer boredom.

## Implications for generative engines

- **Repeat on purpose, at multiple timescales.** Build in immediate repeats (grooves, ostinati), returning phrases, and large-scale return (a section that comes back). An engine biased toward perpetual novelty is likely a direct cause of "intriguing but not satisfying"; the repetition-liking and prediction-reward machinery only engages if material recurs.
- **Keep a recognizable invariant, vary around it.** Prefer varied repetition to verbatim loops for attentive listening: fix a motif/chord loop/rhythmic cell and mutate secondary parameters (orchestration, register, ornament, one changed note). This buys familiarity without early satiation.
- **Tune repetition to the listening mode.** Background use tolerates near-linear liking gains from heavy repetition; attentive listening satiates on an inverted-U. Expose a "novelty/variation rate" control, or infer the mode, and repeat more freely in background mode. (See [attention-and-background-listening.md](attention-and-background-listening.md).)
- **Avoid compressed overexposure of a single cell.** Since satiation is driven mainly by within-session repetition, cap how many times any exact fragment repeats before it must vary or yield, especially for thin/synthetic textures which satiate fastest.
- **Lean on style familiarity, not just track novelty.** Because familiarity with the *style* predicts liking more than track-level novelty, generating squarely within a recognizable genre's statistics is a feature, not a lack of imagination — it makes new output feel likable on first hearing.
- **Design for earworm-friendliness where memorability is wanted.** A conventional contour and clear meter carrying one distinctive local hook (an unusual interval or a pointed repeat) is the empirically-supported shape of a sticky tune.
- **Use exact repetition as a musicalizing signal.** Deutsch's illusion implies that looping even unpromising material can make it read as music; repetition is a cheap lever for coherence.

## Open questions

- Where is the satiation ceiling for algorithmically generated (as opposed to human-recorded) loops, given that synthetic material satiates faster? This is a prime target for the project's own listening tests (see [listening-tests-and-feedback.md](listening-tests-and-feedback.md)).
- Optimal exact-vs-varied ratio across genres and timescales is uncharted for generated music.
- Can an engine detect a listener nearing satiation (skips, attention drop) and increase variation adaptively?

## Related pages

- [musical-expectation.md](musical-expectation.md) — repetition builds the predictions
- [pleasure-and-reward.md](pleasure-and-reward.md) — familiarity's dose-response on pleasure
- [complexity-and-preference.md](complexity-and-preference.md) — familiarity × complexity interaction
- [form-and-structure.md](form-and-structure.md), [phrase-structure.md](phrase-structure.md) — repetition as structural device
- [minimalism-and-process-music.md](minimalism-and-process-music.md), [groove-and-embodiment.md](groove-and-embodiment.md) — genres built on repetition
- [attention-and-background-listening.md](attention-and-background-listening.md) — mode-dependent satiation
- [generative-music-failure-modes.md](generative-music-failure-modes.md) — the endless-novelty trap

## Sources

- Elizabeth Hellmuth Margulis, *On Repeat: How Music Plays the Mind*, Oxford University Press, 2014 — https://global.oup.com/academic/product/on-repeat-9780199990825 ; essay: https://aeon.co/essays/why-repetition-can-turn-almost-anything-into-music
- Diana Deutsch et al., "Illusory transformation from speech to song," J. Acoust. Soc. Am., 2011 — https://deutsch.ucsd.edu/pdf/JASA-2011_129_2245-2252.pdf ; overview: https://en.wikipedia.org/wiki/Speech-to-song_illusion
- Green, Bavelier et al., "Listen, Learn, Like! Dorsolateral Prefrontal Cortex Involved in the Mere Exposure Effect in Music," 2012 (mere exposure / two-factor satiation) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3324153/
- Madison & Schiölde, "Repeated Listening Increases the Liking for Music Regardless of Its Complexity," Frontiers in Neuroscience, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5374342/
- Jakubowski, Finkel, Stewart & Müllensiefen, "Dissecting an Earworm: Melodic Features and Song Popularity Predict Involuntary Musical Imagery," 2017 — https://research.gold.ac.uk/id/eprint/19405/ ; summary: https://www.apa.org/news/press/releases/2016/11/earworms
