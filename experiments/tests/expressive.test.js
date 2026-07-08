/* Headless tests for the expressive-chamber composer + cantabile engine
 * performer (Engine 04). The audible layer — the new expressive synth voices
 * (aria/reed/wire/glass) with their continuous intra-note pitch/vibrato/swell/grit
 * automation — is validated separately by the offline render gate
 * (experiments/tools/render-cantabile.mjs); here we test the deterministic
 * beat-based score, the structural weights, and the pure performer's EXPRESSION
 * pass (that expression scales with structure and with the sliders). */
'use strict';
const { test, eq, ok } = require('./_runner');
const theory = require('../lib/theory.js');
const chamber = require('../composers/expressive-chamber.js');
const engine = require('../engines/cantabile/engine.js');

const avg = (arr, f) => (arr.length ? arr.reduce((s, e) => s + f(e), 0) / arr.length : 0);

test('chamber composer: deterministic from the seed', () => {
  const a = chamber.compose({ seed: 'k' });
  const b = chamber.compose({ seed: 'k' });
  eq(a.notes.map((n) => [n.beat, n.midi, n.voice, +(n.weight || 0).toFixed(4)]),
     b.notes.map((n) => [n.beat, n.midi, n.voice, +(n.weight || 0).toFixed(4)]), 'same seed -> identical score');
});

test('chamber composer: the full dramatic arc is present, in order', () => {
  const s = chamber.compose({ seed: 'arc' });
  const roles = s.sections.map((x) => x.id);
  eq(roles, ['intro', 'theme', 'dialogue', 'rise', 'climax', 'return', 'coda'], 'seven sections in arc order');
  // intensity rises to the climax then falls
  const byId = {}; for (const x of s.sections) byId[x.id] = x.intensity;
  ok(byId.intro < byId.theme && byId.theme < byId.dialogue && byId.dialogue < byId.rise && byId.rise < byId.climax, 'intensity rises to the climax');
  ok(byId.climax === 1.0, 'climax is the peak');
  ok(byId.return < byId.climax && byId.coda < byId.return, 'intensity falls after the climax');
});

test('chamber composer: all five ensemble roles present; two expressive leads', () => {
  const s = chamber.compose({ seed: 'roles', mode: 'dorian' });
  const voices = new Set(s.notes.map((n) => n.role));
  ok(voices.has('lead') && voices.has('counter'), 'lead + counter (two expressive melodic lines)');
  ok(voices.has('inner') && voices.has('comp') && voices.has('bass'), 'inner, comp, and bass support');
});

test('chamber composer: lead line is entirely in the chosen mode', () => {
  ['dorian', 'lydian', 'phrygian', 'aeolian', 'mixolydian', 'harmonicMinor'].forEach((mode) => {
    const s = chamber.compose({ seed: 'inkey-' + mode, mode, tonic: 'D4' });
    const tonic = theory.noteToMidi('D4');
    const pcs = new Set(theory.scale(tonic, s.meta.scaleName, { octaves: 1 }).map((m) => ((m % 12) + 12) % 12));
    const lead = s.notes.filter((n) => n.role === 'lead');
    ok(lead.length > 0 && lead.every((n) => pcs.has(((n.midi % 12) + 12) % 12)), `${mode}: every lead note is in the mode`);
  });
});

test('chamber composer: the piece finishes — a long held ending tonic note', () => {
  const s = chamber.compose({ seed: 'ending', mode: 'aeolian', tonic: 'A3' });
  const ending = s.notes.filter((n) => n.tags.includes('ending'));
  eq(ending.length, 1, 'exactly one ending note');
  const e = ending[0];
  const tonicPc = ((theory.noteToMidi('A3') % 12) + 12) % 12;
  eq(((e.midi % 12) + 12) % 12, tonicPc, 'the ending note is the tonic');
  ok(e.durBeats >= 3, 'the ending note is held (>= 3 beats)');
  // it is the last-starting melodic event
  const lastLead = s.notes.filter((n) => n.role === 'lead').sort((a, b) => a.beat - b.beat).pop();
  eq(lastLead, e, 'the ending note is the final lead note');
});

test('chamber composer: every note has a valid structural weight and positive duration', () => {
  const s = chamber.compose({ seed: 'weights' });
  ok(s.notes.every((n) => n.durBeats > 0), 'all durations positive');
  ok(s.notes.every((n) => typeof n.weight === 'number' && n.weight >= 0 && n.weight <= 1), 'weights in [0,1]');
  // the climax and the ending carry more weight than a typical inner note
  const climax = avg(s.notes.filter((n) => n.tags.includes('climax')), (n) => n.weight);
  const inner = avg(s.notes.filter((n) => n.role === 'inner'), (n) => n.weight);
  ok(climax > inner, 'climax notes outweigh inner-voice notes');
});

test('chamber composer: dialogue section trades lead and counter phrases', () => {
  const s = chamber.compose({ seed: 'trade', mode: 'dorian' });
  const dia = s.sections.find((x) => x.id === 'dialogue');
  const start = dia.startBar * 4, end = (dia.startBar + dia.bars) * 4;
  const traded = s.notes.filter((n) => n.tags.includes('trade') && n.beat >= start && n.beat < end);
  ok(traded.some((n) => n.role === 'lead') && traded.some((n) => n.role === 'counter'), 'both voices take turns in the dialogue');
});

test('engine performer: renderPlan deterministic, valid ranges, time-ordered', () => {
  const a = engine.renderPlan({ seed: 'p' });
  const b = engine.renderPlan({ seed: 'p' });
  eq(a.events.length, b.events.length, 'same seed -> same count');
  ok(a.events.every((e) => e.vel > 0 && e.vel <= 1), 'velocities in (0,1]');
  ok(a.events.every((e) => e.durSec > 0 && e.freq > 0), 'positive durations and freqs');
  ok(a.events.every((e) => e.pan >= -1 && e.pan <= 1), 'pans in [-1,1]');
  for (let i = 1; i < a.events.length; i++) ok(a.events[i].timeSec >= a.events[i - 1].timeSec - 1e-9, 'time-ordered');
});

test('engine performer: expression is tied to STRUCTURE — the climax sings harder than the intro', () => {
  const p = engine.renderPlan({ seed: 'struct' });
  const climax = p.events.filter((e) => e.expr && e.tags.includes('climax'));
  const intro = p.events.filter((e) => e.expr && e.tags.includes('sect:intro'));
  ok(climax.length && intro.length, 'both regions have expressive notes');
  ok(avg(climax, (e) => e.expr.vibDepth) > avg(intro, (e) => e.expr.vibDepth) + 3, 'climax vibrato is deeper than the intro');
  ok(avg(climax, (e) => e.expr.bright) > avg(intro, (e) => e.expr.bright), 'climax is brighter than the intro');
});

test('engine performer: the Expression slider governs how much is performed', () => {
  const off = engine.renderPlan({ seed: 'depth', expression: 0 });
  const on = engine.renderPlan({ seed: 'depth', expression: 1, song: 1, bloom: 1 });
  const eo = off.events.filter((e) => e.expr), en = on.events.filter((e) => e.expr);
  ok(avg(eo, (e) => e.expr.vibDepth) < 0.01, 'expression=0 -> no vibrato');
  ok(avg(eo, (e) => Math.abs(e.expr.onsetCents)) < 0.01, 'expression=0 -> no scoops/portamento');
  ok(avg(en, (e) => e.expr.vibDepth) > 12, 'expression=1 -> real vibrato');
  ok(avg(en, (e) => Math.abs(e.expr.onsetCents)) > 10, 'expression=1 -> real pitch inflection');
});

test('engine performer: Ardor controls the dramatic swing between sections', () => {
  const calm = engine.renderPlan({ seed: 'drama', ardor: 0 });
  const fiery = engine.renderPlan({ seed: 'drama', ardor: 1 });
  const climaxVib = (p) => avg(p.events.filter((e) => e.expr && e.tags.includes('climax')), (e) => e.expr.vibDepth);
  ok(climaxVib(fiery) > climaxVib(calm), 'more Ardor -> a bigger climax');
});

test('engine performer: the ensemble varies with the seed and honors user selection', () => {
  const timbres = engine.EXPR_TIMBRES;
  const a = engine.pickEnsemble('seed-A', { lead: 'auto', partner: 'auto' });
  const b = engine.pickEnsemble('seed-B', { lead: 'auto', partner: 'auto' });
  ok(timbres.includes(a.lead) && timbres.includes(b.lead), 'auto picks a real expressive lead');
  ok(a.lead !== a.counter && a.lead !== a.inner, 'the three expressive roles are distinct timbres');
  // over many seeds, every one of the four leads eventually appears
  const leads = new Set();
  for (let i = 0; i < 40; i++) leads.add(engine.pickEnsemble('s' + i, { lead: 'auto', partner: 'auto' }).lead);
  eq([...timbres].every((t) => leads.has(t)), true, 'all four expressive voices lead on some seed');
  // user selection wins
  const u = engine.pickEnsemble('seed-A', { lead: 'wire', partner: 'glass' });
  eq([u.lead, u.counter], ['wire', 'glass'], 'user-selected lead/partner are honored');
  eq(engine.pickEnsemble('seed-A', { lead: 'reed', partner: 'none' }).counter, null, 'partner=none -> solo lead');
});

test('engine performer: bpm scales the piece length; faster is shorter', () => {
  const slow = engine.renderPlan({ seed: 'r', bpm: 66 });
  const fast = engine.renderPlan({ seed: 'r', bpm: 110 });
  ok(fast.durationSec < slow.durationSec, 'faster bpm -> shorter piece');
});
