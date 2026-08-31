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
 * the first while a reader sees the second.
 *
 * TYPE SIZE IS EMITTED HERE, not left to a stylesheet. The first version set it in CSS at a
 * 639px VIEWPORT breakpoint while this file measured a 640px PLOT-BOX breakpoint, and the two
 * disagree by the width of the page margins: between about 640 and 700 pixels the layout was
 * computed at 13px and rendered at 14px, and a label ran outside the plate. One breakpoint,
 * in one place, and it is this one.
 *
 * THE FIELD IS NEVER CUT. An earlier version made vertical room above each named row and put
 * the name in it, which sliced the top of the plate into five stubs floating in white — on a
 * phone the wedge stopped existing. Names now go in a column in the empty corner the sorted
 * curve leaves above itself, with a leader back to the mark, and no row is ever moved to make
 * room for text. A narrow plate has no space for that column beside the plot, so it sits
 * inside the plot's own white corner and only the rows at the short wall are named there; the
 * longest returner is labelled in the break that already separates the two groups.
 *
 * NAME AND NUMBER ARE TWO ELEMENTS, not one string. Run together they were a Schibsted word
 * followed by a wide mono figure with a ragged joint, and every label started at a different
 * x. They are columns now: the figure on one edge, the name against it.
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

// Rows named where the plate is too narrow for a column beside it. All at the short wall,
// where the curve leaves the whole width empty, plus the longest one that did come back.
const NARROW = new Set([
  'FIFA_World_Cup', 'WrestleMania_33', '88th_Academy_Awards', 'Kamala_Harris', 'Tom_Brady',
  'Jerry_Springer',
])

export function held(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  // Schibsted runs about .53em to the character; Martian Mono is a wide mono, nearer .75em.
  const nameW = (s) => fs * 0.53 * s.length
  const figW = (s) => fs * 0.75 * s.length

  const M = {
    l: 0,                     // the wall of day 0 aligns with the copy above it
    r: phone ? 2 : 14,
    t: phone ? 34 : 36,
    lab: phone ? 0 : 252,     // a column beside the plot, where there is room for one
  }
  const XMAX = P.axis.max
  // The band of pages that never came back has to have somewhere to dissolve INTO, or it
  // ends in a hard edge at the plate boundary and reads as a measured stop. On a wide plate
  // the label column is that room; on a narrow one it has to be reserved.
  const RUNOFF = 46
  const axisW = Math.max(120, W - M.r - M.lab - M.l - (phone ? RUNOFF : 0))
  const x = (d) => M.l + (d / XMAX) * axisW

  const rowH = phone ? 2.2 : 2.8
  const floor = 1.2                     // the narrowest a mark may be drawn
  const stops = P.stops
  const named = phone ? NARROW : new Set(P.named)

  // The figure column is narrow, and the caption directly above the band already says these
  // pages never returned to normal, so the column only has to carry the one word.
  const fig = (r) => r.kind === 'back' ? `${r.dur} day${r.dur === 1 ? '' : 's'}` : 'never'
  const tint = (r) => r.kind === 'back' ? ink(r.dur, stops) : HEX[HEX.length - 1]
  const endX = (r) => r.kind === 'back' ? Math.max(x(0) + floor, x(r.dur)) : x(P.stat.max)

  // The break before the pages that never came back has to hold the caption that sits in it,
  // and that caption wraps to two lines on a phone.
  const bandText = `${P.stat.holdout + P.stat.running} pages never returned to normal. ${P.stat.holdout} of those were tracked for a full year`
  const bandLines = wrap(bandText, phone ? Math.floor((W - M.r) / (fs * 0.53)) : 200)
  // On a narrow plate the longest returner is labelled inside that break as well.
  const inBreak = phone
    ? P.rows.filter((r) => named.has(r.a) && r.kind === 'back' && r.dur > P.stat.p75)
    : []
  const bandGap = (phone ? 24 : 34) + (bandLines.length - 1) * (fs + 4) + inBreak.length * (fs + 6)

  // ---- lay the rows out. Nothing here moves for a label. --------------------
  let y = M.t
  const laid = []
  let bandTop = null, lastBack = null
  for (const r of P.rows) {
    if (r.kind !== 'back' && bandTop === null) { bandTop = y; y += bandGap }
    laid.push({ r, top: y })
    if (r.kind === 'back') lastBack = y + rowH
    y += rowH
  }
  const plotBottom = y
  const axisY = plotBottom + (phone ? 26 : 30)
  const H = Math.ceil(axisY + (phone ? 58 : 64))
  const onEnd = (P.stat.max / XMAX) * axisW + RUNOFF

  // ---- the field -----------------------------------------------------------
  const marks = []
  for (const { r, top } of laid) {
    const back = r.kind === 'back'
    const x0 = x(0)
    const x1 = back ? Math.max(x0 + floor, x(r.dur)) : onEnd
    // The band held its rows edge to edge and read as one slab of gold rather than as 35
    // separate pages, so it keeps a hairline of ground the way the fray in the wedge does.
    const h0 = back ? rowH : rowH - 0.9
    const h1 = back ? Math.max(0.9, rowH * 0.55) : h0
    const d = `M${x0.toFixed(2)} ${top.toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH - h1) / 2).toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH + h1) / 2).toFixed(2)}` +
      `L${x0.toFixed(2)} ${(top + h0).toFixed(2)}Z`
    const v = back ? fig(r)
      : (r.kind === 'holdout' ? 'never returned' : 'too recent to say')
    marks.push(`<path d="${d}" fill="${back ? ink(r.dur, stops) : 'url(#onward)'}" ` +
      `data-t="${esc(r.t)}" data-v="${esc(v)}"/>`)
  }

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the median, cased in the ground so it reads over ink and over white ---
  const mx = x(P.stat.median)
  const notes = [
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="#fff" stroke-width="3"/>`,
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
    T('m-note', mx + 7, M.t - 13, ACCENT, null, `middle value ${P.stat.median} days`),
  ]

  // ---- the names -----------------------------------------------------------
  const column = laid.filter((l) => named.has(l.r.a) && !inBreak.includes(l.r))
  const step = fs + 8
  let prev = M.t + fs - step
  for (const { r, top } of column) {
    const ty = Math.max(top + rowH / 2 + fs * 0.36, prev + step)
    prev = ty
    const f = fig(r), n = r.t
    const fx = W - M.r
    // Narrow: both columns hang off the plate's right edge, so nothing is ragged mid-plate.
    // Wide: the name starts the side column and the figure closes it.
    const lx = phone ? fx - figW(f) - 10 : fx - M.lab + 14
    const leadTo = phone ? lx - nameW(n) - 10 : lx - 10
    notes.push(
      `<path d="M${endX(r).toFixed(2)} ${(top + rowH / 2).toFixed(2)}L${leadTo.toFixed(2)} ${(ty - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>`,
      T('m-name', lx, ty, INK, phone ? 'end' : null, esc(n)),
      T('m-fig', fx, ty, tint(r), 'end', esc(f)))
  }

  // ---- the break before the band, and anything labelled inside it -----------
  let by = bandTop + fs + 2
  for (const r of inBreak) {
    const l = laid.find((q) => q.r === r)
    const nx = W - M.r - figW(fig(r)) - 10
    notes.push(
      `<path d="M${endX(r).toFixed(2)} ${(l.top + rowH / 2).toFixed(2)}L${(nx - nameW(r.t) - 10).toFixed(2)} ${(by - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>`,
      T('m-name', nx, by, INK, 'end', esc(r.t)),
      T('m-fig', W - M.r, by, tint(r), 'end', esc(fig(r))))
    by += fs + 6
  }
  bandLines.forEach((ln, i) => notes.push(T('m-band', x(0), by + i * (fs + 4), MUTED, null, esc(ln))))

  // ---- the axis, which is also the key -------------------------------------
  const ticks = W < 370 ? [0, 90, 180, 340] : phone ? [0, 30, 90, 180, 340] : [0, 30, 90, 180, 270, 340]
  const ax0 = x(0), ax1 = x(P.stat.max)
  const axis = [`<rect x="${ax0.toFixed(2)}" y="${axisY.toFixed(2)}" width="${(ax1 - ax0).toFixed(2)}" height="7" fill="url(#ramp)"/>`]
  ticks.forEach((t, i) => {
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(axisY + 7).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(axisY + 12).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, axisY + 12 + fs + 5, MUTED,
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', String(t)))
  })
  axis.push(T('m-tick', (ax0 + ax1) / 2, axisY + 12 + (fs + 5) * 2 + 2, MUTED, 'middle', 'days since the record day'))

  const rampStops = stops.map((s, i) =>
    `<stop offset="${((x(s) - ax0) / (ax1 - ax0) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Bar chart. ${P.stat.drawn} English Wikipedia pages, one bar each, sorted shortest to longest. A bar shows how many days that page took to return to its normal traffic level after its biggest day. The middle value is ${P.stat.median} days, the shortest ${P.stat.min} and the longest ${P.stat.max}. ${P.stat.holdout + P.stat.running} pages never returned and their bars run off the right edge.">` +
    `<defs><linearGradient id="ramp" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${ax1}">${rampStops}</linearGradient>` +
    `<linearGradient id="onward" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${onEnd}">` +
    `<stop offset="0%" stop-color="${HEX[4]}"/>` +
    `<stop offset="${(((ax1 - ax0) / (onEnd - ax0)) * 100).toFixed(1)}%" stop-color="${HEX[4]}"/>` +
    `<stop offset="100%" stop-color="${HEX[4]}" stop-opacity="0"/></linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
