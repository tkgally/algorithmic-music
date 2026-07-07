---
title: Expressive performance
tags: [craft, evaluation]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: What human performers add to a score — the KTH rule system, measured timing/dynamics/articulation regularities, and an engine-ready table of deviation magnitudes.
---

# Expressive performance

A score is not a performance. Human players systematically deviate from notated durations, levels, and pitches, and those deviations — percent-level timing changes, a few decibels of shading — are what make music sound alive. "Mechanical performance" is a diagnosed failure of this project's previous engines ([previous-experiments-lessons](previous-experiments-lessons.md)), and the central finding of a half-century of performance research is that the cure is not randomness: expressive deviations are *structured*, driven by phrase shape, meter, harmony, and voice hierarchy, and performers reproduce them consistently. Palmer's review states the two functions plainly: expression clarifies musical structure for the listener and communicates affect. This page distills the rule systems and measured regularities into parameters a JavaScript engine can implement directly.

## The KTH rule system

The most complete engineering artifact in this field is the KTH rule system (Sundberg, Friberg, Bresin and colleagues, developed from the 1980s at KTH Stockholm; implemented in the Director Musices software). Built by analysis-by-synthesis — propose a rule, synthesize, let expert listeners judge — it comprises roughly 30 rules, each mapping a score context to deviations in duration, sound level, and/or pitch, with a per-rule quantity parameter k scaling the magnitude (default k=1; preferred magnitudes vary among musicians by a factor above 2 — up to about 2.5× — so k is genuinely a taste knob). Rules fall into three functional groups: differentiation of categories (making note classes more distinct), grouping (marking phrase and gesture boundaries), and ensemble rules.

Key rules, with quantitative details where the sources give them:

- Duration contrast: relatively short notes get shorter and softer, sharpening rhythmic categories. At k=1 the rule shortens such short notes by ~5% (the KTH default magnitude).
- Double duration: in 2:1 duration pairs, lengthen the short note, shorten the long one (softens over-crisp ratios).
- Faster uphill: shorten durations in ascending lines, creating drive toward the top note.
- High loud: play louder in proportion to pitch height (mirrors voice/brass acoustics). High sharp: stretch intonation ~4 cents per octave above the reference.
- Melodic charge: emphasize notes in proportion to their tonal distance from the current chord root — more level, more duration, more vibrato on harmonically "expensive" notes. Harmonic charge: the same idea at chord level, relative to the key center — crescendo toward remote harmonies. These two connect performance directly to [tension-and-release](tension-and-release.md).
- Punctuation: parse the melody into small gestures (14 subrules find the boundaries), then lengthen each gesture's final note and insert a micropause after it.
- Phrase arch: each phrase gets a tempo arch (start slow, accelerate through the middle, ritard into the end) coupled with a dynamic arch (crescendo–diminuendo), applied hierarchically at phrase and subphrase levels — the single highest-value rule for the "aimless noodling" failure mode, tying performance to [phrase-structure](phrase-structure.md).
- Final ritardando: end-of-piece slowing follows a square-root tempo curve, modeled on the velocity profile of stopping runners (Friberg & Sundberg 1999) — deceleration that feels physical rather than linear.
- Leap and repetition articulation: micropauses and/or level dips between leaps (proportional to leap size) and between repeated notes.
- Inégales / swing: long–short performance of nominally equal subdivisions; their measurement gives ~2.33:1 at ♩=132 for jazz/baroque inégales.
- Ensemble rules: synchronize voices via a synthetic combined melody, re-synchronize at barlines, and blend intonation harmonically.

## Measured regularities from real performances

Independent measurement studies broadly confirm the rule system's shape and add magnitudes:

- Tempo arcs at phrase boundaries are ubiquitous. Repp's "microcosm" studies quantified timing (1998) and dynamics (1999) in the opening of Chopin's E major Etude op. 10 no. 3 across a large sample of commercial recordings: phrase-final lengthening is essentially universal, with individual interpretation riding on top of a shared arch profile. Phrase arching (slower, less stable tempo at phrase edges; faster, steadier mid-phrase) is likewise documented in professional Bach performances.
- Dynamics track structure: louder at metrical strong points and with pitch height; the melody voice is played louder than accompaniment.
- Melody lead: melody notes in chords sound 20–50 ms before their accompaniment (Palmer). Goebl's measurement showed the ~30 ms lead nearly vanishes at the finger–key level: it is mostly a *velocity artifact* — the louder melody key is struck faster, so its hammer arrives earlier. Engine translation: emphasize melody with level, and small asynchrony follows naturally or can be added sparingly; don't implement large deliberate leads.
- Perceptual thresholds (JNDs, from the KTH work): in musical contexts, roughly 5% for relative duration change, ~6 ms for onset displacement in short sequences, and 1.4–1.6 dB for level change. Deviations well below these are individually inaudible; expressive deviations sit at and above them.

## Micro-timing, swing, and the randomness question

- Swing ratio is tempo-dependent, not a constant: measured drummers' ride-cymbal ratio runs as high as ~3.5:1 at slow tempi, falling toward ~1:1 (straight eighths) by roughly 300 BPM, with the short note holding an approximately constant ~100 ms across medium-to-fast tempi (Friberg & Sundström 2002; full curve and citation at [jazz-and-improvisation.md](jazz-and-improvisation.md), which now serves as this wiki's single canonical statement of the curve). At medium tempi, drummers run consistently above a 2:1 ratio and soloists consistently below it — the "2:1 triplet feel" sits between the two roles rather than describing either accurately. Hard-coding a fixed 2:1 swing at all tempos, or for all players, is wrong on both counts.
- Structured beats random, decisively. Datseris et al. manipulated a professional jazz pianist's micro-timing (SD of deviations ≈ 18.5 ms; the systematic mean offset from the grid stayed small, ~10 ms, near auditory threshold): *quantized* versions were rated swingier than the originals, and doubling the deviations was rated worst; inverting deviations changed little because real deviation sequences are long-range correlated (slow drift, not per-note noise). Their conclusion: "a rhythm should be persistent in its timing to yield a pronounced swing feel."
- The engine lesson: uniform per-note jitter does not sound human — it sounds sloppy (the "drunk drummer" effect). Human-like timing = systematic components (swing, laid-back offsets, phrase arching) plus a *small, temporally correlated* residual. Genre micro-timing and the participatory-discrepancies debate continue in [groove-and-embodiment](groove-and-embodiment.md).

## Articulation and vibrato

- Articulation classes: legato (notes overlap slightly), non-legato/détaché (small gaps), staccato (tone substantially shorter than notated). KTH implements articulation as micropauses and level dips triggered by leaps, repetitions, and punctuation boundaries. Precise overlap/gap magnitudes are instrument- and tempo-dependent; the table below gives engine defaults to calibrate by ear rather than sourced constants.
- Vibrato: classical vibrato rates run ~5–7 Hz; Prame's measurements of ten professional singers found a mean of 6.0 Hz (individual measurements spanning ~4.6–8.7 Hz) with rate rising ~15% toward the ends of long notes. Extent is commonly around ±0.5–1 semitone for operatic voices and narrower for most instruments (informed generalization). Practice literature consistently describes vibrato on long notes as starting shallow or delayed and blooming — a cheap, effective synthesis behavior ([synthesis-recipes](synthesis-recipes.md)).

## Ensemble timing

Ensembles are not sample-accurate: onset asynchronies of tens of milliseconds among nominally simultaneous parts are normal and mostly unnoticed, with the melody-lead phenomenon (20–50 ms, per Palmer) the best-documented case — though Goebl's artifact finding means "lead" should mostly be a byproduct of level emphasis, and jazz-trio studies frame tightness-with-lag (soloist laid back against a steady ride) as an idiom feature rather than an error. For synthesized textures the open question is how much asynchrony helps before it reads as mud; start near zero and add.

## Rule-to-parameter table

Defaults an engine can implement today. "KTH" = magnitude stated in the KTH literature; "measured" = from the cited measurement studies; "default" = informed engine default to calibrate via [listening-tests-and-feedback](listening-tests-and-feedback.md).

| Effect | Trigger | Deviation (at k=1) | Confidence |
|---|---|---|---|
| Duration contrast | Notes short relative to neighbors | Shorten ~5% at k=1 (KTH); soften slightly (~1 dB, default) | KTH + default |
| Phrase arch (tempo) | Each phrase/subphrase | Edges ~5–15% slower than mid-phrase, smooth arch, nested by level | KTH shape; magnitude default |
| Phrase arch (dynamics) | Same | ±2–4 dB crescendo/diminuendo coupled to the tempo arch | default |
| Punctuation | Gesture-final note | Lengthen final note ~5–10%; micropause ~30–80 ms | KTH shape; ms default |
| Final ritardando | Last ~2–4 bars | Tempo follows a square-root curve down to ~½–⅔ of base tempo | KTH/measured shape; endpoint default |
| Faster uphill | Ascending runs | Shorten ~2–5% per note | KTH shape; magnitude default |
| High loud | Pitch height | ~+2–3 dB per octave above mid-register | KTH rule; dB magnitude default |
| Melodic/harmonic charge | Tonal distance from chord root / key | ±1–3 dB level, ±2–5% duration, vibrato depth up | KTH shape; magnitudes default |
| Melody emphasis | Designated melody voice | +3–6 dB over accompaniment; optional ≤20 ms lead | measured (level); lead per Goebl, keep small |
| Swing | Idiomatic subdivision pairs | Ratio falls smoothly from ~3.5:1 at slow tempi to ~1:1 by ~300 BPM (short note ~100 ms constant at medium-to-fast tempi); interpolate a smooth curve rather than treating specific tempo/ratio pairs as measured data points — see [jazz-and-improvisation.md](jazz-and-improvisation.md) | measured shape (Friberg & Sundström); exact published curve not reproduced here |
| Laid-back voice | Soloist/melody vs groove grid | Constant ~10 ms behind grid (measured); optionally more for a deliberately laid-back feel | measured (Datseris) + default |
| Timing residual | All onsets | Correlated noise (slow random walk), σ ≈ 3–6 ms, never i.i.d. per note | measured principle; σ default (≤ ~6 ms JND) |
| Articulation | Staccato / non-legato / legato | Sound ~40–60% of IOI / ~75–90% / 100% + 10–40 ms overlap | default |
| Vibrato | Sustained notes | ~6 Hz (≈4.6–8.7 measured); extent ±30–100 cents by instrument; delayed onset ~0.2–0.5 s; rate +~15% toward note ends | measured (rate); extent/onset default |

Interactions matter: rules sum, and stacked maxima sound mannered. KTH's k-weighting is the model — implement every rule with an independent k and a global expressive-depth master.

## Implications for generative engines

1. Architecture: implement expression as a separate pass mapping score context to deviations — (structure, meter, harmony, voice role) → (Δtime, Δduration, Δlevel, Δpitch, vibrato) — with per-rule k parameters, exactly the KTH shape. This keeps composition and performance separately testable ([engine-architecture](engine-architecture.md)).
2. Minimum viable humanization, in value order: phrase arch (tempo+dynamics), final ritardando, melody emphasis, duration contrast, punctuation micropauses, high loud, swing where idiomatic.
3. Never add uniform random timing jitter; use structured deviations plus a small correlated residual (σ ≤ ~6 ms). Exaggeration is worse than quantization — when in doubt, less (Datseris).
4. Tempo must be a continuous curve, not a constant: the scheduler needs to support smooth tempo modulation and micropauses without drift ([scheduling-and-timing](scheduling-and-timing.md)).
5. Swing ratio is a function of tempo; implement the interpolation, not a constant.
6. Keep k conservative and expose it: preferred magnitudes vary by a factor above 2 (up to ~2.5×) among experts, so ship gentle defaults and A/B the knob via pairwise listening.
7. Validate against data: extract timing/velocity deviation distributions from MAESTRO ([corpus-analysis](corpus-analysis.md)) and compare the engine's deviation distributions to them in the metrics harness ([computational-music-metrics](computational-music-metrics.md)).
8. Give sustained synth voices vibrato with delayed onset and phrase-end rate lift; a perfectly static sustain is one of the strongest "mechanical" tells ([timbre-and-orchestration](timbre-and-orchestration.md)).

## Open questions

- How much of this piano/voice-derived rule set transfers to pads, plucks, and percussive synth timbres? (Phrase arch and punctuation likely universal; melody lead and pedal-related effects likely not.)
- Under background listening ([attention-and-background-listening](attention-and-background-listening.md)), which rules still earn their complexity? Plausibly the slow ones (phrase arch, ritardando) dominate and micro-timing matters less — untested.
- Ensemble asynchrony for synthesized textures: expressive at what magnitude, mud at what magnitude?
- The KTH k-preference studies used classical excerpts; do the same k ranges hold for this project's idioms?

## Related pages

- [groove-and-embodiment](groove-and-embodiment.md) — micro-timing, groove, and the body
- [phrase-structure](phrase-structure.md) — the structures phrase arching expresses
- [tension-and-release](tension-and-release.md) — what melodic/harmonic charge implements
- [scheduling-and-timing](scheduling-and-timing.md) — making tempo curves and micropauses playable
- [corpus-analysis](corpus-analysis.md) — MAESTRO as the deviation-profile source
- [computational-music-metrics](computational-music-metrics.md) — verifying deviation distributions
- [composition-craft](composition-craft.md), [timbre-and-orchestration](timbre-and-orchestration.md) — neighboring craft pages
- [previous-experiments-lessons](previous-experiments-lessons.md) — the failure this page exists to fix

## Sources

- Friberg, A. "A Quantitative Rule System for Musical Performance" (doctoral thesis summary; rule list, magnitudes, JNDs, k parameter). KTH. https://www.speech.kth.se/music/publications/thesisaf/sammfa2nd.htm
- Friberg, A., Bresin, R., Sundberg, J. "Overview of the KTH rule system for musical performance." Advances in Cognitive Psychology 2(2–3), 145–161, 2006. (Print reference; existence and content verified via multiple secondary sources, 2026-07-06.)
- Friberg, A. & Sundberg, J. "Does music performance allude to locomotion? A model of final ritardandi derived from measurements of stopping runners' deceleration." Journal of the Acoustical Society of America 105(3), 1469–1484, 1999.
- Palmer, C. "Music Performance." Annual Review of Psychology 48, 115–138, 1997 (melody lead 20–50 ms; functions of expression). https://www.mcgill.ca/files/spl/annrev97.pdf
- Goebl, W. "Melody lead in piano performance: Expressive device or artifact?" Journal of the Acoustical Society of America 110(1), 563–572, 2001. https://iwk.mdw.ac.at/goebl/papers/Goebl_JASA2001_melodyLead.pdf
- Repp, B. "A microcosm of musical expression: I. Quantitative analysis of pianists' timing in the initial measures of Chopin's Etude in E major." JASA 104(2), 1085–1100, 1998 (and part II on dynamics, JASA 1999).
- Friberg, A. & Sundström, A. "Swing ratios and ensemble timing in jazz performance." Music Perception 19(3), 333–349, 2002 (swing ratio vs tempo; cross-checked via Datseris et al.).
- Friberg, A. & Sundström, A. "Grouping Rules: Ensemble Swing" (KTH summary of the above; drummers' ratio consistently above 2:1 at medium tempi, soloists' consistently below). https://www.speech.kth.se/music/performance/Texts/ensemble_swing.htm
- Datseris, G. et al. "Microtiming Deviations and Swing Feel in Jazz." Scientific Reports 9, 2019. https://pmc.ncbi.nlm.nih.gov/articles/PMC6934603/
- Prame, E. "Measurements of the vibrato rate of ten singers." Journal of the Acoustical Society of America 96(4), 1979–1984, 1994 (mean 6.0 Hz; measurements span ~4.6–8.7 Hz; rate rises toward note ends) — https://pubs.aip.org/asa/jasa/article-abstract/96/4/1979 ; secondary summary: VoiceScience lexicon — https://www.voicescience.org/lexicon/vibrato-rate/
- "Flexibility of Expressive Timing in Repeated Musical Performances" (phrase arches in professional Bach performances). Frontiers in Psychology, 2016. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5047881/
