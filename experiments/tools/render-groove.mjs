#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-groove.mjs — offline render-and-measure gate for the public
   groove-lofi engine (docs/preliminary-tests/engines/03-groove-lofi).

   The composer's structural correctness (backbeat, medium-syncopation kick,
   ghost notes, swing math) is proven by the headless Node suite; this proves
   the AUDIBLE layer — that the engine's own synth.js (drum voices + rhodes)
   + fx.js + performer render a clean, unclipped groove with a continuous beat
   (no long silence) at a sensible level, with per-sample steps within the
   PERCUSSIVE discontinuity bound (drums legitimately step more than the
   ambient/tonal engines — wiki/synthesis-recipes.md: "Percussion clicks you
   want are made of shaped noise"). Loads the engine's dev-only _selftest.html
   from file:// in headless Chromium, calls window.__renderGroove() for a few
   seeds/moods, applies acceptance bands, and exits non-zero on failure.

   Same dev-time Playwright pattern as render-engine.mjs / render-ambient.mjs.

   Usage:  node experiments/tools/render-groove.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/preliminary-tests/engines/03-groove-lofi/_selftest.html');
const argv = process.argv.slice(2);

const CASES = [
  { seed: 'demo', mood: 'mellow', bpm: 82, bars: 16 },
  { seed: 'dusk', mood: 'night', bpm: 76, bars: 16 },
  { seed: 'shuffle', mood: 'warm', bpm: 88, swing: 0.64, bars: 16 },
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.seed}: no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    // Percussive transients (highpassed hats, snare noise) step far more per
    // sample than sustained voices — the bound is a gross-blowup guard, not a
    // click check (click-safety is guaranteed by construction and proven by
    // render-measure.mjs on the sustained voices).
    [`${r.seed}: no gross discontinuity (max sample step < 0.7)`, m.maxStep < 0.7, `maxStep=${m.maxStep}`],
    // The groove (kick/hat every bar + the vinyl bed) is continuous — no long gap.
    [`${r.seed}: continuous groove (no silence > 2 s)`, m.silenceGapSec < 2, `gap=${m.silenceGapSec}s`],
    [`${r.seed}: level in band (-26..-8 dBFS)`, m.rmsDb > -26 && m.rmsDb < -8, `${m.rmsDb} dBFS`],
    [`${r.seed}: a full groove rendered (>= 120 events)`, r.events >= 120, `${r.events} events`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__renderGroove === "function"', { timeout: 8000 });

  const results = [];
  for (const c of CASES) results.push(await page.evaluate((o) => window.__renderGroove(o), c));
  await browser.close();

  const allGates = [];
  for (const r of results) for (const g of gates(r)) allGates.push(g);
  allGates.push(['no console/page errors', errors.length === 0, errors.join('; ') || 'none']);
  const failed = allGates.filter((g) => !g[1]);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ page: PAGE, results, gates: allGates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\ngroove-lofi engine — offline render & measure\n');
    for (const r of results) console.log(`  ${r.seed}  ${r.key}  ${r.bars} bars / ${r.bpm} BPM / swing ${Math.round(r.swing * 100)}%  ${r.events} events  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s`);
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
