#!/usr/bin/env node
/*
 * site-check.js — fast headless (no-audio) check of the comprehensive site's
 * pure pipeline: buildVector -> compose (JIT units) -> perform, straight from
 * docs/ in Node. The cheap first gate while working on a genre pack: run this
 * before the full Playwright render gate (render-site.mjs).
 *
 *   node experiments/tools/site-check.js <seedhex> <genre> [genreB|invent]
 *   node experiments/tools/site-check.js sweep <genre>     # 12 seeds, summary stats
 *
 * Checks: determinism (same seed twice -> identical events), seed sensitivity,
 * known synth voices only, finite numbers, monotone unit timeline, note beats
 * inside their unit, and prints the unit/section map so form is inspectable.
 */
'use strict';
const path = require('path');
const DOCS = path.resolve(__dirname, '../../docs');

global.self = global; // let the browser-shaped genre packs see one shared global
global.AM = {};
const AM = global.AM;
AM.rng = require(path.join(DOCS, 'lib/rng.js'));
AM.theory = require(path.join(DOCS, 'lib/theory.js'));
AM.generators = require(path.join(DOCS, 'lib/generators.js'));
AM.transport = require(path.join(DOCS, 'lib/transport.js'));
AM.serialize = require(path.join(DOCS, 'lib/serialize.js'));
AM.style = require(path.join(DOCS, 'lib/style.js'));
AM.compose = require(path.join(DOCS, 'lib/compose.js'));
AM.invent = require(path.join(DOCS, 'lib/invent.js')); // registers the invented strategy into compose
AM.perform = require(path.join(DOCS, 'lib/perform.js'));
const SYNTH_VOICES = new Set(Object.keys(require(path.join(DOCS, 'lib/synth.js')).VOICES));
require(path.join(DOCS, 'styles/registry.js'));
for (const f of ['classical', 'ambient', 'lofi', 'jazz', 'folk', 'electronic', 'cinematic', 'percussion']) {
  require(path.join(DOCS, 'styles', f + '.js'));
}
AM.style._setRegistry(() => AM.styles);
AM.compose._setRegistry(() => AM.styles);

function composeAll(seed, sel, controls, capUnits) {
  const vec = AM.style.buildVector(seed, sel, controls || {});
  const composer = AM.compose.create(vec, seed);
  const perfRoot = new AM.rng.Rng(seed);
  const events = [];
  const units = [];
  let unitStart = 0;
  for (let i = 0; i < (capUnits || 300); i++) {
    const unit = composer.nextUnit(vec);
    if (!unit) break;
    const isRit = unit.last && (vec.ending === 'cadence' || vec.ending === 'ringout');
    const perf = AM.perform.realize(unit, vec, perfRoot.stream('perf:' + unit.unitIdx), { ritardando: isRit });
    for (const ev of perf.events) events.push(Object.assign({}, ev, { tSec: unitStart + ev.tSec }));
    units.push({ startSec: unitStart, durSec: perf.durSec, section: unit.section, bar: unit.bar, bars: unit.bars, notes: unit.notes.length, badBeats: unit.notes.filter((n) => n.beat < -1e-6 || n.beat >= unit.lengthBeats + 1e-6).length, last: !!unit.last });
    unitStart += perf.durSec;
    if (unit.last) break;
  }
  return { vec, events, units, musicSec: unitStart };
}

function check(seed, sel, quiet) {
  const r = composeAll(seed, sel);
  const problems = [];
  if (!r.units.length) problems.push('no units composed');
  if (!r.units.some((u) => u.last)) problems.push('piece never ends (no unit.last)');
  const r2 = composeAll(seed, sel);
  if (JSON.stringify(r.events) !== JSON.stringify(r2.events)) problems.push('NOT deterministic');
  const r3 = composeAll((seed + 1) >>> 0, sel);
  if (JSON.stringify(r3.events) === JSON.stringify(r.events)) problems.push('seed-insensitive');
  let unknown = 0, nonfinite = 0, badBeats = 0;
  for (const u of r.units) badBeats += u.badBeats;
  for (const ev of r.events) {
    if (!SYNTH_VOICES.has(ev.voice)) unknown++;
    if (!isFinite(ev.tSec) || !isFinite(ev.durSec) || !isFinite(ev.freq) || !isFinite(ev.vel)) nonfinite++;
  }
  if (unknown) problems.push(unknown + ' events with unknown synth voice');
  if (nonfinite) problems.push(nonfinite + ' events with non-finite fields');
  if (badBeats) problems.push(badBeats + ' notes outside their unit window');
  if (r.events.length < 20) problems.push('suspiciously few events: ' + r.events.length);
  // event-gap sanity (symbolic): largest span with no event onset AND nothing sounding
  let maxGap = 0;
  const sounding = r.events.map((e) => [e.tSec, e.tSec + e.durSec]).sort((a, b) => a[0] - b[0]);
  let covered = 0;
  for (const [on, off] of sounding) { if (on > covered && on - covered > maxGap && covered > 0) maxGap = on - covered; covered = Math.max(covered, off); }
  if (maxGap > 3) problems.push('symbolic silence gap ' + maxGap.toFixed(1) + 's');
  // lead-line monotony (039, Tom's repeated-note report): a MELODIC lead must
  // not hammer one pitch. Unpitched drums are excluded; the percussion pack's
  // whole idiom is repetition, so it is exempt as a strategy.
  if (r.vec.strategy !== 'percussion') {
    const UNPITCHED = new Set(['kick', 'snare', 'hat', 'clap', 'shaker', 'scrape', 'boom', 'drum', 'gong', 'friction']);
    const leadMel = r.events.filter((e) => e.role === 'lead' && e.midi != null && !UNPITCHED.has(e.voice)).sort((a, b) => a.tSec - b.tSec);
    let runMax = 0, run = 0, prevMidi = null;
    for (const e of leadMel) { run = e.midi === prevMidi ? run + 1 : 1; if (run > runMax) runMax = run; prevMidi = e.midi; }
    const distinctMel = new Set(leadMel.map((e) => e.midi)).size;
    if (leadMel.length >= 24 && runMax > 16) problems.push('lead hammers one pitch: run of ' + runMax);
    if (leadMel.length >= 24 && distinctMel < 4) problems.push('lead uses only ' + distinctMel + ' distinct pitches');
  }
  if (!quiet) {
    console.log('vector:', JSON.stringify({ name: r.vec.name, kind: r.vec.kind, strategy: r.vec.strategy, scale: r.vec.scale, tonic: AM.theory.PC_NAMES_SHARP[r.vec.tonicPc], bpm: +r.vec.bpm.toFixed(1), meter: r.vec.meter.id, harmony: r.vec.harmonyType, density: +r.vec.density.toFixed(2), lengthSec: Math.round(r.vec.lengthSec), ending: r.vec.ending, arc: r.vec.arc, ensemble: r.vec.ensemble.map((e) => e.role + ':' + e.voice).join(' '), meld: r.vec.meld ? r.vec.meld.a + '×' + r.vec.meld.b + ' chassis=' + r.vec.meld.chassis : null, novelty: r.vec.noveltyAxes || null }));
    console.log('units:', r.units.length, '· events:', r.events.length, '· musicSec:', r.musicSec.toFixed(1));
    console.log('sections:', r.units.map((u) => u.section + '@' + u.bar + '(' + u.notes + 'n)').join(' '));
  }
  return { r, problems };
}

const a1 = process.argv[2] || 'deadbeef';
const a2 = process.argv[3] || 'classical';
const a3 = process.argv[4] || null;

if (a1 === 'sweep') {
  const genre = a2;
  const sel = genre === 'invent' ? { a: null, b: null, invent: true } : { a: genre, b: a3, invent: false };
  let fails = 0;
  const stats = { events: [], secs: [], meters: new Set(), scales: new Set(), bpms: [] };
  for (let i = 0; i < 12; i++) {
    const seed = (0x1000 + i * 2654435761) >>> 0;
    const { r, problems } = check(seed, sel, true);
    stats.events.push(r.events.length); stats.secs.push(+r.musicSec.toFixed(0));
    stats.meters.add(r.vec.meter.id); stats.scales.add(r.vec.scale); stats.bpms.push(Math.round(r.vec.bpm));
    if (problems.length) { fails++; console.log('  seed', seed.toString(16), 'PROBLEMS:', problems.join('; ')); }
  }
  console.log('sweep', genre + (a3 ? '×' + a3 : '') + ':', 12 - fails, '/ 12 clean');
  console.log('  events', Math.min(...stats.events) + '-' + Math.max(...stats.events),
    '· secs', Math.min(...stats.secs) + '-' + Math.max(...stats.secs),
    '· bpm', Math.min(...stats.bpms) + '-' + Math.max(...stats.bpms),
    '· meters', Array.from(stats.meters).join(','), '· scales', Array.from(stats.scales).join(','));
  process.exit(fails ? 1 : 0);
} else {
  const seed = parseInt(a1, 16) >>> 0;
  const sel = a2 === 'invent' ? { a: null, b: null, invent: true } : { a: a2, b: a3 === 'invent' ? null : a3, invent: false };
  const { problems } = check(seed, sel, false);
  if (problems.length) { console.log('PROBLEMS:', problems.join('; ')); process.exit(1); }
  console.log('OK');
}
