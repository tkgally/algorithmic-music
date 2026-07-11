#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-invent-quick.mjs — a BOUNDED offline audio gate for the dedicated
   invented-style composer (docs/lib/invent.js): renders a few SHORT invented
   pieces (whole piece + ending inside the window) and applies the same
   acceptance bands as render-site.mjs.

   Why it exists: the full render-site.mjs sweep renders every genre + melds +
   an invented case at full length, twice each (determinism) — ~30+ minutes of
   audio. Constrained environments render OfflineAudioContext well below real
   time (session 038 measured ~0.13x), which makes the full sweep impractical
   there; this tool keeps an audio-quality gate on the invented composer cheap
   (~2 short single renders). It skips the PCM-determinism double render: the
   symbolic stream is asserted byte-identical in the Node suite, and
   determinism-within-rounding is an engine-wide finding (session 034), not a
   composer-specific risk.

   Usage:  node experiments/tools/render-invent-quick.mjs [seedhex ...]
   Default seeds are short pieces (~70-80 s) chosen to cover percussion,
   contrasting texture architectures, and two ending idioms.
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/_selftest.html');

// short invented pieces (length pinned to ~60 s so the gate stays bounded no
// matter what the seed draws). As of session 039's kernel draw:
//   c069e05b — Tom's 2026-07-11 repeated-note report seed: chorale / cell /
//              voce lead / fade (the regression case for the gamut+chorale fix)
//   a555b    — melodyAccomp / timeline / HORN lead + kick/hat / 5/8 / cadence
//              (exercises a new sustained voice, percussion, and legato)
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['c069e05b', 'a555b'];

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(PAGE);
await page.waitForFunction('typeof window.__renderSite === "function"', { timeout: 8000 });

let pass = 0, fail = 0;
for (const seed of seeds) {
  const r = await page.evaluate((spec) => window.__renderSite(spec), { invent: true, seed, controls: { length: 0 }, checkDeterminism: false });
  const m = r.metrics || {};
  const gates = [
    ['no clipping (peak < 1.0)', m.peak < 1.0, 'peak=' + m.peak],
    ['no gross discontinuity (maxStep < 0.45)', m.maxStep < 0.45, 'maxStep=' + m.maxStep],
    ['no silent gap > 2.5 s (musical span)', m.silenceGapSec < 2.5, 'gap=' + m.silenceGapSec + 's'],
    ['level in band (-30..-9 dBFS)', m.rmsDb > -30 && m.rmsDb < -9, m.rmsDb + ' dBFS'],
    ['a real piece (>= 12 bars, >= 30 events, >= 40 s)', r.bars >= 12 && r.events >= 30 && r.durationSec >= 40, r.bars + ' bars, ' + r.events + ' events, ' + r.durationSec + 's'],
  ];
  console.log('--- invent@' + seed + ' — "' + r.name + '" (' + r.meter + ', ' + r.bpm + ' BPM, strategy ' + r.strategy + ')');
  for (const [name, ok, detail] of gates) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + '  [' + detail + ']');
    if (ok) pass++; else fail++;
  }
}
console.log('console errors:', errors.length ? JSON.stringify(errors) : 'none');
console.log('render-invent-quick: ' + pass + '/' + (pass + fail) + ' gates green');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
