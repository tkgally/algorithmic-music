/*
 * perform — the generalized performer: one unit of composed Note events in
 * (unit-relative, quarter-note) beats -> timed, dynamically shaped, expressive
 * Performance events in seconds, per the style vector's Surface/Expression
 * fields.
 *
 * Generalizes the five preliminary engines' proven performer patterns
 * (site-architecture §9) into one vector-driven module:
 *   - PHRASE-ARCH rubato per unit (units align to phrases): edges a little
 *     slower than the middle, depth = expression × the style's rubato
 *     allowance (engine 01 v0.2, wiki/expressive-performance.md);
 *   - FINAL RITARDANDO (sqrt curve) on the piece's last unit for cadence/
 *     ring-out endings (the stopping-runner model);
 *   - SWING as a per-beat phase warp over a quantized grid, plus fixed
 *     per-voice LAID-BACK offsets — structured microtiming, never i.i.d.
 *     noise (engine 03, wiki/groove-and-embodiment.md);
 *   - a velocity HIERARCHY: metric accents × phrase arch × high-loud ×
 *     a correlated AR(1) residual per voice (all engines);
 *   - ARTICULATION by voice/tags (détaché default, repeated notes separated,
 *     cadence notes ring — engine 01);
 *   - EXPRESSION objects for the intra-note expressive voices (aria/reed/
 *     wire/glass): drive = expression × structural weight, scaled into
 *     vibrato/swell/scoop exactly as engine 04's performer does.
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
  // expressive voices that read note.expr (engine 04's palette)
  const EXPRESSIVE = { aria: 1, reed: 1, wire: 1, glass: 1 };
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

  /**
   * realize(unit, vector, rng, opts) -> { events, durSec }
   *   unit: from compose (notes in unit-relative quarter beats)
   *   rng:  the per-unit performance stream (deterministic)
   *   opts: { ritardando?: bool, ritSlow?: number }
   * Events: { tSec (unit-relative), durSec, freq, vel, voice, midi, beat,
   *           tags, p, expr, pan } — freq from midi unless the note carries one.
   */
  function realize(unit, vector, rng, opts) {
    opts = opts || {};
    const spb0 = 60 / vector.bpm;
    const L = unit.lengthBeats;
    const rubatoDepth = vector.free ? 0.10 * vector.expression
      : 0.055 * vector.expression * (vector.rubato == null ? 0.5 : vector.rubato) * 2;
    const rit = opts.ritardando ? (opts.ritSlow || 1.45) : 1;
    const ritStartT = 0.55; // rit over the last 45% of the final unit

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
    const intensity = clamp(unit.intensity == null ? 0.65 : unit.intensity, 0.05, 1);
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

    const events = [];
    for (const n of unit.notes) {
      const voice = n.voice;
      const oneShot = ONE_SHOT[voice];
      // --- timing ---
      const sBeat = sw && !vector.free ? swingBeat(n.beat, sw) : n.beat;
      const res = residual(voice, oneShot ? 0.004 : 0.006, oneShot ? 0.05 : 0.04);
      let tSec = beatToSec(sBeat) + (LAID_BACK[voice] || 0) * laidAmt * 2 + res.t * (0.4 + vector.expression);
      if (rollIdx.has(n)) tSec += rollIdx.get(n) * 0.009;
      if (tSec < 0) tSec = 0;

      // --- dynamics ---
      const inBar = ((n.beat % bb) + bb) % bb;
      const onGrid = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
      let accent = accents.some((a) => Math.abs(inBar - a) < 1e-6) ? 1.0 : onGrid ? 0.9 : 0.82;
      if (voice === 'chord' || voice === 'pad') accent = 0.92 + 0.08 * accent;
      const p = clamp(n.beat / Math.max(1, L), 0, 1);
      const archDyn = 1 + 0.1 * vector.expression * Math.sin(Math.PI * p);
      let highLoud = 1;
      if ((n.role === 'lead' || voice === 'melody') && melRef && n.midi) highLoud = clamp(1 + 0.18 * ((n.midi - melRef) / 12), 0.82, 1.22);
      const base = n.vel == null ? 0.7 : n.vel;
      let vel = base * (0.35 + 0.65 * intensity) * accent * archDyn * highLoud * (1 + res.d * (0.5 + vector.dynRange));
      // dynamic-range mapping around a 0.55 center
      vel = 0.55 + (vel - 0.55) * dynSpan * 1.4;
      if (n.tags && n.tags.indexOf('apex') >= 0) vel *= 1.08;
      if (n.tags && n.tags.some((t) => t.indexOf('cadence') === 0)) vel *= 0.92;
      vel = clamp(vel, 0.04, 1);

      // --- articulation / duration ---
      let durSec;
      if (oneShot) {
        durSec = Math.max(0.05, n.durBeats * spb0);
      } else {
        const slotEnd = sw && !vector.free ? swingBeat(n.beat + n.durBeats, sw) : n.beat + n.durBeats;
        const slot = beatToSec(slotEnd) - beatToSec(sBeat);
        let artic;
        const isCad = n.tags && n.tags.some((t) => t.indexOf('cadence') === 0 || t === 'ending');
        if (n.role === 'lead' || voice === 'melody') {
          if (isCad) artic = 1.0;
          else if (n.durBeats >= 2) artic = 0.96;
          else if (nextPitch.get(n) === n.midi) artic = 0.72;
          else artic = 0.86 + 0.1 * vector.expression * (rng.next() - 0.5);
        } else if (voice === 'chord' || voice === 'pad' || voice === 'drone') {
          artic = isCad ? 1.0 : 0.95;
        } else {
          artic = isCad ? 1.0 : 0.92;
        }
        durSec = Math.max(0.06, slot * artic);
      }

      // --- expression objects for the intra-note expressive voices ---
      let expr = n.expr;
      if (EXPRESSIVE[voice]) {
        const weight = n.weight == null ? 0.5 : n.weight;
        const drive = clamp(vector.expression * weight * (0.5 + 0.7 * intensity), 0, 1);
        const base2 = expr || {};
        expr = Object.assign({
          vibDepth: 6 + 26 * drive, vibRate: 4.6 + 1.4 * drive, vibDelay: Math.max(0.12, 0.5 - 0.3 * drive),
          swell: 0.25 + 0.55 * drive, swellPos: 0.55,
          scoop: (n.tags && n.tags.indexOf('phraseStart') >= 0 ? 18 : 6) * drive,
          bright: 0.4 + 0.5 * drive, grain: 0.15 + 0.3 * vector.expression * (1 - intensity * 0.5),
        }, base2);
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

  return { realize, swingBeat };
});
