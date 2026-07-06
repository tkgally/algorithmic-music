---
title: Computational music metrics
tags: [evaluation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Symbolic and in-browser audio metrics for scoring engine output automatically — feature sets, reference-distribution comparisons, tension-curve checks, and why metrics are diagnostics, not objectives.
---

# Computational music metrics

Human listening is slow and scarce ([listening-tests-and-feedback](listening-tests-and-feedback.md)); metrics are the fast, free half of this project's evaluation signal. An engine's note data is fully available to it, and its audio can be rendered and measured headlessly, so every engine version can be scored automatically across many seeds before a human hears anything. The role of these numbers is fixed up front: they are regression tests and anomaly detectors that catch broken or drifting output — not objectives to optimize, because a generator tuned to satisfy metrics produces metric-shaped music (Goodhart's law, flagged explicitly in the generative-music evaluation survey: "When a measure becomes a target, it ceases to be a good measure").

## Symbolic metrics (from the engine's own note data)

The de facto baseline feature set is Yang & Lerch (2020) and their mgeval toolkit, which computes per-piece features and then compares *distributions* of features between a generated set and a reference set. Their key finding motivates the whole exercise: generative models often fail to match even low-level property distributions like pitch range and pitch count, and such failures are detectable without listening.

### Pitch and harmony

- Pitch count, pitch range (semitones), average pitch interval; pitch-class histogram and its entropy; 12×12 pitch-class transition matrix (all in mgeval).
- Distribution distance to a style reference: Yang & Lerch compare intra-set vs inter-set feature distributions using Kullback-Leibler divergence and overlapped area of smoothed histograms. Reference distributions come from human corpora — see [corpus-analysis](corpus-analysis.md).
- Scale consistency / in-key ratio; chord-tone vs non-chord-tone ratio and windowed dissonance level (survey feature tables) — cheap tonality sanity checks; see [harmony](harmony.md).
- Interval distribution and melodic contour statistics (step/leap ratio, direction changes per phrase, registral span of phrases) — see [melody](melody.md).

### Rhythm

- Note-length histogram and note-length transition matrix; average and distribution of inter-onset intervals (mgeval).
- Onset-position histogram within the bar, and syncopation scores computed from it — see [rhythm-and-meter](rhythm-and-meter.md) for candidate syncopation measures.

### Repetition and form

- Self-similarity matrix (SSM) over windowed pitch/rhythm features — Foote's technique, originally for audio, works directly on symbolic feature sequences; blocks show sections, diagonals show recurring material, and Foote's novelty kernel along the diagonal proposes section boundaries. Render the SSM as an image per piece: it is the fastest human-readable diagnosis of "does this piece have any form at all" ([form-and-structure](form-and-structure.md)).
- Compression-based repetition scalar: compression ratio of the serialized note-event string (e.g., gzip). Near-incompressible = no repetition; extremely compressible = loops. Crude but robust and dependency-free.
- Motif recurrence rate: fraction of melodic n-grams (n = 3–6, intervals + rhythm classes) that occur ≥2 times — a direct check on whether the engine reuses material ([repetition-and-familiarity](repetition-and-familiarity.md)).
- Honest caveat from the survey: there are no accepted metrics for long-range form; SSM eyeballing plus the crude scalars above is the current honest toolkit.

### Tension curve extraction

Engines in this project are expected to *plan* a tension trajectory ([tension-and-release](tension-and-release.md)); metrics verify it happened. Extract per-window time series of: dissonance/roughness proxy, registral centroid, note density, dynamic level — then correlate the composite against the intended curve. For tonal tension specifically, Herremans & Chew's spiral-array model gives three computable quantities — cloud diameter (tonal spread of simultaneous notes), cloud momentum (movement between windows), and tensile strain (distance from the key's center) — used inside their MorpheuS system to generate music matching a target tension shape; the same math works as a *measurement*.

### Cadences and voice leading

- Cadence detection: match phrase endings against cadence formula tables derived from corpora (scale-degree patterns, bass motion, rhythmic close) — catches "pieces that just stop" rather than end; see [phrase-structure](phrase-structure.md).
- Voice-leading smoothness: mean semitone motion per voice between adjacent chords, counts of parallel fifths/octaves and voice crossings where style forbids them — see [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md).

## Audio metrics (computable in-browser)

Everything below is computable with Web Audio primitives (AnalyserNode, or raw samples from OfflineAudioContext / a ScriptProcessor-style tap) or a small hand-rolled FFT — no server, no Python. The in-repo precedent is `previous-experiments/20260705_studio-prototypes/tools/verify.mjs` (reference only, do not modify): it loads a prototype in headless Chromium via Playwright, presses Play through a `window.__studio = { ctx, tap }` hook, records ~25 s, and reports:

- `rmsDb` — mean loudness (dBFS); `peak` — clipping check
- `levelSpreadDb` — p95−p5 of 1-second loudness windows (pumping/jumpiness)
- `centroidHz`, `pctAbove2k`, `pctAbove5k` — where spectral energy sits (harshness/dullness)
- `onsetsPerMin` / `softOnsetsPerMin` — energy jumps over a trailing median with a 180 ms refractory (pluckiness/activity)
- `silenceGapSec` — longest near-silent gap (music must not vanish)
- context state, elapsed audio time, console errors — "is it actually running" sanity

Worth adding on the same skeleton: spectral flux (frame-to-frame spectral change; timbral stasis detector), crest factor (peak/RMS; over-compression or spikiness), stereo width, and a loudness measure approximating LUFS per ITU-R BS.1770 — its K-weighting is one high-shelf plus one high-pass biquad followed by mean-square over 400 ms gated blocks, all implementable in a few dozen lines on raw rendered samples. OfflineAudioContext renders faster than real time, so a 10-minute piece can be measured in seconds in CI ([web-audio-fundamentals](web-audio-fundamentals.md), [audio-worklets-and-performance](audio-worklets-and-performance.md)).

Embedding-based distribution metrics (Fréchet Audio Distance, MMD, CLAP-similarity) are the current academic standard for audio generators; a 2025 benchmark found FAD over music-trained CLAP embeddings correlated best with human preference among objective metrics. They need model inference and reference audio sets — not browser-feasible and not worth the complexity at this project's scale; noted here so future sessions don't rediscover them.

## Using metrics: bands, regressions, anomalies

- Acceptance bands, not scores: for each metric define a plausible range per engine/genre (e.g., `silenceGapSec` = 0 unless silence is intended; `levelSpreadDb` within a band appropriate for ambient vs dance — see [style-and-genre-overview](style-and-genre-overview.md)). Out-of-band = investigate, not auto-fail.
- Regression testing: store metric JSON per (seed, version); compare each new version's distribution over ≥5 seeds against the previous version's. A metric that moved when the change should not have touched it is a bug signal.
- Calibration: reference bands come from two places — human-corpus statistics ([corpus-analysis](corpus-analysis.md)) and metric values of renders the panel rated well ([listening-tests-and-feedback](listening-tests-and-feedback.md)). Expect per-style recalibration; the survey stresses most symbolic metrics are style-specific.
- The MIREX tradition (community MIR evaluations since 2005) is the precedent for task-defined, dataset-defined comparison — the lesson to import is *fixed task definitions and fixed data*, i.e., frozen seed lists per comparison.

## Caveats

- Goodhart risk is the big one: never use these metrics as fitness functions inside generation without a human gate; optimization finds the metric's blind spots.
- Metrics do not hear gestalt: a piece can pass every band and be dull. The converse use is safe: a piece that *fails* bands is almost always broken.
- Feature-space dependence: distances are only as perceptually relevant as the features (survey's warning about embedding choice applies to hand features too).
- Long-range structure remains essentially unmeasured by scalars; keep the SSM image in the loop.

## Implications for generative engines

1. Every engine ships with a metrics harness from day one: symbolic metrics computed from its own note data (they are nearly free — the engine already has the events) plus audio metrics via the verify.mjs pattern (`window.__studio = { ctx, tap }` hook, headless render).
2. Minimum symbolic set: pitch-class histogram + entropy, pitch range, interval distribution, IOI/note-length histograms, onset-position histogram, motif recurrence rate, compression ratio, SSM image. Minimum audio set: rmsDb, peak, levelSpreadDb, centroidHz, onsetsPerMin, silenceGapSec, spectral flux, BS.1770-style loudness.
3. Hard gates per render: audio context running for the full duration, zero console errors, no unintended silence gap >2 s, no clipping (peak < 1.0), rmsDb within the engine's target band.
4. Soft diagnostics compared as distributions over ≥5 seeds against (a) the previous engine version and (b) a corpus reference band via KL divergence / overlapped area.
5. Engines emit their intended tension curve as data; the harness extracts the realized curve and reports the correlation — flag pieces where planned and realized trajectories disagree badly (threshold to be calibrated; informed speculation until panel data exists).
6. Save the SSM image with every evaluated render; a human glance at it is the cheapest form check available.
7. Do not optimize generation parameters against any metric automatically; metric movement is a hypothesis for the improvement loop, confirmed only by listening ([improvement-loop](improvement-loop.md)).

## Open questions

- Which of these metrics actually correlate with this panel's preferences? Measurable once a few dozen rated renders exist — do that analysis and record it in a findings page.
- A style-robust, browser-cheap cadence detector is unsolved here; corpus-derived ending templates are the first thing to try.
- Is there a usable scalar for "goes somewhere over 10 minutes"? Candidates: novelty-curve statistics from the SSM, long-lag autocorrelation of feature series — untested.

## Related pages

- [corpus-analysis](corpus-analysis.md) — where reference distributions come from
- [evaluation-challenges](evaluation-challenges.md) — why metrics can't be objectives
- [listening-tests-and-feedback](listening-tests-and-feedback.md) — the human signal metrics are calibrated against
- [tension-and-release](tension-and-release.md), [form-and-structure](form-and-structure.md), [repetition-and-familiarity](repetition-and-familiarity.md) — what the structural metrics try to capture
- [melody](melody.md), [harmony](harmony.md), [rhythm-and-meter](rhythm-and-meter.md), [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) — per-domain background
- [web-audio-fundamentals](web-audio-fundamentals.md), [engine-architecture](engine-architecture.md), [improvement-loop](improvement-loop.md) — where the harness lives

## Sources

- Yang, L.-C. & Lerch, A. "On the evaluation of generative models in music." Neural Computing and Applications 32, 2020. https://link.springer.com/article/10.1007/s00521-018-3849-7
- mgeval toolkit (Yang & Lerch's feature implementation). https://github.com/RichardYang40148/mgeval
- "Survey on the Evaluation of Generative Models in Music." arXiv:2506.05104, 2025 (feature tables, FAD caveats, Goodhart warning, missing form metrics). https://arxiv.org/abs/2506.05104
- Foote, J. "Visualizing Music and Audio using Self-Similarity." ACM Multimedia, 1999; summarized with the novelty-kernel method in arXiv:2309.02243. https://arxiv.org/pdf/2309.02243
- Herremans, D. & Chew, E. "MorpheuS: generating structured music with constrained patterns and tension" (spiral-array tension: cloud diameter, cloud momentum, tensile strain). arXiv:1812.04832. https://arxiv.org/pdf/1812.04832
- ITU-R Recommendation BS.1770-5, "Algorithms to measure audio programme loudness and true-peak audio level," 2023. https://www.itu.int/rec/R-REC-BS.1770/en
- "Benchmarking Music Generation Models and Metrics via Human Preference Studies." arXiv:2506.19085, 2025 (metric-vs-preference correlations). https://arxiv.org/html/2506.19085
- MIREX (Music Information Retrieval Evaluation eXchange). https://www.music-ir.org/mirex/wiki/MIREX_HOME
- In-repo precedent: `/home/user/algorithmic-music/previous-experiments/20260705_studio-prototypes/tools/verify.mjs` (headless Chromium render + audio measurements; read 2026-07-06).
