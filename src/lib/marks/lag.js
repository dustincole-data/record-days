// SUPPORTING MARK 3: the tie is to the exact day.
//
// Every same-day pair, scored seven times: once with the two calendars aligned, and
// once for each of the three days either side. One dot is one pair, coloured by its
// own value on the ramp the whole piece uses. Shift one page's calendar by a single
// day and a third of the tie is gone; by three days and the row has fallen back into
// the field where two unrelated pages live.
//
// It is drawn on the hero's ruler, at the same domain and the same ticks, so a row
// here can be read straight up into a row there.
import {
  text, line, circle, rect, ramp, clamp, advance, wrapWords, tieScale, tieTicks, svg, bandNote,
  INK, RULE, ALONE, WHITE,
} from './lib.js'

export const SIDE_AT = 760

export function lagLayout(W, measure = advance) {
  const phone = W < 560
  const side = W >= SIDE_AT
  const pad = phone ? 16 : W < 900 ? 24 : 36
  const size = phone ? 13 : 14
  const labelW = Math.ceil(measure('3 days earlier', size, 600)) + 16
  const medW = Math.ceil(measure('0.567', size, 600)) + 20
  const plotL = side ? pad + labelW : pad
  const plotR = side ? W - pad - medW : W - pad
  return {
    W, phone, side, pad, size, labelW, medW, plotL, plotR,
    plotW: plotR - plotL,
    r: clamp(4, (plotR - plotL) * 0.0088, 6.5),
    half: clamp(22, (plotR - plotL) * 0.045, 34),
    lead: phone ? 16 : 17,
  }
}

const label = (k) => {
  if (k === 0) return 'the same day'
  const d = Math.abs(k)
  return d + (d === 1 ? ' day ' : ' days ') + (k < 0 ? 'earlier' : 'later')
}

export function lag(c, W, env = {}) {
  const measure = env.measure || advance
  const L = lagLayout(W, measure)
  const { plotL, plotR, plotW, pad, size, side } = L
  const x = tieScale(plotL, plotR)
  const out = []

  let y = size + 4
  const cap = wrapWords('HOW CLOSELY THE TWO PAGES MOVED, WITH ONE CALENDAR SHIFTED', plotW, size, measure, 600, 0.9)
  cap.forEach((s, i) => out.push(text(plotL, y + i * L.lead, s, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += size + (cap.length - 1) * L.lead + 6
  // This sheet carries the hero's band and none of the hero's legend, so it names the
  // band itself, in the hero's own words.
  const what = wrapWords('one dot is one pair. the pale band is ' + bandNote(c), plotW, size, measure)
  what.forEach((s2, i) => out.push(text(plotL, y + size + i * L.lead, s2, { size, fill: INK, opacity: 0.55 })))
  y += 8 + what.length * L.lead
  const AXIS = y + size
  for (const t of tieTicks(plotW)) {
    out.push(line(x(t), AXIS, x(t), AXIS + 6, { stroke: RULE, width: 1 }))
    out.push(text(x(t), AXIS - 7, t.toFixed(1), { size, anchor: 'middle', fill: INK, opacity: 0.62, tick: true }))
  }
  out.push(line(plotL, AXIS, plotR, AXIS, { stroke: RULE, width: 1 }))
  if (side) out.push(text(plotR + 14, AXIS - 7, 'MEDIAN', { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.6 }))

  // --- the rows -------------------------------------------------------------
  const rowH = side ? 2 * L.half + 26 : 2 * L.half + 26 + L.lead
  const rowsTop = AXIS + 18
  const bandH = c.bond.lag.length * rowH + 12

  // The field the rows fall back into, on the hero's own band.
  out.push(rect(x(c.bond.p05), rowsTop - 6, x(c.bond.p95) - x(c.bond.p05), bandH, { fill: ALONE, opacity: 0.1 }))
  for (const e of [c.bond.p05, c.bond.p95]) {
    out.push(line(x(e), rowsTop - 6, x(e), rowsTop - 6 + bandH, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
  }

  c.bond.lag.forEach((l, i) => {
    const zero = l.lag === 0
    const top = rowsTop + i * rowH
    const cy = side ? top + rowH / 2 : top + L.lead + L.half + 4
    out.push(line(plotL, cy, plotR, cy, { stroke: RULE, width: 1, opacity: 0.5 }))
    // One dot per pair, stacked where they crowd.
    const placed = []
    for (const v of l.values.slice().sort((a, b) => a - b)) {
      const px = x(v)
      let step = 0, py = cy
      while (placed.some((q) => Math.hypot(q[0] - px, q[1] - py) < 2 * L.r + 0.8) && step < 16) {
        step++
        const off = Math.ceil(step / 2) * (2 * L.r + 0.8) * 0.9
        if (off > L.half) break
        py = cy + (step % 2 ? 1 : -1) * off
      }
      placed.push([px, py])
      out.push(circle(px, py, L.r, { fill: ramp(Math.max(0, v)), opacity: 0.74, stroke: WHITE, width: 1.3 }))
    }
    out.push(line(x(l.median), cy - L.half - 5, x(l.median), cy + L.half + 5,
      { stroke: INK, width: 1.6, opacity: zero ? 0.85 : 0.55 }))
    const med = l.median.toFixed(3)
    if (side) {
      out.push(text(plotL - 16, cy + size / 3, label(l.lag), { size, weight: zero ? 600 : 400, anchor: 'end', fill: INK, opacity: zero ? 0.92 : 0.62 }))
      out.push(text(plotR + 14, cy + size / 3, med, { size, weight: zero ? 600 : 400, fill: INK, opacity: zero ? 0.9 : 0.62 }))
    } else {
      out.push(text(plotL, top + size, label(l.lag), { size, weight: zero ? 600 : 400, fill: INK, opacity: zero ? 0.92 : 0.62 }))
      out.push(text(plotR, top + size, 'half at ' + med, { size, weight: zero ? 600 : 400, anchor: 'end', fill: INK, opacity: zero ? 0.9 : 0.62 }))
    }
  })

  const alt = 'The ' + c.bond.same.n + " pairs of pages that shared a record day, scored again with one page's calendar" +
    ' moved a day at a time. Aligned, half of them sit at ' + c.bond.lag.find((l) => l.lag === 0).median +
    '; one day out, ' + c.bond.lag.find((l) => l.lag === 1).median + '.'
  return { width: W, height: Math.ceil(rowsTop + bandH + 8), body: out.join(''), label: alt, layout: L }
}

export const lagSvg = (c, W, env) => {
  const r = lag(c, W, env)
  return { ...r, svg: svg(r.width, r.height, r.body, r.label) }
}
