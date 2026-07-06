---
title: Web Audio fundamentals
tags: [implementation]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: The audio-graph mental model, AudioContext lifecycle, AudioParam automation and click-safety, the node zoo, envelope patterns, and OfflineAudioContext rendering — the base layer every engine builds on.
---

# Web Audio fundamentals

Everything this project ships is a Web Audio API graph driven by vanilla JavaScript, so every engine decision ultimately compiles down to the concepts on this page: nodes and connections, the context lifecycle, parameter automation, and render timing. The API's design rewards a specific style — persistent buses plus cheap throwaway per-note subgraphs, with every audible change expressed as a scheduled ramp — and fighting that style is the most common source of clicks, leaks, and glitches. Scheduling logic lives in [scheduling-and-timing](scheduling-and-timing.md); instrument designs in [synthesis-recipes](synthesis-recipes.md); custom DSP in [audio-worklets-and-performance](audio-worklets-and-performance.md).

## The graph model

An `AudioContext` owns a directed graph: source nodes (oscillators, buffer players, constants) flow through processing nodes (gain, filters, delays, convolution) into `ctx.destination`. Core rules:

- `connect()` supports fan-out (one output to many inputs) and fan-in; multiple connections into one input **sum at unity gain**. Mixing is free — a `GainNode` is only needed to *weight* a sum.
- A node output can also connect to an **AudioParam** (`lfo.connect(filter.frequency)`). The param's final value is its scheduled/intrinsic value *plus* the summed input signal — this is how LFOs, envelopes-as-signals, and audio-rate modulation (FM) work.
- Params are **a-rate** (sampled every frame: most gains, frequencies) or **k-rate** (one value per 128-frame block: e.g., all `DynamicsCompressorNode` params, `PannerNode` positions). k-rate is cheaper and coarser; the distinction is fixed per param, listed in the spec.
- Channel count adapts automatically (mono into stereo up-mixes, etc.); defaults are fine for this project — just keep an eye on mono sources feeding stereo effects when width matters (see [effects-and-mixing](effects-and-mixing.md)).

## AudioContext lifecycle

- `new AudioContext({ latencyHint, sampleRate })`. `latencyHint`: `"interactive"` (default, smallest buffers), `"balanced"`, `"playback"` (larger buffers, fewer glitches, less power — right for generative ambient), or a number in seconds.
- States: `"suspended"` → `"running"` → `"closed"`. A context created before a user gesture starts `"suspended"` under autoplay policy; call `resume()` inside a click/keydown handler ([audio-worklets-and-performance](audio-worklets-and-performance.md) covers policies and the Safari `"interrupted"` behavior, which the 1.1 spec draft is standardizing as a state).
- `suspend()` on pause releases CPU (and on some platforms the audio hardware); `close()` is terminal — you cannot restart a closed context.
- `ctx.sampleRate` is fixed for the context's life and is **whatever the output device prefers** (44100 and 48000 both common). Never hardcode a rate: compute buffer lengths, delay times, and filter coefficients from `ctx.sampleRate`.

## Sample rate and the render quantum

Audio is processed in blocks called **render quanta** of 128 frames (~2.9 ms at 44.1 kHz). Consequences: k-rate params update at quantum boundaries; a `DelayNode` inside a feedback cycle is clamped to a minimum of one quantum (this caps node-graph Karplus-Strong pitch — see [synthesis-recipes](synthesis-recipes.md)); and main-thread work never happens per-sample. The Web Audio 1.1 draft adds `AudioContextOptions.renderSizeHint` (`"default"` = 128, `"hardware"`, or an integer), but MDN's constructor page does not yet document it and shipping support is not Baseline as of mid-2026 — assume 128 in practice, but read `channel.length` in worklet code rather than hardcoding it.

## AudioParam automation

The automation methods are the API's real instrument. All times are in `ctx.currentTime` seconds.

| Method | Use | Gotchas |
|---|---|---|
| `setValueAtTime(v, t)` | steps, anchoring ramps | an audible jump clicks |
| `linearRampToValueAtTime(v, t)` | attacks, short fades | ramps **from the previous event** — always anchor with `setValueAtTime` first, or the ramp starts at the last event's time, not now |
| `exponentialRampToValueAtTime(v, t)` | pitch glides, natural fades | **cannot reach or cross 0** (throws on 0; same-sign required) — use a floor like `0.0001`, then `setValueAtTime(0, …)` |
| `setTargetAtTime(v, t, τ)` | decays, releases, live "glide to" | asymptotic — **never arrives**; ~63% at τ, ~95% at 3τ, ~99.3% at 5τ; schedule stops ≥ 6–8τ later |
| `setValueCurveAtTime(arr, t, dur)` | arbitrary shapes (vibrato onset, custom fades) | throws if it overlaps other events; ends holding the last value |
| `cancelScheduledValues(t)` | wipe future events | if a ramp is in flight, value **snaps back** to the pre-ramp value — a click machine |
| `cancelAndHoldAtTime(t)` | wipe future, hold current | the right tool, but **Firefox still lacks it** (Bugzilla #1308431 open as of early 2026); feature-detect |
| `.value = v` | initialization only | equivalent to an immediate step; browsers no longer smooth ("dezipper") it — it clicks on live signals |

## The click-avoidance discipline

A discontinuity in gain, frequency (of audible filters), pan, or delay time produces a broadband click. House rules:

- Audible params never jump. Gain moves get ≥ 3–10 ms ramps; filter frequency moves get ≥ 20–50 ms (`setTargetAtTime` with τ ≈ 30–100 ms is ideal for live control).
- Never `stop()` a source that is still audible — release first, stop after the release tail.
- `delayTime` changes on an audible delay pitch-shift and zipper; crossfade between two delays for tempo-sync changes.
- Initialize params before the context runs or while gain is 0; `.value =` is fine then and only then.

## Node zoo with musical uses

| Node | Musical role | Notes |
|---|---|---|
| `OscillatorNode` | tones: sine/square/sawtooth/triangle + `setPeriodicWave` | one-shot: `start()` once, then discard; `detune` in cents |
| `GainNode` | VCA, envelopes, mixing, send levels, macro faders | the workhorse; most graphs are half gains |
| `BiquadFilterNode` | subtractive filtering, EQ | 2nd order (12 dB/oct); cascade two for 24 dB; `frequency`/`Q`/`gain` all automatable |
| `DelayNode` | echoes, chorus/flanger, comb/Karplus loops | in-cycle minimum one render quantum |
| `ConvolverNode` | reverb from synthesized IRs, body/cab coloration | `normalize` defaults true; CPU scales with IR length |
| `WaveShaperNode` | saturation, distortion, wavefolding | `oversample: "2x"/"4x"` tames aliasing |
| `DynamicsCompressorNode` | glue, limiting | k-rate params, ~6 ms internal lookahead latency, automatic makeup gain — see [effects-and-mixing](effects-and-mixing.md) |
| `StereoPannerNode` | placement | equal-power pan, a-rate `pan` |
| `AnalyserNode` | metering, visuals, self-evaluation taps | passes audio through unchanged; works with output unconnected |
| `ConstantSourceNode` | DC-as-signal: one `offset` fanned out to many params = a macro control | also handy as a summable modulation bus |
| `AudioBufferSourceNode` | noise loops, percussion, rendered stems | one-shot like oscillators; `loop`, `playbackRate` |
| `PeriodicWave` | custom spectra (drawbars, formants) | not a node — a wavetable object for oscillators |

## Envelope construction

ADSR by ramps, with the pieces above:

```js
function adsr(param, t, peak, a, d, s, releaseTau) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0, t);                       // anchor
  param.linearRampToValueAtTime(peak, t + a);       // attack
  param.setTargetAtTime(peak * s, t + a, d / 3);    // decay toward sustain
  return (tRel) => {                                // call to release
    param.cancelAndHoldAtTime?.(tRel);              // absent in Firefox
    param.setTargetAtTime(0, tRel, releaseTau);
  };
}
```

The classic trap is the **early release**: releasing mid-attack requires cancelling the pending ramp, and `cancelScheduledValues` snaps the value back to its pre-ramp level (click). Three robust strategies:

1. **All-`setTargetAtTime` envelopes.** `cancelScheduledValues(t)` only removes events at or after `t`; a `setTargetAtTime` started earlier keeps running, and each new `setTargetAtTime` takes over smoothly from the value the previous curve has reached. Envelopes built purely from `setTargetAtTime` segments need no cancellation and cannot click. Cost: no exact hit times, everything is exponential — usually fine, often *better*, for musical amplitude shapes.
2. **`cancelAndHoldAtTime`** where supported (Chromium, WebKit) — cleanest when ramps/curves are needed.
3. **Manual re-anchor:** compute the parameter's current value yourself (your engine knows what it scheduled), then `cancelScheduledValues(now); setValueAtTime(computed, now); …release…`.

Scale `peak` by note velocity, and prefer exponential-ish decays (`setTargetAtTime` is exactly one) — linear decays sound synthetic on sustained instruments.

## Polyphony, node lifetime, and garbage collection

Nodes are designed to be **created per note and discarded**: sources are one-shot by design, construction is cheap, and a stopped source with no JS references and no connected inputs becomes collectible automatically. The intended architecture is a small set of persistent shared nodes (voice buses, filters, effects, master chain) plus a throwaway subgraph per note:

```js
const osc = new OscillatorNode(ctx, { frequency: hz });
const env = new GainNode(ctx, { gain: 0 });
osc.connect(env).connect(voiceBus);
osc.start(t); osc.stop(t + dur + 1.0);              // after the release tail
osc.onended = () => { osc.disconnect(); env.disconnect(); };
```

Hundreds of node creations per second are unproblematic on desktop; still cap polyphony (voice-steal or drop) because *sounding* nodes cost DSP even when silent-ish. What defeats GC: keeping references in ever-growing arrays, forgetting `stop()`, or leaving subgraphs connected — see the leak checklist in [audio-worklets-and-performance](audio-worklets-and-performance.md).

## OfflineAudioContext: rendering faster than real time

`OfflineAudioContext(channels, lengthInFrames, sampleRate)` runs the same graph API but renders as fast as the CPU allows into an `AudioBuffer` via `startRendering()`. This is the backbone of this project's self-evaluation loop: render minutes of a piece in seconds, then compute metrics on the buffer ([computational-music-metrics](computational-music-metrics.md), [evaluation-challenges](evaluation-challenges.md)).

```js
async function renderPiece(seconds, seed) {
  const off = new OfflineAudioContext(2, 48000 * seconds, 48000);
  buildEngine(off, seed);                  // same code path as live playback
  const buf = await off.startRendering();
  return analyze(buf);                     // RMS, centroid, onsets, silence…
}
```

Practical notes: write engines **context-agnostic** (take the context as a parameter; schedule from `context.currentTime`, which starts at 0 offline) so live and offline share one code path — an [engine-architecture](engine-architecture.md) requirement. `off.suspend(t)` (offline-only, scheduled) lets you mutate the graph mid-render — useful for simulating live control changes. Worklet modules must be `addModule`d per context, including offline ones. Offline rendering produces no sound, so it is not gesture-gated in practice in Chromium; Firefox's `media.autoplay.block-webaudio` may still apply — kick off evaluation renders from a user action to be safe (verify at implementation time).

## Implications for generative engines

- **Do** pass the context into every module; share one code path between live `AudioContext` and `OfflineAudioContext` rendering.
- **Do** express every audible change as a ramp or `setTargetAtTime`; adopt all-`setTarget` envelopes or a `cancelAndHoldAtTime` + manual-re-anchor fallback (Firefox).
- **Do** use per-note throwaway subgraphs with `onended` disconnect; keep buses persistent; cap polyphony.
- **Do** floor exponential targets at ~0.0001, then step to 0 once inaudible.
- **Do** derive every buffer length and delay from `ctx.sampleRate`; treat 128-frame quanta as an assumption to check, not a constant to bake in.
- **Don't** set `.value` on audible params while running; don't `stop()` un-released notes; don't change audible `delayTime` without crossfading.
- **Don't** build one giant always-on graph of all possible voices — create, play, discard.
- **Don't** rely on `cancelAndHoldAtTime` existing; feature-detect it.

## Open questions

- When will `renderSizeHint` and the 1.1 additions (`"interrupted"` state, render-capacity reporting) reach Baseline, and do larger quanta measurably cut CPU for this project's node-heavy graphs?
- Does Firefox gate `OfflineAudioContext.startRendering()` behind sticky activation in default 2026 configs? Needs a quick empirical check.

## Related pages

- [scheduling-and-timing](scheduling-and-timing.md) — driving this graph precisely from JS
- [synthesis-recipes](synthesis-recipes.md) — instruments built from these nodes
- [effects-and-mixing](effects-and-mixing.md) — the shared buses those notes feed
- [audio-worklets-and-performance](audio-worklets-and-performance.md) — beyond the built-in nodes
- [engine-architecture](engine-architecture.md) — how modules should own contexts and buses
- [computational-music-metrics](computational-music-metrics.md) — what to do with offline renders
- [previous-experiments-lessons](previous-experiments-lessons.md) — patterns already proven here

## Sources

- MDN Web Docs — "AudioParam" (automation methods, a-rate/k-rate; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/AudioParam
- MDN Web Docs — "Web Audio API best practices" (clicks, autoplay, param precedence; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- MDN Web Docs — "OfflineAudioContext" (accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext
- MDN Web Docs — "AudioContext() constructor" (latencyHint, sampleRate; renderSizeHint absent as of mid-2026; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext
- W3C — "Web Audio API 1.1" Editor's Draft (render quantum, renderSizeHint semantics, node/param definitions; accessed 2026-07-06). https://webaudio.github.io/web-audio-api/
- MDN Web Docs — "AudioParam.cancelAndHoldAtTime()" (limited availability; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime
- Mozilla Bugzilla — Bug 1308431 "Implement cancelAndHoldAtTime" (status NEW as of early 2026). https://bugzilla.mozilla.org/show_bug.cgi?id=1308431
- MDN Web Docs — "AnalyserNode" (pass-through analysis; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
