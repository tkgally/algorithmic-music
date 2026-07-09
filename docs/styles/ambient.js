/*
 * styles/ambient — the Ambient genre pack: preset region + incremental compose
 * strategy. Generalizes the proven ambient-drift engine (Engine 02, v0.1.2):
 * Eno's Music-for-Airports recipe — a handful of loops with mutually
 * incommensurable periods over a slow modal drift — now emitted just-in-time:
 * each unit is a window of nominal time, and every loop contributes the onsets
 * that fall inside the window, so the piece can run indefinitely and respond
 * to live changes while never repeating its global configuration.
 *
 * This pack also proves the FREE-TIME path of the site pipeline: no meter, no
 * swing, no metric accents; the performer's beat grid is just a nominal ruler.
 *
 * Engine-02 lessons carried over (wiki/findings-ambient-drift-engine.md):
 * pad crossfades kept short (the v0.1.2 roughness fix), bell polyphony capped
 * at 4, dark long reverb, fade ending. Musical basis:
 * wiki/ambient-and-generative-genre.md. Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const UNIT_BEATS = 4;              // one nominal "bar" per unit
  const LOOP_PERIODS = [17.5, 23, 28.5, 32.1, 40]; // mutually incommensurable (Engine 02)

  AM.styles.register({
    id: 'ambient',
    name: 'Ambient',
    order: 1,
    blurb: 'A calm, slowly evolving wash of tones — atmosphere, not a tune',
    preset: {
      scale: { pick: ['majorPentatonic', 'minorPentatonic', 'dorian', 'lydian'], w: [3, 2, 2, 2] },
      tonicPc: { pick: [0, 2, 3, 5, 7, 9] },
      harmonyType: 'drone',
      harmonicRhythm: 0.25,
      harmRich: { range: [0.1, 0.3] },
      timeline: 'none',
      meterId: 'free',
      bpmBand: [30, 52],
      bpm: { range: [34, 46] },
      swing: 0, laidBack: 0, rubato: 0.3,
      density: { range: [0.3, 0.55] }, interlock: 0,
      leadProm: { range: [0.35, 0.55] }, melTex: { range: [0.7, 0.95] },
      form: 'drift', arc: { pick: ['level', 'arch', 'waves'], w: [3, 2, 1] },
      development: { range: [0.1, 0.3] }, variation: { range: [0.2, 0.4] },
      lengthSec: { pick: [150, 190, 240], w: [0.3, 0.5, 0.2] },
      ending: 'fade',
      brightness: { range: [0.3, 0.5] }, dynRange: { range: [0.2, 0.4] },
      expression: { range: [0.3, 0.5] }, reverb: { range: [0.5, 0.8] }, width: { range: [0.6, 0.85] },
      moodModePool: ['naturalMinor', 'dorian', 'minorPentatonic', 'majorPentatonic', 'lydian'],
      ensemble: [
        { role: 'drone', voice: 'drone', register: [33, 45], level: 0.7, prio: 0 },
        { role: 'pad', voice: 'pad', register: [48, 67], level: 0.55, prio: 1 },
        { role: 'lead', voice: 'bell', register: [64, 88], level: 0.8, prio: 2 },
        { role: 'tex', voice: 'glass', register: [55, 79], level: 0.4, prio: 3 },
      ],
      palettes: [
        { name: 'warm (bell & pad)', map: {} },
        { name: 'dark (low glass)', map: { lead: 'glass', tex: 'pad' } },
        { name: 'air (high chime)', map: { lead: 'chime', tex: 'bell' } },
      ],
    },

    strategy: {
      unitBars: 1,

      init(vector, rng) {
        const spb = 60 / vector.bpm;
        const unitSec = UNIT_BEATS * spb;
        const totalSec = Math.max(60, vector.lengthSec || 190);
        const totalBars = Math.max(8, Math.round(totalSec / unitSec));
        // Modal drift: regions ~45-70 s, each shifting the pitch center around
        // the home tonic (Engine 02's slow drift; always returns home at the end).
        const regionSec = 45 + 25 * rng.next();
        const regionCount = Math.max(2, Math.round(totalSec / regionSec));
        const DRIFTS = [0, -2, 5, 0, 3, -4]; // semitone offsets of the drift path
        const regions = [];
        for (let i = 0; i < regionCount; i++) {
          regions.push({
            offset: i === 0 || i === regionCount - 1 ? 0 : DRIFTS[i % DRIFTS.length],
            padShape: rng.int(0, 2),
          });
        }
        // The loops: one per ensemble role instance, mutually incommensurable
        // periods, each with a stable per-loop pitch habit (a loop IS its notes).
        const ens = AM.style.effectiveEnsemble(vector);
        const loops = [];
        let pi = 0;
        for (const e of ens) {
          const period = LOOP_PERIODS[pi % LOOP_PERIODS.length] * (1 + 0.04 * rng.next());
          pi++;
          loops.push({
            role: e.role, voice: e.voice, register: e.register, level: e.level,
            periodSec: period,
            // stagger starts inside the opening seconds (never a long empty lead-in;
            // the drone anchors from the top)
            offsetSec: e.role === 'drone' ? 0.5 : 1 + rng.next() * 9,
            // drone stays legato: successive notes overlap slightly (Engine 02's
            // 8s drone overlap, scaled) so the floor never drops out
            durSec: e.role === 'drone' ? period * 1.05 : e.role === 'pad' ? 14 + 6 * rng.next() : 3.5 + 4 * rng.next(),
            degreeSeq: [rng.int(0, 4), rng.int(0, 4), rng.int(0, 4)], // per-loop melodic habit
            vel: e.role === 'lead' ? 0.62 : e.role === 'tex' ? 0.4 : 0.7,
          });
        }
        const sections = [{ role: 'drift', bars: totalBars, intensity: 0.55 }];
        C().sectionIntensities(sections, vector.arc);
        return { sections, totalBars, regions, regionSec, loops, unitSec, spb, bellsSounding: [] };
      },

      nextUnit(plan, vector, pos, rng) {
        if (pos.bar >= plan.totalBars) return null;
        const spb = 60 / vector.bpm;             // read live (tempo can change)
        const T0 = pos.bar * UNIT_BEATS * plan.spb; // nominal timeline uses the plan ruler
        const T1 = T0 + UNIT_BEATS * plan.spb;
        const region = plan.regions[Math.min(plan.regions.length - 1, Math.floor(T0 / plan.regionSec))];
        const pool = C().scalePool(vector, [36, 90]).map((m) => m + region.offset);
        const notes = [];
        const level = 0.35 + 0.65 * pos.arcLevel;
        const densityGate = 0.25 + vector.density * 0.75;

        // drop loops beyond the layer cap / current ensemble (live layer changes)
        const ens = AM.style.effectiveEnsemble(vector);
        const activeRoles = {};
        for (const e of ens) activeRoles[e.role + ':' + e.voice] = e;

        for (const loop of plan.loops) {
          const e = activeRoles[loop.role + ':' + loop.voice] || (ens.find((x) => x.role === loop.role) ? loop : null);
          if (!e) continue;
          // every onset of this loop that falls inside [T0, T1)
          for (let k = Math.ceil((T0 - loop.offsetSec) / loop.periodSec); ; k++) {
            const onset = loop.offsetSec + k * loop.periodSec;
            if (onset >= T1) break;
            if (onset < T0) continue;
            // density thins the sparkle loops (drone and pad anchor the wash)
            if (loop.role !== 'drone' && loop.role !== 'pad' && rng.next() > densityGate) continue;
            // bell polyphony cap (Engine 02 v0.1.2 roughness fix)
            if (loop.role === 'lead' || loop.role === 'tex') {
              plan.bellsSounding = plan.bellsSounding.filter((end) => end > onset);
              if (plan.bellsSounding.length >= 4) continue;
              plan.bellsSounding.push(onset + Math.min(loop.durSec, 8));
            }
            const beat = (onset - T0) / plan.spb;
            let midi;
            if (loop.role === 'drone') {
              midi = nearestTo(pool, loop.register[0] + 3 + region.offset, vector.tonicPc + region.offset);
            } else if (loop.role === 'pad') {
              // a small chord, voiced inside the pad register (short overlap only)
              const table = C().chordTable(vector);
              const chord = table[Object.keys(table)[0]];
              const voicing = C().voiceChord(chord, loop.register.map((x) => x + region.offset), null, vector.harmRich, rng);
              const durBeats = Math.min((T1 - onset) / plan.spb + 4 / plan.spb, loop.durSec / plan.spb);
              for (const m of voicing.slice(0, 3)) {
                notes.push({ beat, durBeats, midi: m, voice: loop.voice, role: loop.role, vel: loop.vel * level * 0.55, weight: 0.3 });
              }
              continue;
            } else {
              // lead/tex: walk the loop's degree habit through the pool
              const step = loop.degreeSeq[k % loop.degreeSeq.length];
              const center = (loop.register[0] + loop.register[1]) / 2 + region.offset;
              const cands = pool.filter((m) => m >= loop.register[0] && m <= loop.register[1] + region.offset);
              midi = cands.length ? cands[Math.max(0, Math.min(cands.length - 1, Math.floor(cands.length / 2) + step - 2))] : Math.round(center);
            }
            const durBeats = loop.durSec / plan.spb;
            notes.push({
              beat, durBeats, midi, voice: loop.voice, role: loop.role,
              vel: loop.vel * level * (loop.role === 'drone' ? 1 : 0.85 + 0.3 * rng.next()),
              weight: 0.4, pan: loop.role === 'lead' || loop.role === 'tex' ? (rng.next() * 1.2 - 0.6) : 0,
            });
          }
        }

        const last = pos.bar + 1 >= plan.totalBars;
        return {
          notes, lengthBeats: UNIT_BEATS, bars: 1,
          section: 'drift', intensity: 0.4 + 0.5 * pos.arcLevel, last,
        };
      },
    },
  });

  function nearestTo(pool, target, pc) {
    let best = null, bestD = Infinity;
    for (const m of pool) {
      if (pc != null && ((m % 12) + 12) % 12 !== ((pc % 12) + 12) % 12) continue;
      const d = Math.abs(m - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best == null ? Math.round(target) : best;
  }
})(typeof self !== 'undefined' ? self : this);
