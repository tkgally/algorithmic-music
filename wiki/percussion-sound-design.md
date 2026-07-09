---
title: Percussion sound design
tags: [implementation, theory]
status: reviewed
created: 2026-07-09
updated: 2026-07-09
summary: The acoustics of the percussion families (inharmonic membrane and bar and bell modes, the attack pitch-glide, noise plates and shakers) and concrete original Web-Audio synthesis recipes for each — modal banks, pitch-dropping fundamentals, and shaped noise — plus the handful of parameters that let one voice cover a whole timbral range and the mix rules that keep a dense ensemble legible.
---

# Percussion sound design

This page is the sound companion to [percussion-music](percussion-music.md): how to build a variety of **original** percussion voices from Web-Audio primitives (oscillators, noise, filters, envelopes) — *inspired by* real instruments' acoustics but **not sampled and not slavishly imitative**. It extends [synthesis-recipes](synthesis-recipes.md) (which already has kick/snare/hat and mallet/bell modal tables) into the full palette — membranes of different pitches, wood, struck metal, gongs/cymbals, shakers — and applies [timbre-and-orchestration](timbre-and-orchestration.md)'s finding that **the attack transient is where an instrument's identity lives** and [original-sound-design](original-sound-design.md)'s techniques for escaping the "generic synth" tell. Numbers below marked as *idealized targets* are physics limits real instruments only approximate; decay times and drum-machine frequencies are approximate and instrument-specific.

## The three synthesis families

Almost every percussion voice is one of three things, and the choice follows the physics:

1. **Membrane drums → a pitch-dropping fundamental + a few inharmonic 2-D modes.**
2. **Struck bars / wood / metal / bells → a modal bank** (a handful of decaying inharmonic sinusoids).
3. **Cymbals / gongs / shakers → shaped filtered noise** (a dense plate is noise-like; a shaker *is* noise).

### 1. Membranophones (drums) — inharmonic 2-D modes + a pitch glide

An ideal circular membrane's modes are **inharmonic** (Bessel-function zeros), as ratios to the fundamental (0,1) mode: **1, 1.59, 2.14, 2.30, 2.65, 2.92, 3.16, 3.50, 3.60…** (labeled by nodal diameters,circles). Two acoustic facts shape the synthesis:

- The **(0,1) "breathing" mode radiates efficiently and decays fast**, so it does *not* set the perceived pitch; the tone-bearing modes are those with nodal diameters — (1,1), (2,1), (3,1)…
- A hard strike stretches the head, raising tension and thus **initial pitch**, which relaxes as amplitude decays → an audible **downward pitch glide over the first tens of ms**. This glide (not the steady tone) is the identifying gesture, and is exactly what the "808 kick" pitch envelope reproduces.

**Tuned drums (timpani).** Air loading lowers all modes and pulls the (m,1) series toward **near-harmonic ≈ 1 : 1.5 : 2 : 2.5 : 3** — i.e. harmonics 2:3:4:5:6 of a *missing fundamental* an octave below (1,1), which the ear reconstructs as the pitch. **Hand drums** (conga/djembe) get their three sounds from strike technique selecting different mode sets: **bass** (a shell/Helmholtz air resonance, ~65–120 Hz), **tone** (edge, skin modes ~300–500 Hz), **slap** (sharp broadband to several kHz). A **snare's** buzz is separate snare wires rattling → broadband noise (body ~180 Hz, buzz ~3–5 kHz) that outlasts the fast body mode.

*Recipe.* A sine (or triangle for edge) with a **pitch envelope** (start 1.5–2× base, drop to base in 30–70 ms, exponential) into a fast-decaying amp envelope, **plus 2–3 quiet inharmonic partials at 1.59 / 2.14 / 2.30** for the "skin" color, **plus an attack noise burst** (short, band-limited) for the strike; a slap raises the noise and brightness and shortens the decay. The membrane partials are what read as a struck skin rather than a bare sine.

### 2. Idiophones — modal banks (wood, metal, bars, bells)

A **modal bank** sums N decaying sinusoids `[ratio × f0, gain, decay]`; ratios and Q set the *material*, and **higher modes decay faster** (a good model is decay rate ∝ f², i.e. τ ∝ 1/f²), which gives the natural "bright attack, darker tail." Idealized ratio sets:

| Object | Partial ratios | Character / decay |
|---|---|---|
| Ideal free bar (untuned wood/metal) | **1 : 2.756 : 5.404 : 8.933** | woodblock/glass — short (wood) to ringing (metal) |
| Tuned **marimba** bar (undercut) | **1 : 4 : ~10** | warm, pitched; ~0.4–2 s |
| Tuned **xylophone** bar | **1 : 3 : …** | brighter, drier, harder |
| Western **bell** (minor-third) | hum **0.5**, prime **1**, tierce **1.2** (minor 3rd), quint **1.5**, nominal **2**, +3, +4 | hum rings longest; **the 1.2 tierce is the bell's plaintive color** (swap 1.25 for a "major-third" bell); the strike note is the virtual pitch from the 2:3:4 upper partials |

3–8 partials suffice for most percussion (low pitches want more; cymbals/gongs want many, or switch to noise). "Wood" = few partials, fast decay, a dry knock transient; "metal" = more partials, longer/brighter ring, a bright metallic click; a **cowbell/agogô** is a clangy two-tone metal (the iconic 808 cowbell is two square oscillators ~540 + 800 Hz beating) — synthesizable originally as a strongly inharmonic modal bank. A **triangle** is very high, dense, inharmonic partials (~4–12 kHz), indefinite pitch, long ring.

### 3. Noise plates and shakers (cymbals, gongs, shakers, scrapers)

Cymbals and gongs have **hundreds of closely spaced inharmonic modes** — effectively broadband noise at high frequency — and are **strongly nonlinear**: energy **cascades from low modes up into high ones over time**, so the high shimmer **builds up after the strike ("bloom") then decays** (a bent-edge Chinese gong maximizes this). *Recipe:* a dense inharmonic partial cluster **plus a highpassed noise cloud with a slow attack bloom** and a long tail; a crash is shorter/brighter, a tam-tam long and dark. **Shakers/maracas** are **broadband noise bursts shaped by a fast AR envelope** (attack 2–5 ms, decay 40–80 ms), with a **two-phase motion** (beads hit the leading then trailing wall → two grains); brightness of the bandpass picks cabasa (bright) vs maraca (darker). Perry Cook's **PhISEM** models these as stochastic particle collisions exciting one or two resonances — very few parameters. A **guiro** is a rapid *series* of noise grains (a scrape). **Hi-hats/cymbals** (808 method) are ~six detuned square oscillators (~200–800 Hz) → bandpass ~8 kHz → highpass ~7 kHz, or simply highpassed noise, with a short (closed) or long (open) decay.

## The attack is the identity; and the six adjustable parameters

Listeners identify a struck instrument within a few ms, and **removing the attack transient wrecks identification** — percussion is "almost all attack" ([timbre-and-orchestration](timbre-and-orchestration.md)). Spend the synthesis budget on the first ~5–30 ms: onset time, noise-burst length, and initial brightness. Anti-click discipline still applies — even an "instant" percussion attack should ramp over ≥ a few samples and end on a **true-zero** ramp; the *wanted* click is made of shaped noise, not an envelope discontinuity ([web-audio-fundamentals](web-audio-fundamentals.md), [synthesis-recipes](synthesis-recipes.md)).

Because all three families are parameterized the same way, **one voice can cover a wide timbral range** through six knobs — which is exactly what an engine should expose so the user can "adjust timbre, attack, fade":

1. **Pitch / tuning** (f0) · 2. **Attack sharpness** (onset time, click level) · 3. **Decay / fade** (per amplitude and, for modal voices, per mode) · 4. **Brightness** (filter cutoff, high-partial gain) · 5. **Noise-vs-tone balance** · 6. **Inharmonicity / mode-ratio stretch** (skin ↔ bar ↔ bell ↔ noise).

To keep a *transient* voice from sounding generic (the [original-sound-design](original-sound-design.md) tells are mostly about *sustained* tones), the percussion-specific cures are: **strike-to-strike variation** (a little velocity→brightness/decay jitter so repeats aren't identical), **differentiated onset transients per voice** (bow/breath/click colored noise), a **fixed body resonance** (a peaking filter that doesn't track pitch), and slight **inharmonic detuning** of the modal ratios.

## A palette of original voices (a worked example)

Spanning low↔high × skin/wood/metal/noise; each buildable from oscillators, noise, biquads, envelopes (the set Engine 05 ships — [findings-percussion-engine](findings-percussion-engine.md)):

| Voice | Family | Approach | Key adjustables |
|---|---|---|---|
| **low anchor** (surdo/bass drum) | low skin | pitch-drop sine ~2×→base (40–110 Hz) + soft click + one faint 1.59 partial | tune, decay, attack/click |
| **hand-drum** (conga/djembe/tom) | mid skin | pitch-drop fundamental + 1.59/2.14/2.30 membrane partials + attack noise; tags bass/tone/slap/mute | tune, decay, brightness, noise |
| **wood** (block/clave/log) | wood | modal 1 : 2.76 : 5.4, fast decay + dry knock | tune, decay, brightness, inharmonicity |
| **metal** (cowbell/agogô/bell-plate/triangle) | metal | strongly-inharmonic modal bank (keeps a ~1.2 tierce), longer bright ring + metallic click | tune, decay, inharmonicity, brightness |
| **gong** (tam-tam/crash) | metal/noise | dense inharmonic cluster + highpassed noise cloud with an attack **bloom**, long tail | decay (size), brightness, bloom |
| **shaker** (maraca/cabasa) | noise | bandpassed noise, fast two-phase AR | decay, brightness, grain |
| **mallet** (marimba/kalimba/xylophone) | tuned bar | modal 1 : 4 (: 10) marimba or 1 : 3 xylophone + warm lowpass; **pitched** — the melodic-accompaniment voice | tune, decay, brightness |
| **clap** (hand-clap / stick) | impact / body | a comb of 3–4 band-passed (~1 kHz) noise bursts a few ms apart + a short body tail (the "spread hands"); a `stick` variant is one sharp high click | bright (band), decay (tail) |
| **scrape** (guiro / cabasa) | scraped noise | band-passed noise gated by a fast (~40–60 Hz) square tremolo — the ridges; a longer note = a longer rasp | bright, decay (stroke length) |
| **chime** (steel pan / hang / crotale) | pitched metal | a **near-harmonic** modal bank (1 : 2 : 3 : 4, lightly stretched) + a high strike shimmer, long ring; clear and tonal — distinct from the clangy `metal`; a second melodic color | tune, decay, brightness, inharmonicity |
| **friction** (cuíca) | friction / pitch-bend | a sawtooth through two vowel-formant band-passes with a pitch **glide** (up or `down`) + a friction squeak; organic, voice-like | tune, decay, brightness |

## Perceptual / mixing notes for a percussion ensemble

A dense percussion pattern stays legible only if the voices are separated ([effects-and-mixing](effects-and-mixing.md), [auditory-perception-basics](auditory-perception-basics.md)):

- **Register separation** — low anchor ~40–100 Hz (usually loudest, centered), mid tones ~100–500 Hz, high metals/wood/noise ~3–15 kHz. High-pass everything that needs no low end (~60 Hz) to protect headroom.
- **Transient/decay differentiation** — a tight click and a long ring don't fight even in the same band; vary attack and decay across voices so they occupy different *time* slots.
- **Velocity hierarchy & ghost notes** — keep the anchor and timeline loud and consistent; use quiet ghost notes (often darker/shorter) for density without clutter; a velocity→(level, brightness, decay) map mimics real dynamics ([groove-and-embodiment](groove-and-embodiment.md)).
- **Stereo** — anchor and main pulse centered; spread mids and highs (shakers/metals to the sides) — a small ensemble is spatially laid out ([timbre-and-orchestration](timbre-and-orchestration.md)).

## Implications for generative engines

1. **Build three voice *generators*, not a fixed drum kit**: a membrane-drum function (pitch-drop + inharmonic partials + noise), a modal-bank function (ratios + per-mode decay), and a shaped-noise function (filter + AR + optional bloom). Every named voice is a preset of ratios/decays/filters over these three — cheap to add new colors.
2. **Expose the six macros** (pitch, attack, decay, brightness, noise/tone, inharmonicity) uniformly so the user can morph the whole kit's timbre/attack/fade while the intrinsic partial structures keep the voices distinct — the concrete way to give "each voice a distinctive and adjustable timbre."
3. **Spend the budget on the attack** (first 5–30 ms); a differentiated onset transient per voice is the strongest identity and separation cue, and per-hit velocity→brightness variation is what makes a machine-exact pattern sound played.
4. **Keep it click-safe** (ramps to true zero) and **deterministic** (a shared seeded noise buffer, fixed ratios) so the output renders identically for the offline gate and in every browser.
5. **Mix by frequency stratification** — low drum loudest and centered, everything above it high-passed and spread — so a dense ensemble stays legible.

## Open questions

- **Physical vs. modal cost/benefit.** Waveguide/Karplus-Strong or full nonlinear plate models sound more alive but cost more; where does a lightweight modal bank + noise stop being convincing (esp. for gongs/cymbals, whose nonlinear bloom a linear bank only approximates)?
- **Auto-tuning a modal bank to a target descriptor** (brightness/roughness/decay) — the open [original-sound-design](original-sound-design.md) question, applied to percussion, would let an engine generate new colors by search rather than by hand-picked ratios.
- **The timpani/near-harmonic membrane** and **talking-drum pitch bends** are only sketched here; a tuned-membrane recipe with the ~1:1.5:2:2.5:3 stack and a controllable glide deserves its own worked treatment.
- **Numbers to firm up:** exact per-mode decay ratios and the membrane-partial gains that best read as "skin" are engineering judgment here, to be calibrated by ear/measurement.

## Related pages

- [synthesis-recipes](synthesis-recipes.md) — the base kick/snare/hat and mallet/bell modal tables this extends
- [original-sound-design](original-sound-design.md) — escaping the "generic synth" tell (mostly sustained-voice techniques; the percussion analogue is here)
- [timbre-and-orchestration](timbre-and-orchestration.md) — attack-transient primacy, brightness, spacing, blend vs segregation
- [web-audio-fundamentals](web-audio-fundamentals.md), [effects-and-mixing](effects-and-mixing.md) — envelopes/click-safety and the ensemble mix
- [auditory-perception-basics](auditory-perception-basics.md) — critical bands, masking, why register separation works
- [percussion-music](percussion-music.md) — the structures these voices play
- [findings-percussion-engine](findings-percussion-engine.md) — the engine that ships this palette

## Sources

- Circular membrane modes — Dan Russell (Penn State) https://www.acs.psu.edu/drussell/demos/membranecircle/circle.html ; Wikipedia https://en.wikipedia.org/wiki/Vibration_of_a_circular_membrane ; HyperPhysics http://hyperphysics.phy-astr.gsu.edu/hbase/Music/cirmem.html
- Timpani near-harmonic modes / air loading — The Well-Tempered Timpani https://wtt.pauken.org/chapter-3/preferred-modes ; Euphonics 3.6 https://euphonics.org/3-6-tuned-drums/
- Hand-drum / snare acoustics — djembe sounds http://djembefola.com/learn/articles/djembe/sounds ; snare frequency regions https://www.kiiveaudio.com/blogs/learn/eqing-a-snare-drum-across-different-genres
- Bars (marimba/xylophone/vibraphone) — Euphonics 3.3 https://euphonics.org/3-3-marimbas-and-xylophones/ ; CCRMA percussion https://ccrma.stanford.edu/CCRMA/Courses/150/percussion.html
- Bells / strike tone — Wikipedia https://en.wikipedia.org/wiki/Strike_tone ; The Sound of Bells (Hibbert) https://www.hibberts.co.uk/strike.htm
- Cymbals / gongs / triangle (nonlinear, bloom) — Springer, "Struck Idiophones" https://link.springer.com/chapter/10.1007/978-3-030-98650-6_8 ; Fletcher, "The sound of music: order from complexity" https://acoustics.asn.au/journal/2012/2012_40_3_Fletcher.pdf ; Triangle (JASA EL) https://pubs.aip.org/asa/jel/article/5/5/053201/3345895
- Shakers / particle models — Cook, PhISM/PhISEM https://quod.lib.umich.edu/i/icmc/bbp2372.1996.071/1/--physically-informed-sonic-modeling-phism-percussive ; maracas model (CCRMA) https://ccrma.stanford.edu/~juanig/articles/wadi-icmc/Model_Maracas.html
- Modal synthesis method — Nathan Ho, "Exploring modal synthesis" https://nathan.ho.name/posts/exploring-modal-synthesis/ ; McGill, "Traditional modal synthesis" https://caml.music.mcgill.ca/~gary/618/week11/node10.html
- Drum-machine recipes (kick/snare/808 cymbal/cowbell) — Sound on Sound "Synthesizing Drums" https://www.soundonsound.com/techniques/synthesizing-drums-snare-drum ; 808 cymbal/hi-hat & cowbell (Baratatronix) https://www.baratatronix.com/blog/cascadia-808-cymbal-hi-hat-synthesis ; TR-808 cymbal (physically-informed) https://pure.qub.ac.uk/files/125044847/tr_808_cymbal_a_physically_informed_circuit_bendable_digital.pdf
- Timbre perception (attack cue) — McAdams & Siedenburg https://www.mcgill.ca/mpcl/files/mpcl/mcadams_2019_foundmuspsychol.pdf ; review https://arxiv.org/html/2405.13661v1
- Mixing / masking — Mastering the Mix, reducing conflicting frequencies https://www.masteringthemix.com/blogs/learn/reducing-conflicting-frequencies
