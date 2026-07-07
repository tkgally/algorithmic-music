---
title: Rhythm and meter
tags: [theory]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: How listeners infer a metrical grid from onsets, how syncopation and swing are measured, and how timelines, Euclidean rhythms, polyrhythm, and additive meters give rhythm an identity beyond a quantized grid.
---

# Rhythm and meter

Rhythm is the pattern of note onsets and durations in time; meter is the periodic framework of stronger and weaker time points that listeners infer from that pattern and project forward as expectation. The distinction matters for an engine because a good rhythm is not a dense grid of events — it is a small number of onsets placed so that they imply, reinforce, or deliberately contradict a felt pulse. Previous engines in this project generated rhythm by recursive subdivision with uniform jitter, which produces a grid but no *groove identity*: no sense that the pattern belongs to a style, no asymmetric timekeeper, no tension between surface and meter. This page covers the perceptual machinery of meter and the concrete devices — syncopation weights, swing ratios, timelines, Euclidean patterns, polyrhythm, additive meters — that turn a grid into music. Body-level embodiment and pleasure are covered in [groove-and-embodiment.md](groove-and-embodiment.md).

## Meter as hierarchical expectation

Meter is a hierarchy of pulse levels, each roughly twice or three times slower than the one below. Lerdahl and Jackendoff's *Generative Theory of Tonal Music* (GTTM, 1983) states four **metrical well-formedness rules** that constrain what grids are possible:

1. Every onset must align with a beat at the smallest metrical level present.
2. Every beat at a given level is also a beat at all smaller levels.
3. At each level, strong beats are spaced **either two or three** beats apart (never five, seven, etc., at a single level — larger spans are built by nesting twos and threes).
4. The tactus and larger levels are **equally spaced** throughout; subtactus weak beats are equally spaced between strong beats.

These describe an idealized isochronous grid. Real meter is a *perceptual* structure: listeners perform **beat induction**, inferring the pulse and downbeat from onset timing and phenomenal accents. Longuet-Higgins & Lee (1984) and Povel & Essens' clock model showed that the perceived meter is the one that best "explains" the onsets — placing accents on strong beats. Crucially, the same onset sequence can support more than one metrical reading (see polyrhythm below), and the reading is fragile: strong contradiction can flip it.

The **tactus** is the pulse level listeners tap and clap to — the reference beat. It is not free: it sits in a preferred region and is bounded by motor and perceptual limits.

## Pulse salience and tempo ranges

Van Noorden & Moelants (1999) modeled tapping data with a **damped harmonic oscillator** whose resonance peaks near **2 Hz (≈120 BPM)**; tempi near this resonance feel most natural and elicit the strongest spontaneous movement. Preferred perceived tempo spans roughly **80–160 BPM**, centered around 100–120 (Moelants 2002). Sensorimotor synchronization (Repp 2005, reviewing the tapping literature) has hard limits: people cannot reliably synchronize to inter-onset intervals (IOIs) shorter than **~100–200 ms** (the tactus cannot be faster than ~5–6 events/s) or longer than **~1.8–2 s**; beyond ~2 s the sense of a connected pulse dissolves. Taps also **precede** the beat by a **negative mean asynchrony** of tens of milliseconds (smaller for trained musicians). Implication: put the tactus in the 500–750 ms range (80–120 BPM) for default listenability, reserve faster surface activity for subdivisions of that tactus, and do not expect a felt beat above ~300 BPM or below ~33 BPM.

## Syncopation and how to measure it

Syncopation is an onset on a metrically weak position where the following stronger position is *not* articulated — the surface pulls against the grid without dislodging it. The **Longuet-Higgins & Lee (1984)** model quantifies this. Assign each metrical position a weight equal to its level: for a 4/4 bar at sixteenth resolution, the downbeat is 0, the half-bar −1, the quarter beats −2, the eighths −3, the sixteenths −4 (deeper = more negative). A syncopation occurs when a note (or its tie) at a weaker position is followed by a **rest or tied continuation** at a stronger position; its score is the **difference of the two weights** (stronger position weight minus the onset's weight). Total syncopation is the sum over the bar. Higher = more syncopated.

Fitch & Rosenfeld (2007) validated this against tapping: syncopation predicts perceived complexity and reproduction difficulty, and at **high syncopation levels listeners show "pulse reversals"** — they re-anchor the beat onto the syncopated onsets, i.e. the meter flips. This is the ceiling an engine must respect: past a threshold, syncopation stops being spice and becomes a different (or absent) meter.

The LHL model handles a single monophonic line. **Witek et al. (2014)** extended it with **instrumental weights** for a drum kit so that syncopation is also counted *between instruments* — e.g. a snare on a weak position followed by an unarticulated strong position where the bass drum "should" fall. This polyphonic syncopation index is the one to use for drum programming; it underlies the groove inverted-U (see [groove-and-embodiment.md](groove-and-embodiment.md)). Senn and colleagues have since shown these weight-based models predict listener syncopation ratings reasonably but imperfectly, and that exact weight schemes need tuning per style.

## Rhythmic categories and quantization

Listeners hear durations **categorically**, snapping continuous timing toward small integer ratios (1:1, 2:1, 3:1, 1:2:1). When people reproduce randomly-timed sequences, their reproductions drift toward these ratios, and **binary (1:2:4) ratios are reproduced more accurately** than non-binary or non-integer ones — an interaction of Weber's-law scalar timing with categorical perception. Two consequences for engines: (a) notated "straight" rhythm is a category, not a physical fact — small timing deviations are heard as expressive shading of a category, not as new durations; (b) unusual ratios (e.g. 5:4) are perceptually costly and read as either error or deliberate complexity.

**Swing** is a systematic long–short subdivision of the beat that is *not* 1:1 and usually *not* a clean 2:1. Friberg & Sundström (2002) measured jazz drummers' ride-cymbal swing and found the ratio is strongly **tempo-dependent**: about **3.5:1 at slow tempi, falling toward 1:1 at fast tempi**, passing through the textbook "triple-feel" 2:1 only at one intermediate tempo. Strikingly, the **short (offbeat) note stays roughly constant at ~100 ms** across medium-to-fast tempi rather than scaling with the beat. So a fixed swing ratio is wrong: an engine should hold the offbeat note near a fixed ~100 ms lag at medium/fast tempos and let the ratio widen as tempo drops.

## Timelines and claves as asymmetric timekeepers

Much of the world's dance music is organized not by a symmetric grid but by a repeating **timeline** (clave, bell pattern) — a fixed asymmetric onset pattern, usually of 5–7 strokes over a 12- or 16-pulse cycle, that every other part references. The Cuban **son clave** over 16 pulses is `x..x..x...x.x...` (a 3-3-4-2-4 grouping); West African **bell patterns** (e.g. the standard 12-pulse bell `x.x.xx.x.x.x`) function the same way (see [west-african-rhythm.md](west-african-rhythm.md)). A timeline works because it is **maximally asymmetric within limits**: its onsets are spread near-evenly but not evenly, so no single symmetric meter fully absorbs it, keeping the cycle perpetually re-orienting. This is the opposite of recursive subdivision — the identity lives in *one* fixed, off-grid pattern that loops.

## Euclidean rhythms and their limits

Toussaint (2004–2005, *The Euclidean Algorithm Generates Traditional Musical Rhythms*) observed that many timelines are **Euclidean**: distributing *k* onsets among *n* pulses as evenly as possible via Bjorklund's algorithm (a form of Euclid's GCD method), written E(k,n). Examples he catalogs (40+ world timelines):

- **E(3,8)** = `x..x..x.` — the tresillo / Cuban habanera cell.
- **E(5,8)** = `x.xx.xx.` — the cinquillo.
- **E(7,12)** = the West African / Ewe bell pattern family.
- **E(4,7)** = the Bulgarian ruchenitsa; **E(4,9)** = Brubeck's "Blue Rondo à la Turk."

**Caveats an engine must not gloss over.** (1) Many famous timelines are **rotations** of the canonical Euclidean output, not the output itself — the son clave `x..x..x...x.x...` is *not* what E(5,16) directly produces (E(5,16) gives `x..x..x..x..x...`, i.e. 3-3-3-3-4); it is a rotation/relative. Toussaint's own analyses depend on choosing the culturally correct rotation. (2) **Maximal evenness does not equal a good rhythm.** As critics note (e.g. Lawton Hall; the *Journal of Mathematics and Music* review of Toussaint's book), a four-on-the-floor kick is trivially E(4,16) — evenness is necessary for some timelines but is not sufficient and carries no cultural or aesthetic guarantee. (3) Labeling patterns "Euclidean" imports a Western-mathematical frame onto traditions that generate them by entirely different logic. Use Euclidean patterns as a **generator of candidate asymmetric timelines**, then select and rotate by ear/style, not as a theory of why rhythms are good. A validated first-party Bjorklund implementation now exists ([findings-shared-lib-foundation.md](findings-shared-lib-foundation.md)) — proven maximally even for all E(k,n) with 1 ≤ k ≤ n ≤ 32, and confirming this section's E(5,16) = 3-3-3-3-4 example exactly; it returns the normalized rotation with the rotation exposed as a parameter, precisely so the culturally/aesthetically correct phase is a deliberate choice.

## Polyrhythm, polymeter, and additive meter

- **Polyrhythm**: two pulse trains with coprime counts sounding in one cycle (3:2, 4:3, 5:4) that are not heard as derived from one meter — they create rhythmic tension and metrical ambiguity. The simplest, **3:2 (hemiola)**, is ubiquitous. A 12-unit cycle is genuinely bistable: West African listeners tend to hear 4 beats of 3, Western listeners 3 beats of 4 — the same onsets, two meters, resolved by enculturation.
- **Polymeter**: different meters running with a **shared beat unit** (e.g. 3/4 against 4/4 with a common quarter note); the cycles realign at the least common multiple (12 beats here). Contrast with polyrhythm, where the *pulse* differs.
- **Additive / aksak meters**: cycles built by adding **unequal** groups of 2 and 3 — the "limping" meters of the Balkans and Turkey (Brăiloiu's *aksak*). A 7/8 is 2+2+3, 3+2+2, or 2+3+2; 9/8 is often 2+2+2+3. The beats are non-isochronous (a long beat ≈ 1.5× a short one, a 3:2 ratio), yet felt as a stable repeating cycle. These are the natural home of "long and short beats" as opposed to a subdivided isochronous grid.

## Density, rest, and motivic identity

Rest is a rhythmic device, not absence: a silence on a strong beat (backbeat displacement, the "hole" in funk) is as defining as an onset. **Event density** trades off against clarity — the syncopation and groove models above assume you can *hear* the meter, which requires the grid to be sparse enough. Rhythmic **motifs** carry identity across the bar line: a short cell (e.g. the tresillo, or a dotted-eighth/sixteenth figure) repeated and displaced gives a passage coherence independent of pitch, and can be recognized when transposed in time or truncated. An engine that thinks in reusable rhythmic cells with characteristic accent shapes will produce more identity than one that fills a grid probabilistically.

## Implications for generative engines

- **Build a metrical grid explicitly** as a weight vector, not just a list of slots. For 4/4 at sixteenth resolution use LHL weights per position (downbeat 0, beat 3 = −1, beats 2&4 = −2, offbeat eighths = −3, sixteenths = −4). Every generation and evaluation decision (accent, syncopation, note placement) references this vector.
- **Default tactus 500–750 ms (80–120 BPM).** Keep the felt beat in this band; put density in subdivisions of it. Never place the tactus faster than ~100 ms IOI or slower than ~2 s.
- **Target medium syncopation.** Compute the Witek/LHL polyphonic syncopation score and aim for the middle of the range (the inverted-U peak, see [groove-and-embodiment.md](groove-and-embodiment.md)) — roughly, a few weak-position onsets per bar whose following strong position is a rest, but keep the downbeat and one backbeat articulated so the meter does not flip (avoid Fitch & Rosenfeld pulse reversal).
- **Swing = tempo-dependent long–short, not fixed 2:1.** Implement swing as an offbeat delay of ~80–110 ms held roughly constant across medium/fast tempos (ratio ~3.3:1 at 90 BPM narrowing toward ~1.5:1 at 200 BPM), not a fixed ratio. This is a scheduling detail; see [scheduling-and-timing.md](scheduling-and-timing.md).
- **Give each groove a timeline.** Pick one asymmetric ostinato (son clave, a 12-pulse bell, a Euclidean E(k,n) candidate) as the cycle's identity and reference every other voice to it, instead of independently subdividing. Rotate Euclidean outputs to the culturally/aesthetically correct phase; do not assume the raw algorithm output is the usable pattern.
- **Quantize to integer-ratio categories, then shade.** Generate durations from small integer ratios (favor binary subdivisions for accessibility, reserve 3- and 5-groupings for deliberate complexity), and treat expressive timing as small deviations *within* a category — not as new grid resolutions.
- **Use additive meters and polyrhythm as identity, not decoration.** A 7/8 (2+2+3) or a 3:2 hemiola layer is a strong stylistic signature; implement additive meters as sequences of unequal 2- and 3-groups with non-isochronous beats, and polyrhythm as genuinely independent pulse trains sharing a cycle.
- **Rests and motifs carry the groove.** Compose rhythm from a small library of reusable accented cells placed and displaced against the timeline, and treat strategic silence on strong beats as a first-class device. A sparse, characterful pattern beats a dense uniform grid.

## Open questions

- Best per-style LHL/Witek weight schemes: published weights are tuned to funk drum-breaks; do they transfer to swing, Afrobeat, or gamelan colotomy? (See [gamelan.md](gamelan.md), [indian-classical-music.md](indian-classical-music.md).)
- How to choose the correct rotation of a Euclidean pattern automatically, without a culture-specific lookup.
- Where exactly the syncopation "pulse-reversal" threshold sits as a function of tempo and how many anchoring strong-beat onsets are needed to prevent it.

## Related pages

- [groove-and-embodiment.md](groove-and-embodiment.md) — the body/pleasure side of rhythm; the syncopation inverted-U and microtiming debate
- [west-african-rhythm.md](west-african-rhythm.md) — bell patterns, cross-rhythm, timelines in depth
- [gamelan.md](gamelan.md), [indian-classical-music.md](indian-classical-music.md) — non-Western metrical/cyclic systems
- [tension-and-release.md](tension-and-release.md), [musical-expectation.md](musical-expectation.md) — meter as expectation and its violation
- [auditory-perception-basics.md](auditory-perception-basics.md) — perceptual limits underlying tactus and categorization
- [findings-shared-lib-foundation.md](findings-shared-lib-foundation.md) — a validated first-party Euclidean/Bjorklund implementation
- [scheduling-and-timing.md](scheduling-and-timing.md) — implementing swing, timelines, and microtiming in Web Audio
- [style-and-genre-overview.md](style-and-genre-overview.md), [electronic-and-dance.md](electronic-and-dance.md) — where these devices live stylistically

## Sources

- Fred Lerdahl & Ray Jackendoff, *A Generative Theory of Tonal Music*, 1983 — metrical well-formedness rules (summarized via secondary sources).
- H. C. Longuet-Higgins & C. Lee, "The rhythmic interpretation of monophonic music," *Music Perception*, 1984 — metrical weights and syncopation model. Discussed in Hoesl & Senn 2018: https://journals.sagepub.com/doi/full/10.1177/2059204318791464
- W. T. Fitch & A. J. Rosenfeld, "Perception and production of syncopated rhythms," *Music Perception*, 2007 — LHL validation, pulse reversals: https://web.uvic.ca/~aschloss/course_mat/MUS%20511/ARTICLES%20AND%20REFS%20FOR%20320/FitchRosenfeld20071.pdf
- M. Witek et al., "Syncopation, Body-Movement and Pleasure in Groove Music," *PLOS ONE*, 2014 — polyphonic syncopation index: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446
- L. van Noorden & D. Moelants, "Resonance in the perception of musical pulse," *Journal of New Music Research*, 1999; D. Moelants, "Preferred tempo reconsidered," 2002 — 120 BPM resonance, 80–160 range.
- B. Repp, "Sensorimotor synchronization: A review of the tapping literature," *Psychonomic Bulletin & Review*, 2005 — SMS rate limits, negative mean asynchrony.
- A. Friberg & A. Sundström, "Swing Ratios and Ensemble Timing in Jazz Performance," *Music Perception*, 2002 — tempo-dependent swing, constant ~100 ms short note: https://acoustics.org/pressroom/httpdocs/137th/friberg.html
- G. Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms," 2005; *The Geometry of Musical Rhythm*, 2013. Overview: https://en.wikipedia.org/wiki/Euclidean_rhythm ; critical review: https://www.tandfonline.com/doi/full/10.1080/17459737.2022.2025625 ; L. Hall, "Euclidean Rhythms": https://www.lawtonhall.com/blog/euclidean-rhythms-pt1
- C. Brăiloiu on aksak / additive meter, summarized: https://en.wikipedia.org/wiki/Additive_rhythm
- Categorical rhythm perception and integer-ratio bias: "Why Do Durations in Musical Rhythms Conform to Small Integer Ratios?" and related, https://pmc.ncbi.nlm.nih.gov/articles/PMC6282044/
- Polyrhythm vs polymeter and cross-cultural meter: "Beat perception in polyrhythms," https://pmc.ncbi.nlm.nih.gov/articles/PMC8378699/
