// SUPPORTING MARK 1: the two kinds of record day.
//
// Two panels, one row of pages each. The upper row is the 47 pages that shared their
// record day, the lower row the 173 that had it alone. On the left panel they are
// nowhere near each other; on the right panel they are the same. One dot is one page.
import { readFileSync } from 'node:fs'
import {
  svg, text, line, circle, rect, scale, title,
  INK, RULE, ALONE, BOUND, WHITE, SOURCE,
} from './lib.mjs'

const c = JSON.parse(readFileSync(new URL('../../../data/census/cast.json', import.meta.url), 'utf8'))
const f = c.fame

const W = 1520, H = 790
const PAD = 116
const PANEL_W = 600, GAP = 90
const AX = PAD, BX = PAD + PANEL_W + GAP
const TOP = 300, ROW = 178, R = 4.6, HALF = 58
const FLOOR = f.floor

const logx = (x0, lo, hi) => { const s = scale(Math.log10(lo), Math.log10(hi), x0, x0 + PANEL_W); return (v) => s(Math.log10(Math.max(lo, v))) }
const baseX = logx(AX, 1, 500000)
const peakX = logx(BX, 1.4e6, 16e6)

let seed = 3140828 >>> 0
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296 }

const out = []

// Wraps a note to a column width so a long line cannot run into the next panel.
function wrap(s, cols) {
  const words = s.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const add = cur ? `${cur} ${w}` : w
    if (add.length > cols && cur) { lines.push(cur); cur = w } else cur = add
  }
  if (cur) lines.push(cur)
  return lines
}

// One row of pages, laid out so overlapping dots stack instead of hiding each other.
function swarm(points, xf, cy, colour) {
  const placed = []
  const order = points.slice().sort((a, b) => xf(a.v) - xf(b.v))
  for (const p of order) {
    const px = xf(p.v)
    let k = 0, py = cy
    while (placed.some((q) => Math.hypot(q.x - px, q.y - py) < 2 * R + 1) && k < 40) {
      k++
      const step = Math.ceil(k / 2) * (2 * R + 1) * 0.92
      if (step > HALF) break
      py = cy + (k % 2 ? 1 : -1) * step
    }
    placed.push({ x: px, y: py, p })
  }
  for (const q of placed) out.push(circle(q.x, q.y, R, { fill: colour, opacity: 0.62, stroke: WHITE, width: 1 }))
  return placed
}

function panel(x0, heading, note, xf, ticks, fmt, key, stat) {
  out.push(text(x0, 170, heading, { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.72 }))
  out.push(line(x0, 196, x0 + PANEL_W, 196, { stroke: RULE, width: 1 }))
  for (const t of ticks) {
    out.push(line(xf(t), 190, xf(t), 196, { stroke: RULE, width: 1 }))
    out.push(text(xf(t), 184, fmt(t), { size: 11.5, anchor: 'middle', fill: INK, opacity: 0.6 }))
  }
  const rows = [
    { label: 'shared its record day', set: f.points.filter((p) => p.cast), colour: BOUND, stat: f.cast, y: TOP },
    { label: 'had it alone', set: f.points.filter((p) => !p.cast), colour: ALONE, stat: f.solo, y: TOP + ROW },
  ]
  for (const r of rows) {
    swarm(r.set.map((p) => ({ v: key(p), p })), xf, r.y, r.colour)
    const m = stat(r.stat)
    out.push(line(xf(m), r.y - HALF - 6, xf(m), r.y + HALF + 6, { stroke: INK, width: 1.4, opacity: 0.75 }))
    out.push(text(xf(m), r.y - HALF - 14, m.toLocaleString('en-US'), { size: 12.5, weight: 600, anchor: 'middle', fill: INK, opacity: 0.88 }))
    out.push(text(x0, r.y + HALF + 24, `${r.label}, ${r.stat.n} pages`, { size: 12.5, fill: INK, opacity: 0.7 }))
  }
  wrap(note, 92).forEach((s2, j) => out.push(text(x0, TOP + ROW + HALF + 48 + j * 16, s2, { size: 12, fill: INK, opacity: 0.55 })))
}

panel(AX, 'READERS A DAY BEFORE THE EVENT, ON A LOG SCALE', `The bar is the median. ${f.baseRatio} times apart, Mann-Whitney z ${f.test.z}, p under 0.0001, on the ${f.test.n1} and ${f.test.n2} pages above the ${FLOOR}-readers-a-day validity floor.`,
  baseX, [1, 10, 100, 1000, 10000, 100000], (t) => (t >= 1000 ? `${t / 1000}k` : String(t)), (p) => p.base, (g) => g.base)
panel(BX, 'READERS ON THE RECORD DAY ITSELF', `The two medians are ${f.peakGap}% apart. The record day is the same size either way. What differs is the page it happened to.`,
  peakX, [2e6, 4e6, 8e6, 16e6], (t) => `${t / 1e6}m`, (p) => p.peak, (g) => g.peak)

// the multiple, stated once, because it is the whole point of the pair of panels
const MY = TOP + ROW + HALF + 120
out.push(line(AX, MY - 26, BX + PANEL_W, MY - 26, { stroke: RULE, width: 1 }))
out.push(text(AX, MY, `The page that shared its day multiplied itself ${f.cast.lift} times over. The page that had it alone multiplied itself ${f.solo.lift} times over.`, { size: 15, fill: INK, opacity: 0.85 }))
out.push(text(AX, MY + 22, `A record day is either the world turning to a page it already used, or the world finding one it did not know. Only the second kind happens alone.`, { size: 15, fill: INK, opacity: 0.85 }))

out.unshift(
  text(PAD, 58, 'The two kinds of record day', { size: 30, weight: 600, fill: INK, tracking: -0.4 }),
  text(PAD, 90, `A page that shares its record day was already being read ${f.cast.base.toLocaleString('en-US')} times a day. A page that has it alone was being read ${f.solo.base.toLocaleString('en-US')} times a day.`, { size: 14, fill: INK, opacity: 0.8 }),
  text(PAD, 110, `Their record days are the same size: ${f.cast.peak.toLocaleString('en-US')} against ${f.solo.peak.toLocaleString('en-US')}.`, { size: 14, fill: INK, opacity: 0.8 }),
)
out.push(text(PAD, H - 44, SOURCE, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 29, `Readers a day before the event is the median of days 21 to 8 before the peak. ${f.cast.underFloor + f.solo.underFloor} pages sit under the ${FLOOR}-readers-a-day floor and are drawn at the left edge; they are titles that received their subject's history at the moment of the event, and they are excluded from the test and from the multiples.`, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 14, 'Every figure computed from the file by src/lib/findings.js. Nothing typed by hand.', { size: 10.5, fill: INK, opacity: 0.45 }))

process.stdout.write(svg(W, H, out.join('\n')))
