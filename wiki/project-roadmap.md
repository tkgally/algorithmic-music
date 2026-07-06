---
title: Project roadmap
tags: [project]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: The phased plan — wiki building now, engines when Tom gives the go, then feedback-driven improvement and the public project site.
---

# Project roadmap

Phases overlap rather than gate strictly, with one hard gate: **no public engines are built until Tom explicitly asks** ([project-mission](project-mission.md)). Within the current phase, sessions choose their own next tasks from the queue in `logs/status.md` (the operational state file; this page is the strategic view). Update this page when the plan itself changes, not for routine progress — progress lives in `logs/`.

## Phase 0 — Bootstrap ✅ (session 001, 2026-07-06)

Wiki instantiated (schema, conventions, index, log), ~55 seed pages across all domains, project meta-files (CLAUDE.md, continue-prompt.md, README, logs). Previous experiments analyzed and lessons recorded.

## Phase 1 — Knowledge deepening (current)

The wiki grows from seeded to genuinely comprehensive. Recurring session work:

- **Verify and mature drafts**: wave-1 pages are `status: draft` — verify claims, fix links, promote to `reviewed`. Lint passes per [conventions](conventions.md).
- **Deepen where engines will need depth first**: phrase/cadence machinery, harmony grammars, expressive-performance rule tables (with numbers), synthesis recipes (with parameter values), style packs for 3–5 launch genres.
- **Source notes** (`wiki/sources/`) for the project's cornerstone sources (Huron, Meyer, Margulis, Gjerdingen, KTH papers, Lerdahl, Toussaint, Bregman…), pulling their specific, citable content into the wiki properly.
- **Fill declared gaps**: pages the seed round deferred (e.g., Latin American traditions, folk/dance musics of Europe, Arabic maqam as its own page, music notation/representation history, glossary) — maintain the gap list in [index](index.md).
- **Corpus groundwork** (dev-time only): identify and legally vet corpora, write first extraction scripts, record first reference tables ([corpus-analysis](corpus-analysis.md)).
- **Internal prototypes are allowed** (not public, not in `docs/`): tiny testbeds under `experiments/` to validate implementation-page claims (scheduling, synthesis recipes, offline render metrics). These are lab equipment, not products; findings feed the wiki.

Exit signal: Tom reads the wiki and says "build engines" — or asks for something else entirely.

## Phase 2 — First public engines (gated on Tom)

3–5 deliberately contrasting engines in `docs/engines/`, one style-committed each (candidates, to be chosen with Tom: a phrase/cadence-driven tonal engine; a gamelan-architecture engine; an ambient/process engine as the strong-baseline control; a groove-forward engine; an adaptive/interactive engine). Hub `docs/index.html`; every engine instrumented per [engine-architecture](engine-architecture.md); feedback affordances live from day one ([listening-tests-and-feedback](listening-tests-and-feedback.md)); GitHub Pages enabled by Tom (repo Settings → Pages → deploy from `main`/`docs/` — one-time human step).

## Phase 3 — The improvement loop at full speed

Run [improvement-loop](improvement-loop.md): versioned changes, A/B seeds, feedback rounds, findings pages, corpus-informed style packs, metric regression suite. The wiki's `findings` category becomes the project's real output; engines are its demonstrations.

## Phase 4 — Public project site + daily updates

A summary site in `docs/` (project state, engine catalog, listening highlights, wiki tour) refreshed daily. Mechanism candidates: a scheduled Claude session via the trigger system, or GitHub Actions regenerating from repo state — decide with Tom ([project-open-questions](project-open-questions.md)). Continues indefinitely alongside Phase 3.

## Standing principles across phases

- Every session ends merged to `main` (see CLAUDE.md workflow) — no long-lived branches, no stranded work.
- The wiki is never "done"; every phase feeds it. A session that built engines but recorded no knowledge failed at the more important half of its job.
- Scope stays instrumental-music-in-browser; adjacent temptations (audio ML, servers, DAW features) are declined per [project-mission](project-mission.md) non-goals.

## Related pages

- [project-mission](project-mission.md) · [project-open-questions](project-open-questions.md) · [improvement-loop](improvement-loop.md) · [engine-architecture](engine-architecture.md)
