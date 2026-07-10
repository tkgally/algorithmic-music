/*
 * site.test.js — headless tests for the comprehensive site's pure layer
 * (docs/lib + docs/styles): the style vector, controls, melds, coherence,
 * the incremental composer contract, the performer, and the URL codec.
 * Audio is validated separately by experiments/tools/render-site.mjs.
 */
'use strict';
const { test, eq, ok } = require('./_runner');
const path = require('path');
const DOCS = path.resolve(__dirname, '../../docs');

// Assemble the site's global namespace the way index.html's script tags do.
global.self = global;
global.AM = {};
const AM = global.AM;
AM.rng = require(path.join(DOCS, 'lib/rng.js'));
AM.theory = require(path.join(DOCS, 'lib/theory.js'));
AM.generators = require(path.join(DOCS, 'lib/generators.js'));
AM.transport = require(path.join(DOCS, 'lib/transport.js'));
AM.serialize = require(path.join(DOCS, 'lib/serialize.js'));
AM.style = require(path.join(DOCS, 'lib/style.js'));
AM.compose = require(path.join(DOCS, 'lib/compose.js'));
AM.perform = require(path.join(DOCS, 'lib/perform.js'));
const SYNTH = require(path.join(DOCS, 'lib/synth.js'));
require(path.join(DOCS, 'styles/registry.js'));
const PACKS = ['classical', 'ambient', 'lofi', 'jazz', 'folk', 'electronic', 'cinematic', 'percussion'];
for (const f of PACKS) require(path.join(DOCS, 'styles', f + '.js'));
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
    const perf = AM.perform.realize(unit, vec, perfRoot.stream('perf:' + unit.unitIdx), {
      ritardando: unit.last && (vec.ending === 'cadence' || vec.ending === 'ringout'),
    });
    for (const ev of perf.events) events.push(Object.assign({}, ev, { tSec: unitStart + ev.tSec }));
    units.push(unit);
    unitStart += perf.durSec;
    if (unit.last) break;
  }
  return { vec, events, units, musicSec: unitStart };
}

// ---- registry & presets ----
test('site: all 8 genre packs registered with orders 0..7', () => {
  const orders = AM.styles.list().map((p) => p.order).sort((a, b) => a - b);
  eq(orders, [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('site: sampled vectors are complete and use only known synth voices', () => {
  for (const pack of AM.styles.list()) {
    const v = AM.style.buildVector(12345, { a: pack.id, b: null, invent: false }, {});
    ok(v.bpm > 20 && v.bpm < 220, pack.id + ' bpm sane');
    ok(v.meter && typeof v.meter.barBeats === 'number', pack.id + ' meter');
    ok(Array.isArray(v.ensemble) && v.ensemble.length >= 1, pack.id + ' ensemble');
    for (const e of AM.style.effectiveEnsemble(v)) {
      ok(SYNTH.VOICES[e.voice], pack.id + ': unknown voice ' + e.voice);
    }
  }
});

// ---- determinism (the site's central invariant) ----
test('site: same (seed, selection, controls) -> identical event stream', () => {
  const sel = { a: 'classical', b: null, invent: false };
  const a = composeAll(0xfeed, sel, { energy: 3 });
  const b = composeAll(0xfeed, sel, { energy: 3 });
  eq(JSON.stringify(a.events), JSON.stringify(b.events));
});

test('site: different seed -> different piece', () => {
  const sel = { a: 'classical', b: null, invent: false };
  const a = composeAll(1, sel);
  const b = composeAll(2, sel);
  ok(JSON.stringify(a.events) !== JSON.stringify(b.events));
});

test('site: every genre composes a finite piece near its length target', () => {
  for (const pack of AM.styles.list()) {
    const r = composeAll(777, { a: pack.id, b: null, invent: false });
    ok(r.units.length > 0, pack.id + ' composed units');
    ok(r.units[r.units.length - 1].last, pack.id + ' has an ending');
    ok(r.musicSec > 40 && r.musicSec < 420, pack.id + ' duration ' + r.musicSec.toFixed(0) + 's in range');
    ok(r.events.length >= 20, pack.id + ' has ' + r.events.length + ' events');
  }
});

// ---- controls ----
test('site: pinned tempo control overrides the sampled bpm deterministically', () => {
  const sel = { a: 'classical', b: null, invent: false };
  const v0 = AM.style.buildVector(42, sel, {});
  const v1 = AM.style.buildVector(42, sel, { tempo: 63 }); // top of the 40-200 log scale
  ok(Math.abs(v1.bpm - 200) < 1, 'tempo pin -> 200, got ' + v1.bpm);
  ok(Math.abs(v0.bpm - v1.bpm) > 5, 'differs from sampled');
});

test('site: mood control walks the preset mode pool dark -> bright', () => {
  const sel = { a: 'classical', b: null, invent: false };
  const dark = AM.style.buildVector(42, sel, { mood: 0 });
  const bright = AM.style.buildVector(42, sel, { mood: 4 });
  ok(dark.scale !== bright.scale, dark.scale + ' vs ' + bright.scale);
});

test('site: control apply functions never use randomness (same vector twice)', () => {
  const sel = { a: 'jazz', b: null, invent: false };
  const controls = { energy: 4, swing: 4, density: 0, brightness: 4 };
  const a = AM.style.buildVector(9, sel, controls);
  const b = AM.style.buildVector(9, sel, controls);
  eq(JSON.stringify(a), JSON.stringify(b));
});

// ---- melds (schema §5) ----
test('site: meld snaps rhythm chassis and harmony to DIFFERENT parents', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const v = AM.style.buildVector(seed, { a: 'classical', b: 'electronic', invent: false }, {});
    eq(v.kind, 'meld');
    ok(v.meld.chassis === 'classical' || v.meld.chassis === 'electronic');
    // strategy (form/rhythm frame) comes from the chassis parent
    eq(v.strategy, v.meld.chassis);
  }
});

test('site: free-tempo parent can never be the meld chassis', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const v = AM.style.buildVector(seed, { a: 'ambient', b: 'lofi', invent: false }, {});
    eq(v.meld.chassis, 'lofi', 'metered parent must own the chassis');
    ok(!v.free, 'meld is metered');
  }
});

test('site: melds compose deterministic playable pieces (both orders)', () => {
  const a = composeAll(31337, { a: 'folk', b: 'cinematic', invent: false });
  const b = composeAll(31337, { a: 'folk', b: 'cinematic', invent: false });
  eq(JSON.stringify(a.events), JSON.stringify(b.events));
  ok(a.events.length >= 20, 'meld produced events');
  ok(a.units[a.units.length - 1].last, 'meld piece ends');
});

// ---- coherence gate (schema §6) ----
test('site: coherence — free time kills swing/timeline; functional needs 7 notes', () => {
  const v = { free: true, swing: 0.8, timeline: 'clave', ending: 'cadence', harmonyType: 'functional', scale: 'majorPentatonic', bpm: 100, density: 0.5, meter: AM.style.METERS['free'], ensemble: [] };
  AM.style.coherence(v);
  eq(v.swing, 0);
  eq(v.timeline, 'none');
  ok(v.ending !== 'cadence');
  ok(v.harmonyType !== 'functional');
});

test('site: coherence — high tempo thins density; bass register capped', () => {
  const v = { free: false, swing: 0, timeline: 'none', ending: 'stop', harmonyType: 'modal', scale: 'dorian', bpm: 190, density: 0.95, meter: AM.style.METERS['4/4'], ensemble: [{ role: 'bass', register: [36, 70] }], interlock: 0 };
  AM.style.coherence(v);
  ok(v.density <= 0.62 + 1e-9, 'density ' + v.density);
  eq(v.ensemble[0].register[1], 60);
});

// ---- invented styles (M7) ----
test('site: invented styles are deterministic, coherent, and carry signatures', () => {
  for (const seed of [11, 22, 33]) {
    const v1 = AM.style.buildVector(seed, { a: null, b: null, invent: true }, {});
    const v2 = AM.style.buildVector(seed, { a: null, b: null, invent: true }, {});
    eq(JSON.stringify(v1), JSON.stringify(v2));
    eq(v1.kind, 'invented');
    ok(v1.noveltyAxes.length >= 1 && v1.noveltyAxes.length <= 3, 'novelty budget spent');
    ok(v1.signatures.length >= 2 && v1.signatures.length <= 3, 'signatures attached');
    ok(AM.styles.get(v1.strategy), 'strategy exists: ' + v1.strategy);
  }
});

test('site: novelty budget control changes how many axes go off-convention', () => {
  const v1 = AM.style.buildVector(5, { a: null, b: null, invent: true }, { novelty: 0 }); // 1 axis
  const v3 = AM.style.buildVector(5, { a: null, b: null, invent: true }, { novelty: 2 }); // 3 axes
  eq(v1.noveltyAxes.length, 1);
  eq(v3.noveltyAxes.length, 3);
});

// ---- invented-style ensembles + names (Tom 2026-07-10) ----
const PERC_VOICES = new Set(['kick', 'snare', 'hat', 'drum', 'wood', 'shaker', 'clap', 'metal', 'gong', 'boom', 'scrape', 'friction']);
function inventedSample(n) {
  const out = [];
  for (let s = 1; s <= n; s++) out.push(AM.style.buildVector((s * 2654435761) >>> 0, { a: null, b: null, invent: true }, {}));
  return out;
}
test('site: invented ensembles are varied across seeds (large template set)', () => {
  const vs = inventedSample(80);
  const sigs = new Set(vs.map((v) => v.ensemble.map((e) => e.voice).sort().join('+')));
  ok(sigs.size >= 16, 'many distinct ensembles over 80 seeds (got ' + sigs.size + ')');
});
test('site: most invented ensembles balance high, mid, and low registers', () => {
  const vs = inventedSample(80);
  const balanced = vs.filter((v) => {
    const roles = v.ensemble.map((e) => e.role);
    const hi = roles.includes('lead') || roles.includes('counter');
    const mid = roles.includes('comp') || roles.includes('pad') || roles.includes('tex');
    const low = roles.includes('bass') || roles.includes('drone');
    return hi && mid && low;
  }).length;
  ok(balanced / vs.length >= 0.85, 'high+mid+low present in most (' + balanced + '/' + vs.length + ')');
});
test('site: percussion appears in roughly half of invented ensembles', () => {
  const vs = inventedSample(120);
  const withPerc = vs.filter((v) => v.ensemble.some((e) => PERC_VOICES.has(e.voice))).length;
  const frac = withPerc / vs.length;
  ok(frac >= 0.30 && frac <= 0.70, 'percussion in ~half (' + withPerc + '/' + vs.length + ' = ' + frac.toFixed(2) + ')');
});
test('site: invented style names have the word + lowercase-letter + 3-digit form', () => {
  const re = /^Invented [A-Z][a-z]+ [a-z]\d{3}$/;
  for (const v of inventedSample(40)) ok(re.test(v.name), 'name matches: ' + v.name);
});

// ---- performer ----
test('site: perform is deterministic and returns sane, sorted events', () => {
  const vec = AM.style.buildVector(64, { a: 'classical', b: null, invent: false }, {});
  const composer = AM.compose.create(vec, 64);
  const unit = composer.nextUnit(vec);
  const r1 = AM.perform.realize(unit, vec, new AM.rng.Rng(64).stream('perf:0'), {});
  const r2 = AM.perform.realize(unit, vec, new AM.rng.Rng(64).stream('perf:0'), {});
  eq(JSON.stringify(r1.events), JSON.stringify(r2.events));
  ok(r1.durSec > 0, 'unit has duration');
  for (let i = 1; i < r1.events.length; i++) ok(r1.events[i].tSec >= r1.events[i - 1].tSec, 'sorted');
  for (const ev of r1.events) {
    ok(isFinite(ev.tSec) && isFinite(ev.durSec) && isFinite(ev.freq) && isFinite(ev.vel), 'finite');
    ok(ev.vel > 0 && ev.vel <= 1, 'vel in range');
  }
});

test('site: swing warps offbeats late, never the downbeats', () => {
  eq(AM.perform.swingBeat(2, 0.62), 2);
  ok(AM.perform.swingBeat(2.5, 0.62) > 2.5);
  ok(Math.abs(AM.perform.swingBeat(2.5, 0.62) - 2.62) < 1e-9);
});

test('site: final-unit ritardando stretches the last unit', () => {
  const vec = AM.style.buildVector(64, { a: 'classical', b: null, invent: false }, {});
  const composer = AM.compose.create(vec, 64);
  let unit, lastUnit = null;
  while ((unit = composer.nextUnit(vec))) { lastUnit = unit; if (unit.last) break; }
  const straight = AM.perform.realize(lastUnit, vec, new AM.rng.Rng(1).stream('x'), {});
  const rit = AM.perform.realize(lastUnit, vec, new AM.rng.Rng(1).stream('x'), { ritardando: true });
  ok(rit.durSec > straight.durSec * 1.05, 'rit ' + rit.durSec.toFixed(2) + ' vs ' + straight.durSec.toFixed(2));
});

// ---- live-change model ----
test('site: a boundary-speed change lands in later units without touching the past', () => {
  const sel = { a: 'classical', b: null, invent: false };
  // reference run, no change
  const ref = composeAll(0xabc, sel, {});
  // live run: same seed, density pinned low after 3 units
  const vecLo = AM.style.buildVector(0xabc, sel, { density: 0 });
  const vec0 = AM.style.buildVector(0xabc, sel, {});
  const composer = AM.compose.create(vec0, 0xabc);
  let vec = vec0;
  const unitNotes = [];
  for (let i = 0; i < 40; i++) {
    if (i === 3) vec = vecLo; // the live change
    const u = composer.nextUnit(vec);
    if (!u) break;
    unitNotes.push(u.notes.length);
    if (u.last) break;
  }
  // past unchanged: first 3 units identical to the reference
  const refNotes = ref.units.map((u) => u.notes.length);
  eq(unitNotes.slice(0, 3), refNotes.slice(0, 3));
});

test('site: replan rebuilds the remaining plan from the current position', () => {
  const sel = { a: 'classical', b: null, invent: false };
  const vec = AM.style.buildVector(0xdef, sel, {});
  const composer = AM.compose.create(vec, 0xdef);
  composer.nextUnit(vec); composer.nextUnit(vec);
  const barBefore = composer.pos.bar;
  composer.replan(vec);
  eq(composer.pos.bar, barBefore, 'position preserved');
  const u = composer.nextUnit(vec);
  ok(u && u.notes, 'composes after replan');
});

// ---- serialize ----
test('site: URL codec round-trips seed, mode, selection, and pinned controls', () => {
  const st = { seed: 0xdeadbeef, uiMode: 2, sel: { a: 4, b: 6, invent: false }, controls: { energy: 2, meter: 5, arc: 8, novelty: 1 } };
  const dec = AM.serialize.decode(AM.serialize.encode(st));
  eq(dec, st);
});

test('site: URL codec — invented selection and empty pins round-trip', () => {
  const st = { seed: 1, uiMode: 1, sel: { a: null, b: null, invent: true }, controls: {} };
  eq(AM.serialize.decode(AM.serialize.encode(st)), st);
});

test('site: URL codec round-trips V2 controls (wide palette, adv params, 24-bit instrument mask)', () => {
  const st = { seed: 0x12345678, uiMode: 2, sel: { a: 1, b: null, invent: false },
    controls: { palette: 7, laidBack: 4, rubato: 3, harmonicRhythm: 5, stepBias: 2, melRange: 4, instruments: 0xABCDEF } };
  eq(AM.serialize.decode(AM.serialize.encode(st)), st);
});

test('site: Advanced instruments mask rebuilds the ensemble to exactly the checked voices', () => {
  const mi = AM.style.MASTER_INSTRUMENTS;
  const idx = (voice) => mi.findIndex((m) => m.voice === voice);
  const mask = (1 << idx('melody')) | (1 << idx('bass')) | (1 << idx('kick'));
  const v = AM.style.buildVector(42, { a: 'classical', b: null, invent: false }, { instruments: mask >>> 0 });
  const voices = AM.style.effectiveEnsemble(v).map((e) => e.voice).sort();
  eq(voices, ['bass', 'kick', 'melody'], 'ensemble is exactly the checked instruments');
});

test('site: a zero instrument mask leaves the natural ensemble untouched', () => {
  const a = AM.style.buildVector(7, { a: 'jazz', b: null, invent: false }, {});
  const b = AM.style.buildVector(7, { a: 'jazz', b: null, invent: false }, { instruments: 0 });
  eq(AM.style.effectiveEnsemble(b).map((e) => e.voice), AM.style.effectiveEnsemble(a).map((e) => e.voice));
});

test('site: every genre exposes 8 instrument palettes (3+ authored + 5 generic)', () => {
  for (const p of AM.styles.list()) {
    const v = AM.style.buildVector(3, { a: p.id, b: null, invent: false }, {});
    ok(v.palettes.length === v.paletteAuthored + 5, p.id + ' has authored+5 palettes');
    ok(v.palettes.length >= 8, p.id + ' has >= 8 palettes (' + v.palettes.length + ')');
    ok(v.palettes.every((pal) => pal.desc), p.id + ' palettes all have descriptions');
  }
});

test('site: pieces can be ~60 s (short length target lowered)', () => {
  eq(AM.style.LENGTH_SECS[0], 60);
  const v = AM.style.buildVector(9, { a: 'lofi', b: null, invent: false }, { length: 0 });
  eq(v.lengthSec, 60);
});

test('site: URL codec rejects garbage without throwing', () => {
  eq(AM.serialize.decode('!!!'), null);
  eq(AM.serialize.decode(''), null);
  eq(AM.serialize.decode('AAAA'), null); // version 0 -> unknown
});

test('site: current (V2) URL layout snapshot matches the live control registry', () => {
  const live = AM.style.CONTROLS.map((c) => [c.id, c.bits]);
  eq(AM.serialize.V2_CONTROLS, live, 'V2 layout must mirror the live registry (id + bits)');
});

test('site: V1 layout stays a frozen historical prefix (ids match; only palette width changed)', () => {
  const liveIds = AM.style.CONTROLS.map((c) => c.id);
  const v1 = AM.serialize.V1_CONTROLS;
  ok(v1.length <= liveIds.length, 'v1 is a prefix length');
  for (let i = 0; i < v1.length; i++) eq(v1[i][0], liveIds[i], 'v1 id at ' + i);
  // decoding an old V1 link must still work (new controls default to auto)
  const st = { seed: 0x0defaced, uiMode: 0, sel: { a: 2, b: null, invent: false }, controls: {} };
  const w = new AM.serialize.BitWriter();
  w.write(1, 6); w.write(st.seed >>> 0, 32); w.write(0, 2); w.write(2, 4); w.write(15, 4);
  for (let i = 0; i < v1.length; i++) w.write(0, 1); // nothing pinned
  const dec = AM.serialize.decode(w.toBase64url());
  eq(dec.seed, st.seed >>> 0, 'V1 link still decodes');
  eq(dec.sel.a, 2);
});

// ---- generators ----
test('site: Schillinger resultant 3:4 gives the classic cell', () => {
  const r = AM.generators.resultant(3, 4);
  eq(r.cycle, 12);
  eq(r.attacks, [0, 3, 4, 6, 8, 9]);
  eq(r.durations, [3, 1, 2, 2, 1, 3]);
});

test('site: sieves and tendency masks are deterministic', () => {
  const s = AM.generators.union(AM.generators.rc(3, 0), AM.generators.rc(4, 1));
  eq(AM.generators.take(s, 13), [0, 1, 3, 5, 6, 9, 12]);
  const t = AM.generators.tendency((x) => x * 10, (x) => x * 10 + 2);
  const r1 = new AM.rng.Rng(7);
  const v = t(r1, 0.5);
  ok(v >= 5 && v <= 7);
});
