/* Headless structural tests for composers/tonal-phrase.js — the worked R1/R2
 * (phrase-first melody + goal-directed harmony) reference composer. These assert
 * the STRUCTURE the wiki says makes tonal music sound intentional, not audio. */
'use strict';
const { test, eq, ok, approx } = require('./_runner');
const comp = require('../composers/tonal-phrase.js');
const theory = require('../lib/theory.js');

const pcOf = (m) => ((m % 12) + 12) % 12;
const melodyOf = (p) => comp.melodyLine(p);
const anteMel = (p) => melodyOf(p).filter((n) => n.beat < 16);
const consMel = (p) => melodyOf(p).filter((n) => n.beat >= 16);

// ---- Determinism (engine-architecture invariant) ---------------------------

test('composer: same seed reproduces an identical score; different seeds differ', () => {
  const a = JSON.stringify(comp.composePeriod({ seed: 'x', tonic: 'C4' }).notes);
  const b = JSON.stringify(comp.composePeriod({ seed: 'x', tonic: 'C4' }).notes);
  const d = JSON.stringify(comp.composePeriod({ seed: 'y', tonic: 'C4' }).notes);
  eq(a, b, 'same seed -> identical notes');
  ok(a !== d, 'different seed -> different notes');
});

// ---- Harmony (R2): goal-directed, cadence-first ----------------------------

test('composer: every antecedent ends on V (half cadence), every consequent on I with V before it (PAC)', () => {
  for (let s = 0; s < 40; s++) {
    const p = comp.composePeriod({ seed: 'h' + s, tonic: 'C4', mode: 'major' });
    const [ante, cons] = p.plan.phrases;
    eq(ante.chords[3], 'V', 'antecedent cadence chord is V (HC)');
    eq(cons.chords[3], 'I', 'consequent cadence chord is I (PAC)');
    eq(cons.chords[2], 'V', 'the chord before the final I is V (authentic cadence)');
    eq(ante.chords[0], 'I', 'periods open over tonic');
  }
});

test('composer: the backward Piston walk places a pre-dominant (IV/ii) before V most of the time', () => {
  let predom = 0, n = 0;
  for (let s = 0; s < 120; s++) {
    const p = comp.composePeriod({ seed: 'pd' + s, tonic: 'C4', mode: 'major' });
    const bar3 = p.plan.phrases[0].chords[2]; // the chord immediately before the HC's V
    n++;
    if (bar3 === 'IV' || bar3 === 'ii') predom++;
  }
  ok(predom / n > 0.5, `pre-dominant before V in ${(100 * predom / n).toFixed(0)}% of phrases (expected majority)`);
});

test('composer: predecessorOf reproduces Piston pre-dominant behaviour (IV and ii lead to V)', () => {
  // IV and ii are the two "usually -> V" chords in Piston's table; walking back
  // from V should surface them as the most common predecessors.
  const r = new (require('../lib/rng.js').Rng)('pred');
  const counts = {};
  for (let i = 0; i < 3000; i++) { const c = comp.predecessorOf('V', r); counts[c] = (counts[c] || 0) + 1; }
  ok((counts.IV || 0) > (counts.iii || 0), 'IV precedes V more often than iii does');
  ok((counts.ii || 0) > (counts.iii || 0), 'ii precedes V more often than iii does');
});

// ---- Parallel period: restatement ------------------------------------------

test('composer: consequent restates the antecedent basic idea (parallel period), harmony and melody', () => {
  for (let s = 0; s < 20; s++) {
    const p = comp.composePeriod({ seed: 'pp' + s, tonic: 'C4' });
    const [ante, cons] = p.plan.phrases;
    eq(cons.chords.slice(0, 2), ante.chords.slice(0, 2), 'consequent bars 1-2 chords = antecedent bars 1-2');
    // Basic idea = the first 7 melody onsets (beats 0-6) of each phrase.
    const aBasic = anteMel(p).slice(0, comp.BASIC_IDEA.length).map((n) => n.midi);
    const cBasic = consMel(p).slice(0, comp.BASIC_IDEA.length).map((n) => n.midi);
    eq(cBasic, aBasic, 'consequent basic-idea pitches = antecedent basic-idea pitches');
  }
});

// ---- Melody (R1): goal tones, key, contour, apex, singability ---------------

test('composer: melody cadential goal tones are re/sol at the HC and do at the PAC', () => {
  for (let s = 0; s < 40; s++) {
    const p = comp.composePeriod({ seed: 'g' + s, tonic: 'C4', mode: 'major' });
    const tonicPc = 0; // C
    const reSol = new Set([pcOf(theory.scaleDegree(60, 'major', 2)), pcOf(theory.scaleDegree(60, 'major', 5))]);
    const aLast = anteMel(p).slice(-1)[0], cLast = consMel(p).slice(-1)[0];
    ok(reSol.has(pcOf(aLast.midi)), 'antecedent ends on re or sol (open HC melody tone)');
    eq(pcOf(cLast.midi), tonicPc, 'consequent ends on do (PAC requires 1 in the melody)');
    ok((cLast.tags || []).includes('cadence:PAC'), 'the final note is tagged cadence:PAC');
  }
});

test('composer: the consequent goal tone (do) is the most tonally stable pitch class (Krumhansl)', () => {
  const p = comp.composePeriod({ seed: 'stab', tonic: 'C4', mode: 'major' });
  const cLast = consMel(p).slice(-1)[0];
  const st = theory.stability(pcOf(cLast.midi), 0, 'major');
  eq(st, Math.max(...theory.KRUMHANSL_MAJOR), 'do carries the maximum major-key stability weight');
});

test('composer: every melody note is in the key (diatonic)', () => {
  const scalePcs = new Set(theory.scale(60, 'major').map(pcOf));
  for (let s = 0; s < 20; s++) {
    const p = comp.composePeriod({ seed: 'k' + s, tonic: 'C4' });
    ok(melodyOf(p).every((n) => scalePcs.has(pcOf(n.midi))), 'all melody pcs are C-major scale tones');
  }
});

test('composer: exactly one apex per phrase, tagged, and it is that phrase unique highest note', () => {
  for (let s = 0; s < 30; s++) {
    const p = comp.composePeriod({ seed: 'ap' + s, tonic: 'C4' });
    for (const [lo, hi] of [[0, 16], [16, 32]]) {
      const ph = melodyOf(p).filter((n) => n.beat >= lo && n.beat < hi);
      const max = Math.max(...ph.map((n) => n.midi));
      const atMax = ph.filter((n) => n.midi === max);
      const tagged = ph.filter((n) => (n.tags || []).includes('apex'));
      eq(atMax.length, 1, 'unique highest note in the phrase');
      eq(tagged.length, 1, 'exactly one apex-tagged note');
      eq(tagged[0].midi, max, 'the tagged apex IS the highest note');
    }
  }
});

test('composer: melody is step-dominated with leaps a clear minority (wiki/melody.md interval budget)', () => {
  let steps = 0, leaps = 0, moves = 0;
  for (let s = 0; s < 40; s++) {
    const m = melodyOf(comp.composePeriod({ seed: 'iv' + s, tonic: 'C4' })).map((n) => n.midi);
    for (let i = 1; i < m.length; i++) {
      const d = Math.abs(m[i] - m[i - 1]);
      if (d === 0) continue;
      moves++;
      if (d <= 2) steps++;
      if (d >= 5) leaps++;
    }
  }
  ok(steps / moves > 0.6, `steps are the majority of motion (${(100 * steps / moves).toFixed(0)}%)`);
  ok(leaps / moves < 0.25, `leaps are a minority (${(100 * leaps / moves).toFixed(0)}%)`);
});

test('composer: interior leaps are usually followed by a reversal (~0.7, von Hippel & Huron)', () => {
  // The free-fill reversal bias is measured on INTERIOR leaps. The two structural
  // approaches per phrase — the ascent into the apex (leap landing at index 5,
  // continuing up to the apex at 6) and the descent into the cadence (leap landing
  // at index 10, continuing down to the goal tone at 11) — are deliberately
  // directional (wiki/melody.md: leaps reserved as "deliberate, accented" events
  // to reach the apex/goal) and are excluded, along with their pinned landing
  // notes. A phrase has 12 melody notes. Note the arch contour partly competes
  // with the reversal rule along the monotonic limbs, so even the interior rate
  // sits a little under the free-melody ~0.72.
  const structural = new Set([5, 6, 7, 10, 11]);
  let reversed = 0, leaps = 0;
  for (let s = 0; s < 120; s++) {
    const m = melodyOf(comp.composePeriod({ seed: 'rv' + s, tonic: 'C4' })).map((n) => n.midi);
    for (let i = 2; i < m.length; i++) {
      const prev = m[i - 1] - m[i - 2], cur = m[i] - m[i - 1];
      if (Math.abs(prev) > 4 && !structural.has((i - 1) % 12)) {
        leaps++; if (Math.sign(cur) === -Math.sign(prev)) reversed++;
      }
    }
  }
  ok(reversed / leaps > 0.6, `interior post-leap reversal ${(100 * reversed / leaps).toFixed(0)}% (target ~70%)`);
});

// ---- Phrase rhythm: hypermeter, lengthening, breath ------------------------

test('composer: phrases end with a lengthened note and a breath before the next phrase', () => {
  const p = comp.composePeriod({ seed: 'br', tonic: 'C4' });
  const aLast = anteMel(p).slice(-1)[0];
  ok(aLast.durBeats >= 2, 'antecedent final note is lengthened (>= half note)');
  const aEnd = aLast.beat + aLast.durBeats;
  const cFirst = consMel(p)[0].beat;
  ok(cFirst - aEnd >= 1, 'there is a breath (>= 1 beat rest) between the phrases');
});

test('composer: harmony changes only on bar downbeats; the whole period spans exactly 8 bars', () => {
  const p = comp.composePeriod({ seed: 'hm', tonic: 'C4' });
  for (const n of p.notes) {
    if (n.voice === 'bass' || n.voice === 'chord') eq(n.beat % 4, 0, 'chords land on bar downbeats');
    ok(n.beat >= 0 && n.beat + n.durBeats <= 32, 'every note fits within the 8-bar period');
  }
  const bars = new Set(p.notes.filter((n) => n.voice === 'bass').map((n) => n.beat / 4));
  eq(bars.size, 8, 'eight distinct bars carry harmony');
});

test('composer: note events conform to the engine-architecture schema', () => {
  const p = comp.composePeriod({ seed: 'sc', tonic: 'C4' });
  const voices = new Set();
  for (const n of p.notes) {
    ok(typeof n.beat === 'number' && n.beat >= 0, 'beat is a non-negative number');
    ok(typeof n.durBeats === 'number' && n.durBeats > 0, 'durBeats positive');
    ok(Number.isInteger(n.midi), 'midi is an integer');
    ok(typeof n.voice === 'string' && typeof n.role === 'string', 'voice/role strings');
    ok(Array.isArray(n.tags), 'tags is an array');
    voices.add(n.voice);
  }
  ok(voices.has('melody') && voices.has('bass') && voices.has('chord'), 'all three voices present');
});

// ---- Minor mode -------------------------------------------------------------

test('composer: minor mode resolves to the tonic, uses a leading-tone V, stays in the minor scale', () => {
  const p = comp.composePeriod({ seed: 'min', tonic: 'A3', mode: 'minor' });
  const [ante, cons] = p.plan.phrases;
  eq(ante.chords[3], 'V', 'minor antecedent still reaches a dominant at the HC');
  eq(cons.chords[3], 'i', 'minor consequent resolves to i');
  // The V chord is drawn from harmonic minor, so it must contain the leading tone (G# in A minor).
  const V = p.chordTable['V'];
  ok(V.notes.map(pcOf).includes(pcOf(theory.noteToMidi('G#3'))), 'minor V carries the raised leading tone');
  const cLast = consMel(p).slice(-1)[0];
  eq(pcOf(cLast.midi), pcOf(theory.noteToMidi('A3')), 'melody resolves to the tonic (do)');
  const scalePcs = new Set(theory.scale(theory.noteToMidi('A3'), 'naturalMinor').map(pcOf));
  ok(melodyOf(p).every((n) => scalePcs.has(pcOf(n.midi))), 'melody stays within the natural-minor scale');
});
