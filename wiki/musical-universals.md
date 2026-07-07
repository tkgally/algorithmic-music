---
title: Musical universals
tags: [psychology, genre]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: What is actually universal in music versus culturally learned — statistical universals, cross-cultural form-function links, the consonance and octave-equivalence debates, rhythm priors, and the standing critiques.
---

# Musical universals

This page keeps the project honest about what transfers across listeners and what must be genre-committed. The empirical picture, roughly: no musical feature is known to be absolutely universal; a substantial set of features is *statistically* universal (discrete pitches, small scales, repetition, an isochronous beat with 2- or 3-fold subdivision, small-integer rhythm categories, form-function correlations like lullaby-vs-dance); and several things Western training treats as bedrock — consonance preference, octave equivalence, specific scales, harmonic syntax — show strong cultural contingency. An engine can rely on the first set as defaults for any audience; everything else is a stylistic commitment and should be made deliberately, per genre.

## Two senses of "universal"

Absolute universals (present in every music, no exceptions) versus statistical universals (present far above chance across independent cultures). Savage, Brown, Sakai & Currie (2015) analyzed 304 field recordings from nine world regions (the Garland Encyclopedia sample) and found *no* absolute universals in their feature set, but many statistical ones, plus a network of features that co-occur worldwide. Claims of universality below always mean the statistical kind.

## Statistical universals (Savage et al. 2015)

Savage et al. report two distinct kinds of result, worth keeping separate. First, 18 individually statistically-universal features, common far above chance across all nine regions on their own: use of discrete pitches; octave-organized scales of seven or fewer tones per octave; descending or arched melodic contours; motivic patterns and repetition; an isochronous (evenly spaced) beat; beat subdivision into groups of 2 or 3; syllabic, chest-voice singing of words; and others. Second, a separate network analysis found about ten features that travel *together* across cultures more than chance would predict — centered on group performance, dance, percussion, and "simple, repetitive music" — a co-occurrence cluster the authors read as serving group coordination and cohesion, not a claim that each of those features is independently universal in the way the first list's items are. Practical reading: the cross-culturally shared core of music is closer to a drum circle than to a symphony, but "percussion" and "dance" travel together as an associated bundle more than they stand alone as universals.

## Form-function links (Mehr et al. 2019, Natural History of Song)

Mehr and colleagues built paired corpora — ethnographic descriptions of song from 60 societies (eHRAF ethnographies describe music in 309 of the 315 societies with ethnography — six had none documented) and 118 field recordings from 86 societies — and found song behavior varying along three dimensions (formality, arousal, religiosity), with music most consistently attached to infant care, healing, dance, and love. In online experiments (N ≈ 29,000), listeners identified the function of foreign songs above chance: dance songs and lullabies most reliably, healing songs moderately, love songs poorly. Acoustic features predicted function across cultures (lullabies slower, simpler, "sadder"; dance songs faster, more complex, more arousing) — the infant-directed register in particular appears highly stereotyped worldwide. Mehr also noted the data "raise the controversial possibility" that tonality — organizing melody around a stable reference pitch — "could be a universal feature of music." Form-function is the strongest bridge this project has between engine parameters and intended listener state; see [emotion-and-meaning](emotion-and-meaning.md).

## What does not transfer: consonance preference

McDermott, Schultz, Undurraga & Godoy (2016) tested the Tsimane', an Amazonian society with minimal Western-music exposure: they rated consonant and dissonant chords as *equally pleasant*, while preference for consonance increased stepwise across Bolivian town dwellers, La Paz residents, US nonmusicians, and US musicians. Crucially, Tsimane' listeners discriminated the stimuli normally and disliked acoustic roughness — perception intact, aesthetic preference absent. Interpretation: the *strength* (perhaps the existence) of consonance preference is a product of exposure, not hardwiring. The finding remains debated (harmonicity-based accounts and later studies complicate it), but the safe engineering conclusion stands: do not treat triadic consonance as a human constant; treat it as a Western-idiom commitment.

## Octave equivalence, contested

Octave equivalence — treating pitches an octave apart as "the same" — long headed lists of proposed universals. Jacoby et al. (2019) had US and Tsimane' participants sing back melodies presented outside their vocal range: US singers reproduced them transposed by octaves (preserving chroma); Tsimane' singers preserved the interval pattern but showed no bias toward octave-equivalent transposition. Some pitch machinery was shared (similar interval fidelity, similar upper pitch limits ~4 kHz), but octave equivalence itself behaved as culture-dependent. Scale sizes of ≤7 tones per octave remain statistically universal (Savage), so octave *organization* of scales and perceptual octave *equivalence* need separating.

## Rhythm: the strongest universal candidates

- **Isochronous beat with 2/3 subdivision** is statistically universal in corpus data (Savage et al. 2015).
- **Small-integer-ratio rhythm categories.** Jacoby & McDermott (2017) used iterated reproduction (participants tap back random three-interval rhythms; their reproduction becomes the next stimulus) and found perceptual priors peaking at small-integer ratios in both US and Tsimane' listeners — but with culture-specific weighting. The 15-country follow-up (Jacoby et al. 2024, 39 groups) confirmed: every group's prior concentrated on integer-ratio categories (1:1:1 and simple ratios everywhere), while *which* ratios were emphasized tracked local idiom — 3:3:2 prominent in African and Afro-diasporic traditions ([west-african-rhythm](west-african-rhythm.md)), 2:2:3 among Turkish and Bulgarian musicians, even 7:2:3 in Mali, where participants recognized it as a named local piece. A methodological bonus: student/online convenience samples showed much less cultural diversity than local non-student groups — universality claims built on convenient samples overstate uniformity.

## Tonal hierarchies across cultures

Castellano, Bharucha & Krumhansl (1984) collected probe-tone ratings for ten North Indian ragas from Indian and Western listeners. Both groups' ratings recovered the ragas' tonal hierarchies (Sa and Pa high, vadi elevated); Western listeners evidently induced the hierarchy from surface statistics — which tones sounded most often and longest — while Indian listeners added culture-specific scale-system (that) knowledge. Converging with statistical-learning accounts of expectation ([musical-expectation](musical-expectation.md)): an engine can *teach* its tonal hierarchy within a piece by controlling tone distributions, even for unfamiliar scale systems — but the deeper layer of enculturated knowledge is not available on first listen.

## Critiques and methodological cautions

- **Cantometrics.** Lomax's pioneering global song-style codings (37 features, 5,776 songs, 1,026 societies) drew lasting criticism: coding subjectivity and low reliability; also the inverse charge that codings ignored how similar sound structures carry different meanings in different cultures; thin sampling (~10 songs per society) and overbroad "society" units; and the autocorrelation (Galton's) problem — style-society correlations arising from shared history and contact rather than function. The Global Jukebox team (Wood et al. 2022) republished the data with reliability testing: mean inter-rater kappa 0.54, excellent for some variables (solo vs group singing, 0.94), chance-level for others (nasality). Lesson: cross-cultural feature coding is usable but noisy; trust coarse features most.
- **Disciplinary skepticism.** Ethnomusicology has long resisted universals talk — insisting music is not a universal "language," that "music" itself is not a universal category (many languages lack an equivalent term), and that decontextualized audio snippets strip the meaning that makes song what it is. The joint statement by Jacoby, Margulis, Clayton, Mehr, Polak, Savage, Trehub and colleagues (2020) is the current best-practice synthesis: music cognition's evidence base is heavily WEIRD (Western, educated samples), universality claims require insider collaboration, ethical data practices, and explicit definitions of "music" and "culture." Mehr et al.'s 2019 paper itself drew such criticism (e.g., for treating songs as data points detached from context) — a live, unsettled methodological debate rather than a resolved one.

## Implications for generative engines

1. **Safe defaults for any audience** (statistically universal, use unless a genre says otherwise): discrete pitches; a stable reference pitch (drone/tonal center); scales of ≤7 tones per octave; heavy motivic repetition and variation; descending/arched phrase contours; an isochronous pulse subdivided in 2s or 3s; rhythm cells built from small-integer ratios; percussion; repetition tuned per [repetition-and-familiarity](repetition-and-familiarity.md).
2. **Never assume without genre commitment:** graded consonance preference (triads/harmonic syntax are Western idiom, not psychology); perceptual salience of octave equivalence; any specific scale tuning; meter beyond simple subdivision (aksak works, but as an idiom); expressive codes like minor=sad ([emotion-and-meaning](emotion-and-meaning.md)).
3. **Use form-function acoustics as a control surface.** The lullaby/dance axes — tempo, rhythmic regularity, complexity, arousal — are the best-validated cross-cultural levers for intended listener state; map engine "mood" parameters onto them rather than onto Western topic codes. Relevant to [attention-and-background-listening](attention-and-background-listening.md).
4. **Teach the piece's own hierarchy.** Following Castellano et al.: make structural tones frequent and long early; first-listen comprehensibility of unfamiliar scale systems is buildable from distribution alone.
5. **Rhythm categories, not continuous time.** Quantize generative rhythm to small-integer-ratio cells (then apply expressive microtiming); pick the *weighting* of cells per genre — e.g., privilege 3:3:2 for Afro-diasporic grooves, 2:2:3 for Balkan meters.
6. **Evaluation humility.** Our listeners (and we) are enculturated; a "universally pleasant" engine is a category error. Test per audience and treat cross-genre transfer as an empirical question — see [evaluation-challenges](evaluation-challenges.md) and [listening-tests-and-feedback](listening-tests-and-feedback.md).

## Open questions

- Consonance: how far have post-2016 studies (harmonicity preferences, replication attempts in other isolated groups) qualified the Tsimane' result? Needs a follow-up ingest before we lean on it.
- Is tonality-as-reference-pitch (Mehr's "controversial possibility") robust enough to hard-code a drone/center into every engine, including "atonal" experiments?
- Small-integer priors were measured on 2 s three-interval patterns; do they scale to longer cycles (12-pulse timelines, 16-beat talas)?
- Infant-directed song: does the lullaby acoustic profile double as a general calm-background profile for adult listeners ([pleasure-and-reward](pleasure-and-reward.md))?

## Related pages

- [musical-expectation](musical-expectation.md) — statistical learning, the mechanism behind teachable hierarchies
- [auditory-perception-basics](auditory-perception-basics.md) — roughness, pitch limits, the shared substrate
- [rhythm-and-meter](rhythm-and-meter.md) — isochrony and subdivision in engine terms
- [tuning-and-scales](tuning-and-scales.md) — scale size vs scale tuning; what is convention
- [repetition-and-familiarity](repetition-and-familiarity.md) — the most universal feature of all
- [emotion-and-meaning](emotion-and-meaning.md) — which expressive codes are learned
- [complexity-and-preference](complexity-and-preference.md) — arousal/complexity as cross-cultural levers
- [evaluation-challenges](evaluation-challenges.md) — WEIRD sampling and what our tests can claim
- [gamelan](gamelan.md), [indian-classical-music](indian-classical-music.md), [west-african-rhythm](west-african-rhythm.md), [east-asian-traditions](east-asian-traditions.md) — the genre commitments this page constrains

## Sources

- P. E. Savage, S. Brown, E. Sakai, T. E. Currie, "Statistical universals reveal the structures and functions of human music," *PNAS* 112(29), 2015. https://doi.org/10.1073/pnas.1414495112
- S. A. Mehr et al., "Universality and diversity in human song," *Science* 366(6468), 2019. https://www.science.org/doi/10.1126/science.aax0868 (details also via Harvard Gazette, 2019: https://news.harvard.edu/gazette/story/2019/11/new-harvard-study-establishes-music-is-universal/)
- J. H. McDermott, A. F. Schultz, E. A. Undurraga, R. A. Godoy, "Indifference to dissonance in native Amazonians," *Nature* 535, 2016 (summary with author quotes: MIT News, 2016). https://news.mit.edu/2016/music-tastes-cultural-not-hardwired-brain-0713
- N. Jacoby, J. H. McDermott, "Integer ratio priors on musical rhythm revealed cross-culturally by iterated reproduction," *Current Biology* 27(3), 2017.
- N. Jacoby et al., "Commonality and variation in mental representations of music revealed by a cross-cultural comparison of rhythm priors in 15 countries," *Nature Human Behaviour*, 2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11132990/
- N. Jacoby, E. A. Undurraga, M. J. McPherson, J. Valdés, T. Ossandón, J. H. McDermott, "Universal and non-universal features of musical pitch perception revealed by singing," *Current Biology* 29(19), 2019.
- M. A. Castellano, J. J. Bharucha, C. L. Krumhansl, "Tonal Hierarchies in the Music of North India," *JEP: General* 113(3), 1984. http://www.brainmusic.org/EducationalActivities/Castellano_Indianmusic1984.pdf
- A. L. C. Wood et al., "The Global Jukebox: A public database of performing arts and culture," *PLOS ONE*, 2022 — cantometrics history, criticisms, reliability re-testing. https://pmc.ncbi.nlm.nih.gov/articles/PMC9629617/
- N. Jacoby, E. H. Margulis, M. Clayton, ..., M. Wald-Fuhrmann, "Cross-Cultural Work in Music Cognition: Challenges, Insights, and Recommendations," *Music Perception* 37(3), 2020. https://doi.org/10.1525/mp.2020.37.3.185
