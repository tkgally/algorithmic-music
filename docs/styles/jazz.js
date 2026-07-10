/*
 * styles/jazz — the Jazz genre pack: a small combo that swings. Preset region +
 * incremental head–solos–head compose strategy. One of the site's three built-
 * from-scratch genres (no prior preliminary engine); the swing/feel machinery is
 * downstream (docs/lib/perform.js warps offbeats by vector.swing and drags the
 * comp instruments via the laid-back table), so this pack's job is the NOTES:
 * the chorus form, the walking bass, the ride pattern, the comping, and the
 * bebop-flavored solo lines.
 *
 * Musical basis — wiki/jazz-and-improvisation.md (the genre reverse-engineered
 * from scholarship) and wiki/groove-and-embodiment.md:
 *   - FORM. Everything happens over an audible, repeating chorus. Per seed the
 *     piece commits to either a 12-bar blues (I7 I7 I7 I7 | IV7 IV7 I7 I7 |
 *     V7 IV7 I7 V7-turnaround, with quick-change / ii–V variants) or a 16-bar
 *     I–vi–ii–V song form. The performance is head (theme) → 1–3 solo choruses →
 *     head out → a short ii–V–I tag (jazz-and-improvisation.md "Form",
 *     "Head–solos–head"). The head is a committed, singable motif restated
 *     before and after the solos.
 *   - WALKING BASS. Quarter-note walk, never stopping the pulse: root on beat 1,
 *     chord/scale tones on the inner beats, a chromatic (half-step) approach on
 *     the last beat targeting the next bar's root — the complete algorithm the
 *     wiki documents ("Rhythm section construction rules"). This is the genre's
 *     floor and its groove motor (groove-and-embodiment.md: "put timekeeping and
 *     energy in the bass"), so it is the last voice trimmed.
 *   - RIDE. The classic ride ("spang-a-lang"): quarters on every beat plus the
 *     swung skip note on the and-of-2 and and-of-4. Composed as straight eighths
 *     and left for perform.js to warp into the tempo-dependent swing. A feathered
 *     kick on beats 1 & 3 and sparse ghost-snare comping ("dropping bombs").
 *   - COMPING. Rootless 7th/9th voicings with nearest-motion voice leading,
 *     placed on syncopated Charleston figures (beat 1 + and-of-2, and-of-3),
 *     never a block chord every beat, and dropping out to leave space —
 *     "comping as conversation," density higher under a busy soloist.
 *   - SOLOS. Denser eighth-note lines from the shared contour-first melody
 *     machinery, widened register, arc-scaled density, then post-processed to
 *     recolor weak eighths as chromatic approach tones (bebop enclosure flavor).
 *
 * Determinism: identity (form, chart, head motif/contour, solo count) is fixed
 * in init from the plan stream; every other choice reads the LIVE vector (bpm,
 * swing, density, harmRich, scale, tonicPc, ...) inside nextUnit so live control
 * changes land on the next chorus. Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;      // shared composition machinery (loaded first)
  const T = () => AM.theory;       // notes/scales/chords

  const UNIT_BARS = 4;             // one 4-bar phrase per unit (choruses divide by 4)

  // Seventh-chord interval sets (semitones above the root) for the jazz
  // qualities we build by hand — the blues wants DOMINANT 7ths on I and IV,
  // which are not diatonic to a major key (jazz-and-improvisation.md "Blues
  // harmony": dominant 7ths on I and IV are stable, blue notes sit on top).
  const QUAL = {
    maj7: [4, 7, 11], dom7: [4, 7, 10], min7: [3, 7, 10], m7b5: [3, 6, 10], dim7: [3, 6, 9],
  };

  // Charleston-type comp figures (onsets in quarter beats): a sustained beat-1
  // stab plus the and-of-2 anticipation is the classic; the others are
  // conversational variants. NOT a chord every beat (jazz-and-improvisation.md
  // "Comping": short, syncopated stabs placed irregularly, leaving space).
  const COMP_FIGS = [
    { fig: [0, 1.5], w: 3 },   // Charleston: down-beat + and-of-2
    { fig: [1.5], w: 2 },      // just the and-of-2 anticipation
    { fig: [2.5], w: 1.5 },    // and-of-3 push
    { fig: [0, 2.5], w: 1.5 }, // beat 1 + and-of-3
    { fig: [1.5, 3.5], w: 1 }, // two off-beat pushes
  ];

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pcOf(m) { return ((Math.round(m) % 12) + 12) % 12; }

  // ---- Harmony construction ---------------------------------------------------
  // Root pitch class of scale degree `deg` (1..7) in the vector's key/mode.
  function scaleRootPc(vector, deg) {
    const hs = C().harmonicScale(vector.scale);
    const pat = T().SCALES[hs];
    return (vector.tonicPc + pat[(((deg - 1) % 7) + 7) % 7]) % 12;
  }
  // The DIATONIC seventh-chord intervals on `deg` in the vector's mode, so a
  // chord tracks whatever scale the Mood control has set (Imaj7 in major becomes
  // i-min7 in minor; dorian's IV comes out dominant — the modal-jazz color).
  function diatonicIvals(vector, deg) {
    const hs = C().harmonicScale(vector.scale);
    const t = 48 + vector.tonicPc;
    const r = T().scaleDegree(t, hs, deg);
    return [T().scaleDegree(t, hs, deg + 2) - r, T().scaleDegree(t, hs, deg + 4) - r, T().scaleDegree(t, hs, deg + 6) - r];
  }
  // Build a chord slot compatible with compose.js consumers (voiceChord uses
  // .seventhNotes, bassBar/walk use .bassPc + .notes, chordAt uses .beat).
  function makeChord(vector, spec, beat, durBeats) {
    const rootPc = scaleRootPc(vector, spec.deg);
    const root = 48 + rootPc;                              // C3-based, like compose.chordTable
    const iv = spec.q ? QUAL[spec.q] : diatonicIvals(vector, spec.deg);
    const notes = [root, root + iv[0], root + iv[1]];
    return { roman: '', degree: spec.deg, quality: spec.q || '', notes, seventhNotes: notes.concat(root + iv[2]), bassPc: rootPc, beat, durBeats };
  }

  // ---- Chorus charts (per-bar {deg, q?}; q overrides the diatonic quality) ----
  // 12-bar blues with idiomatic variants; the last bar is a V7 turnaround that
  // resolves onto the I that opens every chorus (and the tag).
  function bluesChart(rng) {
    const D = 'dom7';
    const quick = rng.bool(0.5);   // "quick change": IV in bar 2
    const iiV = rng.bool(0.6);     // ii–V into the turnaround (bars 9–10) vs V–IV
    const bars = [
      { deg: 1, q: D }, quick ? { deg: 4, q: D } : { deg: 1, q: D }, { deg: 1, q: D }, { deg: 1, q: D },
      { deg: 4, q: D }, { deg: 4, q: D }, { deg: 1, q: D }, { deg: 1, q: D },
      iiV ? { deg: 2, q: 'min7' } : { deg: 5, q: D }, iiV ? { deg: 5, q: D } : { deg: 4, q: D }, { deg: 1, q: D }, { deg: 5, q: D },
    ];
    return { kind: 'blues', len: 12, bars };
  }
  // 16-bar I–vi–ii–V song form: diatonic 7ths (mode-tracking) with the dominant
  // forced on every V for functional pull; bar 16 is a V7 turnaround.
  function songChart() {
    const D = 'dom7';
    const bars = [
      { deg: 1 }, { deg: 6 }, { deg: 2 }, { deg: 5, q: D },
      { deg: 1 }, { deg: 6 }, { deg: 2 }, { deg: 5, q: D },
      { deg: 4 }, { deg: 4 }, { deg: 3 }, { deg: 6 },
      { deg: 2 }, { deg: 5, q: D }, { deg: 1 }, { deg: 5, q: D },
    ];
    return { kind: 'song', len: 16, bars };
  }
  // The four-bar ii–V–I tag ending: the previous turnaround resolves to I, then a
  // fresh ii–V–I lands on the final tonic (jazz-and-improvisation.md: chains of
  // ii–V–I are the harmonic cell; the tune ends resolved).
  const TAG_CHART = { kind: 'tag', len: 4, bars: [{ deg: 1 }, { deg: 2, q: 'min7' }, { deg: 5, q: 'dom7' }, { deg: 1 }] };

  function unitChords(vector, chart, startBar, nBars) {
    const bb = vector.meter.barBeats, out = [];
    for (let i = 0; i < nBars; i++) out.push(makeChord(vector, chart.bars[(startBar + i) % chart.len], i * bb, bb));
    return out;
  }

  // ---- Walking bass -----------------------------------------------------------
  // Nearest MIDI of pitch class `pc` in the register to `target` (keeps the line
  // connected octave-to-octave rather than jumping to the register center).
  function nearestPc(pc, register, target) {
    const want = ((pc % 12) + 12) % 12;
    let best = null, bestD = Infinity;
    for (let m = register[0]; m <= register[1]; m++) {
      if (pcOf(m) !== want) continue;
      const d = Math.abs(m - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best == null ? Math.round(target) : best;
  }
  // One inner walking step: a chord tone or scale passing tone within a fifth of
  // the previous note, strongly favoring stepwise motion (a walk, not leaps).
  function pickWalk(prev, chordPcs, scalePcs, register, rng, preferChord) {
    const cands = [], weights = [];
    for (let m = register[0]; m <= register[1]; m++) {
      const pc = pcOf(m), isChord = chordPcs.has(pc), isScale = scalePcs.has(pc);
      if (!isChord && !isScale) continue;
      const d = Math.abs(m - prev);
      if (d > 7) continue;                              // no leap wider than a P5
      let s = d === 0 ? 0.25 : d <= 2 ? 3.0 : d <= 4 ? 1.4 : 0.6;  // prefer steps
      s *= isChord ? (preferChord ? 2.2 : 1.4) : 0.9;   // chord tones weighted, esp. mid-bar
      cands.push(m); weights.push(s);
    }
    if (!cands.length) return clamp(prev + (rng.bool(0.5) ? 2 : -2), register[0], register[1]);
    return rng.weighted(cands, weights);
  }
  // Beat-4 approach into the next bar's root: prefer a chromatic half-step
  // (from above or below), allow the dominant 5th, always close to the previous
  // note so the resolution is smooth.
  function chooseApproach(cur, options, register, rng) {
    const cands = [], weights = [];
    for (const o of options) {
      const m = o.m;
      if (m < register[0] || m > register[1]) continue;
      const d = Math.abs(m - cur);
      if (d > 7) continue;
      cands.push(m); weights.push(o.w * (d <= 2 ? 2.2 : d <= 4 ? 1.3 : 0.6));
    }
    if (!cands.length) return nearestPc(pcOf(cur + 1), register, cur);
    return rng.weighted(cands, weights);
  }
  // A full bar of walking bass; `prevMidi` threads the line across bar lines.
  function walkBar(vector, chord, nextChord, atBeat, register, rng, prevMidi) {
    const bb = vector.meter.barBeats;
    const steps = Math.max(2, Math.round(bb));
    const chordPcs = new Set(chord.seventhNotes.map(pcOf));
    const scalePcs = new Set(C().scalePool(vector, register).map(pcOf));
    const nextRootPc = nextChord ? nextChord.bassPc : chord.bassPc;
    const notes = [];
    // beat 1: the root, in the octave nearest the previous note (a chromatic
    // approach on the last beat lands a half-step from here — see below).
    let cur = nearestPc(chord.bassPc, register, prevMidi == null ? (register[0] + register[1]) / 2 : prevMidi);
    notes.push({ beat: atBeat, durBeats: 0.92, midi: cur, voice: 'bass', role: 'bass', vel: 0.86 });
    for (let i = 1; i < steps; i++) {
      let next;
      if (i === steps - 1) {
        const nr = nearestPc(nextRootPc, register, cur);
        const fifth = nearestPc((nextRootPc + 7) % 12, register, cur);
        next = chooseApproach(cur, [{ m: nr + 1, w: 3 }, { m: nr - 1, w: 3 }, { m: fifth, w: 1.1 }], register, rng);
      } else {
        next = pickWalk(cur, chordPcs, scalePcs, register, rng, i === Math.floor(steps / 2));
      }
      notes.push({ beat: atBeat + i, durBeats: 0.92, midi: next, voice: 'bass', role: 'bass', vel: 0.8 });
      cur = next;
    }
    return { notes, last: cur };
  }

  // ---- Ride cymbal + feathered kick + sparse snare ----------------------------
  // The ride carries the swing (jazz-and-improvisation.md "Drums"). Straight
  // eighths here; perform.js warps the offbeats by vector.swing. Velocity lifts
  // beats 2 & 4 (where the hi-hat foot chips) and keeps the skip notes light.
  function rideBar(vector, atBeat, rng, opts) {
    const bb = vector.meter.barBeats, notes = [];
    for (let q = 0; q < bb - 1e-6; q++) {
      const backbeat = Math.round(q) % 2 === 1;                 // beats 2, 4
      notes.push({ beat: atBeat + q, durBeats: 0.5, midi: null, voice: 'hat', role: 'ride', vel: backbeat ? 0.8 : (q < 0.5 ? 0.66 : 0.6) });
    }
    // swung skip notes on the and-of-2 and and-of-4 ("spang-a-LANG-a")
    for (let q = 1; q < bb - 1e-6; q += 2) {
      if (q + 0.5 >= bb) continue;
      const isLastSkip = opts.lift && q + 0.5 >= bb - 1.5;       // a small open-ride wash into a turnaround
      notes.push({ beat: atBeat + q + 0.5, durBeats: isLastSkip ? 0.9 : 0.5, midi: null, voice: 'hat', role: 'ride', vel: 0.46, tags: isLastSkip ? ['open'] : [] });
    }
    if (opts.kick) for (let q = 0; q < bb - 1e-6; q += 2) {      // feather 1 & 3, low and round
      notes.push({ beat: atBeat + q, durBeats: 0.25, midi: null, voice: 'kick', role: 'kick', vel: 0.24 });
    }
    if (opts.snare) {                                           // rare ghost/comp hit ("dropping bombs")
      const spots = [1.5, 2.5, 3.5].filter((s) => s < bb);
      if (spots.length && rng.bool((opts.isHead ? 0.1 : 0.2) + 0.22 * (opts.intensity || 0.5))) {
        notes.push({ beat: atBeat + rng.pick(spots), durBeats: 0.25, midi: null, voice: 'snare', role: 'snare', vel: 0.3 });
      }
    }
    return notes;
  }

  // ---- Comping (rootless 7th/9th voicings on Charleston figures) --------------
  // Rootless (the bass owns the root) with a 9th on top when harmonically rich —
  // the Bill-Evans-era left hand (jazz-and-improvisation.md "Rootless voicings").
  // voiceChord supplies the nearest-motion voice leading; forcing richness high
  // keeps the 7th in.
  function jazzVoicing(vector, chord, register, prev, rng) {
    let v = C().voiceChord(chord, register, prev, Math.max(0.7, vector.harmRich), rng);
    if (v.length >= 4 && pcOf(v[0]) === chord.bassPc && vector.harmRich > 0.45) v = v.slice(1); // drop the root
    if (vector.harmRich > 0.6 && v.length >= 3) {                 // add a 9th color on top
      const ninthPc = (chord.bassPc + 2) % 12;
      for (let m = v[v.length - 1] + 1; m <= register[1] + 2; m++) { if (pcOf(m) === ninthPc) { v = v.concat([m]); break; } }
    }
    return v;
  }
  function compFig(rng) { return rng.weighted(COMP_FIGS.map((f) => f.fig), COMP_FIGS.map((f) => f.w)); }
  function compBarJazz(atBeat, voicing, figure, bb) {
    const notes = [];
    for (const on of figure) {
      if (on >= bb) continue;
      const down = on < 1;
      for (const m of voicing) notes.push({ beat: atBeat + on, durBeats: down ? 1.4 : 0.7, midi: m, voice: 'rhodes', role: 'comp', vel: down ? 0.6 : 0.72 });
    }
    return notes;
  }

  // ---- Solo chromaticism ------------------------------------------------------
  // Recolor weak eighths as chromatic approach tones a half-step from the
  // following note (bebop enclosure/approach flavor; Frieler et al.: phrase
  // interiors are more chromatic than endings). Rhythm is untouched.
  function addChromaticApproaches(notes, rng, amount) {
    if (notes.length < 2) return notes;
    const out = notes.map((n) => Object.assign({}, n));
    for (let i = 0; i < out.length - 1; i++) {
      const n = out[i], nx = out[i + 1];
      if (n.midi == null || nx.midi == null) continue;
      if (Math.abs((n.beat - Math.floor(n.beat)) - 0.5) > 1e-6) continue;  // only off-eighths
      const gap = nx.midi - n.midi;
      if (Math.abs(gap) < 2 || !rng.bool(amount)) continue;
      const approach = nx.midi + (gap > 0 ? -1 : 1);
      if (i > 0 && Math.abs(approach - out[i - 1].midi) > 5) continue;      // no big leap into it
      n.midi = approach;
      n.tags = (n.tags || []).concat(['approach']);
    }
    return out;
  }

  AM.styles.register({
    id: 'jazz', name: 'Jazz', order: 3,
    blurb: 'A small combo that swings — walking bass, ride cymbal, comping piano, a soloist',
    preset: {
      // dominant-friendly modes (mixolydian/dorian) with major; the Mood control
      // walks dark→bright through the pool.
      scale: { pick: ['dorian', 'major', 'mixolydian'], w: [3, 3, 2] },
      moodModePool: ['naturalMinor', 'dorian', 'mixolydian', 'major', 'lydian'],
      tonicPc: { pick: [0, 2, 3, 5, 7, 9, 10] },
      harmonyType: 'functional',
      harmonicRhythm: 1,                       // one chord per bar (the chorus chart)
      harmRich: { range: [0.6, 0.9] },         // lush 7ths/9ths
      timeline: 'none',
      meterId: { pick: ['4/4', '4/4', '4/4', '3/4'], w: [6, 6, 6, 1] }, // mostly 4/4; a rare jazz waltz
      bpmBand: [90, 150],
      bpm: { range: [104, 138] },
      swing: { range: [0.55, 0.85] },          // perform maps ~2:1 up to ~3:1 offbeats
      laidBack: { range: [0.3, 0.5] },         // the comp/ride drag; bass & lead stay honest
      rubato: { range: [0.2, 0.4] },
      density: { range: [0.45, 0.7] }, interlock: 0.2,
      leadProm: { range: [0.6, 0.8] }, melTex: { range: [0.15, 0.4] },
      grammar: { stepBias: 0.6, range: 15, leapMax: 9 },
      form: 'headSolosHead', arc: { pick: ['arch', 'lateArch', 'rise'], w: [3, 2, 1] },
      development: { range: [0.35, 0.6] }, variation: { range: [0.4, 0.65] },
      lengthSec: { pick: [110, 165, 240], w: [0.3, 0.45, 0.25] },
      ending: 'cadence',                       // the ii–V–I tag
      brightness: { range: [0.45, 0.65] }, dynRange: { range: [0.45, 0.65] },
      expression: { range: [0.4, 0.6] }, reverb: { range: [0.18, 0.34] }, width: { range: [0.5, 0.7] },
      // Ensemble priorities: bass and ride ARE the jazz floor, trimmed last.
      ensemble: [
        { role: 'bass', voice: 'bass', register: [36, 57], level: 0.85, prio: 0 },
        { role: 'ride', voice: 'hat', register: [0, 0], level: 0.9, prio: 1 },
        { role: 'lead', voice: 'melody', register: [58, 84], level: 0.95, prio: 2 },
        { role: 'comp', voice: 'rhodes', register: [50, 74], level: 0.5, prio: 3 },
        { role: 'kick', voice: 'kick', register: [0, 0], level: 0.5, prio: 4 },
        { role: 'snare', voice: 'snare', register: [0, 0], level: 0.42, prio: 5 },
      ],
      palettes: [
        { name: 'Combo (e-piano lead)', desc: 'an electric-piano-led combo — the default', map: {} },
        { name: 'Saxophone (reed lead)', desc: 'a breathy reed takes the front line', map: { lead: 'reed' } },
        { name: 'Guitar (electric lead)', desc: 'an electric guitar leads the changes', map: { lead: 'wire' } },
      ],
    },

    strategy: {
      unitBars: UNIT_BARS,

      init(vector, rng) {
        // Commit the identity: chorus form, chart, head motif/contour seeds, and
        // how many solo choruses the target length affords.
        const chart = rng.bool(0.6) ? bluesChart(rng) : songChart();  // blues is the jazz floor
        const chorusBars = chart.len;
        const target = C().barsForLength(vector, UNIT_BARS);
        const overhead = chorusBars * 2 + 4;                          // head + head-out + tag
        const solos = clamp(Math.round((target - overhead) / chorusBars), 1, 3);

        const sections = [{ role: 'head', bars: chorusBars }];
        for (let i = 0; i < solos; i++) sections.push({ role: i === 0 ? 'solo' : 'solo' + (i + 1), bars: chorusBars });
        sections.push({ role: 'headOut', bars: chorusBars });
        sections.push({ role: 'tag', bars: 4 });
        C().sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);

        return {
          chart, sections, totalBars,
          headContour: C().pickContour(rng),
          bridgeContour: C().pickContour(rng),   // song-form bridge contrast
          headMotif: null,                        // committed on the first head phrase
          headLead: {},                           // stored head melody per within-chorus unit, for head-out
          _bassPrev: null, _compVoicing: null,
        };
      },

      nextUnit(plan, vector, pos, rng) {
        if (pos.bar >= plan.totalBars) return null;
        const bb = vector.meter.barBeats;
        const sec = pos.section;
        const ens = AM.style.effectiveEnsemble(vector);
        const roleLevel = {};
        for (const e of ens) roleLevel[e.role] = e.level == null ? 1 : e.level;
        const has = (role) => ens.find((e) => e.role === role) || null;
        const bass = has('bass'), ride = has('ride'), lead = has('lead'), comp = has('comp'), kick = has('kick'), snare = has('snare');
        const leadGain = 0.6 + 0.4 * vector.leadProm;      // prominence up front
        const compGain = 0.9 - 0.3 * vector.leadProm;      // comp yields to the soloist

        const notes = [];
        const finish = (last, intensity) => {
          for (const n of notes) n.vel = (n.vel == null ? 0.7 : n.vel) * (roleLevel[n.role] == null ? 1 : roleLevel[n.role]);
          return { notes, lengthBeats: nBarsOut * bb, bars: nBarsOut, section: sec.role, intensity: clamp(intensity, 0.05, 1), last };
        };

        // ---------------------------------------------------------------- TAG --
        if (sec.role === 'tag') {
          var nBarsOut = 4;
          const chords = unitChords(vector, TAG_CHART, 0, 4);
          let bprev = plan._bassPrev;
          for (let i = 0; i < 4; i++) {
            const chord = chords[i], next = chords[i + 1] || makeChord(vector, { deg: 1 }, 0, bb);
            const at = i * bb;
            if (i < 3) {
              if (bass) { const w = walkBar(vector, chord, next, at, bass.register, rng, bprev); for (const n of w.notes) notes.push(n); bprev = w.last; }
              if (ride) for (const n of rideBar(vector, at, rng, { intensity: sec.intensity, kick: !!kick, snare: !!snare, isHead: false })) notes.push(n);
              if (comp) { plan._compVoicing = jazzVoicing(vector, chord, comp.register, plan._compVoicing, rng); for (const n of compBarJazz(at, plan._compVoicing, compFig(rng), bb)) { n.vel *= compGain; notes.push(n); } }
            } else {
              // final bar: land the tonic, hold it, let it ring under the ritardando
              if (bass) { const root = nearestPc(chord.bassPc, bass.register, bprev == null ? 46 : bprev); notes.push({ beat: at, durBeats: bb, midi: root, voice: 'bass', role: 'bass', vel: 0.82, tags: ['ending'] }); bprev = root; }
              if (ride) { notes.push({ beat: at, durBeats: 0.5, midi: null, voice: 'hat', role: 'ride', vel: 0.6, tags: ['open'] }); if (kick) notes.push({ beat: at, durBeats: 0.25, midi: null, voice: 'kick', role: 'kick', vel: 0.26 }); }
              if (comp) { plan._compVoicing = jazzVoicing(vector, chord, comp.register, plan._compVoicing, rng); for (const m of plan._compVoicing) notes.push({ beat: at, durBeats: bb, midi: m, voice: 'rhodes', role: 'comp', vel: 0.58 * compGain, tags: ['ending'] }); }
            }
          }
          plan._bassPrev = bprev;
          if (lead) {                                       // a concluding lick resolving to the tonic
            const mel = C().melodyPhrase(vector, chords, rng, { bars: 4, register: lead.register, cadence: 'PAC', densityScale: 0.55 });
            mel.notes.forEach((n, i) => notes.push(Object.assign({}, n, {
              voice: lead.voice, role: 'lead', vel: 0.7 * leadGain,
              tags: (n.tags || []).concat(i === 0 ? ['phraseStart'] : []).concat(i === mel.notes.length - 1 ? ['ending'] : []),
            })));
          }
          return finish(true, 0.35 + 0.4 * pos.arcLevel);
        }

        // ------------------------------------------------ CHORUS (head/solo) --
        var nBarsOut = Math.min(UNIT_BARS, sec.bars - pos.barInSection);
        const startBar = pos.barInSection;                  // within the chorus: 0, 4, 8, 12
        const unitInChorus = Math.floor(startBar / UNIT_BARS);
        const isSolo = sec.role.indexOf('solo') === 0;
        const isHeadOut = sec.role === 'headOut';
        const chords = unitChords(vector, plan.chart, startBar, nBarsOut);
        const wrapChord = makeChord(vector, plan.chart.bars[(startBar + nBarsOut) % plan.chart.len], 0, bb);
        const lastUnitOfSec = pos.barInSection + nBarsOut >= sec.bars;

        // rhythm section, bar by bar
        let bprev = plan._bassPrev;
        for (let i = 0; i < nBarsOut; i++) {
          const chord = chords[i], next = chords[i + 1] || wrapChord, at = i * bb;
          if (bass) { const w = walkBar(vector, chord, next, at, bass.register, rng, bprev); for (const n of w.notes) notes.push(n); bprev = w.last; }
          if (ride) for (const n of rideBar(vector, at, rng, { intensity: pos.section.intensity, kick: !!kick, snare: !!snare, isHead: !isSolo, lift: lastUnitOfSec && i === nBarsOut - 1 })) notes.push(n);
          if (comp) {
            // comp as conversation: sparser under the head, busier under a solo;
            // let the tune enter clean on the head's very first bar.
            const active = (pos.bar + i) === 0 ? false : rng.bool(isSolo ? 0.85 : 0.55);
            if (active) {
              plan._compVoicing = jazzVoicing(vector, chord, comp.register, plan._compVoicing, rng);
              for (const n of compBarJazz(at, plan._compVoicing, compFig(rng), bb)) { n.vel *= compGain; notes.push(n); }
            }
          }
        }
        plan._bassPrev = bprev;

        // lead: state or restate the head, or blow a solo chorus
        if (lead) {
          if (isHeadOut && plan.headLead[startBar]) {
            for (const n of plan.headLead[startBar]) notes.push(Object.assign({}, n, { voice: lead.voice }));
          } else if (isSolo) {
            const reg = [lead.register[0] - 2, lead.register[1] + 3];      // widen for the solo
            const mel = C().melodyPhrase(vector, chords, rng, { bars: nBarsOut, register: reg, cadence: 'none', contour: C().pickContour(rng), densityScale: 1.15 + 0.3 * pos.arcLevel });
            const line = addChromaticApproaches(mel.notes, rng, 0.3 + 0.25 * pos.arcLevel);
            line.forEach((n, i) => notes.push(Object.assign({}, n, { voice: lead.voice, role: 'lead', vel: 0.72 * leadGain, tags: (n.tags || []).concat(i === 0 ? ['phraseStart'] : []) })));
          } else {
            // the head: a committed, singable motif reused across the A phrases,
            // a contrasting contour on the song-form bridge (unit 2 of 4).
            const bridge = plan.chart.kind === 'song' && unitInChorus === 2;
            const mel = C().melodyPhrase(vector, chords, rng, {
              bars: nBarsOut, register: bridge ? [lead.register[0] + 3, lead.register[1] + 3] : lead.register,
              cadence: 'none', contour: bridge ? plan.bridgeContour : plan.headContour,
              motif: plan.headMotif, centerOffset: bridge ? 2 : 0, densityScale: 0.72 - 0.2 * vector.melTex,
            });
            if (!plan.headMotif) plan.headMotif = mel.motif;
            const emitted = mel.notes.map((n, i) => Object.assign({}, n, { voice: lead.voice, role: 'lead', vel: 0.68 * leadGain, tags: (n.tags || []).concat(i === 0 ? ['phraseStart'] : []) }));
            plan.headLead[startBar] = emitted.map((n) => Object.assign({}, n));   // store for head-out (base vels)
            for (const n of emitted) notes.push(n);
          }
        }

        const last = (pos.sectionIdx === plan.sections.length - 1) && lastUnitOfSec; // tag is last, so false here
        return finish(last, 0.4 * pos.section.intensity + 0.6 * pos.arcLevel);
      },
    },
  });
})(typeof self !== 'undefined' ? self : this);
