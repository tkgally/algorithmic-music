#!/usr/bin/env node
/* ---------------------------------------------------------------------
   ui-smoke.mjs — headless UI smoke test for the public site.

   Loads the hub and all three engine pages from file:// in headless
   Chromium, checks the hub lists the three engines, then for each engine
   clicks Play, lets it run ~1.6 s, and asserts playback actually started
   (the transport button flips to Stop and the playhead advances) with ZERO
   console/page errors. This is the live-playback counterpart to the offline
   render gates (render-engine/ambient/groove.mjs) — it exercises the real
   AudioContext path, the index.html wiring, and the scheduler, which the
   offline gates bypass. Same dev-only Playwright pattern as the render tools.

   Usage:  node experiments/tools/ui-smoke.mjs [--json]
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const DOCS = path.resolve(HERE, '../../docs');
const fileUrl = (p) => 'file://' + path.resolve(DOCS, p);
const argv = process.argv.slice(2);

const ENGINES = [
  { name: 'tonal-classical', page: 'engines/01-tonal-classical/index.html' },
  { name: 'ambient-drift', page: 'engines/02-ambient-drift/index.html' },
  { name: 'groove-lofi', page: 'engines/03-groove-lofi/index.html' },
];

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const gates = [];

  // ---- Hub ----
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(fileUrl('index.html'));
    const links = await page.$$eval('a[href*="engines/"]', (as) => as.map((a) => a.getAttribute('href')));
    const hasAll = ['01-tonal-classical', '02-ambient-drift', '03-groove-lofi'].every((s) => links.some((l) => l.includes(s)));
    gates.push([`hub lists all three engines`, hasAll, links.length + ' engine links']);
    gates.push([`hub: no console/page errors`, errors.length === 0, errors.join('; ') || 'none']);
    await page.close();
  }

  // ---- Each engine: load, Play, advance, Stop ----
  for (const eng of ENGINES) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(fileUrl(eng.page));
    await page.waitForSelector('#play', { timeout: 8000 });
    // start playback (a click is a user gesture; the autoplay flag also allows it)
    await page.click('#play');
    // give the lookahead scheduler + AudioContext time to start and advance
    await page.waitForTimeout(1600);
    const state = await page.evaluate(() => {
      const btn = document.getElementById('play');
      const now = document.getElementById('nowlabel');
      return { btnText: btn ? btn.textContent : '', nowText: now ? now.textContent : '' };
    });
    const started = /stop/i.test(state.btnText);
    const advanced = /playing|\d+s/i.test(state.nowText);
    gates.push([`${eng.name}: playback started (transport shows Stop)`, started, JSON.stringify(state.btnText)]);
    gates.push([`${eng.name}: playhead advanced`, advanced, JSON.stringify(state.nowText)]);
    gates.push([`${eng.name}: no console/page errors`, errors.length === 0, errors.join('; ') || 'none']);
    await page.close();
  }

  await browser.close();
  const failed = gates.filter((g) => !g[1]);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ gates: gates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\npublic site — headless UI smoke\n');
    for (const [l, p, d] of gates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${gates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
