---
title: History of algorithmic composition
tags: [algorithms]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: A thousand years of algorithmic composition, from Guido's vowel mapping and dice games through Illiac, Xenakis, Cope, and Iamus to browser generative music — and what actually produced convincing results.
---

# History of algorithmic composition

This page traces algorithmic composition from its medieval precursors to today's browser-based generative systems, focusing on what each landmark system actually did mechanically and — more important for this project — which approaches produced music listeners found convincing, and why. The pattern that recurs for seventy years of computing: pure formalisms (dice, chains, chaos, automata) generate raw material; convincing music appears only when a thick layer of musical knowledge — rules, constraints, curated recombination, or a human editor — is placed between the formalism and the output.

## Precursors: rules and combinatorics before computers

- **Guido d'Arezzo, ca. 1026.** In the *Micrologus*, the inventor of staff notation described a lookup procedure for setting text: assign a pitch to each vowel, then derive a melody from the vowels of the words (Edwards 2011). It is routinely cited as the first algorithmic composition scheme — a deterministic table mapping, not unlike a modern data-to-MIDI sonification, and it shares the same weakness: the mapping is arbitrary with respect to musical syntax.
- **Ars combinatoria and dice games.** The 18th century produced dozens of *Musikalisches Würfelspiel* publications: pre-composed one-bar fragments arranged in a lookup table, selected by dice throws. The earliest known is Kirnberger's *Der allezeit fertige Menuetten- und Polonaisencomponist* (1757). The most famous, published by Simrock in 1792 and attributed to Mozart (K. 294d/K. 516f), is of doubtful attribution — the cover credited Mozart but the attribution has never been authenticated; a genuine 1787 Mozart manuscript of 176 fragments contains no instructions and no evidence dice were involved (Wikipedia, "Musikalisches Würfelspiel"). The 1792 game yields about 7.6 × 10^14 distinct minuets. The design lesson is durable: the games work because *every fragment was composed to be interchangeable* — same harmonic function per slot, same cadence positions — so randomness only ever selects among pre-validated options. Combinatorial variety inside strong constraints, not free generation.
- Ratio- and cycle-based construction (isorhythm, Dufay's proportional motets) shows composers formalizing structure long before automation (Edwards 2011); see [form-and-structure.md](form-and-structure.md).

## Chance versus algorithm at mid-century

John Cage's chance operations (from *Music of Changes*, 1951, using I Ching hexagrams) used randomness to *remove* the composer's taste — indeterminacy as an aesthetic end. Algorithmic composition proper mostly went the other way: randomness or formal process in service of composed intentions. Edwards (2011) frames this as the field's basic split between stochastic and deterministic procedures, noting that Cage recognized computer potential early and collaborated with Hiller on *HPSCHD* (premiered 1969). For this project the distinction matters: Cage's position implies output quality is not the goal; ours is the opposite, so Cage is a philosophical boundary marker, not a source of techniques.

## The first computer works (1955–1965)

- **Hiller & Isaacson, *Illiac Suite* (1956–57)**, Univ. of Illinois — generally agreed to be the first computer-composed score. Four movements = four experiments: (1) cantus firmus generation, (2) four-voice writing under Fux-derived counterpoint rules, (3) rhythm/dynamics/chromatic experiments, (4) Markov-chain generation. The method was generate-and-test: pseudo-random material was kept only if it passed encoded rules (Fernández & Vico 2013; Wikipedia, "Illiac Suite"). This architecture — random proposer, rule-based filter — is the direct ancestor of [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md).
- Other firsts: Caplin & Prinz implemented Mozart's dice game plus stochastic melody generation on a Ferranti computer in 1955 (unpublished); Burroughs' *Push Button Bertha* (1956) generated a pop tune from corpus statistics as a publicity stunt; Brooks et al. (1957) tested Markov orders on hymn tunes (Fernández & Vico 2013).
- Hiller's stated philosophy: if output is unsatisfying, fix the algorithm and regenerate — do not hand-edit (Edwards 2011). Xenakis and Koenig freely hand-edited. Both stances are defensible; our project is structurally committed to Hiller's (the engine ships, no human touches the output).

## Xenakis: stochastic music

Iannis Xenakis, engineer-architect-composer, replaced note-level serial logic with probability distributions governing *mass* phenomena: *Pithoprakta* (1955–56) maps Maxwell–Boltzmann velocity distributions onto string glissandi; *Achorripsis* (1956–57) distributes sound events over a time-by-timbre matrix via the Poisson distribution. From 1962 his Stochastic Music Programme (IBM 7090) generated the ST pieces; *Formalized Music* (1963/1971) is the theoretical statement. He described the computer-assisted composer as "a sort of pilot: he presses buttons, introduces coordinates, and supervises the controls of a cosmic vessel" (Xenakis, quoted in Edwards 2011). Late in life GENDY3 (1991) and S.709 (1994) used dynamic stochastic synthesis — random walks with elastic barriers perturbing waveform breakpoints — unifying composition and synthesis in one algorithm (Wikipedia, "Dynamic stochastic synthesis"). Honest assessment: Xenakis produced canonical works, but the mathematics supplied textures and clouds, while form, drama, and instrumentation were his; for *Atrées* (1962) he reportedly used about 75% computer material and composed the rest (Edwards 2011). Details in [stochastic-chaos-and-automata.md](stochastic-chaos-and-automata.md).

## Koenig and Brün

Gottfried Michael Koenig's Project 1 (1964) and Project 2 (1966) automated serial and Markov techniques with tables of selection principles; Koenig treated *transcription* — turning parameter tables into a playable score — as a substantive compositional act, i.e., the algorithm's output was underdetermined by design (Edwards 2011; Fernández & Vico 2013). Herbert Brün, Hiller's Illinois colleague, wrote FORTRAN composition programs (*Infraudibles*, 1968) and later SAWDUST (1976–80), composing at the waveform-fragment level; his "anticommunication" aesthetic deliberately courted unfamiliarity (Wikipedia, "Herbert Brün"). Lesson: both treated the algorithm as a partner whose output needed a musician's completion — exactly the gap our engines must close with more encoded knowledge, since no musician stands at the output.

## The rule-based landmark: Ebcioğlu's CHORAL

CHORAL (Ebcioğlu 1988) harmonized Bach chorales with ~350 hand-written first-order-logic rules in a custom language (BSL), generate-and-test with intelligent backtracking, and multiple simultaneous viewpoints (chord skeleton, individual melodic lines, Schenkerian voice-leading). Its author judged results at the level of a talented student; it remains the strongest evidence that a large, carefully curated rule set can produce genuinely idiomatic tonal music (Fernández & Vico 2013). Full treatment in [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md). This landmark matters doubly for us: hand-encoding 350 rules was a heroic multi-year effort in 1988, but is exactly what an LLM can now draft in hours.

## Cope's EMI/Emmy and the controversy

David Cope's Experiments in Musical Intelligence (begun 1981; ~20,000 lines of Lisp by 2001) works by **recombinance**: analyze a corpus by one composer, segment it into beat-scale units, extract recurring "signatures" and functional labels, then recombine units under an augmented-transition-network grammar so that voice leading and signature placement stay idiomatic (Fernández & Vico 2013; Wikipedia, "Experiments in Musical Intelligence"). In a 1997 University of Oregon event, an audience hearing pianist-performed Bach, a human imitation (Steve Larson), and an EMI piece identified EMI's as the real Bach; Douglas Hofstadter, who lectured widely on Emmy, found it deeply unsettling: "EMI forces us to look at great works of art and wonder where they came from and how deep they really are. Nothing I've seen in artificial intelligence has done this so well" (Hofstadter, "Staring Emmy Straight in the Eye — and Doing My Best Not to Flinch," in Cope, ed., *Virtual Music*, 2001) — his worry being that if surface style is this mechanizable, style may carry less of music's meaning than believed. Skeptics (e.g., Wiggins 2008, on Cope's later Emily Howell methodology) note the difficulty of evaluating claims when corpus, curation, and cherry-picking are opaque (Fernández & Vico 2013). Lessons: (1) recombination of real music at phrase scale is the historically most convincing route to style emulation; (2) it needs a corpus, which our no-network constraint mostly denies us; (3) selection/curation can silently do much of the work — our [evaluation-challenges.md](evaluation-challenges.md) problem.

## Lewis's Voyager

George Lewis's Voyager (developed from the mid-1980s) is a "virtual improvising orchestra": up to 64 asynchronous MIDI players that analyze a human improviser's playing in real time and generate "both complex responses to the musician's playing and independent behavior arising from the program's own internal processes" (Lewis 2000). Lewis frames it in African-American improvisational aesthetics — multidominance, dialogue, no fixed hierarchy between human and machine. Voyager succeeds by redefining the goal: not a composed artifact but a credible *participant*. Relevant to any interactive mode of our project, and to the design idea of independent voices with their own behavioral state; see [jazz-and-improvisation.md](jazz-and-improvisation.md).

## Iamus and Melomics (2012)

Iamus (Univ. of Málaga, Melomics technology) evolved contemporary-classical scores using evo-devo encodings: genomes develop into full scores, evolution runs under formal constraints (playability, duration, instrumentation) baked into the fitness function. Its 2012 album *Iamus* was recorded by professional players including the London Symphony Orchestra (Fernández & Vico 2013 — note: Vico led Melomics, so this account is not independent). Press coverage was substantial; critical reception of the music itself was mixed, and the works have not entered repertoire. Lesson: professional performance and marketing can outrun listener enthusiasm; "playable and well-formed" is far from "wanted."

## The ML era, in one paragraph

From the 1990s (neural nets, HMMs trained on corpora) through the 2010s–2020s (LSTM, Transformer, diffusion — MusicVAE, Music Transformer, Jukebox, Suno-class audio models), statistical learning displaced hand-built systems wherever large corpora and compute exist, and by the mid-2020s produced streaming-quality pastiche song audio. That entire line is treated in [machine-learning-music.md](machine-learning-music.md); it is mostly closed to this project at runtime (no model weights, no network), but its lessons about structure and evaluation transfer.

## Generative music for everyone: the ambient/browser lineage

Brian Eno named "generative music" and located its precedents in process pieces: Reich's *It's Gonna Rain* (1965), Riley's *In C* (1964), and his own *Music for Airports* (1978), whose sung fragments loop with incommensurable cycle lengths (e.g., 23.5 s vs 25.875 s) so the texture never repeats (Eno 1996). His 1996 formulation — the composer specifies rules, not the artifact; output is unpredictable, unrepeatable, unfinished — is effectively this project's genre charter. Milestones: SSEYO Koan and *Generative Music 1* (1996); the Eno/Chilvers iPhone app *Bloom* (2008), "an endless music machine, a music box for the 21st Century" (generativemusic.com); WolframTones (2005), mapping searched cellular-automaton rules to style-preset MIDI (Fernández & Vico 2013); and Alex Bainter's generative.fm (2019–), 50+ hand-crafted endless ambient generators running on the Web Audio API in the browser — pointedly billed as "composed by a human — not AI" (generative.fm). The lineage proves our exact technical premise (indefinite, satisfying music in a browser) but only, so far, in the low-tension ambient corner; see [ambient-and-generative-genre.md](ambient-and-generative-genre.md) and [minimalism-and-process-music.md](minimalism-and-process-music.md).

## What produced convincing music, and why

1. **Dense musical knowledge, however encoded.** The convincing systems — dice games (pre-validated fragments), CHORAL (350 rules), EMI (recombined real Bach), Voyager (encoded improvisational practice) — all embed enormous style knowledge. Thin formalisms (raw Markov, chaos, CA) never convinced anyone unfiltered; period sources say so repeatedly (Fernández & Vico 2013).
2. **Constraints do more than generators.** Illiac's generate-and-test, CHORAL's backtracking, dice-game slot design: the filter/constraint side carries the quality.
3. **A human in the loop somewhere** — Xenakis and Koenig editing, Cope curating, Eno tuning loops until they worked. Fully autonomous quality remains rare; our design must replace that human with encoded judgment ([what-makes-music-good.md](what-makes-music-good.md), [improvement-loop.md](improvement-loop.md)).
4. **Scope discipline wins.** Systems that chose a narrow, well-understood style (chorales, ambient, minuets) succeeded; universal composers failed. Genre-specific engines are the historically supported bet.

## Implications for generative engines

- Adopt the dice-game insight structurally: generate/choose among *pre-validated* units (phrase schemas, cadence formulas, voicing templates) rather than free-running note streams; put the LLM's effort into authoring the unit inventory and compatibility rules. See [generative-music-design-patterns.md](generative-music-design-patterns.md).
- CHORAL is the existence proof for the project's core bet: large hand-written rule systems can reach "talented student" quality, and LLM authorship removes the historical cost objection. Budget thousands of lines of style rules per genre, not dozens.
- Emulate EMI's recombinance without a corpus: have the LLM author an original bank of signatures/motifs/progressions per style at engine-writing time, then recombine them with ATN-like syntax at runtime. Authoring-time knowledge is free; runtime data is not.
- Follow Hiller, not Koenig: no human completes the output, so any "transcription gap" (structure the algorithm leaves undecided) is a defect. Every parameter needs either a rule or a deliberately chosen distribution.
- Eno's loop-based generativity (incommensurable cycles over consonant material) is cheap, proven, browser-native — the correct floor/fallback texture — but history says it caps at ambient; goal-directed tension needs the rule/grammar machinery ([tension-and-release.md](tension-and-release.md), [grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md)).
- Treat Iamus as a warning: well-formedness metrics plus novel surface ≠ listener value. Evaluation needs human ears in the loop ([listening-tests-and-feedback.md](listening-tests-and-feedback.md)).

## Open questions

- Is there any documented fully-autonomous system (no human curation) whose output listeners reliably *choose* to hear? Candidates: generative.fm (but each generator is heavily hand-tuned — arguably curation moved into the code), WolframTones (novelty toy). Worth a dedicated evaluation dig.
- How much of EMI's success was the database vs. the recombination grammar? Cope's writings are the source; a careful read (Cope 1996/2001) would sharpen the "LLM-authored signature bank" plan.
- Did any historical system solve *form* (10+ minute coherence) autonomously? Nothing found so far; see [form-and-structure.md](form-and-structure.md).

## Related pages

- [markov-and-statistical-models.md](markov-and-statistical-models.md) — the statistical thread in detail
- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) — CHORAL, counterpoint programs, CSP search
- [grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md) — hierarchical/grammar thread
- [stochastic-chaos-and-automata.md](stochastic-chaos-and-automata.md) — Xenakis's distributions, chaos, CA
- [machine-learning-music.md](machine-learning-music.md) — the ML era
- [ambient-and-generative-genre.md](ambient-and-generative-genre.md) — Eno lineage as a genre
- [minimalism-and-process-music.md](minimalism-and-process-music.md) — Reich/Riley process precedents
- [previous-experiments-lessons.md](previous-experiments-lessons.md) — this project's own history
- [what-makes-music-good.md](what-makes-music-good.md) — the evaluation criterion behind "convincing"

## Sources

- Fernández, J. D. & Vico, F. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013). https://arxiv.org/abs/1402.0585
- Edwards, M. "Algorithmic Composition: Computational Thinking in Music." *Communications of the ACM* 54(7) (2011). https://www.pure.ed.ac.uk/ws/files/16205214/algorithmic_composition_AM.pdf
- Wikipedia, "Musikalisches Würfelspiel" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Musikalisches_W%C3%BCrfelspiel
- Wikipedia, "Illiac Suite" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Illiac_Suite
- Wikipedia, "Experiments in Musical Intelligence" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Experiments_in_Musical_Intelligence
- Lewis, G. E. "Too Many Notes: Computers, Complexity and Culture in Voyager." *Leonardo Music Journal* 10 (2000), 33–39. https://doi.org/10.1162/096112100570585 (open-access PDF: https://eamusic.dartmouth.edu/~larry/algoCompClass/readings/george%20lewis/lewis.too_many_notes.pdf)
- Eno, B. "Generative Music." Talk, San Francisco, 1996-06-08, transcript. https://www.inmotionmagazine.com/eno1.html
- Wikipedia, "Dynamic stochastic synthesis" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Dynamic_stochastic_synthesis
- Wikipedia, "Herbert Brün" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Herbert_Br%C3%BCn
- Eno, B. & Chilvers, P. Bloom (app page). https://www.generativemusic.com/bloom.html
- Bainter, A. Generative.fm. https://generative.fm
- Cope, D. (ed.). *Virtual Music: Computer Synthesis of Musical Style.* MIT Press, 2001 — incl. Hofstadter, "Staring Emmy Straight in the Eye — and Doing My Best Not to Flinch," pp. 33–82 (book not fetched; Hofstadter quote as widely reported from this essay).
