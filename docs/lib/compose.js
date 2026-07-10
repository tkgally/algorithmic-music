/*
 * compose — the just-in-time composer: shared composition machinery + the
 * incremental composer wrapper that the conductor (app.js) drives.
 *
 * The site's central module (site-architecture design doc §3/§5): where the
 * five preliminary engines each proved ONE composition family with a
 * compose-the-whole-piece-up-front shape, this module provides
 *   (a) SHARED HELPERS — harmony (functional backward-Piston walk, modal
 *       drift, loop/vamp banks, drone), melody (contour-first phrase filling
 *       with the tested wiki/melody.md constraint set, generalized from the
 *       tonal-phrase composer), voicing (nearest-motion voice leading, from
 *       the cantabile/groove comp work), and rhythm (meter-aware onset
 *       patterns, timelines: clave/bell/Euclidean/sieve/pulse) — that genre
 *       strategies assemble; and
 *   (b) create(vector, seedInt) — the incremental wrapper: each nextUnit()
 *       call composes JUST THE NEXT UNIT (a phrase / a few bars) reading the
 *       CURRENT style vector, which is what makes live no-restart changes
 *       possible (a control change lands on not-yet-composed material).
 *
 * Determinism: every unit draws from a fresh named stream `unit:<n>` derived
 *  from the piece seed, so unit n's notes never depend on how many draws
 * earlier units made — same (seed, settings) → same piece exactly, and a live
 * change perturbs only the units composed after it.
 *
 * The strategy contract (genre packs register these via AM.styles):
 *   strategy.unitBars — nominal bars per unit (phrase grain)
 *   strategy.init(vector, rng) -> plan
 *       plan.sections = [{ role, bars, intensity }]; plan.totalBars; plus any
 *       strategy-private fields. Pure.
 *   strategy.nextUnit(plan, vector, pos, rng) -> unit
 *       unit = { notes, lengthBeats, bars, section, intensity, last }
 *       notes: [{ beat (unit-relative, quarter-note beats), durBeats, midi?,
 *                 freq?, voice, vel?, tags?, expr?, p?, pan?, weight? }]
 *   pos (wrapper-maintained): { unitIdx, bar, section, sectionIdx,
 *       barInSection, tPiece (0..1), totalBars, arcLevel }
 *
 * Original first-party code (CC0). The melody constraint machinery
 * reimplements this project's own tested tonal-phrase composer (session 017,
 * 15 structural tests) in meter/register-general form; the harmony walk uses
 * theory.js's Piston table per wiki/harmony.md. Dual-format (UMD-lite):
 * window.AM.compose in the browser; require() in Node for headless tests.
 */
;(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory({
      rng: require('./rng.js'), theory: require('./theory.js'),
      generators: require('./generators.js'), style: require('./style.js'),
      registry: null,
    });
  } else {
    const AM = global.AM || (global.AM = {});
    AM.compose = factory({ rng: AM.rng, theory: AM.theory, generators: AM.generators, style: AM.style, registry: () => AM.styles });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { rng: rngLib, theory, generators, style } = deps;
  let getRegistry = deps.registry || (() => null);

  function pcOf(m) { return ((Math.round(m) % 12) + 12) % 12; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // Heptatonic parent for harmony when the melodic scale is not 7 notes
  // (pentatonic melodies still sit over triadic/parent harmony).
  const PARENT_SCALE = {
    majorPentatonic: 'major', minorPentatonic: 'naturalMinor',
    inScale: 'phrygian', wholeTone: 'lydian', chromatic: 'major',
  };
  function harmonicScale(scaleName) {
    const pat = theory.SCALES[scaleName];
    if (pat && pat.length === 7) return scaleName;
    return PARENT_SCALE[scaleName] || 'major';
  }

  // ---- Harmony ----------------------------------------------------------------
  // Reverse index of Piston's major-key table for the backward cadence-first
  // walk (proven in the tonal-phrase composer; wiki/harmony.md).
  const PISTON_REVERSE = (function () {
    const rev = {};
    for (const roman of Object.keys(theory.PISTON_MAJOR_TRANSITIONS)) {
      const { items, weights } = theory.pistonSuccessors(roman);
      for (let i = 0; i < items.length; i++) {
        (rev[items[i]] || (rev[items[i]] = { items: [], weights: [] }));
        rev[items[i]].items.push(roman);
        rev[items[i]].weights.push(weights[i]);
      }
    }
    return rev;
  })();
  function predecessorOf(nextRoman, r, avoid) {
    const row = PISTON_REVERSE[nextRoman];
    if (!row || !row.items.length) return 'I';
    let items = row.items, weights = row.weights;
    if (avoid) {
      const it = [], wt = [];
      for (let i = 0; i < items.length; i++) { it.push(items[i]); wt.push(items[i] === avoid ? weights[i] * 0.15 : weights[i]); }
      items = it; weights = wt;
    }
    return r.weighted(items, weights);
  }

  // Chord lookup table for a vector's key: roman -> {roman, degree, quality,
  // notes (midi around octave 3-4), seventhNotes}. Major uses the major scale;
  // minor-ish scales splice harmonicMinor for a real leading-tone V.
  function chordTable(vector) {
    const tonicMidi = 48 + vector.tonicPc; // C3-based root register; voicing re-registers
    const hs = harmonicScale(vector.scale);
    const table = {};
    const add = (list) => { for (const c of list) if (!(c.roman in table)) table[c.roman] = c; };
    if (hs === 'naturalMinor' || hs === 'harmonicMinor') {
      add(theory.diatonicChords(tonicMidi, 'harmonicMinor'));
      add(theory.diatonicChords(tonicMidi, 'naturalMinor'));
    } else {
      add(theory.diatonicChords(tonicMidi, hs));
    }
    return table;
  }

  // Modal chord pools per scale color: degrees that define the mode's sound
  // (wiki/modal-and-nonfunctional-harmony.md — oscillation and plagal motion,
  // avoid the functional V-I habit). Values are scale DEGREES (1-7).
  const MODAL_POOLS = {
    major: { home: 1, moves: [4, 6, 2, 5], weights: [3, 2, 1.5, 1] },       // plagal-leaning
    naturalMinor: { home: 1, moves: [6, 7, 4, 3], weights: [3, 3, 2, 1.5] },
    harmonicMinor: { home: 1, moves: [6, 4, 5, 7], weights: [3, 2, 2, 1] },
    dorian: { home: 1, moves: [4, 7, 5, 3], weights: [3.5, 2.5, 1.5, 1] },  // i-IV the dorian signature
    phrygian: { home: 1, moves: [2, 7, 4, 6], weights: [3.5, 2, 1.5, 1] },  // i-bII the phrygian signature
    lydian: { home: 1, moves: [2, 5, 6, 3], weights: [3.5, 2, 1.5, 1] },    // I-II the lydian signature
    mixolydian: { home: 1, moves: [7, 4, 5, 2], weights: [3.5, 2.5, 1.5, 1] }, // I-bVII
    melodicMinor: { home: 1, moves: [4, 5, 2, 6], weights: [3, 2, 1.5, 1] },
    locrian: { home: 1, moves: [3, 6, 4, 2], weights: [3, 2, 1.5, 1] },
  };

  // Loop/vamp banks per scale family (degrees), the pop/electronic/lofi world.
  const LOOP_BANKS = {
    majorish: [[1, 5, 6, 4], [1, 6, 4, 5], [1, 4, 6, 5], [6, 4, 1, 5], [1, 4, 1, 5], [1, 2, 4, 1]],
    minorish: [[1, 6, 3, 7], [1, 4, 6, 7], [1, 7, 6, 7], [1, 3, 7, 4], [1, 4, 1, 7], [1, 6, 7, 1]],
  };

  /**
   * progression(vector, bars, rng, opts) -> array of `bars * harmonicRhythm`
   * chord slots: { roman, degree, quality, notes, seventhNotes, bassMidi, barBeat }.
   * opts: { cadence: 'PAC'|'HC'|'none', openRoman?, loop? (reuse a committed
   * loop), minorV? } — strategies drive phrase goals through `cadence`.
   */
  function progression(vector, bars, rng, opts) {
    opts = opts || {};
    const hs = harmonicScale(vector.scale);
    const table = chordTable(vector);
    const perBar = vector.harmonicRhythm >= 1 ? Math.round(vector.harmonicRhythm) : 1;
    const slotCount = Math.max(1, Math.round(bars * Math.max(0.25, vector.harmonicRhythm)));
    const barsPerSlot = bars / slotCount;
    let romans = [];

    if (vector.harmonyType === 'drone') {
      for (let i = 0; i < slotCount; i++) romans.push(hs === 'major' || hs === 'lydian' || hs === 'mixolydian' ? 'I' : 'i');
    } else if (vector.harmonyType === 'loop') {
      const minorish = ['naturalMinor', 'harmonicMinor', 'phrygian', 'dorian'].indexOf(hs) >= 0;
      const bank = minorish ? LOOP_BANKS.minorish : LOOP_BANKS.majorish;
      const loop = opts.loop || rng.pick(bank);
      const degToRoman = degreeToRomanMap(table, hs);
      for (let i = 0; i < slotCount; i++) romans.push(degToRoman[loop[i % loop.length]] || degToRoman[1]);
      romans._loop = loop;
    } else if (vector.harmonyType === 'modal') {
      const pool = MODAL_POOLS[hs] || MODAL_POOLS.dorian;
      const degToRoman = degreeToRomanMap(table, hs);
      let lastDeg = pool.home;
      for (let i = 0; i < slotCount; i++) {
        const isHome = i === 0 || i === slotCount - 1 || (i % 4 === 0 && rng.bool(0.6));
        if (isHome) { romans.push(degToRoman[pool.home]); lastDeg = pool.home; }
        else {
          let deg = rng.weighted(pool.moves, pool.weights);
          if (deg === lastDeg && rng.bool(0.7)) deg = pool.moves[(pool.moves.indexOf(deg) + 1) % pool.moves.length];
          romans.push(degToRoman[deg]); lastDeg = deg;
        }
      }
    } else {
      // functional: cadence-first backward walk (major); a fixed leading-tone
      // skeleton in minor (Piston's table is major-only — wiki/harmony.md).
      const minorish = ['naturalMinor', 'harmonicMinor'].indexOf(hs) >= 0
        || ['phrygian', 'dorian'].indexOf(hs) >= 0;
      const cadence = opts.cadence || 'PAC';
      if (minorish) {
        const base = cadence === 'HC' ? ['i', 'iv', 'ii°', 'V'] : ['i', 'iv', 'V', 'i'];
        for (let i = 0; i < slotCount; i++) romans.push(base[Math.min(base.length - 1, Math.floor(i * base.length / slotCount))]);
        if (cadence !== 'HC') { romans[slotCount - 1] = 'i'; if (slotCount >= 2) romans[slotCount - 2] = 'V'; }
        else romans[slotCount - 1] = 'V';
      } else {
        romans = new Array(slotCount);
        if (cadence === 'HC') romans[slotCount - 1] = 'V';
        else { romans[slotCount - 1] = 'I'; if (slotCount >= 2) romans[slotCount - 2] = 'V'; }
        const firstFixed = cadence === 'HC' ? slotCount - 1 : Math.max(0, slotCount - 2);
        romans[0] = opts.openRoman || 'I';
        for (let s = firstFixed - 1; s >= 1; s--) romans[s] = predecessorOf(romans[s + 1], rng, s === 1 ? romans[0] : null);
      }
    }

    const out = [];
    for (let i = 0; i < slotCount; i++) {
      const c = table[romans[i]] || table.I || table.i || Object.values(table)[0];
      out.push({
        roman: c.roman, degree: c.degree, quality: c.quality,
        notes: c.notes.slice(), seventhNotes: (c.seventhNotes || c.notes).slice(),
        bassPc: pcOf(c.notes[0]),
        beat: i * barsPerSlot * vector.meter.barBeats,
        durBeats: barsPerSlot * vector.meter.barBeats,
      });
    }
    if (romans._loop) out._loop = romans._loop;
    return out;
  }
  function degreeToRomanMap(table, hs) {
    const map = {};
    const list = theory.diatonicChords(48, hs === 'naturalMinor' ? 'naturalMinor' : hs);
    for (const c of list) map[c.degree] = table[c.roman] ? c.roman : Object.keys(table)[0];
    // in minor prefer harmonicMinor's real V for degree 5 when present
    if ((hs === 'naturalMinor' || hs === 'harmonicMinor') && table.V) map[5] = 'V';
    return map;
  }
  /** The chord slot sounding at unit-relative `beat`. */
  function chordAt(chords, beat) {
    let cur = chords[0];
    for (const c of chords) { if (c.beat <= beat + 1e-6) cur = c; else break; }
    return cur;
  }

  // ---- Voicing / voice leading ---------------------------------------------------
  // Nearest-motion voicing inside a register window (the session-021/025 comp
  // fix: consecutive chords move by small centroid steps — a bed, not a line).
  // opts.habit (a voicingHabit signature) reshapes the pitch-class set: an
  // invented style's voicing fingerprint.
  function voiceChord(chord, register, prevVoicing, richness, rng, opts) {
    const habitSig = opts && opts.vector ? sigOf(opts.vector, 'voicingHabit') : null;
    const habit = (opts && opts.habit) || (habitSig && habitSig.habit);
    const size = richness > 0.66 ? 4 : 3;
    let pcs = (richness > 0.33 ? chord.seventhNotes : chord.notes).slice(0, size).map(pcOf);
    if (habit === 'openFifth') pcs = [pcOf(chord.notes[0]), pcOf(chord.notes[2] != null ? chord.notes[2] : chord.notes[0] + 7)];
    else if (habit === 'clusterSecond' && chord.seventhNotes.length > 3) pcs = [pcOf(chord.notes[0]), pcOf(chord.notes[1]), pcOf(chord.seventhNotes[3])];
    else if (habit === 'tenthSpread') pcs = [pcOf(chord.notes[0]), pcOf(chord.notes[1]) ];
    const lo = register[0], hi = register[1];
    const target = prevVoicing && prevVoicing.length
      ? prevVoicing.reduce((a, b) => a + b, 0) / prevVoicing.length
      : (lo + hi) / 2;
    const voiced = [];
    for (const pc of pcs) {
      let best = null, bestD = Infinity;
      for (let m = lo; m <= hi; m++) {
        if (pcOf(m) !== pc) continue;
        let d = Math.abs(m - target);
        if (prevVoicing) { let dm = Infinity; for (const p of prevVoicing) dm = Math.min(dm, Math.abs(m - p)); d = d * 0.4 + dm * 0.6; }
        if (voiced.some((x) => Math.abs(x - m) < 2)) d += 3; // avoid semitone/unison pileups
        if (d < bestD) { bestD = d; best = m; }
      }
      if (best != null) voiced.push(best);
    }
    voiced.sort((a, b) => a - b);
    // low-register spacing: widen if the bottom pair is a 2nd/3rd below ~C3
    if (voiced.length >= 2 && voiced[0] < 52 && voiced[1] - voiced[0] < 4 && voiced[1] + 12 <= hi) voiced[0] = Math.max(lo, voiced[1] - 7);
    if (habit === 'tenthSpread' && voiced.length >= 2 && voiced[voiced.length - 1] + 12 <= hi) voiced[voiced.length - 1] += 12;
    return voiced;
  }

  // ---- Rhythm ---------------------------------------------------------------------
  // Timeline patterns (per-bar onset lists in quarter beats) for the site's
  // Timeline-type invented parameter. Clave/bell per wiki/west-african-rhythm &
  // percussion-music; Euclid via rng lib; sieve via generators.
  function timelinePattern(vector, rng) {
    const bb = vector.meter.barBeats, sub = 0.5;
    const steps = Math.max(4, Math.round(bb / sub));
    const type = vector.timeline;
    if (type === 'none') return null;
    if (type === 'clave') {
      // son clave 3-2 mapped onto the bar (16-step home; scaled otherwise)
      const c16 = [0, 3, 6, 10, 12];
      return c16.map((s) => s * (steps / 16) * sub).filter((b) => b < bb);
    }
    if (type === 'bell') {
      const b12 = [0, 2, 4, 5, 7, 9, 11]; // standard bell (12-pulse)
      return b12.map((s) => s * (steps / 12) * sub).filter((b) => b < bb);
    }
    if (type === 'euclid') {
      const k = clamp(3 + Math.round(vector.density * 3), 2, steps - 1);
      const pat = rngLib.euclid(k, steps, rng.int(0, steps - 1));
      return rngLib.onsets(pat).map((s) => s * sub);
    }
    if (type === 'sieve') {
      const sv = generators.randomSieve(rng, { terms: 2 });
      return generators.take(sv, steps).map((s) => s * sub);
    }
    // pulse
    return Array.from({ length: Math.round(bb) }, (_, i) => i);
  }

  // A melodic rhythm for one bar: onset [beat, durBeats] pairs on the meter's
  // grid, density-driven, with the aksak/compound grouping respected.
  function barRhythm(meter, density, rng, opts) {
    opts = opts || {};
    const bb = meter.barBeats;
    const groups = meter.aksak ? meter.aksak.map((g) => g * 0.5) : null; // eighth-groups -> quarters
    const out = [];
    if (groups) {
      let t = 0;
      for (const g of groups) {
        out.push([t, rng.bool(0.3 + density * 0.4) && g > 0.5 ? g / 2 : g]);
        if (out[out.length - 1][1] < g) out.push([t + g / 2, g / 2]);
        t += g;
      }
      return out;
    }
    const base = meter.compound ? 1.5 : 1; // compound: dotted-quarter pulse
    const sub = meter.compound ? 0.5 : 0.5;
    for (let t = 0; t < bb - 1e-6; t += base) {
      const r = rng.next();
      const isLast = t + base >= bb - 1e-6;
      if (meter.compound) {
        if (r < 0.25 + density * 0.2 && !opts.sparse) { out.push([t, 0.5], [t + 0.5, 0.5], [t + 1, 0.5]); }
        else if (r < 0.6) { out.push([t, 1], [t + 1, 0.5]); }
        else out.push([t, 1.5]);
      } else {
        if (density > 0.6 && r < density - 0.25 && !isLast) { out.push([t, sub], [t + sub, sub]); }
        else if (r < 0.82 || isLast) out.push([t, base]);
        else if (t + 2 * base <= bb) { out.push([t, base * 2]); t += base; }
        else out.push([t, base]);
      }
    }
    return out;
  }

  // Signature-rule helpers (style-vector schema §4: invented styles carry 2-3
  // audible fingerprints, "taught inside the piece"). Realized here so EVERY
  // strategy inherits them: a rhythm-motto signature becomes the melodic motif;
  // an interval-cell signature biases melodic pitch choice; a voicing habit
  // reshapes comp voicings; an echo tail is added by the performer.
  function sigOf(vector, type) {
    if (!vector || !vector.signatures || !(vector.sigEmph > 0.05)) return null;
    for (const s of vector.signatures) if (s.type === type) return s;
    return null;
  }
  function mottoToMotif(motto, meter) {
    // map a 1/0 motto onto the bar's eighth grid; merge rests into the
    // previous onset's duration so the bar stays filled
    const bb = meter.barBeats;
    const stepLen = bb / motto.length;
    const out = [];
    for (let i = 0; i < motto.length; i++) {
      if (motto[i]) out.push([i * stepLen, stepLen]);
      else if (out.length) out[out.length - 1][1] += stepLen;
    }
    return out.length ? out : [[0, bb]];
  }

  // A whole phrase's melodic onsets with motivic repetition: bar 1's rhythm is
  // the MOTIF; bar 2 repeats it; later bars vary it (density/variation-driven),
  // and the final bar lengthens into the cadence (phrase-final lengthening,
  // wiki/phrase-structure.md).
  function phraseRhythm(meter, bars, density, variation, rng, motif) {
    const bb = meter.barBeats;
    const m = motif || barRhythm(meter, density, rng);
    const out = [];
    for (let bar = 0; bar < bars; bar++) {
      const at = bar * bb;
      if (bar === bars - 1) {
        // cadence bar: land early and hold (a real phrase ending + breath)
        const holdBeats = Math.max(1, bb - 1);
        out.push([at, Math.min(bb, holdBeats)]);
        break;
      }
      const varyThis = bar > 1 && rng.bool(0.25 + variation * 0.55);
      const rhythm = varyThis ? barRhythm(meter, density, rng) : m;
      for (const [b, d] of rhythm) out.push([at + b, d]);
    }
    return { onsets: out, motif: m };
  }

  // ---- Melody (contour-first fill; generalized from tonal-phrase.js) --------------
  const CONTOUR_ARCHETYPES = [
    { id: 'arch', apexT: 0.45, shape: 'arch', startOffset: -1, weight: 3 },
    { id: 'arch-late', apexT: 0.72, shape: 'arch', startOffset: -3, weight: 2 },
    { id: 'descending', apexT: 0.02, shape: 'ramp', startOffset: -2, weight: 3 },
    { id: 'ascending', apexT: 0.9, shape: 'ramp', startOffset: -5, weight: 2 },
    { id: 'wave', apexT: 0.6, shape: 'wave', startOffset: -1, weight: 2 },
  ];
  function pickContour(rng, avoidId) {
    const items = [], weights = [];
    for (const a of CONTOUR_ARCHETYPES) { items.push(a); weights.push(a.id === avoidId ? a.weight * 0.05 : a.weight); }
    return rng.weighted(items, weights);
  }

  function scalePool(vector, register) {
    const tonicMidi = 24 + vector.tonicPc;
    const pool = theory.scale(tonicMidi, vector.scale, { octaves: 7 })
      .filter((m) => m >= register[0] && m <= register[1]);
    return pool.length ? pool : [register[0], register[1]];
  }
  function nearestInPool(pool, target, allowedPcs) {
    let best = null, bestD = Infinity;
    for (const m of pool) {
      if (allowedPcs && !allowedPcs.has(pcOf(m))) continue;
      const d = Math.abs(m - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  /**
   * melodyPhrase — one phrase of lead melody over `chords`.
   * opts: { bars, register, contour?, motif? (rhythm), cadence: 'PAC'|'HC'|'none',
   *         centerOffset?, signatures?, sigEmph?, densityScale? }
   * Returns { notes (unit-relative beats, voice left to caller), motif, contour }.
   */
  function melodyPhrase(vector, chords, rng, opts) {
    opts = opts || {};
    const meter = vector.meter;
    const bars = opts.bars || 4;
    const register = opts.register || [60, 84];
    const density = clamp(vector.density * (opts.densityScale == null ? 1 : opts.densityScale), 0.1, 1);
    // rhythm-motto signature: the invented style's motto IS the melodic motif
    const motto = sigOf(vector, 'rhythmMotto');
    const sigMotif = motto && !opts.motif ? mottoToMotif(motto.motto, meter) : null;
    const { onsets, motif } = phraseRhythm(meter, bars, density, vector.variation, rng, opts.motif || sigMotif);
    let pool = scalePool(vector, register);
    // opts.gamutPcs (invented styles): restrict the melodic pool to the style's
    // gamut — the invented mode-within-the-scale. Opt-in; harmony keeps the
    // full scale. Falls back to the full pool if the register window is too
    // tight for the gamut alone.
    if (opts.gamutPcs) {
      const g = pool.filter((m) => opts.gamutPcs.has(pcOf(m)));
      if (g.length >= 4) pool = g;
    }
    if (!onsets.length || pool.length < 3) return { notes: [], motif, contour: null };

    const arche = opts.contour || pickContour(rng);
    const n = onsets.length;
    const center = (register[0] + register[1]) / 2 + (opts.centerOffset || 0);
    const firstChord = chordAt(chords, onsets[0][0]);
    const chordPcs = (c) => new Set(c.notes.map(pcOf));
    const startMidi = nearestInPool(pool, center + arche.startOffset, chordPcs(firstChord)) || pool[Math.floor(pool.length / 2)];

    // apex: unique peak, chord tone, clearly above the start
    const apexSlot = clamp(Math.round(arche.apexT * (n - 1)), 0, n - 1);
    const apexChord = chordAt(chords, onsets[apexSlot][0]);
    const apexFloor = Math.max(center + 2, startMidi + 2);
    const apexTargets = pool.filter((m) => m >= apexFloor && m <= pool[pool.length - 1] - 1 && chordPcs(apexChord).has(pcOf(m)));
    const apexMidi = apexTargets.length ? rng.pick(apexTargets) : pool[pool.length - 2];

    // final goal tone by cadence (PAC -> do; HC -> re/sol; none -> nearest chord tone)
    const tonicPc = vector.tonicPc;
    const lastChord = chordAt(chords, onsets[n - 1][0]);
    let finalMidi;
    if (opts.cadence === 'PAC') finalMidi = nearestInPool(pool, center - 5, new Set([tonicPc]));
    else if (opts.cadence === 'HC') {
      const hs = harmonicScale(vector.scale);
      const deg = rng.bool(0.6) ? 2 : 5;
      const pc = pcOf(theory.scaleDegree(24 + tonicPc, hs, deg));
      finalMidi = nearestInPool(pool, center - 2, new Set([pc]));
    } else finalMidi = nearestInPool(pool, center - 2, chordPcs(lastChord));
    if (finalMidi == null) finalMidi = startMidi;

    // signature interval cell: bias a mid-phrase slot onto the cell (invented styles)
    const pins = { 0: startMidi };
    pins[apexSlot] = Math.max(apexMidi, startMidi + 1);
    pins[n - 1] = finalMidi;
    // contour envelope across all slots
    const contour = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      let v;
      if (t <= arche.apexT || arche.apexT >= 0.99) {
        const tt = arche.apexT <= 0 ? 1 : Math.min(1, t / arche.apexT);
        v = startMidi + (pins[apexSlot] - startMidi) * tt;
        if (arche.shape === 'wave' && tt > 0 && tt < 1) v -= Math.sin(tt * Math.PI) * (pins[apexSlot] - startMidi) * 0.3;
      } else {
        const tt = (t - arche.apexT) / (1 - arche.apexT);
        v = pins[apexSlot] + (finalMidi - pins[apexSlot]) * tt;
      }
      contour[i] = v;
    }

    // fill (the tested constraint set: chord tones on strong beats, step bias,
    // post-leap reversal, regression to the mean, stepwise cadential approach)
    const ceiling = pins[apexSlot];
    const out = new Array(n);
    let prev = null, prevMove = 0;
    const strongSet = new Set((meter.accents || []).concat(meter.strong || []));
    for (let i = 0; i < n; i++) {
      if (i in pins) { const m = pins[i]; if (prev != null) prevMove = m - prev; out[i] = m; prev = m; continue; }
      const beat = onsets[i][0];
      const inBar = ((beat % meter.barBeats) + meter.barBeats) % meter.barBeats;
      const strong = strongSet.has(inBar) || Math.abs(inBar - Math.round(inBar)) < 1e-6 && strongSet.size === 0;
      const cPcs = chordPcs(chordAt(chords, beat));
      // interval-cell signature: pitch classes of the cell built on the tonic
      // get a scoring bonus scaled by signature emphasis
      const cellSig = sigOf(vector, 'intervalCell');
      const cellPcs = cellSig ? new Set(cellSig.cell.map((iv) => pcOf(vector.tonicPc + iv))) : null;
      const cands = [], weights = [];
      for (const c of pool) {
        if (c > ceiling) continue;
        if (prev != null && Math.abs(c - prev) > 12) continue;
        let score = -Math.abs(c - contour[i]) * 0.6;
        const isCT = cPcs.has(pcOf(c));
        if (strong) score += isCT ? 1.4 : -1.2; else score += isCT ? 0.3 : 0;
        if (cellPcs && cellPcs.has(pcOf(c))) score += 0.9 * (vector.sigEmph == null ? 0.5 : vector.sigEmph);
        // opts.pillarPcs (invented styles): the hierarchy pillars get a mild
        // standing bonus so the style's structural tones are frequent — the
        // teach-the-hierarchy-by-distribution move (Castellano; style-invention).
        if (opts.pillarPcs && opts.pillarPcs.has(pcOf(c))) score += 0.45;
        if (prev != null) {
          const move = c - prev, step = Math.abs(move);
          if (step === 0) score -= 1.5;
          else if (step <= 2) score += 1.0;
          else if (step <= 4) score += 0.1;
          else score -= 0.6 * (step - 4);
          if (Math.abs(prevMove) > 4 && Math.sign(move) === -Math.sign(prevMove) && step <= 2) score += 1.3;
          const lo = pool[0], hi = pool[pool.length - 1], rel = (prev - lo) / ((hi - lo) || 1);
          if (rel > 0.8 && move < 0) score += 0.8;
          if (rel < 0.2 && move > 0) score += 0.8;
        }
        if ((i + 1) in pins) {
          const gap = Math.abs(c - pins[i + 1]);
          if (gap >= 1 && gap <= 2) score += 1.1; else if (gap === 0) score -= 0.5;
        }
        cands.push(c); weights.push(Math.exp(score));
      }
      const chosen = cands.length ? rng.weighted(cands, weights) : (nearestInPool(pool, contour[i]) || prev || pool[0]);
      if (prev != null) prevMove = chosen - prev;
      prev = chosen; out[i] = chosen;
    }

    const notes = onsets.map(([b, d], i) => ({
      beat: b, durBeats: d, midi: out[i],
      tags: (i === apexSlot ? ['apex'] : []).concat(i === n - 1 && opts.cadence && opts.cadence !== 'none' ? ['cadence:' + opts.cadence] : []),
      weight: i === apexSlot ? 1 : i === n - 1 ? 0.8 : 0.45 + 0.3 * Math.sin(Math.PI * (i / Math.max(1, n - 1))),
    }));
    return { notes, motif, contour: arche };
  }

  // ---- Accompaniment (comping + bass; the session-025 varied-comp work) -----------
  const COMP_STYLES = ['broken', 'boomchick', 'stabs', 'arp', 'pad'];
  /**
   * compBar — accompaniment over ONE CHORD SLOT in `template` style. The slot
   * may be shorter than a bar (fast harmonic rhythm) or several bars long
   * (slow); the pattern is scaled to a short slot and TILED bar-by-bar across
   * a long one, so the texture never overruns or under-fills its chord.
   * Returns notes (unit-relative beats offset by `atBeat`).
   */
  function compBar(vector, chord, atBeat, voicing, template, rng) {
    const meterBar = vector.meter.barBeats;
    const span = chord && chord.durBeats ? chord.durBeats : meterBar;
    const notes = [];
    if (template === 'pad' || vector.free) {
      for (const m of voicing) notes.push({ beat: atBeat, durBeats: span, midi: m, vel: 0.8 });
      return notes;
    }
    for (let off = 0; off < span - 1e-6; off += meterBar) {
      const bb = Math.min(meterBar, span - off);
      const push = (b, d, m, vel) => { if (b < bb - 1e-6) notes.push({ beat: atBeat + off + b, durBeats: Math.min(d, bb - b + 0.2), midi: m, vel }); };
      if (template === 'broken') {
        const order = [0, 2, 1, 2].map((i) => voicing[Math.min(i, voicing.length - 1)]);
        const step = bb / order.length;
        order.forEach((m, i) => push(i * step, step * 1.1, m, i === 0 ? 0.9 : 0.7));
      } else if (template === 'boomchick') {
        push(0, 1, voicing[0], 0.95);
        for (let b = 1; b < bb; b += 1) for (const m of voicing.slice(1)) push(b, 0.8, m, 0.6);
      } else if (template === 'stabs') {
        const hits = bb >= 4 ? [1.5, 3.5] : [bb * 0.4, bb * 0.8];
        push(0, 0.9, voicing[0], 0.7);
        for (const h of hits) { for (const m of voicing) push(h, 0.6, m, 0.65); }
      } else { // arp
        const seq = voicing.concat(voicing.slice(1, -1).reverse());
        const step = Math.max(0.5, bb / Math.max(4, seq.length));
        let i = 0;
        for (let b = 0; b < bb - 1e-6 && i < 12; b += step, i++) push(b, step * 1.2, seq[i % seq.length], 0.62 + 0.12 * (i === 0));
      }
    }
    return notes;
  }

  /** bassBar — bass over ONE CHORD SLOT: root/fifth, octaves, approach tones.
   * Tiles bar-by-bar across long slots, scales into short ones (like compBar). */
  function bassBar(vector, chord, nextChord, atBeat, register, rng, opts) {
    opts = opts || {};
    const meterBar = vector.meter.barBeats;
    const span = chord && chord.durBeats ? chord.durBeats : meterBar;
    const rootPc = chord.bassPc;
    const root = nearestBassNote(rootPc, register);
    const fifth = nearestBassNote(pcOf(chord.notes[2] != null ? chord.notes[2] : chord.notes[0] + 7), register);
    const notes = [];
    if (vector.free || opts.sustain) { notes.push({ beat: atBeat, durBeats: span, midi: root, vel: 0.85 }); return notes; }
    for (let off = 0; off < span - 1e-6; off += meterBar) {
      const bb = Math.min(meterBar, span - off);
      const lastTile = off + meterBar >= span - 1e-6;
      const push = (b, d, m, vel) => { if (b < bb - 1e-6) notes.push({ beat: atBeat + off + b, durBeats: Math.min(d, bb - b + 0.1), midi: m, vel: vel || 0.85 }); };
      if (opts.walking) {
        // simple walking: root, chord tone, scale step, approach to next root
        const nextRoot = nearestBassNote(nextChord ? nextChord.bassPc : rootPc, register);
        const third = nearestBassNote(pcOf(chord.notes[1]), register);
        const steps = Math.round(bb);
        const line = [root, third, fifth, nextRoot + (nextRoot > fifth ? -1 : 1)];
        for (let i = 0; i < steps; i++) push(i, 0.95, line[Math.min(i, line.length - 1)], 0.8 + 0.1 * (i === 0));
        continue;
      }
      const styleRoll = rng.next();
      if (styleRoll < 0.4) { push(0, bb >= 3 ? 2 : bb, root); if (bb >= 3) push(2, bb - 2, rng.bool(0.5) ? fifth : root); }
      else if (styleRoll < 0.7) { push(0, Math.min(1.5, bb), root); push(Math.min(1.5, bb * 0.6), 1, root); if (bb >= 4) push(2.5, bb - 2.5, fifth); }
      else { push(0, bb - 0.5, root); if (nextChord && lastTile && rng.bool(0.6)) push(bb - 0.5, 0.5, nearestBassNote(nextChord.bassPc, register) + (rng.bool(0.5) ? 1 : -1), 0.6); }
    }
    return notes;
  }
  function nearestBassNote(pc, register) {
    const center = (register[0] + register[1]) / 2;
    let best = register[0], bestD = Infinity;
    for (let m = register[0]; m <= register[1]; m++) {
      if (pcOf(m) !== pc) continue;
      const d = Math.abs(m - center);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  // ---- Section planning helper ------------------------------------------------------
  // Shared by strategies: turn vector.lengthSec into a bar count snapped to the
  // strategy's grid, and lay an intensity value per section from the arc.
  function barsForLength(vector, snapBars) {
    const spb = 60 / vector.bpm;
    const barSec = vector.meter.barBeats * spb;
    const bars = Math.round((vector.lengthSec || 150) / barSec);
    const snapped = Math.max(snapBars, Math.round(bars / snapBars) * snapBars);
    return snapped;
  }
  function sectionIntensities(sections, arc) {
    const total = sections.reduce((a, s) => a + s.bars, 0);
    let at = 0;
    for (const s of sections) {
      const mid = (at + s.bars / 2) / total;
      s.intensity = clamp(0.25 + 0.75 * generators.arcValue(arc, mid), 0.05, 1);
      at += s.bars;
    }
    return sections;
  }

  // ---- The incremental composer wrapper ----------------------------------------------
  /**
   * create(vector, seedInt) -> composer. The conductor calls
   * composer.nextUnit(currentVector) repeatedly; each call composes the next
   * unit deterministically from stream `unit:<n>`. replan(vector) rebuilds the
   * remaining plan from the current bar (re-plan-speed live changes).
   */
  function create(vector, seedInt) {
    const root = new rngLib.Rng(seedInt >>> 0);
    const registry = getRegistry();
    let strategy = resolveStrategy(registry, vector);
    let plan = strategy.init(vector, root.stream('plan'));
    let planBaseBar = 0; // absolute bar where the current plan's bar 0 sits
    let replanCount = 0;
    const pos = { unitIdx: 0, bar: 0, done: false };

    function sectionAt(bar) {
      const rel = bar - planBaseBar;
      let at = 0, idx = 0;
      const secs = plan.sections || [{ role: 'A', bars: 1e9, intensity: 0.6 }];
      for (let i = 0; i < secs.length; i++) {
        if (rel < at + secs[i].bars) { idx = i; break; }
        at += secs[i].bars;
        idx = i;
      }
      const sec = secs[Math.min(idx, secs.length - 1)];
      let secStart = 0;
      for (let i = 0; i < idx; i++) secStart += secs[i].bars;
      return { section: sec, sectionIdx: idx, barInSection: rel - secStart, totalBars: plan.totalBars };
    }

    return {
      get plan() { return plan; },
      get pos() { return pos; },
      get done() { return pos.done; },
      strategyId: vector.strategy,
      nextUnit(v) {
        if (pos.done) return null;
        const info = sectionAt(pos.bar);
        const p = {
          unitIdx: pos.unitIdx, bar: pos.bar, barInPlan: pos.bar - planBaseBar,
          section: info.section, sectionIdx: info.sectionIdx, barInSection: info.barInSection,
          totalBars: plan.totalBars,
          tPiece: clamp((pos.bar - planBaseBar) / Math.max(1, plan.totalBars), 0, 1),
          arcLevel: clamp(0.25 + 0.75 * generators.arcValue(v.arc, clamp((pos.bar - planBaseBar + 0.5) / Math.max(1, plan.totalBars), 0, 1)), 0.05, 1),
        };
        const unitRng = root.stream('unit:' + replanCount + ':' + pos.unitIdx);
        const unit = strategy.nextUnit(plan, v, p, unitRng);
        if (!unit) { pos.done = true; return null; }
        unit.bar = pos.bar; unit.unitIdx = pos.unitIdx;
        unit.bars = unit.bars || Math.max(1, Math.round(unit.lengthBeats / v.meter.barBeats));
        pos.bar += unit.bars;
        pos.unitIdx += 1;
        if (unit.last) pos.done = true;
        return unit;
      },
      /** Re-plan-from-here (live form/genre-scale change), keeping the position. */
      replan(v) {
        replanCount += 1;
        strategy = resolveStrategy(registry, v);
        const spb = 60 / v.bpm, barSec = v.meter.barBeats * spb;
        const remainVector = Object.assign({}, v);
        // aim the remaining piece at what's left of the target length; at least
        // a plausible closing span so the ending idiom fits
        const playedSec = pos.bar * barSec; // approximation: current meter/tempo
        remainVector.lengthSec = Math.max(barSec * 8, (v.lengthSec || 150) - playedSec);
        plan = strategy.init(remainVector, root.stream('plan:r' + replanCount));
        planBaseBar = pos.bar;
        pos.done = false;
      },
    };
  }
  // The dedicated invented-style composer (docs/lib/invent.js) registers here.
  // It is NOT a genre pack: pack order doubles as the URL genre enum and the
  // Start-button list, so the invented strategy plugs in beside the registry.
  let inventedStrategy = null;
  function resolveStrategy(registry, vector) {
    if (vector.strategy === 'invented' && inventedStrategy) return inventedStrategy;
    const pack = registry && registry.get(vector.strategy);
    if (pack && pack.strategy) return pack.strategy;
    const first = registry && registry.list()[0];
    if (first && first.strategy) return first.strategy;
    throw new Error('compose.create: no strategy registered for "' + vector.strategy + '"');
  }

  return {
    // harmony
    chordTable, progression, chordAt, harmonicScale, MODAL_POOLS, LOOP_BANKS,
    // voicing & accompaniment
    voiceChord, compBar, bassBar, COMP_STYLES, nearestBassNote,
    // rhythm
    timelinePattern, barRhythm, phraseRhythm,
    // melody
    melodyPhrase, pickContour, CONTOUR_ARCHETYPES, scalePool, nearestInPool,
    // planning
    barsForLength, sectionIntensities,
    // the wrapper
    create,
    _setRegistry(fn) { getRegistry = fn; },
    _setInvented(strategy) { inventedStrategy = strategy; },
    _getInvented() { return inventedStrategy; },
  };
});
