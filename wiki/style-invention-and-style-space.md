---
title: Style invention and style space
tags: [craft, algorithms]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: A style modeled as a bounded region in a multi-axis parameter space, case studies of deliberately invented styles (tintinnabuli, Partch, serialism's perceptual failure, drone, vaporwave), and the constraints — Lerdahl's listening grammar, within-piece statistical learnability, a universals-anchored novelty budget — under which an engine can sample coherent original styles.
---

# Style invention and style space

The site this project is designing will not only compose in established styles; it will invent new ones on the fly ([comprehensive-site-vision](comprehensive-site-vision.md)). That requires treating a style as a formal object an engine can construct, not just a label it can imitate. This page builds on [style-and-genre-overview](style-and-genre-overview.md)'s model of style as a probabilistic constraint system and pushes it one step further: a style is a **bounded region in a multi-axis parameter space**, preset genres are hand-tuned regions and invented styles are seeded samples of that space, and the difference between a coherent invented style and arbitrary noise is governed by a small set of well-documented perceptual constraints. The load-bearing negative lesson — Fred Lerdahl's distinction between the grammar a composer builds and the grammar a listener already owns — and the load-bearing positive one — that listeners statistically learn a genuinely new idiom within minutes — together define the design envelope for on-the-fly style invention.

## Style as a region in parameter space

[style-and-genre-overview](style-and-genre-overview.md) establishes (via Meyer and the statistical-learning tradition) that a style is a bundle of statistical regularities composers replicate and listeners learn; that page covers the psychology and the "style pack as data" idea and is not re-covered here. The extension this page needs is geometric. Each regularity is a distribution over one **axis** of musical choice; a style is the joint region those distributions carve out. Two consequences follow immediately:

- **Preset vs. invented styles differ only in provenance, not in kind.** A preset genre is a region whose center and spread were tuned by hand from research (the wiki's genre pages). An invented style is a region produced by *sampling* the same axes under coherence constraints. The engine representation — a **style vector** plus per-axis spreads — is identical for both, which is what lets one composer core serve both jobs ([meta-composition-and-style-machines](meta-composition-and-style-machines.md), [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md)).
- **A style is a region, not a point.** It must have internal spread (the "strategies" a composer varies within the rules) or every piece in it sounds identical. But the region must be *bounded and contiguous*: leave it mid-piece and the listener's learned distribution no longer predicts, so the expectation machinery idles ([musical-expectation](musical-expectation.md)). Invention is choosing *where* to put a small, coherent region — not widening the region until it covers everything.

### Candidate axes for a style vector

The dimensions along which real styles actually differ, with the kind of value an engine would store on each. This is the concrete target for the site's style representation; it extends the "style pack as three things" sketch in [generative-music-design-patterns](generative-music-design-patterns.md) into an explicit vector.

| Axis | What it fixes | Example values / ranges |
|---|---|---|
| Pitch material & tuning | the usable frequencies | 12-TET; JI ratio set; slendro `[0,240,480,720,960]`¢; Bohlen–Pierce (13 equal divisions of 3:1); any n-TET ([tuning-and-scales](tuning-and-scales.md)) |
| Pitch hierarchy | which scale tones are stable/frequent | a Krumhansl-style weight vector over the scale; a named tonic/reciting-tone pair |
| Harmonic motion type | how verticals succeed one another | functional-tonal · modal-static · planing/parallel · drone · loop-cycle · aggregate/atonal ([modal-and-nonfunctional-harmony](modal-and-nonfunctional-harmony.md), [harmony](harmony.md)) |
| Melodic grammar | contour and interval habits | step:leap ratio, range in semitones, cadence targets, ornament rules ([melody](melody.md)) |
| Rhythm / meter / groove | temporal grid and feel | meter (4/4, aksak 2+2+3), subdivision (2s vs 3s), swing %, timeline pattern, syncopation density ([rhythm-and-meter](rhythm-and-meter.md), [groove-and-embodiment](groove-and-embodiment.md)) |
| Tempo | BPM band | ~40–200 BPM; "free"/unmetered for drone |
| Texture & density | simultaneity and event rate | mono/homo/poly/heterophonic; 1–~7 voices; notes-per-bar band ([texture-and-density](texture-and-density.md)) |
| Ensemble & roles | who plays what | role set (bass/pad/lead/counterline/percussion) with register windows ([generative-music-design-patterns](generative-music-design-patterns.md) P5) |
| Timbre palette | spectral identity | synthesis recipes; brightness; harmonic vs. inharmonic partials ([timbre-and-orchestration](timbre-and-orchestration.md)) |
| Form template | sectional plan | AABA · verse–chorus · through-composed · audible process · cyclic/colotomic ([form-and-structure](form-and-structure.md)) |
| Dynamics & articulation | loudness and attack norms | dynamic range, accent hierarchy, legato vs. staccato bias |
| Expression / microtiming | human-feel rules | rubato depth, microtiming, ornament density ([expressive-performance](expressive-performance.md)) |
| Space & silence | use of rest and sustain | silence density, sustain/decay, reverb depth |

The axes are **not independent** — tuning constrains harmony, tempo constrains density, register constrains interval spacing. Those couplings are the coherence constraints of the last section; a naive independent sample of all axes will usually land outside any listenable region.

## What deliberately invented styles teach

History has already run the experiment many times: individuals invented explicit style systems and audiences either learned them or bounced off. The pattern in which ones cohered is the design data.

### Small rule systems that cohere: tintinnabuli and phasing

The cleanest successes are the minimalist rule systems, covered in depth in [minimalism-and-process-music](minimalism-and-process-music.md): Pärt's **tintinnabuli** (a melodic M-voice plus a T-voice restricted to tonic-triad tones chosen by a fixed positional rule — an explicit two-voice algorithm from which a 2026 reconstruction recovers ~93% of *Summa*'s notes) and Reich's **phasing** (two copies of one short loop, ≤6 pitch classes, sliding out of sync). What made them cohere as *invented* styles: (1) a rule set small enough to state in a sentence and *hear* operating; (2) heavily constrained, consonant pitch material, so the process supplies novelty while the material supplies coherence; (3) a slowly approached goal state. The material carries almost no new statistics for the listener to learn — the invention is in the *process*, layered over a familiar diatonic surface. This is the low-risk template: invent the syntax, keep the vocabulary near-universal.

### Total self-built sound-worlds: Partch and Young

At the opposite extreme, a composer can invent nearly every axis at once. Harry Partch rejected equal temperament for a **43-tone just-intonation scale** built on an eleven-limit "tonality diamond" (Otonality/Utonality chords as his triad-analogues), then — because no existing instrument could play it — built a whole instrumentarium (Chromelodeon, Kithara, Cloud-Chamber Bowls, Adapted Viola), calling himself "a philosophic music-man seduced into carpentry," and grounded the result in a performance philosophy he called **Corporeal** (bodily, theatrical, ritual) as against the "Abstract" Western concert tradition (*Genesis of a Music*, 1947). La Monte Young reduced music to a single sustained tuned chord held for extreme duration: **Composition 1960 #7** is just the notes B3 and F#4 with the instruction "to be held for a long time," and *The Well-Tuned Piano* extends a just-intonation improvisation past five hours. Both invented coherent regions far from any preset — but both had to supply their own **anchor** to stay parseable: Partch's and Young's reliance on just-intonation means their verticals are *psychoacoustically* consonant (low roughness, high harmonicity — [tuning-and-scales](tuning-and-scales.md)) even when the scale is unfamiliar, and Young's drones make the emergent overtone structure, not learned syntax, the content. Lesson for the site: you can move many axes at once *if* you anchor on a perceptual near-universal (here, harmonic consonance and sustained pitch) that needs no enculturation. These belong to the [contemporary-art-music](contemporary-art-music.md) lineage.

### The cautionary case: serialism and the two grammars

The most instructive failure is **integral (total) serialism** — Boulez's *Le Marteau sans maître* (1955), Babbitt's fully serialized pitch/register/dynamic/duration/timbre — and the analysis is **Fred Lerdahl's "Cognitive Constraints on Compositional Systems" (1988/1992)**, a cornerstone for this project. Lerdahl separates the **compositional grammar** (the rules a composer uses to generate a piece; *natural* if it arose spontaneously in a culture, *artificial* if consciously invented) from the **listening grammar** (the largely unconscious rules by which any enculturated listener builds a mental representation of what they hear). His key structural claim: a gap between the two *can only open for artificial grammars*, and integral serialism opens it maximally — Boulez's serial system is, in Lerdahl's words, "a huge gap between compositional system and cognized result." The listening grammar needs a surface that (Constraint 1) parses into discrete events and (Constraint 2) is available for hierarchical structuring; a maximally uniform, non-repeating serial surface offers no stable reference pitch, no recurring events, no hierarchy, so it is **cognitively opaque** — the elaborate structure is real on paper and inaudible in the ear. Tellingly, Babbitt largely *accepted* this, arguing listeners are poor at tracking precise values of pitch, register, dynamics, duration, and timbre and so would inevitably "falsify" the structure — a composer's grammar deliberately built with no corresponding listening grammar. Lerdahl's positive prescription is Aesthetic Claim 2: **"the best music arises from an alliance of a compositional grammar with the listening grammar."** For an engine that invents styles, this is the single most important rule: *the invented compositional grammar must project onto features the listening grammar can already parse.* Novelty that no listening grammar can decode reads as arbitrary, exactly the failure mode of naive generativity ([generative-music-failure-modes](generative-music-failure-modes.md)).

### Fast crystallization by recombination: vaporwave

Not every invented style is a composer's grand system; styles also crystallize fast from **recombination plus a few signature constraints.** Vaporwave went from Chuck Person's *Eccojams Vol. 1* (Daniel Lopatin, 2010) and Macintosh Plus's *Floral Shoppe* (2011) to a named, instantly recognizable microgenre within about two years, defined by a handful of audible rules applied to an existing corpus: take 1980s–90s smooth jazz / elevator music / lounge, **slow it down and pitch it down**, chop and loop it, drown it in reverb. The "invention" is a short transform plus a source-material commitment, not a new tuning or grammar. This is strong evidence that a compact, audible signature — two or three constraints a listener can name after one exposure — is sufficient to establish a style identity, and that recombination of coherent existing subsystems ([hybridization-and-fusion](hybridization-and-fusion.md)) is a fast, low-risk route to originality relative to inventing from scratch.

## Why some invented styles stay parseable

The case studies converge on four conditions an invented style must meet to succeed with listeners. These are the acceptance criteria the sampling procedure must enforce.

### The listening grammar sets the outer boundary

From Lerdahl: whatever the invented rules, the *surface they produce* must parse into discrete events and afford hierarchical grouping. Concretely that means an invented style should keep discrete (not continuously gliding) pitches or clearly bounded events, at least one recurring/stable reference (a tonic, a drone, a downbeat, a timbral landmark), and grouping cues (phrase boundaries, repetition, register separation) the ear uses to build structure. A style may violate a *preset* rule freely; it may not violate the listening grammar's parsing requirements and remain music rather than texture-of-last-resort.

### Within-piece statistical learnability

The strongest positive evidence that new idioms are learnable at all is **Psyche Loui and colleagues' Bohlen–Pierce experiments.** The Bohlen–Pierce scale is genuinely alien — 13 equal divisions of a **3:1 "tritave"** rather than a 2:1 octave, so essentially no listener has prior exposure. After roughly **25–30 minutes of passive listening** to melodies generated by a grammar in that scale, listeners recognized in-grammar melodies, generalized to novel ones, and — on a probe-tone test — produced a **pitch hierarchy matching the exposure statistics** they had just heard, all without training. A crucial dissociation for design: heavy repetition of a *few* melodies (5 melodies × 100) produced recognition and raised *preference* but **no generalization**, whereas varied exposure (400 distinct melodies, no repeats) produced generalization of the underlying grammar. So mere-exposure liking and statistical acquisition of the *system* are driven differently — the first by repetition, the second by varied-but-consistent examples. This converges with the probe-tone result that listeners induce an unfamiliar scale's hierarchy from tone-distribution statistics alone (Castellano et al., in [musical-universals](musical-universals.md)). The engine implication is sharp: a *single piece* delivers far less than 30 minutes of a new idiom, so an invented style must **front-load and heavily repeat its defining statistics** — make its characteristic scale degrees frequent and long early, repeat its signature intervals and rhythms — to be learnable inside its own duration. Teaching the hierarchy is part of composing the piece, not a given.

### A novelty budget anchored on near-universals

Because within-piece learning is limited, invented styles cannot spend novelty on every axis at once. The discipline is a **novelty budget**: move one to three axes away from convention and hold the rest at [musical-universals](musical-universals.md) defaults — an isochronous pulse subdivided in 2s or 3s, discrete pitches, a stable reference pitch, scales of ≤7 tones, descending/arched phrase contours, heavy motivic repetition. Every case above obeys this: Pärt and Reich invent syntax over a diatonic vocabulary; Partch and Young invent tuning but anchor on harmonic consonance and a stable tonal center; vaporwave changes surface treatment while keeping the harmony and phrasing of its source. This also keeps perceived complexity in the intermediate band where liking peaks for most listeners ([complexity-and-preference](complexity-and-preference.md)) — an all-axes-novel style is maximally complex and lands past the aversion threshold for nearly everyone. Anchoring is not timidity; it is what buys the listener enough predictability to notice the novelty as *surprise* rather than noise.

### Redundancy and self-similarity

Finally, an invented style needs internal redundancy: derive many surface events from few underlying **germs** (one scale, one rhythmic cell, one interval signature, one contour), so the piece is self-similar and the listener's model, once built, keeps paying off. This is the repetition-and-familiarity lever ([repetition-and-familiarity](repetition-and-familiarity.md)) applied to a style with no prior familiarity to draw on — within-piece redundancy is the *only* familiarity an invented style gets to offer on first listen. Verbatim and varied repetition, self-similar structure across timescales, and a small pitch/rhythm alphabet all raise learnability and lower the satiation risk that thin synthetic material otherwise incurs.

## Implications for generative engines

A procedure for sampling a coherent original style, synthesizing the constraints above. Most of this is *informed speculation* pending the site's own listening tests, but each step is anchored to a cited finding.

1. **Sample the style vector from priors, not uniformly.** Draw each axis (table above) from a prior that already encodes plausible values — scale from a library of real tunings, meter from attested meters, tempo from a genre-conditioned band. Uniform-random axes almost never intersect a listenable region.
2. **Enforce cross-axis coherence constraints (the hard part).** Reject or repair samples that violate known couplings:
   - **Tuning ↔ harmonic motion:** drone/modal/static harmony pairs with just intonation (pure sustained verticals); free modulation *requires* ~12-TET or software adaptive retuning ([tuning-and-scales](tuning-and-scales.md)).
   - **Tuning ↔ timbre:** harmonic timbres make small-integer scales consonant; inharmonic timbres shift the consonance valleys, so match the scale to the spectrum or the "chord" will read as a mistuning (Sethares program; flagged speculative in [tuning-and-scales](tuning-and-scales.md)).
   - **Register ↔ interval spacing:** widen harmonic spacing below ~C3 (critical bands are wide at low frequencies); the same third that is smooth at C5 is rough at C2.
   - **Tempo ↔ density:** cap events per second to a perceptual ceiling; if tempo is high, thin the texture, and keep perceived information content in the intermediate band ([complexity-and-preference](complexity-and-preference.md)).
   - **Meter ↔ groove:** weight syncopation and subdivision to the meter — 3:3:2 emphasis for Afro-diasporic feels, 2:2:3 for Balkan aksak ([musical-universals](musical-universals.md)).
   - **Form ↔ duration:** process/cyclic/drone forms scale to long durations; sectional forms (AABA, verse–chorus) want roughly 1–5 minutes.
3. **Derive all layers from a few germs.** Fix one scale (with an explicit hierarchy-weight vector), one rhythmic cell, one interval/contour signature, one timbral landmark; generate melody, harmony, and texture as elaborations of those germs so the piece is self-similar and learnable ([repetition-and-familiarity](repetition-and-familiarity.md)).
4. **Choose 2–3 signature rules and keep them audible and repeated.** These are the style's identity (Reich's phase shift, tintinnabuli's triad-locked second voice, vaporwave's slow-and-reverb). Make them operate at the surface, state them within the first phrases, and repeat them — this is the compact, nameable signature that establishes a style fast.
5. **Spend the novelty budget on those axes only; hold the rest at universals.** Pulse, discrete pitch, a stable reference tone, ≤7-tone scales, phrase repetition, arched contours as defaults, so novelty reads as surprise, not noise (Lerdahl's alliance; [musical-universals](musical-universals.md)).
6. **Teach the style inside the piece.** Following Loui and Castellano, front-load and over-represent the defining scale degrees, intervals, and rhythms early (frequent and long) so the listener acquires the statistics within the one piece they hear; a style the listener cannot learn in its own duration will read as arbitrary.
7. **Gate on parseability and self-check.** Require discrete events, at least one recurring reference, and clear grouping cues before playback (Lerdahl's two constraints); run the same critics used for preset styles — key/hierarchy induction, roughness, information-content band, self-similarity — over the generated output as an automated coherence filter ([computational-music-metrics](computational-music-metrics.md), [generative-music-design-patterns](generative-music-design-patterns.md) P7).

## Open questions

- How much learnable statistics does one piece actually deliver? Loui used 25–30 minutes; a 3-minute piece is an order of magnitude less. Is there a minimum duration, or a minimum repetition count of the signature, below which an invented style cannot be learned in-piece? A prime target for the project's own listening tests ([listening-tests-and-feedback](listening-tests-and-feedback.md)).
- Can cross-axis coherence be scored automatically well enough to use as a generation-time reject filter, or does it require hand-authored constraint tables per axis pair?
- Where is the line between a *recombination* (fast, low-risk — vaporwave, [hybridization-and-fusion](hybridization-and-fusion.md)) and a *from-scratch* invention (Partch, high-risk), and should the site's Start tier only ever offer recombinations, reserving axis-level invention for the Advanced tier ([control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md))?
- Does anchoring on harmonic consonance (Partch/Young's escape hatch) generalize to non-JI invented styles, or is it specific to tuning-based invention?

## Related pages

- [style-and-genre-overview](style-and-genre-overview.md) — style as a probabilistic constraint system (the foundation this page extends)
- [comprehensive-site-vision](comprehensive-site-vision.md) — the directive to invent styles on the fly
- [meta-composition-and-style-machines](meta-composition-and-style-machines.md) — systems that parameterize composition itself
- [hybridization-and-fusion](hybridization-and-fusion.md) — recombination as the low-risk route to new styles
- [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) — exposing the style vector as controls
- [musical-universals](musical-universals.md) — the near-universal defaults a novelty budget anchors on
- [complexity-and-preference](complexity-and-preference.md) — why an all-axes-novel style overshoots the liking peak
- [repetition-and-familiarity](repetition-and-familiarity.md) — within-piece redundancy as the only familiarity an invented style gets
- [minimalism-and-process-music](minimalism-and-process-music.md) — tintinnabuli and phasing as rule-defined styles
- [contemporary-art-music](contemporary-art-music.md) — Partch, serialism, and drone in their historical context
- [tuning-and-scales](tuning-and-scales.md) — tuning↔harmony↔timbre couplings and the consonance anchor
- [modal-and-nonfunctional-harmony](modal-and-nonfunctional-harmony.md) · [texture-and-density](texture-and-density.md) — two of the style axes in depth
- [generative-music-design-patterns](generative-music-design-patterns.md) · [generative-music-failure-modes](generative-music-failure-modes.md) — style pack as data; arbitrariness as failure

## Sources

- Fred Lerdahl, "Cognitive Constraints on Compositional Systems," in J. Sloboda (ed.), *Generative Processes in Music* (1988); repr. *Contemporary Music Review* 6(2), 1992, 97–121. Primary PDF: http://www.bussigel.com/lerdahl/pdf/Cognitive%20Constraints%20on%20Compositional%20Systems.pdf (the hosted PDF did not extract as text; the constraints, the natural/artificial vs. listening grammar distinction, the *Le Marteau* "gap" quote, and Aesthetic Claim 2 were verified against the article summary at https://en.wikipedia.org/wiki/Cognitive_Constraints_on_Compositional_Systems and corroborating scholarly discussion).
- Psyche Loui, David L. Wessel & Carla L. Hudson Kam, "Humans Rapidly Learn Grammatical Structure in a New Musical Scale," *Music Perception* 27(5), 2010 — https://pmc.ncbi.nlm.nih.gov/articles/PMC2927013/ ; companion on set size and repeated exposure: Loui & Wessel, "Learning and liking an artificial musical system," *Psychology of Music*, 2008 — https://pmc.ncbi.nlm.nih.gov/articles/PMC2819428/
- Wikipedia, "Harry Partch," "Harry Partch's 43-tone scale," "Instruments by Harry Partch" — https://en.wikipedia.org/wiki/Harry_Partch ; https://en.wikipedia.org/wiki/Harry_Partch%27s_43-tone_scale ; https://en.wikipedia.org/wiki/Instruments_by_Harry_Partch (Corporeal vs. Abstract, eleven-limit tonality diamond, the instrumentarium, *Genesis of a Music* 1947).
- Wikipedia, "Serialism" — https://en.wikipedia.org/wiki/Serialism ; Philip Ball, "Schoenberg, Serialism and Cognition: Whose Fault if No One Listens?" — https://philipball.co.uk/wp-content/uploads/docs/pdf/Ball_atonalism2.pdf (integral serialism's perceptual-reception problem; Babbitt's acceptance of the perceptual gap).
- Wikipedia, "Compositions 1960" and "La Monte Young" — https://en.wikipedia.org/wiki/Compositions_1960 ; https://en.wikipedia.org/wiki/La_Monte_Young ; MoMA, "La Monte Young. Composition 1960 #7" — https://www.moma.org/collection/works/127629 (B3/F#4, "to be held for a long time"; Theatre of Eternal Music; *The Well-Tuned Piano*).
- Wikipedia, "Vaporwave" — https://en.wikipedia.org/wiki/Vaporwave (Chuck Person's *Eccojams Vol. 1*, 2010; Macintosh Plus *Floral Shoppe*, 2011; slowed/chopped/reverbed sampling of 1980s–90s muzak as the signature).
- Leonard B. Meyer, *Style and Music: Theory, History, and Ideology* (1989) — laws/rules/strategies, as summarized and cited in [style-and-genre-overview](style-and-genre-overview.md).
