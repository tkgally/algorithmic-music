---
title: Phrase structure
tags: [theory]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: The phrase as the basic unit of musical syntax — sentence and period archetypes, cadences as punctuation, hypermeter and the 4/8-bar norm, and why bar-by-bar generation without phrase syntax sounds aimless.
---

# Phrase structure

The phrase, not the note or the bar, is the basic unit of musical *syntax* — the smallest span that presents a complete musical thought and ends with a punctuation mark (a cadence). A melody is heard as a sequence of phrases the way a paragraph is heard as a sequence of sentences: each has an opening, a trajectory, and a close, and the closes are graded (some are commas, some are full stops). The single biggest identified failure of this project's previous engines is that they generated music bar by bar — choosing the next chord or note from local transition rules — with **no phrase-level scaffolding at all**. The result was music that never seemed to ask a question or answer one, never breathed, never arrived: aimless by construction. This page is therefore load-bearing. If future engines adopt one structural idea, it should be the phrase and its cadence.

## What a phrase is

A phrase is a unit of tonal/melodic motion that spans from an initiation to a cadence, typically **four bars** in common-practice and most popular music (sometimes two, or eight). It is defined more by its goal-directedness — it goes somewhere and stops — than by any fixed length. Two internal features matter most for generation:

1. It has a **beginning, middle, and end** with different functions: an idea is stated, then developed or answered, then closed.
2. It ends with a **cadence** whose strength signals how final the stop is.

Below the phrase sit motives and *subphrases* (see [melody](melody.md)); above it sit phrase pairs, periods, and whole sections (see [form-and-structure](form-and-structure.md)).

## Cadences: the punctuation marks

Cadences are the grammar of arrival. Their relative strength is what lets a listener parse structure. The standard tonal types (Roman numerals; scale degrees as do=1):

- **Perfect Authentic Cadence (PAC)** — V(7)->I, both in root position, melody landing on **do (1)**. The strongest close; a full stop. Reserve for phrase and section *ends*.
- **Imperfect Authentic Cadence (IAC)** — V->I but weakened: melody ends on **mi (3)** or **sol (5)**, or a chord is inverted. A softer full stop / strong comma.
- **Half Cadence (HC)** — ends *on* V (does not resolve to I); melody often on **re (2)**, ti, or sol. A colon or question mark — it demands continuation. The characteristic antecedent ending.
- **Deceptive Cadence (DC)** — V->vi (or another non-tonic); sets up a resolution then dodges it. A powerful way to *extend* a phrase and delay closure.
- **Plagal Cadence (PC)** — IV->I; the "amen," often a post-cadential confirmation *after* a PAC rather than the main structural close.

The engine takeaway: choose the cadence *first*, as a target for the phrase, then compose the melody and harmony to reach it. Grade the cadences across a passage so that weak endings (HC, IAC, DC) create forward pressure and strong endings (PAC) release it.

## The two classical phrase archetypes

Two schemas from Schoenberg (via William Caplin's formal-function theory) cover a huge fraction of tonal phrase construction. Both normatively occupy eight bars.

### The sentence (2 + 2 + 4)

- **Presentation (bars 1-4):** a two-bar **basic idea**, then its **repetition** — exact, transposed (statement-response, e.g. tonic version then dominant version), or sequential. This establishes the material over prolonged tonic.
- **Continuation (bars 5-8):** builds momentum toward the cadence via **fragmentation** (shorter units), **liquidation** (stripping the idea to generic figures), **sequence**, and **acceleration of harmonic rhythm** (chords changing faster). Ends with a cadence (often PAC or HC).

The sentence's logic is *statement -> restatement -> development-and-close*. Schoenberg considered it "a higher form of construction than the period" because it "at once starts a kind of development." Beethoven's Piano Sonata Op. 2 No. 1 opening is the textbook example.

### The period (antecedent + consequent)

- **Antecedent (bars 1-4):** a basic idea plus a contrasting idea, ending with a **weak cadence** (HC or IAC) — the "question."
- **Consequent (bars 5-8):** *restates* the basic idea (parallel period) or new material (contrasting period), ending with a **stronger cadence (PAC)** — the "answer."

The period's logic is **question -> answer**, built on cadential inequality: a weak stop balanced by a strong one. This antecedent-consequent, tension-then-resolution pairing is arguably the most portable idea in all of tonal phrase structure and maps directly onto the "call and response" heard across folk, jazz, blues, and pop.

Both archetypes can be **tight-knit** (regular, closed — good for themes) or **loose** (expanded, evaded — good for transitions and developments).

## Anacrusis, breathing, and phrase endings

Phrases rarely start exactly on a downbeat; an **anacrusis** (upbeat / pickup) is the norm and gives a phrase its launch. Equally important is what happens at the *end*: a phrase needs a small **breath** — a rhythmic gap, a longer final note (phrase-final lengthening), a drop in activity — so the ear can register the arrival before the next phrase begins. Continuous, un-punctuated eighth-note streams read as unshaped precisely because they never breathe. Phrase-final lengthening and a slight descent are near-universal (they mirror the motor/breath constraints noted in [melody](melody.md)).

## Hypermeter and the 4/8-bar norm

Bars themselves group into higher-level metric units: **hypermeter**, where whole bars act as "beats." Common-practice and popular music strongly favor **four-bar and eight-bar hypermeasures** — the "four-square" norm. William Rothstein's *Phrase Rhythm in Tonal Music* (1989) treats most tonal music as elaborating a normative four-bar **basic phrase**, with the surface complicated by:

- **Phrase expansion** — stretching a basic phrase past its normative length via a prefix, an internal expansion (e.g. sequential repetition), or a **suffix** (a tacked-on cadential extension). The underlying four-bar hypermeter is felt *through* the expansion.
- **Elision / overlap** — the last bar of one phrase *is* the first bar of the next; the cadence of arrival simultaneously launches a new phrase. This is how music avoids sounding like a string of disconnected four-bar boxes while keeping the boxes' clarity.
- **Metrical reinterpretation** — a bar heard as hypermetrically weak is re-heard as strong (or vice versa) at a phrase seam.

The design lesson: build on a 4/8-bar hypermetric grid as the default, then use expansion and elision to avoid mechanical squareness. Irregular phrase lengths (5, 6, 7 bars) are almost always heard as expansions/contractions *of* the norm, not as free-standing — so an engine should model them that way.

## Question-answer pairing

Across idioms, the deepest phrase-level principle is **paired inequality**: a first gesture that is open/unstable/questioning, answered by a second that is closed/stable/resolving. Classical period (HC then PAC), blues call-and-response, Baroque *Vordersatz/Nachsatz*, and pop's four-bar-open / four-bar-closed all instantiate it. An engine that pairs phrases this way — deliberately making phrase 1 end unresolved and phrase 2 resolve — gets long-range coherence almost for free.

## Pop and rock analogs

Popular music uses the same syntax with different labels:

- **Four-bar and eight-bar phrases** are the near-universal building block; sections are usually 8 or 16 bars.
- **AABA (32-bar) form:** a self-contained 8-bar strophe (A), repeated, a contrasting 8-bar **bridge** (B) that builds tension, then a return of A.
- **Verse-chorus:** verse (narrative, begins the cycle) and chorus (the hook-bearing goal), often with a prechorus that ramps tension into the chorus.
- **SRDC** (statement-restatement-departure-conclusion) is the pop equivalent of the sentence: an idea, its repeat, a departure, and a concluding gesture within a single verse.

Loop-based genres (much [electronic-and-dance](electronic-and-dance.md), [ambient-and-generative-genre](ambient-and-generative-genre.md)) relax cadential closure but still rely on 4/8/16-bar phrase grouping and on arrival points (drops, filter releases) that function as cadences.

## Why bar-by-bar generation sounds aimless

If each bar is chosen only from what came just before, the output has *local* plausibility but no *global* syntax: there is nothing that is "the question," nothing that "answers," no scheduled arrival, no graded punctuation, no breath. Listeners parse music into phrases automatically and will experience the absence of phrase structure as aimlessness even when every local transition is idiomatic. This is exactly what happened with the project's Markov chord-walk and random-walk melody engines. The fix is architectural, not parametric: **plan the phrase before filling it in.** See [generative-music-failure-modes](generative-music-failure-modes.md).

## Implications for generative engines

- **Make the phrase the unit of generation.** Default to a **four-bar phrase on an eight-bar hypermetric grid**; generate a whole phrase toward a chosen cadence rather than a bar at a time.
- **Pick the cadence first.** Assign each phrase a target cadence and grade strengths across the passage: within an 8-bar period, antecedent -> HC/IAC (weak), consequent -> PAC (strong). Use DC to extend when you want delay.
- **Implement both archetypes as templates.** Sentence: basic idea (2 bars) -> repeat/transpose (2) -> fragment + accelerate harmonic rhythm (4) -> cadence. Period: antecedent (4, weak cadence) -> consequent (4, restate + strong cadence).
- **Pair phrases as question-answer.** Force phrase 1 to end open and phrase 2 to resolve; this single rule buys long-range coherence.
- **Add an anacrusis** to phrase starts and a **breath** (rest or lengthened final note, ~half a beat to a beat) at phrase ends. Never run continuous subdivisions across a phrase boundary.
- **Model irregular lengths as expansions of 4/8.** Use suffixes (cadential extension) and internal sequential repetition to reach 5-7 bars; use **elision** (overlap the cadence bar with the next phrase's start) to break up mechanical squareness.
- **Accelerate toward cadences.** Increase harmonic rhythm and surface activity in the continuation/approach to a cadence; this is what makes an arrival feel earned (see [tension-and-release](tension-and-release.md)).
- **Reuse across genres.** The same 4/8-bar, question-answer, graded-cadence scaffolding underlies classical periods, AABA, verse-chorus, and dance loops — parameterize the cadence strength and closure, not the syntax.

## Open questions

- What is the right internal representation for a "cadence target" that generalizes across tonal, modal, and loop-based styles where V-I may not apply? Possibly an abstract stability/arrival scalar plus a style-specific realization.
- How strictly should the 4/8-bar grid be enforced before it reads as mechanical? Needs listening tests contrasting strict vs elided/expanded output.

## Related pages

- [melody](melody.md) — motifs and contour that fill phrases
- [form-and-structure](form-and-structure.md) — how phrases combine into whole-piece form
- [harmony](harmony.md) — cadential progressions
- [tension-and-release](tension-and-release.md) — cadence as tension resolution; approach acceleration
- [rhythm-and-meter](rhythm-and-meter.md) — hypermeter and phrase rhythm
- [musical-expectation](musical-expectation.md) — cadence as fulfilled/denied expectation
- [generative-music-failure-modes](generative-music-failure-modes.md) — aimlessness from missing phrase syntax
- [generative-music-design-patterns](generative-music-design-patterns.md) — phrase-planning architectures

## Sources

- "The sentence," Open Music Theory — https://openmusictheory.github.io/sentence.html
- "The period," Open Music Theory — https://openmusictheory.github.io/period.html
- "Classical cadence types," Open Music Theory — https://openmusictheory.github.io/cadenceTypes.html
- Robert Hutchinson, *Music Theory for the 21st-Century Classroom*, ch. 13 "Phrases in Combination" (sentence, period, elision) — https://human.libretexts.org/Bookshelves/Music/Music_Theory/Music_Theory_for_the_21st-Century_Classroom_(Hutchinson)/13%3A_Phrases_in_Combination
- "Sentence (music)" (Schoenberg/Caplin; Beethoven Op. 2 No. 1) — https://en.wikipedia.org/wiki/Sentence_(music)
- William Rothstein, *Phrase Rhythm in Tonal Music* (1989), summarized in JMTP teaching article — https://digitalcollections.lipscomb.edu/cgi/viewcontent.cgi?article=1230&context=jmtp
- "Form in pop/rock music" (AABA, verse-chorus, strophic, SRDC), Open Music Theory — https://openmusictheory.github.io/popRockForm.html
