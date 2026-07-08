# Index

The catalog of every page in this wiki, grouped for navigation. One-line summaries come from each page's frontmatter. Pages marked **·reviewed** have been verified in an editing pass; unmarked pages are `draft` — substantive and sourced, but awaiting a verification pass (see the queue in `logs/status.md`). Maintained per [conventions](conventions.md): update this file in the same commit that adds or renames any page.

**Reading paths.** New session orientation: [project-mission](project-mission.md) → [previous-experiments-lessons](previous-experiments-lessons.md) → [generative-music-failure-modes](generative-music-failure-modes.md). Designing an engine: [generative-music-design-patterns](generative-music-design-patterns.md) → [engine-architecture](engine-architecture.md) → the target genre page → the implementation pages. Understanding listeners: [musical-expectation](musical-expectation.md) → [repetition-and-familiarity](repetition-and-familiarity.md) → [complexity-and-preference](complexity-and-preference.md).

## Start here (project)

- [project-mission](project-mission.md) ·reviewed — What this project is trying to achieve, its constraints, its definition of success, and its non-goals.
- [project-roadmap](project-roadmap.md) ·reviewed — The phased plan — wiki building now, engines when Tom gives the go, then feedback-driven improvement and the public project site.
- [project-open-questions](project-open-questions.md) ·reviewed — Decisions awaiting Tom, plus open research questions for future sessions — the project's asynchronous question channel.
- [previous-experiments-lessons](previous-experiments-lessons.md) ·reviewed — Analysis of the six 2025–2026 experiments in previous-experiments/ — what they already solved, and a diagnosis of why their music still falls short.
- [improvement-loop](improvement-loop.md) ·reviewed — The project's process for turning wiki knowledge, metrics, and human feedback into measurably better music, session after session.

## Doctrine (cross-cutting syntheses)

- [generative-music-failure-modes](generative-music-failure-modes.md) ·reviewed — A diagnostic taxonomy of the ways algorithmically generated music goes wrong, with causes and pointers to remedies — the checklist every engine is tested against.
- [generative-music-design-patterns](generative-music-design-patterns.md) ·reviewed — A catalog of architectural and compositional patterns for building generative engines — the constructive counterpart to the failure-mode taxonomy.
- [engine-architecture](engine-architecture.md) ·reviewed — The reference architecture for this project's browser engines — module boundaries, data schemas, determinism rules, UI and deployment conventions, and testability requirements.
- [style-and-genre-overview](style-and-genre-overview.md) ·reviewed — Style as a probabilistic constraint system that listeners learn statistically; why an engine must commit to a genre, what minimally signals one, and how to encode styles as reusable packs.

## Music theory and structure

- [melody](melody.md) ·reviewed — What separates a melody from a note stream — contour, step/leap statistics, tessitura, motivic repetition, galant schemata, and hooks — with the numbers an engine needs to generate lines that sound sung rather than sampled.
- [phrase-structure](phrase-structure.md) ·reviewed — The phrase as the basic unit of musical syntax — sentence and period archetypes, cadences as punctuation, hypermeter and the 4/8-bar norm, and why bar-by-bar generation without phrase syntax sounds aimless.
- [form-and-structure](form-and-structure.md) ·reviewed — Whole-piece architecture — binary, ternary, rondo, variations, verse-chorus, arch, moment and process forms — built on repetition-with-return, plus the sobering evidence that listeners perceive far less large-scale tonal structure than theory assumes.
- [harmony](harmony.md) ·reviewed — Functional syntax, root-motion norms, cadences, harmonic rhythm, and corpus statistics (classical and rock) that separate goal-directed progressions from wandering ones, with engine-ready transition tables.
- [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) ·reviewed — Voice-leading rules as auditory-stream engineering — species counterpoint, Huron's perceptual derivation of the rules, dissonance treatment, chorale norms, contrapuntal devices, and how many voices listeners can actually track.
- [rhythm-and-meter](rhythm-and-meter.md) ·reviewed — How listeners infer a metrical grid from onsets, how syncopation and swing are measured, and how timelines, Euclidean rhythms, polyrhythm, and additive meters give rhythm an identity beyond a quantized grid.
- [groove-and-embodiment](groove-and-embodiment.md) ·reviewed — Groove as the pleasurable urge to move, the syncopation inverted-U, the contested evidence on microtiming, and the concrete drum-pattern features (backbeat, bass weight, velocity hierarchy, ghost notes) that make music move the body.
- [tension-and-release](tension-and-release.md) ·reviewed — Tension is the currency of musical motion — the measurable rise and fall that makes music go somewhere. Covers the parameters that drive it, the Farbood and Lerdahl-Krumhansl models with their empirical fits, and how to budget tension across a piece.
- [tuning-and-scales](tuning-and-scales.md) ·reviewed — Tuning systems and scale construction across cultures — 12-TET vs just intonation, roughness and harmonicity models of consonance (with their cultural limits), tonal hierarchies, and how to realize any tuning in Web Audio via cents.
- [timbre-and-orchestration](timbre-and-orchestration.md) ·reviewed — The perceptual dimensions of timbre (attack, brightness, spectral flux), why attack transients identify instruments, and the orchestration rules — register, blend vs segregation, spacing, foreground/background — needed so synthesized voices read as distinct instruments.

## Psychology of listening

- [musical-expectation](musical-expectation.md) ·reviewed — How listeners predict what comes next in music, why violations and confirmations of those predictions generate affect, and the computational models (IDyOM, predictive coding) that quantify surprise and uncertainty.
- [repetition-and-familiarity](repetition-and-familiarity.md) ·reviewed — Why repetition is a near-universal feature of music, how it and familiarity breed liking (with an overexposure ceiling), and why endlessly novel generative music forfeits the strongest lever on enjoyment.
- [emotion-and-meaning](emotion-and-meaning.md) ·reviewed — How music expresses and induces emotion — perceived vs felt emotion, dimensional vs categorical models, Juslin's BRECVEMA mechanisms and acoustic cue-to-emotion mappings, the enjoyment of sad music, and what "meaning" in music amounts to.
- [pleasure-and-reward](pleasure-and-reward.md) ·reviewed — The neuroscience of why music feels good — chills/frisson and their structural triggers, dopaminergic reward (Salimpoor, Blood & Zatorre), the anticipation engine, specific musical anhedonia showing music reward is dissociable, and aesthetic emotions beyond chills.
- [complexity-and-preference](complexity-and-preference.md) ·reviewed — Berlyne's inverted-U (Wundt curve) linking complexity/arousal-potential to liking, how musical complexity is operationalized, the messy and partly-contradictory evidence, and the moderating roles of familiarity, training, and individual differences.
- [auditory-perception-basics](auditory-perception-basics.md) ·reviewed — The hard perceptual constraints every engine must respect — auditory scene analysis and streaming, critical bands and masking, pitch and the missing fundamental, equal-loudness contours, temporal resolution and memory, the ~3-voice polyphony limit, and pitch/tuning tolerance.
- [attention-and-background-listening](attention-and-background-listening.md) ·reviewed — How music interacts with cognitive work — the irrelevant-sound effect, lyrics as distractor, the arousal-mood account, the near-null meta-analytic picture, individual differences, and the design rules that define the background end of this project's listening axis.
- [musical-universals](musical-universals.md) ·reviewed — What is actually universal in music versus culturally learned — statistical universals, cross-cultural form-function links, the consonance and octave-equivalence debates, rhythm priors, and the standing critiques.

## Genres and traditions

- [western-classical-tradition](western-classical-tradition.md) ·reviewed — Era-by-era generative principles of Western art music — Baroque, Classical, Romantic, Impressionist, and 20th-century styles — with concrete emulation rules an engine can implement.
- [jazz-and-improvisation](jazz-and-improvisation.md) ·reviewed — Jazz as the best-documented case of real-time rule-governed music generation by humans — harmony, form, swing timing, rhythm-section rules, and formula-based improvisation, extracted as engine rules.
- [minimalism-and-process-music](minimalism-and-process-music.md) ·reviewed — Reich's phasing and audible-process manifesto, Glass's additive rhythm, Riley's In C, and Pärt's tintinnabuli — hand-designed processes that generate good music, and why they work.
- [ambient-and-generative-genre](ambient-and-generative-genre.md) ·reviewed — From Satie's furniture music through Eno's tape-loop and rule systems to generative.fm — the genre whose esthetic and whose production systems are both directly implementable in a browser.
- [electronic-and-dance](electronic-and-dance.md) ·reviewed — EDM as a grid-locked, layer-based, drop-driven form — its 8/16/32-bar phrasing, tension-engineering toolkit, subgenre map, and why it is unusually amenable to algorithmic generation.
- [film-and-game-music](film-and-game-music.md) ·reviewed — Film scoring functions and leitmotif, plus the adaptive-music architectures of game audio (vertical layering, horizontal resequencing, stingers, transition matrices) reframed for a browser engine whose game state is the user's controls.
- [gamelan](gamelan.md) ·reviewed — Javanese and Balinese gamelan as human-made algorithmic music — colotomic gong cycles, a core melody elaborated at fixed density ratios, paired-detuned non-equal tunings, and interlocking figuration.
- [indian-classical-music](indian-classical-music.md) ·reviewed — Raga as grammar-constrained melodic improvisation over a fixed drone within cyclic tala, unfolding by gradual intensification — a working blueprint for generative melody engines.
- [indian-popular-and-film-music](indian-popular-and-film-music.md) ·reviewed — Filmi/Bollywood and regional pop as an East–West hybrid — mukhda/antara song form, Western harmony and drum-kit rhythm laid under raga-inflected melody over a drone, and the purity-vs-harmony dial an engine must expose.
- [west-african-rhythm](west-african-rhythm.md) ·reviewed — Timeline-anchored ostinato ensembles with systematic cross-rhythm, master-drummer variation, and interlocking parts — an engine architecture for rhythm-forward music, read with Agawu's cautions against exoticism.
- [east-asian-traditions](east-asian-traditions.md) ·reviewed — Engine-relevant principles from Japanese, Chinese, and Korean art musics — heterophony, breath-based free rhythm, timbre as primary content, silence as structure, and jo-ha-kyu as a form template.

## The craft of composition and performance

- [composition-craft](composition-craft.md) ·reviewed — Recurring advice from composers and treatises across three centuries — economy of material, unity vs. variety, constraint as fuel, revision, trajectory, orchestration clarity, silence — distilled into a working checklist an engine can apply.
- [expressive-performance](expressive-performance.md) ·reviewed — What human performers add to a score — the KTH rule system, measured timing/dynamics/articulation regularities, and an engine-ready table of deviation magnitudes.
- [what-makes-music-good](what-makes-music-good.md) ·reviewed — Competing standards for judging music — formalism, expression theories, Meyer's expectation-based meaning, craft-teacher criteria, listener-centered functional value — plus what the 2024–2026 AI-music discourse and attribution-bias studies imply for evaluating generated output.

## Algorithmic composition

- [algorithmic-composition-history](algorithmic-composition-history.md) ·reviewed — A thousand years of algorithmic composition, from Guido's vowel mapping and dice games through Illiac, Xenakis, Cope, and Iamus to browser generative music — and what actually produced convincing results.
- [markov-and-statistical-models](markov-and-statistical-models.md) ·reviewed — How Markov chains, variable-order models, and HMMs generate music, why they wander and plagiarize, and the constraint and hierarchy fixes that make them usable.
- [grammars-and-rewriting-systems](grammars-and-rewriting-systems.md) ·reviewed — Generative grammars, GTTM, Schenkerian elaboration, Steedman's jazz grammar, and L-systems as engines of hierarchical musical structure — the strongest known lever on long-range coherence.
- [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md) ·reviewed — Composition as constraint satisfaction and rule-guided search — CHORAL, Schottstaedt's penalty counterpoint, modern CP systems, and search strategies that run well in vanilla JavaScript.
- [stochastic-chaos-and-automata](stochastic-chaos-and-automata.md) ·reviewed — Randomness, 1/f noise, chaos, cellular automata, and swarms as musical raw material — what each demonstrably contributes, and why every one of them needs musical constraints layered on top.
- [machine-learning-music](machine-learning-music.md) ·reviewed — Survey of ML music generation (symbolic and audio), what it teaches this project, and why the engines here remain rule/knowledge-based — with the browser-feasibility facts for revisiting that choice.

## Browser implementation

- [web-audio-fundamentals](web-audio-fundamentals.md) ·reviewed — The audio-graph mental model, AudioContext lifecycle, AudioParam automation and click-safety, the node zoo, envelope patterns, and OfflineAudioContext rendering — the base layer every engine builds on.
- [scheduling-and-timing](scheduling-and-timing.md) ·reviewed — How to schedule notes sample-accurately from JavaScript — the two-clock problem, the lookahead pattern, hidden-tab throttling, tempo maps, latency compensation, and long-session stability.
- [synthesis-recipes](synthesis-recipes.md) ·reviewed — Practical node-graph recipes with starting parameters for basses, keys, plucks, mallets, organs, pads, winds, and drums — convincing instruments from oscillators, filters, and noise alone.
- [effects-and-mixing](effects-and-mixing.md) ·reviewed — Reverb, delay, modulation, saturation, compression, EQ, stereo strategy, gain staging, and loudness targets for fully synthesized mixes, built from stock Web Audio nodes.
- [audio-worklets-and-performance](audio-worklets-and-performance.md) ·reviewed — When node graphs stop being enough — the AudioWorklet model, file:// loading workarounds, real-time performance budgets, autoplay and mobile constraints, and leak-free long sessions.
- [javascript-music-libraries](javascript-music-libraries.md) ·reviewed — A survey of Tone.js, Tonal, Magenta.js, Strudel/Gibber, scribbletune, WebPd/RNBO/Faust, Elementary, and Meyda — mined for design lessons a dependency-free engine should steal, plus the case for and against the no-dependency constraint.
- [shared-libraries](shared-libraries.md) ·reviewed — The plan for this project's own original, first-party libraries — the reusable core (theory, timing, seeded RNG, synthesis, effects, analysis) that engines vendor instead of importing outside code, why they are built from scratch, and in what order.

## Evaluation and improvement

- [evaluation-challenges](evaluation-challenges.md) ·reviewed — Why judging generated music is intrinsically hard — subjectivity, listening context, exposure effects, Turing-test traps, short-clip bias — and the pragmatic evaluation stance this project takes.
- [listening-tests-and-feedback](listening-tests-and-feedback.md) ·reviewed — Methods for collecting human judgments of generated music — MUSHRA, ABX, pairwise preference with Bradley-Terry, rating scales, continuous response, implicit signals — sized for this project's tiny volunteer panel.
- [computational-music-metrics](computational-music-metrics.md) ·reviewed — Symbolic and in-browser audio metrics for scoring engine output automatically — feature sets, reference-distribution comparisons, tension-curve checks, and why metrics are diagnostics, not objectives.
- [corpus-analysis](corpus-analysis.md) ·reviewed — Human-composed corpora as reference distributions — the major symbolic datasets, what statistics to extract, licensing care, and a dev-time workflow that bakes distilled tables into the wiki.

## Findings (experiment results)

- [findings-shared-lib-foundation](findings-shared-lib-foundation.md) ·reviewed — Results from prototyping all three first-party shared-library foundation modules (seeded rng, lookahead transport, and theory) in experiments/ — what was built, what the 51-test headless suite plus a dev-time Tonal oracle check prove, and the file:// module-format and oracle-practice findings that fix the vendoring and validation approach.

## Meta

- [conventions](conventions.md) ·reviewed — The schema for this wiki — file naming, page structure, frontmatter, linking, citation, and maintenance rules that every session must follow.
- [log.md](log.md) — Append-only chronological record of wiki operations.
- [llm-wiki.md](llm-wiki.md) — The original framework document this wiki instantiates (immutable).

## Known coverage gaps (planned pages)

Recorded so gaps stay visible; grow or shrink this list as sessions progress. Latin American traditions (son, samba, tango, Andean musics) · European folk and dance musics · Arabic maqam as its own page (currently one section in tuning-and-scales) · glossary of terms · music representation/notation systems · `wiki/sources/` source notes for cornerstone books and papers (directory currently empty).
