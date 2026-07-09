/*
 * cantabile engine (Engine 04) — Performer + Synthesizer wiring + Scheduler.
 *
 * The expressive engine. Its whole point is the singing of individual notes, so
 * the PERFORMER here is the substantial part (in tonal-classical the composer was):
 * it turns each note's structural WEIGHT (how important the composer said it is) and
 * the piece's TENSION ARC into a concrete per-note expression gesture — a scoop or
 * portamento into the pitch, a delayed vibrato that blooms, an amplitude swell
 * (messa di voce), a brightening/growl as the player leans in, a fall on the
 * release — and hands it to the expressive synth voices (aria/reed/wire/glass),
 * which realize it as continuous intra-note automation. This is the brief made
 * concrete: "expression realized not just note-by-note but in relation to the
 * overall melodic and compositional structure."
 *
 *   composer (beats + weights) -> PERFORMER (beats->seconds, dynamics, EXPRESSION,
 *   ensemble assignment, stereo seating) -> SYNTHESIZER (expressive voices -> fx)
 *   -> SCHEDULER (lookahead) / offline render.
 *
 * The four expressive instruments are an original palette; which ones sing lead,
 * partner (counter), and inner harmony VARIES with the seed and the user's
 * selection (the brief). Support voices (a plucked comp / warm keys, a bass) are
 * deliberately un-expressive — the steady foil to the singing leads.
 *
 * ORIGINAL EXPRESSION SLIDERS (the brief asked for original parameters):
 *   Expression  master depth — how much the players "perform" vs play it straight
 *   Song        vocal pitch inflection — scoops, portamento, expressive intonation
 *   Bloom       how much a held note develops — vibrato growth + amplitude swell
 *   Ardor       dramatic intensification toward structural peaks (ties to the arc)
 *   Rubato      timing breath — phrase-arch tempo + laid-back lead + micro-timing
 *   Grain       breath/bow/air texture in the voices
 *
 * renderPlan() is PURE (no Web Audio) — unit-testable headless in Node — and is the
 * single source of timing/dynamics/expression for both live play and offline render.
 *
 * Dual-format (UMD-lite): require() in Node (pure planner), window.AM.engines.
 * cantabile via <script src> in a file:// browser where AM.{composers,theory,
 * transport,synth,fx} are already set.
 */
;(function (global, factory) {
  'use strict';
  let deps;
  if (typeof module === 'object' && module.exports) {
    deps = {
      composer: require('../../composers/expressive-chamber.js'),
      theory: require('../../lib/theory.js'),
      transport: require('../../lib/transport.js'),
      synth: null, fx: null,
    };
    module.exports = factory(deps);
  } else {
    const AM = global.AM || (global.AM = {});
    AM.engines = AM.engines || {};
    AM.engines.cantabile = factory({
      composer: AM.composers.expressiveChamber, theory: AM.theory,
      transport: AM.transport, synth: AM.synth, fx: AM.fx,
    });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { composer, theory, transport, synth, fx } = deps;
  const NAME = 'cantabile';
  const VERSION = '0.2.0';
  const BEATS_PER_BAR = 4;
  const DEFAULTS = {
    bpm: 84, mode: '', tonic: 'D4', reverb: 0.3, volume: 0.62,
    // original expression sliders (0..1)
    expression: 0.68, song: 0.5, bloom: 0.62, ardor: 0.62, rubato: 0.5, grain: 0.32,
    lead: 'auto', partner: 'auto',
  };

  // The four expressive instruments, each with a distinct EXPRESSIVE PERSONALITY
  // (so the same slider settings still read differently per voice): scoop/vibrato
  // magnitudes, base timbre, breath affinity, default stereo seat.
  const EXPR_TIMBRES = ['aria', 'reed', 'wire', 'glass'];
  const TIMBRE = {
    aria:  { vibRate: 5.2, vibDepth: 34, scoop: 46, brightBase: 0.42, gritBase: 0.05, breath: 0.35, swellAff: 1.00, attack: 0.06, seat: 0.30 },
    reed:  { vibRate: 5.8, vibDepth: 42, scoop: 62, brightBase: 0.50, gritBase: 0.14, breath: 0.55, swellAff: 0.85, attack: 0.04, seat: -0.18 },
    wire:  { vibRate: 6.1, vibDepth: 54, scoop: 78, brightBase: 0.55, gritBase: 0.42, breath: 0.10, swellAff: 0.90, attack: 0.02, seat: 0.16 },
    glass: { vibRate: 4.6, vibDepth: 22, scoop: 26, brightBase: 0.50, gritBase: 0.00, breath: 0.18, swellAff: 0.95, attack: 0.07, seat: -0.30 },
  };
  // Which existing fx bus each timbre routes to (no fx.js change — expressive
  // voices are leads → the melody bus; comp is chord-like; bass/keys their own).
  const BUS = { aria: 'melody', reed: 'melody', wire: 'melody', glass: 'melody', pluck: 'chord', rhodes: 'rhodes', bass: 'bass' };

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function jitter(seed, i) {
    let h = (seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }
  function hashStr(s) { let h = 0; s = String(s == null ? 1 : s); for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }

  // ---- Ensemble assignment: role -> timbre, from seed + user selection -------
  function pickEnsemble(seed, opts) {
    const h = hashStr(seed);
    // a deterministic shuffle of the four expressive timbres from the seed
    const order = EXPR_TIMBRES.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = (hashStr(seed + ':' + i) >>> 0) % (i + 1);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const valid = (v) => EXPR_TIMBRES.indexOf(v) >= 0;
    const lead = valid(opts.lead) ? opts.lead : order[0];
    let partner;
    if (opts.partner === 'none') partner = null;
    else if (valid(opts.partner)) partner = opts.partner;
    else partner = order.find((t) => t !== lead);           // auto: a different color
    // inner (sustained color) = a third distinct expressive timbre
    const inner = order.find((t) => t !== lead && t !== partner) || partner || lead;
    return { lead, counter: partner, inner };
  }

  // ---- Tempo map: phrase-arch (rubato) over a final ritardando ---------------
  function segmentAt(segs, beat) {
    for (let i = 0; i < segs.length; i++) if (beat >= segs[i][0] && beat < segs[i][1]) return segs[i];
    return segs.length ? segs[segs.length - 1] : [0, 16];
  }
  function phraseSegments(sections) {
    const segs = [];
    for (const s of sections) {
      const nPhr = Math.max(1, Math.round(s.bars / 4));
      const per = s.bars / nPhr;
      for (let i = 0; i < nPhr; i++) segs.push([Math.round((s.startBar + i * per) * BEATS_PER_BAR), Math.round((s.startBar + (i + 1) * per) * BEATS_PER_BAR)]);
    }
    return segs.length ? segs : [[0, 16]];
  }
  function makeBeatToSec(bpm, totalBeats, leadIn, segs, ritBeats, archDepth) {
    const spb0 = 60 / bpm, step = 0.25, ritSlow = 1.4;
    const ritStart = totalBeats - ritBeats;
    const map = [leadIn]; let t = leadIn;
    for (let b = step; b <= totalBeats + step; b += step) {
      const seg = segmentAt(segs, b - step);
      const span = Math.max(step, seg[1] - seg[0]);
      const p = clamp((b - step - seg[0]) / span, 0, 1);
      const arch = 1 + archDepth * Math.cos(2 * Math.PI * p);          // edges slower than middle
      let rit = 1;
      if (b > ritStart && totalBeats > ritStart) rit = 1 + (ritSlow - 1) * Math.sqrt(clamp((b - ritStart) / (totalBeats - ritStart), 0, 1));
      t += spb0 * arch * rit * step;
      map.push(t);
    }
    return (beat) => map[clamp(Math.round(beat / step), 0, map.length - 1)];
  }

  // ---- PERFORMER (pure) ------------------------------------------------------
  function renderPlan(opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    const piece = composer.compose({ seed: opts.seed, mode: opts.mode || undefined, tonic: opts.tonic });
    const bpm = opts.bpm;
    const totalBeats = piece.meta.bars * BEATS_PER_BAR;
    const leadIn = 0.4;
    const segs = phraseSegments(piece.sections);
    const coda = piece.sections.find((s) => s.id === 'coda');
    const ritBeats = coda ? coda.bars * BEATS_PER_BAR : 8;
    const E = clamp(opts.expression, 0, 1), song = clamp(opts.song, 0, 1), bloom = clamp(opts.bloom, 0, 1);
    const ardor = clamp(opts.ardor, 0, 1), rubato = clamp(opts.rubato, 0, 1), grain = clamp(opts.grain, 0, 1);
    const archDepth = 0.03 + 0.08 * rubato * (0.5 + 0.5 * E);
    const beatToSec = makeBeatToSec(bpm, totalBeats, leadIn, segs, ritBeats, archDepth);

    const ens = pickEnsemble(String(opts.seed), opts);
    const roleTimbre = { lead: ens.lead, counter: ens.counter || ens.lead, inner: ens.inner,
      comp: null /* per-note by tag */, bass: 'bass' };
    const seedNum = hashStr(String(opts.seed));

    // section intensity lookup
    const inten = {}; for (const s of piece.sections) inten[s.id] = s.intensity;

    // previous note per role (for portamento + interval direction); prevBreath
    // remembers whether that previous note was a phrase-final breath, so the next
    // note starts fresh (no slur across a breath) and hesitates a touch.
    const prev = {}, prevBreath = {};
    // correlated residual walk (AR(1)) per role — human micro-timing, not i.i.d.
    const phi = 0.82, kIn = Math.sqrt(1 - phi * phi), wlk = {};
    function residual(role, sigT, sigD) {
      const w = wlk[role] || (wlk[role] = { t: 0, d: 0, n: 0 });
      const rh = hashStr(role);
      w.t = clamp(phi * w.t + kIn * sigT * jitter(seedNum ^ 0x51ed ^ rh, w.n), -2.4 * sigT, 2.4 * sigT);
      w.d = clamp(phi * w.d + kIn * sigD * jitter(seedNum ^ 0x2a11 ^ rh, w.n), -2.4 * sigD, 2.4 * sigD);
      w.n++; return w;
    }

    const voiceBase = { lead: 0.92, counter: 0.72, inner: 0.40, comp: 0.5, bass: 0.86 };
    const seatBase = { lead: null, counter: null, inner: null, comp: 0.12, bass: 0.0 };

    const events = [];
    // stable per-role ordering so residual/portamento see notes in time order
    const ordered = piece.notes.slice().sort((a, b) => a.beat - b.beat || a.midi - b.midi);

    for (const n of ordered) {
      const role = n.role;
      const sectId = (n.tags.find((t) => t.startsWith('sect:')) || 'sect:theme').slice(5);
      const I = inten[sectId] == null ? 0.6 : inten[sectId];
      const weight = n.weight == null ? 0.4 : n.weight;
      const isBreath = n.tags.includes('breath');            // a phrase-final resting point
      const pBroke = !!prevBreath[role];                     // did this voice just breathe?

      // timbre for this note
      let timbre;
      if (role === 'comp') timbre = n.tags.includes('arp') ? 'pluck' : 'rhodes';
      else timbre = roleTimbre[role] || 'aria';
      const prof = TIMBRE[timbre] || null;

      // --- structural expression DRIVE: weight * (Ardor lifts intense sections) ---
      const drive = E * clamp(weight * (0.5 + 0.7 * ardor * I) + 0.12, 0, 1.35);

      // --- timing: grid + phrase arch is baked into beatToSec; add laid-back lead
      //     lag + a small correlated residual (rubato) ---
      const res = residual(role, (role === 'lead' || role === 'counter') ? 0.004 * (0.4 + rubato) : 0.0025, 0.05);
      let timeSec = beatToSec(n.beat) + res.t;
      if ((role === 'lead' || role === 'counter') && !n.tags.includes('ending')) timeSec += 0.012 * rubato * E; // sing a hair behind
      // agogic hesitation entering a new phrase — a breath takes time (small, so it
      // does not accumulate; timeSec is absolute per note)
      if ((role === 'lead' || role === 'counter') && pBroke && !n.tags.includes('ending')) timeSec += clamp(0.02 + 0.06 * rubato, 0, 0.09);

      // --- dynamics ---
      const inBar = ((n.beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
      const onGrid = Math.abs(inBar - Math.round(inBar)) < 1e-6;
      let accent = !onGrid ? 0.82 : (inBar === 0 ? 1.0 : (inBar === 2 ? 0.92 : 0.86));
      const seg = segmentAt(segs, n.beat); const pArch = clamp((n.beat - seg[0]) / Math.max(1, seg[1] - seg[0]), 0, 1);
      const dynArch = 1 + 0.14 * Math.sin(Math.PI * pArch);
      let vel = I * (voiceBase[role] || 0.6) * accent * dynArch * (1 + res.d);
      if (role === 'lead' || role === 'counter') vel *= 0.9 + 0.35 * weight;      // sing the weighty notes louder
      if (n.tags.includes('climax')) vel *= 1.12;
      if (n.tags.includes('ending')) vel *= 0.92;
      if (isBreath) vel *= 0.93;                              // ease off into the breath (diminuendo)
      vel = clamp(vel, 0.04, 1);

      // --- articulation: legato WITHIN a phrase, a real breath BETWEEN phrases ----
      const slot = beatToSec(n.beat + n.durBeats) - beatToSec(n.beat);
      let artic;
      if (role === 'lead' || role === 'counter' || role === 'inner') {
        if (n.tags.includes('ending')) artic = 1.02;
        else if (n.durBeats >= 2 || n.tags.includes('goal')) artic = 1.0;
        else artic = 0.98;                                   // connected (legato) inside the phrase
      } else if (role === 'comp') { artic = n.tags.includes('arp') ? 1.0 : 0.96; }
      else artic = 0.9;                                      // bass
      let durSec = Math.max(0.08, slot * artic);
      // BREATH: carve a real silence after a phrase-final note so the next phrase
      // begins on a fresh breath (vocal phrasing — wiki/expressive-performance.md
      // punctuation: lengthen-then-lift). Gentle: a fraction of the slot, capped,
      // scaled by Rubato — the singing genre breathes, it does not clip notes.
      if (isBreath && (role === 'lead' || role === 'counter')) {
        const gap = Math.min(0.42 * slot, clamp(0.12 + 0.2 * rubato, 0.1, 0.34));
        durSec = Math.max(0.12, slot - gap);
      }

      // --- stereo seat ---
      let pan = seatBase[role];
      if (pan == null) pan = prof ? prof.seat : 0;
      if (role === 'comp' && n.tags.includes('arp')) pan = 0.1 * Math.sin(n.beat * 1.7);  // arps drift across

      // --- EXPRESSION object (only for the expressive voices) ---
      let expr = null;
      if (prof) {
        const p = prev[role];
        const durB = n.durBeats;
        // pitch: portamento from the previous same-role pitch if close & legato,
        // else a small expressive scoop into weighty/accented notes.
        let onsetCents = 0, onsetSec = 0.08;
        // portamento only WITHIN a phrase — never slur across a breath (pBroke) or
        // into a phrase-final note; those re-articulate with a fresh onset.
        if (p && !pBroke && Math.abs(p.midi - n.midi) > 0 && Math.abs(p.midi - n.midi) <= 5 && n.beat - (p.beat + p.durBeats) < 0.51 && !n.tags.includes('goal')) {
          onsetCents = clamp((p.midi - n.midi) * 100, -700, 700) * clamp(0.4 + 0.6 * song, 0, 1) * clamp(drive, 0, 1);
          onsetSec = clamp(0.05 + 0.09 * song, 0.04, 0.16);
        } else if (weight > 0.4) {
          const dir = (p && p.midi < n.midi) ? -1 : (song > 0.5 ? -1 : 1);  // lean up into the note
          onsetCents = dir * prof.scoop * song * drive * (0.5 + 0.5 * weight);
          onsetSec = clamp(0.045 + 0.06 * song, 0.03, 0.12);
        }
        // release fall on phrase-final / ending notes (sax fall / guitar release)
        let releaseCents = 0, releaseSec2 = 0.14;
        if ((n.tags.includes('goal') || n.tags.includes('ending')) && durB >= 1 && song * drive > 0.2 && !n.tags.includes('ending')) {
          releaseCents = -(30 + 70 * song) * drive; releaseSec2 = clamp(0.12 + 0.1 * durB * 0.1, 0.1, 0.24);
        }
        // vibrato: delayed, blooms; deeper on weighty/held notes; wider at climax
        const climaxLift = n.tags.includes('climax') ? (0.4 + 0.6 * ardor) : 0;
        const vibDepth = prof.vibDepth * bloom * drive * (0.6 + 0.6 * weight) * (1 + 0.7 * climaxLift);
        const vibDelay = clamp(0.35 - 0.2 * drive, 0.08, 0.45) * (durB >= 3 ? 1.2 : 1);
        const vibRamp = clamp(0.6 - 0.3 * bloom, 0.25, 0.7);
        // swell (messa di voce): on longer notes, scaled by bloom + swell affinity
        const swell = durB >= 1.5 ? clamp(bloom * prof.swellAff * (0.15 + 0.85 * drive), 0, 1) : (durB >= 1 ? 0.2 * bloom * (0.3 + 0.7 * drive) : 0);
        const swellPeak = clamp(0.55 + 0.15 * (n.tags.includes('ending') ? 1 : weight), 0.4, 0.85);
        // timbre intensity tracks the arc (Ardor) — brighter & grittier at peaks
        const bright = clamp(prof.brightBase + (0.35 * ardor + 0.12) * I * (0.5 + 0.5 * weight) + 0.15 * (bright0(n)), 0, 1);
        const grit = clamp(prof.gritBase + 0.55 * ardor * I * weight + 0.1 * grain, 0, 1);
        const brDefault = prof.breath * (0.5 + grain) + grain * 0.3;
        const attackSec = clamp(prof.attack * (1.4 - 0.7 * drive) - (n.tags.includes('climax') ? 0.01 : 0), 0.006, 0.14);
        // organic micro-pitch drift (cents): ALWAYS present — a real instrument's
        // pitch is alive even when "played straight" — grain-forward, with a small
        // lift from expressiveness. Kept small (a few cents) so it reads as life,
        // not as a wobble. (wiki/original-sound-design.md)
        const drift = clamp(1.5 + 3.3 * grain + 0.8 * bloom * E, 0.6, 6);
        expr = {
          onsetCents, onsetSec, releaseCents, releaseSec2,
          vibRate: prof.vibRate * (1 + 0.04 * (Math.abs(jitter(seedNum, Math.round(n.beat * 4))))),
          vibDepth, vibDelay, vibRamp, vibEndRateMul: 1.12,
          swell, swellPeak, sustain: role === 'inner' ? 0.9 : (n.tags.includes('goal') || n.tags.includes('ending') ? 0.82 : 0.72),
          bright, grit, grain: clamp(brDefault, 0, 1), drift,
          attackSec, releaseSec: role === 'inner' ? 0.6 : clamp(0.18 + 0.25 * durB * 0.1 + 0.2 * bloom, 0.12, 0.6),
        };
      }

      events.push({ timeSec, durSec, freq: theory.midiToFreq(n.midi), vel, voice: timbre, role, beat: n.beat, midi: n.midi, pan, expr, tags: n.tags });
      prev[role] = n; prevBreath[role] = isBreath;
    }
    events.sort((a, b) => a.timeSec - b.timeSec);
    const durationSec = beatToSec(totalBeats) + 2.2;    // + reverb tail / final swell
    return { name: NAME, version: VERSION, meta: piece.meta, bpm, ensemble: ens, sections: piece.sections, selfReport: piece.selfReport, notes: piece.notes, events, durationSec };
  }
  // a tiny extra brightness push for goal/climax notes (kept out of the big
  // expression block for readability)
  function bright0(n) { return (n.tags.includes('climax') ? 1 : 0) * 0.6 + (n.tags.includes('goal') ? 0.4 : 0); }

  // ---- SYNTHESIZER -----------------------------------------------------------
  function buildGraph(ctx, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    let a = ((function (s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })(opts.seed)) || 1;
    const rand = () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
    // a warm, medium plate — expressive voices want a little space to sing
    return fx.createMasterChain(ctx, { rand, reverbAmount: opts.reverb, volume: opts.volume,
      reverbSeconds: 2.8, reverbDamp: 0.42, returnLowpassHz: 3800, chordSendScale: 0.7 });
  }

  function scheduleEvent(ctx, chain, ev) {
    const busName = BUS[ev.voice] || 'melody';
    synth.play(ev.voice, ctx, chain.input(busName), { freq: ev.freq, time: ev.time, durSec: ev.durSec, vel: ev.vel, pan: ev.pan, expr: ev.expr });
  }

  async function renderOffline(opts, OfflineCtor) {
    const plan = renderPlan(opts);
    const sr = (opts && opts.sampleRate) || 44100;
    const Ctor = OfflineCtor || (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null);
    const ctx = new Ctor(2, Math.ceil(plan.durationSec * sr), sr);
    const chain = buildGraph(ctx, opts);
    for (const ev of plan.events) scheduleEvent(ctx, chain, Object.assign({}, ev, { time: ev.timeSec }));
    const buffer = await ctx.startRendering();
    return { buffer, plan };
  }

  function play(ctx, opts, hooks) {
    hooks = hooks || {};
    const plan = renderPlan(opts);
    const chain = buildGraph(ctx, opts);
    const startAt = ctx.currentTime + 0.16;
    const scheduler = new transport.Scheduler({ now: () => ctx.currentTime, lookahead: 0.14, interval: 0.025 });
    scheduler.onSchedule((ev, time) => scheduleEvent(ctx, chain, Object.assign({}, ev, { time })));
    for (const ev of plan.events) scheduler.push(startAt + ev.timeSec, ev);
    scheduler.start();
    let raf = null, ended = false;
    const endTime = startAt + plan.durationSec;
    const tick = () => {
      if (ended) return;
      const now = ctx.currentTime;
      if (hooks.onFrame) hooks.onFrame(Math.max(0, now - startAt), plan);
      if (now >= endTime) { ended = true; scheduler.stop(); if (hooks.onEnd) hooks.onEnd(); return; }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return {
      plan, chain, startAt,
      stop() { ended = true; scheduler.stop(); if (raf) cancelAnimationFrame(raf); },
      setVolume(v) { chain.setVolume(v); },
      setReverb(v) { chain.setReverb(v); },
    };
  }

  return { NAME, VERSION, DEFAULTS, EXPR_TIMBRES, renderPlan, buildGraph, renderOffline, play, pickEnsemble, makeBeatToSec };
});
