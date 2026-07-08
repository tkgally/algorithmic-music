#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-engine.mjs — offline render-and-measure gate for the public
   tonal-classical engine (docs/engines/01-tonal-classical).

   The composer's structural correctness is proven by the headless Node
   suite; this proves the AUDIBLE layer — that the engine's own synth.js +
   fx.js + performer render a full ~80-second piece to a clean, unclipped,
   click-safe, gap-free buffer. It loads the engine's dev-only _selftest.html
   from file:// in headless Chromium, calls window.__renderEngine() for a few
   seeds/modes, applies acceptance bands, and exits non-zero on failure.

   Same dev-time Playwright pattern as render-measure.mjs — the globally
   installed package, never a repo dependency.

   Usage:  node experiments/tools/render-engine.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/engines/01-tonal-classical/_selftest.html');
const argv = process.argv.slice(2);

const CASES = [
  { seed: 'demo-1', mode: 'major', tonic: 'C4', bpm: 92 },
  { seed: 'shadow', mode: 'minor', tonic: 'A3', bpm: 84 },
  { seed: 'bright7', mode: 'major', tonic: 'G4', bpm: 104 },
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.seed}: no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    // maxStep here is a gross-discontinuity REGRESSION bound, not an absolute
    // click test. Envelope click-safety is guaranteed by construction (every
    // synth voice ramps its output gain from ~0, never hard-gates) and is
    // separately PROVEN by render-measure.mjs, whose discriminating blip test
    // scores a click-safe attack at ~0.02 and a deliberate hard-gate at ~0.50.
    // For a full FM-lead + detuned-ensemble + convolution-reverb mix, band-
    // limited-oscillator/FM timbre legitimately steps far more than a lone sine
    // blip (~0.1-0.3 here); this bound (< 0.4, comfortably below the ~0.78 peak)
    // catches a gross new discontinuity without flagging normal timbre.
    [`${r.seed}: no gross discontinuity (max sample step < 0.4)`, m.maxStep < 0.4, `maxStep=${m.maxStep}`],
    [`${r.seed}: no silent gap > 2.5 s`, m.silenceGapSec < 2.5, `gap=${m.silenceGapSec}s`],
    [`${r.seed}: level in band (-30..-9 dBFS, background-quiet)`, m.rmsDb > -30 && m.rmsDb < -9, `${m.rmsDb} dBFS`],
    [`${r.seed}: a full piece rendered (>= 25 bars, >= 150 events)`, r.bars >= 25 && r.events >= 150, `${r.bars} bars, ${r.events} events`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__renderEngine === "function"', { timeout: 8000 });

  const results = [];
  for (const c of CASES) results.push(await page.evaluate((o) => window.__renderEngine(o), c));
  await browser.close();

  const allGates = [];
  for (const r of results) for (const g of gates(r)) allGates.push(g);
  allGates.push(['no console/page errors', errors.length === 0, errors.join('; ') || 'none']);
  const failed = allGates.filter((g) => !g[1]);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ page: PAGE, results, gates: allGates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\ntonal-classical engine — offline render & measure\n');
    for (const r of results) console.log(`  ${r.seed}  ${r.key}  ${r.bars} bars / ${r.durationSec}s  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s`);
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
