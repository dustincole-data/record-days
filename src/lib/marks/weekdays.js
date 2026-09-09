/**
 * Which day of the week the record days landed on.
 *
 * Seven columns, Sunday to Saturday, each as tall as the number of record days that fell
 * on it, against a dashed line at the count each weekday would hold if the 220 were spread
 * evenly. Monday takes the accent; the other six take the violet before it on the ramp.
 */
import { ACCENT, INK, MUTED, HAIR } from '../ink.js'
import { T } from './util.js'

const REST = '#5B2A93'

export function weekdays(D, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const M = { l: 0, r: 0, t: 26 + fs, b: 18 + fs }
  const H = phone ? 280 : 340
  const plotH = H - M.t - M.b
  const counts = D.record.count
  const expect = D.record.expect[0]
  const maxC = Math.max(...counts) * 1.12
  const colW = (W - M.l - M.r) / 7
  const barW = Math.min(colW * 0.64, 110)
  const y = (v) => M.t + plotH - (v / maxC) * plotH
  const base = M.t + plotH

  const bars = []
  const geo = []
  counts.forEach((c, i) => {
    const bx = M.l + i * colW + (colW - barW) / 2
    bars.push(`<rect x="${bx.toFixed(2)}" y="${y(c).toFixed(2)}" width="${barW.toFixed(2)}" height="${(base - y(c)).toFixed(2)}" rx="2" fill="${i === 1 ? ACCENT : REST}" fill-opacity="${i === 1 ? 1 : 0.55}" data-i="${i}"/>`)
    geo.push({ i, cx: bx + barW / 2, top: y(c), c, name: D.labels[i] })
  })

  const notes = []
  counts.forEach((c, i) => {
    const cx = M.l + i * colW + colW / 2
    notes.push(T('m-fig', cx, y(c) - 8, fs, i === 1 ? ACCENT : INK, String(c), 'middle'))
    notes.push(T('m-name', cx, base + 6 + fs, fs, i === 1 ? INK : MUTED, W < 360 ? D.short[i][0] : D.short[i], 'middle'))
  })
  notes.push(`<line x1="${M.l}" y1="${base.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${base.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)

  // the even-spread line
  const ey = y(expect)
  notes.push(`<line x1="${M.l}" y1="${ey.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 5"/>`)
  // Under the line, over the shortest column, where no count label can reach it.
  const low = counts.indexOf(Math.min(...counts))
  notes.push(T('m-note', M.l + low * colW + colW / 2, ey + fs + 6, fs, INK, `${Math.round(expect)} if spread evenly`, 'middle'))

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Column chart. How many of the ${D.stat.n} record days fell on each day of the week, Sunday to Saturday: ${D.labels.map((l, i) => `${l} ${counts[i]}`).join(', ')}. Spread evenly each weekday would hold about ${Math.round(expect)}.">` +
    `<defs><clipPath id="wclip"><rect class="m-wipe" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>` +
    `<g class="m-rows" clip-path="url(#wclip)">${bars.join('')}</g>` +
    notes.join('') + `</svg>`

  return { svg, height: H, rows: geo, geo: { W } }
}
