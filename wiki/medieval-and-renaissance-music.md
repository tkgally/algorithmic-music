---
title: Medieval and Renaissance music
tags: [genre]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: Chant modes and psalm-tone formulas, Notre Dame organum and the rhythmic modes, Ars Nova isorhythm, the formes fixes, and Renaissance imitation, canon, soggetto cavato, musica ficta, and dance grounds — the pre-Baroque millennium read as a toolbox of explicit, formula- and rule-driven systems that are unusually algorithm-friendly.
---

# Medieval and Renaissance music

[western-classical-tradition](western-classical-tradition.md) begins its era-by-era coverage at the Baroque (c. 1600); this page covers the roughly one thousand years before that — plainchant through the end of the sixteenth century — which the wiki has otherwise skipped, and which is arguably the *most* algorithm-friendly stretch in music history precisely because its practitioners worked under extremely explicit constraint systems: formula banks, cyclic rhythm-and-pitch generators, letter-scheme repetition forms, name-to-melody ciphers, rule-driven accidental passes, and fixed ground-bass harmonies, several of them literally tabulated in period treatises. [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) already covers species counterpoint, generic imitation/canon/hocket, and the perceptual case for voice independence; this page covers what surrounds and precedes that — chant, early polyphony, Ars Nova, the formes fixes, and the specific Renaissance technologies (canon subtypes, soggetto cavato, mass-composition procedures, musica ficta, the dance grounds) that make this era a working parts-bin for a generative engine.

## Chant as melodic grammar

Gregorian chant — the medieval Latin plainchant repertory, codified from roughly the ninth century and traditionally, if inaccurately, attributed to Pope Gregory I — is organized into eight **church modes**, each defined by four coordinates rather than a scale alone: the **final** (the closing, tonic-like pitch), the **tenor** or reciting tone (the pitch recitation gathers around, historically the *dominant*), the **ambitus** (normal range), and a bank of characteristic melodic gestures for approaching those two anchors. Modes pair into four **authentic/plagal** pairs sharing a final: an authentic mode's ambitus runs roughly an octave up from its final, while its plagal partner (Greek prefix *hypo-*) ranges from a fourth below the final to a fifth above (Britannica, "Church mode"; Wikipedia, "Gregorian mode").

| # | Name | Final | Tenor | Ambitus |
|---|---|---|---|---|
| 1 | Dorian (authentic) | D | A | D–d |
| 2 | Hypodorian (plagal) | D | F | A–a |
| 3 | Phrygian (authentic) | E | C\* | E–e |
| 4 | Hypophrygian (plagal) | E | A\* | B–b |
| 5 | Lydian (authentic) | F | C | F–f |
| 6 | Hypolydian (plagal) | F | A | C–c |
| 7 | Mixolydian (authentic) | G | D | G–g |
| 8 | Hypomixolydian (plagal) | G | C\* | D–d |

\*Irregular tenor: the "theoretical" fifth-above (authentic) or third-above (plagal) rule would land on the unstable pitch B for modes 3 and 8, so both shift it up to C; mode 4's tenor is likewise raised, from G to A. All three exceptions are standard across chant pedagogy; their individual historical rationales are debated in the specialist literature (cross-checked across Wikipedia's "Gregorian mode" and "Hypophrygian mode" and secondary chant-pedagogy sources). A mode is therefore a scale **plus** a stability hierarchy (final > tenor > everything else) plus a formula repertoire — exactly the `{cents[], hierarchyWeights[], grammar}` object [tuning-and-scales](tuning-and-scales.md) already asks engines to build for any scale system, centuries before Krumhansl measured an analogous hierarchy experimentally.

### Psalm tones: a literal template system

The eight **psalm tones** (one per mode) set the psalms and canticles of the Divine Office to a fixed formula with named parts: **intonation** (an opening gesture, sung only for a verse's first half), **tenor** (reciting most of the text on the reciting tone), **mediant** (a cadential inflection at the verse's midpoint, with an optional **flexa** dip for long half-verses), a return to **tenor**, and **termination** (a closing cadential formula — several exist per tone, chosen to smooth the return into whatever antiphon follows) (Britannica, "Psalm tone"; Wikipedia, "Reciting tone"). This is, verbatim, slot-filling: intonation–tenor–mediant–tenor–termination is a five-slot template instantiated once per verse, for as many verses as the psalm has — about as close to a literal data schema as ninth-century practice gets.

### Centonization: a contested formula-stock model

At melody-scale rather than verse-scale, Dom Paolo Ferretti proposed in 1934 that most chant melodies are not through-composed but **centonized** — assembled by selecting and adapting reusable motivic units from a mode-specific stock, borrowing the concept of literary "cento" (patchwork) composition (Wikipedia, "Centonization"). The theory has been influential but "severely criticized" since; Leo Treitler mounted the sharpest challenge, arguing in "Homer and Gregory: The Transmission of Epic Poetry and Plainchant" (1974) and "'Centonate' Chant: *Übles Flickwerk* or *E pluribus unus*?" (1975) that chant is better modeled on Milman Parry and Albert Lord's oral-formulaic theory of Homeric epic: singers composed in performance from internalized constraints and recurring gestures rather than pasting together fixed tiles — a subtler, more generative process than centonization's "cut and paste" (Wikipedia, "Centonization"; "Leo Treitler"). David Hiley's *Western Plainchant: A Handbook* (1993) is a further critical touchstone. The debate is unresolved: a 2025 computational study segmenting chant with Bayesian nonparametric models found genuine formulaic clustering at phrase boundaries, but concluded that even a memory-optimal segmentation "is not what is understood as centonisation" (Lanz & Hajič jr., arXiv:2507.00380, 2025). **For this project the resolution mostly doesn't matter**: whether real chant was assembled from fixed tiles, composed from internalized constraints, or something in between, a formula-bank-plus-combination-rules generator remains a defensible, well-precedented engine design regardless of which historical account is right.

## Early polyphony: the tenor as scaffolding

Western polyphony's documented starting point is **organum**: a plainchant melody (the *vox principalis*) doubled by an added voice (*vox organalis*). The ninth-century *Musica enchiriadis* (c. 900) prescribes strict **parallel organum** at the fourth or fifth below; the companion *Scolica enchiriadis* already loosens this into **free/oblique organum**, where the added voice holds or diverges to avoid bad intervals at phrase edges (Wikipedia, "Organum"). By the eleventh–twelfth centuries (St. Martial, the Winchester Troper, then Notre Dame in Paris) organum turns **florid/melismatic**: the added voice spins long melismas above a chant melody stretched into held, slow-moving notes — and once that style existed, the older simple note-against-note style needed a new name, **discant**, to distinguish it. This is the pattern's first appearance: a borrowed melody slowed into a **scaffold** (tenor, from Latin *tenere*, "to hold") that faster material moves against — the same structural idea recurs as the isorhythmic motet's tenor, the cantus-firmus mass's tenor, and, transformed into pure harmony, the Renaissance ground bass, making "slow fixed voice plus faster invented voice(s)" arguably the single longest-lived structural pattern in Western music.

At Notre Dame (Léonin's *Magnus Liber Organi*, c. 1160s–70s, and Pérotin's three- and four-voice expansions, c. 1200) rhythm itself was first organized into a notated system: the **six rhythmic modes**, patterns of long and short groupings borrowed from classical poetic feet and encoded in the shapes of ligatures (note-groups), described in the treatise attributed to Johannes de Garlandia (c. 1240):

| Mode | Foot | Pattern |
|---|---|---|
| 1 | Trochee | long–short |
| 2 | Iamb | short–long |
| 3 | Dactyl | long–short–short |
| 4 | Anapest | short–short–long |
| 5 | Spondee | long–long |
| 6 | Tribrach | short–short–short |

In practice modes 1, 2, 3, and 5 dominate; mode 1 is by far the most common, mode 4 rare, mode 5 mostly a lower-voice device, mode 6 an upper-voice one (Wikipedia, "Rhythmic mode"). This is a genuine **rhythm alphabet**: six fixed durational cells, freely concatenable, giving 12th–13th century composers a notatable rhythmic vocabulary before mensural notation existed. Pérotin's generation also replaced sections of older discant with newly composed **substitute clausulae** — self-contained note-against-note passages over a short chant fragment — and clausulae detached from their host organum, given new Latin or French texts in the upper voice(s), became the **motet**, the genre that carries isorhythm through the next two centuries (Wikipedia, "Clausula (music)").

## Ars Nova: isorhythm and mensuration

Philippe de Vitry's treatise *Ars Nova* (c. 1320) named the fourteenth-century French style against the older *Ars Antiqua*; its rhythmic license was controversial enough that Pope John XXII's bull *Docta Sanctorum* (1324/25) condemned composers for fragmenting chant with hocket and "notes of small values." Its central engineering achievement, and the most directly implementable device on this page, is **isorhythm**.

### Isorhythm: talea × color, worked precisely

An isorhythmic tenor is built from two independently-cycling arrays read in lock-step by event index: **talea** ("cutting"), a repeating cycle of *N* rhythmic durations, and **color**, a repeating cycle of *M* pitches, usually drawn from a chant melody. At event *i* = 0, 1, 2, … the voice sounds `color[i mod M]` for the duration `talea[i mod N]`. When *N* ≠ *M* the cycles phase against each other — the same pitch recurs paired with a new duration and vice versa — and the pattern only returns to its starting phase after `lcm(N, M)` events. Machaut's isorhythmic Kyrie is the clean textbook case: a 28-pitch color paired with a 4-duration talea, so the talea repeats exactly seven times (28 ÷ 4) across one full color statement; other Machaut tenors use less tidy ratios, pairing a color that repeats only twice against a talea that repeats eleven times before the cycles realign, from the same two-array mechanism (Wikipedia, "Isorhythm," citing Bent, *New Grove Dictionary*, 2001, and Taruskin, *Oxford History of Western Music* vol. 1, 2010). The term itself is modern — coined only in 1904 by Friedrich Ludwig — though the technique spans the 13th–15th centuries. Two extensions worth building in: **diminution**, where a later color statement reuses the same pitch sequence with the talea's durations proportionally reduced (commonly halved or thirded), producing a written-in accelerando with zero new pitches, a favorite way to intensify a motet's final section; and **panisorhythm**, extending the talea principle from the tenor alone to every voice, each with its own (often related) talea — the technique's logical endpoint in later Ars Nova and early fifteenth-century practice.

### Mensuration, briefly

Ars Nova notation generalized rhythmic division beyond the older ternary-only system: **tempus** (the breve's division into semibreves) could be *perfect* (÷3) or *imperfect* (÷2), and **prolation** (the semibreve's division into minims) could be *major* (÷3) or *minor* (÷2), giving four combinable mensurations — roughly 9/8-, 6/8-, 3/4-, and 2/4-ish in modern terms — selectable by a single notated sign per voice. Per-voice selectability is what makes the **mensuration canon** possible: the same notated line can be sung in more than one mensuration, and therefore at more than one speed, at once (see below).

## Formes fixes and estampie: repetition schemes as data

The three 14th–15th century French **formes fixes** — ballade, rondeau, virelai — are, more than any other pre-Baroque form, literal grammars: fixed letter-schemes any text and tune can be poured into, capital letters marking refrain material (same music *and* words every time) and lowercase marking new text set to already-used music (David Fallows, "Formes fixes," *Grove Music Online*, cited via Wikipedia, "Formes fixes").

| Form | Musical scheme | How it works |
|---|---|---|
| Ballade | AAB per stanza | Two identical Stollen (A, A), each singing a couplet, close on alternating **ouvert/clos** cadences; a contrasting Abgesang (B) sets the remaining lines, ending on the refrain (same words and music every stanza) |
| Rondeau | ABaAabAB | Refrain phrases A and B (capital = fixed text+music) alternate with new text (a, b) sung to that *same* A/B music; the piece opens and closes on the full refrain |
| Virelai | AbbaA per stanza, framed by refrain A | Each stanza is itself a bar form: two Stollen (b, b) then an Abgesang (a) that shares the refrain's rhyme and music |

Machaut is the central composer for all three (42 ballades, 33 virelais, and rondeaux including the retrograde showpiece below); Dufay and Hayne van Ghizeghem carried the rondeau into the later fifteenth century, after which the musical forms lapse and the names survive only as poetic ones (Wikipedia, "Rondeau (forme fixe)," "Ballade (forme fixe)," "Virelai"). Each row above is directly a **section-sequence schema** — a short list of section labels where repeated labels mean "replay the composed music" and distinct labels mean "compose new material" — exactly the data object [form-and-structure](form-and-structure.md) and [phrase-structure](phrase-structure.md) already want for verse-chorus and rounded-binary forms; the formes fixes just add three more, historically load-bearing entries to that schema library.

The instrumental **estampie** applies the same open/closed logic without text: a series of sections (*puncta*), each played twice to a shared pair of cadences — an unstable **ouvert** ("open") ending the first time, a stable **clos** ("closed") ending the second: A-*ouvert*/A-*clos*, B-*ouvert*/B-*clos*, C-*ouvert*/C-*clos*, and so on. Ouvert/clos is transparently the medieval ancestor of the first/second ending (*volta*) in modern notation, and it is the same device the ballade uses to close its paired Stollen.

## Renaissance polyphonic technique

### Imitation and canon as strict transforms

Where medieval polyphony is built on a slow fixed tenor, Renaissance polyphony (roughly Dufay to Palestrina/Lassus, c. 1420–1600) is built on **imitation**: successive voices enter with the same idea one after another, so texture itself narrates the piece — a new **point of imitation** typically launches with each new phrase of text, its subject stated voice by voice while the others continue in free counterpoint, producing overlapping, continuously-renewing entries rather than one simultaneous tune-plus-accompaniment (Wikipedia, "Imitation (music)"; Britannica, "Counterpoint," Renaissance section). [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) already covers imitation and canon/round generically; what is specific to this repertoire is how far the *strictness* of the transform was pushed:

- **Interval canon** — leader and follower sing the same line a fixed interval apart; Ockeghem is credited as the first composer of canons at "imperfect" intervals (2nd, 3rd, 6th, 7th) rather than only the traditionally consonant unison, 4th, 5th, and octave.
- **Prolation/mensuration canon** — leader and follower read the *same notated line* under different mensuration signs, so they perform it at genuinely different, simultaneous speeds. Ockeghem's *Missa prolationum* (before 1497) is built entirely from such canons, moving from unison-interval, same-speed pairs at the opening to voices a full octave apart in different mensurations by the Sanctus's "Osanna" — called "perhaps the most extraordinary contrapuntal achievement of the fifteenth century" (Wikipedia, "Missa prolationum"). Josquin's Agnus Dei II from the *Missa L'homme armé super voces musicales* compresses the idea into one movement: three voices sing an identical line at speed ratios 1:2:3 simultaneously (Wikipedia, "Missa L'homme armé super voces musicales").
- **Retrograde (crab) canon** — a voice reads its partner's line backwards. Machaut's rondeau *Ma fin est mon commencement* ("my end is my beginning," mid-14th c.) is the archetype: the tenor is a note-for-note palindrome, and the cantus and triplum are each other read in reverse, so the piece performs as ABAAABAB and literally does what its title claims.
- **Mirror/inversion canon** — the follower is the leader's melodic mirror image (rising becomes falling); rarer here than the types above, but the same "one seed line, one declared transform" family.

All four types are algorithms already: one seed line plus one declared transform (transpose, re-meter, reverse, invert) generates the rest of the texture by rule, no further compositional choices needed once seed and transform are fixed. Their cost is perceptual — dense canonic machinery of this kind is often inaudible as such to an untrained ear, so this page asserts only what the *technique* is, not that a listener reliably hears it; see [thematic-development-and-variation](thematic-development-and-variation.md) for what canon and variation devices actually register as.

### Soggetto cavato and mass-composition procedures

**Soggetto cavato** ("subject carved out," Zarlino's 1558 name for a technique Josquin originated) turns a name or word directly into a melody: each vowel in the text picks out the solmization syllable(s) containing that vowel — u→**ut**, e→**re**, i→**mi**, o→**sol**, a→**fa** or **la** (both contain "a"; the composer resolves the ambiguity by range or voice-leading) — and reading off one syllable per vowel yields a pitch sequence. Josquin's *Missa Hercules Dux Ferrariae* is the founding, best-documented case: "Her-cu-les Dux Fer-ra-ri-e" → Re-Ut-Re-Ut-Re-Fa-Mi-Re, an eight-note theme used as the mass's cantus firmus (Wikipedia, "Soggetto cavato"; musicuspracticus.com, "Hercules Dux Ferrariae"). It is transparently a deterministic name-to-melody function, the same kind of lookup-table algorithm as Guido d'Arezzo's earlier vowel-to-pitch scheme for chant text-setting, already covered in [algorithmic-composition-history](algorithmic-composition-history.md).

Renaissance mass composers reused material at three escalating levels of strictness, still a useful rough vocabulary for "how much of the source survives":

- **Cantus-firmus mass** — a single borrowed melody (chant, later a secular tune) stated in long, mostly unornamented notes, usually in the tenor, under freely composed surrounding voices. *L'homme armé*, a secular song, is the most-set cantus firmus on record — over 40 surviving mass settings, including two by Josquin (Wikipedia, "Cantus firmus"). His *Missa L'homme armé super voces musicales* pushes the idea further, transposing the tune to start on each successive note of the natural hexachord (ut, re, mi, fa, sol, la) in turn, one mapping per movement — hexachord and cantus firmus fused into a single systematic transformation scheme.
- **Paraphrase mass** — the borrowed melody is ornamented and woven through *all* voices rather than parked in one, blending source and invention (Wikipedia, "Paraphrase mass").
- **Parody (imitation) mass** — multiple voices and structural ideas of an entire pre-existing polyphonic piece (a motet or chanson), not just one line, are reworked throughout; this displaces the stricter cantus-firmus approach over the sixteenth century (Wikipedia, "Parody mass").

### Musica ficta and the hexachord: a rule-driven accidental pass

Renaissance notation routinely under-specified pitch: singers supplied unwritten chromatic alterations, **musica ficta**, by rule rather than by score marking. Two named, ranked motivations govern most cases. ***Causa necessitatis*** ("for necessity") fixes an illegal vertical interval, most urgently the tritone — the *mi contra fa* ("mi against fa") clash nicknamed *diabolus in musica*, "mi contra fa est diabolus in musica," in the proverb the original Grove *Dictionary of Music and Musicians* itself records (Wikisource, "A Dictionary of Music and Musicians / Mi contra Fa"). ***Causa pulchritudinis*** ("for beauty") instead sweetens an already-legal imperfect consonance by narrowing it toward the perfect consonance it is about to resolve to — most often, sharpening a melodic approach to a cadence — and by convention this beauty-motivated rule **takes priority** over the necessity-motivated one when they conflict (Wikipedia, "Musica ficta"). A third widely cited mnemonic, *una nota supra la semper est canendum fa* ("a note one step above *la* is always sung as *fa*"), patches the specific case of a note sitting a tritone above the hexachord's own *fa*. Modern editors mark every such addition explicitly, typically above the staff, because — scholarship is candid about this — the surviving treatises are "far too cursory" to reconstruct historical practice with confidence; how much ficta to add remains live editorial disagreement, not a solved problem (Wikipedia, "Musica ficta").

These rules only make sense against the **hexachord** system underlying Renaissance solmization: six-note units (ut-re-mi-fa-sol-la, texted from the hymn *Ut queant laxis*) with the semitone always falling between mi and fa, tiled across the gamut as three transpositions — *natural* (on C, no B at all), *hard*/*durum* (on G, B-natural as mi), *soft*/*molle* (on F, B♭ as fa) — between which singers **mutate** (switch hexachord mid-phrase) whenever a melody's range or an accidental needs a note outside the current one (medieval.org Early Music FAQ, "Hexachords, solmization, and musica ficta"). Musica ficta is, in effect, an extra hexachord invoked situationally on top of this system; [algorithmic-composition-history](algorithmic-composition-history.md) covers Guido's original eleventh-century hexachord/solmization invention.

## Instrumental and dance repertoire: grounds and divisions

Renaissance instrumental dance music left the era's most directly reusable harmonic material: paired dances and fixed-bass **grounds** that professional and amateur players alike used as an improvisation skeleton.

The **pavane** (slow, duple, c. 1450s–1600s; earliest printed examples in Joan Ambrosio Dalza's 1508 collection) was routinely paired with the fast, triple-meter **galliard** as its "afterdance," much as the walking **passamezzo** was paired with the quicker, leaping **saltarello**; period practice often wrote such pairs as a matched set, and Britannica characterizes "the galliard time" as "a rhythmic adaptation of that of the preceding pavane" — sometimes literally the same tune re-metered from duple into fast triple rather than an unrelated new melody (Britannica, "Galliard"; Wikipedia, "Pavane"). A pavane's own form is typically three repeated strains, AA′BB′CC′, each 8, 12, or 16 bars.

Alongside the dance pairs sit five **grounds** — short, fixed harmonic patterns reused across hundreds of independently composed pieces, functioning exactly like a modern chord-loop preset:

| Ground | Progression | Example (one key) | Notes |
|---|---|---|---|
| Passamezzo antico | i–VII–i–V–III–VII–i–V–i | Am–G–Am–E–C–G–Am–E–Am | The minor-mode standard across 16th-c. Europe |
| Passamezzo moderno | I–IV–I–V / I–IV–I–V–I | C–F–C–G / C–F–C–G–C | Major-mode counterpart, same dance function |
| Romanesca | III–VII–i–V, repeated, cadencing on i | C–G–Am–E–C–G–Am–E–Am | A passamezzo-antico relative starting on the mediant; both a sung-poetry aria formula and an instrumental theme |
| Folia (early) | no fixed progression — a compositional-improvisational *method* over a minor-mode tune | — | Iberian, late 15th c.; crystallizes into the famous fixed 16-bar i–V–i–VII–III–VII–i–V progression only around 1670 (the "later folia") |
| Bergamasca | I–IV–V–I (a 2-bar unit, two chords per bar) | C–F–G–C | Rustic/comic association (from Bergamo); simplest of the grounds |

(Wikipedia, "Passamezzo antico," "Passamezzo moderno," "Romanesca," "Folia," "Bergamask.") These are the documented ancestors of the loop harmony [harmony](harmony.md) already catalogs for pop (the Axis progression and kin); see also the sibling page [modal-and-nonfunctional-harmony](modal-and-nonfunctional-harmony.md) for this same modal, non-functional chord vocabulary in general.

The era's variation practice was **divisions** (English) / ***glosas*** (Spanish) / ***passaggi*** (Italian) / diminutions: replacing a ground's long notes with fast scalar or arpeggiated figuration, taught in treatises as a layered, teachable skill. Diego Ortiz's *Trattado de glosas* (Rome, 1553) — the first printed diminution manual for bowed strings, and a peer to Sylvestro Ganassi's earlier *La Fontegara* (1535) — works through ornamented cadential formulas and full variation sets ("recercadas") over stock basses including the passamezzo and romanesca; Girolamo dalla Casa's *Il vero modo di diminuir* (Venice, 1584) extends the vocabulary with more rhythmically jagged, harder-edged figures and is often read as marking the turn toward Baroque ornament practice. Divisions formalize what an engine needs anyway: a **figuration function** that takes a skeletal interval (the leap from one ground-tone to the next) and returns one of a small library of standard fill-in shapes — scalar run, turn, arpeggiated leap-fill — at a chosen rhythmic density.

## Implications for generative engines

- **Isorhythm generator.** Represent a voice as two independently-indexed cyclic arrays, `talea[N]` (durations) and `color[M]` (pitches), combined as `event[i] = {pitch: color[i % M], dur: talea[i % N]}`; choose N and M so `lcm(N,M)` gives the desired section length (small shared factors for a clean, audibly cyclic tenor; near-coprime N and M for a longer, less predictable one). Diminution is free: halve or third `talea`'s values partway through for a scored-in accelerando with no new pitch material. This is cheap, robust, and historically proven, and it is structurally the same trick as Engine 05's sieve-based percussion timelines, which already exploit independent-length cycles for the same reason ([findings-percussion-engine](findings-percussion-engine.md)).
- **Formes-fixes scheme library.** Encode ballade/rondeau/virelai/estampie, alongside verse-chorus/AABA/rounded-binary from other pages, as one shared schema type: an ordered list of section labels where repeats mean "replay this composed section" and fresh labels mean "generate new material of the declared length," plus a per-form rule for where the refrain must land. One `realizeScheme(schema, sectionGenerator)` function drives all of them.
- **Ground-bass loop library with divisions.** Ship the five grounds above as literal chord-sequence presets — a modal-flavored complement to [harmony](harmony.md)'s Axis-family pop loops — each paired with a division-style figuration policy: a small bank of scalar/turn/arpeggio fill shapes, with a figuration-density parameter that can itself rise over repetitions (Ortiz's own recercadas get busier as they proceed), turning one static ground into a built-in variation set.
- **Musica-ficta-like idiom-legalizer.** Generalize *causa necessitatis*/*causa pulchritudinis* into a reusable post-process: a rule pass that scans already-generated modal material for locally illegal verticals (tritones against a sustained tone) and fixes them with the smallest local pitch nudge, then a separate, lower-priority pass nudges melodic approaches to cadences toward the nearest suitable interval. The two-tier priority (beauty-motivated overrides necessity-motivated) is a useful general pattern for stacking soft style-rules over any generative skeleton, not only a modal one.
- **Mode grammars as style-pack pitch fields.** Each church mode already is a complete instance of the `{cents[], hierarchyWeights[], grammar}` object [tuning-and-scales](tuning-and-scales.md) asks for: final and tenor as the two highest-weighted degrees, ambitus as a hard range constraint, and the (contested but engine-harmless) centonization formula bank as the "grammar" — a ready-made pitch-field style pack, older than and distinct from major/minor.
- **Prolation canon as a texture generator.** Store one melodic array and play it through N voices at N different, simultaneously-running tick-rates (e.g., 1:2:3, matching Josquin's Agnus Dei II) — trivial for a scheduler that already supports per-voice tempo maps ([scheduling-and-timing](scheduling-and-timing.md)). Deploy it as one texture among several, not a centerpiece: per the perceptual-limits caveat above, its craft is more legible to the engine's designer than to most listeners in real time.
- **Soggetto cavato as a personalization hook.** `vowel → syllable` is a five-line lookup table; feeding it a user-typed name or word to seed a cantus firmus is a literal, historically-attested, and cheap "make it personal" feature for a browser engine.
- **Mass-procedure ladder as a material-reuse dial.** Cantus-firmus (strict, one borrowed line, mostly untouched) → paraphrase (ornamented, spread across voices) → parody (a whole prior texture reworked) is a ready-made three-point scale for "how strongly should this new section quote the engine's own earlier material," useful for any engine wanting audible cross-references without literal repetition.

## Open questions

- The centonization/oral-formulaic debate (Ferretti vs. Treitler vs. the 2025 computational middle ground) is unresolved even among specialists; this page's position is that engines don't need it resolved, but a future session with more compute could test whether a generated formula-bank chant sounds more convincing under a Ferretti-style fixed-tile model or a Treitler-style constraint-based one — a testable question this project is well positioned to answer empirically rather than just cite.
- How audible is a 1:2:3 mensuration/prolation canon to an untrained listener in a browser context, versus a trained score-reader? Worth a cheap listening-test item once [thematic-development-and-variation](thematic-development-and-variation.md) and [listening-tests-and-feedback](listening-tests-and-feedback.md) machinery exists for this kind of question.
- The vowel-to-solmization mapping for soggetto cavato is confirmed for u/e/i/a from the Hercules Dux Ferrariae derivation, but the o→sol leg rests on elimination (sol is the only syllable containing "o") rather than a directly cited worked example; verify against a second soggetto-cavato piece before shipping it as a generative feature.

## Related pages

- [western-classical-tradition](western-classical-tradition.md) — where the Baroque continues from this page's endpoint
- [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) — species counterpoint, generic imitation/canon/hocket, voice-leading psychology
- [harmony](harmony.md) — loop harmony and the Axis family, the grounds' modern descendants
- [algorithmic-composition-history](algorithmic-composition-history.md) — Guido d'Arezzo's vowel-to-pitch scheme, soggetto cavato's deep ancestor
- [tuning-and-scales](tuning-and-scales.md) — the `{cents, hierarchyWeights, grammar}` schema modes instantiate
- [form-and-structure](form-and-structure.md) and [phrase-structure](phrase-structure.md) — the broader form-schema catalog formes fixes joins
- [findings-percussion-engine](findings-percussion-engine.md) — independent-cycle-length timelines already implemented, isorhythm's rhythmic cousin
- [scheduling-and-timing](scheduling-and-timing.md) — per-voice tempo maps needed for a prolation canon
- [modal-and-nonfunctional-harmony](modal-and-nonfunctional-harmony.md) — sibling page on the modal chord vocabulary the grounds use
- [thematic-development-and-variation](thematic-development-and-variation.md) — sibling page on what canon and variation devices are actually audible
- [european-folk-and-dance](european-folk-and-dance.md) — sibling page on the dance lineage pavane/galliard/estampie feed into

## Sources

- Encyclopaedia Britannica, "Church mode." https://www.britannica.com/art/church-mode
- Wikipedia, "Gregorian mode." https://en.wikipedia.org/wiki/Gregorian_mode
- Wikipedia, "Hypophrygian mode." https://en.wikipedia.org/wiki/Hypophrygian_mode
- Encyclopaedia Britannica, "Psalm tone." https://www.britannica.com/art/psalm-tone
- Wikipedia, "Reciting tone." https://en.wikipedia.org/wiki/Reciting_tone
- Wikipedia, "Centonization." https://en.wikipedia.org/wiki/Centonization
- Wikipedia, "Leo Treitler." https://en.wikipedia.org/wiki/Leo_Treitler
- Treitler, Leo. "Homer and Gregory: The Transmission of Epic Poetry and Plainchant." *The Musical Quarterly* 60/3 (1974) — cited via Wikipedia, "Centonization" and "Leo Treitler."
- Treitler, Leo. "'Centonate' Chant: Übles Flickwerk or E pluribus unus?" *Journal of the American Musicological Society* 28/1 (1975) — cited via Wikipedia, "Centonization."
- Hiley, David. *Western Plainchant: A Handbook.* Oxford University Press, 1993 — cited via Wikipedia, "Centonization."
- Lanz, Vojtěch & Hajič jr., Jan. "Gregorian melody, modality, and memory: Segmenting chant with Bayesian nonparametrics." arXiv:2507.00380 (2025). https://arxiv.org/abs/2507.00380
- Wikipedia, "Organum." https://en.wikipedia.org/wiki/Organum
- Wikipedia, "Rhythmic mode." https://en.wikipedia.org/wiki/Rhythmic_mode
- Wikipedia, "Clausula (music)." https://en.wikipedia.org/wiki/Clausula_(music)
- Wikipedia, "Isorhythm," citing Bent, M., *The New Grove Dictionary of Music and Musicians* (2001), and Taruskin, R., *Oxford History of Western Music*, vol. 1 (2010). https://en.wikipedia.org/wiki/Isorhythm
- Wikipedia, "Prolation." https://en.wikipedia.org/wiki/Prolation
- Pope John XXII, *Docta Sanctorum Patrum* (1324/25), as summarized in course materials reproducing the bull. https://wps.prenhall.com/hss_mymusiclibrary_1/167/42754/10945261.cw/index.html
- Wikipedia, "Formes fixes," citing Fallows, David, "Formes fixes," *Grove Music Online*. https://en.wikipedia.org/wiki/Formes_fixes
- Wikipedia, "Rondeau (forme fixe)." https://en.wikipedia.org/wiki/Rondeau_(forme_fixe)
- Wikipedia, "Ballade (forme fixe)." https://en.wikipedia.org/wiki/Ballade_(forme_fixe)
- Wikipedia, "Virelai." https://en.wikipedia.org/wiki/Virelai
- Wikipedia, "Estampie." https://en.wikipedia.org/wiki/Estampie
- Wikipedia, "Imitation (music)." https://en.wikipedia.org/wiki/Imitation_(music)
- Encyclopaedia Britannica, "Counterpoint" (Renaissance section). https://www.britannica.com/art/counterpoint-music/The-Renaissance
- Wikipedia, "Missa prolationum." https://en.wikipedia.org/wiki/Missa_prolationum
- Wikipedia, "Missa L'homme armé super voces musicales." https://en.wikipedia.org/wiki/Missa_L%27homme_arm%C3%A9_super_voces_musicales
- Jordan Alexander Key, "My End is My Beginning: 'Popular' (?) Music from 14th Century France: Part 3" (on Machaut's *Ma fin est mon commencement*). https://www.jordanalexanderkey.com/single-post/2016/08/13/popular-music-from-14th-century-france-part-3-guillaume-de-machaut-c-1300-1377-rondea
- Wikipedia, "Soggetto cavato." https://en.wikipedia.org/wiki/Soggetto_cavato
- Musicus Practicus Academy, "Hercules Dux Ferrariae: Secrets and Techniques of Renaissance Composition!" https://musicuspracticus.com/guides/renaissance/hercules-dux-ferrariae/
- Wikipedia, "Cantus firmus." https://en.wikipedia.org/wiki/Cantus_firmus
- Wikipedia, "Paraphrase mass." https://en.wikipedia.org/wiki/Paraphrase_mass
- Wikipedia, "Parody mass." https://en.wikipedia.org/wiki/Parody_mass
- Wikisource, "A Dictionary of Music and Musicians / Mi contra Fa" (the original Grove Dictionary, 1880s). https://en.wikisource.org/wiki/A_Dictionary_of_Music_and_Musicians/Mi_contra_Fa
- Wikipedia, "Musica ficta." https://en.wikipedia.org/wiki/Musica_ficta
- Early Music FAQ (medieval.org), "Hexachords, solmization, and musica ficta." http://www.medieval.org/emfaq/harmony/hex1.html and http://www.medieval.org/emfaq/harmony/hex2.html
- Encyclopaedia Britannica, "Galliard." https://www.britannica.com/art/galliard-dance
- Wikipedia, "Pavane." https://en.wikipedia.org/wiki/Pavane
- Wikipedia, "Passamezzo antico." https://en.wikipedia.org/wiki/Passamezzo_antico
- Wikipedia, "Passamezzo moderno." https://en.wikipedia.org/wiki/Passamezzo_moderno
- Wikipedia, "Romanesca." https://en.wikipedia.org/wiki/Romanesca
- Wikipedia, "Folia." https://en.wikipedia.org/wiki/Folia
- Wikipedia, "Bergamask." https://en.wikipedia.org/wiki/Bergamask
- HOASM (Historically Oriented Musician's Almanac), "Diego Ortiz." http://www.hoasm.org/IVL/Ortiz.html
- Wikipedia, "Girolamo Dalla Casa." https://en.wikipedia.org/wiki/Girolamo_Dalla_Casa
