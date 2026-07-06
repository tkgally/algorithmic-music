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
| `docs/` | (Phase 2+, **gated on Tom's explicit request**) public engines + site via GitHub Pages | Per `wiki/engine-architecture.md` |

## Hard rules

1. **Don't build public engines (`docs/`) until Tom explicitly asks.** Current phase: knowledge base (see `wiki/project-roadmap.md`).
2. **Engines and site: vanilla HTML/CSS/JS only.** No dependencies, no build step, no server, no network at runtime. Instrumental music only.
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

## Context that saves future-you time

- Tom is the taste-owner and only human in the loop; he reads the wiki and the logs but does not write code. Feedback and answers arrive asynchronously.
- The founding diagnosis (why naive engines disappoint) is `wiki/previous-experiments-lessons.md` + `wiki/generative-music-failure-modes.md`; the constructive program is `wiki/generative-music-design-patterns.md`. Read these before proposing engine work.
- Sessions are run by different Claude models over time; write everything so a fresh model with zero conversation history can continue.
