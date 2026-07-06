---
title: Gamelan
tags: [genre]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Javanese and Balinese gamelan as human-made algorithmic music — colotomic gong cycles, a core melody elaborated at fixed density ratios, paired-detuned non-equal tunings, and interlocking figuration.
---

# Gamelan

Gamelan — the gong-and-metallophone ensemble music of Java and Bali — is arguably the clearest existing example of algorithmic ensemble music made by humans. A short skeletal melody is placed inside a nested cycle of gong punctuations, and every other part in a 20-plus-player ensemble is derived from that skeleton by near-mechanical elaboration rules, at density ratios fixed by convention. The result is not mechanical-sounding: it is dense, shimmering, and continuously interesting. For this project, gamelan is a proof of concept that "core line + rule-driven derivation + cyclic time" can produce rich music, and its specific mechanisms (colotomy, irama, kotekan, pathet, ombak) are directly implementable.

*Project note (2026-07-06): gamelan remains a load-bearing **knowledge** page — its colotomy/irama/kotekan mechanisms inform any "core line + derivation" engine — but it is **no longer in the first-engines shortlist**, which now favors an Indian classical + pop engine ([project-roadmap](project-roadmap.md)).*

## The ensemble in brief

A gamelan is a matched set of bronze (sometimes iron) instruments: hanging and horizontal gongs, keyed metallophones over resonators, drums, plus optionally xylophone (gambang), bamboo flute (suling), bowed rebab, and voices. The double-headed kendhang drum "unites them and acts as leader," controlling tempo and cueing transitions (Britannica). Javanese gamelan is generally slower and includes singers; Balinese gamelan (e.g., gong kebyar) is mostly percussion, brighter, faster, and marked by sudden ensemble bursts — kebyar means "to flare up." Each gamelan is tuned as a set, to itself, not to an external standard; instruments are not interchangeable between ensembles.

## Colotomic structure: time as nested gong cycles

Colotomy (term coined by Jaap Kunst) is the marking of nested time intervals by specific instruments. One full cycle is a *gongan*, closed by the great gong (gong ageng); within it, kenong divides the cycle into large sections, kempul subdivides the kenong sections, and kethuk subdivides further. The subdivision is hierarchical and almost always binary.

Concrete example — *lancaran* form, 16 balungan beats (T = kethuk, N = kenong, P = kempul, W = wela/rest, G = gong):

```
beat:   1 2 3 4  5 6 7 8  9 10 11 12  13 14 15 16
strokes: T W T N  T P T N  T P  T  N   T  P  T  N+G
```

Kethuk marks every odd beat, kenong every 4th beat, kempul the midpoints of kenong sections (the first is omitted — the *wela* gap), and gong coincides with the final kenong. Longer forms (*ketawang*, *ladrang*, 32 beats and up) use the same logic with sparser punctuation; the gong "generally indicates that the preceding section will be repeated, or the piece will move on to a new section" (Wikipedia, Colotomy). Form is cyclic, not an arc: a piece is a cycle repeated with changing treatment, and large-scale shape comes from tempo/density transitions and section changes, not from harmonic departure and return.

## Balungan and stratified elaboration

The *balungan* ("skeleton") is the core melody, typically notated as one note per beat in four-beat groups (*gatra*), played by the saron family and slenthem. Around it:

- **Punctuating instruments** (gong, kenong, kempul, kethuk) mark the colotomy as above.
- **Elaborating instruments** (bonang barung and panerus, gender, gambang, rebab, suling, voice) realize the balungan at higher densities, each with its own idiom — e.g., bonang *mipil* (walking through balungan note pairs one at a time, ahead of the beat), *gembyangan* (octave doubling at set positions), *imbal* (two bonang interlocking); the peking (saron panerus) doubles/repeats balungan notes in a fixed pattern.
- A recent open-access dataset paper shows these derivations are literally rule-expressible: peking, bonang, and structural parts were generated from balungan notation by explicit rules conditioned on balungan type (mlaku/nibani/gantung), pathet, and the goal tone (*seleh*) of each gatra.

The Javanese term *garap* ("working out") names this practice: musicians do not read parts; they derive them, live, from the skeleton plus context. Elaboration converges on the seleh tone at the end of each gatra — the parts are heterophonic in the middle and aligned at structural points.

## Irama: the density-tempo system

*Irama* is the ratio between the balungan beat and the fastest elaborating parts — density, not tempo. As the balungan slows past thresholds, elaborating instruments double their subdivision to keep surface activity roughly constant; the reference is the saron panerus/peking:

| Irama | Name | Peking notes per balungan note |
|-------|----------|-------------------------------|
| 1/2 | lancar | 1 |
| I | tanggung | 2 |
| II | dados (dadi) | 4 |
| III | wilet | 8 |
| IV | rangkep | 16 |

Independently of irama, tempo proper (*laya*) can be fast, medium, or slow. So a performance can slow the balungan by a factor of 16 while the music's surface stays continuous — "in slower irama, there is more space to be filled, and typically elaborating instruments become more important" (Wikipedia, Irama). Irama transitions, cued by the drummer, are the main dramatic events of a Javanese piece.

## Tuning: slendro, pelog, and ombak

- **Slendro**: five tones per octave, *roughly* but deliberately not exactly equidistant; interval sizes vary between gamelans, and "no two gamelan sets will have exactly the same tuning" (Wikipedia, Slendro).
- **Pelog**: seven unequal tones per octave, of which five-tone subsets are used in practice; Balinese gong kebyar uses *pelog selisir* (tones 1,2,3,5,6).
- **Ombak** ("wave"): Balinese instruments come in detuned pairs — the lower *pengumbang* and higher *pengisep* — e.g., 220 Hz against 228 Hz on paired gangsa, producing a deliberate beating that gives the ensemble its shimmering pulsation; large gongs also carry a slow built-in beat of a few Hz. Beating rate is a tuned aesthetic parameter, not an accident.
- Sethares argues gamelan scales and the inharmonic spectra of bars and gongs are co-adapted: consonance for these timbres genuinely peaks near gamelan intervals, not near Western ones. Tuning and timbre must be designed together.

## Pathet: the modal layer

*Pathet* limits how the tuning is used: three pathet in slendro (nem, sanga, manyura) and three in pelog (lima, nem, barang). Pathet functions "as a limitation on the player's choice of variation," making certain tones prominent, certain tones avoided, and certain tones proper as cadence/gong tones and phrase endings (Wikipedia, Pathet). In all-night wayang (shadow-play) accompaniment the pathet progresses through fixed stages of the night. Pathet is carried most clearly by the multi-octave elaborating parts (rebab, voice, gender), not by the balungan alone — mode here is a constraint set over register, emphasis, and cadence, more than a scale.

## Kotekan: interlocking figuration (Bali)

Balinese *kotekan* splits a rapid figuration line between two parts: *polos* (mostly on-beat) and *sangsih* (mostly off-beat), each rhythmically incomplete, sounding together as one line "that often sounds faster than any single human could possibly play" (Wikipedia, Kotekan). Varieties include nyog cag (strict alternation), kotekan telu (built on three shared pitches), and kotekan empat (four pitches, no sharing). The composite runs at 4–8× the density of the core melody (*pokok*). This is the same interlocking principle found in [west-african-rhythm](west-african-rhythm.md) (amadinda, mbira) — two simple parts, one emergent surface.

## Implications for generative engines

Gamelan hands us an engine architecture almost ready to code:

1. **Master clock = nested binary cycle.** Implement the colotomy as a cycle length (e.g., 16/32/64 beats) with punctuation events at power-of-two divisions (gong → kenong → kempul → kethuk), each mapped to progressively lighter sounds. This gives listeners hierarchical temporal orientation with zero harmonic machinery. See [scheduling-and-timing](scheduling-and-timing.md).
2. **Generate one line, derive everything else.** The composer-algorithm writes only the balungan (one note per beat, in 4-beat gatra, each gatra targeting a seleh tone). All other parts are deterministic-with-options transforms: doubling patterns, off-beat interlock, neighbor-tone figuration converging on seleh at gatra ends. Alignment at structural points + freedom in between = heterophony that sounds intentional.
3. **Irama as a first-class control.** Expose a density-ratio parameter (1, 2, 4, 8, 16 subdivisions per beat) coupled to inverse tempo. Slowing the skeleton while elaboration fills in is a cheap, idiomatic way to create sections and long-range shape without new material.
4. **Tuning tables, not 12-TET.** Store slendro/pelog as cents tables *per virtual ensemble*, randomized slightly at initialization (each run = a uniquely tuned gamelan). Detune paired voices by a controlled Hz offset (ombak) for ensemble shimmer; make beat rate (e.g., 4–8 Hz) an explicit parameter. Use inharmonic partials in synthesis so tuning and timbre agree (Sethares); an equal-tempered "gamelan" with harmonic timbres is the exotic-wallpaper failure mode. See [tuning-and-scales](tuning-and-scales.md) and [synthesis-recipes](synthesis-recipes.md).
5. **Kotekan as complementary masks.** Generate a fast target line, then split it by two complementary onset masks (on-beat/off-beat, with shared tones at overlaps) into two softer voices panned apart. Emergent speed without machine-gun uniformity.
6. **Pathet as constraint set.** Implement mode as: weighted tone hierarchy + forbidden tones + allowed cadence tones per section. Switching pathet mid-performance (keeping the tuning) is an idiomatic long-form device.
7. **Cycle, not arc.** Let form be "N repetitions of the gongan with treatment changes" (irama shifts, instrument dropouts, louder/softer styles), closed by a slowing final cycle. Drummer logic = a conductor process emitting tempo curves and transition cues.

## Open questions

- Exact stroke-placement tables for ketawang/ladrang and larger forms need verification against a scholarly source (Sumarsam's Wesleyan introduction was unreachable; retry).
- How much random variation in per-ensemble tuning is perceived as "character" vs "out of tune" by non-Indonesian listeners? Testable later; see [listening-tests-and-feedback](listening-tests-and-feedback.md).
- Javanese rebab/vocal elaboration (the most raga-like, least mechanical layer) is under-described here — worth a deeper pass before building a "soft" elaborating voice.
- Balinese repertoire-specific forms (kebyar's episodic form, gilak, etc.) are not covered; this page leans Javanese for structure and Balinese for tuning/kotekan.

## Related pages

- [tuning-and-scales](tuning-and-scales.md) — non-equal tunings, cents tables, why 12-TET is a choice
- [scheduling-and-timing](scheduling-and-timing.md) — implementing nested cycles and tempo curves in Web Audio
- [timbre-and-orchestration](timbre-and-orchestration.md) — inharmonic metallophone spectra, register layering
- [west-african-rhythm](west-african-rhythm.md) — timelines and interlocking; the other great cyclic-ensemble architecture
- [indian-classical-music](indian-classical-music.md) — contrasting model: grammar-driven melody instead of derived polyphony
- [east-asian-traditions](east-asian-traditions.md) — heterophony compared
- [minimalism-and-process-music](minimalism-and-process-music.md) — Western composers who borrowed cyclic/interlocking processes
- [generative-music-design-patterns](generative-music-design-patterns.md) — skeleton-plus-elaboration as a reusable pattern
- [musical-universals](musical-universals.md) — what gamelan's non-Western tuning implies about audience assumptions

## Sources

- Encyclopaedia Britannica, "Gamelan." https://www.britannica.com/art/gamelan
- Wikipedia, "Colotomy" — https://en.wikipedia.org/wiki/Colotomy; "Irama" — https://en.wikipedia.org/wiki/Irama; "Kotekan" — https://en.wikipedia.org/wiki/Kotekan; "Pathet" — https://en.wikipedia.org/wiki/Pathet; "Slendro" — https://en.wikipedia.org/wiki/Slendro; "Gamelan gong kebyar" — https://en.wikipedia.org/wiki/Gamelan_gong_kebyar
- "Notation of Javanese Gamelan dataset for traditional music applications" (open-access data paper, 2024) — rule-based derivation of peking/bonang/structural parts from balungan. https://pmc.ncbi.nlm.nih.gov/articles/PMC10885543/
- "Clustering of Indonesian and Western Gamelan Orchestras through Machine Learning of Performance Parameters" (arXiv:2409.03713, 2024) — tonal systems shared across Indonesian/Western ensembles; articulation and form variability differ. https://arxiv.org/abs/2409.03713
- W. A. Sethares, *Tuning, Timbre, Spectrum, Scale* (2nd ed., 2005) — spectra/scale co-adaptation, gamelan chapters. https://sethares.engr.wisc.edu/ttss.html
