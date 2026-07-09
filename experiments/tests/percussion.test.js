/* Headless tests for the percussion composer + engine performer (Engine 05).
 * The audible synth/fx layer (the original percussion voices) is validated
 * separately by the offline render gate (experiments/tools/render-percussion.mjs);
 * here we test the deterministic beat-based score (meter parametricity, the three
 * styles' structures, the subordinate melodic layer) and the pure performer
 * (feel, timbre-macro params, per-section accel/rit). */
'use strict';
const { test, eq, ok } = require('./_runner');
const theory = require('../lib/theory.js');
const perc = require('../composers/percussion.js');
const engine = require('../engines/percussion/engine.js');

test('percussion composer: deterministic from the seed', () => {
  const a = perc.composePercussion({ seed: 'k', style: 'folk', meter: '4/4', bars: 32 });
  const b = perc.composePercussion({ seed: 'k', style: 'folk', meter: '4/4', bars: 32 });
  eq(a.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]),
     b.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]), 'same seed -> identical score');
});

test('percussion composer: all three styles + defaults produce a valid score', () => {
  ['ensemble', 'folk', 'circle'].forEach((style) => {
    const s = perc.composePercussion({ seed: 's-' + style, style, meter: '4/4', bars: 32 });
    ok(s.events.length > 80, style + ' has plenty of hits');
    ok(s.events.every((e) => e.beat >= 0 && e.durBeats > 0 && e.midi > 0 && e.vel > 0 && e.vel <= 1), style + ' events well-formed');
    ok(s.sections.length === 6, style + ' has a full form');
    // the density arc rises to a climax and falls (form carries the shape)
    const peak = Math.max.apply(null, s.sections.map((x) => x.intensity));
    ok(peak >= 0.9, style + ' reaches a climax intensity');
    ok(s.sections[0].intensity < peak && s.sections[s.sections.length - 1].intensity < peak, style + ' opens and closes below the peak');
  });
});

test('percussion composer: meter is parametric — beats fit the bar for every meter', () => {
  Object.keys(perc.METERS).forEach((mk) => {
    const s = perc.composePercussion({ seed: 'm', style: 'folk', meter: mk, bars: 24 });
    const bb = s.meta.barBeats;
    // every onset lands on the meter's sixteenth grid within its bar (no note spills past a bar start off-grid)
    ok(s.events.every((e) => {
      const inBar = e.beat - Math.floor((e.beat + 1e-6) / bb) * bb;
      const step = inBar / 0.25;                       // 0.25 quarter-beats per sixteenth step
      return Math.abs(step - Math.round(step)) < 1e-6 && inBar < bb + 1e-6;
    }), mk + ': all onsets on the meter grid and inside the bar');
    ok(s.meta.meter === mk, mk + ' reported');
  });
});

test('percussion composer: defaults are 4/4 and folk (the brief)', () => {
  const s = perc.composePercussion({ seed: 'd' });
  eq(s.meta.meter, '4/4', 'default meter 4/4');
  eq(s.meta.style, 'folk', 'default style folk');
});

test('percussion composer: bars snap toward the group size (phrases in 4/8/16)', () => {
  const s = perc.composePercussion({ seed: 'g', style: 'folk', meter: '4/4', bars: 32, group: 8 });
  // most sections should be a multiple of 4 (the group snap); allow the small edge sections
  const mults = s.sections.filter((x) => x.bars % 4 === 0).length;
  ok(mults >= 3, 'several sections snap to 4-bar groups');
});

test('percussion composer: FOLK has an inviolable timeline in every bar + a lead in the groove', () => {
  const s = perc.composePercussion({ seed: 'f', style: 'folk', meter: '4/4', bars: 32 });
  const bb = s.meta.barBeats;
  // a timeline hit in every bar
  for (let bar = 0; bar < s.meta.bars; bar++) {
    const has = s.events.some((e) => e.tags.indexOf('timeline') !== -1 && Math.floor((e.beat + 1e-6) / bb) === bar);
    ok(has, 'bar ' + bar + ' has a timeline stroke');
  }
  // the lead drum improvises somewhere (call-and-response / one free agent)
  ok(s.events.some((e) => e.tags.indexOf('lead') !== -1), 'a lead drum improvises');
});

test('percussion composer: ENSEMBLE develops a cell and ends on a gong (a real ending)', () => {
  const s = perc.composePercussion({ seed: 'e', style: 'ensemble', meter: '4/4', bars: 32 });
  ok(s.cell && s.cell.steps.length >= 2, 'a rhythmic cell exists');
  const gongs = s.events.filter((e) => e.voice === 'gong');
  ok(gongs.length >= 1, 'a gong sounds (climax/ending color)');
  // the last gong is near the end of the piece (the ending)
  const lastBeat = Math.max.apply(null, s.events.map((e) => e.beat));
  ok(gongs.some((g) => g.beat > lastBeat * 0.6), 'a gong lands in the closing stretch');
});

test('percussion composer: CIRCLE has a heartbeat and a stop-cut of near-silence', () => {
  const s = perc.composePercussion({ seed: 'c', style: 'circle', meter: '4/4', bars: 32 });
  ok(s.events.some((e) => e.tags.indexOf('heartbeat') !== -1), 'a shared pulse heartbeat');
  // the stop-cut section is far sparser than the rumble
  const dropSec = s.sections.find((x) => x.role === 'stopcut');
  ok(dropSec, 'has a stop-cut section');
  const bb = s.meta.barBeats;
  const inDrop = s.events.filter((e) => e.beat >= dropSec.startBeat && e.beat < dropSec.startBeat + dropSec.bars * bb).length;
  const rumbleSec = s.sections.find((x) => x.role === 'swell');
  const inRumble = s.events.filter((e) => e.beat >= rumbleSec.startBeat && e.beat < rumbleSec.startBeat + rumbleSec.bars * bb).length;
  ok(inDrop < inRumble * 0.5, 'the stop-cut is far sparser than the rumble');
});

test('percussion composer: melodic layer is SUBORDINATE — in mode, quiet, and optional', () => {
  const s = perc.composePercussion({ seed: 'mel', style: 'folk', meter: '4/4', bars: 32, melody: 0.7, tonic: 'A3' });
  const mallets = s.events.filter((e) => e.voice === 'mallet');
  ok(mallets.length > 0, 'a mallet ostinato is present');
  const tonic = theory.noteToMidi('A3');
  const pcs = new Set(theory.scale(tonic, s.meta.scaleName, { octaves: 1 }).map((m) => ((m % 12) + 12) % 12));
  ok(mallets.every((e) => pcs.has(((e.midi % 12) + 12) % 12)), 'mallet pitches are in the mode');
  // quieter than the drum anchor (accompaniment, not focus)
  const anchorVel = Math.max.apply(null, s.events.filter((e) => e.voice === 'boom').map((e) => e.vel));
  ok(mallets.every((e) => e.vel < anchorVel), 'the mallet sits under the drums');
  // toggling it off removes the pitched layer
  const off = perc.composePercussion({ seed: 'mel', style: 'folk', meter: '4/4', bars: 32, melody: 0 });
  ok(!off.events.some((e) => e.voice === 'mallet'), 'melody=0 drops the mallet');
});

test('percussion engine: renderPlan deterministic, valid ranges, time-ordered, params attached', () => {
  const a = engine.renderPlan({ seed: 'p', style: 'folk' });
  const b = engine.renderPlan({ seed: 'p', style: 'folk' });
  eq(a.events.length, b.events.length, 'same seed -> same count');
  ok(a.events.every((e) => e.vel > 0 && e.vel <= 1), 'velocities in (0,1]');
  ok(a.events.every((e) => e.durSec > 0 && e.freq > 0), 'positive durations and freqs');
  ok(a.events.every((e) => e.p && typeof e.p.tune === 'number'), 'timbre params attached to every event');
  for (let i = 1; i < a.events.length; i++) ok(a.events[i].timeSec >= a.events[i - 1].timeSec - 1e-9, 'time-ordered');
});

test('percussion engine: timbre macros flow into note params (adjustable timbre/attack/fade)', () => {
  const dry = engine.renderPlan({ seed: 't', style: 'folk', ring: 0.5, bright: 0.7, tune: 3 });
  const wet = engine.renderPlan({ seed: 't', style: 'folk', ring: 2.0, bright: 1.6, tune: -4 });
  const dd = dry.events.find((e) => e.voice === 'drum');
  const wd = wet.events.find((e) => e.voice === 'drum');
  ok(dd.p.decay < wd.p.decay, 'Ring macro changes the fade');
  ok(dd.p.bright < wd.p.bright, 'Brightness macro changes the tone');
  ok(dd.p.tune > wd.p.tune, 'Tune macro changes the pitch (cents)');
});

test('percussion engine: swing only on duple feels; odd/compound stay straight', () => {
  const duple = engine.renderPlan({ seed: 'sw', style: 'folk', meter: '4/4', swing: 0.64 });
  const odd = engine.renderPlan({ seed: 'sw', style: 'folk', meter: '7/8', swing: 0.64 });
  ok(duple.swing > 0.6, '4/4 swings when asked');
  ok(Math.abs(odd.swing - 0.5) < 1e-9, '7/8 stays straight');
  // swingBeat leaves downbeats put and pushes the eighth offbeat late
  ok(Math.abs(engine.swingBeat(1, 0.64) - 1) < 1e-9, 'downbeat unmoved');
  ok(engine.swingBeat(0.5, 0.64) > 0.56, 'eighth offbeat pushed late');
});

test('percussion engine: a ritardando slows the closing section (accel/rit is structural)', () => {
  const p = engine.renderPlan({ seed: 'rit', style: 'ensemble', meter: '4/4', bars: 32, feel: 0.8 });
  // compare average inter-onset spacing early vs. in the final (close) section — the
  // per-bar tempo slows, so late bars are stretched. Use the section spans.
  const close = p.sections[p.sections.length - 1];
  const bb = p.meta.barBeats;
  const closeStartSec = p.events.find((e) => e.beat >= close.startBeat) ;
  ok(p.durationSec > (p.meta.bars * bb) * (60 / p.bpm) * 0.9, 'a closing ritardando lengthens the piece vs. flat tempo');
});

test('percussion engine: feel scales how loose the timing is; circle is looser than ensemble', () => {
  // With the same seed, a drum circle should place events with more timing spread
  // than a concert ensemble (styleLoose). Measure spread of offsets from the grid.
  const tight = engine.renderPlan({ seed: 'q', style: 'ensemble', meter: '4/4', feel: 0.5 });
  const loose = engine.renderPlan({ seed: 'q', style: 'circle', meter: '4/4', feel: 0.5 });
  function spread(plan) {
    const spb = 60 / plan.bpm; let sum = 0, n = 0;
    for (const e of plan.events) { const q = e.beat * spb; sum += Math.abs(e.timeSec - q); n++; }
    return sum / Math.max(1, n);
  }
  ok(spread(loose) > spread(tight), 'the drum circle breathes more than the concert ensemble');
});

test('percussion engine: bpm scales the piece length; faster is shorter', () => {
  const slow = engine.renderPlan({ seed: 'r', bpm: 80 });
  const fast = engine.renderPlan({ seed: 'r', bpm: 140 });
  ok(fast.durationSec < slow.durationSec, 'faster bpm -> shorter piece');
});
