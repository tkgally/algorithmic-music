---
title: Jazz and improvisation
tags: [genre]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Jazz as the best-documented case of real-time rule-governed music generation by humans — harmony, form, swing timing, rhythm-section rules, and formula-based improvisation, extracted as engine rules.
---

# Jazz and improvisation

Jazz matters to this project for a reason beyond its musical value: it is the best-documented case of humans generating good music in real time under explicit, learnable constraints. Fifty years of scholarship — ethnographic (Berliner), analytic (Owens, Love), computational (Johnson-Laird), and empirical (Friberg and Sundström's timing measurements) — has effectively reverse-engineered the generator: a precomputed harmonic form, a memorized vocabulary of melodic formulas, per-role construction rules for bass, piano, and drums, and a tempo-dependent timing model. Almost uniquely among genres, the rules an engine needs are already written down.

## Harmonic vocabulary

- **ii–V–I** is the fundamental progression cell: Dm7–G7–Cmaj7 in C. Tunes are largely chains of ii–V–I units in various keys, plus turnarounds (I–vi–ii–V or iii–vi–ii–V) that cycle back to a section start.
- **Guide tones** — the 3rd and 7th of each chord — define its quality and drive voice leading: the 7th of each chord resolves down a half step to the 3rd of the next (Dm7's C → G7's B; G7's F → Cmaj7's E). A two-voice guide-tone line through a whole form is a minimal but genre-defining skeleton for both comping and melody.
- **Shell voicings**: root + 3rd + 7th (or root + 7th) — the minimum that states the harmony; historically the early-bop pianist's left hand.
- **Rootless voicings** (Bill Evans-era left hand, ubiquitous since the late 1950s): omit the root (the bass has it) and stack 3–5–7–9 ("Type A," 3rd on the bottom) or 7–9–3–5 ("Type B," 7th on the bottom); the 5th is often replaced by the 13th. Types A and B alternate through a ii–V–I so the voicing barely moves. Register rule (common jazz-piano pedagogical guidance, not itself in the cited source): keep them near middle C — roughly C3–C5 — to avoid muddiness (low) or thinness (high).
- **Extensions and alterations**: 9ths, 11ths, 13ths are normal color; dominant chords accept b9, #9, #11, b13, especially when resolving. Rule of thumb: the more altered the dominant, the stronger the pull to resolution.
- **Tritone substitution**: replace V7 with the dominant seventh a tritone away (G7 → Db7) — they share the same guide-tone tritone (B/F), and the bass gains a chromatic descent (D–Db–C).
- **Blues harmony** coexists with functional harmony: dominant 7ths on I and IV are stable, blue notes (b3, b5, b7) sit on top of major-key changes without "resolving."

## Form

- **12-bar blues**: bars 1–4 I, 5–6 IV, 7–8 I, 9–10 V(–IV), 11–12 I with turnaround. Jazz variants add the "quick change" (IV in bar 2), seventh chords throughout, ii–V motion into bars 5 and 9, and fully chromaticized bebop ("Bird blues") substitutions. Melodic phrasing over it is classically AA'B — statement, varied restatement, answer.
- **32-bar AABA**: four 8-bar sections; the A sections share a melody, the B section ("bridge") contrasts and typically ends on a dominant preparing the last A. "The principal form" of American popular song from the mid-1920s ("I Got Rhythm," whose changes — "rhythm changes" — are jazz's second-most-used form after the blues). **ABAC** is the other common 32-bar plan.
- **Head–solos–head**: performance form is the tune ("head") once or twice, then repeated choruses of the same harmonic form for improvisers, then the head again. The chord cycle never stops; all novelty happens against a fixed, fully known harmonic clock.

## Swing feel: the measured evidence

Friberg and Sundström measured ride-cymbal timing from recordings of four canonical drummers (Tony Williams, Jack DeJohnette, Jeff Watts, Adam Nussbaum). Findings:

- The swing ratio (long:short eighth) is tempo-dependent: about 3.5:1 at slow tempos, falling roughly linearly to about 1:1 (straight eighths) at very fast tempos (~300 BPM).
- The short note's absolute duration is approximately constant at ~100 ms across medium-to-fast tempos — swing behaves like "long note stretches, short note stays fixed," plausibly a perceptual-motor limit.
- The common notion of a fixed 2:1 "triplet feel" is wrong as a general rule; 2:1 is just what the function passes through at medium tempos. Wikipedia's summary of the literature puts practical ratios between 1:1 and 3:1, wider when slower.
- Ensemble microtiming matters: physicists and psychologists studying swing note a perceptible timing offset between soloist and rhythm section (soloists tend to play "behind" the cymbal); magnitudes vary by player and tempo, and precise norms should be checked against the 2002 Music Perception paper before hard-coding — see [groove-and-embodiment](groove-and-embodiment.md).

## Rhythm section construction rules

- **Walking bass** (quarter notes throughout): beat 1 = root of the current chord; beats 2–3 = chord tones or scale tones; beat 4 = approach tone into the next bar's root, very often chromatic from a half step above or below. The entire line uses three ingredients — chord tones, scale tones, chromatic approach/passing tones — with roots/5ths favored on strong beats. This is a complete, implementable algorithm as taught by jazz pedagogy.
- **Comping** (piano/guitar): short, syncopated stabs of shell or rootless voicings, placed irregularly (anticipations of beat 1 and the "and" of 2 and 4 are idiomatic), leaving space for and answering the soloist. Berliner documents comping as conversation — accompanists feed rhythmic and harmonic ideas to the soloist and react to what comes back; a fixed repeating pattern is precisely what it is not.
- **Drums**: ride cymbal carries the swing pattern (the thing Friberg and Sundström measured), hi-hat on 2 and 4, snare/kick sparse punctuation ("dropping bombs") in dialogue with the soloist.
- **Interaction**: Berliner's core ethnographic finding is that the band is a distributed system — call and response, dynamic negotiation of intensity, collective arcs across choruses. An engine that renders each role independently against the grid will sound like a play-along record, not a band.

## Improvisation as learned vocabulary recombination

The romantic picture of improvisation as unconstrained invention is false, and the scholarship is unusually specific about what replaces it:

- **Berliner, Thinking in Jazz (1994)** — 15+ years of fieldwork, interviews with 50+ musicians: improvisers spend years acquiring a vocabulary of licks, phrases, and models from records and mentors ("Getting Your Vocabulary Straight" is a central chapter), then recombine and transform it; "the lifetime of preparation... behind the skilled improviser's every idea."
- **Owens (1974)** catalogued Charlie Parker's improvising as roughly 100 recurring melodic formulas (from 4-note fragments to multi-bar phrases), organized by key; a widely cited core list of 64 motives, drawn from about 250 transcriptions across nearly all of Parker's recordings. The two most frequent — M.1A, an ascending arpeggio played as a triplet, and M.2A, an inverted mordent plus descending interval — each appear about once every 8–9 measures across his recorded solos. Parker's genius lay in the fluency, variation, and placement of the vocabulary, not in per-note novelty.
- **Love (2012)** shows the level above formulas: across 156 blues choruses drawn from 39 recorded performances (1944–53), Parker's phrase plans fall into five chorus-level schemata (4/4/4, 8/4, 4/8, 6/6, through-composed) and his lines follow a small set of scale-degree paths keyed to zones of the 12-bar form (e.g., descents to scale degree 1 in bars 1–7; standardized approaches to the ii–V in bars 8–11). "The real work of producing such improvisations happens... in the practice room."
- **Frieler et al. (2017)** confirm computationally, across a smaller corpus of 56 Parker solo transcriptions (from the Omnibook, coded in **kern), that recurring patterns pervade the corpus, with phrase beginnings more chromatic than phrase endings (20.4% vs. 5.0%).
- **Johnson-Laird (2002)** supplies the computational framing: theories of creativity should be computable. Devising good chord sequences is computationally heavy (needs working memory / notation), so it happens offline — the changes are precomputed and shared. Real-time melody generation must minimize working-memory load, so it works like a constrained ("neo-Lamarckian") generator: constraints strong enough that everything generated is already plausible, no separate evaluate-and-reject stage. He also argues pure formula-concatenation is insufficient — rules generate novel material that formulas season.

The synthesis: precomputed harmonic form + memorized formula library + constrained real-time melodic grammar + schemata for phrase placement. That is an engine architecture, discovered by humans.

## Modal jazz (brief)

In the late 1950s, as a reaction to bebop's dense changes, modal jazz slowed harmony to one scale per 4–16 bars: Kind of Blue (1959); "So What" is 32-bar AABA with A = D dorian, B = Eb dorian. Improvisation is scale-driven rather than change-driven; piano voicings go quartal (the fourths-built "So What" chord). For engines this is the low-risk entry point into jazz: static mode, slow harmonic clock, groove and phrasing carry the interest.

## Implications for generative engines

- Pipeline mirrors the human division of labor (per Johnson-Laird): (1) offline, choose form and generate the chord chart (blues or AABA, with substitutions applied at generation time); (2) online, generate each role from the chart with role-specific rules; (3) interaction layer modulates density/register/intensity across roles and choruses.
- Swing timing: implement ratio as a function of tempo — e.g., linear from ~3:1 at 60–100 BPM through ~2:1 near 150–180 BPM to 1:1 at 300 BPM — or equivalently hold the short eighth near 100 ms and give the remainder of the beat to the long eighth; clamp so the short note never drops below ~90–100 ms. Do not hard-code triplet swing at all tempos.
- Walking bass is fully specifiable: root on 1, chord/scale tones on 2–3, chromatic or dominant approach on 4 targeting the next root; mostly stepwise with occasional leaps; never stop the quarter-note pulse.
- Melody generator: maintain (a) a formula library (30–100 idiomatic figures — enclosures, arpeggio triplets, mordent figures, bebop-scale runs) tagged by harmonic context, (b) a guide-tone skeleton to aim at (3rds/7ths on chord changes), (c) chorus-level phrase schemata (4/4/4, 8/4, 4/8, 6/6) with rests between phrases — Parker's plans show that where phrases sit matters as much as their notes; (d) more chromaticism at phrase starts, diatonic closure at ends (Frieler).
- Comping: rootless voicings (Type A/B alternation, register C3–C5), 1–3 hits per bar at irregular syncopated positions, density inversely related to soloist activity.
- Form discipline: everything happens over an audible repeating chorus; state the head (composed melody) before and after solos. Chorus count 3–6 per soloist at 12 or 32 bars.
- Modal-jazz mode: one dorian scale for 8–16 bars, quartal voicings, two-chord vamp — a good first jazz engine before attempting bebop changes.

## Open questions

- Exact soloist-behind-beat offsets (ms) by tempo and instrument: extract from Friberg and Sundström 2002 and later microtiming studies (Benadon) before implementing the "laid back" layer.
- How large must the formula library be before output stops sounding like a loop? Owens' ~100 formulas at ~1 per bar of use suggests low hundreds; testable in [listening-tests-and-feedback](listening-tests-and-feedback.md).
- Can comping-as-conversation be faked with simple coupling rules (density inversion, register avoidance, call echoing), or does it need a genuine shared-state model? Candidate for an early experiment.

## Related pages

- [harmony](harmony.md) — functional harmony fundamentals under the jazz extensions
- [form-and-structure](form-and-structure.md) — chorus forms in the broader form taxonomy
- [groove-and-embodiment](groove-and-embodiment.md) — microtiming and swing psychology
- [rhythm-and-meter](rhythm-and-meter.md) — the metric grid swing plays against
- [melody](melody.md) and [phrase-structure](phrase-structure.md) — phrase schemata in general form
- [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md) — the algorithm family jazz rules map onto
- [markov-and-statistical-models](markov-and-statistical-models.md) — formula libraries as n-gram-like models
- [expressive-performance](expressive-performance.md) — timing/dynamics rendering

## Sources

- Berliner, Paul F. Thinking in Jazz: The Infinite Art of Improvisation, University of Chicago Press, 1994. https://press.uchicago.edu/ucp/books/book/chicago/T/bo3697073.html
- Friberg, Anders and Andreas Sundström. "Jazz Drummers' Swing Ratio in Relation to Tempo," ASA presentation summary, 1999. https://acoustics.org/pressroom/httpdocs/137th/friberg.html
- Friberg, Anders and Andreas Sundström. "Swing Ratios and Ensemble Timing in Jazz Performance," Music Perception 19(3), 2002. https://online.ucpress.edu/mp/article-abstract/19/3/333/61900/
- Johnson-Laird, Philip N. "How Jazz Musicians Improvise," Music Perception 19(3), 2002. https://online.ucpress.edu/mp/article/19/3/415/61921/How-Jazz-Musicians-Improvise
- Owens, Thomas. "Charlie Parker: Techniques of Improvisation," PhD dissertation, UCLA, 1974. https://archive.org/details/CharlieParkerDissertationVolumeIThomasOwens1974
- "Owens' 64 Motives for Alto Saxophone," Charlie Parker Centennial blog, 2020. https://charlieparkercentennial.com/owens-64-motives-for-alto-saxophone-update/
- Love, Stefan. "Schemata of Phrasing and Melody in Charlie Parker's Blues," Music Theory Online 18(3), 2012. https://mtosmt.org/issues/mto.12.18.3/mto.12.18.3.love.html
- Frieler, Klaus et al. "Patternology: Melodic Pattern Usage in Charlie Parker's Solos," 2017. http://www.mu-on.org/download/frieler_patternology_2017_en.pdf
- Wikipedia, "Swing (jazz performance style)" (ratio ranges, tempo dependence). https://en.wikipedia.org/wiki/Swing_(jazz_performance_style)
- piano.org, "Rootless Voicings: Type A and Type B (Bill Evans Style)." https://piano.org/theory/rootless-voicings/
- Learn Jazz Standards, "Play a Walking Bass Line Like a Pro in 4 Easy Steps." https://www.learnjazzstandards.com/blog/learning-jazz/bass/write-walking-bass-line/
- Wikipedia, "Twelve-bar blues." https://en.wikipedia.org/wiki/Twelve-bar_blues
- Wikipedia, "Thirty-two-bar form." https://en.wikipedia.org/wiki/Thirty-two-bar_form
- Wikipedia, "Modal jazz." https://en.wikipedia.org/wiki/Modal_jazz
