---
title: Modal and nonfunctional harmony
tags: [theory]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: Harmony organized by modal color, common-tone proximity, and anchoring (drones, pedals, ostinato) rather than functional drive — the diatonic modes' characteristic degrees, the nonfunctional toolkit (planing, chromatic mediants, quartal, clusters, shuttles), the neo-Riemannian voice-leading that keeps it coherent, and engine designs (palette rotation, mediant-graph walk, drone rules, color clock) that differ from the cadence-first Piston walk.
---

# Modal and nonfunctional harmony

Most of the styles a comprehensive generative site will compose — folk, modal jazz, film underscore, ambient, post-rock, and many invented styles — run on harmony that does *not* work like the functional syntax in [harmony.md](harmony.md). There is no T–S–D grammar, no strong/weak root-motion asymmetry pulling toward a cadence, often no cadence at all. Coherence comes instead from **color** (a mode's characteristic notes, kept audible), **proximity** (chords chosen for shared tones and small voice motion), and **anchoring** (a drone, pedal, ostinato, or repeated palette holding a center that no dominant establishes). This page catalogs the modes in living practice, the nonfunctional toolkit, and — the load-bearing part — the specific mechanisms that keep nonfunctional progressions from wandering, which are different mechanisms than the ones [harmony.md](harmony.md) relies on.

## Two ways harmony coheres

Functional tonality coheres by *directed motion*: an asymmetric transition grammar and scheduled cadences make a passage feel aimed at a goal ([harmony.md](harmony.md)). Modal and nonfunctional harmony coheres by *centered stasis or smooth drift*: a tonic is asserted by repetition, register, and drone rather than won by a dominant, and motion away from it is judged by voice-leading smoothness and color, not by grammatical strength. The two are ends of a continuum — much real music (rock, film) mixes them — but they fail in different ways and need different generators. The failure mode here is not "wandering toward no cadence" but "losing the mode" (collapsing to plain major/minor) or "losing the center" (no anchor, so triads drift with no home).

## The diatonic modes in living practice

Each mode is the major scale started on a different degree, but in practice a mode is defined by its **characteristic scale degree(s)** — the one or two notes that distinguish it from the parallel major (Ionian) or natural minor (Aeolian). Keeping that note *sounding* is the whole discipline; a Dorian passage in which the ♮6 never appears is just minor. The note is projected by the mode's **characteristic chord**, the diatonic triad built to contain it. Roman numerals below are mode-relative (I or i = modal tonic; flat signs mark degrees relative to the parallel major/minor, following [harmony.md](harmony.md)'s notation).

| Mode | Character degree | Characteristic chord(s) | Signature progression | Typical home |
|---|---|---|---|---|
| Ionian | (major reference) | — | I–IV–V–I (functional) | common-practice, mainstream pop |
| Dorian | ♮6 (raised, "bright minor") | major **IV**; also ii | i–IV, i–♭VII–IV | Celtic/English folk, modal jazz, funk |
| Phrygian | ♭2 (dark, "Spanish") | major **♭II**; minor v | ♭II–i, i–♭II–♭VII | flamenco/Andalusian color, metal, menace cues |
| Lydian | ♯4 ("the Lydian note") | major **II**; ♯iv° | I–II–I | film wonder/wide-eyed awe, dream sequences |
| Mixolydian | ♭7 (subtonic) | major **♭VII** | ♭VII–I, I–♭VII–IV | rock, Celtic/English folk, funk, film Americana |
| Aeolian | ♭6 (vs Dorian's ♮6) | major **♭VI**; minor iv | i–♭VII–♭VI–♭VII, i–♭VI–♭VII | rock ballad/metal, film lament |
| Locrian | ♭2 **and** ♭5 | diminished tonic (unstable) | rare; needs non-triadic anchor | metal color, brief passages only |

Sources: [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/diatonic-modes/), Wikipedia "Mode (music)," and for modal *rock* specifically Biamonte 2010 and Moore. Locrian has no perfect fifth above its tonic, so its "tonic triad" is diminished and cannot stabilize by itself — it survives only over a drone or as passing color.

### Avoiding the leading tone

The single most important rule separating modal from functional harmony: **do not raise the ♭7 to a leading tone.** A leading tone (7̂ a semitone below the tonic) plus its dominant triad is exactly what manufactures functional pull to I; introducing it collapses Mixolydian or Dorian back into major/minor and destroys the mode. Wikipedia's summary: with a minor seventh degree "the seventh scale degree becomes a subtonic to the tonic," a whole tone below rather than a semitone below. This is why modal cadences use **♭VII–I** (Mixolydian), **♭II–i** (Phrygian), or **IV–i** (plagal/Dorian) in place of V–I. Historically this is a reversal: Renaissance composers *added* leading tones at cadences (musica ficta), progressively functionalizing the modes out of existence (see [medieval-and-renaissance-music.md](medieval-and-renaissance-music.md)); the modern modal idioms deliberately withhold them.

### Establishing a mode without a dominant

With no dominant to point at the tonic, a mode is asserted by other means, all cheap to implement: **a drone or pedal** on the modal final (the folk and Indian-classical method — see [indian-classical-music.md](indian-classical-music.md)); **first-and-last emphasis** (start and end phrases on the tonic, so repetition installs it — [tuning-and-scales.md](tuning-and-scales.md)'s Krumhansl point that hierarchy is felt through emphasis, not just membership); and **sounding the characteristic chord early and often** so the ear hears *which* mode rather than a generic scale. These are additive, not exclusive.

## Modal jazz (harmonic angle only)

Modal jazz is covered from the improvisation side in [jazz-and-improvisation.md](jazz-and-improvisation.md); here only what changed *harmonically*. Bebop packed two-plus chords per bar of ii–V–I motion; modal jazz (Davis/Evans, *Kind of Blue*, 1959) slowed harmony to **one scale per 4–16 bars**, often a **static two-chord form** ("So What" = 32-bar AABA, A on D Dorian, B on E♭ Dorian, one chord shuttling per section). The premise, drawn from George Russell's *Lydian Chromatic Concept*, is **improvise on the scale, not the changes** — the chord is a color field, not a functional station. Voicings went **quartal** to match: the "So What" chord is three stacked perfect fourths topped by a major third, which is deliberately root-ambiguous ("any member can function as the root," per Wikipedia) and so refuses the major/minor, tonic/dominant commitments that functional voicings assert. See quartal harmony below.

## The nonfunctional toolkit

Each device below is a way to make harmonic *color and motion* without functional syntax. Mechanism first, then canonical example.

- **Pandiatonicism** (Slonimsky's term): use the seven diatonic notes "in democratic equality" — added-note chords (2nds, 6ths), quartal spacings, nonfunctional bass — keeping strong tonality by pure scale membership while abandoning syntax (Copland, Stravinsky, Reich). Covered in [harmony.md](harmony.md); the point for modal work is that it is the "safe" nonfunctional style — everything stays consonant because everything is in one scale.
- **Planing / parallelism**: move every voice by the same interval, freezing a chord shape and sliding it. **Diatonic planing** keeps notes in one scale, so chord *quality* varies chord to chord (Debussy, "Dead Leaves"); **chromatic (real) planing** preserves the exact interval structure, needing accidentals, and "has a more striking sound since it is not governed by a larger tonality" ([Lavengood](https://musi216.meganlavengood.com/mm-lessons/debussy/); Wikipedia "Parallel harmony"). Planing "generally reduces or negates the effect of harmonic progression" — the parallel motion is the point; it is texture-as-harmony (Debussy, Ravel; jazz; house music).
- **Chromatic mediants**: the film-music workhorse (see below for the full taxonomy and why they sound "epic/wondrous"). Two triads a third apart, same quality, one common tone: C major → E major, C major → A♭ major. Link [film-and-game-music.md](film-and-game-music.md).
- **Quartal / quintal harmony**: build chords from stacked fourths (C–F–B♭) or fifths (C–G–D) instead of thirds. Fourth-chords are "ambiguous… rootless harmony" that dodge major/minor and "self-standing, free of any need to resolve" (McCoy Tyner, Bill Evans; earlier Debussy, Ravel, Bartók) — ideal over modal vamps and for open, "modern" color (Wikipedia "Quartal and quintal harmony").
- **Cluster / secundal harmony**: three-plus adjacent scale tones sounded together; "the individual pitches are of secondary importance; it is the sound mass that is foremost" (Cowell, Ives; later Penderecki, Ligeti). Clusters are sonority and texture, not progression — chromatic (semitone), diatonic (white-key), or pentatonic (black-key) flavors give harsh, soft, or shimmering masses respectively (Wikipedia "Tone cluster"). Useful as an ambient/color layer, not a chord grammar.
- **Polychords / bitonality** (briefly): stack two triads (F/C notation), which "may suggest bitonality or polytonality." The canonical case is Stravinsky's *Petrushka* chord (C major over F♯ major — two triads a tritone apart). A polychord differs from an extended tertian chord by emphasizing the *independence* of its two halves (Wikipedia "Polychord"). Powerful but easy to make muddy; use sparingly and with register separation.
- **Drone + dyad harmony**: a sustained root (or root-plus-fifth open dyad) with a small moving upper voice. This is the harmonic engine of most folk and much post-rock and ambient — the drone *is* the tonic, and "chords" are just which scale tones happen to sound over it. See [ambient-and-generative-genre.md](ambient-and-generative-genre.md), [european-folk-and-dance.md](european-folk-and-dance.md).
- **Static / oscillating two-chord harmony (shuttles)**: two chords rocking back and forth with no cadential intent — Moore's typology of rock "chord shuttles" names Dorian (i–IV), plagal (I–IV), submediantal (i–♭VI), subtonic (I–♭VII), and others; Spicer (MTO 2017) analyzes how such vamps generate a tonic by sheer repetition even when no cadence confirms it ("emergent tonics"). The i–♭VII shuttle and i–♭VII–♭VI loops are the load-bearing harmony of vast amounts of [rock-and-pop.md](rock-and-pop.md) and film.
- **Minimalist loop harmony**: a fixed short diatonic/modal cell repeated, harmony changing only by slow rotation or added inflections. The *process* is covered in [minimalism-and-process-music.md](minimalism-and-process-music.md) (don't re-cover); the harmonic point is that a very small consonant palette plus repetition makes coherence almost automatic — the loop is the anchor.

## What makes nonfunctional harmony cohere

This is the section that matters for generation. Absent cadences, five mechanisms carry coherence; strong nonfunctional writing stacks several.

### Common-tone retention

The cheapest coherence device: keep at least one pitch held (or repeated) across a chord change. The retained tone is a thread the ear follows, so even a chromatic, non-diatonic shift reads as *connected* rather than as a non sequitur. This is exactly why **chromatic mediants** (one common tone) sound smooth despite leaving the key, and why **common-tone modulation** works. A generator that maximizes common tones between successive chords will almost never sound abrupt.

### Parsimonious voice leading (neo-Riemannian P/L/R)

Neo-Riemannian theory ([harmony.md](harmony.md) introduces it) maps how *little* voices must move between triads. Three basic moves connect any major/minor triad to a partner that shares **two common tones**, moving the third voice by only 1–2 semitones (Cohn 1996):

- **P (Parallel)**: C major ↔ C minor. Root and fifth held (C, G); the third slides a semitone (E↔E♭).
- **L (Leading-tone exchange)**: C major ↔ E minor. Third and fifth held (E, G); the root drops a semitone (C→B).
- **R (Relative)**: C major ↔ A minor. Root and third held (C, E); the fifth rises a whole tone (G→A).

Chaining these traces the paths film and late-Romantic composers actually walk (Cohn; Lehman 2018). Alternating **P and L** generates the **hexatonic cycle** — C+ → C− → A♭+ → A♭− → E+ → E− → C+ — the six-chord "magical/dreamlike" drift that Williams, Elfman, and Shore live on. A single **L** between minor triads is the "Tarnhelm"/enchantment sound; the compound **LPL = the "hexatonic pole"** (C major → A♭ minor) is Cohn's *uncanny* progression — and it is the payoff case for distinguishing coherence metrics: the hexatonic pole has **zero common tones** yet is **maximally smooth** (all three voices move by exactly one semitone). Smoothness (small total voice motion) and common-tone count are *different* measures; most cohering progressions score well on one or both, and the rare "wow" progression trades common tones for pure smoothness. The **Tonnetz** (a triangular pitch lattice) is the map these live on; an engine can literally walk it (Wikipedia "Neo-Riemannian theory").

Why chromatic mediants read as "epic/wondrous": Lehman (*Hollywood Harmony*, 2018) argues film harmony "prioritizes expressive and associative aspects over structural coherence," and that chromatic-third motion is the prime evoker of *wonder* — one common tone keeps a foot inside familiar tonality while the chromatic root shift steps outside the diatonic frame, producing awe without disorientation. Murphy (MTO 2006; JMT 2023) shows the more extreme two-triad pairs get conventionalized meanings: two major triads a **tritone** apart (C major ↔ F♯ major, no common tone, maximal voice-leading displacement) became Hollywood's standard "outer space / the cosmic" sound, precisely because "this maximal musical span well analogizes the vast distances of outer space." These associations are **learned cinematic conventions, not acoustic universals** — treat them as style knowledge (they work because audiences have been trained), which is the honest framing [tuning-and-scales.md](tuning-and-scales.md) applies to consonance generally.

### Bass-line logic

When the chords don't imply direction, the *bass* can supply it: a **pedal point** (hold the tonic under everything — the strongest anti-wander device, per [harmony.md](harmony.md)), a **stepwise bass** (a scalar descent/ascent that the upper chords harmonize), or an **ostinato** (a repeated bass figure that anchors by pattern). A coherent bass line lets the upper harmony be as colorful or nonfunctional as one likes; the listener tracks the bass.

### Rotation / palette cycling

Fix a small **palette** of 3–5 chords chosen for shared color (all in one mode, or all sharing a common tone) and cycle through it with variation — different order, different voicing, added/dropped tones. This is how loop-based pop, film ostinato, and minimalist harmony work: coherence comes from the *closed, repeated set*, and interest from re-voicing and re-ordering rather than from new chords. The palette is the anchor.

### Registral and timbral consistency

Keep voicing spacing, register, and instrumentation stable across changes and even wild harmonic moves read as *color shifts within one texture* rather than as ruptures. Planing exploits this literally (identical shape, only transposed). A chromatic mediant voiced in the same register with the same instrument sounds like a magical recoloring; the same chord entered with a register jump and a new timbre sounds like an edit. Consistency of the *frame* buys freedom in the *content*.

## Modal melody–harmony coordination

The melody must **stay in the mode**, which mostly means: sound the characteristic degree, and never sound its functional "correction." The productive danger is a **modal cross-relation** that is the mirror image of the functional-minor one flagged in [findings-tonal-phrase-composer.md](findings-tonal-phrase-composer.md): there, a *natural*-minor melodic ♭7/♭6 clashed against a *harmonic*-minor chordal ♯7 near a cadence (the fix is to raise the melody). In modal music the roles reverse — the mode's ♭7 is *correct*, and the hazard is accidentally introducing a **♯7 leading tone** (in a voice, a passing tone, or a borrowed V chord) against the modal ♭7, which both creates an ugly cross-relation *and* functionalizes the passage, killing the mode. The modal rule is therefore stricter and simpler than the functional one: **keep the characteristic degrees consistent across all voices; introduce no leading tone.** For voice-leading mechanics of cross-relations see [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md); for melodic construction, [melody.md](melody.md).

## Implications for generative engines

These are distinct generators from the cadence-first **Piston-table walk** of the tonal-classical composer ([findings-tonal-phrase-composer.md](findings-tonal-phrase-composer.md)). That engine's coherence comes from an *asymmetric* transition table walked *backward from a fixed cadence* toward I — direction is the whole point. The engines below are **symmetric and cyclic**: they have no cadential goal, and get coherence from color, common tones, and anchoring instead. Do not blend the two grammars accidentally (the [harmony.md](harmony.md) warning).

- **Palette-rotation progression engine.** Sample a 3–5-chord palette that obeys one mode's color (must include the characteristic chord, e.g., major IV for Dorian, ♭VII for Mixolydian). Then cycle it, choosing each next chord by a **common-tone constraint** (prefer a successor sharing ≥1 tone with the current chord; re-voice to actually hold the shared tone in a real voice). Vary by re-ordering and re-voicing, not by adding new chords. This is the modal counterpart to loop-mode harmony and the low-risk default for folk, modal-jazz, and post-rock engines.
- **Mediant-graph walk (film color).** Build a graph over the 24 major/minor triads with edges = P/L/R moves plus chromatic-mediant moves; weight edges by common-tone count (usually take smooth, high-common-tone edges; occasionally take a 0-common-tone **hexatonic-pole** or **tritone** edge to spend a deliberate "wonder"/"cosmic" moment). Random-walk it, but **anchor**: hold a tonic or dominant pedal, and return to a home triad every 4–8 chords, exactly as [harmony.md](harmony.md) prescribes for neo-Riemannian chains — an unanchored walk drifts luxuriously and loses the center.
- **Drone-compatible harmony rules.** Over a tonic drone (root, or root+fifth open dyad), admit a chord only if its root/third/fifth forms a consonance with the drone pitches (unison, P5/P4, M3/m3, M6) and reject any chord that puts a m2/M7 or a bare tritone against the drone root or fifth. This yields the set of "chords that sit on the pedal" for a given mode (e.g., over a D drone in D Dorian: i, IV, ♭VII, ♭III as a consonant 6th, v) and is the harmony layer for ambient/folk/raga-adjacent engines.
- **Mode-color enforcement (a "color clock").** Track bars since the characteristic degree last sounded (in the melody or via the characteristic chord); if it exceeds a threshold N (e.g., 2–4 bars), force the characteristic chord or a melodic emphasis of the degree. This is the concrete guard against the modal failure mode — silently decaying into plain major/minor — and it costs almost nothing.
- **A hard no-leading-tone constraint** in modal mode: filter out any V (major dominant) or ♯7 in melody/inner voices unless the engine has deliberately switched to a functional passage. Cheap, and it is the difference between "Mixolydian" and "major that keeps flatting the 7th by accident."
- **Log the anchor and the color.** Record which anchoring device (drone / pedal / ostinato / palette) and which mode/characteristic-degree budget produced each passage, so listening feedback can attribute "lost the mode" or "lost the center" to specific settings ([generative-music-failure-modes.md](generative-music-failure-modes.md), [generative-music-design-patterns.md](generative-music-design-patterns.md)). Style-specific palettes and mediant-edge weights should later be fit from corpora ([corpus-analysis.md](corpus-analysis.md)).

## Open questions

- Common-tone maximization is a plausible default coherence metric, but is it *sufficient*, or do listeners also need occasional smooth-but-common-toneless "spice" (hexatonic poles) to avoid monotony? Testable A/B in [listening-tests-and-feedback.md](listening-tests-and-feedback.md).
- How strong is the "color clock" threshold N by mode and tempo — how many bars can a mode go without its characteristic degree before the ear reverts to major/minor? Unmeasured; a cheap listening experiment.
- Do the film-harmony associations (chromatic mediant = wonder, tritone pair = cosmic) transfer to short browser-generated cues without the picture, or do they need visual/narrative context to read? Relevant to whether [style-invention-and-style-space.md](style-invention-and-style-space.md) can recombine them freely.
- Is a first-order common-tone-weighted walk enough, or does convincing modal harmony need phrase-level palette *planning* (like the cadence-first period does for functional harmony)? Likely the latter for longer forms.

## Related pages

- [harmony.md](harmony.md) — functional syntax, cadences, Piston table; the complement this page departs from (and its brief neo-Riemannian and pandiatonic notes)
- [findings-tonal-phrase-composer.md](findings-tonal-phrase-composer.md) — the cadence-first backward Piston walk these engines contrast with; the functional cross-relation note
- [tuning-and-scales.md](tuning-and-scales.md) — the modes as scales, Krumhansl hierarchies, drone/JI pairing
- [jazz-and-improvisation.md](jazz-and-improvisation.md) — modal jazz from the improvisation side (So What, scale-not-chord)
- [film-and-game-music.md](film-and-game-music.md) — where chromatic mediants and two-triad "wonder"/"cosmic" idioms do their work
- [minimalism-and-process-music.md](minimalism-and-process-music.md) — loop/process harmony (the process; harmony here)
- [ambient-and-generative-genre.md](ambient-and-generative-genre.md) — drone and pedal-based harmony
- [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md) — realizing common tones and cross-relations as actual voices
- [melody.md](melody.md) — keeping melody in-mode
- [rock-and-pop.md](rock-and-pop.md), [european-folk-and-dance.md](european-folk-and-dance.md), [medieval-and-renaissance-music.md](medieval-and-renaissance-music.md), [contemporary-art-music.md](contemporary-art-music.md) — genre homes of these idioms
- [style-and-genre-overview.md](style-and-genre-overview.md) — the genre hub

## Sources

- Frank Lehman, *Hollywood Harmony: Musical Wonder and the Sound of Cinema*, Oxford University Press, 2018 — chromatic mediants and the evocation of "wonder"; the tonal grid from common-practice to pantriadic chromaticism; pitch design serving narrative over structure. https://www.researchgate.net/publication/323784558_Hollywood_Harmony_Musical_Wonder_and_the_Sound_of_Cinema
- Scott Murphy, "The Major Tritone Progression in Recent Hollywood Science Fiction Films," Music Theory Online 12/2 (2006) — two major triads a tritone apart as the conventional "outer space" sound; voice-leading displacement and harmonic ambiguity as the mechanism. https://www.mtosmt.org/issues/mto.06.12.2/mto.06.12.2.murphy.html
- Scott Murphy, "An Eightfold Taxonomy of Harmonic Progressions, and Its Application to Triads Related by Major Third and Their Significance in Recent Screen Music," Journal of Music Theory 67/1 (2023) — two-triad units as analytical objects; major-third pairs in screen music. https://read.dukeupress.edu/journal-of-music-theory/article/67/1/141/343976/
- Richard Cohn, "Maximally Smooth Cycles, Hexatonic Systems, and the Analysis of Late-Romantic Triadic Progressions," Music Analysis 15/1 (1996) — hexatonic cycles from single-semitone displacements; parsimonious voice leading; two common tones per P/L/R step. https://www.scribd.com/document/374201750/
- Wikipedia, "Neo-Riemannian theory" — P/L/R definitions, compound operations (N, S, hexatonic pole H = LPL, C major ↔ A♭ minor), the Tonnetz, late-Romantic application. https://en.wikipedia.org/wiki/Neo-Riemannian_theory
- Wikipedia, "Chromatic mediant" — taxonomy: diatonic mediant (2 common tones, quality changes), chromatic mediant (1 common tone, quality preserved), doubly-chromatic/disjunct mediant (0 common tones); Forte's conservative vs Benward & Saker's broad definitions; Romantic/impressionist rise. https://en.wikipedia.org/wiki/Chromatic_mediant
- Open Music Theory (Pressbooks), "Diatonic modes" and "Mediants" — characteristic note of each mode; the three grades of mediant relationship. https://viva.pressbooks.pub/openmusictheory/chapter/diatonic-modes/ ; https://viva.pressbooks.pub/openmusictheory/chapter/mediants/
- Wikipedia, "Mode (music)" — characteristic intervals; subtonic vs leading tone; modal cadences; Renaissance musica-ficta leading tones; Irish traditional Mixolydian/Dorian usage. https://en.wikipedia.org/wiki/Mode_(music)
- Nicole Biamonte, "Triadic Modal and Pentatonic Patterns in Rock Music," Music Theory Spectrum 32/2 (2010) — modal (Aeolian/Dorian/Mixolydian) and pentatonic harmonic patterns in rock. https://www.researchgate.net/publication/259731450_Triadic_Modal_and_Pentatonic_Patterns_in_Rock_Music
- Allan F. Moore, "Modal Function in Rock and Heavy Metal Music" (and *Rock: The Primary Text*) — modal function and the typology of two-chord "shuttles" (Dorian, plagal, Aeolian, subtonic, etc.). https://www.academia.edu/1826046/Modal_Function_in_Rock_and_Heavy_Metal_Music
- Mark Spicer, "Fragile, Emergent, and Absent Tonics in Pop and Rock Songs," Music Theory Online 23/2 (2017) — how oscillating vamps generate a tonic by repetition without a cadence. https://mtosmt.org/issues/mto.17.23.2/mto.17.23.2.spicer.html
- Wikipedia, "Quartal and quintal harmony" — quartal/quintal construction; the "So What" chord (three perfect fourths topped by a major third) as rootless, root-ambiguous modal-jazz voicing; Debussy/Ravel/Bartók and Tyner/Evans. https://en.wikipedia.org/wiki/Quartal_and_quintal_harmony
- Wikipedia, "Modal jazz" — *Kind of Blue*, one-scale-per-section forms, scale-based improvisation, George Russell's Lydian Chromatic Concept. https://en.wikipedia.org/wiki/Modal_jazz
- Wikipedia, "Parallel harmony," and Megan Lavengood, "Harmonic Techniques of Debussy" (Theory for 20th/21st-c. Music) — diatonic vs chromatic (real) planing; the negation of functional progression. https://en.wikipedia.org/wiki/Parallel_harmony ; https://musi216.meganlavengood.com/mm-lessons/debussy/
- Wikipedia, "Tone cluster" — clusters as sound-mass sonority; Cowell, Ives, Penderecki, Ligeti; chromatic/diatonic/pentatonic types. https://en.wikipedia.org/wiki/Tone_cluster
- Wikipedia, "Polychord" — polychords, bitonality/polytonality, the *Petrushka* chord, distinction from extended tertian chords. https://en.wikipedia.org/wiki/Polychord
- Wikipedia, "Pandiatonicism" — Slonimsky's term; diatonic notes in "democratic equality" (cross-referenced from [harmony.md](harmony.md)). https://en.wikipedia.org/wiki/Pandiatonicism
