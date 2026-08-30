// THE HERO: the year after the record day, one cell per group.
//
// A cell is one record day. Inside it the group's largest page is drawn rising above
// the line and the second falling below it, over the year that followed, so a group
// whose pages were read unusually on the SAME days closes into one shape with two
// matching halves and a group whose pages went their own way does not. A third or
// fourth page rides behind on alternating sides.
//
// The quantity is the same residual the tie is computed from: a day's readings against
// the middle of its own 29 days. Nothing is smoothed. The only thing the drawing adds
// is the mirror.
//
// The cells are ordered by how closely the pages moved, so the sheet runs from matched
// at the head to ragged at the foot, and the last two cells are the controls: a pair
// whose record days were within a fortnight of each other, and a pair that shared no
// record day at all. They are drawn on the identical geometry, so the comparison is
// the picture rather than a claim about it.
//
// The sheet reflows rather than scales: three columns, two, or one, by the room there
// is, and the type never moves off 14px on a desktop or 13px on a phone.
import {
  text, line, rect, path, ramp, title, clamp, decodeTrack, runsOf,
  wrapList, wrapWords, advance, svg, INK, RULE,
} from './lib.js'

export const COLS_3 = 1000
export const COLS_2 = 640

export function heroLayout(W, measure = advance) {
  const phone = W < 560
  const pad = phone ? 16 : W < 900 ? 24 : 36
  const size = phone ? 13 : 14
  const cols = W >= COLS_3 ? 3 : W >= COLS_2 ? 2 : 1
  const gut = cols === 1 ? 0 : 28
  const cellW = (W - 2 * pad - (cols - 1) * gut) / cols
  return {
    W, phone, pad, size, cols, gut, cellW,
    lead: phone ? 16 : 17,
    // The plot is deeper where there is room for it, because what has to be read is a
    // silhouette, and a squashed silhouette is a line.
    half: clamp(30, cellW * 0.115, 52),
  }
}

// One cell: its head lines, then the mirrored fills under them.
function cell(L, x0, y0, spec, measure) {
  const { size, cellW } = L
  const out = []
  const col = spec.colour
  const room = cellW - measure(spec.tieText, size, 600) - 14
  const names = spec.names.slice()
  // A group can hold a page that carries no year of readings, and a cell that quietly
  // drew fewer pages than the group has would be short without saying so.
  if (spec.short) names.push(spec.short)
  const nameLines = wrapList(names, room, size, measure)
  out.push(text(x0, y0 + size, spec.head, { size, weight: 600, fill: INK, opacity: 0.85 }))
  out.push(text(x0 + cellW, y0 + size, spec.tieText, { size, weight: 600, anchor: 'end', fill: col }))
  nameLines.forEach((s, i) => out.push(text(x0, y0 + size + (i + 1) * L.lead, s, { size, fill: INK, opacity: 0.62 })))

  const mid = y0 + size + (nameLines.length + 1) * L.lead + 8 + L.half
  const n = spec.tracks[0].length
  const x = (i) => x0 + (i / (n - 1)) * cellW
  const y = (v, s) => mid - s * clamp(-1, v / spec.clip, 1) * L.half
  out.push(line(x0, mid, x0 + cellW, mid, { stroke: INK, width: 1, opacity: 0.28 }))
  out.push('<g style="mix-blend-mode:multiply">')
  spec.tracks.forEach((v, j) => {
    const s = j % 2 ? -1 : 1
    for (const r of runsOf(v)) {
      const d = 'M ' + x(r[0][0]).toFixed(1) + ' ' + mid.toFixed(1) + ' L ' +
        r.map(([i, val]) => x(i).toFixed(1) + ' ' + y(val, s).toFixed(1)).join(' L ') +
        ' L ' + x(r[r.length - 1][0]).toFixed(1) + ' ' + mid.toFixed(1) + ' Z'
      out.push(path(d, { fill: col, opacity: j > 1 ? 0.22 : 0.5 }))
    }
  })
  out.push('</g>')
  return { body: out.join(''), h: mid + L.half - y0 + 14 }
}

export function hero(c, W, env = {}) {
  const measure = env.measure || advance
  const L = heroLayout(W, measure)
  const { pad, size, cols, cellW, gut } = L
  const clip = c.tracks.clip
  const out = []
  const trackOf = (article) => {
    for (const k of c.constellations) {
      for (const p of k.pages) if (p.article === article && p.track) return decodeTrack(p.track, clip)
    }
    return null
  }

  // --- the cells, ordered by how closely the pages moved --------------------
  const measured = c.constellations
    .filter((k) => k.median !== null && k.pages.filter((p) => p.track).length >= 2)
    .sort((a, b) => b.median - a.median)
  const specs = measured.map((k) => {
    const pages = k.pages.filter((p) => p.track).sort((a, b) => b.peak - a.peak)
    return {
      head: k.date,
      names: pages.map((p) => title(p.article)),
      tieText: k.median.toFixed(3),
      colour: ramp(Math.max(0, k.median)),
      tracks: pages.map((p) => decodeTrack(p.track, clip)),
      // A page of the group with no year of readings is named rather than dropped, so
      // the cell is never quietly short of the group it stands for.
      short: k.pages.filter((p) => !p.track).length
        ? 'no year of readings: ' + k.pages.filter((p) => !p.track).map((p) => title(p.article)).join(', ')
        : null,
      clip,
    }
  })
  // The two controls, drawn as cells rather than argued in a caption. Each is the pair
  // of its bucket whose tie sits closest to that bucket's median, so it is the typical
  // case and not a chosen one.
  const controls = [['near', 'within a fortnight'], ['far', 'no shared date']].map(([key, head]) => {
    const cp = c.bond.controls && c.bond.controls[key]
    if (!cp) return null
    const tracks = [trackOf(cp.a), trackOf(cp.b)]
    if (tracks.some((t) => !t)) return null
    return {
      head, names: [title(cp.a), title(cp.b)], tieText: cp.r.toFixed(3),
      colour: ramp(Math.max(0, cp.r)), tracks, clip, control: true,
    }
  }).filter(Boolean)

  // --- what a cell is, said once above the grid ------------------------------
  let y = size + 4
  const capW = W - 2 * pad
  const cap = wrapWords('THE YEAR AFTER THE RECORD DAY, ONE CELL PER GROUP', capW, size, measure, 600, 0.9)
  cap.forEach((s, i) => out.push(text(pad, y + i * L.lead, s, { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 })))
  y += (cap.length - 1) * L.lead + 8
  const how = wrapWords(
    'the largest page of a group rises above its line and the second falls below it, one day at a time from day ' +
    c.tracks.from + ' to day ' + c.tracks.to + ' after the record day. a group read unusually on the same days ' +
    'closes into one shape with two matching halves. a third or fourth page rides behind, paler.',
    capW, size, measure)
  how.forEach((s, i) => out.push(text(pad, y + size + i * L.lead, s, { size, fill: INK, opacity: 0.6 })))
  y += how.length * L.lead + 8
  const ord = wrapWords('the cells run from the group whose pages moved together most down to the two controls ' +
    'at the foot, which are drawn on the same geometry. the figure at the right of a cell is its tie.',
    capW, size, measure)
  ord.forEach((s, i) => out.push(text(pad, y + size + i * L.lead, s, { size, fill: INK, opacity: 0.6 })))
  y += ord.length * L.lead + 14
  out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
  y += 22

  // --- lay the grid out ------------------------------------------------------
  // The controls start a fresh row rather than filling the tail of the last group row,
  // so they cannot be mistaken for two more groups.
  const rows = []
  for (let i = 0; i < specs.length; i += cols) rows.push(specs.slice(i, i + cols))
  for (let i = 0; i < controls.length; i += cols) rows.push(controls.slice(i, i + cols))
  let cells = 0
  for (const row of rows) {
    const drawn = row.map((s, j) => ({ s, c: cell(L, pad + j * (cellW + gut), y, s, measure) }))
    const h = Math.max(...drawn.map((r) => r.c.h))
    if (row[0].control) {
      out.push(rect(pad - 10, y - 12, W - 2 * pad + 20, h + 12, { fill: RULE, opacity: 0.18, rx: 3 }))
    }
    drawn.forEach((r) => out.push(r.c.body))
    cells += drawn.length
    y += h + (L.phone ? 16 : 22)
  }

  // --- the groups with no measurable tie. A missing reading is not a zero. ----
  const unmeasured = c.constellations.filter((k) => k.median === null).sort((a, b) => a.date.localeCompare(b.date))
  if (unmeasured.length) {
    y += 4
    out.push(line(pad, y, W - pad, y, { stroke: RULE, width: 1 }))
    y += 16 + size
    out.push(text(pad, y, 'NO MEASUREMENT', { size, weight: 600, tracking: 0.9, fill: INK, opacity: 0.72 }))
    y += 12
    for (const k of unmeasured) {
      const note = k.pages.some((q) => q.renamed)
        ? 'one page was renamed, so its readings after the move measure the move'
        : 'the record day is too recent for a year of readings'
      const head = k.date + '   ' + k.pages.map((q) => title(q.article)).join(' + ')
      const hl = wrapList([head], capW, size, measure)
      const nl = wrapList([note], capW, size, measure)
      hl.forEach((s, j) => out.push(text(pad, y + size + j * L.lead, s, { size, fill: INK, opacity: 0.8 })))
      nl.forEach((s, j) => out.push(text(pad, y + size + (hl.length + j) * L.lead, s, { size, fill: INK, opacity: 0.5 })))
      y += (hl.length + nl.length) * L.lead + 10
    }
  }

  const label = c.groups.inCast + ' of the ' + c.groups.total + ' biggest reading days in the record are shared by two, ' +
    'three or four pages, in ' + c.groups.casts + ' groups. Each group is drawn as the year that followed, its largest ' +
    'page above a line and its second below, so a group that kept moving together closes into one matching shape. Half ' +
    'the same-day pairs sit at ' + c.bond.same.median + ' against ' + c.bond.far.median + ' for pairs that shared no date.'
  return { width: W, height: Math.ceil(y + 4), body: out.join(''), label, layout: L, cells }
}

export const heroSvg = (c, W, env) => {
  const r = hero(c, W, env)
  return { ...r, svg: svg(r.width, r.height, r.body, r.label) }
}
