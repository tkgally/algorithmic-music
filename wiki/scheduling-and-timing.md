---
title: Scheduling and timing
tags: [implementation]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: How to schedule notes sample-accurately from JavaScript — the two-clock problem, the lookahead pattern, hidden-tab throttling, tempo maps, latency compensation, and long-session stability.
---

# Scheduling and timing

A generative engine composes on the JavaScript event loop but must place sounds on the audio hardware clock, and the two disagree: JS callbacks jitter by tens of milliseconds while listeners hear rhythm errors well under ten. The universal solution — Chris Wilson's lookahead scheduler — is a solved problem this project inherits from its [previous experiments](previous-experiments-lessons.md), but the parameters must be chosen deliberately, because browser tab throttling, tempo changes, latency compensation, and multi-hour sessions all stress it in different ways. This page is the reference for getting all of that right in one loop.

## The two clocks

- **`ctx.currentTime`** (the audio clock): a double, in seconds, advanced by the audio rendering thread in render-quantum increments. It is the timeline every `start(t)`, `stop(t)`, and AudioParam event uses, it is steady, and it never waits for the main thread.
- **The event-loop clock** (`setTimeout`/`setInterval`, `performance.now()`): callbacks run when the main thread gets around to them. Layout, GC, and other tabs skew them "by tens of milliseconds or more" (Wilson). `performance.now()` *reads* accurately, but you cannot *act* at a precise moment with it.

Naive sequencing — `setTimeout(playNote, msPerBeat)` chained per note, starting each sound "now" — drifts and jitters: each callback's lateness becomes permanent (delays accumulate in chained timers, and Chrome clamps chained timers to ≥4 ms even in the foreground), and every wobble lands directly on a note onset. The fix is to stop performing on the JS clock and use it only as a coarse wake-up to *plan ahead* on the audio clock.

## The lookahead pattern

A timer wakes every `interval` ms; each wake schedules **every event whose time falls within the next `horizon` seconds**, using exact audio-clock timestamps. Correctness requires only `horizon > worst-case gap between wakes` — the timer can be sloppy because the audio thread executes what was scheduled with sample accuracy.

```js
let step = 0;                                  // integer musical position (16ths)
let nextTime = 0;                              // audio-clock time of `step`

function tick() {
  const until = ctx.currentTime + horizon();
  while (nextTime < until) {
    scheduleStep(step, nextTime);              // builds nodes: osc.start(nextTime)…
    nextTime += (60 / bpm) / 4;                // reads bpm live: tempo picks up next step
    step += 1;
  }
}
tick();                                        // schedule the first batch immediately
const timer = setInterval(tick, intervalMs);
```

Wilson's interactive tuning: `interval` ≈ 25 ms, `horizon` ≈ 100 ms — snappy for a drum machine whose controls must feel immediate (IRCAM's tutorial teaches 100 ms / 150 ms; the invariant `interval < horizon` matters more than the numbers). This project's ambient engines instead ran `interval` 250–500 ms with a **6 s horizon, widened to 12 s when hidden** — see throttling below. Two further rules: make `tick()` idempotent-safe by scheduling strictly from state (`step`/`nextTime`), never from "time since last tick"; and on `play()`, set `nextTime = ctx.currentTime + 0.1` so the first notes are not already in the past (past-time events fire immediately, bunching into a splat).

## Hidden-tab throttling — why the horizon grows

Chrome's documented policy (Chrome 88+): a **visible page, or one that has made sound within the last 30 s**, gets minimal throttling. A hidden, silent page has timers clamped to ~1 per second; after 5 minutes hidden (with chained timers ≥ 5 deep, silent ≥ 30 s, no WebRTC) it drops to **intensive throttling: one timer wake per minute**. "A silent audio track doesn't count" — the exemption follows *actual audible output*, indicated by the tab's audio icon. Firefox and WebKit apply their own (roughly 1 s) background clamps.

Consequences for a music engine, which by definition lives in background tabs ([attention-and-background-listening](attention-and-background-listening.md)):

- While audibly playing, you are exempt from the harsh modes — but do not cut it fine. A 6 s visible / 12 s hidden horizon tolerates 1 s wakes with an order-of-magnitude margin, and survives the occasional multi-second stall (heavy GC, laptop lid events).
- The dangerous state is **hidden and silent**: a piece that fades to niente for 30+ s while hidden can fall into 1-minute wakes, and no sub-minute horizon survives that. Either keep an always-audible bed (the previous experiments' choice), or detect impending silence and pre-schedule past it (schedule the re-entry before going quiet), or accept that pauses end the exemption and re-arm on `visibilitychange`.
- Audio already scheduled is unaffected by throttling — only your *scheduler* stalls. Audio-rate modulation (oscillator LFOs into AudioParams) also keeps running when timers cannot; prefer it over `setInterval`-driven parameter wiggling for anything that must breathe while hidden.
- A dedicated Web Worker's timers historically escape visibility clamping (Wilson's own metronome demo moved its tick into a Worker). Useful belt-and-suspenders, but treat it as an optimization, not the safety mechanism — the generous horizon is the safety mechanism. Verify current Worker-throttling behavior when adopting.

Handle the visible↔hidden transition by re-ticking on `visibilitychange` (widening the horizon immediately, not one interval later).

## Beats are the source of truth, not seconds

Keep the musical position as an **integer tick counter** (e.g., 480 ticks/quarter, or 16th-note steps for simple engines) and derive clock time through a tempo map. Reasons: doubles make raw `currentTime` precision a non-issue for weeks, but repeatedly adding non-binary fractions (triplet durations, swung offsets, 60/97.3 s beats) accumulates rounding drift relative to the notated grid over hours; integer positions keep bar math, swing, polymeter, and section boundaries exact; and a beat-indexed score is what [expressive-performance](expressive-performance.md) rules and evaluation need anyway. Never store absolute times in `Float32Array`s — float32 resolution is already ~0.24 ms at the 1-hour mark and grows linearly (~1 ms by 4 hours, ~4 ms by 10 hours).

```js
const tempoMap = [ { tick: 0, bpm: 96 }, { tick: 4 * 480 * 16, bpm: 108 } ];   // piecewise constant
let anchorTime = 0;                            // audio time of tick 0
function tickToTime(tick) {
  let t = anchorTime, prev = tempoMap[0];
  for (const seg of tempoMap.slice(1)) {
    if (tick <= seg.tick) break;
    t += ((seg.tick - prev.tick) / 480) * (60 / prev.bpm);
    prev = seg;
  }
  return t + ((tick - prev.tick) / 480) * (60 / prev.bpm);
}
```

**Tempo changes:** with the incremental `nextTime += beatDur` loop, a bpm change simply applies from the next scheduled step — within one horizon, no rescheduling (Wilson's design). For *continuous* tempo curves (ritardandi — see [expressive-performance](expressive-performance.md)), time is the integral of `60/bpm(beat)`; in practice, slice the curve into per-tick constant segments and let the map above do the sum — closed-form integration is only worth it for offline rendering. Cache cumulative segment times if the map grows long.

## Horizon versus responsiveness

A long horizon is stability; a short one is responsiveness. When the user (or the composer brain) changes something, events up to `horizon` seconds away are already committed. Reconciliation patterns, in increasing order of effort:

1. **Let it ride** — parameter changes apply from the next unscheduled step (≤ horizon late). Fine for ambient evolution; the previous experiments shipped this.
2. **Smooth params bypass the scheduler** — mix levels, filter macros, master dynamics go straight to AudioParams via `setTargetAtTime(now)`; only *note choice* waits for the horizon. This split (immediate continuous control, quantized structural control) is the pattern to generalize.
3. **Cancel-and-reschedule** — keep a registry of scheduled-but-unsounded events `{ time, nodes, params }`; on structural change: `stop()` unstarted sources, `cancelScheduledValues` on touched params (mind the snap-back clicks — [web-audio-fundamentals](web-audio-fundamentals.md)), drop registry entries with `time > now + ε`, reset `step/nextTime` to the next beat, re-tick. Required for anything that must feel instrumental; also lets different layers run different horizons (long for beds, ~0.2 s for an interactive lead).

## Latency: what "now" means to the ear

`currentTime` is where the *renderer* is, not what the ear hears. Two read-only properties decompose the gap: `baseLatency` (graph output → OS audio subsystem, typically a few ms) and `outputLatency` (subsystem → transducer; ~10–30 ms on desktop speakers, potentially 100–250 ms on Bluetooth). `outputLatency` only became Baseline in March 2025 — feature-detect and fall back to `baseLatency` or 0.

For visuals synced to audio (playheads, pulsing UI), draw against the *heard* position:

```js
function heardNow() {
  const ts = ctx.getOutputTimestamp?.();
  if (ts && ts.contextTime !== undefined) return ts.contextTime;
  return ctx.currentTime - (ctx.baseLatency || 0) - (ctx.outputLatency || 0);
}
requestAnimationFrame(function draw() {
  paintPlayhead(heardNow());                   // compare against scheduled note times
  requestAnimationFrame(draw);
});
```

`requestAnimationFrame` stops entirely in hidden tabs — correct behavior (no visuals needed), and another reason visuals must never drive scheduling. Latency compensation matters in the other direction too: audible response to a UI gesture can only start at `currentTime + ~baseLatency`; do not fight it, just avoid *adding* scheduler latency by keeping the interactive layer's horizon short.

## Long-session stability

Multi-hour sessions surface slow failure modes:

- **Suspend/resume gaps:** `currentTime` freezes while suspended (and `suspend()` on pause is good battery citizenship). Recompute `anchorTime`/`nextTime` from `currentTime` on every resume rather than trusting stored absolute times; track elapsed *musical* time separately from wall time.
- **Drift-free grids:** derive every event time from the integer position via the tempo map (or the single accumulating `nextTime` double); never re-measure the grid from `performance.now()` or `Date.now()`, which do not share the audio clock's timebase.
- **Registry hygiene:** prune the scheduled-event registry as events pass; an append-only array is the classic slow leak ([audio-worklets-and-performance](audio-worklets-and-performance.md)).
- **Wake-from-sleep:** after OS sleep, expect a `statechange` (and on iOS an interruption); re-anchor and re-tick rather than fast-forwarding through hours of "missed" steps — clamp `step` forward to the present.

## Implications for generative engines

- **Do** run one lookahead scheduler per engine: `setInterval` 250–500 ms, horizon ≥ 6 s, ≥ 12 s hidden; re-tick on `visibilitychange`.
- **Do** keep integer tick counters as truth; derive seconds via a tempo map; anchor to `currentTime` at play/resume.
- **Do** route continuous controls directly to AudioParams (`setTargetAtTime`) and structural changes through the scheduler; use audio-rate LFOs for anything that must move while hidden.
- **Do** keep an audible bed (or pre-scheduled re-entry) so a hidden tab never sits silent > 30 s, which forfeits the throttling exemption.
- **Do** compensate visuals with `getOutputTimestamp`/latency properties, feature-detected.
- **Don't** chain `setTimeout` per note, start sounds at "now", schedule from wall-clock deltas, or let the first batch land in the past.
- **Don't** assume the tab is foreground, the machine is fast, or that a 100 ms horizon survives a background tab — test hidden, throttled, and on battery.

## Open questions

- Exact 2026 Worker-timer throttling behavior across Chrome/Firefox/Safari — worth a small empirical test page before relying on it.
- Best cancel-and-reschedule granularity for a future interactive "conductor" layer: per-note registry vs. per-bar subgraph teardown (relates to [engine-architecture](engine-architecture.md)).
- Whether `latencyHint: "playback"`'s larger buffers measurably improve hidden-tab glitch rates on low-end hardware.

## Related pages

- [web-audio-fundamentals](web-audio-fundamentals.md) — the param-automation rules this scheduling relies on
- [engine-architecture](engine-architecture.md) — where the scheduler sits among composer/performer/synthesis layers
- [audio-worklets-and-performance](audio-worklets-and-performance.md) — render-thread timing, glitch budgets, mobile lifecycle
- [expressive-performance](expressive-performance.md) — tempo curves and micro-timing this machinery must support
- [groove-and-embodiment](groove-and-embodiment.md) — why milliseconds of onset error are audible
- [previous-experiments-lessons](previous-experiments-lessons.md) — the 6 s/12 s pattern in past engines
- [shared-libraries](shared-libraries.md), [findings-shared-lib-foundation](findings-shared-lib-foundation.md) — the first-party `transport` library this page specifies, now prototyped and headless-tested

## Sources

- Chris Wilson — "A Tale of Two Clocks: Scheduling Web Audio with Precision", web.dev, 2013 (still the canonical treatment; accessed 2026-07-06). https://web.dev/articles/audio-scheduling
- Chrome for Developers — "Heavy throttling of chained JS timers beginning in Chrome 88", 2021 (minimal/1 s/1 min tiers, 30 s audio-exemption rule; accessed 2026-07-06). https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- Chrome for Developers — "Background tabs in Chrome 57", 2017 (audible tabs treated as user-visible/foreground; accessed 2026-07-06). https://developer.chrome.com/blog/background_tabs
- MDN Web Docs — "Advanced techniques: creating and sequencing audio" (lookahead sequencer reference implementation; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
- IRCAM ISMM — "Timing and Scheduling", Web Audio tutorials (lookahead/period invariant; accessed 2026-07-06). https://ircam-ismm.github.io/webaudio-tutorials/scheduling/timing-and-scheduling.html
- MDN Web Docs — "AudioContext.outputLatency" (definition; Baseline newly available 2025-03; accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
