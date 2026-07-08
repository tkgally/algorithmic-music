#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-measure.mjs — OfflineAudioContext render-and-measure harness.

   The audio-side counterpart to the headless Node test suite: the tests
   prove the LOGIC (scheduling math, theory, analysis) deterministically;
   this proves the AUDIO — that the transport's beats->seconds math places
   notes on the right samples in a real Web Audio render, that the click-safe
   envelope really is click-safe, and that a fully composed period renders to
   a clean, unclipped, gap-free buffer. It is the successor to the previous
   experiments' tools/verify.mjs (reference-only), rebuilt around
   OfflineAudioContext (faster than real time, deterministic) and the
   project's own analysis library. See wiki/computational-music-metrics.md
   and wiki/engine-architecture.md (testability requirement #2).

   It loads experiments/demos/offline-render.html from file:// in headless
   Chromium, calls window.__render(...) for three cases, applies acceptance
   gates, prints a JSON report, and exits non-zero if any gate fails.

   Usage:   node experiments/tools/render-measure.mjs [--json] [--quiet]

   Dev-time tool only. Playwright is used the same way verify.mjs used it —
   the globally installed package, never a dependency of this repo. Chromium
   is found via the environment's Playwright configuration.
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../demos/offline-render.html');
const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');

// Acceptance gates. Each is [label, passed, detail]. Bands were calibrated to
// the observed-good renders (the wiki's "acceptance bands, not scores" stance);
// a failure means the audio behavior regressed, not that a number is imperfect.
function gatesForTiming(r) {
  const t = r.timing, m = r.metrics;
  return [
    ['all scheduled onsets detected', t.matched === r.scheduledOnsets, `${t.matched}/${r.scheduledOnsets}`],
    ['no spurious onsets', t.extras === 0, `extras=${t.extras}`],
    ['timing jitter < 1 ms (sample-accurate placement)', t.jitterMs < 1.0, `${t.jitterMs.toFixed(3)} ms`],
    ['max onset error < 6 ms', t.maxAbsMs < 6.0, `${t.maxAbsMs.toFixed(3)} ms`],
    ['click-safe (max sample step < 0.05)', m.maxStep < 0.05, `maxStep=${m.maxStep}`],
    ['no clipping (peak < 1.0)', m.peak < 1.0, `peak=${m.peak}`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__render === "function"', { timeout: 8000 });

  const strip = (r) => { delete r._samples; delete r._sr; return r; };
  const timing = strip(await page.evaluate(() => window.__render({ mode: 'timing' })));
  const unsafe = strip(await page.evaluate(() => window.__render({ mode: 'timing', unsafe: true })));
  const score = strip(await page.evaluate(() => window.__render({ mode: 'score', seed: 'demo-1' })));
  await browser.close();

  const gates = [];
  for (const g of gatesForTiming(timing)) gates.push(['timing: ' + g[0], g[1], g[2]]);
  // The unsafe control must actually click — proves the click detector discriminates.
  gates.push(['control: unsafe render DOES click (maxStep > 0.2)', unsafe.metrics.maxStep > 0.2, `maxStep=${unsafe.metrics.maxStep}`]);
  // The composed period must render clean.
  gates.push(['score: no clipping (peak < 1.0)', score.metrics.peak < 1.0, `peak=${score.metrics.peak}`]);
  gates.push(['score: no silent gap > 2 s', score.metrics.silenceGapSec < 2.0, `gap=${score.metrics.silenceGapSec}s`]);
  gates.push(['score: level in band (-30..-6 dBFS)', score.metrics.rmsDb > -30 && score.metrics.rmsDb < -6, `${score.metrics.rmsDb} dBFS`]);
  // Full-mix onset recovery is approximate (spectral flux is the documented fix);
  // gate only the sanity floor — "the melody is actually sounding" — not a count.
  gates.push(['score: melody is audible (>= half its notes detected — approximate)', score.detectedMelodyOnsets >= score.melodyNotes * 0.5, `${score.detectedMelodyOnsets}/${score.melodyNotes} (diagnostic)`]);
  gates.push(['no console/page errors', consoleErrors.length === 0, consoleErrors.join('; ') || 'none']);

  const failed = gates.filter((g) => !g[1]);
  const report = { page: PAGE, timing, unsafe: unsafe.metrics, score, gates: gates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), passed: gates.length - failed.length, failed: failed.length };

  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (!QUIET) {
      console.log('\nOfflineAudioContext render & measure\n');
      console.log(`  timing:  ${timing.scheduledOnsets} onsets, jitter ${timing.timing.jitterMs.toFixed(3)} ms, max err ${timing.timing.maxAbsMs.toFixed(3)} ms, maxStep ${timing.metrics.maxStep}`);
      console.log(`  control: unsafe maxStep ${unsafe.metrics.maxStep} (should be >> the safe ${timing.metrics.maxStep})`);
      console.log(`  score:   ${score.key}  ${score.progression}`);
      console.log(`           rms ${score.metrics.rmsDb} dBFS, peak ${score.metrics.peak}, gap ${score.metrics.silenceGapSec}s, melody onsets ${score.detectedMelodyOnsets}/${score.melodyNotes}\n`);
    }
    for (const [l, p, d] of gates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${report.passed} passed, ${report.failed} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
