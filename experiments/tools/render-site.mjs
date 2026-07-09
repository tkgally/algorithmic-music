#!/usr/bin/env node
/* ---------------------------------------------------------------------
   render-site.mjs — offline render-and-measure gate for the COMPREHENSIVE
   SITE (docs/index.html pipeline), per genre.

   Loads docs/_selftest.html from file:// in headless Chromium and calls
   window.__renderSite() for a set of cases (each Start genre, a two-genre
   meld, an invented style), applying the engines' proven acceptance bands
   plus the site's own DETERMINISM gate: the same seed must render
   byte-identical PCM twice (offline == online, site-architecture §7).
   Also runs window.__checkSerialize() (URL v1 layout + round-trips).

   Usage:  node experiments/tools/render-site.mjs [--json] [--genre <id>]
           --genre limits to cases whose id contains <id> (e.g. a genre pack
           author checking just their genre: --genre jazz)
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
const argv = process.argv.slice(2);
const genreFilter = argv.includes('--genre') ? argv[argv.indexOf('--genre') + 1] : null;

const CASES = [
  { id: 'classical', spec: { genre: 'classical', seed: 'c1a55e5' } },
  { id: 'classical-2', spec: { genre: 'classical', seed: '0defaced' } },
  { id: 'ambient', spec: { genre: 'ambient', seed: 'a3b1e21' } },
  { id: 'lofi', spec: { genre: 'lofi', seed: '10f1beat' } },
  { id: 'jazz', spec: { genre: 'jazz', seed: '1a22c0de' } },
  { id: 'folk', spec: { genre: 'folk', seed: 'f01cdaa' } },
  { id: 'electronic', spec: { genre: 'electronic', seed: 'e1ec7a0' } },
  { id: 'cinematic', spec: { genre: 'cinematic', seed: 'c11e11a' } },
  { id: 'percussion', spec: { genre: 'percussion', seed: 'bea7bea7' } },
  { id: 'meld-classical-electronic', spec: { genres: ['classical', 'electronic'], seed: 'ae1dae1d' } },
  { id: 'meld-ambient-lofi', spec: { genres: ['ambient', 'lofi'], seed: '5eabed5' } },
  { id: 'invent', spec: { invent: true, seed: '10e17a1' } },
];

function gates(r) {
  const m = r.metrics;
  return [
    [`${r.spec.genre}@${r.spec.seed}: no clipping (peak < 1.0)`, m.peak < 1.0, `peak=${m.peak}`],
    [`${r.spec.genre}@${r.spec.seed}: no gross discontinuity (maxStep < 0.45)`, m.maxStep < 0.45, `maxStep=${m.maxStep}`],
    [`${r.spec.genre}@${r.spec.seed}: no silent gap > 2.5 s (musical span)`, m.silenceGapSec < 2.5, `gap=${m.silenceGapSec}s`],
    [`${r.spec.genre}@${r.spec.seed}: level in band (-30..-9 dBFS)`, m.rmsDb > -30 && m.rmsDb < -9, `${m.rmsDb} dBFS`],
    [`${r.spec.genre}@${r.spec.seed}: a real piece (>= 12 bars, >= 30 events, >= 40 s)`, r.bars >= 12 && r.events >= 30 && r.durationSec >= 40, `${r.bars} bars, ${r.events} events, ${r.durationSec}s`],
    [`${r.spec.genre}@${r.spec.seed}: deterministic (same seed -> same audio within float rounding)`, r.deterministic === true, `maxDiff=${r.maxRenderDiff}${r.hash === r.hash2 ? ' (byte-identical)' : ''}`],
  ];
}

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.waitForFunction('typeof window.__renderSite === "function"', { timeout: 8000 });

  const cases = genreFilter ? CASES.filter((c) => c.id.includes(genreFilter)) : CASES;
  const results = [];
  for (const c of cases) {
    try {
      const r = await page.evaluate((spec) => window.__renderSite(spec), c.spec);
      r.caseId = c.id;
      results.push(r);
    } catch (e) {
      results.push({ caseId: c.id, spec: { genre: c.id, seed: '?' }, error: String(e && e.message || e), metrics: {}, bars: 0, events: 0, durationSec: 0 });
    }
  }
  const ser = await page.evaluate(() => window.__checkSerialize());
  await browser.close();

  const allGates = [];
  for (const r of results) {
    if (r.error) { allGates.push([`${r.caseId}: render succeeded`, false, r.error]); continue; }
    for (const g of gates(r)) allGates.push(g);
  }
  allGates.push(['serialize: v1 layout matches the control registry', ser.layoutOk, JSON.stringify(ser)]);
  allGates.push(['serialize: 8 packs registered with orders 0..7', ser.ordersOk, '']);
  allGates.push(['serialize: full-pin and invented round-trips hold', ser.rtOk && ser.rt2Ok, `payload ${ser.payloadLen} chars (empty ${ser.emptyLen})`]);
  allGates.push(['no console/page errors', errors.length === 0, errors.slice(0, 3).join('; ') || 'none']);
  const failed = allGates.filter((g) => !g[1]);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ page: PAGE, results, serialize: ser, gates: allGates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\ncomprehensive site — offline render & measure\n');
    for (const r of results) {
      if (r.error) { console.log(`  ${r.caseId}: ERROR ${r.error}`); continue; }
      console.log(`  ${r.caseId}  ${r.name}  ${r.bars} bars / ${r.durationSec}s  rms ${r.metrics.rmsDb} dBFS  peak ${r.metrics.peak}  maxStep ${r.metrics.maxStep}  gap ${r.metrics.silenceGapSec}s  det ${r.deterministic}`);
    }
    console.log('');
    for (const [l, p, d] of allGates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${allGates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
