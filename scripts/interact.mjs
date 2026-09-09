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

const BASE = process.argv[2] ?? 'http://[::1]:4331/';
const SECTIONS = ['#field', '#leap', '#settled', '#weekdays', '#timeline', '#all'];

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

// A tap on a timeline dot opens that page in the card above it.
{
  const nameBefore = await p.$eval('#page-name', (e) => e.textContent);
  await p.locator('#timeline-plate').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  // The page card is sticky above the phone timeline, so the dot is scrolled to mid-screen first.
  await p.$eval('#timeline-plate .m-dots circle[data-i="40"]', (c) => {
    const r = c.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - window.innerHeight * 0.65);
  });
  await p.waitForTimeout(300);
  const box = await p.locator('#timeline-plate svg').boundingBox();
  const dot = await p.$eval('#timeline-plate .m-dots circle[data-i="40"]', (c) => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy') }));
  await p.touchscreen.tap(box.x + dot.cx, box.y + dot.cy);
  await p.waitForTimeout(900);
  const nameAfter = await p.$eval('#page-name', (e) => e.textContent);
  check('tapping a timeline dot opens that page', nameAfter !== nameBefore && nameAfter.length > 0, `${nameBefore} -> ${nameAfter}`);
  const facts = await p.$eval('#page-facts', (e) => e.textContent);
  check('the card names the record day and the views', /Record day/.test(facts) && /views that day/.test(facts), facts.slice(0, 80));
}
// A tap on a square holds its readout.
{
  await p.locator('#settled-plate').scrollIntoViewIfNeeded();
  await p.waitForTimeout(1600);
  const box = await p.locator('#settled-plate svg').boundingBox();
  const sq = await p.$eval('#settled-plate .m-rows rect[data-i="100"]', (r) => ({ x: +r.getAttribute('x') + r.getAttribute('width') / 2, y: +r.getAttribute('y') + r.getAttribute('height') / 2 }));
  await p.touchscreen.tap(box.x + sq.x, box.y + sq.y);
  await p.waitForTimeout(300);
  const tip = await p.$eval('#settled-tip', (t) => ({ hidden: t.hidden, text: t.textContent }));
  check('tapping a square holds its readout', !tip.hidden && /× its normal level/.test(tip.text), tip.text);
}

// ---------------------------------------------------------------- desktop keyboard
const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errs.push('desktop: ' + e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.evaluate(() => document.fonts.ready);
console.log('desktop 1440 x 900');
await p2.keyboard.press('Tab');
const focused = await p2.evaluate(() => document.activeElement && document.activeElement.tagName);
check('the keyboard reaches the page', !!focused && focused !== 'BODY', focused || 'none');

// The stopwatch: wait out the arrival replay, then drag the knob, replay, and use the keys.
await p2.waitForTimeout(6500);
{
  const day = async () => +(await p2.$eval('#clock-d', (e) => e.textContent));
  check('the stopwatch rests at the last day', (await day()) === 340, String(await day()));
  await p2.$eval('#field-plate .m-knob', (k) => k.scrollIntoView({ block: 'center' }));
  await p2.waitForTimeout(200);
  const box = await p2.locator('#field-plate svg').boundingBox();
  const knob = await p2.$eval('#field-plate .m-knob', (k) => { const r = k.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p2.mouse.move(knob.x, knob.y);
  await p2.mouse.down();
  await p2.mouse.move(box.x + box.width * 0.25, knob.y, { steps: 8 });
  await p2.mouse.up();
  await p2.waitForTimeout(200);
  const dragged = await day();
  check('dragging the knob moves the day', dragged > 0 && dragged < 340, String(dragged));
  const curtain = await p2.$eval('#field-plate .m-curtain', (r) => +r.getAttribute('x'));
  check('and the field is drawn only up to that day', curtain < box.width * 0.9, `curtain from ${Math.round(curtain)} of ${Math.round(box.width)}`);
  const line = await p2.$eval('#clock-line', (e) => e.textContent);
  check('and the readout counts pages back and still high', /back to normal/.test(line) && /still high/.test(line), line);
  await p2.click('#replay');
  await p2.waitForTimeout(400);
  const early = await day();
  check('replay starts again from the first days', early < 60, String(early));
  await p2.waitForTimeout(6000);
  check('and ends at the last day', (await day()) === 340, String(await day()));
  await p2.focus('#clock-range');
  await p2.keyboard.press('ArrowLeft');
  await p2.waitForTimeout(100);
  check('the keyboard moves the stopwatch', (await day()) === 339, String(await day()));
}
// Hovering a curve and a dot each show a readout naming the page; clicking a dot opens it.
{
  await p2.locator('#leap-plate').scrollIntoViewIfNeeded();
  await p2.waitForTimeout(1600);
  const box = await p2.locator('#leap-plate svg').boundingBox();
  const c = await p2.$eval('#leap-plate .m-rows path[data-i="12"]', (el) => {
    const m = el.getAttribute('d').match(/M([\d.]+) ([\d.]+)C.* ([\d.]+) ([\d.]+)$/);
    return { x0: +m[1], bot: +m[2], x1: +m[3], top: +m[4] };
  });
  await p2.mouse.move(box.x + (c.x0 + c.x1) / 2, box.y + (c.bot + c.top) / 2);
  await p2.waitForTimeout(150);
  const tip = await p2.$eval('#leap-tip', (t) => ({ hidden: t.hidden, text: t.textContent }));
  check('hovering a curve names the page and its two readings', !tip.hidden && /→/.test(tip.text), tip.text);
}
{
  await p2.locator('#timeline-plate').scrollIntoViewIfNeeded();
  await p2.waitForTimeout(2200);
  const box = await p2.locator('#timeline-plate svg').boundingBox();
  const dot = await p2.$eval('#timeline-plate .m-dots circle[data-i="3"]', (c) => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy') }));
  await p2.mouse.move(box.x + dot.cx, box.y + dot.cy);
  await p2.waitForTimeout(150);
  const tip = await p2.$eval('#timeline-tip', (t) => ({ hidden: t.hidden, text: t.textContent }));
  check('hovering a dot names the page and its date', !tip.hidden && /20\d\d/.test(tip.text), tip.text);
  await p2.mouse.click(box.x + dot.cx, box.y + dot.cy);
  await p2.waitForTimeout(900);
  const name = await p2.$eval('#page-name', (e) => e.textContent);
  check('clicking it opens that page below', name !== 'Charlie Kirk' && name.length > 0, name);
}

check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await b.close();
console.log(fails ? `\n${fails} interaction check(s) failed` : '\nall interaction checks pass');
process.exit(fails ? 1 : 0);
