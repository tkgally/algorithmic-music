/*
 * percussion — a reference COMPOSER for a PERCUSSION-CENTRIC engine (Engine 05,
 * "Percussion Ensemble"). The brief (Tom, 2026-07-09) and its v0.2 extension:
 * music from formal concert percussion, through folk ensembles, to informal drum
 * circles; a variety of original percussion voices; default 2/4 or 4/4 with
 * 4/8/16-bar groupings but other meters selectable; every piece has a form; an
 * optional MELODIC component that only ACCOMPANIES.
 *
 * v0.2 — SLIDING SCALES, not three fixed genres. Rather than three hard-coded
 * styles each with one standard structure, this version samples a RECIPE from the
 * seed over continuous/categorical axes — development (cyclic ↔ through-composed),
 * form type, intensity-ARC shape (many, not one), timeline type, density,
 * looseness, lead activity, call-and-response, interlock, and pitched emphasis —
 * and a seed-varied ENSEMBLE (which of the 11 voices, in which roles). The three
 * named genres survive as PRESETS that bias the recipe; 'auto' samples the whole
 * space; and every axis (and the ensemble) is optionally overridable by the user.
 * One unified generator realizes any recipe, so the named genres are special
 * cases and everything between them is reachable — "many others, to be determined
 * by the seed and (optionally) by the user."
 *
 * Design from wiki/percussion-music.md (the three worlds, the density-arc-carries-
 * form-without-harmony principle, the timeline-vs-lead polarity, form types, arc
 * shapes, cell development) and wiki/percussion-sound-design.md (the voices), using
 * the rhythm technology of wiki/rhythm-and-meter.md + wiki/west-african-rhythm.md
 * (timelines/claves, Euclidean rhythms, Xenakis sieves, cross-rhythm) and
 * wiki/gamelan.md (colotomy/irama density).
 *
 * OUTPUT is the shared beat-based Note schema (wiki/engine-architecture.md):
 * { beat, durBeats, midi, voice, role, vel, tags, pan } in BEATS (quarter notes);
 * tempo, feel, dynamics shaping and the timbre macros are the performer's job.
 *
 * Pure and deterministic from the seed (no Web Audio, no Math.random, no globals).
 * Dual-format (UMD-lite): require() in Node, window.AM.composers.percussion via
 * <script src> in a file:// browser. Depends on lib/theory.js + lib/rng.js.
 */
;(function (global, factory) {
  'use strict';
  let theory, rng;
  if (typeof module === 'object' && module.exports) {
    theory = require('../lib/theory.js');
    rng = require('../lib/rng.js');
    module.exports = factory(theory, rng);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.composers = AM.composers || {};
    AM.composers.percussion = factory(AM.theory, AM.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (theory, rng) {
  'use strict';

  const { Rng, euclid, onsets } = rng;

  // ---- Meters (unchanged from v0.1) -----------------------------------------
  // A bar = `pulses` eighth-note pulses grouped into beats (groups of eighth-
  // counts) over a SIXTEENTH onset grid (subdiv = 2); onsets/durations emitted in
  // quarter-note beats, so the performer maps beat->seconds linearly and additive
  // (aksak) meters are just unequal groups (wiki/rhythm-and-meter.md).
  const SUBDIV = 2;
  const STEP_BEAT = 0.5 / SUBDIV;                 // 0.25 quarter-beats per step
  function makeMeter(label, groups, feel) {
    const pulses = groups.reduce((a, b) => a + b, 0);
    const steps = pulses * SUBDIV;
    const barBeats = pulses * 0.5;
    const beatStartsPulse = []; let acc = 0;
    for (const g of groups) { beatStartsPulse.push(acc); acc += g; }
    const accents = beatStartsPulse.map((p) => p * 0.5);
    return { label, groups, pulses, steps, barBeats, accents, beatStartsPulse, feel };
  }
  const METERS = {
    '4/4': makeMeter('4/4', [2, 2, 2, 2], 'duple'),
    '2/4': makeMeter('2/4', [2, 2], 'duple'),
    '3/4': makeMeter('3/4', [2, 2, 2], 'triple'),
    '6/8': makeMeter('6/8', [3, 3], 'compound'),
    '12/8': makeMeter('12/8', [3, 3, 3, 3], 'compound'),
    '5/8': makeMeter('5/8', [2, 3], 'odd'),
    '7/8': makeMeter('7/8', [2, 2, 3], 'odd'),
    '5/4': makeMeter('5/4', [2, 2, 2, 2, 2], 'odd'),
    '7/4': makeMeter('7/4', [2, 2, 2, 2, 2, 2, 2], 'odd'),
  };
  const DEFAULT_METER = '4/4';

  // ---- Timelines (asymmetric key patterns) ----------------------------------
  const TIMELINES = {
    clave16: { sonClave32: [0, 3, 6, 10, 12], rumbaClave: [0, 3, 7, 10, 12], sonClave23: [4, 6, 10, 12, 15], tresillo: [0, 3, 6, 11, 14], cinquillo: [0, 2, 3, 5, 6, 8, 11, 13] },
    bell12: { standard: [0, 2, 4, 5, 7, 9, 11], short: [0, 2, 5, 7, 9], tresillo: [0, 3, 6, 8, 10] },
    bell6: { standard: [0, 2, 3, 5], short: [0, 3, 5] },
  };
  // Xenakis sieve: union of residue classes over the step grid (wiki/percussion-music.md).
  function sieveOnsets(steps, moduli) {
    const out = [];
    for (let s = 0; s < steps; s++) for (const mr of moduli) { if (((s % mr[0]) + mr[0]) % mr[0] === ((mr[1] % mr[0]) + mr[0]) % mr[0]) { out.push(s); break; } }
    return out;
  }
  function rotate(steps, by, n) { return steps.map((s) => ((s + by) % n + n) % n).sort((a, b) => a - b); }

  // ---- The voice catalog (11 original voices; wiki/percussion-sound-design.md) -
  // Each entry: intrinsic register band, a nominal midi (viz lane + base pitch),
  // and whether it is pitched (carries real mode pitches). Pans are assigned when
  // an ensemble is built (spread across the field). Roles a voice can fill are in
  // ROLE_POOL below — the ensemble sampler draws voices into slots from these.
  const CAT = {
    boom:    { voice: 'boom',    band: 'low',   midi: 36, pitched: false },
    drumLo:  { voice: 'drum',    band: 'mid',   midi: 48, pitched: false },
    drumMi:  { voice: 'drum',    band: 'mid',   midi: 53, pitched: false },
    drumHi:  { voice: 'drum',    band: 'mid',   midi: 59, pitched: false },
    friction:{ voice: 'friction',band: 'mid',   midi: 50, pitched: false },
    woodLo:  { voice: 'wood',    band: 'mid',   midi: 67, pitched: false },
    wood:    { voice: 'wood',    band: 'high',  midi: 79, pitched: false },
    clap:    { voice: 'clap',    band: 'high',  midi: 84, pitched: false },
    metal:   { voice: 'metal',   band: 'high',  midi: 74, pitched: false },
    metalHi: { voice: 'metal',   band: 'high',  midi: 86, pitched: false },
    chime:   { voice: 'chime',   band: 'high',  midi: 72, pitched: true  },
    gong:    { voice: 'gong',    band: 'metal', midi: 55, pitched: false },
    shaker:  { voice: 'shaker',  band: 'high',  midi: 90, pitched: false },
    scrape:  { voice: 'scrape',  band: 'high',  midi: 88, pitched: false },
    mallet:  { voice: 'mallet',  band: 'tonal', midi: 72, pitched: true  },
  };
  // Which catalog voices can fill each role slot.
  const ROLE_POOL = {
    anchor:   ['boom', 'drumLo', 'friction'],
    timeline: ['wood', 'metal', 'clap', 'chime', 'metalHi', 'shaker'],
    mid:      ['drumLo', 'drumMi', 'drumHi', 'woodLo', 'friction', 'wood'],
    color:    ['metal', 'metalHi', 'gong', 'chime', 'clap', 'wood'],
    texture:  ['shaker', 'scrape'],
    lead:     ['drumHi', 'chime', 'wood', 'friction', 'metalHi', 'clap'],
    melodic:  ['mallet', 'chime'],
  };
  // Ensemble PRESETS (user override); each restricts the pools for some slots.
  const ENSEMBLE_PRESETS = {
    skinsWood:  { anchor: ['boom', 'drumLo'], timeline: ['wood', 'clap'], mid: ['drumLo', 'drumMi', 'drumHi', 'woodLo', 'friction'], color: ['wood', 'clap'], texture: ['shaker'], lead: ['drumHi', 'friction'], melodic: ['mallet'] },
    allMetal:   { anchor: ['boom', 'gong'], timeline: ['metal', 'metalHi'], mid: ['metal', 'chime', 'metalHi'], color: ['gong', 'metal', 'chime'], texture: ['shaker'], lead: ['metalHi', 'chime'], melodic: ['chime'] },
    handsShaker:{ anchor: ['boom', 'drumLo'], timeline: ['clap', 'shaker'], mid: ['drumMi', 'woodLo', 'clap'], color: ['clap', 'wood'], texture: ['shaker', 'scrape'], lead: ['clap', 'drumHi'], melodic: ['mallet'] },
    malletMetal:{ anchor: ['boom', 'drumLo'], timeline: ['chime', 'wood'], mid: ['drumMi', 'chime'], color: ['chime', 'metal'], texture: ['shaker'], lead: ['chime'], melodic: ['mallet', 'chime'] },
  };

  // ---- Intensity-ARC shapes (the form; wiki/percussion-music.md) -------------
  // Many shapes, sampled at each section's normalized center — this is the biggest
  // variety lever: a percussion piece's large-scale form IS its intensity curve.
  const ARC_SHAPES = ['rise', 'arch', 'archLate', 'terraced', 'wave', 'johakyu', 'frontload', 'flat', 'swellcut'];
  function arcAt(name, x) {
    x = Math.max(0, Math.min(1, x));
    switch (name) {
      case 'rise':     return 0.18 + 0.80 * x;
      case 'arch':     return x < 0.62 ? 0.20 + (x / 0.62) * 0.80 : 1.0 - ((x - 0.62) / 0.38) * 0.55;
      case 'archLate': return x < 0.82 ? 0.18 + (x / 0.82) * 0.82 : 1.0 - ((x - 0.82) / 0.18) * 0.5;
      case 'terraced': return 0.22 + 0.78 * (Math.floor(x * 3.999) / 3);
      case 'wave':     return Math.max(0.2, Math.min(1, 0.58 + 0.4 * Math.sin(x * Math.PI * 2.4 - 0.6)));
      case 'johakyu':  return x < 0.68 ? 0.14 + (x / 0.68) * 0.5 : (x < 0.9 ? 0.64 + ((x - 0.68) / 0.22) * 0.36 : 1.0 - ((x - 0.9) / 0.1) * 0.72);
      case 'frontload':return Math.max(0.2, 0.92 - 0.62 * x) + (x > 0.92 ? 0.16 : 0);
      case 'flat':     return 0.52 + 0.10 * Math.sin(x * Math.PI * 3);
      case 'swellcut': return x < 0.42 ? 0.2 + (x / 0.42) * 0.72 : (x < 0.54 ? 0.92 - ((x - 0.42) / 0.12) * 0.76 : 0.16 + ((x - 0.54) / 0.46) * 0.76);
      default:         return 0.5;
    }
  }
  const FORM_TYPES = ['cyclic', 'additive', 'cellDev', 'throughComposed', 'process', 'moment'];
  const TIMELINE_TYPES = ['clave', 'bell', 'euclid', 'sieve', 'pulse', 'none'];

  // Region biases for the four "style" starting points. Each is a soft prior; the
  // seed still samples within the ranges, so two folk seeds differ and 'auto'
  // reaches everything.
  const REGIONS = {
    concert: { dev: [0.55, 1], loose: [0.05, 0.35], dens: [0.3, 0.8], pitched: [0, 0.5], lead: [0.15, 0.6], call: [0.2, 0.65], interlock: [0.3, 0.85],
      arcs: ['arch', 'archLate', 'johakyu', 'rise', 'wave', 'terraced'], timelines: ['euclid', 'sieve', 'none', 'clave'], forms: ['cellDev', 'throughComposed', 'process', 'moment'] },
    folk:    { dev: [0.08, 0.45], loose: [0.28, 0.62], dens: [0.45, 0.92], pitched: [0.2, 0.85], lead: [0.4, 0.9], call: [0.3, 0.75], interlock: [0.5, 1],
      arcs: ['rise', 'terraced', 'wave', 'arch', 'archLate'], timelines: ['clave', 'bell', 'euclid'], forms: ['cyclic', 'additive'] },
    circle:  { dev: [0.05, 0.35], loose: [0.5, 0.95], dens: [0.4, 0.88], pitched: [0.1, 0.6], lead: [0.3, 0.75], call: [0.45, 0.9], interlock: [0.4, 0.9],
      arcs: ['swellcut', 'rise', 'wave', 'flat'], timelines: ['pulse', 'euclid', 'clave'], forms: ['cyclic', 'additive', 'moment'] },
    auto:    { dev: [0, 1], loose: [0.1, 0.92], dens: [0.35, 0.95], pitched: [0, 0.85], lead: [0.1, 0.9], call: [0.15, 0.9], interlock: [0.2, 1],
      arcs: ARC_SHAPES, timelines: TIMELINE_TYPES, forms: FORM_TYPES },
  };

  // ---- Recipe sampling -------------------------------------------------------
  function pickRange(r, range) { return range[0] + (range[1] - range[0]) * r.float(); }
  function ov(opts, key, val) { const v = opts[key]; return (v == null || v === 'auto' || v === '') ? val : v; }

  function sampleRecipe(r, opts, meter) {
    const styleKey = REGIONS[opts.style] ? opts.style : 'auto';
    const reg = REGIONS[styleKey];
    let formType = ov(opts, 'form', r.pick(reg.forms));
    const devSet = opts.development != null && opts.development !== 'auto' && opts.development !== '';
    let development = ov(opts, 'development', +pickRange(r, reg.dev).toFixed(3));
    // correlate: developmental forms want real development; cyclic forms less —
    // but only when the user hasn't pinned development explicitly.
    if (!devSet && (formType === 'cellDev' || formType === 'throughComposed')) development = Math.max(development, 0.5);
    if (!devSet && (formType === 'cyclic' || formType === 'additive')) development = Math.min(development, 0.5);
    let arc = ov(opts, 'arc', r.pick(reg.arcs));
    if (formType === 'moment') arc = ov(opts, 'arc', r.pick(['flat', 'wave', 'terraced']));
    let timeline = ov(opts, 'timeline', r.pick(reg.timelines));
    // meters without a stock timeline fall back to euclid/pulse
    if ((timeline === 'clave' && meter.pulses !== 8) || (timeline === 'bell' && meter.pulses !== 12 && meter.pulses !== 6)) timeline = 'euclid';
    return {
      style: styleKey, formType, arc, timeline,
      development,
      density: ov(opts, 'density', +pickRange(r, reg.dens).toFixed(3)),
      looseness: ov(opts, 'looseness', +pickRange(r, reg.loose).toFixed(3)),
      pitched: ov(opts, 'pitched', +pickRange(r, reg.pitched).toFixed(3)),
      leadActivity: ov(opts, 'lead', +pickRange(r, reg.lead).toFixed(3)),
      callResponse: ov(opts, 'call', +pickRange(r, reg.call).toFixed(3)),
      interlock: ov(opts, 'interlock', +pickRange(r, reg.interlock).toFixed(3)),
      sections: ov(opts, 'sections', r.int(4, 8)),
    };
  }

  // ---- Ensemble sampling (which voices, in which roles) ----------------------
  function drawUnique(r, pool, n, taken) {
    const out = []; const avail = pool.filter((k) => taken.indexOf(k) === -1);
    const bag = r.shuffle(avail);
    for (let i = 0; i < bag.length && out.length < n; i++) { out.push(bag[i]); taken.push(bag[i]); }
    return out;
  }
  function sampleEnsemble(r, recipe, opts) {
    const preset = ENSEMBLE_PRESETS[opts.ensemble] || null;   // user override (else seed samples)
    const pool = (slot) => (preset && preset[slot]) ? preset[slot] : ROLE_POOL[slot];
    const taken = [];
    const size = recipe.density;                              // bigger ensembles when denser
    // fallbacks always stay WITHIN the (possibly preset-restricted) pool, reusing a
    // pool voice rather than injecting a default that could violate the preset.
    const anchor = drawUnique(r, pool('anchor'), 1, taken)[0] || pool('anchor')[0] || 'boom';
    const timeline = recipe.timeline === 'none' || recipe.timeline === 'pulse' ? null : (drawUnique(r, pool('timeline'), 1, taken)[0] || pool('timeline')[0]);
    const nMid = Math.max(1, Math.min(3, Math.round(1 + size * 2.2)));
    const mids = drawUnique(r, pool('mid'), nMid, taken);
    if (!mids.length) mids.push(pool('mid')[0]);
    const nColor = Math.max(0, Math.min(2, Math.round((recipe.development * 0.6 + size * 0.6) * 2 - 0.3)));
    const colors = drawUnique(r, pool('color'), nColor, taken);
    const nTex = r.float() < 0.35 + 0.4 * size ? (r.float() < 0.3 ? 2 : 1) : 0;
    const textures = drawUnique(r, pool('texture'), Math.min(2, nTex), taken);
    const lead = recipe.leadActivity > 0.35 ? (drawUnique(r, pool('lead'), 1, taken)[0] || pool('lead')[0]) : null;
    const melodic = recipe.pitched > 0.12 ? drawUnique(r, pool('melodic'), r.float() < recipe.pitched ? 2 : 1, taken) : [];
    // Assign a spread pan to each slot voice (deterministic).
    const slots = { anchor, timeline, mids, colors, textures, lead, melodic };
    const withPan = {}; let pi = 0;
    const seat = (key, forcePan) => { if (!key) return null; const c = CAT[key]; const pan = forcePan != null ? forcePan : ((pi++ % 2 === 0 ? 1 : -1) * (0.12 + 0.12 * (pi))); return { key, voice: c.voice, midi: c.midi, band: c.band, pitched: c.pitched, pan: Math.max(-0.6, Math.min(0.6, pan)) }; };
    withPan.anchor = seat(anchor, 0);
    withPan.timeline = seat(timeline);
    withPan.mids = mids.map((k) => seat(k));
    withPan.colors = colors.map((k) => seat(k));
    withPan.textures = textures.map((k) => seat(k));
    withPan.lead = seat(lead);
    withPan.melodic = melodic.map((k) => seat(k, 0.1));
    withPan._keys = { anchor, timeline, mids, colors, textures, lead, melodic };
    return withPan;
  }

  // ---- helpers to emit hits --------------------------------------------------
  function push(events, role, desc, beatInBar, barBeat, durBeats, vel, tags) {
    if (!desc) return;
    events.push({ beat: barBeat + beatInBar, durBeats: durBeats == null ? 0.14 : durBeats,
      midi: desc.midi, voice: desc.voice, role, vel: Math.max(0.03, Math.min(1, vel)),
      pan: desc.pan, tags: tags || [] });
  }

  // A rhythmic cell + development ops (for developmental recipes).
  function makeCell(r, meter) {
    const cellSteps = Math.min(meter.steps, 8 + (meter.pulses % 2));
    const k = r.int(3, Math.max(3, Math.floor(cellSteps * 0.55)));
    let pat = onsets(euclid(k, cellSteps, r.int(0, cellSteps - 1)));
    if (!pat.length || pat[0] !== 0) pat = [0].concat(pat.filter((s) => s !== 0));
    const accents = pat.map((s, i) => (i === 0 ? 1 : r.bool(0.35) ? 0.9 : 0.55));
    return { steps: pat.slice().sort((a, b) => a - b), accents, len: cellSteps };
  }
  function developCell(cell, op, r) {
    const n = cell.len;
    if (op === 'rotate') return { steps: rotate(cell.steps, r.int(1, n - 1), n), len: n };
    if (op === 'diminish') return { steps: cell.steps.map((s) => Math.floor(s / 2)), len: Math.max(4, Math.floor(n / 2)) };
    if (op === 'augment') return { steps: cell.steps.map((s) => s * 2), len: n * 2 };
    if (op === 'displace') return { steps: cell.steps.map((s) => (s + 1) % n).sort((a, b) => a - b), len: n };
    if (op === 'thin') return { steps: cell.steps.filter((_, i) => i % 2 === 0), len: n };
    return { steps: cell.steps.slice(), len: n };
  }

  // Build the timeline onset list (in sixteenth steps) for a recipe + meter.
  function buildTimeline(r, recipe, meter) {
    const t = recipe.timeline;
    if (t === 'none' || t === 'pulse') return null;
    if (t === 'clave' && meter.pulses === 8) return TIMELINES.clave16[r.pick(['sonClave32', 'rumbaClave', 'sonClave23', 'tresillo'])];
    if (t === 'bell' && meter.pulses === 12) return TIMELINES.bell12[r.pick(['standard', 'short', 'tresillo'])].map((p) => p * SUBDIV);
    if (t === 'bell' && meter.pulses === 6) return TIMELINES.bell6[r.pick(['standard', 'short'])].map((p) => p * SUBDIV);
    if (t === 'sieve') { const mods = [[r.int(2, 4), r.int(0, 3)], [r.int(3, 5), r.int(0, 4)]]; const s = sieveOnsets(meter.steps, mods); return s.length >= 2 ? s : onsets(euclid(3, meter.steps, 0)); }
    // euclid (default): a maximally-even timeline over the pulses, expressed in steps
    return onsets(euclid(Math.max(3, Math.round(meter.pulses * (0.45 + 0.2 * r.float()))), meter.pulses, r.int(0, meter.pulses - 1))).map((p) => p * SUBDIV);
  }

  // ---- The unified generator -------------------------------------------------
  function generate(master, recipe, ens, meter, sectionSpans, barBeatsList) {
    const events = [];
    const tr = master.stream('timeline'), sr = master.stream('layer'), lr = master.stream('lead'), cr = master.stream('color'), dr = master.stream('cell');
    const timeSteps = buildTimeline(tr, recipe, meter);
    const cell = makeCell(dr, meter);
    const ops = ['rotate', 'displace', 'augment', 'diminish', 'thin', 'none'];
    // one fixed Euclidean ostinato per mid voice (its identity), plus its phase
    const midPats = ens.mids.map((m, i) => ({ desc: m,
      pat: onsets(euclid(Math.max(2, Math.round(meter.pulses * (0.3 + 0.4 * recipe.interlock * sr.float()))), meter.pulses, sr.int(0, meter.pulses - 1))),
      stroke: (m.voice === 'drum') ? (sr.bool(0.5) ? 'tone' : 'open') : null }));
    const texPats = ens.textures.map((t) => ({ desc: t, every: t.voice === 'shaker' ? 1 : 2 }));
    const anchorPat = meter.beatStartsPulse.slice();

    sectionSpans.forEach((sec, si) => {
      const I = sec.intensity;
      const developed = (recipe.formType === 'cellDev' || recipe.formType === 'throughComposed' || recipe.formType === 'process');
      const variant = (developed && si > 0) ? developCell(cell, ops[si % ops.length], cr) : cell;
      // how many mid layers are active this section (additive build: layers enter as I rises)
      const nActiveMid = Math.max(1, Math.round(midPats.length * Math.min(1, I + 0.15)));
      const activeMids = midPats.slice(0, nActiveMid);
      const nActiveTex = Math.round(texPats.length * Math.min(1, I + 0.2));
      const isBreak = sec.role === 'break' || sec.role === 'stopcut';

      for (let bi = 0; bi < sec.bars; bi++) {
        const bar = sec.startBar + bi;
        const barBeat = barBeatsList[bar];
        const first = bi === 0;

        // STOP-CUT / BREAK: near silence, a rumble, then a restart hit
        if (isBreak) {
          if (recipe.formType === 'moment' || recipe.style === 'circle') {
            if (first) push(events, 'break', ens.anchor, 0, barBeat, 0.16, 0.9, ['stopcut']);
            for (let s = 0; s < meter.steps && ens.textures[0]; s += 2) push(events, 'break', ens.textures[0], s * STEP_BEAT, barBeat, 0.1, 0.14 + 0.1 * (s / meter.steps), ['rumble']);
          } else {
            // drop to the timeline + a fill call
            if (timeSteps) for (const st of timeSteps) push(events, 'break', ens.timeline || ens.mids[0], st * STEP_BEAT, barBeat, 0.14, 0.6, ['timeline']);
            if (bi === sec.bars - 1 && ens.lead) for (let s = 0; s < meter.steps; s++) if (lr.bool(0.5)) push(events, 'break', ens.lead, s * STEP_BEAT, barBeat, 0.12, 0.5 + 0.4 * (s / meter.steps), ['fill', 'call']);
          }
          continue;
        }

        // TIMELINE (the inviolable clock-key) — present from the first bar unless a
        // developmental concert piece states it a section in
        const timeOn = timeSteps && !(developed && si === 0 && recipe.style === 'concert' && bi < 1);
        if (timeOn && timeSteps) for (let ti = 0; ti < timeSteps.length; ti++) {
          const st = timeSteps[ti];
          push(events, 'timeline', ens.timeline || ens.colors[0] || ens.mids[0], st * STEP_BEAT, barBeat, 0.14, (ti === 0 ? 0.8 : 0.62) * (0.7 + 0.4 * I), ['timeline']);
        }

        // LOW ANCHOR
        if (I > 0.12) {
          if (recipe.timeline === 'pulse') { for (const p of meter.beatStartsPulse) push(events, 'anchor', ens.anchor, p * 0.5, barBeat, 0.16, p === 0 ? 0.92 : 0.7, ['heartbeat']); }
          else for (const p of anchorPat) push(events, 'anchor', ens.anchor, p * 0.5, barBeat, 0.16, p === 0 ? 0.95 : 0.72, ['anchor']);
        }

        // MID interlocking ostinati (each its own Euclidean loop + phase)
        activeMids.forEach((mp) => {
          for (const p of mp.pat) {
            if (!sr.bool(0.6 + 0.4 * recipe.density)) continue;
            const onDown = p === 0;
            const stroke = mp.stroke ? [(sr.bool(0.3 * recipe.looseness + 0.1) ? 'slap' : mp.stroke)] : [];
            push(events, 'mid', mp.desc, p * 0.5, barBeat, 0.14, (onDown ? 0.7 : 0.56) * (0.6 + 0.5 * I), stroke.concat(['ostinato']));
          }
        });

        // CELL development spread across colors/mids (developmental recipes)
        if (developed && recipe.development > 0.4 && ens.colors.length) {
          const rot = rotate(variant.steps, (si * 3) % variant.len, variant.len);
          const target = ens.colors[si % ens.colors.length];
          rot.forEach((st, oi) => {
            const step = st % meter.steps;
            if (!cr.bool(recipe.development)) return;
            push(events, 'cell', target, step * STEP_BEAT, barBeat, 0.14, (0.55 + 0.35 * I) * (cell.accents[oi % cell.accents.length] || 0.6), ['cell']);
          });
        }

        // TEXTURE (shaker/scrape subdivision)
        for (let k = 0; k < nActiveTex; k++) {
          const tp = texPats[k];
          for (let p = 0; p < meter.pulses; p += tp.every) {
            if (!sr.bool(0.7 + 0.3 * I)) continue;
            const accent = (p % 2 === 0);
            push(events, 'texture', tp.desc, p * 0.5, barBeat, 0.13, (accent ? 0.34 : 0.26) * (0.6 + 0.5 * I), accent ? ['accent'] : []);
          }
        }

        // COLOR accents (metal/bell/clap/chime on beats/backbeats), scaled by I & call
        if (ens.colors.length && I > 0.3) {
          const target = ens.colors[bi % ens.colors.length];
          const heads = meter.beatStartsPulse;
          if (recipe.callResponse > 0.3 && meter.feel === 'duple' && heads.length >= 2) {
            // a backbeat accent (beat-group 1 / 3) — the folk/groove flavor
            const bkt = heads[Math.min(1, heads.length - 1)];
            push(events, 'color', target, bkt * 0.5, barBeat, 0.14, 0.6 * (0.6 + 0.5 * I), ['accent']);
            if (heads.length >= 4) push(events, 'color', target, heads[3] * 0.5, barBeat, 0.14, 0.6 * (0.6 + 0.5 * I), ['accent']);
          } else if (cr.bool(0.5 * I + 0.2)) {
            push(events, 'color', target, heads[cr.int(0, heads.length - 1)] * 0.5, barBeat, 0.14, 0.5 * (0.6 + 0.5 * I), ['accent']);
          }
        }

        // LEAD improvises (the one free agent), busier at higher I & leadActivity
        if (ens.lead && lr.float() < recipe.leadActivity * (0.4 + 0.6 * I)) {
          const nHits = lr.int(2, Math.max(2, Math.round(meter.pulses * 0.6 * recipe.leadActivity)));
          const cells = onsets(euclid(nHits, meter.steps, lr.int(0, meter.steps - 1)));
          for (const st of cells) { if (!lr.bool(0.7)) continue; const slap = ens.lead.voice === 'drum' && lr.bool(0.45) ? ['slap'] : []; push(events, 'lead', ens.lead, st * STEP_BEAT, barBeat, 0.13, 0.55 + 0.35 * lr.float(), slap.concat(['lead'])); }
        }

        // UNISON hits at high intensity in developmental pieces (Varèse-like stabs)
        if (developed && recipe.development > 0.5 && I > 0.75 && bi % 2 === 0) {
          for (const d of [ens.anchor, ens.mids[0], ens.colors[0]]) push(events, 'unison', d, 0, barBeat, 0.14, 0.95, ['unison']);
        }

        // GONG at the peak downbeat and on the final coda bar (the ending)
        const gongDesc = ens.colors.find ? ens.colors.filter((c) => c.voice === 'gong')[0] : null;
        if ((sec.role === 'peak' && first) || (sec.role === 'coda' && bi === sec.bars - 1)) {
          const g = gongDesc || { voice: 'gong', midi: CAT.gong.midi, pan: 0 };
          push(events, 'color', g, 0, barBeat, 3.5, sec.role === 'coda' ? 1.0 : 0.9, ['gong']);
        }

        // FILLS at 4/8/16-bar phrase boundaries (punctuation)
        const inPhrasePos = (bar + 1);
        if (ens.lead && (inPhrasePos % 8 === 0 || (recipe.callResponse > 0.6 && inPhrasePos % 4 === 0)) && !isBreak && bi === sec.bars - 1) {
          for (const s of [meter.steps - 6, meter.steps - 4, meter.steps - 2]) if (s >= 0) push(events, 'fill', ens.lead, s * STEP_BEAT, barBeat, 0.12, 0.45 + 0.12 * ((s) / meter.steps), ['fill']);
        }
      }
    });
    return { events, cell };
  }

  // ---- Melodic accompaniment (optional; never the focus) ---------------------
  const STYLE_SCALES = ['minorPentatonic', 'majorPentatonic', 'dorian', 'phrygian', 'wholeTone', 'inScale', 'naturalMinor'];
  function melodyLayer(r, recipe, ens, meter, tonicMidi, scaleName, bars, barBeatsList) {
    const events = [];
    const amount = recipe.pitched;
    if (amount <= 0.02 || !ens.melodic.length) return events;
    const pool = theory.scale(tonicMidi, scaleName, { octaves: 2 }).filter((m) => m >= tonicMidi + 5 && m <= tonicMidi + 26);
    if (!pool.length) return events;
    const nNotes = r.int(3, 5);
    const riff = []; let idx = r.int(0, Math.max(0, pool.length - 4));
    for (let i = 0; i < nNotes; i++) { idx = Math.max(0, Math.min(pool.length - 1, idx + r.int(-2, 2))); riff.push(pool[idx]); }
    const slots = []; const step = meter.feel === 'compound' ? 1.5 : 1;
    for (let b = 0; b < meter.barBeats - 0.25; b += step) slots.push(b);
    const lead = ens.melodic[0]; const under = ens.melodic[1] || null;
    const bassPitch = tonicMidi - 12;
    for (let bar = 0; bar < bars; bar++) {
      const barBeat = barBeatsList[bar];
      for (let s = 0; s < slots.length; s++) {
        if (r.bool(0.45 + 0.4 * amount)) {
          const p = riff[(s + bar) % riff.length];
          push(events, 'melody', lead, slots[s], barBeat, 0.9, 0.3 * (0.7 + 0.6 * amount), (lead.voice === 'mallet' && r.bool(0.25)) ? ['xylo'] : []);
        }
        if (under && r.bool(0.2 * amount)) push(events, 'melody', under, slots[s], barBeat, 0.8, 0.24 * (0.7 + 0.5 * amount), []);
      }
      // a soft low pulse (bass) under it
      events.push({ beat: barBeat, durBeats: 1.2, midi: bassPitch, voice: 'bass', role: 'bassline', vel: 0.36 * (0.7 + 0.5 * amount), pan: 0, tags: ['root'] });
      if (r.bool(0.4) && meter.barBeats >= 3) events.push({ beat: barBeat + Math.floor(meter.barBeats / 2), durBeats: 0.8, midi: tonicMidi - 12 + 7, voice: 'bass', role: 'bassline', vel: 0.3 * (0.7 + 0.5 * amount), pan: 0, tags: ['move'] });
    }
    return events;
  }

  // ---- Build the section spans from the arc + form ---------------------------
  function buildSections(r, recipe, bars, groupSize, meter) {
    const n = Math.max(3, Math.min(9, recipe.sections | 0));
    const raw = [];
    for (let i = 0; i < n; i++) raw.push(arcAt(recipe.arc, (i + 0.5) / n));
    // bar distribution: weight busier sections slightly longer; snap toward the group
    const weights = raw.map((I) => 0.8 + 0.5 * I);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const snap = groupSize >= 8 ? 4 : 2;
    const barsPer = weights.map((w) => { let nb = Math.round((w / wsum) * bars); if (nb >= snap) nb = Math.max(snap, Math.round(nb / snap) * snap); return Math.max(2, nb); });
    // roles
    let maxI = 0; for (let i = 1; i < n; i++) if (raw[i] > raw[maxI]) maxI = i;
    const spans = []; let sb = 0;
    for (let i = 0; i < n; i++) {
      let role = 'body';
      if (i === 0) role = 'intro';
      else if (i === n - 1) role = 'coda';
      else if (i === maxI) role = 'peak';
      else if (raw[i] < 0.32 && raw[i - 1] > raw[i] && (i + 1 >= n || raw[i + 1] >= raw[i])) role = (recipe.arc === 'swellcut' || recipe.style === 'circle') ? 'stopcut' : 'break';
      spans.push({ id: role + (i + 1), role, startBar: sb, bars: barsPer[i], startBeat: barBeatsList_of(sb, meter), intensity: +raw[i].toFixed(3) });
      sb += barsPer[i];
    }
    return { spans, totalBars: sb };
    function barBeatsList_of(bar, m) { return bar * m.barBeats; }
  }

  // ==========================================================================
  // Top level
  // ==========================================================================
  const PRESET_STYLES = ['auto', 'concert', 'folk', 'circle'];
  const DEFAULT_STYLE = 'auto';

  function composePercussion(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const styleIn = PRESET_STYLES.indexOf(opts.style) !== -1 ? opts.style : (REGIONS[opts.style] ? opts.style : DEFAULT_STYLE);
    const meterKey = METERS[opts.meter] ? opts.meter : DEFAULT_METER;
    const meter = METERS[meterKey];
    const groupSize = [4, 8, 16].indexOf(opts.group | 0) !== -1 ? (opts.group | 0) : 8;
    let bars = opts.bars == null ? 32 : Math.max(12, Math.min(64, opts.bars | 0));

    const master = new Rng(seed);
    // legacy `melody` (0..1) maps onto the `pitched` axis if the user set it and
    // didn't set `pitched` explicitly.
    const recipeOpts = Object.assign({}, opts, { style: styleIn });
    if (recipeOpts.pitched == null && opts.melody != null) recipeOpts.pitched = opts.melody;
    const recipe = sampleRecipe(master.stream('recipe'), recipeOpts, meter);
    const ens = sampleEnsemble(master.stream('ensemble'), recipe, opts);

    // sections + bar list (recompute barBeatsList against the snapped total)
    let barBeatsList = []; for (let b = 0; b < bars + 16; b++) barBeatsList.push(b * meter.barBeats);
    const built = buildSections(master.stream('form'), recipe, bars, groupSize, meter);
    bars = built.totalBars;
    barBeatsList = []; for (let b = 0; b < bars; b++) barBeatsList.push(b * meter.barBeats);
    // fix section startBeats against the final list
    for (const s of built.spans) s.startBeat = barBeatsList[s.startBar] != null ? barBeatsList[s.startBar] : s.startBar * meter.barBeats;

    const gen = generate(master.stream('gen'), recipe, ens, meter, built.spans, barBeatsList);
    let events = gen.events;

    // optional melodic accompaniment
    const scaleName = STYLE_SCALES[Math.abs(hashInt(seed + '|scale')) % STYLE_SCALES.length];
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic) : (opts.tonic == null ? theory.noteToMidi('A3') : opts.tonic);
    events = events.concat(melodyLayer(master.stream('melody'), recipe, ens, meter, tonicMidi, scaleName, bars, barBeatsList));

    events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    const voicesUsed = Array.from(new Set(events.map((e) => e.voice)));
    const ensembleList = [ens.anchor, ens.timeline].concat(ens.mids, ens.colors, ens.textures, ens.lead ? [ens.lead] : [], ens.melodic).filter(Boolean).map((d) => d.key || d.voice);
    const selfReport = {
      engine: 'percussion', style: styleIn, meter: meter.label, bars, group: groupSize,
      form: describeForm(recipe), recipe: {
        development: recipe.development, density: recipe.density, looseness: recipe.looseness, pitched: recipe.pitched,
        arc: recipe.arc, formType: recipe.formType, timeline: recipe.timeline, lead: +recipe.leadActivity.toFixed(2),
      },
      sections: built.spans.map((s) => s.role).join(' · '),
      ensemble: Array.from(new Set(ensembleList)).join(', '),
      voices: voicesUsed.join(', '),
      melody: recipe.pitched > 0.02 && ens.melodic.length ? (scaleName + ' ' + ens.melodic.map((d) => d.voice).join('/') + ' ostinato as accompaniment') : 'none',
      idea: describeIdea(recipe, meter, ens, scaleName),
    };

    return {
      meta: { seed, style: styleIn, meter: meter.label, meterKey, barBeats: meter.barBeats, steps: meter.steps, pulses: meter.pulses, feel: meter.feel,
        bars, group: groupSize, tonic: theory.midiToNoteName(tonicMidi), scaleName, recipe, ensemble: Array.from(new Set(ensembleList)) },
      sections: built.spans, events, selfReport, cell: gen.cell,
    };
  }

  function hashInt(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  function describeForm(recipe) {
    const forms = { cyclic: 'cyclic ostinato (loop core, vary edges)', additive: 'additive layering', cellDev: 'cell development', throughComposed: 'through-composed', process: 'audible process', moment: 'moment form (self-contained blocks)' };
    const arcs = { rise: 'a steady rise', arch: 'an arch (rise then fall)', archLate: 'a late-peaking arch', terraced: 'terraced steps', wave: 'waves of build and ebb', johakyu: 'jo-ha-kyū (slow build, sharp climax, quick end)', frontload: 'front-loaded (strong open, winding down)', flat: 'a level, moment-form texture', swellcut: 'a rumble, a stop-cut, and a ride back' };
    return (forms[recipe.formType] || recipe.formType) + ' over ' + (arcs[recipe.arc] || recipe.arc);
  }
  function describeIdea(recipe, meter, ens, scaleName) {
    const tl = { clave: 'a clave timeline', bell: 'a bell timeline', euclid: 'a Euclidean timeline', sieve: 'a sieve timeline', pulse: 'a shared pulse', none: 'no fixed timeline' }[recipe.timeline];
    const mel = recipe.pitched > 0.02 && ens.melodic.length ? ` A quiet ${scaleName} ${ens.melodic.map((d) => d.voice).join('/')} ostinato accompanies, never leading.` : '';
    const lead = ens.lead ? ` a ${ens.lead.voice} lead improvises;` : '';
    return `A percussion piece in ${meter.label}: ${describeForm(recipe)}, anchored by ${tl} and interlocking ${ens.mids.map((d) => d.voice).join('/')} ostinati over a ${ens.anchor.voice} anchor;${lead} density ${Math.round(recipe.density * 100)}%, looseness ${Math.round(recipe.looseness * 100)}%.${mel}`;
  }

  return { composePercussion, METERS, TIMELINES, CAT, ROLE_POOL, ARC_SHAPES, FORM_TYPES, TIMELINE_TYPES, ENSEMBLE_PRESETS, PRESET_STYLES, arcAt, makeMeter };
});
