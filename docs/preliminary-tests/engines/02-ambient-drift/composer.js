/*
 * ambient-drift — a reference COMPOSER for a generative AMBIENT engine, the
 * deliberate contrast to the metric, cadential tonal-classical engine.
 *
 * It is the browser realization of the single highest-value ambient recipe named
 * in wiki/ambient-and-generative-genre.md: the INCOMMENSURABLE-LOOP engine (Brian
 * Eno, Music for Airports, 1978) — "5–9 sound events ... assign each a repeat
 * period ... with mutually prime-ish periods ... slow attacks, long reverb ...
 * near-guaranteed listenability, well-documented precedent" — with the page's
 * recommended MOVING ELEMENT layered under it: "a drone plus one slowly moving
 * element is a legitimate complete texture." Here the moving element is a slow
 * modal harmonic DRIFT (the pad/drone step gently through a few consonant, non-
 * cadential regions), and the incommensurable loops are sparse BELL events whose
 * periods never realign — so the surface never exactly repeats.
 *
 * Contrast with tonal-classical, on audible axes (wiki/form-and-structure.md,
 * wiki/ambient-and-generative-genre.md "attention contract"): no meter, no
 * cadences, no fixed foreground melody to track; sparse events with silence doing
 * structural work; one mode; long sustains; harmonic stasis that drifts rather
 * than progresses. "As ignorable as it is interesting."
 *
 * OUTPUT differs from the classical composer's beats-based Note schema because
 * ambient is fundamentally time-based, not beat-based (a documented, honest
 * deviation like the classical engine's own): events carry { t, dur, midi, voice,
 * role, tags } in SECONDS. The performer (engine.js) adds only gentle correlated
 * humanization and a global pace/space, then hands the same performance-event
 * shape to the shared synth/fx as every engine does. Voices are the ambient
 * members of the shared synth palette: 'drone', 'pad', 'bell'.
 *
 * Pure and deterministic from the seed (no Web Audio, no Math.random, no globals).
 * Dual-format (UMD-lite): require() in Node, window.AM.composers.ambientDrift via
 * <script src> in a file:// browser. Depends on lib/theory.js + lib/rng.js.
 */
;(function (global, factory) {
  'use strict';
  let theory, rng;
  if (typeof module === 'object' && module.exports) {
    theory = require('../lib/theory.js');
    rng = require('../lib/rng.js');
    module.exports = factory(theory, rng);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.composers = AM.composers || {};
    AM.composers.ambientDrift = factory(AM.theory, AM.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (theory, rng) {
  'use strict';

  const { Rng } = rng;

  // Four consonant modal palettes — the "one mode, consonant set" the ambient
  // page insists on. Each is a scale plus the region degrees the harmony drifts
  // through (chosen to avoid diminished triads; the tonic always comes first).
  const PALETTES = {
    calm:   { scale: 'majorPentatonic', label: 'calm (major pentatonic)',  degrees: [1, 5, 6, 2] },
    warm:   { scale: 'lydian',          label: 'warm (lydian)',            degrees: [1, 2, 6, 5] },
    open:   { scale: 'dorian',          label: 'open (dorian)',            degrees: [1, 4, 7, 5] },
    shadow: { scale: 'naturalMinor',    label: 'shadow (natural minor)',   degrees: [1, 6, 4, 3] },
  };
  const DEFAULT_PALETTE = 'warm';

  // Near-coprime, non-integer periods (seconds) for the incommensurable bell
  // loops — the load-bearing idea (Eno's "not likely to come back into sync").
  // Chosen so every pairwise ratio stays >=0.045 from any n/d (n,d<=3) and the
  // earliest near-realignment of any pair is beyond ~190 s (past a full piece).
  const LOOP_PERIODS = [17.5, 23, 28.5, 32.1, 40];

  function pcSet(midis) { const s = new Set(); for (const m of midis) s.add(((m % 12) + 12) % 12); return s; }

  // Snap `target` to the nearest member of the scale-tone pool.
  function snapToScale(pool, target) {
    let best = pool[0], bd = Infinity;
    for (const m of pool) { const d = Math.abs(m - target); if (d < bd) { bd = d; best = m; } }
    return best;
  }

  // A consonant pad voicing around `root`: root + perfect fifth + octave + one
  // scale-flavored third (snapped to the mode). Fifths/octaves are consonant for
  // any root; the third carries the modal color. Avoids any diminished-triad risk.
  function padVoicing(root, scalePool) {
    const third = snapToScale(scalePool, root + 3.5); // nearest minor/major third in the mode
    return [root, third, root + 7, root + 12];
  }

  function composeDrift(opts = {}) {
    const seed = opts.seed == null ? 1 : opts.seed;
    const paletteKey = PALETTES[opts.palette] ? opts.palette : DEFAULT_PALETTE;
    const palette = PALETTES[paletteKey];
    const scaleName = palette.scale;
    const tonicMidi = typeof opts.tonic === 'string' ? theory.noteToMidi(opts.tonic)
      : (opts.tonic == null ? theory.noteToMidi('D3') : opts.tonic);
    const durationSec = opts.durationSec == null ? 150 : opts.durationSec;

    const master = new Rng(seed);
    const hr = master.stream('harmony');
    const br = master.stream('bells');
    const tr = master.stream('time');

    // Scale-tone pools by register.
    const padPool = theory.scale(tonicMidi, scaleName, { octaves: 3 }).filter((m) => m >= tonicMidi && m <= tonicMidi + 24);
    const bellLo = tonicMidi + 19, bellHi = tonicMidi + 38;
    const bellPool = theory.scale(tonicMidi, scaleName, { octaves: 4 }).filter((m) => m >= bellLo && m <= bellHi);

    // ---- Harmonic drift: a sequence of consonant regions -------------------
    // Region roots step through the palette's degrees (tonic first), each region
    // an incommensurable ~26–40 s long. Regions tile/loop until durationSec, with
    // pad/drone tones CROSSFADED into the next so transitions are seamless, never a
    // cadence.
    //
    // v0.1.2 (Engine-02 "static in the middle of sustained notes" pass): the PAD
    // overlap must be SHORT. The launch version held the departing region's full
    // pad voicing at near-full level for an 8 s overlap while the arriving voicing
    // was already at full level — so for several seconds at every region boundary
    // TWO complete modal voicings sounded together, and their dense, closely-spaced
    // partials beat within critical bands. On the exposed, quiet ambient bed that
    // beating is heard as "static" (wiki/auditory-perception-basics.md: "a synth
    // pad exposes tuning errors a fast melodic line would hide" — roughness at ~25%
    // of a critical bandwidth, Plomp & Levelt 1965). Offline analysis of the
    // reported seed localized the sustained-static ranges to exactly these region
    // crossfades. The fix is a genuine crossfade: a short PAD overlap so the old
    // voicing has faded out (its envelope release) before the new is fully in, never
    // two full voicings at once. The DRONE keeps a long overlap — it is a smooth
    // sub with no upper partials, so it never adds roughness, and its long tail
    // keeps the bass continuous under the pad crossfade (no gap in the bed).
    const events = [];
    const regions = [];
    const padOverlap = 4;                    // short pad crossfade — no double-voicing beating
    const droneOverlap = 8;                  // long drone tail — continuous bass under the crossfade
    let t = 0, ri = 0;
    while (t < durationSec) {
      const deg = palette.degrees[ri % palette.degrees.length];
      const root = theory.scaleDegree(tonicMidi, scaleName, deg);
      const len = tr.float(26, 40);
      const endSec = t + len;
      const voicing = padVoicing(root, padPool);
      const tags = ['region:' + ri, 'degree:' + deg];
      const baseLen = Math.min(durationSec - t, len);
      // Drone: root (and a sub octave), long overlap so the bass never drops out.
      events.push({ t, dur: baseLen + droneOverlap, midi: root - 12, voice: 'drone', role: 'drone', tags: tags.slice() });
      // Pad: the voicing, each tone entering with a small stagger (a slow bloom),
      // held only a short way into the next region (crossfade, not double-sustain).
      voicing.forEach((m, k) => {
        events.push({ t: t + k * tr.float(0.15, 0.5), dur: baseLen + padOverlap - k * 0.2, midi: m, voice: 'pad', role: 'harmony', tags: tags.slice() });
      });
      regions.push({ startSec: +t.toFixed(2), endSec: +Math.min(endSec, durationSec).toFixed(2), degree: deg,
        root: theory.midiToNoteName(root), chordTones: voicing.map((m) => theory.midiToNoteName(m)) });
      t = endSec; ri++;
    }

    // ---- Incommensurable bell loops (the Airports pattern) -----------------
    // K loops, each with its own near-coprime period, phase offset, and a fixed
    // mode pitch (some loops a slow 2-note gesture). They overlap without ever
    // realigning. Bells are mode tones, consonant with the drifting modal harmony.
    const K = 5;
    const periods = hr.shuffle(LOOP_PERIODS.slice()).slice(0, K);
    const loops = [];
    const bellEvents = [];                     // collected first, then polyphony-capped
    for (let k = 0; k < K; k++) {
      const period = periods[k];
      const offset = tr.float(0, period);
      const pitch = br.pick(bellPool);
      const gesture = br.bool(0.35);          // some loops are a slow 2-note fall/rise
      const partner = gesture ? snapToScale(bellPool, pitch + (br.bool(0.5) ? 3 : -3)) : null;
      const ring = tr.float(5.5, 7.5);        // long ring (v0.1.2: upper bound trimmed 9→7.5 so long bells linger — and pile up — a little less)
      loops.push({ periodSec: +period.toFixed(2), offsetSec: +offset.toFixed(2), pitch: theory.midiToNoteName(pitch), gesture });
      for (let m = 0; ; m++) {
        const at = offset + m * period;
        if (at >= durationSec) break;
        // gentle per-iteration loudness drift + a rare octave lift keep it alive
        const vel = 0.5 + 0.4 * br.float(0, 1);
        bellEvents.push({ t: at, dur: ring, midi: pitch, voice: 'bell', role: 'lead', vel, tags: ['loop:' + k, 'period:' + period.toFixed(1)] });
        if (gesture && at + 1.6 < durationSec) {
          bellEvents.push({ t: at + tr.float(1.1, 1.9), dur: ring * 0.8, midi: partner, voice: 'bell', role: 'lead', vel: vel * 0.85, tags: ['loop:' + k, 'gesture'] });
        }
      }
    }

    // A single soft "arrival" bell high tone near the golden-ish middle, as a
    // gentle focal point (still ignorable) — one intentional event in a field of
    // process, the ambient analog of a climax. Always kept (exempt from the cap).
    const focal = snapToScale(bellPool, tonicMidi + 31);
    const focalEv = { t: durationSec * 0.5 + tr.float(-6, 6), dur: 11, midi: focal, voice: 'bell', role: 'lead', vel: 0.7, tags: ['focal'] };

    // POLYPHONY CAP (v0.1.2): at most MAX_BELLS bells ringing at once. The five
    // incommensurable loops occasionally line up so that five long, INHARMONIC bells
    // sound together; their partials (ratios 1 : 2.01 : 2.98 : 4.2) then pile into a
    // dense, rough high cluster — the SECOND "static" trigger the offline analysis
    // found (the reported ~01:40 range, the roughest point in the recording). Most
    // of the time far fewer bells overlap, so a small cap thins ONLY the densest
    // moments; the loops still overlap and never realign the rest of the time, so
    // the Airports idea is intact (it removes ~13% of hits at the default seed).
    // Deterministic: earliest-onset hits win; the focal tone is always kept.
    const MAX_BELLS = 4;
    bellEvents.sort((a, b) => a.t - b.t || a.midi - b.midi);
    const keptBells = [focalEv];
    for (const b of bellEvents) {
      let active = 0;
      for (const kb of keptBells) if (kb.t <= b.t && kb.t + kb.dur > b.t) active++;
      if (active < MAX_BELLS) keptBells.push(b);
    }
    for (const b of keptBells) events.push(b);

    events.sort((a, b) => a.t - b.t || a.midi - b.midi);

    const selfReport = {
      engine: 'ambient-drift',
      form: 'incommensurable loops over a slow modal drift (no meter, no cadence)',
      key: theory.midiToNoteName(tonicMidi).replace(/-?\d+$/, '') + ' ' + palette.label,
      durationSec: Math.round(durationSec),
      regionCount: regions.length,
      regions: regions.map((r) => ({ root: r.root, degree: r.degree, span: `${r.startSec}–${r.endSec}s` })),
      loops: loops.map((l) => ({ pitch: l.pitch, periodSec: l.periodSec, gesture: l.gesture })),
      idea: 'Eno’s Music for Airports recipe: a few sustained tones/bells on mutually prime-ish periods that never realign, over a drone that drifts through consonant modal regions.',
    };

    return { meta: { seed, tonic: theory.midiToNoteName(tonicMidi), palette: paletteKey, scaleName, durationSec }, regions, loops, events, selfReport };
  }

  return { composeDrift, PALETTES, LOOP_PERIODS };
});
