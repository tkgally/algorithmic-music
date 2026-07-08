# CLAUDE.md — algorithmic-music

Generative instrumental music in the browser (HTML/CSS/vanilla JS + Web Audio only), built by Claude across many autonomous sessions, directed by Tom Gally. The project's memory is the wiki in `wiki/`; the current operational state is `logs/status.md`. **If you are starting a session, `continue-prompt.md` is the entry point** — it tells you what to read and how to run a session.

## Repository map

| Path | What it is | Rules |
|---|---|---|
| `wiki/` | The knowledge base — the project's compounding memory | Follow `wiki/conventions.md` strictly; keep `wiki/index.md` and `wiki/log.md` current |
| `wiki/llm-wiki.md` | The framework document the wiki instantiates | **Immutable** |
| `previous-experiments/` | Tom's 2025–2026 engine experiments | **Immutable, reference only — never modify, never reuse code directly** (lessons: `wiki/previous-experiments-lessons.md`) |
| `logs/` | Session logs + `logs/status.md` (current state, task queue) | Update every session |
| `continue-prompt.md` | Session bootstrap prompt | Keep stable; state lives in `logs/status.md`, not here |
| `experiments/` | (Phase 1+) private dev-time testbeds and scripts | Not public product; findings go to the wiki |
| `docs/` | **Phase 2 (started 2026-07-08): public engines + hub via GitHub Pages.** Hub `docs/index.html`; numbered self-contained engines in `docs/engines/` | Per `wiki/engine-architecture.md`; engines vendor the shared libs |

## Hard rules

1. **Phase 2 has begun (Tom's explicit request, 2026-07-08): public engines now live in `docs/`.** Engine 01 (`docs/engines/01-tonal-classical/`) is the launch engine. New engines are self-contained, **numbered** folders that **vendor** (copy in) the shared libraries from `experiments/lib/`, and are added to the hub `docs/index.html`. Build from `wiki/project-roadmap.md` Phase 2 + `wiki/engine-architecture.md`. (The knowledge base continues to be maintained alongside.)
2. **Engines and site: vanilla HTML/CSS/JS by default.** Dependency-free at runtime is the strong default (engines must run from `file://`; no build step, no server, no network at runtime). There is no absolute ban on external libraries, but if shared functionality is ever genuinely needed, the strongly preferred path is to build **original, first-party libraries** for this project — original code that relies on no other project's code — which engines vendor (copy in), never fetch. See `wiki/shared-libraries.md`. Instrumental music only.
3. **Never modify** `previous-experiments/` or `wiki/llm-wiki.md`.
4. **The wiki is load-bearing.** Substantive work (research, decisions, experiment results) must land in wiki pages per `wiki/conventions.md` — work that isn't filed is lost. Every factual claim needs a source or an explicit "informed speculation" flag.
5. **Questions for Tom** go in `wiki/project-open-questions.md` (he answers asynchronously); don't block on them — record the working assumption and proceed.

## Session workflow

**Start** (from `continue-prompt.md`): read `logs/status.md`, skim `wiki/index.md` and the latest entries in `wiki/log.md` and `logs/sessions/`, check whether Tom left new instructions (session prompt, edits to open-questions, new files), then pick a coherent, completable scope from the status queue.

**End — every session, no exceptions:**

1. Update `logs/status.md` (state + re-prioritized queue) and write `logs/sessions/NNN-YYYY-MM-DD.md` (what/why/decisions/next).
2. Add `wiki/log.md` entries for wiki changes; make sure `wiki/index.md` reflects every page added/renamed.
3. Commit with a clear message; push to the session's designated `claude/...` branch (`git push -u origin <branch>`; on network failure retry with backoff).
4. Open a PR to `main` (ready, not draft) and **squash-merge it** — Tom's standing instruction; use the GitHub MCP tools (`create_pull_request`, then `merge_pull_request` with `merge_method: "squash"`). Branches auto-delete after merge.
5. Confirm merge succeeded (the session is not done until `main` has the work).

## Conventions

- Wiki mechanics: `wiki/conventions.md` (page template, frontmatter, linking, citation, lint).
- Engine architecture (when engines begin): `wiki/engine-architecture.md`.
- Commit messages: imperative summary line; body says what a reader of `git log` needs; no model IDs in repo artifacts.
- Link check before ending a session: every `](page.md)` target in `wiki/` must exist (grep-able; a lint script can live in `experiments/tools/` once written).
- Dates in ISO (YYYY-MM-DD). American spelling in wiki prose.

## Session budget, tools, and standing decisions

*(Tom answered the eight bootstrap open questions on 2026-07-06; the operative decisions are summarized here and detailed in `wiki/project-open-questions.md` → "Answered." He revised two of them on 2026-07-07: the dependency policy now prefers original first-party libraries over vendored third-party ones, and all code — not just prose — is now public domain.)*

- **Budget:** do as much as you can do *well* within about **70% of the context window**; Tom controls frequency via Routines and manual triggers.
- **External models:** OpenRouter is available (`OPENROUTER_API_KEY` is set in the environment). You may spend up to **$5 per UTC day** on other models for second opinions, web searches, and similar — use it when a second perspective or a search genuinely helps, and note nontrivial use in the session log.
- **Source languages:** draw on sources in *any* language (English, Japanese, German, French, Chinese, Italian, Russian, …); write the wiki and site **in English**, glossing non-English terms on first use.
- **Licensing:** everything the project creates — code *and* all prose (wiki + site) — is dedicated to the **public domain under CC0 1.0** (`LICENSE`). Keep new work consistent with this; don't paste in text or code under an incompatible license.
- **Transparency:** the public site is **completely upfront that everything is written and built by Claude** — never obscure authorship.
- **Daily site (Phase 4 only):** once the `docs/` summary site exists, check the current UTC time at session start; if **>24 h** since the last site update, refresh it at session end. Not applicable until Phase 4.

## Context that saves future-you time

- Tom is the taste-owner and only human in the loop; he reads the wiki and the logs but does not write code. Feedback and answers arrive asynchronously.
- The founding diagnosis (why naive engines disappoint) is `wiki/previous-experiments-lessons.md` + `wiki/generative-music-failure-modes.md`; the constructive program is `wiki/generative-music-design-patterns.md`. Read these before proposing engine work.
- Sessions are run by different Claude models over time; write everything so a fresh model with zero conversation history can continue.
