---
title: Original sound design — escaping the generic synthesizer tone
tags: [implementation, craft]
status: reviewed
created: 2026-07-09
updated: 2026-07-09
summary: Why oscillator-plus-filter voices read as "a synthesizer" even when they are otherwise well made, and a repertoire of original, sample-free Web Audio techniques — micro-pitch drift, fixed body/formant resonance, differentiated onset transients, decorrelated partial motion, slight inharmonicity, register-dependent timbre — that push a voice toward sounding like a physical, living instrument (natural or not) rather than a generic patch.
---

# Original sound design — escaping the generic synthesizer tone

Every voice this project synthesizes is built from stock Web Audio nodes — oscillators, filters, gains, a little noise ([synthesis-recipes](synthesis-recipes.md)). That is a strength (dependency-free, seedable, runs from `file://`) but it has a characteristic failure: the tones can be tuneful, expressive, and click-safe and *still* read to a listener as "a synthesizer" — a generic electronic sound with no physical body behind it. Tom flagged exactly this on Engine 04's lead voices. This page is the project's standing answer to it: first a **diagnosis** of what makes an oscillator-plus-filter voice sound synthetic, then a **repertoire of original techniques** (no sampling, no model of any specific real instrument) that move a voice toward sounding like a physical, living thing. The aim is not necessarily *natural* — an original synthetic timbre can be beautiful without imitating anything — but to escape the *generic*, dead, electronic character. It extends [timbre-and-orchestration](timbre-and-orchestration.md) (the perceptual axes) and [synthesis-recipes](synthesis-recipes.md) (the node graphs) with the specific question: **why does it still sound fake, and what removes that?**

## Diagnosis: six reasons an oscillator-plus-filter voice sounds "synthetic"

None of these is about the *notes*; they are all about what the signal does within a single sustained tone. In rough order of how much each one gives the game away:

1. **Dead-steady pitch.** A digital oscillator holds its frequency to the sample. No real bowed, blown, or sung tone does — the pitch of an acoustic instrument micro-wanders a few cents continuously (bow speed, breath pressure, lip and finger tremor, the player's imperfect ear correcting in a loop). A perfectly steady pitch is, in this project's experience, **the single strongest "electronic" tell** — stronger than the waveform choice. (Vibrato is *not* the same thing: vibrato is a periodic ~5–6 Hz modulation the player adds on purpose; drift is the small, aperiodic instability that is always there, even on a note "held straight.")
2. **No fixed resonant body.** In a subtractive voice the only filter tracks the played pitch (cutoff = *k*·f0), so the whole spectral envelope slides up and down with the note. A real instrument is the opposite: the string/reed/air column changes pitch, but it always radiates through the **same unmoving resonances of a physical body** — the violin's wood, the sax's bore and the room, the guitar's cabinet. Those fixed **formants** are a spectral-envelope signature the ear reads as "an object is making this sound." A pitch-tracking filter alone has no such signature, so nothing tells the ear there is a body.
3. **Static spectrum (low spectral flux).** Spectral flux — how the balance of partials changes through the note — is one of the three primary timbre dimensions ([timbre-and-orchestration](timbre-and-orchestration.md); Grey 1977, McAdams et al. 1995). A single oscillator's partials all rise and fall together in lockstep; a real tone's partials evolve **independently** (higher partials decay faster, beat against each other, wax and wane), so the color *breathes*. A spectrally frozen sustain sounds synthetic.
4. **Too-clean, undifferentiated attack.** The **attack transient — the first few tens of milliseconds — carries most of the information the ear uses to identify an instrument** (Saldanha & Corso 1964, via McAdams; [timbre-and-orchestration](timbre-and-orchestration.md)). A bare envelope ramp with no bow scratch, breath chiff, or pick click discards that identity and reads as generic. "Spend synthesis budget on the attack" is the highest-leverage rule on the timbre page.
5. **Perfectly harmonic, phase-locked partials.** Oscillator partials are exact integer multiples locked in phase. Real partials are slightly **inharmonic** (string stiffness stretches them; the body colors them) and drift in relative phase, which is why two real unison notes shimmer and a synth unison sounds like one fat wave. Perfection is the tell.
6. **Perfectly periodic waveform.** Each cycle is byte-identical to the last. Acoustic tones have small cycle-to-cycle variation (jitter/shimmer) from the excitation. This is the finest-grained cue and the hardest to add cheaply; the first four items buy far more per unit effort.

The corollary: **realism lives in small, continuous, partly-random deviations within the note**, exactly as expressive realism lives in structured timing/dynamic deviations within the phrase ([expressive-performance](expressive-performance.md)). A synth sounds synthetic for the same reason a quantized performance sounds mechanical — it is too perfect.

## The repertoire: original, sample-free techniques

Each technique below is realizable in a handful of Web Audio nodes, adds no dependency, imitates no specific instrument, and (important for this project's offline render-and-measure gate) can be made **deterministic and browser-identical** — use fixed-rate LFOs and band-limited slices of a shared *seeded* noise buffer, and give every ramp a defined endpoint (never `setTargetAtTime` → ramp, whose start value differs across browsers; see the Engine-01/02 static saga in [findings-tonal-classical-engine](findings-tonal-classical-engine.md)). Ordered by leverage.

### 1. Micro-pitch drift (the "alive" cue)

Sum a small, slow, quasi-random signal into each oscillator's `detune` (cents), **separate from and under any vibrato**. Two cheap generators:

- **Band-limited noise:** a looped seeded noise buffer → lowpass at ~4–7 Hz → gain (calibrate to a few cents) → `detune`. Genuinely aperiodic; needs empirical gain calibration because lowpassed white noise loses most of its amplitude.
- **Summed incommensurate LFOs:** 3 sine oscillators at unrelated sub-Hz rates (e.g. 0.11, 0.19, 0.31 Hz), each a small gain, summed into `detune`. Amplitude is exactly controllable (sum of the gains), it starts at zero (all sines at phase 0 → no onset jump), and different rate sets per voice make simultaneous voices drift *out of lockstep* so they beat like a real section. This is the more predictable choice for a deterministic render.

**Magnitude:** keep it small — ~2–5 cents total. Below ~1 cent it is inaudible; above ~8–10 cents it reads as a wobble or out-of-tune. The point is life, not pitch content. This one change does more to de-electronic-ify a voice than any waveform swap.

### 2. Fixed body / formant resonance

Pass the tone through a small stack of **`peaking` BiquadFilters at *fixed* frequencies** (a few dB of boost, moderate Q), chosen once per instrument and **not** tracking the played pitch. Two or three peaks in the low-mid plus one presence peak give the ear a stable spectral-envelope signature — the cue that "a body is resonating this." A parallel bank of high-Q bandpasses summed with the dry signal is the more physically-faithful form (true formant/modal resonators), but series peaking filters are cheaper and read convincingly. Because the peaks add gain, follow them with a compensating trim so the note's level is unchanged. This is the wiki's long-standing "2–3 fixed peaking filters as a crude body, fixed per instrument, not per note" recipe for bowed strings ([synthesis-recipes](synthesis-recipes.md)), generalized to every sustained voice: it is one of the two biggest steps (with drift) from "patch" to "instrument."

### 3. Differentiated onset transients

Add a **very short (≈15–70 ms) band-limited noise burst at the attack**, colored per voice, mixed under the tone: a bandpass "scratch" for a bowed voice, a highpass "breath" chiff for a reed, a short bright "click" for a plucked or struck attack. Because the attack carries most of the identification, giving each voice its *own* onset noise is what lets the ear tell two otherwise-similar saw-through-filter voices apart, and pulls both away from "generic." Keep it a few percent of the tone's level — felt, not heard as a separate noise. Pair it with a fast **attack brightness overshoot** ("bite": open the filter a little past its target in the first ~20–40 ms, then settle) for the effort cue of a real onset.

### 4. Decorrelated partial motion (spectral flux)

Make the partials evolve independently so the spectrum breathes:

- Give a detuned oscillator pair *different* micro-drift signals so their beating **rate itself wanders** (not a fixed 3 Hz chorus but a living one).
- Put a slow, shallow, independent amplitude LFO on a secondary oscillator or a high partial (a few percent, ~0.1–0.5 Hz, decorrelated from the others) so the relative partial levels drift.
- In additive/FM voices, decay higher partials faster than lower ones (τ ∝ 1/f), and let the FM index or a partial's gain wander slightly.

Small amounts suffice; the goal is a spectrum that is never twice the same, not an obvious tremolo.

### 5. Slight inharmonicity and unison decorrelation

Detune upper partials by a few cents *away* from exact integer ratios (string-stiffness-like stretch), and detune unison/ensemble layers by 4–12 cents with **randomized per-note** offsets so no two notes stack identically. Perfectly harmonic, perfectly repeatable stacks are a synth tell; a little controlled imperfection reads as physical. (Detune beating is a *tempo* — 3 cents at A4 beats ~0.8 Hz — so choose offsets whose beat rates suit the music; [synthesis-recipes](synthesis-recipes.md), [tuning-and-scales](tuning-and-scales.md).)

### 6. Register- and velocity-dependent timbre

A real instrument is brighter and louder up high, darker and weaker at the bottom, with a defined usable range; and **louder = brighter** physically. An engine that uses one fixed brightness and level per "instrument" across all pitches and dynamics sounds wrong regardless of the above. Map velocity to filter cutoff / FM index / burst spectrum (not just level), and make the patch register-dependent ([timbre-and-orchestration](timbre-and-orchestration.md), [synthesis-recipes](synthesis-recipes.md)). This is prior wiki doctrine, repeated here because it interacts with everything above.

### 7. Gentle even-order saturation (optional warmth)

A light `WaveShaperNode` soft-clip (Tarrabia/de Jong, `a` ≈ 0.1–0.3, `oversample: "2x"`) adds low-order harmonics and a touch of level-dependent compression that reads as "analog." Use sparingly on a single voice (heavy shaping is a distinct effect, not warmth); it pairs well with a fixed body resonance.

## What this project shipped (Engine 04 v0.2)

The cantabile engine's four expressive voices (aria/reed/wire/glass) added three of these as **additive** helpers in the shared `synth.js` (no change to any other engine's vendored copy; [findings-cantabile-engine](findings-cantabile-engine.md)):

- **`microDrift`** — 3 incommensurate sine LFOs (per-voice rate sets) → `detune`, ~2–5 cents, always on (organic even when "played straight"), grain-forward via the engine's Grain slider.
- **`bodyResonance`** — a fixed 1–3-peak `peaking`-filter body per voice (warm string peaks for aria, a nasal pair for reed, cabinet peaks for wire, one gentle peak for glass), with a level-compensating trim.
- **`onsetTransient`** — a short per-voice noise burst at the attack: `scratch` (aria), `breath` (reed), `click` (wire); glass keeps its existing airy chiff.

All are deterministic (fixed LFO rates + the shared seeded noise buffer + `noiseOffset(t)`) and browser-identical, so the offline render gate stays stable; the render remained clipping-free and click-safe with them added. Whether they move the *ear* from "synth" to "instrument" is the open listening question below — but the mechanisms are exactly the diagnosed cues, so the direction is right.

## Implications for generative engines

- **Treat "sounds like a synth" as a fixable defect with named causes, not a fact of sample-free synthesis.** The six diagnosis items are a checklist; most sample-free voices fail on drift, body, and attack, and fixing those three is most of the win.
- **Micro-pitch drift and a fixed body resonance are the two highest-leverage additions** and belong on essentially any sustained "instrument" voice. Build them once as reusable helpers and vendor them (as Engine 04 did).
- **Spend on the attack.** A differentiated onset transient buys instrument identity and voice-to-voice separation more cheaply than any sustain detail.
- **Keep the deviations small and, where random, band-limited + seeded.** A few cents of drift, a few dB of body, a few percent of onset noise. Exaggeration reads as broken, not real — the same lesson as expressive timing ([expressive-performance](expressive-performance.md)).
- **Preserve determinism for the render harness:** fixed-rate LFOs and seeded-noise slices, every ramp to a defined endpoint, no cross-browser-divergent `setTargetAtTime`→ramp transitions.
- **"Natural" is one target, not the only one.** These techniques also make *original, non-imitative* timbres more compelling — a voice can be plainly synthetic and still sound like a real object with a body and a breath. Escaping *generic* is the goal; realism is one direction to escape in.
- **Additive, per-voice, and low-risk.** Add the helpers so existing voices are untouched unless they opt in; this keeps other engines byte-for-byte stable ([engine-architecture](engine-architecture.md)).

## Open questions

- **Does it actually cross the perceptual line?** The mechanisms match the diagnosis and the render stays clean, but only listening tells whether Engine 04 v0.2's leads now read as "instruments" rather than "synths," and at what magnitudes drift/body/onset are tasteful vs. overdone. This is a direct listening-test item ([listening-tests-and-feedback](listening-tests-and-feedback.md)).
- **Calibrating band-limited-noise drift.** The summed-LFO drift is amplitude-predictable; a true filtered-noise random walk is more organic but needs an empirical gain-vs-cutoff calibration (and a per-voice measurement of resulting cents) to stay in the 2–5 cent band across sample rates.
- **Cycle-to-cycle jitter cheaply.** Items 1–5 are all realizable in the node graph; genuine per-cycle waveform variation likely needs an [AudioWorklet](audio-worklets-and-performance.md). Is it worth the `file://` loading complexity, or do drift + body + flux already saturate the gain?
- **Auto-search for body/formant tables.** Can offline rendering + spectral metrics ([computational-music-metrics](computational-music-metrics.md)) auto-tune per-voice peak tables toward target timbre descriptors, the way modal-synthesis mode tables might be searched ([synthesis-recipes](synthesis-recipes.md) open questions)?
- **How much transfers under background listening?** ([attention-and-background-listening](attention-and-background-listening.md)) Plausibly the sustained cues (drift, body) matter most and the onset transient matters less when the listener is not attending — untested.

## Related pages

- [timbre-and-orchestration](timbre-and-orchestration.md) — the three MDS timbre axes, why attack identifies instruments, fixed-body/formant rationale
- [synthesis-recipes](synthesis-recipes.md) — the node graphs these techniques extend (subtractive, FM, modal, bowed-string/wind approximations, waveshaping)
- [expressive-performance](expressive-performance.md) — the same "structured-plus-small-random deviation, never perfect" principle at the phrase level
- [findings-cantabile-engine](findings-cantabile-engine.md) — Engine 04, which shipped `microDrift`/`bodyResonance`/`onsetTransient`
- [auditory-perception-basics](auditory-perception-basics.md) — critical bands, roughness, streaming that underlie blend and beating
- [web-audio-fundamentals](web-audio-fundamentals.md) — the anti-click and node-lifetime discipline every recipe assumes
- [audio-worklets-and-performance](audio-worklets-and-performance.md) — when per-cycle realism outgrows the node graph

## Sources

- Design synthesized from the reviewed wiki pages above, chiefly [timbre-and-orchestration](timbre-and-orchestration.md) and [synthesis-recipes](synthesis-recipes.md), which carry the primary citations: J. M. Grey, "Multidimensional perceptual scaling of musical timbres," *JASA* 1977 (attack, spectral distribution, spectral flux as the primary axes); S. McAdams, S. Winsberg et al., "Perceptual scaling of synthesized musical timbres," *Psychological Research* 1995 (rise time, spectral centroid, spectral irregularity); E. J. Saldanha & J. F. Corso, "Timbre cues and the identification of musical instruments," *JASA* 1964 (attack excision destroys identification, via McAdams's reviews); Gordon Reid, "Synth Secrets" (Sound on Sound) for the bowed-string fixed-body-filter and delayed-vibrato recipes and the general subtractive/FM parameterizations.
- The specific claim that **dead-steady pitch is the strongest single electronic tell**, and the recommended cent/dB/percent magnitudes, are this project's **informed engineering judgment** (grounded in the timbre-dimension literature above and in this project's own render-and-measure work), not a single citable measurement — flagged as informed speculation per [conventions](conventions.md). They are stated as defaults to calibrate by ear via [listening-tests-and-feedback](listening-tests-and-feedback.md), not as settled fact.
- All quantitative claims about Engine 04's implementation (helper structure, cent ranges, determinism) are produced by the in-repo `experiments/lib/synth.js`, `experiments/engines/cantabile/engine.js`, and the `experiments/tools/render-cantabile.mjs` gate, re-runnable from the repo.
