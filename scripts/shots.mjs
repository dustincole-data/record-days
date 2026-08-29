/**
 * Verification shots. Drives a real browser at real widths against the preview server.
 *
 *   node scripts/shots.mjs <baseUrl> <outDir> [onlyWidth]
 *
 * Phone widths are not a courtesy pass. Every section is shot WHOLE rather than as a
 * viewport tile, because what has to be checked on a mark is a shared scale and a row of
 * labels, and neither reads against anything but the rest of its own mark.
 *
 * FILL IN: SECTIONS. Add a section here the same commit you add it to the site.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4331/';
const OUT = process.argv[3] ?? 'shots';
const ONLY = process.argv[4];

const SECTIONS = [['#cast', 'cast'], ['#fame', 'fame'], ['#back', 'back'], ['#lag', 'lag'], ['#method', 'method']];

const SIZES = [
  { name: 'desktop-1440', w: 1440, h: 900, dpr: 1 },
  { name: 'laptop-1180', w: 1180, h: 820, dpr: 1 },
  { name: 'tablet-820', w: 820, h: 1180, dpr: 2 },
  { name: 'phone-390', w: 390, h: 844, dpr: 3, mobile: true },
  { name: 'phone-390-short', w: 390, h: 664, dpr: 3, mobile: true },
  { name: 'phone-320', w: 320, h: 568, dpr: 2, mobile: true },
];

fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: 'msedge', headless: true });
for (const s of SIZES) {
  if (ONLY && !s.name.includes(ONLY)) continue;
  const ctx = await b.newContext({
    viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr,
    isMobile: !!s.mobile, hasTouch: !!s.mobile,
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGE ERROR: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errs.push(`CONSOLE: ${m.text()}`));

  const t0 = Date.now();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const ready = Date.now() - t0;

  // Does the page scroll sideways? One leader line or a canvas a pixel too wide will do it,
  // and on a phone that silently zooms the whole viewport out.
  const m = await p.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    pageH: document.documentElement.scrollHeight,
  }));

  // A full-page shot is stitched from scrolled tiles, and past roughly 16k DEVICE pixels
  // tall Chrome hands back a stitch that silently REPEATS a chunk of the page — a page bug
  // that was never in the DOM. Shots that would cross the limit are retaken at dpr 1.
  const devH = m.pageH * s.dpr;
  let fullDpr = s.dpr;
  if (devH > 15500) {
    fullDpr = 1;
    const c2 = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1,
                                    isMobile: !!s.mobile, hasTouch: !!s.mobile });
    const p2 = await c2.newPage();
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.evaluate(() => document.fonts.ready);
    await p2.screenshot({ path: path.join(OUT, `${s.name}-full.png`), fullPage: true });
    await c2.close();
  } else {
    await p.screenshot({ path: path.join(OUT, `${s.name}-full.png`), fullPage: true });
  }

  for (const [sel, name] of SECTIONS) {
    const el = p.locator(sel);
    if (await el.count()) await el.screenshot({ path: path.join(OUT, `${s.name}-${name}.png`) });
  }

  console.log(
    `${s.name.padEnd(17)} ready ${String(ready).padStart(5)}ms  page ${m.pageH}px  ` +
    `hscroll ${m.docW > m.winW ? `YES (${m.docW} > ${m.winW})` : 'no'}` +
    (fullDpr !== s.dpr ? `  [full shot at dpr 1: ${devH}px would over-run the stitch]` : '') +
    (errs.length ? `\n  ${errs.join('\n  ')}` : '')
  );
  await ctx.close();
}
await b.close();
