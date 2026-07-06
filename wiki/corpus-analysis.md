---
title: Corpus analysis
tags: [evaluation, algorithms]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Human-composed corpora as reference distributions — the major symbolic datasets, what statistics to extract, licensing care, and a dev-time workflow that bakes distilled tables into the wiki.
---

# Corpus analysis

The engines need to know what human music statistically looks like: which intervals, rhythms, chord moves, phrase lengths, and performance deviations actually occur, and in what proportions. Corpora of human-composed music supply those reference distributions — both to calibrate the metric layer ([computational-music-metrics](computational-music-metrics.md) compares generated-feature distributions against references) and to inform generation tables directly ([markov-and-statistical-models](markov-and-statistical-models.md)). This project uses corpora for *statistics*, not as training data for learned models ([machine-learning-music](machine-learning-music.md) covers that road and why this project mostly doesn't take it), and because the runtime is browser-only, all corpus work happens at development time.

## The major symbolic corpora

| Corpus | Contents | Size | Format | Notes for this project |
|---|---|---|---|---|
| Essen Folksong Collection | Monophonic folk melodies, mostly German-area plus Chinese and others, begun by Helmut Schaffrath | ~10,000 melodies in current form (commonly cited subsets: ~4,900 German+Chinese) | EsAC (also converted to **kern, ABC; bundled in music21) | Rare treasure: human-marked phrase boundaries → phrase-length and cadence norms |
| KernScores / Humdrum | Bach chorales (the 371-chorale Riemenschneider set), classical keyboard, quartets, Renaissance polyphony (CCARH) | Thousands of scores | Humdrum **kern (plain text, parseable with a small script) | Chorales = the standard voice-leading and functional-harmony reference |
| music21 corpus | Offline bundle: Bach (400+ works), Palestrina masses, Monteverdi madrigals, Haydn/Mozart/Beethoven quartets, Essen subset, O'Neill's Irish tunes, Aird's Airs | Hundreds of MB | Mixed (kern, MusicXML, ABC) via Python API | One dev-time dependency that covers most classical/folk needs |
| Hooktheory / TheoryTab | Crowd-sourced analyses of pop songs: melody + chords encoded functionally (scale degrees, Roman numerals relative to key) | ~22k song segments / ~13k songs (as used in Donahue et al. 2022); an 11k lead-sheet derivative (HLSD) exists | Proprietary web/API; research derivatives | The pop-harmony transition reference; annotations relative-to-key = directly usable tables |
| MAESTRO | Virtuoso piano performances from the International Piano-e-Competition: MIDI with key velocities and pedal, aligned to audio within ~3 ms | ~200 hours, 1,276 performances | MIDI + WAV | The performance-deviation reference (timing, velocity) — feeds [expressive-performance](expressive-performance.md) |
| Lakh MIDI | Scraped general MIDI files, 45,129 matched to the Million Song Dataset | 176,581 files | MIDI | Scale with noise: corrupted files, false matches, unknown transcription quality and provenance — heavy filtering required |
| ABC collections | The Session (Irish trad, weekly data dumps: tunes/settings as CSV/JSON/SQLite); abcnotation.com aggregates; O'Neill's 1850 | Tens of thousands of tunes | ABC (trivially parseable text) | Good for dance-tune melodic/rhythmic idiom; quality varies by contributor |
| RISM | Catalog metadata and incipits of historical music sources | Millions of records | Online database | For locating repertoire, not for statistics; noted for completeness |

## What to extract, from where

- Interval and contour distributions, rhythm/IOI distributions: Essen (folk/melodic norms), chorales (vocal norms) → reference bands for [melody](melody.md) and [rhythm-and-meter](rhythm-and-meter.md) metrics.
- Phrase-length norms: Essen's explicit phrase marks give distributions of phrase length in notes and bars, and where phrases sit relative to the meter → [phrase-structure](phrase-structure.md).
- Chord transition tables: Hooktheory for pop practice (functional encoding means the table is key-independent); Bach chorales for common-practice functional harmony → [harmony](harmony.md).
- Cadence formulas: chorale endings and Essen phrase-finals (melodic scale-degree endings + bass motion) → cadence templates for the metric layer's cadence detector.
- Voice-leading statistics: chorales (SATB spacing, motion types, doubling habits) → [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md).
- Performance timing and velocity profiles: MAESTRO note onsets vs the quantized grid, velocity as a function of pitch height and metrical position, tempo curves at phrase boundaries → deviation magnitudes for [expressive-performance](expressive-performance.md).
- Style-fit references for any genre an engine targets: pick the closest corpus and compute the same features the metric layer computes, so KL-divergence/overlap comparisons are apples-to-apples ([style-and-genre-overview](style-and-genre-overview.md)).

## Licensing and copyright care

Corpus use has two separate legal layers: the *music* and the *encoding/annotation*. Both matter before anything ships.

- Pre-1900 compositions are public domain, but specific editions, arrangements, and encodings can carry their own claims. Check each corpus's stated terms; music21 documents licensing per collection.
- MAESTRO is CC BY-NC-SA 4.0 — fine for internal analysis; do not ship its data or audio in anything commercial-adjacent; derived aggregate statistics are the safe product.
- Lakh MIDI is distributed CC-BY 4.0 *as a collection*, but the individual files' provenance and rights are unknown — never redistribute or embed the MIDIs; aggregate statistics only.
- Hooktheory annotations belong to the platform/community and the underlying pop songs are copyrighted — extract aggregate transition tables; never embed melodies or recognizable excerpts.
- The Session dumps are openly provided (license file in the repo, with a donation request); tunes are traditional but individual "settings" are contributions — same rule applies.
- Working principle: engines ship *derived statistics* (histograms, transition matrices, parameter tables), never corpus excerpts. Aggregate statistical tables are generally regarded as low-risk; this is informed judgment, not legal advice — when in doubt, keep the artifact to numbers no melody can be reconstructed from.

## Acoustic analysis of recordings

Symbolic corpora say nothing about timing feel, dynamics shading, or timbre balance as actually heard. Audio analysis of recordings adds those norms (tempo curves, loudness ranges, spectral balance per genre), and mature offline tools exist (librosa and friends). Two constraints keep this modest here: audio features are far noisier to attribute to compositional decisions, and this project's runtime is browser-only anyway — so any audio-corpus work is also dev-time, and the highest-value performance data (MAESTRO) is already symbolic MIDI with velocities, sidestepping transcription entirely. Recommended order: exhaust symbolic corpora first; touch audio analysis only when a specific question (e.g., genre loudness/spread bands for [effects-and-mixing](effects-and-mixing.md)) demands it.

## Workflow for this project

Runtime is HTML/JS in the browser with no corpus access; therefore:

1. Dev-time scripts, in-repo (proposed `corpus/` directory): Node scripts parsing the text formats directly (EsAC, ABC, and **kern are all line-oriented plain text; MIDI needs a small parser) — or a thin Python step using music21 where its corpus bundle saves real effort. Downloaded corpora stay out of git; scripts + outputs go in.
2. Scripts emit JSON statistics with provenance: corpus name and version/date, script name, n items processed, extraction parameters.
3. Distilled tables land in the relevant wiki pages (a chord-transition table in [harmony](harmony.md), phrase-length norms in [phrase-structure](phrase-structure.md), deviation magnitudes in [expressive-performance](expressive-performance.md)), each labeled with its provenance line. The wiki is the interface: engines and future sessions cite wiki tables, not raw corpora.
4. Each extraction is logged as an `ingest` in log.md, so tables are regenerable and auditable.

## Implications for generative engines

1. Engines never bundle corpus data — they hard-code small derived tables (a 12×12 pitch-class transition matrix, a phrase-length histogram, a cadence-formula list) with a comment citing the wiki page the table came from.
2. Highest-value first extractions: (a) Essen phrase-length + interval + rhythm distributions; (b) Bach chorale chord-transition and cadence tables; (c) Hooktheory pop progression table; (d) MAESTRO timing/velocity deviation profiles. Each unblocks a different page's "numbers wanted" gaps.
3. Reference distributions feed the metric layer: style-fit = distance between the engine's feature distributions and the chosen corpus band — so extract corpus features with the *same code* the metrics harness uses, or the comparison is subtly broken.
4. Match reference to target: scoring an ambient piece against chorale voice-leading norms is a category error; pick the closest corpus per engine and say so in the engine's docs.
5. Exploit Essen's phrase marks — human-labeled phrase segmentation at scale is otherwise almost unobtainable.
6. Every shipped table carries provenance (corpus, date, script, n); future sessions must be able to regenerate or distrust it.

## Open questions

- Pure-JS parsers vs a small dev-time Python/music21 dependency? Leaning JS-only for EsAC/ABC/kern, Python only if MusicXML-heavy sources become necessary — undecided.
- Hooktheory access: what the API/terms currently permit for statistical extraction needs checking before extraction (research derivatives like HLSD may be the cleaner path).
- Ambient/electronic idioms have no real symbolic corpus. Options: audio analysis, manual annotation of exemplars, or accepting that genre norms there come from practitioner literature ([ambient-and-generative-genre](ambient-and-generative-genre.md)) rather than statistics — unresolved.
- How large must a reference set be per statistic before the band is stable? (Rule-of-thumb answer wanted from the first extraction experiments.)

## Related pages

- [computational-music-metrics](computational-music-metrics.md) — consumer of reference distributions
- [expressive-performance](expressive-performance.md) — consumer of MAESTRO-style deviation profiles
- [markov-and-statistical-models](markov-and-statistical-models.md) — generation from corpus statistics
- [machine-learning-music](machine-learning-music.md) — the training-data road not (mostly) taken
- [harmony](harmony.md), [phrase-structure](phrase-structure.md), [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md), [melody](melody.md), [rhythm-and-meter](rhythm-and-meter.md) — destination pages for distilled tables
- [style-and-genre-overview](style-and-genre-overview.md) — matching references to targets

## Sources

- music21 corpus reference (collections and counts). https://www.music21.org/music21docs/about/referenceCorpus.html
- MAESTRO dataset (Magenta): ~200 h, 1,276 performances, ~3 ms alignment, CC BY-NC-SA 4.0. https://magenta.withgoogle.com/datasets/maestro
- Raffel, C. The Lakh MIDI Dataset: 176,581 files, 45,129 matched; caveats and licensing. https://colinraffel.com/projects/lmd/
- The Session data dumps (Irish traditional tunes, weekly exports). https://github.com/adactio/TheSession-data
- Essen Folksong Collection / EsAC home (Schaffrath; collection description). http://www.esac-data.org/ — size and composition figures cross-checked against the folk-song classification study arXiv:1904.11074. https://arxiv.org/pdf/1904.11074
- Donahue, C. et al. "Melody transcription via generative pre-training" (HookTheory dataset: ~22k segments, ~13k songs, functional encoding). arXiv:2212.01884. https://arxiv.org/pdf/2212.01884
- "Automatic Melody Harmonization with Triad Chords: A Comparative Study" (HLSD: 11,329 lead sheets from TheoryTab). arXiv:2001.02360. https://arxiv.org/pdf/2001.02360
- KernScores / CCARH Humdrum collections. https://kern.humdrum.org/ (site intermittently unreachable during research 2026-07-06; contents cross-checked via the music21 corpus docs above)
