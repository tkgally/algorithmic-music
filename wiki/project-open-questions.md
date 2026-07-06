---
title: Open questions
tags: [project]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Decisions awaiting Tom, plus open research questions for future sessions — the project's asynchronous question channel.
---

# Open questions

Two lists. **Questions for Tom** are decisions only the project owner can make; Tom can answer by editing this page directly, by leaving a note anywhere in the repo, or in a session prompt — any session that finds an answer moves the item to "Answered" with the date and propagates the decision to the affected pages. **Research questions** are for future Claude sessions to resolve through work.

## Questions for Tom

1. **Dependency policy.** The working assumption is strictly vanilla JS — no libraries at all, engines runnable from `file://`. Is that a hard rule, or are tiny, vendored, permissively-licensed helpers acceptable if ever genuinely needed? (Current sessions assume: hard rule.)
2. **License.** The repo has no LICENSE file. The wiki (prose) and the engines (code) could be licensed differently (e.g., CC BY for wiki, MIT for code). Public GitHub Pages deployment makes this worth settling before Phase 2. Any preference?
3. **Feedback transport.** For collecting listening feedback on the public site with no server: (a) GitHub Issues (public, needs GitHub account), (b) a Google Form embedded/linked per engine (anonymous, easy, but external service), (c) mailto links (frictionful), (d) something else? Preference matters before Phase 2.
4. **Genre priorities.** When engine-building starts, which 3–5 styles should the first engines commit to? Current shortlist (deliberately contrasting): tonal-classical phrase engine, gamelan-architecture engine, ambient/process engine, groove/lo-fi engine, adaptive-interactive engine. Reorder or replace freely.
5. **Daily site mechanism.** The Phase 4 daily-updated summary site needs a trigger: scheduled Claude sessions (needs a standing schedule set up from a session) or GitHub Actions (needs Tom to be comfortable with a workflow file and Pages rebuilds). Any preference? Also: how public should the site be about being Claude-built?
6. **Evaluator pool.** Roughly how many people (besides Tom) are likely to give feedback in early rounds, and are any of them trained musicians? This changes listening-test design ([listening-tests-and-feedback](listening-tests-and-feedback.md)).
7. **Japanese-language coverage.** Tom works between English and Japanese. Should the wiki draw on Japanese-language sources (music theory, aesthetics — e.g., primary material on gagaku, ma, jo-ha-kyū), and should the public site ever be bilingual?
8. **Session budget guidance.** Sessions currently self-pace (one substantial merge per session). Any constraints on session length/frequency/cost the sessions should respect?

## Answered

*(none yet)*

## Research questions for future sessions

- **R1. Phrase-first melody generation**: concretely, what algorithm produces melodies with audible antecedent–consequent structure? Candidate: generate cadence + goal tones first, elaborate backward (see [grammars-and-rewriting-systems](grammars-and-rewriting-systems.md)); needs a worked design before Phase 2.
- **R2. Harmony with goals**: pick and specify one mechanism (grammar vs constraint-solved progression toward planned cadences) with a JS-feasible search budget.
- **R3. Expressive-performance rule table**: ~~extract the KTH rules with actual magnitudes into an implementable table~~ — done in session 001: [expressive-performance](expressive-performance.md) contains a 14-row rule-to-parameter table with confidence labels. Remaining: validate the magnitudes on synthesized timbres once a testbed exists.
- **R4. Cadence detector + motif-recurrence metric**: specify both precisely enough to implement; they gate the self-evaluation loop.
- **R5. Corpus shortlist**: which corpora are license-safe and stylistically right for the launch genres; write the extraction plan ([corpus-analysis](corpus-analysis.md)).
- **R6. Endings**: survey how pieces in each launch style actually end; engines must be able to *finish* a piece, which no previous experiment could do.
- **R7. Seeds & variation UX**: how should "today's piece" / "new piece" / "replay this piece" work for listeners (daily seed idea vs freshness — interacts with [repetition-and-familiarity](repetition-and-familiarity.md)).
- **R8. Claude's hearing**: what is the best current way for sessions to "perceive" a render (feature summaries, structural self-reports, spectrogram images?) — revisit as models gain audio input.

## Related pages

- [project-mission](project-mission.md) · [project-roadmap](project-roadmap.md) · [improvement-loop](improvement-loop.md)
