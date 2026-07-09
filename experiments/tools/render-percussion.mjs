#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-percussion.mjs — offline render-and-measure gate for the public
   percussion engine (docs/engines/05-percussion).

   The composer's structural correctness (meter parametricity, the three
   styles' forms, the subordinate melodic layer) and the pure performer
   (feel, timbre macros, accel/rit) are proven by the headless Node suite;
   this proves the AUDIBLE layer — that the engine's own synth.js (the
   original percussion voices) + fx.js + performer render a clean, unclipped
   piece with a continuous texture (no long silence) at a sensible level,
   with per-sample steps within the PERCUSSIVE discontinuity bound (struck
   percussion legitimately steps more than sustained voices — the sound is
   made of shaped transients; wiki/percussion-sound-design.md). Loads the
   engine's dev-only _selftest.html from file:// in headless Chromium, calls
   window.__renderPercussion() for a spread of styles/meters, applies
   acceptance bands, and exits non-zero on failure.

   Same dev-time Playwright pattern as render-groove.mjs / render-cantabile.mjs.

   Usage:  node experiments/tools/render-percussion.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/engines/05-percussion/_selftest.html');
const argv = process.argv.slice(2);

const CASES = [
  { seed: 'concert', style: 'ensemble', meter: '4/4', bpm: 112, bars: 28, melody: 0.5 },
  { seed: 'ewe',     style: 'folk',     meter: '12/8', bpm: 120, bars: 28, melody: 0.6 },
  { seed: 'clave',   style: 'folk',     meter: '4/4',  bpm: 100, bars: 28, melody: 0.7 },
  { seed: 'circle',  style: 'circle',   meter: '4/4',  bpm: 116, bars: 28, melody: 0.4 },
  { seed: 'aksak',   style: 'folk',     meter: '7/8',  bpm: 132, bars: 28, melody: 0.5 },
  { seed: 'dry',     style: 'ensemble', meter: '4/4',  bpm: 108, bars: 24, melody: 0, ring: 0.5, bright: 1.4, tune: 2 },
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.seed} (${r.style}/${r.meter}): no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    // Struck-percussion transients (bright metal/wood clicks, shaker noise) step far
    // more per sample than sustained voices — the bound is a gross-blowup guard, not
    // a click check (click-safety is by construction: every voice ends on a true-zero
    // linear ramp, and render-measure.mjs proves the sustained-voice envelopes).
    [`${r.seed}: no gross discontinuity (max sample step < 0.8)`, m.maxStep < 0.8, `maxStep=${m.maxStep}`],
    // A percussion piece is continuous (a pulse/timeline/ostinato) apart from a
    // deliberate stop-cut; no long silence in the body.
    [`${r.seed}: continuous (no silence > 2.2 s)`, m.silenceGapSec < 2.2, `gap=${m.silenceGapSec}s`],
    [`${r.seed}: level in band (-26..-6 dBFS)`, m.rmsDb > -26 && m.rmsDb < -6, `${m.rmsDb} dBFS`],
    [`${r.seed}: a full piece rendered (>= 120 events)`, r.events >= 120, `${r.events} events`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__renderPercussion === "function"', { timeout: 8000 });

  const results = [];
  for (const c of CASES) results.push(await page.evaluate((o) => window.__renderPercussion(o), c));
  await browser.close();

  const allGates = [];
  for (const r of results) for (const g of gates(r)) allGates.push(g);
  allGates.push(['no console/page errors', errors.length === 0, errors.join('; ') || 'none']);
  const failed = allGates.filter((g) => !g[1]);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ page: PAGE, results, gates: allGates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\npercussion engine — offline render & measure\n');
    for (const r of results) console.log(`  ${r.seed.padEnd(8)} ${r.style.padEnd(9)} ${r.meter.padEnd(5)} ${r.bars} bars / ${r.bpm} BPM  ${r.events} events  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s`);
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
