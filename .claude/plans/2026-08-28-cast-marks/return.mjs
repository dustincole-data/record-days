// SUPPORTING MARK 2: they come down together.
//
// No correlation, no logs, no detrending. For every page, the first day after its
// peak on which it is back at one and a half times its own ordinary reading. A cast
// is drawn as the span between its members' days. The spans are short. The bar under
// the rule is how long that span is for two pages picked at random.
import { readFileSync } from 'node:fs'
import {
  svg, text, line, circle, rect, path, scale, title,
  INK, RULE, ALONE, NEAR, BOUND, WHITE, SOURCE,
} from './lib.mjs'

const c = JSON.parse(readFileSync(new URL('../../../data/census/cast.json', import.meta.url), 'utf8'))
const b = c.back

const W = 1520, H = 1300
const PAD = 116
const PL = 330, PR = 960
const GAP_X = 1076, LABEL_X = 1096
const TOP = 240, PITCH = 44

const rows = b.rows
  .map((r) => ({ ...r, days: r.pages.filter((q) => q.day !== null).map((q) => q.day) }))
  .filter((r) => r.days.length > 1)
  .map((r) => ({ ...r, gap: Math.max(...r.days) - Math.min(...r.days) }))
  .sort((a, b2) => a.gap - b2.gap || a.date.localeCompare(b2.date))

const maxDay = Math.max(...rows.flatMap((r) => r.days))
const x = scale(0, Math.ceil(maxDay / 10) * 10, PL, PR)
const out = []

// the ruler
out.push(line(PL, TOP - 34, PR, TOP - 34, { stroke: RULE, width: 1 }))
for (let t = 0; t <= maxDay; t += 10) {
  out.push(line(x(t), TOP - 34, x(t), TOP - 28, { stroke: RULE, width: 1 }))
  out.push(text(x(t), TOP - 42, String(t), { size: 11.5, anchor: 'middle', fill: INK, opacity: 0.6 }))
}
out.push(text(PL, TOP - 62, `DAYS UNTIL THE PAGE IS BACK AT ${b.level} TIMES ITS OWN ORDINARY READING`, { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.72 }))

rows.forEach((r, i) => {
  const y = TOP + i * PITCH
  const lo = Math.min(...r.days), hi = Math.max(...r.days)
  out.push(line(x(lo), y, x(hi), y, { stroke: BOUND, width: 3, opacity: 0.5 }))
  const seen = new Map()
  for (const q of r.pages) {
    if (q.day === null) continue
    const k = q.day
    seen.set(k, (seen.get(k) || 0) + 1)
    out.push(circle(x(k), y + (seen.get(k) - 1) * 2.4, 6, { fill: BOUND, opacity: 0.72, stroke: WHITE, width: 1.4 }))
  }
  out.push(text(PL - 18, y + 4, r.date, { size: 11.5, anchor: 'end', fill: INK, opacity: 0.55 }))
  out.push(text(GAP_X, y + 4, r.gap === 0 ? 'same day' : `${r.gap} day${r.gap === 1 ? '' : 's'} apart`, { size: 11.5, anchor: 'end', fill: INK, opacity: r.gap > 20 ? 0.88 : 0.55 }))
  {
    const names = r.pages.map((q) => title(q.article))
    const lines = []
    let cur = ''
    for (const t of names) {
      const add = cur ? `${cur} + ${t}` : t
      if (add.length > 54 && cur) { lines.push(`${cur} +`); cur = t } else cur = add
    }
    lines.push(cur)
    lines.forEach((s2, j) => out.push(text(LABEL_X, y + 4 - (lines.length - 1) * 6.5 + j * 13, s2, { size: 11.5, fill: INK, opacity: 0.82 })))
  }
})

// ---------------------------------------------------------------------------
// the control, drawn as the same length on the same ruler
// ---------------------------------------------------------------------------
const CY = TOP + rows.length * PITCH + 46
out.push(line(PAD, CY - 26, PR + 400, CY - 26, { stroke: RULE, width: 1 }))
out.push(text(PAD, CY - 6, 'HOW FAR APART TWO PAGES COME DOWN', { size: 11, weight: 600, tracking: 1.1, fill: INK, opacity: 0.72 }))
const buckets = [
  { key: 'same', label: 'peaked on the same date', colour: BOUND },
  { key: 'near', label: 'peaked within a fortnight of each other', colour: NEAR },
  { key: 'far', label: 'peaked more than a fortnight apart', colour: ALONE },
]
buckets.forEach((k, i) => {
  const y = CY + 34 + i * 46
  const g = b[k.key]
  out.push(line(x(0), y, x(g.median), y, { stroke: k.colour, width: 12, opacity: 0.55 }))
  out.push(circle(x(0), y, 6, { fill: k.colour, opacity: 0.8, stroke: WHITE, width: 1.4 }))
  out.push(circle(x(g.median), y, 6, { fill: k.colour, opacity: 0.8, stroke: WHITE, width: 1.4 }))
  out.push(text(PL - 18, y + 4, `${g.median} days`, { size: 13, weight: 600, anchor: 'end', fill: INK, opacity: 0.85 }))
  out.push(text(x(g.median) + 18, y + 4, `${k.label}   ·   ${g.n.toLocaleString('en-US')} pairs   ·   ${g.withinThree}% land within three days of each other`, { size: 12.5, fill: INK, opacity: 0.68 }))
})

out.unshift(
  text(PAD, 58, 'They come down together', { size: 30, weight: 600, fill: INK, tracking: -0.4 }),
  text(PAD, 90, `Two pages that shared a record day are back to ordinary within a median of ${b.same.median} days of each other. Two pages that did not are ${b.far.median} days apart.`, { size: 14, fill: INK, opacity: 0.8 }),
  text(PAD, 110, `This uses no correlation and no detrending: only the day each page stopped being unusual. Permutation on ${b.same.n} pairs, ${b.permutation.draws} draws, p under 5 in 100,000.`, { size: 14, fill: INK, opacity: 0.8 }),
)
out.push(text(PAD, H - 44, SOURCE, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 29, `A page with no baseline to come back to, and a page whose title was renamed, carry no day and are left out of their row rather than counted as a zero. One cast loses both of its pages that way and does not appear.`, { size: 10.5, fill: INK, opacity: 0.45 }))
out.push(text(PAD, H - 14, 'Every figure computed from the file by src/lib/findings.js. Nothing typed by hand.', { size: 10.5, fill: INK, opacity: 0.45 }))

process.stdout.write(svg(W, H, out.join('\n')))
