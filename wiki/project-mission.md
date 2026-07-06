---
title: Project mission
tags: [project]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: What this project is trying to achieve, its constraints, its definition of success, and its non-goals.
---

# Project mission

This project exists to close a specific gap: browser-based generative music engines are easy to build and fun to play with, but the music they produce is not yet *good* — not music a thoughtful listener would choose to hear again for its own sake. The project owner (Tom Gally) has been vibe-coding such engines since mid-2025 (see [previous-experiments-lessons](previous-experiments-lessons.md)); the results are intriguing but musically unsatisfying. This project attacks the problem systematically: first build a comprehensive knowledge base about how music works and why humans enjoy it, then use that knowledge to design engines, then improve them through structured evaluation and feedback.

## The goal

Generate genuinely good instrumental music, in ordinary web browsers, spanning (eventually) many genres, cultures, and eras — music that rewards attentive listening, not only music that is tolerable in the background. "Good" is ultimately judged by human listeners, starting with Tom and expanding to other evaluators via a public GitHub Pages site.

## Constraints

- **Platform**: engines run entirely client-side in modern browsers — HTML, CSS, and vanilla JavaScript with the Web Audio API. No build step, no server-side computation, no external dependencies by default (an open question records whether small libraries are ever acceptable — see [project-open-questions](project-open-questions.md)).
- **Deployment**: public engines and the project-summary site live in `docs/`, served by GitHub Pages, organized behind a single `index.html` hub.
- **Sound generation**: synthesized in the browser. Large sample libraries are impractical under the no-dependency constraint; timbral quality must come from synthesis craft (see [synthesis-recipes](synthesis-recipes.md)).
- **Determinism**: seeded randomness so that any piece can be reproduced, shared, and A/B-compared (a lesson carried over from the previous experiments).
- **Process**: Claude works autonomously in discrete sessions; each session ends with work committed, pushed, and squash-merged to `main`. The wiki is the memory that carries knowledge between sessions. Humans set direction and provide feedback; Claude does everything else.

## Method

1. **Knowledge first.** Build and maintain the wiki: music theory and structure across cultures; psychology of musical enjoyment; the craft of composition and performance as discussed for centuries; algorithmic-composition techniques; browser implementation techniques; evaluation methodology. Every page ties back to engine design through a required "Implications for generative engines" section.
2. **Engines second.** When Tom asks (not before), build test engines in `docs/` that apply the wiki's knowledge — deliberately varied in approach so results can be compared.
3. **Evaluation always.** Instrument every engine for self-analysis (symbolic and acoustic metrics), collect human feedback through the site, analyze human-composed music for reference statistics, and file every finding back into the wiki (see [improvement-loop](improvement-loop.md)).

## Definition of success (provisional)

- Tom, listening to a new engine, says the music is *good* — he would leave it playing by choice, and specific pieces feel like pieces, not textures.
- Outside evaluators rate generated pieces favorably in structured listening tests ([listening-tests-and-feedback](listening-tests-and-feedback.md)).
- Pieces exhibit properties the previous experiments lacked: real phrases with cadences, memorable and developed themes, long-range form with direction, expressive performance, idiomatic style (see [generative-music-failure-modes](generative-music-failure-modes.md) for the full checklist).
- The wiki demonstrably improves engine quality: design decisions cite wiki pages, and findings feed back in.

## Non-goals

- No vocals or lyrics — instrumental music only.
- Not a playable instrument or DAW — the user shapes and listens; the engine composes and performs.
- Not audio-file ML generation (Suno-style) — the point is structured, inspectable, knowledge-driven generation whose decisions can be understood and improved. Machine learning may inform the work analytically (see [machine-learning-music](machine-learning-music.md)) but the engines are not neural audio models.
- Not real-time collaboration or networking features.

## Related pages

- [project-roadmap](project-roadmap.md) — the phased plan
- [project-open-questions](project-open-questions.md) — decisions awaiting Tom, and open research questions
- [previous-experiments-lessons](previous-experiments-lessons.md) — where the project starts from
- [improvement-loop](improvement-loop.md) — how feedback becomes better music
- [conventions](conventions.md) — how this wiki is maintained
