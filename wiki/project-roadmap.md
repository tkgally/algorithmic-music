---
title: Project roadmap
tags: [project]
status: reviewed
created: 2026-07-06
updated: 2026-07-09
summary: The phased plan — knowledge base and style-study engines done or underway, now aimed at the defined long-term goal, one comprehensive site composing many pre-established and original styles.
---

# Project roadmap

Phases overlap rather than gate strictly, with one hard gate: **no public engines are built until Tom explicitly asks** ([project-mission](project-mission.md)). Within the current phase, sessions choose their own next tasks from the queue in `logs/status.md` (the operational state file; this page is the strategic view). Update this page when the plan itself changes, not for routine progress — progress lives in `logs/`.

## The long-term goal (defined by Tom, 2026-07-09)

The project's destination is now explicit: **a single self-contained website, with no external dependencies, that composes and performs instrumental music in a wide variety of styles and forms** — some based on pre-established styles documented in this wiki, others **original, created on the fly by the site's code** from high-order principles (structure, tonal quality, rhythm, harmony, melody) inspired by existing genres while adding unprecedented elements. Three tiers of user controls (Start / Intermediate / Advanced), seeded determinism with a compact shareable URL, a large set of original annotated shared JS libraries, everything in one folder. The full directive and first design implications: [comprehensive-site-vision](comprehensive-site-vision.md). Phases 3 and 4 below are redrawn around it.

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

3–5 deliberately contrasting engines, one style-committed each — **five shipped** across sessions 018–027: **Engine 01 tonal-classical** (`tonal-classical@0.3.1`; whole-piece rounded-ternary form with a real ending, plus the `synth`/`fx` audible layer — [findings-tonal-classical-engine](findings-tonal-classical-engine.md)), **Engine 02 ambient-drift**, **Engine 03 groove-lofi**, **Engine 04 cantabile**, and **Engine 05 percussion**. A hub catalogs them by number. The shortlist chosen with Tom (2026-07-06) also floated an **Indian classical + pop** engine and an **adaptive/interactive** one (still open ideas — see `logs/status.md`); the shipped set converged on these five contrasting worlds instead. Every engine is instrumented per [engine-architecture](engine-architecture.md), with feedback affordances live from day one — an on-page form that saves results to a downloadable JSON file (no server; Tom hands the JSON back to Claude), per [listening-tests-and-feedback](listening-tests-and-feedback.md); **GitHub Pages is enabled** (deploying from `main`/`docs/`), and Tom listens through the public site. **Relocation (2026-07-09):** per Tom's decision the five engines and their hub were moved into `docs/preliminary-tests/` (engines under `docs/preliminary-tests/engines/`, hub at `docs/preliminary-tests/index.html`) and reframed as *preliminary test engines* — style studies and validated component sources for the Phase 3 comprehensive site, whose public entry point is the new `docs/index.html`.

## Phase 3 — The comprehensive site (the long-term goal)

Design and build the site described in [comprehensive-site-vision](comprehensive-site-vision.md). Sequenced in sub-stages, each reviewed by Tom asynchronously:

- **3a. Wiki wide-coverage expansion** (session 028, Tom's explicit pre-requisite): world traditions, popular genres, deeper theory/craft, psychology of memorability, and a new design pillar (style space, hybridization, meta-composition/style machines, control surfaces, representation) — so the site's design can draw on human music in all its documented variety.
- **3b. Design documents** (multiple sessions): the control taxonomy for the three tiers (proposed by Claude, reviewed by Tom), the style-pack/style-vector schema, the original-style sampling and coherence rules, the site/library architecture (one folder, subfolders, compact URL encoding), and the shared-library expansion plan building on `experiments/lib/` and the engines' proven components. **Per Tom (2026-07-09), documents prepared for his review are placed in `docs/`** (readable there via GitHub Pages; temporary ones may be deleted once superseded); durable decisions from any such doc are still filed in the wiki so nothing is lost when a review doc is cleaned up (CLAUDE.md rule 4). Suggested order: control taxonomy first (Tom explicitly wants to review it), then the style schema, then the architecture.
- **3c. Build** — the site itself, engine core first, then styles in widening circles (familiar presets before on-the-fly originals); betas to Tom for feedback.
- **3d. The improvement loop at full speed** on the site's betas: versioned changes, A/B seeds, Tom's feedback rounds, findings pages, corpus-informed style packs, metric regression suite ([improvement-loop](improvement-loop.md)). The wiki's `findings` category remains the project's real output; the site is its demonstration.

Engines 01–05 remain live as style studies and component sources during this phase — **confirmed by Tom (2026-07-09)** and relocated to `docs/preliminary-tests/` (public entry point for the new site is `docs/index.html`; the engines' hub is `docs/preliminary-tests/index.html`) — [project-open-questions](project-open-questions.md).

## Phase 4 — Public project site + daily updates

A summary site in `docs/` (project state, engine catalog, listening highlights, wiki tour), refreshed at least daily and **completely upfront that it is written and built by Claude**. Mechanism (decided with Tom, 2026-07-06): each session checks the current UTC time at start and, if **more than 24 hours** have passed since the last site update, refreshes the site before ending — so freshness rides on the session cadence Tom sets (Routines + manual triggers) rather than a separate scheduler. (Implementation note: store the last-update timestamp in repo state — e.g., `logs/status.md` or a small site-meta file — so the check is unambiguous.) Continues indefinitely alongside Phase 3.

## Standing principles across phases

- Every session ends merged to `main` (see CLAUDE.md workflow) — no long-lived branches, no stranded work.
- The wiki is never "done"; every phase feeds it. A session that built engines but recorded no knowledge failed at the more important half of its job.
- Scope stays instrumental-music-in-browser; adjacent temptations (audio ML, servers, DAW features) are declined per [project-mission](project-mission.md) non-goals.
- Licensing is settled (2026-07-06; revised 2026-07-07): everything the project creates — code and all prose (wiki and site) — is dedicated to the public domain under CC0 1.0 (`LICENSE`).

## Related pages

- [project-mission](project-mission.md) · [project-open-questions](project-open-questions.md) · [improvement-loop](improvement-loop.md) · [engine-architecture](engine-architecture.md)
