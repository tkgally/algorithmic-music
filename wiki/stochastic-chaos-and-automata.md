---
title: Stochastic processes, chaos, and automata
tags: [algorithms]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Randomness, 1/f noise, chaos, cellular automata, and swarms as musical raw material — what each demonstrably contributes, and why every one of them needs musical constraints layered on top.
---

# Stochastic processes, chaos, and automata

Random processes, chaotic maps, cellular automata, and swarm simulations all generate endless, self-driving pattern for near-zero code — which is why every generation of algorithmic composers (and this project's previous engines, with their seeded RNGs and weighted walks) reaches for them. The sixty-year verdict of the literature is consistent and blunt: these are *raw material generators*. Their output becomes music only through musically informed mappings, constraints, and filters. This page collects what each source actually provides, the evidence around 1/f structure (the one genuinely load-bearing psychoacoustic result here), and the failure modes to design against.

## Randomness and the mapping problem

Any number stream can be mapped to any parameter; the recurring error is assuming structure in the stream survives an arbitrary mapping. It does not: mappings that ignore tonal, metric, and phrase syntax produce output heard as arbitrary regardless of the generator's mathematical elegance (the survey literature repeatedly reaches this conclusion for fractals, chaos, and CA alike — "not suitable to produce melodies or compositions in their own right, but... inspiration or raw material," Fernández & Vico 2013). Guido's vowel mapping (~1026) already had this defect ([algorithmic-composition-history.md](algorithmic-composition-history.md)). Design rule: choose the *musical* target first (degree in current mode, subdivision slot, dynamic tier), then map the stream onto that quantized, syntax-aware space — never raw frequency or raw milliseconds.

## Probability distributions as compositional material: Xenakis

Xenakis is the proof that distributions can be handled artistically. *Pithoprakta* (1955–56) shapes string-glissando textures on the Maxwell–Boltzmann velocity distribution; *Achorripsis* (1956–57) fills a time × timbre-class matrix by the **Poisson distribution** — expected event counts per cell, with the piece's drama living in the deviation structure; the ST pieces (from 1962) automated this in his Stochastic Music Programme (Edwards 2011; Fernández & Vico 2013). Late GENDY3 (1991) and S.709 (1994) pushed stochastics into the waveform: breakpoints of a polygonal wave take random walks in amplitude and duration, bounded by elastic barriers/mirrors that reflect the walk back into range — composition and synthesis unified by one process (Wikipedia, "Dynamic stochastic synthesis"). Transferable techniques, independent of Xenakis's avant-garde idiom: (1) **distribution as density scheduler** — Poisson event counts per (time-window × instrument) cell is an excellent texture governor for ambient and percussion layers; (2) **bounded random walks with reflecting barriers** — useful anywhere a parameter should wander expressively but never escape (register, filter cutoff, tempo drift); (3) distributions govern *mass*, not line — they say how many and how dense, not which note resolves where.

## Random walks and their statistical signature

A random walk (each value = previous ± small step) is brown noise: power spectrum ∝ 1/f². Melodically it is stepwise and locally smooth — which is why walk-based melody generators (including this project's) sound superficially melodic — but its excursions are unbounded and its correlation never decays, so it *meanders*: no return obligation, no hierarchy of departures. Listeners in Voss & Clarke's experiments judged brown-noise melodies "too correlated"/dull next to 1/f ones, and white-noise melodies too random (Voss & Clarke 1978; Fernández & Vico 2013). The musical fixes are known: reflecting barriers (Xenakis), mean-reversion toward a center tone, and — better — replacing the walk with goal-directed elaboration ([grammars-and-rewriting-systems.md](grammars-and-rewriting-systems.md), [melody.md](melody.md)).

## 1/f (pink) structure: the evidence, carefully

The claims, in decreasing order of solidity:

1. **Voss & Clarke (1975/1978):** loudness and pitch *fluctuation spectra* of music (and speech) approximate 1/f at low frequencies (<~1 Hz) across genres; and melodies generated from 1/f sources were judged more pleasing/musical than white (1/f⁰) or brown (1/f²) equivalents by listeners from novices to professionals (Voss & Clarke 1978). The generation result has replicated well informally and grounds the standard reading: 1/f sits between boring and chaotic, correlated at every timescale — self-similar interest (Fernández & Vico 2013).
2. **Later scrutiny of the analysis claim:** Voss & Clarke's spectra came from hours-long radio recordings — many pieces plus announcer speech concatenated — so the measured 1/f may partly be an artifact of mixing; single works do not show it cleanly (Nettheim 1992's critique, as summarized by Fernández & Vico 2013). Modern careful measurement (Nelias & Geisel 2024, ~450 years of compositions) finds pitch series follow power-law correlations **only up to a cutoff** of roughly 4–100 quarter notes depending on the piece, with a plateau (no correlation) beyond — long-range correlation, yes; scale-free 1/f across whole works, no.
3. **Rhythm:** Levitin, Chordia & Menon (2012, PNAS) analyzed rhythm spectra in ~2,000 movements of Western classical music and found 1/f^β power laws (β varying ~0.5–1) with **composer-specific exponents** — reportedly Beethoven among the most predictable rhythmically, Mozart among the least — suggesting spectral exponent works as a stylistic signature rather than one universal constant.
4. **Overclaim zone:** "music is fractal," golden-section form analyses, and number-sequence sonifications. Evidence for deliberate or perceptually meaningful self-similar *form* is weak and contested (Edwards 2011 notes the long-running debate over how conscious proportional schemes ever were); treat as numerology unless a specific measurable claim is on the table.

Practical upshot: 1/f is a *defensible default texture for fluctuation parameters* — Voss's algorithm (sum of several held-and-resampled random sources, resampled at octave-spaced rates) is ~10 lines of JS and gives pink control signals for dynamics, tempo drift, density, and ornament rate. For pitch it beats white and brown walks but still needs tonal/phrase syntax on top; and per Nelias & Geisel, real music's correlations *reset* at phrase/section scale — an argument for generating correlated streams per phrase rather than one infinite stream ([rhythm-and-meter.md](rhythm-and-meter.md), [complexity-and-preference.md](complexity-and-preference.md)).

## Chaos: logistic maps and strange attractors

Deterministic chaos (logistic map iterates, Lorenz/Hénon attractor orbits) offers unpredictability with underlying structure and sensitive dependence — attractive in theory as "organic variation." Practice, per the survey record (Pressing 1988; Bidlack 1992; Leach & Fitch 1995; Fernández & Vico 2013): raw chaotic orbits mapped to pitch sound like wandering noodling with occasional repetitive traps; the attractor's geometry is not audible as *musical* structure because the ear has no access to phase space, only to the (arbitrary) mapping. Where chaos earns a place: as a *variation operator* (perturb a known pattern's parameters within an attractor's bounded wandering — Coca et al. 2011 use chaos to add variation to otherwise conventional melody, per Fernández & Vico 2013), and as slow LFO-like control curves that never exactly repeat. The logistic map at r slightly under/over period-doubling thresholds is a two-line JS oscillation source between repetition and surprise; use it on secondary parameters, not on note choice.

## Cellular automata

CAs update a lattice of cells by local neighbor rules. Wolfram's four classes (I fixed, II periodic, III chaotic, IV complex/edge-of-chaos) organize the design space; class IV rules (e.g., rule 110, Game of Life) are the musically interesting ones — persistent moving structures against evolving backgrounds. The musical record (Fernández & Vico 2013, §3.6.1): Xenakis reportedly used a CA for structure in *Horos* (1986), heavily hand-edited; Beyls, Millen, and Hunt et al. built CA-to-MIDI systems from 1989–91; **Miranda's CAMUS** (1993) mapped Game-of-Life cells to three-note sequences with a second CA (crystalline growth) choosing instrumentation — and Miranda himself concluded its output was raw material needing hand editing rather than music; **WolframTones** (2005) searched a four-billion-rule 1D-CA space for complex patterns and mapped them through style presets — a genuinely fun novelty generator whose musicality lives almost entirely in the scale/instrument/style mapping layer, not the CA. Honest summary: CAs excel at *evolving spatial texture* — step-sequencer grids (one row = one timestep, columns = a scale or drum kit) where class II–IV dynamics read directly as evolving riffs — and at long-timescale novelty; they know nothing of phrase or cadence, so they need the same syntax layer as everything else.

## Swarms and boids

Reynolds's boids (1987) — separation, alignment, cohesion — self-organize convincing collective motion; Blackwell's Swarm Music/Swarm Granulator (2003–2007) place swarm agents in a "music parameter space" where captured human events become attractors, converting flock geometry into notes/grains: the swarm improvises *with* players, novelty arising from emergent patterning (Blackwell 2007). Character: swarms give organic ensemble drift and call-response gravitation — good for interactive/ambient texture, unproven for composed structure. A 20-boid 2D swarm mapped to (register, density) or (pan, brightness) per voice is cheap in JS and gives correlated-but-independent voice motion that plain per-voice RNG lacks.

## The consistent lesson

Every subsection ends the same way, and the survey literature says it explicitly: stochastic/chaotic/automaton sources supply **variation, texture, and endlessness**; musical sense comes from **constraints, mappings into musical syntax, and filters** layered on top (Fernández & Vico 2013; Edwards 2011). The productive question is never "which generator sounds best raw?" but "which generator, under which musically informed mapping, feeds which constraint system?" — see [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) and [generative-music-design-patterns.md](generative-music-design-patterns.md). The previous engines' shortfall was not using randomness, but asking randomness to carry intention it cannot represent ([previous-experiments-lessons.md](previous-experiments-lessons.md), [generative-music-failure-modes.md](generative-music-failure-modes.md)).

## Implications for generative engines

- Build a small **stochastic toolkit module** (seeded): uniform/weighted choice, Gaussian, Poisson event counts, bounded/mean-reverting walks with reflecting barriers, Voss-style pink-noise streams, logistic-map oscillators. Every engine imports it; no engine treats it as a composer.
- Use the right source per job: Poisson → event density per window; pink → slow expressive fluctuation (dynamics, tempo, ornament rate, voice density); bounded walk → register/timbre drift; logistic map → almost-repeating accompaniment variation; CA grid → evolving step patterns; swarm → correlated multi-voice motion in interactive/ambient modes.
- Route every stochastic pitch decision through musical quantization (current scale/degree weights, chord membership, voice-leading limits) and every rhythmic one through the metric grid — mappings must land in syntax space, never raw parameter space.
- Respect the correlation-cutoff finding: generate correlated streams *per phrase/section* and re-anchor at boundaries, instead of one endless stream — matches measured music (Nelias & Geisel 2024) and prevents hour-scale drift.
- Adopt 1/f as the default *fluctuation* spectrum wherever a parameter needs "alive but not jumpy" (this is cheap and evidence-backed), but never cite it as sufficient for melody quality — Voss & Clarke's own melodies were pleasing only *relative to white/brown*, not good absolutely.
- Log seeds and distribution parameters with every render so a future session can reproduce and diagnose any texture ([improvement-loop.md](improvement-loop.md)).

## Open questions

- Is there a perceptual experiment isolating *how much* 1/f fluctuation in dynamics/timing improves listener ratings of otherwise rule-generated music? (Would justify effort allocation; ties to [expressive-performance.md](expressive-performance.md).)
- Do class-IV CA step-sequences outperform hand-designed pattern variation in listener tests, or is their appeal visual/conceptual? Cheap A/B once the evaluation harness exists ([listening-tests-and-feedback.md](listening-tests-and-feedback.md)).
- Nelias & Geisel's cutoff (4–100 quarter notes) vs. our phrase lengths — can matching generated correlation lengths to genre-typical cutoffs serve as a computable style target ([computational-music-metrics.md](computational-music-metrics.md))?

## Related pages

- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md) — the filter layer these sources require
- [generative-music-design-patterns.md](generative-music-design-patterns.md) — generator-plus-critic patterns
- [markov-and-statistical-models.md](markov-and-statistical-models.md) — the adjacent statistical family
- [melody.md](melody.md) — why walks meander and what replaces them
- [rhythm-and-meter.md](rhythm-and-meter.md) — metric grids that mappings must respect
- [complexity-and-preference.md](complexity-and-preference.md) — the between-boredom-and-chaos result generalized
- [ambient-and-generative-genre.md](ambient-and-generative-genre.md) — where texture generators are most at home
- [algorithmic-composition-history.md](algorithmic-composition-history.md) — Xenakis in context

## Sources

- Voss, R. F. & Clarke, J. "'1/f noise' in music: Music from 1/f noise." *J. Acoustical Society of America* 63(1) (1978). https://pubs.aip.org/asa/jasa/article/63/1/258/765970
- Levitin, D., Chordia, P. & Menon, V. "Musical rhythm spectra from Bach to Joplin obey a 1/f power law." *PNAS* 109(10) (2012). https://www.pnas.org/doi/10.1073/pnas.1113828109
- Nelias, C. & Geisel, T. "Stochastic properties of musical time series." (2024). https://pmc.ncbi.nlm.nih.gov/articles/PMC11519375/
- Fernández, J. D. & Vico, F. "AI Methods in Algorithmic Composition: A Comprehensive Survey." *JAIR* 48 (2013), §3.6 (incl. Nettheim 1992 critique, CAMUS, WolframTones). https://arxiv.org/abs/1402.0585
- Edwards, M. "Algorithmic Composition: Computational Thinking in Music." *CACM* 54(7) (2011). https://www.pure.ed.ac.uk/ws/files/16205214/algorithmic_composition_AM.pdf
- Wikipedia, "Dynamic stochastic synthesis" (accessed 2026-07-06). https://en.wikipedia.org/wiki/Dynamic_stochastic_synthesis
- Blackwell, T. "Swarming and Music." In Miranda & Biles (eds.), *Evolutionary Computer Music*, Springer (2007). https://link.springer.com/chapter/10.1007/978-1-84628-600-1_9
