// Builds public/og/cast.png, the social card.
//
// It is the hero sheet with the labels taken off: the same ruler, the same two control
// fields, the same nineteen figures on the same ramp. A card that shows a different
// picture from the page is a card that lies about the page.
//
//   npm run og
//
// Renders through the same browser the harness drives, with the project's own Archivo
// embedded as a data uri, and refuses to write a card set in the fallback face. A
// declared font is not a loaded font, so the check inspects the FontFace objects the
// page actually created rather than asking whether a spec can be rendered.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
import {
  svg, text, line, circle, rect, path, band, ramp, stress, scale, rng,
  INK, RULE, ALONE, NEAR, WHITE,
} from '../src/lib/marks/lib.js'

const root = new URL('../', import.meta.url)
const c = JSON.parse(readFileSync(new URL('data/census/cast.json', root), 'utf8'))

const W = 1200, H = 630
const PAD = 56
const PL = PAD, PR = W - PAD
const RMIN = -0.5, RMAX = 0.95
const x = scale(RMIN, RMAX, PL, PR)
const rand = rng(20260828)

const measured = c.constellations.filter((k) => k.median !== null).sort((a, b) => b.median - a.median)
const maxPeak = Math.max(...c.constellations.flatMap((k) => k.pages.map((q) => q.peak)))
const RADIUS = 13
const SEP = 46
const discR = (peak) => RADIUS * Math.sqrt(peak / maxPeak)
const bandW = (r) => (2.2 + 14 * Math.max(0, r)) * (RADIUS / 22)

const out = []
out.push(text(PAD, 76, 'The cast', { size: 54, weight: 600, fill: INK, tracking: -1 }))
out.push(text(PAD, 116, c.groups.inCast + ' of the ' + c.groups.total + " biggest days in Wikipedia's reading record belong to two, three or four pages at once.",
  { size: 21, fill: INK, opacity: 0.82 }))
out.push(text(PAD, 144, 'A year later those pages were still moving together.', { size: 21, fill: INK, opacity: 0.82 }))

// the ruler and its two control fields
const AXIS = 202
for (const t of [-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]) {
  out.push(line(x(t), AXIS, x(t), AXIS + 5, { stroke: RULE, width: 1 }))
  out.push(text(x(t), AXIS - 7, t.toFixed(1), { size: 14, anchor: 'middle', fill: INK, opacity: 0.6 }))
}
out.push(line(PL, AXIS, PR, AXIS, { stroke: RULE, width: 1 }))
out.push(text(PL, AXIS - 26, 'HOW CLOSELY THE TWO PAGES MOVED FOR THE YEAR AFTER',
  { size: 13, weight: 600, tracking: 1, fill: INK, opacity: 0.7 }))

const ticks = (rows, top, h, colour) => {
  const g = []
  const q = (v) => Math.round(v * 100) / 100
  for (const r of rows) {
    const tx = x(r)
    if (tx < PL || tx > PR) continue
    const ty = q(top + rand() * (h - 6))
    g.push('<line x1="' + q(tx) + '" y1="' + ty + '" x2="' + q(tx) + '" y2="' + q(ty + 6) +
      '" stroke="' + colour + '" stroke-width="1" opacity="0.5" />')
  }
  return g.join('')
}
out.push(ticks(c.bond.farValues, AXIS + 14, 26, ALONE))
out.push(ticks(c.bond.nearValues, AXIS + 44, 16, NEAR))

// the figures, on the band the controls define
const TOP = AXIS + 72
const PITCH = 17
const BOTTOM = TOP + measured.length * PITCH
out.push(rect(x(c.bond.p05), TOP - 14, x(c.bond.p95) - x(c.bond.p05), BOTTOM - TOP + 20, { fill: ALONE, opacity: 0.1 }))
for (const e of [c.bond.p05, c.bond.p95]) {
  out.push(line(x(e), TOP - 14, x(e), BOTTOM + 6, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
}
measured.forEach((k, i) => {
  const y = TOP + i * PITCH
  const pages = k.pages.filter((q) => q.measured)
  const rOf = (a, b) => k.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)).r
  const pos = stress(pages, (a, b) => SEP * (1 - rOf(pages[a].article, pages[b].article)))
  const cx = x(k.median)
  const at = (idx) => [cx + pos[idx][0], y + pos[idx][1] * 0.5]
  out.push('<g style="mix-blend-mode:multiply">')
  for (const e of k.edges) {
    const [ax, ay] = at(pages.findIndex((q) => q.article === e.a))
    const [bx, by] = at(pages.findIndex((q) => q.article === e.b))
    out.push(path(band(ax, ay, bx, by, bandW(e.r)), { fill: ramp(Math.max(0, e.r)), opacity: 0.52 }))
  }
  out.push('</g>')
  pages.forEach((q, idx) => {
    const [px, py] = at(idx)
    out.push(circle(px, py, discR(q.peak), { fill: ramp(Math.max(0, k.median)), opacity: 0.74, stroke: WHITE, width: 1.4 }))
  })
})

out.push(text(PAD, H - 30, 'One row is one record day. A disc is a page; the gap between two discs is how far apart they stayed.',
  { size: 15, fill: INK, opacity: 0.5 }))
out.push(text(W - PAD, H - 30, 'cast.dustincoledata.com', { size: 15, anchor: 'end', fill: INK, opacity: 0.5 }))

const sheet = svg(W, H, out.join(''), 'The cast')
mkdirSync(new URL('public/og/', root), { recursive: true })
writeFileSync(new URL('public/og/cast.svg', root), sheet)

const face = (w) => {
  const b = readFileSync(new URL('public/fonts/archivo-latin-' + w + '-normal.woff2', root))
  if (!b.length) throw new Error('empty face: ' + w)
  return '@font-face{font-family:Archivo;font-weight:' + w + ';font-style:normal;font-display:block;' +
    'src:url(data:font/woff2;base64,' + b.toString('base64') + ") format('woff2')}"
}
const html = '<!doctype html><meta charset="utf-8"><style>' + [400, 600].map(face).join('') +
  'html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>' + sheet

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
const loaded = await page.evaluate(() => {
  const got = [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === 'Archivo')
  return { faces: got.length, ready: got.filter((f) => f.status === 'loaded').length }
})
if (loaded.faces < 2 || loaded.ready < 2) {
  await browser.close()
  throw new Error('Archivo did not load for the card: ' + JSON.stringify(loaded))
}
await page.screenshot({ path: new URL('public/og/cast.png', root).pathname.slice(1) })
await browser.close()
console.log('public/og/cast.png  ' + W + 'x' + H + '  Archivo faces loaded ' + loaded.ready + '/' + loaded.faces)
