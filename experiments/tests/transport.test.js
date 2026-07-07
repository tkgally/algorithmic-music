/* Headless tests for lib/transport.js — a fake clock + manual ticks make the
 * lookahead scheduler fully deterministic with no real timers or Web Audio. */
'use strict';
const { test, eq, ok, approx } = require('./_runner');
const { MusicClock, Scheduler } = require('../lib/transport.js');
const { Rng, euclid, onsets } = require('../lib/rng.js');

// ---- MusicClock -----------------------------------------------------------

test('clock: beats<->seconds at 120 bpm', () => {
  const c = new MusicClock({ bpm: 120 });
  approx(c.secondsPerBeat, 0.5, 1e-12, 'spb');
  approx(c.beatsToSeconds(4), 2, 1e-12, '4 beats = 2 s');
  approx(c.secondsToBeats(1), 2, 1e-12, '1 s = 2 beats');
  approx(c.beatsToSeconds(c.secondsToBeats(3.3)), 3.3, 1e-9, 'roundtrip');
});

test('clock: bars and tempo changes', () => {
  const c = new MusicClock({ bpm: 90, beatsPerBar: 3 });
  eq(c.barsToBeats(4), 12, '4 bars * 3 = 12 beats');
  approx(c.beatsToSeconds(3), 2, 1e-12, 'one 3/4 bar at 90bpm = 2 s');
  c.setBpm(180);
  approx(c.secondsPerBeat, 1 / 3, 1e-12, 'tempo change takes effect');
});

// ---- Scheduler: core lookahead behavior -----------------------------------

test('scheduler: fires queued events in order, once each, with their times', () => {
  const clock = { t: 0 };
  const s = new Scheduler({ now: () => clock.t, lookahead: 0.1 });
  const fired = [];
  s.onSchedule((data, time) => fired.push([data.n, time]));
  s.push(0.05, { n: 'a' });
  s.push(0.12, { n: 'b' });
  s.push(0.20, { n: 'c' });
  s.push(0.33, { n: 'd' });

  s.tick();               // horizon 0.10 -> a
  clock.t = 0.05; s.tick(); // horizon 0.15 -> b
  clock.t = 0.15; s.tick(); // horizon 0.25 -> c
  clock.t = 0.30; s.tick(); // horizon 0.40 -> d

  eq(fired, [['a', 0.05], ['b', 0.12], ['c', 0.20], ['d', 0.33]], 'order + times');
  eq(s.pending, 0, 'queue drained');
});

test('scheduler: never fires an event before it enters the lookahead window', () => {
  const clock = { t: 0 };
  const s = new Scheduler({ now: () => clock.t, lookahead: 0.1 });
  let fired = false;
  s.onSchedule(() => { fired = true; });
  s.push(0.5, {});
  for (let i = 0; i < 4; i++) { s.tick(); clock.t += 0.09; } // t up to ~0.36
  ok(!fired, 'event at 0.5 must not fire while horizon < 0.5 (t<0.4)');
  clock.t = 0.41; s.tick(); // horizon 0.51 > 0.5
  ok(fired, 'event fires once horizon passes it');
});

test('scheduler: fired times are always >= now and < now+lookahead at fire', () => {
  const clock = { t: 0 };
  const look = 0.1;
  const s = new Scheduler({ now: () => clock.t, lookahead: look });
  const violations = [];
  s.onSchedule((_d, time) => {
    if (!(time >= clock.t - 1e-9 && time < clock.t + look + 1e-9)) violations.push([time, clock.t]);
  });
  for (let i = 0; i < 50; i++) s.push(i * 0.037, { i });
  for (let step = 0; step < 60; step++) { s.tick(); clock.t += 0.03; }
  eq(violations, [], 'every fire time inside its window');
  eq(s.pending, 0, 'all 50 events fired');
});

test('scheduler: onRefill drives an open-ended sequence lazily', () => {
  const clock = { t: 0 };
  const s = new Scheduler({ now: () => clock.t, lookahead: 0.1 });
  const spacing = 0.25;
  let nextBeat = 0;
  const fired = [];
  s.onSchedule((data, time) => fired.push(time));
  s.onRefill((until) => {
    while (nextBeat * spacing < until) { s.push(nextBeat * spacing, { beat: nextBeat }); nextBeat++; }
  });
  // advance ~2 seconds of transport in 0.05 s steps
  for (let step = 0; step <= 40; step++) { s.tick(); clock.t = step * 0.05; }
  // expect beats at 0,0.25,...,2.0 (9 of them within reach), strictly increasing
  ok(fired.length >= 8, `expected >=8 beats, got ${fired.length}`);
  for (let i = 1; i < fired.length; i++) ok(fired[i] > fired[i - 1], 'monotonic beat times');
  for (let i = 0; i < fired.length; i++) approx(fired[i], i * spacing, 1e-9, `beat ${i}`);
  // no beat scheduled far beyond the lookahead horizon
  ok(nextBeat * spacing <= clock.t + 0.1 + spacing, 'refill stays ~one lookahead ahead');
});

test('scheduler: start/stop wire to an injected timer and stop halts ticks', () => {
  const clock = { t: 0 };
  let armed = null;                 // last scheduled loop callback
  const s = new Scheduler({
    now: () => clock.t,
    setTimer: (fn) => { armed = fn; return 1; },
    clearTimer: () => { armed = null; },
    lookahead: 0.1,
  });
  const fired = [];
  s.onSchedule((d) => fired.push(d.n));
  s.push(0.01, { n: 1 });
  s.push(0.15, { n: 2 });           // outside the initial 0.1 window
  s.start();                        // immediate tick fires n=1 only (0.01<0.1)
  eq(fired, [1], 'first tick on start fires only what is in the window');
  clock.t = 0.08; armed();          // next tick: horizon 0.18 -> fires n=2
  eq(fired, [1, 2], 'second tick via armed timer');
  s.stop();
  s.push(0.20, { n: 3 });
  if (armed) armed();               // should be a no-op after stop
  eq(fired, [1, 2], 'no ticks after stop');
});

// ---- Integration: the foundation trio together ----------------------------

test('integration: clock + euclid + rng schedule one bar of a timeline', () => {
  const clock = new MusicClock({ bpm: 120, beatsPerBar: 4 }); // 2 s/bar, 16th = 0.125 s
  const rng = new Rng('demo').stream('drums');
  const steps = 16;
  const pattern = euclid(5, steps);          // cinquillo-length spread over 16
  const stepSeconds = clock.beatsToSeconds(clock.beatsPerBar) / steps; // 0.125
  const scheduled = [];
  const fakeClk = { t: 0 };
  const s = new Scheduler({ now: () => fakeClk.t, lookahead: 0.2 });
  s.onSchedule((data, time) => scheduled.push({ time, vel: data.vel }));
  for (const i of onsets(pattern)) {
    s.push(i * stepSeconds, { vel: rng.float(0.6, 1.0) });
  }
  // drain the whole bar
  for (let step = 0; step <= 20; step++) { s.tick(); fakeClk.t = step * 0.125; }

  eq(scheduled.length, 5, 'five onsets scheduled');
  // times must land exactly on the euclid step grid
  const expected = onsets(pattern).map((i) => i * stepSeconds);
  eq(scheduled.map((x) => x.time), expected, 'onset times on the grid');
  ok(scheduled.every((x) => x.vel >= 0.6 && x.vel < 1.0), 'velocities in range');
  // determinism: same seed reproduces identical velocities
  const rng2 = new Rng('demo').stream('drums');
  eq(scheduled.map((x) => x.vel), onsets(pattern).map(() => rng2.float(0.6, 1.0)),
     'velocity stream reproducible from seed');
});
