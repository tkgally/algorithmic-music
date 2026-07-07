---
title: Western classical tradition
tags: [genre]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Era-by-era generative principles of Western art music — Baroque, Classical, Romantic, Impressionist, and 20th-century styles — with concrete emulation rules an engine can implement.
---

# Western classical tradition

Western art music from roughly 1600 to 1950 is not one style but a sequence of sharply different constraint systems, each with its own texture, phrase syntax, harmonic norms, and performance practice. For this project each era is best treated as a separate target: an engine that commits to "Baroque trio texture" or "Impressionist piano piece" has a concrete rulebook to follow, whereas "classical-ish" guarantees the style-less noodling described in [previous-experiments-lessons](previous-experiments-lessons.md). This page compresses each era into the features an engine must get right to sound idiomatic, with emulation rules per era.

## Baroque (c. 1600–1750)

Britannica dates the era ~1600–1750 and locates its core innovation in the *stile moderno*: solo melody polarized against a bass line, with expressive harmony filled in between. That polarity is institutionalized as **basso continuo**: a continuous bass line played by cello/violone/bassoon while a chord-capable instrument (harpsichord, organ, lute) improvises a realization from figured-bass numerals. Continuo is nearly universal in Baroque ensemble music — texture is outer-voice-driven, with inner voices as semi-improvised filler.

Melody grows by **Fortspinnung** ("spinning-forth," Wilhelm Fischer's 1915 term): a short motive is extended into a long prose-like line through sequence, interval modification, and repetition rather than through balanced antecedent–consequent phrases. The ritornello model is *Vordersatz* (a strong opening statement establishing key), *Fortspinnung* (sequential elaboration, typically over descending-fifths harmony), and *Epilog* (cadential close). Rhythm within a movement is famously consistent — one figuration pattern and one affect maintained from first bar to last (the conventional "motoric rhythm / single affect" characterization; Bach's C major Prelude BWV 846, a single arpeggiation pattern over a slow harmonic progression, is the extreme case and is practically a generative spec already).

The **dance suite** supplies form vocabulary: allemande (moderate 4/4, flowing sixteenths), courante (fast triple/compound), sarabande (slow triple, weight on beat 2), gigue (fast compound, often fugal), with optional galanteries (minuet, gavotte, bourrée) inserted before the gigue; all movements share one key, each in binary (AABB) form.

Emulation rules:

1. Generate outer voices first: bass line and melody; realize inner harmony from the bass in 3–4 voices, keeping common tones (continuo logic).
2. Pick one rhythmic figuration (e.g., running sixteenths, dotted figures, arpeggiation) and one tempo/affect per movement; never switch mid-movement.
3. Build phrases as Vordersatz–Fortspinnung–Epilog: 1–2 bar motive in tonic, then a sequence repeating the motive 2–4 times descending by step or by fifths (root motion down a 5th / up a 4th), then a stock cadence.
4. Harmonic rhythm steady at 1–2 chords per bar; favor circle-of-fifths progressions and sequences.
5. Use binary dance forms: two repeated halves of 8–16 bars, first half modulating I→V (or i→III in minor), second half returning; chain 4–6 dances in one key for a suite.
6. Dynamics terraced (block changes between sections, e.g., forte/piano echo effects), not gradual — a standard characterization of the period worth honoring in synthesis gain control.

## Classical (c. 1750–1820)

The Classical style replaces spun-out prose with **periodic phrasing**: short, balanced units with frequent, unmistakable cadences. The two core phrase archetypes are the *sentence* — Schoenberg's model: a basic idea stated, immediately repeated (the presentation), then condensed and driven to a cadence (continuation, with fragmentation and harmonic acceleration), prototypically 2+2+4 = 8 bars — and the *period*: an antecedent phrase ending on a weak cadence (half cadence) answered by a parallel consequent ending on a strong one (perfect authentic cadence). The specific 2+2+4 bar count is a later formalization (Caplin's *Classical Form*, 1998) of Schoenberg's own looser presentation/continuation model. Schoenberg called the sentence "a higher form of construction than the period" because it starts developing its idea at once.

Accompaniment is formulaic by design. The **Alberti bass** — broken chords cycling lowest–highest–middle–highest, as in Mozart's Piano Sonata K. 545 — is so common it was called "perhaps the most overworked fixture of eighteenth-century music." Harmonic vocabulary is small (I, ii, IV, V, vi and secondary dominants), harmonic rhythm slow, and cadences (authentic, half, deceptive) are the punctuation that makes form audible.

**Sonata form** governs first movements: exposition (theme 1 in tonic; transition; theme 2 in dominant for major keys, relative major for minor; closing material), development (fragmentation and modulation through unstable keys), recapitulation (both themes in tonic), optional coda. Rondo (ABACA or ABACABA, refrain always in tonic) covers finales. Rosen's caution that there are "sonata forms," plural — monothematic expositions, three-key expositions, etc. — is worth keeping in mind: the scheme is a norm to deviate from, not a template.

**Topic theory** (Ratner 1980) catalogs the era's semantic surface: conventional styles quoted inside instrumental movements — march, fanfare/military, hunt calls, singing style, brilliant style (virtuoso runs), learned style (fugato), Sturm und Drang (minor-mode agitation), musette/pastoral (drone bass), Turkish music. For an engine, topics are ready-made bundles of texture + rhythm + instrumentation that give a passage a recognizable character.

Emulation rules:

1. Phrase generator produces sentences (2+2+4 bars) and periods (4+4, half cadence then perfect authentic cadence); cadence every 4–8 bars, no exceptions without a marked reason.
2. Melody-plus-accompaniment texture: one clear tune on top; accompaniment from a small pattern library (Alberti figures, repeated chords, murky bass octaves) in even eighths or sixteenths.
3. Harmonic vocabulary: mostly I/ii/IV/V/vi with V7 and secondary dominants; harmonic rhythm 0.5–2 chords per bar; end sections with cadential formulas (ii6–V7–I or IV–V7–I, cadential 6/4 allowed).
4. Forms: rounded binary, sonata (expo I→V, development modulating and fragmenting the basic ideas, recap all-tonic), rondo ABACA; movement lengths in whole 4- and 8-bar multiples.
5. Characterize sections by topic: e.g., theme 1 = march or fanfare topic, theme 2 = singing style, development = Sturm und Drang; switch topic at formal boundaries only.
6. Tempo steady within movements; expression comes from dynamics (now graded: crescendo/diminuendo) and articulation, not tempo bending.

## Romantic (c. 1820–1900)

Romantic style keeps Classical forms in the background but stretches every parameter: "increased chromaticism," motion toward subdominant and third-related keys, longer and more emotionally sustained melodic lines, much wider dynamic range, and a bigger orchestra. New genres are mostly **character pieces** — nocturne, intermezzo, ballade, rhapsody, arabesque, song-without-words — short single-mood piano works, plus **program music** (instrumental music tracking an extra-musical narrative or image) alongside absolute music.

Two performance-practice facts matter most for generation. First, **rubato**: in the Chopin tradition the accompaniment keeps near-strict time while the melody "steals" time — lingering and anticipating against a steady left hand ("the left hand is the conductor" is the teaching attributed to Chopin); whole-texture tempo flexing (accelerando/ritardando of everything) is the second, later type. Second, long-arc melody: Romantic themes commonly span 8–16+ bars with a single climactic high point, rather than closing every 4 bars.

Emulation rules:

1. Chromatic harmony budget: secondary dominants, borrowed chords (modal mixture), diminished-seventh pivots, and chromatic bass descents are normal; modulations to third-related keys (I→bVI, I→iii) are idiomatic, not errors.
2. Melody: build 8–16 bar arcs with one registral climax placed roughly 60–75% through the phrase (informed speculation consistent with the long-line ideal; verify against corpus data later — see [corpus-analysis](corpus-analysis.md)).
3. Two-layer timing: schedule accompaniment on a steady grid, then give the melody ±30–80 ms expressive offsets (lingering into strong beats, anticipating peaks); add whole-texture ritardando 2–5% per bar approaching final cadences. Exact millisecond norms need verification — see [expressive-performance](expressive-performance.md).
4. Character-piece form: ABA with a contrasting middle (new key, new texture), 2–5 minutes; commit to a single mood per piece and name it (nocturne, elegy, barcarolle) to force stylistic commitment.
5. Texture: widen the register span (deep bass, singing middle-register melody, arpeggiated filler across 3+ octaves); dynamics from pp to ff within one piece.

## Impressionism (c. 1890–1920)

Impressionism (Debussy, Ravel — both resisted the label; Debussy called critics "imbeciles" for it) is the era most relevant to a synthesis-based project because **timbre becomes subject matter**: "dissonance of chords was not resolved, but was used as timbre," and orchestration/color takes priority over thematic argument. Harmony is decorative and static rather than functional: extended chords (9ths, 11ths, 13ths) that never resolve, **parallel motion / planing** (whole chord-shapes sliding in parallel, parallel fifths welcomed back), whole-tone and pentatonic scales, and church modes replacing major/minor. Forms are short, sectional, and carried by evocative titles ("Reflets dans l'eau," "Brouillards") rather than by sonata logic.

Emulation rules:

1. Scale pool per section: choose one of {pentatonic, whole-tone, dorian/mixolydian/lydian mode, major with added 6/9} and draw all pitches from it; change collection between sections, not within.
2. Planing: harmonize a melody by moving a fixed chord voicing (e.g., stacked 4ths, or dominant-9th shape) in parallel with it; ignore functional voice-leading rules for these passages.
3. Chords are colors: build 4–6 note sonorities with 9ths/11ths/13ths, sustain them 2–8 seconds, connect by common tone or step, and do not resolve dissonance; avoid V–I cadences except as occasional cliché-quotation.
4. Harmonic rhythm very slow (one sonority per 1–4 bars); use pedal points and ostinati as anchors.
5. Spend the effort on timbre: layered detuned partials, low-pass-filtered spectra, long release tails, wide stereo — the synthesis itself ([synthesis-recipes](synthesis-recipes.md), [timbre-and-orchestration](timbre-and-orchestration.md)) carries more of the esthetic than note choice.
6. Dynamics mostly quiet (pp–mf) with rare swells; attacks soft; let chords overlap via pedal/reverb.

## Twentieth-century directions (brief)

- **Neoclassicism** (interwar; Stravinsky's Pulcinella 1920, Octet; Hindemith; Prokofiev's Classical Symphony): a "call to order" — 18th-century clarity, small ensembles, contrapuntal textures, and absolute-music forms, with updated ("wrong-note") tonal harmony. Engine recipe: run Baroque/Classical rules but let the harmony-checker admit added seconds, displaced bass notes, and unresolved sevenths at, say, 10–20% of events.
- **Folk-modal nationalism** (Bartók, Vaughan Williams, and the nationalist strain the Romantic era began): melodies and modes drawn from folk sources — pentatonic and modal tunes, drone accompaniments, asymmetric dance meters (2+2+3 etc.). Engine recipe: mode-first melody generation plus drone/ostinato accompaniment; see [tuning-and-scales](tuning-and-scales.md) and [rhythm-and-meter](rhythm-and-meter.md).
- **Serialism** (Schoenberg's twelve-tone method and successors): ordering all 12 pitch classes into a row that governs the piece. Included here mainly as a caution: Reich's 1968 observation that "in serial music, the series itself is seldom audible" marks exactly the trap this project must avoid — structure the listener cannot hear does not read as style ([musical-expectation](musical-expectation.md)).
- **Satie's furniture music** (musique d'ameublement, term coined 1917; performed 1920 with the audience instructed to ignore it — they listened anyway): deliberately functional background music of short repeating fragments, revived by Cage and explicitly claimed by Eno as the ancestor of ambient. Details and engine implications in [ambient-and-generative-genre](ambient-and-generative-genre.md).

## Implications for generative engines

- Commit to one era per engine/piece. Each era above is a coherent constraint bundle (texture + phrase syntax + harmony + form + performance practice); mixing bundles is what produces generic output.
- The eras factor the generation problem differently. Baroque: pick figuration → spin sequences over a bass (process-like, congenial to code). Classical: phrase-template grammar with cadence targets. Romantic: Classical grammar + chromatic substitutions + a two-layer expressive timing model. Impressionism: scale-set + sonority + timbre design, almost no counterpoint engine needed.
- Cadences are the ground truth of style: an engine that cannot place a convincing authentic cadence every 4–8 bars cannot do Classical; an engine that resolves every dissonance cannot do Impressionism.
- Reusable component list this page implies: figured-bass realizer; sequence engine (transpose motive by -2nds/-5ths); sentence/period phrase builder; sonata/rondo/binary form planners; Alberti-style accompaniment pattern bank; topic bundles; planing harmonizer; melody-over-grid rubato scheduler.
- Concrete numbers worth hard-coding as defaults: 8-bar phrases (2+2+4); binary halves 8–16 bars; harmonic rhythm 0.5–2 chords/bar (Classical) vs 1 chord per 1–4 bars (Impressionist); sequences of 2–4 repetitions; suite = 4–6 movements in one key.

## Open questions

- Topic theory offers ready-made "character bundles," but which topics survive translation to synthesized timbres? (A hunt topic without horns may not read.)
- What do measured rubato profiles of Chopin/Brahms recordings look like quantitatively (offset distributions, phrase-final lengthening percentages)? Needed before the Romantic timing model is more than a guess.
- Era boundaries are simplified here; galant schemata (Gjerdingen) between Baroque and Classical deserve their own treatment — probably under [composition-craft](composition-craft.md) or [phrase-structure](phrase-structure.md).

## Related pages

- [style-and-genre-overview](style-and-genre-overview.md) — style as constraint system
- [phrase-structure](phrase-structure.md) — sentences, periods, cadence placement in depth
- [form-and-structure](form-and-structure.md) — binary, sonata, rondo at engine level
- [harmony](harmony.md) and [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) — the underlying pitch machinery
- [expressive-performance](expressive-performance.md) — rubato and timing models
- [timbre-and-orchestration](timbre-and-orchestration.md) — Impressionism's real subject
- [melody](melody.md), [tension-and-release](tension-and-release.md) — arcs and cadential syntax
- [ambient-and-generative-genre](ambient-and-generative-genre.md) — Satie's furniture-music lineage

## Sources

- Encyclopaedia Britannica, "Baroque music." https://www.britannica.com/art/Baroque-music
- Wikipedia, "Fortspinnung" (Fischer 1915; Vordersatz–Fortspinnung–Epilog). https://en.wikipedia.org/wiki/Fortspinnung
- Wikipedia, "Basso continuo." https://en.wikipedia.org/wiki/Basso_continuo
- Wikipedia, "Suite (music)" (dance order, meters, binary form). https://en.wikipedia.org/wiki/Suite_(music)
- Wikipedia, "Sentence (music)" (Schoenberg's presentation/continuation model). https://en.wikipedia.org/wiki/Sentence_(music)
- Wikipedia, "Alberti bass." https://en.wikipedia.org/wiki/Alberti_bass
- Wikipedia, "Sonata form" (scheme, key plans, Rosen's "sonata forms"). https://en.wikipedia.org/wiki/Sonata_form
- Ratner, Leonard. Classic Music: Expression, Form, and Style (1980) — topic catalog; overview via Internet Archive. https://archive.org/details/classicmusicexpr0000ratn
- Caplin, William E. Classical Form: A Theory of Formal Functions for the Instrumental Music of Haydn, Mozart, and Beethoven (1998), Oxford University Press — source of the 2+2+4 sentence bar-count formalization.
- Mirka/ZGMTH, "Once more on musical topics and style analysis" (Ratner's two topic classes). https://www.gmth.de/zeitschrift/artikel/576.aspx
- Wikipedia, "Romantic music" (chromaticism, character pieces, program music). https://en.wikipedia.org/wiki/Romantic_music
- Wikipedia, "Tempo rubato" (Chopin's steady-left-hand rubato; two types). https://en.wikipedia.org/wiki/Tempo_rubato
- Wikipedia, "Impressionism in music" (planing, whole-tone, dissonance-as-timbre). https://en.wikipedia.org/wiki/Impressionism_in_music
- Wikipedia, "Neoclassicism (music)" (Stravinsky, order/clarity, reduced forces). https://en.wikipedia.org/wiki/Neoclassicism_(music)
- Wikipedia, "Furniture music" (Satie, 1917–1923). https://en.wikipedia.org/wiki/Furniture_music
- Reich, Steve. "Music as a Gradual Process" (1968) — remark on inaudibility of serial structure. https://www.bussigel.com/systemsforplay/wp-content/uploads/2014/02/Reich_Gradual-Process.pdf
