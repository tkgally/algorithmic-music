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
  const CONT_GAP = 1.0;        // ~1 s gap between pieces in continuous play (Tom 2026-07-10)

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
  let continuous = false;  // continuous play: auto-advance to a new piece at end
  let bgMode = false;      // background mode: render to a file, play via <audio> (iOS lock-screen)
  const bg = { url: null, active: false, rendering: false, seq: 0 }; // background-playback state

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
        timelineUnits.push({ startSec: unitStart, durSec: perf.durSec, section: unit.section, bar: unit.bar, bars: unit.bars, name: vec.name });
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
      get musicEndAt() { return composedDone ? startAt + unitStart : Infinity; },
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
    bgStop();
    if (!silent) setPlayingUi(false);
  }
  function playing() { return !!conductor; }

  /** Continuous play: seamlessly begin the NEXT piece in the current style with a
   *  fresh seed. The outgoing piece keeps ringing its natural tail (reverb/release)
   *  while the new one starts, so there is no gap. Called at the current piece's
   *  music-end (see tickUi) and reused as a manual/test hook. */
  function advancePiece() {
    const { ctx } = ensureAudio();
    const old = conductor;
    if (fading) { fading.stop(); fading = null; }   // retire any prior tail first
    if (old) {
      fading = old;
      const tailLeft = old.endAt === Infinity ? 0.4 : Math.max(0.4, old.endAt - ctx.currentTime);
      setTimeout(() => { if (fading === old) { old.stop(); fading = null; } }, (tailLeft + 0.4) * 1000);
    }
    state.seed = newSeed();
    if ($('seed')) $('seed').value = seedHex(state.seed);
    stateToUrl();
    // ~1 s gap: the outgoing piece's tail rings out, then the next one begins.
    conductor = makeConductor(ctx, ctx.currentTime + CONT_GAP, state).start();
    refreshVectorPreview();
    setStatus('next piece in the current style…');
  }

  /** Reset: return every manually changed (pinned) control to auto. Keeps the
   *  current style and seed; the piece re-plans from here if playing. */
  function resetControls() {
    const had = Object.keys(state.controls).length > 0;
    state.controls = {};
    syncAllControls();
    refreshDynamicControls();
    stateToUrl();
    refreshVectorPreview();
    if (playing()) { conductor.applyControls(state); conductor.replan(); if (fading) { fading.applyControls(state); fading.replan(); } }
    setStatus(had ? 'settings reset to auto' : (playing() ? 'playing' : 'stopped'));
  }

  /** Live genre/blend/invent swap: the two-bar crossfade (site-architecture §6). */
  function swapStyle() {
    refreshVectorPreview(); stateToUrl();
    if (!playing()) { if (bg.active) playRendered(); return; }   // background mode: re-render the new style
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

  // ------------------------------------------- background / rendered playback ----
  // The live conductor above is pure Web Audio, which iOS suspends when the phone
  // screen locks (wiki/web-audio-fundamentals.md -> "Background and lock-screen
  // playback"). Background mode instead RENDERS the whole piece offline, encodes
  // it to a WAV blob (lib/wav.js), and plays it through a real <audio> element —
  // the one thing iOS keeps alive in the background, with lock-screen controls
  // via the Media Session API. Experimental proof-of-concept: it trades the live
  // no-restart setting changes for durability (a settings change re-renders).

  function bgEl() { return $('bgAudio'); }

  // Pre-rendered NEXT track for continuous background play. Rendering a piece
  // takes seconds (longer for longer pieces), which was an audible silent gap
  // between tracks. So while the current track plays, render the next one ahead
  // of time and hold it ready; the boundary hand-off is then near-instant. The
  // render runs off the main thread, so the playing <audio> is unaffected.
  let prepared = null;      // { seed, url, info } — the next track, ready to play
  let prepareToken = 0;     // bumped to invalidate an in-flight prepare render

  /** Render the current state to a 16-bit PCM WAV blob URL (same deterministic
   *  pipeline as live/offline). opts.capUnits bounds it for the dev/smoke hook. */
  async function renderToWavUrl(st, opts) {
    const { buffer, info } = await renderOffline(st, Object.assign({ sampleRate: 44100 }, opts || {}));
    const bytes = AM.wav.encodeWav(buffer);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    return { url, info, bytes: bytes.length };
  }

  // A tiny silent WAV, made once, used to "unlock" the <audio> element inside the
  // Play tap: iOS only starts media playback from a user gesture, but rendering
  // the real piece is async. Playing looping silence in-gesture claims the media
  // session so the later src-swap + play() is permitted once the render finishes.
  let SILENCE_URL = null;
  function silenceUrl() {
    if (SILENCE_URL) return SILENCE_URL;
    const sr = 8000, n = Math.round(sr * 0.05);
    const silent = { numberOfChannels: 1, sampleRate: sr, length: n, getChannelData: () => new Float32Array(n) };
    SILENCE_URL = URL.createObjectURL(new Blob([AM.wav.encodeWav(silent)], { type: 'audio/wav' }));
    return SILENCE_URL;
  }
  function revokeBgUrl() { if (bg.url) { try { URL.revokeObjectURL(bg.url); } catch (e) {} bg.url = null; } }
  function discardPrepared() {
    prepareToken++;   // invalidate any in-flight prepare render
    if (prepared) { try { URL.revokeObjectURL(prepared.url); } catch (e) {} prepared = null; }
  }

  function bgNowPlaying(info) {
    const secs = Math.round((info && info.musicSec) || 0);
    setStatus('playing (background) · ' + Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2) +
      (continuous ? ' · continuous' : '') + ' — keeps playing with the screen locked');
  }

  /** The <audio> reached the end of a track. */
  function onBgEnded() {
    if (!bg.active) return;
    if (continuous) advanceRendered();
    else { bgStop(); setPlayingUi(false); }
  }

  /** Play a ready rendered track on the (already user-activated) element and
   *  wire the ended handler + Media Session. */
  function startTrack(el, item) {
    revokeBgUrl();                     // release the track that just finished
    bg.url = item.url;
    el.loop = false;
    el.onended = onBgEnded;
    el.src = item.url;
    try { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    bgNowPlaying(item.info);
    setupMediaSession(item.info);
  }

  /** Pre-render the NEXT continuous track (new seed, current style) while the
   *  current one plays, so the hand-off has no render gap. Superseded prepares
   *  (a newer prepare, a stop, or a style/seed change) discard themselves. */
  async function prepareNext() {
    if (!bg.active || !continuous) return;
    const myToken = ++prepareToken;
    const sessionSeq = bg.seq;
    const seed = newSeed() >>> 0;
    let out;
    try { out = await renderToWavUrl({ seed, sel: state.sel, controls: state.controls }); }
    catch (e) { return; }
    if (myToken !== prepareToken || sessionSeq !== bg.seq || !bg.active) {
      try { URL.revokeObjectURL(out.url); } catch (e) {}   // superseded → drop it
      return;
    }
    if (prepared) { try { URL.revokeObjectURL(prepared.url); } catch (e) {} }
    prepared = { seed, url: out.url, info: out.info };
  }

  /** Background-mode Play: render this piece to a file and play it through <audio>. */
  async function playRendered() {
    stopAll(true);                     // tear down any live conductor + prior bg audio
    const el = bgEl();
    if (!el || !AM.wav) { setStatus('background mode unavailable'); return; }
    const mySeq = ++bg.seq;            // guards against overlapping/superseded renders
    bg.active = true; bg.rendering = true;
    setPlayingUi(true);
    // 1) unlock the element inside the gesture with looping silence
    try { el.loop = true; el.src = silenceUrl(); const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    setStatus('composing this piece to a file… (background mode)');
    // 2) render + encode the real piece
    let out;
    try { out = await renderToWavUrl(state); }
    catch (e) { if (mySeq === bg.seq) { setStatus('render failed: ' + e.message); bgStop(); setPlayingUi(false); } return; }
    if (mySeq !== bg.seq || !bg.active) { try { URL.revokeObjectURL(out.url); } catch (e) {} return; } // superseded
    // 3) swap the rendered file in and play it (element already user-activated)
    bg.rendering = false;
    startTrack(el, out);
    prepareNext();                     // start rendering the next track ahead of time
  }

  /** Continuous / "next track": use the pre-rendered next track if it's ready
   *  (near-instant, no gap), else fall back to rendering on demand. */
  function advanceRendered() {
    const el = bgEl();
    if (prepared && prepared.url && el) {
      const nx = prepared; prepared = null;
      state.seed = nx.seed;
      if ($('seed')) $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      startTrack(el, nx);
      prepareNext();                   // render the track after this one
    } else {
      // not ready yet (render slower than the track, or the first transition):
      // render on demand — a brief gap, then continuous is caught up.
      state.seed = newSeed();
      if ($('seed')) $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      playRendered();
    }
  }

  /** Stop background playback and release the file(s) + media session. */
  function bgStop() {
    bg.seq++;                          // invalidate any in-flight render
    bg.active = false; bg.rendering = false;
    discardPrepared();                 // drop the pre-rendered next track too
    const el = bgEl();
    if (el) { try { el.pause(); } catch (e) {} el.onended = null; el.loop = false; try { el.removeAttribute('src'); el.load(); } catch (e) {} }
    revokeBgUrl();
    clearMediaSession();
  }

  // Media Session: the lock-screen "now playing" card + transport controls.
  function bgArtwork(v) {
    try {
      const c = doc.createElement('canvas'); c.width = c.height = 256;
      const g2 = c.getContext('2d');
      g2.fillStyle = '#12101c'; g2.fillRect(0, 0, 256, 256);
      g2.fillStyle = '#9a8cff'; g2.font = '600 30px system-ui, sans-serif';
      g2.fillText('algorithmic', 22, 118); g2.fillText('music', 22, 156);
      g2.fillStyle = '#ff6056'; g2.fillRect(22, 182, 212, 5);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }
  function setupMediaSession(info) {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      const v = info && info.vector;
      if (typeof MediaMetadata !== 'undefined') {
        const art = bgArtwork(v);
        ms.metadata = new MediaMetadata({
          title: (v && v.name) || 'algorithmic-music',
          artist: 'algorithmic-music · seed ' + seedHex(state.seed),
          album: 'composed in your browser',
          artwork: art ? [{ src: art, sizes: '256x256', type: 'image/png' }] : [],
        });
      }
      const set = (a, fn) => { try { ms.setActionHandler(a, fn); } catch (e) {} };
      set('play', () => { const el = bgEl(); if (el) el.play(); ms.playbackState = 'playing'; });
      set('pause', () => { const el = bgEl(); if (el) el.pause(); ms.playbackState = 'paused'; });
      set('nexttrack', () => advanceRendered());
      set('previoustrack', () => playRendered());       // restart the current piece
      ms.playbackState = 'playing';
    } catch (e) {}
  }
  function clearMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.metadata = null;
      for (const a of ['play', 'pause', 'nexttrack', 'previoustrack']) { try { ms.setActionHandler(a, null); } catch (e) {} }
      ms.playbackState = 'none';
    } catch (e) {}
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

  // Styles withdrawn from the picker (Tom 2026-07-11: Jazz doesn't yet earn its
  // place — "does not sound at all like jazz"). The pack stays REGISTERED: pack
  // order is the URL genre enum, so old jazz links and melds still decode and
  // play; only the button is gone. Revisit note: wiki/findings-comprehensive-site.md.
  const HIDDEN_STYLES = { jazz: 1 };
  function buildGenreButtons() {
    const wrap = $('genres');
    wrap.innerHTML = '';
    for (const pack of AM.styles.list()) {
      if (HIDDEN_STYLES[pack.id]) continue;
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
    // single-select: exactly one style at a time (radio semantics). Clicking the
    // current sole selection is a no-op; clicking another switches to it.
    if (s.a === id && !s.b && !s.invent) { refreshGenreButtons(); return; }
    s.invent = false;
    s.a = id; s.b = null;
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
    // Invent a style is available in every mode (Tom 2026-07-10 — added to Basic).
    $('inventBtn').style.display = '';
  }

  const GROUP_ORDER = ['Feel', 'Form', 'Sound', 'Time & feel', 'Pitch & harmony', 'Texture', 'Sound & space', 'Form & variation', 'Expression', 'Invented parameters'];
  function buildControls() {
    const basicWrap = $('basicControls'), intWrap = $('intControls'), advWrap = $('advControls');
    basicWrap.innerHTML = ''; intWrap.innerHTML = ''; advWrap.innerHTML = '';
    const groups = {};
    for (const c of AM.style.CONTROLS) {
      const target = c.tier === 'basic' ? basicWrap : c.tier === 'int' ? intWrap : advWrap;
      let g = groups[c.tier + ':' + c.group];
      if (!g) {
        g = el('div', { class: 'ctlGroup' });
        if (c.tier !== 'basic') g.appendChild(el('div', { class: 'ctlGroupName', text: c.group }));
        groups[c.tier + ':' + c.group] = g;
        target.appendChild(g);
      }
      g.appendChild(controlRow(c));
    }
  }
  function controlRow(c) {
    // checkset (Advanced "Instruments"): a full-width grid of instrument checkboxes.
    if (c.type === 'checkset') return checksetRow(c);
    const row = el('div', { class: 'ctl', 'data-ctl': c.id });
    const lab = el('label', { text: c.label, title: c.gloss || c.hint || '' });
    row.appendChild(lab);
    let input;
    if (c.type === 'enum') {
      input = el('select', {
        class: 'placeheld',
        onchange: () => {
          // Selecting the "choose…" placeholder (value "") returns to auto.
          if (input.value === '') delete state.controls[c.id];
          else state.controls[c.id] = parseInt(input.value, 10);
          syncCtl(c.id); controlChanged(c.id);
        },
      });
      // Placeholder shown while the control is on auto — the seed decides, so no
      // concrete value is displayed until the user pins one (styled italic).
      input.appendChild(el('option', { value: '', text: 'choose…' }));
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
  function checksetRow(c) {
    const row = el('div', { class: 'ctl ctlCheckset', 'data-ctl': c.id });
    const head = el('div', { class: 'checksetHead' });
    head.appendChild(el('label', { text: c.label, title: c.gloss || '' }));
    const auto = el('button', {
      class: 'autoChip on', type: 'button', text: 'auto', title: 'auto = the seed decides the ensemble. Click to un-pin.',
      onclick: () => { delete state.controls[c.id]; syncCtl(c.id); controlChanged(c.id); },
    });
    head.appendChild(auto);
    row.appendChild(head);
    // (The "check to add / uncheck to remove" explanation now lives on the About
    //  page, not inline here; c.gloss remains as the label's hover tooltip.)
    const grid = el('div', { class: 'checkset' });
    const groups = {};
    (c.options || []).forEach((opt, i) => {
      let g = groups[opt.group];
      if (!g) {
        g = el('div', { class: 'checksetGroup' });
        g.appendChild(el('div', { class: 'checksetGroupName', text: opt.group }));
        groups[opt.group] = g;
        grid.appendChild(g);
      }
      const item = el('label', { class: 'checkItem', title: opt.voice });
      const cb = el('input', { type: 'checkbox', 'data-voice': opt.voice, 'data-idx': String(i),
        onchange: () => onChecksetToggle(c) });
      item.appendChild(cb);
      item.appendChild(el('span', { text: opt.label }));
      g.appendChild(item);
    });
    row.appendChild(grid);
    return row;
  }
  function onChecksetToggle(c) {
    const row = doc.querySelector('[data-ctl="' + c.id + '"]');
    let mask = 0;
    row.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      if (cb.checked) mask |= (1 << parseInt(cb.getAttribute('data-idx'), 10));
    });
    if (mask === 0) delete state.controls[c.id];   // unchecking all = back to auto
    else state.controls[c.id] = mask >>> 0;
    syncCtl(c.id);
    controlChanged(c.id);
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
    if (c.type === 'checkset') {
      // Reflect the CURRENT composition's instruments (accounts for the pin,
      // since buildVector applies the mask): checked == in the effective ensemble.
      let active = new Set();
      try { active = new Set(AM.style.effectiveEnsemble(buildVector()).map((e) => e.voice)); } catch (e) {}
      row.querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.checked = active.has(cb.getAttribute('data-voice')); });
      return;
    }
    const input = row.querySelector('input,select');
    const val = row.querySelector('.ctlVal');
    const isSelect = input.tagName === 'SELECT';
    if (pinned) {
      input.value = String(state.controls[id]);
      if (isSelect) input.classList.remove('placeheld');
      val.textContent = fmtCtl(c, state.controls[id]);
    } else {
      // Auto: a dropdown shows the italic "choose…" placeholder (value "");
      // a slider returns to its rest position (thumb far left, no accent fill),
      // matching the initial open state so nothing reads as manually set.
      if (isSelect) { input.value = ''; input.classList.add('placeheld'); }
      else input.value = '0';
      val.textContent = '';
    }
  }
  function syncAllControls() { for (const c of AM.style.CONTROLS) syncCtl(c.id); }

  function setMode(m) {
    state.uiMode = m;
    for (let i = 0; i < 3; i++) $('mode' + i).classList.toggle('on', i === m);
    $('intControls').style.display = m >= 1 ? '' : 'none';
    $('advControls').style.display = m === 2 ? '' : 'none';
    // Advanced replaces the palette dropdown with the Instruments checkboxes.
    const palRow = doc.querySelector('[data-ctl="palette"]');
    if (palRow) palRow.style.display = m === 2 ? 'none' : '';
    refreshGenreButtons();
    refreshDynamicControls();
    stateToUrl();
  }

  /** Update the controls whose options depend on the current style/piece: the
   *  palette dropdown (real names + descriptions) and the instrument checkboxes. */
  function refreshDynamicControls(v) {
    try { v = v || buildVector(); } catch (e) { v = null; }
    const palRow = doc.querySelector('[data-ctl="palette"]');
    if (palRow && v && v.palettes) {
      const sel = palRow.querySelector('select');
      if (sel) {
        const pinned = state.controls.palette != null;
        sel.innerHTML = '';
        sel.appendChild(el('option', { value: '', text: 'choose…' }));
        v.palettes.forEach((pal, i) => {
          sel.appendChild(el('option', { value: String(i), text: pal.name + (pal.desc ? ' — ' + pal.desc : '') }));
        });
        // On auto the palette shows the "choose…" placeholder; a pin shows the set.
        if (pinned) { sel.value = String(Math.min(state.controls.palette, v.palettes.length - 1)); sel.classList.remove('placeheld'); }
        else { sel.value = ''; sel.classList.add('placeheld'); }
      }
    }
    syncCtl('instruments');
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
        (v.kind === 'invented' ? ' · ' + (TEXTURE_WORD[(v.kernel || {}).texture] || 'invented') + ' · novelty: ' + ((v.noveltyAxes || []).join(', ') || 'none') : '');
      global.__vector = v; // inspectability (engine-architecture self-report rule)
      refreshDynamicControls(v);
      renderStructure(v);
    } catch (e) {
      $('pieceDetail').textContent = 'error: ' + e.message;
    }
  }
  function describeLen(sec) { return sec < 80 ? '~1 min' : sec < 200 ? '~' + Math.round(sec / 60) + ' min' : '~' + Math.round(sec / 60) + ' min'; }

  function setPlayingUi(on) {
    $('play').textContent = on ? '◼ Stop' : '▶ Play';
    $('play').classList.toggle('playing', on);
    if (!on) { $('nowlabel').textContent = 'stopped'; drawViz(null); if ($('structSections')) $('structSections').innerHTML = ''; }
  }
  function setStatus(t) { $('nowlabel').textContent = t; }

  function tickUi() {
    if (!conductor) return;
    const { ctx } = audio;
    const t = ctx.currentTime - conductor.startAt;
    // continuous play: the moment the composed music ends, start the next piece
    // (the old one's tail overlaps → gapless). Gated on musicEndAt, so it fires
    // once per piece; the fresh conductor's musicEndAt is Infinity until it too finishes.
    if (continuous && conductor.done && ctx.currentTime >= conductor.musicEndAt) {
      advancePiece();
      raf = requestAnimationFrame(tickUi);
      return;
    }
    if (ctx.currentTime > conductor.endAt) {
      stopAll();
      return;
    }
    if (t >= 0) {
      const units = conductor.timelineUnits;
      let cur = null;
      for (const u of units) if (t >= u.startSec && t < u.startSec + u.durSec) { cur = u; break; }
      const mm = Math.floor(t / 60), ss = ('0' + Math.floor(t % 60)).slice(-2);
      // section name is shown in the chips line below (renderSections), so keep
      // this line to just the transport clock + bar number (no duplicate section).
      setStatus('playing ' + mm + ':' + ss + (cur ? ' · bar ' + (cur.bar + 1) : '') + (fading ? ' · crossfade' : ''));
      drawViz(t);
      renderSections(t);
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
    const t0 = t - span * 0.5; // playhead centered in the window (Tom 2026-07-10)
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
    // playhead: centered, wider, high-contrast (a coral line reads on both themes)
    const dpr = global.devicePixelRatio || 1;
    const lw = 3 * dpr;
    const xNow = (t - t0) / span * W;
    ctx2.fillStyle = 'rgba(255,96,86,0.28)';
    ctx2.fillRect(xNow - lw * 1.5, 0, lw * 3, H); // soft halo
    ctx2.fillStyle = 'rgba(255,72,64,0.98)';
    ctx2.fillRect(xNow - lw / 2, 0, lw, H);        // crisp center line
  }

  // ---- structure window ("what this piece is doing", generalized) ----------
  const INSTR_LABEL = (function () {
    const m = {};
    for (const mi of (AM.style.MASTER_INSTRUMENTS || [])) m[mi.voice] = mi.label;
    // voices outside the checkbox master list still get friendly names here
    Object.assign(m, { keys: 'Piano / keys', strings: 'Strings', tex: 'Texture pad', boom: 'Low drum', gong: 'Gong', scrape: 'Scraper', friction: 'Friction drum' });
    return m;
  })();
  function instrLabel(voice) { return INSTR_LABEL[voice] || voice; }
  function roleWord(role) {
    return ({ lead: 'lead', comp: 'chords', counter: 'counter-line', pad: 'pad', tex: 'texture', bass: 'bass', drone: 'drone',
      kick: 'drums', snare: 'drums', hat: 'drums', perc1: 'percussion', perc2: 'percussion', timeline: 'timeline', boom: 'low drum', high: 'percussion' })[role] || role;
  }
  function prettyScale(s) {
    return String(s || '').replace('naturalMinor', 'minor').replace('majorPentatonic', 'major pentatonic')
      .replace('minorPentatonic', 'minor pentatonic').replace('wholeTone', 'whole-tone').replace('inScale', 'custom scale');
  }
  function prettyArc(arc) {
    const c = AM.style.CONTROL_BY_ID.arc; const i = (c.values || []).indexOf(arc);
    return i >= 0 ? c.labels[i] : String(arc || '');
  }
  const HARM_WORD = { functional: 'goal-directed harmony', modal: 'modal / static harmony', loop: 'a looping vamp', drone: 'a drone' };
  const END_WORD = { cadence: 'a resolved cadence', fade: 'a fade-out', stop: 'a hard stop', ringout: 'a ring-out' };
  // invented-style kernel words (docs/lib/invent.js: the per-seed engine)
  const TEXTURE_WORD = {
    melodyAccomp: 'a tune over accompaniment', ostinatoWeb: 'a web of repeating patterns',
    callResponse: 'call and response', strata: 'layered strata (slow to fast)',
    canon: 'a round — the lead echoed', hocket: 'two voices interlocking one line',
    chorale: 'chords moving together', tintinnabuli: 'a bell-voice shadowing the melody',
  };
  const RHYTHM_WORD = {
    flow: 'flowing phrase rhythm', cell: 'one rhythmic cell everywhere',
    timeline: 'a repeating timeline pattern', groove: 'a groove with a backbeat',
  };
  function sigWord(s) {
    if (!s) return '';
    if (s.type === 'intervalCell') return 'a recurring melodic cell';
    if (s.type === 'rhythmMotto') return 'a recurring rhythmic motto';
    if (s.type === 'echoTail') return 'lead notes answered by a soft echo';
    if (s.type === 'voicingHabit') return 'a signature chord voicing (' + (s.habit || '') + ')';
    if (s.type === 'cadenceDrop') return 'phrases falling to a resting tone';
    return '';
  }
  function renderStructure(v) {
    const box = $('structDesc');
    if (!box) return;
    if (!v) { box.innerHTML = ''; return; }
    const key = AM.theory.PC_NAMES_SHARP[v.tonicPc] + ' ' + prettyScale(v.scale);
    const time = v.free ? 'free time' : (v.meter.id + ' · ' + Math.round(v.bpm) + ' BPM');
    const harm = HARM_WORD[v.harmonyType] || v.harmonyType;
    const arc = prettyArc(v.arc);
    const ending = END_WORD[v.ending] || v.ending;
    const mins = Math.max(1, Math.round((v.lengthSec || 120) / 60 * 10) / 10);
    const K = v.kernel || {};
    const head = v.kind === 'meld'
      ? '<b>Meld:</b> ' + v.meld.a + ' × ' + v.meld.b + ' <span class="muted">(rhythm from ' + v.meld.chassis + ', harmony from the other)</span>. '
      : v.kind === 'invented'
        ? '<b>' + v.name + '</b> <span class="muted">— an invented style with its own engine: '
          + (TEXTURE_WORD[K.texture] || 'melody and accompaniment') + '; '
          + (RHYTHM_WORD[K.rhythmMode] || 'flowing rhythm')
          + (K.rhythmMode === 'cell' && K.cell ? ' (' + K.cell.a + ':' + K.cell.b + ')' : '')
          + (K.gamut && K.gamut.length < 7 ? '; a ' + K.gamut.length + '-tone melodic gamut' : '')
          + '. Novelty in: ' + ((v.noveltyAxes || []).join(', ') || 'none') + '.</span> '
        : '<b>' + v.name + '.</b> ';
    let ens = [];
    try { ens = AM.style.effectiveEnsemble(v); } catch (e) {}
    const seen = {};
    const ensLine = ens.map((e) => {
      const rw = roleWord(e.role); const key2 = e.voice + '|' + rw;
      if (seen[key2]) return null; seen[key2] = 1;
      return instrLabel(e.voice) + (rw ? ' <span class="muted">(' + rw + ')</span>' : '');
    }).filter(Boolean).join(' · ');
    box.innerHTML =
      '<p class="structHead">' + head + '<span class="muted">' + key + ' · ' + time + ' · ' + harm + ' · ' + arc + ' arc → ' + ending + ' · ~' + mins + ' min</span></p>' +
      '<p class="structEns"><span class="muted">Instruments:</span> ' + (ensLine || '—') + '</p>';
    const listen = $('structListen');
    if (listen) {
      const sigs = (v.signatures || []).map(sigWord).filter(Boolean);
      listen.innerHTML = (sigs.length && (v.sigEmph == null || v.sigEmph > 0.05)) ? '<span class="muted">Listen for:</span> ' + sigs.join('; ') + '.' : '';
    }
  }
  function renderSections(t) {
    const box = $('structSections');
    if (!box || !conductor) return;
    const units = conductor.timelineUnits || [];
    const groups = [];
    for (const u of units) {
      const last = groups[groups.length - 1];
      if (last && last.section === u.section) { last.endSec = u.startSec + u.durSec; last.bars += (u.bars || 1); }
      else groups.push({ section: u.section, startSec: u.startSec, endSec: u.startSec + u.durSec, bars: (u.bars || 1) });
    }
    box.innerHTML = groups.map((g) => {
      const cur = t >= g.startSec && t < g.endSec;
      return '<span class="secChip' + (cur ? ' cur' : '') + '" title="' + g.bars + ' bars">' + g.section + '</span>';
    }).join('<span class="secArrow">›</span>');
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
    // A rendered file plays STANDALONE (background mode), so give the reverb room
    // to ring out to near-silence before the file ends — otherwise the boundary
    // lands mid-tail and sounds truncated (the live engine masks this by
    // overlapping the next piece; a file has nothing after it).
    const tail = 0.6 + (1.7 + all.vector.reverb * 3.4) * 1.1;
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
    } else {
      // Non-fade endings (cadence/stop/ringout): the last notes + reverb ring out
      // over the tail, then a short safety fade to silence at the very end so the
      // rendered file never stops on an abrupt CUT. This only shapes the final
      // ~0.8 s once the music has essentially ended — it does not soften a
      // composed cadence, it just guarantees a clean file boundary. Live playback
      // does not use renderOffline, so it is unaffected.
      const fadeStart = Math.max(all.musicSec, totalSec - 0.8);
      fade.gain.setValueAtTime(1, fadeStart);
      fade.gain.exponentialRampToValueAtTime(0.0008, totalSec - 0.02);
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
  const SITE_VERSION = '1.1.0';
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

    $('play').addEventListener('click', () => {
      if (playing() || bg.active) stopAll();
      else if (bgMode) playRendered();
      else play();
    });
    $('dice').addEventListener('click', () => {
      state.seed = newSeed();
      $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      if (playing()) play(); else if (bg.active) playRendered(); else refreshVectorPreview();
    });
    $('loop').addEventListener('click', () => {
      continuous = !continuous;
      $('loop').classList.toggle('on', continuous);
      $('loop').setAttribute('aria-pressed', continuous ? 'true' : 'false');
      // background mode: pre-render the next track when continuous turns on, or
      // drop the prepared one when it turns off.
      if (bg.active) { if (continuous) prepareNext(); else discardPrepared(); }
      if (!playing() && !bg.active) setStatus(continuous ? 'continuous play — press play' : 'stopped');
    });
    $('reset').addEventListener('click', resetControls);
    // Background mode toggle (experimental, for iPhone/iPad lock-screen playback).
    $('bgmode').addEventListener('click', () => {
      bgMode = !bgMode;
      $('bgmode').classList.toggle('on', bgMode);
      $('bgmode').setAttribute('aria-pressed', bgMode ? 'true' : 'false');
      if (bgMode) {
        if (playing()) playRendered();   // hand off the live piece to a rendered file
        else setStatus('background mode ON — Play renders this piece to a file so it keeps playing when the screen locks (experimental)');
      } else {
        if (bg.active) play();           // hand back to the live engine
        else setStatus(playing() ? 'playing' : 'stopped');
      }
    });
    $('seed').addEventListener('change', () => {
      state.seed = parseSeed($('seed').value);
      $('seed').value = seedHex(state.seed);
      stateToUrl(); refreshVectorPreview();
      if (playing()) play(); else if (bg.active) playRendered();
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
    // Feedback capture stays in the code but is no longer surfaced on the player
    // page (the #fbDownload/#fbNotes elements were removed from index.html), so
    // wire it only if present.
    if ($('fbDownload')) $('fbDownload').addEventListener('click', downloadFeedback);
    global.addEventListener('hashchange', () => {
      if (stateFromUrl()) { syncAllControls(); refreshGenreButtons(); setMode(state.uiMode); $('seed').value = seedHex(state.seed); refreshVectorPreview(); }
    });
  }

  // exports (the dev harness + inspectability)
  global.AMApp = {
    state, play, stopAll, playing, advancePiece, resetControls, buildVector, composeAll, renderOffline,
    seedHex, parseSeed, setMode, version: SITE_VERSION,
    playRendered,
    // dev/smoke hook: render the current state to a WAV blob, bounded by capUnits
    // so the encoder + blob path can be exercised fast (a full render is slow).
    async renderWavURL(opts) { const r = await renderToWavUrl(state, opts); return { url: r.url, bytes: r.bytes, musicSec: r.info.musicSec }; },
    get continuous() { return continuous; },
    set continuous(v) { continuous = !!v; if (doc && $('loop')) { $('loop').classList.toggle('on', continuous); $('loop').setAttribute('aria-pressed', continuous ? 'true' : 'false'); } },
    get bgMode() { return bgMode; },
    set bgMode(v) { bgMode = !!v; if (doc && $('bgmode')) { $('bgmode').classList.toggle('on', bgMode); $('bgmode').setAttribute('aria-pressed', bgMode ? 'true' : 'false'); } },
    get bgActive() { return bg.active; },
    get bgPrepared() { return !!(prepared && prepared.url); },   // dev/smoke: next track pre-rendered?
    bgAdvance() { advanceRendered(); },                          // dev/smoke: trigger a continuous hand-off
    get conductor() { return conductor; },
  };
  if (doc && doc.readyState !== 'loading') boot();
  else if (doc) doc.addEventListener('DOMContentLoaded', boot);
})(typeof self !== 'undefined' ? self : this);
