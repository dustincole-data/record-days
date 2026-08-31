/**
 * The width ladder.
 *
 *   node scripts/ladder.mjs <baseUrl>
 *
 * gate.mjs checks four widths against the viewport. This checks TEN widths against each
 * PLATE, which is a different question and catches a different class of bug:
 *
 *   - one type size per plate per width. Two sizes inside one mark means a stylesheet and
 *     the mark's own layout maths are measuring different boxes.
 *   - every label inside its own plate, measured against the SVG's box rather than the
 *     viewport. A label can sit outside a mark and still be inside the page.
 *   - no two labels overlapping. A leader column that is fine at 1440 and fine at 390 can
 *     collide at 700, because a label column moves with the width and a row does not.
 *   - the SVG's rendered width equals the box it was drawn for. If those differ the mark is
 *     being scaled, and every size the gate measured is a size of a scaled drawing.
 *
 * It found two real bugs the first time it was run: the two lines of every beat-04 row label
 * overlapping at all widths, and a caption in beat 01 running under the name column between
 * about 660 and 820. Neither is visible to gate.mjs, shots.mjs or interact.mjs.
 *
 * FILL IN: SEL and WIDTHS. Add a section here the same commit you add it to the site.
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://[::1]:4331/';
const SEL = ['#held', '#arrival', '#settle', '#groups'];

// The extremes, plus the widths where a layout folds: 620/660/700 straddle the plate-box
// breakpoint and 820 is where a label column is widest against the room it has.
const WIDTHS = [320, 360, 390, 500, 620, 660, 700, 820, 1180, 1440];

const b = await chromium.launch({ channel: 'msedge', headless: true });
let fails = 0;
for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1,
                                   isMobile: w < 640, hasTouch: w < 640 });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const r = await p.evaluate((sels) => {
    const out = [];
    for (const sel of sels) {
      const svg = document.querySelector(sel + ' svg.plate');
      if (!svg) { out.push({ sel, err: 'no plate' }); continue; }
      const box = svg.getBoundingClientRect();
      const texts = [...svg.querySelectorAll('text')];
      const sizes = [...new Set(texts.map((t) => parseFloat(getComputedStyle(t).fontSize)))];
      const outside = [], boxes = [];
      for (const t of texts) {
        const rc = t.getBoundingClientRect();
        if (!rc.width) continue;
        boxes.push({ t: t.textContent.slice(0, 22), rc });
        if (rc.left < box.left - 0.5 || rc.right > box.right + 0.5 ||
            rc.top < box.top - 0.5 || rc.bottom > box.bottom + 0.5) {
          outside.push({ t: t.textContent.slice(0, 26),
                         l: Math.round(rc.left - box.left), r: Math.round(rc.right - box.left) });
        }
      }
      const laps = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].rc, c = boxes[j].rc;
        if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1.5 &&
            Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1.5) {
          laps.push(boxes[i].t + '  |  ' + boxes[j].t);
        }
      }
      out.push({ sel, sizes, outside, laps: laps.slice(0, 6),
                 svgW: Math.round(box.width), boxW: Math.round(svg.parentElement.clientWidth) });
    }
    return { out, hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, SEL);

  const bad = [];
  for (const s of r.out) {
    if (s.err) { bad.push(`${s.sel}: ${s.err}`); continue; }
    if (s.sizes.length > 1) bad.push(`${s.sel}: ${s.sizes.length} type sizes ${JSON.stringify(s.sizes)}`);
    if (Math.abs(s.svgW - s.boxW) > 1) bad.push(`${s.sel}: drawn for ${s.boxW} and rendered ${s.svgW}`);
    for (const o of s.outside) bad.push(`${s.sel}: OUTSIDE "${o.t}"  x ${o.l}..${o.r}`);
    for (const l of s.laps) bad.push(`${s.sel}: OVERLAP ${l}`);
  }
  if (r.hscroll > 0) bad.push(`page scrolls sideways ${r.hscroll}px`);
  fails += bad.length;
  console.log(String(w).padStart(5) + '  ' + (bad.length ? 'PROBLEMS' : 'clean') +
              '   type sizes ' + r.out.map((s) => (s.sizes || ['?']).join('/')).join(' '));
  for (const x of bad) console.log('        ' + x);
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} problem(s)` : '\nLADDER CLEAN');
process.exit(fails ? 1 : 0);
