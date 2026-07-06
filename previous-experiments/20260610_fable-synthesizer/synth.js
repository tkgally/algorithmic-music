'use strict';

/* =====================================================================
   FABLE — autonomous generative synthesizer
   Pure Web Audio. No samples, no libraries.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Utilities
--------------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class RNG {
  constructor(seed) { this.f = mulberry32(seed); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  weighted(pairs) {            // pairs: [[item, weight], ...]
    let tot = 0;
    for (const p of pairs) tot += p[1];
    if (tot <= 0) return pairs[0][0];
    let r = this.f() * tot;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  }
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
const $ = id => document.getElementById(id);

/* ---------------------------------------------------------------------
   Music theory
--------------------------------------------------------------------- */
const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const MODES = {
  ionian:        [0, 2, 4, 5, 7, 9, 11],
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  phrygian:      [0, 1, 3, 5, 7, 8, 10],
  lydian:        [0, 2, 4, 6, 7, 9, 11],
  mixolydian:    [0, 2, 4, 5, 7, 9, 10],
  aeolian:       [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor:  [0, 2, 3, 5, 7, 9, 11],
};
const MODE_LABELS = {
  ionian: 'major', dorian: 'dorian', phrygian: 'phrygian', lydian: 'lydian',
  mixolydian: 'mixo', aeolian: 'minor', harmonicMinor: 'h.minor', melodicMinor: 'm.minor',
};

/* Meters: everything is on a 16th-note step grid.
   groups: [start, length] phrases for rhythm generation.
   snare: backbeat steps. primary: the heaviest accents.            */
const METERS = {
  '4/4': { steps: 16, groups: [[0, 4], [4, 4], [8, 4], [12, 4]], snare: [4, 12], primary: [0, 8] },
  '3/4': { steps: 12, groups: [[0, 4], [4, 4], [8, 4]],          snare: [8],     primary: [0] },
  '6/8': { steps: 12, groups: [[0, 6], [6, 6]],                  snare: [6],     primary: [0, 6] },
  '5/4': { steps: 20, groups: [[0, 4], [4, 4], [8, 4], [12, 4], [16, 4]], snare: [12], primary: [0, 12] },
  '7/8': { steps: 14, groups: [[0, 4], [4, 4], [8, 6]],          snare: [8],     primary: [0, 8] },
};

/* Per-meter accent strength per step: 3 = downbeat, 2 = group start,
   1 = inner pulse, 0 = weak.                                         */
function strengthArray(meter) {
  const arr = new Array(meter.steps).fill(0);
  for (const [gs, gl] of meter.groups) {
    arr[gs] = Math.max(arr[gs], gs === 0 ? 3 : 2);
    const sub = (gl % 3 === 0) ? 3 : 2;
    for (let s = gs + sub; s < gs + gl; s += sub) arr[s] = Math.max(arr[s], 1);
  }
  return arr;
}

/* Euclidean-ish rhythm: k onsets spread over n steps. */
function euclid(k, n) {
  const out = [];
  for (let i = 0; i < n; i++) if (((i * k) % n) < k) out.push(i);
  return out;
}

/* Degree-to-degree transition weights (0-indexed scale degrees). */
const DEG_NEXT = {
  0: [[1, 2], [2, 1], [3, 3], [4, 2.5], [5, 2], [6, 0.8], [0, 1]],
  1: [[4, 3.5], [6, 1.5], [0, 1], [2, 0.8], [3, 1], [5, 0.7]],
  2: [[5, 2.5], [3, 2], [1, 1.5], [0, 0.7]],
  3: [[4, 3], [0, 2], [1, 1.2], [6, 1], [2, 0.6], [5, 0.8]],
  4: [[0, 3.5], [5, 2], [3, 1], [4, 0.8], [6, 0.5]],
  5: [[1, 2], [3, 2], [4, 2], [0, 1.5], [2, 1], [5, 0.5]],
  6: [[0, 3], [5, 1.5], [4, 1], [3, 0.8]],
};

/* Narrative arcs: map piece position 0..1 to energy 0..1. */
const ARCS = {
  arch:   t => 0.18 + 0.82 * Math.pow(Math.sin(Math.PI * clamp(t * 1.04, 0, 1)), 0.9),
  ascent: t => 0.15 + 0.85 * Math.pow(t, 1.4),
  waves:  t => clamp(0.5 + 0.3 * Math.sin(2 * Math.PI * 3 * t - Math.PI / 2) + 0.13 * Math.sin(2 * Math.PI * 7.1 * t), 0.08, 1),
  still:  t => 0.24 + 0.08 * Math.sin(2 * Math.PI * 2 * t),
  plunge: t => 0.95 - 0.8 * Math.pow(t, 0.8),
  twinPeaks: t => clamp(0.2 + 0.78 * Math.max(
    Math.exp(-Math.pow((t - 0.3) / 0.14, 2)),
    Math.exp(-Math.pow((t - 0.78) / 0.12, 2))), 0.08, 1),
  valley:    t => 0.88 - 0.68 * Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), 1.2),
  staircase: t => 0.2 + 0.75 * Math.min(4, Math.floor(t * 5)) / 4,
  sawtooth:  t => 0.22 + 0.68 * Math.pow((t * 3) % 1, 1.15),
  slowBurn:  t => t < 0.6
    ? 0.18 + 0.05 * Math.sin(2 * Math.PI * 4 * t)
    : 0.18 + 0.82 * Math.pow((t - 0.6) / 0.4, 1.6),
};

/* Recursive rhythmic subdivision of a group of `len` 16th steps. */
function subdivide(rng, len, density, depth) {
  if (len <= 1) return [len];
  const p = density * (depth === 0 ? 0.95 : 0.55) * Math.min(1, len / 4);
  if (!rng.chance(Math.min(0.92, p))) return [len];
  let parts;
  if (len % 2 === 0) {
    if (len >= 6 && rng.chance(0.4)) {
      parts = (len === 6) ? [2, 2, 2] : [len / 2, len / 4, len / 4];
    } else if (len % 4 === 0 && rng.chance(0.2)) {
      parts = rng.chance(0.5) ? [3 * len / 4, len / 4] : [len / 4, 3 * len / 4];
    } else {
      parts = [len / 2, len / 2];
    }
  } else if (len === 3) {
    parts = rng.pick([[2, 1], [1, 2], [1, 1, 1]]);
  } else if (len === 5) {
    parts = rng.pick([[3, 2], [2, 3], [2, 2, 1]]);
  } else {
    parts = [Math.ceil(len / 2), Math.floor(len / 2)];
  }
  const out = [];
  for (const part of parts) out.push(...subdivide(rng, part, density * 0.78, depth + 1));
  return out;
}

/* ---------------------------------------------------------------------
   The Composer — generates one bar of music at a time
--------------------------------------------------------------------- */
class Composer {
  constructor(seed, P) {
    this.rng = new RNG(seed);
    this.homeKey = (P.key === 'random') ? this.rng.int(0, 11) : Number(P.key);
    this.homeMode = (P.mode === 'auto')
      ? this.rng.weighted([['dorian', 3], ['aeolian', 3], ['mixolydian', 2], ['lydian', 2], ['ionian', 2], ['harmonicMinor', 1.2], ['phrygian', 0.8]])
      : P.mode;
    this.keyRoot = this.homeKey;
    this.modeName = this.homeMode;
    this.scale = MODES[this.modeName];
    this.buildScaleMidis();

    this.meterKey = P.meter;
    const meter = METERS[P.meter];
    const barSec = (meter.steps / 4) * (60 / P.tempo);
    this.totalBars = (P.lengthSec == null) ? null : Math.max(5, Math.round(P.lengthSec / barSec));
    this.arc = P.arc;

    this.barIndex = 0;
    this.sectionIdx = -1;
    this.barInSection = 0;
    this.section = null;
    this.movement = 1;
    this.energyDrift = 0;

    this.lastMelodyPitch = null;
    this.lastCounterPitch = null;
    this.prevVoicing = null;
    this.motifs = {};          // theme letter -> motif
    this.curChord = null;
    this.nextChord = this.buildChord(0, false);

    if (this.totalBars != null) this.plan = this.planFinite(this.totalBars);
    this.advanceSection(P);
  }

  /* ----- scale machinery ----- */
  buildScaleMidis() {
    this.scaleMidis = [];
    for (let m = 24; m <= 96; m++) {
      const pc = ((m - this.keyRoot) % 12 + 12) % 12;
      if (this.scale.includes(pc)) this.scaleMidis.push(m);
    }
  }

  nearestIdx(midi) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.scaleMidis.length; i++) {
      const d = Math.abs(this.scaleMidis[i] - midi);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  idxPitch(idx) { return this.scaleMidis[clamp(idx, 0, this.scaleMidis.length - 1)]; }

  /* ----- chords ----- */
  buildChord(deg, seventh, scaleOverride) {
    const scale = scaleOverride || this.scale;
    const size = seventh ? 4 : 3;
    const offs = [];
    for (let k = 0; k < size; k++) {
      const idx = deg + 2 * k;
      offs.push(scale[idx % 7] + 12 * Math.floor(idx / 7));
    }
    return this.finishChord(deg, offs);
  }

  finishChord(deg, offs) {
    const rootPc = ((this.keyRoot + offs[0]) % 12 + 12) % 12;
    const pcs = offs.map(o => ((this.keyRoot + o) % 12 + 12) % 12);
    const third = offs[1] - offs[0], fifth = offs[2] - offs[0];
    const seventh = offs.length > 3 ? offs[3] - offs[0] : null;
    let q = '';
    if (third === 3 && fifth === 6) q = seventh === 9 ? '°7' : (seventh === 10 ? 'ø7' : 'dim');
    else if (third === 3) q = seventh === 10 ? 'm7' : (seventh === 11 ? 'mM7' : 'm');
    else if (third === 4 && fifth === 8) q = '+';
    else q = seventh === 10 ? '7' : (seventh === 11 ? 'maj7' : '');
    return { deg, offs, pcs, rootPc, label: NOTE_NAMES[rootPc] + q };
  }

  pickNextChord(P, energy, forceDeg) {
    if (forceDeg != null) {
      return this.buildChord(forceDeg, this.rng.chance(0.3 + energy * 0.4));
    }
    const from = this.curChord ? this.curChord.deg : 0;
    let pairs = (DEG_NEXT[from] || DEG_NEXT[0]).map(([d, w]) => {
      let weight = Math.pow(w, 1 - P.variety * 0.45);            // variety flattens the distribution
      if ((d === 4 || d === 6) && energy > 0.55) weight *= 1 + (energy - 0.55);
      return [d, weight];
    });
    const deg = this.rng.weighted(pairs);
    const seventh = this.rng.chance(0.15 + energy * 0.3 + P.variety * 0.3);
    let chord = this.buildChord(deg, seventh);

    // Shadow: borrow the same degree from the parallel mode
    if (P.shadow > 0 && this.rng.chance(P.shadow * 0.3)) {
      const majorish = this.scale[2] === 4;
      const par = MODES[majorish ? 'aeolian' : 'ionian'];
      chord = this.buildChord(deg, seventh, par);
      chord.borrowed = true;
    }
    return chord;
  }

  /* Turn the current chord into V7 of the chord that follows. */
  secondaryDominant(target) {
    const root = (target.rootPc + 7) % 12;
    const r = ((root - this.keyRoot) % 12 + 12) % 12;
    const offs = [r, r + 4, r + 7, r + 10];
    const c = this.finishChord(-1, offs);
    c.secondary = true;
    return c;
  }

  /* ----- structure ----- */
  planFinite(total) {
    const sections = [];
    if (total <= 8) {
      sections.push({ name: 'Theme A', type: 'theme', theme: 'A', bars: Math.max(1, total - 2) });
      sections.push({ name: 'Coda', type: 'coda', bars: Math.min(2, total - 1) });
      return sections;
    }
    const intro = clamp(Math.round(total * 0.12), 1, 8);
    const coda = clamp(Math.round(total * 0.15), 2, 10);
    let body = total - intro - coda;
    sections.push({ name: 'Intro', type: 'intro', bars: intro });
    const chunk = body >= 24 ? 8 : (body >= 10 ? 6 : Math.max(2, body));
    const themes = ['A', 'B', 'A', 'C', 'B', 'A', 'C', 'A'];
    let i = 0;
    while (body > 0) {
      const b = Math.min(chunk, body);
      sections.push({ name: 'Theme ' + themes[i % themes.length], type: 'theme', theme: themes[i % themes.length], bars: b });
      body -= b; i++;
    }
    sections.push({ name: 'Coda', type: 'coda', bars: coda });
    // label the section nearest the arc peak as the climax
    let acc = 0, best = -1, bestE = -1;
    const arcF = ARCS[this.arc] || ARCS.arch;
    for (let s = 0; s < sections.length; s++) {
      const mid = (acc + sections[s].bars / 2) / total;
      const e = arcF(mid);
      if (sections[s].type === 'theme' && e > bestE) { bestE = e; best = s; }
      acc += sections[s].bars;
    }
    if (best >= 0) sections[best].name = 'Climax · ' + sections[best].name;
    return sections;
  }

  nextInfiniteSection() {
    const r = this.rng;
    const type = r.weighted([['theme', 6], ['breakdown', 1.4], ['soar', 1.4]]);
    const theme = r.pick(['A', 'A', 'B', 'B', 'C']);
    const bars = r.pick([6, 8, 8, 8, 10, 12]);
    let name;
    if (type === 'breakdown') name = 'Interlude';
    else if (type === 'soar') name = 'Soar · ' + theme;
    else name = 'Theme ' + theme;
    return { name: 'Mvt ' + this.movement + ' · ' + name, type, theme, bars };
  }

  advanceSection(P) {
    this.sectionIdx++;
    this.barInSection = 0;
    if (this.totalBars != null) {
      this.section = this.plan[Math.min(this.sectionIdx, this.plan.length - 1)];
    } else {
      if (this.sectionIdx > 0 && this.sectionIdx % 5 === 0) this.movement++;
      this.section = this.nextInfiniteSection();
    }

    if (this.sectionIdx > 0 && this.section.type !== 'coda') {
      this.maybeModulate(P);
    }
    // approaching the end, come home
    if (this.totalBars != null && this.section.type === 'coda') this.goHome();
  }

  maybeModulate(P) {
    const r = this.rng;
    const away = this.keyRoot !== this.homeKey || this.modeName !== this.homeMode;
    if (away && r.chance(0.45)) { this.goHome(); return; }
    if (!r.chance(P.wanderlust * 0.55)) return;

    const majorish = this.scale[2] === 4;
    const move = r.weighted([
      ['fifthUp', 3], ['fifthDown', 3],
      ['relative', 2.2], ['parallel', 1 + P.variety * 1.5],
      ['mediant', P.variety * 2], ['stepUp', P.variety * 1.2],
    ]);
    if (move === 'fifthUp') this.keyRoot = (this.keyRoot + 7) % 12;
    else if (move === 'fifthDown') this.keyRoot = (this.keyRoot + 5) % 12;
    else if (move === 'stepUp') this.keyRoot = (this.keyRoot + 2) % 12;
    else if (move === 'mediant') this.keyRoot = (this.keyRoot + (r.chance(0.5) ? 4 : 8)) % 12;
    else if (move === 'relative') {
      if (majorish) { this.keyRoot = (this.keyRoot + 9) % 12; this.modeName = 'aeolian'; }
      else { this.keyRoot = (this.keyRoot + 3) % 12; this.modeName = 'ionian'; }
    } else if (move === 'parallel') {
      this.modeName = majorish ? 'aeolian' : (r.chance(0.4) ? 'lydian' : 'ionian');
    }
    this.scale = MODES[this.modeName];
    this.buildScaleMidis();
    this.curChord = null;
    this.nextChord = this.buildChord(0, false);
  }

  goHome() {
    this.keyRoot = this.homeKey;
    this.modeName = this.homeMode;
    this.scale = MODES[this.modeName];
    this.buildScaleMidis();
    this.curChord = null;
    this.nextChord = this.buildChord(0, false);
  }

  energyForBar(P) {
    let e;
    if (this.totalBars != null) {
      const t = this.barIndex / this.totalBars;
      e = (ARCS[this.arc] || ARCS.arch)(t);
      const sec = this.section;
      if (sec.type === 'intro') e *= lerp(0.45, 0.9, (this.barInSection + 1) / sec.bars);
      if (sec.type === 'coda') e *= lerp(0.75, 0.15, this.barInSection / Math.max(1, sec.bars - 1));
    } else {
      this.energyDrift = clamp(this.energyDrift + this.rng.range(-0.04, 0.04), -0.15, 0.15);
      e = 0.52 + 0.3 * Math.sin(2 * Math.PI * this.barIndex / 48 - Math.PI / 2) + this.energyDrift;
      if (this.section.type === 'breakdown') e *= 0.42;
      if (this.section.type === 'soar') e = Math.max(e, 0.78);
    }
    return clamp(e, 0.08, 1);
  }

  /* ----- the main event: one bar ----- */
  nextBar(P) {
    const r = this.rng;
    if (this.barInSection >= this.section.bars) this.advanceSection(P);
    // user changed home key/mode mid-flight: adopt at section change only (handled in goHome/modulate);
    // but if the home itself changed, follow it now
    const wantKey = (P.key === 'random') ? this.homeKey : Number(P.key);
    if (wantKey !== this.homeKey) { this.homeKey = wantKey; this.goHome(); }
    if (P.mode !== 'auto' && P.mode !== this.homeMode) { this.homeMode = P.mode; this.goHome(); }

    if (P.meter !== this.meterKey) { this.meterKey = P.meter; this.motifs = {}; }
    const meter = METERS[P.meter];
    const strength = strengthArray(meter);
    const energy = this.energyForBar(P);
    const sec = this.section;
    const finite = this.totalBars != null;
    const fromEnd = finite ? this.totalBars - this.barIndex : Infinity;
    const isLast = finite && fromEnd === 1;
    const swingOK = !meter.groups.some(g => g[1] % 3 === 0);
    const swingAmt = swingOK ? P.swing * 0.62 : 0;

    /* --- harmony for this bar --- */
    let chord;
    if (finite && fromEnd === 2) {
      chord = this.buildChord(4, true);                       // penultimate: dominant
      this.nextChord = this.buildChord(0, false);
    } else if (isLast) {
      chord = this.buildChord(0, energy > 0.4);               // final tonic
      this.nextChord = chord;
    } else {
      if (this.barInSection === 0 && sec.type !== 'coda') {
        chord = this.pickNextChord(P, energy, r.chance(0.7) ? 0 : 5);   // sections open on tonic-ish
      } else if (this.barInSection === sec.bars - 1 && r.chance(0.6)) {
        chord = this.pickNextChord(P, energy, 4);             // phrase-final dominant
      } else {
        chord = this.nextChord;
      }
      this.nextChord = this.pickNextChord(P, energy);
      // shadow: secondary dominant pointing at what comes next
      if (P.shadow > 0 && this.nextChord.deg !== chord.deg && r.chance(P.shadow * 0.22)) {
        chord = this.secondaryDominant(this.nextChord);
      }
    }
    this.curChord = chord;

    // occasionally two chords per bar at higher complexity
    const barChords = [{ step: 0, chord }];
    if (!isLast && fromEnd > 2 && P.complexity > 0.6 && r.chance((P.complexity - 0.6) * 0.85)) {
      const mid = meter.groups[Math.floor(meter.groups.length / 2)][0];
      barChords.push({ step: mid, chord: this.nextChord });
    }
    const chordAt = step => {
      let c = barChords[0].chord;
      for (const bc of barChords) if (bc.step <= step) c = bc.chord;
      return c;
    };

    const ev = [];
    const hum = (tight) => (r.next() * 2 - 1) * P.humanity * (tight ? 0.04 : 0.09);
    const swing = (step) => {
      if (swingAmt <= 0) return step;
      const pos = ((step % 4) + 4) % 4;
      if (pos === 2) return step + swingAmt;
      if (pos === 1 || pos === 3) return step + swingAmt * 0.3;
      return step;
    };
    const velJit = () => (r.next() * 2 - 1) * P.humanity * 0.12;

    /* --- voice gating by structure & energy --- */
    const leadActive = P.mix.lead > 0 &&
      (sec.type !== 'intro' || this.barInSection >= Math.max(0, sec.bars - 2)) &&
      sec.type !== 'breakdown';
    const counterActive = P.mix.counter > 0 && energy > 0.42 && sec.type !== 'intro' && sec.type !== 'breakdown' && !isLast;
    const arpActive = P.mix.arp > 0 && (energy > 0.28 || sec.type === 'intro' || sec.type === 'breakdown') && !isLast;
    const percActive = P.mix.perc > 0 && energy > 0.34 && sec.type !== 'breakdown' && fromEnd > 2;
    const padActive = P.mix.pad > 0;
    const bassActive = P.mix.bass > 0;

    /* --- PAD --- */
    if (padActive) {
      for (let ci = 0; ci < barChords.length; ci++) {
        const bc = barChords[ci];
        const end = (ci + 1 < barChords.length) ? barChords[ci + 1].step : meter.steps;
        const voicing = this.voiceChord(bc.chord);
        for (const m of voicing) {
          ev.push({ voice: 'pad', step: bc.step, dur: end - bc.step, midi: m,
                    vel: clamp(0.32 + energy * 0.3 + velJit() * 0.5, 0.1, 0.85) });
        }
      }
    }

    /* --- MELODY --- */
    let melodyNotes = [];
    if (leadActive && !isLast) {
      melodyNotes = this.makeMelody(P, meter, strength, energy, chordAt, sec, r);
      for (const n of melodyNotes) {
        ev.push({ voice: 'lead', step: clamp(swing(n.step) + hum(false), 0, meter.steps - 0.05),
                  dur: n.dur * 0.92, midi: n.midi, vel: n.vel });
        // sparkle: grace note
        if (P.sparkle > 0 && n.dur >= 2 && r.chance(P.sparkle * 0.22)) {
          const gi = this.nearestIdx(n.midi) + (r.chance(0.6) ? 1 : -1);
          ev.push({ voice: 'lead', step: Math.max(0, swing(n.step) - 0.28), dur: 0.26,
                    midi: this.idxPitch(gi), vel: n.vel * 0.45, grace: true });
        }
      }
    }
    if (isLast) {
      // final gesture: a long tonic, maybe approached from the fifth
      const tonic = this.idxPitch(this.nearestIdx(this.lastMelodyPitch || (this.keyRoot + 64)));
      const tonicMidi = this.snapToPc(tonic, this.keyRoot % 12);
      if (P.mix.lead > 0) {
        ev.push({ voice: 'lead', step: 0, dur: meter.steps, midi: tonicMidi, vel: 0.6 });
        if (r.chance(0.5)) ev.push({ voice: 'lead', step: 0, dur: meter.steps, midi: tonicMidi + 7, vel: 0.35 });
      }
    }

    /* --- COUNTERPOINT --- */
    if (counterActive) {
      const cNotes = this.makeCounter(P, meter, strength, energy, chordAt, melodyNotes, r);
      for (const n of cNotes) {
        ev.push({ voice: 'counter', step: clamp(swing(n.step) + hum(false), 0, meter.steps - 0.05),
                  dur: n.dur * 0.9, midi: n.midi, vel: n.vel });
      }
    }

    /* --- BASS --- */
    if (bassActive) {
      this.makeBass(P, meter, strength, energy, chordAt, isLast, r).forEach(n => {
        ev.push({ voice: 'bass', step: clamp(swing(n.step) + hum(true), 0, meter.steps - 0.05),
                  dur: n.dur * 0.95, midi: n.midi, vel: n.vel });
      });
    }

    /* --- ARPEGGIO --- */
    if (arpActive) {
      this.makeArp(P, meter, strength, energy, chordAt, r).forEach(n => {
        ev.push({ voice: 'arp', step: clamp(swing(n.step) + hum(true), 0, meter.steps - 0.05),
                  dur: n.dur, midi: n.midi, vel: n.vel });
      });
    }

    /* --- PERCUSSION --- */
    if (percActive) {
      this.makePerc(P, meter, strength, energy, sec, swing, r).forEach(n => ev.push(n));
    } else if (isLast && P.mix.perc > 0) {
      ev.push({ voice: 'perc', type: 'hatOpen', step: 0, vel: 0.25 });
    }

    /* --- tempo feel --- */
    let tempoFactor = 1;
    if (finite) {
      if (fromEnd === 1) tempoFactor = 1.22;
      else if (fromEnd === 2) tempoFactor = 1.1;
      else if (fromEnd === 3) tempoFactor = 1.04;
    }

    const result = {
      events: ev,
      steps: meter.steps,
      tempoFactor,
      isLast,
      energy,
      display: {
        key: NOTE_NAMES[this.keyRoot] + ' ' + (MODE_LABELS[this.modeName] || this.modeName),
        chord: chord.label + (chord.borrowed ? ' *' : '') + (chord.secondary ? ' →' : ''),
        section: sec.name,
      },
    };
    this.barIndex++;
    this.barInSection++;
    return result;
  }

  snapToPc(nearMidi, pc) {
    let best = nearMidi, bd = Infinity;
    for (let m = nearMidi - 11; m <= nearMidi + 11; m++) {
      if (((m % 12) + 12) % 12 === pc) {
        const d = Math.abs(m - nearMidi);
        if (d < bd) { bd = d; best = m; }
      }
    }
    return best;
  }

  /* ----- melody ----- */
  makeMelody(P, meter, strength, energy, chordAt, sec, r) {
    const density = clamp(0.22 + P.complexity * 0.52 + energy * 0.26, 0.1, 0.95);

    // motif logic: themes remember their material (fractality)
    const theme = sec.theme || 'A';
    let notes = null;
    if (this.motifs[theme] && this.motifs[theme].steps === meter.steps && r.chance(P.fractality * 0.8)) {
      notes = this.developMotif(this.motifs[theme], P, chordAt, r);
    }
    if (!notes) {
      notes = this.freshMelody(P, meter, strength, density, energy, chordAt, r);
      if (!this.motifs[theme] && notes.length >= 2) {
        this.motifs[theme] = {
          steps: meter.steps,
          notes: notes.map(n => ({ step: n.step, dur: n.dur,
            degOff: this.nearestIdx(n.midi) - this.nearestIdx(notes[0].midi) })),
        };
      }
    }

    // velocities + register shaping
    for (const n of notes) {
      const s = Math.round(n.step) % meter.steps;
      const acc = (strength[s] >= 2) ? 0.16 : (strength[s] === 1 ? 0.06 : 0);
      n.vel = clamp(0.5 + energy * 0.32 + acc + (r.next() * 2 - 1) * P.humanity * 0.12, 0.12, 1);
    }
    if (notes.length) this.lastMelodyPitch = notes[notes.length - 1].midi;
    return notes;
  }

  freshMelody(P, meter, strength, density, energy, chordAt, r) {
    // rhythm
    const slots = [];
    for (const [gs, gl] of meter.groups) {
      const durs = subdivide(r, gl, density, 0);
      let s = gs;
      for (const d of durs) { slots.push({ step: s, dur: d }); s += d; }
    }
    const restP = (slot) => {
      const s = slot.step % meter.steps;
      if (s === 0) return 0.04;
      return (strength[s] >= 2 ? 0.07 : 0.16) + (1 - energy) * 0.14;
    };
    const notes = slots.filter(sl => !r.chance(restP(sl)));

    // pitches: weighted random walk
    const lo = 55 + Math.round(energy * 6), hi = lo + 26;
    const center = this.snapToPc(67, this.keyRoot % 12);
    let prev = this.lastMelodyPitch != null ? this.lastMelodyPitch : this.idxPitch(this.nearestIdx(center));
    let forcedDir = 0, repeats = 0;

    for (const n of notes) {
      const chord = chordAt(n.step);
      const strong = strength[Math.round(n.step) % meter.steps] >= 2;
      const cands = this.scaleMidis.filter(m =>
        m >= Math.max(lo, prev - 9) && m <= Math.min(hi, prev + 9));
      if (!cands.length) { n.midi = prev; continue; }
      const pairs = cands.map(c => {
        const iv = Math.abs(c - prev);
        let w = 1 / (1 + Math.pow(iv, 1.45));
        const inChord = chord.pcs.includes(((c % 12) + 12) % 12);
        if (strong) w *= inChord ? 3.2 : 0.45;
        else if (inChord) w *= 1.35;
        w *= 1 / (1 + (Math.abs(c - center) / 12) * P.gravity * 2.2);
        if (forcedDir !== 0) {
          const dir = Math.sign(c - prev);
          if (dir === forcedDir && iv <= 4) w *= 4;
          else if (dir === -forcedDir) w *= 0.15;
        }
        if (c === prev) w *= (repeats >= 2 ? 0.06 : 0.55);
        return [c, w];
      });
      n.midi = r.weighted(pairs);
      const jump = n.midi - prev;
      forcedDir = (Math.abs(jump) >= 5) ? -Math.sign(jump) : 0;
      repeats = (n.midi === prev) ? repeats + 1 : 0;
      prev = n.midi;
    }

    // shadow: chromatic approach tones on weak short notes
    if (P.shadow > 0) {
      for (let i = 0; i < notes.length - 1; i++) {
        const n = notes[i], nx = notes[i + 1];
        if (n.dur <= 1 && strength[Math.round(n.step) % meter.steps] === 0 &&
            Math.abs(nx.midi - n.midi) >= 2 && r.chance(P.shadow * 0.3)) {
          n.midi = nx.midi + (nx.midi > n.midi ? -1 : 1);
          n.chromatic = true;
        }
      }
    }
    return notes;
  }

  developMotif(motif, P, chordAt, r) {
    const op = r.weighted([
      ['exact', 2], ['transpose', 2.5],
      ['invert', 0.8 + P.fractality * 1.2],
      ['retro', 0.5 + P.fractality * 0.8],
      ['embellish', 1.4],
    ]);
    let src = motif.notes.map(n => ({ ...n }));
    if (op === 'retro') {
      const total = motif.steps;
      src = src.map(n => ({ ...n, step: total - n.step - n.dur })).sort((a, b) => a.step - b.step);
    }
    // anchor: nearest chord tone to where the melody last was
    const chord = chordAt(src.length ? src[0].step : 0);
    const near = this.lastMelodyPitch != null ? this.lastMelodyPitch : this.keyRoot + 64;
    let anchorMidi = near;
    let bd = Infinity;
    for (const m of this.scaleMidis) {
      if (m < 55 || m > 84) continue;
      if (!chord.pcs.includes(((m % 12) + 12) % 12)) continue;
      const d = Math.abs(m - near);
      if (d < bd) { bd = d; anchorMidi = m; }
    }
    const anchorIdx = this.nearestIdx(anchorMidi);
    const shift = (op === 'transpose') ? r.pick([-2, -1, 1, 2]) : 0;
    const sign = (op === 'invert') ? -1 : 1;

    const out = src.map(n => ({
      step: n.step, dur: n.dur,
      midi: this.idxPitch(anchorIdx + sign * n.degOff + shift),
    }));

    if (op === 'embellish') {
      const extra = [];
      for (const n of out) {
        if (n.dur >= 2 && r.chance(0.5)) {
          const half = n.dur / 2;
          extra.push({ step: n.step + half, dur: half,
                       midi: this.idxPitch(this.nearestIdx(n.midi) + r.pick([-1, 1])) });
          n.dur = half;
        }
      }
      out.push(...extra);
      out.sort((a, b) => a.step - b.step);
    }
    if (out.length) this.lastMelodyPitch = out[out.length - 1].midi;
    return out;
  }

  /* ----- counterpoint ----- */
  makeCounter(P, meter, strength, energy, chordAt, melodyNotes, r) {
    const out = [];
    const melOnsets = new Set(melodyNotes.map(n => Math.round(n.step)));
    const covered = new Set();
    for (const n of melodyNotes) {
      for (let s = Math.floor(n.step); s < Math.min(meter.steps, n.step + n.dur); s++) covered.add(s);
    }
    let slots = [];
    if (P.hocket > 0.35) {
      // sing in the melody's silences
      let s = 0;
      while (s < meter.steps) {
        if (!covered.has(s) && r.chance(0.35 + P.hocket * 0.55)) {
          let len = 1;
          while (s + len < meter.steps && !covered.has(s + len) && len < 4) len++;
          slots.push({ step: s, dur: len });
          s += len;
        } else s++;
      }
    }
    if (slots.length === 0) {
      // slower line on group starts
      for (const [gs, gl] of meter.groups) {
        if (r.chance(0.42 + energy * 0.3)) slots.push({ step: gs, dur: gl });
      }
    }

    let prev = this.lastCounterPitch != null ? this.lastCounterPitch : this.keyRoot + 55;
    const melDir = melodyNotes.length >= 2
      ? Math.sign(melodyNotes[melodyNotes.length - 1].midi - melodyNotes[0].midi) : 0;

    for (const sl of slots) {
      const chord = chordAt(sl.step);
      const cands = this.scaleMidis.filter(m => m >= 48 && m <= 70 &&
        chord.pcs.includes(((m % 12) + 12) % 12));
      if (!cands.length) continue;
      const pairs = cands.map(c => {
        let w = 1 / (1 + Math.abs(c - prev) / 2.5);
        if (melDir !== 0 && Math.sign(c - prev) === -melDir) w *= 2.1;  // contrary motion
        return [c, w];
      });
      const midi = r.weighted(pairs);
      out.push({ step: sl.step, dur: sl.dur,
                 midi, vel: clamp(0.36 + energy * 0.26 + (r.next() * 2 - 1) * 0.07, 0.1, 0.8) });
      prev = midi;
    }
    if (out.length) this.lastCounterPitch = out[out.length - 1].midi;
    return out;
  }

  /* ----- bass ----- */
  makeBass(P, meter, strength, energy, chordAt, isLast, r) {
    const out = [];
    const rootMidi = (pc) => 36 + ((pc - 36) % 12 + 12) % 12;
    if (isLast) {
      const c = chordAt(0);
      out.push({ step: 0, dur: meter.steps, midi: rootMidi(c.rootPc), vel: 0.6 });
      return out;
    }
    const tier = clamp(Math.floor((energy * 0.62 + P.complexity * 0.58) * 4), 0, 3);
    const groups = meter.groups;
    if (tier === 0) {
      const c = chordAt(0);
      out.push({ step: 0, dur: meter.steps, midi: rootMidi(c.rootPc), vel: 0.5 + energy * 0.2 });
      const mid = groups[Math.floor(groups.length / 2)][0];
      if (mid > 0 && chordAt(mid) !== c) {
        out[0].dur = mid;
        out.push({ step: mid, dur: meter.steps - mid, midi: rootMidi(chordAt(mid).rootPc), vel: 0.5 });
      }
    } else if (tier === 1) {
      for (let i = 0; i < groups.length; i++) {
        const [gs, gl] = groups[i];
        const c = chordAt(gs);
        const useFifth = i % 2 === 1 && r.chance(0.7);
        const pc = useFifth ? (c.rootPc + 7) % 12 : c.rootPc;
        out.push({ step: gs, dur: gl, midi: rootMidi(pc), vel: 0.48 + energy * 0.22 });
      }
    } else if (tier === 2) {
      // groove: roots with octave pops and rests
      for (const [gs, gl] of groups) {
        const c = chordAt(gs);
        const root = rootMidi(c.rootPc);
        const sub = gl % 3 === 0 ? 3 : 2;
        for (let s = gs; s < gs + gl; s += sub) {
          if (s !== gs && r.chance(0.3)) continue;
          const oct = (s !== gs && r.chance(0.3 + P.sparkle * 0.3));
          out.push({ step: s, dur: sub, midi: root + (oct ? 12 : 0),
                     vel: (s === gs ? 0.62 : 0.42) + energy * 0.18 });
        }
      }
    } else {
      // walking: chord tones stepping toward the next group's root
      for (let i = 0; i < groups.length; i++) {
        const [gs, gl] = groups[i];
        const c = chordAt(gs);
        const nxt = (i + 1 < groups.length) ? chordAt(groups[i + 1][0]) : this.nextChord;
        const root = rootMidi(c.rootPc);
        out.push({ step: gs, dur: Math.min(4, gl), midi: root, vel: 0.6 + energy * 0.15 });
        if (gl >= 4) {
          const targetRoot = rootMidi(nxt.rootPc);
          const tones = [root + 7, root + (c.offs[1] - c.offs[0]), targetRoot + (r.chance(0.5) ? 1 : -1)];
          const pickMid = tones[r.int(0, tones.length - 1)];
          out.push({ step: gs + Math.floor(gl / 2), dur: Math.ceil(gl / 2),
                     midi: clamp(pickMid, 30, 52), vel: 0.45 + energy * 0.15 });
        }
      }
    }
    return out;
  }

  /* ----- arpeggio ----- */
  makeArp(P, meter, strength, energy, chordAt, r) {
    const out = [];
    const sixteenths = P.complexity > 0.58 && energy > 0.55;
    const rate = sixteenths ? 1 : 2;
    if (this.arpShape == null || this.barInSection === 0) {
      this.arpShape = r.pick(['up', 'down', 'updown', 'weave']);
    }
    let k = 0;
    for (let s = 0; s < meter.steps; s += rate) {
      const dens = 0.45 + energy * 0.4 + P.complexity * 0.15;
      if (!r.chance(dens)) { k++; continue; }
      const chord = chordAt(s);
      const pool = [];
      for (let m = 60; m <= 79; m++) {
        if (chord.pcs.includes(((m % 12) + 12) % 12)) pool.push(m);
      }
      if (!pool.length) { k++; continue; }
      let idx;
      const L = pool.length;
      if (this.arpShape === 'up') idx = k % L;
      else if (this.arpShape === 'down') idx = (L - 1) - (k % L);
      else if (this.arpShape === 'updown') {
        const cyc = k % (2 * L - 2 || 1);
        idx = cyc < L ? cyc : (2 * L - 2 - cyc);
      } else idx = (k * 3 + Math.floor(k / L)) % L;
      let midi = pool[idx];
      if (P.sparkle > 0 && r.chance(P.sparkle * 0.12)) midi += 12;
      out.push({ step: s, dur: rate * 0.8,
                 midi, vel: clamp(0.26 + energy * 0.3 + (strength[s] >= 2 ? 0.1 : 0), 0.08, 0.7) });
      k++;
    }
    return out;
  }

  /* ----- percussion ----- */
  makePerc(P, meter, strength, energy, sec, swing, r) {
    const out = [];
    const steps = meter.steps;
    const full = energy > 0.55;
    const lastOfSection = this.barInSection === sec.bars - 1;
    const push = (type, step, vel) => out.push({ voice: 'perc', type, step: clamp(step, 0, steps - 0.05), vel });

    // kick
    const kCount = clamp(1 + Math.round(energy * 2.6 + P.complexity * 1.2), 1, 5);
    const kicks = euclid(kCount, steps).filter(s => strength[s] >= 1 || r.chance(P.complexity * 0.5));
    if (!kicks.includes(0)) kicks.unshift(0);
    for (const s of kicks) push('kick', s, 0.7 + (strength[s] >= 2 ? 0.2 : 0));

    // snare: backbeat, or euclid scatter at high complexity
    if (full) {
      const snares = (P.complexity > 0.7 && r.chance(0.35))
        ? euclid(3, steps).map(s => (s + 2) % steps)
        : meter.snare;
      for (const s of snares) push('snare', swing(s), 0.55 + energy * 0.2);
    }

    // hats
    if (energy > 0.42) {
      const compound = meter.groups.some(g => g[1] % 3 === 0);
      const hatRate = (full && P.complexity > 0.55) ? 1 : (compound ? 3 : 2);
      for (let s = 0; s < steps; s += hatRate) {
        if (r.chance(0.12)) continue;
        const acc = strength[s] >= 2 ? 0.3 : (strength[s] === 1 ? 0.16 : 0.06);
        push('hat', swing(s), 0.18 + acc + energy * 0.15);
      }
      if (P.sparkle > 0 && r.chance(P.sparkle * 0.4)) {
        push('hatOpen', swing(steps - 2), 0.3);
      }
    } else {
      // low energy: soft shaker pulse
      for (const [gs] of meter.groups) {
        if (r.chance(0.6)) push('shaker', gs, 0.2);
      }
    }
    if (full && energy > 0.6) {
      for (let s = 1; s < steps; s += 2) if (r.chance(0.25)) push('shaker', swing(s), 0.18);
    }

    // section-final fill
    if (lastOfSection && energy > 0.5 && r.chance(0.75)) {
      const fillStart = steps - Math.min(4, Math.floor(steps / 4));
      for (let s = fillStart; s < steps; s++) {
        push('snare', s, 0.3 + 0.5 * (s - fillStart) / Math.max(1, steps - fillStart - 1));
      }
    }
    return out;
  }

  /* ----- pad voicing with smooth voice-leading ----- */
  voiceChord(chord) {
    const pcs = chord.pcs.slice(0, 4);
    const lo = 46, hi = 71;
    let voicing;
    if (!this.prevVoicing) {
      voicing = [];
      let base = this.snapToPc(50, chord.rootPc);
      voicing.push(base);
      for (let i = 1; i < pcs.length; i++) {
        let m = this.snapToPc(voicing[i - 1] + 4, pcs[i]);
        while (m <= voicing[i - 1]) m += 12;
        if (m > hi) m -= 12;
        voicing.push(m);
      }
    } else {
      voicing = pcs.map(pc => {
        let best = null, bd = Infinity;
        for (let m = lo; m <= hi; m++) {
          if (((m % 12) + 12) % 12 !== pc) continue;
          let d = Infinity;
          for (const pv of this.prevVoicing) d = Math.min(d, Math.abs(m - pv));
          if (d < bd) { bd = d; best = m; }
        }
        return best == null ? this.snapToPc(58, pc) : best;
      });
      voicing = [...new Set(voicing)].sort((a, b) => a - b);
    }
    this.prevVoicing = voicing;
    return voicing;
  }
}

/* ---------------------------------------------------------------------
   Audio engine
--------------------------------------------------------------------- */
let ctx = null;
let nodes = null;        // buses & master chain
let noiseBuf = null;

function buildAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  const master = ctx.createGain();
  const tideFilter = ctx.createBiquadFilter();
  tideFilter.type = 'lowpass';
  tideFilter.frequency.value = 18000;
  tideFilter.Q.value = 0.4;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 22;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.24;
  // hard safety limiter: clamps anything that slips past the compressor
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;

  master.connect(tideFilter);
  tideFilter.connect(comp);
  comp.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(ctx.destination);

  // reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(3.2, 2.6);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 1;
  convolver.connect(reverbOut);
  reverbOut.connect(master);

  // echo (dotted eighth) for lead & arp
  const echoIn = ctx.createGain();
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.34;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 4200;
  const echoWet = ctx.createGain();
  echoWet.gain.value = 0.3;
  echoIn.connect(delay);
  delay.connect(echoTone);
  echoTone.connect(fb);
  fb.connect(delay);
  echoTone.connect(echoWet);
  echoWet.connect(master);
  echoWet.connect(convolver);

  // voice buses with individual reverb sends
  const buses = {};
  const sendAmt = { lead: 0.4, counter: 0.38, pad: 0.6, arp: 0.34, bass: 0.07, perc: 0.18 };
  const sends = {};
  for (const name of ['lead', 'counter', 'pad', 'arp', 'bass', 'perc']) {
    const g = ctx.createGain();
    g.connect(master);
    const send = ctx.createGain();
    send.gain.value = 0;
    g.connect(send);
    send.connect(convolver);
    buses[name] = g;
    sends[name] = send;
  }

  // shared noise buffer
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  nodes = { master, tideFilter, comp, analyser, convolver, reverbOut, echoIn, delay, fb, echoWet, buses, sends, sendAmt };
  applyMixes();
  applySpace();
}

function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function noiseSource(t, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start(t);
  src.stop(t + dur);
  return src;
}

function scrap(src, parts) {
  src.onended = () => { for (const n of parts) { try { n.disconnect(); } catch (e) {} } };
}

/* ----- instruments ----- */
function playLead(t, freq, dur, vel, P) {
  const bus = nodes.buses.lead;
  const detune = (Math.random() * 2 - 1) * P.humanity * 7;
  const timbre = P.leadTimbre;
  if (timbre === 'glass') {
    const car = ctx.createOscillator();
    car.frequency.value = freq;
    car.detune.value = detune;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * 3.003;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * (1.4 + vel * 1.6), t);
    mg.gain.exponentialRampToValueAtTime(freq * 0.04, t + Math.max(0.25, dur * 0.85));
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.17 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    car.connect(g);
    g.connect(bus);
    g.connect(nodes.echoIn);
    car.start(t); mod.start(t);
    car.stop(t + dur + 0.6); mod.stop(t + dur + 0.6);
    scrap(car, [g, mg, mod]);
  } else if (timbre === 'reed') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(5, t + Math.min(0.4, dur * 0.5));
    vib.connect(vibG); vibG.connect(osc.detune);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700 + vel * 2600, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(500, 400 + vel * 1200), t + dur);
    lp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15 * vel, t + 0.025);
    g.gain.setValueAtTime(0.15 * vel, t + Math.max(0.03, dur - 0.05));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.08);
    osc.connect(lp); lp.connect(g); g.connect(bus); g.connect(nodes.echoIn);
    osc.start(t); vib.start(t);
    osc.stop(t + dur + 0.15); vib.stop(t + dur + 0.15);
    scrap(osc, [g, lp, vib, vibG]);
  } else if (timbre === 'breath') {
    const o1 = ctx.createOscillator();
    o1.frequency.value = freq;
    o1.detune.value = detune;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 1.004;
    const o2g = ctx.createGain(); o2g.gain.value = 0.4;
    const vib = ctx.createOscillator(); vib.frequency.value = 4.8;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(7, t + Math.min(0.5, dur * 0.6));
    vib.connect(vibG); vibG.connect(o1.detune); vibG.connect(o2.detune);
    const breath = noiseSource(t, dur + 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 4;
    const bg = ctx.createGain(); bg.gain.value = 0.05 * vel;
    breath.connect(bp); bp.connect(bg);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.05);
    g.gain.setValueAtTime(0.16 * vel, t + Math.max(0.06, dur - 0.06));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    o1.connect(g); o2.connect(o2g); o2g.connect(g); bg.connect(g);
    g.connect(bus); g.connect(nodes.echoIn);
    o1.start(t); o2.start(t); vib.start(t);
    o1.stop(t + dur + 0.2); o2.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
    scrap(o1, [g, o2, o2g, vib, vibG, bp, bg]);
  } else if (timbre === 'pluck') { // Karplus-Strong
    const burst = noiseSource(t, Math.min(0.05, 2 / freq + 0.005));
    const dl = ctx.createDelay(0.1);
    dl.delayTime.value = 1 / freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(freq * 9, 1200, 9500);
    lp.Q.value = -6;   // dB: no resonance peak — keeps the feedback loop gain < 1 (stable)
    const fbg = ctx.createGain();
    fbg.gain.value = clamp(0.975 - freq / 18000, 0.88, 0.975);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34 * vel, t);
    g.gain.setValueAtTime(0.34 * vel, t + Math.max(0.05, dur));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.3);
    burst.connect(dl);
    dl.connect(lp); lp.connect(fbg); fbg.connect(dl);
    lp.connect(g); g.connect(bus); g.connect(nodes.echoIn);
    const ms = (t - ctx.currentTime + dur + 0.9) * 1000;
    setTimeout(() => { for (const n of [dl, lp, fbg, g]) { try { n.disconnect(); } catch (e) {} } }, Math.max(50, ms));
  } else if (timbre === 'keys') { // FM electric piano
    const car = ctx.createOscillator();
    car.frequency.value = freq;
    car.detune.value = detune;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * (0.5 + vel * 1.1), t);
    mg.gain.exponentialRampToValueAtTime(freq * 0.03, t + Math.max(0.3, dur));
    mod.connect(mg);
    mg.connect(car.frequency);
    const tine = ctx.createOscillator();
    tine.frequency.value = freq * 6.93;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.05 * vel, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    tine.connect(tg);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.19 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7);
    car.connect(g); tg.connect(g);
    g.connect(bus); g.connect(nodes.echoIn);
    car.start(t); mod.start(t); tine.start(t);
    car.stop(t + dur + 0.8); mod.stop(t + dur + 0.8); tine.stop(t + 0.12);
    scrap(car, [g, mg, mod, tg]);
  } else if (timbre === 'brass') {
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = freq; o1.detune.value = detune - 5;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = detune + 5;
    const vib = ctx.createOscillator(); vib.frequency.value = 4.6;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(5, t + Math.min(0.45, dur * 0.6));
    vib.connect(vibG); vibG.connect(o1.detune); vibG.connect(o2.detune);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(280 + vel * 250, t);
    lp.frequency.linearRampToValueAtTime(900 + vel * 2900, t + 0.09);
    lp.frequency.exponentialRampToValueAtTime(600 + vel * 1600, t + Math.max(0.12, dur));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.045);
    g.gain.setValueAtTime(0.13 * vel, t + Math.max(0.05, dur - 0.05));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    o1.connect(lp); o2.connect(lp); lp.connect(g);
    g.connect(bus); g.connect(nodes.echoIn);
    o1.start(t); o2.start(t); vib.start(t);
    o1.stop(t + dur + 0.15); o2.stop(t + dur + 0.15); vib.stop(t + dur + 0.15);
    scrap(o1, [g, lp, o2, vib, vibG]);
  } else if (timbre === 'organ') { // additive drawbars
    const partials = [[1, 0.5], [2, 0.32], [3, 0.18], [4, 0.1]];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.012);
    g.gain.setValueAtTime(0.13 * vel, t + Math.max(0.02, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.06);
    const vib = ctx.createOscillator(); vib.frequency.value = 6;
    const vibG = ctx.createGain(); vibG.gain.value = 4;
    vib.connect(vibG);
    const parts = [];
    for (const [ratio, amp] of partials) {
      const o = ctx.createOscillator();
      o.frequency.value = freq * ratio;
      o.detune.value = detune;
      vibG.connect(o.detune);
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 0.1);
      parts.push(o, og);
    }
    vib.start(t); vib.stop(t + dur + 0.1);
    g.connect(bus); g.connect(nodes.echoIn);
    scrap(parts[0], [g, vib, vibG, ...parts.slice(1)]);
  } else { // pure sine
    const o = ctx.createOscillator();
    o.frequency.value = freq; o.detune.value = detune;
    const vib = ctx.createOscillator(); vib.frequency.value = 5;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(6, t + Math.min(0.45, dur * 0.6));
    vib.connect(vibG); vibG.connect(o.detune);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18 * vel, t + 0.03);
    g.gain.setValueAtTime(0.18 * vel, t + Math.max(0.04, dur - 0.07));
    g.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    o.connect(g); g.connect(bus); g.connect(nodes.echoIn);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.15); vib.stop(t + dur + 0.15);
    scrap(o, [g, vib, vibG]);
  }
}

function playCounter(t, freq, dur, vel) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.frequency.value = freq * 2.001;
  const o2g = ctx.createGain(); o2g.gain.value = 0.18;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.15 * vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.04 * vel + 0.0001, t + Math.max(0.1, dur * 0.7));
  g.gain.linearRampToValueAtTime(0, t + dur + 0.1);
  osc.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); g.connect(nodes.buses.counter);
  osc.start(t); o2.start(t);
  osc.stop(t + dur + 0.15); o2.stop(t + dur + 0.15);
  scrap(osc, [g, lp, o2, o2g]);
}

function playPad(t, freq, dur, vel, P, energy) {
  const bus = nodes.buses.pad;
  const timbre = P.padTimbre;
  const levels = { warm: 0.052, halo: 0.052, choir: 0.06, strings: 0.042, hollow: 0.055 };
  const level = (levels[timbre] || 0.05) * vel;
  const g = ctx.createGain();
  const atk = (timbre === 'strings')
    ? Math.min(0.7, dur * 0.22 + 0.12)
    : Math.min(1.3, dur * 0.3 + 0.15);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + atk);
  g.gain.setValueAtTime(level, t + Math.max(atk, dur - 0.2));
  g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
  g.connect(bus);
  const stopAt = t + dur + 1.6;
  const oscs = [];        // sources (started/stopped below)
  const extras = [];      // non-source nodes to disconnect

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;

  if (timbre === 'warm') {
    lp.frequency.value = 450 + energy * 2200;
    for (const det of [-8, 0, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(lp);
      oscs.push(o);
    }
    lp.connect(g); extras.push(lp);
  } else if (timbre === 'halo') {
    lp.frequency.value = 1400 + energy * 3600;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.frequency.value = freq * 2;
    const o2g = ctx.createGain(); o2g.gain.value = 0.3;
    const shim = ctx.createOscillator(); shim.frequency.value = 0.31;
    const shimG = ctx.createGain(); shimG.gain.value = 7;
    shim.connect(shimG); shimG.connect(o1.detune); shimG.connect(o2.detune);
    o1.connect(lp); o2.connect(o2g); o2g.connect(lp);
    lp.connect(g);
    oscs.push(o1, o2, shim);
    extras.push(lp, o2g, shimG);
  } else if (timbre === 'choir') {
    const mix = ctx.createGain(); mix.gain.value = 1;
    for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(mix);
      oscs.push(o);
    }
    // two vowel formants plus a darker body
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 640; f1.Q.value = 5;
    const f1g = ctx.createGain(); f1g.gain.value = 0.9;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 6;
    const f2g = ctx.createGain(); f2g.gain.value = 0.55;
    lp.frequency.value = 750;
    const lpg = ctx.createGain(); lpg.gain.value = 0.5;
    mix.connect(f1); f1.connect(f1g); f1g.connect(g);
    mix.connect(f2); f2.connect(f2g); f2g.connect(g);
    mix.connect(lp); lp.connect(lpg); lpg.connect(g);
    extras.push(mix, f1, f1g, f2, f2g, lp, lpg);
  } else if (timbre === 'strings') {
    lp.frequency.value = 750 + energy * 2700;
    for (const det of [-12, -4, 5, 11]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(lp);
      oscs.push(o);
    }
    const bow = ctx.createOscillator(); bow.frequency.value = 0.4;
    const bowG = ctx.createGain(); bowG.gain.value = 180;
    bow.connect(bowG); bowG.connect(lp.frequency);
    lp.connect(g);
    oscs.push(bow);
    extras.push(lp, bowG);
  } else { // hollow
    lp.frequency.value = 520 + energy * 1500;
    const o1 = ctx.createOscillator();
    o1.type = 'square'; o1.frequency.value = freq;
    const o1g = ctx.createGain(); o1g.gain.value = 0.55;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = freq;
    o1.connect(o1g); o1g.connect(lp); o2.connect(lp);
    lp.connect(g);
    oscs.push(o1, o2);
    extras.push(lp, o1g);
  }

  for (const o of oscs) { o.start(t); o.stop(stopAt); }
  scrap(oscs[0], [g, ...extras, ...oscs.slice(1)]);
}

function playBass(t, freq, dur, vel) {
  const sub = ctx.createOscillator();
  sub.frequency.value = freq;
  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = freq;
  const sawG = ctx.createGain(); sawG.gain.value = 0.3;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(180 + vel * 480, t);
  lp.frequency.exponentialRampToValueAtTime(140, t + Math.max(0.1, dur));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.34 * vel, t + 0.012);
  g.gain.setValueAtTime(0.34 * vel, t + Math.max(0.02, dur - 0.06));
  g.gain.linearRampToValueAtTime(0, t + dur + 0.08);
  sub.connect(lp); saw.connect(sawG); sawG.connect(lp); lp.connect(g);
  g.connect(nodes.buses.bass);
  sub.start(t); saw.start(t);
  sub.stop(t + dur + 0.12); saw.stop(t + dur + 0.12);
  scrap(sub, [g, lp, saw, sawG]);
}

function playArp(t, freq, dur, vel) {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1600 + vel * 3800;
  lp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.085 * vel, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.08, dur * 0.9));
  osc.connect(lp); lp.connect(g);
  g.connect(nodes.buses.arp);
  g.connect(nodes.echoIn);
  osc.start(t); osc.stop(t + dur + 0.1);
  scrap(osc, [g, lp]);
}

function playPerc(t, type, vel) {
  const bus = nodes.buses.perc;
  if (type === 'kick') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(43, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.3);
    scrap(o, [g]);
    const click = noiseSource(t, 0.012);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1200;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.12 * vel, t);
    cg.gain.linearRampToValueAtTime(0, t + 0.012);
    click.connect(hp); hp.connect(cg); cg.connect(bus);
    scrap(click, [hp, cg]);
  } else if (type === 'snare') {
    const n = noiseSource(t, 0.16);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(bp); bp.connect(g); g.connect(bus);
    const tone = ctx.createOscillator();
    tone.type = 'triangle'; tone.frequency.value = 195;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.14 * vel, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    tone.connect(tg); tg.connect(bus);
    tone.start(t); tone.stop(t + 0.09);
    scrap(n, [bp, g]); scrap(tone, [tg]);
  } else if (type === 'hat' || type === 'hatOpen') {
    const dur = type === 'hat' ? 0.045 : 0.4;
    const n = noiseSource(t, dur + 0.02);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 8200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp); hp.connect(g); g.connect(bus);
    scrap(n, [hp, g]);
  } else if (type === 'shaker') {
    const n = noiseSource(t, 0.09);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 5800; bp.Q.value = 2.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(bp); bp.connect(g); g.connect(bus);
    scrap(n, [bp, g]);
  }
}

/* ---------------------------------------------------------------------
   Parameters & UI
--------------------------------------------------------------------- */
const SLIDER_IDS = ['tempo', 'length', 'complexity', 'variety', 'gravity', 'wanderlust',
  'shadow', 'humanity', 'fractality', 'hocket', 'sparkle', 'tide', 'swing',
  'mixLead', 'mixCounter', 'mixPad', 'mixArp', 'mixBass', 'mixPerc',
  'reverb', 'echo', 'master'];

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function formatVal(id, v) {
  if (id === 'tempo') return v + ' bpm';
  if (id === 'length') return Number(v) >= 620 ? '∞' : fmtTime(Number(v));
  return v + '%';
}

function readParams() {
  const val = id => Number($(id).value);
  return {
    tempo: val('tempo'),
    key: $('key').value,
    mode: $('mode').value,
    meter: $('meter').value,
    lengthSec: val('length') >= 620 ? null : val('length'),
    arc: $('arc').value,
    complexity: val('complexity') / 100,
    variety: val('variety') / 100,
    gravity: val('gravity') / 100,
    wanderlust: val('wanderlust') / 100,
    shadow: val('shadow') / 100,
    humanity: val('humanity') / 100,
    fractality: val('fractality') / 100,
    hocket: val('hocket') / 100,
    sparkle: val('sparkle') / 100,
    tide: val('tide') / 100,
    swing: val('swing') / 100,
    mix: {
      lead: val('mixLead') / 100, counter: val('mixCounter') / 100,
      pad: val('mixPad') / 100, arp: val('mixArp') / 100,
      bass: val('mixBass') / 100, perc: val('mixPerc') / 100,
    },
    leadTimbre: $('leadTimbre').value,
    padTimbre: $('padTimbre').value,
    reverb: val('reverb') / 100,
    echo: val('echo') / 100,
    master: val('master') / 100,
  };
}

function applyMixes() {
  if (!nodes) return;
  const P = readParams();
  const scale = { lead: 1, counter: 1, pad: 1, arp: 1, bass: 1, perc: 1 };
  for (const name of Object.keys(nodes.buses)) {
    nodes.buses[name].gain.value = Math.pow(P.mix[name === 'pad' ? 'pad' : name] ?? 0, 1.4) * scale[name];
    nodes.sends[name].gain.value = P.reverb * nodes.sendAmt[name] * 1.6;
  }
}

function applySpace() {
  if (!nodes) return;
  const P = readParams();
  nodes.echoWet.gain.value = P.echo * 0.85;
  nodes.fb.gain.value = 0.18 + P.echo * 0.32;
  nodes.master.gain.value = Math.pow(P.master, 1.6) * (playing ? 1 : 1);
}

/* ---------------------------------------------------------------------
   Scheduler / transport
--------------------------------------------------------------------- */
let playing = false;
let composer = null;
let schedTimer = null;
let nextBarTime = 0;
let pieceStart = 0;
let pieceEnd = null;        // absolute audio time when last bar finishes
let totalSecEstimate = null;
let lastBarScheduled = false;
const vizNotes = [];
const displayQueue = [];
const LOOKAHEAD = 0.65;

function scheduleBars() {
  while (!lastBarScheduled && nextBarTime < ctx.currentTime + LOOKAHEAD) {
    const P = readParams();
    const bar = composer.nextBar(P);
    const spStep = (60 / P.tempo) / 4 * bar.tempoFactor;
    const barDur = bar.steps * spStep;

    for (const e of bar.events) {
      const t = nextBarTime + e.step * spStep;
      const durSec = (e.dur || 1) * spStep;
      if (e.voice === 'perc') {
        playPerc(t, e.type, e.vel * Math.pow(P.mix.perc, 0.5));
        vizNotes.push({ t, dur: 0.1, midi: 30, voice: 'perc', type: e.type });
      } else {
        const freq = midiToFreq(e.midi);
        if (e.voice === 'lead') playLead(t, freq, durSec, e.vel, P);
        else if (e.voice === 'counter') playCounter(t, freq, durSec, e.vel);
        else if (e.voice === 'pad') playPad(t, freq, durSec, e.vel, P, bar.energy);
        else if (e.voice === 'bass') playBass(t, freq, durSec, e.vel);
        else if (e.voice === 'arp') playArp(t, freq, durSec, e.vel);
        vizNotes.push({ t, dur: durSec, midi: e.midi, voice: e.voice });
      }
    }

    displayQueue.push({ t: nextBarTime, ...bar.display });

    // tide: slow swells of brightness
    if (P.tide > 0) {
      const phase = Math.sin(2 * Math.PI * (nextBarTime - pieceStart) / 26);
      const cutoff = 18000 * (1 - P.tide * 0.55 * (0.5 - 0.5 * phase));
      nodes.tideFilter.frequency.setTargetAtTime(Math.max(900, cutoff), nextBarTime, 1.2);
    } else {
      nodes.tideFilter.frequency.setTargetAtTime(18000, nextBarTime, 1.2);
    }
    // echo locked to tempo (dotted eighth)
    nodes.delay.delayTime.setTargetAtTime(0.75 * (60 / P.tempo), nextBarTime, 0.4);

    nextBarTime += barDur;
    if (bar.isLast) {
      lastBarScheduled = true;
      pieceEnd = nextBarTime;
    }
  }
}

function startPlayback() {
  if (!ctx) buildAudio();
  ctx.resume();
  const P = readParams();
  const seed = Number($('seed').value) || 1;
  composer = new Composer(seed, P);

  vizNotes.length = 0;
  displayQueue.length = 0;
  lastBarScheduled = false;
  pieceEnd = null;
  totalSecEstimate = composer.totalBars != null
    ? composer.totalBars * (METERS[P.meter].steps / 4) * (60 / P.tempo)
    : null;

  nodes.master.gain.cancelScheduledValues(ctx.currentTime);
  nodes.master.gain.setValueAtTime(0, ctx.currentTime);
  nodes.master.gain.linearRampToValueAtTime(Math.pow(P.master, 1.6), ctx.currentTime + 0.3);

  pieceStart = ctx.currentTime + 0.12;
  nextBarTime = pieceStart;
  applyMixes();
  applySpace();
  scheduleBars();
  schedTimer = setInterval(scheduleBars, 60);

  playing = true;
  $('playBtn').textContent = '■  Stop';
  $('playBtn').classList.add('playing');
  $('vizHint').classList.add('hidden');
}

function stopPlayback() {
  if (!playing) return;
  playing = false;
  clearInterval(schedTimer);
  schedTimer = null;
  if (ctx && nodes) {
    const now = ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setValueAtTime(nodes.master.gain.value, now);
    nodes.master.gain.linearRampToValueAtTime(0, now + 0.4);
  }
  $('playBtn').innerHTML = '&#9654;&nbsp; Play';
  $('playBtn').classList.remove('playing');
  $('keyDisplay').textContent = '—';
  $('chordDisplay').textContent = '—';
  $('sectionDisplay').textContent = '—';
}

/* ---------------------------------------------------------------------
   Visualization
--------------------------------------------------------------------- */
const canvas = $('viz');
const cx2d = canvas.getContext('2d');
let waveArr = null;

const VOICE_COLORS = {
  lead: '#ffb84d', counter: '#4dd6c1', pad: 'rgba(110,140,255,0.45)',
  arp: '#b18cff', bass: '#ff6f61', perc: '#8a93a6',
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.floor(r.width * dpr);
  canvas.height = Math.floor(r.height * dpr);
  cx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function draw() {
  requestAnimationFrame(draw);
  const r = canvas.getBoundingClientRect();
  const W = r.width, H = r.height;
  cx2d.clearRect(0, 0, W, H);

  if (!ctx || !nodes) return;
  const now = ctx.currentTime;

  // waveform backdrop
  if (playing || (pieceEnd && now < pieceEnd + 3)) {
    if (!waveArr) waveArr = new Uint8Array(nodes.analyser.fftSize);
    nodes.analyser.getByteTimeDomainData(waveArr);
    cx2d.beginPath();
    for (let i = 0; i < waveArr.length; i++) {
      const x = (i / waveArr.length) * W;
      const y = H / 2 + ((waveArr[i] - 128) / 128) * H * 0.4;
      i === 0 ? cx2d.moveTo(x, y) : cx2d.lineTo(x, y);
    }
    cx2d.strokeStyle = 'rgba(255,255,255,0.05)';
    cx2d.lineWidth = 1.4;
    cx2d.stroke();
  }

  // piano-roll notes: playhead at 72% across; window = past 11s, future 4.3s
  const pxPerSec = W / 15.3;
  const playheadX = W * 0.72;
  const midiToY = m => H - ((m - 26) / 70) * (H - 24) - 12;

  // prune old
  while (vizNotes.length && vizNotes[0].t + vizNotes[0].dur < now - 12) vizNotes.shift();

  for (const n of vizNotes) {
    const x = playheadX + (n.t - now) * pxPerSec;
    if (n.voice === 'perc') {
      const y = H - 8 - (n.type === 'kick' ? 0 : n.type === 'snare' ? 6 : 11);
      if (x < -6 || x > W + 6) continue;
      cx2d.fillStyle = n.type === 'kick' ? 'rgba(255,111,97,0.7)' : 'rgba(160,170,190,0.5)';
      cx2d.fillRect(x - 1.5, y, 3, 3);
      continue;
    }
    const w = Math.max(2.5, n.dur * pxPerSec - 1.5);
    if (x + w < 0 || x > W) continue;
    const y = midiToY(n.midi);
    const active = now >= n.t && now <= n.t + n.dur;
    const h = n.voice === 'pad' ? 3 : 5;
    cx2d.fillStyle = VOICE_COLORS[n.voice] || '#fff';
    cx2d.globalAlpha = active ? 1 : (n.t > now ? 0.35 : 0.55);
    if (active && n.voice !== 'pad') {
      cx2d.shadowColor = VOICE_COLORS[n.voice];
      cx2d.shadowBlur = 9;
    }
    cx2d.fillRect(x, y - h / 2, w, h);
    cx2d.shadowBlur = 0;
    cx2d.globalAlpha = 1;
  }

  // playhead
  if (playing) {
    cx2d.fillStyle = 'rgba(255,255,255,0.12)';
    cx2d.fillRect(playheadX, 0, 1, H);
  }

  // apply due display updates
  while (displayQueue.length && displayQueue[0].t <= now) {
    const d = displayQueue.shift();
    $('keyDisplay').textContent = d.key;
    $('chordDisplay').textContent = d.chord;
    $('sectionDisplay').textContent = d.section;
  }

  // clock & progress
  if (playing) {
    const el = Math.max(0, now - pieceStart);
    if (totalSecEstimate != null) {
      $('timeDisplay').textContent = fmtTime(el) + ' / ' + fmtTime(totalSecEstimate);
      $('progressBar').style.width = clamp(el / totalSecEstimate * 100, 0, 100) + '%';
    } else {
      $('timeDisplay').textContent = fmtTime(el) + ' / ∞';
      $('progressBar').style.width = '100%';
    }
    // natural end
    if (pieceEnd != null && now > pieceEnd + 3.4) stopPlayback();
  }
}
requestAnimationFrame(draw);

/* ---------------------------------------------------------------------
   Wiring
--------------------------------------------------------------------- */
function updateIdleClock() {
  const v = Number($('length').value);
  $('timeDisplay').textContent = '0:00 / ' + (v >= 620 ? '∞' : fmtTime(v));
  $('progressBar').style.width = '0%';
}

for (const id of SLIDER_IDS) {
  const el = $(id), out = $('o-' + id);
  const update = () => { out.textContent = formatVal(id, el.value); };
  el.addEventListener('input', () => {
    update();
    if (['mixLead', 'mixCounter', 'mixPad', 'mixArp', 'mixBass', 'mixPerc', 'reverb'].includes(id)) applyMixes();
    if (['echo', 'master', 'reverb'].includes(id)) applySpace();
    if (id === 'length' && !playing) updateIdleClock();
  });
  update();
}

$('playBtn').addEventListener('click', () => playing ? stopPlayback() : startPlayback());

$('resetBtn').addEventListener('click', () => {
  stopPlayback();
  vizNotes.length = 0;
  displayQueue.length = 0;
  pieceEnd = null;
  lastBarScheduled = false;
  composer = null;
  updateIdleClock();
});

$('diceBtn').addEventListener('click', () => {
  $('seed').value = Math.floor(Math.random() * 999999) + 1;
});

$('surpriseBtn').addEventListener('click', () => {
  const R = (a, b) => Math.round(a + Math.random() * (b - a));
  const set = (id, v) => {
    $(id).value = v;
    const out = $('o-' + id);
    if (out) out.textContent = formatVal(id, $(id).value);
  };
  set('tempo', R(60, 150));
  $('key').value = String(Math.floor(Math.random() * 12));
  const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'harmonicMinor', 'melodicMinor'];
  $('mode').value = modes[Math.floor(Math.random() * modes.length)];
  const meters = ['4/4', '4/4', '4/4', '3/4', '6/8', '5/4', '7/8'];
  $('meter').value = meters[Math.floor(Math.random() * meters.length)];
  const arcs = ['arch', 'ascent', 'waves', 'still', 'plunge', 'twinPeaks', 'valley', 'staircase', 'sawtooth', 'slowBurn'];
  $('arc').value = arcs[Math.floor(Math.random() * arcs.length)];
  set('complexity', R(25, 90));
  set('variety', R(15, 85));
  set('gravity', R(30, 85));
  set('wanderlust', R(5, 70));
  set('shadow', R(0, 70));
  set('humanity', R(30, 80));
  set('fractality', R(30, 90));
  set('hocket', R(0, 70));
  set('sparkle', R(10, 70));
  set('tide', R(10, 80));
  set('swing', Math.random() < 0.3 ? R(20, 60) : 0);
  set('mixLead', R(55, 95));
  set('mixCounter', Math.random() < 0.2 ? 0 : R(30, 80));
  set('mixPad', R(35, 85));
  set('mixArp', Math.random() < 0.2 ? 0 : R(25, 80));
  set('mixBass', R(50, 90));
  set('mixPerc', Math.random() < 0.25 ? 0 : R(35, 85));
  const leads = ['glass', 'reed', 'breath', 'pluck', 'keys', 'brass', 'organ', 'pure'];
  $('leadTimbre').value = leads[Math.floor(Math.random() * leads.length)];
  const pads = ['warm', 'halo', 'choir', 'strings', 'hollow'];
  $('padTimbre').value = pads[Math.floor(Math.random() * pads.length)];
  set('reverb', R(25, 70));
  set('echo', R(5, 55));
  $('seed').value = Math.floor(Math.random() * 999999) + 1;
  applyMixes();
  applySpace();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    playing ? stopPlayback() : startPlayback();
  }
});

/* ---------------------------------------------------------------------
   Custom tooltips — native title popups are slow/unreliable, so all
   title attributes become instant styled popovers.
--------------------------------------------------------------------- */
const tip = document.createElement('div');
tip.id = 'tooltip';
document.body.appendChild(tip);
for (const el of document.querySelectorAll('[title]')) {
  el.dataset.help = el.getAttribute('title');
  el.removeAttribute('title');
}
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest ? e.target.closest('[data-help]') : null;
  if (!el) { tip.classList.remove('show'); return; }
  tip.textContent = el.dataset.help;
  tip.classList.add('show');
  const r = el.getBoundingClientRect();
  // measure after content is set, then clamp inside the viewport
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left;
  let y = r.bottom + 8;
  if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
  if (x < 8) x = 8;
  if (y + th > window.innerHeight - 8) y = r.top - th - 8;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
});
document.addEventListener('mouseout', (e) => {
  if (e.target.closest && e.target.closest('[data-help]')) tip.classList.remove('show');
});

// fresh seed on each visit
$('seed').value = Math.floor(Math.random() * 999999) + 1;
updateIdleClock();
