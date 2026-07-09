---
title: Ornamentation and embellishment
tags: [craft, theory]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: The ornament vocabularies of Baroque/Classical practice, Irish/Scottish traditional music, Indian gamaka, Arabic maqam and Chinese instrumental idiom (pointers), blues/rock bends, jazz bebop, and country picking, organized as an implementable grammar — discrete note-event ornaments versus continuous pitch-gesture ornaments, placement rules, and a density dial running from Classical restraint to sean-nós saturation.
---

# Ornamentation and embellishment

Ornamentation is the layer of small melodic gestures — trills, slides, bends, grace notes, glides, shakes — attached to or wrapped around a written pitch, and in most of the world's traditions it is not optional decoration but part of how a style is identified at all: a raga rendered without gamaka, a reel played without rolls, or a blues line without a bent third are, by practitioners' own account, not simply plainer versions of the same music but different, less idiomatic music. This page catalogs the named ornament vocabularies of several traditions as a working grammar for a generative engine: what each ornament is, how it is realized, and — the generative payload — where and how densely it gets placed. It complements [expressive-performance](expressive-performance.md), which covers the continuous timing/dynamics/vibrato deviations a performer adds to *every* note; this page is about discrete, nameable pitch ornaments layered onto specific notes.

## Two realization classes: discrete events and continuous gesture

Every ornament below falls into one of two implementation classes, and the split recurs across unrelated traditions because it tracks a real acoustic distinction, not a cultural one:

- **Discrete-event ornaments** insert one or more extra, separately attacked pitches around a principal note — a grace note, a trill (rapid alternation, itself a train of discrete attacks), a roll, a turn, an enclosure. However fast, each sub-note is a genuine onset.
- **Continuous-gesture ornaments** reshape the pitch *within* a single sounding note — a glide, a bend, a swell of vibrato. There is one attack; the pitch trajectory after it is the ornament.

Some instruments strongly favor one class (a harpsichord or piano cannot glide, so Baroque keyboard ornamentation is entirely discrete-event; a fretless bowed or blown or bent-string instrument can do both, and *which* class a player reaches for is itself idiomatic information). The split matters here because it maps directly onto this project's engine schema: discrete ornaments become extra composer-stage Note events, continuous ornaments become performer-stage `note.expr` pitch gestures — see Implications for generative engines, below.

## Baroque and Classical ornament table

Realizations below are the historically dominant conventions as codified by C. P. E. Bach's *Versuch über die wahre Art das Clavier zu spielen* (1753/1762) and J. J. Quantz's *Versuch einer Anweisung die Flöte traversiere zu spielen* (1752) — the two most-cited 18th-century treatises, both available in English translation. Ornaments were symbol-notated and largely left to the performer to realize; how literally that changed by era is its own subsection below.

| Ornament | Realization | Class |
|---|---|---|
| Trill | Rapid alternation with the upper neighbor, conventionally opening with the upper note (itself functioning as a brief appoggiatura) and closing with a two-note turn (the "termination" or "suffix") | discrete |
| Mordent (upper) | One fast alternation, principal–upper neighbor–principal | discrete |
| Mordent (lower / "inverted") | One fast alternation, principal–lower neighbor–principal; Baroque usage of plain "mordent" denoted *this* lower form, while by the 19th century "mordent" had come to default to the upper form — the term's meaning inverted between eras | discrete |
| Turn (gruppetto) | Four notes: upper neighbor–principal–lower neighbor–principal; placement before or on the beat, and tempo, are contextual rather than fixed | discrete |
| Appoggiatura | An on-beat grace note a step above or below the principal, borrowing time from it (rule below); stressed, and typically approached by leap and left by step in the opposite direction | discrete |
| Acciaccatura | A very short, unstressed grace note crushed against the principal note just before the beat; the main note keeps the stress — the mirror image of the appoggiatura's stress pattern | discrete |
| Slide (Schleifer) | Two or more conjunct notes approaching the principal note from below (occasionally above), filling the melodic gap from the previous note; often closes with a small mordent or trill flick | discrete |

### The trill: upper-note vs. main-note start

C. P. E. Bach states plainly that the trill "always begins on the tone above" the principal note, and Quantz concurs, generally requiring a starting appoggiatura from above and a closing turn from below. This upper-note-start convention is the near-universal Baroque and early-Classical rule, and for repertoire such as pre-1790 flute music a main-note start is very likely not what the composer expected to hear. But the rule was already contested within the 18th century — theorist Heinrich Christoph Koch reportedly found it "scarcely a matter of much importance whether the trill began one way or the other" — and it eroded gradually rather than at a clean cutover: Clementi's *Introduction to the Art of Playing on the Piano Forte* (1801) still teaches the upper-note start as standard but permits main-note starts in certain legato contexts, and it is not until well into the 19th century that most teachers and performers treat a main-note start as the default. Treat "which note a trill starts on" as an era- and instrument-conditioned probability, not a constant, weighted firmly toward the upper note for genuinely Baroque material.

### Appoggiatura timing: the borrowed-duration rule

The appoggiatura's ornamental content is entirely rhythmic: it does not add time, it *takes* time from the note it decorates, following a rule that hardened during the galant/early-Classical period associated with C. P. E. Bach — if the principal note divides evenly in two, the appoggiatura takes exactly half its value; if the principal note is dotted, the appoggiatura takes two-thirds of its value (leaving the dot's portion for the resolution); if the principal note is tied to a shorter note, the appoggiatura takes the *entire* value of the first note. A quarter note ornamented by an appoggiatura therefore becomes two eighth notes in performance even though the page still shows one long note and one small grace note. C. P. E. Bach also ties realization to harmony: the appoggiatura is a written-out, suspension-like dissonance, so it is the stressed, "important" pitch, resolving onto the now-weaker-feeling principal note.

### Into the Classical and Romantic eras

Ornament realization moves from performer-supplied toward composer-specified across the 18th–19th centuries: Baroque notation names an ornament and leaves its exact voicing to taste; by the Classical era composers increasingly write out the desired notes in full (Beethoven is the standard example of a composer resistant to performers adding ornaments not on the page), which is also when the appoggiatura/acciaccatura stress distinction and the duration rules above get codified precisely enough to notate; by the Romantic era symbol-ornaments are rarer, grace notes trend toward being played on the beat as fully notated events, and, per above, the trill's default start flips toward the main note. The throughline for an engine: the earlier a style pack's target era, the more an ornament should be a flexible, context-computed realization; the later, the more it should be a fixed, literal, sparingly used note.

## Ornament as style identity

In the traditions below, ornament is not an optional finish — it is diagnostic of the style, sometimes structurally mandatory. Each gets a named inventory; where a sibling page already covers the tradition in depth, this page gives only the ornament taxonomy and points there.

### Irish and Scottish traditional music

The session-tune vocabulary (fiddle, flute, tin whistle, concertina, uilleann pipes) is built almost entirely from discrete-event ornaments layered onto a plain tune skeleton:

- **Cut**: a single, very fast grace note a step or so *above* the principal note, played immediately before it ("hammered off" on stringed instruments) — the simplest ornament, close to a percussive accent.
- **Tap** (or strike): the mirror of a cut — the grace note sits *below* the principal note, "hammered on."
- **Long roll**: a five-note figure, principal–upper neighbor–principal–lower neighbor–principal (e.g., D-E-D-C-D), played fast enough to read as one ornamented note; it occupies a note of **dotted-crotchet** (dotted-quarter) duration — exactly a jig's beat unit (6/8 = two dotted-quarter beats per bar) — so long rolls are the idiomatic jig ornament.
- **Short roll**: the long roll with its first principal-note repetition dropped (upper neighbor–principal–lower neighbor–principal); it occupies a **crotchet** (quarter-note) duration — the reel's beat unit (4/4 felt in quarters) — so short rolls are the idiomatic reel ornament. The two rolls are the same device sized to two different meters' native beat-note values.
- **Cran**: two or three quick cuts in succession on the *same* note, using only upper grace notes (no tap component) — borrowed from uilleann piping and adopted by flute/whistle players from the 1970s onward. It substitutes for a roll specifically on an instrument's *lowest* note, where there is no note below to tap from; the result is a distinctive stutter.
- **Slide**: a portamento-like rise into the principal note from below, idiomatic on fiddle, concertina, and pipes.
- **Treble/triplet**: an extra note inserted between two principal notes (rising, falling, or turning), played in the time the two original notes would take — common in hornpipes and as a bowed ornament on fiddle.

Placement is meter-locked (rolls fit the ambient beat-note value of jig vs. reel, above) and register-locked (crans exist because rolls are physically impossible at the bottom of the range). **Sean-nós** ("in the old style") unaccompanied singing is this tradition's saturated, continuous-pitch-adjacent extreme: free rhythm and heavy melismatic ornamentation of single syllables, with density that varies by region (Connemara/Connacht singing is markedly more melismatic than Ulster's) and that a good singer varies from verse to verse — a direct, load-bearing example of "vary the repeat."

Scottish Highland bagpiping adds a third functional category beyond accent-ornament and filler-ornament: **mandatory articulation**. Because the chanter is a closed, continuously sounding reed with no way to silence or re-tongue between two notes of the same pitch, grace-note ornaments — doublings, grips, throws, the **taorluath** and **crunluath** — are the *only* mechanism available to separate notes, not a stylistic option. The extended solo form **piobaireachd** builds whole variation movements by re-playing the same ground theme (**urlar**) at successively denser layers of these ornaments, with the crunluath (a burst of roughly seven grace notes) conventionally the final, most saturated variation — ornament density itself *is* the climax device.

### Indian classical: gamaka

[Indian classical music](indian-classical-music.md) covers raga grammar and gamaka's role as constitutive of raga identity in depth; this page lists only the taxonomy. *Gamaka* is the umbrella term (both Hindustani and Carnatic) for melodic ornamentation and oscillation; commonly cited named types include:

- **Meend**: a continuous glide/portamento connecting two (or more) notes.
- **Kan** (kan-swar): one or more quick grace notes that briefly touch a neighboring pitch before landing on the main note — functionally close to a Western acciaccatura or appoggiatura.
- **Andolan**: a slow, wide swing or sway of a note (the term literally means "swinging"), broader and slower than vibrato.
- **Murki**: a fast, light alternation among two or three neighboring notes, the closest Western analog being a quick turn.

Hindustani theory commonly names five gamakas (kampita, sphurita, murki, khatka/gadgad, andolan); Carnatic practice names a larger set — at least fifteen types are documented elsewhere in this wiki, including kampita, nokku, odukkal, and orikai. Both traditions mix discrete-event forms (kan, murki) with continuous-gesture forms (meend, andolan); see Implications for generative engines, below, for how to represent both under one schema.

### Arabic and Turkish maqam (pointer)

Maqam performance treats ornamentation as inseparable from mode, much as raga does: melodic direction, cadential figures, and idiomatic embellishment (trills, glissandi, microtonal inflection of a *jins*'s characteristic degree) are part of what identifies a maqam, not added afterward. Full treatment, including the maqam-specific vocabulary, belongs in [arabic-and-middle-eastern-music](arabic-and-middle-eastern-music.md); this page only flags that the same discrete/continuous split applies there.

### Chinese instrumental ornament (pointer)

[East Asian traditions](east-asian-traditions.md) already covers the guqin's large gesture vocabulary (slides, many species of vibrato, percussive touches, notated as tablature-of-gesture rather than pitch-and-rhythm) in depth. One addition for the erhu (the fretless two-string bowed spike fiddle): because the string is stopped by finger pressure in mid-air rather than against a fingerboard, the player has continuous pitch control, and ornamental **huayin** slides plus variable-width, variable-rate vibrato are as central to erhu melody as meend and andolan are to Hindustani music — the same continuous-gesture logic recurring in an unrelated tradition.

### Blues and rock: bends and slides

Electric and acoustic blues/rock guitar (and blues harmonica) realize ornament almost entirely as continuous pitch gesture, because the string-bend mechanism — pushing a string sideways against a fret to raise its pitch — has no natural "step" size:

- **Quarter-tone "blue" bend**: a small, deliberately imprecise upward smear of the minor third (or the fifth) that lands *between* the minor and major degree — colloquially "a quarter tone," though the target is a flexible microtonal inflection rather than an exact 50-cent interval, and it is this ambiguity, not a fixed pitch, that gives the "blue note" its character.
- **Full bends**: discrete, in-tune targets reached by bending a half step (e.g., major 2nd up to minor 3rd, or major 3rd up to perfect 4th) or a whole step (classically b3 up to major 3, or 5 up to 6); occasionally a minor third (b7 approaching the octave).
- **Pre-bend**: the string is bent up to pitch silently before it is picked, so the attack itself already sounds at the raised pitch.
- **Release bend**: the reverse — pick at pitch (or at a pre-bent pitch) and let the bend fall, either immediately (a vocal "falling" gesture) or after a hold.
- **Slide (bottleneck/lap style)**: a full continuous glissando between two notes or into/out of a note — a distinct technique family from fretted bends but the same continuous-gesture class.

These are frequently described by players and writers as the guitar's closest approximation to a singing or speaking voice — B. B. King's bends are the standard reference case — the same functional claim made for meend, huayin, and erhu vibrato: continuous pitch shaping reads as vocal.

### Jazz bebop ornaments

Bebop's characteristic ornamentation operates on note *choice* around a beat as much as on pitch shape around a note, but several devices are ornamental in the traditional sense:

- **Enclosure** (surrounding tones): a target chord tone is approached from both above and below (one note each side, chromatic, diatonic, or mixed) immediately before landing on it — e.g., approaching G with A (above) then F♯ (below) then G. Charlie Parker's vocabulary relies on this constantly; targets conventionally land on strong beats, so the enclosure functions as a rhythmic-and-melodic accent on the arrival. [jazz-and-improvisation](jazz-and-improvisation.md) covers the surrounding harmonic/formal vocabulary this device decorates.
- **Chromatic approach tone**: the single-note, one-sided version — a half step below (most common) or above a chord/scale tone immediately preceding it.
- **Grace-note scoop**: a brass/reed lip-slur or scoop into a target note from roughly a half step below, a continuous-gesture ornament idiomatic to saxophone and trombone (which can bend smoothly via embouchure or slide) more than trumpet.
- **Turn**: the same four-note Western classical figure, used by soloists as connective ornamentation almost anywhere in the range except a horn's extreme low register.

### Country: chicken-picking and pedal-steel bends (brief)

Two idioms, both imitative. **Chicken pickin'** is a hybrid-picking technique (alternating flatpicked downstrokes with fingerpicked upstrokes that snap the string against the frets for a percussive "cluck") usually combined with quick hammer-on/pull-off grace notes and short bends — the ornamental payload is as much timbral/articulative as pitched, and the technique is strongly associated with guitarist James Burton. **Pedal-steel-style bends** are guitarists imitating the pedal steel guitar's signature device: pedals and knee levers mechanically raise or lower selected strings of a sounding chord by a half step, whole step, or more while the other strings keep ringing, bending one voice against a static chord. Standard guitarists fake this with "oblique bends" (bending one string while adjacent strings stay fixed) — a continuous-gesture ornament imitating a mechanically discrete-per-string source instrument.

## Placement logic across traditions

Despite covering unrelated musics, the "where does an ornament go" logic recurs with enough consistency to write as cross-tradition rules:

- **Long/sustained notes get ornaments; short notes mostly don't**, simply because an ornament takes real clock time to execute — a roll needs a dotted-crotchet or crotchet's worth of time, a trill needs a note long enough to alternate audibly, a meend needs duration to glide across. This is a hard time-budget constraint before it is a style choice.
- **Phrase peaks and cadences concentrate ornaments.** The Baroque trill-plus-turn is a cadential formula; jazz enclosures resolve onto strong-beat arrivals; piobaireachd's crunluath is reserved for the climactic final variation. This is the "one apex per phrase" logic from [melody](melody.md) and the cadence-as-punctuation logic from [phrase-structure](phrase-structure.md), realized ornamentally instead of just registrally.
- **Repeated material gets varied, usually by adding or changing ornament rather than changing the notes.** Sean-nós singers vary ornamentation verse to verse; Baroque da capo practice conventionally adds ornamentation on a repeat that was plainer the first time; piobaireachd's whole variation structure *is* progressively denser ornamentation of one unchanging theme. See [thematic-development-and-variation](thematic-development-and-variation.md) and [repetition-and-familiarity](repetition-and-familiarity.md) for the general establish-then-vary principle this instantiates.
- **Density scales inversely with tempo and local event rate.** A fast reel or a bebop eighth-note run leaves little or no clock time per note for a multi-note ornament, so faster passages favor single grace notes (a cut, a chromatic approach tone) or none at all; slow passages (a ballad, an alap-like line, a sean-nós phrase) can carry heavy, multi-note ornamentation on a single event. Treat density as gated by inter-onset interval in real time, not by a fixed per-beat probability — the same probability produces very different perceived busyness at 60 BPM and 200 BPM.
- **Register and instrument idiom constrain the available inventory.** A cran exists only because a roll is impossible at an instrument's lowest note; trills get harder near the top of a wind instrument's range and near vocal range limits; a pedal-steel bend needs an adjacent static chord tone to bend against, so it does not transfer to a monophonic line.
- **Ornament plays at least three distinct functional roles**, worth keeping separate in a generative grammar: *accent* (marks a note as structurally important — a cadential trill, a cran on a strong beat, an enclosure's resolution), *filler/connective* (smooths a transition without claiming structural weight — a passing slide, a pickup bend), and — the bagpipe case — *mandatory articulation* (the ornament is the only available way to separate two notes at all, not an optional enhancement).

## Ornament density as a style/expression dial

The traditions surveyed span the plausible range of a single density parameter. At the sparse end, Classical-era restraint treats one well-placed cadential trill as sufficient, with added ornamentation beyond the notated symbols increasingly discouraged as the 18th century closes into the 19th. At the saturated end, sean-nós melisma, gamaka-heavy ragas ("some ragas can never exist without key gamakas," per [indian-classical-music](indian-classical-music.md)), and piobaireachd's crunluath variations push ornament note-count toward or past the plain melody's own note-count. A single 0–1 density scalar — architecturally the same kind of knob as the KTH k-multiplier in [expressive-performance](expressive-performance.md) — can span this whole range for a style pack, provided it is implemented as a probability/intensity gate on the placement rules above rather than as a uniform per-note chance; see [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) for exposing it as a labeled slider rather than a raw number.

## Implications for generative engines

1. **Represent each style pack's ornament vocabulary as a table**, one row per named ornament: `{ name, class: "discrete" | "continuous", eligiblePositions, minDurBeats, probability, realization }`. This is the ornament-grammar spec this page exists to make writable.
2. **Discrete ornaments compile to extra composer-stage Note events**, using the existing schema from [engine-architecture](engine-architecture.md) (`{ beat, durBeats, midi, voice, role, artic?, tags? }`): a cut, tap, mordent, turn, roll, or enclosure becomes one or more short Note events inserted immediately before/around the principal note, borrowing their duration from it (mirroring the appoggiatura's borrowed-duration rule — half, two-thirds, or all of the principal's value depending on divisibility). Tag every inserted note (e.g., `tags: ['ornament:cut']`, `tags: ['ornament:enclosure']`) so the ornament layer stays inspectable, per the architecture's "everything the piece did is inspectable" invariant.
3. **Continuous ornaments compile to a `note.expr` pitch gesture on an existing note**, reusing the `pitchExpr`-style detune-automation pattern established in [findings-cantabile-engine](findings-cantabile-engine.md) (Engine 04): an onset glide realizes a meend, a scoop, a slide, or a blues bend's approach; a release bend realizes a jazz fall or a blues release; a delayed, widening LFO realizes andolan or a wide vibrato. One shared helper covers meend, gamaka, huayin, and blues bends — they are the same mechanism wearing different tradition-specific parameters (depth, rate, curve shape).
4. **Placement rules are eligibility gates on structural tags**, reusing rather than replacing the schema: the cadence rule reuses `tags` values already exemplified in the architecture (e.g., `cadence:PAC`); the phrase-peak rule needs a new but natural extension, a `phrase:apex` tag; the vary-the-repeat rule (below) needs a `repeatIndex` field; the long-note rule gates directly on `durBeats`. Compute eligibility once per note at composer time; let density scale the probability, not the eligibility.
5. **Vary the repeat mechanically**: on a phrase's first statement, hold density near its floor (or zero) so the identity is heard plainly; on each subsequent occurrence of tagged repeated material, raise effective density (e.g., multiply the base density by `1 + repeatIndex * step`, capped) and avoid reusing the identical ornament realization at the same position twice running. This operationalizes sean-nós verse variation, Baroque da capo ornamentation, and piobaireachd's variation structure as one rule.
6. **Gate density by real time, not beat count**: derive the effective per-position probability from the note's actual inter-onset interval in seconds (tempo-aware), so the same style pack thins out automatically at fast tempi and thickens at slow ones, matching the inverse tempo/density relationship documented above.
7. **The discrete/continuous split tracks the composer/performer boundary** in [engine-architecture](engine-architecture.md): a single ornament module sitting at that seam should be able to emit both extra Note events and `note.expr` gestures from one style-pack table, rather than building a separate system per tradition.
8. **Constrain the inventory by instrument voice, not just by style pack.** A pluck/keyboard-like voice should draw only discrete ornaments; a voice already built for continuous pitch control (the cantabile-style expressive voices) can draw continuous ornaments freely; don't offer a meend-style glide to a struck-note voice that cannot execute one.

## Open questions

- Does one shared ornament-grammar engine across traditions actually read as idiomatic, or does the *micro-timing* of grace notes (how far before the beat, exactly how fast) carry more of the "authenticity" signal than which ornament is chosen — untested, and the kind of question [expressive-performance](expressive-performance.md) flags as needing a listening pass rather than a literature answer.
- The trill start-note controversy is itself contested among historical-performance scholars, and the sources used here (secondary summaries of C. P. E. Bach and Quantz, plus general encyclopedic accounts) do not pin down a precise cutover date — a dedicated source such as Frederick Neumann's *Ornamentation in Baroque and Post-Baroque Music* would sharpen this before an engine hard-codes an era boundary.
- Bagpipe-style mandatory articulation does not fit the accent/filler binary well; if a piping-adjacent engine is ever built, it likely needs a third placement class (ornament as the only available note-separator) rather than a probability gate at all.
- How much of Carnatic gamaka's larger named inventory (beyond the four detailed here) is engine-distinguishable versus redundant at the synthesis level this project can reach — an open question shared with [indian-classical-music](indian-classical-music.md)'s own open questions.

## Related pages

- [expressive-performance](expressive-performance.md) — continuous timing/dynamics/vibrato deviations on every note, the complementary layer to this page's discrete/gestural pitch ornaments
- [melody](melody.md) — phrase apex and contour, the structural targets ornament placement concentrates on
- [phrase-structure](phrase-structure.md) — cadences as the punctuation ornament marks
- [repetition-and-familiarity](repetition-and-familiarity.md), [thematic-development-and-variation](thematic-development-and-variation.md) — the establish-then-vary logic behind "vary the repeat"
- [indian-classical-music](indian-classical-music.md) — raga grammar and gamaka's constitutive role, in depth
- [east-asian-traditions](east-asian-traditions.md) — guqin gesture vocabulary in depth
- [arabic-and-middle-eastern-music](arabic-and-middle-eastern-music.md) — maqam-specific ornamentation, in depth
- [european-folk-and-dance](european-folk-and-dance.md) — the broader folk-dance context Irish/Scottish tune ornamentation sits within
- [jazz-and-improvisation](jazz-and-improvisation.md) — the harmonic/formal context bebop enclosures operate in
- [blues-country-and-roots](blues-country-and-roots.md) — blues and country idiom in depth
- [engine-architecture](engine-architecture.md) — the Note-event and `note.expr` schema this page's grammar spec extends
- [findings-cantabile-engine](findings-cantabile-engine.md) — the `pitchExpr`/`exprEnv` precedent continuous ornaments reuse
- [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) — exposing density as a labeled control
- [tuning-and-scales](tuning-and-scales.md) — the microtonal targets quarter-tone bends and gamaka approach

## Sources

- C. P. E. Bach, *Essay on the True Art of Playing Keyboard Instruments* (*Versuch über die wahre Art das Clavier zu spielen*, 1753/1762), trans. William J. Mitchell (W. W. Norton, 1949) — trill upper-note-start rule, appoggiatura duration and stress rules; consulted via secondary summaries, not the primary text directly. https://archive.org/details/essayontrueartof0000bach
- J. J. Quantz, *On Playing the Flute* (*Versuch einer Anweisung die Flöte traversiere zu spielen*, 1752), trans. Edward R. Reilly (Free Press/Faber, 1966) — trill and appoggiatura practice; consulted via secondary summaries. https://www.interlochen.org/music/fennell-music-library/tureck-bach-research-institute/documents/review-johann-joachim-quantz
- Wikipedia, "Ornament (music)" — mordent/turn/acciaccatura/slide definitions, Koch's ambivalence on trill direction, the Baroque-to-19th-century inversion of "mordent" terminology. https://en.wikipedia.org/wiki/Ornament_(music)
- oldflutes.com, "The Trill in the Classical Period (1750–1820)" — the gradual, contested shift from upper-note to main-note trill starts and Clementi's (1801) transitional position; supporting source, not independently re-verified by direct fetch in this session. http://www.oldflutes.com/articles/classicaltrill/index.htm
- Douglas Niedt, "The Appoggiatura: Understanding Musical Ornaments and Their Significance" — the half-value/two-thirds-value/full-value duration rules. https://douglasniedt.com/ornaments-appoggiaturas.html
- thecelticroom.org, "Ornamentation and Irish Music" — cut, tap, long roll, short roll, cran, and triplet definitions and realizations. https://thecelticroom.org/playing-irish-music/irish-music-ornamentation.html
- Violinspiration, "Easy Guide to Ornamentation in Irish Music" — long roll/short roll mapped to dotted-crotchet vs. crotchet note values. https://violinspiration.com/ornamentation-in-irish-music/
- WhistleAway, "What is a cran ornament and how do I do one?" — cran as a piping-derived substitute for a roll on an instrument's lowest note. https://whistleaway.com/what-is-a-cran-and-how-do-i-do-one/
- Wikipedia, "Sean-nós singing" — free rhythm, melismatic ornamentation, regional density variation (Connemara/Connacht vs. Ulster). https://en.wikipedia.org/wiki/Sean-n%C3%B3s_singing
- Wikipedia, "Great Highland bagpipe" and "Glossary of bagpipe terms" — grace notes as mandatory articulation on a closed, continuously sounding reed; taorluath, crunluath, birl, doubling. https://en.wikipedia.org/wiki/Great_Highland_bagpipe ; https://en.wikipedia.org/wiki/Glossary_of_bagpipe_terms
- Wikipedia, "Gamaka (music)" — the same source already cited in indian-classical-music.md; gamaka taxonomy and raga-constitutive role. https://en.wikipedia.org/wiki/Gamaka_(music)
- Manasukh Dhvani, "Gamaka, Meend, and Andolan: Ornamentation in Eastern Classical Music" — meend/kan/andolan/murki working definitions. https://manasukhdhvani.com/gamaka-meend-and-andolan-ornamentation/
- IndianEtzone, "Gamaka in Hindustani Music" — the five commonly cited Hindustani gamakas and a four-item Carnatic list. https://www.indianetzone.com/gamaka_hindustani_music
- MaqamWorld (Johnny Farraj & Sami Abu Shumays), "Arabic Maqam" — maqam as a performance framework prescribing ornamentation alongside pitch. https://www.maqamworld.com/en/maqam.php
- Lan Tung, "Info for Composers" (erhu) — huayin slides and variable vibrato as continuous-gesture ornament on a fretless bowed instrument. https://www.lantungmusic.com/erhu/for-composers/
- Happy Bluesman, "The Fundamentals of Bending" — quarter-tone blue-note bends, pre-bends, release bends. https://happybluesman.com/fundamentals-bending-blues-guitar/
- Premier Guitar, "Beyond Blues: The Bends" — half-step, whole-step, and minor-third bend targets. https://www.premierguitar.com/lessons/beyond-blues-the-bends
- Jazzadvice, "How to Use Enclosure in Your Improvised Jazz Solos" — enclosure mechanics and Charlie Parker's usage. https://www.jazzadvice.com/lessons/how-to-effectively-use-enclosure/
- Fertile Minds Jazz Academy, "Bebop Enclosures and Approach Notes: What You Need to Know" — chromatic approach tones as the single-sided case. https://fertilemindsjazzacademy.com/enclosures-surrounds-what-you-should-know/
- Jazzadvice, "Articulation for Jazz Improvisation: Tips for Saxophone, Trumpet, and More" — grace-note scoops and turns across horns. https://www.jazzadvice.com/lessons/articulation-for-improvisation-3-tips-for-horn-players/
- Sweetwater InSync, "The History of Chicken Pickin'" — hybrid-picking technique and James Burton's role. https://www.sweetwater.com/insync/history-chicken-pickin/
- Premier Guitar, "Twang 101: Pedal Steel Bends 101" — pedal/knee-lever mechanism and the "oblique bend" guitar imitation. https://www.premierguitar.com/lessons/twang-101-pedal-steel-bends-101
