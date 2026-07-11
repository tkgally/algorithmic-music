/*
 * wav.test.js — the 16-bit PCM WAV encoder (docs/lib/wav.js). Pure, no browser:
 * feed AudioBuffer-shaped plain objects and check the RIFF/WAVE bytes.
 */
'use strict';
const { test, eq, ok } = require('./_runner');
const path = require('path');
const wav = require(path.resolve(__dirname, '../../docs/lib/wav.js'));

// A minimal AudioBuffer stand-in.
function buf(channels, sampleRate) {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0].length,
    getChannelData: (c) => channels[c],
  };
}
function str(bytes, at, n) {
  let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[at + i]); return s;
}
function u32(bytes, at) { return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0; }
function u16(bytes, at) { return bytes[at] | (bytes[at + 1] << 8); }
function i16(bytes, at) { const v = u16(bytes, at); return v >= 0x8000 ? v - 0x10000 : v; }

test('wav: sample quantization clamps and rounds (toInt16)', () => {
  eq(wav.toInt16(0), 0);
  eq(wav.toInt16(1), 32767);
  eq(wav.toInt16(-1), -32767);
  eq(wav.toInt16(2), 32767, 'over-range clamps to max');
  eq(wav.toInt16(-2), -32768, 'under-range clamps to min');
  eq(wav.toInt16(0.5), 16384, '0.5 -> round(16383.5) = 16384');
});

test('wav: header is a well-formed 16-bit PCM RIFF/WAVE', () => {
  const frames = 10, sr = 48000;
  const L = new Float32Array(frames), R = new Float32Array(frames);
  const bytes = wav.encodeWav(buf([L, R], sr));
  const blockAlign = 2 /*ch*/ * 2 /*bytes*/;
  const dataBytes = frames * blockAlign;
  eq(bytes.length, 44 + dataBytes, 'total file size = header + PCM');
  eq(str(bytes, 0, 4), 'RIFF');
  eq(u32(bytes, 4), 36 + dataBytes, 'RIFF chunk size');
  eq(str(bytes, 8, 4), 'WAVE');
  eq(str(bytes, 12, 4), 'fmt ');
  eq(u32(bytes, 16), 16, 'fmt chunk size (PCM)');
  eq(u16(bytes, 20), 1, 'audio format = PCM');
  eq(u16(bytes, 22), 2, 'channels');
  eq(u32(bytes, 24), sr, 'sample rate');
  eq(u32(bytes, 28), sr * blockAlign, 'byte rate');
  eq(u16(bytes, 32), blockAlign, 'block align');
  eq(u16(bytes, 34), 16, 'bits per sample');
  eq(str(bytes, 36, 4), 'data');
  eq(u32(bytes, 40), dataBytes, 'data chunk size');
});

test('wav: stereo samples interleave frame-major with correct values', () => {
  const L = new Float32Array([0, 1, -1, 0.5]);
  const R = new Float32Array([0, -1, 1, -0.5]);
  const bytes = wav.encodeWav(buf([L, R], 44100));
  // frame 0: L R, frame 1: L R, ...
  eq(i16(bytes, 44 + 0), 0);       // f0 L
  eq(i16(bytes, 44 + 2), 0);       // f0 R
  eq(i16(bytes, 44 + 4), 32767);   // f1 L (+1)
  eq(i16(bytes, 44 + 6), -32767);  // f1 R (-1)
  eq(i16(bytes, 44 + 8), -32767);  // f2 L (-1)
  eq(i16(bytes, 44 + 10), 32767);  // f2 R (+1)
  eq(i16(bytes, 44 + 12), 16384);  // f3 L (0.5 -> round(16383.5) = 16384)
  eq(i16(bytes, 44 + 14), -16383); // f3 R (-0.5 -> round(-16383.5) = -16383, ties toward +inf)
});

test('wav: mono buffer encodes with one channel', () => {
  const M = new Float32Array([0, 0, 0]);
  const bytes = wav.encodeWav(buf([M], 22050));
  eq(u16(bytes, 22), 1, 'channels = 1');
  eq(u32(bytes, 24), 22050, 'sample rate');
  eq(u16(bytes, 32), 2, 'block align = 1 ch * 2 bytes');
  eq(bytes.length, 44 + 3 * 2, 'size');
});

test('wav: silence produces all-zero PCM (valid keep-alive clip)', () => {
  const n = 128;
  const M = new Float32Array(n); // zeros
  const bytes = wav.encodeWav(buf([M], 8000));
  let allZero = true;
  for (let i = 44; i < bytes.length; i++) if (bytes[i] !== 0) { allZero = false; break; }
  ok(allZero, 'PCM region is silent');
  eq(bytes.length, 44 + n * 2);
});
