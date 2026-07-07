---
title: Composition craft
tags: [craft]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Recurring advice from composers and treatises across three centuries — economy of material, unity vs. variety, constraint as fuel, revision, trajectory, orchestration clarity, silence — distilled into a working checklist an engine can apply.
---

# Composition craft

Composers have left three centuries of practical testimony about how good pieces actually get made, and the advice is strikingly repetitive: build much from little, balance unity against variety, embrace constraints, revise ruthlessly, shape a trajectory with one high point, keep the texture clear, and use silence. This page organizes that advice by theme rather than chronology and ends with a checklist. It matters here because every one of these maxims translates into an engine design decision — most previous algorithmic-music failures (wandering output, uniform density, no arrival points) are violations of craft rules that human composers learn early.

## Economy of material: build much from little

The single most repeated piece of craft advice is to generate a whole piece from one or two small ideas rather than a parade of new ones.

- Beethoven's sketchbooks are the canonical evidence. He sketched continuously across his career, carried ideas for years, and in his middle period based entire movements on material stated in the opening bars (the "germ motive" practice). Reported by Louis Schlösser (an 1885 reminiscence, so treat the wording cautiously): "I carry my thoughts about me for a long time, sometimes a very long time, before I set them down."
- Schoenberg named the general technique developing variation: each new phrase is a variation of the basic motive, changing less-important features while preserving the more-important ones, so the piece grows instead of merely continuing. In his essay "Bach" (1950, in *Style and Idea*) he claims that "variation of the features of a basic unit produces all the thematic formulations which provide for fluency, contrasts, variety, logic and unity." He held Brahms to be the technique's most advanced practitioner.
- The flip side of economy is deletion. Brahms, in George Henschel's 1876 journal (published 1907): "It is not hard to compose, but it is wonderfully hard to let the superfluous notes fall under the table."

Engine translation: a piece should own a small motive inventory (one to three cells) and derive nearly everything by transformation — transpose, invert, augment, re-harmonize, fragment — rather than sampling fresh material per phrase. See [melody.md](melody.md) and [phrase-structure.md](phrase-structure.md).

## Unity vs. variety: the perennial balance

Every pedagogical treatise ends up teaching the same trade-off from a different angle.

- Fux's *Gradus ad Parnassum* (1725) teaches counterpoint as graded species: the student starts with note-against-note under severe restrictions and earns one new freedom at a time. Haydn worked through every exercise, Leopold Mozart taught Wolfgang from it, and Beethoven held it in great esteem. Its deep lesson is pedagogy-by-constraint: correctness first, freedom incrementally.
- Rameau's *Traité de l'harmonie* (1722) argues harmony is the rational foundation of music — "melody only proceeding from harmony" — and that composition rests on determinate rules drawn from a principle (the fundamental bass, chord inversion). Lesson: there is a layer of the craft that is genuinely rule-like and checkable.
- C.P.E. Bach's *Versuch über die wahre Art das Clavier zu spielen* (1753/1762), the treatise Haydn and Beethoven "swore by," insists the rules exist for expression: "A musician cannot move others unless he too is moved" (Part I, ch. 3, §13, trans. Mitchell). Lesson: correctness is necessary, not sufficient; every choice should serve an intended affect.
- Schoenberg's *Fundamentals of Musical Composition* (1967) states the balance most bluntly: "Intelligibility in music seems to be impossible without repetition," and comprehensibility requires limiting variety, especially when events come fast. See [repetition-and-familiarity.md](repetition-and-familiarity.md) and [musical-expectation.md](musical-expectation.md) for the psychology that vindicates him.

The treatise lineage converges: variety is only meaningful against an established norm, so establish the norm (key, meter, motive, texture) before departing from it, and return to it after.

## Constraint as creative fuel

Stravinsky's *Poetics of Music* (Harvard lectures, 1939–40; lesson 3) is the classic statement, and the famous version circulating online is close to the text. Verified wording: "The more constraints one imposes, the more one frees one's self of the chains that shackle the spirit," and "my freedom will be so much the greater and more meaningful the more narrowly I limit my field of action and the more I surround myself with obstacles." He adds that whatever diminishes constraint diminishes strength. Terror of infinite possibility is his stated reason — a composer facing everything can do nothing. Fux's species method institutionalizes the same idea. For an engine this is almost literal: unconstrained sampling spaces produce mush; hard constraints (voice-leading rules, a mode, a fixed bass pattern, a rhythmic grid) are what make the remaining choices audible as choices. See [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md).

## Revision and self-criticism

Composers describe composing as mostly rewriting. Beethoven's surviving sketchbooks show drafts revised at every stage — the retransition in the Sixth Symphony's first movement went through at least fourteen distinct drafts — and Gustav Nottebohm's pioneering sketch studies established that the polished "inevitable" final versions were won by brute iteration, often from unremarkable first ideas. Brahms burned works he judged inferior and sat on the First Symphony for about two decades. The craft lesson: generate, then select and improve against explicit criteria; first output is a draft. For an engine, the analog is generate-and-test — produce candidates, score them (rules, statistical models, learned metrics), keep and refine the best — rather than emitting the first sample. This is the core of the project's [improvement-loop.md](improvement-loop.md) and connects to [computational-music-metrics.md](computational-music-metrics.md).

## Beginning, middle, end: trajectory and the high point

Craft teaching treats a piece as a directed journey, not a texture. Alan Belkin's *Musical Composition: Craft and Art* (a working composition professor's distillation) organizes the whole subject around form as psychological progression: beginnings establish norms and promise, middles complicate and gain momentum, endings discharge accumulated tension; transitions and pacing get more attention than themes. Standard craft points:

- One main climax per piece/movement, placed late (commonly described as roughly two-thirds to three-quarters through), approached by compounding intensity (register, dynamics, harmonic rhythm, texture) and followed by a genuine wind-down. Schoenberg's *Fundamentals* supplies the wind-down mechanism: liquidation — progressively stripping a motive's characteristic features until only a cadence remains.
- Golden-section placement of climaxes (~61.8%) is craft lore, not established fact. Ernő Lendvai's golden-ratio analyses of Bartók popularized it, but Bartók himself never described any such principle, and later scholars (Jonathan Kramer's 1973 critique; Mario Livio) found Lendvai's numbers cherry-picked. "Put the peak somewhere past the middle, not at the end" is the defensible residue.
- Endings are disproportionately important and disproportionately hard; cadence, register descent, slowing harmonic rhythm, and thinning texture are the standard tools. See [tension-and-release.md](tension-and-release.md) and [form-and-structure.md](form-and-structure.md).

## Orchestration wisdom

Rimsky-Korsakov's *Principles of Orchestration* (posthumous; edited by Steinberg, completed 1912, first published 1913) is the standard craft source, with maxims that generalize beyond the orchestra to any synthesized texture:

- "To orchestrate is to create, and this is something which cannot be taught" — tone color is part of the composition, not a coat of paint applied afterward. Conceive material with its timbre.
- "In the orchestra there is no such thing as ugly quality of tone" — problems are problems of combination and register, not of instruments.
- Practical rules: put the melody in a penetrating register or the top voice; double in octaves for weight and firmness; keep the number of real parts small and the accompaniment out of the melody's register; write parts that are easy to play.

See [timbre-and-orchestration.md](timbre-and-orchestration.md) and, for the perceptual grounding of "keep parts apart," [auditory-perception-basics.md](auditory-perception-basics.md).

## Melody-first or harmony-first

Both workflows have distinguished defenders and neither won. Rameau derived melody from harmony and was opposed in his own century by the melody-first camp around Rousseau; pop practice today splits the same way (top-line writing over chord loops vs. harmonizing a found tune). The craft consensus is procedural, not doctrinal: commit to one driver per piece so the other can be shaped to serve it, and check the neglected dimension afterward (does the harmony progress? does the top line sing?). An engine should likewise have an explicit driver per piece — a harmonic skeleton that melodies decorate, or a melody that harmony supports — rather than co-sampling both weakly. See [harmony.md](harmony.md), [melody.md](melody.md), [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md).

## Silence and space

Debussy, to Ernest Chausson while composing *Pelléas* (2 October 1893): "Quite spontaneously I've made use of a means of expression that seems to me quite special, which is silence — don't laugh!" (The floating aphorism "music is the space between the notes," attributed variously to Debussy and Mozart, is unverifiable — treat as apocryphal.) The practical rule appears in every orchestration and arranging text: rests articulate phrases, silence before an event magnifies it, and continuous full texture numbs the ear. Generated music fails here constantly — engines tend to emit sound at uniform density. Budget silence like a resource: phrase gaps, dropped voices, a genuine general pause before a structural arrival.

## A composer's working checklist

Synthesized from the sources above; phrased so an engine (or a session reviewing engine output) can check each item:

1. Can you name the piece's basic motive(s)? Is most material derivable from them?
2. Is there a clear norm (key/mode, tempo, meter, texture) established early — and at least one meaningful departure and return?
3. What constraints is this piece obeying? If "none," tighten until choices become audible.
4. Where is the single main climax? Does intensity compound toward it and discharge after it?
5. Does anything repeat exactly? (It should.) Does anything repeat too exactly, too often?
6. Is the melody in the most audible register/voice? Are accompaniment parts out of its way?
7. How many real parts sound at once? (More than three or four rarely reads as more.)
8. Where is the silence? Do phrases breathe?
9. Does the ending act like an ending (cadence, descent, dissolution) rather than a stop?
10. Would deleting a section hurt? If not, delete it — superfluous notes under the table.

## Implications for generative engines

- Architect around motive economy: represent a piece as a small set of cells plus a transformation vocabulary, and log which transformation produced each phrase — auditable developing variation.
- Make constraints first-class: a piece spec should declare mode, meter, voice-count, register lanes, and allowed dissonance treatment before any notes are sampled; generation fills a constrained space.
- Implement generate-test-revise, not single-pass emission: candidate phrases scored against rule checks and statistical fit, with rejection sampling or local search as the "revision" stage.
- Plan the trajectory before the notes: choose climax position (past the midpoint, not at golden-section precision), assign each section a tension level, and drive surface parameters (register, density, dynamics, harmonic rhythm) from that plan. Use liquidation-style feature-stripping to end sections.
- Enforce texture hygiene from Rimsky-Korsakov: melody register reserved, ≤3–4 real parts (a general textural ceiling, looser than [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md)'s ≤3 concurrent *independent* lines — Huron's tighter number governs how many streams a listener can track as separate, not how many parts a texture may contain if some double or share rhythm), octave doubling as a deliberate weight control (see [timbre-and-orchestration.md](timbre-and-orchestration.md)).
- Schedule silence explicitly (phrase gaps, voice rests, pre-climax pause); density should be a composed curve, not a constant.
- Treat expression as a goal per C.P.E. Bach: every section spec should carry an intended affect that maps to concrete parameters (see [emotion-and-meaning.md](emotion-and-meaning.md), [expressive-performance.md](expressive-performance.md)).

## Open questions

- Which subset of these craft rules gives the largest audible quality gain per line of code? (Candidate experiment for the [improvement-loop.md](improvement-loop.md).)
- Can "revision" be meaningfully implemented as post-hoc editing of a generated draft (delete/tighten passes), rather than filtering candidates during generation?
- How much of Fux-style constraint pedagogy transfers to non-tonal or ambient targets where "correctness" is less defined? See [ambient-and-generative-genre.md](ambient-and-generative-genre.md).

## Related pages

- [melody.md](melody.md), [phrase-structure.md](phrase-structure.md), [form-and-structure.md](form-and-structure.md) — where motive economy and trajectory live
- [tension-and-release.md](tension-and-release.md) — the climax mechanics
- [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md), [timbre-and-orchestration.md](timbre-and-orchestration.md) — texture rules
- [repetition-and-familiarity.md](repetition-and-familiarity.md), [musical-expectation.md](musical-expectation.md) — why the unity/variety balance works
- [constraint-and-rule-based-methods.md](constraint-and-rule-based-methods.md), [generative-music-design-patterns.md](generative-music-design-patterns.md) — implementing constraint and revision
- [what-makes-music-good.md](what-makes-music-good.md) — the evaluation side of craft
- [western-classical-tradition.md](western-classical-tradition.md) — the style context of most sources here

## Sources

- Igor Stravinsky, *Poetics of Music in the Form of Six Lessons*, Harvard University Press, 1947 (1939–40 lectures) — https://archive.org/details/stravinsky-igor-poetics-of-music-in-the-form-of-six-lessons
- Arnold Schoenberg, *Fundamentals of Musical Composition*, Faber, 1967 (full text) — https://archive.org/stream/SchoenbergArnoldFundamentalsOfMusicalComposition/Schoenberg%20Arnold_Fundamentals%20of%20Musical%20Composition_djvu.txt
- "Developing variation," Wikipedia (Schoenberg quotes from *Style and Idea*, 1975) — https://en.wikipedia.org/wiki/Developing_variation
- "Beethoven's compositional method," Wikipedia (sketchbooks, Schlösser quote, Nottebohm, 14 drafts) — https://en.wikipedia.org/wiki/Beethoven%27s_compositional_method
- George Henschel, *Personal Recollections of Johannes Brahms*, 1907 (journal entry of July 1876) — https://s9.imslp.org/files/imglnks/usimg/0/07/IMSLP161893-PMLP290721-GHenschel_Personal_Recollections_of_Johannes_Brahms_ocr.pdf
- C.P.E. Bach, *Essay on the True Art of Playing Keyboard Instruments*, 1753, trans. W. J. Mitchell 1949, I.3 §13 — https://en.wikiquote.org/wiki/Carl_Philipp_Emanuel_Bach ; influence: https://en.wikipedia.org/wiki/Carl_Philipp_Emanuel_Bach
- Jean-Philippe Rameau, *Traité de l'harmonie*, 1722 — https://en.wikipedia.org/wiki/Trait%C3%A9_de_l%27harmonie_r%C3%A9duite_%C3%A0_ses_principes_naturels
- Johann Joseph Fux, *Gradus ad Parnassum*, 1725 — https://en.wikipedia.org/wiki/Gradus_ad_Parnassum
- Nikolai Rimsky-Korsakov, *Principles of Orchestration* (ed. Maximilian Steinberg; editing completed 1912, first published 1913; Agate trans. 1922), Project Gutenberg #33900 — https://www.gutenberg.org/files/33900/33900-h/33900-h.htm ; publication year per Britannica — https://www.britannica.com/topic/Principles-of-Orchestration
- Alan Belkin, *Musical Composition: Craft and Art* and free pedagogical guides — https://alanbelkinmusic.com/
- ETH Library, "Béla Bartók – the golden ratio in music" (Lendvai claim; Bartók's silence) — https://library.ethz.ch/en/collections-and-archives/platforms/virtual-exhibitions/fibonacci-un-ponte-sul-mediterraneo/reception-of-fibonacci-numbers-and-the-golden-ratio/bela-bartok-the-golden-ratio-in-music.html
- Jonathan Kramer, "The Fibonacci Series in Twentieth-Century Music," *Journal of Music Theory* 17(1), 1973 (critique of Lendvai; print).
- Claude Debussy, letter to Ernest Chausson, 2 October 1893, on using silence while composing *Pelléas* (quotation as commonly translated); letter dated in "The Chausson Year: 1893" (Cambridge, *Claude Debussy*) — https://www.cambridge.org/core/books/abs/claude-debussy/chausson-year-1893/C387684120088212E546778D967082DA
