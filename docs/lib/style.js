/*
 * style — the style-vector machinery: the heart of the comprehensive site.
 *
 * Implements the style-vector schema design doc (docs/design/style-vector-schema.html):
 *   - the VECTOR: one fielded record every control writes into and the composer
 *     reads (material / per-voice / evolution / surface layers);
 *   - PRESETS: each genre pack registers a hand-tuned region (center + spread
 *     per field); sample() draws a concrete vector from it with the seed;
 *   - MELDS (§5): two presets combined by per-axis parent selection — categorical
 *     fields snap to one parent, continuous fields blend, and the rhythmic
 *     chassis (meter/groove/tempo-feel) and the harmony/mode come from DIFFERENT
 *     parents, with compatibility gates; balance defaults to even (Tom's call);
 *   - INVENTED styles (§4): a seeded sample under coherence constraints with a
 *     novelty budget (1-3 axes off-convention) and 2-3 signature rules;
 *   - the COHERENCE gate (§6): cross-axis couplings repaired before play;
 *   - CONTROLS: the control-taxonomy registry (docs/design/control-taxonomy.html)
 *     — every control's tier, type, quantization, URL bit width, response speed,
 *     and its deterministic apply() into the vector. This one table drives the
 *     UI (app.js), the URL codec (serialize.js), and the live-change router.
 *
 * Determinism: buildVector(seedInt, selection, controlValues) is a pure
 * function — same inputs, same vector, always. All randomness comes from the
 * seeded rng; control apply() functions use no randomness at all, so a live
 * control change transforms the vector the same way whenever it happens.
 *
 * Part of the site's original first-party libraries (CC0). Dual-format
 * (UMD-lite): Node require() for tests (pass deps), browser <script src> ->
 * window.AM.style, reading window.AM.{rng,theory,generators,styles}.
 */
;(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory({
      rng: require('./rng.js'), theory: require('./theory.js'),
      generators: require('./generators.js'), registry: null, // pass via _setRegistry in tests
    });
  } else {
    const AM = global.AM || (global.AM = {});
    AM.style = factory({ rng: AM.rng, theory: AM.theory, generators: AM.generators, registry: () => AM.styles });
  }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  const { rng: rngLib, theory, generators } = deps;
  let getRegistry = deps.registry || (() => null);

  // ---- Meters ----------------------------------------------------------------
  // The composer thinks in QUARTER-NOTE beats everywhere (durBeats of 1 = one
  // quarter), so bpm always means quarter-note tempo and the transport stays
  // uniform. A meter contributes: bar length in quarter beats, the accent
  // pattern (beat offsets that carry metric weight), the subdivision grid, and
  // grouping (compound/aksak). 6/8 is a 3-quarter bar felt in two dotted-quarter
  // groups; 5/8 and 7/8 are aksak (2+3, 3+2+2) per wiki/rhythm-and-meter.md.
  const METERS = {
    '4/4': { id: '4/4', barBeats: 4, accents: [0, 2], strong: [0], sub: 0.5, group: 2 },
    '3/4': { id: '3/4', barBeats: 3, accents: [0], strong: [0], sub: 0.5, group: 2 },
    '6/8': { id: '6/8', barBeats: 3, accents: [0, 1.5], strong: [0], sub: 0.5, group: 3, compound: true },
    '2/4': { id: '2/4', barBeats: 2, accents: [0], strong: [0], sub: 0.5, group: 2 },
    '5/8': { id: '5/8', barBeats: 2.5, accents: [0, 1], strong: [0], sub: 0.5, group: 2, aksak: [2, 3] },
    '7/8': { id: '7/8', barBeats: 3.5, accents: [0, 1.5, 2.5], strong: [0], sub: 0.5, group: 2, aksak: [3, 2, 2] },
    'free': { id: 'free', barBeats: 4, accents: [], strong: [], sub: 0.5, group: 2, free: true },
  };
  const METER_IDS = ['4/4', '3/4', '6/8', '2/4', '5/8', '7/8', 'free'];

  const MODE_IDS = ['major', 'naturalMinor', 'dorian', 'lydian', 'mixolydian', 'phrygian', 'majorPentatonic'];
  const HARMONY_TYPES = ['functional', 'modal', 'loop', 'drone'];
  const TIMELINES = ['none', 'clave', 'bell', 'euclid', 'sieve', 'pulse'];
  const ENDINGS = ['cadence', 'fade', 'stop', 'ringout'];
  const ARCS = generators.ARC_SHAPES; // 9 shapes
  const LENGTH_SECS = [60, 150, 330]; // short / medium / long targets (min ~60 s, Tom 2026-07-10)

  // ---- Shared instrument palettes -------------------------------------------
  // Every genre pack authors a few genre-appropriate palettes (its first N,
  // auto-sampled); these five GENERIC sets are appended to every genre so the
  // user can recolor any style with a contrasting instrument combination. They
  // remap the common melodic roles (a role absent in a genre is simply skipped),
  // and each carries a `desc` shown in the Intermediate palette dropdown.
  const EXTRA_PALETTES = [
    { name: 'Bowed strings', desc: 'a warm, singing bowed lead over soft sustained chords', map: { lead: 'aria', counter: 'aria', comp: 'pad', tex: 'pad' } },
    { name: 'Reed & breath', desc: 'a breathy woodwind-like lead', map: { lead: 'reed', counter: 'reed' } },
    { name: 'Glass & bells', desc: 'crystalline high shimmer — glass lead with bell/chime accents', map: { lead: 'glass', counter: 'chime', comp: 'bell', tex: 'bell' } },
    { name: 'Electric', desc: 'a blooming electric-guitar-like lead', map: { lead: 'wire', counter: 'wire' } },
    { name: 'Mallets & plucks', desc: 'struck, plucked timbres — mallet lead over a plucked comp', map: { lead: 'mallet', comp: 'pluck', counter: 'mallet' } },
  ];

  // ---- Master instrument list (Advanced instrument checkboxes) --------------
  // The frozen, ordered set of instruments the Advanced "Instruments" control
  // exposes as checkboxes (index = bit position in the serialized mask — never
  // reorder or remove; append only). `role` is the ensemble role a freshly
  // ADDED instrument takes (so a strategy that voices that role will play it);
  // an instrument already in the piece keeps its own role/register when kept.
  const MASTER_INSTRUMENTS = [
    { voice: 'melody', label: 'Piano / keys', group: 'Melodic', role: 'lead' },
    { voice: 'rhodes', label: 'Electric piano', group: 'Melodic', role: 'comp' },
    { voice: 'pluck', label: 'Plucked', group: 'Melodic', role: 'comp' },
    { voice: 'aria', label: 'Bowed strings', group: 'Melodic', role: 'lead' },
    { voice: 'reed', label: 'Reed / wind', group: 'Melodic', role: 'lead' },
    { voice: 'wire', label: 'Electric lead', group: 'Melodic', role: 'lead' },
    { voice: 'glass', label: 'Glass', group: 'Melodic', role: 'lead' },
    { voice: 'bell', label: 'Bells', group: 'Melodic', role: 'counter' },
    { voice: 'chime', label: 'Chimes', group: 'Melodic', role: 'counter' },
    { voice: 'mallet', label: 'Mallets', group: 'Melodic', role: 'lead' },
    { voice: 'chord', label: 'Strings (chords)', group: 'Melodic', role: 'comp' },
    { voice: 'pad', label: 'Pad', group: 'Melodic', role: 'pad' },
    { voice: 'bass', label: 'Bass', group: 'Low', role: 'bass' },
    { voice: 'drone', label: 'Drone', group: 'Low', role: 'drone' },
    { voice: 'kick', label: 'Kick', group: 'Percussion', role: 'kick' },
    { voice: 'snare', label: 'Snare', group: 'Percussion', role: 'snare' },
    { voice: 'hat', label: 'Hi-hat', group: 'Percussion', role: 'hat' },
    { voice: 'shaker', label: 'Shaker', group: 'Percussion', role: 'perc2' },
    { voice: 'clap', label: 'Clap', group: 'Percussion', role: 'perc1' },
    { voice: 'wood', label: 'Woodblock', group: 'Percussion', role: 'perc1' },
    { voice: 'drum', label: 'Drum', group: 'Percussion', role: 'perc1' },
    { voice: 'metal', label: 'Metal', group: 'Percussion', role: 'timeline' },
    { voice: 'boom', label: 'Low drum', group: 'Percussion', role: 'boom' },
    { voice: 'gong', label: 'Gong', group: 'Percussion', role: 'perc2' },
  ]; // 24 instruments -> the `instruments` control is a 24-bit mask (V2 URL)
  const ROLE_REG = { lead: [62, 86], comp: [50, 72], counter: [58, 80], pad: [46, 70], tex: [52, 76], bass: [36, 55], drone: [33, 45], kick: [0, 0], snare: [0, 0], hat: [0, 0], perc1: [0, 0], perc2: [0, 0], timeline: [0, 0], boom: [0, 0] };
  const ROLE_LVL = { lead: 0.95, comp: 0.5, counter: 0.6, pad: 0.4, tex: 0.4, bass: 0.75, drone: 0.6, kick: 0.9, snare: 0.8, hat: 0.5, perc1: 0.55, perc2: 0.45, timeline: 0.5, boom: 0.7 };

  // ---- Region sampling --------------------------------------------------------
  // A preset field region is one of:
  //   plain value                  -> that value
  //   { pick: [...], w?: [...] }   -> weighted categorical draw
  //   { range: [lo, hi], round? }  -> continuous uniform draw
  // Deep objects/arrays are passed through by value (cloned).
  function isRegion(x) { return x && typeof x === 'object' && (x.pick !== undefined || x.range !== undefined); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function drawField(region, rng) {
    if (isRegion(region)) {
      if (region.pick !== undefined) {
        const v = region.w ? rng.weighted(region.pick, region.w) : rng.pick(region.pick);
        return clone(v);
      }
      const v = region.range[0] + (region.range[1] - region.range[0]) * rng.next();
      return region.round ? Math.round(v) : v;
    }
    return clone(region);
  }

  // Preset fields every pack must (or may) declare, with site-wide fallbacks so
  // a sparse preset still samples to a complete vector.
  const PRESET_DEFAULTS = {
    scale: 'major', tonicPc: { pick: [0, 2, 3, 5, 7, 9, 10] },
    harmonyType: 'functional', harmonicRhythm: 1, harmRich: 0.25,
    timeline: 'none', meterId: '4/4', bpmBand: [80, 130], bpm: null, // null -> draw inside band
    swing: 0, laidBack: 0, rubato: 0.25,
    density: 0.5, interlock: 0.2, leadProm: 0.6, melTex: 0.35,
    grammar: { stepBias: 0.72, range: 14, leapMax: 7 },
    form: 'sections', arc: 'arch', development: 0.4, variation: 0.5,
    lengthSec: { pick: [65, 125, 190], w: [0.3, 0.5, 0.2] }, ending: 'cadence',
    brightness: 0.5, dynRange: 0.5, expression: 0.5, reverb: 0.3, width: 0.55,
  };

  /** Draw a concrete vector from one registered pack's preset region. */
  function sample(pack, rng) {
    const p = pack.preset || {};
    const v = { kind: 'preset', genreA: pack.id, genreB: null, strategy: pack.id, name: pack.name, meld: null };
    for (const key of Object.keys(PRESET_DEFAULTS)) {
      v[key] = drawField(p[key] !== undefined ? p[key] : PRESET_DEFAULTS[key], rng);
    }
    // tempo: explicit bpm region wins; else uniform inside the band
    v.bpmBand = clone(p.bpmBand || PRESET_DEFAULTS.bpmBand);
    if (v.bpm == null) v.bpm = v.bpmBand[0] + (v.bpmBand[1] - v.bpmBand[0]) * rng.next();
    v.meter = clone(METERS[v.meterId] || METERS['4/4']);
    // ensemble + palettes are authored per pack; the 5 generic EXTRA_PALETTES
    // are appended so any genre can be recolored. AUTO sampling picks only among
    // the genre's own authored palettes (kept genre-appropriate); the generic
    // sets are opt-in via the Intermediate dropdown.
    const authored = clone(p.palettes || [{ name: 'default', desc: 'the genre default ensemble', map: {} }]);
    v.paletteAuthored = authored.length;
    v.palettes = authored.concat(EXTRA_PALETTES.map(clone));
    v.paletteId = p.paletteId !== undefined ? drawField(p.paletteId, rng) : rng.int(0, Math.max(0, authored.length - 1));
    v.ensemble = clone(p.ensemble || [
      { role: 'lead', voice: 'melody', register: [60, 84], level: 1.0, prio: 0 },
      { role: 'comp', voice: 'chord', register: [48, 72], level: 0.5, prio: 1 },
      { role: 'bass', voice: 'bass', register: [36, 55], level: 0.8, prio: 2 },
    ]);
    // free-time flag rides the meter
    v.free = !!v.meter.free;
    // macros unset (auto) until controls set them
    v.energy = null; v.mood = null;
    v.layerCap = null;
    v.signatures = clone(p.signatures || []);
    v.novelty = 0; v.coherenceStrict = 0.5; v.sigEmph = 0.5;
    v.moodModePool = clone(p.moodModePool || ['naturalMinor', 'dorian', 'mixolydian', 'major', 'lydian']);
    return v;
  }

  // ---- The meld (schema §5) ----------------------------------------------------
  // Per-axis parent selection, not averaging: categorical fields snap to one
  // parent, continuous fields blend at the balance weight, and the rhythmic
  // chassis (meter + groove + tempo-feel + timeline + strategy/form) and the
  // harmony/mode (scale, tonic, harmony type/richness, melodic grammar) come
  // from DIFFERENT parents. Which parent is chassis is a seeded 50/50 unless a
  // compatibility gate forces it (a free-tempo parent can never be the chassis
  // of a metered meld). Balance is even (0.5) by default — Tom's call, provisional.
  function meld(packA, packB, rng, balance) {
    const bal = balance == null ? 0.5 : Math.max(0, Math.min(1, balance));
    const a = sample(packA, rng.stream('meld:a'));
    const b = sample(packB, rng.stream('meld:b'));
    // Compatibility gate: groove vs rubato — never overlay free and metered; the
    // metered parent takes the chassis. Otherwise the chassis is a seeded coin.
    let chassis, other;
    if (a.free !== b.free) { chassis = a.free ? b : a; other = a.free ? a : b; }
    else { const aIsChassis = rng.stream('meld:chassis').bool(0.5); chassis = aIsChassis ? a : b; other = aIsChassis ? b : a; }
    const wOther = chassis === a ? 1 - bal : bal; // weight of the non-chassis parent for blends
    const mix = (x, y) => x + (y - x) * wOther;

    const v = clone(chassis);
    v.kind = 'meld';
    v.genreA = packA.id; v.genreB = packB.id;
    v.meld = { a: packA.id, b: packB.id, chassis: chassis.genreA, balance: bal };
    v.name = (chassis === a ? packA.name + ' × ' + packB.name : packA.name + ' × ' + packB.name);
    // chassis keeps: strategy, meter, swing, laidBack, timeline, form, free, bpmBand
    // harmony/mode from the OTHER parent (the load-bearing rule):
    v.scale = other.scale; v.tonicPc = other.tonicPc;
    v.harmonyType = other.harmonyType; v.harmonicRhythm = other.harmonicRhythm;
    v.harmRich = other.harmRich; v.grammar = clone(other.grammar);
    v.moodModePool = clone(other.moodModePool);
    // gates: tuning<->harmony n/a (all 12-TET at v1); feel: one grid — chassis's
    // swing stands; meter: chassis's meter stands (never superimpose).
    // continuous surface fields blend:
    v.density = mix(chassis.density, other.density);
    v.brightness = mix(chassis.brightness, other.brightness);
    v.dynRange = mix(chassis.dynRange, other.dynRange);
    v.expression = mix(chassis.expression, other.expression);
    v.reverb = mix(chassis.reverb, other.reverb);
    v.width = mix(chassis.width, other.width);
    v.rubato = Math.min(chassis.rubato, mix(chassis.rubato, other.rubato)); // a groove chassis caps rubato
    v.variation = mix(chassis.variation, other.variation);
    v.development = mix(chassis.development, other.development);
    v.interlock = mix(chassis.interlock, other.interlock);
    v.leadProm = mix(chassis.leadProm, other.leadProm);
    v.melTex = mix(chassis.melTex, other.melTex);
    v.lengthSec = mix(chassis.lengthSec, other.lengthSec);
    // tempo-feel is the chassis's; nudge the center toward the partner only
    // within the chassis band (a house pulse under classical harmony is still a
    // house pulse):
    const bpmTarget = mix(chassis.bpm, Math.max(v.bpmBand[0], Math.min(v.bpmBand[1], other.bpm)));
    v.bpm = Math.max(v.bpmBand[0], Math.min(v.bpmBand[1], bpmTarget));
    // arc: either parent's, seeded
    v.arc = rng.stream('meld:arc').bool(0.5) ? chassis.arc : other.arc;
    // ending: chassis (it owns the form)
    // ensemble: the chassis keeps its rhythm-section roles; the harmony parent
    // supplies the pitched/lead roles (timbre split per hybridization-and-fusion).
    const RHYTHM_ROLES = { kick: 1, snare: 1, hat: 1, perc1: 1, perc2: 1, shaker: 1, timeline: 1 };
    const rhythm = (chassis.ensemble || []).filter((e) => RHYTHM_ROLES[e.role]);
    const pitchedOther = (other.ensemble || []).filter((e) => !RHYTHM_ROLES[e.role]);
    let ens = rhythm.concat(pitchedOther);
    if (!ens.some((e) => e.role === 'bass') ) {
      const bassC = (chassis.ensemble || []).find((e) => e.role === 'bass');
      if (bassC) ens.push(bassC);
    }
    // re-prioritize: keep chassis anchors first, then harmony voices
    ens = ens.map((e, i) => Object.assign(clone(e), { prio: e.prio == null ? i : e.prio }));
    v.ensemble = ens;
    // palettes: keep the harmony parent's palette bank for pitched voices
    v.palettes = clone(other.palettes || chassis.palettes);
    v.paletteAuthored = other.paletteAuthored || chassis.paletteAuthored || Math.max(1, (v.palettes || []).length - EXTRA_PALETTES.length);
    v.paletteId = Math.min(v.paletteId, Math.max(0, (v.palettes || []).length - 1));
    // signatures: one from each parent if present
    v.signatures = (chassis.signatures || []).slice(0, 1).concat((other.signatures || []).slice(0, 1));
    return v;
  }

  // ---- Invented styles (schema §4, M7) ----------------------------------------
  // EMI-minus-corpus: draw each field from a genre-plausible prior, spend a
  // novelty budget of 1-3 axes off-convention, attach 2-3 signature rules, and
  // let the coherence gate repair the rest. The compose strategy is picked to
  // suit the drawn fields (one composer core serves presets, melds, and
  // inventions alike — schema §2).
  const NOVELTY_AXES = ['meter', 'timeline', 'scale', 'arc', 'ensemble', 'registerShift', 'harmonicRhythm'];
  const SIGNATURE_BANK = [
    { type: 'intervalCell', cells: [[0, 3, 5], [0, 2, 5], [0, 5, 7], [0, 1, 5], [0, 4, 6], [0, 2, 3]] },
    { type: 'rhythmMotto', mottos: [[1, 0, 0, 1, 0, 1, 0, 0], [1, 1, 0, 0, 1, 0], [1, 0, 1, 1, 0, 0, 0, 1]] },
    { type: 'cadenceDrop', drops: [5, 7, 4, 2] },        // melodic fall onto phrase ends, in scale steps
    { type: 'voicingHabit', habits: ['openFifth', 'clusterSecond', 'tenthSpread'] },
    { type: 'echoTail', delays: [0.5, 0.75, 1.5] },      // lead notes answered by a soft echo, in beats
  ];

  function invent(rng, opts) {
    opts = opts || {};
    const budget = Math.max(1, Math.min(3, opts.novelty || 2));
    const r = rng.stream('invent');
    const v = {
      kind: 'invented', genreA: null, genreB: null, meld: null,
      name: 'Invented style',
      scale: r.weighted(['dorian', 'mixolydian', 'naturalMinor', 'major', 'lydian', 'majorPentatonic', 'minorPentatonic'], [0.2, 0.16, 0.16, 0.14, 0.12, 0.12, 0.1]),
      tonicPc: r.int(0, 11),
      harmonyType: r.weighted(HARMONY_TYPES, [0.22, 0.34, 0.26, 0.18]),
      harmonicRhythm: r.weighted([0.5, 1, 2], [0.3, 0.55, 0.15]),
      harmRich: 0.15 + 0.5 * r.next(),
      timeline: 'none',
      meterId: r.weighted(['4/4', '3/4', '6/8', '2/4'], [0.45, 0.2, 0.2, 0.15]),
      swing: r.bool(0.25) ? 0.3 + 0.4 * r.next() : 0,
      laidBack: 0.2 * r.next(), rubato: 0.1 + 0.4 * r.next(),
      density: 0.3 + 0.45 * r.next(), interlock: 0.5 * r.next(),
      leadProm: 0.4 + 0.4 * r.next(), melTex: 0.2 + 0.5 * r.next(),
      grammar: { stepBias: 0.62 + 0.2 * r.next(), range: 10 + r.int(0, 8), leapMax: 7 },
      form: 'sections', arc: r.pick(ARCS), development: r.next(), variation: 0.3 + 0.5 * r.next(),
      lengthSec: 65 + 130 * r.next(), ending: r.weighted(ENDINGS, [0.4, 0.25, 0.1, 0.25]),
      brightness: 0.3 + 0.4 * r.next(), dynRange: 0.35 + 0.4 * r.next(),
      expression: 0.35 + 0.4 * r.next(), reverb: 0.15 + 0.45 * r.next(), width: 0.4 + 0.35 * r.next(),
      bpmBand: [60, 160], bpm: 60 + 100 * r.next(),
      energy: null, mood: null, layerCap: null,
      moodModePool: ['phrygian', 'naturalMinor', 'dorian', 'mixolydian', 'major', 'lydian'],
    };
    // ensemble from a role-template draw
    const ENSEMBLE_TEMPLATES = [
      [{ role: 'lead', voice: 'melody' }, { role: 'comp', voice: 'pluck' }, { role: 'bass', voice: 'bass' }, { role: 'perc1', voice: 'wood' }],
      [{ role: 'lead', voice: 'reed' }, { role: 'pad', voice: 'pad' }, { role: 'bass', voice: 'drone' }, { role: 'perc1', voice: 'shaker' }],
      [{ role: 'lead', voice: 'glass' }, { role: 'comp', voice: 'rhodes' }, { role: 'bass', voice: 'bass' }, { role: 'perc1', voice: 'drum' }, { role: 'perc2', voice: 'chime' }],
      [{ role: 'lead', voice: 'wire' }, { role: 'pad', voice: 'chord' }, { role: 'bass', voice: 'bass' }, { role: 'perc1', voice: 'hat' }],
      [{ role: 'lead', voice: 'mallet' }, { role: 'comp', voice: 'pluck' }, { role: 'drone', voice: 'drone' }, { role: 'perc1', voice: 'clap' }],
      [{ role: 'lead', voice: 'aria' }, { role: 'comp', voice: 'melody' }, { role: 'bass', voice: 'bass' }, { role: 'perc1', voice: 'scrape' }],
    ];
    const REGISTERS = { lead: [62, 86], comp: [50, 72], pad: [48, 70], bass: [36, 55], drone: [33, 45], perc1: [0, 0], perc2: [0, 0] };
    const LEVELS = { lead: 0.95, comp: 0.45, pad: 0.4, bass: 0.75, drone: 0.6, perc1: 0.5, perc2: 0.4 };
    v.ensemble = r.pick(ENSEMBLE_TEMPLATES).map((e, i) => ({
      role: e.role, voice: e.voice, register: (REGISTERS[e.role] || [48, 72]).slice(), level: LEVELS[e.role] || 0.5, prio: i,
    }));
    v.palettes = [{ name: 'invented', desc: 'the invented ensemble', map: {} }].concat(EXTRA_PALETTES.map(clone));
    v.paletteAuthored = 1; v.paletteId = 0;

    // Spend the novelty budget: push 1-3 axes off-convention; everything else
    // stays at the perceptual universals the base draw above encodes.
    const axes = r.shuffle(NOVELTY_AXES).slice(0, budget);
    v.noveltyAxes = axes;
    for (const axis of axes) {
      if (axis === 'meter') v.meterId = r.pick(['5/8', '7/8', '6/8']);
      else if (axis === 'timeline') v.timeline = r.pick(['euclid', 'sieve', 'clave']);
      else if (axis === 'scale') v.scale = r.pick(['inScale', 'wholeTone', 'phrygian', 'lydian']);
      else if (axis === 'arc') v.arc = r.pick(['terraced', 'waves', 'swellCut', 'joHaKyu']);
      else if (axis === 'ensemble') {
        const odd = r.pick([{ role: 'lead', voice: 'chime' }, { role: 'lead', voice: 'metal' }, { role: 'counter', voice: 'friction' }, { role: 'counter', voice: 'glass' }]);
        const slot = v.ensemble.findIndex((e) => e.role === odd.role);
        if (slot >= 0) v.ensemble[slot] = Object.assign({}, v.ensemble[slot], { voice: odd.voice });
        else v.ensemble.push({ role: odd.role, voice: odd.voice, register: [60, 84], level: 0.5, prio: v.ensemble.length });
      } else if (axis === 'registerShift') {
        const up = r.bool(0.5) ? 7 : -7;
        for (const e of v.ensemble) if (e.role === 'lead' || e.role === 'comp') { e.register[0] += up; e.register[1] += up; }
      } else if (axis === 'harmonicRhythm') v.harmonicRhythm = r.pick([0.25, 3, 4]);
    }
    v.meter = clone(METERS[v.meterId] || METERS['4/4']);
    v.free = !!v.meter.free;

    // 2-3 signature rules so the style is learnable within one listen
    // (style-invention-and-style-space.md: teach the style inside the piece).
    const sigCount = 2 + (r.bool(0.4) ? 1 : 0);
    const kinds = r.shuffle(SIGNATURE_BANK).slice(0, sigCount);
    v.signatures = kinds.map((k) => {
      if (k.type === 'intervalCell') return { type: k.type, cell: r.pick(k.cells) };
      if (k.type === 'rhythmMotto') return { type: k.type, motto: r.pick(k.mottos) };
      if (k.type === 'cadenceDrop') return { type: k.type, drop: r.pick(k.drops) };
      if (k.type === 'voicingHabit') return { type: k.type, habit: r.pick(k.habits) };
      return { type: k.type, delay: r.pick(k.delays) };
    });
    v.novelty = budget; v.coherenceStrict = 0.5; v.sigEmph = 0.5;

    // Strategy: pick the composer family that suits the drawn material
    // (schema §2: provenance is the only difference — same engine).
    if (v.harmonyType === 'drone') v.strategy = r.bool(0.6) ? 'ambient' : 'folk';
    else if (v.harmonyType === 'loop') v.strategy = r.weighted(['electronic', 'lofi', 'folk'], [0.4, 0.35, 0.25]);
    else if (v.harmonyType === 'modal') v.strategy = r.weighted(['cinematic', 'folk', 'classical'], [0.4, 0.3, 0.3]);
    else v.strategy = r.weighted(['classical', 'jazz'], [0.6, 0.4]);
    if (!v.ensemble.some((e) => e.role === 'bass' || e.role === 'drone')) v.strategy = 'percussion';
    // Hostability repairs (coherence for the ROUTER): the ambient strategy
    // needs something that sustains (a drone or pad loop) or the texture has
    // multi-second holes; groove/functional strategies assume their home
    // meters, so an off-meter draw (e.g. a 5/8 novelty) moves to a family
    // that genuinely hosts aksak/compound bars (folk does, by construction).
    const hasSustain = v.ensemble.some((e) => e.role === 'drone' || e.role === 'pad');
    if (v.strategy === 'ambient' && !hasSustain) v.strategy = 'cinematic';
    const METER_HOSTS = {
      lofi: { '4/4': 1 }, electronic: { '4/4': 1 }, jazz: { '4/4': 1, '3/4': 1 },
      classical: { '4/4': 1, '3/4': 1, '6/8': 1, '2/4': 1 },
      cinematic: { '4/4': 1, '3/4': 1, '6/8': 1, '2/4': 1, 'free': 1 },
    };
    const hosts = METER_HOSTS[v.strategy];
    if (hosts && !hosts[v.meterId]) v.strategy = 'folk';
    v.name = 'Invented ' + ['Nocturne', 'Current', 'Meridian', 'Tessellation', 'Halcyon', 'Vessel', 'Orrery', 'Aperture'][r.int(0, 7)] + ' ' + (1 + r.int(0, 98));
    return v;
  }

  // ---- Coherence gate (schema §6) -----------------------------------------------
  // Cross-axis couplings a naive independent sample would violate; repair by
  // snapping the offending axis toward the coupling (never resample here — the
  // vector must stay a pure function of the inputs).
  function coherence(v) {
    // free tempo: no timeline, no swing, no stop-cadence
    if (v.free) {
      v.timeline = 'none'; v.swing = 0;
      if (v.ending === 'cadence' || v.ending === 'stop') v.ending = 'fade';
      if (v.harmonyType === 'functional') v.harmonyType = 'modal';
    }
    // functional harmony needs a diatonic 7-note scale with a leading-tone story
    if (v.harmonyType === 'functional' && ['majorPentatonic', 'minorPentatonic', 'wholeTone', 'inScale', 'chromatic'].indexOf(v.scale) >= 0) {
      v.harmonyType = 'modal';
    }
    // swing is a duple-subdivision phenomenon: compound/aksak meters kill it
    if (v.meter && (v.meter.compound || v.meter.aksak)) v.swing = 0;
    // tempo x density ceiling (perceptual events/sec band): fast pieces thin out
    if (v.bpm > 140) v.density = Math.min(v.density, 0.62);
    if (v.bpm < 65 && !v.free) v.density = Math.max(v.density, 0.25);
    // register x spacing: keep bass windows below the lead, cap bass top
    for (const e of v.ensemble || []) {
      if (e.role === 'bass' && e.register && e.register[1] > 60) e.register[1] = 60;
    }
    // interlock only means something with 2+ rhythm-capable parts
    const percCount = (v.ensemble || []).filter((e) => /perc|kick|snare|hat|shaker/.test(e.role)).length;
    if (percCount < 2) v.interlock = Math.min(v.interlock, 0.3);
    return v;
  }

  // ---- The control registry (control-taxonomy design doc) -----------------------
  // ORDER IS LOAD-BEARING: it is the v1 URL bit layout (serialize.js) — append
  // only, never reorder or resize an existing entry once links are live.
  // Each control: { id, label, tier: 'start'|'int'|'adv', group, type:
  // 'slider'|'enum', steps | values, bits, speed: 'instant'|'boundary'|'replan',
  // apply(vector, raw) } — apply is deterministic (NO rng) and runs in registry
  // order after sampling, only for set (non-auto) controls.
  function mix(a, b, w) { return a + (b - a) * w; }
  const CONTROLS = [
    { id: 'energy', label: 'Energy', tier: 'start', group: 'Feel', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'calm ↔ energetic',
      apply(v, x) { const e = x / 4; v.energy = e;
        v.bpm = mix(v.bpmBand[0], v.bpmBand[1], 0.12 + 0.76 * e);
        v.density = mix(v.density, e, 0.65);
        v.dynRange = mix(v.dynRange, 0.3 + 0.7 * e, 0.5);
        v.brightness = mix(v.brightness, 0.25 + 0.62 * e, 0.4); } },
    { id: 'mood', label: 'Mood', tier: 'start', group: 'Feel', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'dark ↔ bright',
      apply(v, x) { const m = x / 4; v.mood = m;
        const pool = v.moodModePool || ['naturalMinor', 'dorian', 'mixolydian', 'major', 'lydian'];
        v.scale = pool[Math.max(0, Math.min(pool.length - 1, Math.round(m * (pool.length - 1))))];
        v.brightness = mix(v.brightness, 0.2 + 0.6 * m, 0.5); } },
    { id: 'length', label: 'Length', tier: 'start', group: 'Form', type: 'enum', values: ['short', 'medium', 'long'], bits: 2, speed: 'replan',
      apply(v, x) { v.lengthSec = LENGTH_SECS[x]; } },
    { id: 'space', label: 'Space', tier: 'start', group: 'Sound', type: 'slider', steps: 5, bits: 3, speed: 'instant',
      hint: 'dry ↔ spacious',
      apply(v, x) { v.reverb = x / 4; } },
    { id: 'tempo', label: 'Tempo', tier: 'int', group: 'Time & feel', type: 'slider', steps: 64, bits: 6, speed: 'boundary',
      hint: 'BPM', fmt(x) { return Math.round(40 * Math.pow(5, x / 63)) + ' BPM'; },
      apply(v, x) { v.bpm = 40 * Math.pow(5, x / 63); } }, // 40..200, ratio steps
    { id: 'swing', label: 'Swing / groove', tier: 'int', group: 'Time & feel', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'straight ↔ deep swing', apply(v, x) { v.swing = x / 4; } },
    { id: 'meter', label: 'Meter', tier: 'int', group: 'Time & feel', type: 'enum', values: METER_IDS, bits: 3, speed: 'replan',
      apply(v, x) { v.meterId = METER_IDS[x]; v.meter = clone(METERS[v.meterId]); v.free = !!v.meter.free; } },
    { id: 'key', label: 'Key', tier: 'int', group: 'Pitch & harmony', type: 'enum', values: theory.PC_NAMES_SHARP, bits: 4, speed: 'boundary',
      apply(v, x) { v.tonicPc = x; } },
    { id: 'mode', label: 'Mode / color', tier: 'int', group: 'Pitch & harmony', type: 'enum',
      values: MODE_IDS, labels: ['major', 'minor', 'dorian', 'lydian', 'mixolydian', 'phrygian', 'pentatonic'], bits: 3, speed: 'boundary',
      apply(v, x) { v.scale = MODE_IDS[x]; } },
    { id: 'harmRich', label: 'Harmonic richness', tier: 'int', group: 'Pitch & harmony', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'plain triads ↔ lush 7ths/9ths', apply(v, x) { v.harmRich = x / 4; } },
    { id: 'harmMotion', label: 'Harmonic motion', tier: 'int', group: 'Pitch & harmony', type: 'enum',
      values: HARMONY_TYPES, labels: ['goal-directed', 'modal / static', 'loop / vamp', 'drone'], bits: 2, speed: 'boundary',
      apply(v, x) { v.harmonyType = HARMONY_TYPES[x]; } },
    { id: 'density', label: 'Density / activity', tier: 'int', group: 'Texture', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'sparse ↔ busy', apply(v, x) { v.density = x / 4; } },
    { id: 'layers', label: 'Layers', tier: 'int', group: 'Texture', type: 'slider', steps: 6, bits: 3, speed: 'boundary',
      hint: '1 ↔ 6 voices', fmt(x) { return (x + 1) + (x ? ' voices' : ' voice'); },
      apply(v, x) { v.layerCap = x + 1; } },
    { id: 'leadProm', label: 'Lead prominence', tier: 'int', group: 'Texture', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'background ↔ up-front', apply(v, x) { v.leadProm = x / 4; } },
    { id: 'melTex', label: 'Melodic ↔ textural', tier: 'int', group: 'Texture', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'tune-forward ↔ texture-forward', apply(v, x) { v.melTex = x / 4; } },
    { id: 'palette', label: 'Instrument palette', tier: 'int', group: 'Sound & space', type: 'enum',
      values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      labels: ['set 1', 'set 2', 'set 3', 'set 4', 'set 5', 'set 6', 'set 7', 'set 8', 'set 9', 'set 10', 'set 11', 'set 12', 'set 13', 'set 14', 'set 15', 'set 16'],
      dynamicValues: 'palettes', bits: 4, speed: 'boundary',
      apply(v, x) { v.paletteId = Math.min(x, Math.max(0, (v.palettes || []).length - 1)); } },
    { id: 'brightness', label: 'Brightness / tone', tier: 'int', group: 'Sound & space', type: 'slider', steps: 5, bits: 3, speed: 'instant',
      hint: 'dark ↔ bright', apply(v, x) { v.brightness = x / 4; } },
    { id: 'width', label: 'Stereo width', tier: 'int', group: 'Sound & space', type: 'slider', steps: 5, bits: 3, speed: 'instant',
      hint: 'narrow ↔ wide', apply(v, x) { v.width = x / 4; } },
    { id: 'variation', label: 'Variation amount', tier: 'int', group: 'Form & variation', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'repetitive ↔ ever-changing', apply(v, x) { v.variation = x / 4; } },
    { id: 'ending', label: 'Ending', tier: 'int', group: 'Form & variation', type: 'enum',
      values: ENDINGS, labels: ['resolved cadence', 'fade', 'stop', 'ring out'], bits: 2, speed: 'replan',
      apply(v, x) { v.ending = ENDINGS[x]; } },
    { id: 'expression', label: 'Expression', tier: 'int', group: 'Expression', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'mechanical ↔ expressive', apply(v, x) { v.expression = x / 4; } },
    { id: 'dynRange', label: 'Dynamic range', tier: 'int', group: 'Expression', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      hint: 'flat ↔ wide', apply(v, x) { v.dynRange = x / 4; } },
    // ---- Advanced: the parameters invented for this site (taxonomy §6.3) ----
    { id: 'arc', label: 'Intensity arc', tier: 'adv', group: 'Invented parameters', type: 'enum',
      values: ARCS, labels: ['rise', 'arch', 'late arch', 'terraced', 'waves', 'jo-ha-kyū', 'front-loaded', 'level', 'swell & cut'], bits: 4, speed: 'replan',
      gloss: 'the shape of the piece\'s rise and fall over time',
      apply(v, x) { v.arc = ARCS[x]; } },
    { id: 'development', label: 'Development mode', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 5, bits: 3, speed: 'replan',
      gloss: 'cyclic (loops that vary) ↔ through-composed (never returns)',
      hint: 'cyclic ↔ through-composed', apply(v, x) { v.development = x / 4; } },
    { id: 'timeline', label: 'Timeline type', tier: 'adv', group: 'Invented parameters', type: 'enum',
      values: TIMELINES, labels: ['none', 'clave', 'bell', 'Euclidean', 'sieve', 'pulse'], bits: 3, speed: 'boundary',
      gloss: 'the rhythmic skeleton the parts hang on',
      apply(v, x) { v.timeline = TIMELINES[x]; } },
    { id: 'interlock', label: 'Interlock density', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'how tightly separate parts dovetail into one another',
      apply(v, x) { v.interlock = x / 4; } },
    { id: 'blend', label: 'Style blend', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 5, bits: 3, speed: 'replan',
      gloss: 'the balance of a two-genre meld (center = even)', hint: 'all A ↔ all B',
      apply(v, x) { if (v.meld) v.meld.balance = x / 4; } }, // consumed at build time
    { id: 'novelty', label: 'Novelty budget', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 3, bits: 2, speed: 'replan',
      gloss: 'how many axes an invented style may push away from convention',
      fmt(x) { return (x + 1) + (x ? ' axes' : ' axis'); },
      apply(v, x) { v.novelty = x + 1; } }, // consumed by invent() at build time
    { id: 'coherenceStrict', label: 'Coherence strictness', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 5, bits: 3, speed: 'replan',
      gloss: 'loose (more surprising) ↔ strict (safer)',
      apply(v, x) { v.coherenceStrict = x / 4; } },
    { id: 'sigEmph', label: 'Signature emphasis', tier: 'adv', group: 'Invented parameters', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'how strongly the piece repeats its defining fingerprints',
      apply(v, x) { v.sigEmph = x / 4; } },
    // ---- Advanced: further playback/compositional parameters (Tom 2026-07-10) ----
    // These map onto vector fields the composer/performer already read but that
    // no control previously exposed.
    { id: 'laidBack', label: 'Micro-timing', tier: 'adv', group: 'Timing (advanced)', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'how far behind the beat the parts sit (a laid-back feel)', hint: 'tight ↔ laid-back',
      apply(v, x) { v.laidBack = x / 4; } },
    { id: 'rubato', label: 'Rubato', tier: 'adv', group: 'Timing (advanced)', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'strict tempo ↔ freely elastic phrase timing', hint: 'strict ↔ elastic',
      apply(v, x) { v.rubato = x / 4; } },
    { id: 'harmonicRhythm', label: 'Chord rate', tier: 'adv', group: 'Harmony (advanced)', type: 'enum',
      values: [0, 1, 2, 3, 4, 5], labels: ['1 chord / 4 bars', '1 / 2 bars', '1 / bar', '2 / bar', '3 / bar', '4 / bar'], bits: 3, speed: 'replan',
      gloss: 'how often the harmony changes',
      apply(v, x) { v.harmonicRhythm = [0.25, 0.5, 1, 2, 3, 4][x]; } },
    { id: 'stepBias', label: 'Melodic motion', tier: 'adv', group: 'Harmony (advanced)', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'leapy ↔ stepwise melodic motion', hint: 'leapy ↔ stepwise',
      apply(v, x) { v.grammar = Object.assign({}, v.grammar, { stepBias: 0.45 + 0.5 * (x / 4) }); } },
    { id: 'melRange', label: 'Melodic range', tier: 'adv', group: 'Harmony (advanced)', type: 'slider', steps: 5, bits: 3, speed: 'boundary',
      gloss: 'narrow ↔ wide melodic compass', hint: 'narrow ↔ wide',
      apply(v, x) { v.grammar = Object.assign({}, v.grammar, { range: 7 + Math.round(13 * (x / 4)) }); } },
    { id: 'instruments', label: 'Instruments', tier: 'adv', group: 'Instruments', type: 'checkset', options: MASTER_INSTRUMENTS, bits: 24, speed: 'boundary',
      gloss: 'the exact instruments in the piece — check to add, uncheck to remove',
      apply(v, mask) {
        if (!mask) return;                         // 0 = untouched: keep the natural ensemble
        const present = {};
        for (const e of (v.ensemble || [])) if (present[e.voice] == null) present[e.voice] = e;
        const chosen = [];
        for (let i = 0; i < MASTER_INSTRUMENTS.length; i++) {
          if (!((mask >>> i) & 1)) continue;
          const mi = MASTER_INSTRUMENTS[i];
          if (present[mi.voice]) chosen.push(clone(present[mi.voice]));
          else chosen.push({ role: mi.role, voice: mi.voice, register: (ROLE_REG[mi.role] || [48, 72]).slice(), level: ROLE_LVL[mi.role] || 0.6 });
        }
        if (!chosen.length) return;                // never leave the piece silent
        chosen.forEach((e, i) => { e.prio = i; });
        v.ensemble = chosen;
        v._instrumentsSet = true;                  // effectiveEnsemble skips the palette remap
      } },
  ];
  const CONTROL_BY_ID = {};
  for (const c of CONTROLS) CONTROL_BY_ID[c.id] = c;

  // ---- buildVector: the one entry point ----------------------------------------
  // (seedInt, selection, controls) -> a concrete, coherent, playable vector.
  //   selection: { a: packId|null, b: packId|null, invent: bool }
  //   controls:  { [controlId]: rawQuantizedValue } — only SET (pinned) entries.
  // Pure and deterministic. app.js calls this at Play and again (with the same
  // seed) whenever a replan-speed control changes.
  function buildVector(seedInt, selection, controls) {
    controls = controls || {};
    const registry = getRegistry();
    const root = new rngLib.Rng(seedInt >>> 0);
    const styleRng = root.stream('style');
    let v;
    if (selection && selection.invent) {
      const budget = controls.novelty != null ? controls.novelty + 1 : 2;
      v = invent(styleRng, { novelty: budget });
    } else {
      const packA = registry.get((selection && selection.a) || 'classical') || registry.list()[0];
      const packB = selection && selection.b ? registry.get(selection.b) : null;
      if (packB && packB.id !== packA.id) {
        const balance = controls.blend != null ? controls.blend / 4 : 0.5;
        v = meld(packA, packB, styleRng, balance);
      } else {
        v = sample(packA, styleRng);
      }
    }
    coherence(v);
    // apply set controls in registry order (deterministic, rng-free)
    for (const c of CONTROLS) {
      if (controls[c.id] != null && typeof c.apply === 'function') c.apply(v, controls[c.id]);
    }
    // safety-critical couplings re-checked after user pins (user freedom wins on
    // taste, not on things that break the pipeline):
    if (v.free) { v.swing = 0; v.timeline = 'none'; }
    if (v.meter && (v.meter.compound || v.meter.aksak)) v.swing = Math.min(v.swing, 0.25);
    v.seed = seedInt >>> 0;
    return v;
  }

  /** Ensemble after the layer cap + palette map — what the composer actually uses. */
  function effectiveEnsemble(v) {
    let ens = (v.ensemble || []).slice().sort((a, b) => (a.prio || 0) - (b.prio || 0));
    if (v.layerCap != null) ens = ens.slice(0, Math.max(1, v.layerCap));
    // The Advanced instrument selection already chose exact voices; don't let a
    // (possibly still-pinned) palette remap override the user's picks.
    if (!v._instrumentsSet) {
      const pal = (v.palettes || [])[v.paletteId] || null;
      if (pal && pal.map) ens = ens.map((e) => (pal.map[e.role] ? Object.assign({}, e, { voice: pal.map[e.role] }) : e));
    }
    return ens;
  }

  return {
    METERS, METER_IDS, MODE_IDS, HARMONY_TYPES, TIMELINES, ENDINGS, ARCS, LENGTH_SECS,
    PRESET_DEFAULTS, CONTROLS, CONTROL_BY_ID, EXTRA_PALETTES, MASTER_INSTRUMENTS,
    sample, meld, invent, coherence, buildVector, effectiveEnsemble, drawField,
    _setRegistry(fn) { getRegistry = fn; },
  };
});
