/* Headless tests for the percussion composer + engine performer (Engine 05, v0.2).
 * v0.2 replaced three fixed styles with a seed-sampled parametric RECIPE over
 * continuous axes + a seed-varied ENSEMBLE, with the genres as presets and every
 * axis optionally user-overridable. These tests cover the recipe/ensemble sampling,
 * the variety it produces, meter parametricity, the subordinate melodic layer, and
 * the pure performer. The audible synth/fx layer is validated by render-percussion.mjs. */
'use strict';
const { test, eq, ok } = require('./_runner');
const theory = require('../lib/theory.js');
const perc = require('../composers/percussion.js');
const engine = require('../engines/percussion/engine.js');

function grid(s) {  // every onset on the meter's sixteenth grid, inside its bar
  const bb = s.meta.barBeats;
  return s.events.every((e) => { const ib = e.beat - Math.floor((e.beat + 1e-6) / bb) * bb; const st = ib / 0.25; return Math.abs(st - Math.round(st)) < 1e-6 && ib < bb + 1e-6; });
}
function wellFormed(s) { return s.events.every((e) => e.beat >= 0 && e.durBeats > 0 && e.midi > 0 && e.vel > 0 && e.vel <= 1 && e.voice); }

test('percussion composer: deterministic from the seed', () => {
  const a = perc.composePercussion({ seed: 'k', style: 'auto', meter: '4/4', bars: 32 });
  const b = perc.composePercussion({ seed: 'k', style: 'auto', meter: '4/4', bars: 32 });
  eq(a.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]),
     b.events.map((e) => [e.beat.toFixed(4), e.midi, e.voice, e.vel.toFixed(3)]), 'same seed -> identical score');
});

test('percussion composer: defaults are 4/4 and auto (seed decides)', () => {
  const s = perc.composePercussion({ seed: 'd' });
  eq(s.meta.meter, '4/4', 'default meter 4/4');
  eq(s.meta.style, 'auto', 'default style auto');
});

test('percussion composer: valid, on-grid across all styles and meters', () => {
  let bad = 0;
  ['auto', 'concert', 'folk', 'circle'].forEach((style) => {
    Object.keys(perc.METERS).forEach((mk) => {
      const s = perc.composePercussion({ seed: 's' + style + mk, style, meter: mk, bars: 28 });
      if (!wellFormed(s) || !grid(s)) bad++;
      ok(s.events.length > 60, style + '/' + mk + ' has plenty of hits');
    });
  });
  eq(bad, 0, 'every style x meter is well-formed and on the meter grid');
});

test('percussion composer: the seed produces VARIETY (many arcs, timelines, forms, ensembles)', () => {
  const arcs = new Set(), tls = new Set(), forms = new Set(), ensembles = new Set();
  for (let i = 0; i < 24; i++) {
    const p = perc.composePercussion({ seed: 'var' + i, style: 'auto', meter: '4/4' });
    arcs.add(p.meta.recipe.arc); tls.add(p.meta.recipe.timeline); forms.add(p.meta.recipe.formType);
    ensembles.add(p.meta.ensemble.slice().sort().join('+'));
  }
  ok(arcs.size >= 5, 'at least 5 distinct arc shapes across 24 seeds (' + arcs.size + ')');
  ok(tls.size >= 4, 'at least 4 distinct timeline types (' + tls.size + ')');
  ok(forms.size >= 4, 'at least 4 distinct form types (' + forms.size + ')');
  ok(ensembles.size >= 18, 'ensembles vary widely by seed (' + ensembles.size + '/24)');
});

test('percussion composer: all 11 voices (incl. the 4 new) are reachable across seeds', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) { const p = perc.composePercussion({ seed: 'w' + i, style: 'auto' }); for (const e of p.events) seen.add(e.voice); }
  ['boom', 'drum', 'wood', 'metal', 'gong', 'shaker', 'mallet', 'clap', 'scrape', 'chime', 'friction'].forEach((v) =>
    ok(seen.has(v), 'voice ' + v + ' is used by some seed'));
});

test('percussion composer: user overrides pin any axis', () => {
  const s = perc.composePercussion({ seed: 'o', style: 'auto', arc: 'johakyu', timeline: 'sieve', form: 'cellDev', development: 0.9, density: 0.8, pitched: 0.0 });
  eq(s.meta.recipe.arc, 'johakyu', 'arc pinned');
  eq(s.meta.recipe.timeline, 'sieve', 'timeline pinned');
  eq(s.meta.recipe.formType, 'cellDev', 'form pinned');
  ok(Math.abs(s.meta.recipe.development - 0.9) < 1e-6, 'development pinned (not clamped by form correlation)');
  ok(!s.events.some((e) => e.voice === 'mallet' || e.voice === 'chime' && e.role === 'melody'), 'pitched=0 drops the melodic layer');
});

test('percussion composer: ensemble presets constrain the instrument selection', () => {
  for (let i = 0; i < 6; i++) {
    const metal = perc.composePercussion({ seed: 'm' + i, style: 'auto', ensemble: 'allMetal', pitched: 0.3 });
    ok(!metal.events.some((e) => e.voice === 'drum' || e.voice === 'wood' || e.voice === 'friction'), 'allMetal has no skin/wood drums (' + i + ')');
    const skins = perc.composePercussion({ seed: 's' + i, style: 'auto', ensemble: 'skinsWood' });
    ok(!skins.events.some((e) => e.voice === 'metal' || e.voice === 'chime' || e.voice === 'gong' && e.role !== 'color'), 'skinsWood avoids the metal voices (' + i + ')');
  }
});

test('percussion composer: meter parametric — 2/4 & 4/4 default duple, aksak stays odd', () => {
  eq(perc.METERS['4/4'].feel, 'duple');
  eq(perc.METERS['2/4'].feel, 'duple');
  eq(perc.METERS['7/8'].feel, 'odd');
  eq(perc.METERS['7/8'].barBeats, 3.5, '7/8 = 3.5 quarter-beats (2+2+3 eighths)');
  eq(perc.METERS['12/8'].feel, 'compound');
});

test('percussion composer: bars snap toward the 4/8/16-bar phrase group', () => {
  const s = perc.composePercussion({ seed: 'g', style: 'folk', meter: '4/4', bars: 32, group: 8 });
  const mults = s.sections.filter((x) => x.bars % 4 === 0).length;
  ok(mults >= Math.ceil(s.sections.length / 2), 'most sections snap to 4-bar groups');
});

test('percussion composer: every piece has a form (intro..coda) and ends on a gong', () => {
  for (let i = 0; i < 12; i++) {
    const s = perc.composePercussion({ seed: 'f' + i, style: 'auto', meter: '4/4', bars: 32 });
    ok(s.sections.length >= 3, 'a multi-section form');
    eq(s.sections[0].role, 'intro', 'opens with an intro');
    eq(s.sections[s.sections.length - 1].role, 'coda', 'closes with a coda');
    ok(s.events.some((e) => e.voice === 'gong'), 'a gong sounds (climax/ending color)');
  }
});

test('percussion composer: the intensity ARC actually varies (form carries the shape)', () => {
  // a non-flat arc should span a real intensity range across its sections
  const s = perc.composePercussion({ seed: 'arc', style: 'concert', meter: '4/4', arc: 'arch', bars: 36 });
  const Is = s.sections.map((x) => x.intensity);
  ok(Math.max.apply(null, Is) - Math.min.apply(null, Is) > 0.35, 'the arch arc has a real rise and fall');
});

test('percussion composer: timeline type is honored (none / pulse / a real timeline)', () => {
  const none = perc.composePercussion({ seed: 't1', style: 'auto', timeline: 'none', meter: '4/4' });
  ok(!none.events.some((e) => e.tags.indexOf('timeline') !== -1), 'timeline=none: no timeline strokes');
  const pulse = perc.composePercussion({ seed: 't2', style: 'auto', timeline: 'pulse', meter: '4/4' });
  ok(pulse.events.some((e) => e.tags.indexOf('heartbeat') !== -1), 'timeline=pulse: a shared pulse');
  const clave = perc.composePercussion({ seed: 't3', style: 'auto', timeline: 'clave', meter: '4/4' });
  ok(clave.events.some((e) => e.tags.indexOf('timeline') !== -1), 'timeline=clave: a timeline is present');
});

test('percussion composer: melodic layer is SUBORDINATE — in mode, quiet, optional', () => {
  const s = perc.composePercussion({ seed: 'mel', style: 'folk', meter: '4/4', pitched: 0.9, tonic: 'A3' });
  const mel = s.events.filter((e) => e.role === 'melody');
  ok(mel.length > 0, 'a melodic ostinato is present at high pitched');
  const pcs = new Set(theory.scale(theory.noteToMidi('A3'), s.meta.scaleName, { octaves: 1 }).map((m) => ((m % 12) + 12) % 12));
  ok(mel.every((e) => pcs.has(((e.midi % 12) + 12) % 12)), 'melodic pitches are in the mode');
  const anchorVel = Math.max.apply(null, s.events.filter((e) => e.role === 'anchor').map((e) => e.vel).concat([0.5]));
  ok(mel.every((e) => e.vel < anchorVel), 'the melodic layer sits under the anchor drum');
  const off = perc.composePercussion({ seed: 'mel', style: 'folk', meter: '4/4', pitched: 0 });
  ok(!off.events.some((e) => e.role === 'melody'), 'pitched=0 removes the melodic layer');
});

test('percussion engine: renderPlan deterministic, valid, time-ordered, params attached, axes forwarded', () => {
  const a = engine.renderPlan({ seed: 'p', style: 'auto' });
  const b = engine.renderPlan({ seed: 'p', style: 'auto' });
  eq(a.events.length, b.events.length, 'same seed -> same count');
  ok(a.events.every((e) => e.vel > 0 && e.vel <= 1 && e.durSec > 0 && e.freq > 0), 'valid ranges');
  ok(a.events.every((e) => e.p && typeof e.p.tune === 'number'), 'timbre params on every event');
  for (let i = 1; i < a.events.length; i++) ok(a.events[i].timeSec >= a.events[i - 1].timeSec - 1e-9, 'time-ordered');
  const o = engine.renderPlan({ seed: 'p', style: 'auto', arc: 'wave', timeline: 'euclid' });
  eq(o.meta.recipe.arc, 'wave', 'engine forwards the arc override to the composer');
});

test('percussion engine: timbre macros flow into note params', () => {
  const dry = engine.renderPlan({ seed: 't', style: 'auto', ring: 0.5, bright: 0.7, tune: 3 });
  const wet = engine.renderPlan({ seed: 't', style: 'auto', ring: 2.0, bright: 1.6, tune: -4 });
  const dd = dry.events.find((e) => e.p && e.p.decay != null && e.p.bright != null);
  const wd = wet.events.find((e) => e.voice === dd.voice);
  ok(dd.p.decay < wd.p.decay && dd.p.bright < wd.p.bright && dd.p.tune > wd.p.tune, 'Ring/Brightness/Tune macros change the params');
});

test('percussion engine: swing only on duple feels; odd/compound stay straight', () => {
  ok(engine.renderPlan({ seed: 'sw', meter: '4/4', swing: 0.64 }).swing > 0.6, '4/4 swings');
  ok(Math.abs(engine.renderPlan({ seed: 'sw', meter: '7/8', swing: 0.64 }).swing - 0.5) < 1e-9, '7/8 straight');
  ok(engine.swingBeat(0.5, 0.64) > 0.56 && Math.abs(engine.swingBeat(1, 0.64) - 1) < 1e-9, 'offbeat late, downbeat fixed');
});

test('percussion engine: looseness scales timing spread; ritardando lengthens the piece', () => {
  const spread = (p) => { const spb = 60 / p.bpm; let s = 0, n = 0; for (const e of p.events) { s += Math.abs(e.timeSec - e.beat * spb); n++; } return s / n; };
  ok(spread(engine.renderPlan({ seed: 'q', looseness: 0.95, feel: 0.6 })) > spread(engine.renderPlan({ seed: 'q', looseness: 0.05, feel: 0.6 })), 'looser recipe breathes more');
  const p = engine.renderPlan({ seed: 'rit', style: 'concert', arc: 'arch', form: 'cellDev', bars: 32, feel: 0.8 });
  ok(p.durationSec > (p.meta.bars * p.meta.barBeats) * (60 / p.bpm) * 0.9, 'a closing ritardando lengthens vs flat tempo');
});

test('percussion engine: bpm scales the piece length; faster is shorter', () => {
  ok(engine.renderPlan({ seed: 'r', bpm: 150 }).durationSec < engine.renderPlan({ seed: 'r', bpm: 80 }).durationSec, 'faster -> shorter');
});
