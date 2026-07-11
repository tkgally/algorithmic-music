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
| `docs/` | **The public site, served via GitHub Pages.** Entry point `docs/index.html` is the comprehensive site — **live at v1.0.0**, with the "Console" dark visual design (`docs/css/site.css`, self-hosted fonts in `docs/fonts/`) and a standalone About page (`docs/about.html`). The five **preliminary test engines** and their hub live in `docs/preliminary-tests/` (engines under `docs/preliminary-tests/engines/`, hub `docs/preliminary-tests/index.html`). |

## How it works

1. **Knowledge phase.** Claude builds and maintains the wiki — researched from real sources, organized for use, honest about contested evidence. The wiki follows the ["LLM wiki" pattern](wiki/llm-wiki.md): the model does all the bookkeeping; knowledge compounds across sessions.
2. **Engine phase.** Deliberately contrasting generative engines (different genres, different architectures) built from the wiki's knowledge, published on GitHub Pages for anyone to hear. The site is completely upfront that everything here — wiki, engines, and site — is written and built by Claude.
3. **Improvement loop.** Listener feedback, computational metrics, and analysis of human-composed music feed findings back into the wiki, and the engines get better. The process is specified in [`wiki/improvement-loop.md`](wiki/improvement-loop.md).

Each work session ends squash-merged to `main`, so the repository's history is a readable record of the project's growth.

## Status

**The comprehensive site is built and live at v1.0.0** (defined by Tom, 2026-07-09; built session 034; given its "Console" visual redesign + a standalone About page in sessions 044–045). Phase 1 built and matured the knowledge base and a validated first-party library foundation (`rng`, `transport`, `theory`, `analysis`, `synth`, `fx`) plus a worked composition algorithm; Phase 2 shipped five contrasting engines, now kept live as *preliminary test engines* in [`docs/preliminary-tests/`](docs/preliminary-tests/); Phase 3 built the site they informed. **It realizes the long-term goal**: a single comprehensive, self-contained site that composes and performs instrumental music in a wide variety of styles — both familiar ones documented in the wiki and original styles invented on the fly by the site's own code — with tiered controls and seeded, shareable pieces (see [`wiki/comprehensive-site-vision.md`](wiki/comprehensive-site-vision.md)); its public entry point is [`docs/index.html`](docs/index.html). The ongoing track is the listen → tune → deepen improvement loop driven by Tom's feedback. Current state and next steps are always in [`logs/status.md`](logs/status.md).

## Listening

The comprehensive site is at [`docs/index.html`](docs/index.html) — pick a style (Classical, Ambient, Lo-fi beats, Folk, Electronic, Cinematic, Percussion, or invent one), press play, and every note is composed and performed live in your browser; settings change the music without restarting, and any piece is reproducible from its seed or shared link. The five earlier **preliminary test engines** — tonal-classical, ambient-drift, groove-lofi, cantabile, and percussion — remain playable in the hub `docs/preliminary-tests/index.html`. Each runs offline, generates every note live with Web Audio, and needs no dependencies. **GitHub Pages is enabled**, so the site is browsable online as well.

(The `previous-experiments/` folders contain the runnable earlier engines that motivated the project: open any `index.html` in a browser.)

## License

Everything this project creates — **code** (the browser engines, dev-time tools, scripts, and any original shared libraries) and **prose** (the wiki under [`wiki/`](wiki/index.md) and the text of the public site under `docs/`) — is dedicated to the **public domain** under **CC0 1.0 Universal** ([`LICENSE`](LICENSE)). Copy, modify, and reuse any of it, for any purpose, without asking.

The `previous-experiments/` folder is the project owner's prior work, included immutably for reference only.
