/**
 * The plate for F3 — where the traffic settled.
 *
 * One square per page, stacked into a bin on a log scale of "times its own normal level",
 * with the pivot at 1. The share is the area: a reader counts the two halves by looking at
 * them rather than by reading a number off a label.
 *
 * The scale is the same one beat 04 is drawn on, and 06 asserts that as one object rather
 * than as two matching copies. The axis strip is painted in the ramp, so a square's colour
 * is the axis colour at the value it sits at, and the middle stop of that ramp is the pivot,
 * which is also the page's accent ink.
 *
 * BIN WIDTH FOLLOWS THE PLATE. The number of bins is chosen so a square is never smaller
 * than the eye can group, which means the shape is coarser on a phone and finer on a desk.
 * The counts either side of the pivot are bin-independent and are what the copy rests on.
 *
 * Type size is emitted here, never in a stylesheet. See held.js for what that cost once.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

export function settle(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  const M = { l: 0, r: phone ? 2 : 14 }
  const plotW = Math.max(120, W - M.l - M.r)
  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const x = (v) => M.l + ((L(v) - lo) / (hi - lo)) * plotW
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)
  const pivotX = x(P.scale.pivot)

  // ---- bin the field -------------------------------------------------------
  // The bin edges are laid out FROM the pivot, not from the left wall. The caption tells a
  // reader that squares right of the line ended busier, and a bin that straddles the line
  // would make that sentence false for whatever is in it.
  const bins = Math.max(28, Math.min(80, Math.round(plotW / (phone ? 9 : 14))))
  const cell = plotW / bins
  const binW = (hi - lo) / bins
  const sq = Math.max(2.4, cell - Math.min(1.8, cell * 0.2))
  const binOf = (v) => Math.floor((L(v) - L(P.scale.pivot)) / binW)
  const left = (b) => Math.max(M.l, Math.min(M.l + plotW - cell, pivotX + b * cell))
  const stack = new Map()
  const placed = P.rows.map((r) => {
    const b = binOf(r.x)
    const k = stack.get(b) ?? 0
    stack.set(b, k + 1)
    return { r, b, k }
  })
  const tallest = Math.max(...stack.values())

  // ---- vertical structure --------------------------------------------------
  const line2 = phone ? 0 : fs + 3
  const countY = 6 + fs
  const histTop = countY + line2 + 16
  const histBase = histTop + tallest * cell
  const stripY = histBase + 5
  const tickY = stripY + 7 + 5 + fs
  const pivotLabelY = tickY + fs + 4
  const H = Math.ceil(pivotLabelY + 10)

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the field -----------------------------------------------------------
  const marks = placed.map(({ r, b, k }) =>
    `<rect x="${(left(b) + (cell - sq) / 2).toFixed(2)}" y="${(histBase - (k + 1) * cell + (cell - sq) / 2).toFixed(2)}" ` +
    `width="${sq.toFixed(2)}" height="${sq.toFixed(2)}" fill="${tint(r.x)}" ` +
    `data-t="${esc(r.t)}" data-v="${esc(fmt(r.x))}"/>`)

  // ---- the pivot, cased so it reads over ink and over white -----------------
  const notes = [
    `<line x1="${pivotX.toFixed(2)}" y1="${(histTop - 10).toFixed(2)}" x2="${pivotX.toFixed(2)}" y2="${(stripY - 1).toFixed(2)}" stroke="#fff" stroke-width="3.4"/>`,
    `<line x1="${pivotX.toFixed(2)}" y1="${(histTop - 10).toFixed(2)}" x2="${pivotX.toFixed(2)}" y2="${(stripY - 1).toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
  ]

  // ---- what each half of the field is --------------------------------------
  if (phone) {
    notes.push(
      T('m-fig', M.l, countY, tint(0.2), null, P.stat.below + ' below'),
      T('m-fig', W - M.r, countY, tint(6), 'end', P.stat.above + ' above'))
  } else {
    notes.push(
      T('m-fig', M.l, countY, tint(0.2), null, P.stat.below + ' pages'),
      T('m-name', M.l, countY + line2, MUTED, null, 'ended below their normal level'),
      T('m-fig', W - M.r, countY, tint(6), 'end', P.stat.above + ' pages'),
      T('m-name', W - M.r, countY + line2, MUTED, 'end', 'ended above it'))
  }

  // ---- the two walls, named against the edge they sit on -------------------
  // A label is placed above the TALLEST stack it covers, not above the one square it names.
  // The first draft cleared only its own square and the text lay across the field wherever
  // the skyline rose under the rest of the label, which on a phone was most of it.
  const nameW = (s) => fs * 0.53 * s.length
  const figW = (s) => fs * 0.75 * s.length
  const wall = (r, right) => {
    const b = binOf(r.x)
    const wLab = Math.max(nameW(r.t), figW(r.text))
    const tx = right ? W - M.r : M.l
    const x0 = right ? tx - wLab : tx
    let h = stack.get(b) ?? 1
    for (const [bb, c] of stack) {
      const bx = left(bb)
      if (bx + cell > x0 - 4 && bx < x0 + wLab + 4) h = Math.max(h, c)
    }
    const top = histBase - h * cell
    const cx = left(b) + cell / 2
    return [
      `<line x1="${cx.toFixed(2)}" y1="${(histBase - (stack.get(b) ?? 1) * cell - 3).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(top - 6).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
      T('m-name', tx, top - 9 - fs - 3, INK, right ? 'end' : null, esc(r.t)),
      T('m-fig', tx, top - 9, tint(r.x), right ? 'end' : null, esc(r.text)),
    ]
  }
  notes.push(...wall(P.risen[0], true), ...wall(P.fallen[0], false))

  // ---- the axis, which is also the key -------------------------------------
  const ticks = phone ? P.scale.narrow : P.scale.ticks
  const axis = [`<rect x="${M.l.toFixed(2)}" y="${stripY.toFixed(2)}" width="${plotW.toFixed(2)}" height="7" fill="url(#ramp3)"/>`]
  ticks.forEach((t, i) => {
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(stripY + 7).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(stripY + 11).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, tickY, MUTED,
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', P.scale.labels[P.scale.ticks.indexOf(t)]))
  })
  axis.push(T('m-note', pivotX, pivotLabelY, ACCENT, 'middle', 'same as before'))

  const rampStops = P.stops.map((s, i) =>
    `<stop offset="${(((x(s) - M.l) / plotW) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A distribution. Each of the ${P.stat.n} squares is one Wikipedia page, placed by its ` +
    `daily traffic 300 to 340 days after its record day divided by its normal traffic before it. ` +
    `${P.stat.below} pages ended below their normal level and ${P.stat.above} ended above it, ` +
    `which is ${P.stat.aboveRounded} per cent. The highest is ${esc(P.risen[0].t)} at ${P.risen[0].text} ` +
    `its normal level, the lowest ${esc(P.fallen[0].t)} at ${P.fallen[0].text}.">` +
    `<defs><linearGradient id="ramp3" gradientUnits="userSpaceOnUse" x1="${M.l}" x2="${M.l + plotW}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}

function fmt(x) {
  if (x >= 10) return Math.round(x) + ' times'
  if (x >= 1) return x.toFixed(1) + ' times'
  return x.toFixed(3) + ' times'
}
