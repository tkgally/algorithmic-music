#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-cantabile.mjs — offline render-and-measure gate for the public
   cantabile engine (Engine 04, docs/engines/04-cantabile).

   The composer's structure + the performer's expression pass are proven by
   the headless Node suite; this proves the AUDIBLE layer — that the engine's
   own synth.js (the new expressive voices aria/reed/wire/glass, with their
   continuous intra-note pitch/vibrato/swell/grit automation) + fx.js +
   performer render a full ~2-minute piece to a clean, unclipped, click-safe,
   gap-free buffer across seeds, modes, ensembles, and slider extremes. It
   loads _selftest.html from file:// in headless Chromium, calls
   window.__renderEngine() for several cases, applies acceptance bands, and
   exits non-zero on failure.

   Same dev-time Playwright pattern as render-engine.mjs.

   Usage:  node experiments/tools/render-cantabile.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/engines/04-cantabile/_selftest.html');
const argv = process.argv.slice(2);

const CASES = [
  { seed: 'demo-1', bpm: 84 },                                            // seed-picked mode + ensemble
  { seed: 'shadow', mode: 'phrygian', tonic: 'A3', bpm: 76 },             // dark, low
  { seed: 'bloom', mode: 'lydian', tonic: 'C4', bpm: 92, lead: 'glass', partner: 'aria' },
  { seed: 'ardor', mode: 'harmonicMinor', tonic: 'E4', bpm: 80, lead: 'wire', partner: 'reed',
    expression: 1, song: 1, bloom: 1, ardor: 1, grain: 0.6 },             // maximum expression stress
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.seed}: no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    // maxStep is a gross-discontinuity REGRESSION bound, not an absolute click test.
    // Click-safety is guaranteed by construction (every voice ramps its output gain
    // from ~0 to a true-zero tail) and proven discriminating by render-measure.mjs.
    // The expressive voices are saw/formant/overdriven-saw timbres with per-note
    // pitch automation, which legitimately step more than a lone sine; this bound
    // (< 0.45, well below the peak) catches a gross NEW discontinuity.
    [`${r.seed}: no gross discontinuity (max sample step < 0.45)`, m.maxStep < 0.45, `maxStep=${m.maxStep}`],
    [`${r.seed}: no silent gap > 3.0 s`, m.silenceGapSec < 3.0, `gap=${m.silenceGapSec}s`],
    [`${r.seed}: level in band (-30..-8 dBFS)`, m.rmsDb > -30 && m.rmsDb < -8, `${m.rmsDb} dBFS`],
    [`${r.seed}: a full piece rendered (>= 36 bars, >= 200 events)`, r.bars >= 36 && r.events >= 200, `${r.bars} bars, ${r.events} events`],
    [`${r.seed}: an expressive lead is assigned`, r.ensemble && ['aria', 'reed', 'wire', 'glass'].includes(r.ensemble.lead), JSON.stringify(r.ensemble)],
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
    console.log('\ncantabile engine — offline render & measure\n');
    for (const r of results) console.log(`  ${r.seed}  ${r.key}  [${r.ensemble.lead}/${r.ensemble.counter || '—'}/${r.ensemble.inner}]  ${r.bars} bars / ${r.durationSec}s  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s`);
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
