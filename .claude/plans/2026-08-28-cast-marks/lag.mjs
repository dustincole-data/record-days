// SUPPORTING MARK 3: the tie is to the exact day.
//
// Every same-day pair, scored seven times: once with the two calendars aligned, and
// once for each of the six days either side. One dot is one pair, coloured by its own
// value on the ramp the whole piece uses. Shift one page's calendar by a single day
// and a third of the tie is gone; by three days and the row has fallen back into the
// field where two unrelated pages live.
import { readFileSync } from 'node:fs'
import {
  svg, text, line, circle, rect, ramp, scale,
  INK, RULE, ALONE, WHITE, SOURCE,
} from './lib.mjs'

const c = JSON.parse(readFileSync(new URL('../../../data/census/cast.json', import.meta.url), 'utf8'))

const W = 1520, H = 860
const PAD = 116
const PL = 400, PR = 1200
const RMIN = -0.5, RMAX = 0.95
const TOP = 262, PITCH = 76, R = 6, HALF = 30

const x = scale(RMIN, RMAX, PL, PR)
const out = []

// the control the rows fall back into
out.push(rect(x(c.bond.p05), TOP - 62, x(c.bond.p95) - x(c.bond.p05), 6 * PITCH + 124, { fill: ALONE, opacity: 0.1 }))
out.push(line(x(c.bond.p05), TOP - 62, x(c.bond.p05), TOP + 6 * PITCH + 62, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
out.push(line(x(c.bond.p95), TOP - 62, x(c.bond.p95), TOP + 6 * PITCH + 62, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
out.push(text(x(c.bond.p95) - 6, TOP - 70, '90% of pairs that shared no record day sit inside here', { size: 11, anchor: 'end', fill: INK, opacity: 0.5 }))

// the ruler
out.push(line(PL, TOP - 44, PR, TOP - 44, { stroke: RULE, width: 1 }))
for (const t of [-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]) {
  out.push(line(x(t), TOP - 44, x(t), TOP - 38, { stroke: RULE, width: 1 }))
  out.push(text(x(t), TOP - 52, t.toFixed(1), { size: 11.5, anchor: 'middle', fill: INK, opacity: 0.6 }))
}
out.push(text(PL, TOP - 96, 'HOW CLOSELY THE TWO PAGES MOVED, WITH ONE CALENDAR SHIFTED', { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.72 }))
out.push(text(PR + 22, TOP - 52, 'MEDIAN', { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.6 }))

const label = (k) => {
  if (k === 0) return 'the same day'
  const d = Math.abs(k)
  return `${d} day${d === 1 ? '' : 's'} ${k < 0 ? 'earlier' : 'later'}`
}

c.bond.lag.forEach((l, i) => {
  const y = TOP + i * PITCH
  out.push(line(PL, y, PR, y, { stroke: RULE, width: 1, opacity: 0.5 }))
  // one dot per pair, stacked where they crowd
  const placed = []
  for (const v of l.values.slice().sort((a, b) => a - b)) {
    const px = x(v)
    let step = 0, py = y
    while (placed.some((q) => Math.hypot(q[0] - px, q[1] - py) < 2 * R + 0.8) && step < 12) {
      step++
      const off = Math.ceil(step / 2) * (2 * R + 0.8) * 0.9
      if (off > HALF) break
      py = y + (step % 2 ? 1 : -1) * off
    }
    placed.push([px, py])
    out.push(circle(px, py, R, { fill: ramp(Math.max(0, v)), opacity: 0.74, stroke: WHITE, width: 1.3 }))
  }
  out.push(line(x(l.median), y - HALF - 5, x(l.median), y + HALF + 5, { stroke: INK, width: 1.6, opacity: k0(i) ? 0.85 : 0.55 }))
  out.push(text(PR + 22, y + 5, l.median.toFixed(3), { size: 13, weight: k0(i) ? 600 : 400, fill: INK, opacity: k0(i) ? 0.9 : 0.62 }))
  out.push(text(PL - 24, y + 5, label(l.lag), { size: 13, weight: k0(i) ? 600 : 400, anchor: 'end', fill: INK, opacity: k0(i) ? 0.92 : 0.6 }))
})
function k0(i) { return c.bond.lag[i].lag === 0 }

const drop = c.bond.lag.find((l) => l.lag === 0).median - Math.max(...c.bond.lag.filter((l) => Math.abs(l.lag) === 1).map((l) => l.median))
out.unshift(
  text(PAD, 58, 'The tie is to the exact day', { size: 30, weight: 600, fill: INK, tracking: -0.4 }),
  text(PAD, 90, `The ${c.bond.same.n} pairs of pages that shared a record day, scored again with one page's calendar moved a day at a time. Aligned, half of them sit at ${c.bond.lag.find((l) => l.lag === 0).median}.`, { size: 14, fill: INK, opacity: 0.8 }),
  text(PAD, 110, `One day out and that falls to ${c.bond.lag.find((l) => l.lag === 1).median}, a drop of ${Math.abs(drop).toFixed(3)}. Three days out and the whole row is back inside the field where two unrelated pages live.`, { size: 14, fill: INK, opacity: 0.8 }),
)
out.push(text(PAD, H - 44, SOURCE, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 29, `The near-miss control says the same thing from the other side: pairs whose record days were 1 to ${c.definitions.near} days apart, and so belonged to the same news season, sit at ${c.bond.near.median} over ${c.bond.near.n} pairs.`, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 14, 'Every figure computed from the file by src/lib/findings.js. Nothing typed by hand.', { size: 10.5, fill: INK, opacity: 0.45 }))

process.stdout.write(svg(W, H, out.join('\n')))
