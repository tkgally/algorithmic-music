# algorithmic-music

An experiment in making **genuinely good instrumental music with code in the browser** — plain HTML, CSS, and JavaScript with the Web Audio API; dependency-free by default (if shared functionality is ever needed, the project writes its own original libraries rather than pulling in outside code), no build step, no server.

The project is a long-running collaboration between [Tom Gally](https://github.com/tkgally), who directs it and judges the music, and Claude (Anthropic's AI), which does the research, writing, and engineering in autonomous sessions. Its distinguishing bet: browser music generators are easy to build but musically disappointing, and the cure is **knowledge plus iteration** — a serious, citable knowledge base about how music works and why people enjoy it, driving engine designs that are then improved through structured evaluation and human feedback.

## What's here

| Path | Contents |
|---|---|
| [`wiki/`](wiki/index.md) | The knowledge base: music theory and structure, psychology of musical enjoyment, genres and traditions as generative systems, composition craft, algorithmic-composition techniques, Web Audio implementation, and evaluation methodology — every page ending in concrete implications for generative engines. Start at [`wiki/index.md`](wiki/index.md). |
| `previous-experiments/` | Six earlier vibe-coded engines (2025–2026), kept immutable as reference. Their diagnosis — intriguing textures, unsatisfying music — is written up in [`wiki/previous-experiments-lessons.md`](wiki/previous-experiments-lessons.md) and motivates the whole project. |
| `logs/` | Session logs and current project status. |
| `experiments/` | Dev-time testbeds: the project's first-party shared libraries (`lib/`), composers, headless tests, and audio-render harnesses. Not shipped product; findings land in the wiki. |
| `CLAUDE.md`, `continue-prompt.md` | The process files that let each new Claude session pick up exactly where the last left off. |
| `docs/` | **Public music engines + hub, served via GitHub Pages** (Phase 2, started 2026-07-08). The hub (`docs/index.html`) catalogs the numbered engines; each engine is a self-contained folder under `docs/engines/`. |

## How it works

1. **Knowledge phase (current).** Claude builds and maintains the wiki — researched from real sources, organized for use, honest about contested evidence. The wiki follows the ["LLM wiki" pattern](wiki/llm-wiki.md): the model does all the bookkeeping; knowledge compounds across sessions.
2. **Engine phase.** Deliberately contrasting generative engines (different genres, different architectures) built from the wiki's knowledge, published on GitHub Pages for anyone to hear. The site is completely upfront that everything here — wiki, engines, and site — is written and built by Claude.
3. **Improvement loop.** Listener feedback, computational metrics, and analysis of human-composed music feed findings back into the wiki, and the engines get better. The process is specified in [`wiki/improvement-loop.md`](wiki/improvement-loop.md).

Each work session ends squash-merged to `main`, so the repository's history is a readable record of the project's growth.

## Status

**Phase 2 — engines have begun (started 2026-07-08).** Phase 1 built and matured the knowledge base (63 reviewed wiki pages) and a validated first-party library foundation (`rng`, `transport`, `theory`, `analysis`, `synth`, `fx`) plus a worked composition algorithm. The first public engine is now live in [`docs/`](docs/). Current state and next steps are always in [`logs/status.md`](logs/status.md).

## Listening

The first engine is **[Engine 01 — Tonal Classical](docs/engines/01-tonal-classical/index.html)**: a short tonal piece that states a theme, departs, brings the theme back varied at its climax, and actually *ends* with a cadential coda. Open `docs/index.html` (the hub) or the engine's `index.html` directly in a browser — it runs offline, generates every note live with Web Audio, and reproduces any piece from a seed or a shared link. Once GitHub Pages is enabled for this repo, the hub will also be browsable online.

(The `previous-experiments/` folders contain the runnable earlier engines that motivated the project: open any `index.html` in a browser.)

## License

Everything this project creates — **code** (the browser engines, dev-time tools, scripts, and any original shared libraries) and **prose** (the wiki under [`wiki/`](wiki/index.md) and the text of the public site under `docs/`) — is dedicated to the **public domain** under **CC0 1.0 Universal** ([`LICENSE`](LICENSE)). Copy, modify, and reuse any of it, for any purpose, without asking.

The `previous-experiments/` folder is the project owner's prior work, included immutably for reference only.
