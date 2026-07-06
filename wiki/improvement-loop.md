---
title: The improvement loop
tags: [project, evaluation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: The project's process for turning wiki knowledge, metrics, and human feedback into measurably better music, session after session.
---

# The improvement loop

The previous experiments plateaued because each was built once and abandoned — no instrumentation, no feedback capture, no iteration ([previous-experiments-lessons](previous-experiments-lessons.md)). This page defines the loop that replaces that: how hypotheses become engine changes, how changes get evaluated, and how findings flow back into the wiki so the next engine starts smarter. It is the project's central process page; the [roadmap](project-roadmap.md) says *when* each part activates.

## The loop

```
wiki knowledge ──► hypotheses ──► engine build/change (versioned)
     ▲                                      │
     │                            self-evaluation gate
     │                          (symbolic + acoustic metrics)
     │                                      │
findings pages ◄── analysis ◄── human feedback (Tom + evaluators, via Pages site)
```

1. **Hypothesize.** Every engine or change states, in its design notes: which [failure modes](generative-music-failure-modes.md) it targets, which [design patterns](generative-music-design-patterns.md) it applies, which wiki pages justify the approach, and what observable difference is expected. No untraceable tweaking.
2. **Build versioned.** Changes land as a new engine version; old versions stay playable (same seed → A/B comparison — see [engine-architecture](engine-architecture.md)).
3. **Self-evaluate before humans hear it.** Run the metric suite ([computational-music-metrics](computational-music-metrics.md)) on score dumps and offline renders: regression tests on solved problems (loudness, spectra, onset behavior — the verify.mjs inheritance) plus the musical diagnostics (cadence presence, motif recurrence, tension-curve fit, density variance). Claude cannot hear; metrics and structural self-reports are Claude's ears between human feedback rounds, within their known limits (they detect absences and anomalies, not quality).
4. **Collect human feedback.** Structured, piece-anchored, low-friction (see [listening-tests-and-feedback](listening-tests-and-feedback.md)): every feedback datum records `(engine, version, seed, params, timestamp)` plus ratings and free text. Tom's feedback is the primary signal early; other evaluators join via the public site. Pairwise A/B between versions with identical seeds is the most sensitive instrument available — prefer it.
5. **Analyze and file findings.** Each feedback round or experiment gets a findings page (`findings-YYYY-MM-DD-<topic>.md`, tags `[findings]`): what was tested, against which hypothesis, what was observed, what changes. General pages get updated to cite the finding (e.g., if phrase-final lengthening measurably helps, [expressive-performance](expressive-performance.md) gains a "confirmed in this project" note). This is the compounding step — do not skip it.
6. **Repeat.** The next hypothesis comes from the updated wiki.

## Feedback taxonomy

Tag human feedback with the failure-mode vocabulary (FM1 aimlessness, FM3 nothing-to-remember, …) plus free observations. Over time this yields a frequency table of what actually bothers listeners — which prioritizes the next round better than intuition.

## Analysis of human-composed music

The loop's third input (besides metrics and feedback) is reference analysis: statistics extracted from human corpora ([corpus-analysis](corpus-analysis.md)) at development time — interval distributions, phrase lengths, cadence formulas, performance timing profiles. These become style-pack data and metric baselines ("is this engine's pitch-class entropy inside the corpus range for the style?"). Corpus work happens in dev-time scripts (Node, in-repo), never at engine runtime; distilled tables are recorded in wiki pages so they are citable and correctable.

## Session discipline

- An experiment without a logged finding did not happen. Findings pages are cheap; lost knowledge is not.
- Negative results are findings — "X didn't audibly help" prevents re-trying X for the fourth time in six months.
- When human feedback contradicts a wiki page's expectation, update the page: record both the general claim and the project's contrary experience. Contradictions are the most valuable entries in the whole system ([conventions](conventions.md)).

## Implications for generative engines

- Engines must be built instrumented (score dump, self-report, offline render, A/B hooks) from the first commit — retrofitting instrumentation is what made previous experiments unimprovable.
- Prefer few, well-hypothesized changes per version over many simultaneous tweaks; otherwise feedback cannot attribute improvement.
- Keep a stable seed set for regression listening ("the Tuesday seeds"), so versions are compared on identical material.

## Open questions

- Feedback transport under the no-server constraint: GitHub Issues API? a Google Form per engine? mailto? — needs Tom's preference ([project-open-questions](project-open-questions.md)).
- How to weight Tom's feedback vs other evaluators' if they disagree (proposal: Tom is the tie-breaker and taste-owner; others map the disagreement space).
- Whether/how Claude can "listen" better: feature-based descriptions of renders are planned; genuine audio understanding may become available to future models — revisit periodically.

## Related pages

- [project-roadmap](project-roadmap.md) · [listening-tests-and-feedback](listening-tests-and-feedback.md) · [computational-music-metrics](computational-music-metrics.md) · [corpus-analysis](corpus-analysis.md)
- [generative-music-failure-modes](generative-music-failure-modes.md) — the shared feedback vocabulary
- [engine-architecture](engine-architecture.md) — the instrumentation this loop assumes

## Sources

- Process design original to this project, motivated by the plateau documented in [previous-experiments-lessons](previous-experiments-lessons.md); evaluation methodology grounded in the sources cited by [listening-tests-and-feedback](listening-tests-and-feedback.md) and [evaluation-challenges](evaluation-challenges.md).
