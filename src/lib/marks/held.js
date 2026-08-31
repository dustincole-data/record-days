/**
 * The plate for F1 — how long the world looked.
 *
 * One row per page, one shared axis of days since the record day, sorted shortest first.
 * A row's mark starts at day 0 and stops on the day that page came back under twice its own
 * quiet level. So the right-hand edge of the ink IS the sorted duration curve, and the
 * finding is the shape rather than a number printed beside it.
 *
 * Drawn 1:1 — the viewBox is the pixel box, no scaling — because an SVG that is scaled has
 * a font-size in user units and a rendered size in pixels, and the legibility gate measures
 * the first while a reader sees the second. Redrawn client-side at the width the reader
 * actually has rather than stretched.
 *
 * Rows are CONTIGUOUS, separated by a hairline of the ground rather than by a gap. A first
 * pass drew them with a one-pixel gap and the plate read as a stack of stripes floating in
 * white; the field has to be solid for the white to belong outside the mark. The taper is
 * what keeps it from reading as a bar chart: a mark is full height on the record day and
 * thin where it ends, so the right edge frays instead of stepping.
 *
 * Three things are drawn that a summary would drop, and each is the honesty of the section:
 *   - the band at the foot. 35 pages had not come back at all, so their marks run PAST the
 *     axis and dissolve off the plate rather than stopping on a day that never happened.
 *   - the labels sit to the right of the mark they name, on the row's own clearance, never
 *     over the field. A name printed on the ink is a name a reader has to fight for.
 *   - the floor. Under about 1.2px a mark stops existing on a phone, so the shortest rows
 *     are drawn at that floor and the method says the first two days are not separable
 *     there. Nothing else on this plate is drawn at anything but its true length.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Break a line at a character budget. SVG text does not wrap. */
function wrap(text, max) {
  const out = []
  let line = ''
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > max) { out.push(line); line = w }
    else line = line ? line + ' ' + w : w
  }
  if (line) out.push(line)
  return out
}

export function held(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  // Schibsted runs about .53em to the character; Martian Mono is a wide mono, nearer .75em.
  const wide = (name, fig) => fs * 0.53 * name.length + 6 + fs * 0.75 * fig.length

  // Wide enough for a label column beside the plot; a phone has no such room and puts each
  // name on a clearance above its own row instead.
  const side = !phone
  const M = {
    l: 0,                   // the wall of day 0 aligns with the copy above it
    r: phone ? 2 : 14,
    t: phone ? 32 : 36,
    lab: side ? 252 : 0,
  }
  const XMAX = P.axis.max
  const axisR = W - M.r - M.lab
  const axisW = Math.max(120, axisR - M.l)
  const x = (d) => M.l + (d / XMAX) * axisW

  const rowH = phone ? 2.2 : 2.8
  const lead = phone ? 20 : 22          // clearance above a row that carries a name
  const floor = 1.2                     // the narrowest a mark may be drawn

  // The break before the pages that never came back has to hold the caption that sits in it,
  // and that caption wraps to two lines on a phone.
  const bandText = `${P.stat.holdout + P.stat.running} never came back, and ${P.stat.holdout} of those were watched a full year`
  const bandLines = wrap(bandText, phone ? Math.floor((W - M.l - M.r) / (fs * 0.53)) : 200)
  const bandGap = (phone ? 26 : 34) + (bandLines.length - 1) * (fs + 4)

  const named = new Set(P.named)
  const stops = P.stops

  // ---- lay the rows out ----------------------------------------------------
  let y = M.t
  const laid = []
  let bandTop = null, lastBack = null
  for (const r of P.rows) {
    if (r.kind !== 'back' && bandTop === null) { bandTop = y; y += bandGap }
    const isNamed = named.has(r.a)
    if (isNamed && !side) y += lead
    laid.push({ r, top: y, named: isNamed, label: isNamed && !side ? y - 7 : null })
    if (r.kind === 'back') lastBack = y + rowH
    y += rowH
  }
  const plotBottom = y
  const axisY = plotBottom + (phone ? 26 : 30)
  const H = Math.ceil(axisY + (phone ? 58 : 64))

  // ---- the field -----------------------------------------------------------
  const marks = []
  for (const { r, top } of laid) {
    const back = r.kind === 'back'
    const x0 = x(0)
    const x1 = back ? Math.max(x0 + floor, x(r.dur)) : W - M.r - M.lab + (side ? 40 : 0)
    // The band held its rows edge to edge and read as one slab of gold rather than as 35
    // separate pages, so it keeps a hairline of ground the way the fray in the wedge does.
    const h0 = back ? rowH : rowH - 0.9
    const h1 = back ? Math.max(0.9, rowH * 0.55) : h0
    const d = `M${x0.toFixed(2)} ${top.toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH - h1) / 2).toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH + h1) / 2).toFixed(2)}` +
      `L${x0.toFixed(2)} ${(top + h0).toFixed(2)}Z`
    const fill = back ? ink(r.dur, stops) : 'url(#onward)'
    const days = back ? `${r.dur} day${r.dur === 1 ? '' : 's'}`
      : (r.kind === 'holdout' ? 'still above a year on' : 'the file ends first')
    marks.push(`<path d="${d}" fill="${fill}" data-t="${esc(r.t)}" data-v="${esc(days)}"/>`)
  }

  // ---- the median, cased in the ground so it reads over ink and over white ---
  const mx = x(P.stat.median)
  const notes = [
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="#fff" stroke-width="3"/>`,
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
    `<text class="m-note" x="${(mx + 7).toFixed(2)}" y="${(M.t - 13).toFixed(2)}" fill="${ACCENT}">median ${P.stat.median} days</text>`,
  ]

  // ---- the names ------------------------------------------------------------
  // A sorted duration curve leaves a large empty corner above itself. The names go there,
  // in one column beside the plot with a leader back to the mark each one belongs to, so the
  // void gets a structure and no name is ever printed over the field. The five shortest rows
  // sit within about thirty pixels of each other, so labels are pushed apart to a readable
  // spacing and the leaders lengthen rather than the labels overlapping.
  const tags = laid.filter((l) => l.named).map(({ r, top }) => {
    const back = r.kind === 'back'
    return {
      r,
      end: back ? Math.max(x(0) + floor, x(r.dur)) : x(0),
      row: top + rowH / 2,
      fig: back ? `${r.dur} day${r.dur === 1 ? '' : 's'}` : 'not back',
      tint: back ? ink(r.dur, stops) : HEX[HEX.length - 1],
    }
  })

  if (side) {
    const step = fs + 8
    let prev = -1e9
    for (const t of tags) {
      t.y = Math.max(t.row + fs * 0.36, prev + step)
      prev = t.y
    }
    const lx = W - M.r - M.lab + 14
    for (const t of tags) {
      notes.push(
        `<path d="M${t.end.toFixed(2)} ${t.row.toFixed(2)}L${(lx - 10).toFixed(2)} ${(t.y - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>`,
        `<text class="m-name" x="${lx.toFixed(2)}" y="${t.y.toFixed(2)}" fill="${INK}">${esc(t.r.t)}</text>`,
        `<text class="m-fig" x="${(W - M.r).toFixed(2)}" y="${t.y.toFixed(2)}" text-anchor="end" fill="${t.tint}">${esc(t.fig)}</text>`)
    }
  } else {
    for (const t of tags) {
      const l = laid.find((q) => q.r === t.r)
      const lxp = Math.min(Math.max(t.end + 9, M.l), W - M.r - wide(t.r.t, t.fig))
      notes.push(
        `<line x1="${t.end.toFixed(2)}" y1="${(l.top - 1).toFixed(2)}" x2="${t.end.toFixed(2)}" y2="${(l.label + 3).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
        `<text class="m-name" x="${lxp.toFixed(2)}" y="${l.label.toFixed(2)}" fill="${INK}">` +
        `${esc(t.r.t)} <tspan class="m-fig" fill="${t.tint}">${esc(t.fig)}</tspan></text>`)
    }
  }

  // ---- the band at the foot ------------------------------------------------
  bandLines.forEach((ln, i) => {
    notes.push(`<text class="m-band" x="${x(0).toFixed(2)}" y="${(bandTop + 15 + i * (fs + 4)).toFixed(2)}" fill="${MUTED}">${esc(ln)}</text>`)
  })

  // ---- the axis, which is also the key -------------------------------------
  const ticks = W < 370 ? [0, 90, 180, 340] : phone ? [0, 30, 90, 180, 340] : [0, 30, 90, 180, 270, 340]
  const ax0 = x(0), ax1 = x(P.stat.max)
  const axis = [`<rect x="${ax0.toFixed(2)}" y="${axisY.toFixed(2)}" width="${(ax1 - ax0).toFixed(2)}" height="7" fill="url(#ramp)"/>`]
  ticks.forEach((t, i) => {
    const tx = x(t)
    const anchor = i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(axisY + 7).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(axisY + 12).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(`<text class="m-tick" x="${tx.toFixed(2)}" y="${(axisY + 12 + fs + 5).toFixed(2)}" text-anchor="${anchor}" fill="${MUTED}">${t}</text>`)
  })
  axis.push(`<text class="m-tick" x="${((ax0 + ax1) / 2).toFixed(2)}" y="${(axisY + 12 + (fs + 5) * 2 + 2).toFixed(2)}" text-anchor="middle" fill="${MUTED}">days since the record day</text>`)

  const rampStops = stops.map((s, i) =>
    `<stop offset="${((x(s) - ax0) / (ax1 - ax0) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="${P.stat.drawn} of the 220 biggest reading days on Wikipedia, one bar each, sorted by how many days the page took to come back under twice its own quiet level. The median is ${P.stat.median} days, the shortest is ${P.stat.min} and the longest is ${P.stat.max}. ${P.stat.holdout + P.stat.running} had not come back at all.">` +
    `<defs><linearGradient id="ramp" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${ax1}">${rampStops}</linearGradient>` +
    `<linearGradient id="onward" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${W - M.r - M.lab + (side ? 40 : 0)}">` +
    `<stop offset="0%" stop-color="${HEX[4]}"/>` +
    `<stop offset="${(((ax1 - ax0) / (W - M.r - M.lab + (side ? 40 : 0) - ax0)) * 100).toFixed(1)}%" stop-color="${HEX[4]}"/>` +
    `<stop offset="100%" stop-color="${HEX[4]}" stop-opacity="0"/></linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
