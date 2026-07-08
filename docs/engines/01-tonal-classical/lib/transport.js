/*
 * transport — musical-time clock + lookahead note scheduler.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md). Original code reimplementing a published,
 * general pattern: Chris Wilson's "two clocks" lookahead scheduling ("A Tale of
 * Two Clocks", 2013 — see wiki/scheduling-and-timing.md). No source is copied.
 *
 * The problem it solves (wiki/scheduling-and-timing.md): JavaScript timers are
 * coarse and jittery (throttled in background tabs), but Web Audio events are
 * sample-accurate IF you give them an absolute time on the audio clock. So a
 * coarse timer wakes every ~25 ms and schedules every note falling inside a
 * short (~100 ms) lookahead window, handing each note its exact audio-clock
 * time. The timer only has to be "close enough" to keep the window fed.
 *
 * Dependencies are INJECTED (now/setTimer/clearTimer) so the identical code:
 *   - runs headless in Node with a fake clock + manual ticks (deterministic
 *     unit tests, no real timers, no Web Audio), and
 *   - drives a real AudioContext in the browser with
 *       now = () => ctx.currentTime, setTimer = setTimeout.
 *
 * Dual-format (UMD-lite), same rationale as rng.js:
 *   - Node/dev:  const { MusicClock, Scheduler } = require('./transport.js');
 *   - Browser:   <script src="transport.js"></script> -> window.AM.transport.*
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.transport = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- MusicClock: pure beats <-> seconds ----------------------------------
  // Constant tempo keeps the prototype small and fully pure. A piecewise tempo
  // map (accelerando/ritardando, sudden tempo changes) is a documented
  // extension: store [{beat, bpm}] segments and integrate across them. Not
  // needed to prove the scheduler, and the launch engines start at fixed tempo.
  class MusicClock {
    constructor({ bpm = 120, beatsPerBar = 4 } = {}) {
      this.bpm = bpm;
      this.beatsPerBar = beatsPerBar;
    }
    get secondsPerBeat() { return 60 / this.bpm; }
    beatsToSeconds(beats) { return beats * this.secondsPerBeat; }
    secondsToBeats(seconds) { return seconds / this.secondsPerBeat; }
    barsToBeats(bars) { return bars * this.beatsPerBar; }
    beatsToBars(beats) { return beats / this.beatsPerBar; }
    setBpm(bpm) { this.bpm = bpm; return this; }
  }

  // ---- Scheduler: lookahead ("two clocks") ---------------------------------
  class Scheduler {
    constructor({
      now,
      setTimer = (fn, ms) => setTimeout(fn, ms),
      clearTimer = (id) => clearTimeout(id),
      lookahead = 0.1,   // seconds scheduled ahead on the audio clock
      interval = 0.025,  // seconds between timer wakeups (25 ms)
    } = {}) {
      if (typeof now !== 'function') {
        throw new Error('Scheduler requires now() (e.g. () => audioCtx.currentTime)');
      }
      this._now = now;
      this._setTimer = setTimer;
      this._clearTimer = clearTimer;
      this.lookahead = lookahead;
      this.interval = interval;
      this._queue = [];        // events sorted ascending by time
      this._onSchedule = null;
      this._refill = null;
      this._timerId = null;
      this._running = false;
    }

    /** Callback for each due event: (data, time) => {}. `time` is audio-clock. */
    onSchedule(fn) { this._onSchedule = fn; return this; }

    /**
     * Optional producer for open-ended sequences: called each tick as
     * refill(untilTime); push events up to untilTime from inside it. Lets the
     * generator stay lazy (only ever a lookahead ahead) instead of materializing
     * an infinite score up front.
     */
    onRefill(fn) { this._refill = fn; return this; }

    /** Queue one event at absolute audio-clock `time`. Kept sorted. */
    push(time, data) {
      let i = this._queue.length;
      while (i > 0 && this._queue[i - 1].time > time) i--;
      this._queue.splice(i, 0, { time, data });
      return this;
    }

    /**
     * One scheduling step: fire every queued event whose time is within the
     * lookahead window [now, now + lookahead). Public so tests can drive it
     * deterministically with a fake clock and no real timer.
     */
    tick() {
      const horizon = this._now() + this.lookahead;
      if (this._refill) this._refill(horizon);
      while (this._queue.length && this._queue[0].time < horizon) {
        const e = this._queue.shift();
        if (this._onSchedule) this._onSchedule(e.data, e.time);
      }
    }

    /** Start the coarse timer loop. */
    start() {
      if (this._running) return this;
      this._running = true;
      const loop = () => {
        if (!this._running) return;
        this.tick();
        this._timerId = this._setTimer(loop, this.interval * 1000);
      };
      loop();
      return this;
    }

    /** Stop the timer loop. Queued-but-unfired events remain queued. */
    stop() {
      this._running = false;
      if (this._timerId != null) this._clearTimer(this._timerId);
      this._timerId = null;
      return this;
    }

    get running() { return this._running; }
    get pending() { return this._queue.length; }
  }

  return { MusicClock, Scheduler };
});
