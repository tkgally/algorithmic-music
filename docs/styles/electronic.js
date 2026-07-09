/*
 * styles/electronic — the Electronic genre pack: preset region + incremental
 * compose strategy. A steady FOUR-ON-THE-FLOOR house groove that builds and
 * drops — the genre most naturally suited to algorithmic generation
 * (wiki/electronic-and-dance.md: grid-locked, layer-based, formulaic form).
 *
 * The core move is LAYER-BASED FORM (wiki/electronic-and-dance.md "Loop-based
 * composition workflow"): the piece is a bank of 1-bar loop generators muted and
 * unmuted across a timeline of 8-bar sections. Which layers sound in a section
 * IS the composition, so the arrangement is committed as a per-section layer
 * mask in init() and read live in nextUnit():
 *
 *   intro (kick+hat) → groove (bass+clap enter) → build (comp stabs + lead arp,
 *   density rising) → DROP (everything, peak energy) → breakdown (kick/bass OUT,
 *   pad + lead float — the tension trough) → rebuild (kick returns) → DROP …
 *   → outro (layers peel off).
 *
 * The thrill lives in the breakdown→drop contrast: the breakdown strips the low
 * end to almost nothing (Solberg 2014's "removal, then reintroduction of bass
 * and kick"), so the full section on the next 8-bar boundary lands hard. All
 * transitions fall on 8-bar hypermetric boundaries — "this alone makes output
 * read as correct" (wiki/electronic-and-dance.md).
 *
 * Groove design (wiki/groove-and-embodiment.md): the kick is the tight low
 * ANCHOR on every beat and never moves; the clap/snare is the backbeat on 2 & 4;
 * the bassline is a committed syncopated ostinato that sits in the GAPS between
 * the kicks (they interlock — one element in the low end at a time, and the
 * offbeat push is the groove); the hats carry the offbeat shimmer with a
 * loud/soft velocity alternation. Timing is essentially quantized (the genre's
 * "aesthetics of exactitude") with at most a hair of swing — machine feel, low
 * expression. Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const SECTION_BARS = 8;   // every section a multiple of 8 bars (the hypermeter)
  const UNIT_BARS = 4;      // one loop-cell window per composed unit

  function pcOf(m) { return ((Math.round(m) % 12) + 12) % 12; }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  // --- Bassline riffs: 1-bar syncopated cells, each step [beatInBar, dur, tone].
  // Tones resolve against each bar's loop chord at play time (root / fifth /
  // octave / flat-7). Offbeat-LEANING by design so the bass interlocks with the
  // four-on-the-floor kick and the low end stays clean — one low element at a
  // time (wiki/electronic-and-dance.md sub-bass discipline; wiki/groove-and-
  // embodiment.md "put timekeeping and energy in the bass").
  const BASS_RIFFS = [
    // A — pure offbeat pump: root on every '&', the house engine-room bass
    [[0.5, 0.42, 'root'], [1.5, 0.42, 'root'], [2.5, 0.42, 'root'], [3.5, 0.42, 'root']],
    // B — offbeat with octave lifts (rolling / garage feel)
    [[0.5, 0.42, 'root'], [1.5, 0.42, 'oct'], [2.5, 0.42, 'root'], [3.25, 0.22, 'root'], [3.75, 0.22, 'oct']],
    // C — syncopated 16ths with fifth & flat-7 pushes (funkier)
    [[0, 0.38, 'root'], [0.75, 0.22, 'root'], [1.5, 0.4, 'fifth'], [2.5, 0.42, 'root'], [3, 0.38, 'b7'], [3.75, 0.22, 'root']],
    // D — deep/dub: sparse, long roots off the beat with an octave tail
    [[0.5, 0.9, 'root'], [2.5, 0.9, 'root'], [3.5, 0.42, 'oct']],
  ];

  // --- Lead arpeggio cells: index into a per-chord arp pool (chord tones stacked
  // up the lead register). Sparse, syncopated 8th/16th plucks — the house/trance
  // arp (wiki/electronic-and-dance.md: arpeggios / supersaw-pluck leads). Present
  // in build & drop only; a separate FLOAT mode carries the breakdown.
  const LEAD_CELLS = [
    { bars: 1, steps: [[0, 0], [0.5, 2], [1, 4], [1.5, 2], [2, 3], [2.5, 1], [3, 2], [3.5, 4]] },  // up/down
    { bars: 1, steps: [[0, 0], [0.75, 1], [1.5, 2], [2.25, 3], [3, 4], [3.5, 2]] },                // syncopated climb
    { bars: 2, steps: [[0, 0], [1, 2], [1.5, 3], [2.5, 1], [3, 2], [4, 4], [5, 3], [6, 2], [7, 0]] }, // 2-bar riff
    { bars: 1, steps: [[0.5, 4], [1, 3], [2, 2], [2.5, 4], [3.5, 3]] },                             // offbeat sparkle
  ];

  // --- The layer mask per section KIND. Each entry lists which roles sound; the
  // strings 'buildHalf' / 'firstHalf' gate a role to one half of the 8-bar
  // section (lead enters in the 2nd half of a build; bass peels in the 2nd half
  // of the outro). compMode selects STABS (offbeat hits) vs a SUSTAINED pad;
  // leadMode selects the ARP vs a floating pad-lead.
  const KIND = {
    intro:     { kick: 1, hat: 1 },
    groove:    { kick: 1, hat: 1, clap: 1, bass: 1 },
    build:     { kick: 1, hat: 1, clap: 1, bass: 1, comp: 1, compMode: 'stab', lead: 'buildHalf', leadMode: 'arp' },
    drop:      { kick: 1, hat: 1, clap: 1, bass: 1, comp: 1, compMode: 'stab', lead: 1, leadMode: 'arp' },
    breakdown: { comp: 1, compMode: 'sustain', lead: 1, leadMode: 'float' },
    rebuild:   { kick: 1, hat: 1, bass: 1, comp: 1, compMode: 'stab' },  // no clap/lead yet — tension climbs back
    outro:     { kick: 1, hat: 1, bass: 'firstHalf' },
  };

  // Per-kind energy (0..1): drives velocity/density via the returned intensity.
  // Kinds DOMINATE the arc so drops always peak and breakdowns always dip,
  // whatever the intensity arc the user picked (waves/terraced/arch).
  function energyFor(kind, barInSection) {
    const t = barInSection / Math.max(1, SECTION_BARS - 1);
    switch (kind) {
      case 'intro':     return 0.5 + 0.1 * t;
      case 'groove':    return 0.78;
      case 'build':     return lerp(0.66, 0.98, t);   // density rises into the drop
      case 'drop':      return 1.0;                    // peak
      case 'breakdown': return 0.46 + 0.06 * t;        // the trough
      case 'rebuild':   return lerp(0.6, 0.94, t);     // climbs back
      case 'outro':     return lerp(0.72, 0.42, t);    // peels down
      default:          return 0.72;
    }
  }

  // Nearest midi >= `from` with pitch-class `pc`, and the ascending chord-tone
  // arp pool used by the lead (root, third, fifth, octave, octave+third).
  function nearestUp(from, pc) { for (let k = 0; k < 12; k++) if (pcOf(from + k) === pc) return from + k; return from; }
  function arpPool(chord, reg) {
    const rootPc = pcOf(chord.notes[0]);
    const thirdPc = pcOf(chord.notes[1] != null ? chord.notes[1] : chord.notes[0] + 3);
    const fifthPc = pcOf(chord.notes[2] != null ? chord.notes[2] : chord.notes[0] + 7);
    let base = reg[0]; while (pcOf(base) !== rootPc && base < reg[0] + 12) base++;
    const cand = [base, nearestUp(base, thirdPc), nearestUp(base, fifthPc), base + 12, nearestUp(base + 12, thirdPc)];
    const pool = cand.filter((m) => m >= reg[0] && m <= reg[1]);
    return pool.length ? pool : [clamp(base, reg[0], reg[1])];
  }

  // Resolve a bass tone code to a concrete midi inside the bass register: root/
  // fifth/flat-7 take the LOW instance (weight); 'oct' takes the high instance.
  function bassMidi(tone, chord, reg) {
    let pc = pcOf(chord.notes[0]);
    if (tone === 'fifth') pc = pcOf(chord.notes[2] != null ? chord.notes[2] : chord.notes[0] + 7);
    else if (tone === 'b7') pc = pcOf(chord.notes[0] + 10);
    const opts = [];
    for (let m = reg[0]; m <= reg[1]; m++) if (pcOf(m) === pc) opts.push(m);
    if (!opts.length) return reg[0];
    return tone === 'oct' ? opts[opts.length - 1] : opts[0];
  }

  AM.styles.register({
    id: 'electronic',
    name: 'Electronic',
    order: 5,
    blurb: 'A steady four-on-the-floor house groove that builds and drops',
    preset: {
      scale: { pick: ['naturalMinor', 'dorian', 'minorPentatonic'] },  // minorish house/techno color
      tonicPc: { pick: [0, 2, 5, 7, 9, 10] },
      harmonyType: 'loop',
      harmonicRhythm: 1,                       // one chord per bar over a 4-bar vamp
      harmRich: { range: [0.3, 0.6] },
      timeline: 'pulse',
      meterId: '4/4',                          // four-on-the-floor: 4/4 only
      bpmBand: [115, 132],
      swing: { range: [0, 0.15] },             // straight, or a hair of shuffle
      laidBack: 0,                             // machine timing
      rubato: { range: [0.1, 0.25] },
      density: { range: [0.45, 0.7] },
      interlock: { range: [0.3, 0.55] },
      leadProm: { range: [0.4, 0.6] },
      melTex: { range: [0.35, 0.6] },
      grammar: { stepBias: 0.6, range: 12, leapMax: 7 },
      form: 'sections',
      arc: { pick: ['waves', 'terraced', 'arch'] },
      development: { range: [0.2, 0.4] },      // cyclic: loops that vary
      variation: { range: [0.25, 0.5] },
      lengthSec: { pick: [108, 132, 156], w: [0.4, 0.4, 0.2] },
      ending: { pick: ['fade', 'stop'] },
      brightness: { range: [0.42, 0.66] },
      dynRange: { range: [0.35, 0.6] },
      expression: { range: [0.1, 0.3] },       // LOW — machine feel, no rubato heroics
      reverb: { range: [0.15, 0.35] },
      width: { range: [0.6, 0.85] },
      moodModePool: ['naturalMinor', 'dorian', 'minorPentatonic', 'mixolydian', 'major'],
      // Ensemble priority IS the layer-cap peel order (kick first, lead last):
      // kick 0 · bass 1 · hat 2 · comp 3 · clap 4 · lead 5.
      ensemble: [
        { role: 'kick', voice: 'kick',   register: [36, 36], level: 0.9,  prio: 0 },
        { role: 'bass', voice: 'bass',   register: [36, 52], level: 0.82, prio: 1 },
        { role: 'hat',  voice: 'hat',    register: [0, 0],   level: 0.5,  prio: 2 },
        { role: 'comp', voice: 'rhodes', register: [52, 76], level: 0.5,  prio: 3 },
        { role: 'clap', voice: 'clap',   register: [0, 0],   level: 0.62, prio: 4 },
        { role: 'lead', voice: 'wire',   register: [60, 84], level: 0.62, prio: 5 },
      ],
      palettes: [
        { name: 'house (rhodes stabs · wire lead)', map: {} },
        { name: 'deep (pad chords · glass lead)', map: { comp: 'pad', lead: 'glass' } },
        { name: 'hard (snare backbeat · wire lead)', map: { clap: 'snare' } },
      ],
    },

    strategy: {
      unitBars: UNIT_BARS,

      // ---- init: commit the piece's IDENTITY (form + loop + riff + arp cell).
      // Everything key/level-dependent is re-derived live in nextUnit so that
      // live control changes (key, mode, harmonic richness, layers, density,
      // energy) land on future units.
      init(vector, rng) {
        // Size to the target length in whole 8-bar sections, then lay out the
        // layer-based arrangement: a fixed head (intro→groove→build→drop), one
        // or more breakdown→rebuild→drop cycles scaled to length, and an outro.
        const total = C().barsForLength(vector, SECTION_BARS);
        const head = 4 * SECTION_BARS, tail = SECTION_BARS, cyc = 3 * SECTION_BARS;
        const cycles = clamp(Math.round((total - head - tail) / cyc), 1, 5);
        const seq = [['intro', 'intro'], ['groove', 'groove'], ['build', 'build'], ['drop', 'drop']];
        for (let i = 0; i < cycles; i++) {
          seq.push(['breakdown', 'break' + (i ? i + 1 : '')]);
          seq.push(['rebuild', 'rebuild' + (i ? i + 1 : '')]);
          seq.push(['drop', 'drop' + (i + 2)]);
        }
        seq.push(['outro', 'outro']);
        const sections = seq.map(([kind, role]) => ({ kind, role, bars: SECTION_BARS }));
        C().sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);

        // Commit the harmonic loop CHOICE (the degree sequence) — the vamp is
        // re-voiced live from these degrees in the current key each unit.
        const prog = C().progression(vector, 4, rng, {});
        const loopDegrees = prog._loop || [1, 6, 3, 7];

        // Commit the bass ostinato and the lead arp cell (the piece's hooks).
        const bassRiff = rng.pick(BASS_RIFFS);
        const leadCell = rng.pick(LEAD_CELLS);

        return { sections, totalBars, loopDegrees, bassRiff, leadCell };
      },

      // ---- nextUnit: compose one 4-bar loop window, reading the LIVE vector.
      nextUnit(plan, vector, pos, rng) {
        if (pos.bar >= plan.totalBars) return null;
        const compose = C();
        const sec = pos.section;
        const bb = vector.meter.barBeats;                 // 4 (four-on-the-floor)
        const bars = Math.min(UNIT_BARS, sec.bars - pos.barInSection);
        const L = KIND[sec.kind] || KIND.groove;
        const secondHalf = pos.barInSection >= SECTION_BARS / 2;

        // Live ensemble after layer cap + palette (which voices actually exist).
        const ens = AM.style.effectiveEnsemble(vector);
        const roleE = {};
        for (const e of ens) roleE[e.role] = e;

        // Resolve the section's layer mask against this unit's position.
        const on = {
          kick: !!L.kick && !!roleE.kick,
          hat:  !!L.hat && !!roleE.hat,
          clap: !!L.clap && !!roleE.clap,
          bass: (L.bass === 'firstHalf' ? !secondHalf : !!L.bass) && !!roleE.bass,
          comp: !!L.comp && !!roleE.comp,
          lead: (L.lead === 'buildHalf' ? secondHalf : !!L.lead) && !!roleE.lead,
        };

        // Section energy → per-unit intensity (drives perform.js dynamics). The
        // kind sets the level; the arc modulates it a little.
        const energy = energyFor(sec.kind, pos.barInSection);
        const intensity = clamp(energy * (0.72 + 0.32 * pos.arcLevel), 0.06, 1);
        // Effective density rises with energy — this is what thickens the build.
        const dens = clamp(vector.density * (0.55 + 0.6 * energy), 0.05, 1);

        // Re-derive the 4-bar vamp in the CURRENT key from the committed degrees
        // (progression consumes no rng when a loop is supplied), and voice it for
        // the comp. voiceChord is deterministic, so the stab voicing is identical
        // every loop yet follows a live key/richness change.
        const loop = compose.progression(vector, 4, rng, { loop: plan.loopDegrees });
        const compReg = roleE.comp ? roleE.comp.register : [52, 76];
        const voicings = [];
        let prevV = null;
        for (let i = 0; i < loop.length; i++) { prevV = compose.voiceChord(loop[i], compReg, prevV, vector.harmRich, rng); voicings.push(prevV); }
        const chordFor = (absBar) => loop[((absBar % loop.length) + loop.length) % loop.length];
        const voicingFor = (absBar) => voicings[((absBar % loop.length) + loop.length) % loop.length];

        const notes = [];
        const lastUnitOfSection = pos.barInSection + bars >= sec.bars;
        const preDrop = (sec.kind === 'build' || sec.kind === 'rebuild') && lastUnitOfSection; // fill into the drop

        for (let b = 0; b < bars; b++) {
          const absBar = pos.bar + b;
          const t0 = b * bb;                              // this bar's beat offset
          const chord = chordFor(absBar);
          const lastBarOfUnit = b === bars - 1;

          // ---- KICK: four-on-the-floor, the anchor. Never moved, uniform vel.
          if (on.kick) {
            const kl = roleE.kick.level || 1;
            for (let beat = 0; beat < bb; beat++) {
              notes.push({ beat: t0 + beat, durBeats: 0.5, voice: 'kick', role: 'kick', vel: 0.95 * kl });
            }
          }

          // ---- HAT: open hat on every offbeat (the house "tss"), with a
          // loud/soft alternation, plus closed 16th ticks when density is high.
          if (on.hat) {
            const hl = roleE.hat.level || 1;
            for (let beat = 0; beat < bb; beat++) {
              const off = t0 + beat + 0.5;
              notes.push({ beat: off, durBeats: 0.25, voice: 'hat', role: 'hat', tags: ['open'],
                vel: (beat % 2 === 0 ? 0.5 : 0.44) * hl, pan: (beat % 2 ? 0.18 : -0.18) });
            }
            if (dens > 0.5) {
              for (let beat = 0; beat < bb; beat++) for (const q of [0.25, 0.75]) {
                if (rng.bool((dens - 0.42) * 1.6)) notes.push({ beat: t0 + beat + q, durBeats: 0.2, voice: 'hat', role: 'hat',
                  vel: 0.28 * hl, pan: q < 0.5 ? -0.28 : 0.28 });
              }
            }
            // pre-drop 16th roll on the last bar of a build/rebuild (the "drum
            // roll effect" — Solberg 2014 — that raises density toward the drop).
            if (preDrop && lastBarOfUnit) {
              for (const q of [2.5, 3.0, 3.25, 3.5, 3.75]) notes.push({ beat: t0 + q, durBeats: 0.18, voice: 'hat', role: 'hat',
                vel: (0.34 + 0.12 * (q - 2.5)) * hl, pan: 0 });
            }
          }

          // ---- CLAP / snare: the backbeat on 2 & 4 (beats 1 & 3), the loudest
          // recurring accent (wiki/groove-and-embodiment.md "backbeat and weight").
          if (on.clap) {
            const cl = roleE.clap.level || 1;
            for (const beat of [1, 3]) notes.push({ beat: t0 + beat, durBeats: 0.4, voice: roleE.clap.voice, role: 'clap', vel: 0.8 * cl });
            if (preDrop && lastBarOfUnit) { // a clap flam into the drop
              notes.push({ beat: t0 + 3.5, durBeats: 0.3, voice: roleE.clap.voice, role: 'clap', vel: 0.6 * cl });
              notes.push({ beat: t0 + 3.75, durBeats: 0.3, voice: roleE.clap.voice, role: 'clap', vel: 0.7 * cl });
            }
          }

          // ---- BASS: the committed syncopated ostinato, re-rooted per chord,
          // with a small fill on the last bar of the 4-bar loop window.
          if (on.bass) {
            const reg = roleE.bass.register, bl = roleE.bass.level || 1;
            for (const [rb, rd, tone] of plan.bassRiff) {
              notes.push({ beat: t0 + rb, durBeats: rd, midi: bassMidi(tone, chord, reg), voice: 'bass', role: 'bass', vel: 0.9 * bl });
            }
            if (lastBarOfUnit && rng.bool(0.35 + vector.variation * 0.4)) {
              const nextRoot = bassMidi('root', chordFor(absBar + 1), reg);
              notes.push({ beat: t0 + 3.5, durBeats: 0.22, midi: bassMidi('oct', chord, reg), voice: 'bass', role: 'bass', vel: 0.78 * bl });
              notes.push({ beat: t0 + 3.75, durBeats: 0.22, midi: nextRoot + (rng.bool(0.5) ? -1 : 1), voice: 'bass', role: 'bass', vel: 0.72 * bl });
            }
          }

          // ---- COMP: rhodes/pad. STABS (offbeat hits, and-of-2 / and-of-4, plus
          // and-of-1 / and-of-3 when dense) in groove/build/drop; a SUSTAINED
          // chord per bar in the breakdown (the pad float).
          if (on.comp) {
            const cl = roleE.comp.level || 1, voicing = voicingFor(absBar);
            if (L.compMode === 'sustain') {
              for (const m of voicing) notes.push({ beat: t0, durBeats: bb * 0.96, midi: m, voice: roleE.comp.voice, role: 'comp', vel: 0.55 * cl, weight: 0.4 });
            } else {
              const hits = [1.5, 3.5];                       // &2 and &4 — the classic stab
              if (dens > 0.55) hits.push(0.5, 2.5);
              hits.sort((x, y) => x - y);
              for (let hi = 0; hi < hits.length; hi++) {
                const h = hits[hi], main = (h === 1.5 || h === 3.5);
                for (const m of voicing) notes.push({ beat: t0 + h, durBeats: 0.34, midi: m, voice: roleE.comp.voice, role: 'comp',
                  vel: (main ? 0.6 : 0.44) * cl, pan: (hi % 2 ? 0.22 : -0.22) });
              }
            }
          }

          // ---- LEAD: wire/glass. ARP (build 2nd half + drop) or FLOAT (breakdown).
          if (on.lead) {
            const reg = roleE.lead.register, ll = roleE.lead.level || 1, voice = roleE.lead.voice;
            if (L.leadMode === 'float') {
              // sparse high sustained tones drifting over the breakdown pad
              if (b % 2 === 0) {
                const pool = arpPool(chord, reg);
                const m = pool[pool.length - 1];
                notes.push({ beat: t0 + 0.5, durBeats: bb * 0.85, midi: m, voice, role: 'lead', vel: 0.55 * ll, weight: 0.6, pan: 0.35 * Math.sin(absBar) });
              }
            } else if (b === 0 || L.leadMode === 'arp') {
              // tile the committed arp cell across this bar (or its 2-bar span)
              const cell = plan.leadCell, cellBeats = cell.bars * bb;
              if (b % cell.bars === 0) {
                for (const [cbeat, idx] of cell.steps) {
                  const at = t0 + cbeat;
                  if (cbeat >= cellBeats || at >= bars * bb) continue;
                  const barOf = pos.bar + b + Math.floor(cbeat / bb);
                  const pool = arpPool(chordFor(barOf), reg);
                  notes.push({ beat: at, durBeats: 0.4, midi: pool[Math.min(idx, pool.length - 1)], voice, role: 'lead',
                    vel: (0.52 + 0.1 * vector.leadProm) * ll, weight: 0.4, pan: 0.3 * Math.sin(at * 0.7) });
                }
              }
            }
          }
        }

        // Fallback: if the layer cap stripped every voice this section would have
        // used (e.g. a breakdown with only the kick available), keep the pulse so
        // there is never a silent gap.
        if (!notes.length && roleE.kick) {
          for (let b = 0; b < bars; b++) for (let beat = 0; beat < bb; beat++)
            notes.push({ beat: b * bb + beat, durBeats: 0.5, voice: 'kick', role: 'kick', vel: 0.9 * (roleE.kick.level || 1) });
        }

        const last = pos.bar + bars >= plan.totalBars;
        return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity, last };
      },
    },
  });
})(typeof self !== 'undefined' ? self : this);
