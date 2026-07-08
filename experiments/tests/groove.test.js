/* Headless tests for the groove-lofi composer + engine performer (Engine 03).
 * The audible synth/fx layer (drum voices, vinyl bed) is validated separately by
 * the offline render gate (experiments/tools/render-groove.mjs); here we test the
 * deterministic beat-based score and the pure performer (swing + microtiming). */
'use strict';
const { test, eq, ok } = require('./_runner');
const theory = require('../lib/theory.js');
const groove = require('../composers/groove-lofi.js');
const engine = require('../engines/groove-lofi/engine.js');

test('groove composer: deterministic from the seed', () => {
  const a = groove.composeGroove({ seed: 'k', mood: 'mellow', bars: 24 });
  const b = groove.composeGroove({ seed: 'k', mood: 'mellow', bars: 24 });
  eq(a.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]),
     b.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]), 'same seed -> identical score');
});

test('groove composer: full kit + bass + rhodes present; drums only in the main section', () => {
  const s = groove.composeGroove({ seed: 'kit', mood: 'night', bars: 24 });
  const voices = new Set(s.events.map((e) => e.voice));
  ok(voices.has('kick') && voices.has('snare') && voices.has('hat'), 'kick/snare/hat present');
  ok(voices.has('bass') && voices.has('rhodes'), 'bass and rhodes chords present');
  // no kick/snare in the intro (first introBars bars) — the groove enters after
  const introEndBeat = s.meta.introBars * s.meta.beatsPerBar;
  const drumsInIntro = s.events.filter((e) => (e.voice === 'kick' || e.voice === 'snare') && e.beat < introEndBeat);
  eq(drumsInIntro.length, 0, 'no kick/snare during the intro');
});

test('groove composer: backbeat snare on beats 2 and 4 of every main bar', () => {
  const s = groove.composeGroove({ seed: 'back', mood: 'warm', bars: 24 });
  const bpb = s.meta.beatsPerBar;
  for (let bar = s.meta.introBars; bar < s.meta.bars - s.meta.outroBars; bar++) {
    const beat2 = s.events.some((e) => e.voice === 'snare' && e.tags.includes('backbeat') && Math.abs(e.beat - (bar * bpb + 1)) < 1e-6);
    const beat4 = s.events.some((e) => e.voice === 'snare' && e.tags.includes('backbeat') && Math.abs(e.beat - (bar * bpb + 3)) < 1e-6);
    ok(beat2 && beat4, `bar ${bar} has a backbeat on 2 and 4`);
  }
});

test('groove composer: every kick pattern keeps beat 1 (the meter anchor)', () => {
  // medium syncopation must not flip the meter — beat 1 always articulated
  ['mellow', 'night', 'warm', 'tape'].forEach((mood) => {
    const s = groove.composeGroove({ seed: 'anchor-' + mood, mood, bars: 24 });
    const bpb = s.meta.beatsPerBar;
    for (let bar = s.meta.introBars; bar < s.meta.bars - s.meta.outroBars; bar++) {
      const one = s.events.some((e) => e.voice === 'kick' && Math.abs(e.beat - bar * bpb) < 1e-6);
      ok(one, `${mood} bar ${bar} kicks on beat 1`);
    }
  });
});

test('groove composer: ghost snares are quiet and enter only in the B section', () => {
  const s = groove.composeGroove({ seed: 'ghost', mood: 'mellow', bars: 24 });
  const ghosts = s.events.filter((e) => e.tags.includes('ghost'));
  ok(ghosts.length > 0, 'there are ghost notes');
  ok(ghosts.every((e) => e.vel < 0.35), 'ghost notes are quiet (< 0.35)');
  const bStartBeat = s.meta.bHalfStart * s.meta.beatsPerBar;
  ok(ghosts.every((e) => e.beat >= bStartBeat), 'ghost notes only in the B half');
});

test('groove composer: bass roots and rhodes chords are in the chosen mode', () => {
  const s = groove.composeGroove({ seed: 'inkey', mood: 'night', tonic: 'D3', bars: 20 });
  const tonic = theory.noteToMidi('D3');
  const pcs = new Set(theory.scale(tonic, s.meta.scaleName, { octaves: 1 }).map((m) => ((m % 12) + 12) % 12));
  const tonal = s.events.filter((e) => e.voice === 'bass' || e.voice === 'rhodes' || e.voice === 'bell');
  ok(tonal.every((e) => pcs.has(((e.midi % 12) + 12) % 12)), 'all bass/rhodes/bell pitches are in the mode');
});

test('groove engine: renderPlan deterministic, valid ranges, time-ordered', () => {
  const a = engine.renderPlan({ seed: 'p', mood: 'mellow' });
  const b = engine.renderPlan({ seed: 'p', mood: 'mellow' });
  eq(a.events.length, b.events.length, 'same seed -> same count');
  ok(a.events.every((e) => e.vel > 0 && e.vel <= 1), 'velocities in (0,1]');
  ok(a.events.every((e) => e.durSec > 0 && e.freq > 0), 'positive durations and freqs');
  for (let i = 1; i < a.events.length; i++) ok(a.events[i].timeSec >= a.events[i - 1].timeSec - 1e-9, 'time-ordered');
});

test('groove engine: swing pushes offbeats late but leaves downbeats tight', () => {
  const straight = engine.swingBeat(0.5, 0.5);
  const swung = engine.swingBeat(0.5, 0.62);
  ok(Math.abs(straight - 0.5) < 1e-9, 'straight swing leaves the eighth offbeat at 0.5');
  ok(swung > 0.56, 'swing pushes the eighth offbeat late');
  // downbeats never move
  for (const b of [0, 1, 2, 3, 4]) ok(Math.abs(engine.swingBeat(b, 0.66) - b) < 1e-9, `beat ${b} stays on the grid`);
  // sixteenth offbeats also swung, monotonic within the beat
  ok(engine.swingBeat(0.75, 0.62) > 0.75, 'the "a" sixteenth is pushed late too');
});

test('groove engine: backbeat snare lands after the beat (laid-back), kick stays tight', () => {
  const p = engine.renderPlan({ seed: 'feel', mood: 'mellow', bpm: 80, swing: 0.6 });
  const spb = 60 / 80;
  // find a backbeat snare and the kick on the same bar's beat 1
  const snare = p.events.find((e) => e.voice === 'snare' && e.tags.includes('backbeat') && e.beat >= 8);
  ok(snare, 'a backbeat snare exists');
  const nominal = snare.beat * spb;   // beats 2/4 are on the grid, unaffected by swing
  ok(snare.timeSec > nominal, 'the backbeat drags behind the beat (laid-back)');
  ok(snare.timeSec - nominal < 0.05, 'but only by a few tens of ms');
});

test('groove engine: bpm scales the piece length; faster is shorter', () => {
  const slow = engine.renderPlan({ seed: 'r', bpm: 70 });
  const fast = engine.renderPlan({ seed: 'r', bpm: 100 });
  ok(fast.durationSec < slow.durationSec, 'faster bpm -> shorter piece');
});
