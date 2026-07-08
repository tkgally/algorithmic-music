---
title: Project roadmap
tags: [project]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: The phased plan — wiki building now, engines when Tom gives the go, then feedback-driven improvement and the public project site.
---

# Project roadmap

Phases overlap rather than gate strictly, with one hard gate: **no public engines are built until Tom explicitly asks** ([project-mission](project-mission.md)). Within the current phase, sessions choose their own next tasks from the queue in `logs/status.md` (the operational state file; this page is the strategic view). Update this page when the plan itself changes, not for routine progress — progress lives in `logs/`.

## Phase 0 — Bootstrap ✅ (session 001, 2026-07-06)

Wiki instantiated (schema, conventions, index, log), ~55 seed pages across all domains, project meta-files (CLAUDE.md, continue-prompt.md, README, logs). Previous experiments analyzed and lessons recorded.

## Phase 1 — Knowledge deepening ✅ (sessions 002–017; continues opportunistically)

The wiki grows from seeded to genuinely comprehensive. Recurring session work:

- **Verify and mature drafts**: wave-1 pages are `status: draft` — verify claims, fix links, promote to `reviewed`. Lint passes per [conventions](conventions.md).
- **Deepen where engines will need depth first**: phrase/cadence machinery, harmony grammars, expressive-performance rule tables (with numbers), synthesis recipes (with parameter values), style packs for 3–5 launch genres.
- **Source notes** (`wiki/sources/`) for the project's cornerstone sources (Huron, Meyer, Margulis, Gjerdingen, KTH papers, Lerdahl, Toussaint, Bregman…), pulling their specific, citable content into the wiki properly.
- **Fill declared gaps**: pages the seed round deferred (e.g., Latin American traditions, folk/dance musics of Europe, Arabic maqam as its own page, music notation/representation history, glossary) — maintain the gap list in [index](index.md).
- **Corpus groundwork** (dev-time only): identify and legally vet corpora, write first extraction scripts, record first reference tables ([corpus-analysis](corpus-analysis.md)).
- **Internal prototypes are allowed** (not public, not in `docs/`): tiny testbeds under `experiments/` to validate implementation-page claims (scheduling, synthesis recipes, offline render metrics). These are lab equipment, not products; findings feed the wiki.
- **Shared-library groundwork** (dev-time design; no public engine code until Phase 2): research and design the project's own **original, first-party libraries** — the reusable core (theory, scheduling, seeded RNG, synthesis voices, analysis) that engines will vendor rather than import from outside projects. See [shared-libraries](shared-libraries.md). This is the preferred way to meet shared needs (decided 2026-07-07); prototypes prove the designs in `experiments/`.

Exit signal: Tom reads the wiki and says "build engines" — or asks for something else entirely.

## Phase 2 — First public engines (started 2026-07-08, session 018)

3–5 deliberately contrasting engines in `docs/engines/`, one style-committed each. **Engine 01 — the phrase/cadence-driven tonal-classical engine — is live** (`docs/engines/01-tonal-classical/`, `tonal-classical@0.1.0`; whole-piece rounded-ternary form with a real ending, plus the `synth`/`fx` audible layer — [findings-tonal-classical-engine](findings-tonal-classical-engine.md)). The hub `docs/index.html` catalogs engines by number. Shortlist chosen with Tom (2026-07-06): the tonal-classical engine (done); an **Indian classical + pop** engine (Tom may have an India-based collaborator to judge both idioms — note the coverage gap: the wiki covers Indian *classical* but not yet Indian *popular/film* music); an **ambient/process** engine as the strong-baseline control; a **groove/lo-fi** engine; an **adaptive/interactive** engine. Hub `docs/index.html`; every engine instrumented per [engine-architecture](engine-architecture.md); feedback affordances live from day one — an on-page form that saves results to a downloadable JSON file (no server; Tom hands the JSON back to Claude), per [listening-tests-and-feedback](listening-tests-and-feedback.md); GitHub Pages enabled by Tom (repo Settings → Pages → deploy from `main`/`docs/` — one-time human step).

## Phase 3 — The improvement loop at full speed

Run [improvement-loop](improvement-loop.md): versioned changes, A/B seeds, feedback rounds, findings pages, corpus-informed style packs, metric regression suite. The wiki's `findings` category becomes the project's real output; engines are its demonstrations.

## Phase 4 — Public project site + daily updates

A summary site in `docs/` (project state, engine catalog, listening highlights, wiki tour), refreshed at least daily and **completely upfront that it is written and built by Claude**. Mechanism (decided with Tom, 2026-07-06): each session checks the current UTC time at start and, if **more than 24 hours** have passed since the last site update, refreshes the site before ending — so freshness rides on the session cadence Tom sets (Routines + manual triggers) rather than a separate scheduler. (Implementation note: store the last-update timestamp in repo state — e.g., `logs/status.md` or a small site-meta file — so the check is unambiguous.) Continues indefinitely alongside Phase 3.

## Standing principles across phases

- Every session ends merged to `main` (see CLAUDE.md workflow) — no long-lived branches, no stranded work.
- The wiki is never "done"; every phase feeds it. A session that built engines but recorded no knowledge failed at the more important half of its job.
- Scope stays instrumental-music-in-browser; adjacent temptations (audio ML, servers, DAW features) are declined per [project-mission](project-mission.md) non-goals.
- Licensing is settled (2026-07-06; revised 2026-07-07): everything the project creates — code and all prose (wiki and site) — is dedicated to the public domain under CC0 1.0 (`LICENSE`).

## Related pages

- [project-mission](project-mission.md) · [project-open-questions](project-open-questions.md) · [improvement-loop](improvement-loop.md) · [engine-architecture](engine-architecture.md)
