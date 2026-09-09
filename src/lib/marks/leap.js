/**
 * The leap — how much traffic each page had the day before its record day.
 *
 * One horizontal log scale, two baselines. The lower baseline is the day before; the upper
 * is the record day. Each page is one curve from its day-before reading up to its record
 * day reading. The day-before readings spread across nearly six tenfold steps; the record
 * days sit inside one. So the curves fan in from everywhere and land in one band, and that
 * convergence is the finding.
 *
 * Ink: one hue, indigo, the first stop of the site's ramp. The curves are translucent so
 * the dense part of the fan reads darker on its own.
 */
import { INK, MUTED, HAIR } from '../ink.js'
import { esc, T, nf, logScale, nameW } from './util.js'

export const LEAP_HUE = '#1E2170'

export function leap(A, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const M = { l: 0, r: phone ? 4 : 10 }
  const gap = phone ? 200 : 270
  const top = 30 + fs + 5 + fs + 12             // the record-day baseline, under a two-line label
  const bot = top + gap                          // the day-before baseline
  const H = Math.ceil(bot + 14 + fs + 6 + fs + 10)
  const x = logScale(A.scale.lo, A.scale.hi, M.l, W - M.r)
  const label = new Map(A.scale.ticks.map((t, i) => [t, A.scale.labels[i]]))
  const ticks = phone ? A.scale.narrow : A.scale.ticks

  const rows = A.rows.filter((r) => r.before > 0 && r.peak > 0)
  const k = gap * 0.5

  // ---- the grid: one hairline per tenfold step, both baselines ----------------
  const grid = []
  for (const t of ticks) {
    const tx = x(t)
    grid.push(`<line x1="${tx.toFixed(2)}" y1="${(top - 6).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(bot + 6).toFixed(2)}" stroke="${HAIR}" stroke-width="1" stroke-dasharray="2 4"/>`)
    grid.push(T('m-tick', tx, bot + 14 + fs, fs, MUTED, label.get(t), t === ticks[0] ? 'start' : t === ticks[ticks.length - 1] ? 'end' : 'middle'))
  }
  grid.push(`<line x1="${M.l}" y1="${top.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${top.toFixed(2)}" stroke="${INK}" stroke-width="1"/>`)
  grid.push(`<line x1="${M.l}" y1="${bot.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${bot.toFixed(2)}" stroke="${INK}" stroke-width="1"/>`)

  // ---- the curves --------------------------------------------------------------
  const curves = []
  const geo = []
  rows.forEach((r, i) => {
    const x0 = x(r.before), x1 = x(r.peak)
    curves.push(`<path d="M${x0.toFixed(2)} ${bot.toFixed(2)}C${x0.toFixed(2)} ${(bot - k).toFixed(2)} ${x1.toFixed(2)} ${(top + k).toFixed(2)} ${x1.toFixed(2)} ${top.toFixed(2)}" data-i="${i}"/>`)
    curves.push(`<line x1="${x0.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${x0.toFixed(2)}" y2="${(bot + 7).toFixed(2)}" class="m-rug" data-i="${i}"/>`)
    curves.push(`<line x1="${x1.toFixed(2)}" y1="${top.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${(top - 7).toFixed(2)}" class="m-rug" data-i="${i}"/>`)
    geo.push({ i, x0, x1, t: r.t, before: r.before, peak: r.peak })
  })

  // ---- the words on the plate ---------------------------------------------------
  const notes = []
  notes.push(T('m-name', M.l, top - 16, fs, INK, 'Views on the record day'))
  notes.push(T('m-name', M.l, bot + 14 + fs + 6 + fs, fs, INK, 'Views the day before'))

  // the middle of the day-before readings
  const medX = x(A.stat.medianBefore)
  notes.push(`<line x1="${medX.toFixed(2)}" y1="${(bot - 2).toFixed(2)}" x2="${medX.toFixed(2)}" y2="${(bot + 10).toFixed(2)}" stroke="#fff" stroke-width="3"/>`)
  notes.push(`<line x1="${medX.toFixed(2)}" y1="${(bot - 2).toFixed(2)}" x2="${medX.toFixed(2)}" y2="${(bot + 10).toFixed(2)}" stroke="${LEAP_HUE}" stroke-width="2"/>`)
  const medTxt = `middle value ${nf.format(Math.round(A.stat.medianBefore))}`
  // The tick labels sit under the baseline; this one goes above it, where the fan is
  // thinnest at the baseline itself.
  notes.push(T('m-note', medX - 7, bot - 9, fs, LEAP_HUE, medTxt, 'end'))

  // three pages named: the smallest day-before, the largest record day, the busiest day-before
  const pope = A.pope
  const px = x(pope.before)
  const popeFig = `${pope.before} views the day before`
  const popeW = Math.max(nameW(fs, pope.t), fs * 0.75 * popeFig.length)
  const popeY = bot - 66
  notes.push(`<circle cx="${px.toFixed(2)}" cy="${bot.toFixed(2)}" r="4" fill="${LEAP_HUE}"/>`)
  notes.push(`<line x1="${px.toFixed(2)}" y1="${(bot - 5).toFixed(2)}" x2="${px.toFixed(2)}" y2="${(popeY + fs + 10).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
  notes.push(T('m-name', px + 9, popeY, fs, INK, esc(pope.t)))
  notes.push(T('m-fig', px + 9, popeY + fs + 5, fs, LEAP_HUE, popeFig))

  const busy = A.busiest
  const bx = x(busy.before)
  const busyName = esc(busy.t)
  const busyFig = `${nf.format(busy.before)} the day before`
  const busyW = Math.max(nameW(fs, busy.t), fs * 0.75 * busyFig.length)
  const busyAnchor = bx + 9 + busyW > W - M.r ? 'end' : 'start'
  const busyX = busyAnchor === 'end' ? bx - 9 : bx + 9
  const busyLeft = busyAnchor === 'end' ? busyX - busyW : busyX
  // On a narrow plate the two blocks would meet, so the second sits a block higher.
  const busyY = busyLeft < px + 9 + popeW + 16 ? popeY - 2 * (fs + 5) - 10 : popeY
  notes.push(`<circle cx="${bx.toFixed(2)}" cy="${bot.toFixed(2)}" r="4" fill="${LEAP_HUE}"/>`)
  notes.push(`<line x1="${bx.toFixed(2)}" y1="${(bot - 5).toFixed(2)}" x2="${bx.toFixed(2)}" y2="${(busyY + fs + 10).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
  notes.push(T('m-name', busyX, busyY, fs, INK, busyName, busyAnchor))
  notes.push(T('m-fig', busyX, busyY + fs + 5, fs, LEAP_HUE, busyFig, busyAnchor))

  const big = rows.reduce((m, r) => (r.peak > m.peak ? r : m), rows[0])
  const gx = x(big.peak)
  notes.push(`<circle cx="${gx.toFixed(2)}" cy="${top.toFixed(2)}" r="4" fill="${LEAP_HUE}"/>`)
  notes.push(T('m-name', gx - 9, top - 16, fs, INK, esc(big.t), 'end'))
  notes.push(T('m-fig', gx - 9, top - 16 - fs - 5, fs, LEAP_HUE, `${nf.format(big.peak)} views on the day`, 'end'))

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Slope chart on a log scale. ${rows.length} English Wikipedia pages, one curve each, from the page's views the day before its record day up to its views on the record day. The day-before readings run from ${A.stat.minBefore} to ${nf.format(A.stat.maxBefore)}; the record days from ${nf.format(A.stat.minPeak)} to ${nf.format(A.stat.maxPeak)}. Half of the pages had under ${nf.format(Math.round(A.stat.medianBefore))} views the day before.">` +
    `<defs><clipPath id="lclip"><rect class="m-wipe" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>` +
    grid.join('') +
    `<g class="m-rows" clip-path="url(#lclip)" fill="none" stroke="${LEAP_HUE}" stroke-width="1" stroke-opacity="0.34">${curves.join('')}</g>` +
    notes.join('') + `</svg>`

  return { svg, height: H, rows: geo, geo: { top, bot, k, W } }
}

/** Where a curve is at height py. Used for hit testing: y falls monotonically with t. */
export function leapXAt(g, r, py) {
  const { top, bot, k } = g
  const y = (t) => bot * (1 - t) ** 3 + 3 * (bot - k) * (1 - t) ** 2 * t + 3 * (top + k) * (1 - t) * t * t + top * t ** 3
  let lo = 0, hi = 1
  for (let n = 0; n < 24; n++) { const mid = (lo + hi) / 2; if (y(mid) > py) lo = mid; else hi = mid }
  const t = (lo + hi) / 2
  return r.x0 + (r.x1 - r.x0) * (3 * t * t - 2 * t * t * t)
}
