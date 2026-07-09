---
title: Tempo, duration, and pacing
tags: [theory, evaluation]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: Sourced BPM ranges by style, piece-duration norms by context (including the measured streaming-era shortening), section and harmonic-rhythm pacing conventions, and honestly hedged pacing psychology, distilled into a per-style-pack tempo/duration/section-length defaults table.
---

# Tempo, duration, and pacing

This page collects the engine-ready numbers for time at every scale a piece operates on: how fast (tempo by style), how long (piece duration by context), how often something changes (section and harmonic-rhythm pacing), and how listeners actually perceive duration and pacing. Numbers are drawn from corpus studies, streaming-platform analyses, tempo-marking scholarship, practitioner convention, and this project's own shipped engines, and are marked throughout as measured data, convention/lore, or informed speculation — the three carry very different reliability and this page does not blur them. Tempo psychology proper (why ~120 BPM feels natural, the tactus, syncopation) lives in [rhythm-and-meter.md](rhythm-and-meter.md) and is linked, not repeated; this page supplies the corpus, convention, and duration numbers that page lacks.

## Tempo by style

### Classical tempo terms

| Marking | BPM (Wikipedia convention) | Character |
|---|---|---|
| Grave | 24–40 | very slow, solemn |
| Largo | 40–66 | slow, broad |
| Lento | 40–60 | slow |
| Adagio | 44–66 | slow, "with great expression" |
| Andante | 56–108 | walking pace |
| Moderato | 108–120 | moderate |
| Allegro | 120–156 | fast, bright |
| Vivace | 156–176 | lively, fast |
| Presto | 168–200 | very fast |
| Prestissimo | 200+ | as fast as possible |

These ranges are internally loose by construction — Adagio (44–66) sits entirely inside Largo's range and overlaps Larghetto, because the terms name a character as much as a speed. Other widely used charts disagree outright at the boundaries: one production-oriented chart gives Adagio as 66–76 BPM, not overlapping Wikipedia's range at all. This is not just internet noise: Marten Noorduin's 2021 study of the metronome marks for Beethoven's Ninth documents a genuine, unresolved scholarly dispute over what tempo a *composer-authorized* marking meant — performers found Beethoven's own numbers implausibly fast from their first publication, and proposed explanations range from a mechanically inconsistent metronome to a possible ~12 BPM misreading of the device. Treat any single-number classical tempo target as the loose center of a wide, era- and edition-dependent band. Notated tempo is also not the whole pacing story within a piece: continuous deviations (rubato, ritardando) are a separately measured layer in [expressive-performance.md](expressive-performance.md) — e.g., final ritardandi follow a square-root deceleration curve down to roughly half-to-two-thirds of the base tempo over the last 2–4 bars — and are not duplicated here.

### Jazz, hip-hop, and lo-fi tempi

| Style/feel | BPM | Note |
|---|---|---|
| Jazz ballad | ~50–80 | up to ~100 for "walking ballad"/slow swing |
| Jazz medium swing | ~90–144 | the most common performance tempo |
| Jazz up-tempo / bebop | ~200–300+ | Parker-era "fast swing" |
| Boom bap | ~80–100 (center 85–95) | East Coast, golden-era hip-hop |
| Trap | notated ~130–150; felt half-time ~65–75 | see note below |
| Lo-fi hip-hop | ~70–90 (center ~80–85) | see [attention-and-background-listening.md](attention-and-background-listening.md) |

Jazz-feel boundaries are practitioner convention, drawn inconsistently across bandleader charts, dance-band references, and pedagogy sites — loose anchors, not measurements. Trap's tempo is a genuine notation ambiguity, not an engine-design abstraction: producers commonly program and label a trap beat at ~130–150 BPM to get fine hi-hat subdivisions, while the kick/snare backbeat is felt at roughly half that (~65–75 BPM) — the same "which BPM is this, really" problem reggae's one-drop and rockers styles pose below. An engine that reads "trap" and schedules fills and density at a literal 140 will not feel like trap unless the felt half-time pulse is also respected (see Implications).

### Folk and dance tempi

| Dance | BPM | Convention |
|---|---|---|
| Waltz (slow/international) | ~84–90 | WDSF competition standard (28–30 bars/min × 3) |
| Viennese waltz | ~174–180 | WDSF competition standard (58–60 bars/min × 3) |
| Polka | ~115–135 (Irish polka often 130+) | session-tradition convention |
| Jig (6/8) | ~110–130 (dotted-quarter pulse) | session-tradition convention |
| Reel (cut time) | ~110–130 (per half-bar) | session-tradition convention |

The waltz figures are competitive-ballroom convention (World DanceSport Federation tempo standard, tabulated in bars/minute and converted here); vernacular folk-waltz playing is looser. The polka/jig/reel numbers come from The Session, a large Irish-traditional-music practitioner community, not a corpus measurement — players there report genuine disagreement across region, tune, and dance context, so read these as centers of wide, negotiated ranges. Deeper folk-dance coverage belongs on [european-folk-and-dance.md](european-folk-and-dance.md).

Reggae tempo reports conflict sharply across sources because they blend sub-styles with different feels: roots/one-drop is commonly placed around 60–90 BPM (a ~75–80 "sweet spot" is often cited), steppers (a four-on-the-floor-like kick) runs faster at ~110–140, and dancehall sits around 80–105 (contemporary dancehall can run higher). As with trap, one-drop's characteristic empty beat 1 plus accented beat 3 invites the same notated-vs-felt ambiguity — prefer describing the *pattern* (one-drop, steppers, rockers) over a bare BPM number.

### Pop's central tendency: lore vs. measurement

The "pop is ~115–120 BPM" claim conflates at least three different things. First, the *psychological* resonance point (~120 BPM, van Noorden & Moelants' ~2 Hz tapping-oscillator peak, preferred range ~80–160) is about motor tempo preference, not a corpus mean — fully covered in [rhythm-and-meter.md](rhythm-and-meter.md) and not repeated here. Second, the *software-default* anchor: Ableton Live and Logic Pro both open new projects at 120 BPM (FL Studio defaults to 140), a widely discussed production-forum convention that plausibly reinforces the number independent of any perceptual fact. Third, the *corpus-measured* picture is wider and messier than "around 120" suggests: one informal analysis of a large public Spotify-genre dataset puts pop's mean tempo at ~114 BPM but with a 60.7–162.7 BPM range, the widest of the genres compared (methodology unverified — directional only); a 2026 industry analysis of charted/streamed tracks found the single most common charted-song tempo band was 90–99 BPM (18.7% of charted songs), then 80–89 BPM (13.9%), while the band with the most *streams per song* was 140–149 BPM — popularity and typicality point to different tempos. Most tellingly, a peer-reviewed corpus comparison (White, Pater & Breen 2022) of pop melodies from 1957–1997 versus 2015–2019 found postmillennial songs are *annotated at slower tempos* than premillennial ones even though they are melodically delivered faster (more notes per second, more evenly distributed within the bar) — the relationship between notated BPM and felt rhythmic density has itself drifted over time, echoing the trap/reggae half-time problem at whole-corpus scale. There is no single "average pop tempo": ~120 is a convenient anchor and resonance point, not a corpus fact, and a generated pop style pack should sample a wide, long-tailed tempo distribution (roughly 85–135) rather than clustering at 120.

### Ambient and electronic

Ambient is frequently genuinely pulseless: Eno's *Discreet Music* and *Music for Airports* ([ambient-and-generative-genre.md](ambient-and-generative-genre.md)) have no meter at all — the operative time parameter is loop-cycle length in seconds, not BPM — and this project's own ambient-drift engine follows suit, emitting a seconds-based score rather than a beats-based one ([findings-ambient-drift-engine.md](findings-ambient-drift-engine.md)). House/techno/trance/drum-and-bass/dubstep tempo ranges are already tabulated in [electronic-and-dance.md](electronic-and-dance.md) (house ~115–130, techno ~125–150, trance ~130–150, DnB ~160–180, dubstep ~135–145) and are not repeated here.

## Piece duration by context

### The pop single: format history and the streaming-era shrink

| Era | Avg. charting-song duration |
|---|---|
| Pre-1960s (Tin Pan Alley/early rock 'n' roll) | ~2:30 |
| 1990s (CD era) | ~4:14 |
| 2019 (Spotify charts) | ~3:30 |
| 2023 | ~3:15 |
| 2024 | ~3:00 |

Numbers are Chartmetric's 2024/2025 *Year in Music* tracking of Spotify-charting songs; the 2019→2024 shortening is real and recent (~30 s in five years), with hip-hop and Latin music shrinking most (~29 s each, 2018–2024). The longer arc is technology-shaped: 78 rpm and then 45 rpm singles physically held about 3–5 minutes per side, radio further favored short songs to fit more commercial breaks, and the pre-1960s ~2:30 norm reflects that ceiling; the LP and then the CD (holding ~74–80 minutes and rewarding generous-feeling tracks) let average duration drift up through the 1990s peak; streaming then reversed the incentive, since platforms count a "stream" after as little as 30 seconds and algorithmically reward high-completion tracks, favoring *more, shorter* songs. Chartmetric itself cautions the trend is "multi-variant... not just technology, not just culture," and a separate analysis of a large curated-radio dataset (AccuRadio, via an independent statistical write-up) complicates the simple "shorter is better" story further: in that engaged-listener population, ratings *rise* with duration and 3–5 minute tracks are skipped *more* than 7-minute tracks — the opposite of the streaming-hit pattern. "Optimal length" depends on which audience and which decision point (casual browsing vs. committed listening) is being measured; the two literatures should not be blended.

### Classical and jazz duration norms

Classical whole-work length grew by era (informed generalization from program-note convention, not one corpus study): early Classical-period symphonies (c. 1750–1770) commonly ran 10–20 minutes; mature Classical symphonies (Haydn, Mozart) about 20–30 minutes; Romantic symphonies 35–50 minutes, with Mahler and Bruckner routinely 60–90+ minutes. Individual movements are uneven within a work — outer movements (opening sonata form, finale) are usually longest, a minuet/scherzo shortest — rather than the total dividing evenly by movement count; see [form-and-structure.md](form-and-structure.md) for the archetypes these durations fill. Jazz shows the same recording-format imprint as pop: 78 rpm-era jazz sides ran about 3 minutes like their pop contemporaries; the LP let studio standards commonly run 5–10 minutes; live or modal/free performances, where chorus count rather than a fixed arrangement sets the length, routinely extend past that — [jazz-and-improvisation.md](jazz-and-improvisation.md)'s "3–6 choruses per soloist" guidance means three soloists at four choruses each over a one-minute chorus is already a 12-minute track.

### EDM: club mix vs. radio edit

EDM separates the *radio edit* (~3–3:30, minimal intro, built for broadcast) from the *club/extended mix*, traditionally 6–8 minutes with 16-bar-aligned intro and outro sections so a DJ can beatmatch in and out ([electronic-and-dance.md](electronic-and-dance.md) covers this phrasing in depth). The same streaming pressure reshaping pop is visible here too: "festival edits" and other streaming-oriented cuts increasingly land at 3–5 minutes, shorter than the classic extended mix, per current DJ/production-community discussion.

### Ambient/generative long-form

Ambient's canonical works run from a single ~5-minute cycle to 40+-minute album sides ([ambient-and-generative-genre.md](ambient-and-generative-genre.md)), and its most radical generative works have no fixed duration at all: Eno's *Reflection* app plays "an endless rule-driven version" of the piece, with the released CD explicitly a "static excerpt" of the real, unbounded work. Duration in ambient/generative modes is better treated as a session parameter the listener sets, or an indefinite loop, than as a composed endpoint — this project's ambient-drift engine already schedules in seconds rather than bars for this reason.

### Film cues and game loops

Film cues typically run 30 seconds to 3 minutes; production-music-library convention favors authoring the full version at 1:30–3:00 even when a shorter edit will be used, for downstream edit flexibility. Game-music loops vary more by role: a minimal ambient bed can loop as short as ~30 seconds, while a foregrounded area/town theme commonly runs 1–3 minutes before repeating — shorter loops risk the listener noticing the seam sooner, longer loops cost more material for the same perceived variety. Loop-with-variation techniques for fighting the fatigue of either choice are covered in [film-and-game-music.md](film-and-game-music.md).

## Section pacing

### Bar counts by section

[phrase-structure.md](phrase-structure.md) establishes the 4/8-bar hypermetric default and [form-and-structure.md](form-and-structure.md) the whole-piece archetypes; production-pedagogy convention (not academic theory, but consistent across sources) fills the pop/rock section-length gap those pages leave open: verse and chorus commonly 8 bars (chorus sometimes 16, to stay elevated longer), pre-chorus 4–8 bars, bridge/"middle eight" typically 8 bars (the name records the convention). A full pop song commonly totals around 80 bars across its sections. These are conventions to sample from, not rules — phrase-structure.md's point that irregular lengths read as expansions of the 4/8 norm still governs how a generator should deviate.

### EDM phrase architecture and harmonic rhythm by style

EDM's 16/32-bar phrase architecture is covered fully in [electronic-and-dance.md](electronic-and-dance.md) and not repeated here. Harmonic rhythm — the rate of chord change — varies by style beyond the classical/pop norms already tabulated in [harmony.md](harmony.md) (roughly 1 chord/bar in classical phrases, accelerating at cadences; 1 chord per 1–2 bars in pop loops): jazz standards move faster, often a chord per bar or two per bar in ii–V–I chains, compressing further at cadences; modal jazz deliberately slows to one mode per 4–16 bars ([jazz-and-improvisation.md](jazz-and-improvisation.md)); minimalism and ambient can hold one mode or drone for a whole section or piece ([minimalism-and-process-music.md](minimalism-and-process-music.md)); and techno at the extreme has essentially no functional harmonic rhythm — Butler's "rejection of harmonic patterning" and "total lack of cadences" ([electronic-and-dance.md](electronic-and-dance.md)), where rhythm and texture alone carry pacing.

### The "every 8 bars" convention

Production pedagogy has a standing rule of thumb: change something (add, remove, or alter an element) at least every 8 bars, or risk the arrangement reading as a stuck loop. This is stated consistently across production-education sources but is craft convention, not a psychological finding — best read as a practitioner-derived corollary of the hypermeter research above (8 bars is exactly two 4-bar hypermeasures, close to the smallest span most listeners parse as "a section"), not an independent fact about perception.

## Pacing psychology (honestly hedged)

### Duration estimation: prospective, retrospective, and tempo's effect

Duration judgment splits into two experimentally distinct modes (Block & Zakay's 1997 meta-analysis): *prospective* judgments, made when the listener knows in advance they will estimate duration, are driven by attention to time's passage and come out longer and more variable under cognitive load; *retrospective* judgments, made only after the fact, are driven by memory — roughly, how many distinct events are recalled — and are largely unaffected by attentional load. Most real listening is closer to retrospective (nobody times a piece while enjoying it), which suggests a piece remembered as having *more distinguishable events* (more sections, more contrast, per [form-and-structure.md](form-and-structure.md)) will retrospectively feel like it lasted longer, independent of its clock length — a lever an engine can use deliberately: a short piece with three clearly contrasted sections may read as more substantial than a long piece with one. Tempo itself also shifts duration perception: Hammerschmidt et al. (2021) found faster music tends to make an interval's elapsed duration feel *longer*, consistent with the broader "filled-duration illusion" (event-dense intervals judged longer than sparse ones); Silva, Phillips & Martins (2024) add that tonality and the listener's own musical training further modulate duration estimates — as with complexity preference ([complexity-and-preference.md](complexity-and-preference.md)), there is real individual variation here, not one constant.

### Attention over a piece's length

How attention holds up *within* a single piece over several minutes is not separately studied in the sources found for this page; the closest evidence is [attention-and-background-listening.md](attention-and-background-listening.md)'s habituation findings (fixed loops lose effect as they habituate; slow generative variety helps) and [complexity-and-preference.md](complexity-and-preference.md)'s inverted-U of eventfulness (liking peaks at intermediate complexity/surprise, contested and individually variable) — both covered fully there and not re-derived here. The practical synthesis for pacing: neither maximal stasis nor constant novelty is well supported as an optimum; budget a small number of genuinely new events across a piece's duration (see the per-style defaults below) rather than either extreme.

### Skip behavior is a different phenomenon from pacing

Streaming skip-rate data is often cited alongside pacing advice but measures something else: *selection* behavior (whether to keep listening at all), not *within-piece pacing perception*. One industry analysis reports roughly a 24% chance of a skip within a song's first 5 seconds, and a 2025 Luminate study of 250,000 tracks found songs with a salient entry before 15 seconds had a 24% lower skip rate than tracks with instrumental-only intros past 20 seconds — real and actionable for how a piece should *begin* (full treatment belongs on [beginnings-endings-and-transitions.md](beginnings-endings-and-transitions.md)), but not evidence about how pacing should unfold once a listener is actually engaged. "Reduce skip rate" and "pace a piece well for an attentive listener" are related but distinct goals; this project's non-commercial, non-algorithmically-fed context makes the second the one that matters.

## Implications for generative engines

Numbers above translate into three needs: a tempo range per style, a duration range per style *and* per user-facing duration setting, and rules for how often something should change. This project's own shipped engines already anchor several rows below in validated, tested defaults rather than pure theory.

| Style pack | Tempo (BPM) | Short (~2–3 min) | Medium (~4–6 min) | Long (~8–12 min) | Section-length default |
|---|---|---|---|---|---|
| Tonal classical | 66–140 (Engine 01 default 110) | 1 period + coda | rounded ternary + variation | multi-movement/extended development | 4/8-bar phrases, 8/16-bar hypermeasures |
| Ambient/generative | n/a (time-based) | 3–5 loop voices, 1 region | 5–9 loop voices, 2–4 regions | open-ended/loopable, many regions | loop periods 15–90 s, mutually prime-ish |
| Jazz (modal) | 90–140 | head + 2 choruses | head + 4–6 choruses | head + 8+ choruses / multiple tunes | 12- or 32-bar chorus |
| Lo-fi/boom-bap groove | 70–95 | 1–2 loop variants | 3–5 variants + drops | 6+ variants, set-like | 4/8/16-bar loop, fill every 8–16 bars |
| Trap-influenced groove | 130–150 (felt ~65–75) | short loop set | verse/hook alternation | extended set | 8/16-bar, half-time-aware fills |
| EDM, four-on-the-floor | 115–150 (see electronic-and-dance.md) | radio-edit shape | full intro/build/drop/breakdown arc | extended/club mix | 8/16/32-bar phrases |
| EDM, breakbeat/DnB | 160–180 | radio-edit shape | full arc | extended/club mix | 8/16/32-bar phrases |
| Folk dance (waltz/polka/jig/reel) | 84–180 by dance (table above) | 1–2 tune repeats | set of 2–3 tunes | full set/medley | tune = 8/16-bar strain × repeats |
| Rock/pop verse-chorus | 85–135 (wide, long-tailed) | verse+chorus+bridge | full V-C-(P)-C-B-C | extended, +instrumental section | 8-bar sections, ~80 bars total |
| Expressive chamber | 70–110 (Engine 04: "moderate") | single arc | arc + return | extended arc, multiple climaxes | phrase-scale, not bar-locked |
| Percussion ensemble | 90–130 (Engine 05 default 108) | one density arc | arc + contrast section | multi-section, cell development | timeline cycle × repeats |

- Treat the short/medium/long bands (~2–3 / ~4–6 / ~8–12 min) as a **design proposal**, not a sourced standard — no source found ties these exact bands to evidence; they synthesize the ranges above (pop-single-adjacent for short, EDM-club/classical-movement-adjacent for medium, jazz-set/ambient-adjacent for long), pending Tom's feedback and [listening-tests-and-feedback.md](listening-tests-and-feedback.md) validation. Wire the control through [control-surfaces-and-user-parameters.md](control-surfaces-and-user-parameters.md).
- **Scale duration by section/repeat count, not tempo.** Slowing tempo to lengthen a piece changes genre identity (see the tempo-perception constraint below); adding section repeats, variation cycles, or (jazz/folk) more choruses/tunes preserves style while changing length — consistent with this project's rule that "composer thinks in beats, tempo lives in the performer" ([engine-architecture.md](engine-architecture.md)).
- **Sample section length from a style-appropriate discrete set** (e.g., {4, 8, 16} bars for classical/pop, {8, 16, 32} for EDM, chorus-length for jazz/blues) rather than a continuous distribution, weighted toward the 8-bar center every source above converges on.
- **Respect the tactus's perceptual window (80–160 BPM, [rhythm-and-meter.md](rhythm-and-meter.md)) for the *felt* pulse, not just the notated tempo.** For half-time-notated styles (trap, reggae one-drop/rockers, some DnB), verify the felt backbeat — not the scheduling BPM — lands in that window; a 140 BPM trap pack whose snare falls every other beat is felt near 70, which is fine, but naively doubling fill/hat density to match "140 BPM" can push the felt pulse back out of range.
- **Default to an 8-bar "something changes" cadence** for arrangement-driven genres (EDM, groove/lo-fi, rock/pop), per the practitioner convention above, while remembering it is convention, not perceptual law — ambient and modal-jazz style packs should violate it deliberately and slowly instead.
- **Budget harmonic rhythm per style pack explicitly** rather than defaulting everything to "one chord per bar": fast (jazz/bebop), moderate-with-cadential-acceleration (classical/pop, per [harmony.md](harmony.md)), and static (modal jazz, minimalism, ambient, techno) are three deliberate settings, not points on one dial.
- **Current shipped engines run shorter than any tier proposed here** — Engine 01's default piece is ~70–90 seconds ([findings-tonal-classical-engine.md](findings-tonal-classical-engine.md)), under even the "short" 2–3 minute band. This is a concrete, actionable gap for the next engine session, not a contradiction of the numbers above.

## Open questions

- Do the short/medium/long bands actually match listener expectations for this project's audience, or should feedback replace them with per-style bands (ambient's "long" plausibly should mean 20+ minutes, not 12)?
- Is White, Pater & Breen's (2022) notated-tempo/felt-density drift the same underlying phenomenon as trap's and reggae's half-time notation, just measured at corpus scale? Worth a targeted full read.
- No source found gives a *measured* (not practitioner-convention) answer for how often a generative piece should introduce something new; the "every 8 bars" rule and the inverted-U of eventfulness are the closest proxies and were not designed to jointly answer this question.
- Jazz-feel tempo boundaries (ballad/medium/up) are drawn inconsistently across every source checked; a corpus measurement would be more trustworthy than the practitioner charts used here.

## Related pages

- [rhythm-and-meter.md](rhythm-and-meter.md) — tactus, preferred-tempo psychology, syncopation
- [electronic-and-dance.md](electronic-and-dance.md) — EDM subgenre BPM map and 8/16/32-bar phrasing
- [expressive-performance.md](expressive-performance.md) — rubato and ritardando magnitudes
- [form-and-structure.md](form-and-structure.md) — section architecture and climax placement
- [phrase-structure.md](phrase-structure.md) — the 4/8-bar hypermetric default
- [harmony.md](harmony.md) — classical/pop harmonic-rhythm norms
- [jazz-and-improvisation.md](jazz-and-improvisation.md) — chorus form, modal jazz, swing timing
- [ambient-and-generative-genre.md](ambient-and-generative-genre.md) — pulseless, incommensurable-loop pacing
- [attention-and-background-listening.md](attention-and-background-listening.md) — habituation over a session
- [complexity-and-preference.md](complexity-and-preference.md) — the inverted-U of eventfulness
- [film-and-game-music.md](film-and-game-music.md) — cue lengths, loop-with-variation
- [comprehensive-site-vision.md](comprehensive-site-vision.md) — the duration-setting control this page feeds
- [european-folk-and-dance.md](european-folk-and-dance.md) — deeper folk-dance coverage
- [hip-hop-and-beat-making.md](hip-hop-and-beat-making.md) — deeper boom-bap/trap coverage
- [rock-and-pop.md](rock-and-pop.md) — deeper verse-chorus and corpus coverage
- [beginnings-endings-and-transitions.md](beginnings-endings-and-transitions.md) — intro-length/skip-rate mechanics
- [control-surfaces-and-user-parameters.md](control-surfaces-and-user-parameters.md) — the three-tier control design

## Sources

- Wikipedia, "Tempo" (Italian tempo markings, BPM ranges, "very rough approximations... vary widely"). https://en.wikipedia.org/wiki/Tempo
- Marten Noorduin, "The metronome marks for Beethoven's Ninth Symphony in context," *Early Music* 49(1), 2021, pp. 129–145. https://academic.oup.com/em/article/49/1/129/6276767
- World DanceSport Federation tempo standards (bars/min), as tabulated by Dance Life Music, "Official Tempi Per Dance." https://www.dancelifemusic.com/component/content/article/official-tempi-per-dance?catid=8&Itemid=101
- "A good tempo for tunes (bpm)?", discussion thread, The Session (Irish traditional music community). https://thesession.org/discussions/7222
- Wikipedia, "Trap music" (half-time tempo convention), citing Lauren Rigau, "DJ Johnny Terror Spins BASE @ Space," *The Y Life*, 2013. https://en.wikipedia.org/wiki/Trap_music
- bpmcalc.com, "Reggae BPM Range" and "Lo-Fi BPM Range" (production-community convention). https://bpmcalc.com/genres/reggae/ ; https://bpmcalc.com/genres/lo-fi/
- Wikipedia, "One drop rhythm" (relative tempo of one drop vs. ska vs. rockers). https://en.wikipedia.org/wiki/One_drop_rhythm
- Christopher William White, Joe Pater & Mara Breen, "A comparative analysis of melodic rhythm in two corpora of American popular music," *Journal of Mathematics and Music* 16(2), 2022. https://www.tandfonline.com/doi/full/10.1080/17459737.2022.2075946
- Musiio, "Which Musical Tempos Are People Streaming The Most?" (chart/streaming BPM distribution). https://blog.musiio.com/posts/which-musical-tempos-are-people-streaming-the-most
- Rafidghadah Damarta, "Exploring the Role of Key and BPM in Defining Music Genres," Medium (informal public-dataset analysis; pop genre mean/range). https://medium.com/@rafidghadah/song-genre-analysis-based-on-key-and-bpm-3b6b7d501013
- Ableton Forum, "Why always 120 BPM?" (DAW default-tempo convention). https://forum.ableton.com/viewtopic.php?t=134674
- Chartmetric, "Are Songs Actually Getting Shorter? It's Not That Simple..." (2024/2025 Year in Music data). https://hmc.chartmetric.com/shorter-songs-trend-streaming-history/
- statsignificant.com, "What's the Perfect Song Length? A Statistical Analysis" (AccuRadio listening data). https://www.statsignificant.com/p/whats-the-perfect-song-length-a-statistical
- Wikipedia, "Phonograph record"; History-of-Rock.com, "Why 78, 45 and 33⅓ record formats?" (format-length history). https://en.wikipedia.org/wiki/Phonograph_record ; https://www.history-of-rock.com/record_formats.htm
- Richard A. Block & Dan Zakay, "Prospective and retrospective duration judgments: A meta-analytic review," *Psychonomic Bulletin & Review* 4(2), 1997, pp. 184–197. https://www.montana.edu/rblock/documents/papers/BlockZakay1997.pdf
- David Hammerschmidt, Clemens Wöllner, Justin London & Birgitta Burger, "Disco Time: The Relationship Between Perceived Duration and Tempo in Music," *Music & Science*, 2021. https://journals.sagepub.com/doi/full/10.1177/2059204320986384
- Ligia Borges Silva, Michelle Phillips & José Oliveira Martins, "The influence of tonality, tempo, and musical sophistication on the listener's time-duration estimates," *Musicae Scientiae*, 2024. https://journals.sagepub.com/doi/10.1177/17470218231203459
- Bobby Owsinski, "Spotify Song Skip Rates Tell Us A Lot About Our Attention Span," *Forbes*, 2018. https://www.forbes.com/sites/bobbyowsinski/2018/11/17/song-skip-rates/
- Chartlex, "The 30-Second Rule: Fix Your Spotify Skip Rate" (2025 Luminate vocal-entry/skip-rate study, cited secondhand). https://www.chartlex.com/blog/streaming/30-second-rule-spotify-intro-skip-rate
- TalkClassical forum consensus and general program-note convention, symphony movement/whole-work duration by era (informed generalization, hedged in text). https://www.talkclassical.com/threads/what-is-a-standard-symphony-length-in-movements.19551/
- Hyperbits, "Song Arrangement: How an 8-Bar Idea Becomes a Record"; eMastered, "8 Bar Loops" (production-pedagogy convention). https://hyperbits.com/blog/song-arrangement/ ; https://emastered.com/blog/8-bar-loop
- Bax-Shop, "Pop Song Structuring: Verse, Chorus, Bridge and More Explained" (section bar-count convention). https://www.bax-shop.co.uk/blog/songwriting-composing/pop-song-structuring-verse-chorus-bridge-and-more-explained/
- MusicLibraryReport, "What Is A Standard Cue Length?" (film cue length convention). https://musiclibraryreport.com/miscellania/standard-cue-length/
- This project: [findings-tonal-classical-engine.md](findings-tonal-classical-engine.md), [findings-ambient-drift-engine.md](findings-ambient-drift-engine.md), [findings-percussion-engine.md](findings-percussion-engine.md) — shipped engine tempo/duration defaults cited in the implications table.
