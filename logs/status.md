# Project status

*Operational state + task queue. Updated at the end of every session. Strategic view: [wiki/project-roadmap.md](../wiki/project-roadmap.md).*

**As of:** 2026-07-06 · session 003 · **Phase 1 (knowledge deepening)** — no public engines until Tom asks.

## Where things stand

- Wiki instantiated per `wiki/llm-wiki.md` → schema in `wiki/conventions.md`; **61 pages** across all nine categories (theory, psychology, genres, craft, algorithms, implementation, evaluation, project, meta). Many content pages are still `status: draft` (researched with web sources by parallel subagents in session 001, spot-checked but not yet fully verified page-by-page); the **theory core is now `reviewed`**.
- Project pages (`reviewed`): mission, roadmap, open questions, previous-experiments lessons, failure modes, design patterns, engine architecture, improvement loop.
- **Theory-core pages (`reviewed`, session 003):** melody, phrase-structure, form-and-structure, tension-and-release, harmony — verified against primary sources via five parallel verification subagents; real fixes to the tonal-interval-space tension weights and the Axis-progression count, plus many citation upgrades.
- **New page (session 003):** `indian-popular-and-film-music.md` (filmi/Bollywood + regional pop; `draft`) — closes the Indian popular/film coverage gap ahead of the launch engine; frames the engine as classical raga/drone core + mukhda/antara sectioning + Western rhythm + an optional raga-constrained chord filter.
- Process files live: `CLAUDE.md`, `continue-prompt.md`, `README.md`, this file, `logs/sessions/`.
- **All 8 open questions answered (2026-07-06) and propagated** across the wiki + process docs (session 002). Operative decisions now live in `wiki/project-open-questions.md` → "Answered" and are summarized in `CLAUDE.md` → "Session budget, tools, and standing decisions." Highlights: strictly-vanilla is a strong *default* (tiny vendored permissive helper allowed if genuinely needed); code MIT / prose CC0 (`LICENSE`, `LICENSE-wiki`); feedback via on-page form → downloadable JSON; launch shortlist swaps gamelan for an **Indian classical + pop** engine; daily site (Phase 4) refreshed when >24 h since last update; evaluator pool is Tom-only for now; sources in any language, wiki in English; ~70% context budget + OpenRouter (≤$5/UTC-day).

## Task queue (next sessions, roughly in order)

1. **Verify-and-mature pass, one domain per session.** Read each draft page critically, verify its central claims against its cited sources (fetch them), fix errors, strengthen "Implications" sections, promote to `reviewed`. **Theory core done (session 003).** Remaining order: **psychology** (musical-expectation, repetition-and-familiarity, emotion-and-meaning, pleasure-and-reward, complexity-and-preference, auditory-perception-basics) → algorithms → implementation → genres → evaluation. Pattern that worked well: one verification subagent per page (fetch the cited sources, check the specific numbers and links, suggest strengthenings), main session owns the edits, cross-links, and index; verify subagent claims before merging (a guessed DOI was caught and dropped this way). Log each pass in `wiki/log.md`.
2. **Cross-domain lint** (after 2–3 domains matured): contradictions, duplicate coverage, stale claims. The mechanical checks are already automated — run `node experiments/tools/wiki-lint.mjs` every session (links, frontmatter, sections, orphans; `--index` dumps frontmatter for index maintenance).
3. **Source notes** for cornerstone sources in `wiki/sources/` (Huron *Sweet Anticipation*; Meyer 1956; Margulis *On Repeat*; Gjerdingen schemata; KTH rule-system papers; Lerdahl tension; Bregman ASA; Toussaint; Fux; Eno's generative talks; and — for the Indian engine — Beaster-Jones *Bollywood Sounds* and Arnold 1988) — 2–3 per session, deep and citable.
4. **Research questions R1–R8** in `wiki/project-open-questions.md` — each is a session-sized design study whose output is a wiki page (phrase-first melody algorithm and goal-directed harmony are the highest-value: they gate Phase 2 readiness).
5. **Declared coverage gaps**: Latin American traditions; European folk/dance musics; Arabic maqam page; glossary; notation/representation. (**Indian popular/film music done — session 003.**) Also queued: a **light verification pass on the new `indian-popular-and-film-music.md`** to move it toward `reviewed` — corroborate the I–vi–IV–V habit and the raga↔Western-mode mappings against Beaster-Jones/Booth, and re-fetch the 403-blocked scroll.in Rahman quote. (Grow this list as reading reveals more.)
6. **Corpus groundwork**: license-vetted corpus shortlist + first extraction script + first reference table (interval/phrase-length distributions for one style).
7. **Optional testbeds** (Phase 1 allows non-public experiments): OfflineAudioContext render-and-measure harness validating `computational-music-metrics.md` claims; scheduling/synthesis recipe smoke tests.

## Standing reminders

- Session end = status updated + session log + wiki log/index current + committed + pushed + PR + **squash-merged** + merge confirmed.
- Check `wiki/project-open-questions.md` each session start for answers from Tom; propagate any into affected pages and move to "Answered." (All 8 bootstrap questions are now answered; the section is ready for new ones.)
- **Budget/tools** (Tom, 2026-07-06): aim for one theme done well within ~70% of the context window; OpenRouter is available (`OPENROUTER_API_KEY`) for second opinions / web searches up to $5 per UTC day — note nontrivial use in the session log.
- **Licensing** settled: code MIT (`LICENSE`), all prose CC0 (`LICENSE-wiki`) — don't paste in incompatibly-licensed text.
- **Daily-site UTC check** applies only in Phase 4 (once `docs/` summary site exists): if >24 h since last site update, refresh at session end.
- GitHub Pages is **not yet enabled** — when Phase 2 starts, Tom must flip it on in repo Settings (one-time).

## Session history

| # | Date | Model (as reported) | Summary |
|---|---|---|---|
| 001 | 2026-07-06 | Fable 5 | Bootstrap: wiki schema + ~55 seed pages (11 research subagents + synthesis pages), process files, previous-experiments analysis. Details: `logs/sessions/001-2026-07-06.md`. |
| 002 | 2026-07-06 | Claude (Opus-class) | Answered all 8 open questions; propagated decisions across 15 files; added `LICENSE` (MIT) + `LICENSE-wiki` (CC0). Details: `logs/sessions/002-2026-07-06.md`. |
| 003 | 2026-07-06 | Claude (Opus-class) | Verified the theory core (5 pages → `reviewed`) and drafted `indian-popular-and-film-music.md`; fixed two real errors (tension-model weights, Axis count) + many citation upgrades. Details: `logs/sessions/003-2026-07-06.md`. |
