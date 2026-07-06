---
title: Listening tests and feedback
tags: [evaluation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Methods for collecting human judgments of generated music — MUSHRA, ABX, pairwise preference with Bradley-Terry, rating scales, continuous response, implicit signals — sized for this project's tiny volunteer panel.
---

# Listening tests and feedback

Human listening is the ground truth this project's metrics get calibrated against, and it will be collected from a very small panel: for now **just the project owner**, later **a handful** of volunteers (Tom will consult Claude before any switch to large-scale evaluation). Collection uses no server: each public page carries an on-page form, and on Save the page **downloads a JSON file** of the responses, which Tom hands back to Claude for analysis (decided 2026-07-06 — [project-open-questions](project-open-questions.md)). This page surveys the standard listening-test methodologies, says when each fits, and then commits to concrete designs that work at n<10 — where most textbook advice quietly assumes n>30. The framing problems (exposure effects, demand characteristics, short-clip bias) live in [evaluation-challenges](evaluation-challenges.md); this page is about instruments.

## What the data must do

Three requirements, in order: *sensitive* (detect that engine v(n+1) beats v(n) even when the difference is modest), *diagnostic* (say what is wrong, not just how much), and *repeatable* (the same piece can be regenerated from its seed and re-judged later). Every design choice below serves one of these.

## The formal methodologies

### MUSHRA (ITU-R BS.1534)

MUSHRA ("MUltiple Stimuli with Hidden Reference and Anchor," ITU-R BS.1534-3, 2015) presents 3–12 stimuli per trial for rating on a 0–100 scale, including a declared reference, a hidden copy of that reference, and low/high-quality anchors; hidden-reference and anchor ratings are used to post-screen unreliable assessors. It is the standard for intermediate-quality audio comparisons (codecs, source separation) and assumes experienced listeners and — critically — a known-good reference signal. Generated compositions have no reference, and recent work on generative speech ("Rethinking MUSHRA") shows the method penalizes systems that differ from or exceed the reference (reference-matching bias) and suffers judgment ambiguity without fine-grained guidelines. Verdict for this project: appropriate only for *rendering* questions where a reference exists (e.g., comparing synthesis/mixing variants of the same score); wrong tool for "is this composition better." If ever needed, webMUSHRA is a browser-based, BS.1534-compliant implementation.

### ABX / 2AFC discrimination

ABX asks whether X is A or B; two-alternative forced choice asks which of two stimuli has more of some property. These detect *audibility of a difference*, not preference. Cheap and useful as a gate: if nobody can tell a change was made (e.g., a subtle humanization tweak), don't spend panel goodwill on preference testing it. Chance performance is 50%, so even informal use needs ~10+ trials per listener for any confidence.

### Pairwise preference with Bradley-Terry or Elo — the workhorse here

Comparative judgments are easier and more consistent than absolute ratings, and they neutralize each rater's personal scale. The Bradley-Terry model turns a pile of binary outcomes into strength scores: P(i beats j) = p_i/(p_i + p_j), fit by maximum likelihood; Elo is its incremental cousin (update ratings after each comparison), convenient when versions arrive continuously. This is now standard in generative-model evaluation — a 2025 benchmark fit Bradley-Terry strengths to 15,600 pairwise comparisons from ~2,500 raters — but note that study compared 10-second clips; this project pairs *long excerpts or whole listening sessions* instead, because its failures are long-form ([evaluation-challenges](evaluation-challenges.md)).

Fit to this project: comparisons accumulate across listeners and sessions into one ranking; a new engine version needs only a handful of comparisons against recent versions to place it; ties and "both bad" can be recorded as half-wins or skipped. This is the primary instrument for the question "did we improve?"

### Rating scales (Likert, semantic differential)

Fast and fine for tracking absolute-ish level over time, but afflicted by central-tendency bias (raters avoid endpoints), acquiescence, anchoring on whatever was heard first, and drift of internal standards across sessions. Mitigations: 7-point scales with *every point labeled*, never change the wording once adopted (comparability across months matters more than perfect wording), and interpret within-listener changes, not absolute levels. The generative-music evaluation survey notes there is no standardized practice here and criteria definitions vary wildly between studies — so this wiki's definitions ([evaluation-challenges](evaluation-challenges.md)) are the fixed local standard.

### Continuous response

Real-time sliders capture how judgment evolves during a piece — Farbood's musical-tension studies had listeners move a slider sampled at 10 Hz while listening, yielding tension curves that can be averaged across listeners and compared to model predictions. For this project: the engine plans a tension trajectory ([tension-and-release](tension-and-release.md)); 2–3 volunteers with a browser slider give a coarse empirical curve to compare against the intended one and against the extracted metric curve ([computational-music-metrics](computational-music-metrics.md)). High effort per listener; reserve for structure experiments, not routine version tests.

### Ecological and diary methods

For background music, the most valid question is behavioral: did the listener leave it on? Industry treats skips as strong implicit negative feedback — Spotify's published skip-prediction dataset (160M listening sessions) exists precisely because skip behavior encodes preference. The project-scale equivalents: played-to-end rate, median listen duration before stopping, voluntary replays, and a diary-style prompt ("did you leave it on while working? for how long?"). Noisy, confounded (interruptions, forgotten tabs), but ecologically honest in a way lab-style ratings are not — see [attention-and-background-listening](attention-and-background-listening.md).

## Designing for n<10

What a panel of Tom plus a few volunteers cannot do: estimate population preferences, support subgroup claims, or produce meaningful p-values. What it can do, if designed for:

- Within-subject everything. Each listener compares versions directly (same seed rendered by v(n) and v(n+1) where score-compatible, or matched fresh seeds otherwise); each listener is their own baseline.
- Repeated sessions over time. Ten judgments each from five listeners across three weeks beat fifty one-shot judgments — and reveal exposure drift instead of being silently corrupted by it.
- Consistency over significance. Report direction and agreement ("4 of 5 listeners preferred v13 in 7+ of 10 pairs") rather than p-values; with n<10, effect consistency *is* the statistic.
- Reliability tracking. Repeat one hidden pair per session (same two stimuli, re-randomized order); a listener's agreement with their own past judgment measures test-retest reliability and how much to weight them — the same spirit as MUSHRA's hidden-reference post-screening.
- Seeded reproducibility. Because pieces regenerate exactly from (seed, version, params), disagreements can be re-examined on identical stimuli months later — a luxury most listening research lacks.

## Questionnaire design

Per piece, answerable in under a minute: 2–3 ratings (rotating from the criteria set: pleasantness, interestingness, coherence, style-fit — each with its one-sentence definition printed on the form), one binary "would you keep listening?", and one free-text box. Pitfalls to avoid:

- Leading questions ("How much did you enjoy the improved harmony?") and revealing what changed between versions — both invite demand effects.
- Asking too much per piece: fatigue degrades everything after it.
- Under-using free text: recurring complaints ("drums feel stiff," "it never goes anywhere") are the most diagnostic data the panel produces, and each recurring complaint category is a candidate for a new computational metric.

Explicitly invite negatives: "What annoyed you most?" outperforms "Any comments?"

## Web implementation notes

- Each piece page on the GitHub Pages site embeds the player and the form. Every submission logs: seed, engine version (git hash), parameter set, how long the piece had been playing at submit time, timestamp, and an optional stable pseudonym.
- No server and no external form service (decided 2026-07-06): the page accumulates responses in memory and, on Save, serializes them to a JSON file the listener downloads (a `Blob` + object-URL download — trivial and fully offline-capable). Tom hands those JSON files back to Claude, and they are archived in-repo (e.g., a `feedback/` data folder) so findings pages can cite them. This keeps collection GitHub-account-free and works even from `file://`; if testing later opens to the public or goes large-scale, revisit the transport then.
- Randomize A/B presentation order client-side and log the assignment; blind labels ("Piece 1 / Piece 2"), never version numbers.
- Log implicit signals where trivial: play, pause, seek, stop times.
- webMUSHRA (github.com/audiolabs/webMUSHRA) is the reference implementation to borrow UI patterns from, even though full MUSHRA is rarely the right test here.

## Ethics and consent basics

While Tom is the only respondent this is moot; it applies the moment collection opens to volunteers. Low-risk research, but public collection still owes participants clarity: state on the site what is collected (ratings, free text, playback telemetry, pseudonym; no emails, no tracking beyond the form), what it is for (improving the engines), and where it goes (the downloaded JSON is handed to the maintainer and archived in a public repo — say this explicitly, since volunteers' free text becomes public data); participation is voluntary and can stop anytime; no deception — the site says plainly that the music is computer-generated by Claude (which also sidesteps the Turing-test framing problems). The internet-research ethics literature's core warning applies even at this scale: platform terms-of-service and casual participation are not informed consent — a visible, plain-language note is the minimum. Anonymize or drop anything personally identifying before archiving.

## Implications for generative engines

1. Engines must regenerate pieces bit-identically from (seed, version, params); pairwise testing and re-judgment depend on it.
2. Ship the feedback form with the player from the first public engine; logging seed/version/params/listen-duration with every response is non-negotiable.
3. Default instrument: paired A/B preference ("which would you keep on?") + 2–3 anchored 7-point ratings + free text; aggregate preferences with Bradley-Terry refit after each batch, and treat scale data as secondary corroboration.
4. Gate subtle changes through informal ABX before spending panel time: inaudible changes get metrics-only evaluation.
5. Support "session mode" evaluation: a 10–15 minute continuous render with a single end-of-session form, since short-clip A/B misses long-form failures.
6. Include one repeated hidden pair per session for reliability tracking; weight or flag listeners whose self-agreement is near chance.
7. Instrument the public player for implicit signals (played-to-end, stop time); review monthly as a drift check on the explicit ratings.
8. Keep per-session load ≤ ~25 minutes of listening; schedule repeat sessions days apart.

## Open questions

- The JSON feedback file's exact schema, and the right granularity for export (per-piece, per-session, or per-batch) before Tom hands a file back — settle this at the first engine build.
- Do volunteer ratings and the owner's ratings diverge systematically? Track from the start; the answer changes whose signal gates releases.
- At what version-churn rate does Elo/Bradley-Terry get too sparse (many versions, few comparisons each), and should versions be pooled into "eras" for ranking?

## Related pages

- [evaluation-challenges](evaluation-challenges.md) — why these designs and not textbook ones
- [computational-music-metrics](computational-music-metrics.md) — the automatic signal these judgments calibrate
- [improvement-loop](improvement-loop.md) — how feedback feeds engine iteration
- [tension-and-release](tension-and-release.md) — the theory behind continuous tension response
- [attention-and-background-listening](attention-and-background-listening.md) — why ecological signals matter for this use case
- [what-makes-music-good](what-makes-music-good.md) — the criteria being rated

## Sources

- ITU-R Recommendation BS.1534-3, "Method for the subjective assessment of intermediate quality level of audio systems," 2015. https://www.itu.int/rec/R-REC-BS.1534/en
- "Rethinking MUSHRA: Addressing Modern Challenges in Text-to-Speech Evaluation." arXiv:2411.12719, 2024. https://arxiv.org/abs/2411.12719
- Schoeffler, M. et al. "webMUSHRA — A Comprehensive Framework for Web-based Listening Tests." Journal of Open Research Software 6(1), 2018; software repository. https://github.com/audiolabs/webMUSHRA
- "Bradley-Terry model." Wikipedia. https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model
- "Optimal Pairwise Comparison Procedures for Subjective Evaluation." arXiv:2508.17840, 2025. https://arxiv.org/html/2508.17840v1
- "Benchmarking Music Generation Models and Metrics via Human Preference Studies." arXiv:2506.19085, 2025 (15,600 pairwise comparisons, Bradley-Terry aggregation). https://arxiv.org/html/2506.19085
- Farbood, M. "A Parametric, Temporal Model of Musical Tension." Music Perception 29(4), 2012. https://mp.ucpress.edu/content/29/4/387
- NYU Center for Data Science, "Using Data Science to Understand Music Cognition" (Farbood's slider method, 10 Hz sampling). https://medium.com/center-for-data-science/using-data-science-to-understand-music-cognition-fcef00020a5f
- Brost, B., Mehrotra, R., Jehan, T. "The Music Streaming Sessions Dataset." arXiv:1901.09851, 2019. https://arxiv.org/pdf/1901.09851
- "Survey on the Evaluation of Generative Models in Music." arXiv:2506.05104, 2025 (lack of standardized subjective practice). https://arxiv.org/abs/2506.05104
- "Human participants in AI research: Ethics and transparency in practice." arXiv:2311.01254 (consent in online studies; ToS is not consent). https://arxiv.org/pdf/2311.01254
