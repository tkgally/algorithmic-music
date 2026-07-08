---
title: Findings — the ambient-drift engine (Engine 02)
tags: [findings, implementation, genre, project]
status: reviewed
created: 2026-07-08
updated: 2026-07-08
summary: The project's second public engine and the deliberate contrast to tonal-classical — a generative ambient texture built from Eno's Music for Airports incommensurable-loop recipe over a slow modal drift, reusing the shared synth/fx (with new bell/pad/drone voices and a parameterizable dark reverb), validated by offline render.
---

# Findings — the ambient-drift engine (Engine 02)

Tom asked (2026-07-08) for a second engine "with a different, contrasting style of music." Engine 02 — **`ambient-drift@0.1.0`**, live at `docs/engines/02-ambient-drift/` and cataloged in the hub as Engine 02 — is the deliberate opposite of [tonal-classical](findings-tonal-classical-engine.md) on every audible axis: **no meter, no cadences, no foreground melody to track; sparse events, long sustains, harmonic stasis that drifts rather than progresses.** It is the browser realization of the single most-recommended ambient recipe in the knowledge base. Every structural claim is backed by re-runnable in-repo code — `node experiments/tests/run.js` (**95 tests**, of which 7 are ambient) and `node experiments/tools/render-ambient.mjs` (the offline audio gate).

## Why ambient, and why this recipe

[ambient-and-generative-genre](ambient-and-generative-genre.md) names the **incommensurable-loop engine (Eno, *Music for Airports*, 1978)** as the highest-value generative recipe per unit of code — "5–9 sound events ... assign each a repeat period ... with mutually prime-ish periods ... near-guaranteed listenability, well-documented precedent" — and pairs it with a moving element: "a drone plus one slowly moving element is a legitimate complete texture." Engine 02 implements exactly that:

- **The moving element is a slow modal harmonic drift.** A drone + pad bed sustains a consonant modal voicing and steps its root every ~26–40 s through a few regions (drawn from the palette's scale degrees, tonic first), crossfaded with a long overlap so transitions are seamless and **never cadential**. This is the [form-and-structure](form-and-structure.md) contrast to the classical engine's cadence-articulated form: motion without goal.
- **The incommensurable loops are the sparse bells.** Five bell loops, each with a mutually-prime-ish period — **17.5 / 23 / 28.5 / 32.1 / 40 s** — chosen so every pairwise ratio stays ≥ 0.045 from any small-integer ratio *n/d* (*n,d* ≤ 3) and the earliest near-realignment of any pair is beyond ~190 s (past a full default piece). A test asserts the incommensurability directly. This is Eno's load-bearing idea: overlapping simple systems stay fresh because they never exactly repeat.

The [attention contract](attention-and-background-listening.md) — "as ignorable as it is interesting" — is the engine's evaluable spec: no startling transients, no fixed melody demanding tracking, but enough slow change to reward attention.

## What the composer emits (an honest schema deviation)

Ambient is fundamentally **time-based, not beat-based**, so `experiments/composers/ambient-drift.js` emits a **seconds-based** score (`{ t, dur, midi, voice, tags }`) rather than the beats-based Note schema the classical composer uses — a documented deviation, like the classical engine's own single-tempo simplification. The performer still hands the shared synth/fx the identical performance-event shape every engine produces. Pitches are all from one mode; pad voicings are root + perfect fifth + octave + one scale-flavored third, which is consonant for any region root and sidesteps any diminished-triad risk. Four palettes ship: **warm** (lydian), **calm** (major pentatonic), **open** (dorian), **shadow** (natural minor).

## The performer: minimal by design

[expressive-performance](expressive-performance.md) warns that most of its piano/voice rule set (metric accent, articulation, ritardando) may not transfer to pads and sustained textures — and ambient explicitly wants none of it. So `experiments/engines/ambient-drift/engine.js` is deliberately minimal: it scales time by a UI **pace** control, adds a small **correlated (AR(1)) velocity/timing residual** so nothing is dead-static (the one humanization rule that clearly *does* transfer), and applies a **global fade in/out** so the piece emerges from and dissolves back into silence. No meter, no ritardando, no articulation shortening, full sustains — matching the genre's "slow attack and release, narrow dynamic range, no sudden events."

## The audible layer: three new shared voices + a parameterizable reverb

The engine reuses the shared [synth](shared-libraries.md)/[fx](shared-libraries.md) libraries, extended (alongside the engine-01 feedback pass) with ambient-appropriate voices, all from stock Web Audio nodes per [synthesis-recipes](synthesis-recipes.md):

- **`bell`** — modal synthesis: a few inharmonic partials, each an exponentially-decaying sine (higher partials shorter). Pure sines mean no aliasing and a clean, glassy ring — the sparse foreground.
- **`pad`** — a slow-attack detuned-triangle wash with a slow cutoff **LFO** for motion (the documented cure for the "static pad" failure mode) and a long release.
- **`drone`** — a deep sine sub + quiet fifth, mono and dark, the foundation.
- **`fx`** is now parameterizable per engine (`reverbSeconds` / `reverbDamp` / `returnLowpassHz` / `returnGain` / `chordSendScale`), so the ambient engine uses a **long, dark reverb** (≈ 5.5 s, band-limited return) as literal space — [effects-and-mixing](effects-and-mixing.md)'s "reverb-as-space" — while the classical engine stays tight and clean.

**Two shared-library static fixes (v0.1.1, with the engine-01 feedback passes).** A listener rated this engine 4/5 but heard "some static-like noise in the middle of some midrange and high notes." Two shared-library changes were tried. (1) **Reverb-tail grain:** the shared IR was decaying *white* noise; a sustained tone's wet-tail short-time-energy coefficient of variation was ≈ 0.49. Switching the IR's noise source to **near-Gaussian** (an Irwin-Hall variate, energy-normalized) dropped it to ≈ 0.33 (−31%) without changing brightness or loudness (the control experiment — a third lowpass pole *worsens* grain — is in [findings-tonal-classical-engine](findings-tonal-classical-engine.md) § v0.3). (2) **The envelope corner** (§ v0.3.1 there, the primary cause found from engine-01's exact repro): the shared `envGain` used to hold flat then release abruptly, splattering a broadband "puff" at the release onset — mid-note on long notes. The `pad` voice here uses `envGain`, so it now glides to its sustain level instead of holding flat (`bell` and `drone` were already corner-free — `bell` has its own continuous-decay envelope, and `drone` glides). The engine also opens its live context with `latencyHint: 'playback'`. These targeted **Engine 01's** exact repro and are correct on their own terms — but they were *not* the cause of Engine 02's static, which persisted for the listener and had a different, engine-specific root cause found in v0.1.2 (below).

## The real Engine-02 static: texture density, not the synth (v0.1.2)

After v0.1.1, Tom still heard static and gave an exact deterministic repro (`seed=drift-1`, warm/D3, `dur=150`, `rev=0.5`, `vol=0.62`) with timestamps: sustained ranges around **00:42–00:45** and **01:37–01:43**, plus instants near **01:59** and **02:09**. Because the render is deterministic (the voices use exponential ramps only and the reverb IR is seeded), an offline **OfflineAudioContext** render in headless Chromium reproduces the exact signal — confirmed against Tom's 24-bit/48 kHz WAV of the playback: the offline render's **peak (0.6193) and RMS (−13.3 dBFS) match the recording (0.6195, −13.4 dBFS) to 3–4 significant figures**, i.e. the same signal.

Diagnosis used three tools on that render: per-voice/reverb isolation, an **amplitude-envelope modulation-spectrum roughness metric** (energy in the 20–90 Hz modulation band = perceived *roughness/"static"*, distinct from the 1–10 Hz *shimmer* of a pleasant chorus — an ordinary short-time energy CV conflates them and misled an early pass), and a pure **active-note analysis** listing which partials sound at each flagged instant. The leading hypotheses were checked and **ruled out as the cause**: the reverb adds ≈ 0 to the full-mix roughness (dry ≈ wet at every window); there are no clicks or envelope discontinuities (`maxStep` ≈ 0.10, no hard step); and per-voice **synth** tweaks (darker/tighter pad, softer or shorter bell) did **not** lower the flagged-window roughness. The static is **sensory roughness** — partials beating within a critical band — exactly the mechanism [auditory-perception-basics](auditory-perception-basics.md) names: *"a synth pad exposes tuning errors a fast melodic line would hide"* (Plomp & Levelt 1965, max roughness at ≈ 25 % of a critical bandwidth). It concentrated at **two structural moments** that match the flagged times, while a clean single-region control had far fewer colliding partials:

1. **Region crossfades.** The launch composer held the *departing* region's full pad voicing at near-full level for an **8 s** overlap while the *arriving* voicing was already full — so for several seconds at every boundary **two complete modal voicings** sounded together and their dense partials beat. This is the sustained-static ranges (and the 01:59 instant).
2. **Dense bell clusters.** The five incommensurable loops occasionally line up so **five long, inharmonic bells** (partial ratios 1 : 2.01 : 2.98 : 4.2) overlap, piling into a rough high cluster — the roughest single point in the recording (01:37–43).

**The fix is in the composer (density), not the synth** (`experiments/composers/ambient-drift.js`, ambient-only; `synth.js`/`fx.js` are unchanged and the other two engines are untouched):

- **A true pad crossfade:** the **pad** overlap is cut **8 s → 4 s** so the old voicing has faded out (via its envelope release) before the new is fully in — never two full voicings at once. The **drone** keeps its 8 s overlap (a smooth sub with no upper partials adds no roughness and keeps the bass continuous under the crossfade, so no gap in the bed).
- **A bell polyphony cap (≤ 4)** plus a mild ring-length trim (upper bound 9 s → 7.5 s): deterministic, earliest-onset-wins, the focal "arrival" tone always kept. It thins **only** the densest moments (≈ 13 % of hits at the default seed); the loops still overlap and never realign, so the *Music for Airports* idea is intact.

Offline, both flagged windows drop from clearly-elevated to the **clean control level** (crossfade roughness −6 dB, bell-cluster −4 dB, high band), with the overall level, peak, and click-safety unchanged; STFT spectrograms of the shipped render show the dense beating "grid" at the crossfade collapse to clean, separated harmonic lines and the bell cluster clear. This is a different cause and cure from Engine 01's envelope puff — the shared "static" label covered two unrelated mechanisms.

## What the validation shows

- **Composer + performer** (`node experiments/tests/run.js`, +7 tests): the score is deterministic; drone/pad/bell all present; regions tile contiguously and populate the duration; the five loop periods are distinct and incommensurable (no near-integer-ratio pair); every bell/drone pitch is in the chosen mode; the performer emits time-ordered events with velocities in (0,1] and positive durations; pace scales the piece length; and the opening measurably emerges from near-silence (the global swell).
- **The audible layer** (`node experiments/tools/render-ambient.mjs`, 16/16 gates): the engine's own `synth`/`fx` render several seeds/palettes to **no clipping** (peak ≈ 0.62), **no gross discontinuity** (`maxStep` ≈ 0.06–0.10 — far smoother than the FM lead, as expected from soft attacks), a **continuous bed** (no mid-piece silence > 4 s), and an **ambient-quiet level** (≈ −13 to −14 dBFS RMS), with no console errors. The offline render drives the exact shipped code via a dev-only `_selftest.html`.

## Design decisions settled

- **Incommensurable loops + a modal drift is a complete texture.** The classical engine earns interest from cadential structure; the ambient engine earns it from never-realigning overlap plus slow harmonic motion — two different, legitimate answers to "why keep listening."
- **A seconds-based composer is the honest schema for ambient.** Pretending there are beats would only quantize the incommensurable periods that make the piece work.
- **Contrast lives in form and rhythm, not just timbre.** Same synthesis palette, same fx chain — the two engines sound like different *worlds* because one has meter, cadence, and a tracked melody and the other has none.
- **The performer should get out of the way.** For sustained textures, almost the entire expressive rule set is counterproductive; a correlated residual and a global swell are enough.

## Open questions and next increments

- **How long before stasis reads as neglect?** The [genre page](ambient-and-generative-genre.md) flags this as needing [listening tests](listening-tests-and-feedback.md); the default ~150 s piece and the "keep playing" toggle are a first answer, untested against listeners.
- **Truly endless mode.** The pattern supports indefinite play (the Koan/Reflection precedent); the finite render is what makes it seedable, shareable, and measurable. A lazy `Scheduler.onRefill` producer could stream it endlessly without materializing the score — a documented next step.
- **Richer moving elements.** A tape-delay accretion layer (the *Discreet Music* pattern) or a second, slower drift would add depth without breaking the attention contract.
- **Bell-vs-harmony consonance.** Bells are mode tones over modal regions (always consonant enough); optionally constraining each bell to the *current* region's chord tones would tighten the harmony at the cost of the loops' purity — a taste call to A/B.

## Related pages

- [ambient-and-generative-genre](ambient-and-generative-genre.md) — the recipe (incommensurable loops, drone-plus-mover, the attention contract, the mixing esthetic) this engine realizes
- [findings-tonal-classical-engine](findings-tonal-classical-engine.md) — Engine 01, the deliberate contrast; the shared synth/fx this extends
- [engine-architecture](engine-architecture.md) — the pipeline, UI conventions, and deployment layout this reuses
- [synthesis-recipes](synthesis-recipes.md) — the modal bell, pad-with-LFO, and drone recipes the new voices implement
- [effects-and-mixing](effects-and-mixing.md) — reverb-as-space, the long dark tail
- [shared-libraries](shared-libraries.md) — the `synth`/`fx` libraries the new voices and reverb parameters extend
- [attention-and-background-listening](attention-and-background-listening.md) — "ignorable as it is interesting" as an evaluable spec
- [project-roadmap](project-roadmap.md) — Phase 2, the contrasting-engine shortlist

## Sources

- Reproducible in-repo (original, public-domain CC0): `experiments/composers/ambient-drift.js`, `experiments/engines/ambient-drift/engine.js`, the shared `experiments/lib/synth.js` (`bell`/`pad`/`drone`) + `experiments/lib/fx.js` (parameterizable reverb), `experiments/tests/ambient.test.js` (run `node experiments/tests/run.js`), `experiments/tools/render-ambient.mjs`, and the shipped `docs/engines/02-ambient-drift/`. All claims above re-run from these.
- Music-genre content operationalizes already-cited wiki pages: the incommensurable-loop and drone-plus-mover recipes, mixing esthetic, and attention contract from [ambient-and-generative-genre](ambient-and-generative-genre.md) (Eno's *Music for Airports* and 1996 generative-music talk); the modal-bell, pad-with-LFO, and drone topologies from [synthesis-recipes](synthesis-recipes.md); reverb-as-space from [effects-and-mixing](effects-and-mixing.md); the "does the rule set transfer to pads?" caution from [expressive-performance](expressive-performance.md). No new external sources were fetched.
