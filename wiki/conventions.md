---
title: Wiki conventions
tags: [meta]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: The schema for this wiki — file naming, page structure, frontmatter, linking, citation, and maintenance rules that every session must follow.
---

# Wiki conventions

This page is the concrete instantiation of the pattern described in [llm-wiki.md](llm-wiki.md) for this project. Every Claude session that touches `wiki/` must follow these rules. The rules exist so that dozens of sessions by different models produce one coherent, navigable knowledge base rather than a pile of notes.

## The three layers

- **Raw sources** — `previous-experiments/` (immutable; reference only, never modify, never reuse code directly), the public web (cited by URL), and, later, experiment data and human feedback collected through the GitHub Pages site. Sources are never edited to fit the wiki; the wiki adapts to the sources.
- **The wiki** — everything in `wiki/`. Claude writes and maintains all of it. Tom (the project owner) reads it and occasionally leaves questions or corrections; treat any human edit as high-priority input.
- **The schema** — `CLAUDE.md` (repo root, session workflow) plus this page (wiki mechanics).

## Files and naming

- All pages are Markdown files directly in `wiki/`, flat, no subdirectories except `wiki/sources/`.
- Filenames: `kebab-case.md`, short but unambiguous (`musical-expectation.md`, not `expectation.md` — a stranger should guess the topic from the filename).
- `wiki/sources/` holds **source notes**: one page per *major* source (a book, a key paper, a substantial interview) that deserves its own summary. Routine web citations do not get source notes; they are cited inline in the pages that use them.
- Special files: `index.md` (catalog), `log.md` (chronological record), `conventions.md` (this page), `llm-wiki.md` (the original framework document — immutable).

## Page structure

Every content page has:

1. **YAML frontmatter** (exact keys, nothing else):
   ```yaml
   ---
   title: Musical expectation
   tags: [psychology]
   status: draft
   created: 2026-07-06
   updated: 2026-07-06
   summary: One sentence, used verbatim in index.md.
   ---
   ```
   - `tags`: one or more of `theory`, `genre`, `psychology`, `craft`, `algorithms`, `implementation`, `evaluation`, `project`, `meta`, `source`, `findings`.
   - `status`: `stub` (placeholder, needs writing) → `draft` (substantive, not yet verified/edited in a later pass) → `reviewed` (a later session has verified claims and links).
2. **H1 title** matching the frontmatter title.
3. **Lede** — one bold-free paragraph stating what the page covers and why it matters to this project.
4. **Body sections** (H2/H3). Information-dense prose; bullets where enumerable; short tables where genuinely tabular.
5. **`## Implications for generative engines`** — REQUIRED on every non-meta page. The concrete "so what" for composing/generating instrumental music in a browser. This section is what makes the wiki a working tool rather than an encyclopedia copy.
6. **`## Open questions`** — optional; things unresolved, contested, or worth researching later.
7. **`## Related pages`** — bullet list of links to other wiki pages.
8. **`## Sources`** — bullet list: author/title/venue/year plus URL for web sources. Every non-obvious factual claim in the body must be traceable to something here (or be flagged as informed speculation).

## Writing rules

- Audience: future Claude sessions first, Tom second, other humans third. Write so a fresh session with no conversation history can act on the page.
- Dense, plain, concrete. No filler ("it is important to note"), no hype. Hedge honestly where evidence is weak or contested — psychology-of-music findings often are; say so.
- Write the wiki in English; American spelling. Sources may be in **any** language (English, Japanese, German, French, Chinese, Italian, Russian, …) — cite them as they are and **gloss** non-English terms on first use (e.g., *ma* [間, "negative space"], *jo-ha-kyū* [序破急, "slow–break–fast"]). Note names in scientific pitch notation (C4 = middle C, MIDI 60).
- Never copy source text at length. Summarize in your own words; quote at most a sentence or two, attributed. (This also keeps the wiki cleanly public-domain: the whole project — prose and code alike — is dedicated to the public domain under CC0 1.0, see `LICENSE`, so never paste in text or code under an incompatible license.)
- When two sources disagree, record the disagreement — that is more valuable than a false consensus.
- Prefer linking over repeating: if another page covers something, link to it and add only what is new here.
- Page length: roughly 60–250 lines. If a page outgrows that, split it and leave a summary + link behind.

## Linking

- Standard relative Markdown links: `[melody](melody.md)`, `[Huron 2006](sources/huron-2006-sweet-anticipation.md)`. No `[[wikilinks]]` — GitHub must render everything.
- Link a concept the first time it appears in a page body; do not re-link every mention.
- Every page should be reachable from `index.md`, and almost every page should have at least one inbound link from another content page (lint for orphans).

## index.md and log.md

- `index.md` lists every page, grouped by category, each with its one-line `summary` from frontmatter. Update it in the same commit that adds or renames a page.
- `log.md` is append-only, newest entry at the top, entries formatted exactly as:
  ```
  ## [2026-07-06] create | Musical expectation
  One or two lines on what was done and why.
  ```
  Operations: `session` (session start/end summaries), `create`, `update`, `ingest` (a new source processed), `lint` (health-check pass), `query` (a question answered and filed), `findings` (experiment results recorded).

## Maintenance operations

- **Ingest**: read a new source → update or create the affected pages (a good source touches several) → cite it → log it.
- **Query**: when a session answers a substantive question using the wiki, file the answer back in (new page or section) so the work compounds.
- **Lint**: periodically check for contradictions between pages, stale claims, orphan pages, broken links, missing cross-references, and stubs that have become load-bearing. Fix or log what you find. A simple link check: every `](xxx.md)` target must exist in `wiki/`.
- When experiments begin, their findings get `findings`-tagged pages (one per experiment or theme) and the general pages get updated to cite them — the wiki is the memory that carries lessons from one engine to the next.

## What not to do

- Do not modify `llm-wiki.md` or anything in `previous-experiments/`.
- Do not create pages outside these conventions (no orphan scratch files in `wiki/`).
- Do not let two pages cover the same ground in parallel — merge or split explicitly and note it in `log.md`.
- Do not state generated-music folklore as fact. Claims about what "works" musically should cite theory, psychology, practitioner testimony, or — best of all, once available — this project's own experiment findings.

## Related pages

- [index.md](index.md) — the catalog
- [log.md](log.md) — the chronological record
- [llm-wiki.md](llm-wiki.md) — the framework this instantiates
