/*
 * percussion — a reference COMPOSER for a PERCUSSION-CENTRIC engine (Engine 05),
 * "Percussion Ensemble." The brief (Tom, 2026-07-09): music ranging from formal
 * concert-hall percussion, through folk percussion ensembles of various cultures,
 * to informal improvisational drum circles; a variety of original percussion
 * voices; default 2/4 or 4/4 with 4/8/16-bar groupings but other meters
 * selectable; each piece has an overall structure and form; an optional MELODIC
 * component that only ever ACCOMPANIES the percussion.
 *
 * This composer is the browser realization of the design targets set out in
 * wiki/percussion-music.md (the three worlds and their forms) using the rhythm
 * technology already in the wiki: asymmetric TIMELINES/claves and cross-rhythm
 * (wiki/west-african-rhythm.md, wiki/rhythm-and-meter.md), EUCLIDEAN interlocking
 * ostinati (wiki/rhythm-and-meter.md, lib/rng.js euclid()), an OSTINATO-plus-LEAD
 * ensemble with call-and-response (wiki/west-african-rhythm.md), colotomic/irama
 * density thinking (wiki/gamelan.md), and — because a percussion piece has no
 * harmony to carry large-scale shape — a DENSITY/INTENSITY curve as the primary
 * form (wiki/form-and-structure.md: cumulative layering + a monotonic intensity
 * trajectory to a late climax; wiki/east-asian-traditions.md jo-ha-kyu).
 *
 * Three STYLES, each a different way to give a percussion piece form:
 *   - 'ensemble' (concert / art percussion — Varèse/Reich/Xenakis lineage): a
 *     through-composed density ARC built by developing one rhythmic CELL across
 *     the ensemble (augmentation/diminution/displacement/rotation), with unison
 *     hits, breaks, a metallic climax and a real ending. Odd meters welcome.
 *   - 'folk' (folk ensemble — West African / Afro-Cuban / samba lineage): a fixed
 *     TIMELINE + interlocking support ostinati + a low anchor + a LEAD drum that
 *     varies + call/breaks; cyclic, "loop the core and vary the edges," built by
 *     layering parts in one at a time and dropping them at the end.
 *   - 'circle' (informal drum circle): a shared pulse HEARTBEAT that parts join
 *     loosely, density SWELLS ("rumbles"), a stop-cut, call-and-echo, a fade —
 *     coherence from entrainment on a common pulse, not a score.
 *
 * OUTPUT is the shared beat-based Note schema (wiki/engine-architecture.md):
 * { beat, durBeats, midi, voice, role, vel, tags } in BEATS (quarter-note beats);
 * tempo, feel, dynamics shaping and the timbre macros are the performer's job
 * (engine.js). Percussion voices carry a nominal midi so the visualization has a
 * lane and the synth voice has a base pitch to tune from; the tuned mallet/bass
 * carry real pitches in the chosen mode.
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

  // ---- Meters ---------------------------------------------------------------
  // Every meter reduces to a bar of `pulses` base EIGHTH-note pulses grouped into
  // beats (groups of eighth-counts) with a SIXTEENTH onset grid (subdiv = 2). A
  // "beat" here is a quarter note; onset positions and durations are emitted in
  // quarter-note beats (stepBeat = 0.25), so the performer maps beat->seconds at a
  // constant tempo linearly and additive (aksak) meters just have unequal groups.
  // Defaults are the brief's 2/4 and 4/4; odd/compound meters are selectable
  // (wiki/rhythm-and-meter.md: additive/aksak meters like 7/8 = 2+2+3).
  const SUBDIV = 2;                         // onset grid = eighth-pulse / 2 = sixteenth
  const STEP_BEAT = 0.5 / SUBDIV;           // 0.25 quarter-beats per step
  function makeMeter(label, groups, feel) {
    const pulses = groups.reduce((a, b) => a + b, 0);   // eighth-pulses per bar
    const steps = pulses * SUBDIV;                        // sixteenth steps per bar
    const barBeats = pulses * 0.5;                        // quarter-note beats per bar
    const beatStartsPulse = []; let acc = 0;             // eighth-pulse index of each group start
    for (const g of groups) { beatStartsPulse.push(acc); acc += g; }
    const accents = beatStartsPulse.map((p) => p * 0.5);  // quarter-beat positions of group starts
    return { label, groups, pulses, steps, barBeats, accents, beatStartsPulse, feel };
  }
  const METERS = {
    '4/4': makeMeter('4/4', [2, 2, 2, 2], 'duple'),      // 8 eighths, 4 beats — default
    '2/4': makeMeter('2/4', [2, 2], 'duple'),            // 4 eighths, 2 beats — default
    '3/4': makeMeter('3/4', [2, 2, 2], 'triple'),        // waltz/triple
    '6/8': makeMeter('6/8', [3, 3], 'compound'),         // 2 dotted-quarter beats
    '12/8': makeMeter('12/8', [3, 3, 3, 3], 'compound'), // the 12-pulse bell home
    '5/8': makeMeter('5/8', [2, 3], 'odd'),              // aksak 2+3
    '7/8': makeMeter('7/8', [2, 2, 3], 'odd'),           // aksak 2+2+3
    '5/4': makeMeter('5/4', [2, 2, 2, 2, 2], 'odd'),     // 5 quarter beats
    '7/4': makeMeter('7/4', [2, 2, 2, 2, 2, 2, 2], 'odd'),
  };
  const DEFAULT_METER = '4/4';

  // ---- Timelines (asymmetric key patterns), as EIGHTH-pulse onset indices -----
  // wiki/west-african-rhythm.md + wiki/rhythm-and-meter.md. Keyed by the pulse
  // count of the bar so the folk composer can pick one that fits the meter. The
  // 16-pulse family here is expressed on the 16-step SIXTEENTH grid of 4/4 (since
  // claves live at the sixteenth level); the 12-pulse bells at the eighth level.
  const TIMELINES = {
    // 4/4 (16 sixteenth-steps): the son/rumba clave family (wiki: son clave
    // x..x..x...x.x...) and tresillo/cinquillo — expressed as sixteenth-steps.
    clave16: {
      sonClave32: [0, 3, 6, 10, 12],      // 3-2 son clave
      rumbaClave: [0, 3, 7, 10, 12],      // 3-2 rumba clave
      sonClave23: [4, 6, 10, 12, 15],     // 2-3 son clave (rotation)
      tresillo: [0, 3, 6, 11, 14],        // tresillo + backbeat feel
      cinquillo: [0, 2, 3, 5, 6, 8, 11, 13],
    },
    // 12/8 (12 eighth-pulses): the West African standard 7-stroke bell and kin.
    bell12: {
      standard: [0, 2, 4, 5, 7, 9, 11],   // x.x.xx.x.x.x  (wiki/west-african-rhythm.md)
      short: [0, 2, 5, 7, 9],             // 5-stroke reduction
      tresillo: [0, 3, 6, 8, 10],
    },
    // 6/8 (6 eighths): a short bell.
    bell6: { standard: [0, 2, 3, 5], short: [0, 3, 5] },
  };

  // ---- The percussion palette (register + material roles) --------------------
  // Original voices (wiki/percussion-sound-design.md). Nominal midi gives the viz
  // a lane and the synth voice a base pitch; the exact tuning is a performer macro.
  // role tags drive layering (low anchor / mid tone / wood / metal / shaker / lead)
  // and the mix (wiki/effects-and-mixing.md: low drum loud+centred, highs high-passed).
  const PALETTE = {
    boom:   { voice: 'boom',   midi: 36, band: 'low',   pan: 0.0 },   // the low anchor
    drumLo: { voice: 'drum',   midi: 48, band: 'mid',   pan: -0.28 }, // low tone drum
    drumMi: { voice: 'drum',   midi: 53, band: 'mid',   pan: 0.24 },  // mid tone drum
    drumHi: { voice: 'drum',   midi: 59, band: 'mid',   pan: -0.12 }, // high tone / lead drum
    wood:   { voice: 'wood',   midi: 79, band: 'high',  pan: 0.42 },  // clave / block
    woodLo: { voice: 'wood',   midi: 67, band: 'high',  pan: -0.4 },  // log / temple block
    metal:  { voice: 'metal',  midi: 74, band: 'high',  pan: 0.34 },  // bell / cowbell / agogo
    metalHi:{ voice: 'metal',  midi: 86, band: 'high',  pan: -0.34 }, // high ping / triangle
    gong:   { voice: 'gong',   midi: 55, band: 'metal', pan: 0.0 },   // plate / crash — color & climax
    shaker: { voice: 'shaker', midi: 90, band: 'high',  pan: 0.5 },   // shaker / cabasa
    shaker2:{ voice: 'shaker', midi: 92, band: 'high',  pan: -0.5 },  // second shaker (interlock)
  };

  // ---- helpers --------------------------------------------------------------
  function pushHit(events, role, key, beatInBar, barBeat, durBeats, vel, tags) {
    const v = PALETTE[key];
    events.push({ beat: barBeat + beatInBar, durBeats: durBeats == null ? 0.14 : durBeats,
      midi: v.midi, voice: v.voice, role, vel: Math.max(0.03, Math.min(1, vel)),
      pan: v.pan, tags: tags || [] });
  }
  // Convert a step-index onset list (on the meter's sixteenth grid) to quarter-beats.
  function stepBeats(stepList) { return stepList.map((s) => s * STEP_BEAT); }
  // Rotate an onset pattern within a step count.
  function rotate(steps, by, n) { return steps.map((s) => ((s + by) % n + n) % n).sort((a, b) => a - b); }

  // A per-section intensity target (0..1) — the density curve that carries form
  // when there is no harmony (wiki/form-and-structure.md, wiki/east-asian-
  // traditions.md jo-ha-kyu). Each style has its own arc of named sections.
  const FORMS = {
    ensemble: [
      { id: 'intro',   role: 'state',    beatsMul: 1,   intensity: 0.18 },
      { id: 'build',   role: 'develop',  beatsMul: 1.5, intensity: 0.5 },
      { id: 'drive',   role: 'develop',  beatsMul: 1.5, intensity: 0.72 },
      { id: 'climax',  role: 'climax',   beatsMul: 1,   intensity: 1.0 },
      { id: 'break',   role: 'reduce',   beatsMul: 0.5, intensity: 0.28 },
      { id: 'coda',    role: 'close',    beatsMul: 1,   intensity: 0.6 },
    ],
    folk: [
      { id: 'call',    role: 'timeline', beatsMul: 0.75, intensity: 0.16 },
      { id: 'build',   role: 'layer',    beatsMul: 1,    intensity: 0.5 },
      { id: 'groove',  role: 'groove',   beatsMul: 2,    intensity: 0.8 },
      { id: 'break',   role: 'break',    beatsMul: 0.5,  intensity: 0.5 },
      { id: 'ride',    role: 'groove',   beatsMul: 1.5,  intensity: 0.92 },
      { id: 'out',     role: 'shed',     beatsMul: 0.75, intensity: 0.3 },
    ],
    circle: [
      { id: 'pulse',   role: 'heartbeat', beatsMul: 0.75, intensity: 0.2 },
      { id: 'join',    role: 'layer',     beatsMul: 1.25, intensity: 0.55 },
      { id: 'rumble',  role: 'swell',     beatsMul: 1,    intensity: 0.95 },
      { id: 'drop',    role: 'stopcut',   beatsMul: 0.4,  intensity: 0.12 },
      { id: 'ride',    role: 'groove',    beatsMul: 1.5,  intensity: 0.78 },
      { id: 'fade',    role: 'fade',      beatsMul: 0.75, intensity: 0.24 },
    ],
  };

  // ==========================================================================
  // Rhythmic CELL (for the concert 'ensemble' style) + development operators.
  // A short motif of onsets (step indices within `cellSteps`) with per-onset
  // accents — the "germ" a concert percussion piece develops (wiki/composition-
  // craft.md economy of material; wiki/percussion-music.md cell development).
  // ==========================================================================
  function makeCell(r, meter) {
    const cellSteps = Math.min(meter.steps, 8 + (meter.pulses % 2));  // ~ one beat-group of grid
    // seed the cell from a Euclidean spread then perturb, so it is playable/uneven
    const k = r.int(3, Math.max(3, Math.floor(cellSteps * 0.55)));
    let pat = onsets(euclid(k, cellSteps, r.int(0, cellSteps - 1)));
    if (!pat.length || pat[0] !== 0) pat = [0].concat(pat.filter((s) => s !== 0));  // always articulate the head
    const accents = pat.map((s, i) => (i === 0 ? 1 : r.bool(0.35) ? 0.9 : 0.55));
    return { steps: pat.slice().sort((a, b) => a - b), accents, len: cellSteps };
  }
  // Development operators returning new step lists (mod the cell length).
  function developCell(cell, op, r) {
    const n = cell.len;
    if (op === 'rotate') return { steps: rotate(cell.steps, r.int(1, n - 1), n), len: n };
    if (op === 'diminish') return { steps: cell.steps.map((s) => Math.floor(s / 2)), len: Math.max(4, Math.floor(n / 2)) };
    if (op === 'augment') return { steps: cell.steps.map((s) => s * 2), len: n * 2 };
    if (op === 'displace') return { steps: cell.steps.map((s) => (s + 1) % n).sort((a, b) => a - b), len: n };
    if (op === 'thin') return { steps: cell.steps.filter((_, i) => i % 2 === 0), len: n };
    return { steps: cell.steps.slice(), len: n };
  }

  // ==========================================================================
  // MELODIC ACCOMPANIMENT (optional) — a tuned-mallet ostinato + a soft bass
  // pulse, constrained to a mode, kept QUIET and simple so it accompanies the
  // percussion and never leads it (the brief). wiki/gamelan.md balungan/ostinato,
  // wiki/melody.md contour. Placed on the beat grid; loops with variation.
  // ==========================================================================
  function melodyOstinato(r, meter, tonicMidi, scaleName, bars, barBeatsList, amount) {
    const events = [];
    if (amount <= 0.001) return events;
    // a short pitched riff on the mallet: 3–5 notes from the mode, mostly on beats
    const pool = theory.scale(tonicMidi, scaleName, { octaves: 2 }).filter((m) => m >= tonicMidi + 7 && m <= tonicMidi + 26);
    if (!pool.length) return events;
    const nNotes = r.int(3, 5);
    const riff = [];
    let idx = r.int(0, Math.max(0, pool.length - 4));
    for (let i = 0; i < nNotes; i++) {
      idx = Math.max(0, Math.min(pool.length - 1, idx + r.int(-2, 2)));
      riff.push(pool[idx]);
    }
    // rhythmic slots: pick beats of the bar (quarter positions), a laid, sparse feel
    const slots = [];
    for (let b = 0; b < meter.barBeats - 0.25; b += (meter.feel === 'compound' ? 1.5 : 1)) slots.push(b);
    const bassPitch = tonicMidi - 12;
    for (let bar = 0; bar < bars; bar++) {
      const barBeat = barBeatsList[bar];
      for (let s = 0; s < slots.length; s++) {
        // mallet: not every slot (sparse, riff-like); vary which notes per bar
        if (r.bool(0.62)) {
          const p = riff[(s + bar) % riff.length];
          events.push({ beat: barBeat + slots[s], durBeats: 0.9, midi: p, voice: 'mallet', role: 'melody',
            vel: 0.34 * (0.7 + 0.6 * amount), pan: 0.1, tags: (r.bool(0.25) ? ['xylo'] : []) });
        }
      }
      // soft bass on the downbeat (+ sometimes a mid-bar move) — a low pulse under it
      events.push({ beat: barBeat, durBeats: 1.2, midi: bassPitch, voice: 'bass', role: 'bassline',
        vel: 0.4 * (0.7 + 0.5 * amount), pan: 0.0, tags: ['root'] });
      if (r.bool(0.4) && meter.barBeats >= 3) {
        const fifth = tonicMidi - 12 + 7;
        events.push({ beat: barBeat + Math.floor(meter.barBeats / 2), durBeats: 0.8, midi: fifth, voice: 'bass', role: 'bassline',
          vel: 0.32 * (0.7 + 0.5 * amount), pan: 0.0, tags: ['move'] });
      }
    }
    return events;
  }

  // ==========================================================================
  // STYLE: ensemble (concert / art percussion) — develop a cell across a density arc.
  // ==========================================================================
  function composeEnsemble(r, meter, sections, barsPerSection, barBeatsList, barOf) {
    const events = [];
    const dr = r.stream('cell'), lr = r.stream('orch');
    const cell = makeCell(dr, meter);
    const ops = ['rotate', 'displace', 'diminish', 'augment', 'thin', 'none'];
    // instruments available, roughly low->high, brought in as intensity rises
    const layers = ['boom', 'drumLo', 'drumMi', 'wood', 'drumHi', 'metal', 'woodLo', 'metalHi', 'shaker'];
    let bar = 0;
    sections.forEach((sec, si) => {
      const nb = barsPerSection[si];
      const nActive = Math.max(1, Math.round(layers.length * sec.intensity));
      const active = layers.slice(0, nActive);
      // a developed variant of the cell for this section
      const variant = si === 0 ? cell : developCell(cell, ops[si % ops.length], lr);
      for (let bi = 0; bi < nb; bi++, bar++) {
        const barBeat = barBeatsList[bar];
        const isSecEnd = bi === nb - 1;
        // spread the cell across the ensemble: each active layer plays the cell
        // at its own rotation/register, denser layers filling more onsets.
        active.forEach((key, li) => {
          const rot = rotate(variant.steps, (li * 3) % variant.len, variant.len);
          const density = 0.35 + 0.6 * sec.intensity;
          rot.forEach((st, oi) => {
            const step = st % meter.steps;
            if (li > 0 && !lr.bool(density)) return;          // sparser in lower layers early
            const onBeat = (step % SUBDIV) === 0 && meter.beatStartsPulse.indexOf(step / SUBDIV) !== -1;
            const vel = (onBeat ? 0.8 : 0.5) * (0.5 + 0.5 * sec.intensity) * (cell.accents[oi % cell.accents.length] || 0.6);
            const tag = PALETTE[key].voice === 'drum' ? (lr.bool(0.25) ? 'slap' : 'tone') : null;
            pushHit(events, 'ensemble', key, step * STEP_BEAT, barBeat, 0.14, vel, tag ? [tag, sec.id] : [sec.id]);
          });
        });
        // unison "hits" at group heads in high-intensity sections (Varèse-like stabs)
        if (sec.intensity > 0.6 && (bi % 2 === 0)) {
          for (const key of ['boom', 'drumMi', 'wood']) pushHit(events, 'ensemble', key, 0, barBeat, 0.14, 0.95, ['unison', sec.id]);
        }
        // a gong at the climax downbeat and on the final coda bar (the ending)
        if ((sec.role === 'climax' && bi === 0) || (sec.role === 'close' && isSecEnd)) {
          pushHit(events, 'ensemble', 'gong', 0, barBeat, 3.5, sec.role === 'close' ? 1.0 : 0.9, ['gong', sec.id]);
        }
        // a break: one bar of near-silence (a rest is a first-class event) before re-entry
        if (sec.role === 'reduce' && bi === 0) {
          // leave the bar sparse: only a soft shaker roll
          for (let s = 0; s < meter.steps; s += 2) pushHit(events, 'ensemble', 'shaker', s * STEP_BEAT, barBeat, 0.1, 0.16, ['roll', sec.id]);
        }
      }
    });
    return { events, cell, form: 'concert density arc — state · develop · climax · break · close' };
  }

  // ==========================================================================
  // STYLE: folk — timeline + interlocking ostinati + anchor + lead, cyclic.
  // ==========================================================================
  function composeFolk(r, meter, sections, barsPerSection, barBeatsList) {
    const events = [];
    const tr = r.stream('timeline'), sr = r.stream('support'), ld = r.stream('lead');
    // pick a timeline that fits the meter's pulse count
    let timeSteps, timeVoice, timeIsSixteenth;
    if (meter.pulses === 8) { // 4/4
      const set = TIMELINES.clave16; const key = tr.pick(['sonClave32', 'rumbaClave', 'sonClave23', 'tresillo']);
      timeSteps = set[key]; timeVoice = 'wood'; timeIsSixteenth = true;
    } else if (meter.pulses === 12) { // 12/8
      const set = TIMELINES.bell12; timeSteps = set[tr.pick(['standard', 'short', 'tresillo'])].map((p) => p * SUBDIV); timeVoice = 'metal'; timeIsSixteenth = false;
    } else if (meter.pulses === 6) { // 6/8
      timeSteps = TIMELINES.bell6[tr.pick(['standard', 'short'])].map((p) => p * SUBDIV); timeVoice = 'metal'; timeIsSixteenth = false;
    } else {
      // odd/other meters: build a Euclidean timeline over the eighth pulses
      timeSteps = onsets(euclid(Math.max(3, Math.round(meter.pulses * 0.55)), meter.pulses, tr.int(0, meter.pulses - 1))).map((p) => p * SUBDIV);
      timeVoice = 'metal'; timeIsSixteenth = false;
    }
    // support ostinati: Euclidean interlocking parts on mid drums + shaker, each a
    // fixed loop at its own phase (wiki/west-african-rhythm.md k fixed loops).
    const supports = [
      { key: 'drumLo', pat: onsets(euclid(sr.int(2, 3), meter.pulses, sr.int(0, meter.pulses - 1))), stroke: 'bass' },
      { key: 'drumMi', pat: onsets(euclid(sr.int(3, 5), meter.pulses, sr.int(0, meter.pulses - 1))), stroke: 'tone' },
      { key: 'shaker', pat: (function () { const p = []; for (let s = 0; s < meter.steps; s += 2) p.push(s / SUBDIV); return p; })(), stroke: null },
    ];
    const anchorPat = meter.beatStartsPulse.slice();   // boom on each beat-group head
    let bar = 0;
    sections.forEach((sec, si) => {
      const nb = barsPerSection[si];
      // which layers are active this section (build by adding parts in one at a time)
      const layersIn = Math.max(1, Math.round((supports.length + 1) * Math.min(1, sec.intensity + 0.1)));
      const leadOn = sec.role === 'groove' || sec.role === 'break';
      for (let bi = 0; bi < nb; bi++, bar++) {
        const barBeat = barBeatsList[bar];
        // timeline: always present from the first bar (the clock-key)
        for (const st of timeSteps) pushHit(events, 'folk', timeVoice, st * STEP_BEAT, barBeat, 0.14, st === timeSteps[0] ? 0.82 : 0.66, ['timeline']);
        // low anchor
        if (sec.role !== 'timeline' || bi > 0) for (const p of anchorPat) pushHit(events, 'folk', 'boom', p * 0.5, barBeat, 0.16, p === 0 ? 0.95 : 0.72, ['anchor']);
        // support ostinati (enter progressively)
        for (let k = 0; k < Math.min(layersIn, supports.length); k++) {
          const sup = supports[k];
          for (const p of sup.pat) {
            const step = timeIsSixteenth ? p : p; // pat already in pulse units
            const beatIn = (sup.key === 'shaker') ? p * 0.5 : p * 0.5;
            const vel = (sup.key === 'shaker') ? 0.3 : 0.6;
            pushHit(events, 'folk', sup.key, beatIn, barBeat, 0.14, vel * (0.7 + 0.4 * sec.intensity), sup.stroke ? [sup.stroke, 'support'] : ['support']);
          }
        }
        // break: drop to timeline + a fill call
        if (sec.role === 'break' && bi === nb - 1) {
          for (let s = 0; s < meter.steps; s++) if (ld.bool(0.5)) pushHit(events, 'folk', 'drumHi', s * STEP_BEAT, barBeat, 0.12, 0.5 + 0.4 * (s / meter.steps), ['fill', 'call']);
        }
        // lead drum: improvises variations against the fixed background (the one free agent)
        if (leadOn) {
          const nHits = ld.int(2, Math.max(2, Math.round(meter.pulses * 0.6)));
          const cells = onsets(euclid(nHits, meter.steps, ld.int(0, meter.steps - 1)));
          for (const st of cells) {
            if (!ld.bool(0.7)) continue;
            const stroke = ld.bool(0.4) ? 'slap' : 'tone';
            pushHit(events, 'folk', 'drumHi', st * STEP_BEAT, barBeat, 0.13, 0.55 + 0.35 * ld.float(), [stroke, 'lead']);
          }
        }
      }
    });
    return { events, form: 'folk ensemble — timeline + interlocking ostinati + lead, cyclic (loop core, vary edges)' };
  }

  // ==========================================================================
  // STYLE: circle — a shared pulse heartbeat parts join loosely, swells, a stop-cut.
  // ==========================================================================
  function composeCircle(r, meter, sections, barsPerSection, barBeatsList) {
    const events = [];
    const pr = r.stream('pulse'), jr = r.stream('join');
    // simple parts people bring to a circle: low djembe-ish, mid tones, shakers, a bell
    const parts = [
      { key: 'boom',   every: meter.feel === 'compound' ? 3 : 2, band: 'low' },  // heartbeat on the beat
      { key: 'drumLo', pat: onsets(euclid(3, meter.pulses, jr.int(0, meter.pulses - 1))) },
      { key: 'drumMi', pat: onsets(euclid(jr.int(4, 5), meter.pulses, jr.int(0, meter.pulses - 1))) },
      { key: 'shaker', every: 1 },     // shaker on every eighth
      { key: 'metal',  pat: [0].concat(meter.beatStartsPulse.slice(1)) },
    ];
    let bar = 0;
    sections.forEach((sec, si) => {
      const nb = barsPerSection[si];
      const active = Math.max(1, Math.round(parts.length * Math.min(1, sec.intensity + 0.12)));
      for (let bi = 0; bi < nb; bi++, bar++) {
        const barBeat = barBeatsList[bar];
        // stop-cut: near-silence, then one boom to restart the pulse
        if (sec.role === 'stopcut') {
          if (bi === 0) pushHit(events, 'circle', 'boom', 0, barBeat, 0.16, 0.9, ['stopcut']);
          continue;
        }
        const swell = sec.role === 'swell' ? (0.6 + 0.5 * (bi / Math.max(1, nb - 1))) : 1;  // rumble builds within the section
        const fade = sec.role === 'fade' ? (1 - 0.7 * (bi / Math.max(1, nb - 1))) : 1;
        const dyn = Math.min(1.1, swell * fade);
        for (let k = 0; k < active; k++) {
          const part = parts[k];
          if (part.every) {
            for (let p = 0; p < meter.pulses; p += part.every) {
              if (part.key === 'shaker' && !jr.bool(0.85)) continue;
              const onDown = p === 0;
              pushHit(events, 'circle', part.key, p * 0.5, barBeat, 0.14,
                (part.key === 'boom' ? (onDown ? 0.9 : 0.66) : part.key === 'shaker' ? 0.28 : 0.6) * dyn,
                [part.key === 'boom' ? 'heartbeat' : 'join']);
            }
          } else if (part.pat) {
            for (const p of part.pat) {
              if (!jr.bool(0.8)) continue;                 // loose, human — not every repeat
              const stroke = part.key === 'drumMi' && jr.bool(0.3) ? 'slap' : 'tone';
              pushHit(events, 'circle', part.key, p * 0.5, barBeat, 0.13, (part.key === 'metal' ? 0.55 : 0.6) * dyn,
                part.key === 'metal' ? ['join'] : [stroke, 'join']);
            }
          }
        }
        // call-and-echo: a lead figure answered a bar later (in the ride section)
        if (sec.role === 'groove' && bi % 2 === 0) {
          const call = onsets(euclid(pr.int(2, 3), meter.pulses, pr.int(0, meter.pulses - 1)));
          for (const p of call) pushHit(events, 'circle', 'drumHi', p * 0.5, barBeat, 0.13, 0.6 * dyn, ['slap', 'call']);
        }
      }
    });
    return { events, form: 'drum circle — shared pulse, parts join, a rumble swell, a stop-cut, a fade' };
  }

  // ==========================================================================
  // Top level
  // ==========================================================================
  const STYLES = { ensemble: composeEnsemble, folk: composeFolk, circle: composeCircle };
  const STYLE_MODES = {   // default mode for the optional melodic layer per style
    ensemble: 'wholeTone', folk: 'minorPentatonic', circle: 'dorian',
  };
  const DEFAULT_STYLE = 'folk';

  function composePercussion(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const styleKey = STYLES[opts.style] ? opts.style : DEFAULT_STYLE;
    const meterKey = METERS[opts.meter] ? opts.meter : DEFAULT_METER;
    const meter = METERS[meterKey];
    // groupSize: the brief's "measures in groups of 4, 8, 16" — the phrase length.
    const groupSize = [4, 8, 16].indexOf(opts.group | 0) !== -1 ? (opts.group | 0) : 8;
    // total bars: clamp to a sensible range, snapped so the form divides evenly.
    let bars = opts.bars == null ? 32 : Math.max(12, Math.min(64, opts.bars | 0));

    const master = new Rng(seed);
    const formR = master.stream('form');
    const sections = FORMS[styleKey];

    // Distribute bars across sections by their beatsMul weight, snapped to the
    // group size where possible so phrases stay in 4/8/16-bar groups (the brief).
    const weights = sections.map((s) => s.beatsMul);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const barsPerSection = [];
    let assigned = 0;
    for (let i = 0; i < sections.length; i++) {
      let nb = Math.round((weights[i] / wsum) * bars);
      // snap toward a multiple of a small group (4 if group>=8 and section is long)
      const snap = groupSize >= 8 ? 4 : 2;
      if (nb >= snap) nb = Math.max(snap, Math.round(nb / snap) * snap);
      nb = Math.max(2, nb);
      barsPerSection.push(nb);
      assigned += nb;
    }
    // reconcile the total onto the largest (groove/climax) section
    const diff = assigned - barsPerSection.reduce((a, b) => a + b, 0);   // 0 by construction; keep bars accurate below
    bars = barsPerSection.reduce((a, b) => a + b, 0);

    // Precompute the quarter-beat start of every bar (all bars share meter.barBeats).
    const barBeatsList = [];
    for (let b = 0; b < bars; b++) barBeatsList.push(b * meter.barBeats);
    const barOf = (bar) => barBeatsList[bar];

    const built = STYLES[styleKey](formR, meter, sections, barsPerSection, barBeatsList, barOf);
    let events = built.events;

    // Optional melodic accompaniment (never the focus).
    const melodyAmt = opts.melody == null ? 0.6 : Math.max(0, Math.min(1, opts.melody));
    const scaleName = STYLE_MODES[styleKey];
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi('A3') : opts.tonic);
    if (melodyAmt > 0.001) {
      events = events.concat(melodyOstinato(master.stream('melody'), meter, tonicMidi, scaleName, bars, barBeatsList, melodyAmt));
    }

    events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    // section spans for the viz/report
    const sectionSpans = [];
    let sb = 0;
    for (let i = 0; i < sections.length; i++) {
      sectionSpans.push({ id: sections[i].id, role: sections[i].role, startBar: sb, bars: barsPerSection[i],
        startBeat: barBeatsList[sb], intensity: sections[i].intensity });
      sb += barsPerSection[i];
    }

    const voicesUsed = Array.from(new Set(events.map((e) => e.voice)));
    const selfReport = {
      engine: 'percussion',
      style: styleKey,
      meter: meter.label,
      form: built.form,
      bars,
      group: groupSize,
      sections: sections.map((s) => s.id).join(' · '),
      voices: voicesUsed.join(', '),
      melody: melodyAmt > 0.001 ? (scaleName + ' mallet ostinato + soft bass, as accompaniment') : 'none',
      idea: styleDescription(styleKey, meter, melodyAmt, scaleName),
    };

    return {
      meta: { seed, style: styleKey, meter: meter.label, meterKey, barBeats: meter.barBeats, steps: meter.steps,
        pulses: meter.pulses, feel: meter.feel, bars, group: groupSize, tonic: theory.midiToNoteName(tonicMidi), scaleName },
      sections: sectionSpans, events, selfReport, cell: built.cell || null,
    };
  }

  function styleDescription(style, meter, melodyAmt, scaleName) {
    const mel = melodyAmt > 0.001 ? ` A quiet ${scaleName} mallet ostinato and a soft bass accompany, never leading.` : '';
    if (style === 'ensemble') return `A concert percussion piece in ${meter.label}: one rhythmic cell is stated, then developed across the ensemble (rotation, displacement, augmentation, diminution) over a rising density arc to a metallic climax, a break, and a real gong ending.${mel}`;
    if (style === 'circle') return `An improvisational drum circle in ${meter.label}: a shared pulse heartbeat that parts join loosely, a rumble that swells, a stop-cut, call-and-echo, and a fade — coherence from a common pulse.${mel}`;
    return `A folk percussion ensemble in ${meter.label}: an asymmetric timeline anchors interlocking support ostinati and a low drum, a lead drum improvises variations with calls and breaks, built by layering parts in and shedding them at the end.${mel}`;
  }

  return { composePercussion, METERS, TIMELINES, PALETTE, FORMS, STYLES: Object.keys(STYLES), makeMeter };
});
