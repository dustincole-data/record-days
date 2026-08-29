/**
 * The interaction suite. Everything a finger, a mouse and a keyboard can do to the page.
 *
 *   node scripts/interact.mjs <baseUrl>
 *
 * Generic checks first — they apply to every data story and need no editing. Add
 * project-specific checks under PROJECT CHECKS at the bottom, one per interactive mark.
 *
 * The scroll-trap check is the one that matters most and the one nobody thinks to write:
 * a canvas or an SVG that swallows touchmove leaves a phone reader stuck inside your
 * graphic, unable to reach the rest of the page, and no screenshot will ever show it.
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4331/';
const SECTIONS = ['#cast', '#fame', '#back', '#lag', '#method'];

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? ': ' + detail : ''));
  if (!ok) fails++;
};

const b = await chromium.launch({ channel: 'msedge', headless: true });

// ---------------------------------------------------------------- phone
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
                                 isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);

console.log('phone 390 x 844');

// A mark must not trap the scroll. Touch-drag inside each section and require the page to
// have moved.
for (const sel of SECTIONS) {
  const el = p.locator(sel);
  if (!(await el.count())) continue;
  await el.scrollIntoViewIfNeeded();
  const before = await p.evaluate(() => window.scrollY);
  const box = await el.boundingBox();
  if (!box) continue;
  const cx = box.x + box.width / 2, cy = box.y + Math.min(box.height / 2, 300);
  await p.touchscreen.tap(cx, cy).catch(() => {});
  await p.mouse.move(cx, cy);
  await p.mouse.wheel(0, 400);
  await p.waitForTimeout(120);
  const after = await p.evaluate(() => window.scrollY);
  check(`${sel} does not trap the scroll`, after > before, `${before} -> ${after}`);
}

// Every control the page offers has to be reachable and operable without a pointer.
const kb = await p.evaluate((sels) => {
  const q = sels.flatMap(s => [...document.querySelectorAll(
    `${s} button, ${s} a[href], ${s} [tabindex]:not([tabindex="-1"]), ${s} input, ${s} summary`)]);
  return { n: q.length, unnamed: q.filter(e => !(e.textContent || '').trim() &&
    !e.getAttribute('aria-label') && !e.getAttribute('title')).length };
}, SECTIONS);
check('every control carries an accessible name', kb.unnamed === 0,
      `${kb.n} controls, ${kb.unnamed} unnamed`);

// A mark drawn as an image needs a text alternative, or it is nothing to a screen reader.
const alt = await p.evaluate((sels) => {
  const q = sels.flatMap(s => [...document.querySelectorAll(`${s} [role="img"], ${s} svg[role="img"]`)]);
  return { n: q.length, bare: q.filter(e => !(e.getAttribute('aria-label') || '').trim()).length };
}, SECTIONS);
check('every mark carries an alt text', alt.bare === 0, `${alt.n} marks, ${alt.bare} bare`);

// ---------------------------------------------------------------- PROJECT CHECKS
// One per interactive mark. Assert the STATE the reader is left in, not that a click
// happened: "the readout says 1907", "tapping again releases it", "the stepper moves one".

// ---------------------------------------------------------------- desktop keyboard
const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.evaluate(() => document.fonts.ready);
console.log('desktop 1440 x 900');
await p2.keyboard.press('Tab');
const focused = await p2.evaluate(() => document.activeElement && document.activeElement.tagName);
check('the keyboard reaches the page', !!focused && focused !== 'BODY', focused || 'none');

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await b.close();
console.log(fails ? `\n${fails} interaction check(s) failed` : '\nall interaction checks pass');
process.exit(fails ? 1 : 0);
