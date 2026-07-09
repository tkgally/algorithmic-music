---
title: Texture and density
tags: [theory]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: Musical texture as a first-class compositional parameter — the classical and modern taxonomy, texture reduced to engine-controllable density dimensions (stream count, onset rate, spread, independence), the named accompaniment patterns, texture as a form-carrier, cross-cultural paradigms, and a texture-state-vector proposal.
---

# Texture and density

Texture is how many sounds happen at once, how they relate, and how densely they are packed — the simultaneous dimension of music, as against the horizontal dimensions of melody and rhythm. It is one of the highest-order axes of any style vector: the same pitches and rhythms rendered as a lone melody, a hymn, a fugue, a shimmering cluster, or a four-on-the-floor stack are five different pieces. Other project pages touch texture only in passing — [counterpoint and voice leading](counterpoint-and-voice-leading.md) names the classical types in a sentence, [timbre and orchestration](timbre-and-orchestration.md) covers spacing and foreground/background stratification, [auditory perception basics](auditory-perception-basics.md) fixes the ~3-stream tracking ceiling — but none treats texture as a parameter an engine sets and schedules. This page does: it gives the full taxonomy (classical plus the modern mass/cloud/point additions), reduces "density" to a few measurable dimensions a generator can control, catalogs the named accompaniment figures, shows how texture alone can carry form, and surveys cross-cultural texture paradigms as raw material for original styles ([style invention and style space](style-invention-and-style-space.md)). It ends with a texture-state-vector proposal and coherence constraints.

## The classical taxonomy

Four broad texture types recur across music-theory pedagogy (Open Music Theory; Wikipedia "Texture (music)"). They are not bins but a description of how many independent things are happening and how correlated they are.

### Monophony and heterophony

**Monophony** is a single melodic line with no accompaniment — one stream, whether played by one instrument or many in unison/octaves (doubling does not break monophony). **Heterophony** is the simultaneous variation of *one* melody: several performers render the same tune at once, each ornamenting, anticipating, delaying, or simplifying it differently, so the parts diverge between structural points and converge at them. Heterophony is not a Western common-practice default but the *ruling* texture of several living traditions: the Arabic **takht** — a small ensemble (oud, nay, qanun, violin/kamancheh plus riq) in which "all musicians play mainly the same melody but not exactly in unison," varying the *maqam* [melodic mode] line individually rather than harmonizing it (Melodigging; Lawrence Univ.) — and the East Asian court/chamber ensembles (gagaku, Jiangnan sizhu), where every instrument plays its own density-appropriate version of a shared skeletal tune ([east-asian-traditions](east-asian-traditions.md)). Heterophony yields ensemble richness with no harmony or counterpoint solver and degrades gracefully to any voice subset.

### Homophony: melody-and-accompaniment vs homorhythm

**Homophony** has one harmonically-dominant part supported by the rest. Two flavors:

- **Melody and accompaniment** — a clear tune over a subordinate accompaniment that carries its own (often figurated) rhythm: the default of most tonal and popular music. The accompaniment's shape is chosen from the named catalog below.
- **Homorhythm (chordal / "chorale" homophony)** — all voices move in the same rhythm, so the parts read as one block of moving harmony rather than as melody plus support: hymns, the SATB chorale ([counterpoint and voice leading](counterpoint-and-voice-leading.md)), block-chord piano, brass chorale. Homorhythm is the maximum-fusion, minimum-independence end of multi-voice writing.

### Polyphony: imitative and non-imitative

**Polyphony** is two or more *independent* melodic lines sounding together. **Imitative** polyphony passes one melodic idea from voice to voice (fugue, canon, motet, Renaissance imitative points) — cheap coherence, since the ear hears the relationship across registers. **Non-imitative (free)** polyphony runs independent lines that do *not* share material (a Baroque trio-sonata's contrasting parts, a New Orleans front line of trumpet/clarinet/trombone each doing its own job). Independence is a perceptual achievement, not a notational one, and it is bounded: listeners reliably track only about three concurrent lines of similar timbre ([auditory perception basics](auditory-perception-basics.md); [counterpoint and voice leading](counterpoint-and-voice-leading.md)), so a fourth "real" part becomes harmonic wash unless separated by register or timbre.

## Modern additions: mass, cloud, and point

Twentieth-century art music invented texture types the four-way scheme cannot hold, in which *individual pitch recedes and texture/timbre/density become the primary material* ([contemporary art music](contemporary-art-music.md)):

- **Sound mass** — a dense, homogeneous sonority formed by integrating many events within a narrow time and/or frequency span into one perceived unit while preserving an impression of underlying multiplicity (German *Klangfläche*, "sound surface"). It "minimizes the importance of individual pitches in preference for texture, timbre, and dynamics as primary shapers of gesture" (Wikipedia "Sound mass"; Noble & McAdams 2021 map its perceptual/semantic dimensions). Penderecki's *Threnody to the Victims of Hiroshima* (1959, 52 strings with clusters/glissandi/extended techniques) and Xenakis's *Metastasis* (1953–54) and *Pithoprakta* (1955–56, mass string glissandi placed by statistical distribution — [stochastic, chaos, and automata](stochastic-chaos-and-automata.md)) are canonical.
- **Micropolyphony** (Ligeti) — one *technique* for an evolving sound mass: many canonic voices (a divided choir or string section, a dozen-plus real parts) each moving stepwise by semitones/whole tones at staggered entries and slightly different rhythms, packed so tightly that no single line is individually audible. David Cope: it "resembles cluster chords but differs in its use of moving rather than static lines." What the ear receives is a slowly transforming cloud whose *density, register, and internal motion* — not its harmony — are the events. *Atmosphères* (1961) famously stacks scores of chromatic pitches across several octaves at once; *Lux Aeterna* (1966) realizes it with 16 overlapping vocal canons (Wikipedia "Micropolyphony").
- **Pointillism / punctualism** (Webern) — the opposite extreme of density: pitches presented a few isolated "points" at a time, silence as structural as sound. Often paired with **Klangfarbenmelodie** ("tone-color melody"), which distributes a single line across instruments so that *timbre change* carries the melody as much as pitch (Webern, *Fünf Stücke* Op. 10) — the music "feels contrapuntally dense while it is in fact quite sparse" (Wikipedia "Klangfarbenmelodie"; "Punctualism"). Relates to the timbral-shift/echo devices in [timbre and orchestration](timbre-and-orchestration.md).
- **Stratified / layered texture** — several simultaneous strata each internally coherent but at *different densities and rates*, separated by register and speed. Javanese gamelan is the textbook case: sparse colotomic gong punctuation, a medium-rate skeletal *balungan*, and fast elaborating figuration all sound at once, their density ratios fixed by the *irama* system ([gamelan](gamelan.md)). The same stratification underlies a modern arrangement's slow pad + mid chords + fast arpeggio + faster hats.

## Density as measurable dimensions

"Density" is not one number. An engine should control it along several orthogonal axes, most of them computable from the symbolic score ([computational music metrics](computational-music-metrics.md)):

1. **Stream / voice count** — how many simultaneous *perceived* lines. The hard ceiling for independent tracking is ~3 similar-timbre streams (do not re-derive; see [auditory perception basics](auditory-perception-basics.md)). Above it, extra parts must be voiced as fusion/wash, not counterpoint.
2. **Onset density (event rate)** — events per second, i.e. note density / notes-per-second (NPS), or, tempo-relative, onsets per beat and the prevailing subdivision level (MIR: "onset frequency, or event density, is the number of onset notes per second"). Crucially *independent of* stream count: one stream can be dense (fast runs) and a five-stream texture can be sparse (slow pad chords). Budget total events/sec across streams so the surface stays within the listener's attentional load ([attention and background listening](attention-and-background-listening.md)).
3. **Registral spread and internal spacing** — the total pitch span occupied (tessitura width) and the interval spacing within it. A texture can be dense in count yet *open* (wide spread) or *clustered* (narrow). Spacing must widen toward the bass — thirds/clusters muddy below ~C3 because of critical bands; this is fully covered in [timbre and orchestration](timbre-and-orchestration.md) (spacing) and [auditory perception basics](auditory-perception-basics.md) (roughness), so link, do not re-derive.
4. **Timbral / spectral density (crowding)** — how many voices occupy the same frequency band. Even a legal note-count sounds muddy if voices pile into one critical band; blend, masking, and register lanes are the levers ([timbre and orchestration](timbre-and-orchestration.md)).
5. **Rhythmic-independence degree** — the *homophony↔polyphony axis made continuous*: the correlation of onsets and contours across streams, from 0 (homorhythm, all locked) through ~0.5 (melody + independent accompaniment) to 1 (fully independent lines). This single scalar captures most of what the classical taxonomy encodes categorically, and is directly settable.

## The accompaniment-texture catalog

Melody-and-accompaniment homophony is realized through a small vocabulary of named left-hand / rhythm-section figures — a lookup table an engine can pick from per section, and the cheapest way to vary texture without changing the notes:

- **Block chords** — all chord tones struck together (homorhythmic accompaniment); the neutral default, strong for arrival points.
- **Alberti bass** — a broken chord in the fixed order lowest–highest–middle–highest, repeated as steady eighths/sixteenths; named for Domenico Alberti (1710–1746), the signature Classical-era keyboard accompaniment giving harmonic motion under a singing melody (Wikipedia "Alberti bass").
- **Murky bass** — an 18th-century figure of rapidly alternating *broken octaves* in the bass (e.g. Beethoven, *Pathétique* first movement); adds low-register energy and drive (Oxford Reference; Merriam-Webster).
- **Waltz / oom-pah** — bass note on the downbeat, chord(s) on the offbeats (bass–chord–chord in 3/4 waltz; bass–chord alternation in 2/4 polka/march); separates register roles rhythmically.
- **Arpeggiated / broken-chord figuration** — chord tones sounded in sequence (rolling, wave, or free patterns), a more fluid generalization of Alberti; the harp/guitar/keyboard idiom.
- **Pad** — sustained chords held across the harmony, minimal onset density; the fusion/background bed ([ambient and generative genre](ambient-and-generative-genre.md)).
- **Ostinato / riff** — a short pitched-and-rhythmic pattern repeated as the harmonic and textural floor; the engine of rock, funk, minimalism ([minimalism and process music](minimalism-and-process-music.md)), and most cyclic world musics.
- **Comping** — jazz/pop chordal accompaniment that is *rhythmically responsive and varied*, not metronomic: syncopated stabs, anticipations, voice-led shells ([jazz and improvisation](jazz-and-improvisation.md)). The project has prior art: Engine 04's v0.2 rebuild replaced a metronomic arpeggio with a **per-seed comping-template bank** (broken chord, bass–chord "boom-chick," syncopated stabs, flowing mixed-length arpeggio, sustained pad), chosen per bar from a section-appropriate set, never repeated two bars running, with inter-chord voice leading and density that tracks the form ([findings — the cantabile engine](findings-cantabile-engine.md)).

## Texture as a carrier of form

Texture is not only local color; a trajectory *through* texture can supply large-scale form on its own, even where harmony is static or absent — this is the founding lesson of the project's percussion work, where "with no chords to modulate and no tune to develop," a **density/intensity arc** is what carries beginning–middle–end and climax ([percussion music](percussion-music.md); realized in Engine 05, [findings — the percussion engine](findings-percussion-engine.md)). The devices:

- **Textural crescendo** — a single, sustained thickening from thin to full. The limit case is Ravel's *Boléro*: one unchanging theme in ~18 successive orchestrations, instruments accumulating over a constant pulse from pianissimo to fortissimo — Ravel called it "an experiment consisting wholly of orchestral texture… one long, very gradual crescendo" (Wikipedia; Britannica). Post-rock builds do the same with a loud-quiet-loud grammar: bands "constantly layer instruments and gradually increase volume, building to a climax before receding" (Godspeed You! Black Emperor, Explosions in the Sky, Mono; The Melodic Margin).
- **Terraced textures** — sudden shifts between *distinct* textural/dynamic levels rather than gradual change, the Baroque taste for contrast: the concerto grosso alternates a small **concertino** (thin, agile, softer) with the full **ripieno** (thick, loud) as an antiphonal, block-wise architecture (terraced dynamics; concerto grosso sources).
- **Add/remove-layer arrangement grammar** — the EDM workflow, where a track is arranged by muting and unmuting looped stems across 8/16/32-bar sections; texture *is* the form, and the emotional peaks (build, **drop**, breakdown) are texture events on hypermetric boundaries ([electronic and dance](electronic-and-dance.md)). The **drop** (sudden return to full texture after a stripped build), the orchestral **tutti**, and the **solo break** (texture stripped to one voice) are the same device in different clothes: a discontinuity in density used as a structural punctuation mark.
- **Process-driven texture change** — phasing, additive build-up (grow a pattern ±1 unit per repeat), and instrument-swap doubling in minimalism, where the audible transformation of texture is itself the form ([minimalism and process music](minimalism-and-process-music.md)).

## Cross-cultural texture paradigms (a menu for original styles)

Beyond the Western taxonomy, several texture *architectures* are proven over centuries of repertoire and are directly implementable — a menu for inventing styles ([style invention and style space](style-invention-and-style-space.md)):

- **Interlock (hocket)** — split one fast composite line between two rhythmically-incomplete parts that sound together as a single line faster than either could play: Balinese *kotekan* (*polos* on-beat + *sangsih* off-beat, [gamelan](gamelan.md); [southeast-asian-traditions](southeast-asian-traditions.md)) and the West/Central-African amadinda and mbira interlock, where *inherent patterns* nobody plays emerge perceptually from the composite ([west-african-rhythm](west-african-rhythm.md)). The highest richness-per-line-of-code trick available for thin synth textures.
- **Stratification** — layers at fixed, different density ratios (gamelan colotomy + skeleton + elaboration; the *irama* density-tempo system that doubles surface activity as the skeleton slows). Gives hierarchical orientation with no harmony.
- **Heterophonic elaboration** — one generated melody rendered through N per-voice interpreters that independently ornament/anticipate/simplify it and converge at phrase ends (gagaku, sizhu, gamelan *garap* [live "working out" of parts from a skeleton], the takht). Ensemble density with no counterpoint solver.
- **Call-and-response (antiphony)** — texture alternating between two groups/voices in dialogue, pervasive in West African, Afro-Cuban, gospel, and jazz musics ([west-african-rhythm](west-african-rhythm.md); [percussion music](percussion-music.md)); a way to keep a single texture in motion by handing it back and forth.

## Implications for generative engines

- **Make texture an explicit state, and schedule it.** Represent the current texture as a small vector, e.g. `{ stream_count, onset_density_per_stream, register_spread + low-wide spacing profile, figuration_type per stream (block | alberti | arpeggio | murky | oom-pah | ostinato | comp | pad | interlock), independence_degree ∈ [0,1], timbral_crowding }`. This is the missing sibling of the harmonic and melodic state most engines already carry, and it composes with the per-note structural weight of [findings — the cantabile engine](findings-cantabile-engine.md).
- **Drive form with a texture/density envelope**, not only harmony: a target density curve over the piece (rising-then-falling arc, *jo-ha-kyū* [序破急, "slow–break–fast"] intensification, or EDM build/drop cycle) whose set-points the texture vector tracks. Support both *continuous* thickening (Boléro/post-rock: ramp stream_count and onset_density) and *discrete* terraced/layer events at phrase boundaries (Baroque tutti-alternation, EDM mute/unmute, the drop). Density completion or return is a cadence substitute where there is no harmony ([form and structure](form-and-structure.md), [tension and release](tension-and-release.md)).
- **Respect the perceptual ceiling.** Cap foreground independent streams at ~3; render anything beyond as fusion/pad/doubling, and separate lines meant to be heard apart by register and timbre ([timbre and orchestration](timbre-and-orchestration.md)). Set `independence_degree` deliberately: near 0 for chorale/hymn blocks, mid for melody+accompaniment, near 1 for fugal passages.
- **Enforce coherence constraints between texture and the other parameters.** Widen spacing as the bass descends (below ~C3 prefer fifths/octaves; from [timbre and orchestration](timbre-and-orchestration.md)). Keep total onset density within attentional load. And treat the pairing *dense texture ↔ slower harmonic rhythm and simpler, more-consonant verticals* (a busy surface wants fewer chord changes and less dissonance to stay legible; a sparse texture can carry faster harmony and sharper dissonance) as a working craft heuristic — informed speculation, worth a listening-test check rather than a hard law.
- **Vary texture without new notes.** Swapping the accompaniment figure (block → Alberti → arpeggio → comp) or the stream count re-textures a passage cheaply; use it for repeats, verses vs choruses, and section contrast before reaching for new material ([repetition and familiarity](repetition-and-familiarity.md)).
- **Ship texture defaults per style family** (starting points, tune by ear): tonal/classical → melody + Alberti/arpeggio homophony, or ≤3-voice polyphony; chorale → 4-voice homorhythm; Baroque → imitative polyphony with terraced sectional blocks; jazz/pop → melody + varied comping + walking/riff bass; ambient → 1–2 streams, very low onset density, pads, near-static harmony; EDM → layer-activation grammar on 8/16/32-bar units with a drop; gamelan/interlock → stratified strata with kotekan and irama density control; percussion ensemble → timeline + anchor + interlocking mid + lead, form on the density arc; heterophonic (takht/gagaku) → one melody, N ornamented variants, no harmony; contemporary/texture → sound-mass, micropolyphony, and pointillism as selectable texture modes.

## Open questions

- Does the *dense-texture ↔ slow-harmonic-rhythm* coherence constraint hold up perceptually, and at what quantitative trade-off? Directly testable in the listening loop.
- How many independent streams can listeners track when timbres are *strongly* distinct (as Web Audio synths can be), versus the ~3 measured with homogeneous timbres ([auditory perception basics](auditory-perception-basics.md) open question)? The texture-vector ceiling depends on the answer.
- Can micropolyphony/sound-mass be synthesized convincingly and cheaply from many detuned/canonic voices in a no-library browser environment, and does a naive listener hear an evolving cloud rather than mud?
- A perceptual metric for *texture-change salience* (how clearly a listener registers a layer add/remove or a terraced shift) would let an engine place texture events where they read — unexplored ([computational music metrics](computational-music-metrics.md)).

## Related pages

- [counterpoint and voice leading](counterpoint-and-voice-leading.md) — voice independence, the ~3-voice limit, imitation/hocket, the texture-taxonomy stub this page expands
- [timbre and orchestration](timbre-and-orchestration.md) — spacing, blend/segregation, spectral crowding, foreground/background stratification
- [auditory perception basics](auditory-perception-basics.md) — streaming and the perceptual density/tracking ceilings
- [gamelan](gamelan.md), [southeast-asian-traditions](southeast-asian-traditions.md) — stratified density strata, irama, kotekan interlock
- [east-asian-traditions](east-asian-traditions.md) — heterophony as a texture engine
- [west-african-rhythm](west-african-rhythm.md) — interlock, inherent patterns, call-and-response
- [electronic and dance](electronic-and-dance.md) — add/remove-layer arrangement grammar and the drop
- [percussion music](percussion-music.md), [findings — the percussion engine](findings-percussion-engine.md) — the density/intensity arc as form-carrier (Engine 05)
- [findings — the cantabile engine](findings-cantabile-engine.md) — the comping-template bank (Engine 04)
- [contemporary art music](contemporary-art-music.md) — sound mass, micropolyphony, pointillism in context
- [form and structure](form-and-structure.md), [tension and release](tension-and-release.md) — texture trajectories as form
- [style invention and style space](style-invention-and-style-space.md), [style and genre overview](style-and-genre-overview.md) — texture as a style-vector axis
- [computational music metrics](computational-music-metrics.md) — measuring density from the score

## Sources

- Open Music Theory, "Texture" (Gotham et al., VIVA Pressbooks) — the four-type taxonomy and homophony/polyphony subtypes. https://viva.pressbooks.pub/openmusictheory/chapter/texture/
- Wikipedia, "Texture (music)" — https://en.wikipedia.org/wiki/Texture_(music) ; corroborating pedagogy (AP Music Theory; Ithaca College IC Theory) for monophony/heterophony/homophony(melody+accompaniment vs homorhythm)/polyphony(imitative vs non-imitative).
- Wikipedia, "Micropolyphony" — dense moving canons, tone clusters, the David Cope characterization, *Atmosphères*/*Lux Aeterna*. https://en.wikipedia.org/wiki/Micropolyphony ; secondary: https://thelistenersclub.com/2019/01/18/gyorgy-ligetis-lux-aeterna-the-ethereal-land-of-micropolyphony/
- Wikipedia, "Sound mass" — https://en.wikipedia.org/wiki/Sound_mass ; Jason Noble & Stephen McAdams, "Semantic Dimensions of Sound Mass Music," *Music Perception* 38(2), 2021 — perceptual/semantic dimensions of mass sonority. https://online.ucpress.edu/mp/article/38/2/214/114275
- Wikipedia, "Klangfarbenmelodie" — https://en.wikipedia.org/wiki/Klangfarbenmelodie ; "Punctualism" (pointillism) — https://en.wikipedia.org/wiki/Punctualism
- Wikipedia, "Alberti bass" (order lowest–highest–middle–highest; Domenico Alberti; Classical era) — https://en.wikipedia.org/wiki/Alberti_bass ; Study.com "Alberti Bass" — https://study.com/academy/lesson/alberti-bass-definition-examples.html
- "Murky bass" (broken octaves; *Pathétique* example) — Oxford Reference https://www.oxfordreference.com/display/10.1093/oi/authority.20110803100217275 ; Merriam-Webster https://www.merriam-webster.com/dictionary/murky%20bass
- Ravel's *Boléro* as "one long, very gradual crescendo" of orchestral texture — Wikipedia https://en.wikipedia.org/wiki/Bol%C3%A9ro ; Britannica https://www.britannica.com/topic/Bolero-by-Ravel
- Terraced dynamics and concertino/ripieno contrast (Baroque) — https://futureslearn.blog/terraced-dynamics-baroque/ ; concerto grosso, Fiveable https://fiveable.me/introduction-humanities/key-terms/concerto-grosso
- Post-rock loud-quiet-loud / layered crescendo (GY!BE, Explosions in the Sky) — The Melodic Margin, "Beginner's Guide to Post-Rock" https://themelodicmargin.com/post-rock-beginners-guide/
- Arabic takht ensemble and heterophony (same maqam melody, individually varied) — Melodigging, "Arabic Classical Music" https://www.melodigging.com/genre/arabic-classical-music ; Michigan Arab Orchestra Takht Ensemble (Lawrence Univ.) https://www7.lawrence.edu/conservatory/areas_of_study/musicology/con_brio/takht
- Onset/event density as notes-per-second (MIR) — "Using perceptually defined music features in music information retrieval," arXiv:1403.7923 https://arxiv.org/pdf/1403.7923 (note-density / onset-frequency definitions).
