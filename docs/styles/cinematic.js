/*
 * styles/cinematic — the Cinematic genre pack: preset region + incremental
 * compose strategy. An emotional, swelling melody over sustained strings,
 * built as a single-tension DRAMATIC ARC — intro · theme · rise · climax ·
 * return · coda — that rises to a peak and resolves.
 *
 * ADAPTS (does not copy) Engine 04 "Cantabile"'s composer
 * (experiments/composers/expressive-chamber.js): a germ MOTIF committed once
 * and restated/developed across the arc, modal (plagal-leaning, non-
 * functional) harmony, and every lead note stamped with a structural `weight`
 * 0..1 that drives the aria voice's downstream expression — perform.js turns
 * weight × vector.expression into vibrato/swell/scoop for aria/reed/wire/
 * glass. What's NEW here vs. Cantabile: the arc is emitted just-in-time (one
 * 4-bar phrase per unit, so live control changes land on not-yet-composed
 * material) through the site's shared compose.js machinery instead of
 * composed whole up front; the section list is the site's own 6-part form
 * (no separate "dialogue" section — see the comment on the counter-line code
 * below for how that idea survives anyway); and "development" leans on
 * melodyPhrase()'s own machinery: the motif's RHYTHM (melodyPhrase's returned
 * `.motif`) is committed in init and threaded into every later phrase, while
 * register/centerOffset/density carry the section-to-section change. Per
 * wiki/thematic-development-and-variation.md's perceptual-evidence table,
 * holding rhythm (and mostly contour) invariant while shifting pitch level is
 * the "sequence" family of operations — ranked the single most reliably
 * recognized way to develop a motif by ear — which is exactly what the rise
 * section does explicitly (transposing the motif up a step each phrase) and
 * what every other section does implicitly by reusing the same plan.motif.
 *
 * Musical basis: wiki/film-and-game-music.md (leitmotif — "a stable identity
 * token plus a set of transformation operators"; underscore's emotional-
 * signposting job; "write every layer in one key/tempo/grid" reframed here as
 * one committed motif riding one modal harmony) and wiki/thematic-
 * development-and-variation.md (the operation catalog and its
 * recognizability tiers, used to prefer sequence-by-transposition over
 * riskier operations like inversion/retrograde as the main developmental
 * device — "safe to use often" per that page's synthesis table).
 *
 * FORM: intro (pads establish the mode; a spare motif-head preview) · theme
 * (the germ motif sung in full) · rise (sequenced upward, harmony richens) ·
 * climax (high/loud/long, lush modal voicings, one boom hit) · return (the
 * theme again, low and quiet) · coda (the motif dissolves onto one long
 * swelling tonic, optionally under a soft gong). Scaled to vector.lengthSec;
 * intro/coda stay fixed short bookends, theme/rise/climax/return share the
 * remaining bars in the contract's nominal 8:8:6:8 proportion (climax capped
 * to 4-8 bars — a peak should not overstay its welcome).
 *
 * Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const PHRASE_BARS = 4;                  // one phrase per unit — the arc's grain
  // Contract's nominal bar weights for the four SCALED middle sections (intro
  // and coda are fixed 4-bar bookends, never scaled); climax's 6 sits at the
  // middle of its allowed 4-8 range and is clamped there below.
  const NOMINAL_MID = { theme: 8, rise: 8, climax: 6, return: 8 };
  const RISE_STEP = 2;                    // semitones climbed PER PHRASE — a literal "step"
  const RISE_STEP_CAP = 9;                // never let the rise alone exceed a minor sixth
  const CLIMAX_LIFT = 7;                  // climax's register lift over the base lead (floor)
  const RETURN_DROP = 7;                  // return's register drop — "low and quiet"

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  AM.styles.register({
    id: 'cinematic', name: 'Cinematic', order: 6,
    blurb: 'An emotional, swelling melody over sustained strings, building to a peak',
    preset: {
      scale: { pick: ['naturalMinor', 'dorian', 'major', 'lydian'] },   // lydian = the wonder color
      harmonyType: 'modal',                     // MODAL_POOLS' plagal-leaning walk, no functional V-I
      harmonicRhythm: { pick: [0.5, 1] },       // slow: a chord every 1-2 bars
      harmRich: { range: [0.25, 0.45] },        // base richness; climbs with intensity in nextUnit
      meterId: { pick: ['4/4', '3/4'] },
      bpmBand: [66, 108],
      bpm: { range: [72, 96] },
      swing: 0, laidBack: 0, rubato: { range: [0.5, 0.8] },   // lots of expressive give
      density: { range: [0.3, 0.5] },           // low-mid: long tones, not busy figuration
      leadProm: { range: [0.6, 0.8] },          // the aria line is the point
      melTex: { range: [0.15, 0.35] },          // tune-forward, not textural
      form: 'dramaticArc', arc: { pick: ['lateArch', 'joHaKyu', 'arch'] },
      development: { range: [0.4, 0.65] },
      variation: { range: [0.35, 0.55] },
      lengthSec: { pick: [130, 175, 230], w: [0.3, 0.5, 0.2] },
      ending: { pick: ['ringout', 'cadence'] },   // both get perform.js's automatic final ritardando
      brightness: { range: [0.35, 0.6] },
      dynRange: { range: [0.6, 0.9] },          // the swell IS the genre
      expression: { range: [0.6, 0.85] },
      reverb: { range: [0.45, 0.7] },
      width: { range: [0.55, 0.75] },
      moodModePool: ['phrygian', 'naturalMinor', 'dorian', 'major', 'lydian'],  // dark -> wonder
      ensemble: [
        { role: 'lead',    voice: 'aria',  register: [64, 88], level: 1.0,  prio: 0 },
        { role: 'pad',     voice: 'chord', register: [48, 72], level: 0.65, prio: 1 },
        { role: 'bass',    voice: 'bass',  register: [33, 53], level: 0.8,  prio: 2 },
        { role: 'counter', voice: 'glass', register: [72, 96], level: 0.5,  prio: 3 },
        { role: 'boom',    voice: 'boom',  register: [28, 40], level: 0.9,  prio: 4 },
      ],
      // Gong is NOT an ensemble role: it's a single structural "stinger" (wiki/
      // film-and-game-music.md's stinger concept) fired once at the very end
      // when ending==='ringout', never a standing layer subject to layerCap.
      palettes: [
        { name: 'Strings & aria (default)', desc: 'a bowed, orchestral lead over strings', map: {} },
        { name: 'Breathy reed lead',        desc: 'a woodwind-like reed carries the theme', map: { lead: 'reed' } },
        { name: 'Electric trailer lead',    desc: 'a modern electric lead for a trailer feel', map: { lead: 'wire' } },
      ],
    },

    strategy: {
      unitBars: PHRASE_BARS,

      init(vector, rng) {
        const compose = C();

        // ---- form: the dramatic arc, scaled to the target length ------------
        const totalTarget = compose.barsForLength(vector, PHRASE_BARS);
        const bookend = PHRASE_BARS;   // intro/coda: fixed short bookends (contract: 4 and 4)
        const remaining = Math.max(4 * PHRASE_BARS, totalTarget - 2 * bookend);
        const wsum = NOMINAL_MID.theme + NOMINAL_MID.rise + NOMINAL_MID.climax + NOMINAL_MID.return;
        const snap4 = (x) => Math.max(PHRASE_BARS, Math.round(x / PHRASE_BARS) * PHRASE_BARS);
        const themeBars = snap4(remaining * NOMINAL_MID.theme / wsum);
        const riseBars = snap4(remaining * NOMINAL_MID.rise / wsum);
        const returnBars = snap4(remaining * NOMINAL_MID.return / wsum);
        const climaxBars = clamp(snap4(remaining * NOMINAL_MID.climax / wsum), PHRASE_BARS, 2 * PHRASE_BARS);

        const sections = [
          { role: 'intro',  bars: bookend },
          { role: 'theme',  bars: themeBars },
          { role: 'rise',   bars: riseBars },
          { role: 'climax', bars: climaxBars },
          { role: 'return', bars: returnBars },
          { role: 'coda',   bars: bookend },
        ];
        compose.sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);

        // ---- the germ motif: one short rhythmic cell, committed once --------
        // A throwaway 2-bar phrase mints melodyPhrase()'s own `.motif` (the
        // phraseRhythm cell for its first bar) and `.contour` (the picked
        // contour archetype). Only these two STRUCTURAL choices survive into
        // nextUnit — the throwaway phrase's actual PITCHES are discarded, so
        // every later phrase is freshly re-pitched from the LIVE vector (a key
        // or scale change still lands) while staying recognizably one tune,
        // because the rhythm (and, for theme/return, the contour shape) never
        // changes underneath it.
        const motifRng = rng.stream('motif');
        const leadEns = AM.style.effectiveEnsemble(vector).find((e) => e.role === 'lead') || { register: [64, 88] };
        const germChords = compose.progression(vector, 2, motifRng, {});
        const germ = compose.melodyPhrase(vector, germChords, motifRng, { bars: 2, register: leadEns.register, cadence: 'none' });

        return {
          sections, totalBars,
          motif: germ.motif,        // the committed rhythm cell (the "germ")
          contour: germ.contour,    // committed contour archetype (theme/return reuse it)
          padVoicing: null,         // voice-leading memo, carried bar to bar
          risePhrase: 0,            // counts rise-section phrase-units, for the upward sequence
          riseMaxShift: 0,          // how far the rise actually climbed, so climax always tops it
        };
      },

      nextUnit(plan, vector, pos, rng) {
        const compose = C();
        if (pos.bar >= plan.totalBars) return null;
        const sec = pos.section;
        const ens = AM.style.effectiveEnsemble(vector);
        const lead = ens.find((e) => e.role === 'lead');
        const pad = ens.find((e) => e.role === 'pad');
        const bass = ens.find((e) => e.role === 'bass');
        const counter = ens.find((e) => e.role === 'counter');
        const boomE = ens.find((e) => e.role === 'boom');
        const bb = vector.meter.barBeats;
        const bars = Math.min(PHRASE_BARS, sec.bars - pos.barInSection);
        const isFirstInSection = pos.barInSection === 0;
        const isLastInSection = pos.barInSection + bars >= sec.bars;
        const isLastSection = pos.sectionIdx === plan.sections.length - 1;
        const last = isLastSection && isLastInSection;
        const notes = [];

        // Harmony: modal every time (MODAL_POOLS' plagal-leaning walk); richness
        // climbs with the section's intensity — "lush voicings at climax" — a
        // shared baseline every section can start from and adjust.
        const chords = compose.progression(vector, bars, rng, {});
        const richness = clamp(vector.harmRich + sec.intensity * 0.4, 0, 1);

        // ---- intro: pads establish the mode; a spare motif-head preview ------
        if (sec.role === 'intro') {
          const gain = 0.32 + 0.25 * sec.intensity;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, richness, gain, rng));
          if (lead) {
            // Adapted from Cantabile's intro: 1-2 long, soft notes drawn loosely
            // from the motif's own rhythmic proportions (motif[k][1] as a
            // relative-duration cue) — literal repetition of "just the head,"
            // the safest possible first statement (wiki/thematic-development-
            // and-variation.md: establish before varying).
            const reg = [lead.register[0] - 4, lead.register[1] - 6];
            const pool = compose.scalePool(vector, reg);
            const center = (reg[0] + reg[1]) / 2;
            const headLen = Math.max(1, Math.min(2, plan.motif.length));
            const totalBeats = bars * bb;
            let beat = Math.min(totalBeats * 0.2, bb * 0.5);
            for (let k = 0; k < headLen; k++) {
              const isFinal = k === headLen - 1;
              const dur = isFinal ? Math.max(2, totalBeats - beat) : clamp((plan.motif[k][1] || 1) * 1.6, 1.5, 3);
              const m = compose.nearestInPool(pool, center + k * 1.5, null);
              if (m != null) {
                notes.push({
                  beat, durBeats: Math.min(dur, totalBeats - beat), midi: m,
                  voice: lead.voice, role: 'lead', vel: (0.38 + 0.05 * k) * (lead.level || 1),
                  weight: 0.26 + 0.06 * k,
                });
              }
              beat += dur;
            }
          }
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity * 0.75, last };
        }

        // ---- coda: the motif dissolves onto one long swelling tonic ----------
        if (sec.role === 'coda') {
          const gain = 0.35 + 0.3 * sec.intensity;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, richness, gain, rng));
          if (lead) {
            // Liquidation (wiki/thematic-development-and-variation.md: spending
            // accumulated motivic energy into a cadence) — a short stepwise
            // descent, register dropped even further than return, closing on
            // ONE held tonic whose weight climbs to 1.0 (Cantabile's "blooming
            // final note"). ending 'ringout'/'cadence' both get perform.js's
            // automatic final ritardando (app.js: isRit on the last unit).
            const reg = [lead.register[0] - RETURN_DROP - 2, lead.register[1] - RETURN_DROP - 2];
            const pool = compose.scalePool(vector, reg);
            const center = (reg[0] + reg[1]) / 2;
            const tonicTone = compose.nearestInPool(pool, center, new Set([vector.tonicPc]))
              || compose.nearestInPool(pool, center, null) || Math.round(center);
            const approach = [
              compose.nearestInPool(pool, tonicTone + 4, null) || tonicTone,
              compose.nearestInPool(pool, tonicTone + 2, null) || tonicTone,
              tonicTone,
            ];
            const totalBeats = bars * bb;
            const stepDur = clamp(totalBeats * 0.16, 1, 2);
            let beat = 0, finalBeat = 0, finalDur = 0;
            for (let k = 0; k < approach.length; k++) {
              const isFinal = k === approach.length - 1;
              const dur = isFinal ? Math.max(2, totalBeats - beat) : stepDur;
              notes.push({
                beat, durBeats: dur, midi: approach[k], voice: lead.voice, role: 'lead',
                vel: (isFinal ? 0.78 : 0.4 - 0.06 * k) * (lead.level || 1),
                weight: isFinal ? 1.0 : clamp(0.34 - 0.08 * k, 0.14, 0.34),
                tags: isFinal ? ['ending'] : [],
              });
              if (isFinal) { finalBeat = beat; finalDur = dur; }
              beat += dur;
            }
            // A soft gong under the final chord — the ring-out signature.
            if (vector.ending === 'ringout') {
              notes.push({ beat: finalBeat, durBeats: finalDur, midi: tonicTone - 12, voice: 'gong', role: 'gong', vel: 0.55, pan: 0 });
            }
          }
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last };
        }

        // ---- theme: the germ motif, sung in full ------------------------------
        if (sec.role === 'theme') {
          const gain = 0.55 + 0.25 * sec.intensity;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, richness, gain, rng));
          const leadNotes = leadPhrase(compose, vector, plan, chords, lead, rng, {
            bars, densityScale: 0.9, velBase: 0.68,
            weightFn: (note) => (note.weight == null ? 0.5 : note.weight) * 0.8,
          });
          notes.push.apply(notes, leadNotes);
          // The faintest hint of "dialogue" (a second voice answering) without a
          // dedicated section: a one-note echo of the theme's closing goal tone
          // when this is the section's last phrase. Folds the contract's
          // "dialogue/rise" counter-line mention into the site's 6-part form.
          if (counter && isLastInSection) notes.push.apply(notes, themeEcho(compose, vector, leadNotes, counter));
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last };
        }

        // ---- rise: sequenced upward, a real step-by-step transposition -------
        if (sec.role === 'rise') {
          const riseTotalPhrases = Math.max(1, Math.round(sec.bars / PHRASE_BARS));
          const riseIdx = plan.risePhrase;
          const riseFrac = riseTotalPhrases > 1 ? riseIdx / (riseTotalPhrases - 1) : 1;
          const shift = Math.min(riseIdx * RISE_STEP, RISE_STEP_CAP);
          plan.riseMaxShift = Math.max(plan.riseMaxShift, shift);
          const gain = 0.6 + 0.3 * riseFrac;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, clamp(richness + 0.1 * riseFrac, 0, 1), gain, rng));
          const leadNotes = leadPhrase(compose, vector, plan, chords, lead, rng, {
            bars, regShift: shift, centerOffset: 2, densityScale: 0.95, velBase: 0.72 + 0.1 * riseFrac,
            contour: compose.CONTOUR_ARCHETYPES.find((a) => a.id === 'ascending'),
            weightFn: (note) => 0.5 + 0.35 * riseFrac + 0.25 * (note.weight == null ? 0.5 : note.weight),
          });
          notes.push.apply(notes, leadNotes);
          if (counter) notes.push.apply(notes, counterShadow(compose, vector, leadNotes, counter, rng, { interval: 9, minDur: 1, prob: 0.5, vel: 0.42, pan: -0.35 }));
          plan.risePhrase++;
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last };
        }

        // ---- climax: high, loud, long — the trailer moment --------------------
        if (sec.role === 'climax') {
          const lift = Math.max(CLIMAX_LIFT, plan.riseMaxShift + 3);   // always tops the rise
          const richClimax = clamp(vector.harmRich + 0.45, 0, 1);
          const gain = 0.85 + 0.15 * sec.intensity;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, richClimax, gain, rng));
          const leadNotes = leadPhrase(compose, vector, plan, chords, lead, rng, {
            bars, regShift: lift, centerOffset: 4, densityScale: 0.62, velBase: 0.92,
            weightFn: (note) => (note.tags && note.tags.indexOf('apex') >= 0) ? 1.0 : 0.55 + 0.4 * (note.weight == null ? 0.5 : note.weight),
          });
          notes.push.apply(notes, leadNotes);
          if (counter) notes.push.apply(notes, counterShadow(compose, vector, leadNotes, counter, rng, { interval: 9, minDur: 0.75, prob: 0.7, vel: 0.55, pan: -0.3 }));
          // The trailer-drum moment: one low boom on the climax's own downbeat.
          if (boomE && isFirstInSection) {
            notes.push({ beat: 0, durBeats: 1, midi: boomE.register[0], voice: boomE.voice, role: 'boom', vel: 0.7 * (boomE.level || 1), pan: 0 });
          }
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: Math.max(sec.intensity, 0.92), last };
        }

        // ---- return: the theme again, low and quiet ---------------------------
        if (sec.role === 'return') {
          const gain = 0.4 + 0.15 * sec.intensity;
          notes.push.apply(notes, padAndBass(compose, vector, plan, chords, pad, bass, richness, gain, rng));
          const leadNotes = leadPhrase(compose, vector, plan, chords, lead, rng, {
            bars, regShift: -RETURN_DROP, centerOffset: -2, densityScale: 0.8, velBase: 0.5,
            weightFn: (note) => 0.36 + 0.08 * (note.weight == null ? 0.5 : note.weight),   // contract: weight ~0.4
          });
          notes.push.apply(notes, leadNotes);
          return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last };
        }

        // Defensive fallback (never reached: every plan.sections role above is
        // handled) — a quiet held bar, so a future section role never silently
        // breaks the piece.
        return { notes, lengthBeats: bars * bb, bars, section: sec.role, intensity: sec.intensity, last };
      },
    },
  });

  // Sustained strings + long bass roots — the bed under every section
  // (contract: "sustained `chord` pads ... swelling with intensity"; "bass
  // long roots"). Voice-led bar to bar (voiceChord's nearest-motion) so the
  // pad breathes smoothly instead of jumping; `richness` and `gain` are the
  // caller's levers (climax pushes both up — "lush voicings at climax"). Lead
  // prominence trades off against the pad, so the "Lead prominence" live
  // control has an audible effect here too (classical.js's own comp formula
  // does the same inverse trade).
  function padAndBass(compose, vector, plan, chords, padE, bassE, richness, gain, rng) {
    const notes = [];
    const padGain = gain * (0.85 + 0.3 * (1 - vector.leadProm));
    let voicing = plan.padVoicing;
    chords.forEach((ch, i) => {
      if (padE) {
        voicing = compose.voiceChord(ch, padE.register, voicing, richness, rng);
        for (const n of compose.compBar(vector, ch, ch.beat, voicing, 'pad', rng)) {
          notes.push(Object.assign(n, {
            voice: padE.voice, role: 'pad',
            vel: (n.vel == null ? 0.8 : n.vel) * padGain * (padE.level || 1),
          }));
        }
      }
      if (bassE) {
        const nextCh = chords[i + 1];
        for (const n of compose.bassBar(vector, ch, nextCh, ch.beat, bassE.register, rng, { sustain: true })) {
          notes.push(Object.assign(n, {
            voice: bassE.voice, role: 'bass',
            vel: (n.vel == null ? 0.85 : n.vel) * (0.55 + 0.3 * gain) * (bassE.level || 1),
          }));
        }
      }
    });
    plan.padVoicing = voicing;
    return notes;
  }

  // The lead sings from the SAME committed rhythm cell every time (plan.motif)
  // — the germ motif restated through the arc. Holding rhythm (and, when the
  // caller doesn't override it, contour) invariant while register/
  // centerOffset/density carry the section's character is the "sequence"
  // family of operations (wiki/thematic-development-and-variation.md ranks it
  // top-tier recognizable: contour+rhythm preserved, only pitch level moves).
  // `weightFn`, when given, overrides melodyPhrase's own structural weight
  // per note — this pack's deliberate expression wiring (the contract: "SET
  // note.weight deliberately per section").
  function leadPhrase(compose, vector, plan, chords, leadE, rng, opts) {
    if (!leadE) return [];
    const shift = opts.regShift || 0;
    const reg = [leadE.register[0] + shift, leadE.register[1] + shift];
    const mel = compose.melodyPhrase(vector, chords, rng, {
      bars: opts.bars, register: reg, cadence: opts.cadence || 'none',
      contour: opts.contour || plan.contour, motif: plan.motif,
      centerOffset: opts.centerOffset || 0,
      densityScale: (opts.densityScale == null ? 1 : opts.densityScale) * (1 - vector.melTex * 0.4),
    });
    const n = mel.notes.length;
    const velBase = (opts.velBase == null ? 0.66 : opts.velBase) * (0.8 + 0.3 * vector.leadProm);
    return mel.notes.map((note, i) => {
      const w = opts.weightFn ? clamp(opts.weightFn(note, i, n), 0, 1) : note.weight;
      return Object.assign({}, note, {
        voice: leadE.voice, role: 'lead', weight: w,
        vel: velBase * (leadE.level || 1) * (0.82 + 0.32 * (w == null ? 0.5 : w)),
      });
    });
  }

  // A sparse glass shadow beneath the lead's longer notes, a sixth down —
  // color and reinforcement, never a competing line (contract: "sparse,
  // weight 0.4"). Used in rise/climax; adapted from Cantabile's rise/climax
  // counter-shadow.
  function counterShadow(compose, vector, leadNotes, counterE, rng, opts) {
    if (!counterE) return [];
    const pool = compose.scalePool(vector, counterE.register);
    const out = [];
    for (const n of leadNotes) {
      if (n.durBeats < (opts.minDur || 1) || !rng.bool(opts.prob == null ? 0.5 : opts.prob)) continue;
      const m = compose.nearestInPool(pool, n.midi - (opts.interval || 9), null);
      if (m == null) continue;
      out.push({
        beat: n.beat, durBeats: n.durBeats, midi: m,
        voice: counterE.voice, role: 'counter',
        vel: (opts.vel == null ? 0.4 : opts.vel) * (counterE.level || 1),
        weight: 0.4, pan: opts.pan == null ? -0.3 : opts.pan,
      });
    }
    return out;
  }

  // One soft echo of the theme's closing goal tone, a sixth below — see the
  // "dialogue" comment at the theme call site above.
  function themeEcho(compose, vector, leadNotes, counterE) {
    if (!counterE || !leadNotes.length) return [];
    const goal = leadNotes[leadNotes.length - 1];
    const pool = compose.scalePool(vector, counterE.register);
    const m = compose.nearestInPool(pool, goal.midi - 9, null);
    if (m == null) return [];
    return [{
      beat: Math.min(goal.beat + goal.durBeats * 0.5, goal.beat + goal.durBeats - 0.5),
      durBeats: Math.max(1, goal.durBeats * 0.6),
      midi: m, voice: counterE.voice, role: 'counter',
      vel: 0.32 * (counterE.level || 1), weight: 0.4, pan: 0.3, tags: ['echo'],
    }];
  }
})(typeof self !== 'undefined' ? self : this);
