/*
 * perform — the generalized performer: one unit of composed Note events in
 * (unit-relative, quarter-note) beats -> timed, dynamically shaped, expressive
 * Performance events in seconds, per the style vector's Surface/Expression
 * fields.
 *
 * Since session 039 this module contains a real EXPRESSION LAYER — a separate,
 * documented pass that runs AFTER composition (the notes are already decided)
 * and shapes their performance from each passage's role in the whole piece.
 * The architecture question Tom raised (compose the entire piece first, then
 * apply expression holistically?) is answered here without abandoning the
 * just-in-time loop: the piece's dramatic FORM — sections, their kinds and
 * intensities, the arc, the total length — is fully decided in strategy.init()
 * before a single note sounds, and the composer wrapper stamps every unit with
 * its position in that form (unit.tPiece, unit.arcLevel, unit.intensity,
 * unit.section) while the notes carry structural weight and tags (apex,
 * cadence, phraseStart, breath, ending). So the expression pass knows what the
 * passage IS — an opening statement, a departure, the peak, the close — which
 * is the "holistic" knowledge that matters for tone/volume/timing contours,
 * and live no-restart setting changes survive intact.
 *
 * The passes, in order (all deterministic, all from the caller's stream):
 *   1. PHRASE ANALYSIS: each melodic line (lead/counter voices) is segmented
 *      into slur groups at composed rests, phraseStart/breath tags, and
 *      cadence ends; each group learns its apex.
 *   2. TEMPO: phrase-arch rubato per unit (edges slower than the middle),
 *      depth = expression x the style's rubato allowance, deeper in quiet
 *      passages than at peaks; final ritardando (sqrt curve) on the last unit;
 *      SWING as a per-beat phase warp; fixed per-voice LAID-BACK offsets;
 *      agogics — a slight hesitation entering a phrase, a lean on the apex.
 *   3. LEGATO: within a slur group, successive different-pitch notes OVERLAP
 *      slightly (like a pianist's legato — the previous note releases just
 *      after the next sounds); repeated notes re-articulate; phrase ends
 *      breathe; cadence/ending notes ring full. The legato amount follows the
 *      style (expression + rubato up, swing/timeline down), so a groove lead
 *      stays detached while a classical or invented cantabile line binds.
 *   4. DYNAMICS: metric accents x per-PHRASE arch (crescendo into the phrase
 *      apex, easing after) x high-loud x a correlated AR(1) residual per
 *      voice — never i.i.d. per-note noise.
 *   5. INTRA-NOTE EXPRESSION for the sustained expressive voices (aria/reed/
 *      wire/glass/organ/horn/voce): drive = expression x structural weight x
 *      arc level, scaled into vibrato/swell/scoop/grain; slurred pairs get a
 *      short PORTAMENTO into the new pitch (variable frequency between notes,
 *      not only within them).
 *
 * Pure: no Web Audio here. Deterministic: all randomness from the caller's
 * per-unit stream. Original first-party code (CC0). Dual-format (UMD-lite):
 * window.AM.perform in the browser, require() in Node for headless tests.
 */
;(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory({ theory: require('./theory.js') });
  } else {
    const AM = global.AM || (global.AM = {});
    AM.perform = factory({ theory: AM.theory });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { theory } = deps;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // one-shot percussive voices: fixed sounding length, no artic scaling
  const ONE_SHOT = { kick: 1, snare: 1, hat: 1, clap: 1, shaker: 1, scrape: 1, wood: 1, drum: 1, boom: 1, metal: 1, chime: 1, friction: 1, gong: 1 };
  // sustained voices that read note.expr for intra-note expression (engine 04's
  // palette + the session-039 rich voices)
  const EXPRESSIVE = { aria: 1, reed: 1, wire: 1, glass: 1, organ: 1, horn: 1, voce: 1 };
  // fixed laid-back offsets (seconds at full laidBack=1), per voice family —
  // structured feel, applied BEFORE the residual (engine 03's table, scaled)
  const LAID_BACK = { snare: 0.022, hat: 0.008, rhodes: 0.006, bell: 0.012, chord: 0.006, pad: 0.01, mallet: 0.008, keys: 0.004 };

  // Swing: a per-beat phase warp — offbeats (x=0.5 of a quarter) land at `sw`
  // instead, sixteenth offbeats proportionally (engine 03's single-knob shuffle).
  function swingBeat(beat, sw) {
    if (!(sw > 0.5)) return beat;
    const b0 = Math.floor(beat + 1e-9);
    const x = beat - b0;
    const xw = x <= 0.5 ? (x / 0.5) * sw : sw + ((x - 0.5) / 0.5) * (1 - sw);
    return b0 + xw;
  }

  // ---- pass 1: phrase analysis ----------------------------------------------
  // Segment each melodic line into slur groups and annotate every note with its
  // position, apex-ness, and whether it binds (legato) to its neighbors. A slur
  // breaks at a composed rest (> BREATH_GAP beats), an explicit phraseStart/
  // breath tag, or after a cadence/ending note. Notes sharing an onset (a
  // chordal lead) never slur — legato is a single-line gesture.
  const BREATH_GAP = 0.26; // beats: anything longer is a composed breath
  function analyzePhrases(unit) {
    const lineOf = new Map();
    const byVoice = new Map();
    for (const n of unit.notes) {
      if (ONE_SHOT[n.voice] || n.midi == null) continue;
      if (!(n.role === 'lead' || n.voice === 'melody' || n.role === 'counter')) continue;
      if (!byVoice.has(n.voice)) byVoice.set(n.voice, []);
      byVoice.get(n.voice).push(n);
    }
    for (const list of byVoice.values()) {
      list.sort((a, b) => a.beat - b.beat || (a.midi || 0) - (b.midi || 0));
      const phrases = [];
      let cur = [];
      for (let i = 0; i < list.length; i++) {
        const n = list[i], prev = list[i - 1];
        const breaks = !prev
          || n.beat - (prev.beat + prev.durBeats) > BREATH_GAP
          || (n.tags && n.tags.indexOf('phraseStart') >= 0 && n.beat > 1e-6)
          || (prev.tags && prev.tags.some((t) => t.indexOf('cadence') === 0 || t === 'breath' || t === 'ending'));
        if (breaks && cur.length) { phrases.push(cur); cur = []; }
        cur.push(n);
      }
      if (cur.length) phrases.push(cur);
      for (const ph of phrases) {
        let apex = 0;
        for (let i = 1; i < ph.length; i++) if ((ph[i].midi || 0) > (ph[apex].midi || 0)) apex = i;
        for (let i = 0; i < ph.length; i++) {
          const n = ph[i], nx = ph[i + 1], pv = ph[i - 1];
          const contiguous = (a, b) => b.beat - (a.beat + a.durBeats) <= BREATH_GAP && b.beat - a.beat > 1e-6;
          lineOf.set(n, {
            pos: ph.length < 2 ? 0 : i / (ph.length - 1),
            apexPos: ph.length < 2 ? 0.6 : Math.max(0.15, apex / (ph.length - 1)),
            isApex: i === apex && ph.length > 2,
            first: i === 0, last: i === ph.length - 1,
            slurNext: !!nx && nx.midi !== n.midi && contiguous(n, nx),
            slurPrev: !!pv && pv.midi !== n.midi && contiguous(pv, n),
            prevMidi: pv ? pv.midi : null,
          });
        }
      }
    }
    return lineOf;
  }

  /**
   * realize(unit, vector, rng, opts) -> { events, durSec }
   *   unit: from compose (notes in unit-relative quarter beats; the wrapper
   *         stamps tPiece/arcLevel/intensity/section)
   *   rng:  the per-unit performance stream (deterministic)
   *   opts: { ritardando?: bool, ritSlow?: number }
   * Events: { tSec (unit-relative), durSec, freq, vel, voice, midi, beat,
   *           tags, p, expr, pan } — freq from midi unless the note carries one.
   */
  function realize(unit, vector, rng, opts) {
    opts = opts || {};
    const spb0 = 60 / vector.bpm;
    const L = unit.lengthBeats;
    const intensity = clamp(unit.intensity == null ? 0.65 : unit.intensity, 0.05, 1);
    const arcL = unit.arcLevel == null ? intensity : clamp(0.5 * intensity + 0.5 * unit.arcLevel, 0.05, 1);
    const rubAllow = vector.rubato == null ? 0.5 : vector.rubato;
    // rubato depth: expression x the style's allowance, breathing MORE in quiet
    // passages than at peaks (a driving peak holds its tempo) — audibly deeper
    // than the pre-039 mapping for lyrical styles, still tight for grooves.
    const rubatoDepth = vector.free ? 0.10 * vector.expression
      : clamp(0.16 * vector.expression * rubAllow * (1.15 - 0.5 * intensity), 0, 0.09);
    const rit = opts.ritardando ? (opts.ritSlow || 1.45) : 1;
    const ritStartT = 0.55; // rit over the last 45% of the final unit

    // legato amount: how much this STYLE binds its lines. Expression and rubato
    // raise it; swing and a timeline (groove skeletons) lower it — a lofi lead
    // stays detached, a classical line binds.
    const legato = clamp(0.25 + 0.55 * vector.expression + 0.3 * rubAllow
      - 0.45 * vector.swing - (vector.timeline && vector.timeline !== 'none' ? 0.18 : 0), 0, 1);

    const lineOf = analyzePhrases(unit);

    // beat -> seconds map in 1/8-beat steps: phrase arch (edges slower) + rit.
    // The map extends past the unit's end to cover notes that SOUND beyond it
    // (ambient drones/pads overlap the next unit) — the arch/rit warp applies
    // inside the unit, straight tempo beyond.
    const step = 0.125;
    let mapEnd = L;
    for (const n of unit.notes) mapEnd = Math.max(mapEnd, n.beat + n.durBeats);
    const map = [0];
    let t = 0;
    for (let b = step; b <= mapEnd + step / 2; b += step) {
      const p = clamp((b - step) / Math.max(step, L), 0, 1);
      const arch = 1 + rubatoDepth * Math.cos(2 * Math.PI * p); // slow edges, faster middle
      let r = 1;
      if (rit > 1 && p > ritStartT) r = 1 + (rit - 1) * Math.sqrt((p - ritStartT) / (1 - ritStartT));
      map.push(t += spb0 * arch * r * step);
    }
    const beatToSec = (beat) => map[clamp(Math.round(beat / step), 0, map.length - 1)];

    const sw = vector.swing > 0 ? 0.5 + 0.32 * vector.swing : 0; // ratio 1:1 .. ~2.4:1
    const laidAmt = vector.laidBack == null ? 0.5 : vector.laidBack;

    // AR(1) residual walks per voice (timing + dynamics), innovation from rng —
    // correlated, below JND, never i.i.d. per-note noise.
    const phi = 0.8, kInnov = Math.sqrt(1 - phi * phi);
    const walks = {};
    function residual(voice, sigT, sigD) {
      const w = walks[voice] || (walks[voice] = { t: 0, d: 0 });
      w.t = clamp(phi * w.t + kInnov * sigT * (rng.next() * 2 - 1) * 1.7, -2.4 * sigT, 2.4 * sigT);
      w.d = clamp(phi * w.d + kInnov * sigD * (rng.next() * 2 - 1) * 1.7, -2.4 * sigD, 2.4 * sigD);
      return w;
    }

    // repeated-pitch lookup for the lead (articulation: separate repeats)
    const leadNotes = unit.notes.filter((n) => n.role === 'lead' || n.voice === 'melody').sort((a, b) => a.beat - b.beat);
    const nextPitch = new Map();
    for (let i = 0; i < leadNotes.length; i++) nextPitch.set(leadNotes[i], i + 1 < leadNotes.length ? leadNotes[i + 1].midi : null);
    let melRef = 0;
    if (leadNotes.length) { for (const n of leadNotes) melRef += n.midi || 0; melRef /= leadNotes.length; }

    // chord-roll: stack chord-voice notes sharing an onset, roll low->high
    const rollIdx = new Map();
    const byOnset = new Map();
    for (const n of unit.notes) {
      if (n.voice !== 'chord' && n.voice !== 'rhodes' && n.voice !== 'pluck') continue;
      const k = n.voice + ':' + n.beat.toFixed(3);
      if (!byOnset.has(k)) byOnset.set(k, []);
      byOnset.get(k).push(n);
    }
    for (const list of byOnset.values()) { list.sort((a, b) => (a.midi || 0) - (b.midi || 0)); list.forEach((n, i) => rollIdx.set(n, i)); }

    const accents = vector.meter.accents || [];
    const bb = vector.meter.barBeats;
    const dynSpan = 0.35 + 0.65 * vector.dynRange; // how far dynamics swing around the center
    const phraseDynAmt = 0.05 + 0.11 * vector.expression * (0.5 + 0.5 * vector.dynRange);

    const events = [];
    for (const n of unit.notes) {
      const voice = n.voice;
      const oneShot = ONE_SHOT[voice];
      const li = lineOf.get(n);
      const isCad = n.tags && n.tags.some((tg) => tg.indexOf('cadence') === 0 || tg === 'ending');
      // --- timing ---
      const sBeat = sw && !vector.free ? swingBeat(n.beat, sw) : n.beat;
      const res = residual(voice, oneShot ? 0.004 : 0.006, oneShot ? 0.05 : 0.04);
      let tSec = beatToSec(sBeat) + (LAID_BACK[voice] || 0) * laidAmt * 2 + res.t * (0.4 + vector.expression);
      if (rollIdx.has(n)) tSec += rollIdx.get(n) * 0.009;
      // agogics: a breath of hesitation entering a phrase, a lean on the apex
      // (never on beat 1 of the unit — the downbeat anchors the ensemble)
      if (li && li.first && n.beat > 1e-6) tSec += (0.006 + 0.03 * rubAllow) * vector.expression;
      if (li && li.isApex) tSec += 0.011 * vector.expression * rubAllow;
      if (tSec < 0) tSec = 0;

      // --- dynamics ---
      const inBar = ((n.beat % bb) + bb) % bb;
      const onGrid = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
      let accent = accents.some((a) => Math.abs(inBar - a) < 1e-6) ? 1.0 : onGrid ? 0.9 : 0.82;
      if (voice === 'chord' || voice === 'pad') accent = 0.92 + 0.08 * accent;
      let shapeDyn;
      if (li) {
        // per-PHRASE arch: crescendo into the phrase's own apex, easing after —
        // the vocal shape of a sung line, not a flat per-unit wash
        const x = li.pos, ax = li.apexPos;
        const shape = x <= ax ? x / ax : 1 - 0.9 * ((x - ax) / Math.max(0.15, 1 - ax));
        shapeDyn = 1 - phraseDynAmt * 0.35 + phraseDynAmt * shape;
        if (li.last && !isCad) shapeDyn *= 0.94; // phrase ends ease off
      } else {
        const p = clamp(n.beat / Math.max(1, L), 0, 1);
        shapeDyn = 1 + 0.1 * vector.expression * Math.sin(Math.PI * p);
      }
      let highLoud = 1;
      if ((n.role === 'lead' || voice === 'melody') && melRef && n.midi) highLoud = clamp(1 + 0.18 * ((n.midi - melRef) / 12), 0.82, 1.22);
      const base = n.vel == null ? 0.7 : n.vel;
      let vel = base * (0.35 + 0.65 * intensity) * accent * shapeDyn * highLoud * (1 + res.d * (0.5 + vector.dynRange));
      // dynamic-range mapping around a 0.55 center
      vel = 0.55 + (vel - 0.55) * dynSpan * 1.4;
      if (n.tags && n.tags.indexOf('apex') >= 0) vel *= 1.08;
      if (n.tags && n.tags.some((tg) => tg.indexOf('cadence') === 0)) vel *= 0.92;
      vel = clamp(vel, 0.04, 1);

      // --- articulation / duration (the legato pass) ---
      let durSec;
      if (oneShot) {
        durSec = Math.max(0.05, n.durBeats * spb0);
      } else {
        const slotEnd = sw && !vector.free ? swingBeat(n.beat + n.durBeats, sw) : n.beat + n.durBeats;
        const slot = beatToSec(slotEnd) - beatToSec(sBeat);
        if (li && isCad) {
          durSec = slot * (1.0 + 0.06 * vector.expression); // goal tones ring a little past full value
        } else if (li && li.slurNext && legato > 0.35) {
          // LEGATO: hold into the next note — overlap grows with the note's own
          // length (a long note hands over more audibly), capped ~140 ms
          durSec = slot + Math.min(0.14, 0.035 + 0.22 * slot) * legato;
          if (li.isApex) durSec += 0.03 * legato; // the apex lingers
        } else if (li) {
          let artic;
          if (nextPitch.get(n) === n.midi) artic = 0.72;               // repeated notes re-articulate
          else if (li.last) artic = 0.9;                                // phrase end breathes
          else if (n.durBeats >= 2) artic = 0.96;
          else artic = 0.86 + 0.1 * vector.expression * (rng.next() - 0.5);
          durSec = slot * artic;
        } else if (voice === 'chord' || voice === 'pad' || voice === 'drone') {
          durSec = slot * (isCad ? 1.0 : 0.95);
        } else if (n.role === 'lead' || voice === 'melody') {
          durSec = slot * (isCad ? 1.0 : nextPitch.get(n) === n.midi ? 0.72 : 0.86 + 0.1 * vector.expression * (rng.next() - 0.5));
        } else {
          durSec = slot * (isCad ? 1.0 : 0.92);
        }
        durSec = Math.max(0.06, durSec);
      }

      // --- intra-note expression for the sustained expressive voices ---
      let expr = n.expr;
      if (EXPRESSIVE[voice]) {
        const weight = n.weight == null ? 0.5 : n.weight;
        // drive: expression x structural weight x where the piece is (arc level
        // folds the section's role in the whole form into every note)
        const drive = clamp(vector.expression * weight * (0.4 + 0.8 * arcL), 0, 1);
        const base2 = expr || {};
        // portamento: a slurred step GLIDES from the previous pitch (variable
        // frequency BETWEEN notes) — small intervals only; leaps re-articulate
        let onsetCents = null, onsetSec = null;
        if (li && li.slurPrev && li.prevMidi != null && legato > 0.35) {
          const dSemi = li.prevMidi - n.midi;
          if (Math.abs(dSemi) <= 7) { onsetCents = clamp(dSemi * 100 * 0.9, -500, 500); onsetSec = 0.04 + 0.07 * legato; }
        }
        expr = Object.assign({
          vibDepth: 6 + 26 * drive, vibRate: 4.6 + 1.4 * drive, vibDelay: Math.max(0.12, 0.5 - 0.3 * drive),
          swell: 0.25 + 0.55 * drive, swellPeak: 0.55,
          scoop: onsetCents != null ? 0 : (li && li.first ? 18 : 6) * drive,
          bright: 0.4 + 0.5 * drive, grain: 0.15 + 0.3 * vector.expression * (1 - intensity * 0.5),
          drift: 1.5 + 2.5 * vector.expression,
        }, onsetCents != null ? { onsetCents, onsetSec } : null, base2);
        if (expr.scoop && expr.onsetCents == null) { expr.onsetCents = -expr.scoop; expr.onsetSec = expr.onsetSec || 0.09; }
      }

      events.push({
        tSec, durSec,
        freq: n.freq != null ? n.freq : (n.midi != null ? theory.midiToFreq(n.midi) : 220),
        vel, voice, role: n.role, midi: n.midi, beat: n.beat, tags: n.tags || [],
        p: n.p, expr, pan: n.pan,
      });
    }

    // echo-tail signature (invented styles, schema §4): stronger lead notes are
    // answered by a soft same-voice echo `delay` beats later — an audible
    // fingerprint the listener can latch onto. Every other note only, so the
    // texture never doubles in density.
    const echoSig = vector.signatures && vector.sigEmph > 0.1
      ? vector.signatures.filter((s) => s.type === 'echoTail')[0] : null;
    if (echoSig) {
      const echoes = [];
      let k = 0;
      for (const ev of events) {
        if (ev.role !== 'lead' || ev.vel < 0.4 || ONE_SHOT[ev.voice]) continue;
        if ((k++ % 2) !== 0) continue;
        echoes.push(Object.assign({}, ev, {
          tSec: ev.tSec + echoSig.delay * spb0,
          vel: ev.vel * (0.22 + 0.2 * vector.sigEmph),
          durSec: Math.min(ev.durSec, 1.2),
          tags: (ev.tags || []).concat('echo'),
        }));
      }
      for (const e of echoes) events.push(e);
    }

    events.sort((a, b) => a.tSec - b.tSec);
    return { events, durSec: beatToSec(L) };
  }

  return { realize, swingBeat, analyzePhrases };
});
