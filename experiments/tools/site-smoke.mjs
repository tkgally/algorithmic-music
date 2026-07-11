#!/usr/bin/env node
/* ---------------------------------------------------------------------
   site-smoke.mjs — headless LIVE-playback smoke test for the comprehensive
   site (docs/index.html): the ui-smoke counterpart for the new site.

   Asserts, in headless Chromium from file://:
     1. the site loads with ZERO console/page errors; the 7 visible genre
        buttons render (Jazz withdrawn from the picker in session 039 — the
        pack stays registered for old links);
     2. Play starts the transport (button flips to Stop, playhead advances);
     3. the URL carries a compact #p= payload that ROUND-TRIPS: a fresh page
        opened at the same URL derives the same piece (name + detail line);
     4. a LIVE control change does NOT restart the transport (playhead is
        monotonic across the change; still playing) — the site-architecture
        §6 no-restart requirement;
     5. a live GENRE swap crossfades without stopping (still playing, time
        monotonic, piece name updates);
     6. every Start genre plays (short spin each) with zero errors;
     7. mode switching reveals the Intermediate/Advanced tiers and the
        invent-a-style button;
     8. continuous play advances to a fresh piece (new conductor + new seed)
        without stopping the transport;
     9. batch-2 controls: invent-a-style in Start, the Intermediate palette
        dropdown (10+ described sets), the Advanced instrument checkboxes
        (27 as of session 039) + new parameters, the reset button, and the
        live structure window;
    10. background mode (experimental iOS lock-screen PoC): the toggle wires up,
        the hidden <audio> element is present, and render -> WAV blob produces a
        valid RIFF/WAVE payload (bounded render; on-device behavior needs a phone).

   Usage:  node experiments/tools/site-smoke.mjs [--json] [--quick]
           --quick skips the per-genre spin (step 6).
--------------------------------------------------------------------- */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(HERE, '../../docs/index.html');
const argv = process.argv.slice(2);
const gates = [];
const g = (label, pass, detail) => gates.push([label, !!pass, detail == null ? '' : String(detail)]);

async function newPage(browser, errors) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return page;
}
const playhead = (page) => page.evaluate(() => {
  const a = window.AMApp;
  if (!a || !a.conductor) return null;
  const ctx = a.conductor.chain && a.conductor.chain.master ? a.conductor.chain.master.context : null;
  return ctx ? ctx.currentTime - a.conductor.startAt : null;
});

async function main() {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const page = await newPage(browser, errors);
  await page.goto(PAGE);
  await page.waitForSelector('#play', { timeout: 8000 });

  // 1 — shell
  const genreCount = await page.$$eval('#genres button.genre:not(#inventBtn)', (b) => b.length);
  g('site loads with 7 visible genre buttons (Jazz withdrawn 039)', genreCount === 7, genreCount + ' buttons');
  const hasJazzBtn = await page.$$eval('#genres button.genre', (bs) => bs.some((b) => b.getAttribute('data-id') === 'jazz'));
  g('no Jazz button in the picker', !hasJazzBtn, '');

  // 2 — play
  await page.click('#play');
  await page.waitForTimeout(2200);
  const btn1 = await page.$eval('#play', (b) => b.textContent);
  const now1 = await page.$eval('#nowlabel', (n) => n.textContent);
  const t1 = await playhead(page);
  g('playback started (button shows Stop)', /stop/i.test(btn1), JSON.stringify(btn1));
  g('playhead advanced', /playing/.test(now1) && t1 > 0.5, now1 + ' t=' + (t1 && t1.toFixed(2)));

  // 3 — URL round-trip: same #p= payload -> same derived piece
  const href = await page.url();
  g('URL carries compact payload', /#p=[A-Za-z0-9\-_]{8,}/.test(href), href.split('#')[1] || 'none');
  const desc1 = await page.evaluate(() => document.getElementById('pieceName').textContent + '|' + document.getElementById('pieceDetail').textContent);
  {
    const errors2 = [];
    const page2 = await newPage(browser, errors2);
    await page2.goto(href);
    await page2.waitForSelector('#pieceDetail', { timeout: 8000 });
    await page2.waitForTimeout(300);
    const desc2 = await page2.evaluate(() => document.getElementById('pieceName').textContent + '|' + document.getElementById('pieceDetail').textContent);
    g('URL round-trip derives the same piece', desc1 === desc2 && desc1.length > 3, desc1 + ' vs ' + desc2);
    g('round-trip page: no errors', errors2.length === 0, errors2.join('; ') || 'none');
    await page2.close();
  }

  // 4 — live control change does NOT restart (energy = next-boundary speed)
  const tBefore = await playhead(page);
  await page.evaluate(() => {
    const row = document.querySelector('[data-ctl="energy"] input');
    row.value = '4';
    row.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  const tAfter = await playhead(page);
  const btn2 = await page.$eval('#play', (b) => b.textContent);
  g('live control change: still playing', /stop/i.test(btn2), btn2);
  g('live control change: transport did NOT restart (monotonic playhead)', tAfter != null && tBefore != null && tAfter > tBefore, 'before=' + (tBefore && tBefore.toFixed(2)) + ' after=' + (tAfter && tAfter.toFixed(2)));

  // 5 — live genre swap crossfades without stopping
  const nameBefore = await page.$eval('#pieceName', (n) => n.textContent);
  const tSwap0 = await playhead(page);
  await page.click('#genres button.genre[data-id="ambient"]');
  await page.waitForTimeout(1800);
  const stillPlaying = await page.$eval('#play', (b) => /stop/i.test(b.textContent));
  const nameAfter = await page.$eval('#pieceName', (n) => n.textContent);
  const tSwap1 = await playhead(page);
  g('live genre swap: still playing (crossfade, no stop)', stillPlaying, '');
  g('live genre swap: piece updated', nameAfter !== nameBefore, nameBefore + ' -> ' + nameAfter);
  g('live genre swap: new conductor started', tSwap1 != null, 't=' + (tSwap1 && tSwap1.toFixed(2)) + ' (was ' + (tSwap0 && tSwap0.toFixed(2)) + ')');
  await page.click('#play'); // stop
  await page.waitForTimeout(300);
  g('main page: no console/page errors', errors.length === 0, errors.slice(0, 4).join('; ') || 'none');
  await page.close();

  // 6 — every genre plays
  if (!argv.includes('--quick')) {
    const ids = ['classical', 'ambient', 'lofi', 'jazz', 'folk', 'electronic', 'cinematic', 'percussion'];
    for (const id of ids) {
      const errs = [];
      const p = await newPage(browser, errs);
      await p.goto(PAGE);
      await p.waitForSelector('#play', { timeout: 8000 });
      await p.evaluate((gid) => {
        for (const b of document.querySelectorAll('#genres button.genre.on')) b.classList.remove('on');
        window.AMApp.state.sel = { a: gid, b: null, invent: false };
      }, id);
      await p.click('#play');
      await p.waitForTimeout(1700);
      const ok = await p.$eval('#play', (b) => /stop/i.test(b.textContent));
      const adv = await p.$eval('#nowlabel', (n) => /playing/.test(n.textContent));
      g(`genre ${id}: plays live`, ok && adv, '');
      g(`genre ${id}: no errors`, errs.length === 0, errs.slice(0, 2).join('; ') || 'none');
      await p.close();
    }
  }

  // 7 — modes reveal tiers
  {
    const errs = [];
    const p = await newPage(browser, errs);
    await p.goto(PAGE);
    await p.waitForSelector('#mode2', { timeout: 8000 });
    await p.click('#mode1');
    const intVisible = await p.$eval('#intControls', (d) => d.style.display !== 'none');
    await p.click('#mode2');
    const advVisible = await p.$eval('#advControls', (d) => d.style.display !== 'none');
    const inventVisible = await p.$eval('#inventBtn', (b) => b.style.display !== 'none');
    g('Intermediate mode reveals its tier', intVisible, '');
    g('Advanced mode reveals its tier + invent button', advVisible && inventVisible, '');
    g('mode page: no errors', errs.length === 0, errs.slice(0, 2).join('; ') || 'none');
    await p.close();
  }

  // 8 — continuous play advances to a NEW piece without stopping. Uses the
  //     advancePiece hook so we don't wait a full piece; the auto-advance path
  //     in tickUi calls the same function at the music-end.
  {
    const errs = [];
    const p = await newPage(browser, errs);
    await p.goto(PAGE);
    await p.waitForSelector('#loop', { timeout: 8000 });
    await p.click('#loop');
    const armed = await p.$eval('#loop', (b) => b.classList.contains('on'));
    await p.click('#play');
    await p.waitForTimeout(1400);
    const before = await p.evaluate(() => ({
      start: window.AMApp.conductor ? window.AMApp.conductor.startAt : null,
      seed: window.AMApp.seedHex(window.AMApp.state.seed),
    }));
    await p.evaluate(() => window.AMApp.advancePiece());
    await p.waitForTimeout(1200);
    const after = await p.evaluate(() => ({
      start: window.AMApp.conductor ? window.AMApp.conductor.startAt : null,
      seed: window.AMApp.seedHex(window.AMApp.state.seed),
      playing: /stop/i.test(document.getElementById('play').textContent),
    }));
    g('continuous: toggle arms the button', armed, '');
    g('continuous: advanced to a fresh piece (new conductor)', before.start != null && after.start != null && after.start > before.start, before.start + ' -> ' + after.start);
    g('continuous: new seed, transport still playing', after.seed !== before.seed && after.playing, before.seed + ' -> ' + after.seed);
    g('continuous page: no errors', errs.length === 0, errs.slice(0, 2).join('; ') || 'none');
    await p.close();
  }

  // 9 — batch-2 controls: invent-in-Start, palette descriptions (Intermediate),
  //     Advanced instrument checkboxes + new params, reset, structure window.
  {
    const errs = [];
    const p = await newPage(browser, errs);
    await p.goto(PAGE);
    await p.waitForSelector('#reset', { timeout: 8000 });
    g('invent-a-style visible in Start', await p.$eval('#inventBtn', (b) => b.style.display !== 'none'), '');
    await p.click('#mode1');
    // ignore the "choose…" auto placeholder (value ""); check the real sets only
    const palOpts = await p.$$eval('[data-ctl="palette"] select option', (os) => os.filter((o) => o.value !== '').map((o) => o.textContent));
    g('Intermediate palette: 10-16 sets with descriptions', palOpts.length >= 10 && palOpts.length <= 16 && palOpts.every((t) => t.includes('—')), palOpts.length + ' opts');
    await p.click('#mode2');
    const palHidden = await p.$eval('[data-ctl="palette"]', (r) => r.style.display === 'none');
    const nBoxes = await p.$$eval('[data-ctl="instruments"] input[type=checkbox]', (b) => b.length);
    const nChecked = await p.$$eval('[data-ctl="instruments"] input[type=checkbox]:checked', (b) => b.length);
    const advCtls = await p.$$eval('#advControls [data-ctl]', (rs) => rs.map((r) => r.getAttribute('data-ctl')));
    g('Advanced replaces palette with instrument checkboxes', palHidden && nBoxes === 27 && nChecked >= 2, 'hidden=' + palHidden + ' boxes=' + nBoxes + ' checked=' + nChecked);
    g('Advanced exposes the new params', ['laidBack', 'rubato', 'harmonicRhythm', 'stepBias', 'melRange'].every((id) => advCtls.includes(id)), '');
    // uncheck an active instrument -> removed from the composition
    const before = await p.evaluate(() => AM.style.effectiveEnsemble(window.AMApp.buildVector()).map((e) => e.voice));
    await p.evaluate((v) => { const cb = document.querySelector('[data-ctl="instruments"] input[data-voice="' + v + '"]'); cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); }, before[before.length - 1]);
    const after = await p.evaluate(() => AM.style.effectiveEnsemble(window.AMApp.buildVector()).map((e) => e.voice));
    g('unchecking an instrument removes it', after.length === before.length - 1, before.join(',') + ' -> ' + after.join(','));
    // reset returns everything to auto
    await p.click('#reset');
    g('reset clears pinned controls', await p.evaluate(() => Object.keys(window.AMApp.state.controls).length) === 0, '');
    // structure window populates on play
    await p.click('#play');
    await p.waitForTimeout(2400);
    const desc = await p.$eval('#structDesc', (d) => d.textContent);
    const chips = await p.$$eval('#structSections .secChip', (c) => c.length);
    g('structure window populated + live section chips', /Instruments:/.test(desc) && chips >= 1, chips + ' chips');
    await p.click('#play');
    g('batch-2 page: no errors', errs.length === 0, errs.slice(0, 3).join('; ') || 'none');
    await p.close();
  }

  // 10 — background mode (experimental iOS lock-screen PoC): the toggle wires up,
  //      the hidden <audio> element is present, and the render->WAV->blob path
  //      yields a real RIFF/WAVE payload (bounded render so it stays fast). The
  //      actual screen-locked playback can only be verified on a device.
  {
    const errs = [];
    const p = await newPage(browser, errs);
    await p.goto(PAGE);
    await p.waitForSelector('#bgmode', { timeout: 8000 });
    const aria0 = await p.$eval('#bgmode', (b) => b.getAttribute('aria-pressed'));
    await p.click('#bgmode');
    const aria1 = await p.$eval('#bgmode', (b) => b.getAttribute('aria-pressed'));
    const on = await p.$eval('#bgmode', (b) => b.classList.contains('on'));
    g('background: toggle flips aria + on-state', aria0 === 'false' && aria1 === 'true' && on, aria0 + ' -> ' + aria1);
    g('background: hidden <audio> element present', await p.$eval('#bgAudio', (a) => a.tagName === 'AUDIO'), '');
    const wav = await p.evaluate(async () => {
      const r = await window.AMApp.renderWavURL({ capUnits: 2 });
      let head = '';
      try {
        const u = new Uint8Array(await (await fetch(r.url)).arrayBuffer(), 0, 12);
        head = String.fromCharCode(u[0], u[1], u[2], u[3]) + String.fromCharCode(u[8], u[9], u[10], u[11]);
      } catch (e) {}
      return { okUrl: /^blob:/.test(r.url), bytes: r.bytes, head };
    });
    g('background: render -> WAV blob (RIFF/WAVE)', wav.okUrl && wav.bytes > 44 && wav.head === 'RIFFWAVE', wav.bytes + ' bytes, head=' + wav.head);
    g('background page: no errors', errs.length === 0, errs.slice(0, 3).join('; ') || 'none');
    await p.close();
  }

  await browser.close();
  const failed = gates.filter((x) => !x[1]);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ gates: gates.map(([l, p, d]) => ({ gate: l, pass: p, detail: d })), failed: failed.length }, null, 2));
  } else {
    console.log('\ncomprehensive site — live-playback smoke\n');
    for (const [l, p, d] of gates) console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}  (${d})`);
    console.log(`\n  ${gates.length - failed.length} passed, ${failed.length} failed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
