# Continue prompt — algorithmic-music

*(Tom: point a new Claude session at this file — "Read continue-prompt.md and continue the project" is enough. Add any specific instructions after that sentence and the session will treat them as overriding the default plan below.)*

---

You are continuing the **algorithmic-music** project: a long-running effort to generate genuinely good instrumental music in the browser (vanilla HTML/CSS/JS + Web Audio), directed asynchronously by Tom Gally and executed by Claude in autonomous sessions. You have no memory of previous sessions — the repository is the memory. This prompt tells you how to load it and how to run a session. It is deliberately stable; the *changing* state lives in `logs/status.md`.

## Load the project (in this order, ~10 minutes)

1. `CLAUDE.md` — rules, repo map, session workflow (it may already be auto-loaded).
2. `logs/status.md` — where the project is right now and the prioritized task queue.
3. `wiki/index.md` — the shape of the knowledge base; then the newest entries in `wiki/log.md` and the latest file in `logs/sessions/`.
4. Check for new input from Tom: instructions in your session prompt, edits to `wiki/project-open-questions.md`, or new/changed files he mentions. **Tom's input always outranks the default queue.**

## Run the session

- Pick a **coherent, completable scope** from the status queue (or Tom's instructions) — one theme done well beats five started. Typical good scopes in the current phase: verify-and-mature one wiki domain; write source notes for 2–3 cornerstone sources; research and fill a declared gap; build a dev-time tool (link linter, corpus extractor) in `experiments/`; run a lint pass.
- Work autonomously. Don't ask permission for work within the project's standing rules; file genuine decisions for Tom in `wiki/project-open-questions.md` with your working assumption, and proceed on the assumption.
- Research with real web sources and cite them; follow `wiki/conventions.md` for every page you touch. Honest hedging beats false confidence; contradictions between sources are worth recording. Sources in any language are welcome (English, Japanese, German, French, Chinese, Italian, Russian, …) — write the wiki in English and gloss non-English terms on first use.
- **Budget and tools:** do one theme *well* within about 70% of your context window rather than racing to exhaust it. OpenRouter is available in this environment (`OPENROUTER_API_KEY` is set) for second opinions, web searches, and cross-checks — up to $5 per UTC day; note any nontrivial use in the session log.
- Quality bar for wiki edits: a future session should be able to *act* on the page (design an engine feature, write a metric) without re-doing your research. Numbers and specifics, not vibes.
- If you build or run anything (Phase 1 testbeds and later engines): findings must land in the wiki (`findings` pages), not just in code comments. An experiment without a filed finding didn't happen.
- Delegation: parallel research subagents are effective for breadth (session 001 seeded the wiki that way) — but you own consistency, cross-links, and the index; verify subagent output before merging it into the record.

## End the session (checklist — all of it, every time)

1. `logs/status.md` updated; `logs/sessions/NNN-YYYY-MM-DD.md` written (state, decisions, next-session recommendations).
2. `wiki/log.md` entries added; `wiki/index.md` complete and accurate; wiki links unbroken.
3. Commit, push to your designated `claude/...` branch, open a PR to `main`, **squash-merge it** (standing authorization from Tom; GitHub MCP `merge_pull_request`, `merge_method: "squash"`). Confirm the merge landed.
4. Your final reply to Tom: a compact plain-language summary — what changed, what you learned, what you recommend next, and anything that needs his attention.

## Current phase reminder

The project is in the **knowledge-base phase**: building and deepening `wiki/`. Do **not** create public engines in `docs/` — that phase starts only when Tom explicitly asks for it in a session prompt. (When he does: `wiki/project-roadmap.md` Phase 2 and `wiki/engine-architecture.md` are the specs to build from.)

*Phase 4 daily-site rule (dormant until the `docs/` summary site exists):* at session start, check the current UTC date/time; if more than 24 hours have passed since the last site update, refresh the site before ending the session. Not applicable in the current phase.

*Maintenance note: if the session workflow itself changes (new phase, new standing instructions from Tom), update this file and `CLAUDE.md` together, and say so in the session log.*
