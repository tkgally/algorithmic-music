---
title: Control surfaces and user parameters
tags: [implementation, project]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: How generative-music and audio systems expose controls — from play-only apps to 150-parameter engines — and what HCI evidence (progressive disclosure, defaults, contested choice-overload, perceptual labeling) implies for the comprehensive site's three-tier Start/Intermediate/Advanced control design.
---

# Control surfaces and user parameters

The [comprehensive site](comprehensive-site-vision.md) will offer three levels of control — **Start** (a few familiar genre categories and parameters, with the seed choosing among them), **Intermediate** (~20 more detailed but still familiar controls), and **Advanced** (a wide range including parameters invented for this site). This page gathers the precedent and the human-factors evidence that should ground that design: what controls real generative-music and audio systems actually expose (counting them where the count is documented), what HCI research says about layered novice-to-expert interfaces, how controls should be labeled and scaled to match perception, and how randomization and shareable seeds fit in. It is precedent and evidence, not yet a settled control taxonomy — the taxonomy is to be proposed and reviewed with Tom over several sessions. Weak or contested findings are flagged as such; the concrete tier proposal at the end is explicitly informed speculation.

## Precedent: how systems expose control, from zero to ~150

Real generative and assistive-composition systems span almost the entire possible range of control-surface size. The two extremes are instructive because **both were designed or endorsed by Brian Eno** — the same author chose a near-empty surface for one product and ~150 knobs for another, which tells us the "right" number is a product decision, not a property of generative music.

### The minimal end: play-only and near-zero controls

- **generative.fm** (Alex Bainter) is a browser platform of 50+ generative systems whose user surface is essentially a media player — play/pause, skip to another piece, favorite. There are no compositional parameters; each "piece" is a fixed system and the listener only chooses which system runs. It demonstrates that a play-only surface is viable, but it forgoes user authorship entirely.
- **Brian Eno / Peter Chilvers — *Reflection* (2017)** is the extreme: the app has, per its makers, "essentially no options, other than a Pause button." The composition changes itself by **time of day** (brighter harmony in the morning, thinning and slowing in the small hours) rather than by any user control. Control is removed from the user and given to context.
- **Eno / Chilvers — *Bloom* (2008)** sits just above zero: the primary surface is **tap-to-seed** (touch the screen to place notes that then repeat and decay), plus roughly **12 "mood" presets** and a handful of settings (delay, evolve-when-idle, shake-to-clear, sleep timer, background play). A tiny number of controls plus one rich gesture.

### The maximal end: hundreds of parameters

- **SSEYO Koan** — the engine behind Eno's 1996 *Generative Music 1* — let a composer set, per its makers, "one hundred and fifty musical and sonic parameters, within which the computer then improvises." Its lineal descendant is **Wotja** (Koan → Noatikl → Wotja). This is the far pole: near-total parametric control, aimed at composers, not casual listeners. The lesson is not that 150 is wrong but that it is a **different product for a different user** than Bloom — which is exactly the argument for tiers.

### The consumer middle: tag/preset pickers

- **Mubert** exposes **genre / mood / activity tags** plus **duration** and **BPM**; its API documents ~**150 genres and moods**. The user picks descriptive tags, not musical parameters — labeling in listener language, not composer language.
- **AIVA** is a good model of graduated depth: a large library (**250+ style presets**, "Cinematic Epic" to "Lo-fi Hip Hop") is the Start-level entry, and above it the user can set **key signature, time signature, tempo, duration, and emotion**, then descend further into **per-layer instrument choice and per-layer pitch range**. One product, three-plus effective depths.
- **Band-in-a-Box** is the classic "fill the fields, get a band": its core inputs are just **four** — **style, key, tempo, and chords** (plus song form / chorus markers). Decades of use show a four-field surface can drive a full arrangement.

### One scalar driving many internals: game-audio parameter buses

Game-audio middleware (**FMOD**, **Audiokinetic Wwise**) exposes **RTPCs** (Real-Time Parameter Controls; FMOD calls them "parameters") — a single game value like `intensity` or `combat_level` mapped through curves onto **many** internal audio parameters at once: layer volumes, stem mutes, filter cutoffs, transition triggers. A combat-intensity knob simultaneously raises brass and percussion, ducks the melody, and arms a transition. This is the **"one meaningful scalar, many hidden parameters"** pattern — the model for a Start-level "energy" control that reaches deep into the engine.

### Macro conventions in synthesizers

Software synths converge on an **eight-macro** convention (e.g., Serum, Ableton instrument/effect racks): eight labeled knobs, each mapped to **one-to-many** internal parameters with per-target ranges, so one gesture opens a filter while lengthening release and adding reverb. This is the same one-to-many idea as an RTPC, offered as a **fixed, small budget** of headline controls — a useful precedent for how many "macro" controls a tier should carry.

### This project's own precedent

The engines already embody a layered surface and, crucially, a per-axis default that resolves the novice/expert tension:

- **Two-level UI** ([engine-architecture](engine-architecture.md)): a simple panel (presets, one headline macro, a few plain-language sliders) plus an **Advanced disclosure** with the full parameter set — a previous-experiments lesson that held up.
- **Per-axis "auto = seed decides"** ([findings-percussion-engine](findings-percussion-engine.md), Engine 05 v0.2): every recipe axis defaults to **`auto`**, meaning the seed samples it; **presets** bias the sampler toward a region; and the user may **pin any single axis** while leaving the rest on auto. This is the project's own override precedent and the natural generalization for the site — a control the user hasn't touched is not "off," it is "let the seed choose."
- **Full state in the URL, seed editable and copyable**: the same URL reproduces the same piece; the seed is human-visible and shareable ([comprehensive-site-vision](comprehensive-site-vision.md)). Compact encoding of that state is deferred to [music-representation-and-notation](music-representation-and-notation.md).

## HCI evidence for layered novice-to-expert interfaces

### Progressive disclosure and multi-layer design

The canonical statement is Jakob Nielsen's: "Initially, show users only a few of the most important options. Offer a larger set of specialized options upon request." (Nielsen, *Progressive Disclosure*, NN/g, 2006.) He claims gains in learnability, efficiency, and error rate — but the article is argument and heuristic, **not an empirical study with figures**, and the idea predates it in interaction design; treat it as well-established design folklore rather than a measured result. Ben Shneiderman's **multi-layer interface design** (ACM CUU, 2003) is the more rigorous framing directly matching Tom's three tiers: novices "begin with a limited set of features at layer 1, and they can remain at layer 1 or move up to higher layers when needed," illustrated with an 8-layer word processor and a 3-layer map. The layered approach is explicitly aimed at satisfying **first-time, intermittent, and expert** users with one product — the exact goal of Start/Intermediate/Advanced.

Mapping is nearly one-to-one: **Start ≈ layer 1** (a handful of the most consequential choices, everything else defaulted), **Intermediate ≈ a middle layer** (the familiar musical parameters), **Advanced ≈ the top layer** (the full set, including this site's invented parameters). The evidence supports revealing tiers on demand and letting users stay low.

### Defaults are never neutral

Because most controls will default to `auto`, the **default effect** is load-bearing. The strongest demonstration is Johnson & Goldstein, "Do Defaults Save Lives?" (*Science*, 2003): opt-out organ-donation framing yielded consent near **82%** vs about **42%** for opt-in — the same decision, a different default. The underlying **status-quo bias** is Samuelson & Zeckhauser (1988). The design consequence: whatever the site pre-selects at Start is what most users will ship, so **defaults must be tasteful, not merely safe**, and "auto" must reliably produce a good piece. (This is consistent with the project's practice of level-matched, sensible preset defaults — [effects-and-mixing](effects-and-mixing.md).)

### Choice overload — cite it, but honestly

The famous "paradox of choice" evidence is Iyengar & Lepper (2000): a jam tasting booth with **24** varieties drew more passers-by but converted far worse (about **3%** bought) than one with **6**. It is tempting to justify a small Start tier this way — but the finding has a **contested replication record**. Scheibehenne, Greifeneder & Todd's meta-analysis of ~50 studies ("Can there ever be too many options?", *Journal of Consumer Research*, 2010) found the **mean effect essentially zero**, with large variation driven by moderators (prior preferences, expertise, how the options are organized, time pressure). Notably, people with **articulated preferences or domain expertise are little troubled by more options** — which is precisely the Advanced-tier user. So the honest takeaway is *not* "fewer controls are always better." It is: keep the **entry** small because first-time users lack articulated preferences, but do not artificially starve the Advanced tier; the real levers are **good defaults and progressive disclosure**, not enforced scarcity.

### Label controls in perceptual, not technical, language

Two lines of evidence favor listener-facing labels. First, **timbral brightness** is a robust perceptual dimension whose main acoustic correlate is the **spectral centroid** (McAdams, *The Perceptual Representation of Timbre*, 2019; Saitis et al., JASA 2020) — so a control named "brightness" is honest, not a euphemism for "filter cutoff." Second, **semantic-audio** research shows word-labeled controls are learnable and partly shared across people: **SocialEQ** (Cartwright & Pardo, ISMIR 2013) and **Audealize** (Seetharaman & Pardo, JAES 2016) crowdsourced maps from descriptors like "warm" or "bright" to equalizer/reverb settings, letting users say "make the violin warmer." The caveat, from that same work, is that **agreement on descriptors varies** — some words map tightly, others idiosyncratically — so perceptual labels should be chosen for words with broad consensus (brightness, warmth, density, energy, space) and the technical name reserved for the Advanced tier, glossed on first use.

### Scale controls to perception, and pick sensible step sizes

Numeric controls should move in **perceptual units**, because human sensitivity is roughly logarithmic/ratio-based, not linear:

- **Loudness**: perceived loudness follows a compressive power law (Stevens); a **+10 dB** step reads as roughly "twice as loud," so gain/dynamics controls belong on a **dB (log)** scale.
- **Pitch / frequency**: pitch is logarithmic in frequency (an octave is always a 2× ratio), so register and tuning controls should step in semitones/octaves, not hertz.
- **Tempo**: tempo-change discrimination is roughly **Weber-like**, with a just-noticeable difference on the order of **~5%** at musical rates (Ehrlé & Samson 2005; Grondin/Friberg lines of work note the fraction shifts at extremes) — so a tempo slider should step in **ratio** terms (a fixed number of perceptually even steps between, say, 40 and 200 BPM), not in equal BPM increments, which feel coarse slow and trivial fast.

Perceptual scaling detail for tempo and duration lives in [tempo-duration-and-pacing](tempo-duration-and-pacing.md); general psychoacoustic scaling in [auditory-perception-basics](auditory-perception-basics.md) and [timbre-and-orchestration](timbre-and-orchestration.md).

## Randomization affordances

Randomization is a first-class control, not an afterthought, and the precedent is dense in synthesizers:

- **Dice / "randomize" buttons** are ubiquitous — Serum can hybridize two presets by randomizing knob values between them; Reason's *Dice* rack extension is built around randomize-and-edit; many hardware synths (Virus TI, Nord Lead, Elektron Digitone) ship "mutator" functions. The affordance says "surprise me," and it is expected.
- **Constrained randomization** is the more useful form: the Virus TI lets the user set **how many parameters** are randomized and **how strongly** — i.e., randomize *within a neighborhood*. This maps directly onto the site's model: pressing **Play** samples the seed **within the chosen genre/tier**, not across the whole space, and a "vary" or dice control can perturb only the un-pinned axes. Pinning an axis (setting it away from `auto`) is exactly a constraint on the randomizer.
- **Seed visibility and copyability**: the site puts the seed and settings in the **URL** and offers **copy-to-clipboard** ([comprehensive-site-vision](comprehensive-site-vision.md)). This is the affordance that makes "I'm feeling lucky" non-frustrating — a lucky result is **recoverable and shareable**, so randomization becomes exploration rather than loss.

## A first-cut mapping to the three tiers

*Informed speculation, to be refined with Tom over multiple design sessions — counts and names are provisional. All controls default to `auto` (the seed decides) unless the user sets them.*

- **Start (~4–6 controls + Play + dice).** A **genre/mood category** (6–10 familiar worlds — classical, ambient, jazz/blues, groove/beats, folk/world, electronic — per [comprehensive-site-vision](comprehensive-site-vision.md) and [style-and-genre-overview](style-and-genre-overview.md)); an **energy/intensity** scalar (the RTPC-style one-knob-many-internals macro); a **length/duration**; optionally a **mood/color** and a **space** (dry↔spacious). Big **Play**; a **dice** for "surprise me within this genre." The seed fills everything else. This is Band-in-a-Box-few and Bloom-few, deliberately.
- **Intermediate (~20 familiar controls).** Candidate set: tempo; key + mode/color; ensemble/instrument palette; note **density/activity**; **variation amount** (how much it changes over time); **expression/humanization amount**; **reverb/space amount**; **brightness/tone**; register/range; form length; **ending type**; repetition amount; swing/groove depth; dynamic range; stereo width; overall **complexity**; section count; lead prominence; melodic-vs-textural balance; tonal center. These are the "familiar to a musician or keen listener" parameters — the AIVA/Band-in-a-Box vocabulary, perceptually labeled and perceptually scaled.
- **Advanced (open-ended, including invented parameters).** The **style-space axes** themselves ([style-invention-and-style-space](style-invention-and-style-space.md), [meta-composition-and-style-machines](meta-composition-and-style-machines.md)): pitch material/tuning system, harmonic-motion type, groove/timeline type, texture and interlock rules, form template, tension-curve shape. **Per-layer overrides** (per the percussion engine's per-axis pins and per-voice control). And the site's **original invented parameters** — e.g., the intensity **arc-shape** menu, Xenakis-style **sieve** timelines, **interlock** density, and **style-blend/hybridization weights** for on-the-fly styles — each with a plain gloss. Here the choice-overload caveat applies in reverse: the expert user *wants* the full board.

## Implications for generative engines

1. **Every control is an input to the seeded sampler, never a post-hoc tweak.** The determinism rule ([engine-architecture](engine-architecture.md)) requires that `(version, seed, all settings) → piece` exactly; controls at all three tiers must feed the same deterministic pipeline (genre → style sample/invent → compose → perform → synthesize). A control that can't be expressed as an input to that function does not belong.
2. **"auto = seed decides" is the universal per-axis default.** Generalize Engine 05: an untouched control is sampled from the seed within the chosen genre/tier; pinning a control constrains the sampler. This makes Start a special case of Advanced (almost everything on auto), not a separate engine.
3. **Control-count budgets are soft, and defaults do the heavy lifting.** Aim Start at ~4–6 and Intermediate at ~20, but the HCI evidence says the win comes from **strong defaults + progressive disclosure**, not from starving the Advanced tier; don't cap Advanced for its own sake. Bad defaults, not too many hidden knobs, are the real risk.
4. **Name for perception at Start/Intermediate; allow technical/original names only at Advanced, glossed.** Prefer high-consensus descriptors (brightness, warmth, energy, density, space); scale every numeric control in perceptual units (dB for loudness, semitone/octave for pitch, ratio steps for tempo) with a fixed, sensible number of steps.
5. **Randomize at every tier, constrained by the current selection; keep the result recoverable.** A dice/vary affordance samples only the un-pinned axes within the chosen region. Seed and settings go in the URL and to the clipboard so exploration is lossless and shareable.
6. **Serialize compactly and version it; feedback is only interpretable against full state.** The tier settings plus seed must round-trip through a compact, versioned URL payload — encoding details deferred to [music-representation-and-notation](music-representation-and-notation.md) — and listener feedback is meaningful only against `(engine/site version, seed, params)` ([improvement-loop](improvement-loop.md), [listening-tests-and-feedback](listening-tests-and-feedback.md)).
7. **Guard the Start experience against the failure modes.** The one-knob "energy" macro and the small default set must still yield coherent, non-arbitrary music ([generative-music-failure-modes](generative-music-failure-modes.md)); a minimal surface raises, not lowers, the bar on the defaults behind it.

## Open questions

- The exact **Start shortlist** and its count, and how a single **"energy"** control maps consistently across very different genres (energy means different things in ambient vs. groove).
- Whether the three tiers are **progressive-disclosure panels within one screen** (Nielsen/Shneiderman style) or **distinct modes**, and whether crossing tiers preserves settings.
- Whether **Advanced invented parameters** get their own presets (a "preset within the expert board") to soften their unfamiliarity.
- How much **constrained randomization** the dice should apply by default — perturb all un-pinned axes, or only a curated "taste-safe" subset?
- Whether any control should be **contextual like *Reflection*** (e.g., a time-of-day or session-length influence) rather than user-set — recorded as a possibility, not a plan.

## Related pages

- [comprehensive-site-vision](comprehensive-site-vision.md) — the three-tier spec this page serves
- [engine-architecture](engine-architecture.md) — determinism, two-level UI, URL state
- [findings-percussion-engine](findings-percussion-engine.md) — the project's per-axis "auto = seed decides" override precedent
- [style-invention-and-style-space](style-invention-and-style-space.md) · [meta-composition-and-style-machines](meta-composition-and-style-machines.md) — what the Advanced axes expose and parameterize
- [music-representation-and-notation](music-representation-and-notation.md) — compact, versioned URL encoding of seed + settings
- [tempo-duration-and-pacing](tempo-duration-and-pacing.md) · [auditory-perception-basics](auditory-perception-basics.md) · [timbre-and-orchestration](timbre-and-orchestration.md) — perceptual scaling and labeling
- [complexity-and-preference](complexity-and-preference.md) · [generative-music-failure-modes](generative-music-failure-modes.md) — why the defaults behind a minimal surface must be strong
- [improvement-loop](improvement-loop.md) · [listening-tests-and-feedback](listening-tests-and-feedback.md) — feedback interpretable only against full state
- [style-and-genre-overview](style-and-genre-overview.md) · [ambient-and-generative-genre](ambient-and-generative-genre.md) · [algorithmic-composition-history](algorithmic-composition-history.md) — the genre worlds and the Eno/Koan lineage

## Sources

- Peter Chilvers / GenerativeMusic.com, *Brian Eno: Reflection* — "essentially no options, other than a Pause button"; rules change by time of day. https://www.generativemusic.com/reflection.html ; Music Ally, "Brian Eno releases new album as a generative app," 2017. https://musically.com/2017/01/03/brian-eno-releases-new-album-as-a-generative-app/
- *Bloom* (software), Wikipedia (tap-to-seed, 12 moods, settings). https://en.wikipedia.org/wiki/Bloom_(software) ; GenerativeMusic.com — Bloom. https://generativemusic.com/bloom.html
- Intermorphic (formerly SSEYO), "Generative Music & Eno's GM1 w/ SSEYO Koan" — "one hundred and fifty musical and sonic parameters." https://intermorphic.com/archive/sseyo/koan/generativemusic1/ ; "Generative music," Wikipedia (Eno/Koan lineage, Koan→Noatikl→Wotja). https://en.wikipedia.org/wiki/Generative_music
- generative.fm (Alex Bainter), project README (browser player, 50+ systems). https://github.com/generativefm/generative.fm ; Bainter, "Making Generative Music in the Browser," Medium. https://medium.com/@alexbainter/making-generative-music-in-the-browser-bfb552a26b0b
- Mubert — AI music generator (genre/mood/activity tags, duration, BPM). https://mubert.com/ ; Mubert API (≈150 genres and moods). https://mubert.com/api
- AIVA, General User Manual (style presets, key/time-signature/tempo/duration/emotion, per-layer instrument and pitch-range). https://aiva.crisp.help/en/article/general-user-manual-44klp4/
- Band-in-a-Box, Wikipedia (four inputs: chords, key, tempo, style; song form). https://en.wikipedia.org/wiki/Band-in-a-Box ; PG Music, BiaB 2022 User's Guide, ch. 6. https://www.pgmusic.com/manuals/bbw2022full/chapter6.htm
- J. Zúmer, "Differences between FMOD & Wwise, Part 2" (RTPCs; combat-intensity drives layer volumes/transitions). https://javierzumer.com/blog/2022/7/30/differences-between-fmod-amp-wwise-part-2
- MusicRadar, "How to make macro assignments that matter" (one macro → many parameters). https://www.musicradar.com/how-to/how-to-make-macro-assignments-that-matter ; eMastered, "How to Use Serum in Ableton" (eight macro knobs). https://emastered.com/blog/how-to-use-serum-in-ableton
- J. Nielsen, "Progressive Disclosure," NN/g, 2006 (definition quote; learnability/efficiency/error-rate claims are heuristic, not measured). https://www.nngroup.com/articles/progressive-disclosure/
- B. Shneiderman, "Promoting Universal Usability with Multi-Layer Interface Design," Proc. ACM Conf. on Universal Usability, 2003 (layer-1 novices climb when ready; 8-layer word processor, 3-layer map). https://dl.acm.org/doi/abs/10.1145/957205.957206
- E. Johnson & D. Goldstein, "Do Defaults Save Lives?", *Science*, 2003 (opt-out ≈82% vs opt-in ≈42% organ-donation consent); W. Samuelson & R. Zeckhauser, "Status Quo Bias in Decision Making," *J. Risk & Uncertainty*, 1988. https://yukaichou.com/gamification-analysis/default-effect-johnson-goldstein-organ-donation-opt-in-opt-out/
- S. Iyengar & M. Lepper, "When Choice is Demotivating," *J. Personality and Social Psychology*, 2000 (jam study, 6 vs 24) — replication context. https://atticusli.com/replication-crisis/choice-overload-jam-study/
- B. Scheibehenne, R. Greifeneder & P. Todd, "Can There Ever Be Too Many Options? A Meta-Analytic Review of Choice Overload," *J. Consumer Research*, 2010 (mean effect ≈ zero; moderator-dependent). https://www.academia.edu/646655/ ; review of moderators, PMC, 2024. https://pmc.ncbi.nlm.nih.gov/articles/PMC11111947/
- M. Cartwright & B. Pardo, "Social-EQ: Crowdsourcing an Equalization Descriptor Map," ISMIR 2013. https://interactiveaudiolab.github.io/assets/papers/cartwright-pardo-ismir13.pdf ; P. Seetharaman & B. Pardo, "Audealize: Crowdsourced Audio Production Tools," JAES 2016. https://interactiveaudiolab.github.io/assets/papers/seetharaman_pardo_audealize_jaes.pdf
- S. McAdams, "The Perceptual Representation of Timbre," 2019 (spectral centroid ↔ brightness; attack time). https://www.mcgill.ca/mpcl/files/mpcl/mcadams_2019_timbreacoustperceptcogn_ch2.pdf ; "Brightness perception for musical instrument sounds," *JASA* 148(4), 2020. https://pubs.aip.org/asa/jasa/article-abstract/148/4/2256/995214/
- Stevens' power law for loudness (compressive; ~+10 dB ≈ 2× loudness), Springer. https://link.springer.com/article/10.3758/BF03212781
- Tempo/anisochrony discrimination (JND ~5%, rate-dependent): Ehrlé & Samson, "Auditory discrimination of anisochrony," 2005. https://www.sciencedirect.com/science/article/abs/pii/S0278262604002854 ; "Significant variations in Weber fraction for inter-onset interval," *Frontiers in Psychology*, 2014. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01453/full
- Randomization affordances: Reason Studios, *Dice* rack extension (randomize-and-edit). https://www.reasonstudios.com/shop/rack-extension/dice-analog-synthesizer/ ; VI-Control, "Any synth with a Random button" (Serum hybridize; Virus TI amount+strength; Nord/Elektron mutators). https://vi-control.net/community/threads/any-synth-with-random-button-to-create-sounds.100533/
