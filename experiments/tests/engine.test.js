/* Headless tests for the tonal-classical engine's PURE performer (renderPlan):
 * beats -> seconds, dynamics, and the closing ritardando. The audible synth/fx
 * layer is validated separately by experiments/tools/render-engine.mjs (it needs
 * a real/offline AudioContext); here we test the deterministic timing/dynamics
 * math that both live playback and the offline render depend on. */
'use strict';
const { test, eq, ok } = require('./_runner');
const engine = require('../engines/tonal-classical/engine.js');

test('engine: renderPlan is deterministic and emits one timed event per composed note', () => {
  const a = engine.renderPlan({ seed: 'p', bpm: 92, tonic: 'C4' });
  const b = engine.renderPlan({ seed: 'p', bpm: 92, tonic: 'C4' });
  eq(a.events.length, b.events.length, 'same seed -> same event count');
  eq(a.events.map((e) => [e.timeSec.toFixed(6), e.midi, e.vel.toFixed(6)]),
     b.events.map((e) => [e.timeSec.toFixed(6), e.midi, e.vel.toFixed(6)]), 'same seed -> identical performance');
  eq(a.events.length, a.notes.length, 'one performance event per note');
});

test('engine: events are time-ordered, velocities in (0,1], durations positive', () => {
  const p = engine.renderPlan({ seed: 'q', bpm: 100, mode: 'minor', tonic: 'A3' });
  for (let i = 1; i < p.events.length; i++) ok(p.events[i].timeSec >= p.events[i - 1].timeSec - 1e-9, 'time-ordered');
  ok(p.events.every((e) => e.vel > 0 && e.vel <= 1), 'velocities in (0,1]');
  ok(p.events.every((e) => e.durSec > 0), 'durations positive');
  ok(p.events.every((e) => e.freq > 0), 'frequencies positive');
});

test('engine: tempo controls duration; a higher bpm makes a shorter piece', () => {
  const slow = engine.renderPlan({ seed: 'r', bpm: 72 });
  const fast = engine.renderPlan({ seed: 'r', bpm: 120 });
  ok(fast.durationSec < slow.durationSec, 'faster tempo -> shorter piece');
});

test('engine: there is a closing ritardando — the final beats are stretched', () => {
  const b2s = engine.makeBeatToSec(96, 120, 0.3);
  const earlySpan = b2s(16) - b2s(8);   // 8 beats early in the piece
  const lateSpan = b2s(120) - b2s(112); // the final 8 beats
  ok(lateSpan > earlySpan * 1.08, `final 8 beats (${lateSpan.toFixed(2)}s) slower than an early 8 (${earlySpan.toFixed(2)}s)`);
});

test('engine: dynamics follow the form — the A′ climax is louder on average than the intro', () => {
  const p = engine.renderPlan({ seed: 'dyn', tonic: 'C4' });
  const bar = (e) => Math.floor(e.beat / 4);
  const introVel = p.events.filter((e) => bar(e) < 2 && e.voice === 'chord').map((e) => e.vel);
  const climaxVel = p.events.filter((e) => bar(e) >= 18 && bar(e) < 26 && e.voice === 'melody').map((e) => e.vel);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  ok(mean(climaxVel) > mean(introVel), 'A′ melody is louder than the intro pad');
});

test('engine: name/version are exposed for URL state and reproducibility', () => {
  const p = engine.renderPlan({ seed: 's' });
  eq(p.name, 'tonal-classical', 'engine name');
  ok(/^\d+\.\d+\.\d+$/.test(p.version), 'semver version');
});
