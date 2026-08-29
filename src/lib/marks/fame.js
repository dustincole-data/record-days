// SUPPORTING MARK 1: the two kinds of record day.
//
// Two panels, one row of pages each. The upper row is the pages that shared their
// record day, the lower row the ones that had it alone. On the left panel they are
// nowhere near each other; on the right panel they are the same. One dot is one page.
//
// Each panel is its own sheet, so two columns on a wide page and one on a narrow one
// is a grid decision rather than a redraw.
import {
  text, line, circle, scale, clamp, wrapWords, advance, svg,
  INK, RULE, ALONE, BOUND, WHITE,
} from './lib.js'

const PANELS = [
  {
    key: 'base',
    head: 'READERS A DAY BEFORE THE EVENT, ON A LOG SCALE',
    lo: 1, hi: 500000,
    ticks: [1, 10, 100, 1000, 10000, 100000],
    fmt: (t) => (t >= 1000 ? t / 1000 + 'k' : String(t)),
    of: (p) => p.base,
    stat: (g) => g.base,
  },
  {
    key: 'peak',
    head: 'READERS ON THE RECORD DAY ITSELF',
    lo: 1.4e6, hi: 16e6,
    ticks: [2e6, 4e6, 8e6, 16e6],
    fmt: (t) => t / 1e6 + 'm',
    of: (p) => p.peak,
    stat: (g) => g.peak,
  },
]

export function fameLayout(W) {
  const phone = W < 560
  const size = phone ? 13 : 14
  return {
    W, phone, size,
    r: clamp(2.8, W / 130, 4.6),
    half: clamp(44, W / 6.5, 92),
    lead: phone ? 16 : 17,
    // A page on the floor sits at the very left of the axis, so the plot is inset by
    // its own dot radius at both ends and no page is drawn half off its own sheet.
    inset: clamp(2.8, W / 130, 4.6) + 2,
  }
}

export function famePanel(c, W, spec, env = {}) {
  const measure = env.measure || advance
  const L = fameLayout(W)
  const { size, r: R, half } = L
  const f = c.fame
  const out = []

  // The dots are placed on a log axis; a page under the validity floor lands on the
  // left edge rather than off the sheet, and is excluded from the test either way.
  const sc = scale(Math.log10(spec.lo), Math.log10(spec.hi), L.inset, W - L.inset)
  const xf = (v) => sc(Math.log10(Math.min(spec.hi, Math.max(spec.lo, v))))

  let y = 0
  const headLines = wrapWords(spec.head, W, size, measure, 600, 0.9)
  headLines.forEach((s, i) => out.push(text(0, y + size + i * L.lead, s, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += headLines.length * L.lead + 8
  const AXIS = y + size + 4
  for (const t of spec.ticks) {
    out.push(line(xf(t), AXIS - 6, xf(t), AXIS, { stroke: RULE, width: 1 }))
    const tx = clamp(measure(spec.fmt(t), size) / 2, xf(t), W - measure(spec.fmt(t), size) / 2)
    out.push(text(tx, AXIS - 10, spec.fmt(t), { size, anchor: 'middle', fill: INK, opacity: 0.62, tick: true }))
  }
  out.push(line(L.inset, AXIS, W - L.inset, AXIS, { stroke: RULE, width: 1 }))

  // One row of pages, laid out so overlapping dots stack instead of hiding each other.
  const swarm = (points, cy, colour) => {
    const placed = []
    const order = points.slice().sort((a, b) => xf(spec.of(a)) - xf(spec.of(b)))
    order.forEach((p, i) => {
      const px = xf(spec.of(p))
      let k = 0, py = cy, room = true
      while (placed.some((q) => Math.hypot(q[0] - px, q[1] - py) < 2 * R + 1) && k < 60) {
        k++
        const step = Math.ceil(k / 2) * (2 * R + 1) * 0.92
        // Out of room in this column: the page still gets drawn, spread through the
        // band rather than piled on its edge, because a dot dropped is a page lost.
        if (step > half) { room = false; break }
        py = cy + (k % 2 ? 1 : -1) * step
      }
      if (!room) py = cy + ((i * 37) % Math.round(2 * half)) - half
      placed.push([px, py])
      out.push(circle(px, py, R, { fill: colour, opacity: 0.62, stroke: WHITE, width: 1 }))
    })
  }

  const rows = [
    { label: 'shared its record day', set: f.points.filter((p) => p.cast), colour: BOUND, g: f.cast },
    { label: 'had it alone', set: f.points.filter((p) => !p.cast), colour: ALONE, g: f.solo },
  ]
  const block = size + 14 + 2 * half + 18 + size
  y = AXIS + 18
  rows.forEach((row, i) => {
    const top = y + i * (block + 22)
    const cy = top + size + 14 + half
    swarm(row.set, cy, row.colour)
    const m = spec.stat(row.g)
    out.push(line(xf(m), cy - half - 6, xf(m), cy + half + 6, { stroke: INK, width: 1.4, opacity: 0.75 }))
    const lbl = m.toLocaleString('en-US')
    const lw = measure(lbl, size, 600)
    out.push(text(clamp(lw / 2, xf(m), W - lw / 2), top + size, lbl, { size, weight: 600, anchor: 'middle', fill: INK, opacity: 0.88 }))
    out.push(text(0, cy + half + 18 + size, row.label + ', ' + row.g.n + ' pages', { size, fill: INK, opacity: 0.7 }))
  })
  y += 2 * block + 22 + 6

  const label = spec.head.toLowerCase() + '. ' + rows.map((row) => row.label + ', ' + row.g.n +
    ' pages, half at ' + spec.stat(row.g).toLocaleString('en-US')).join('; ') + '.'
  return { width: W, height: Math.ceil(y), body: out.join(''), label, layout: L }
}

export const fameSvg = (c, W, env) => PANELS.map((spec) => {
  const r = famePanel(c, W, spec, env)
  return { ...r, key: spec.key, svg: svg(r.width, r.height, r.body, r.label) }
})
