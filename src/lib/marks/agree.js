/**
 * The plate for F11 — the 49 dates that carry more than one of the 442, and how far apart the
 * pages on each of them are.
 *
 * THE HORIZONTAL IS NOT VIEWS AND IT IS NOT THE CALENDAR. It is each page's own biggest day
 * divided by the MIDDLE biggest day of the pages it shares a date with, so every row is
 * centred on itself and the only thing left in the horizontal is disagreement. A row's width
 * IS the finding. The calendar is beat 07's axis and is not spent again here: dates run down
 * the plate in order, unspaced, and the left gutter marks where each year starts.
 *
 * Not beat 01: those bars all start at a wall and their length is a duration. These are
 * floating spans centred on 1 and their length is how badly a group agrees. Not beat 02's rug
 * (one axis, one distribution); this is 49, each normalised to itself. Not beat 03 (nothing is
 * binned or stacked into units). Not beat 04 (no density is estimated).
 *
 * THE INK CARRIES ONE THING: whether the gate kept the page or threw it out. That is what this
 * section is about, so the thrown-out rows take the page's accent and the kept rows take the
 * page's text ink. Nothing else is coloured. Putting a second quantity in the same channel is
 * how a plate starts lying, and this plate has a spare channel — the row's height — which is
 * how many pages the date carries.
 *
 * The two inks were checked as the pair that actually touches rather than as a palette. Under
 * protanopia #16181D against #B31E63 is dE 20.1 and under deuteranopia 31.5; the page's MUTED
 * grey against the same accent is dE 2.8, which is why the kept rows are drawn at full ink
 * strength and never faded. Size and lightness both repeat the distinction, so no reader has
 * to resolve it by hue alone.
 */
import { ACCENT, INK, MUTED, HAIR } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)
const millions = (v) => (v / 1e6).toFixed(2) + 'M'

export function agree(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  // Mono runs wider than the sans at the same size. Both are measured at their own ratio
  // rather than at one guessed average, because the gutter is sized off the mono year and the
  // callouts are sized off the sans.
  const monoW = (s) => s.length * fs * 0.75
  const sansW = (s) => s.length * fs * 0.52

  // ---- the room, measured off what has to go in it ---------------------------
  const YEARS = [...new Set(P.groups.map((g) => g.d.slice(0, 4)))]
  const AXW = Math.ceil(Math.max(...YEARS.map(monoW))) + 12
  const tickLab = (t) => P.scale.labels[P.scale.ticks.indexOf(t)]
  const ticks = phone ? P.scale.narrow : P.scale.ticks
  const R = Math.ceil(Math.max(...ticks.map((t) => monoW(tickLab(t)))) / 2) + 4
  const plotW = Math.max(140, W - AXW - R)

  const pitch = phone ? 2.2 : 3
  const gap = phone ? 3 : 4
  const dotK = phone ? 2.0 : 2.4      // a kept page
  const dotC = phone ? 2.8 : 3.3      // a page the gate threw out
  const lh = Math.round(fs * 1.22)

  const top = lh + 10
  const rowH = (g) => Math.max(2, g.n) * pitch
  const ys = []
  let y = top
  for (const g of P.groups) { ys.push(y); y += rowH(g) + gap }
  const bot = y - gap
  const axisY = bot + 14
  const keyY = axisY + fs + 10 + lh
  const H = Math.ceil(keyY + 12)

  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const X = (r) => AXW + ((L(r) - lo) / (hi - lo)) * plotW
  const T = (cls, tx, ty, fill, anchor, s, weight) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}${weight ? ` font-weight="${weight}"` : ''}>${s}</text>`

  // ---- the spine, which is where a group that agreed perfectly would sit --------
  const axis = [
    `<line x1="${X(1).toFixed(2)}" y1="${(top - 6).toFixed(2)}" x2="${X(1).toFixed(2)}" y2="${bot.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
    `<line x1="${AXW.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${bot.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
  ]
  for (const t of ticks) {
    const tx = X(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(bot + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    // Every tick label is pinned inside the plate's own walls rather than centred blind, so
    // the outermost one cannot hang off the edge at a narrow width.
    const half = monoW(tickLab(t)) / 2
    axis.push(T('m-tick', Math.min(AXW + plotW - half, Math.max(AXW + half, tx)), axisY, MUTED, 'middle', tickLab(t)))
  }
  axis.push(T('m-tick', AXW + plotW / 2, axisY + fs + 8, MUTED, 'middle',
    phone ? 'against the middle page' : 'each page against the middle page of its own date'))

  // ---- the rows -----------------------------------------------------------------
  const bands = [], marks = []
  P.groups.forEach((g, i) => {
    const yy = ys[i], h = rowH(g)
    const rs = g.rows.map((r) => r.r)
    const x0 = X(Math.min(...rs)), x1 = X(Math.max(...rs))
    const ink = g.cut * 2 >= g.n ? ACCENT : INK
    // A group of two that agrees exactly would have no band at all, so the band is floored at
    // the width of one mark. It is a backdrop for the dots, never a reading of its own.
    const bw = Math.max(x1 - x0, dotC)
    bands.push(`<rect x="${(x0 - (bw - (x1 - x0)) / 2).toFixed(2)}" y="${yy.toFixed(2)}" width="${bw.toFixed(2)}" ` +
      `height="${h.toFixed(2)}" rx="${Math.min(2, h / 2).toFixed(2)}" fill="${ink}" fill-opacity="0.13"/>`)

    g.rows.forEach((r, k) => {
      const cx = X(r.r), cy = yy + (k + 0.5) * (h / g.n)
      const cut = r.cut === 1
      marks.push(
        `<g data-t="${esc(r.t)}" data-v="${millions(r.peak)} &#183; ${cut ? 'thrown out' : 'kept'}">` +
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(phone ? 6 : 8)}" fill="#fff" fill-opacity="0"/>` +
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${cut ? dotC : dotK}" fill="${cut ? ACCENT : INK}"/></g>`)
    })

  })

  // ---- the year gutter ------------------------------------------------------------
  // A year is labelled at the MIDDLE of its own block of rows, not at its first row. Labelled
  // at the first row, 2015 (one row) and 2016 (five) sit ten pixels apart, one of the two gets
  // suppressed as a collision, and a missing year in a run of years reads as a hole in the
  // data rather than as a label that would not fit. Block centres are far enough apart that
  // every year in the file gets its own label, and a hairline marks each boundary so the
  // structure survives even where one is dropped.
  {
    const blocks = []
    P.groups.forEach((g, i) => {
      const yr = g.d.slice(0, 4)
      const b = blocks[blocks.length - 1]
      if (b && b.yr === yr) b.to = i
      else blocks.push({ yr, from: i, to: i })
    })
    let usedY = -1e6
    for (const b of blocks) {
      if (b.from > 0) {
        const sepY = ys[b.from] - gap / 2
        axis.push(`<line x1="${(AXW - 5).toFixed(2)}" y1="${sepY.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${sepY.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
      }
      const cy = (ys[b.from] + ys[b.to] + rowH(P.groups[b.to])) / 2
      if (cy - usedY < fs + 4) continue
      usedY = cy
      axis.push(T('m-tick', AXW - 8, cy + fs * 0.34, MUTED, 'end', b.yr))
    }
  }

  // ---- the three rows the plate names -------------------------------------------
  // Three, not forty-nine: the one the section is about, the only other date whose pages
  // agree, and the worst-agreeing date in the file, so the reader has both ends. The rest are
  // listed under the chart, which is where beat 07 puts its roll-call too.
  const widest = P.groups.slice().sort((a, b) => b.spread - a.spread)[0]
  const wanted = [
    { d: P.meta.date, a: P.stat.n + ' pages, ' + P.stat.spreadPct + '% apart' },
    { d: '2018-01-18', a: '4 pages, ' + Math.round((P.groups.find((g) => g.d === '2018-01-18').spread - 1) * 100) + '% apart' },
    { d: widest.d, a: widest.n + ' pages, one ' + widest.spread.toFixed(1) + ' times another' },
  ]
  const notes = []
  for (const want of wanted) {
    const i = P.groups.findIndex((g) => g.d === want.d)
    if (i < 0) continue
    const g = P.groups[i], yy = ys[i], h = rowH(g)
    const rs = g.rows.map((r) => r.r)
    const x0 = X(Math.min(...rs)), x1 = X(Math.max(...rs))
    const line1 = shortDate(g.d), line2 = want.a
    const w = Math.max(monoW(line1), sansW(line2))
    // Each side is measured against its own room — the gap between this row and its own wall —
    // rather than against the plate, which is what puts half a sentence outside the plate.
    const roomR = AXW + plotW - (x1 + 10), roomL = (x0 - 10) - AXW
    const side = roomR >= w ? 1 : (roomL >= w ? -1 : 0)
    if (!side) continue
    const tx = side > 0 ? x1 + 10 : x0 - 10
    const anchor = side > 0 ? 'start' : 'end'
    const baseY = Math.max(top + fs, Math.min(bot - lh, yy + h / 2 - lh * 0.15))
    notes.push(
      T('m-fig', tx, baseY, ACCENT, anchor, line1),
      T('m-name', tx, baseY + lh, INK, anchor, esc(line2)))
  }

  // ---- the key ---------------------------------------------------------------------
  // Two inks and two sizes, so it is two swatches. It sits under the axis because the plate
  // has no spare corner: every row runs through the middle of it.
  const key = []
  {
    // Each label is offered long, then short, and the longest form that fits its own room is
    // the one drawn. The room for a swatch on its own row is the whole plate minus the swatch;
    // the room for two side by side is less, so the pair is tried on one row first and the
    // labels are re-measured, not merely re-positioned, when they drop to two.
    const items = [
      { ink: ACCENT, r: dotC, long: 'thrown out by the shape test', short: 'thrown out' },
      { ink: INK, r: dotK, long: 'kept, and drawn everywhere else here', short: 'kept' },
    ]
    // The key labels are m-tick, which is the mono. Advancing by the SANS width put the second
    // swatch 90px inside the first label's own ink at every width from 620 up, which the
    // legibility gate cannot see because both labels were still inside the plate.
    const put = (it, kx, ky, s) => {
      key.push(`<circle cx="${(kx + it.r).toFixed(2)}" cy="${(ky - fs * 0.34).toFixed(2)}" r="${it.r}" fill="${it.ink}"/>`)
      key.push(T('m-tick', kx + it.r * 2 + 6, ky, MUTED, 'start', s))
      return kx + it.r * 2 + 6 + monoW(s) + 18
    }
    const wide = items.reduce((a, it) => a + it.r * 2 + 6 + monoW(it.long) + 18, 0)
    const tight = items.reduce((a, it) => a + it.r * 2 + 6 + monoW(it.short) + 18, 0)
    if (wide <= plotW) { let kx = AXW; for (const it of items) kx = put(it, kx, keyY, it.long) }
    else if (tight <= plotW) { let kx = AXW; for (const it of items) kx = put(it, kx, keyY, it.short) }
    else {
      let ky = keyY - lh
      for (const it of items) {
        const room = plotW - (it.r * 2 + 6)
        ky = (put(it, AXW, ky, monoW(it.long) <= room ? it.long : it.short), ky + lh)
      }
    }
  }

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A chart of ${P.stat.groups} rows, one for each date on which more than one of the ` +
    `${P.meta.ranked} ranked pages had its biggest traffic day. A row runs down the page in date order ` +
    `and across by how far its pages disagree: each page is placed at its own biggest day divided by ` +
    `the middle biggest day of the pages it shares that date with, so a row that agrees perfectly is ` +
    `a single point on the centre line. A row is as tall as the number of pages on it. Pages the ` +
    `census gate threw out are drawn in the page's accent and pages it kept in the page's text ink. ` +
    `One row is unlike the rest: ${shortDate(P.meta.date)} carries ${P.stat.n} pages, ten times more ` +
    `than any other date, every one of them thrown out, and they agree to ${P.stat.spreadPct} per cent, ` +
    `so that row is a tall narrow needle standing on the centre line. The next-tightest date with ` +
    `three or more pages spreads ${P.stat.minSpread3} times, and the widest row in the file spreads ` +
    `${widest.spread.toFixed(1)} times.">` +
    `<g>${bands.join('')}</g><g class="m-rows">${marks.join('')}</g>` +
    `${notes.join('')}${axis.join('')}${key.join('')}</svg>`

  return { svg, height: H }
}
