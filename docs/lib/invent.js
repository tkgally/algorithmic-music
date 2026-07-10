/*
 * invent — the dedicated invented-style composer: one realizer that performs
 * any style KERNEL drawn by style.js's invent().
 *
 * Until session 038, an invented style was routed to whichever of the eight
 * GENRE strategies best fit its drawn fields — it borrowed an engine, so only
 * the roles that engine knew were voiced (percussion stayed silent on
 * non-groove routings) and every invention was, at bottom, one of eight
 * hand-written idioms. This module replaces that: the kernel is a freshly
 * generated generative SYSTEM per seed — a texture architecture, a rhythm
 * system, a melodic gamut with hierarchy pillars, a form grammar — and this
 * one strategy realizes whichever kernel was drawn, voicing the WHOLE drawn
 * ensemble, percussion included.
 *
 * Design basis (wiki):
 *   - style-invention-and-style-space.md — derive all layers from a few germs;
 *     novelty on 1-3 axes over universals; teach the style inside the piece
 *     (front-load and repeat its defining statistics); signatures stated early.
 *   - texture-and-density.md — the texture architectures (melody+accompaniment,
 *     ostinato web, call-and-response, stratification, canon, hocket,
 *     homorhythm/chorale) and the density couplings.
 *   - minimalism-and-process-music.md — the tintinnabuli two-voice rule
 *     (M-voice stepwise; T-voice locked to tonic-triad tones by position).
 *   - meta-composition-and-style-machines.md — Schillinger resultants as the
 *     shared rhythmic cell; a functional form grammar over section kinds.
 *   - form-and-structure.md — repetition-with-return is non-negotiable; a late
 *     peak with a shorter resolution; audible sectional contrast.
 *   - percussion-music.md / west-african-rhythm.md — timeline + low anchor +
 *     interlocking mids + lead; intensity-arc-gated layering.
 *   - generative-music-failure-modes.md — every writer here answers one:
 *     phrase-first melody (FM1), cadence-goal harmony (FM2), a committed theme
 *     with literal-enough returns (FM3), a form grammar with peak and real
 *     endings (FM4), arc-gated density (FM7), texture commitment (FM11).
 *
 * The strategy implements the standard contract (init/nextUnit) and registers
 * itself with compose via _setInvented — it is deliberately NOT a genre pack
 * (pack order doubles as the URL genre enum and the Start-button list).
 * Deterministic: all randomness from the caller-supplied streams. Original
 * first-party code (CC0). Dual-format (UMD-lite): window.AM.invent in the
 * browser, require() in Node for headless tests.
 */
;(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    const deps = {
      rng: require('./rng.js'), theory: require('./theory.js'),
      generators: require('./generators.js'), style: require('./style.js'),
      compose: require('./compose.js'),
    };
    module.exports = factory(deps);
    deps.compose._setInvented(module.exports.strategy);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.invent = factory({ rng: AM.rng, theory: AM.theory, generators: AM.generators, style: AM.style, compose: AM.compose });
    AM.compose._setInvented(AM.invent.strategy);
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { rng: rngLib, theory, generators, style, compose } = deps;
  const PHRASE = 4; // bars per unit in main sections (intro/end sections are shorter)

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pcOf(m) { return ((Math.round(m) % 12) + 12) % 12; }

  // ---- role classification ---------------------------------------------------
  // Whatever the ensemble holds (templates, palettes, Advanced checkboxes), every
  // entry maps to a writer: lead / mids (harmonic + color) / low / percussion.
  const PERC_ROLES = { kick: 1, snare: 1, hat: 1, perc1: 1, perc2: 1, timeline: 1, boom: 1, shaker: 1, gong: 1, high: 1, anchor: 1, ride: 1, brush: 1 };
  function classify(ens) {
    const r = { lead: null, mid1: null, mid2: null, low: null, percs: [], extraMids: [] };
    const pitched = [];
    for (const e of ens) {
      if (PERC_ROLES[e.role]) { r.percs.push(e); continue; }
      pitched.push(e);
    }
    for (const e of pitched) {
      if (!r.lead && e.role === 'lead') { r.lead = e; continue; }
      if (!r.low && (e.role === 'bass' || e.role === 'drone')) { r.low = e; continue; }
      if (!r.mid1 && (e.role === 'comp' || e.role === 'pad')) { r.mid1 = e; continue; }
      if (!r.mid2 && (e.role === 'counter' || e.role === 'tex')) { r.mid2 = e; continue; }
      r.extraMids.push(e);
    }
    // graceful degradation: promote whatever exists so nothing drawn is silent
    if (!r.lead && (r.mid2 || r.mid1 || r.extraMids.length)) { r.lead = r.mid2 || r.mid1 || r.extraMids.shift(); if (r.lead === r.mid2) r.mid2 = null; if (r.lead === r.mid1) r.mid1 = null; }
    if (!r.mid1 && r.extraMids.length) r.mid1 = r.extraMids.shift();
    if (!r.mid2 && r.extraMids.length) r.mid2 = r.extraMids.shift();
    r.droneLike = r.low && r.low.role === 'drone';
    return r;
  }
  // per-texture percussion quietness: scales VELOCITY (never existence), so a
  // quiet architecture keeps its drawn percussion audible but discreet
  const PERC_QUIET = { melodyAccomp: 1, ostinatoWeb: 1, callResponse: 1, strata: 0.9, canon: 0.6, hocket: 1, chorale: 0.35, tintinnabuli: 0.25 };

  // ---- kernel access ----------------------------------------------------------
  // Defensive default so a vector that somehow lacks a kernel (never in normal
  // flow) still composes rather than crashing the site.
  function kernelOf(vector) {
    return vector.kernel || {
      texture: 'melodyAccomp', rhythmMode: 'flow', cell: { a: 3, b: 2 },
      gamut: [0, 1, 2, 3, 4, 5, 6], pillars: [0, 4], entry: 'together',
      canon: null, strata: null, tin: null, respGap: 2, midCycle: 2, endTogether: false,
    };
  }
  function degreePcs(vector) {
    const pat = theory.SCALES[vector.scale] || theory.SCALES.major;
    const out = []; let acc = 0;
    for (let i = 0; i < pat.length; i++) { out.push(pcOf(vector.tonicPc + acc)); acc += pat[i]; }
    return out;
  }
  function gamutPcs(vector, K) {
    const degs = degreePcs(vector);
    const s = new Set();
    for (const d of K.gamut) if (d < degs.length) s.add(degs[d]);
    s.add(pcOf(vector.tonicPc));
    return s;
  }
  function pillarPcs(vector, K) {
    const degs = degreePcs(vector);
    const s = new Set();
    for (const d of K.pillars) if (d < degs.length) s.add(degs[d]);
    return s;
  }
  // tonic-triad pitch classes (for the tintinnabuli T-voice and ring-out colors)
  function triadPcs(vector) {
    const hs = compose.harmonicScale(vector.scale);
    const degs = (function () { const pat = theory.SCALES[hs]; const out = []; let acc = 0; for (let i = 0; i < pat.length; i++) { out.push(pcOf(vector.tonicPc + acc)); acc += pat[i]; } return out; })();
    return [degs[0], degs[2 % degs.length], degs[4 % degs.length]];
  }

  // ---- form grammar -----------------------------------------------------------
  // Sections as FUNCTIONS (state / return / depart / break / peak / end), not a
  // fixed per-genre list: the development value picks the grammar flavor, the
  // grammar guarantees at least one recognizable return and one late peak, and
  // the arc supplies intensities (overridden by function).
  function buildSections(vector, K, rng, totalTarget) {
    const introBars = K.entry === 'together' ? 0 : K.entry === 'leadFirst' ? 2 : 4;
    const endBars = vector.ending === 'fade' ? 4 : 2;
    const middle = Math.max(2 * PHRASE + PHRASE, totalTarget - introBars - endBars);
    const form = vector.development < 0.35 ? 'cyclic' : vector.development < 0.7 ? 'arch' : 'through';
    // descriptor list; each main block is nominally 2 phrases (8 bars)
    const B = 2 * PHRASE;
    let seq;
    if (form === 'cyclic') {
      seq = [
        { role: 'A', kind: 'state', bars: B },
        { role: 'A′', kind: 'return', bars: B },
        { role: 'break', kind: 'break', bars: PHRASE },
        { role: 'A″', kind: 'peak', bars: B },
      ];
    } else if (form === 'arch') {
      seq = [
        { role: 'A', kind: 'state', bars: B },
        { role: 'B', kind: 'depart', bars: B },
        { role: 'A′', kind: 'return', bars: B },
        { role: 'break', kind: 'break', bars: PHRASE },
        { role: 'peak', kind: 'peak', bars: B },
      ];
    } else {
      seq = [
        { role: 'A', kind: 'state', bars: B },
        { role: 'B', kind: 'depart', bars: B },
        { role: 'C', kind: 'depart2', bars: B },
        { role: 'peak', kind: 'peak', bars: B },
        { role: 'A′', kind: 'return', bars: B },
      ];
    }
    // quiet architectures skip the hard break (a sudden thin bar reads wrong there)
    if (K.texture === 'chorale' || K.texture === 'tintinnabuli') seq = seq.filter((s) => s.kind !== 'break');
    // fit to the target: grow sections by whole phrases round-robin up to a
    // cap, and past the cap EXTEND THE FORM — another departure-return cycle
    // before the peak — so long pieces get more journeys, not longer rooms
    // (repetition-with-return, not an endless middle).
    const CAP = 4 * PHRASE;
    const growable = seq.filter((s) => s.kind !== 'break');
    let sum = seq.reduce((a, s) => a + s.bars, 0);
    let gi = 0, guard = 0, cycleN = 2;
    while (sum < middle && guard++ < 400) {
      const open = growable.filter((s) => s.bars < CAP);
      if (open.length) { const s = open[gi % open.length]; s.bars += PHRASE; sum += PHRASE; gi++; continue; }
      const at = seq.findIndex((x) => x.kind === 'peak');
      const dep = { role: 'B' + cycleN, kind: 'depart', bars: B };
      const ret = { role: 'A' + cycleN + '′', kind: 'return', bars: B };
      cycleN++;
      if (at < 0) seq.push(dep, ret); else seq.splice(at, 0, dep, ret);
      growable.push(dep, ret);
      sum += dep.bars + ret.bars;
    }
    guard = 0;
    while (sum > middle && guard++ < 200) {
      const brk = seq.find((s) => s.kind === 'break');
      if (brk && sum - middle >= brk.bars) { seq.splice(seq.indexOf(brk), 1); sum -= brk.bars; continue; }
      let big = growable[0];
      for (const s of growable) if (s.bars > big.bars) big = s;
      if (big.bars <= PHRASE) break;
      big.bars -= PHRASE; sum -= PHRASE;
    }
    const sections = [];
    if (introBars) sections.push({ role: 'intro', kind: 'intro', bars: introBars });
    for (const s of seq) sections.push(s);
    sections.push({ role: 'end', kind: 'end', bars: endBars });
    compose.sectionIntensities(sections, vector.arc);
    for (const s of sections) {
      if (s.kind === 'peak') s.intensity = Math.max(s.intensity, 0.92);
      else if (s.kind === 'break') s.intensity = Math.min(s.intensity, 0.2);
      else if (s.kind === 'intro') s.intensity = Math.min(s.intensity, 0.5);
      else if (s.kind === 'end') s.intensity = vector.ending === 'stop' ? Math.max(s.intensity, 0.7) : Math.min(s.intensity, 0.6);
    }
    return sections;
  }

  // quantize a beat to the meter's comfortable grid (eighths)
  function q8(b) { return Math.round(b * 2) / 2; }
  // ---- rhythmic germs ----------------------------------------------------------
  // The Schillinger resultant mapped onto one bar: the style's shared rhythmic
  // cell (motif rhythm, comp stabs, kick accents all derive from it). The raw
  // scaling lands off the subdivision grid for most (a,b) — snap to eighths and
  // dedupe, so the cell's SHAPE survives but sits on the grid the percussion
  // and the performer's swing warp live on (small-integer rhythm categories,
  // wiki/musical-universals.md).
  function cellMotif(vector, K) {
    const bb = vector.meter.barBeats;
    const res = generators.resultant(K.cell.a, K.cell.b);
    const onsets = [];
    for (const t of res.attacks) {
      const q = Math.min(q8(t * bb / res.cycle), bb - 0.5);
      if (!onsets.length || q > onsets[onsets.length - 1] + 1e-6) onsets.push(q);
    }
    return onsets.map((t, i) => [t, (i + 1 < onsets.length ? onsets[i + 1] : bb) - t]);
  }

  // complementary Euclidean pair: the second rotation is chosen to MINIMIZE
  // overlap with the first, so the two hand-percussion parts genuinely
  // interlock (hocket) rather than doubling (west-african-rhythm.md).
  function interlockPair(steps, k1, k2, rng) {
    const p1 = rngLib.euclid(k1, steps, rng.int(0, steps - 1));
    let best = null, bestOverlap = Infinity;
    for (let rot = 0; rot < steps; rot++) {
      const p2 = rngLib.euclid(k2, steps, rot);
      let ov = 0;
      for (let i = 0; i < steps; i++) if (p1[i] && p2[i]) ov++;
      if (ov < bestOverlap) { bestOverlap = ov; best = p2; }
    }
    return { a: rngLib.onsets(p1), b: rngLib.onsets(best || p1) };
  }

  // ---- note emit helpers --------------------------------------------------------
  function mk(notes, L, part, beat, durBeats, midi, vel, extra) {
    if (!part || beat < -1e-9 || beat >= L - 1e-9) return;
    const n = {
      beat, durBeats: Math.max(0.05, durBeats), midi, voice: part.voice, role: part.role,
      vel: clamp(vel * (part.level == null ? 1 : part.level), 0.03, 1),
    };
    if (extra) for (const key of Object.keys(extra)) n[key] = extra[key];
    notes.push(n);
  }
  function nearestOct(midi, register) {
    let m = midi;
    while (m < register[0]) m += 12;
    while (m > register[1]) m -= 12;
    return clamp(m, register[0], register[1]);
  }

  // ================================================================ strategy ====
  const strategy = {
    unitBars: PHRASE,

    // -- init: realize the kernel into the piece's committed identity ---------
    init(vector, rng) {
      const K = kernelOf(vector);
      const meter = vector.meter, bb = meter.barBeats;
      const totalTarget = compose.barsForLength(vector, PHRASE);
      const sections = buildSections(vector, K, rng.stream('form'), totalTarget);
      const totalBars = sections.reduce((a, s) => a + s.bars, 0);

      const tr = rng.stream('theme');
      const theme = {
        contour: compose.pickContour(tr),
        contourB: null,
        motif: null,           // committed at the first stated phrase
      };
      theme.contourB = compose.pickContour(tr, theme.contour.id);

      const cm = cellMotif(vector, K);
      const timeline = compose.timelinePattern(vector, rng.stream('timeline'));

      // percussion identity: kick skeleton, backbeat positions, interlock pair
      const pr = rng.stream('perc');
      const steps = Math.max(4, Math.round(bb / 0.5));
      const BACKBEAT = { '4/4': [1, 3], '2/4': [1], '3/4': [2], '6/8': [1.5] };
      const backbeat = BACKBEAT[meter.id] || (meter.accents || []).slice(1).map((a) => a);
      let kick;
      if (K.rhythmMode === 'groove') {
        kick = bb >= 4 ? [0, 2] : [0];
        if (vector.interlock > 0.35 && bb >= 4) kick = [0, q8(1 + pr.next()), 2.5];
      } else if (K.rhythmMode === 'cell') {
        kick = cm.filter((o, i) => i === 0 || o[1] >= 1).map((o) => o[0]).slice(0, 3);
      } else if (K.rhythmMode === 'timeline' && timeline) {
        kick = [0].concat(timeline.filter((t) => t > 0 && t <= bb / 2).slice(0, 1));
      } else kick = [0];
      const kmid = clamp(Math.round(steps * (0.28 + 0.3 * vector.interlock)), 2, steps - 1);
      const pair = interlockPair(steps, kmid, clamp(kmid - 1, 2, steps - 1), pr);
      const percPat = {
        kick, backbeat,
        e1: pair.a.map((s) => s * 0.5), e2: pair.b.map((s) => s * 0.5),
        hatGrain: vector.density > 0.55 ? 0.5 : 1,
      };

      // ostinato web: a bass ground (one bar) and a mid ostinato whose cycle is
      // a different length, so the two keep re-phasing against each other
      const or = rng.stream('ostinato');
      const groundOnsets = cm.length > 4 ? cm.filter((o, i) => i % 2 === 0) : cm;
      const groundDegs = groundOnsets.map((o, i) => (i === 0 ? 0 : or.weighted([0, K.pillars[1] || 4, 7], [0.45, 0.4, 0.15])));
      const midOst = [];
      {
        const cyc = K.midCycle;
        let deg = K.pillars[1] || 4;
        for (let b = 0; b < cyc; b++) {
          for (const [t] of cm) {
            if (or.bool(0.45)) continue;
            deg = clamp(deg + or.int(-1, 1), 0, Math.max(4, (K.gamut.length - 1)));
            midOst.push({ beat: b * bb + t, dur: 0.5, deg });
          }
        }
        if (!midOst.length) midOst.push({ beat: 0, dur: 0.5, deg });
      }

      // loop harmony: commit the loop once so every section rides the same cycle
      let loop = null;
      if (vector.harmonyType === 'loop') {
        const p = compose.progression(vector, PHRASE, rng.stream('loop'), {});
        loop = p._loop || null;
      }

      const flip = rng.stream('pan').bool() ? 1 : -1;
      return {
        sections, totalBars, K, theme,
        cellMotif: cm, timeline, percPat, groundOnsets, groundDegs, midOst, loop, flip,
        memo: { voicing: null }, compStyle: {},
      };
    },

    // -- nextUnit: one phrase of the kernel, reading the LIVE vector ----------
    nextUnit(plan, vector, pos, rng) {
      if (pos.bar >= plan.totalBars) return null;
      const K = plan.K;
      const meter = vector.meter, bb = meter.barBeats;
      const sec = pos.section;
      const bars = Math.max(1, Math.min(PHRASE, sec.bars - pos.barInSection));
      const L = bars * bb;
      const roles = classify(style.effectiveEnsemble(vector));
      const notes = [];
      const isLastSection = pos.sectionIdx === plan.sections.length - 1;
      let I = clamp(0.5 * (sec.intensity == null ? 0.6 : sec.intensity) + 0.5 * pos.arcLevel, 0.05, 1);
      if (sec.kind === 'peak') I = Math.max(I, 0.9);
      if (sec.kind === 'break') I = Math.min(I, 0.25);

      const ctx = { plan, vector, pos, rng, K, bars, L, bb, roles, notes, I, sec };

      if (sec.kind === 'end') {
        writeEnding(ctx);
        writePercussion(ctx, { ending: true });
        return { notes, lengthBeats: L, bars, section: sec.role, intensity: sec.intensity, last: true };
      }
      if (sec.kind === 'intro') {
        writeIntro(ctx);
        return { notes, lengthBeats: L, bars, section: sec.role, intensity: sec.intensity, last: false };
      }
      if (sec.kind === 'break') {
        writeBreak(ctx);
        return { notes, lengthBeats: L, bars, section: sec.role, intensity: sec.intensity, last: false };
      }

      // ---- main sections: harmony spine, then the kernel's texture writer ----
      const phraseInSection = Math.floor(pos.barInSection / PHRASE);
      const isAnte = phraseInSection % 2 === 0;
      const chords = spine(ctx, isAnte);
      const W = WRITERS[K.texture] || WRITERS.melodyAccomp;
      W(ctx, chords, isAnte);
      writePercussion(ctx, {});
      const last = isLastSection && pos.barInSection + bars >= sec.bars;
      return { notes, lengthBeats: L, bars, section: sec.role, intensity: sec.intensity, last };
    },
  };

  // ---- harmony spine -------------------------------------------------------------
  // One progression per phrase with real goals: functional harmony gets
  // antecedent/consequent cadences (HC then PAC); departures open off-tonic;
  // modal/loop/drone keep their own arrival logic inside compose.progression.
  function spine(ctx, isAnte) {
    const { vector, plan, bars, rng, sec } = ctx;
    const opts = {};
    if (vector.harmonyType === 'functional') {
      opts.cadence = isAnte && bars >= PHRASE ? 'HC' : 'PAC';
      if (sec.kind === 'depart' || sec.kind === 'depart2') {
        opts.openRoman = compose.harmonicScale(vector.scale) === 'major' ? rng.pick(['vi', 'IV']) : rng.pick(['VI', 'iv']);
      }
    } else opts.cadence = 'none';
    if (vector.harmonyType === 'loop' && plan.loop) opts.loop = plan.loop;
    return compose.progression(vector, bars, rng, opts);
  }

  // ---- the lead's theme lifecycle --------------------------------------------------
  // Statements and returns keep the committed motif + contour (the invariant
  // that makes a return recognizable); departures get the contrasting contour
  // and a free rhythm; the peak restates the theme up a register. The gamut and
  // pillars ride every phrase (the style's own hierarchy, taught by use).
  function leadPhrase(ctx, chords, isAnte) {
    const { plan, vector, rng, K, bars, sec } = ctx;
    if (!ctx.roles.lead) return null;
    const restate = sec.kind === 'state' || sec.kind === 'return' || sec.kind === 'peak';
    const lead = ctx.roles.lead;
    let reg = lead.register || [62, 84];
    if (sec.kind === 'peak') reg = [Math.min(reg[0] + 4, reg[1] - 8), reg[1]];
    if (sec.kind === 'depart') reg = [Math.max(24, reg[0] - 4), reg[1] - 4];
    const motif = restate ? (plan.theme.motif || (K.rhythmMode === 'cell' ? plan.cellMotif : null)) : null;
    const cadence = vector.harmonyType === 'functional' ? (isAnte && bars >= PHRASE ? 'HC' : 'PAC') : 'none';
    const mel = compose.melodyPhrase(vector, chords, rng, {
      bars, register: reg, cadence,
      contour: restate ? plan.theme.contour : plan.theme.contourB,
      motif,
      centerOffset: sec.kind === 'peak' ? 3 : 0,
      densityScale: 1 - vector.melTex * 0.5,
      gamutPcs: gamutPcs(vector, K),
      pillarPcs: pillarPcs(vector, K),
    });
    if (restate && !plan.theme.motif && mel.motif) plan.theme.motif = mel.motif;
    return mel;
  }
  function pushLead(ctx, mel, velScale) {
    if (!mel || !ctx.roles.lead) return;
    const lead = ctx.roles.lead;
    const vel = (0.62 + 0.16 * ctx.vector.leadProm) * (velScale == null ? 1 : velScale);
    for (const n of mel.notes) {
      ctx.notes.push(Object.assign({}, n, {
        voice: lead.voice, role: 'lead',
        vel: vel * (lead.level == null ? 1 : lead.level),
        tags: (n.tags || []).concat(n.beat === 0 ? ['phraseStart'] : []),
      }));
    }
  }

  // ---- shared accompaniment bits ------------------------------------------------
  function compPart(ctx, chords, tmplOverride, velScale) {
    const { plan, vector, rng, roles, notes, L } = ctx;
    const mid = roles.mid1;
    if (!mid) return;
    if (!plan.compStyle[ctx.sec.role]) {
      plan.compStyle[ctx.sec.role] = rng.pick(mid.role === 'pad' ? ['pad', 'broken', 'arp'] : ['broken', 'arp', 'boomchick', 'stabs']);
    }
    let voicing = plan.memo.voicing;
    chords.forEach((ch) => {
      voicing = compose.voiceChord(ch, mid.register || [50, 72], voicing, vector.harmRich, rng, { vector });
      const tmpl = tmplOverride || (rng.bool(0.2 + vector.variation * 0.3) ? rng.pick(['broken', 'arp', 'pad', 'stabs']) : plan.compStyle[ctx.sec.role]);
      for (const n of compose.compBar(vector, ch, ch.beat, voicing, tmpl, rng)) {
        if (n.beat >= L - 1e-9) continue;
        notes.push(Object.assign(n, { voice: mid.voice, role: mid.role, vel: (n.vel || 0.7) * (0.42 + 0.1 * (1 - vector.leadProm)) * (velScale == null ? 1 : velScale) * (mid.level == null ? 1 : mid.level) }));
      }
    });
    plan.memo.voicing = voicing;
  }
  function bassPart(ctx, chords, opts) {
    const { vector, rng, roles, notes, L } = ctx;
    const low = roles.low;
    if (!low) return;
    const o = opts || {};
    if (roles.droneLike && !o.ground) {
      // a drone holds the reference pitch — the stable anchor an invented style
      // must keep (style-invention: at least one recurring reference)
      const root = compose.nearestBassNote(pcOf(vector.tonicPc), low.register || [33, 45]);
      notes.push({ beat: 0, durBeats: L + 0.5, midi: root, voice: low.voice, role: low.role, vel: 0.62 * (low.level == null ? 1 : low.level) });
      return;
    }
    chords.forEach((ch, i) => {
      for (const n of compose.bassBar(vector, ch, chords[i + 1], ch.beat, low.register || [36, 55], rng, o)) {
        if (n.beat >= L - 1e-9) continue;
        notes.push(Object.assign(n, { voice: low.voice, role: low.role, vel: (n.vel || 0.85) * 0.78 * (low.level == null ? 1 : low.level) }));
      }
    });
  }
  // the second mid: sparse high color — pillar tones answering the texture
  function shimmerPart(ctx, chords, velScale) {
    const { vector, rng, roles, notes, K, bb, bars } = ctx;
    const mid = roles.mid2;
    if (!mid || ctx.I < 0.35) return;
    const pcs = Array.from(pillarPcs(vector, K));
    const reg = mid.register || [58, 80];
    for (let b = 0; b < bars; b++) {
      if (!rng.bool(0.3 + 0.3 * ctx.I)) continue;
      const at = b * bb + q8(bb * (0.5 + 0.4 * rng.next()));
      const pc = rng.pick(pcs);
      const pool = compose.scalePool(vector, reg).filter((m) => pcOf(m) === pc);
      if (!pool.length) continue;
      mk(notes, ctx.L, mid, at, 1.2, pool[Math.floor(pool.length / 2)], 0.3 * (velScale == null ? 1 : velScale), { pan: 0.3 * ctx.plan.flip });
    }
  }
  // extra pitched roles beyond the texture's needs: octave doubling of the lead
  // at peaks, silent otherwise (never let a drawn instrument stay unused)
  function extrasPart(ctx, mel) {
    const { roles, notes, sec } = ctx;
    if (!roles.extraMids.length || !mel) return;
    if (sec.kind !== 'peak' && ctx.I < 0.75) return;
    const part = roles.extraMids[0];
    const reg = part.register || [52, 76];
    for (const n of mel.notes) {
      if ((n.tags || []).indexOf('apex') < 0 && n.durBeats < 1) continue;
      mk(notes, ctx.L, part, n.beat, n.durBeats, nearestOct(n.midi, reg), 0.3);
    }
  }

  // ================================================================== writers ====
  // Each texture architecture is one writer: how the drawn ensemble relates.
  const WRITERS = {
    // -- melody + accompaniment: the homophonic default --------------------------
    melodyAccomp(ctx, chords, isAnte) {
      const mel = leadPhrase(ctx, chords, isAnte);
      pushLead(ctx, mel);
      compPart(ctx, chords);
      bassPart(ctx, chords, {});
      shimmerPart(ctx, chords);
      extrasPart(ctx, mel);
    },

    // -- ostinato web: a fixed ground + a re-phasing mid ostinato + free lead ----
    // (passacaglia / minimalist layering: coherence from the invariants,
    // interest from their interference and the lead above)
    ostinatoWeb(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      // ground: the low cell, transposed to the sounding chord root (riff
      // follows the changes) — or held on the tonic under drone/modal harmony
      if (roles.low) {
        const low = roles.low, reg = low.register || [36, 55];
        const degs = degreePcs(vector);
        for (let b = 0; b < bars; b++) {
          const ch = compose.chordAt(chords, b * bb);
          const rootPc = vector.harmonyType === 'drone' || vector.harmonyType === 'modal' ? pcOf(vector.tonicPc) : ch.bassPc;
          plan.groundOnsets.forEach(([t, d], i) => {
            const deg = plan.groundDegs[i] || 0;
            // the ground's degrees ride the sounding root (riff follows the
            // changes); deg 7 marks the octave
            const iv = deg === 7 ? 0 : pcOf(degs[deg % degs.length] - degs[0]);
            const midi = compose.nearestBassNote(pcOf(rootPc + iv), reg) + (deg === 7 ? 12 : 0);
            mk(notes, L, low, b * bb + t, Math.min(d, bb - t), clamp(midi, reg[0], reg[1] + 12), 0.8);
          });
        }
      }
      // mid ostinato: its own cycle length, literal repeats (GROUP), pitched in
      // the gamut around the second pillar
      if (roles.mid1) {
        const mid = roles.mid1, reg = mid.register || [50, 72];
        const cyc = K.midCycle * bb;
        const pool = compose.scalePool(vector, reg);
        const g = gamutPcs(vector, K);
        const gp = pool.filter((m) => g.has(pcOf(m)));
        const use = gp.length >= 4 ? gp : pool;
        const startPhase = (ctx.pos.bar * bb) % cyc;
        for (const o of plan.midOst) {
          for (let rep = -1; rep < Math.ceil((bars * bb) / cyc) + 1; rep++) {
            const at = o.beat - startPhase + rep * cyc;
            if (at < -1e-9 || at >= L - 1e-9) continue;
            const idx = clamp(Math.round((o.deg / 8) * (use.length - 1)), 0, use.length - 1);
            mk(notes, L, mid, at, o.dur + 0.2, use[idx], 0.44 + 0.1 * ctx.I);
          }
        }
      }
      // lead: free melody, entering after the web is established (immediately
      // if there is no web to wait for — e.g. a Layers=1 pin)
      const webExists = roles.mid1 || roles.low;
      if (!webExists || ctx.sec.kind !== 'state' || ctx.pos.barInSection >= PHRASE || ctx.pos.sectionIdx > 1) {
        const mel = leadPhrase(ctx, chords, isAnte);
        pushLead(ctx, mel, 0.95);
        extrasPart(ctx, mel);
      }
      shimmerPart(ctx, chords, 0.8);
    },

    // -- call and response: the lead asks, the ensemble answers -------------------
    // One continuous line is composed, then GATED into call windows (bars where
    // the lead speaks); the answers fill the off-windows with the motif's rhythm
    // in chords — or on a drum — so the exchange shares one rhythm identity.
    // With no answerer present (a solo pin), the lead simply keeps the line.
    callResponse(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      const g = Math.max(1, Math.min(K.respGap, Math.floor(bars / 2)));
      const mel = roles.lead ? leadPhrase(ctx, chords, isAnte) : null;
      const percAnswer = roles.percs.length >= 2 && rng.bool(0.35);
      const answerer = percAnswer ? (roles.percs.find((e) => e.role === 'perc1' || e.role === 'snare' || e.role === 'perc2') || roles.percs[0]) : roles.mid1;
      if (!answerer) {
        pushLead(ctx, mel); // nobody to answer: the lead holds the floor
      } else if (mel && roles.lead) {
        const lead = roles.lead;
        const vel = 0.62 + 0.16 * vector.leadProm;
        const inCall = (beat) => Math.floor(Math.floor(beat / bb) / g) % 2 === 0;
        for (const n of mel.notes) {
          if (!inCall(n.beat)) continue;
          ctx.notes.push(Object.assign({}, n, {
            voice: lead.voice, role: 'lead', vel: vel * (lead.level == null ? 1 : lead.level),
            tags: (n.tags || []).concat(n.beat === 0 ? ['phraseStart'] : []),
          }));
        }
        // answers in the off-windows, speaking the motif's rhythm
        const motif = plan.theme.motif || plan.cellMotif;
        let voicing = plan.memo.voicing;
        for (let b = 0; b < bars; b++) {
          if (inCall(b * bb)) continue;
          if (percAnswer) {
            for (const [t] of motif) mk(notes, L, answerer, b * bb + t, 0.12, 60, 0.6, { tags: ['answer'] });
          } else {
            const ch = compose.chordAt(chords, b * bb);
            voicing = compose.voiceChord(ch, answerer.register || [50, 72], voicing, vector.harmRich, rng, { vector });
            for (const [t, d] of motif) for (const m of voicing) mk(notes, L, answerer, b * bb + t, Math.min(d, 1.2), m, 0.5, { tags: ['answer'] });
          }
        }
        if (!percAnswer) plan.memo.voicing = voicing;
      }
      bassPart(ctx, chords, {});
      shimmerPart(ctx, chords, 0.7);
    },

    // -- stratification: slow foundation, mid skeleton, fast elaboration ----------
    // (the gamelan architecture: layers at fixed density ratios, converging on
    // goal tones at phrase ends; low punctuation as the cycle marker)
    strata(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      const mult = (K.strata && K.strata.mult) || 4;
      const g = gamutPcs(vector, K);
      const pillars = Array.from(pillarPcs(vector, K));
      // skeleton: two tones per bar stepping toward a pillar goal (mid voice)
      const skel = [];
      if (roles.mid1 || roles.lead) {
        const part = roles.mid1 || roles.lead;
        const reg = part.register || [50, 72];
        const pool = compose.scalePool(vector, reg).filter((m) => g.has(pcOf(m)));
        const use = pool.length >= 4 ? pool : compose.scalePool(vector, reg);
        const slots = bars * 2;
        const goal = compose.nearestInPool(use, (reg[0] + reg[1]) / 2 - 2, new Set(pillars));
        let cur = compose.nearestInPool(use, (reg[0] + reg[1]) / 2 + 2) || use[0];
        for (let s = 0; s < slots; s++) {
          const t = s / Math.max(1, slots - 1);
          const target = cur + (goal - cur) * t;
          const ch = compose.chordAt(chords, s * bb / 2);
          const chPcs = new Set(ch.notes.map(pcOf));
          let m = compose.nearestInPool(use, target, s === slots - 1 ? new Set(pillars) : (s % 2 === 0 ? chPcs : null));
          if (m == null) m = compose.nearestInPool(use, target);
          skel.push(m);
          if (roles.mid1) mk(notes, L, roles.mid1, s * bb / 2, bb / 2 + 0.1, m, 0.5);
          cur = m;
        }
      }
      // elaboration: the lead figurates around the skeleton, converging on each
      // next skeleton tone (garap-style working-out)
      if (roles.lead && skel.length) {
        const lead = roles.lead, reg = lead.register || [62, 86];
        const pool = compose.scalePool(vector, reg).filter((m) => g.has(pcOf(m)));
        const use = pool.length >= 4 ? pool : compose.scalePool(vector, reg);
        const perSkel = Math.max(2, Math.round(mult / 2));
        const step = (bb / 2) / perSkel;
        for (let s = 0; s < skel.length; s++) {
          const from = nearestOct(skel[s], reg);
          const to = nearestOct(skel[Math.min(s + 1, skel.length - 1)], reg);
          for (let i = 0; i < perSkel; i++) {
            if (ctx.I < 0.35 && i % 2 === 1) continue; // thin when quiet
            const t = i / perSkel;
            let m;
            if (i === 0) m = from;
            else if (i === perSkel - 1) m = compose.nearestInPool(use, to) || to;
            else m = compose.nearestInPool(use, from + (to - from) * t + (rng.bool(0.5) ? 2 : -2));
            mk(notes, L, lead, s * bb / 2 + i * step, step * 1.1, m, 0.52 + 0.14 * ctx.I * (i === 0 ? 1.2 : 1));
          }
        }
      }
      // foundation + punctuation
      bassPart(ctx, chords, { sustain: true });
      shimmerPart(ctx, chords, 0.6);
    },

    // -- hocket: one composite line split between two interlocking voices ---------
    // (kotekan: on-beat half and off-beat half, converging on shared goals; at
    // low intensity the lead alone carries a thinner composite — the interlock
    // IS the thickening)
    hocket(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      const denseMotif = [];
      for (let t = 0; t < bb - 1e-9; t += 0.5) denseMotif.push([t, 0.5]);
      const mel = roles.lead ? compose.melodyPhrase(vector, chords, rng, {
        bars, register: roles.lead.register || [62, 86],
        cadence: vector.harmonyType === 'functional' ? (isAnte ? 'HC' : 'PAC') : 'none',
        contour: plan.theme.contour, motif: ctx.I >= 0.45 ? denseMotif : (plan.theme.motif || plan.cellMotif),
        gamutPcs: gamutPcs(vector, K), pillarPcs: pillarPcs(vector, K),
        densityScale: 1,
      }) : null;
      if (mel && !plan.theme.motif && mel.motif) plan.theme.motif = mel.motif;
      if (mel && roles.lead) {
        const split = ctx.I >= 0.45 && roles.mid1;
        const lead = roles.lead;
        const mid = roles.mid1;
        const midReg = mid && (mid.register || [50, 72]);
        mel.notes.forEach((n, i) => {
          const isLast = i === mel.notes.length - 1;
          const onBeat = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
          const vel = (0.6 + 0.16 * vector.leadProm);
          if (!split) {
            ctx.notes.push(Object.assign({}, n, { voice: lead.voice, role: 'lead', vel: vel * (lead.level || 1), tags: (n.tags || []) }));
          } else if (isLast) {
            // convergence: both parts land the goal tone together (gamelan rule)
            ctx.notes.push(Object.assign({}, n, { voice: lead.voice, role: 'lead', vel: vel * (lead.level || 1), tags: (n.tags || []) }));
            mk(notes, L, mid, n.beat, n.durBeats, nearestOct(n.midi, midReg), 0.5);
          } else if (onBeat) {
            ctx.notes.push(Object.assign({}, n, { voice: lead.voice, role: 'lead', vel: vel * (lead.level || 1) * 0.95, pan: 0.18 * plan.flip, tags: (n.tags || []) }));
          } else {
            mk(notes, L, mid, n.beat, n.durBeats, nearestOct(n.midi, midReg), 0.52, { pan: -0.22 * plan.flip });
          }
        });
      }
      bassPart(ctx, chords, {});
      shimmerPart(ctx, chords, 0.6);
      extrasPart(ctx, mel);
    },

    // -- chorale: homorhythm — every pitched voice moves in one shared rhythm -----
    chorale(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      // one shared phrase rhythm with a breath at the end
      const onsets = [];
      for (let b = 0; b < bars; b++) {
        if (b === bars - 1) { onsets.push([b * bb, Math.max(1, bb - 1)]); break; }
        const r = compose.barRhythm(vector.meter, Math.min(0.45, vector.density * 0.7), rng, { sparse: true });
        for (const [t, d] of r) onsets.push([b * bb + t, d]);
      }
      const g = gamutPcs(vector, K);
      let voicing = plan.memo.voicing;
      const leadReg = roles.lead ? (roles.lead.register || [62, 84]) : [62, 84];
      const leadPool = compose.scalePool(vector, leadReg);
      const leadG = leadPool.filter((m) => g.has(pcOf(m)));
      const usePool = leadG.length >= 4 ? leadG : leadPool;
      let prevTop = null;
      onsets.forEach(([t, d], i) => {
        const ch = compose.chordAt(chords, t);
        voicing = compose.voiceChord(ch, roles.mid1 ? (roles.mid1.register || [50, 72]) : [50, 72], voicing, vector.harmRich, rng, { vector });
        const isCad = i === onsets.length - 1;
        // top voice: the lead — chord tone near a gentle arch, stepwise-biased
        if (roles.lead) {
          const chPcs = new Set(ch.notes.map(pcOf));
          const target = prevTop == null ? (leadReg[0] + leadReg[1]) / 2 : prevTop + rng.int(-2, 2);
          let m = compose.nearestInPool(usePool, target, isCad ? new Set([pcOf(vector.tonicPc)]) : chPcs);
          if (m == null) m = compose.nearestInPool(usePool, target);
          prevTop = m;
          mk(notes, L, roles.lead, t, d * (isCad ? 1.1 : 0.98), m, 0.62 + 0.1 * ctx.I, { tags: isCad ? ['cadence:PAC'] : [], weight: isCad ? 0.85 : 0.55 });
        }
        if (roles.mid1) for (const m of voicing) mk(notes, L, roles.mid1, t, d * (isCad ? 1.1 : 0.96), m, 0.5);
        if (roles.mid2 && (i % 2 === 0 || isCad)) {
          const m2 = voicing[voicing.length - 1];
          if (m2 != null) mk(notes, L, roles.mid2, t, d, nearestOct(m2 + 12, roles.mid2.register || [58, 80]), 0.32);
        }
        if (roles.low) {
          const root = compose.nearestBassNote(ch.bassPc, roles.low.register || [36, 55]);
          mk(notes, L, roles.low, t, d * 1.02, root, 0.68);
        }
      });
      plan.memo.voicing = voicing;
    },

    // -- canon: the lead's line echoed by the mid at a fixed delay + interval -----
    canon(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      const delay = (K.canon && K.canon.delay) || 2;
      const step = (K.canon && K.canon.step) || -4;
      const mel = leadPhrase(ctx, chords, isAnte);
      pushLead(ctx, mel);
      if (mel && roles.mid1) {
        const mid = roles.mid1, reg = mid.register || [50, 72];
        const fullPool = theory.scale(24 + vector.tonicPc, vector.scale, { octaves: 7 });
        for (const n of mel.notes) {
          const at = n.beat + delay;
          if (at >= L - 1e-9) continue; // the echo breathes where the lead's phrase ends
          const idx = fullPool.indexOf(n.midi);
          const m = idx >= 0 ? fullPool[clamp(idx + step, 0, fullPool.length - 1)] : n.midi + Math.round(step * 1.7);
          mk(notes, L, mid, at, n.durBeats, nearestOct(m, reg), 0.48, { tags: ['echo'] });
        }
      }
      bassPart(ctx, chords, {});
      shimmerPart(ctx, chords, 0.5);
      extrasPart(ctx, mel);
    },

    // -- tintinnabuli: an M-voice in steps, a T-voice locked to the tonic triad ---
    // (the Pärt two-voice algorithm: for each melody note the T-voice sounds the
    // nearest tonic-triad tone above/below (never the same pitch); the drone
    // holds the reference. The kernel fixes position and side for the piece.)
    tintinnabuli(ctx, chords, isAnte) {
      const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
      const slow = vector.meter.compound ? [[0, 1.5], [1.5, 1.5]] : bb >= 4 ? [[0, 2], [2, 2]] : [[0, bb]];
      const mel = roles.lead ? compose.melodyPhrase(vector, chords, rng, {
        bars, register: roles.lead.register || [62, 84],
        cadence: 'none', contour: plan.theme.contour,
        motif: plan.theme.motif || slow,
        gamutPcs: gamutPcs(vector, K), pillarPcs: pillarPcs(vector, K),
        densityScale: 0.6,
      }) : null;
      if (mel && !plan.theme.motif && mel.motif) plan.theme.motif = mel.motif;
      pushLead(ctx, mel, 0.9);
      if (mel && roles.mid1) {
        const mid = roles.mid1, reg = mid.register || [50, 72];
        const tPcs = triadPcs(vector);
        const pos = (K.tin && K.tin.pos) || 1;
        const side = (K.tin && K.tin.side) || 'sup';
        mel.notes.forEach((n, i) => {
          const dir = side === 'alt' ? (i % 2 === 0 ? 1 : -1) : side === 'sup' ? 1 : -1;
          // walk outward from the M note to the pos-th triad tone on that side
          let found = 0, m = n.midi;
          for (let d = 1; d <= 24 && found < pos; d++) {
            const cand = n.midi + dir * d;
            if (tPcs.indexOf(pcOf(cand)) >= 0) { found++; m = cand; }
          }
          if (found === pos) mk(notes, L, mid, n.beat, n.durBeats, nearestOct(m, reg), 0.44, { tags: ['tintinnabuli'] });
        });
      }
      bassPart(ctx, chords, { sustain: true });
      // second mid: a high triad tone ringing at phrase ends
      if (roles.mid2 && bars >= 2) {
        const tPcs = triadPcs(vector);
        const reg = roles.mid2.register || [58, 80];
        const pool = compose.scalePool(vector, reg).filter((m) => tPcs.indexOf(pcOf(m)) >= 0);
        if (pool.length) mk(notes, L, roles.mid2, (bars - 1) * bb, bb, pool[pool.length - 1], 0.3);
      }
    },
  };

  // ---- percussion: every kernel voices its drawn percussion ----------------------
  // The timeline is inviolable once present; the kit and hand percussion enter
  // and leave with the intensity arc (thresholds per role — the layering IS the
  // dynamic form); a quiet architecture scales velocity, never existence, and
  // the peak section clears every threshold so each drawn role sounds.
  function writePercussion(ctx, opts) {
    const { plan, vector, roles, notes, K, bb, bars, L, sec, rng } = ctx;
    if (!roles.percs.length) return;
    const Q = PERC_QUIET[K.texture] == null ? 1 : PERC_QUIET[K.texture];
    const I = ctx.I;
    const byRole = {};
    for (const p of roles.percs) if (!byRole[p.role]) byRole[p.role] = p;
    const find = (...names) => { for (const nm of names) if (byRole[nm]) return byRole[nm]; return null; };
    const tl = find('timeline', 'high') || (K.rhythmMode === 'timeline' ? find('hat', 'shaker', 'perc2') : null);
    const kick = find('kick', 'anchor', 'boom');
    const snare = find('snare');
    const hat = find('hat', 'shaker');
    const p1 = byRole.perc1 && byRole.perc1 !== tl ? byRole.perc1 : null;
    const p2 = byRole.perc2 && byRole.perc2 !== tl && byRole.perc2 !== hat ? byRole.perc2 : null;
    const boom = byRole.boom && byRole.boom !== kick ? byRole.boom : null;
    const gong = find('gong');
    const spread = 0.25 * plan.flip;
    const accentSet = new Set(vector.meter.accents || [0]);
    const ending = !!(opts && opts.ending);
    const off = (opts && opts.offset) || 0;

    for (let b = 0; b < bars; b++) {
      const at = off + b * bb;
      const absBar = ctx.pos.bar + b;
      const lastBarOfSec = ctx.pos.barInSection + b === sec.bars - 1;
      if (ending && vector.ending !== 'stop') {
        // endings: percussion thins to punctuation (the final gestures are
        // written by writeEnding); keep only a settling low stroke on bar one
        if (b === 0 && (kick || boom)) mk(notes, L, kick || boom, 0, 0.3, 40, 0.5 * Q, {});
        continue;
      }
      // timeline: always on, the identity layer
      if (tl && plan.timeline && I > 0.1) {
        for (const t of plan.timeline) mk(notes, L, tl, at + t, 0.12, 78, (0.42 + 0.12 * I) * Q, { tags: ['timeline'], pan: spread });
      }
      // kick / low anchor: beat 1 is sacred (never lose the meter)
      if (kick && I > 0.22) {
        for (const t of plan.percPat.kick) mk(notes, L, kick, at + t, 0.25, 38, (t === 0 ? 0.88 : 0.7) * Q, {});
      }
      // backbeat + ghosts
      if (snare && I > 0.45) {
        for (const t of plan.percPat.backbeat) mk(notes, L, snare, at + t, 0.2, 42, 0.7 * Q, {});
        if (I > 0.6 && vector.density > 0.4) {
          const g1 = q8(bb * (0.3 + 0.4 * rng.next()));
          if (plan.percPat.backbeat.indexOf(g1) < 0) mk(notes, L, snare, at + g1, 0.1, 42, 0.16 * Q, { tags: ['ghost'] });
        }
      }
      // subdivision layer with a velocity hierarchy
      if (hat && I > 0.35) {
        const grain = plan.percPat.hatGrain;
        for (let t = 0; t < bb - 1e-9; t += grain) {
          if (rng.bool(0.06)) continue; // breath
          const onBeat = Math.abs(t - Math.round(t)) < 1e-6;
          const acc = accentSet.has(t) ? 0.5 : onBeat ? 0.4 : 0.28;
          mk(notes, L, hat, at + t, 0.1, 46, acc * (0.7 + 0.5 * I) * Q, { pan: -spread * 0.6 });
        }
      }
      // interlocking hand percussion (complementary Euclid rotations)
      if (p1 && I > 0.3) for (const t of plan.percPat.e1) mk(notes, L, p1, at + t, 0.12, 52, (0.4 + 0.15 * I) * Q, { pan: -spread });
      if (p2 && I > 0.5) for (const t of plan.percPat.e2) mk(notes, L, p2, at + t, 0.12, 63, (0.34 + 0.15 * I) * Q, { pan: spread });
      // colotomic low punctuation
      if (boom && I > 0.18 && absBar % 2 === 0) mk(notes, L, boom, at, 0.4, 36, 0.6 * Q, {});
      if (gong && ctx.pos.barInSection + b === 0 && sec.kind !== 'intro') {
        mk(notes, L, gong, at, Math.min(4, L - at), 52, 0.5 * Q, { tags: ['sectionStart'] });
      }
      // section-final fill (skip in quiet architectures)
      if (lastBarOfSec && !ending && Q >= 0.6 && I > 0.5 && (snare || p1)) {
        const f = snare || p1;
        const fillOn = rngLib.onsets(rngLib.euclid(4, 8, 0)).map((s) => s * 0.5);
        fillOn.forEach((t, i) => {
          if (bb - 2 + t * 0.5 >= 0) mk(notes, L, f, at + bb - 2 + t, 0.1, 44, (0.3 + 0.3 * (i / fillOn.length)) * Q, { tags: ['fill'] });
        });
      }
    }
  }

  // ---- intro / break / ending -----------------------------------------------------
  // The intro teaches the style (front-load the signatures): layered entries
  // state the rhythm system first; leadFirst states the theme naked.
  function writeIntro(ctx) {
    const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
    const chords = compose.progression(vector, bars, rng, { cadence: 'none', loop: plan.loop || undefined });
    if (K.entry === 'leadFirst') {
      const mel = leadPhrase(ctx, chords, true);
      pushLead(ctx, mel, 0.9);
      bassPart(ctx, chords, { sustain: true });
      return;
    }
    // layered: reveal the web one part per bar — ground, percussion, comp, color
    const stage = (barIdx) => Math.min(barIdx, 3);
    for (let b = 0; b < bars; b++) {
      const s = stage(ctx.pos.barInSection + b);
      if (s >= 0 && roles.low) {
        const ch = compose.chordAt(chords, b * bb);
        const root = compose.nearestBassNote(vector.harmonyType === 'drone' ? pcOf(vector.tonicPc) : ch.bassPc, roles.low.register || [36, 55]);
        mk(notes, L, roles.low, b * bb, bb, root, 0.62);
      }
      if (s >= 1) {
        // one bar's worth of percussion (borrow the main writer, offset per bar)
        const sub = { plan, vector, roles, notes, K, bb, bars: 1, L, sec: ctx.sec, rng, pos: { bar: ctx.pos.bar + b, barInSection: 1 }, I: 0.45 };
        writePercussion(sub, { offset: b * bb });
      }
      if (s >= 2 && roles.mid1) {
        const ch = compose.chordAt(chords, b * bb);
        const voicing = compose.voiceChord(ch, roles.mid1.register || [50, 72], plan.memo.voicing, vector.harmRich, rng, { vector });
        plan.memo.voicing = voicing;
        for (const m of voicing) mk(notes, L, roles.mid1, b * bb, bb, m, 0.4);
      }
      if (s >= 3) shimmerPart(Object.assign({}, ctx, { bars: 1, I: 0.5 }), chords, 0.7);
    }
  }

  function writeBreak(ctx) {
    const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
    // the sudden thin stretch: the texture drops to the reference layers — a
    // held low tone plus one quiet pulse — then relaunches with a pickup fill.
    // Something must keep sounding (the parseability anchor and the site's own
    // no-silence gate), so the low sustains and the pulse tapers, never stops.
    if (roles.low) {
      const root = compose.nearestBassNote(pcOf(vector.tonicPc), roles.low.register || [36, 55]);
      mk(notes, L, roles.low, 0, L, root, 0.5);
    }
    const tl = roles.percs.find((p) => p.role === 'timeline' || p.role === 'high') || roles.percs.find((p) => p.role === 'hat' || p.role === 'shaker') || roles.percs[0];
    if (tl && plan.timeline) {
      for (let b = 0; b < bars; b++) for (const t of plan.timeline) mk(notes, L, tl, b * bb + t, 0.12, 78, 0.36, { tags: ['timeline'] });
    } else if (tl) {
      // no timeline in this style: a bare tapering pulse holds the grid
      for (let b = 0; b < bars; b++) for (let t = 0; t < bb - 1e-9; t += 1) {
        mk(notes, L, tl, b * bb + t, 0.1, 46, 0.34 * (1 - 0.5 * ((b * bb + t) / L)), { tags: ['pulse'] });
      }
    }
    if (roles.mid1 && (!roles.percs.length || roles.droneLike)) {
      // little or no percussion: the break is a bare sustained color instead
      const ch = compose.progression(vector, 1, rng, { cadence: 'none' })[0];
      const voicing = compose.voiceChord(ch, roles.mid1.register || [50, 72], plan.memo.voicing, vector.harmRich, rng, { vector });
      for (const m of voicing) mk(notes, L, roles.mid1, 0, L, m, 0.3);
    }
    const filler = roles.percs.find((p) => p.role === 'perc1' || p.role === 'snare') || (roles.percs.length ? roles.percs[0] : null);
    if (filler) {
      const on = rngLib.onsets(rngLib.euclid(5, 8, 0)).map((s) => s * 0.5);
      on.forEach((t, i) => mk(notes, L, filler, (bars - 1) * bb + bb - 2 + t, 0.1, 48, 0.35 + 0.35 * (i / on.length), { tags: ['fill'] }));
    }
    if (!roles.low && !roles.percs.length && !roles.mid1 && roles.lead) {
      // a solo texture (e.g. a Layers=1 pin): the break is one held tone
      const reg = roles.lead.register || [62, 84];
      const pool = compose.scalePool(vector, reg);
      const m = compose.nearestInPool(pool, (reg[0] + reg[1]) / 2 - 3, new Set([pcOf(vector.tonicPc)]));
      if (m != null) mk(notes, L, roles.lead, 0, L, m, 0.4, { weight: 0.4 });
    }
  }

  // Endings: composed idioms with redundant cues (broadening + descent +
  // thinning — beginnings-endings-and-transitions.md); the cadenceDrop
  // signature, when drawn, IS the style's cadence formula.
  function writeEnding(ctx) {
    const { plan, vector, rng, roles, notes, K, bb, bars, L } = ctx;
    const ending = vector.ending;
    const chords = compose.progression(vector, bars, rng, {
      cadence: vector.harmonyType === 'functional' ? 'PAC' : 'none',
      loop: plan.loop || undefined,
    });
    const g = gamutPcs(vector, K);
    const tonicPc = pcOf(vector.tonicPc);

    if (ending === 'stop') {
      // one clean unison accent on the final downbeat, then silence
      const hitAt = (bars - 1) * bb;
      if (bars > 1) {
        // a settling half-texture bar first
        if (roles.mid1) {
          const voicing = compose.voiceChord(chords[0], roles.mid1.register || [50, 72], plan.memo.voicing, vector.harmRich, rng, { vector });
          for (const m of voicing) mk(notes, L, roles.mid1, 0, bb, m, 0.45);
        }
        if (roles.low) mk(notes, L, roles.low, 0, bb, compose.nearestBassNote(chords[0].bassPc, roles.low.register || [36, 55]), 0.7);
      }
      const stack = [roles.lead, roles.mid1, roles.mid2, roles.low].filter(Boolean);
      for (const part of stack) {
        const reg = part.register || [50, 76];
        const pool = compose.scalePool(vector, reg);
        const m = compose.nearestInPool(pool, (reg[0] + reg[1]) / 2, new Set([tonicPc]));
        if (m != null) mk(notes, L, part, hitAt, 0.5, m, 0.8, { tags: ['ending', 'unison'] });
      }
      for (const p of roles.percs) mk(notes, L, p, hitAt, 0.3, 45, 0.75, { tags: ['ending', 'unison'] });
      return;
    }

    // shared: a lengthened final tonic with a melodic close
    const finalAt = Math.max(0, (bars - 1) * bb);
    if (roles.lead && ending !== 'fade') {
      const reg = roles.lead.register || [62, 84];
      const pool0 = compose.scalePool(vector, reg);
      const gp = pool0.filter((m) => g.has(pcOf(m)));
      const pool = gp.length >= 3 ? gp : pool0;
      const center = (reg[0] + reg[1]) / 2 - 2;
      const one = compose.nearestInPool(pool, center - 2, new Set([tonicPc]));
      // the style's own cadence fall: from the cadenceDrop signature's degree
      // (or the second pillar) stepping down the gamut onto the tonic
      const dropSig = (vector.signatures || []).filter((s) => s.type === 'cadenceDrop')[0];
      const above = pool.filter((m) => one != null && m > one).sort((a, b) => a - b);
      const start = dropSig && above.length ? above[Math.min(above.length - 1, Math.max(0, dropSig.drop - 1))] : (above[1] || above[0]);
      const steps = [];
      if (start != null && one != null) {
        const idx0 = pool.indexOf(start), idx1 = pool.indexOf(one);
        for (let i = idx0; i > idx1; i--) steps.push(pool[i]);
      }
      const span = Math.min(bb, L - 1);
      steps.slice(0, 3).forEach((m, i) => {
        mk(notes, L, roles.lead, finalAt - span + (span / Math.max(1, Math.min(3, steps.length))) * i, span / 3, m, 0.6, { weight: 0.6 });
      });
      if (one != null) mk(notes, L, roles.lead, finalAt, L - finalAt, one, 0.66, { tags: ['ending'], weight: 0.9 });
    }
    const lastCh = chords[chords.length - 1];
    if (roles.mid1 && ending !== 'fade') {
      const voicing = compose.voiceChord(lastCh, roles.mid1.register || [50, 72], plan.memo.voicing, vector.harmRich, rng, { vector });
      for (const m of voicing) mk(notes, L, roles.mid1, finalAt, L - finalAt + 0.5, m, 0.5, { tags: ['ending'] });
      if (bars > 1) {
        let v0 = plan.memo.voicing;
        chords.forEach((ch) => {
          if (ch.beat >= finalAt) return;
          v0 = compose.voiceChord(ch, roles.mid1.register || [50, 72], v0, vector.harmRich, rng, { vector });
          for (const m of v0) mk(notes, L, roles.mid1, ch.beat, Math.min(ch.durBeats, finalAt - ch.beat), m, 0.45);
        });
      }
    }
    if (roles.low) {
      const root = compose.nearestBassNote(lastCh.bassPc, roles.low.register || [36, 55]);
      if (bars > 1 && ending !== 'fade') mk(notes, L, roles.low, 0, finalAt, compose.nearestBassNote(chords[0].bassPc, roles.low.register || [36, 55]), 0.6);
      mk(notes, L, roles.low, finalAt, L - finalAt + 0.5, root, 0.62, { tags: ['ending'] });
    }
    if (ending === 'ringout') {
      const gong = roles.percs.find((p) => p.role === 'gong' || p.voice === 'gong' || p.voice === 'chime' || p.voice === 'bell');
      if (gong) mk(notes, L, gong, finalAt, L - finalAt + 1, 52, 0.6, { tags: ['ending'], p: { decay: 1.6 } });
      if (roles.mid2) {
        const reg = roles.mid2.register || [58, 80];
        const pool = compose.scalePool(vector, reg).filter((m) => pcOf(m) === tonicPc);
        if (pool.length) mk(notes, L, roles.mid2, finalAt, L - finalAt + 1, pool[pool.length - 1], 0.4, { tags: ['ending'] });
      }
    }
    if (ending === 'fade') {
      // layered thinning: parts drop bar by bar, softer and softer (the fx
      // master fade is the site's job; the composition itself dissolves)
      const dropOrder = [roles.lead, roles.mid2, roles.mid1].filter(Boolean);
      for (let b = 0; b < bars; b++) {
        const vel = 0.5 * (1 - b / bars);
        const ch = compose.chordAt(chords, b * bb);
        if (roles.low) mk(notes, L, roles.low, b * bb, bb, compose.nearestBassNote(vector.harmonyType === 'drone' ? tonicPc : ch.bassPc, roles.low.register || [36, 55]), Math.max(0.15, vel + 0.15));
        const alive = dropOrder.slice(Math.min(b, dropOrder.length - 1) + (b >= bars - 1 ? 1 : 0));
        for (const part of alive) {
          if (part === roles.mid1) {
            const voicing = compose.voiceChord(ch, part.register || [50, 72], plan.memo.voicing, vector.harmRich, rng, { vector });
            plan.memo.voicing = voicing;
            for (const m of voicing) mk(notes, L, part, b * bb, bb, m, Math.max(0.12, vel));
          } else {
            const reg = part.register || [58, 80];
            const pool = compose.scalePool(vector, reg).filter((m) => g.has(pcOf(m)));
            if (pool.length) mk(notes, L, part, b * bb, bb, pool[Math.floor(pool.length / 2)], Math.max(0.1, vel * 0.8));
          }
        }
      }
    }
  }

  return { strategy, _internals: { buildSections, classify, cellMotif, interlockPair, kernelOf, gamutPcs, pillarPcs, triadPcs } };
});
