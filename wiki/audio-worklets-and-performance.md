---
title: Audio worklets and performance
tags: [implementation]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: When node graphs stop being enough — the AudioWorklet model, file:// loading workarounds, real-time performance budgets, autoplay and mobile constraints, and leak-free long sessions.
---

# Audio worklets and performance

Most of this project's engines can and should be plain node graphs, but a few needs — sub-quantum feedback, custom DSP, sample-accurate metering — require running JavaScript on the audio rendering thread via `AudioWorklet`. That thread has a hard real-time budget measured in single-digit milliseconds, the project's `file://` requirement complicates worklet module loading, and the engines must start under autoplay policy, survive phone lifecycles, and run for hours without leaking. This page collects the constraints and the patterns that satisfy them; graph-level basics are in [web-audio-fundamentals](web-audio-fundamentals.md), scheduler behavior under throttling in [scheduling-and-timing](scheduling-and-timing.md).

## The AudioWorklet model

Two halves: an `AudioWorkletProcessor` subclass registered inside a module that runs on the **audio rendering thread**, and an `AudioWorkletNode` created on the main thread that plugs into the graph like any node. The processor's `process(inputs, outputs, parameters)` is called synchronously per render quantum (128 frames today — read `outputs[0][0].length`, do not hardcode; see the `renderSizeHint` note in [web-audio-fundamentals](web-audio-fundamentals.md)). Returning `true` keeps the processor alive; `false` lets it be collected once sources stop. `static get parameterDescriptors()` declares real `AudioParam`s: in `process`, each arrives as a `Float32Array` of length 128 (a-rate, automated) or length 1 (constant this quantum) — branch on `.length`. Each side has a `port` (`MessagePort`) for everything that is not audio-rate: configuration, note events, seeds, metering readbacks. This design replaced the deprecated `ScriptProcessorNode`, which ran DSP on the main thread and glitched whenever the UI breathed.

```js
const processorSource = `
class OnePole extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: "k", defaultValue: 0.02, minValue: 0, maxValue: 1 }]; }
  constructor() { super(); this.y = 0; }
  process(inputs, outputs, parameters) {
    const x = inputs[0][0], y = outputs[0][0], k = parameters.k;
    if (!x) return true;                       // input may be silent/absent
    for (let i = 0; i < y.length; i++) {
      const kk = k.length > 1 ? k[i] : k[0];
      this.y += kk * (x[i] - this.y);
      y[i] = this.y;
    }
    return true;
  }
}
registerProcessor("one-pole", OnePole);`;
```

## When a worklet is necessary — and when it is not

Node graphs are compiled C++ under the hood; prefer them. A worklet earns its complexity only for:

- **Feedback shorter than one render quantum:** a `DelayNode` in a cycle clamps to ≥128 frames, so Karplus-Strong above ~345 Hz (at 44.1 kHz), waveguides, and tight comb effects need in-processor delay lines ([synthesis-recipes](synthesis-recipes.md)).
- **Per-sample recursion/nonlinearity:** custom filters, chaotic oscillators, phase-distortion tricks, physical models.
- **Custom noise/randomness:** seeded, reproducible noise generators (pass the seed via `processorOptions`) instead of unrepeatable `Math.random()` buffers — determinism matters to this project.
- **Sample-accurate analysis:** true-peak/LUFS meters, envelope followers feeding params without main-thread polling latency.
- **Granular engines at high grain rates:** hundreds of `AudioBufferSourceNode`s per second work, but a single processor with a ring buffer is cheaper and steadier past a few hundred grains/s.

Not worklet material: mixing, envelopes, standard filters/EQ, delays ≥ 2.9 ms, convolution reverb, compression, panning — the built-ins do these with better performance than hand-rolled JS.

## Worklets under file:// — module loading workarounds

`ctx.audioWorklet.addModule("processor.js")` fetches a module, and module fetches from `file://` pages are blocked by browsers' CORS treatment of local files — the single biggest worklet obstacle for this project's no-server, no-network contract. Workarounds, in preference order:

1. **Blob URL from an inline string** (keep processor code in a template literal in the one HTML file):

```js
const url = URL.createObjectURL(new Blob([processorSource], { type: "text/javascript" }));
await ctx.audioWorklet.addModule(url);
URL.revokeObjectURL(url);
const filt = new AudioWorkletNode(ctx, "one-pole", { processorOptions: { seed: 1234 } });
```

2. **`data:` URL** (`"data:text/javascript;base64," + btoa(processorSource)`) — same idea, no object-URL lifecycle, slightly worse debuggability.

Both are widely used and tracked in the standards discussion of worklet module loading (WebAudio/web-audio-api-v2 #109, which also floats `addModule(Blob)` directly). Status as of mid-2026: Blob-URL `addModule` is dependable in Chromium and Firefox including from `file://`; WebKit/Safari has historically been inconsistent here — **test Safari explicitly at implementation time and keep a node-graph fallback**. A strict Content-Security-Policy can also block blob/data scripts, which matters if pages are ever served with headers (GitHub Pages is permissive; raw `file://` has no CSP). Remember `addModule` is per-context: call it again for every `OfflineAudioContext` used in evaluation renders.

## The real-time budget

At 44.1 kHz a 128-frame quantum is **2.9 ms**; the processor must *always* finish far inside it, because one overrun is an audible glitch (Chrome's engineers put the practical budget lower once thread scheduling and the rest of the graph take their share). Rules for `process()`:

- **Allocate nothing.** Preallocate scratch arrays in the constructor; no object literals, closures, `push`, spread, or string building in the hot path — GC pauses on the render thread are glitches by definition (the core message of Choi's design-pattern article; WebAssembly is his zero-garbage endgame, overkill for this project's scale).
- Branch-light inner loops; hoist `parameters.x.length > 1` checks out of the sample loop where possible.
- Keep `port.postMessage` traffic small and infrequent; batch note events; never post per-sample. Transfer big buffers (`transferables`) or use `SharedArrayBuffer` ring buffers only if profiling demands (SAB needs cross-origin-isolation headers — generally unavailable under `file://`, so design around message passing).
- On the main thread, the same GC discipline applies at lower stakes: reuse analysis arrays, avoid per-tick allocation in the scheduler loop.

Whole-graph budget: total simultaneous nodes in the low hundreds is comfortable on desktop; biquads and gains are cheap, `ConvolverNode` cost scales with IR length (one shared 2 s stereo IR is fine; ten are not), `AnalyserNode` is cheap, `PannerNode` with HRTF is not (use `StereoPannerNode`). Measure, don't guess: watch for underrun symptoms (crackle correlating with `document.hidden` transitions or GC), profile with the browser's performance tools and `chrome://tracing` audio categories, and keep the previous experiments' habit of a headless verify pass that listens for dropouts ([computational-music-metrics](computational-music-metrics.md)). The 1.1 spec draft adds an `AudioRenderCapacity` load-reporting API — adopt it for auto-degradation once it ships broadly (verify support).

## Autoplay policies

Chromium (since 71), WebKit, and Firefox all gate audible Web Audio behind a user gesture: an `AudioContext` created without **sticky activation** starts `"suspended"`. The dependable pattern — create or `resume()` the context inside a `pointerdown`/`click`/`keydown` handler, and reflect state in the UI:

```js
playButton.addEventListener("click", async () => {
  ctx ??= new AudioContext({ latencyHint: "playback" });
  if (ctx.state !== "running") await ctx.resume();
  startEngine();
});
```

Chrome additionally auto-allows sites with high Media Engagement Index — never rely on it. `navigator.getAutoplayPolicy("audiocontext")` reports the policy where implemented (Firefox; not universal — feature-detect). UI conventions that follow: an explicit Play affordance on first load (also the honest choice for headphone users), keyboard-triggerable for accessibility, and never auto-starting sound on page load even where a quirk allows it. After the first gesture, `resume()` succeeds thereafter; keep a `statechange` listener and re-`resume()` on `visibilitychange`/`focus` if playing, which doubles as the iOS recovery path below.

## Mobile constraints

- **iOS Safari lifecycle:** contexts suspend when the page is backgrounded and are *not reliably resumed* on return (WebKit bugs 237878 and 263627); Safari also uses an `"interrupted"` state for calls/Siri/route changes — long non-standard, now being standardized in the 1.1 draft. Recovery: on `visibilitychange`, `focus`, and any user gesture, if the engine should be playing and `ctx.state !== "running"`, call `resume()`; re-anchor the scheduler afterward ([scheduling-and-timing](scheduling-and-timing.md)).
- **Silent switch:** Web Audio is muted by the ring/silent switch by default on iOS. The Audio Session API (`navigator.audioSession.type = "playback"`, W3C draft, WebKit-implemented) is the sanctioned fix and is reported to allow playback with the switch on silent — set it before resuming, feature-detected, and verify on hardware; the old workaround was priming playback through an `<audio>` element.
- **Sample rate and routes:** iOS contexts come up at 44.1 or 48 kHz depending on hardware/route, and switching to Bluetooth mid-session can invalidate assumptions — always compute from `ctx.sampleRate`, and if output turns to garbage after a route change, tear down and rebuild the context (state restore is cheap when the engine is seeded).
- **Android:** capabilities track desktop Chrome, but device latency and CPU vary enormously; `latencyHint: "playback"`, modest polyphony defaults, and glitch-driven degradation cover it.
- Mobile CPUs throttle aggressively on battery: budget for roughly half the desktop node count at defaults.

## Battery, CPU, and long-session etiquette

`suspend()` the context whenever playback stops (frees the audio hardware and most CPU); prefer `latencyHint: "playback"` for generative music (larger buffers → fewer wakeups → less power; latency is irrelevant for non-interactive playback); stop and disconnect finished subgraphs promptly; gate all visual work on `document.hidden` (rAF already stops, but `setInterval`-driven meters do not); avoid always-on analysis (run meters only when the UI showing them is visible). Offer a "low power" mode that halves polyphony and disables convolution — cheap insurance for all-day listeners.

## Feature detection and graceful degradation

Detect, never sniff: `"audioWorklet" in AudioContext.prototype` (plus an actual `addModule` attempt under `file://` — the capability, not the API, is what varies), `AudioParam.prototype.cancelAndHoldAtTime` (missing in Firefox — [web-audio-fundamentals](web-audio-fundamentals.md)), `navigator.audioSession`, `getAutoplayPolicy`, `outputLatency`. Every worklet-dependent instrument needs a stated fallback: worklet Karplus-Strong → FM pluck; worklet noise → seeded noise buffer; worklet meter → `AnalyserNode` polling. Degrade by dropping *quality tiers*, not by throwing — a `file://` page has no telemetry, so failures must be visible in the UI (a small "engine: fallback mode" note) and in console logs the verify tooling can catch.

## Memory leaks in long-running generative pieces

The classic causes, all observed in the wild:

1. **Un-discarded per-note nodes:** sources without `stop()` scheduled, or subgraphs still connected after use — a connected node is reachable and never collected. Pattern: `stop(t)` always; `onended` → `disconnect()` everything in the note's subgraph.
2. **Growing arrays:** scheduler event registries, motif/history logs, analytics traces appended forever. Prune on horizon passage; cap histories (ring buffers).
3. **Retained buffers:** old convolver IRs, superseded noise tables, and every `OfflineAudioContext` render kept "just in case" — a 10-minute stereo render at 48 kHz is ~230 MB as Float32; extract metrics, then drop the buffer.
4. **Closure captures:** `onended` handlers and message callbacks closing over large scopes (whole engines, buffers). Keep handlers tiny; null references after teardown.
5. **Processor lifetime:** worklet processors returning `true` unconditionally outlive their usefulness; return `false` when a voice processor's tail is done.

Verification: play for 30–60 minutes (or fast-forward via offline renders), take three heap snapshots, and require a plateau; watch `performance.memory` (Chromium) trend in the verify harness. A generative piece that cannot run overnight is not finished.

## Implications for generative engines

- **Do** keep the engine node-graph-first; introduce worklets only for the enumerated needs, each with a fallback tier.
- **Do** ship processor code as inline strings loaded via Blob URL (data: URL fallback), `addModule`d per context, seeds passed through `processorOptions`; test Safari specifically.
- **Do** preallocate in processors, keep `process()` allocation-free, and batch port messages.
- **Do** gate start on a real user gesture, set `navigator.audioSession.type = "playback"` where present, and install the resume watchdog (`statechange` + `visibilitychange` + gesture).
- **Do** `suspend()` on pause, use `latencyHint: "playback"`, and verify multi-hour heap flatness before calling an engine done.
- **Don't** touch `SharedArrayBuffer` designs (needs cross-origin isolation — unavailable under `file://`), rely on MEI auto-allow, assume 128-frame quanta or a fixed sample rate, or let any per-note object outlive its `onended`.

## Open questions

- Current Safari behavior for Blob-URL `addModule` from `file://` — needs a hardware test; determines whether worklet instruments can be first-class or must stay progressive enhancements.
- `AudioRenderCapacity` shipping status and whether it can drive automatic polyphony scaling.
- Does `navigator.audioSession.type = "playback"` reliably defeat the iOS silent switch for Web-Audio-only pages in 2026 builds?

## Related pages

- [web-audio-fundamentals](web-audio-fundamentals.md) — graph model, params, node lifetime
- [scheduling-and-timing](scheduling-and-timing.md) — main-thread scheduling under throttling
- [synthesis-recipes](synthesis-recipes.md) — which instruments need worklet DSP
- [effects-and-mixing](effects-and-mixing.md) — metering and FDN candidates for worklets
- [engine-architecture](engine-architecture.md) — where fallback tiers and capability detection live
- [computational-music-metrics](computational-music-metrics.md) — offline renders that exercise the same worklet code

## Sources

- Hongchan Choi — "Enter Audio Worklet", Chrome for Developers, 2017–2021 (model, lifetime, parameter arrays; accessed 2026-07-06). https://developer.chrome.com/blog/audio-worklet
- Hongchan Choi — "Audio Worklet design patterns", Chrome for Developers, 2018–2021 (budget, GC-free processing, WASM/SAB patterns; accessed 2026-07-06). https://developer.chrome.com/blog/audio-worklet-design-pattern
- MDN Web Docs — "Background audio processing using AudioWorklet" (accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
- WebAudio/web-audio-api-v2 issue #109 — "Alternatives for module loading of AudioWorklet" (Blob/data URL workarounds and their limits; accessed 2026-07-06). https://github.com/WebAudio/web-audio-api-v2/issues/109
- Chrome for Developers — "Autoplay policy in Chrome" (2018, updated) and "Web Audio, Autoplay Policy and Games". https://developer.chrome.com/blog/autoplay · https://developer.chrome.com/blog/web-audio-autoplay
- MDN Web Docs — "Autoplay guide for media and Web Audio APIs" (sticky activation, getAutoplayPolicy; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- WebKit Bugzilla — Bug 237878 "AudioContext is suspended on iOS when page is backgrounded"; Bug 263627 "[iOS] AudioContext is not consistently resumed…". https://bugs.webkit.org/show_bug.cgi?id=237878 · https://bugs.webkit.org/show_bug.cgi?id=263627
- MDN Web Docs — "Audio Session API" (navigator.audioSession types incl. "playback"; limited availability; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API
- Matt Montag — "Unlock Web Audio in Safari for iOS and macOS" (gesture unlock, silent-switch behavior), 2020. https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos
- Paul Adenot — "Web Audio API performance and debugging notes" (node costs, GC, profiling; accessed 2026-07-06). https://padenot.github.io/web-audio-perf/
