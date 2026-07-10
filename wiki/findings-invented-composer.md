---
title: Findings — the dedicated invented-style composer
tags: [findings, implementation, project]
status: draft
created: 2026-07-10
updated: 2026-07-10
summary: Session 038 replaced the invented-style strategy routing (borrow one of the eight genre engines) with a dedicated composer that realizes a per-seed style KERNEL — a texture architecture × a rhythm system × a melodic gamut with hierarchy pillars × a functional form grammar — voicing the whole drawn ensemble including percussion; the design rationale (an original reading of the style-invention, meta-composition, texture, and failure-modes pages), what the gates caught, and what a listening pass should probe.
---

# Findings — the dedicated invented-style composer

Until session 038, "Invent a style" sampled a style vector and then handed it to whichever of the eight *genre* strategies best fit (`invent()`'s routing block) — every invention was, at bottom, one of eight hand-written idioms wearing sampled parameters, and any ensemble role the borrowed strategy didn't know (percussion outside the groove routings, extra color voices) stayed silent. Tom asked for the real thing: **a freshly generated "engine" per invented piece** — original combinations of harmony, rhythm, melody, timbre, texture, form, phrasing, and dynamics that a human could find interesting, not tied to any single existing genre. This page records the design that shipped, why it is shaped that way, and what remains open for listening.

## The reading that shaped the design

The wiki pillars converge on a specific claim once read together: **a style is not a point in parameter space — it is a small generative system.** [style-and-genre-overview](style-and-genre-overview.md) models a style as a probabilistic constraint system; [style-invention-and-style-space](style-invention-and-style-space.md) says invention = placing a small coherent *region* (novelty budget over universals, 2–3 signatures, teach-the-style-inside-the-piece); [meta-composition-and-style-machines](meta-composition-and-style-machines.md) dissects every successful style machine into *alphabet + selection procedure + control surface*. The eight genre packs are exactly such systems, hand-written. So the dedicated invented composer cannot be "better parameter routing" — it must **generate a small system per seed** and then perform it. We call that generated system the **style kernel**, and the one realizer that can perform any kernel is the new library `docs/lib/invent.js`.

The second load-bearing observation comes from [texture-and-density](texture-and-density.md): the biggest *audible* differences between human musics are **architectural, not scalar** — whether an ensemble plays a tune over accompaniment, interlocking halves of one line, stratified layers at fixed density ratios, homorhythmic chords, a canon, a call-and-response, an ostinato web, or a tintinnabuli pair is a bigger stylistic fact than any slider value. Drawing the *architecture* per seed is what makes each invented piece "its own engine" in a sense a listener can actually hear. (The one giant probability soup that [generative-music-design-patterns](generative-music-design-patterns.md) forbids is avoided precisely because these are discrete, legible architectures, each with its own writer — architecture selection, then commitment.)

## The kernel (what a seed now draws)

Drawn in `style.js invent()` from a dedicated stream (`inventKernel`), stored on the vector so live control changes and re-plans rebuild the same kernel from the same seed:

| Kernel field | Values | Basis |
|---|---|---|
| **Texture architecture** | melodyAccomp · ostinatoWeb · callResponse · strata · canon · hocket · chorale · tintinnabuli (weighted 0.20/0.17/0.14/0.12/0.12/0.10/0.08/0.07) | [texture-and-density](texture-and-density.md) cross-cultural menu; [counterpoint-and-voice-leading](counterpoint-and-voice-leading.md) (canon, imitation); [minimalism-and-process-music](minimalism-and-process-music.md) (tintinnabuli) |
| **Rhythm system** | flow · cell (a Schillinger resultant a:b ∈ {3:2, 4:3, 5:2, 5:3, 5:4}) · timeline (clave/bell/Euclid/sieve) · groove (needs a drawn perc role) | [meta-composition-and-style-machines](meta-composition-and-style-machines.md) (resultants); [rhythm-and-meter](rhythm-and-meter.md), [west-african-rhythm](west-african-rhythm.md) (timelines) |
| **Melodic gamut** | a seeded 5–7-degree subset of the scale, tonic always kept, signature interval-cell degrees kept | a sieve-flavored *invented mode-within-the-mode*: the melody's characteristic gaps are audible while harmony keeps the full scale (how pentatonic melodies ride parent harmony) — [style-invention-and-style-space](style-invention-and-style-space.md), [tuning-and-scales](tuning-and-scales.md) |
| **Hierarchy pillars** | 2 degrees (tonic + one of 5th/4th/3rd/6th) biased to be frequent and long, and used as phrase goals | teach the hierarchy by distribution (Castellano, via [musical-universals](musical-universals.md) §4) |
| **Per-texture parameters** | canon delay (1–2 beats) + diatonic answer interval (octave/5th/4th below); strata elaboration multiplier (4× or 8×, tempo-gated); tintinnabuli position (1st/2nd) and side (sup/inf/alt); call/response phrase length; mid-ostinato cycle (2–3 bars) | each architecture's own literature (kotekan splits, the Pärt T-voice rule, gamelan irama ratios) |
| **Entry mode** | layered · leadFirst · together | [beginnings-endings-and-transitions](beginnings-endings-and-transitions.md): the intro states the style's signatures first |

**Coherence couplings** repair the draw rather than resampling (determinism): tintinnabuli forces drone/modal harmony (the T-voice is triad-locked) and low density; chorale caps density and tempo (~116 BPM — homorhythm at speed reads as machine-gun chords) and raises harmonic richness; hocket needs motion (BPM floor 88, density floor); strata slows the harmonic rhythm under its dense surface (the texture page's dense-surface ↔ slow-harmony coupling); a **chord-rate ceiling** caps the `harmonicRhythm` novelty against bar length and tempo (a chord change every < ~0.6 s reads as texture, not harmony — caught by a symbolic audit at 20 events/s in a 5/8 draw).

## The form grammar (no more fixed section lists)

`init()` generates sections from a small functional grammar over kinds — intro? · **state** · **return** · depart · break? · **peak** · **end** — with the flavor picked by the development value (cyclic &lt; 0.35 ≤ arch &lt; 0.7 ≤ through-composed). Non-negotiables encoded from [form-and-structure](form-and-structure.md) and [tension-and-release](tension-and-release.md): every form contains **at least one recognizable return** (even the through-composed flavor recapitulates once), a **peak in the second half** (intensity forced ≥ 0.92) followed by a shorter resolution, and a composed **ending idiom** per the vector's ending field. Fitting to the target length **extends the form rather than inflating rooms**: sections grow round-robin only to a 16-bar cap; past it, the grammar inserts another departure–return cycle before the peak — long pieces become rondos, not endless middles ([repetition-and-familiarity](repetition-and-familiarity.md), failure mode 4). Quiet architectures (chorale, tintinnabuli) skip the hard break.

**The theme lifecycle** answers failure mode 3 (nothing to remember): the first stated phrase commits a motif (from the rhythm-motto signature when present, else the resultant cell, else the phrase machinery's own draw) plus a contour archetype; statements, returns, and the peak keep motif + contour invariant (the peak restates up a register — climactic return); departures get the contrasting contour and free rhythm. A node test verifies the return's first-bar lead rhythm equals the statement's.

## Voicing the whole ensemble (the headline fix)

Every drawn role now maps to a writer: lead / harmonic mid / color mid (shimmer, canon echo, T-voice) / low (bass or held drone — the stable reference [style-invention-and-style-space](style-invention-and-style-space.md) requires) / **percussion**. The percussion writer runs for *every* kernel: timeline (inviolable once present), kick with beat 1 sacred, snare backbeat + ghosts, hat/shaker subdivision with a velocity hierarchy, two hand-percussion parts on **complementary Euclidean rotations** (the second rotation is chosen to minimize overlap with the first — real interlock, per [west-african-rhythm](west-african-rhythm.md)), colotomic boom every two bars, gong at section starts ([gamelan](gamelan.md)). Activity is gated by the intensity arc (thresholds per role — the layering *is* the dynamic form, [percussion-music](percussion-music.md)), and a per-texture quietness factor scales *velocity, never existence* — a chorale's drawn percussion is discreet, not deleted. A 12-seed node test asserts every drawn role emits events.

## Integration decisions

- **Not a genre pack.** Pack `order` doubles as the URL genre enum and the Start-button list, so the invented strategy registers beside the registry via a new `compose._setInvented()` hook; `resolveStrategy` prefers it when `vector.strategy === 'invented'`. Registry, URL layout, serialize, Start buttons: untouched.
- **Kernel on the vector, patterns in the plan.** The kernel (identity) is drawn in `invent()` so re-plans and control changes keep the idiom; the realized patterns (timeline, interlock rotations, ostinati, theme) live in the strategy's plan and re-derive deterministically from the seed's plan stream.
- **Additive compose.js extensions only:** `melodyPhrase` gains opt-in `gamutPcs` (restrict the melodic pool) and `pillarPcs` (a standing score bonus) — genre packs pass neither and are unaffected (their sweeps and the 182-test suite confirm).
- **Old invented links change character.** The same seed now reproduces the same *new* piece; pre-038 invented URLs play differently (the routing they encoded no longer exists). Presets and melds are byte-identical in behavior.

## What the gates caught (worth keeping)

- **Breaks must keep a pulse.** The first break writer went near-silent for styles with no timeline (a 7.3 s symbolic gap at slow tempo in 7/8). Fix: the low sustains through the break and a tapering pulse holds the grid — the parseability anchor is not optional even in a designed thin-out.
- **Length fitting must extend form, not rooms.** Short-bar meters (2/4 at 140+ BPM) made 200+-bar targets balloon single sections to 64 bars; the insert-a-cycle rule above fixed it.
- **The chord-rate ceiling** (above): the `harmonicRhythm` novelty axis × short bars × fast tempo produced a chord every 0.3 s.
- **The 1-bar call-and-response degeneracy.** A call phrase composed as a 1-bar `melodyPhrase` collapsed to a single held note (the phrase machinery's cadence-bar special case consumed the whole bar) — for one seed that meant one lead note per 4-bar unit. Rewritten: the writer composes one continuous line and *gates* it into call windows (antiphony as a mask), the answers speaking the motif's rhythm in the off-windows; with no answerer present (a Layers=1 pin) the lead keeps the floor. Event count on the affected seed went 365 → 824.
- **The gamut and pillars measurably bind.** Across 17 seeds with a sub-7-degree gamut: **98.4 %** of lead notes stay within the gamut (the remainder = cadence goals and tight register windows falling back to the full scale, by design), and **74.7 %** of long lead notes (≥ 1.5 beats) land on pillar degrees — the teach-the-hierarchy-by-distribution mechanism, verified symbolically.
- Symbolic health across 48 seeds after fixes: ~2.7 events/s (tintinnabuli) to ~13 (chorale), no silent leads, all velocities in range; 12/12 invent sweep clean (5 meters, 8 scales drawn).

## Open questions (for Tom's listening)

- Do the eight architectures *read* as different engines at the ear, or do shared synth voices flatten them? (The strongest differentiators should be hocket/strata/tintinnabuli vs melodyAccomp.)
- Is the gamut audible as "this style's mode" — do its gaps register as identity or as absence?
- Texture weights: melodyAccomp at 0.20 keeps the safest architecture commonest; should rarer ones (chorale 0.08, tintinnabuli 0.07) be rarer still, or is variety worth more than safety here?
- The percussion quietness factors (chorale 0.35, tintinnabuli 0.25) — discreet or intrusive?
- The rondo extension for long pieces: does a 5th–6th departure-return cycle stay interesting, or should very long invented pieces prefer the through-composed grammar?

## Related pages

- [style-invention-and-style-space](style-invention-and-style-space.md) · [meta-composition-and-style-machines](meta-composition-and-style-machines.md) — the design frame (region + novelty budget + signatures; alphabet + selection + control)
- [texture-and-density](texture-and-density.md) — the architecture menu this composer draws from
- [generative-music-failure-modes](generative-music-failure-modes.md) · [generative-music-design-patterns](generative-music-design-patterns.md) — the checklist each writer answers
- [form-and-structure](form-and-structure.md) · [tension-and-release](tension-and-release.md) · [repetition-and-familiarity](repetition-and-familiarity.md) — return, peak, and repetition rules encoded in the grammar
- [musical-universals](musical-universals.md) — the anchors everything un-drawn stays at
- [percussion-music](percussion-music.md) · [west-african-rhythm](west-african-rhythm.md) · [gamelan](gamelan.md) · [minimalism-and-process-music](minimalism-and-process-music.md) — the percussion layering, interlock, colotomy, and tintinnabuli mechanics
- [findings-comprehensive-site](findings-comprehensive-site.md) — the site this lands in

## Sources

- This page records this project's own implementation findings (session 038; `docs/lib/invent.js`, `docs/lib/style.js`, `logs/sessions/038-2026-07-10.md`). The musical claims it relies on are cited in the linked wiki pages, which were read in full for this design; the specific mechanisms borrowed are named inline (Schillinger resultants, Xenakis sieves, kotekan splitting, gamelan colotomy/irama, the Pärt tintinnabuli rule, Euclidean timelines).
