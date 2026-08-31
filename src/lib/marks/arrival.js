/**
 * The plate for F2 — what the page had the day before.
 *
 * One horizontal log axis of views per day, painted in the ramp, with the whole file on both
 * sides of it: 220 ticks above for the record day, the same 220 pages below for the day
 * before. Every record day lands inside one decade, so the upper field is a slab. The day
 * before, those same pages were spread across nearly six, so the lower field is a smear that
 * thins to a single tick at five views. The contrast is the finding, and it is the only thing
 * this mark draws.
 *
 * NOT A BAR CHART, on purpose. Beat 01 is a field of tapered marks measured from a common
 * wall on a linear axis of days; this is a two-sided rug on a log axis of views with no
 * common wall at all. Nothing on this site may repeat a form.
 *
 * Drawn 1:1, and the type size is emitted here rather than left to a stylesheet, for the
 * reasons written at the head of held.js. One breakpoint, in one place, and it is this one.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

export function arrival(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const nameW = (s) => fs * 0.53 * s.length
  const figW = (s) => fs * 0.75 * s.length

  const M = { l: 0, r: phone ? 2 : 14 }
  const axisW = Math.max(120, W - M.l - M.r)
  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const x = (v) => M.l + ((L(v) - lo) / (hi - lo)) * axisW
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)

  // Vertical structure. The one page this section is named after is flagged rather than
  // joined: an earlier draft drew a curve from its tick below the scale to its tick above,
  // and a long diagonal across a plate reads as a trend line, which is the one thing this
  // mark is not. Its two ticks now run PAST their fields into clear ground and carry a label
  // there, so the leap is read off the scale rather than drawn as a line.
  const TH = phone ? 58 : 84                 // the height of each tick field
  const FLAG = 12                            // how far the named ticks run past their field
  const nameY = 4 + fs
  const figY = nameY + fs + 3
  const leadY = figY + 7
  const topTop = leadY + 8
  const topBase = topTop + TH
  const stripY = topBase + 4
  const labelY = stripY + 7 + 5 + fs
  const sideY = labelY + fs + 6
  const botTop = sideY + 8
  const botBase = botTop + TH
  const popeY = botBase + FLAG + fs

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the two fields ------------------------------------------------------
  const tick = (v, y0, y1, w, o) =>
    `<line x1="${x(v).toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x(v).toFixed(2)}" y2="${y1.toFixed(2)}" ` +
    `stroke="${tint(v)}" stroke-width="${w}" opacity="${o}"/>`

  const sw = phone ? 1.1 : 1.4
  const marks = []
  for (const r of P.rows) marks.push(tick(r.peak, topTop, topBase, sw, 0.5))
  for (const r of P.rows) marks.push(tick(r.before, botTop, botBase, sw, 0.5))

  // ---- the one page the section is named after -----------------------------
  // Its record day sits inside the slab where no label can reach it, so its tick runs up out
  // of the field and a leader carries the name back across the clear ground above.
  const pope = P.pope
  const popeX = Math.max(0, Math.min(x(P.stat.minPeak) - 30, W - M.r))
  const notes = [
    tick(pope.before, botTop, botBase + FLAG, 2.6, 1),
    tick(pope.peak, leadY, topBase, 2.6, 1),
    `<line x1="${(popeX + 8).toFixed(2)}" y1="${leadY.toFixed(2)}" x2="${x(pope.peak).toFixed(2)}" y2="${leadY.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
    T('m-name', popeX, nameY, INK, 'end', esc(pope.t)),
    T('m-fig', popeX, figY, ACCENT, 'end', esc(pope.peakText)),
    T('m-fig', x(pope.before), popeY, ACCENT, null, esc(pope.beforeText)),
  ]

  // ---- what each field is --------------------------------------------------
  notes.push(T('m-side', M.l, topTop + fs, MUTED, null, 'the record day'))
  notes.push(T('m-side', M.l, sideY, MUTED, null, 'the day before'))

  // ---- the rest of the tail, and the page at the other end -----------------
  // The figures sit in a column of their own rather than after each name: a name is set in a
  // proportional face and its measured width is an estimate, so figures placed against it
  // land at three different x. Right-aligned on one edge they cannot.
  const rows = []
  let lastRow = popeY
  if (!phone) {
    const labelX = x(1500)
    const colW = Math.min(340, W - M.r - labelX - 10)
    let ry = lastRow
    for (const r of P.tail) {
      ry += fs + 8
      rows.push(
        `<path d="M${x(r.before).toFixed(2)} ${botBase.toFixed(2)}L${(labelX - 8).toFixed(2)} ${(ry - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>`,
        T('m-name', labelX, ry, INK, null, esc(r.t)),
        T('m-fig', labelX + colW, ry, tint(r.before), 'end', esc(r.text)))
    }
    const b = P.busiest
    ry += fs + 8
    rows.push(
      `<path d="M${x(b.before).toFixed(2)} ${botBase.toFixed(2)}L${(W - M.r - figW(b.text) - nameW(b.t) - 10).toFixed(2)} ${(ry - fs * 0.36).toFixed(2)}" fill="none" stroke="${HAIR}" stroke-width="1"/>`,
      T('m-name', W - M.r - figW(b.text) - 10, ry, INK, 'end', esc(b.t)),
      T('m-fig', W - M.r, ry, tint(b.before), 'end', esc(b.text)))
    lastRow = ry
  }

  // ---- the axis, which is also the key -------------------------------------
  const ticks = phone ? P.scale.narrow : P.scale.ticks
  const axis = [`<rect x="${M.l.toFixed(2)}" y="${stripY.toFixed(2)}" width="${axisW.toFixed(2)}" height="7" fill="url(#ramp2)"/>`]
  ticks.forEach((t, i) => {
    const lab = P.scale.labels[P.scale.ticks.indexOf(t)]
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(stripY + 7).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(stripY + 11).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, labelY, MUTED,
      i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', lab))
  })

  const rampStops = P.stops.map((s, i) =>
    `<stop offset="${(((x(s) - M.l) / axisW) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')

  const H = Math.ceil(lastRow + 14)
  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A scale of views per day, from ten to ten million, with every step ten times the last. ` +
    `Above the scale, one tick for each of the ${P.stat.n} pages on its record day: they all fall between ` +
    `1.4 and 15 million views. Below the scale, the same pages the day before: they range from 5 views to ` +
    `3.5 million. Half of them were under 65,000 and ${P.stat.under1000} were under 1,000. The lowest is ` +
    `${esc(pope.t)}, at ${pope.before} views the day before and ${pope.peakText} on the day.">` +
    `<defs><linearGradient id="ramp2" gradientUnits="userSpaceOnUse" x1="${M.l}" x2="${M.l + axisW}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}${rows.join('')}</svg>`

  return { svg, height: H }
}
