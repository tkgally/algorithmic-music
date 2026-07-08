/* Headless tests for the ambient-drift composer + engine performer (Engine 02).
 * The audible synth/fx layer is validated separately by the offline render gate
 * (experiments/tools/render-ambient.mjs); here we test the deterministic,
 * seconds-based score and the pure performer. */
'use strict';
const { test, eq, ok } = require('./_runner');
const theory = require('../lib/theory.js');
const drift = require('../composers/ambient-drift.js');
const engine = require('../engines/ambient-drift/engine.js');

test('ambient composer: deterministic from the seed', () => {
  const a = drift.composeDrift({ seed: 'k', palette: 'warm', tonic: 'D3', durationSec: 150 });
  const b = drift.composeDrift({ seed: 'k', palette: 'warm', tonic: 'D3', durationSec: 150 });
  eq(a.events.map((e) => [e.t.toFixed(4), e.midi, e.voice]),
     b.events.map((e) => [e.t.toFixed(4), e.midi, e.voice]), 'same seed -> identical score');
});

test('ambient composer: covers the duration with drone/pad/bell, regions tile', () => {
  const s = drift.composeDrift({ seed: 'cover', palette: 'open', tonic: 'D3', durationSec: 150 });
  const voices = new Set(s.events.map((e) => e.voice));
  ok(voices.has('drone') && voices.has('pad') && voices.has('bell'), 'all three ambient voices present');
  ok(s.regions.length >= 3, 'several harmonic regions');
  // regions tile without a gap larger than one region
  for (let i = 1; i < s.regions.length; i++) ok(s.regions[i].startSec <= s.regions[i - 1].endSec + 0.01, 'regions are contiguous');
  const last = s.events.reduce((m, e) => Math.max(m, e.t), 0);
  ok(last > 150 * 0.6, 'events populate most of the duration');
});

test('ambient composer: bell loops are incommensurable (distinct, non-integer-ratio periods)', () => {
  const s = drift.composeDrift({ seed: 'loops', palette: 'warm', tonic: 'D3', durationSec: 150 });
  const periods = s.loops.map((l) => l.periodSec);
  ok(new Set(periods).size === periods.length, 'all loop periods distinct');
  // no two periods in a small integer ratio (would resync quickly)
  for (let i = 0; i < periods.length; i++) for (let j = i + 1; j < periods.length; j++) {
    const r = periods[i] / periods[j];
    for (let n = 1; n <= 3; n++) for (let d = 1; d <= 3; d++) {
      if (n === d) continue;
      ok(Math.abs(r - n / d) > 0.03, `periods ${periods[i]}/${periods[j]} not near a ${n}:${d} ratio`);
    }
  }
});

test('ambient composer: every pitch is in the chosen mode', () => {
  const s = drift.composeDrift({ seed: 'inkey', palette: 'shadow', tonic: 'A2', durationSec: 120 });
  const tonic = theory.noteToMidi('A2');
  const pcs = new Set(theory.scale(tonic, s.meta.scaleName).map((m) => ((m % 12) + 12) % 12));
  // drone/bell are single mode tones; pad adds stacked fifths/octaves (root+7/+12
  // are consonant but need not be scale members) — so check drone + bell here.
  const melodic = s.events.filter((e) => e.voice === 'bell' || e.voice === 'drone');
  ok(melodic.every((e) => pcs.has(((e.midi % 12) + 12) % 12)), 'all bell/drone pitches are in the mode');
});

test('ambient engine: renderPlan is deterministic, one event per note, valid ranges', () => {
  const a = engine.renderPlan({ seed: 'p', palette: 'warm', tonic: 'D3' });
  const b = engine.renderPlan({ seed: 'p', palette: 'warm', tonic: 'D3' });
  eq(a.events.length, b.events.length, 'same seed -> same count');
  ok(a.events.every((e) => e.vel > 0 && e.vel <= 1), 'velocities in (0,1]');
  ok(a.events.every((e) => e.durSec > 0 && e.freq > 0), 'positive durations and freqs');
  for (let i = 1; i < a.events.length; i++) ok(a.events[i].timeSec >= a.events[i - 1].timeSec - 1e-9, 'time-ordered');
});

test('ambient engine: pace scales the piece length; higher pace is shorter', () => {
  const slow = engine.renderPlan({ seed: 'r', pace: 0.8 });
  const fast = engine.renderPlan({ seed: 'r', pace: 1.5 });
  ok(fast.durationSec < slow.durationSec, 'faster pace -> shorter piece');
});

test('ambient engine: a global swell — the opening emerges from near-silence', () => {
  const p = engine.renderPlan({ seed: 'swell', palette: 'calm', tonic: 'C3', durationSec: 150 });
  const pad = p.events.filter((e) => e.voice === 'pad');
  const early = pad.filter((e) => e.timeSec < 4);
  const mid = pad.filter((e) => e.timeSec > 50 && e.timeSec < 100);
  const mean = (a) => a.reduce((x, e) => x + e.vel, 0) / (a.length || 1);
  ok(early.length && mid.length && mean(early) < mean(mid) * 0.7, 'opening pads quieter than mid-piece (fade-in)');
});
