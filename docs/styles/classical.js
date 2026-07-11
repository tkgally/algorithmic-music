/*
 * styles/classical — the Classical genre pack: preset region + incremental
 * compose strategy. The site's walking-skeleton genre (site-architecture §10
 * M2), generalizing the proven tonal-classical engine (Engine 01, v0.3.1):
 * a tuneful functional-tonal piece that begins, develops, and resolves —
 * intro · A (parallel period) · B (contrast) · A′ (ornamented restatement) ·
 * coda — now composed one phrase at a time by the JIT loop instead of
 * up-front, so live changes land on future phrases.
 *
 * Musical basis: wiki/western-classical-tradition.md (functional harmony,
 * period phrase structure, rounded ternary), wiki/melody.md (contour
 * archetypes, apex uniqueness), wiki/phrase-structure.md (antecedent/
 * consequent, cadence goals), via the shared compose.js machinery which
 * reimplements the tested tonal-phrase composer in vector-driven form.
 * Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const PHRASE_BARS = 4;

  AM.styles.register({
    id: 'classical',
    name: 'Classical',
    order: 0,
    blurb: 'A tuneful piano/chamber piece that begins, develops, and resolves',
    preset: {
      scale: { pick: ['major', 'major', 'naturalMinor'] },
      tonicPc: { pick: [0, 2, 4, 5, 7, 9, 10] },
      harmonyType: 'functional',
      harmonicRhythm: 1,
      harmRich: { range: [0.1, 0.4] },
      timeline: 'none',
      meterId: { pick: ['4/4', '4/4', '3/4'] },
      bpmBand: [66, 140],
      bpm: { range: [96, 124] },
      swing: 0, laidBack: 0.3, rubato: { range: [0.45, 0.75] },
      density: { range: [0.45, 0.65] }, interlock: 0.1,
      leadProm: { range: [0.55, 0.75] }, melTex: { range: [0.1, 0.35] },
      grammar: { stepBias: 0.72, range: 16, leapMax: 9 },
      form: 'roundedTernary', arc: { pick: ['arch', 'lateArch', 'rise'], w: [3, 2, 1] },
      development: { range: [0.3, 0.55] }, variation: { range: [0.35, 0.6] },
      lengthSec: { pick: [95, 130, 165], w: [0.3, 0.5, 0.2] },
      ending: 'cadence',
      brightness: { range: [0.4, 0.6] }, dynRange: { range: [0.45, 0.7] },
      expression: { range: [0.5, 0.75] }, reverb: { range: [0.2, 0.32] }, width: 0.55,
      moodModePool: ['naturalMinor', 'naturalMinor', 'dorian', 'major', 'lydian'],
      ensemble: [
        { role: 'lead', voice: 'melody', register: [62, 86], level: 1.0, prio: 0 },
        { role: 'comp', voice: 'chord', register: [50, 71], level: 0.45, prio: 1 },
        { role: 'bass', voice: 'bass', register: [36, 55], level: 0.8, prio: 2 },
      ],
      palettes: [
        { name: 'Piano & strings', desc: 'a keyboard lead over a string comp — the default', map: {} },
        { name: 'Chamber (bowed lead)', desc: 'a warm bowed-string lead, chamber-music feel', map: { lead: 'aria' } },
        { name: 'Glass & pluck', desc: 'a pure glass lead over a plucked comp', map: { lead: 'glass', comp: 'pluck' } },
        { name: 'Horn & strings', desc: 'a dark, blooming brass-like lead over the strings', map: { lead: 'horn' } },
      ],
    },

    strategy: {
      unitBars: PHRASE_BARS,

      init(vector, rng) {
        // Scale the rounded-ternary form to the target length: every section a
        // multiple of the 4-bar phrase, intro/coda short, and as many B + A′
        // digression-return cycles as the target needs (development returns).
        const totalTarget = C().barsForLength(vector, PHRASE_BARS);
        const aBars = 2 * PHRASE_BARS;                       // one period (ant + cons)
        const bBars = 2 * PHRASE_BARS;
        const cycles = Math.max(1, Math.round((totalTarget - 4 - aBars) / (bBars + aBars)));
        const sections = [
          { role: 'intro', bars: 2 },
          { role: 'A', bars: aBars },
        ];
        for (let i = 0; i < cycles; i++) {
          sections.push({ role: i === 0 ? 'B' : 'B' + (i + 1), bars: bBars });
          sections.push({ role: i === 0 ? "A'" : "A'" + (i + 1), bars: aBars });
        }
        sections.push({ role: 'coda', bars: 2 });
        C().sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);
        return {
          sections, totalBars,
          contour: null,           // piece contour archetype, picked at first phrase
          bContour: null,
          memo: {},                // composed-A memo for the A' restatement
          compStyleBySection: {},  // committed comp template per section
        };
      },

      nextUnit(plan, vector, pos, rng) {
        const compose = C();
        if (pos.bar >= plan.totalBars) return null;
        const sec = pos.section;
        const ens = AM.style.effectiveEnsemble(vector);
        // role fallbacks so a MELD ensemble (another genre's role names) still
        // fills the three functions this strategy composes for
        const lead = ens.find((e) => e.role === 'lead') || ens.find((e) => e.role === 'counter');
        const comp = ens.find((e) => e.role === 'comp') || ens.find((e) => e.role === 'pad');
        const bass = ens.find((e) => e.role === 'bass') || ens.find((e) => e.role === 'drone');
        const bb = vector.meter.barBeats;
        const notes = [];
        const isLastSection = pos.sectionIdx === plan.sections.length - 1;

        // ---- intro: comp+bass set the key (2 bars of tonic-dominant vamp) ----
        if (sec.role === 'intro') {
          const bars = sec.bars;
          const chords = compose.progression(vector, bars, rng, { cadence: 'none', openRoman: null });
          let voicing = null;
          chords.forEach((ch, i) => {
            if (comp) {
              voicing = compose.voiceChord(ch, comp.register, voicing, vector.harmRich, rng, { vector });
              for (const n of compose.compBar(vector, ch, ch.beat, voicing, 'broken', rng)) {
                notes.push(Object.assign(n, { voice: comp.voice, role: 'comp', vel: (n.vel || 0.7) * 0.55 * (comp.level || 1) }));
              }
            }
            if (bass) for (const n of compose.bassBar(vector, ch, chords[i + 1], ch.beat, bass.register, rng, {}))
              notes.push(Object.assign(n, { voice: bass.voice, role: 'bass', vel: (n.vel || 0.85) * 0.8 * (bass.level || 1) }));
          });
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity * 0.8, last: false };
        }

        // ---- coda: broaden into a real ending (lengthened final tonic) ----
        if (sec.role === 'coda') {
          const bars = sec.bars;
          const chords = compose.progression(vector, bars, rng, { cadence: 'PAC' });
          let voicing = null;
          chords.forEach((ch, i) => {
            if (comp) {
              voicing = compose.voiceChord(ch, comp.register, voicing, vector.harmRich, rng, { vector });
              for (const n of compose.compBar(vector, ch, ch.beat, voicing, i === chords.length - 1 ? 'pad' : 'broken', rng))
                notes.push(Object.assign(n, { voice: comp.voice, role: 'comp', vel: (n.vel || 0.7) * 0.5, tags: i === chords.length - 1 ? ['ending'] : [] }));
            }
            if (bass) for (const n of compose.bassBar(vector, ch, chords[i + 1], ch.beat, bass.register, rng, { sustain: i === chords.length - 1 }))
              notes.push(Object.assign(n, { voice: bass.voice, role: 'bass', vel: (n.vel || 0.85) * 0.8, tags: i === chords.length - 1 ? ['ending'] : [] }));
          });
          // melodic 3̂–2̂–1̂ close over the final bars
          if (lead) {
            const pool = compose.scalePool(vector, lead.register);
            const t = vector.tonicPc;
            const hs = compose.harmonicScale(vector.scale);
            const deg = (d) => ((AM.theory.scaleDegree(24 + t, hs, d) % 12) + 12) % 12;
            const center = (lead.register[0] + lead.register[1]) / 2 - 3;
            const three = compose.nearestInPool(pool, center, new Set([deg(3)]));
            const two = compose.nearestInPool(pool, center, new Set([deg(2)]));
            const one = compose.nearestInPool(pool, center - 2, new Set([t]));
            const L = bars * bb;
            if (three != null) notes.push({ beat: 0, durBeats: Math.min(2, bb / 2), midi: three, voice: lead.voice, role: 'lead', vel: 0.62, weight: 0.6 });
            if (two != null) notes.push({ beat: Math.min(2, bb / 2), durBeats: bb - Math.min(2, bb / 2), midi: two, voice: lead.voice, role: 'lead', vel: 0.58, weight: 0.62 });
            if (one != null) notes.push({ beat: bb, durBeats: L - bb, midi: one, voice: lead.voice, role: 'lead', vel: 0.66, weight: 0.9, tags: ['ending'] });
          }
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last: true };
        }

        // ---- main sections: one 4-bar phrase per unit ----
        const bars = Math.min(PHRASE_BARS, sec.bars - pos.barInSection);
        const phraseInSection = Math.floor(pos.barInSection / PHRASE_BARS);
        const isAnte = phraseInSection % 2 === 0;
        const isRestate = sec.role.indexOf("A'") === 0;
        const isB = sec.role[0] === 'B';
        const cadence = isAnte && bars >= PHRASE_BARS ? 'HC' : 'PAC';

        // harmony: B opens off-tonic (vi/iv) and re-approaches the dominant
        const openRoman = isB ? (compose.harmonicScale(vector.scale) === 'major' ? rng.pick(['vi', 'IV']) : rng.pick(['VI', 'iv'])) : 'I';
        let chords;
        const memoKey = sec.role[0] + ':' + phraseInSection;
        if (isRestate && plan.memo['A:' + phraseInSection]) {
          chords = plan.memo['A:' + phraseInSection].chords; // A' restates A's harmony
        } else {
          chords = compose.progression(vector, bars, rng, { cadence, openRoman });
        }

        // melody: contour per piece, contrasting for B; parallel period = the
        // consequent reuses the antecedent's motif (and A' reuses A wholesale,
        // ornamented by diminution)
        if (!plan.contour) plan.contour = compose.pickContour(rng);
        if (isB && !plan.bContour) plan.bContour = compose.pickContour(rng, plan.contour.id);
        let mel;
        if (isRestate && plan.memo['A:' + phraseInSection]) {
          const src = plan.memo['A:' + phraseInSection].mel;
          mel = { notes: ornament(src.notes, vector, rng, bb), motif: src.motif };
        } else if (lead) {
          const motif = isAnte ? null : (plan.memo[sec.role + ':motif'] || null);
          const reg = isB ? [lead.register[0] - 5, lead.register[1] - 5] : lead.register;
          mel = compose.melodyPhrase(vector, chords, rng, {
            bars, register: reg, cadence,
            contour: isB ? plan.bContour : plan.contour,
            motif, centerOffset: isB ? -2 : 0,
            densityScale: 1 - vector.melTex * 0.5,
          });
          if (isAnte) plan.memo[sec.role + ':motif'] = mel.motif;
        } else mel = { notes: [] };
        if (sec.role === 'A') plan.memo['A:' + phraseInSection] = { chords, mel };
        if (lead) for (const n of mel.notes) notes.push(Object.assign({}, n, {
          voice: lead.voice, role: 'lead',
          vel: (0.62 + 0.16 * vector.leadProm) * (lead.level || 1),
          tags: (n.tags || []).concat(n.beat === 0 ? ['phraseStart'] : []),
        }));

        // accompaniment: committed comp template per section, varied per bar
        if (!plan.compStyleBySection[sec.role]) {
          plan.compStyleBySection[sec.role] = rng.pick(['broken', 'arp', 'boomchick', 'stabs']);
        }
        let voicing = plan.memo._lastVoicing || null;
        chords.forEach((ch, i) => {
          if (comp) {
            voicing = compose.voiceChord(ch, comp.register, voicing, vector.harmRich, rng, { vector });
            const tmpl = rng.bool(0.25 + vector.variation * 0.3) ? rng.pick(['broken', 'arp', 'pad', 'stabs']) : plan.compStyleBySection[sec.role];
            for (const n of compose.compBar(vector, ch, ch.beat, voicing, tmpl, rng))
              notes.push(Object.assign(n, { voice: comp.voice, role: 'comp', vel: (n.vel || 0.7) * (0.42 + 0.1 * (1 - vector.leadProm)) * (comp.level || 1) }));
          }
          if (bass) for (const n of compose.bassBar(vector, ch, chords[i + 1], ch.beat, bass.register, rng, {}))
            notes.push(Object.assign(n, { voice: bass.voice, role: 'bass', vel: (n.vel || 0.85) * 0.78 * (bass.level || 1) }));
        });
        plan.memo._lastVoicing = voicing;

        const lengthBeats = bars * bb;
        const last = isLastSection && pos.barInSection + bars >= sec.bars;
        return { notes, lengthBeats, bars, section: sec.role, intensity: sec.intensity, last };
      },
    },
  });

  // Diminution ornament for the A' restatement: long on-beat notes split into
  // neighbor/passing figures (the Engine-01 motivic-variation move), keeping
  // the original pitches on their beats so the restatement is recognizable.
  function ornament(srcNotes, vector, rng, barBeats) {
    const out = [];
    for (const n of srcNotes) {
      if (n.durBeats >= 1.5 && rng.bool(0.45 + vector.variation * 0.3) && n.midi != null) {
        const half = n.durBeats / 2;
        out.push(Object.assign({}, n, { durBeats: half }));
        out.push(Object.assign({}, n, {
          beat: n.beat + half, durBeats: half,
          midi: n.midi + (rng.bool(0.5) ? 2 : -1),
          tags: (n.tags || []).filter((t) => t !== 'apex'), weight: (n.weight || 0.5) * 0.8,
        }));
        if (half >= 1 && rng.bool(0.4)) {
          out[out.length - 1].durBeats = half / 2;
          out.push(Object.assign({}, n, {
            beat: n.beat + half + half / 2, durBeats: half / 2,
            midi: n.midi, tags: [], weight: (n.weight || 0.5) * 0.7,
          }));
        }
      } else out.push(Object.assign({}, n));
    }
    return out;
  }
})(typeof self !== 'undefined' ? self : this);
