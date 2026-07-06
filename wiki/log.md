# Wiki log

Append-only chronological record of wiki operations, newest first. Entry format per [conventions](conventions.md):
`## [YYYY-MM-DD] op | Title` where op ∈ session · create · update · ingest · lint · query · findings.

## [2026-07-06] lint | Initial link and frontmatter check

Wrote `experiments/tools/wiki-lint.mjs` (link targets, frontmatter keys, required sections, orphans; `--index` mode dumps frontmatter for index building). Full wiki passes: 60 pages, no broken links, no orphans, frontmatter conformant.

## [2026-07-06] create | Index

[index](index.md) built from page frontmatter: 56 content pages grouped into nine categories, reading paths for new sessions, and a known-coverage-gaps list (Latin American traditions, European folk, maqam page, glossary, notation, sources/ notes).

## [2026-07-06] create | Evaluation & craft pages (12)

Evaluation: [evaluation-challenges](evaluation-challenges.md), [listening-tests-and-feedback](listening-tests-and-feedback.md), [computational-music-metrics](computational-music-metrics.md), [corpus-analysis](corpus-analysis.md). Craft/aesthetics: [composition-craft](composition-craft.md), [expressive-performance](expressive-performance.md) (KTH rule table with magnitudes — answers R3), [what-makes-music-good](what-makes-music-good.md) (incl. 2024–26 AI-music discourse and attribution-bias studies), [auditory-perception-basics](auditory-perception-basics.md). Implementation: [web-audio-fundamentals](web-audio-fundamentals.md), [scheduling-and-timing](scheduling-and-timing.md), [synthesis-recipes](synthesis-recipes.md), [effects-and-mixing](effects-and-mixing.md) — plus [audio-worklets-and-performance](audio-worklets-and-performance.md) and [javascript-music-libraries](javascript-music-libraries.md). Researched by three subagents with primary/authoritative web sources.

## [2026-07-06] create | Genre & tradition pages (11)

[style-and-genre-overview](style-and-genre-overview.md) (hub), [western-classical-tradition](western-classical-tradition.md), [jazz-and-improvisation](jazz-and-improvisation.md), [minimalism-and-process-music](minimalism-and-process-music.md), [ambient-and-generative-genre](ambient-and-generative-genre.md), [electronic-and-dance](electronic-and-dance.md), [film-and-game-music](film-and-game-music.md), [gamelan](gamelan.md), [indian-classical-music](indian-classical-music.md), [west-african-rhythm](west-african-rhythm.md), [east-asian-traditions](east-asian-traditions.md), plus [attention-and-background-listening](attention-and-background-listening.md) and [musical-universals](musical-universals.md). Each genre page extracts generative principles (what an engine must do to sound idiomatic). Researched by three subagents.

## [2026-07-06] create | Theory, psychology & algorithm pages (20)

Theory: [melody](melody.md), [phrase-structure](phrase-structure.md), [form-and-structure](form-and-structure.md), [tension-and-release](tension-and-release.md), [harmony](harmony.md), [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md), [tuning-and-scales](tuning-and-scales.md), [rhythm-and-meter](rhythm-and-meter.md), [groove-and-embodiment](groove-and-embodiment.md), [timbre-and-orchestration](timbre-and-orchestration.md). Psychology: [musical-expectation](musical-expectation.md), [repetition-and-familiarity](repetition-and-familiarity.md), [emotion-and-meaning](emotion-and-meaning.md), [pleasure-and-reward](pleasure-and-reward.md), [complexity-and-preference](complexity-and-preference.md). Algorithms: [algorithmic-composition-history](algorithmic-composition-history.md), [markov-and-statistical-models](markov-and-statistical-models.md), [grammars-and-rewriting-systems](grammars-and-rewriting-systems.md), [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md), [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md). Researched by five subagents with web sources; all `status: draft` pending verification passes.

## [2026-07-06] create | Project & doctrine pages (10)

Written directly (not delegated): [project-mission](project-mission.md), [project-roadmap](project-roadmap.md), [project-open-questions](project-open-questions.md) (8 questions for Tom + R1–R8 research questions), [previous-experiments-lessons](previous-experiments-lessons.md) (code-level analysis of all six 2025–26 experiments), [improvement-loop](improvement-loop.md), [generative-music-failure-modes](generative-music-failure-modes.md) (12 failure modes, FM1–FM12), [generative-music-design-patterns](generative-music-design-patterns.md) (14 patterns P1–P14 + anti-patterns), [engine-architecture](engine-architecture.md), [machine-learning-music](machine-learning-music.md), [conventions](conventions.md).

## [2026-07-06] session | Session 001 — wiki bootstrap

Instantiated the wiki from the [llm-wiki.md](llm-wiki.md) framework: schema in [conventions](conventions.md), index, this log. Seeded 56 content pages across nine categories — project pages and syntheses written directly; theory/psychology/genre/craft/algorithms/implementation/evaluation pages drafted by eleven parallel research subagents with web sources, then spot-checked and link-linted. All subagent pages carry `status: draft` pending per-page verification passes (queued in `logs/status.md`). Full session narrative: `logs/sessions/001-2026-07-06.md`.
