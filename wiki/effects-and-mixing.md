---
title: Effects and mixing
tags: [implementation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Reverb, delay, modulation, saturation, compression, EQ, stereo strategy, gain staging, and loudness targets for fully synthesized mixes, built from stock Web Audio nodes.
---

# Effects and mixing

Raw synthesized voices sound like a demo; a shared effects-and-mixing layer is what turns them into a record. Because this project runs sample-free from `file://`, every effect — including reverb impulse responses — must be generated in code, and because output ranges from laptop speakers to headphones at low volume, mixing discipline (headroom, loudness, spectral balance at quiet levels) is part of the engine, not a mastering afterthought. Node mechanics live in [web-audio-fundamentals](web-audio-fundamentals.md); the perceptual reasoning behind several rules here lives in [auditory-perception-basics](auditory-perception-basics.md).

## Reverb 1: convolution with synthesized impulse responses

The best quality-per-line-of-code: a `ConvolverNode` fed a procedurally generated IR — exponentially decaying noise whose brightness darkens along the tail (real rooms absorb highs faster). No sample files needed:

```js
function makeIR(ctx, rng, seconds = 2.2, decayPow = 2.6, damp = 0.25) {
  const n = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n;                                   // 0..1 along the tail
      const k = damp + x * (0.985 - damp);               // one-pole darkens over time
      lp = k * lp + (1 - k) * (rng() * 2 - 1);
      d[i] = lp * Math.pow(1 - x, decayPow);
    }
  }
  return buf;                                            // ConvolverNode.normalize (default) handles level
}
```

Key moves: **independent noise per channel** decorrelates left/right, which *is* the stereo width of the reverb; `seconds` 0.4–1 (room), 1.5–3 (hall), 4–8 (wash); **pre-delay** 10–30 ms (a `DelayNode` before the convolver, or zero-pad the IR head) keeps sources up front and dry transients legible. Route as **send/return**: instrument buses → per-bus send gains → one convolver → return gain into the master; never per-note convolvers (CPU scales with IR length). Bright shimmer: reduce `damp` sweep; dark plate: start `damp` high and lowpass the return. Regenerate IRs from the seed so reverbs are deterministic ([previous-experiments-lessons](previous-experiments-lessons.md) used exactly this pattern).

## Reverb 2: algorithmic (Schroeder/Freeverb) and FDNs

Schroeder's classic: parallel feedback comb filters (build the echo density envelope) into series allpasses (smear echoes without coloring). Freeverb, the reference public-domain implementation, uses per channel **eight lowpass-feedback combs** — delays 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 samples at 44.1 kHz — into **four series allpasses** (556, 441, 341, 225 samples, coefficient 0.5), right channel offset by **+23 samples** ("stereospread"); feedback ≈ 0.84 with a one-pole "damp" lowpass ≈ 0.2 in each comb loop. All of this maps directly to `DelayNode + BiquadFilterNode + GainNode` loops (convert samples → seconds via `ctx.sampleRate`; all these delays exceed the 128-frame cycle clamp, so node graphs work). Worth building when reverb parameters must *move* (decay/damping automation, which a static convolver cannot do) — otherwise convolution wins on cost. Feedback delay networks (FDNs) generalize this — N delays cross-coupled through an orthogonal (e.g., Hadamard) matrix — smoother and more tunable, but at Web Audio node granularity a 4×4 FDN is ~30 nodes; consider a worklet if pursuing it ([audio-worklets-and-performance](audio-worklets-and-performance.md)).

## Delays

- **Tempo-synced:** `delayTime = beats × 60/bpm`; recompute on tempo change by crossfading two delay lines (changing an audible `delayTime` pitch-slews). Dotted-eighth sends behind sparse leads are the highest-value single effect for this project's textures.
- **Filtered feedback:** put a lowpass (and/or highpass ~200 Hz) inside the feedback loop so repeats darken and thin like tape — feedback gain 0.3–0.65, cutoff 1–4 kHz.
- **Ping-pong:** two delays cross-feeding (`L.delay → R.input`, `R.delay → L.input`), inputs panned hard; feed it mono to keep repeats spacious but the image stable.

## Chorus, flanger, phaser

All are LFO-modulated short delays/allpasses; sines at audio-rate driving AudioParams keep working in hidden tabs (unlike timer-driven wiggles — [scheduling-and-timing](scheduling-and-timing.md)):

- **Chorus:** 1–3 taps at 15–30 ms base, LFO 0.1–1.5 Hz modulating ±2–6 ms (LFO → gain → `delayTime`), mixed ~50/50 with dry; per-tap LFO phases differ; pan taps for width. The pad/organ ensemble maker.
- **Flanger:** one tap 1–8 ms, depth ±1–4 ms, LFO 0.1–0.5 Hz, feedback 0.3–0.7 back into the delay — jet swoosh; use sparingly.
- **Phaser:** 4–8 `BiquadFilterNode`s of type `allpass` in series, center frequencies swept together 200 Hz–2 kHz by one slow LFO, optional feedback around the chain; subtler and more "analog" than flanging on pads.

## Saturation

A `WaveShaperNode` with a gentle curve (the [synthesis-recipes](synthesis-recipes.md) soft-clip formula at `a ≈ 0.1–0.3`, or `tanh(1.5x)`) on buses adds density and tames peaks before the compressor. Always `oversample: "2x"`/`"4x"` (shaping aliases otherwise); drive with a pre-gain (+3–9 dB) and compensate with a post-gain, because the *drive level is the sound*. On the master, keep it nearly transparent (`a ≤ 0.15`) — glue harmonics at −40 dB, not fuzz.

## Compression: DynamicsCompressorNode, with its quirks

Defaults: `threshold` −24 dB, `knee` 30, `ratio` 12, `attack` 0.003 s, `release` 0.25 s; all params k-rate; read `reduction` (dB of gain reduction) for metering/debugging. Musical settings:

- **Bus glue:** threshold −18 to −24, ratio 2–4, knee 20–30, attack 0.01–0.03, release 0.1–0.3 → aim for 2–4 dB reduction on peaks.
- **Safety limiter (master):** threshold −3 to −6, ratio 12–20, knee 0–6, attack 0.001–0.003, release 0.05–0.25 → normally idle, catches accidents.

Quirks that bite: the spec's compressor is a lookahead design with a **fixed ~6 ms internal delay** — mixing its output with an uncompressed copy of the same signal (parallel compression) comb-filters unless you delay the dry path ~6 ms to match; there is **automatic makeup gain** derived from threshold/knee/ratio that cannot be disabled (an open spec issue), so changing those parameters changes output level — automate a trim `GainNode` after it, set levels by measurement, and never automate threshold/ratio audibly mid-piece. There is no sidechain input (see ducking below) and no user-controllable lookahead beyond the fixed one.

## EQ practice

Per-bus `BiquadFilterNode`s, few and broad:

- **Highpass everything that is not bass** at 80–120 Hz (leads/pads/keys; percussion except kick ~150–200 Hz). Cumulative low-mid rumble from a dozen synthesized voices is the default mud source.
- Cut before boosting: mud 200–400 Hz, boxiness 400–800 Hz (peaking, −2 to −4 dB, Q ≈ 1); presence 2–5 kHz and air ≥ 8 kHz (shelves, +1–3 dB) only on the element that should own that band.
- **Quiet-listening tilt:** at low playback volumes the ear loses bass and treble (equal-loudness contours — [auditory-perception-basics](auditory-perception-basics.md)); tie gentle low-shelf and high-shelf boosts (0 to +4 dB) inversely to the volume slider, as the previous experiments did. A mix balanced loud is thin quiet; this project's music is mostly consumed quiet.
- One quasi-static master tilt beats per-note EQ churn; automate with `setTargetAtTime` only.

## Stereo strategy

- `StereoPannerNode` is equal-power — constant perceived loudness across the arc; pan instruments to stable "seats" rather than wandering (headphone listeners, long sessions).
- **Width** comes from decorrelation: per-channel IR noise (above), detuned voice pairs panned L/R, per-side LFO phase offsets. The Haas trick (5–25 ms one-sided delay) widens strongly but combs when summed to mono — keep it for ear candy, low in level, never on bass or leads.
- **Mono below ~150 Hz** (sub, kick fundamentals, bass): centered, un-widened, un-chorused; phase-coherent lows are what small speakers and mono Bluetooth reproduce.
- Nothing statically hard-panned at high level (headphone fatigue); check the mix summed to mono occasionally — an `OfflineAudioContext` render + channel sum makes this checkable in the evaluation loop.

## Gain staging, headroom, and loudness

Web Audio processes in float32 — **no clipping between nodes** regardless of level; only the destination's conversion to hardware clamps at ±1. So a single master trim can rescue internal hotness, *but* level still matters at every nonlinear stage (waveshaper, compressor, and the drive-dependent character of both). Practice: peak buses around −12 to −6 dBFS, master chain = sum → gentle glue compressor → saturation (optional) → limiter → destination, leaving the limiter idle in normal operation.

Loudness targets: streaming services normalize to roughly **−14 LUFS integrated** (Spotify: −14, with −19 "quiet" and −11 "loud" premium modes; true peak ≤ −1 dBTP recommended); EBU R128 broadcast sits at −23. A background-music engine should *undershoot* deliberately — the previous experiments landed near −22 dBFS RMS by design. Approximating LUFS in JS (ITU-R BS.1770): K-weight the signal (a ~+4 dB high-shelf above ~1.5 kHz plus a low-frequency roll-off — two biquads approximate it), mean-square over 400 ms blocks with 75% overlap, gate blocks below −70 LUFS absolute and −10 LU relative, then `LUFS = −0.691 + 10·log10(mean of gated block powers)`. Run it over `OfflineAudioContext` renders in the evaluation loop ([computational-music-metrics](computational-music-metrics.md)) rather than live; exact filter coefficients are in BS.1770 — validate the approximation once against a reference meter.

**Mix while quiet:** balance decisions made at the actual target listening level (quiet!) survive; decisions made loud do not, per the equal-loudness effect above. Also level-match any A/B comparison (±1.5 dB) or the louder option wins by default.

## Sidechain-style ducking

`DynamicsCompressorNode` has no sidechain input. Two substitutes:

1. **Envelope follower:** tap the trigger bus with an `AnalyserNode`, poll `getFloatTimeDomainData` at 30–60 Hz, compute RMS, drive the ducked bus's gain via `setTargetAtTime` (τ ≈ 50–120 ms). Control-rate, but ducking is a slow effect — fine. A worklet follower gives sample-accuracy if ever needed.

```js
const meter = new AnalyserNode(ctx, { fftSize: 512 });
kickBus.connect(meter);
const frame = new Float32Array(meter.fftSize);
setInterval(() => {
  meter.getFloatTimeDomainData(frame);
  let s = 0; for (const v of frame) s += v * v;
  const rms = Math.sqrt(s / frame.length);
  padBus.gain.setTargetAtTime(1 - Math.min(0.5, rms * 3), ctx.currentTime, 0.09);
}, 33);
```

2. **Score-driven ducking (better here):** a generative engine *knows* when the kick hits — schedule the duck directly (`gain.setTargetAtTime(0.6, tKick, 0.02)` then back to 1 with τ ≈ 0.15) alongside the note. Deterministic, sample-accurate, zero analysis cost, works offline. Detection is for engineers who lack the score; this project has the score.

## Implications for generative engines

- **Do** build one shared master chain (bus sum → glue → limiter → destination) and per-instrument buses with send gains to one convolver reverb and one tempo delay.
- **Do** synthesize IRs from the seed; decorrelate channels; pre-delay 10–30 ms.
- **Do** highpass non-bass buses, keep lows mono, seat instruments at stable pans, and tie a loudness tilt to the volume control.
- **Do** meter the result: LUFS-ish integrated loudness and mono-sum checks belong in the offline evaluation pass; target quiet (≈ −16 LUFS or below for foreground pieces, lower for background modes).
- **Do** prefer score-driven ducking/automation over signal detection.
- **Don't** automate compressor threshold/ratio audibly (hidden makeup-gain jumps), mix compressor output with un-delayed dry copies, waveshape without oversampling, or trust internal levels to "clip" audibly as a warning — float headroom hides sins until the destination.
- **Don't** widen bass, hard-pan leads, or make balance decisions at loud monitoring levels.

## Open questions

- Is a node-graph Freeverb audibly better than synthesized-IR convolution for *this* project's textures, and at what CPU cost? A/B once engines exist.
- How closely does a two-biquad K-weighting approximation track a reference BS.1770 meter across this project's spectra? Validate before trusting loudness metrics.
- Should the engine expose one "space" macro (dry↔washed) coupling pre-delay, send levels, and IR length, echoing the macro-control lesson of the previous experiments?

## Related pages

- [web-audio-fundamentals](web-audio-fundamentals.md) — nodes, params, click discipline
- [synthesis-recipes](synthesis-recipes.md) — the voices these buses receive
- [auditory-perception-basics](auditory-perception-basics.md) — equal-loudness, masking, and localization behind these rules
- [audio-worklets-and-performance](audio-worklets-and-performance.md) — worklet followers, FDNs, and CPU budgets
- [computational-music-metrics](computational-music-metrics.md) — loudness and spectral checks in the evaluation loop
- [attention-and-background-listening](attention-and-background-listening.md) — why quiet, steady mixes are a product requirement

## Sources

- Julius O. Smith III — "Freeverb" in *Physical Audio Signal Processing*, CCRMA, Stanford (structure: 8 LBCF combs + 4 series allpasses, stereospread 23; accessed 2026-07-06). https://ccrma.stanford.edu/~jos/pasp/Freeverb.html
- The Synthesis ToolKit — `FreeVerb.cpp` (canonical comb/allpass tunings 1116…1617 / 556, 441, 341, 225 at 44.1 kHz; accessed 2026-07-06). https://github.com/thestk/stk/blob/master/src/FreeVerb.cpp
- MDN Web Docs — "DynamicsCompressorNode" (params, k-rate, reduction; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- W3C — "Web Audio API 1.1" Editor's Draft (compressor processing model incl. fixed 6 ms lookahead; StereoPannerNode equal-power; float processing; accessed 2026-07-06). https://www.w3.org/TR/webaudio-1.1/
- WebAudio/web-audio-api issue #2639 — "Add adjustable makeup gain to DynamicsCompressorNode" (documents the fixed automatic makeup gain; accessed 2026-07-06). https://github.com/WebAudio/web-audio-api/issues/2639
- Spotify Support — "Loudness normalization" (−14 LUFS target, −11/−19 premium modes, true-peak guidance; accessed 2026-07-06). https://support.spotify.com/us/artists/article/loudness-normalization/
- ITU-R — Recommendation BS.1770 "Algorithms to measure audio programme loudness and true-peak audio level" (K-weighting, 400 ms gated measurement). https://www.itu.int/rec/R-REC-BS.1770
- musicdsp.org — "Waveshaper" (soft-clip curve used for saturation; accessed 2026-07-06). https://www.musicdsp.org/en/latest/Effects/46-waveshaper.html
