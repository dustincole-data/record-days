/**
 * The plate for F9 — the anniversary.
 *
 * ONE COLUMN IS ONE PAGE. One cell is that page on one day, and its ink is how many times that
 * day reads the page's own level around its anniversary. The days run DOWN the plate, 330 at
 * the top to 400 at the foot, so the day the record is a year old is one row across the middle
 * of the field and the finding is a band rather than a number printed beside one.
 *
 * The columns are sorted by that middle row, biggest first, which is what makes the count
 * legible: the band is coloured for the 177 pages that read above their own level and fades
 * where the last 22 do not. The hairline is drawn at that crossing and nowhere else.
 *
 * WHY THE FIELD IS PALE. The quantity is a lift, so a day at or below a page's own level is
 * nothing happening and is drawn as nothing happening: the ink is the ramp but the opacity is
 * the lift, floored at a tenth. That leaves one focal point in a field that is still painted
 * wall to wall, which is what the standards ask for and what a raster at full strength would
 * destroy.
 *
 * WHY IT IS QUANTISED. 199 columns of 71 days is 14,129 cells, and one rect each would be a
 * megabyte of markup redrawn on every resize. `10` emits a bin per cell instead, and equal
 * bins that touch inside a column are drawn as one rect, so the quiet field costs a few runs a
 * column. The bin is decided in the pipeline, so nothing the eye sees was decided here.
 *
 * Type size is emitted here, never in a stylesheet. See held.js for what that cost once.
 */
import { ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

export function annual(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  // ---- the ink, one entry per bin -----------------------------------------
  const stops = P.stops.map(L)
  const lo = L(P.meta.cutLo), hi = L(P.meta.cutHi)
  const val = (b) => Math.pow(10, lo + ((hi - lo) * b) / (P.meta.bins - 1))
  const fills = [], alphas = []
  for (let b = 0; b < P.meta.bins; b++) {
    const v = val(b)
    fills.push(ink(L(v), stops))
    // 1x is nothing happening; 3x is the full weight of the ink.
    alphas.push(+(0.10 + 0.90 * Math.max(0, Math.min(1, L(v) / L(3)))).toFixed(3))
  }

  // ---- the box -------------------------------------------------------------
  // The left margin is the width of the widest day figure plus its tick, measured rather than
  // guessed: at 13px a three-figure mono day is 29px and a 30px margin clipped every label.
  const M = { l: Math.ceil(fig(fs, String(P.meta.to))) + 9, r: phone ? 2 : 10 }
  const plotW = Math.max(120, W - M.l - M.r)
  const colW = plotW / P.rows.length
  const rowH = Math.max(3.4, Math.min(9, colW * 1.4))
  const fieldH = rowH * P.days.length

  const nameY = 6 + fs                       // the named column, above the field
  const countY = nameY + fs + 6              // the two counts either side of the crossing
  const top = countY + 12
  const base = top + fieldH
  const keyY = base + 22
  const keyTickY = keyY + 7 + 5 + fs
  const H = Math.ceil(keyTickY + 8)

  const x = (i) => M.l + i * colW
  const y = (d) => top + (d - P.meta.from) * rowH

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the field ----------------------------------------------------------
  // Runs of one bin inside a column are one rectangle, and every rectangle of one bin is a
  // subpath of that bin's single path. Ten paths carry fourteen thousand cells. Drawn as
  // rectangles it was 9,510 nodes and 884 KB of markup, redrawn on every resize.
  const dd = Array.from({ length: P.meta.bins }, () => [])
  const w = (colW + 0.35).toFixed(2)         // a shade of overlap: no ground shows between columns
  P.rows.forEach((r, i) => {
    const x0 = x(i).toFixed(1)
    let s = 0
    for (let k = 1; k <= r.c.length; k++) {
      if (k < r.c.length && r.c[k] === r.c[s]) continue
      const ch = r.c[s]
      if (ch !== '.') {
        dd[ch.charCodeAt(0) - 48].push(
          `M${x0} ${(top + s * rowH).toFixed(1)}h${w}v${((k - s) * rowH).toFixed(1)}h-${w}z`)
      }
      s = k
    }
  })
  const cols = dd.map((d, b) => d.length
    ? `<path d="${d.join('')}" fill="${fills[b]}" fill-opacity="${alphas[b]}"/>` : '')

  // ---- the day scale, down the left ---------------------------------------
  // How many days to skip is computed from the room one day has, never from a width
  // breakpoint, and 365 is always in the set because it is what the plate is about.
  const step = [5, 10, 20, 35].find((s) => s * rowH >= fs + 5) || 35
  const marks = []
  for (let d = P.meta.day; d >= P.meta.from; d -= step) marks.unshift(d)
  for (let d = P.meta.day + step; d <= P.meta.to; d += step) marks.push(d)
  const scale = marks.map((d) => {
    const isDay = d === P.meta.day
    return `<line x1="${(M.l - 5).toFixed(2)}" y1="${(y(d) + rowH / 2).toFixed(2)}" x2="${(M.l - 1).toFixed(2)}" ` +
      `y2="${(y(d) + rowH / 2).toFixed(2)}" stroke="${isDay ? ACCENT : HAIR}" stroke-width="${isDay ? 1.6 : 1}"/>` +
      T('m-tick', M.l - 8, y(d) + rowH / 2 + fs * 0.35, isDay ? ACCENT : MUTED, 'end', String(d))
  })

  // ---- the crossing, and the two counts -----------------------------------
  const cx = x(P.stat.above1)
  const notes = [
    `<line x1="${cx.toFixed(2)}" y1="${(top - 6).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(base + 4).toFixed(2)}" stroke="#fff" stroke-width="3"/>`,
    `<line x1="${cx.toFixed(2)}" y1="${(top - 6).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(base + 4).toFixed(2)}" stroke="${INK}" stroke-width="1"/>`,
    T('m-fig', cx - 6, countY, INK, 'end', String(P.stat.above1)),
    T('m-fig', cx + 6, countY, MUTED, null, String(P.stat.n - P.stat.above1)),
  ]
  // The two counts are always drawn. The words beside them are measured against the room each
  // one actually has, which is the gap between the crossing and its own wall, and both are
  // dropped together rather than leaving a lone half-sentence: the caption carries the rest.
  const lTxt = 'read above their own level', rTxt = 'did not'
  const lx = cx - 12 - fig(fs, String(P.stat.above1))
  const rx = cx + 12 + fig(fs, String(P.stat.n - P.stat.above1))
  if (name(fs, lTxt) <= lx - M.l && name(fs, rTxt) <= M.l + plotW - rx) {
    notes.push(T('m-name', lx, countY, MUTED, 'end', lTxt), T('m-name', rx, countY, MUTED, null, rTxt))
  }

  // ---- the tallest column, named ------------------------------------------
  const t0 = P.top[0]
  notes.push(
    `<line x1="${(x(0) + colW / 2).toFixed(2)}" y1="${(nameY + 5).toFixed(2)}" x2="${(x(0) + colW / 2).toFixed(2)}" y2="${(top - 2).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
    T('m-name', M.l, nameY, INK, null, esc(t0.t)),
    T('m-fig', M.l + name(fs, t0.t) + 8, nameY, fills[fills.length - 1], null, esc(t0.text)))

  // ---- the key. The colour is a quantity, and the axis it runs on is not on -
  // the plate, so this strip is the only place it can be read.
  const kw = plotW
  const kx = (v) => M.l + ((L(v) - lo) / (hi - lo)) * kw
  const key = [`<rect x="${M.l.toFixed(2)}" y="${keyY.toFixed(2)}" width="${kw.toFixed(2)}" height="7" fill="url(#ramp8)"/>`]
  // A string keeps its words only where it fits beside the next label along. On a phone the
  // first tick is set short, and the caption carries what the words said.
  const ticks = phone
    ? [[P.meta.cutLo, '1x'], [P.stat.median, P.stat.median + 'x'], [P.meta.cutHi, P.meta.cutHi + 'x+']]
    : [[P.meta.cutLo, '1x or less'], [P.stat.median, P.stat.median + 'x'], [4, '4x'], [P.meta.cutHi, P.meta.cutHi + 'x+']]
  ticks.forEach(([t, label], i) => {
    key.push(`<line x1="${kx(t).toFixed(2)}" y1="${(keyY + 7).toFixed(2)}" x2="${kx(t).toFixed(2)}" y2="${(keyY + 11).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    key.push(T('m-tick', kx(t), keyTickY, t === P.stat.median ? ACCENT : MUTED,
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', label))
  })

  // The strip is painted from the SAME ten bins the field is, opacity included, so a colour
  // on the key is a colour in the field rather than a second version of one.
  const rampStops = fills.map((f, b) =>
    `<stop offset="${((100 * b) / (P.meta.bins - 1)).toFixed(2)}%" stop-color="${f}" stop-opacity="${alphas[b]}"/>`).join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A field of ${P.rows.length} columns and ${P.days.length} rows. Each column is one ` +
    `Wikipedia page and each row is one day, from ${P.meta.from} to ${P.meta.to} days after that ` +
    `page's record day. A cell is coloured by how many times that day's traffic reads the page's ` +
    `own level around the anniversary. The row at day ${P.meta.day} is the only one that colours ` +
    `across the field: ${P.stat.above1} of the ${P.stat.n} pages read above their own level on ` +
    `that one day, a middle value of ${P.stat.median} times, and the other ${P.stat.n - P.stat.above1} do not.">` +
    `<defs><linearGradient id="ramp8" gradientUnits="userSpaceOnUse" x1="${M.l}" x2="${M.l + kw}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${cols.join('')}</g>${scale.join('')}${notes.join('')}${key.join('')}</svg>`

  return { svg, height: H }
}

// The measure follows the face: words are set in the text face, figures in the wide mono.
// 0.60 is the measured budget for this face, not the 0.53 the earlier plates use.
function name(fs, s) { return fs * 0.60 * s.length }
function fig(fs, s) { return fs * 0.75 * s.length }
