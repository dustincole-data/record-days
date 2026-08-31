/**
 * The plate for F4 — the same 196 pages, cut into five groups by the day before.
 *
 * Five stacked shapes on the SAME scale beat 03 uses, at the same margins, so 1x sits at the
 * same place on the page in both plates and a reader can read straight down. That shared
 * scale is a claim, and 06_groups.mjs asserts the two payloads carry one axis object rather
 * than two matching copies.
 *
 * Each shape is where that group's pages sit along the scale: taller means more of them at
 * that point. The shapes are translucent and overlap, so where two groups sit in the same
 * place the ink deepens. The vertical scale is shared across all five, which is why a group
 * with more pages at one value stands taller than one with fewer.
 *
 * The medians, the counts and the pivot are the guarded numbers. The shape itself is drawn
 * with a kernel a fifth of a decade wide, stated in the method tail on the page, and no copy
 * anywhere rests on a bump in it.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

export function groups(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  const M = { l: 0, r: phone ? 2 : 14 }
  const plotW = Math.max(120, W - M.l - M.r)
  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const x = (v) => M.l + ((L(v) - lo) / (hi - lo)) * plotW
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)
  const pivotX = x(P.scale.pivot)

  const RH = phone ? 62 : 78                 // one row per group
  const AMP = RH * 1.25                      // how tall the tallest shape is drawn
  const top = phone ? 16 : 20
  const base = (i) => top + (i + 1) * RH
  const lastBase = base(P.groups.length - 1)
  const stripY = lastBase + 18
  const tickY = stripY + 7 + 5 + fs
  const pivotLabelY = tickY + fs + 4
  const H = Math.ceil(pivotLabelY + 10)

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the five shapes -----------------------------------------------------
  const marks = [], notes = []
  P.groups.forEach((g, i) => {
    const y0 = base(i)
    const n = g.d.length
    const pt = (j) => [M.l + (plotW * j) / (n - 1), y0 - g.d[j] * AMP]
    let d = `M${M.l.toFixed(2)} ${y0.toFixed(2)}`
    for (let j = 0; j < n; j++) { const [px, py] = pt(j); d += `L${px.toFixed(2)} ${py.toFixed(2)}` }
    d += `L${(M.l + plotW).toFixed(2)} ${y0.toFixed(2)}Z`
    marks.push(
      `<line x1="${M.l.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${(M.l + plotW).toFixed(2)}" y2="${y0.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
      `<path d="${d}" fill="url(#ramp4)" fill-opacity="0.62"/>`,
      `<path d="${d}" fill="none" stroke="${tint(g.modeAt)}" stroke-width="1.3" stroke-linejoin="round"/>`)
    // the middle page of the group, which is the number the copy rests on
    const mx = x(g.median)
    const mj = Math.round(((L(g.median) - lo) / (hi - lo)) * (n - 1))
    marks.push(`<line x1="${mx.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${mx.toFixed(2)}" y2="${(y0 - g.d[mj] * AMP).toFixed(2)}" stroke="${tint(g.median)}" stroke-width="2"/>`)
    // named in the room the shapes leave, which is everything right of ten times
    notes.push(
      T('m-fig', W - M.r, y0 - 7 - Math.round(fs * 1.45), tint(g.median), 'end', g.median.toFixed(2) + 'x'),
      T('m-name', W - M.r, y0 - 7, MUTED, 'end', esc(g.name)))
  })

  // ---- the pivot, through every row ----------------------------------------
  notes.push(
    `<line x1="${pivotX.toFixed(2)}" y1="${(top + 6).toFixed(2)}" x2="${pivotX.toFixed(2)}" y2="${(stripY - 1).toFixed(2)}" stroke="#fff" stroke-width="3.4"/>`,
    `<line x1="${pivotX.toFixed(2)}" y1="${(top + 6).toFixed(2)}" x2="${pivotX.toFixed(2)}" y2="${(stripY - 1).toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`)

  // ---- the axis, which is also the key -------------------------------------
  const ticks = phone ? P.scale.narrow : P.scale.ticks
  const axis = [`<rect x="${M.l.toFixed(2)}" y="${stripY.toFixed(2)}" width="${plotW.toFixed(2)}" height="7" fill="url(#ramp4)"/>`]
  ticks.forEach((t, i) => {
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(stripY + 7).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(stripY + 11).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, tickY, MUTED,
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', P.scale.labels[P.scale.ticks.indexOf(t)]))
  })
  axis.push(T('m-note', pivotX, pivotLabelY, ACCENT, 'middle', 'same as before'))

  const rampStops = P.stops.map((s, i) =>
    `<stop offset="${(((x(s) - M.l) / plotW) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  const g0 = P.groups[0]
  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Five shapes on one scale of times its normal level, one per group. The ${P.stat.n} pages ` +
    `are ordered by their traffic the day before the record day and cut into five equal groups. ` +
    `The quietest group, at ${P.stat.quietestHiText} of its record day or less, has a middle value of ` +
    `${g0.median}x and ${g0.abovePct} per cent of it ended above its normal level. The other four groups ` +
    `have middle values of ${P.groups.slice(1).map((g) => g.median + 'x').join(', ')}, all below their ` +
    `normal level.">` +
    `<defs><linearGradient id="ramp4" gradientUnits="userSpaceOnUse" x1="${M.l}" x2="${M.l + plotW}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
