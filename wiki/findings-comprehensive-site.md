---
title: Findings — the comprehensive site (Phase 3c build)
tags: [findings, implementation, project]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: What building the comprehensive site (session 034) established — the just-in-time composition loop works and is the right architecture; one vector-driven composer core really can serve presets, melds, and invented styles; the concrete bugs the offline gates caught (unit-boundary note truncation, chord-slot tiling, a PCM-fingerprint pitfall); and what the first working version deliberately defers.
---

# Findings — the comprehensive site (Phase 3c build)

Session 034 built the comprehensive site the three Phase-3b design docs specify — `docs/index.html` + `docs/lib/` + `docs/styles/` + `docs/app.js`, replacing the landing page — through milestones M1–M8 of [the architecture doc's build order](comprehensive-site-vision.md) (docs/design/site-architecture.html). This page records what the build *established*: which design commitments survived contact with implementation, what had to change, and the reusable lessons. Every claim is backed by re-runnable in-repo checks: `node experiments/tests/run.js` (the headless suite, including a new `site.test.js`), `node experiments/tools/site-check.js` (fast no-audio pipeline checks, per genre and per meld), `node experiments/tools/render-site.mjs` (the per-genre OfflineAudioContext render gates incl. PCM-identity determinism), and `node experiments/tools/site-smoke.mjs` (live headless playback: play, URL round-trip, live-change-no-restart, crossfade).

## The just-in-time loop works — and units are the right grain

The site's central architectural bet (site-architecture §5) held up on the first integration: a **conductor** keeps a small horizon (~2.7 s) composed ahead of the audio clock by calling `compose.nextUnit(currentVector)` inside the transport's existing `onRefill` hook — the lookahead scheduler the engines already used, extended from *scheduling* to *composing*. Nothing about the two-clocks pattern needed to change; the JIT loop is literally the engines' scheduler with a lazy producer.

The load-bearing detail is the **unit grain**: one phrase (4 bars) for metered genres, one nominal bar for ambient. Units align to phrase boundaries, which makes three things drop out for free:

1. **Per-unit rubato is phrase rubato.** The performer builds a local beat→seconds map per unit with the phrase-arch warp (edges slower) and, on the final unit, the sqrt ritardando — Engine 01's expressive-tempo layer survives JIT intact because the unit *is* the phrase.
2. **Live boundary-speed changes land musically.** A control change swaps the vector object; the next `nextUnit` call reads it; the change lands at the next phrase seam, exactly the taxonomy's "next boundary" speed. Headless test: pin density low after unit 3 → units 0–2 byte-identical to the no-change run, unit 3+ differ.
3. **Determinism is per-unit, so live changes only perturb the future.** Each unit draws from its own named stream (`unit:<n>` from the piece seed), so unit *n*'s notes never depend on how many draws earlier units made. Same (seed, settings) → the identical event stream (asserted in `site.test.js`); a live change re-derives the vector but never touches streams already consumed.

**Free time fits the same loop.** The ambient strategy proves the awkward case: Eno-style incommensurable loops (periods 17.5–40 s, staggered starts) emit whichever onsets fall inside each unit's nominal window — the piece is still composed strictly left-to-right in units, but the *material* is phase math over the window. A unit is a window, not necessarily a phrase.

## One composer core really does serve presets, melds, and inventions

The style-vector schema's central claim (§2: "provenance is the only difference") survived: **presets** (hand-tuned regions sampled per seed), **melds** (per-axis parent selection), and **invented styles** (seeded samples under a novelty budget) all produce the same vector record, and the eight genre strategies read it without knowing which kind they serve. The concrete mechanisms that made this true:

- **The shared machinery had to be vector-driven from day one.** `compose.js` exposes harmony (`progression` — functional backward-Piston walk / modal pools / loop banks / drone), melody (`melodyPhrase` — the tested contour-first constraint set from the tonal-phrase composer, generalized to any meter/register), voicing (`voiceChord`, nearest-motion), accompaniment (`compBar`/`bassBar`), and rhythm (`timelinePattern` — clave/bell/Euclid/sieve/pulse; meter-aware `phraseRhythm`). A genre pack is mostly *assembly plus taste*; the electronic strategy composing with classical's harmony fields (a meld) is the same code path as electronic alone.
- **Meld = chassis strategy + partner's harmony fields.** The schema's rhythm-chassis-≠-harmony rule realizes cleanly as: the melded vector carries the chassis parent's *strategy id, meter, groove, tempo band, form* and the other parent's *scale, tonic, harmony type/richness, melodic grammar*; continuous surface fields blend at the balance. The compatibility gates reduced to code in one place (`style.meld`): a free-tempo parent can never be the chassis (asserted for ambient×lofi across seeds).
- **Role-name fallbacks are load-bearing for melds.** First meld bug: classical's strategy looked for a `comp` role; ambient's pitched ensemble has `pad`/`drone`/`tex`. A meld hands a strategy *another genre's role vocabulary*, so every strategy resolves roles with fallbacks (`comp`→`pad`, `bass`→`drone`, `lead`→`counter`). Without this the meld played melody-plus-bass with a silent middle. Rule for future strategies: **never assume your own preset's role names; resolve with fallbacks.**
- **Invented styles route to an existing strategy family by their drawn fields** (drone-ish → ambient/folk, loop → electronic/lofi, modal → cinematic/folk/classical, functional → classical/jazz) — the EMI-minus-corpus recipe needs no tenth composer, just a router. Signatures are realized *centrally* so every strategy inherits them: a rhythm-motto becomes the melodic motif, an interval cell biases `melodyPhrase`'s candidate scoring, a voicing habit reshapes `voiceChord`, an echo tail is added by the performer. (The `cadenceDrop` signature is defined but not yet realized — deferred.)

## What the gates caught (bugs worth remembering)

1. **Unit-boundary truncation.** The performer's local beat→seconds map initially ended at the unit's length, silently clipping any note that *sounds past* the unit (ambient's 36-second drones collapsed to ~6 s; symbolic silence gaps of ~15 s). Fix: extend the map to the last note's end (warp inside the unit, straight tempo beyond). Lesson: in a JIT design, **notes may outlive their unit**; every time computation must handle it.
2. **Chord-slot tiling.** `compBar`/`bassBar` assumed one chord = one bar. Invented styles' novelty axis can set harmonic rhythm to 3–4 chords/bar (slots shorter than a bar — accompaniment overran the unit) or one chord per 2–4 bars (slots longer — accompaniment fell silent after bar 1). Fix: patterns scale into short slots and tile bar-by-bar across long ones. Lesson: **the accompaniment grid is the chord slot, not the bar,** the moment harmonic rhythm is a free parameter.
3. **Byte-identical PCM is not a browser-attainable target — and how that was established.** The determinism gate (same seed → byte-identical PCM twice) failed for *stacked* reasons, each worth remembering. First, a fingerprint pitfall: hashing `Float32Array.buffer` hashes the *whole underlying ArrayBuffer*, which Chromium may back with a larger allocation containing unrelated memory — hash the view's exact `byteOffset/byteLength` range. Second, with the hash fixed, a bisection probe (pure oscillator → DET; oscillator + compressor → DET; single detuned oscillator → DET; **three oscillators summing into one gain → intermittently different**) isolated real nondeterminism to **fan-in mixing**: Chromium sums a node's multiple inputs in an unspecified order, float addition is not associative, and the resulting difference measures ~1.0×10⁻⁷ at the mix bus (one ulp at signal level), *intermittently* (many render pairs match exactly). Third, that microscopic difference does not stay microscopic: the master `DynamicsCompressor`s' adaptive gain feeds it back over the length of a piece, and full-piece renders measured max sample differences from 4.5×10⁻⁶ up to **1.7×10⁻⁴** (≈ −73 dB below the signal — still far below audibility, but 1000× the seed difference). A REAL composition difference (one note changed) measures ≥ 10⁻², four orders of magnitude above this noise floor. The honest determinism contract is therefore: **the symbolic event stream is byte-identical** (asserted in Node), and **the rendered audio is identical within rounding accumulation** (gate: max sample difference ≤ 2×10⁻³ — well above observed noise, well below any real difference). Any future session that sees a "nondeterministic render" should check the diff magnitude against these bands before hunting bugs.
4. **Voice names are a registry, not a vocabulary.** `keys`/`strings` read naturally but the synth registers `melody`/`chord`; unknown names silently fall back (`synth.play` defaults to `keys`, `fx.input` to the melody bus), so the error is *audible but not visible*. The headless checker now asserts every emitted voice is registered.

## Validation architecture: three tiers, cheapest first

The build converged on a three-tier gate stack that future work should keep:

1. **`site-check.js` (Node, no audio, seconds).** Determinism, seed-sensitivity, voice-name validity, finite numbers, notes-inside-units, symbolic silence gaps, section-map inspection, 12-seed sweeps per genre/meld. This caught most bugs at near-zero cost — genre-pack subagents iterated against it.
2. **`render-site.mjs` (OfflineAudioContext via headless Chromium, minutes).** The engines' acceptance bands (no clip, no gross discontinuity, no silent gap over the *musical* span — a fade ending's tail is an ending, not a dropout; level −30..−9 dBFS) plus PCM-identity determinism, per genre and for melds/inventions, through the exact shipped pipeline (`docs/_selftest.html` runs the same `composeAll` the app uses).
3. **`site-smoke.mjs` (live AudioContext, headless).** The things offline can't see: Play starts, the URL round-trips to the same derived piece, a live control change does **not** restart the transport (monotonic playhead across the change), a live genre swap crossfades without stopping, all eight genres play, zero console errors.

## Serialization: the frozen-layout discipline held

The v1 URL payload (6-bit version, 32-bit seed, 2-bit mode, two 4-bit genre codes, a 30-bit pin mask, then only pinned values at declared widths) lands at **13 characters with nothing pinned, 28 with everything pinned** — inside the wiki page's ≈32-character estimate. The layout is snapshotted *inside* `serialize.js` (not derived from the live control registry), and a gate asserts the snapshot still prefixes the registry — so future control additions can't silently shift a shipped URL's bit layout. Old links survive by construction: unknown versions decode to `null` → defaults.

## Deliberately deferred (honest gaps)

- **Meld balance beyond even, and per-pair tuning** — the Style-blend control exists and serializes, but 50/50 with seeded per-axis assignment is the only heard configuration (Tom expects to adjust once he listens).
- **`cadenceDrop` signature realization**; richer signature *audibility* testing (do invented styles read as styles? needs ears).
- **Preset numbers are first-pass.** Centers/spreads per genre are grounded in the wiki genre pages but untuned by listening; the improvement loop (Phase 3d) owns this.
- **Live morph edge cases**: rapid repeated genre swaps stack crossfades sanely (the previous outgoing conductor is force-faded), but a swap *during* a swap hasn't been stress-tested beyond the smoke.
- **No playlist/queue, no visual theming options** — vision items for later phases.
- **Vinyl-crackle bed for lo-fi** (Engine 03 had one in-engine; the shared synth has no crackle voice yet).

## Implications for generative engines

1. **Compose-ahead-of-the-playhead should be the default architecture** for anything interactive: it cost nothing over compose-all-up-front (the scheduler already existed), and it converts "restart to hear a change" into "the change arrives with the music." The engines' compose-whole-piece model is only right for fixed renders.
2. **Per-unit named RNG streams** (`unit:<n>`) are the determinism pattern for incremental composition — they decouple a unit's randomness from its predecessors' draw counts, which is what makes live changes *locally* perturbing rather than globally scrambling.
3. **A style is a region; controls are post-transforms.** Sampling the base vector purely from the seed, then applying pinned controls as deterministic rng-free transforms, is what lets the same URL logic serve auto and pinned states, and lets a live change re-derive the vector without re-rolling the dice.
4. When strategies are written by parallel workers against a shared contract, **the contract plus a cheap self-serve gate is the whole coordination cost** — six genre packs landed against `site-check.js`/`render-site.mjs` with no interface drift.

## Related pages

- [comprehensive-site-vision](comprehensive-site-vision.md) — the goal this build serves; the design docs under `docs/design/` are its spec
- [engine-architecture](engine-architecture.md) — the pipeline the site generalizes; [shared-libraries](shared-libraries.md) — the vendoring model
- [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the classic-script/`file://` constraint the site honors
- [style-invention-and-style-space](style-invention-and-style-space.md) · [hybridization-and-fusion](hybridization-and-fusion.md) · [meta-composition-and-style-machines](meta-composition-and-style-machines.md) — the style pillar the `style` module implements
- [music-representation-and-notation](music-representation-and-notation.md) — the URL bit-packing design implemented in `serialize.js`
- The five engine findings pages — the proven components the packs adapted

## Sources

- This project's own code and gates (all in-repo, re-runnable): `docs/lib/*`, `docs/styles/*`, `docs/app.js`, `experiments/tests/site.test.js`, `experiments/tools/site-check.js`, `experiments/tools/render-site.mjs`, `experiments/tools/site-smoke.mjs`. Numbers quoted (payload sizes, gate bands, horizon) are from those files as of session 034.
