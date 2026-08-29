// THE HERO: the nineteen constellations, on the ruler that measures them.
//
// A row is one record day. Inside a row a disc is a page and its area is the readers
// it took that day; the gap between two discs is how far apart the two pages stayed
// for the rest of the year, and the band joining them is the same number drawn as a
// thickness. The row sits on the sheet at the middle of its own ties.
//
// Above the rows, the two controls, drawn as themselves: every one of the pairs of
// pages that did not share a record day, and every one of the pairs whose days were
// within a fortnight of each other. Two constellations land inside them.
//
// The sheet reflows rather than scales. Wide, the row is three columns: date, figure,
// pages. Narrow, the pages move above their own figure and the ruler takes the full
// width, because a three-column row on a phone is a squeezed poster and not a page.
import {
  text, line, circle, rect, path, band, ramp, stress, title, clamp,
  wrapList, wrapWords, advance, tieScale, tieTicks, rng, svg,
  INK, RULE, ALONE, NEAR, WHITE,
} from './lib.js'

export const SIDE_AT = 1000

export function heroLayout(W, measure = advance) {
  const phone = W < 560
  const side = W >= SIDE_AT
  const pad = phone ? 16 : W < 900 ? 24 : 36
  const size = phone ? 13 : 14
  const dateW = Math.ceil(measure('2026-02-20', size)) + 8
  const labelW = side ? clamp(300, Math.round(W * 0.3), 460) : 0
  const plotL = side ? pad + dateW + 14 : pad
  const plotR = side ? W - pad - labelW - 22 : W - pad
  return {
    W, phone, side, pad, size, dateW, labelW, plotL, plotR,
    plotW: plotR - plotL,
    labelX: side ? W - pad - labelW : pad,
    // The largest disc and the pixels per unit of "one minus the tie" both come off
    // the ruler's own width, so the figures keep their proportions to it at any size.
    radius: clamp(12, (plotR - plotL) * 0.0256, 22),
    sep: clamp(34, (plotR - plotL) * 0.0907, 78),
    lead: side ? 17 : 16,
  }
}

export function hero(c, W, env = {}) {
  const measure = env.measure || advance
  const L = heroLayout(W, measure)
  const { plotL, plotR, plotW, pad, size, side, phone } = L
  const x = tieScale(plotL, plotR)
  const out = []

  const measured = c.constellations.filter((k) => k.median !== null).sort((a, b) => b.median - a.median)
  const unmeasured = c.constellations.filter((k) => k.median === null).sort((a, b) => a.date.localeCompare(b.date))
  const maxPeak = Math.max(...c.constellations.flatMap((k) => k.pages.map((q) => q.peak)))
  const discR = (peak) => L.radius * Math.sqrt(peak / maxPeak)
  const bandW = (r) => (2.2 + 14 * Math.max(0, r)) * (L.radius / 22)
  const rand = rng(20260828)

  // --- the ruler -----------------------------------------------------------
  let y = size + 4
  const cap = wrapWords('HOW CLOSELY THE TWO PAGES MOVED FOR THE YEAR AFTER', plotW, size, measure, 600, 0.9)
  cap.forEach((s, i) => out.push(text(plotL, y + i * L.lead, s,
    { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += 14 + size + (cap.length - 1) * L.lead
  const AXIS = y + size
  for (const t of tieTicks(plotW)) {
    out.push(line(x(t), AXIS, x(t), AXIS + 6, { stroke: RULE, width: 1 }))
    out.push(text(x(t), AXIS - 7, t.toFixed(1), { size, anchor: 'middle', fill: INK, opacity: 0.62, tick: true }))
  }
  out.push(line(plotL, AXIS, plotR, AXIS, { stroke: RULE, width: 1 }))

  // --- the two controls, drawn as every pair they contain -------------------
  const ticks = (rows, top, h, colour, sc = x, lo = plotL, hi = plotR) => {
    const g = []
    const q = (v) => Math.round(v * 100) / 100
    for (const r of rows) {
      const tx = sc(r)
      if (tx < lo - 0.5 || tx > hi + 0.5) continue
      const ty = q(top + rand() * (h - 7))
      g.push('<line x1="' + q(tx) + '" y1="' + ty + '" x2="' + q(tx) + '" y2="' + q(ty + 7) +
        '" stroke="' + colour + '" stroke-width="1" opacity="0.5" />')
    }
    return g.join('')
  }
  const farH = side ? 46 : 34
  const nearH = side ? 30 : 22
  let farTop, nearTop
  if (side) {
    farTop = AXIS + 20
    nearTop = farTop + farH + 8
    out.push(text(plotL - 14, farTop + size, 'no shared date', { size, anchor: 'end', fill: INK, opacity: 0.72 }))
    out.push(text(plotL - 14, farTop + size + L.lead, c.bond.far.n.toLocaleString('en-US') + ' pairs', { size, anchor: 'end', fill: INK, opacity: 0.5 }))
    out.push(text(plotL - 14, nearTop + size, 'within a fortnight', { size, anchor: 'end', fill: INK, opacity: 0.72 }))
    out.push(text(plotL - 14, nearTop + size + L.lead, c.bond.near.n + ' pairs', { size, anchor: 'end', fill: INK, opacity: 0.5 }))
    y = nearTop + nearH + 22
  } else {
    let ly = AXIS + 22 + size
    out.push(text(plotL, ly, 'no shared date, ' + c.bond.far.n.toLocaleString('en-US') + ' pairs', { size, fill: INK, opacity: 0.72 }))
    farTop = ly + 6
    ly = farTop + farH + 16 + size
    out.push(text(plotL, ly, 'within a fortnight, ' + c.bond.near.n + ' pairs', { size, fill: INK, opacity: 0.72 }))
    nearTop = ly + 6
    y = nearTop + nearH + 20
  }
  out.push(ticks(c.bond.farValues, farTop, farH, ALONE))
  out.push(ticks(c.bond.nearValues, nearTop, nearH, NEAR))

  // --- the header over the rows --------------------------------------------
  out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
  y += 18 + size
  const groupLine = c.groups.casts + ' groups, ' + c.bond.same.n + ' pairs'
  if (side) {
    out.push(text(plotL - 14, y, 'the same date', { size, anchor: 'end', fill: INK, opacity: 0.72 }))
    out.push(text(plotL, y, groupLine, { size, fill: INK, opacity: 0.55 }))
  } else {
    out.push(text(plotL, y, 'the same date, ' + groupLine, { size, fill: INK, opacity: 0.72 }))
  }
  // What the pale band is, said on the band itself where there is room for it. The
  // sentence it abbreviates is carried in the caption under the sheet either way.
  const bandNote = 'the middle ' + c.bond.band + '% of them'
  const noteW = measure(bandNote, size)
  const bandFits = noteW < x(c.bond.p95) - x(c.bond.p05) - 10
  const rightFits = noteW < plotR - x(c.bond.p95) - 10
  if (bandFits) out.push(text(x(c.bond.p95) - 6, y, bandNote, { size, anchor: 'end', fill: INK, opacity: 0.55 }))
  else if (rightFits) out.push(text(x(c.bond.p95) + 6, y, bandNote, { size, fill: INK, opacity: 0.55 }))
  y += 14

  // --- lay the rows out ----------------------------------------------------
  const rows = measured.map((k) => {
    const names = k.pages.map((q) => title(q.article))
    const room = side ? L.labelW : plotW - L.dateW - 14
    const lines = wrapList(names, room, size, measure)
    const figH = 2 * L.radius + 10
    const h = side
      ? Math.max(figH + 12, lines.length * L.lead + 18)
      : lines.length * L.lead + 8 + figH
    return { k, lines, h, figH }
  })
  const rowsTop = y
  let cursor = rowsTop
  for (const r of rows) { r.y = cursor; cursor += r.h }
  const rowsBottom = cursor

  // The region a pair with no relationship occupies, carried down the whole sheet.
  const bandTop = side ? rowsTop - 24 : rowsTop - 6
  out.push(rect(x(c.bond.p05), bandTop, x(c.bond.p95) - x(c.bond.p05), rowsBottom + 16 - bandTop,
    { fill: ALONE, opacity: 0.1 }))
  const edges = [c.bond.p05, c.bond.p95]
  if (side) {
    for (const e of edges) out.push(line(x(e), rowsTop - 24, x(e), rowsBottom + 16, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
  } else {
    // Stacked, the page names sit over the band, so the two edges are drawn only
    // across each row's own figure strip rather than through its label.
    for (const r of rows) {
      const t0 = r.y + r.lines.length * L.lead + 2, t1 = t0 + r.figH + 4
      for (const e of edges) out.push(line(x(e), t0, x(e), t1, { stroke: INK, width: 1, dash: '2 4', opacity: 0.42 }))
    }
  }

  for (const r of rows) {
    const { k, lines } = r
    const pages = k.pages.filter((q) => q.measured)
    const rOf = (a, b) => k.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)).r
    const pos = stress(pages, (a, b) => L.sep * (1 - rOf(pages[a].article, pages[b].article)))
    const cx = x(k.median)
    const figCy = side ? r.y + r.h / 2 : r.y + lines.length * L.lead + 4 + r.figH / 2
    const at = (idx) => [cx + pos[idx][0], figCy + pos[idx][1] * 0.6]

    // A page whose tie cannot be measured still had the record day: drawn hollow and
    // tied to the figure with a broken stub, so the row is not silently short.
    const missing = k.pages.filter((q) => !q.measured)
    const leftMost = Math.min(...pages.map((q, idx) => at(idx)[0] - discR(q.peak)))
    const step = Math.max(22, 1.6 * L.radius)
    const holes = missing.map((q, j) => [leftMost - 8 - discR(q.peak) - j * step, figCy])
    holes.forEach(([hx, hy], j) => {
      out.push(line(hx + discR(missing[j].peak), hy, j ? holes[j - 1][0] - discR(missing[j - 1].peak) : leftMost, hy,
        { stroke: INK, width: 1.2, dash: '2 3', opacity: 0.45 }))
    })

    out.push('<g style="mix-blend-mode:multiply">')
    for (const e of k.edges) {
      const ia = pages.findIndex((q) => q.article === e.a), ib = pages.findIndex((q) => q.article === e.b)
      const [ax, ay] = at(ia), [bx, by] = at(ib)
      out.push(path(band(ax, ay, bx, by, bandW(e.r)), { fill: ramp(Math.max(0, e.r)), opacity: 0.52 }))
    }
    out.push('</g>')
    // Discs sit on top of the bands, each with a surface ring so two that overlap
    // still read as two pages.
    pages.forEach((q, idx) => {
      const [px, py] = at(idx)
      out.push(circle(px, py, discR(q.peak), { fill: ramp(Math.max(0, k.median)), opacity: 0.74, stroke: WHITE, width: 1.6 }))
    })
    holes.forEach(([hx, hy], j) => out.push(circle(hx, hy, discR(missing[j].peak), { fill: WHITE, stroke: INK, width: 1, opacity: 0.42 })))

    if (side) {
      out.push(text(plotL - 14, figCy + size / 3, k.date, { size, anchor: 'end', fill: INK, opacity: 0.55 }))
      const top = r.y + (r.h - lines.length * L.lead) / 2 + size
      lines.forEach((s, j) => out.push(text(L.labelX, top + j * L.lead, s, { size, fill: INK, opacity: 0.88 })))
    } else {
      out.push(text(plotR, r.y + size, k.date, { size, anchor: 'end', fill: INK, opacity: 0.55 }))
      lines.forEach((s, j) => out.push(text(plotL, r.y + size + j * L.lead, s, { size, fill: INK, opacity: 0.88 })))
    }
  }
  y = rowsBottom + 26

  // --- the two that cannot be measured. A missing reading is not a zero. -----
  out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
  y += 16 + size
  out.push(text(pad, y, 'NO MEASUREMENT', { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 }))
  y += 14
  for (const k of unmeasured) {
    const r = Math.max(...k.pages.map((q) => discR(q.peak)))
    const cy = y + r + 2
    k.pages.forEach((q, j) => out.push(circle(pad + r + j * (2 * r + 10), cy, discR(q.peak), { fill: WHITE, stroke: INK, width: 1, opacity: 0.42 })))
    const tx = pad + k.pages.length * (2 * r + 10) + 6
    const room = W - pad - tx
    const head = k.date + '   ' + k.pages.map((q) => title(q.article)).join(' + ')
    const note = k.pages.some((q) => q.renamed)
      ? 'one page was renamed, so its readings after the move measure the move'
      : 'the record day is too recent for a year of readings'
    const headLines = wrapList([head], room, size, measure)
    const noteLines = wrapList([note], room, size, measure)
    headLines.forEach((s, j) => out.push(text(tx, y + size + j * L.lead, s, { size, fill: INK, opacity: 0.8 })))
    noteLines.forEach((s, j) => out.push(text(tx, y + size + (headLines.length + j) * L.lead, s, { size, fill: INK, opacity: 0.5 })))
    y += Math.max(2 * r + 12, (headLines.length + noteLines.length) * L.lead + 12)
  }

  // --- legend ---------------------------------------------------------------
  //
  // Three cells, laid into three, two or one column by the room there is. Each one
  // states its own figure height, so a column that folds does not inherit the tallest
  // cell's spacing and leave a hole under the small one.
  y += 16
  out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
  y += 16
  const cols = W >= 1180 ? 3 : W >= 760 ? 2 : 1
  const colW = (W - 2 * pad - (cols - 1) * 28) / cols
  const big = c.constellations.flatMap((k) => k.pages).sort((a, b) => b.peak - a.peak)[0]
  const small = c.constellations.flatMap((k) => k.pages).sort((a, b) => a.peak - b.peak)[0]

  const cells = [
    {
      head: 'A DISC IS A PAGE',
      figH: 2 * discR(big.peak) + 6,
      draw: (cx0, cy0) => {
        const rb = discR(big.peak), rs = discR(small.peak)
        return circle(cx0 + rb, cy0 + rb, rb, { fill: INK, opacity: 0.13, stroke: WHITE, width: 1.6 }) +
          circle(cx0 + 2 * rb + rs + 18, cy0 + rb, rs, { fill: INK, opacity: 0.13, stroke: WHITE, width: 1.6 })
      },
      caption: 'its area is the readers it took that day, ' + (small.peak / 1e6).toFixed(1) + 'm to ' + (big.peak / 1e6).toFixed(1) + 'm',
    },
    {
      head: 'THE GAP IS HOW FAR APART THEY STAYED',
      figH: 30 + size,
      draw: (cx0, cy0, w) => {
        const g = []
        const shown = [0.9, 0.4, 0.05]
        const slot = w / shown.length
        shown.forEach((r, i2) => {
          const gy = cy0 + 11, gx = cx0 + i2 * slot + 4
          const d = Math.min(L.sep * (1 - r), slot - 34)
          g.push('<g style="mix-blend-mode:multiply">' + path(band(gx, gy, gx + d, gy, bandW(r)), { fill: ramp(r), opacity: 0.52 }) + '</g>')
          g.push(circle(gx, gy, 10, { fill: ramp(r), opacity: 0.74, stroke: WHITE, width: 1.6 }))
          g.push(circle(gx + d, gy, 10, { fill: ramp(r), opacity: 0.74, stroke: WHITE, width: 1.6 }))
          g.push(text(gx - 10, gy + 18 + size, r.toFixed(2), { size, fill: INK, opacity: 0.6 }))
        })
        return g.join('')
      },
      caption: 'left, still moving together; right, moving apart',
    },
    {
      head: 'THE TWO CONTROLS',
      figH: 46,
      draw: (cx0, cy0, w) => {
        const lsc = tieScale(cx0, cx0 + w)
        return ticks(c.bond.farValues.filter((_, i2) => i2 % 3 === 0), cy0, 20, ALONE, lsc, cx0, cx0 + w) +
          ticks(c.bond.nearValues, cy0 + 26, 16, NEAR, lsc, cx0, cx0 + w)
      },
      caption: 'no shared date, half at ' + c.bond.far.median + '; within a fortnight, half at ' + c.bond.near.median,
    },
  ]
  for (const cl of cells) {
    cl.headLines = wrapWords(cl.head, colW, size, measure, 600, 0.9)
    cl.capLines = wrapList([cl.caption], colW, size, measure)
    cl.h = cl.headLines.length * L.lead + 10 + cl.figH + 12 + cl.capLines.length * L.lead
  }
  let bandY = y
  for (let i = 0; i < cells.length; i += cols) {
    const line0 = cells.slice(i, i + cols)
    const h = Math.max(...line0.map((cl) => cl.h))
    line0.forEach((cl, j) => {
      const cx0 = pad + j * (colW + 28)
      cl.headLines.forEach((t, k) => out.push(text(cx0, bandY + size + k * L.lead, t, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
      out.push(cl.draw(cx0, bandY + cl.headLines.length * L.lead + 10, colW))
      const capTop = bandY + cl.headLines.length * L.lead + 10 + cl.figH + 12 + size
      cl.capLines.forEach((t, k) => out.push(text(cx0, capTop + k * L.lead, t, { size, fill: INK, opacity: 0.6 })))
    })
    bandY += h + 24
  }
  y = bandY

  const label = c.groups.inCast + ' of the ' + c.groups.total + ' biggest reading days in the record are shared by two, three or four pages, in ' +
    c.groups.casts + ' groups. Each group is drawn on a ruler of how closely its pages moved for the year after; half the same-day pairs sit at ' +
    c.bond.same.median + ' against ' + c.bond.far.median + ' for pairs that shared no date.'
  return { width: W, height: Math.ceil(y), body: out.join(''), label, layout: L, bandNoteShown: bandFits || rightFits }
}

export const heroSvg = (c, W, env) => {
  const r = hero(c, W, env)
  return { ...r, svg: svg(r.width, r.height, r.body, r.label) }
}
