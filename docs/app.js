/*
 * app — the comprehensive site's top-level wiring: URL ↔ state, the CONDUCTOR
 * (the just-in-time composition loop from the site-architecture design doc §5),
 * live-change routing (§6), the three-mode control surface (control-taxonomy),
 * and the transport UI.
 *
 * The conductor owns the mutable style vector and the current position. Its
 * refill loop keeps a small horizon composed ahead of the playhead:
 *
 *   while (composedThroughSec < now + COMPOSE_AHEAD)
 *     unit = composer.nextUnit(currentVector)   // reads the CURRENT vector
 *     perf = perform.realize(unit, currentVector, stream)
 *     schedule(perf.events at unitStart)        // sample-accurate Web Audio times
 *
 * so anything past the horizon reflects the latest settings — no recomposition
 * of the past, no restart. Control changes route by declared speed: INSTANT
 * (space/brightness/width -> AudioParam ramps + vector), NEXT-BOUNDARY (vector
 * only; the next nextUnit call reads it), RE-PLAN (vector + composer.replan),
 * and a GENRE/BLEND/INVENT swap crossfades two whole conductors over two bars
 * (equal-power, each chain terminating in its own fade bus — fx.js `out`).
 *
 * Offline rendering (docs/_selftest.html) runs the SAME nextUnit/realize
 * sequence eagerly into an OfflineAudioContext, so validation reproduces
 * exactly what a listener hears (offline == online, determinism gate).
 *
 * Original first-party code (CC0), written and built by Claude.
 */
;(function (global) {
  'use strict';
  const AM = global.AM;
  const doc = global.document;

  const COMPOSE_AHEAD = 2.6;   // seconds composed ahead of the playhead
  const LOOKAHEAD = 0.12;      // scheduler lookahead (two-clocks pattern)
  const START_DELAY = 0.2;
  const XFADE_BARS = 2;        // Tom's two-bar crossfade for genre/blend swaps

  // ---------------------------------------------------------------- state ----
  // state = { seed (uint32), uiMode 0|1|2, sel: {a, b, invent} (pack IDS here;
  // serialize maps to order codes), controls: {id: raw} (pinned only) }.
  const state = {
    seed: newSeed(),
    uiMode: 0,
    sel: { a: 'classical', b: null, invent: false },
    controls: {},
  };
  let audio = null;        // { ctx }
  let conductor = null;    // the playing conductor
  let fading = null;       // outgoing conductor during a crossfade
  let volume = 0.7;

  function newSeed() {
    try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] >>> 0; }
    catch (e) { return (Math.random() * 4294967296) >>> 0; }
  }
  function seedHex(seed) { return ('00000000' + (seed >>> 0).toString(16)).slice(-8); }
  function parseSeed(text) {
    const t = String(text || '').trim();
    if (/^[0-9a-fA-F]{1,8}$/.test(t)) return parseInt(t, 16) >>> 0;
    return AM.rng.hashSeed(t || 'seed');
  }

  function orderOf(id) { const p = AM.styles.get(id); return p ? p.order : 0; }
  function idOf(order) { const p = AM.styles.byOrder(order); return p ? p.id : 'classical'; }

  function stateToUrl() {
    const payload = AM.serialize.encode({
      seed: state.seed, uiMode: state.uiMode,
      sel: { a: state.sel.invent ? null : orderOf(state.sel.a), b: state.sel.b ? orderOf(state.sel.b) : null, invent: state.sel.invent },
      controls: state.controls,
    });
    const url = location.pathname + '#p=' + payload;
    try { history.replaceState(null, '', url); } catch (e) { location.hash = 'p=' + payload; }
  }
  function stateFromUrl() {
    const m = /[#&]p=([A-Za-z0-9\-_]+)/.exec(location.hash || '');
    if (!m) return false;
    const s = AM.serialize.decode(m[1]);
    if (!s) return false;
    state.seed = s.seed >>> 0;
    state.uiMode = Math.min(2, s.uiMode);
    state.sel = s.sel.invent ? { a: null, b: null, invent: true }
      : { a: idOf(s.sel.a == null ? 0 : s.sel.a), b: s.sel.b == null ? null : idOf(s.sel.b), invent: false };
    state.controls = s.controls || {};
    return true;
  }

  // ---------------------------------------------------------- the conductor ----
  function buildVector() {
    return AM.style.buildVector(state.seed, state.sel, state.controls);
  }

  function makeConductor(ctx, startAt, st) {
    const seedInt = st.seed >>> 0;
    let vec = AM.style.buildVector(seedInt, st.sel, st.controls);
    const composer = AM.compose.create(vec, seedInt);
    const perfRoot = new AM.rng.Rng(seedInt);
    const fxRng = perfRoot.stream('fx');
    const fade = ctx.createGain(); fade.gain.value = 1; fade.connect(ctx.destination);
    const chain = AM.fx.createMasterChain(ctx, {
      rand: () => fxRng.next(), out: fade,
      reverbAmount: 0.16 + vec.reverb * 0.36,
      reverbSeconds: 1.7 + vec.reverb * 3.4,
      returnLowpassHz: 3600 + vec.brightness * 1800,
      volume: volume,
    });
    chain.setTone((vec.brightness - 0.5) * 7);
    chain.setWidth(0.35 + vec.width * 0.95);

    let unitStart = 0;          // seconds from startAt where the next unit begins
    let composedDone = false;
    let endAt = Infinity;       // absolute ctx time the piece (incl. tail) ends
    let fadeScheduled = false;
    const timelineUnits = [];   // {startSec, durSec, section, bar} for the UI
    const recent = [];          // recent events for the visualization

    const scheduler = new AM.transport.Scheduler({
      now: () => ctx.currentTime, lookahead: LOOKAHEAD, interval: 0.025,
    });
    scheduler.onSchedule((ev, time) => {
      AM.synth.play(ev.voice, ctx, chain.input(ev.voice), {
        freq: ev.freq, time, durSec: ev.durSec, vel: ev.vel, pan: ev.pan, expr: ev.expr, p: ev.p, tags: ev.tags,
      });
    });
    scheduler.onRefill((horizon) => {
      while (!composedDone && startAt + unitStart < horizon + COMPOSE_AHEAD) {
        const unit = composer.nextUnit(vec);
        if (!unit) { finishComposing(); break; }
        const isRit = unit.last && (vec.ending === 'cadence' || vec.ending === 'ringout');
        const perf = AM.perform.realize(unit, vec, perfRoot.stream('perf:' + unit.unitIdx), { ritardando: isRit });
        for (const ev of perf.events) {
          scheduler.push(startAt + unitStart + ev.tSec, ev);
          if (recent.length < 4000) recent.push({ t: unitStart + ev.tSec, durSec: ev.durSec, midi: ev.midi, voice: ev.voice, vel: ev.vel });
        }
        timelineUnits.push({ startSec: unitStart, durSec: perf.durSec, section: unit.section, bar: unit.bar, name: vec.name });
        unitStart += perf.durSec;
        if (unit.last) finishComposing();
      }
    });
    function finishComposing() {
      if (composedDone) return;
      composedDone = true;
      const tail = 0.4 + (1.7 + vec.reverb * 3.4) * 0.8;
      endAt = startAt + unitStart + tail;
      if (vec.ending === 'fade' && !fadeScheduled) {
        fadeScheduled = true;
        const fadeLen = Math.min(7, Math.max(3, unitStart * 0.08));
        const t0 = Math.max(ctx.currentTime + 0.05, startAt + unitStart - fadeLen);
        fade.gain.setValueAtTime(1, t0);
        fade.gain.exponentialRampToValueAtTime(0.001, startAt + unitStart + tail * 0.5);
      }
    }

    return {
      get vector() { return vec; },
      get chain() { return chain; },
      get fadeNode() { return fade; },
      get startAt() { return startAt; },
      get endAt() { return endAt; },
      get done() { return composedDone; },
      get timelineUnits() { return timelineUnits; },
      get recentEvents() { return recent; },
      get barSec() { return vec.meter.barBeats * 60 / vec.bpm; },
      start() { scheduler.start(); return this; },
      /** A control changed: st.controls already updated. Route by speed. */
      applyControls(st2) {
        const c = AM.style.CONTROL_BY_ID;
        vec = AM.style.buildVector(st2.seed >>> 0, st2.sel, st2.controls);
        // instant surface params straight onto the running chain:
        chain.setReverb(0.16 + vec.reverb * 0.36);
        chain.setTone((vec.brightness - 0.5) * 7);
        chain.setWidth(0.35 + vec.width * 0.95);
        return vec;
      },
      replan() {
        composer.replan(vec); composedDone = false; endAt = Infinity;
        // a fade ending may already be scheduled on the fade bus (e.g. the user
        // lengthened the piece near its end) — cancel it, the piece continues
        if (fadeScheduled) {
          try { fade.gain.cancelScheduledValues(ctx.currentTime); fade.gain.setValueAtTime(1, ctx.currentTime); } catch (e) {}
          fadeScheduled = false;
        }
      },
      setVolume(v) { chain.setVolume(v); },
      /** equal-power fade of this whole conductor, then stop. */
      fadeOutAndStop(seconds) {
        const t0 = ctx.currentTime;
        const N = 24;
        for (let i = 0; i <= N; i++) {
          const p = i / N;
          fade.gain.setValueAtTime(Math.cos(p * Math.PI / 2) * fade.gain.value || 0.0001, t0 + p * seconds);
        }
        setTimeout(() => this.stop(), (seconds + 0.15) * 1000);
      },
      fadeIn(seconds) {
        const t0 = ctx.currentTime;
        fade.gain.setValueAtTime(0.0001, t0);
        const N = 24;
        for (let i = 0; i <= N; i++) {
          const p = i / N;
          fade.gain.setValueAtTime(Math.sin(p * Math.PI / 2), t0 + p * seconds);
        }
      },
      stop() {
        scheduler.stop();
        try { fade.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); } catch (e) {}
        setTimeout(() => { try { fade.disconnect(); } catch (e) {} }, 250);
      },
    };
  }

  // ------------------------------------------------------------- transport ----
  function ensureAudio() {
    if (!audio) {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      audio = { ctx: new Ctx({ latencyHint: 'playback' }) };
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio;
  }

  let raf = null;
  function play() {
    stopAll(true);
    const { ctx } = ensureAudio();
    conductor = makeConductor(ctx, ctx.currentTime + START_DELAY, state).start();
    setPlayingUi(true);
    tickUi();
  }
  function stopAll(silent) {
    if (conductor) { conductor.stop(); conductor = null; }
    if (fading) { fading.stop(); fading = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (!silent) setPlayingUi(false);
  }
  function playing() { return !!conductor; }

  /** Live genre/blend/invent swap: the two-bar crossfade (site-architecture §6). */
  function swapStyle() {
    refreshVectorPreview(); stateToUrl();
    if (!playing()) return;
    const { ctx } = ensureAudio();
    const old = conductor;
    const xfSec = Math.min(8, Math.max(2.4, XFADE_BARS * old.barSec));
    if (fading) { fading.fadeOutAndStop(0.8); fading = null; }
    fading = old;
    old.fadeOutAndStop(xfSec);
    conductor = makeConductor(ctx, ctx.currentTime + 0.05, state);
    conductor.fadeIn(xfSec);
    conductor.start();
    setTimeout(() => { if (fading === old) fading = null; }, (xfSec + 0.5) * 1000);
    setStatus('crossfading to ' + conductor.vector.name + '…');
  }

  /** A control changed live: route by its declared response speed. */
  function controlChanged(id) {
    stateToUrl();
    refreshVectorPreview();
    if (!playing()) return;
    const ctl = AM.style.CONTROL_BY_ID[id];
    conductor.applyControls(state);
    if (ctl && ctl.speed === 'replan') conductor.replan();
    if (fading) fading.applyControls(state);
  }

  // ------------------------------------------------------------------- UI ----
  const $ = (id) => doc.getElementById(id);
  function el(tag, attrs, children) {
    const e = doc.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of children) e.appendChild(c);
    return e;
  }

  function buildGenreButtons() {
    const wrap = $('genres');
    wrap.innerHTML = '';
    for (const pack of AM.styles.list()) {
      const btn = el('button', {
        class: 'genre', type: 'button', 'data-id': pack.id, title: pack.blurb || '',
        onclick: () => toggleGenre(pack.id),
      });
      btn.appendChild(el('span', { class: 'gname', text: pack.name }));
      wrap.appendChild(btn);
    }
    const inv = el('button', {
      class: 'genre invent', type: 'button', id: 'inventBtn', title: 'Sample a brand-new style: a seeded point in style space with a novelty budget and its own signatures (Intermediate/Advanced).',
      onclick: toggleInvent,
    });
    inv.appendChild(el('span', { class: 'gname', text: '✦ Invent a style' }));
    wrap.appendChild(inv);
    refreshGenreButtons();
  }
  function toggleGenre(id) {
    const s = state.sel;
    s.invent = false;
    if (s.a === id && !s.b) { refreshGenreButtons(); return; }       // must keep one
    if (s.a === id) { s.a = s.b; s.b = null; }
    else if (s.b === id) { s.b = null; }
    else if (!s.a) s.a = id;
    else if (!s.b) s.b = id;
    else { s.a = s.b; s.b = id; }                                     // oldest out
    refreshGenreButtons();
    swapStyle();
    stateToUrl();
  }
  function toggleInvent() {
    state.sel = state.sel.invent ? { a: 'classical', b: null, invent: false } : { a: null, b: null, invent: true };
    refreshGenreButtons();
    swapStyle();
    stateToUrl();
  }
  function refreshGenreButtons() {
    const wrap = $('genres');
    for (const btn of wrap.querySelectorAll('button.genre')) {
      const id = btn.getAttribute('data-id');
      if (btn.id === 'inventBtn') btn.classList.toggle('on', state.sel.invent);
      else btn.classList.toggle('on', state.sel.a === id || state.sel.b === id);
    }
    $('inventBtn').style.display = state.uiMode === 0 ? 'none' : '';
    if (state.uiMode === 0 && state.sel.invent) { state.sel = { a: 'classical', b: null, invent: false }; }
  }

  const GROUP_ORDER = ['Feel', 'Form', 'Sound', 'Time & feel', 'Pitch & harmony', 'Texture', 'Sound & space', 'Form & variation', 'Expression', 'Invented parameters'];
  function buildControls() {
    const startWrap = $('startControls'), intWrap = $('intControls'), advWrap = $('advControls');
    startWrap.innerHTML = ''; intWrap.innerHTML = ''; advWrap.innerHTML = '';
    const groups = {};
    for (const c of AM.style.CONTROLS) {
      const target = c.tier === 'start' ? startWrap : c.tier === 'int' ? intWrap : advWrap;
      let g = groups[c.tier + ':' + c.group];
      if (!g) {
        g = el('div', { class: 'ctlGroup' });
        if (c.tier !== 'start') g.appendChild(el('div', { class: 'ctlGroupName', text: c.group }));
        groups[c.tier + ':' + c.group] = g;
        target.appendChild(g);
      }
      g.appendChild(controlRow(c));
    }
  }
  function controlRow(c) {
    const row = el('div', { class: 'ctl', 'data-ctl': c.id });
    const lab = el('label', { text: c.label, title: c.gloss || c.hint || '' });
    row.appendChild(lab);
    let input;
    if (c.type === 'enum') {
      input = el('select', {
        onchange: () => { state.controls[c.id] = parseInt(input.value, 10); syncCtl(c.id); controlChanged(c.id); },
      });
      (c.values || []).forEach((v, i) => input.appendChild(el('option', { value: String(i), text: (c.labels || c.values)[i] })));
    } else {
      input = el('input', {
        type: 'range', min: '0', max: String((c.steps || 5) - 1), step: '1', value: '0',
        oninput: () => { state.controls[c.id] = parseInt(input.value, 10); syncCtl(c.id); controlChanged(c.id); },
      });
    }
    row.appendChild(input);
    const val = el('span', { class: 'ctlVal', text: '' });
    row.appendChild(val);
    const auto = el('button', {
      class: 'autoChip on', type: 'button', text: 'auto', title: 'auto = the seed decides. Click to un-pin this control.',
      onclick: () => { delete state.controls[c.id]; syncCtl(c.id); controlChanged(c.id); },
    });
    row.appendChild(auto);
    return row;
  }
  function fmtCtl(c, raw) {
    if (c.fmt) return c.fmt(raw);
    if (c.type === 'enum') return (c.labels || c.values)[raw];
    if (c.hint && c.hint.indexOf('↔') >= 0) {
      const [lo, hi] = c.hint.split('↔').map((s) => s.trim());
      const p = raw / ((c.steps || 5) - 1);
      return p < 0.25 ? lo : p > 0.75 ? hi : '·';
    }
    return String(raw);
  }
  function syncCtl(id) {
    const c = AM.style.CONTROL_BY_ID[id];
    const row = doc.querySelector('[data-ctl="' + id + '"]');
    if (!row) return;
    const pinned = state.controls[id] != null;
    row.classList.toggle('pinned', pinned);
    row.querySelector('.autoChip').classList.toggle('on', !pinned);
    const input = row.querySelector('input,select');
    const val = row.querySelector('.ctlVal');
    if (pinned) {
      input.value = String(state.controls[id]);
      val.textContent = fmtCtl(c, state.controls[id]);
    } else {
      val.textContent = '';
    }
  }
  function syncAllControls() { for (const c of AM.style.CONTROLS) syncCtl(c.id); }

  function setMode(m) {
    state.uiMode = m;
    for (let i = 0; i < 3; i++) $('mode' + i).classList.toggle('on', i === m);
    $('intControls').style.display = m >= 1 ? '' : 'none';
    $('advControls').style.display = m === 2 ? '' : 'none';
    refreshGenreButtons();
    stateToUrl();
  }

  function refreshVectorPreview() {
    // Show what the seed decided (the effective vector) so "auto" is legible.
    try {
      const v = buildVector();
      $('pieceName').textContent = v.name;
      $('pieceDetail').textContent =
        (v.free ? 'free time' : v.meter.id + ' · ' + Math.round(v.bpm) + ' BPM') +
        ' · ' + AM.theory.PC_NAMES_SHARP[v.tonicPc] + ' ' + v.scale.replace('naturalMinor', 'minor').replace('majorPentatonic', 'pentatonic') +
        ' · ' + v.harmonyType + ' · ' + describeLen(v.lengthSec) +
        (v.kind === 'meld' ? ' · meld: ' + v.meld.a + ' × ' + v.meld.b + ' (chassis ' + v.meld.chassis + ')' : '') +
        (v.kind === 'invented' ? ' · novelty: ' + (v.noveltyAxes || []).join(', ') : '');
      global.__vector = v; // inspectability (engine-architecture self-report rule)
    } catch (e) {
      $('pieceDetail').textContent = 'error: ' + e.message;
    }
  }
  function describeLen(sec) { return sec < 80 ? '~1 min' : sec < 200 ? '~' + Math.round(sec / 60) + ' min' : '~' + Math.round(sec / 60) + ' min'; }

  function setPlayingUi(on) {
    $('play').textContent = on ? '◼ Stop' : '▶ Play';
    $('play').classList.toggle('playing', on);
    if (!on) { $('nowlabel').textContent = 'stopped'; drawViz(null); }
  }
  function setStatus(t) { $('nowlabel').textContent = t; }

  function tickUi() {
    if (!conductor) return;
    const { ctx } = audio;
    const t = ctx.currentTime - conductor.startAt;
    if (ctx.currentTime > conductor.endAt) {
      stopAll();
      return;
    }
    if (t >= 0) {
      const units = conductor.timelineUnits;
      let cur = null;
      for (const u of units) if (t >= u.startSec && t < u.startSec + u.durSec) { cur = u; break; }
      const mm = Math.floor(t / 60), ss = ('0' + Math.floor(t % 60)).slice(-2);
      setStatus('playing ' + mm + ':' + ss + (cur ? ' · ' + cur.section + ' · bar ' + (cur.bar + 1) : '') + (fading ? ' · crossfade' : ''));
      drawViz(t);
    }
    raf = requestAnimationFrame(tickUi);
  }

  // piano-roll visualization (optional but valuable — engine-architecture UI rule)
  function drawViz(t) {
    const cv = $('viz');
    if (!cv) return;
    const ctx2 = cv.getContext('2d');
    const W = cv.width = cv.clientWidth * (global.devicePixelRatio || 1);
    const H = cv.height = 120 * (global.devicePixelRatio || 1);
    ctx2.clearRect(0, 0, W, H);
    if (t == null || !conductor) return;
    const evs = conductor.recentEvents;
    const span = 24; // seconds of window
    const t0 = t - span * 0.7;
    ctx2.globalAlpha = 1;
    for (const ev of evs) {
      if (ev.t + ev.durSec < t0 || ev.t > t0 + span) continue;
      const x = (ev.t - t0) / span * W;
      const w = Math.max(2, ev.durSec / span * W);
      const midi = ev.midi == null ? 45 : ev.midi;
      const y = H - ((midi - 24) / 78) * H;
      const played = ev.t <= t;
      ctx2.fillStyle = played ? 'rgba(154,140,255,0.85)' : 'rgba(154,140,255,0.35)';
      ctx2.fillRect(x, y - 2, w, 4);
    }
    const xNow = (t - t0) / span * W;
    ctx2.fillStyle = 'rgba(255,255,255,0.5)';
    ctx2.fillRect(xNow, 0, 1.5, H);
  }

  // feedback JSON (listening-tests-and-feedback.md affordance)
  function downloadFeedback() {
    const v = global.__vector || buildVector();
    const payload = {
      site: 'comprehensive-site', version: SITE_VERSION, when: new Date().toISOString(),
      url: location.href, seed: seedHex(state.seed), uiMode: state.uiMode,
      selection: state.sel, pinned: state.controls,
      effective: { name: v.name, strategy: v.strategy, bpm: Math.round(v.bpm), meter: v.meter.id, key: AM.theory.PC_NAMES_SHARP[v.tonicPc] + ' ' + v.scale, harmonyType: v.harmonyType, arc: v.arc, ending: v.ending },
      notes: $('fbNotes') ? $('fbNotes').value : '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'feedback-' + seedHex(state.seed) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ------------------------------------------------------- offline (dev) ----
  // The same pipeline, eagerly: compose all units, schedule into an
  // OfflineAudioContext, render. Used by _selftest.html + the render gate.
  function composeAll(st, capUnits) {
    const seedInt = st.seed >>> 0;
    const vec = AM.style.buildVector(seedInt, st.sel, st.controls);
    const composer = AM.compose.create(vec, seedInt);
    const perfRoot = new AM.rng.Rng(seedInt);
    const events = [];
    const units = [];
    let unitStart = 0;
    for (let i = 0; i < (capUnits || 300); i++) {
      const unit = composer.nextUnit(vec);
      if (!unit) break;
      const isRit = unit.last && (vec.ending === 'cadence' || vec.ending === 'ringout');
      const perf = AM.perform.realize(unit, vec, perfRoot.stream('perf:' + unit.unitIdx), { ritardando: isRit });
      for (const ev of perf.events) events.push(Object.assign({}, ev, { tSec: unitStart + ev.tSec }));
      units.push({ startSec: unitStart, durSec: perf.durSec, section: unit.section, bar: unit.bar, bars: unit.bars });
      unitStart += perf.durSec;
      if (unit.last) break;
    }
    return { vector: vec, events, units, musicSec: unitStart };
  }

  async function renderOffline(st, opts) {
    opts = opts || {};
    const sr = opts.sampleRate || 44100;
    const all = composeAll(st, opts.capUnits);
    const tail = 0.4 + (1.7 + all.vector.reverb * 3.4) * 0.8;
    const totalSec = Math.min(opts.maxSec || 400, all.musicSec + tail);
    const Ctor = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    const ctx = new Ctor(2, Math.ceil(totalSec * sr), sr);
    const fxRng = new AM.rng.Rng(st.seed >>> 0).stream('fx');
    const fade = ctx.createGain(); fade.gain.value = 1; fade.connect(ctx.destination);
    const chain = AM.fx.createMasterChain(ctx, {
      rand: () => fxRng.next(), out: fade,
      reverbAmount: 0.16 + all.vector.reverb * 0.36,
      reverbSeconds: 1.7 + all.vector.reverb * 3.4,
      returnLowpassHz: 3600 + all.vector.brightness * 1800,
      volume: volume,
    });
    chain.setTone((all.vector.brightness - 0.5) * 7);
    chain.setWidth(0.35 + all.vector.width * 0.95);
    if (all.vector.ending === 'fade') {
      const fadeLen = Math.min(7, Math.max(3, all.musicSec * 0.08));
      fade.gain.setValueAtTime(1, Math.max(0, all.musicSec - fadeLen));
      fade.gain.exponentialRampToValueAtTime(0.001, all.musicSec + tail * 0.5);
    }
    for (const ev of all.events) {
      if (ev.tSec > totalSec - 0.1) continue;
      AM.synth.play(ev.voice, ctx, chain.input(ev.voice), {
        freq: ev.freq, time: ev.tSec + 0.08, durSec: ev.durSec, vel: ev.vel, pan: ev.pan, expr: ev.expr, p: ev.p, tags: ev.tags,
      });
    }
    const buffer = await ctx.startRendering();
    return { buffer, info: all };
  }

  // ------------------------------------------------------------------ boot ----
  const SITE_VERSION = '0.1.0';
  function boot() {
    buildGenreButtons();
    buildControls();
    const had = stateFromUrl();
    if (!had) stateToUrl();
    syncAllControls();
    refreshGenreButtons();
    setMode(state.uiMode);
    $('seed').value = seedHex(state.seed);
    $('siteVersion').textContent = 'v' + SITE_VERSION;
    refreshVectorPreview();

    $('play').addEventListener('click', () => { if (playing()) stopAll(); else play(); });
    $('dice').addEventListener('click', () => {
      state.seed = newSeed();
      $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      if (playing()) play(); else refreshVectorPreview();
    });
    $('seed').addEventListener('change', () => {
      state.seed = parseSeed($('seed').value);
      $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      if (playing()) play();
    });
    $('copySeed').addEventListener('click', () => {
      try { navigator.clipboard.writeText(seedHex(state.seed)); setStatus('seed copied'); } catch (e) {}
    });
    $('copyLink').addEventListener('click', () => {
      try { navigator.clipboard.writeText(location.href); setStatus('link copied'); } catch (e) {}
    });
    $('volume').addEventListener('input', () => {
      volume = parseInt($('volume').value, 10) / 100;
      if (conductor) conductor.setVolume(volume);
    });
    for (let i = 0; i < 3; i++) $('mode' + i).addEventListener('click', () => setMode(i));
    $('fbDownload').addEventListener('click', downloadFeedback);
    global.addEventListener('hashchange', () => {
      if (stateFromUrl()) { syncAllControls(); refreshGenreButtons(); setMode(state.uiMode); $('seed').value = seedHex(state.seed); refreshVectorPreview(); }
    });
  }

  // exports (the dev harness + inspectability)
  global.AMApp = {
    state, play, stopAll, playing, buildVector, composeAll, renderOffline,
    seedHex, parseSeed, setMode, version: SITE_VERSION,
    get conductor() { return conductor; },
  };
  if (doc && doc.readyState !== 'loading') boot();
  else if (doc) doc.addEventListener('DOMContentLoaded', boot);
})(typeof self !== 'undefined' ? self : this);
