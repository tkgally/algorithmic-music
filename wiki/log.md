# Wiki log

Append-only chronological record of wiki operations, newest first. Entry format per [conventions](conventions.md):
`## [YYYY-MM-DD] op | Title` where op ∈ session · create · update · ingest · lint · query · findings.

## [2026-07-06] session | Session 003 — verify theory core, draft Indian popular/film music

Resumed the deferred verify-and-mature pass on the theory core (all five pages promoted to `reviewed`) and drafted the Indian popular/film music page (closing a launch-engine coverage gap). Full narrative: `logs/sessions/003-2026-07-06.md`.

## [2026-07-06] create | Indian popular and film music

New page `indian-popular-and-film-music.md` (`draft`): filmi/Bollywood + regional pop as an East–West hybrid — the playback-song industry, a history by music director, the mukhda/antara song form (vs. Western verse-chorus), the Western-harmony-under-raga fusion mechanics, keherwa/dadra rhythm, the filmi orchestra and its electronic eras, and the regional scenes (Punjabi/bhangra, Tamil/Telugu, Bengali, gully rap). Researched by two parallel subagents (Arnold 1988, Beaster-Jones 2015, Booth 2008, Manuel 1993 as scholarly anchors); practitioner/inferred claims flagged in text. Implications center the launch engine: reuse the classical raga/drone core + mukhda/antara sectioning + Western rhythm + an optional raga-constrained chord filter, on a raga-purity↔harmonic-richness dial. Closes the Indian popular/film coverage gap; added to `index.md`, linked from `indian-classical-music.md`.

## [2026-07-06] update | Verify-and-mature the theory core; promote 5 pages to reviewed

melody, phrase-structure, form-and-structure, tension-and-release, harmony verified against their cited primary sources (five parallel verification subagents; edits and cross-links owned by the session) and promoted `draft` → `reviewed`. Real fixes: **tension-and-release** tonal-interval-space model weights corrected to hierarchical 0.32 > dissonance 0.30 > voice-leading 0.27 > tonal distance 0.16 (draft had 0.40/0.25/0.20/0.19, wrong order); **harmony** Axis-progression count corrected to ~200 songs (draft said "300+"); **melody** contour-clustering paper re-attributed to Cornelissen et al. 2026 (draft said "Savage"). Plus citation upgrades throughout (primary journal cites / DOIs for von Hippel & Huron, Vos & Troost, Farbood, Granot & Eitan, Narmour 1990, Schoenberg, McClelland/Rothstein). Corpus numbers (harmony) and TenseMusic figures (tension) confirmed verbatim. `index.md` marks the five pages `·reviewed`.

## [2026-07-06] lint | Link and frontmatter check (61 pages)

`node experiments/tools/wiki-lint.mjs` clean — 61 pages, no broken links, no orphans, frontmatter conformant — after adding the new page and the theory-core edits.

## [2026-07-06] session | Session 002 — answered open questions, propagated decisions

Tom answered all eight bootstrap questions in [project-open-questions](project-open-questions.md); this session moved them to "Answered" (with per-item propagation notes) and threaded the decisions through the wiki and process docs. No new content pages; a propagation + policy-settling session. Full narrative: `logs/sessions/002-2026-07-06.md`.

## [2026-07-06] update | Propagate Tom's 8 answers across wiki + process docs

Edited [project-open-questions](project-open-questions.md) (8 → Answered), [project-mission](project-mission.md), [project-roadmap](project-roadmap.md), [conventions](conventions.md), [engine-architecture](engine-architecture.md), [listening-tests-and-feedback](listening-tests-and-feedback.md), [improvement-loop](improvement-loop.md), [evaluation-challenges](evaluation-challenges.md), [indian-classical-music](indian-classical-music.md), [gamelan](gamelan.md), [index](index.md). Key changes: strictly-vanilla becomes a strong *default* (tiny vendored permissive helper allowed if genuinely needed); feedback = on-page form → downloadable JSON (no server); launch shortlist swaps gamelan for an Indian classical + pop engine (new coverage gap: Indian popular/film music); daily site (Phase 4) refreshes when >24 h stale; evaluator pool Tom-only for now; sources any language, wiki English with glosses. Licensing settled outside the wiki: `LICENSE` (MIT, code) + `LICENSE-wiki` (CC0, prose); noted in [conventions](conventions.md), [project-mission](project-mission.md), [project-roadmap](project-roadmap.md).

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
