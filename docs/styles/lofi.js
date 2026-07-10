/*
 * styles/lofi — the Lo-fi beats genre pack: preset region + incremental
 * compose strategy. Generalizes the proven groove-lofi engine (Engine 03,
 * v0.2.1, experiments/composers/groove-lofi.js — well-reviewed by the
 * project's listener, wiki/findings-groove-lofi-engine.md) into the site's
 * vector-driven, just-in-time form: a looped, backbeat-driven lo-fi hip-hop
 * groove — kick + backbeat snare + hats under a voice-led 7th/9th Rhodes comp
 * and a weighty, kick-locked bass, with a sparse bell lead that only enters
 * once the groove is established.
 *
 * Every structural decision below carries over the shipped engine's findings
 * and the design targets in wiki/groove-and-embodiment.md (the project's most
 * design-directive psychology page) and wiki/hip-hop-and-beat-making.md:
 *   - a structural BACKBEAT — snare on 2 & 4, the loudest recurring accent;
 *   - a MEDIUM-SYNCOPATION kick (the Witek et al. 2014 inverted-U): a small
 *     bank of patterns that always keep beat 1 and add only a few
 *     weak-position hits, so the meter never flips;
 *   - GHOST SNARES around vel 0.2 — a velocity HIERARCHY, never timing
 *     jitter (groove-and-embodiment.md's central "uniform jitter is not
 *     humanization" correction) — entering with the B section and
 *     continuing, thinned, through the A' recap;
 *   - a HI-HAT velocity hierarchy (accented on-beat > unaccented off-beat,
 *     never noise), its subdivision density and the ghost-note rate both
 *     driven by vector.density (the site's "sparse <-> busy" control);
 *   - a warm 7th-chord RHODES comp voiced with compose.voiceChord at a HIGH
 *     harmRich, so consecutive chords move by small steps (the session-021
 *     voice-leading fix — findings-groove-lofi-engine.md's v0.2 pass) instead
 *     of jumping register: a bed, not a tune. An occasional hand-added color
 *     9th sits on top (compose.voiceChord itself tops out at 7th chords);
 *   - a weighty, SIMPLE bass LOCKED to the kick: its sustained root shares
 *     the kick's downbeat and its one syncopated movement note shares the
 *     kick's own syncopated onset (never an independent rhythm) — bass
 *     carries the timekeeping energy per groove-and-embodiment.md's
 *     low-frequency-timing findings; vector.interlock sets how often the
 *     movement note plays;
 *   - a sparse BELL lead that enters once the groove is established (the B
 *     section onward), landing on chord tones at a weak, laid-back sixteenth.
 * Swing (a phase warp) and the laid-back backbeat drag are entirely the
 * PERFORMER's job (docs/lib/perform.js) — every onset below sits on a
 * perfectly quantized 16th-note grid, per groove-and-embodiment.md's
 * structured-not-random microtiming synthesis. perform.js's LAID_BACK table
 * already keys 'snare'/'hat'/'rhodes'/'bell' with the right per-voice drag,
 * and 'kick'/'bass' are absent from it (tight, up front) — this pack needs
 * no extra work there beyond setting laidBack high in the preset.
 *
 * Form: intro (drums thin — the harmony/bass state the loop while the kit
 * builds in) / A (the groove locks in) / B (kick pattern varies, ghosts + the
 * bell lead enter) / A' (recap — A's kick figure returns, ghosts/lead
 * continue at a thinned rate) / outro (elements drop out over four fixed
 * bars, ending in a soft held comp/bass chord). One committed jazzy 4-chord
 * loop (drawn from compose.js's shared LOOP_BANKS — wiki/hip-hop-and-
 * beat-making.md's "the loop as the compositional unit") cycles under the
 * WHOLE piece, phase-locked to the absolute bar count so it never skips a
 * beat across units. Only the loop's SHAPE (scale degrees) is committed in
 * `plan` — the actual pitches are read from the live scale/tonicPc/harmRich
 * every unit, so a live key/mode/richness change lands on not-yet-composed
 * bars, per the strategy contract.
 *
 * There is no vinyl-crackle voice in the shared synth (docs/lib/synth.js).
 * The standalone engine's crackle bed was a bespoke addition to ITS OWN
 * engine graph, not part of the shared first-party synth library this pack
 * vends from — faking one here with an ad hoc noise node, outside synth.js,
 * would be exactly the kind of one-off hack wiki/shared-libraries.md warns
 * against. Left out deliberately; noted as deferred (a candidate for a future
 * shared `synth.js` texture voice, not a per-pack hack).
 *
 * Original first-party code (CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const C = () => AM.compose;

  const UNIT_BARS = 2;               // one 2-bar unit per nextUnit call
  const STEP = 0.25;                 // sixteenth-note grid, in quarter-note beats
  const STEPS_PER_BAR = 16;

  // Nominal GM-ish pitches for the drum voices, purely so a piano-roll style
  // visualization has a row for them — the kick/snare/hat synth voices are
  // pitch-fixed and ignore `midi` (see docs/lib/synth.js), same convention as
  // the source engine's DRUM_MIDI table.
  const DRUM_MIDI = { kick: 36, snare: 38, hat: 42 };

  // Kick patterns (16th-step indices), ported from the shipped groove-lofi
  // engine's bank: every pattern keeps step 0 (beat 1) so the meter stays
  // anchored, and adds only a couple of weak-position hits — the Witek et al.
  // (2014) inverted-U's "medium syncopation" sweet spot (wiki/groove-and-
  // embodiment.md), not maximal regularity or maximal complexity.
  const KICK_PATTERNS = [
    [0, 6, 10],   // 1, & of 2, & of 3 — classic boom-bap
    [0, 7],       // 1, laid "& of 2" pushed — sparse
    [0, 6, 11],   // 1, & of 2, "a" of 3
    [0, 3, 10],   // 1, "a" of 1, & of 3
  ];
  // Ghost-snare positions: quiet weak-sixteenth taps between the backbeats
  // (wiki/groove-and-embodiment.md: "ghost notes create forward motion far
  // more effectively than timing jitter").
  const GHOST_PATTERNS = [
    [7, 14],
    [10, 15],
    [3, 11],
  ];
  // Rhodes comping rhythms: [step, sustainBeats] pairs, mostly sustained and
  // legato (durations ring a little past the bar so there is no dead gap
  // between chords) so the comp reads as a continuous bed, not a stab per
  // bar — the source engine's v0.2 listener-feedback fix.
  const COMP_PATTERNS = [
    { id: 'held', hits: [[0, 4.3]] },
    { id: 'charleston', hits: [[0, 2.4], [6, 2.3]] },
    { id: 'one-three', hits: [[0, 2.3], [8, 2.3]] },
    { id: 'pushed', hits: [[2, 4.2]] },
  ];

  function pc(m) { return ((Math.round(m) % 12) + 12) % 12; }

  AM.styles.register({
    id: 'lofi', name: 'Lo-fi beats', order: 2,
    blurb: 'A relaxed, dusty lo-fi groove — backbeat, ghost notes, and a warm Rhodes loop',
    preset: {
      // Harmonic language: major / naturalMinor / dorian, weighted like the
      // source engine's four moods (two major-ish, one minor, one dorian); a
      // neutral tonic pool (both a major and a minor third available); a
      // LOOP harmony that vamps over one committed 4-chord progression
      // (wiki/hip-hop-and-beat-making.md, "the loop as the compositional
      // unit") rather than functional cadencing.
      scale: { pick: ['major', 'naturalMinor', 'dorian'], w: [2, 1, 1] },
      tonicPc: { pick: [0, 2, 3, 5, 7, 9, 10] },
      harmonyType: 'loop',
      harmonicRhythm: 1,                   // one chord per bar — this locks the
                                            // loop's phase to the absolute bar
                                            // count (see nextUnit's rotation math)
      harmRich: { range: [0.55, 0.85] },   // HIGH: pushes compose.voiceChord to
                                            // its richest (7th-chord) voicings
      timeline: 'none',                    // the drums below ARE the timeline
      meterId: '4/4',                      // metered backbeat groove only
      bpmBand: [68, 92], bpm: { range: [70, 90] },
      swing: { range: [0.25, 0.5] },       // perform.js maps this to a phase-warp
                                            // ratio 0.5+0.32*swing -> ~0.58-0.66:
                                            // a gentle-to-moderate shuffle (wiki/
                                            // hip-hop-and-beat-making.md's cited
                                            // 54-62% MPC-swing practitioner band)
      laidBack: 0.7,                       // drags the snare/hat/rhodes/bell
                                            // behind the beat (perform.js's
                                            // per-voice LAID_BACK table); kick
                                            // and bass are absent from that
                                            // table, so they stay tight
      rubato: { range: [0.05, 0.15] },     // a locked loop, not a rubato piece
      density: { range: [0.35, 0.6] },     // drives hat subdivision + ghost rate
      interlock: { range: [0.3, 0.6] },    // how often the bass echoes the
                                            // kick's syncopated hit (see addBass)
      leadProm: { range: [0.25, 0.45] },   // the bell lead stays in the background
      melTex: { range: [0.3, 0.55] },
      form: 'loopedGroove',
      arc: { pick: ['arch', 'lateArch', 'terraced', 'level'], w: [3, 2, 2, 1] },
      development: { range: [0.15, 0.3] }, // cyclic (a loop that varies), not
                                            // through-composed
      variation: { range: [0.35, 0.6] },
      lengthSec: { pick: [80, 110, 145], w: [0.3, 0.45, 0.25] },
      ending: { pick: ['fade', 'stop'], w: [3, 1] },
      brightness: { range: [0.3, 0.5] },   // dark and warm, not bright
      dynRange: { range: [0.35, 0.55] },
      expression: { range: [0.3, 0.5] },
      reverb: { range: [0.2, 0.35] },      // a small, warm room, not a big tail
      width: { range: [0.3, 0.5] },        // an intimate, near-mono tape feel
      moodModePool: ['naturalMinor', 'dorian', 'dorian', 'major', 'major'],
      ensemble: [
        // prio 0-2 (kick/bass/comp) survive layer-cap trimming first; snare
        // then hat go next; the lead is prio LAST (dropped first) — kept
        // "low level" even at full layers, per the pack brief.
        { role: 'kick', voice: 'kick', register: [30, 42], level: 1.0, prio: 0 },
        { role: 'bass', voice: 'bass', register: [33, 48], level: 0.85, prio: 1 },
        { role: 'comp', voice: 'rhodes', register: [52, 76], level: 0.55, prio: 2 },
        { role: 'snare', voice: 'snare', register: [36, 44], level: 0.95, prio: 3 },
        { role: 'hat', voice: 'hat', register: [40, 50], level: 0.7, prio: 4 },
        { role: 'lead', voice: 'bell', register: [72, 96], level: 0.5, prio: 5 },
      ],
      palettes: [
        { name: 'Tape (Rhodes & bell)', desc: 'warm Rhodes with a bell accent — the default', map: {} },
        { name: 'Mellow keys lead', desc: 'a soft keyboard carries the melody', map: { lead: 'melody' } },
        { name: 'Plucked comp', desc: 'a plucked chord comp under the beat', map: { comp: 'pluck' } },
      ],
    },

    strategy: {
      unitBars: UNIT_BARS,

      init(vector, rng) {
        const compose = C();
        // Scale the nominal intro(4)/A/B/A'/outro(4) shape to the target
        // length (C().barsForLength — the pack brief): intro/outro stay a
        // fixed 4 bars (the arrangement device, not the loop, needs that
        // headroom), and the A/B/A' main portion absorbs the rest, split into
        // three equal, unit-aligned thirds.
        const totalTarget = Math.max(16, compose.barsForLength(vector, UNIT_BARS));
        const introBars = 4, outroBars = 4;
        const mainBars = Math.max(12, Math.round((totalTarget - introBars - outroBars) / 6) * 6);
        const third = mainBars / 3;
        const sections = [
          { role: 'intro', bars: introBars },
          { role: 'A', bars: third },
          { role: 'B', bars: third },
          { role: "A'", bars: third },
          { role: 'outro', bars: outroBars },
        ];
        compose.sectionIntensities(sections, vector.arc);
        const totalBars = sections.reduce((s, x) => s + x.bars, 0);

        // Commit the piece's jazzy 4-chord loop — its SHAPE only (scale
        // degrees), so a later live key/mode change still transposes it
        // correctly instead of freezing the pitches. Prefer
        // compose.progression's own loop draw (it reads the live vector's
        // harmonyType and picks from the shared LOOP_BANKS); if harmonyType
        // isn't 'loop' at plan time (e.g. a meld that hands this strategy a
        // different harmonyType), fall back to drawing straight from
        // LOOP_BANKS so the piece still gets a coherent loop identity.
        const probe = compose.progression(vector, 4, rng, {});
        let loopDegrees = probe._loop;
        if (!loopDegrees) {
          const hs = compose.harmonicScale(vector.scale);
          const minorish = ['naturalMinor', 'harmonicMinor', 'phrygian', 'dorian'].indexOf(hs) >= 0;
          loopDegrees = rng.pick(compose.LOOP_BANKS[minorish ? 'minorish' : 'majorish']);
        }

        // Commit this piece's groove: a kick pattern for A, a DIFFERENT one
        // for B (A' returns to A's), a ghost-note bank, whether open hats
        // accent bar-ends, and the comping rhythm — the "loop the core, vary
        // at the edges" discipline (wiki/groove-and-embodiment.md).
        const kickA = rng.pick(KICK_PATTERNS);
        let kickB = rng.pick(KICK_PATTERNS);
        if (kickB === kickA) kickB = KICK_PATTERNS[(KICK_PATTERNS.indexOf(kickA) + 1) % KICK_PATTERNS.length];
        const ghostPattern = rng.pick(GHOST_PATTERNS);
        const openHats = rng.bool(0.55);
        const compPattern = rng.pick(COMP_PATTERNS);

        return {
          sections, totalBars, loopDegrees,
          kickA, kickB, ghostPattern, openHats, compPattern,
          lastVoicing: null,     // cross-unit voice leading for the comp
        };
      },

      nextUnit(plan, vector, pos, rng) {
        const compose = C();
        if (pos.bar >= plan.totalBars) return null;
        const sec = pos.section;
        const bb = vector.meter.barBeats; // 4 (4/4 only, per the pack brief)

        // Read the LIVE ensemble every call (layer caps / palette swaps land
        // on not-yet-composed units this way) rather than vector.ensemble
        // directly.
        const ens = AM.style.effectiveEnsemble(vector);
        const roles = {
          kickE: ens.find((e) => e.role === 'kick'),
          snareE: ens.find((e) => e.role === 'snare'),
          hatE: ens.find((e) => e.role === 'hat'),
        };
        const bassE = ens.find((e) => e.role === 'bass');
        const compE = ens.find((e) => e.role === 'comp');
        const leadE = ens.find((e) => e.role === 'lead');

        const bars = Math.min(UNIT_BARS, sec.bars - pos.barInSection);
        const isLastSection = pos.sectionIdx === plan.sections.length - 1;

        // This unit's harmony: the committed loop, phase-locked to the
        // ABSOLUTE bar (so the 4-chord cycle never skips a beat across units
        // or a live replan) but re-derived from the LIVE vector every call,
        // so a key/mode/harmRich change lands on not-yet-composed bars.
        // compose.progression's loop branch walks `loop[i % loop.length]`
        // starting at i=0 for whatever `bars` it's given, so rotating the
        // committed degrees by the current phase before calling it is what
        // keeps the cycle continuous across separate nextUnit calls.
        const phase = pos.bar % plan.loopDegrees.length;
        const rotatedLoop = plan.loopDegrees.slice(phase).concat(plan.loopDegrees.slice(0, phase));
        const chords = compose.progression(vector, bars, rng, { loop: rotatedLoop });

        const notes = [];
        for (let bi = 0; bi < bars; bi++) {
          const barBeat = bi * bb;
          const barInSec = pos.barInSection + bi;
          const chord = compose.chordAt(chords, barBeat);
          addDrums(notes, sec, barInSec, barBeat, plan, vector, rng, roles);
          addBass(notes, sec, barInSec, barBeat, bb, chord, plan, vector, rng, bassE);
          addComp(notes, sec, barInSec, barBeat, bb, chord, plan, vector, rng, compE);
          addLead(notes, sec, barInSec, barBeat, chord, vector, rng, leadE);
        }

        const lengthBeats = bars * bb;
        const last = isLastSection && pos.barInSection + bars >= sec.bars;
        // the outro additionally tapers its OWN intensity value across its
        // two units, compounding with the explicit per-note vel drops below
        // for a real fade rather than a sudden cut.
        let intensity = sec.intensity;
        if (sec.role === 'outro') intensity *= (1 - 0.3 * (pos.barInSection / Math.max(1, sec.bars)));
        return { notes, lengthBeats, bars, section: sec.role, intensity, last };
      },
    },
  });

  // ---- Drums: kick (medium syncopation, always keeps beat 1) + backbeat
  // snare (2 & 4, the loudest recurring accent) + hi-hats (velocity
  // hierarchy, density-scaled subdivision) + ghost snares (B onward) +
  // hand-off fills. Section shape: intro thin -> A locks in -> B varies +
  // ghosts -> A' recap (kick returns to A, ghosts thinned) -> outro drops out
  // over its fixed 4 bars. Swing/laid-back/the AR(1) residual are entirely
  // the performer's job (docs/lib/perform.js) — every onset here sits on the
  // exact 16th-note grid (wiki/groove-and-embodiment.md).
  function addDrums(notes, sec, barInSec, barBeat, plan, vector, rng, roles) {
    const { kickE, snareE, hatE } = roles;
    const role = sec.role;

    if (role === 'intro') {
      // thin: a soft downbeat kick only, a hat pulse building in on the last
      // two bars, and a single pickup tap cueing A's downbeat — the full kit
      // drops in with A, not before.
      if (kickE) notes.push(drumNote(kickE, barBeat, 0.68, 'downbeat'));
      if (hatE && barInSec >= 2) {
        const step = barInSec === 2 ? 4 : 2; // quarter pulse -> 8th pulse
        for (let s = 0; s < STEPS_PER_BAR; s += step) notes.push(drumNote(hatE, barBeat + s * STEP, 0.28, 'closed'));
      }
      if (snareE && barInSec === 3) notes.push(drumNote(snareE, barBeat + 15 * STEP, 0.3, 'fill'));
      return;
    }

    if (role === 'outro') {
      // elements drop out over the fixed 4-bar outro: bar 0 the kit is still
      // (almost) whole, by bar 2 only a soft kick remains, and the final bar
      // is drum-silent — comp + bass alone close the piece (see addBass/addComp).
      if (barInSec === 0) {
        if (kickE) for (const s of plan.kickA) notes.push(drumNote(kickE, barBeat + s * STEP, s === 0 ? 0.88 : 0.68, s === 0 ? 'downbeat' : 'synco'));
        if (snareE) {
          notes.push(drumNote(snareE, barBeat + 4 * STEP, 0.78, 'backbeat'));
          notes.push(drumNote(snareE, barBeat + 12 * STEP, 0.78, 'backbeat'));
        }
        if (hatE) for (let s = 0; s < STEPS_PER_BAR; s += 2) notes.push(drumNote(hatE, barBeat + s * STEP, (s % 4 === 0) ? 0.48 : 0.36, 'closed'));
      } else if (barInSec === 1) {
        if (kickE) notes.push(drumNote(kickE, barBeat, 0.75, 'downbeat'));
        if (snareE) {
          notes.push(drumNote(snareE, barBeat + 4 * STEP, 0.55, 'backbeat'));
          notes.push(drumNote(snareE, barBeat + 12 * STEP, 0.55, 'backbeat'));
        }
        if (hatE) for (let s = 0; s < STEPS_PER_BAR; s += 4) notes.push(drumNote(hatE, barBeat + s * STEP, 0.32, 'closed'));
      } else if (barInSec === 2) {
        if (kickE) notes.push(drumNote(kickE, barBeat, 0.55, 'downbeat'));
        // snare and hat have already dropped out
      }
      // barInSec >= 3 (the final bar): drum silence.
      return;
    }

    // A / B / A': the groove proper.
    const kickPat = role === 'B' ? plan.kickB : plan.kickA; // A' returns to A's figure
    if (kickE) for (const s of kickPat) notes.push(drumNote(kickE, barBeat + s * STEP, s === 0 ? 0.95 : 0.82, s === 0 ? 'downbeat' : 'synco'));
    if (snareE) {
      notes.push(drumNote(snareE, barBeat + 4 * STEP, 0.9, 'backbeat'));
      notes.push(drumNote(snareE, barBeat + 12 * STEP, 0.9, 'backbeat'));
      if (role === 'B' || role === "A'") {
        // density -> ghost rate (the pack brief); A' thins the ghosts vs B.
        const ghostGate = (role === "A'" ? 0.5 : 1) * (0.4 + 0.55 * vector.density);
        for (const s of plan.ghostPattern) if (rng.bool(ghostGate)) notes.push(drumNote(snareE, barBeat + s * STEP, 0.2, 'ghost'));
      }
      if (barInSec === sec.bars - 1) {
        // hand-off fill into the next section (B, A', or the outro).
        [10, 12, 14].forEach((s, i) => notes.push(drumNote(snareE, barBeat + s * STEP, 0.3 + 0.15 * i, 'fill')));
      }
    }
    if (hatE) {
      const hatStep = vector.density > 0.6 ? 1 : 2; // density -> 16th vs 8th subdivision
      for (let s = 0; s < STEPS_PER_BAR; s += hatStep) {
        const onBeat = (s % 4) === 0;
        const openHere = s === 14 && plan.openHats;
        notes.push(drumNote(hatE, barBeat + s * STEP, openHere ? 0.5 : (onBeat ? 0.55 : 0.42), openHere ? 'open' : 'closed'));
      }
    }
  }
  function drumNote(roleE, beat, vel, tag) {
    return {
      beat, durBeats: 0.12, midi: DRUM_MIDI[roleE.role],
      voice: roleE.voice, role: roleE.role,
      vel: vel * (roleE.level == null ? 1 : roleE.level), tags: [tag],
    };
  }

  // ---- Bass: weighty and simple, LOCKED to the kick — its sustained root
  // shares the kick's downbeat and its one syncopated movement note shares
  // the kick's own syncopated onset, never an independent rhythm (wiki/
  // groove-and-embodiment.md's bass-weight / low-frequency-timing findings:
  // "put timekeeping and energy in the bass"). vector.interlock controls how
  // often the movement note plays (low -> mostly the sustained root alone;
  // high -> tightly dovetailed with the kick's syncopation).
  function addBass(notes, sec, barInSec, barBeat, bb, chord, plan, vector, rng, bassE) {
    if (!bassE) return;
    const role = sec.role;
    const lvl = bassE.level == null ? 1 : bassE.level;
    const root = C().nearestBassNote(chord.bassPc, bassE.register);

    if (role === 'outro' && barInSec >= 3) {
      // the very last bar: a single long, soft root — the last thing standing.
      notes.push({ beat: barBeat, durBeats: bb, midi: root, voice: bassE.voice, role: bassE.role, vel: 0.55 * lvl, tags: ['root', 'ending'] });
      return;
    }

    // whatever the kick is ACTUALLY playing this bar (addDrums' logic,
    // mirrored) — the bass locks to that, never its own independent figure.
    const kickPat = role === 'intro' ? [0]
      : role === 'outro' ? (barInSec === 0 ? plan.kickA : [0])
      : role === 'B' ? plan.kickB : plan.kickA;
    const syncoSteps = kickPat.filter((s) => s !== 0);
    const moveStep = syncoSteps.length ? syncoSteps[syncoSteps.length - 1] : null;
    const rootDur = moveStep != null ? moveStep * STEP : bb;

    let rootVel = 0.85;
    if (role === 'intro') rootVel = 0.68;
    else if (role === 'outro') rootVel = barInSec === 0 ? 0.78 : barInSec === 1 ? 0.65 : 0.5;
    notes.push({ beat: barBeat, durBeats: rootDur, midi: root, voice: bassE.voice, role: bassE.role, vel: rootVel * lvl, tags: ['root'] });

    const allowMove = role !== 'intro' && role !== 'outro';
    if (moveStep != null && allowMove && rng.bool(0.3 + 0.6 * vector.interlock)) {
      const fifth = C().nearestBassNote(pc(chord.notes[2]), bassE.register);
      const target = rng.bool(0.5) ? Math.min(bassE.register[1], root + 12) : fifth;
      notes.push({ beat: barBeat + moveStep * STEP, durBeats: bb - rootDur, midi: target, voice: bassE.voice, role: bassE.role, vel: 0.65 * lvl, tags: ['move'] });
    }
  }

  // ---- Comp: warm 7th-chord Rhodes, voice-led with compose.voiceChord at a
  // HIGH harmRich (the session-021 fix: consecutive chords move by small
  // steps, so the comp reads as a bed, not a tune — findings-groove-lofi-
  // engine.md's v0.2 pass) plus an occasional hand-added color 9th
  // (voiceChord itself tops out at a 7th chord). The comping RHYTHM is
  // committed per piece (mostly sustained/legato — see COMP_PATTERNS) with an
  // occasional B-section swap for variety.
  function addComp(notes, sec, barInSec, barBeat, bb, chord, plan, vector, rng, compE) {
    if (!compE) return;
    const role = sec.role;
    const lvl = compE.level == null ? 1 : compE.level;
    plan.lastVoicing = C().voiceChord(chord, compE.register, plan.lastVoicing, vector.harmRich, rng);
    const voicing = plan.lastVoicing;
    if (!voicing.length) return;

    if (role === 'outro' && barInSec >= 3) {
      // the final bar: hold the last chord, soft — comp closes the piece
      // alongside the bass's long root.
      for (const m of voicing) notes.push({ beat: barBeat, durBeats: bb, midi: m, voice: compE.voice, role: compE.role, vel: 0.3 * lvl, tags: ['chord', 'ending'] });
      return;
    }

    const useAlt = role === 'B' && rng.bool(0.15 + 0.25 * vector.variation);
    const pat = useAlt ? rng.pick(COMP_PATTERNS) : plan.compPattern;
    let vel = 0.5;
    if (role === 'intro') vel = 0.4;
    else if (role === 'outro') vel = barInSec === 0 ? 0.42 : barInSec === 1 ? 0.34 : 0.26;

    for (const [step, dur] of pat.hits) {
      for (const m of voicing) notes.push({ beat: barBeat + step * STEP, durBeats: dur, midi: m, voice: compE.voice, role: compE.role, vel: vel * lvl, tags: ['chord'] });
      // an occasional color 9th on top — B/A' only, gated by harmRich so
      // plainer draws stay plain (the source engine's per-seed "ninth"
      // policy, translated to a live, section-gated probability).
      if ((role === 'B' || role === "A'") && rng.bool(0.3 + 0.35 * vector.harmRich)) {
        const hs = C().harmonicScale(vector.scale);
        const ninthPc = pc(AM.theory.scaleDegree(24 + vector.tonicPc, hs, chord.degree + 8));
        let ninth = voicing[voicing.length - 1] + 1;
        while (pc(ninth) !== ninthPc) ninth++;
        if (ninth > compE.register[1]) ninth -= 12;
        notes.push({ beat: barBeat + step * STEP, durBeats: dur, midi: ninth, voice: compE.voice, role: compE.role, vel: vel * lvl * 0.7, tags: ['chord', 'ninth'] });
      }
    }
  }

  // ---- Lead: a sparse bell (or palette-swapped melody) that enters once the
  // groove is established — the B section onward — landing on a chord tone
  // at a weak (offbeat) sixteenth for a laid-back entrance. Lo-fi leads are
  // minimal by nature (findings-groove-lofi-engine.md); A' carries it on at a
  // thinned rate rather than cutting it off with the section change.
  function addLead(notes, sec, barInSec, barBeat, chord, vector, rng, leadE) {
    if (!leadE) return;
    const role = sec.role;
    if (role !== 'B' && role !== "A'") return;
    const enterChance = role === "A'" ? 0.4 : 0.6;
    if (!rng.bool(enterChance)) return;
    const pool = C().scalePool(vector, leadE.register);
    if (pool.length < 2) return;
    const chordPcs = new Set((chord.seventhNotes || chord.notes).map(pc));
    const cands = pool.filter((m) => chordPcs.has(pc(m)));
    const pitch = cands.length ? rng.pick(cands) : rng.pick(pool);
    const step = rng.pick([2, 6, 10, 14]);
    const lvl = leadE.level == null ? 1 : leadE.level;
    notes.push({ beat: barBeat + step * STEP, durBeats: 1.5, midi: pitch, voice: leadE.voice, role: leadE.role, vel: (0.45 + 0.2 * vector.leadProm) * lvl, tags: ['lead'] });
  }
})(typeof self !== 'undefined' ? self : this);
