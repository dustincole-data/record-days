// THE HERO: the nineteen constellations, on the ruler that measures them.
//
// A row is one record day. Inside a row a disc is a page and its area is the readers
// it took that day; the gap between two discs is how far apart the two pages stayed
// for the rest of the year, and the band joining them is the same number drawn as a
// thickness. The row sits on the sheet at the middle of its own ties.
//
// Above the rows, the two controls, drawn as themselves: every one of the 1,428 pairs
// of pages that did not share a record day, and every one of the 144 pairs whose days
// were within a fortnight of each other. Two constellations land inside them.
import { readFileSync } from 'node:fs'
import {
  svg, text, line, circle, rect, path, band, ramp, scale, stress, title,
  INK, RULE, ALONE, NEAR, WHITE, SOURCE,
} from './lib.mjs'

const c = JSON.parse(readFileSync(new URL('../../../data/census/cast.json', import.meta.url), 'utf8'))

const W = 1520, H = 1450
const DATE_X = 186                    // the date column, right aligned
const PL = 206, PR = 1066             // the ruler
const LABEL_X = 1090
const RMIN = -0.5, RMAX = 0.95
const PITCH = 48
const SEP = 78                        // pixels per unit of (1 minus the tie)
const RADIUS = 22                     // the largest disc on the sheet

const AXIS = 176
const FAR_TOP = 196, FAR_H = 46
const NEAR_TOP = 250, NEAR_H = 30
const TOP = 342

const x = scale(RMIN, RMAX, PL, PR)
const measured = c.constellations.filter((k) => k.median !== null).sort((a, b) => b.median - a.median)
const unmeasured = c.constellations.filter((k) => k.median === null).sort((a, b) => a.date.localeCompare(b.date))
const maxPeak = Math.max(...c.constellations.flatMap((k) => k.pages.map((q) => q.peak)))
const discR = (peak) => RADIUS * Math.sqrt(peak / maxPeak)
const rowY = (i) => TOP + i * PITCH
const BOTTOM = rowY(measured.length - 1) + 30

// A deterministic scatter for the control ticks, so a rebuild draws the same field.
let seed = 20260828 >>> 0
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296 }

const inside = measured.filter((k) => k.median <= c.bond.p95).length

const out = []

// ---------------------------------------------------------------------------
// the region a pair with no relationship occupies, carried faintly down the sheet
// ---------------------------------------------------------------------------
out.push(rect(x(c.bond.p05), TOP - 26, x(c.bond.p95) - x(c.bond.p05), BOTTOM - TOP + 46, { fill: ALONE, opacity: 0.1 }))
out.push(line(x(c.bond.p05), TOP - 26, x(c.bond.p05), BOTTOM + 20, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))

// ---------------------------------------------------------------------------
// the ruler
// ---------------------------------------------------------------------------
out.push(line(PL, AXIS, PR, AXIS, { stroke: RULE, width: 1 }))
for (const t of [-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]) {
  out.push(line(x(t), AXIS, x(t), AXIS + 6, { stroke: RULE, width: 1 }))
  out.push(text(x(t), AXIS - 8, t.toFixed(1), { size: 12, anchor: 'middle', fill: INK, opacity: 0.6 }))
}
out.push(text(PL, AXIS - 26, 'HOW CLOSELY THE TWO PAGES MOVED FOR THE YEAR AFTER', { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.7 }))
out.push(line(x(c.bond.p95), FAR_TOP - 6, x(c.bond.p95), BOTTOM + 16, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))

// ---------------------------------------------------------------------------
// the controls, drawn as every pair they contain
// ---------------------------------------------------------------------------
const ticks = (rows, top, h, colour, alpha, sc = x) => {
  const g = []
  const q = (v) => Math.round(v * 100) / 100
  for (const r of rows) {
    if (r < RMIN || r > RMAX) continue
    const tx = q(sc(r)), ty = q(top + rand() * (h - 7))
    g.push(`<line x1="${tx}" y1="${ty}" x2="${tx}" y2="${q(ty + 7)}" stroke="${colour}" stroke-width="1" opacity="${alpha}" />`)
  }
  return g.join('')
}
out.push(ticks(c.bond.farValues, FAR_TOP, FAR_H, ALONE, 0.5))
out.push(text(DATE_X, FAR_TOP + 14, 'no shared date', { size: 11.5, anchor: 'end', fill: INK, opacity: 0.72 }))
out.push(text(DATE_X, FAR_TOP + 29, `${c.bond.far.n.toLocaleString('en-US')} pairs`, { size: 11, anchor: 'end', fill: INK, opacity: 0.5 }))
out.push(ticks(c.bond.nearValues, NEAR_TOP, NEAR_H, NEAR, 0.5))
out.push(text(DATE_X, NEAR_TOP + 12, 'within a fortnight', { size: 11.5, anchor: 'end', fill: INK, opacity: 0.72 }))
out.push(text(DATE_X, NEAR_TOP + 27, `${c.bond.near.n} pairs`, { size: 11, anchor: 'end', fill: INK, opacity: 0.5 }))
out.push(line(PL, NEAR_TOP + NEAR_H + 22, PR + 400, NEAR_TOP + NEAR_H + 22, { stroke: RULE, width: 1 }))
out.push(text(DATE_X, TOP - 24, 'the same date', { size: 11.5, anchor: 'end', fill: INK, opacity: 0.72 }))
out.push(text(PL, TOP - 24, `${c.groups.casts} groups, ${c.bond.same.n} pairs`, { size: 11, fill: INK, opacity: 0.5 }))
out.push(text(x(c.bond.p95) - 6, TOP - 24, `90% of pairs that shared no date sit inside here`, { size: 11, anchor: 'end', fill: INK, opacity: 0.5 }))

// ---------------------------------------------------------------------------
// the constellations
// ---------------------------------------------------------------------------
measured.forEach((k, i) => {
  const y = rowY(i)
  const pages = k.pages.filter((q) => q.measured)
  const rOf = (a, b) => k.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)).r
  const pos = stress(pages, (a, b) => SEP * (1 - rOf(pages[a].article, pages[b].article)))
  const cx = x(k.median)
  const at = (idx) => [cx + pos[idx][0], y + pos[idx][1] * 0.6]

  // a page whose tie cannot be measured still had the record day: drawn hollow,
  // tied to the figure with a broken stub so the row is not silently short
  const missing = k.pages.filter((q) => !q.measured)
  const leftMost = Math.min(...pages.map((q, idx) => at(idx)[0] - discR(q.peak)))
  const holes = missing.map((q, j) => [leftMost - 8 - discR(q.peak) - j * 34, y])
  holes.forEach(([hx, hy], j) => {
    out.push(line(hx + discR(missing[j].peak), hy, j ? holes[j - 1][0] - discR(missing[j - 1].peak) : leftMost, hy,
      { stroke: INK, width: 1.2, dash: '2 3', opacity: 0.45 }))
  })

  out.push('<g style="mix-blend-mode:multiply">')
  for (const e of k.edges) {
    const ia = pages.findIndex((q) => q.article === e.a), ib = pages.findIndex((q) => q.article === e.b)
    const [ax, ay] = at(ia), [bx, by] = at(ib)
    out.push(path(band(ax, ay, bx, by, 2.2 + 14 * Math.max(0, e.r)), { fill: ramp(Math.max(0, e.r)), opacity: 0.52 }))
  }
  out.push('</g>')
  // discs go on top of the bands, each with a surface ring so two that overlap
  // still read as two pages
  pages.forEach((q, idx) => {
    const [px, py] = at(idx)
    out.push(circle(px, py, discR(q.peak), { fill: ramp(Math.max(0, k.median)), opacity: 0.74, stroke: WHITE, width: 1.6 }))
  })
  holes.forEach(([hx, hy], j) => out.push(circle(hx, hy, discR(missing[j].peak), { fill: WHITE, stroke: INK, width: 1, opacity: 0.42 })))

  out.push(text(DATE_X, y + 4, k.date, { size: 11.5, anchor: 'end', fill: INK, opacity: 0.55 }))

  const names = k.pages.map((q) => title(q.article))
  const lines = []
  let cur = ''
  for (const t of names) {
    const add = cur ? `${cur} + ${t}` : t
    if (add.length > 44 && cur) { lines.push(`${cur} +`); cur = t } else cur = add
  }
  lines.push(cur)
  lines.forEach((s, j) => out.push(text(LABEL_X, y + 4 - (lines.length - 1) * 7 + j * 14, s, { size: 12.5, fill: INK, opacity: 0.88 })))
})

// ---------------------------------------------------------------------------
// the two that cannot be measured. A missing reading is not a zero.
// ---------------------------------------------------------------------------
const TRAY = BOTTOM + 40
out.push(line(PL - 90, TRAY - 24, PR + 400, TRAY - 24, { stroke: RULE, width: 1 }))
out.push(text(PL - 90, TRAY - 6, 'NO MEASUREMENT', { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.7 }))
unmeasured.forEach((k, i) => {
  const y = TRAY + 24 + i * 42
  k.pages.forEach((q, j) => out.push(circle(PL - 66 + j * 52, y, discR(q.peak), { fill: WHITE, stroke: INK, width: 1, opacity: 0.42 })))
  const tx = PL - 66 + k.pages.length * 52 + 4
  out.push(text(tx, y, `${k.date}   ${k.pages.map((q) => title(q.article)).join(' + ')}`, { size: 12, fill: INK, opacity: 0.76 }))
  out.push(text(tx, y + 16, k.pages.some((q) => q.renamed)
    ? 'one page was renamed, so its readings after the move measure the move'
    : 'the record day is too recent for a year of readings', { size: 11, fill: INK, opacity: 0.5 }))
})

// ---------------------------------------------------------------------------
// legend
// ---------------------------------------------------------------------------
const LY = TRAY + 132
out.push(line(PL - 90, LY - 30, PR + 400, LY - 30, { stroke: RULE, width: 1 }))
const head = (hx, s) => out.push(text(hx, LY - 10, s, { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.7 }))

const big = c.constellations.flatMap((k) => k.pages).sort((a, b) => b.peak - a.peak)[0]
const small = c.constellations.flatMap((k) => k.pages).sort((a, b) => a.peak - b.peak)[0]
head(PL - 90, 'A DISC IS A PAGE')
out.push(circle(PL - 90 + discR(big.peak), LY + 34, discR(big.peak), { fill: INK, opacity: 0.13, stroke: WHITE, width: 1.6 }))
out.push(circle(PL - 90 + 2 * discR(big.peak) + discR(small.peak) + 22, LY + 34, discR(small.peak), { fill: INK, opacity: 0.13, stroke: WHITE, width: 1.6 }))
out.push(text(PL - 90, LY + 72, `its area is the readers it took that day, ${(small.peak / 1e6).toFixed(1)}m to ${(big.peak / 1e6).toFixed(1)}m`, { size: 11.5, fill: INK, opacity: 0.6 }))

const GX = PL + 190
head(GX, 'THE GAP IS HOW FAR APART THEY STAYED')
;[[0.9, 'still moving together'], [0.4, ''], [0.05, 'moving apart']].forEach(([r, label], i) => {
  const gy = LY + 34, gx = GX + 14 + i * 176
  const d = SEP * (1 - r)
  out.push(`<g style="mix-blend-mode:multiply">${path(band(gx, gy, gx + d, gy, 2.2 + 14 * r), { fill: ramp(r), opacity: 0.52 })}</g>`)
  out.push(circle(gx, gy, 12, { fill: ramp(r), opacity: 0.74, stroke: WHITE, width: 1.6 }))
  out.push(circle(gx + d, gy, 12, { fill: ramp(r), opacity: 0.74, stroke: WHITE, width: 1.6 }))
  out.push(text(gx - 12, gy + 32, r.toFixed(2), { size: 11.5, fill: INK, opacity: 0.6 }))
  if (label) out.push(text(gx - 12, gy + 47, label, { size: 11, fill: INK, opacity: 0.45 }))
})

const FX = PL + 800
head(FX, 'THE TWO CONTROLS')
const lsc = scale(RMIN, RMAX, FX, FX + 230)
out.push(ticks(c.bond.farValues.filter((_, i) => i % 3 === 0), LY + 16, 22, ALONE, 0.5, lsc))
out.push(ticks(c.bond.nearValues, LY + 46, 18, NEAR, 0.5, lsc))
out.push(text(FX + 244, LY + 31, `no shared date, half at ${c.bond.far.median}`, { size: 11.5, fill: INK, opacity: 0.6 }))
out.push(text(FX + 244, LY + 59, `within a fortnight, half at ${c.bond.near.median}`, { size: 11.5, fill: INK, opacity: 0.6 }))

// ---------------------------------------------------------------------------
// type
// ---------------------------------------------------------------------------
out.unshift(
  text(PL - 90, 58, 'The cast', { size: 30, weight: 600, fill: INK, tracking: -0.4 }),
  text(PL - 90, 90, `${c.groups.inCast} of the ${c.groups.total} biggest reading days in Wikipedia's record are not one page having a day. They are two, three or four pages having the same day, in ${c.groups.casts} groups.`, { size: 14, fill: INK, opacity: 0.8 }),
  text(PL - 90, 110, `A year later those pages were still moving together. Half the same-day pairs sit at ${c.bond.same.median}; half the pairs that shared no date sit at ${c.bond.far.median}. ${inside} of the ${measured.length} measurable groups do not separate from the strangers at all.`, { size: 14, fill: INK, opacity: 0.8 }),
)
out.push(text(PL - 90, H - 46, SOURCE, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PL - 90, H - 31, `The tie is the correlation of the two pages' daily readings over days 30 to 340 after each peak, after each page's own 29-day trend is removed, matched on calendar date and requiring ${c.definitions.sharedMin} shared days. ${c.bond.rows} of ${c.groups.total} pages measurable.`, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PL - 90, H - 16, `Every figure computed from the file by src/lib/findings.js. Nothing typed by hand.`, { size: 10.5, fill: INK, opacity: 0.45 }))

process.stdout.write(svg(W, H, out.join('\n')))
