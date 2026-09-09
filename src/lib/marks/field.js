/**
 * The hero — the stopwatch field.
 *
 * One row per page, one shared axis of days since the record day, sorted shortest first.
 * A row's mark starts at day 0 and stops on the day that page came back under twice its
 * own normal level. The right-hand edge of the ink IS the sorted duration curve.
 *
 * What is new against the shipped plate: the field is a stopwatch the reader can run. A white
 * curtain lies over the rows from "today" — day D — to the right edge, so at day 28 every page
 * still above normal is drawn only as far as day 28 and every page already back is drawn
 * complete. A curtain rather than a clip, because moving one rectangle costs a frame nothing,
 * while a clip re-rasterises all 214 paths every frame and a phone's scroll waits behind it.
 * A needle stands at day D with a knob on the axis to drag it by. The page script owns D;
 * this file only emits the geometry it needs to move it.
 *
 * Drawn 1:1 and redrawn at the reader's width. Type size is emitted here, never in CSS. The
 * field is never cut for a label: names live in the corner the sorted curve leaves empty.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'
import { esc, T, nameW, figW } from './util.js'

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

// Rows named where the plate is too narrow for a column beside it.
const NARROW = new Set([
  'FIFA_World_Cup', 'WrestleMania_33', '88th_Academy_Awards', 'Kamala_Harris', 'Tom_Brady',
  'Jerry_Springer',
])

export const AXIS_H = 10

export function field(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const M = { l: 0, r: phone ? 2 : 14, t: phone ? 34 : 36, lab: phone ? 0 : 252 }
  const XMAX = P.axis.max
  const RUNOFF = 46
  const axisW = Math.max(120, W - M.r - M.lab - M.l - (phone ? RUNOFF : 0))
  const x = (d) => M.l + (d / XMAX) * axisW

  const rowH = phone ? 2.2 : 2.8
  const floor = 1.2
  const stops = P.stops
  const named = phone ? NARROW : new Set(P.named)

  const fig = (r) => r.kind === 'back' ? `${r.dur} day${r.dur === 1 ? '' : 's'}` : 'never'
  const tint = (r) => r.kind === 'back' ? ink(r.dur, stops) : HEX[HEX.length - 1]
  const endX = (r) => r.kind === 'back' ? Math.max(x(0) + floor, x(r.dur)) : x(P.stat.max)

  const bandText = `${P.stat.holdout + P.stat.running} pages never returned to normal. ${P.stat.holdout} of those were tracked for a full year`
  const bandRoom = phone ? W - M.r : W - M.r - M.lab + 4
  const bandLines = wrap(bandText, Math.floor(bandRoom / (fs * 0.53)))
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
  const axisY = plotBottom + (phone ? 30 : 34)
  const H = Math.ceil(axisY + AXIS_H + (phone ? 56 : 62))
  const onEnd = (P.stat.max / XMAX) * axisW + RUNOFF

  // ---- the field -----------------------------------------------------------
  const marks = []
  laid.forEach(({ r, top }, i) => {
    const back = r.kind === 'back'
    const x0 = x(0)
    const x1 = back ? Math.max(x0 + floor, x(r.dur)) : onEnd
    const h0 = back ? rowH : rowH - 0.9
    const h1 = back ? Math.max(0.9, rowH * 0.55) : h0
    const d = `M${x0.toFixed(2)} ${top.toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH - h1) / 2).toFixed(2)}` +
      `L${x1.toFixed(2)} ${(top + (rowH + h1) / 2).toFixed(2)}` +
      `L${x0.toFixed(2)} ${(top + h0).toFixed(2)}Z`
    marks.push(`<path d="${d}" fill="${back ? ink(r.dur, stops) : 'url(#onward)'}" data-i="${i}"/>`)
  })

  // ---- the median, cased in the ground so it reads over ink and over white ---
  const mx = x(P.stat.median)
  const notes = [
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="#fff" stroke-width="3"/>`,
    `<line x1="${mx.toFixed(2)}" y1="${(M.t - 8).toFixed(2)}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
    T('m-note', mx + 7, M.t - 13, fs, ACCENT, `middle value ${P.stat.median} days`),
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
    const lx = phone ? fx - figW(fs, f) - 10 : fx - M.lab + 14
    const leadTo = phone ? lx - nameW(fs, n) - 10 : lx - 10
    notes.push(
      `<g class="m-lab" data-dur="${r.kind === 'back' ? r.dur : 999}">` +
      `<path d="M${endX(r).toFixed(2)} ${(top + rowH / 2).toFixed(2)}L${leadTo.toFixed(2)} ${(ty - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>` +
      T('m-name', lx, ty, fs, INK, esc(n), phone ? 'end' : null) +
      T('m-fig', fx, ty, fs, tint(r), esc(f), 'end') + `</g>`)
  }

  // ---- the break before the band, and anything labelled inside it -----------
  let by = bandTop + fs + 2
  for (const r of inBreak) {
    const l = laid.find((q) => q.r === r)
    const nx = W - M.r - figW(fs, fig(r)) - 10
    notes.push(
      `<g class="m-lab" data-dur="${r.dur}">` +
      `<path d="M${endX(r).toFixed(2)} ${(l.top + rowH / 2).toFixed(2)}L${(nx - nameW(fs, r.t) - 10).toFixed(2)} ${(by - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>` +
      T('m-name', nx, by, fs, INK, esc(r.t), 'end') +
      T('m-fig', W - M.r, by, fs, tint(r), esc(fig(r)), 'end') + `</g>`)
    by += fs + 6
  }
  bandLines.forEach((ln, i) => notes.push(T('m-band', x(0), by + i * (fs + 4), fs, MUTED, esc(ln))))

  // ---- the axis, which is also the key, and the knob that rides it ----------
  const ticks = W < 370 ? [0, 90, 180, 340] : phone ? [0, 30, 90, 180, 340] : [0, 30, 90, 180, 270, 340]
  const ax0 = x(0), ax1 = x(P.stat.max)
  const axis = [`<rect class="m-axis" x="${ax0.toFixed(2)}" y="${axisY.toFixed(2)}" width="${(ax1 - ax0).toFixed(2)}" height="${AXIS_H}" rx="2" fill="url(#ramp)"/>`]
  ticks.forEach((t, i) => {
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(axisY + AXIS_H).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(axisY + AXIS_H + 5).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, axisY + AXIS_H + 5 + fs + 4, fs, MUTED, String(t),
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'))
  })
  axis.push(T('m-tick', (ax0 + ax1) / 2, axisY + AXIS_H + 5 + (fs + 4) * 2 + 2, fs, MUTED, 'days since the record day', 'middle'))

  const rampStops = stops.map((s, i) =>
    `<stop offset="${((x(s) - ax0) / (ax1 - ax0) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  // The needle. It rests at the end of the axis, which is the finished field.
  const ny = axisY + AXIS_H / 2
  const needle =
    `<g class="m-needle" transform="translate(${ax1.toFixed(2)} 0)">` +
    `<line x1="0" y1="${(M.t - 6).toFixed(2)}" x2="0" y2="${(ny - 12).toFixed(2)}" stroke="#fff" stroke-width="3.5"/>` +
    `<line x1="0" y1="${(M.t - 6).toFixed(2)}" x2="0" y2="${(ny - 12).toFixed(2)}" stroke="${INK}" stroke-width="1.4"/>` +
    `<circle class="m-knob-hit" cx="0" cy="${ny.toFixed(2)}" r="24" fill="transparent"/>` +
    `<circle class="m-knob" cx="0" cy="${ny.toFixed(2)}" r="10" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="0" cy="${ny.toFixed(2)}" r="3.2" fill="${INK}"/>` +
    `</g>`

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Bar chart. ${P.stat.drawn} English Wikipedia pages, one bar each, sorted shortest to longest. A bar shows how many days that page took to return to its normal traffic level after its biggest day. The middle value is ${P.stat.median} days, the shortest ${P.stat.min} and the longest ${P.stat.max}. ${P.stat.holdout + P.stat.running} pages never returned and their bars run off the right edge.">` +
    `<defs><linearGradient id="ramp" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${ax1}">${rampStops}</linearGradient>` +
    `<linearGradient id="onward" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${onEnd}">` +
    `<stop offset="0%" stop-color="${HEX[4]}"/>` +
    `<stop offset="${(((ax1 - ax0) / (onEnd - ax0)) * 100).toFixed(1)}%" stop-color="${HEX[4]}"/>` +
    `<stop offset="100%" stop-color="${HEX[4]}" stop-opacity="0"/></linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>` +
    `<rect class="m-hi" x="0" y="-10" width="0" height="0" fill="none" stroke="${INK}" stroke-width="1"/>` +
    `<rect class="m-curtain" x="${W}" y="${(M.t - 12).toFixed(2)}" width="${W}" height="${(plotBottom - M.t + 24).toFixed(2)}" fill="#fff"/>` +
    `${notes.join('')}${axis.join('')}${needle}</svg>`

  return {
    svg,
    height: H,
    rows: laid.map(({ r, top }, i) => ({ i, top, h: rowH, t: r.t, kind: r.kind, dur: r.dur, peak: r.peak, d: r.d })),
    geo: { x0: ax0, x1: ax1, axisW, xmax: XMAX, last: P.stat.max, top: M.t, bottom: plotBottom, axisY, needleY: ny, W, phone },
  }
}
