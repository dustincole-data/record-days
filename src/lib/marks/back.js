// SUPPORTING MARK 2: they come down together.
//
// No correlation, no logs, no detrending. For every page, the first day after its
// peak on which it is back at one and a half times its own ordinary reading. A cast
// is drawn as the span between its members' days. The spans are short. The bars under
// the rule are how long that span is for two pages picked at random.
//
// Reflows like the hero: wide, the row is date, span, gap, pages. Narrow, the pages
// and the gap move above their own span and the day ruler takes the full width.
import {
  text, line, circle, title, clamp, wrapList, wrapWords, advance, scale, rng, svg,
  INK, RULE, ALONE, NEAR, BOUND, WHITE,
} from './lib.js'

export const SIDE_AT = 1000

export function backLayout(W, measure = advance) {
  const phone = W < 560
  const side = W >= SIDE_AT
  const pad = phone ? 16 : W < 900 ? 24 : 36
  const size = phone ? 13 : 14
  const dateW = Math.ceil(measure('2026-02-20', size)) + 8
  const gapW = Math.ceil(measure('42 days apart', size)) + 10
  const labelW = side ? clamp(280, Math.round(W * 0.28), 440) : 0
  const plotL = side ? pad + dateW + 14 : pad
  const plotR = side ? W - pad - labelW - gapW - 28 : W - pad
  return {
    W, phone, side, pad, size, dateW, gapW, labelW, plotL, plotR,
    plotW: plotR - plotL,
    gapX: side ? plotR + gapW + 14 : plotR,
    labelX: side ? W - pad - labelW : pad,
    dot: clamp(4.5, (plotR - plotL) * 0.0095, 6.5),
    lead: side ? 17 : 16,
  }
}

export function back(c, W, env = {}) {
  const measure = env.measure || advance
  const L = backLayout(W, measure)
  const { plotL, plotR, plotW, pad, size, side } = L
  const b = c.back
  const out = []

  const rows = b.rows
    .filter((r) => r.gap !== null)
    .map((r) => ({ ...r, days: r.pages.filter((q) => q.day !== null).map((q) => q.day) }))
    .sort((a, b2) => a.gap - b2.gap || a.date.localeCompare(b2.date))

  const maxDay = Math.max(...rows.flatMap((r) => r.days), b.far.median)
  const top = Math.ceil(maxDay / 10) * 10
  const stepDays = plotW < 340 ? 20 : 10
  const x = scale(0, top, plotL, plotR)

  // --- the ruler -----------------------------------------------------------
  let y = size + 4
  const cap = wrapWords('DAYS UNTIL THE PAGE IS BACK AT ' + b.level + ' TIMES ITS OWN ORDINARY READING',
    plotW, size, measure, 600, 0.9)
  cap.forEach((s, i) => out.push(text(plotL, y + i * L.lead, s, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += size + (cap.length - 1) * L.lead + 6
  const what = wrapWords('one row is one record day, one dot is one page', plotW, size, measure)
  what.forEach((s2, i) => out.push(text(plotL, y + size + i * L.lead, s2, { size, fill: INK, opacity: 0.55 })))
  y += 8 + what.length * L.lead
  const AXIS = y + size
  for (let t = 0; t <= top; t += stepDays) {
    out.push(line(x(t), AXIS, x(t), AXIS + 6, { stroke: RULE, width: 1 }))
    out.push(text(x(t), AXIS - 7, String(t), { size, anchor: 'middle', fill: INK, opacity: 0.62, tick: true }))
  }
  out.push(line(plotL, AXIS, plotR, AXIS, { stroke: RULE, width: 1 }))
  y = AXIS + 22

  // --- one row per cast ----------------------------------------------------
  const laid = rows.map((r) => {
    const names = r.pages.map((q) => title(q.article))
    const gapText = r.gap === 0 ? 'same day' : r.gap + (r.gap === 1 ? ' day apart' : ' days apart')
    const room = side ? L.labelW : plotW
    const lines = wrapList(names, room, size, measure)
    const figH = 2 * L.dot + 12
    // Stacked, the date and the gap share one line above the page names, because a
    // date sitting beside the span itself is overrun by the long spans.
    const h = side ? Math.max(figH + 14, lines.length * L.lead + 18) : (lines.length + 1) * L.lead + 6 + figH
    return { r, lines, gapText, h, figH }
  })
  for (const row of laid) { row.y = y; y += row.h }

  for (const row of laid) {
    const { r, lines, gapText } = row
    const cy = side ? row.y + row.h / 2 : row.y + (lines.length + 1) * L.lead + 2 + row.figH / 2
    const lo = Math.min(...r.days), hi = Math.max(...r.days)
    out.push(line(x(lo), cy, x(hi), cy, { stroke: BOUND, width: 3, opacity: 0.5, cap: 'round' }))
    const seen = new Map()
    for (const q of r.pages) {
      if (q.day === null) continue
      seen.set(q.day, (seen.get(q.day) || 0) + 1)
      out.push(circle(x(q.day), cy + (seen.get(q.day) - 1) * 2.4, L.dot,
        { fill: BOUND, opacity: 0.72, stroke: WHITE, width: 1.4 }))
    }
    if (side) {
      out.push(text(plotL - 14, cy + size / 3, r.date, { size, anchor: 'end', fill: INK, opacity: 0.55 }))
      out.push(text(L.gapX, cy + size / 3, gapText, { size, anchor: 'end', fill: INK, opacity: r.gap > 20 ? 0.88 : 0.55 }))
      const t0 = row.y + (row.h - lines.length * L.lead) / 2 + size
      lines.forEach((s, j) => out.push(text(L.labelX, t0 + j * L.lead, s, { size, fill: INK, opacity: 0.85 })))
    } else {
      out.push(text(plotL, row.y + size, r.date, { size, fill: INK, opacity: 0.5 }))
      out.push(text(plotR, row.y + size, gapText, { size, anchor: 'end', fill: INK, opacity: r.gap > 20 ? 0.88 : 0.55 }))
      lines.forEach((s, j) => out.push(text(plotL, row.y + size + (j + 1) * L.lead, s, { size, fill: INK, opacity: 0.85 })))
    }
  }

  // --- the control, drawn as the same length on the same ruler --------------
  y += 12
  out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
  y += 16 + size
  const foot = wrapWords('HOW FAR APART TWO PAGES COME DOWN', W - 2 * pad, size, measure, 600, 0.9)
  foot.forEach((s2, i) => out.push(text(pad, y + i * L.lead, s2, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += (foot.length - 1) * L.lead
  const same = wrapWords('bars use the ruler at the top of this sheet',
    W - 2 * pad, size, measure)
  same.forEach((s2, i) => out.push(text(pad, y + 6 + size + i * L.lead, s2, { size, fill: INK, opacity: 0.55 })))
  y += 12 + same.length * L.lead
  const buckets = [
    { key: 'same', label: 'peaked on the same date', colour: BOUND },
    { key: 'near', label: 'peaked within a fortnight of each other', colour: NEAR },
    { key: 'far', label: 'peaked more than a fortnight apart', colour: ALONE },
  ]
  for (const k of buckets) {
    const g = b[k.key]
    const note = g.n.toLocaleString('en-US') + ' pairs, ' + g.withinThree + '% land within three days of each other'
    const noteLines = wrapList([note], side ? W - pad - x(g.median) - 24 : W - 2 * pad, size, measure)
    const barY = y + 12
    out.push(line(x(0), barY, x(g.median), barY, { stroke: k.colour, width: 12, opacity: 0.55 }))
    out.push(circle(x(0), barY, 6, { fill: k.colour, opacity: 0.8, stroke: WHITE, width: 1.4 }))
    out.push(circle(x(g.median), barY, 6, { fill: k.colour, opacity: 0.8, stroke: WHITE, width: 1.4 }))
    if (side) {
      out.push(text(plotL - 14, barY + size / 3, g.median + ' days', { size, weight: 600, anchor: 'end', fill: INK, opacity: 0.85 }))
      out.push(text(x(g.median) + 18, barY + size / 3, k.label, { size, fill: INK, opacity: 0.7 }))
      noteLines.forEach((s, j) => out.push(text(x(g.median) + 18, barY + size / 3 + (j + 1) * L.lead, s, { size, fill: INK, opacity: 0.5 })))
      y = barY + 12 + (noteLines.length) * L.lead + 12
    } else {
      out.push(text(pad, barY + 16 + size, g.median + ' days, ' + k.label, { size, weight: 600, fill: INK, opacity: 0.8 }))
      noteLines.forEach((s, j) => out.push(text(pad, barY + 16 + size + (j + 1) * L.lead, s, { size, fill: INK, opacity: 0.5 })))
      y = barY + 16 + size + noteLines.length * L.lead + 16
    }
  }

  const label = 'Two pages that shared a record day are back to ordinary reading within a median of ' +
    b.same.median + ' days of each other. Two pages that did not are ' + b.far.median + ' days apart.'
  return { width: W, height: Math.ceil(y + 4), body: out.join(''), label, layout: L, rows: laid.length }
}

export const backSvg = (c, W, env) => {
  const r = back(c, W, env)
  return { ...r, svg: svg(r.width, r.height, r.body, r.label) }
}
