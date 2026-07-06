# algorithmic-music

An experiment in making **genuinely good instrumental music with code in the browser** — plain HTML, CSS, and JavaScript with the Web Audio API; dependency-free by default (a small vendored helper only if ever genuinely needed), no build step, no server.

The project is a long-running collaboration between [Tom Gally](https://github.com/tkgally), who directs it and judges the music, and Claude (Anthropic's AI), which does the research, writing, and engineering in autonomous sessions. Its distinguishing bet: browser music generators are easy to build but musically disappointing, and the cure is **knowledge plus iteration** — a serious, citable knowledge base about how music works and why people enjoy it, driving engine designs that are then improved through structured evaluation and human feedback.

## What's here

| Path | Contents |
|---|---|
| [`wiki/`](wiki/index.md) | The knowledge base: music theory and structure, psychology of musical enjoyment, genres and traditions as generative systems, composition craft, algorithmic-composition techniques, Web Audio implementation, and evaluation methodology — every page ending in concrete implications for generative engines. Start at [`wiki/index.md`](wiki/index.md). |
| `previous-experiments/` | Six earlier vibe-coded engines (2025–2026), kept immutable as reference. Their diagnosis — intriguing textures, unsatisfying music — is written up in [`wiki/previous-experiments-lessons.md`](wiki/previous-experiments-lessons.md) and motivates the whole project. |
| `logs/` | Session logs and current project status. |
| `CLAUDE.md`, `continue-prompt.md` | The process files that let each new Claude session pick up exactly where the last left off. |
| `docs/` | *(future)* Public music engines and a project-summary site, served via GitHub Pages, once the knowledge-base phase has matured. |

## How it works

1. **Knowledge phase (current).** Claude builds and maintains the wiki — researched from real sources, organized for use, honest about contested evidence. The wiki follows the ["LLM wiki" pattern](wiki/llm-wiki.md): the model does all the bookkeeping; knowledge compounds across sessions.
2. **Engine phase.** Deliberately contrasting generative engines (different genres, different architectures) built from the wiki's knowledge, published on GitHub Pages for anyone to hear. The site is completely upfront that everything here — wiki, engines, and site — is written and built by Claude.
3. **Improvement loop.** Listener feedback, computational metrics, and analysis of human-composed music feed findings back into the wiki, and the engines get better. The process is specified in [`wiki/improvement-loop.md`](wiki/improvement-loop.md).

Each work session ends squash-merged to `main`, so the repository's history is a readable record of the project's growth.

## Status

**Phase 1 — building the knowledge base.** The wiki was seeded on 2026-07-06 with ~55 researched pages; current state and next steps are always in [`logs/status.md`](logs/status.md). No public engines yet.

## Listening

Nothing to hear yet — the GitHub Pages site with playable engines arrives in Phase 2. (The `previous-experiments/` folders contain runnable earlier engines if you're curious about the starting point: open any `index.html` in a browser.)

## License

Dual-licensed by kind of content:

- **Code** — the browser engines, dev-time tools, and scripts — under the **MIT License** ([`LICENSE`](LICENSE)).
- **Prose** — the wiki under [`wiki/`](wiki/index.md) and the text of the public site under `docs/` — dedicated to the **public domain** under **CC0 1.0 Universal** ([`LICENSE-wiki`](LICENSE-wiki)).

The `previous-experiments/` folder is the project owner's prior work, included immutably for reference only.
