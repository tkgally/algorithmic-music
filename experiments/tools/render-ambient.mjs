#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-ambient.mjs — offline render-and-measure gate for the public
   ambient-drift engine (docs/engines/02-ambient-drift).

   The composer's structural correctness is proven by the headless Node
   suite; this proves the AUDIBLE layer — that the engine's own synth.js +
   fx.js + performer render a clean, unclipped, click-safe ambient texture
   with a continuous bed (no long mid-piece silence) at a quiet level. It
   loads the engine's dev-only _selftest.html from file:// in headless
   Chromium, calls window.__renderAmbient() for a few seeds/palettes (a
   shorter 60 s window for speed), applies acceptance bands, and exits
   non-zero on failure.

   Same dev-time Playwright pattern as render-engine.mjs.

   Usage:  node experiments/tools/render-ambient.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/engines/02-ambient-drift/_selftest.html');
const argv = process.argv.slice(2);

const CASES = [
  { seed: 'demo', palette: 'warm', tonic: 'D3', durationSec: 60 },
  { seed: 'dusk', palette: 'shadow', tonic: 'A2', durationSec: 60 },
  { seed: 'glass', palette: 'calm', tonic: 'C3', durationSec: 60 },
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.seed}: no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    // As with the classical gate, maxStep is a gross-discontinuity regression
    // bound (click-safety is guaranteed by construction and proven by
    // render-measure.mjs). Ambient's soft attacks step far less than an FM lead.
    [`${r.seed}: no gross discontinuity (max sample step < 0.3)`, m.maxStep < 0.3, `maxStep=${m.maxStep}`],
    // The pad/drone bed is continuous, so there must be NO long silence in the
    // body of the piece (the trailing dissolve is excluded in the self-test).
    [`${r.seed}: continuous bed (no mid-piece silence > 4 s)`, m.silenceGapSec < 4, `gap=${m.silenceGapSec}s`],
    [`${r.seed}: level in band (-34..-12 dBFS, ambient-quiet)`, m.rmsDb > -34 && m.rmsDb < -12, `${m.rmsDb} dBFS`],
    // 2+ regions in the 60 s test window (the full ~150 s default has ~5).
    [`${r.seed}: a full texture rendered (>= 2 regions, >= 20 events)`, r.regions >= 2 && r.events >= 20, `${r.regions} regions, ${r.events} events`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__renderAmbient === "function"', { timeout: 8000 });

  const results = [];
  for (const c of CASES) results.push(await page.evaluate((o) => window.__renderAmbient(o), c));
  await browser.close();

  const allGates = [];
  for (const r of results) for (const g of gates(r)) allGates.push(g);
  allGates.push(['no console/page errors', errors.length === 0, errors.join('; ') || 'none']);
  const failed = allGates.filter((g) => !g[1]);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ page: PAGE, results, gates: allGates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\nambient-drift engine — offline render & measure\n');
    for (const r of results) console.log(`  ${r.seed}  ${r.key}  ${r.regions} regions / ${r.loops} loops / ${r.durationSec}s  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s`);
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
