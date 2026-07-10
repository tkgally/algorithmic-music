/*
 * styles/percussion — the Percussion genre pack: preset region + incremental
 * compose strategy. Ports the proven preliminary Engine 05 ("Percussion
 * Ensemble", v0.2.0 — Tom: "the sounds are great") into the comprehensive
 * site's just-in-time pipeline: an interlocking drum ensemble that builds in
 * density and intensity, with NO harmony to lean on — the density/intensity
 * arc carries the form, and a fixed timeline + low anchor + interlocking mid
 * ostinati + an improvising lead is the universal four-layer architecture.
 *
 * Musical basis (all in the wiki):
 *   - percussion-music.md — the founding diagnosis ("with no chords to modulate
 *     and no tune to develop, what carries a percussion piece forward?" → a
 *     density/intensity curve + the fixed-vs-free polarity), the universal
 *     4-layer voice architecture (timeline · low anchor · interlocking mid
 *     ostinati · free lead), cyclic-additive form, stop-cuts/fills as
 *     punctuation, and "keep any melody subordinate".
 *   - percussion-sound-design.md — the eleven original struck voices (read by
 *     docs/lib/synth.js), tuned by freq/midi + the p-param timbre macros.
 *   - rhythm-and-meter.md / west-african-rhythm.md — timelines (clave/bell),
 *     Euclidean rhythms E(k,n) as a whole library of interlocking support
 *     parts, aksak (2+3, 3+2+2) additive meters, 4/8/16-bar hypermeter.
 *   - gamelan.md — colotomy / density (irama) as the intensity lever.
 *
 * The port keeps Engine 05's CORE — the timeline skeleton, per-voice Euclidean
 * ostinati rng-rotated so parts interlock, a seed-varied ensemble across
 * contrasting registers/timbres, a density arc that stacks layers in one by
 * one (the layering IS the intro), a lead that improvises call-and-response
 * against the grid, a stop-cut break, and an optional subordinate mallet
 * ostinato — and realizes it JIT so live control changes land on future units.
 * Where Engine 05 sampled its whole recipe up front, here the identity (form,
 * timeline, ostinato patterns, ensemble seating) is committed in init() and the
 * live vector (density, interlock, brightness, leadProm, melTex, ending, …) is
 * read every unit. Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;                 // shared composition machinery

  const UNIT_BARS = 2;                         // compose 1-2 bars per unit
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  // Euclidean onset step-indices E(k,n) rotated — a whole library of authentic
  // interlocking support parts from two integers (percussion-music.md).
  function euclidOnsets(k, n, rot) { return AM.rng.onsets(AM.rng.euclid(k, n, rot)); }

  // The low anchor's felt pulse for a meter, thickening as intensity rises
  // (groove-and-embodiment.md: put the timekeeping weight in the low drum). For
  // compound/aksak meters the anchor lands on the felt beat-group starts.
  function anchorBeats(meter, I) {
    const bb = meter.barBeats;
    if (meter.aksak || meter.compound) return (meter.accents && meter.accents.length ? meter.accents : [0]).slice();
    const beats = [0];
    if (bb >= 4) { beats.push(2); if (I > 0.35) beats.push(1, 3); }
    else if (bb >= 2 && I > 0.35) beats.push(1);
    return beats.sort((a, b) => a - b);
  }

  // ---- The form: an intensity arc realized as titled sections ----------------
  // entry (parts stack in one by one) · [groove · lead episode · build]×cycles ·
  // peak (densest, metals enter) · break (a sudden thin bar — the stop-cut) ·
  // rebuild · ending. Sizes scale to the target length; sectionIntensities lays
  // the vector.arc over them, then we guarantee the stop-cut stays thin and the
  // peak is a genuine climax regardless of which arc shape was drawn.
  function buildSections(vector, rng, total) {
    const cycles = clamp(Math.round(total / 40), 1, 3);
    const roles = ['entry'];
    for (let c = 0; c < cycles; c++) roles.push('groove', 'lead', 'build');
    roles.push('peak', 'break', 'rebuild', 'ending');
    const W = { entry: 1.1, groove: 1.4, lead: 1.2, build: 1.0, peak: 1.3, break: 0.5, rebuild: 1.1, ending: 0.95 };
    const weights = roles.map((r) => W[r] || 1);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const sections = roles.map((r, i) => {
      let nb = Math.round((weights[i] / wsum) * total);
      nb = Math.max(2, Math.round(nb / 2) * 2);            // every section a whole 2-bar unit
      return { role: r, bars: nb };
    });
    const totalBars = sections.reduce((a, s) => a + s.bars, 0);
    C().sectionIntensities(sections, vector.arc);
    for (const s of sections) {
      if (s.role === 'break') s.intensity = Math.min(s.intensity, 0.16);
      else if (s.role === 'peak') s.intensity = Math.max(s.intensity, 0.82);
      else if (s.role === 'entry') s.intensity = Math.min(s.intensity, 0.5);
    }
    return { sections, totalBars };
  }

  AM.styles.register({
    id: 'percussion',
    name: 'Percussion',
    order: 7,
    blurb: 'An interlocking drum ensemble that builds in density and intensity',
    preset: {
      // Percussion is unpitched; the scale/mode only colours the OPTIONAL
      // subordinate mallet ostinato (pentatonic-leaning, so it never asserts a
      // key). harmonyType 'drone' = no harmony machinery at all.
      scale: { pick: ['minorPentatonic', 'dorian', 'majorPentatonic', 'naturalMinor'], w: [3, 2, 2, 1] },
      tonicPc: { pick: [0, 2, 3, 5, 7, 9, 10] },
      harmonyType: 'drone',
      harmonicRhythm: 0.5, harmRich: 0.2,
      // The timeline skeleton: clave/bell/Euclid/sieve/pulse (never 'none' —
      // percussion always hangs on a clock-key; percussion-music.md).
      timeline: { pick: ['bell', 'clave', 'euclid', 'sieve', 'pulse'], w: [2, 2, 3, 1, 2] },
      // Duple default (2/4, 4/4) with 4/8/16-bar phrasing; 6/8 for bell/hemiola;
      // 5/8 (2+3) and 7/8 (3+2+2) aksak spice (rhythm-and-meter.md).
      meterId: { pick: ['4/4', '2/4', '4/4', '6/8', '5/8', '7/8'] },
      bpmBand: [88, 132], bpm: null,
      swing: 0, laidBack: 0.15, rubato: 0.2,
      density: { range: [0.45, 0.75] }, interlock: { range: [0.5, 0.9] },
      leadProm: { range: [0.45, 0.75] }, melTex: { range: [0.55, 0.9] },
      form: 'sections',
      arc: { pick: ['rise', 'arch', 'lateArch', 'terraced', 'waves', 'joHaKyu', 'swellCut'], w: [3, 2, 2, 2, 2, 2, 1] },
      development: { range: [0.35, 0.7] }, variation: { range: [0.4, 0.7] },
      lengthSec: { pick: [100, 150, 210], w: [0.3, 0.5, 0.2] },
      ending: { pick: ['stop', 'ringout'] },
      brightness: { range: [0.4, 0.7] }, dynRange: { range: [0.5, 0.8] },
      expression: { range: [0.4, 0.6] }, reverb: { range: [0.18, 0.34] }, width: { range: [0.5, 0.75] },
      moodModePool: ['minorPentatonic', 'phrygian', 'dorian', 'naturalMinor', 'majorPentatonic', 'major'],
      // The ENSEMBLE: a low anchor, an always-sounding high timeline voice, two
      // interlocking mid ostinati (named perc* so the interlock coupling gate
      // keeps our high interlock), a lead, a high texture, and the optional
      // mallet last. prio = layer-drop order: anchor 0, timeline 1, mids, lead,
      // high, mallet last. Palettes re-skin the kit for seed/user timbral variety.
      ensemble: [
        { role: 'anchor', voice: 'boom', register: [36, 44], level: 0.82, prio: 0 },
        { role: 'timeline', voice: 'wood', register: [74, 86], level: 0.6, prio: 1 },
        { role: 'perc1', voice: 'drum', register: [48, 58], level: 0.72, prio: 2 },
        { role: 'perc2', voice: 'clap', register: [60, 74], level: 0.6, prio: 3 },
        { role: 'lead', voice: 'drum', register: [54, 64], level: 0.76, prio: 4 },
        { role: 'high', voice: 'shaker', register: [86, 96], level: 0.5, prio: 5 },
        { role: 'mallet', voice: 'mallet', register: [55, 79], level: 0.4, prio: 6 },
      ],
      palettes: [
        { name: 'Mixed kit', desc: 'a varied kit of skins, wood, and metal — the default', map: {} },
        { name: 'Skins & wood', desc: 'warm and woody: drums and woodblocks', map: { timeline: 'wood', perc1: 'drum', perc2: 'wood', high: 'shaker', lead: 'drum' } },
        { name: 'All metal', desc: 'bright and ringing: bells, chimes, metal', map: { timeline: 'metal', perc1: 'metal', perc2: 'chime', high: 'metal', lead: 'metal', mallet: 'chime' } },
        { name: 'Hands & shakers', desc: 'hand-drum and shaker textures, claps on top', map: { timeline: 'clap', perc1: 'drum', perc2: 'clap', high: 'shaker', lead: 'drum' } },
      ],
    },

    strategy: {
      unitBars: UNIT_BARS,

      // -- init: commit the piece's IDENTITY (form, timeline, ostinato patterns,
      // ensemble seating). Everything here is stable for the whole piece; the
      // live vector supplies density/interlock/timbre/lead per unit. ------------
      init(vector, rng) {
        const meter = vector.meter;
        const bb = meter.barBeats;
        const steps = Math.max(4, Math.round(bb / 0.25));   // a sixteenth-note grid
        const total = C().barsForLength(vector, 2);
        const built = buildSections(vector, rng.stream('form'), total);

        // Seat the kit in space and pick nominal pitches per role (a spread pan
        // field + contrasting registers; seed-varied). Percussion voices clamp
        // freq to their own sensible band, so one nominal midi per role works
        // across every palette re-skin.
        const flip = rng.bool() ? 1 : -1;
        const nominal = {
          anchor: { midi: 38 + rng.int(0, 4), pan: 0 },
          timeline: { midi: 78 + rng.int(-2, 4), pan: 0.18 * flip },
          perc1: { midi: 51 + rng.int(-2, 4), pan: -0.28 * flip },
          perc2: { midi: 63 + rng.int(-3, 5), pan: 0.30 * flip },
          lead: { midi: 57 + rng.int(-3, 4), pan: 0.12 * flip },
          high: { midi: 89 + rng.int(-3, 4), pan: -0.36 * flip },
          mallet: { midi: 67, pan: -0.12 * flip },
        };

        // The inviolable timeline (a per-bar onset list in quarter beats).
        const timeline = C().timelinePattern(vector, rng.stream('timeline')) || [0, bb / 2];

        // One fixed Euclidean ostinato per mid voice, each rng-rotated so the
        // parts dovetail (interlock) into one another's gaps (hocket). Density
        // of the pattern rides the committed interlock; live density thins it.
        const mids = [];
        for (const role of ['perc1', 'perc2']) {
          const k = clamp(Math.round(steps * (0.28 + 0.34 * vector.interlock * rng.float())), 2, Math.max(2, steps - 1));
          mids.push({ role, steps: euclidOnsets(k, steps, rng.int(0, steps - 1)), n: steps });
        }

        // A 2-bar melodic cell for the optional mallet accompaniment: a short
        // walked degree sequence over sparse onsets (it accompanies, never leads).
        const mr = rng.stream('mallet');
        const mDeg = []; let idx = mr.int(0, 4);
        const nNotes = mr.int(4, 7);
        for (let i = 0; i < nNotes; i++) { idx = clamp(idx + mr.int(-2, 2), 0, 12); mDeg.push(idx); }
        const perBar = meter.compound ? [0, 1.5] : (bb >= 4 ? [0, 1.5, 2.5] : [0, 1]);
        const mCellOnsets = [];
        for (let b = 0; b < 2; b++) for (const be of perBar) if (mr.bool(0.7)) mCellOnsets.push({ bar: b, beat: be });

        return {
          sections: built.sections, totalBars: built.totalBars,
          nominal, timeline, mids,
          high: { every: rng.pick([1, 2]) },               // shaker subdivision grain
          entryOrder: ['timeline', 'anchor', 'perc1', 'high', 'perc2', 'lead'],
          mCellOnsets, mDeg, malletRegister: [55, 79],
          // structural colour voices, emitted directly (not ensemble slots):
          // a bright metal that "enters at the peak" and a gong for the climax +
          // the ending, whatever the palette (percussion-music.md: timbral
          // accumulation + a pitched arrival as the cadence substitute).
          color: { voice: 'metal', midi: 80 + rng.int(-2, 6), pan: 0.4 * flip },
          gong: { voice: 'gong', midi: 55 + rng.int(-3, 6), pan: 0 },
        };
      },

      // -- nextUnit: compose ONE unit (1-2 bars), reading the LIVE vector. ------
      nextUnit(plan, vector, pos, rng) {
        if (pos.bar >= plan.totalBars) return null;
        const meter = vector.meter;
        const bb = meter.barBeats;
        const steps = Math.max(4, Math.round(bb / 0.25));
        const sec = pos.section, secRole = sec.role;
        const bars = Math.min(UNIT_BARS, sec.bars - pos.barInSection);
        const lengthBeats = bars * bb;
        const isLastSection = pos.sectionIdx === plan.sections.length - 1;

        // live macros
        const density = vector.density, leadProm = vector.leadProm;
        const kitBright = 0.7 + vector.brightness * 0.7;    // Brightness reshapes the whole kit
        const kitP = { bright: kitBright };
        const malletAmt = clamp(1 - vector.melTex * 1.4, 0, 1); // mallet only when melTex is LOW
        const accentSet = new Set(meter.accents || []);

        // Resolve each role to its CURRENT voice (palette map) if still present
        // under the layer cap; attach the committed nominal pitch/pan.
        const ens = AM.style.effectiveEnsemble(vector);
        const byRole = {}; for (const x of ens) byRole[x.role] = x;
        const resolve = (role) => {
          const x = byRole[role]; if (!x) return null;
          const nom = plan.nominal[role] || { midi: 60, pan: 0 };
          return { role, voice: x.voice, midi: nom.midi, pan: nom.pan, level: x.level == null ? 1 : x.level };
        };
        const E = {
          anchor: resolve('anchor'), timeline: resolve('timeline'),
          perc1: resolve('perc1'), perc2: resolve('perc2'),
          lead: resolve('lead'), high: resolve('high'), mallet: resolve('mallet'),
        };

        const notes = [];
        const emit = (e, beat, vel, tags, p, durBeats) => {
          if (!e || beat < -1e-9 || beat >= lengthBeats) return;
          notes.push({
            beat, durBeats: durBeats == null ? 0.12 : durBeats, midi: e.midi, voice: e.voice, role: e.role,
            vel: clamp(vel * (e.level == null ? 1 : e.level), 0.03, 1), tags: tags || [], p: p || kitP, pan: e.pan,
          });
        };
        // direct emit for the structural colour voices (metal/gong), un-gated
        const emitVoice = (desc, beat, vel, tags, p, durBeats) => {
          if (beat < -1e-9 || beat >= lengthBeats) return;
          notes.push({
            beat, durBeats: durBeats == null ? 0.2 : durBeats, midi: desc.midi, voice: desc.voice, role: 'color',
            vel: clamp(vel, 0.03, 1), tags: tags || [], p: p || kitP, pan: desc.pan,
          });
        };
        // a single lead hit, with an occasional flam/drag (a grace 0.06 beats
        // early at half velocity — the hand-drum ornament, percussion-music.md).
        const pushLead = (e, beat, vel, role) => {
          if (!e || beat < -1e-9 || beat >= lengthBeats) return;
          const isDrum = e.voice === 'drum';
          if (rng.bool(0.18) && beat - 0.06 >= 0) {
            notes.push({ beat: beat - 0.06, durBeats: 0.08, midi: e.midi, voice: e.voice, role: role || 'lead',
              vel: clamp(vel * 0.5 * (e.level || 1), 0.03, 1), tags: ['flam'], p: kitP, pan: e.pan });
          }
          const tags = [role || 'lead'];
          if (isDrum) tags.push(rng.bool(0.4) ? 'slap' : 'open');
          notes.push({ beat, durBeats: 0.12, midi: e.midi, voice: e.voice, role: role || 'lead',
            vel: clamp(vel * (e.level || 1), 0.03, 1), tags, p: kitP, pan: e.pan });
        };

        for (let lb = 0; lb < bars; lb++) {
          const barOffset = lb * bb;
          const absBar = pos.bar + lb;
          const barInSec = pos.barInSection + lb;
          const isFinalBar = isLastSection && (barInSec === sec.bars - 1);
          let I = pos.arcLevel;
          if (secRole === 'peak') I = Math.max(I, 0.85);
          else if (secRole === 'break') I = Math.min(I, 0.16);
          else if (secRole === 'entry') I = Math.min(I, 0.5);

          // ==== ENDING (stop): a clean unison accent on the "1" + a ringing gong
          // (percussion-music.md: completion/arrival IS the cadence). ==========
          if (isFinalBar && vector.ending === 'stop') {
            for (const e of [E.anchor, E.timeline, E.perc1, E.perc2, E.lead, E.high]) emit(e, barOffset, 0.82, ['unison', 'accent'], kitP, 0.18);
            emitVoice(plan.gong, barOffset, 0.9, ['gong', 'ending'], { bright: kitBright, decay: 1.7 }, 4.0);
            continue;                                       // nothing else in the final bar
          }

          // ==== BREAK: a sudden thin bar (the drum-circle stop-cut). Drop to the
          // timeline + a descending rumble; the last break bar throws a pickup
          // fill that relaunches the groove (samba paradinha; percussion-music.md).
          if (secRole === 'break') {
            if (vector.timeline !== 'none' && E.timeline)
              for (const tb of plan.timeline) emit(E.timeline, barOffset + tb, 0.4, ['timeline'], kitP, 0.12);
            if (E.high) for (let s = 0; s < steps; s += 2)
              emit(E.high, barOffset + s * (bb / steps), 0.26 * (1 - s / steps), [], kitP, 0.1);
            if (barInSec === 0) emit(E.anchor, barOffset, 0.7, ['stopcut', 'accent'], kitP, 0.16);
            if (barInSec === sec.bars - 1 && E.lead)
              for (const s of euclidOnsets(Math.max(3, Math.round(steps * 0.5)), steps, 0))
                pushLead(E.lead, barOffset + s * (bb / steps), 0.45 + 0.4 * (s / steps), 'fill');
            continue;
          }

          // ==== part activity mask ====
          const active = {};
          if (secRole === 'entry') {
            // the layering IS the intro: reveal one part per bar in a fixed order
            const order = plan.entryOrder;
            for (const role of Object.keys(E)) { const idx = order.indexOf(role); active[role] = idx >= 0 && idx <= barInSec; }
            active.mallet = malletAmt > 0.05 && barInSec >= 2;
          } else {
            active.timeline = true;
            active.anchor = I > 0.08;
            active.perc1 = I > 0.18 || ['groove', 'lead', 'build', 'peak', 'rebuild'].indexOf(secRole) >= 0;
            active.perc2 = I > 0.42 || secRole === 'build' || secRole === 'peak';
            active.high = I > 0.5 || secRole === 'peak' || secRole === 'lead';
            active.lead = secRole === 'lead' || secRole === 'peak' || (['groove', 'build', 'rebuild'].indexOf(secRole) >= 0 && I > 0.35);
            active.mallet = malletAmt > 0.05;
          }

          // ---- TIMELINE: the always-sounding high reference the ear latches to,
          // vel steady ~0.6 (percussion-music.md: the inviolable clock-key) ----
          if (active.timeline && vector.timeline !== 'none' && E.timeline)
            plan.timeline.forEach((tb, ti) => {
              const head = ti === 0;
              emit(E.timeline, barOffset + tb, (head ? 0.66 : 0.56) * (0.85 + 0.15 * I), head ? ['timeline', 'accent'] : ['timeline'], kitP, 0.12);
            });

          // ---- LOW ANCHOR: the heartbeat, thickening with intensity ----
          if (active.anchor && E.anchor)
            for (const ab of anchorBeats(meter, I)) {
              const down = ab === 0;
              emit(E.anchor, barOffset + ab, down ? 0.85 : 0.6, down ? ['anchor', 'accent'] : ['anchor'], kitP, 0.16);
            }

          // ---- MID interlocking ostinati (Euclidean, rng-rotated). Vel
          // hierarchy: pattern head / metric accents louder; live density thins
          // the secondary onsets (gamelan-style density; hocket interlock). ----
          for (const mp of plan.mids) {
            if (!active[mp.role]) continue;
            const e = E[mp.role]; if (!e) continue;
            const isDrum = e.voice === 'drum';
            mp.steps.forEach((s, si) => {
              const beatInBar = s * (bb / mp.n);
              const onAccent = si === 0 || accentSet.has(beatInBar);
              if (!onAccent && si > 0 && !rng.bool(0.5 + 0.5 * density)) return;
              const tags = [];
              if (isDrum) tags.push(onAccent ? 'open' : (rng.bool(0.25) ? 'slap' : 'tone'));
              tags.push('ostinato');
              emit(e, barOffset + beatInBar, (onAccent ? 0.66 : 0.5) * (0.55 + 0.5 * I), tags, kitP, 0.12);
            });
          }

          // ---- HIGH texture (shaker/metal subdivision), sixteenths at the peak ----
          if (active.high && E.high) {
            const every = (secRole === 'peak' || I > 0.7) ? plan.high.every : plan.high.every + 1;
            for (let s = 0; s < steps; s += Math.max(1, every)) {
              const beatInBar = s * (bb / steps);
              const acc = accentSet.has(beatInBar);
              if (!acc && !rng.bool(0.55 + 0.4 * I)) continue;
              emit(E.high, barOffset + beatInBar, (acc ? 0.4 : 0.3) * (0.6 + 0.5 * I), acc ? ['accent'] : [], kitP, 0.1);
            }
          }

          // ---- PEAK colour: metals enter (backbeat sparkle) + a gong swell on
          // the peak downbeat (timbral accumulation → climax) ----
          if (secRole === 'peak') {
            const bkts = (meter.accents && meter.accents.length > 1) ? meter.accents.slice(1) : [Math.floor(bb / 2)];
            for (const bk of bkts) emitVoice(plan.color, barOffset + bk, 0.48 * (0.6 + 0.5 * I), ['accent'], kitP, 0.2);
            if (barInSec === 0 && lb === 0) emitVoice(plan.gong, barOffset, 0.8, ['gong'], { bright: kitBright, decay: 1.3 }, 3.0);
          }

          // ---- LEAD improvises against the grid: dense bursts at high intensity
          // in its episodes; sparse 2-beat call-and-response (answered by an
          // ensemble accent) in the groove (percussion-music.md timeline↔lead). ----
          if (active.lead && E.lead) {
            let la = 0.3 + 0.5 * leadProm;
            if (secRole === 'lead') la += 0.28; if (secRole === 'peak') la += 0.2;
            la = clamp(la * (0.45 + 0.6 * I), 0, 1);
            const callResponse = (secRole === 'groove' || secRole === 'rebuild') || (secRole === 'build' && I < 0.6);
            if (callResponse) {
              if (rng.bool(0.5 + 0.4 * la)) {
                // a 2-beat CALL kept in the first half of the bar
                for (const s of euclidOnsets(rng.int(2, 3), Math.max(2, Math.round(steps / 2)), rng.int(0, 2))) {
                  const b = barOffset + s * (bb / steps);
                  if (b < barOffset + bb / 2) pushLead(E.lead, b, 0.5 + 0.3 * rng.next());
                }
                // the ANSWER: a bright ensemble accent on the backbeat
                const ans = E.high || E.perc2;
                const ab = barOffset + (accentSet.size > 1 ? meter.accents[1] : bb / 2);
                if (ans && ab < lengthBeats) notes.push({ beat: ab, durBeats: 0.12, midi: ans.midi, voice: ans.voice, role: 'answer',
                  vel: clamp(0.5 * (ans.level || 1), 0.03, 1), tags: ['accent', 'answer'], p: kitP, pan: ans.pan });
              }
            } else {
              // a continuous improvised burst, denser as intensity rises
              const nHits = Math.max(2, Math.round(steps * (0.28 + 0.4 * la)));
              for (const s of euclidOnsets(nHits, steps, rng.int(0, steps - 1))) {
                if (!rng.bool(0.6 + 0.35 * la)) continue;
                pushLead(E.lead, barOffset + s * (bb / steps), 0.55 + 0.35 * rng.next());
              }
            }
          }

          // ---- FILLS at 4-bar phrase boundaries (the punctuation that marks
          // hypermetric groups; rhythm-and-meter.md, percussion-music.md) ----
          if (E.lead && (absBar + 1) % 4 === 0 && secRole !== 'entry' && rng.bool(0.4 + 0.4 * vector.variation))
            for (const off of [steps - 3, steps - 2, steps - 1]) pushLead(E.lead, barOffset + off * (bb / steps), 0.42 + 0.16 * ((steps - off) / 3), 'fill');

          // ---- optional subordinate MALLET ostinato (only when melTex is low —
          // a quiet pentatonic accompaniment that accompanies, never leads) ----
          if (active.mallet && E.mallet && malletAmt > 0.05) {
            const pool = C().scalePool(vector, plan.malletRegister);
            if (pool.length) {
              const cellBar = absBar % 2; let di = absBar % Math.max(1, plan.mDeg.length);
              for (const slot of plan.mCellOnsets) {
                if (slot.bar !== cellBar) continue;
                if (!rng.bool(0.4 + 0.5 * malletAmt)) { di++; continue; }
                const deg = plan.mDeg[di % plan.mDeg.length]; di++;
                const midi = pool[((deg % pool.length) + pool.length) % pool.length];
                const b = barOffset + slot.beat;
                if (b < lengthBeats) notes.push({ beat: b, durBeats: Math.min(1.2, bb - slot.beat), midi, voice: E.mallet.voice, role: 'mallet',
                  vel: clamp(0.3 * malletAmt * (E.mallet.level || 1) + 0.05, 0.03, 0.5), tags: rng.bool(0.2) ? ['xylo'] : [], p: { bright: kitBright }, pan: E.mallet.pan });
              }
            }
          }

          // ---- ENDING (ringout / fade): let the last downbeat ring rather than
          // stop dead (the performer adds the ritardando for a ringout) ----
          if (isFinalBar && vector.ending !== 'stop') {
            const fade = vector.ending === 'fade';
            emitVoice(plan.gong, barOffset, fade ? 0.5 : 0.82, ['gong', 'ending'], { bright: kitBright, decay: fade ? 1.2 : 1.8 }, 4.0);
            emit(E.anchor, barOffset, fade ? 0.55 : 0.72, ['ending', 'accent'], kitP, 0.2);
          }
        }

        const last = isLastSection && (pos.barInSection + bars >= sec.bars);
        return { notes, lengthBeats, bars, section: secRole, intensity: clamp(sec.intensity == null ? pos.arcLevel : sec.intensity, 0.05, 1), last };
      },
    },
  });
})(typeof self !== 'undefined' ? self : this);
