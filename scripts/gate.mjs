/**
 * The legibility gate, run against the real page.
 *
 *   node scripts/gate.mjs <baseUrl>
 *
 * Four things, on every section, at the widths that decide:
 *   - nothing that labels a graphic prints below 14px on a desktop or 13px on a phone
 *   - no label is cut off by its own box, and none sits outside the viewport
 *   - the PAGE does not scroll sideways
 *   - the project's faces are actually LOADED, not merely declared
 *
 * A declared font is not a loaded font: if the woff2 404s, the page silently falls back and
 * every size measured above is a size of the wrong typeface.
 *
 * The obvious way to check that is `document.fonts.check('16px "Family"')`, and it is a
 * NO-OP. That call asks "can you render this spec?", which a fallback satisfies, so it
 * returns true for a family that does not exist at all — measured, on a live site, against
 * a name invented for the test. The check below inspects the FontFace objects the page
 * actually created: a family with zero faces, or none of them reaching `loaded`, is a
 * family the browser is faking.
 *
 * FILL IN two constants: SEL (every section id) and FACES (the family names as declared in
 * @font-face, without size or quotes). Everything else is subject-agnostic.
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://[::1]:4331/';

// Every section on the page. Add a section here the same commit you add it to the site —
// a section missing from this list is a section nobody checked.
const SEL = '#held, #arrival, #settle, #groups, #artefact, #weekday, #shared';
const FACES = ['Martian Mono', 'Schibsted Grotesk', 'Archivo'];

// 820 is not decoration. It is where multi-column plates fold to one and labels pinned to a
// panel's gutter are widest against the room they have — the width at which a page-wide
// horizontal scroll hides from both 1440 and 390.
const SIZES = [
  { name: 'desktop-1440', w: 1440, h: 900, min: 14 },
  { name: 'tablet-820', w: 820, h: 1180, min: 14 },
  { name: 'phone-390', w: 390, h: 844, min: 13, mobile: true },
  { name: 'phone-320', w: 320, h: 568, min: 13, mobile: true },
];

const b = await chromium.launch({ channel: 'msedge', headless: true });
let fails = 0;
for (const s of SIZES) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1,
                                   isMobile: !!s.mobile, hasTouch: !!s.mobile });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(async ({ sel, min, faces }) => {
    const out = { small: [], overflow: [], clipped: [] };
    const seen = new Set();
    for (const sec of document.querySelectorAll(sel)) {
      for (const el of sec.querySelectorAll('*')) {
        const txt = (el.textContent || '').trim();
        if (!txt || el.children.length) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rc = el.getBoundingClientRect();
        if (!rc.width || !rc.height) continue;
        const fs = parseFloat(cs.fontSize);
        if (fs < min) {
          const k = `${fs}|${txt.slice(0, 24)}`;
          if (!seen.has(k)) { seen.add(k); out.small.push({ fs, txt: txt.slice(0, 34), cls: el.className }); }
        }
        // a label wider than its own line box, i.e. cut off
        if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') {
          out.clipped.push({ txt: txt.slice(0, 34), cls: el.className });
        }
        if (rc.right > document.documentElement.clientWidth + 0.5 || rc.left < -0.5) {
          out.overflow.push({ txt: txt.slice(0, 30), cls: el.className,
                              l: Math.round(rc.left), r: Math.round(rc.right) });
        }
      }
    }
    // font-display: swap loads lazily, so ask for each family before judging it.
    for (const f of faces) { try { await document.fonts.load(`16px "${f}"`); } catch (e) {} }
    out.fonts = faces.map((f) => {
      const got = [...document.fonts].filter(ff => ff.family.replace(/["']/g, '') === f);
      return got.length > 0 && got.some(ff => ff.status === 'loaded');
    });
    out.hscroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  }, { sel: SEL, min: s.min, faces: FACES });

  const bad = r.small.length + r.overflow.length + r.clipped.length + (r.hscroll > 0 ? 1 : 0);
  fails += bad + (r.fonts.every(Boolean) ? 0 : 1);
  console.log(`${s.name}  min ${s.min}px  under-gate ${r.small.length}  off-canvas ${r.overflow.length}  ` +
              `clipped ${r.clipped.length}  hscroll ${r.hscroll > 0 ? `${r.hscroll}px` : 'no'}  fonts loaded ${r.fonts}`);
  for (const x of r.small.slice(0, 8)) console.log(`   SMALL ${x.fs}px  "${x.txt}"  .${x.cls}`);
  for (const x of r.overflow.slice(0, 8)) console.log(`   OFF   ${x.l}..${x.r}  "${x.txt}"  .${x.cls}`);
  for (const x of r.clipped.slice(0, 8)) console.log(`   CLIP  "${x.txt}"  .${x.cls}`);
  await ctx.close();
}
await b.close();
console.log(fails ? `AUDIT FAILURES: ${fails}` : 'AUDIT CLEAN');
process.exit(fails ? 1 : 0);
