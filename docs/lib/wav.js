/*
 * wav — encode a rendered audio buffer to a 16-bit PCM WAV (RIFF/WAVE) file.
 *
 * Part of the algorithmic-music project's first-party shared-library foundation
 * (see wiki/shared-libraries.md). Original code implementing the published,
 * public RIFF/WAVE container format (Microsoft/IBM Multimedia Programming
 * Interface, 1991) — a format, not another project's code.
 *
 * Why WAV, and why in-house: the site renders a whole piece offline into an
 * AudioBuffer (docs/app.js renderOffline / _selftest.html). To let iOS Safari
 * keep audio playing with the screen locked, that buffer has to become a file an
 * <audio> element can play (wiki/web-audio-fundamentals.md -> "Background and
 * lock-screen playback"). The browser has no built-in PCM->file encoder, and the
 * only compressed formats iOS accepts (MP3/AAC) would need a vendored WASM
 * encoder — against the project's dependency-free rule. WAV is the one format
 * we can write in a few lines of vanilla JS with no dependency and no build step,
 * and it plays on every iOS version. The cost is size (~172 KB/s at 16-bit
 * stereo 44.1 kHz, so ~16 MB per 90 s), which is fine for the transient,
 * in-memory, one-piece-at-a-time use here.
 *
 * Dual-format (UMD-lite), same rationale as rng.js/transport.js:
 *   - Node/dev:  const { encodeWav } = require('./wav.js');
 *   - Browser:   <script src="wav.js"></script> -> window.AM.wav.encodeWav
 */
;(function (global, factory) {
  'use strict';
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { global.AM = global.AM || {}; global.AM.wav = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Float sample in [-1, 1] -> signed 16-bit int, clamped and rounded. The
  // 32767 scale for both signs is the standard, simplest mapping (the -32768
  // slot goes unused; the asymmetry is one LSB, inaudible). Values outside
  // [-1, 1] would wrap without the clamp — a hard limiter is the honest choice.
  function toInt16(x) {
    let s = Math.round(x * 32767);
    if (s > 32767) s = 32767; else if (s < -32768) s = -32768;
    return s;
  }

  /**
   * Encode an AudioBuffer-like object to a complete 16-bit PCM WAV file.
   *
   * Accepts anything exposing { numberOfChannels, sampleRate, length,
   * getChannelData(ch) -> Float32Array } — a real browser AudioBuffer, or a
   * plain object in Node tests. Channels are interleaved (frame-major), the
   * canonical 44-byte header is written, and no dithering is applied (the
   * material is synthetic and the file is transient). Returns a Uint8Array
   * holding the whole .wav; wrap it in a Blob for the browser.
   */
  function encodeWav(buffer) {
    const numCh = Math.max(1, buffer.numberOfChannels | 0);
    const sr = buffer.sampleRate | 0;
    const frames = buffer.length | 0;
    const bytesPerSample = 2;
    const blockAlign = numCh * bytesPerSample;
    const dataBytes = frames * blockAlign;
    const out = new ArrayBuffer(44 + dataBytes);
    const dv = new DataView(out);

    let p = 0;
    const u32 = (v) => { dv.setUint32(p, v >>> 0, true); p += 4; };
    const u16 = (v) => { dv.setUint16(p, v & 0xffff, true); p += 2; };
    const tag = (s) => { for (let i = 0; i < s.length; i++) dv.setUint8(p++, s.charCodeAt(i)); };

    // RIFF chunk descriptor
    tag('RIFF'); u32(36 + dataBytes); tag('WAVE');
    // fmt sub-chunk (PCM)
    tag('fmt '); u32(16); u16(1); u16(numCh); u32(sr); u32(sr * blockAlign); u16(blockAlign); u16(16);
    // data sub-chunk
    tag('data'); u32(dataBytes);

    // interleave channel samples, frame by frame
    const chans = [];
    for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
    let off = 44;
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < numCh; c++) {
        dv.setInt16(off, toInt16(chans[c][i] || 0), true);
        off += 2;
      }
    }
    return new Uint8Array(out);
  }

  return { encodeWav, toInt16 };
});
