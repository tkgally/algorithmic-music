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

*No open decisions awaiting Tom right now — all eight bootstrap questions were answered on 2026-07-06 (below). When a new decision arises that only the project owner can make, add it here, record the session's working assumption, and proceed without blocking.*

## Answered

Tom answered all eight bootstrap questions on **2026-07-06** (session 002). Each entry states the decision and where it was propagated.

1. **Dependency policy** *(answered 2026-07-06)*. Strictly vanilla JS is **preferred**, but tiny, vendored, permissively-licensed helpers are **acceptable if ever genuinely needed**. So the default remains dependency-free (engines runnable from `file://`, no build step, no runtime network), but it is a strong default, not an absolute prohibition; a genuine need may be met with a small, permissively-licensed helper *copied into* the repo (vendored, not fetched at runtime). → Propagated to [project-mission](project-mission.md), [engine-architecture](engine-architecture.md), [javascript-music-libraries](javascript-music-libraries.md), `CLAUDE.md`, `README.md`.
2. **License** *(answered 2026-07-06)*. **Public domain for the wiki** (all prose/docs), **MIT for code** (engines, tools, scripts). Implemented as `LICENSE` (MIT) and `LICENSE-wiki` (CC0 1.0 public-domain dedication) at the repo root. → Propagated to `LICENSE`, `LICENSE-wiki`, `README.md`, [project-roadmap](project-roadmap.md), [conventions](conventions.md).
3. **Feedback transport** *(answered 2026-07-06)*. **A self-contained form on each web page**: Tom enters his answers, presses Save, and the page **downloads a JSON file** of the results; he then hands those JSON files to Claude. Some friction is accepted because, for now, Tom is the only respondent. If testing goes public or large-scale later, revisit the transport. No server, no external form service, no GitHub account required. → Propagated to [listening-tests-and-feedback](listening-tests-and-feedback.md), [improvement-loop](improvement-loop.md), [engine-architecture](engine-architecture.md), [project-roadmap](project-roadmap.md).
4. **Genre priorities** *(answered 2026-07-06)*. Replace the gamelan-architecture engine with an **Indian-classical-and-pop engine** — Tom may have a collaborator in India whose judgment he wants on both Indian classical *and* Indian popular music. The launch shortlist is therefore: tonal-classical phrase engine · **Indian classical + pop engine** · ambient/process engine · groove/lo-fi engine · adaptive-interactive engine. (Gamelan remains a load-bearing *knowledge* page — see [gamelan](gamelan.md) — just not a launch engine.) This surfaces a coverage gap: the wiki covers Indian *classical* music but not Indian *popular/film* music yet. → Propagated to [project-roadmap](project-roadmap.md), [indian-classical-music](indian-classical-music.md), [gamelan](gamelan.md), [index](index.md) (coverage gap added).
5. **Daily site mechanism** *(answered 2026-07-06)*. **Time-based, checked per session**: at the start of each session, check the current UTC date/time; if **more than 24 hours** have passed since the last site update, update the site at the **end** of that session. Sessions are triggered either by a Claude Routine or manually by Tom, who decides frequency based on his token usage — so the site stays fresh without a fixed external scheduler. And: **be completely upfront that everything is written and built by Claude** (no ambiguity on the public site about authorship). → Propagated to [project-roadmap](project-roadmap.md) (Phase 4), `continue-prompt.md`, `CLAUDE.md`, [project-mission](project-mission.md) (transparency), `README.md`.
6. **Evaluator pool** *(answered 2026-07-06)*. **Only Tom for now**; later probably **only a handful**. If Tom switches to large-scale evaluation later, he will consult Claude about the redesign first. So listening-test design should be sized for n=1 growing to a small panel, not for population statistics. → Propagated to [listening-tests-and-feedback](listening-tests-and-feedback.md), [improvement-loop](improvement-loop.md), [evaluation-challenges](evaluation-challenges.md).
7. **Source languages** *(answered 2026-07-06)*. Draw on sources **in any language** — English, Japanese, German, French, Chinese, Italian, Russian, etc. The **wiki and the public site are written in English**; when terms in other languages appear, **gloss them** as appropriate. (No bilingual site.) → Propagated to [conventions](conventions.md), `CLAUDE.md`, `continue-prompt.md`.
8. **Session budget** *(answered 2026-07-06)*. **Session length**: do as much as can be done well within about **70% of the context window**. **Frequency**: Tom decides, via his scheduling of Routines and manual triggers. **External model spend**: OpenRouter is available in this environment (`OPENROUTER_API_KEY` is set); sessions may spend up to **$5 per UTC day** on other models for second opinions, web searches, and the like. → Propagated to `CLAUDE.md`, `continue-prompt.md`, `logs/status.md`.

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
