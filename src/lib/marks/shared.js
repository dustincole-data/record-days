/**
 * The plate for F7 — every record day in the file, on the day it happened.
 *
 * The only plate here whose horizontal axis is the CALENDAR, and the only one that draws all
 * 220 pages at their own date and their own size at once. Not a rug (beat 02 has the rug, and
 * its axis is a value, not a date), not a unit histogram (beat 03 stacks squares into bins;
 * nothing here is binned or stacked), not a field of bars from a wall (beat 01). Two real
 * axes and one mark per page.
 *
 * THE FINDING IS THE VERTICAL BUNDLES. 47 of the 220 are not one page having a day: they are
 * two, three or four pages having the SAME day, in 19 groups. Each group is drawn as a
 * capsule around its members, so a shared day is one object on the plate rather than a
 * coincidence a reader has to spot.
 *
 * THE VERTICAL AXIS IS THE ONE BEAT 02 PRINTS — the smallest and largest record day in the
 * file — and 09 asserts that pair against 04's payload rather than recomputing it.
 *
 * Three passes of ink: a wide soft halo per page, so eleven years of overlapping days read as
 * a field rather than as scattered dots; a crisp core; then the capsules over the top.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)
const millions = (v) => (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M'

export function shared(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  const ticks = phone ? P.scale.narrow : P.scale.ticks
  const tickLab = (t) => P.scale.labels[P.scale.ticks.indexOf(t)]
  const AXW = Math.ceil(Math.max(...ticks.map((t) => tickLab(t).length)) * fs * 0.75) + 14
  const R = phone ? 4 : 8
  const plotW = Math.max(120, W - AXW - R)
  const ph = phone ? 300 : 430

  const lh = Math.round(fs * 1.22)
  const tagH = 4 * lh + 8                        // two tag rows, two lines each
  const top = tagH + 8
  const bot = top + ph
  const yearY = bot + fs + 9
  const H = Math.ceil(yearY + 10)

  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const Y = (v) => bot - ((L(v) - lo) / (hi - lo)) * ph
  const X = (d) => AXW + (d / P.scale.xhi) * plotW
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- three passes over the 220 --------------------------------------------
  const halo = phone ? 6 : 9.5
  const core = phone ? 2 : 2.8
  // The halo and the core are one group per page, because a 2.8px core is not a thing a
  // pointer can find: the halo is the hit target and the group is what lights.
  const marks = []
  for (const p of P.points) marks.push(
    `<g data-t="${esc(p.t)}" data-v="${shortDate(p.d)} &#183; ${millions(p.peak)}">` +
    `<circle cx="${X(p.x).toFixed(2)}" cy="${Y(p.peak).toFixed(2)}" r="${halo}" fill="${tint(p.peak)}" fill-opacity="0.13"/>` +
    `<circle cx="${X(p.x).toFixed(2)}" cy="${Y(p.peak).toFixed(2)}" r="${core}" fill="${tint(p.peak)}"/></g>`)

  // ---- the 19 shared days ----------------------------------------------------
  const capW = phone ? 9 : 13
  for (const b of P.bundles) {
    const x = X(b.x), y0 = Y(b.hi) - core - 3, y1 = Y(b.lo) + core + 3
    marks.push(
      `<rect x="${(x - capW / 2).toFixed(2)}" y="${y0.toFixed(2)}" width="${capW}" height="${(y1 - y0).toFixed(2)}" ` +
      `rx="${(capW / 2).toFixed(2)}" fill="${ACCENT}" fill-opacity="0.10" stroke="${ACCENT}" stroke-width="1.3"/>`)
  }

  // ---- the few things named on the plate --------------------------------------
  // Four labels at most, and every one of them derived: the days more than two pages shared,
  // and the single largest record day in the file. Nineteen labels over eleven years cannot
  // be placed without collisions, so the rest are listed under the chart instead.
  // Each tag is two lines, so it needs a full line-height between them, not a font-size, and
  // it needs somewhere to go. Two tag rows are kept; a tag takes the first row whose used
  // width it clears, and a tag that clears neither is dropped rather than stacked on another.
  // Nothing is lost by dropping one: all nineteen dates are listed under the chart.
  const named = P.bundles.filter((b) => b.n === 4)
  if (!phone) named.push(P.bundles.slice().sort((a, b) => b.hi - a.hi)[0])
  named.sort((a, b) => a.x - b.x)
  const notes = []
  const used = [-1e6, -1e6]
  for (const b of named) {
    const txt = shortDate(b.d)
    const w = Math.max(txt.length, (b.n + ' pages').length) * fs * 0.75
    const cx = Math.min(AXW + plotW - w / 2, Math.max(AXW + w / 2, X(b.x)))
    const row = used.findIndex((r) => cx - w / 2 > r + 8)
    if (row < 0) continue
    used[row] = cx + w / 2
    const base = top - tagH + 4 + row * (2 * lh) + fs
    notes.push(
      `<line x1="${X(b.x).toFixed(2)}" y1="${(Y(b.hi) - core - 6).toFixed(2)}" x2="${X(b.x).toFixed(2)}" y2="${(base + lh + 3).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
      T('m-fig', cx, base, ACCENT, 'middle', txt),
      T('m-tick', cx, base + lh, MUTED, 'middle', b.n + ' pages'))
  }
  // The biggest day in the file, named. The label goes on whichever side of its dot has room,
  // and it has to go on the OTHER side of the dot when it runs right to left: written at
  // x + halo either way, the end-anchored version lay across its own mark and the white halo
  // behind the type rubbed the dot out.
  const big = P.points.slice().sort((a, b) => b.peak - a.peak)[0]
  const bigEnd = X(big.x) > AXW + plotW * 0.72
  notes.push(T('m-name', X(big.x) + (bigEnd ? -1 : 1) * (halo + 4), Y(big.peak) + fs * 0.34, INK,
    bigEnd ? 'end' : 'start',
    esc(big.t) + (phone ? '' : ' · ' + millions(big.peak))))

  // ---- the axes ----------------------------------------------------------------
  const axis = [`<rect x="${(AXW - 9).toFixed(2)}" y="${top.toFixed(2)}" width="7" height="${ph}" fill="url(#ramp7)"/>`]
  for (const t of ticks) {
    axis.push(T('m-tick', AXW - 12, Math.min(bot, Math.max(top + fs, Y(t) + fs * 0.34)), MUTED, 'end', tickLab(t)))
  }
  axis.push(`<line x1="${AXW.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${bot.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
  // How many years to skip is measured off the room one year actually has, not guessed from
  // the width: at 320 every second year still put "2016" on "2018".
  const yearW = 4 * fs * 0.75 + 10
  const yearPx = plotW / (P.scale.xhi / 365.25)
  const every = Math.max(1, Math.ceil(yearW / yearPx))
  for (const { y, x } of P.scale.years) {
    if ((y - 2016) % every) continue
    const px = X(x)
    if (px < AXW || px > AXW + plotW) continue
    axis.push(`<line x1="${px.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${px.toFixed(2)}" y2="${(bot + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', Math.min(AXW + plotW - yearW / 2, Math.max(AXW + yearW / 2, px)), yearY, MUTED, 'middle', String(y)))
  }

  // A vertical ramp runs bottom-to-top, so its stops come out in DESCENDING offset order, and
  // SVG clamps every stop to be no smaller than the one before it. Emitted in the natural
  // order the whole gradient collapsed to its first colour and every fill on this plate was
  // one flat indigo. Reversed, it paints.
  const rampStops = P.stops.map((s, i) =>
    `<stop offset="${(100 - ((L(s) - lo) / (hi - lo)) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`)
    .reverse().join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="All ${P.stat.all} record days, placed left to right on the date they happened, from ` +
    `${P.meta.window.start.slice(0, 4)} to ${P.meta.window.end.slice(0, 4)}, and up the page by how many ` +
    `views that day drew, from ${millions(P.stat.minPeak)} to ${millions(P.stat.maxPeak)}. ` +
    `${P.stat.inBundles} of them share their date with another page, in ${P.stat.bundles} groups, and ` +
    `each group is ringed. Twelve of the groups are pairs, five are threes and two are fours. A model ` +
    `that keeps every record day in its own year, month and weekday and moves only which matching day ` +
    `it fell on expects ${P.null.expected} pages in a group; ${P.stat.inBundles} were observed. The ` +
    `largest single day is ${esc(big.t)} at ${millions(big.peak)}.">` +
    `<defs><linearGradient id="ramp7" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bot}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
