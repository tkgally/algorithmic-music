/*
 * serialize — the compact shareable-URL codec: (seed + selection + pinned
 * settings) <-> a versioned, bit-packed, base64url payload.
 *
 * Implements wiki/music-representation-and-notation.md's "practical bit-packed
 * base64url design" and the style-vector schema §8: a 6-bit version tag
 * selects a FROZEN field list (append-only versioning — never repurpose,
 * resize, or reorder a live version's fields; only add new versions), then a
 * 32-bit seed, the UI mode, the genre selection, a pin bitmask (one bit per
 * control in the version's frozen registry order), and only the PINNED
 * controls' values at their declared widths — auto fields cost nothing
 * because the seed re-derives them. RFC 4648 §5 base64url alphabet
 * (A-Z a-z 0-9 - _), no padding.
 *
 * With nothing pinned the payload is 14 characters; everything pinned ≈ 30 —
 * comfortably compact (the wiki page's ≈32-char estimate holds).
 *
 * The V1 layout is snapshotted HERE (ids + widths), independently of the live
 * control registry in style.js, so future registry growth cannot silently
 * shift a shipped URL's bit layout; a dev-time assert (site _selftest) checks
 * the snapshot still matches style.CONTROLS' prefix.
 *
 * Original first-party code (CC0). Dual-format (UMD-lite): window.AM.serialize
 * in the browser, require() in Node for headless tests.
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.serialize = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const B64REV = (function () { const m = {}; for (let i = 0; i < 64; i++) m[B64URL[i]] = i; return m; })();

  function BitWriter() {
    this.bits = [];
  }
  BitWriter.prototype.write = function (value, width) {
    value = value >>> 0;
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    return this;
  };
  BitWriter.prototype.toBase64url = function () {
    let out = '';
    for (let i = 0; i < this.bits.length; i += 6) {
      let v = 0;
      for (let j = 0; j < 6; j++) v = (v << 1) | (i + j < this.bits.length ? this.bits[i + j] : 0);
      out += B64URL[v];
    }
    return out;
  };
  function BitReader(str) {
    this.bits = [];
    for (const ch of str) {
      const v = B64REV[ch];
      if (v === undefined) throw new Error('serialize: bad character in payload');
      for (let j = 5; j >= 0; j--) this.bits.push((v >>> j) & 1);
    }
    this.at = 0;
  }
  BitReader.prototype.read = function (width) {
    let v = 0;
    for (let i = 0; i < width; i++) v = (v << 1) | (this.bits[this.at++] || 0);
    return v >>> 0;
  };

  // ---- V1 layout (FROZEN 2026-07-09 — append-only from here) --------------------
  // Order and widths mirror style.js CONTROLS as of v1. GENRE codes are the
  // pack `order` values 0-7; 8 = invented style; 15 = none (genreB only).
  const V1_CONTROLS = [
    ['energy', 3], ['mood', 3], ['length', 2], ['space', 3],
    ['tempo', 6], ['swing', 3], ['meter', 3], ['key', 4], ['mode', 3],
    ['harmRich', 3], ['harmMotion', 2], ['density', 3], ['layers', 3],
    ['leadProm', 3], ['melTex', 3], ['palette', 2], ['brightness', 3],
    ['width', 3], ['variation', 3], ['ending', 2], ['expression', 3],
    ['dynRange', 3],
    ['arc', 4], ['development', 3], ['timeline', 3], ['interlock', 3],
    ['blend', 3], ['novelty', 2], ['coherenceStrict', 3], ['sigEmph', 3],
  ];
  const GENRE_INVENTED = 8, GENRE_NONE = 15;

  /**
   * encode(state) -> base64url string.
   * state: { seed (uint32), uiMode (0|1|2), sel: { a: order|null, b: order|null,
   *          invent: bool }, controls: { [id]: raw uint } } — only set entries.
   */
  function encode(state) {
    const w = new BitWriter();
    w.write(1, 6);                        // version
    w.write(state.seed >>> 0, 32);
    w.write(state.uiMode & 3, 2);
    const a = state.sel && state.sel.invent ? GENRE_INVENTED
      : (state.sel && state.sel.a != null ? state.sel.a : 0);
    const b = state.sel && !state.sel.invent && state.sel.b != null ? state.sel.b : GENRE_NONE;
    w.write(a & 15, 4);
    w.write(b & 15, 4);
    const controls = state.controls || {};
    for (const [id] of V1_CONTROLS) w.write(controls[id] != null ? 1 : 0, 1);
    for (const [id, bits] of V1_CONTROLS) if (controls[id] != null) w.write(controls[id], bits);
    return w.toBase64url();
  }

  /** decode(str) -> state (same shape as encode's input) or null on failure. */
  function decode(str) {
    try {
      if (!str) return null;
      const r = new BitReader(String(str).trim());
      const version = r.read(6);
      if (version !== 1) return null;      // unknown version: fall back to defaults
      const seed = r.read(32) >>> 0;
      const uiMode = r.read(2);
      const a = r.read(4), b = r.read(4);
      const pinned = [];
      for (const [id, bits] of V1_CONTROLS) pinned.push(r.read(1));
      const controls = {};
      for (let i = 0; i < V1_CONTROLS.length; i++) {
        if (pinned[i]) controls[V1_CONTROLS[i][0]] = r.read(V1_CONTROLS[i][1]);
      }
      return {
        seed, uiMode,
        sel: {
          a: a === GENRE_INVENTED ? null : Math.min(a, 7),
          b: b === GENRE_NONE || a === GENRE_INVENTED ? null : Math.min(b, 7),
          invent: a === GENRE_INVENTED,
        },
        controls,
      };
    } catch (e) {
      return null;
    }
  }

  return { encode, decode, V1_CONTROLS, GENRE_INVENTED, GENRE_NONE, BitWriter, BitReader };
});
