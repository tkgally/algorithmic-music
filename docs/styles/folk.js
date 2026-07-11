/*
 * styles/folk — the Folk genre pack: a lively pan-European acoustic DANCE TUNE.
 *
 * This pack deliberately MELDS the European folk-dance family rather than
 * reproducing one national tradition (Tom's call): the shared traits that cut
 * across Celtic session tunes, Nordic fiddle music, Baltic drone-zither song,
 * Balkan aksak dances, klezmer, and the Central-European couple dances are the
 * material — modal melody, a sounding DRONE, dance meters, STRAIN form, and
 * ornamentation (wiki/european-folk-and-dance.md).
 *
 * The dance-tune universal this strategy is built on is the STRAIN FORM
 * (wiki/european-folk-and-dance.md §"The AABB strain form"): two 8-bar strains
 * A and B, each played twice — A A B B — and the whole tune cycled several
 * times, "played through" as a session set is. B contrasts by rising into a
 * higher register (the folk "turn"). Each strain keeps a committed rhythmic
 * MOTIF and contour so repeats are recognizable; the passing fill and the
 * grace-note ornaments vary from pass to pass, which is exactly the
 * heterophonic "same tune, small ornamental variation" the wiki describes for
 * session playing, and the last two bars of a strain are re-pointed on the
 * repeat (the "first/second ending" of a real dance tune).
 *
 * Meter is chosen by seed: a 4/4 reel (driving even eighths), a 6/8 jig (the
 * compound quarter+eighth "diddly" lilt), a 3/4 polska/waltz, or a Balkan aksak
 * 5/8 (2+3) / 7/8 (3+2+2) — the shared METERS table carries the aksak grouping
 * and accent beats, and the melody rhythm aligns to those accents automatically
 * (compose.barRhythm). No swing: the lilt comes from the meter and the
 * ornaments, not from a shuffle (wiki §"honesty labeling" — inspired by, not a
 * reproduction of, polska microtiming, which we do NOT claim to model here).
 *
 * Lead is fiddle-like (voice `aria`, bowed/expressive; `wire`/`reed` in the
 * alternate palettes). Harmony is drone- or modal-anchored (i–bVII / i–IV
 * oscillation), never functional V–I — routed through compose.progression's
 * 'drone'/'modal' paths per wiki/modal-and-nonfunctional-harmony.md. A `pluck`
 * box-zither/bouzouki strums broken chords on the beat, a `drum` frame-drum
 * pulses the meter accents with offbeat lifts, and a `shaker` fills eighths when
 * the density is high. Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const UNIT_BARS = 4;   // one unit = half a strain (a 4-bar phrase)
  const STRAIN_BARS = 8; // a strain is two 4-bar phrases; AABB = 32-bar cycle

  AM.styles.register({
    id: 'folk',
    name: 'Folk',
    order: 4,
    blurb: 'A lively pan-European dance tune — fiddle, drone, and frame drum',
    preset: {
      // Modal palette: dorian/mixolydian are the classic session "modal" colors
      // (♭7 or natural-6 minor), major the bright tune, natural minor the darker
      // one (wiki/european-folk-and-dance.md §"Modal melody").
      scale: { pick: ['dorian', 'mixolydian', 'major', 'naturalMinor'], w: [3, 3, 2, 2] },
      // D, G, A are the fiddle/whistle keys that favor open-string drones; E, C
      // round out the set (same page).
      tonicPc: { pick: [2, 7, 9, 4, 0], w: [3, 3, 2, 1, 1] },
      // Drone- or modal-anchored harmony, never functional (the load-bearing
      // modal-folk rule). Both route through compose.progression.
      harmonyType: { pick: ['drone', 'modal'], w: [2, 3] },
      harmonicRhythm: 1,
      harmRich: { range: [0.04, 0.24] },   // open triads, no lush 7ths
      timeline: 'none',
      // The dance meters. 6/8 jig and 4/4 reel lead; 3/4 (polska/waltz), 2/4
      // (polka), and the Balkan aksak 5/8 / 7/8 add variety by seed.
      meterId: { pick: ['6/8', '4/4', '3/4', '2/4', '5/8', '7/8'], w: [4, 4, 2, 1.5, 1, 1] },
      bpmBand: [96, 144],
      bpm: { range: [104, 132] },
      swing: 0, laidBack: 0, rubato: { range: [0.15, 0.35] },
      density: { range: [0.55, 0.82] }, interlock: { range: [0.15, 0.35] },
      leadProm: { range: [0.6, 0.82] }, melTex: { range: [0.08, 0.28] },
      // Dense, stepwise, wide-ish tune lines (fiddle idiom).
      grammar: { stepBias: 0.78, range: 16, leapMax: 7 },
      form: 'strain', arc: { pick: ['rise', 'terraced', 'arch', 'level', 'waves'], w: [3, 2, 2, 2, 1] },
      development: { range: [0.2, 0.4] }, variation: { range: [0.35, 0.6] },
      lengthSec: { pick: [95, 130, 165], w: [0.3, 0.5, 0.2] },
      // Dance tunes end crisply on the tonic downbeat ('stop'); some let the
      // final chord ring ('ringout').
      ending: { pick: ['stop', 'ringout'], w: [3, 1] },
      brightness: { range: [0.55, 0.75] }, dynRange: { range: [0.4, 0.62] },
      expression: { range: [0.45, 0.75] }, reverb: { range: [0.18, 0.34] }, width: { range: [0.5, 0.7] },
      moodModePool: ['naturalMinor', 'dorian', 'mixolydian', 'major', 'lydian'],
      // Ensemble & prios per the pack brief: lead 0, drone 1, pluck 2, drum 3,
      // shaker 4. The layer cap keeps the highest-prio N when the user thins.
      ensemble: [
        { role: 'lead', voice: 'aria', register: [62, 88], level: 1.0, prio: 0 },
        { role: 'drone', voice: 'drone', register: [38, 50], level: 0.66, prio: 1 },
        { role: 'pluck', voice: 'pluck', register: [50, 74], level: 0.5, prio: 2 },
        { role: 'drum', voice: 'drum', register: [45, 57], level: 0.6, prio: 3 },
        { role: 'shaker', voice: 'shaker', register: [0, 0], level: 0.42, prio: 4 },
      ],
      palettes: [
        { name: 'Fiddle band (bowed lead)', desc: 'a bowed fiddle leads the tune — the default', map: {} },
        { name: 'Piper (electric lead)', desc: 'a piercing lead stands in for pipes', map: { lead: 'wire' } },
        { name: 'Session (free-reed & bar)', desc: 'a reedy lead with a struck-bar backing', map: { lead: 'reed', pluck: 'mallet' } },
        { name: 'Singer (voice lead)', desc: 'a soft wordless voice carries the tune', map: { lead: 'voce' } },
      ],
    },

    strategy: {
      unitBars: UNIT_BARS,

      init(vector, rng) {
        // Size the piece to whole AABB cycles. barsForLength snaps to the 4-bar
        // unit; we then round to 2–4 cycles (each cycle = one time through the
        // 32-bar tune, the way a session plays a tune several times through).
        const target = C().barsForLength(vector, UNIT_BARS);
        const cycleBars = 4 * STRAIN_BARS; // A A B B
        const cycles = Math.max(2, Math.min(4, Math.round(target / cycleBars)));

        // Sections are whole strain STATEMENTS (8 bars). Extra fields (strain /
        // statement / cycleIdx) ride along on the section object — the composer
        // wrapper hands the whole object back as pos.section.
        const sections = [];
        for (let c = 0; c < cycles; c++) {
          sections.push({ role: 'A', bars: STRAIN_BARS, strain: 'A', statement: 0, cycleIdx: c });
          sections.push({ role: "A'", bars: STRAIN_BARS, strain: 'A', statement: 1, cycleIdx: c });
          sections.push({ role: 'B', bars: STRAIN_BARS, strain: 'B', statement: 0, cycleIdx: c });
          sections.push({ role: "B'", bars: STRAIN_BARS, strain: 'B', statement: 1, cycleIdx: c });
        }
        C().sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);

        // Committed identity (stays fixed for the whole piece so repeats are
        // recognizable): each strain's two-phrase HARMONY (as roman sequences,
        // re-realized against the LIVE key each pass so a live key/mode change
        // still transposes/recolors the tune), a rhythmic MOTIF, and a contour.
        // B's contour is chosen to contrast A's.
        const romans = (cadTail) => [
          C().progression(vector, UNIT_BARS, rng, { cadence: 'HC', openRoman: 'I' }).map((c) => c.roman),
          C().progression(vector, UNIT_BARS, rng, { cadence: cadTail, openRoman: 'I' }).map((c) => c.roman),
        ];
        const motifDensity = Math.max(0.6, vector.density); // a busy, dance-ready cell
        return {
          sections, totalBars,
          romansA: romans('PAC'), romansB: romans('PAC'),
          motifA: C().barRhythm(vector.meter, motifDensity, rng),
          motifB: C().barRhythm(vector.meter, motifDensity, rng),
          contourA: C().pickContour(rng),
          contourB: C().pickContour(rng, null),
          _lastVoicing: null,
        };
      },

      nextUnit(plan, vector, pos, rng) {
        if (pos.bar >= plan.totalBars) return null;
        const compose = C();
        const sec = pos.section;
        const meter = vector.meter;
        const bb = meter.barBeats;
        const compound = !!meter.compound;
        const accents = (meter.accents && meter.accents.length) ? meter.accents : [0];
        const bars = Math.min(UNIT_BARS, sec.bars - pos.barInSection);
        const lengthBeats = bars * bb;
        const half = pos.barInSection >= UNIT_BARS ? 1 : 0; // which 4-bar phrase of the strain
        const isFinalUnit = pos.bar + bars >= plan.totalBars;

        const ens = AM.style.effectiveEnsemble(vector);
        const byRole = {};
        for (const e of ens) byRole[e.role] = e;
        const lead = byRole.lead, drone = byRole.drone, pluck = byRole.pluck, drumV = byRole.drum, shakerV = byRole.shaker;

        // Intensity: dance music stays lively, so we floor it well above zero and
        // let the arc lift later cycles (wiki §"tune-set logic" — a set builds).
        const intensity = clamp(0.5 * sec.intensity + 0.5 * pos.arcLevel, 0.45, 1);

        // ---- register windows: B rises into "the turn" (higher) --------------
        const lr = lead ? lead.register : [62, 88];
        const aReg = [lr[0], Math.min(lr[1], lr[0] + 22)];
        const bReg = [Math.min(lr[1] - 12, lr[0] + 5), lr[1]];
        const reg = sec.strain === 'B' ? bReg : aReg;
        const pool = compose.scalePool(vector, reg);
        const density = clamp(vector.density, 0.1, 1);

        // ---- harmony: re-realize this strain-phrase's committed romans --------
        const romanSeq = (sec.strain === 'B' ? plan.romansB : plan.romansA)[half];
        const chords = realizeChords(vector, romanSeq);
        const finalChord = chords[chords.length - 1];

        // ---- lead: the fiddle tune -------------------------------------------
        const notes = [];
        if (lead) {
          const motif = sec.strain === 'B' ? plan.motifB : plan.motifA;
          const contour = sec.strain === 'B' ? plan.contourB : plan.contourA;
          // half 0 = antecedent (open, half-close feel); half 1 = consequent
          // (closes to the tonic — every strain lands home).
          const cadence = half === 0 ? 'HC' : 'PAC';
          const mel = compose.melodyPhrase(vector, chords, rng, {
            bars, register: reg, cadence, contour, motif,
            centerOffset: sec.strain === 'B' ? 3 : 0,
            densityScale: 1.15, // push toward dense stepwise eighth-note lines
          });
          let line = mel.notes;
          // On a REPEAT statement (or any later cycle), re-point the last two
          // bars of the consequent — the dance-tune "second ending."
          if (half === 1 && (sec.statement === 1 || sec.cycleIdx > 0)) {
            line = varyTail(line, pool, vector, rng, (bars - 2) * bb);
          }
          // Ornaments: grace-note cuts/rolls just before the beat, at a rate set
          // by expression (wiki/european-folk-and-dance.md §"Ornamentation").
          line = addGraces(line, pool, vector, rng);
          const leadVelBase = 0.6 + 0.18 * vector.leadProm;
          for (const n of line) {
            notes.push(Object.assign({}, n, {
              voice: lead.voice, role: 'lead',
              vel: (n.vel != null ? n.vel : leadVelBase) * (lead.level || 1),
              tags: (n.tags || []).concat(n.beat < 1e-6 ? ['phraseStart'] : []),
            }));
          }
        }

        // ---- drone: a single sounding tonic under the whole unit -------------
        // (the box-zither / pipes floor; the voice adds its own fifth). One long
        // note per unit so it breathes rather than re-attacking every bar.
        if (drone) {
          const dmidi = compose.nearestBassNote(vector.tonicPc, drone.register);
          notes.push({
            beat: 0, durBeats: lengthBeats, midi: dmidi, voice: drone.voice, role: 'drone',
            vel: (0.62 + 0.16 * intensity) * (drone.level || 1), weight: 0.5,
          });
        }

        // ---- pluck: broken-chord strum on the beat (bouzouki / kanklės) ------
        if (pluck) {
          let voicing = plan._lastVoicing;
          const strumVel = 0.44 + 0.1 * intensity;
          for (const ch of chords) {
            voicing = compose.voiceChord(ch, pluck.register, voicing, vector.harmRich, rng);
            folkStrum(meter, ch.notes, voicing, ch.beat, density, strumVel, notes, pluck);
          }
          plan._lastVoicing = voicing;
        }

        // ---- drum: frame-drum pulse on the meter accents + offbeat lifts -----
        if (drumV) {
          const dyn = 0.82 + 0.18 * intensity;
          for (let bar = 0; bar < bars; bar++) {
            const at = bar * bb;
            for (const a of accents) {
              const down = a < 1e-6;
              notes.push({
                beat: at + a, durBeats: 0.4, midi: down ? 47 : 54, voice: drumV.voice, role: 'drum',
                vel: (down ? 0.47 : 0.4) * dyn, tags: [down ? 'open' : 'tone'], p: { decay: 1.1 },
              });
            }
            // offbeat "lift" hits on the eighths between accents, thinned by density
            for (let b = 0.5; b < bb - 1e-6; b += 0.5) {
              if (accents.some((a) => Math.abs(a - b) < 1e-6)) continue;
              if (rng.bool(0.14 + density * 0.5)) {
                notes.push({ beat: at + b, durBeats: 0.3, midi: 57, voice: drumV.voice, role: 'drum', vel: 0.3 * dyn, tags: ['mute'], p: { decay: 0.9 } });
              }
            }
          }
        }

        // ---- shaker: eighth-note fill when the tune is busy ------------------
        if (shakerV && density > 0.5 && intensity > 0.52) {
          for (let bar = 0; bar < bars; bar++) {
            const at = bar * bb;
            for (let b = 0; b < bb - 1e-6; b += 0.5) {
              const acc = accents.some((a) => Math.abs(a - b) < 1e-6);
              // Thinned from a wall of eighths: accents always, other positions
              // gated — fewer noise transients into the master shaper/compressor
              // keeps the offline render reproducible while still lifting the beat.
              if (acc || rng.bool(0.32 + density * 0.4)) {
                notes.push({
                  beat: at + b, durBeats: 0.2, voice: shakerV.voice, role: 'shaker',
                  vel: (acc ? 0.4 : 0.3) * (0.85 + 0.15 * intensity),
                  tags: acc ? ['accent'] : [], p: { bright: 1.05 },
                });
              }
            }
          }
        }

        // ---- ending: crisp unison tonic 'stop', or a ringing 'ringout' -------
        if (isFinalUnit) shapeEnding(notes, vector, plan, { bars, bb, aReg, finalChord, lead, drone, pluck, drumV, shakerV, rng, lengthBeats });

        return {
          notes, lengthBeats, bars, section: sec.role,
          intensity, last: isFinalUnit,
        };
      },
    },
  });

  // ===========================================================================
  // Helpers (function declarations — hoisted, so the strategy above can call
  // them; the classical.js pattern).
  // ===========================================================================

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pc(m) { return ((Math.round(m) % 12) + 12) % 12; }

  // Turn a committed roman sequence into concrete chord slots against the LIVE
  // key/scale (so a live key or mode change transposes/recolors the tune while
  // keeping its harmonic identity). Mirrors compose.progression's output shape:
  // { notes, seventhNotes, bassPc, beat, durBeats } — all melodyPhrase / voiceChord
  // / the drone need.
  function realizeChords(vector, romanSeq) {
    const table = C().chordTable(vector);
    const bb = vector.meter.barBeats;
    const barsPerSlot = UNIT_BARS / romanSeq.length;
    const fallback = table.i || table.I || Object.values(table)[0];
    return romanSeq.map((rm, i) => {
      const c = table[rm] || fallback;
      return {
        roman: c.roman, degree: c.degree, quality: c.quality,
        notes: c.notes.slice(), seventhNotes: (c.seventhNotes || c.notes).slice(),
        bassPc: pc(c.notes[0]),
        beat: i * barsPerSlot * bb, durBeats: barsPerSlot * bb,
      };
    });
  }

  // The scale tone one step above/below `midi` within `pool` (for grace notes
  // and tail variation).
  function stepNeighbor(pool, midi, up) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = Math.abs(pool[i] - midi);
      if (d < best) { best = d; idx = i; }
    }
    const j = up ? Math.min(pool.length - 1, idx + 1) : Math.max(0, idx - 1);
    return pool[j];
  }

  // Grace-note ornaments: a short note a scale-step above (a "cut") or below (a
  // "tap") the main note, landing just before its beat. Rate scales with
  // expression and density; cuts are favored over taps. (wiki/european-folk-and-
  // dance.md §"Ornamentation" — the roll/cut/tap grace-note category.)
  function addGraces(notes, pool, vector, rng) {
    const rate = clamp(0.1 + 0.55 * vector.expression + 0.12 * (vector.density - 0.5), 0, 0.7);
    const gLen = vector.meter.compound ? 0.14 : 0.12;
    const out = [];
    let lastGrace = -1;
    for (const n of notes) {
      if (n.midi != null && n.beat - gLen > 0.01 && n.durBeats >= 0.45 &&
          n.beat - lastGrace > 0.5 && rng.bool(rate)) {
        const up = rng.bool(0.62);
        const gm = stepNeighbor(pool, n.midi, up);
        if (gm !== n.midi) {
          out.push({ beat: n.beat - gLen, durBeats: gLen * 0.9, midi: gm, vel: 0.42, weight: 0.28, tags: ['grace'] });
          lastGrace = n.beat;
        }
      }
      out.push(n);
    }
    return out;
  }

  // Re-point the last bars of a consequent phrase on a repeat: nudge some notes
  // to a neighboring scale tone (never the final cadence tone), so the "second
  // ending" differs without losing the tune.
  function varyTail(notes, pool, vector, rng, fromBeat) {
    const amt = clamp(0.25 + vector.variation * 0.5, 0, 0.8);
    return notes.map((n) => {
      const isCad = n.tags && n.tags.some((t) => t.indexOf('cadence') === 0);
      if (n.midi != null && n.beat >= fromBeat - 1e-6 && !isCad && rng.bool(amt * 0.5)) {
        return Object.assign({}, n, { midi: stepNeighbor(pool, n.midi, rng.bool(0.5)) });
      }
      return n;
    });
  }

  // One bar of plucked accompaniment, feel by meter. Stacked upper-chord notes
  // sharing an onset are rolled low->high downstream (perform.js), so a single
  // beat reads as a broken-chord strum. `chordNotes`/`voicing` are midi arrays.
  function folkStrum(meter, chordNotes, voicing, atBeat, density, baseVel, out, part) {
    const bb = meter.barBeats;
    const low = voicing[0];
    const up = voicing.slice(1);
    const V = part.voice, level = part.level || 1;
    const push = (b, d, m, v) => out.push({ beat: atBeat + b, durBeats: d, midi: m, voice: V, role: 'pluck', vel: v * level });
    if (meter.compound) {
      // 6/8 jig: chord on each dotted-quarter beat (0, 1.5), a lift before beat 2.
      for (const beat of [0, 1.5]) {
        push(beat, 0.5, low, baseVel * 0.92);
        for (const m of up) push(beat, 0.85, m, baseVel * 0.66);
      }
      if (density > 0.5) for (const m of up) push(1.0, 0.4, m, baseVel * 0.48);
    } else if (bb === 3) {
      // 3/4 waltz/polska: oom-pah-pah.
      push(0, 0.9, low, baseVel * 0.95);
      for (const b of [1, 2]) for (const m of up) push(b, 0.7, m, baseVel * 0.62);
    } else {
      // duple / aksak: bass "chunk" on the accents, chord "chick" on the and.
      const acc = (meter.accents && meter.accents.length) ? meter.accents : [0];
      for (const a of acc) push(a, 0.5, low, baseVel * 0.9);
      for (const a of acc) { const b = a + 0.5; if (b < bb - 1e-6) for (const m of up) push(b, 0.45, m, baseVel * 0.62); }
      if (density > 0.62) {
        for (let b = 1; b < bb - 1e-6; b += 1) {
          if (acc.some((a) => Math.abs(a - b) < 1e-6)) continue;
          for (const m of up) push(b, 0.4, m, baseVel * 0.5);
        }
      }
    }
  }

  // Shape the piece's final unit: 'stop' lands a crisp unison tonic hit on the
  // last downbeat and clears the bar behind it; 'ringout' sustains the closing
  // tonic + drone (perform.js adds a ritardando for ringout).
  function shapeEnding(notes, vector, plan, ctx) {
    const { bars, bb, aReg, finalChord, lead, drone, pluck, drumV, shakerV, rng, lengthBeats } = ctx;
    const fdb = (bars - 1) * bb; // final downbeat
    const midPool = C().scalePool(vector, aReg);
    const tonicMid = C().nearestInPool(midPool, (aReg[0] + aReg[1]) / 2 - 2, new Set([vector.tonicPc]));

    if (vector.ending === 'stop') {
      // clear the final bar (except the drone, which we shorten to stop with the hit)
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        if (n.role === 'drone') { n.durBeats = Math.min(n.durBeats, fdb + 1); continue; }
        if (n.beat >= fdb - 0.25) notes.splice(i, 1);
      }
      if (lead && tonicMid != null) notes.push({ beat: fdb, durBeats: 1.0, midi: tonicMid, voice: lead.voice, role: 'lead', vel: 0.78 * (lead.level || 1), weight: 0.9, tags: ['ending'] });
      if (pluck) { const v = C().voiceChord(finalChord, pluck.register, plan._lastVoicing, vector.harmRich, rng); for (const m of v) notes.push({ beat: fdb, durBeats: 0.9, midi: m, voice: pluck.voice, role: 'pluck', vel: 0.6 * (pluck.level || 1), tags: ['ending'] }); }
      if (drumV) notes.push({ beat: fdb, durBeats: 0.5, midi: 47, voice: drumV.voice, role: 'drum', vel: 0.5, tags: ['open', 'ending'] });
      if (shakerV) notes.push({ beat: fdb, durBeats: 0.2, voice: shakerV.voice, role: 'shaker', vel: 0.38, tags: ['accent', 'ending'] });
    } else {
      // ringout: extend the closing tonic and the drone to ring past the barline
      const ring = lengthBeats - fdb + bb * 0.4;
      let lastLead = null;
      for (const n of notes) {
        if (n.role === 'drone') { n.durBeats = lengthBeats - n.beat + bb * 0.4; }
        if (n.role === 'lead' && (!lastLead || n.beat > lastLead.beat)) lastLead = n;
      }
      if (lastLead) { lastLead.durBeats = Math.max(lastLead.durBeats, lengthBeats - lastLead.beat + bb * 0.4); lastLead.tags = (lastLead.tags || []).concat(['ending']); }
      else if (lead && tonicMid != null) notes.push({ beat: fdb, durBeats: ring, midi: tonicMid, voice: lead.voice, role: 'lead', vel: 0.7 * (lead.level || 1), weight: 0.85, tags: ['ending', 'cadence:PAC'] });
      if (pluck) { const v = C().voiceChord(finalChord, pluck.register, plan._lastVoicing, vector.harmRich, rng); for (const m of v) notes.push({ beat: fdb, durBeats: ring, midi: m, voice: pluck.voice, role: 'pluck', vel: 0.58 * (pluck.level || 1), tags: ['ending'] }); }
    }
  }
})(typeof self !== 'undefined' ? self : this);
