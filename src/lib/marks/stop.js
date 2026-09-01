/**
 * The plate for F12 — every page in the file drawn over its own first sixty days, and the four
 * that do not decay.
 *
 * ONE PANEL, 214 TRACES. Not beat 05, which puts a month on the axis twenty times in twenty
 * separate boxes and asks the reader to compare shapes across them; here every page is in the
 * same box on the same pair of axes and the comparison is direct. Not beat 06, which is two
 * traces on a cycle filled to a pivot. Not beat 09, which draws quantiles of a fitted model
 * against a window length the analyst chose; this draws the rows themselves against real days.
 *
 * UP IS A MULTIPLE OF THE PAGE'S OWN NORMAL LEVEL, so 214 pages that peaked between 1.4 and
 * 15 million views can share one axis: what is compared is the shape of the fall, not the size
 * of the event. The bottom of the axis is 1 — a page back at its own normal reading — which is
 * where every honest trace is heading and where the four arrive in a single day.
 *
 * COLOUR IS BEAT 01's RAMP AND MEANS WHAT IT MEANS THERE: a trace's ink is that page's own
 * return time in days. The stops arrive in the payload from `plate.json` rather than being
 * restated, and a page that never returned takes the top stop, which is the rule beat 01
 * publishes. The four are lifted by weight and darkness rather than by hue, because hue is
 * already spent on duration and a plate may only say one thing per channel.
 *
 * Two pages have days the source never returned. They are drawn as broken lines. A straight
 * segment across a hole is a reading nobody took.
 */
import { HEX, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

export function stop(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const monoW = (s) => s.length * fs * 0.75
  const sansW = (s) => s.length * fs * 0.52

  const yticks = phone ? P.scale.ynarrow : P.scale.yticks
  const ylab = (t) => P.scale.ylabels[P.scale.yticks.indexOf(t)]
  // The gutter is the widest label it has to hold plus its tick, MEASURED IN THE FACE THE
  // LABEL IS SET IN. These are m-tick, which is the mono, and the mono runs half again as wide
  // as the sans at the same size: measured at the sans ratio the gutter came out 70px for a
  // label that renders 84px and every y label started outside the plate.
  const AXW = Math.ceil(Math.max(...yticks.map((t) => monoW(ylab(t))))) + 12
  const R = phone ? 8 : 14
  const plotW = Math.max(150, W - AXW - R)
  const lh = Math.round(fs * 1.22)

  const top = 10
  const ph = phone ? 300 : 430
  const bot = top + ph
  const axisY = bot + 6 + fs
  const H = Math.ceil(axisY + fs + 12)

  const lo = L(P.scale.ylo), hi = L(P.scale.yhi)
  const Y = (v) => bot - ((L(Math.max(v, P.scale.ylo)) - lo) / (hi - lo)) * ph
  const X = (d) => AXW + (d / P.scale.xhi) * plotW
  const tint = (t) => (t.kind === 'back' ? ink(t.dur, P.stops) : HEX[HEX.length - 1])

  const T = (cls, tx, ty, fill, anchor, s, weight) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}${weight ? ` font-weight="${weight}"` : ''}>${s}</text>`

  // A trace is one move-to per unbroken stretch, so a hole in the source is a hole in the line.
  const dOf = (t) => {
    let d = '', pen = false
    t.v.forEach((v, i) => {
      if (v === null) { pen = false; return }
      d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)
      pen = true
    })
    return d
  }

  // ---- pass one: the field ------------------------------------------------------
  // 210 translucent traces on white. The overlaps are the point: where the file agrees the
  // ink stacks into a solid sheaf and where it disagrees it thins out, and that field is what
  // the four have to be read against.
  const field = P.traces.filter((t) => !t.named)
    .map((t) => `<path d="${dOf(t)}" fill="none" stroke="${tint(t)}" stroke-opacity="0.17" stroke-width="1.1" stroke-linejoin="round"/>`)

  // ---- pass two: the four -------------------------------------------------------
  // A white casing under each one, so a dark line stays a dark line where it crosses the
  // densest part of the sheaf.
  const four = P.traces.filter((t) => t.named).sort((a, b) => a.t < b.t ? -1 : 1)
  const lit = []
  for (const t of four) {
    const d = dOf(t)
    lit.push(`<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="${phone ? 4 : 5}" stroke-linejoin="round"/>`)
    lit.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${phone ? 1.8 : 2.2}" stroke-linejoin="round"/>`)
  }

  // ---- the cliffs, named --------------------------------------------------------
  // A label goes at the day the page stopped, on whichever side of that day has room for it,
  // and a label that fits on neither side is dropped rather than laid over the plate. The
  // rows are then pushed apart vertically so two names cannot print on each other.
  // Every label is measured and given its room FIRST, and only then is a row assigned. Nudging
  // one label out of a collision and clamping it back inside the plate afterwards puts it
  // straight back on top of what it was moved off, which is what happened at 390 and 500: two
  // pages stop on the same day, so their anchors share an x and the clamp had nowhere to go.
  // Rows are handed out top to bottom instead, each at least two line-heights below the last,
  // so no two can ever share one however close their anchors are.
  const want = []
  for (const t of four) {
    const s = P.story[t.a]
    // The day the page STOPS. Where the snap can be read that is the snap's own day; where it
    // cannot — one page's traffic is still at event scale when the file ends — it is that page's
    // steepest single-day fall inside the window drawn here. It is not the end of the longest
    // event-scale run, which for that page is day 21, a dip she climbs straight back out of.
    const day = s.snapDay !== null ? s.snapDay : s.fallDay
    if (day > P.scale.xhi) continue
    const v = t.v[Math.max(0, Math.min(P.scale.xhi, day))]
    if (v === null || v === undefined) continue
    // The name is set in the sans and the figure in the mono, so the room the pair needs is the
    // wider of the two MEASURED SEPARATELY. The figure is also set short: the sentence it used
    // to carry ran 525px in the mono, which fits nowhere, and the caption carries it instead.
    // On a phone the figure line is dropped. Four two-line labels in a 340px plot lay 146px of
    // mono across the densest part of the sheaf four times over — no two of them collided, which
    // is why the ladder passed it, but every one of them sat on the mark. The deck prints the
    // three ratios and the method prints all four, so the plate keeps only the names.
    const line1 = t.t
    const line2 = phone ? null : 'day ' + day + ', \u00f7' + (s.snap !== null ? s.snap : s.fallBy)
    const w = line2 ? Math.max(sansW(line1), monoW(line2)) : sansW(line1)
    const roomR = AXW + plotW - (X(day) + 8), roomL = (X(day) - 8) - AXW
    const side = roomR >= w ? 1 : (roomL >= w ? -1 : 0)
    if (!side) continue
    want.push({ ax: X(day), ay: Y(v), tx: X(day) + side * 8, side, line1, line2, at: Y(v) - 8 })
  }
  want.sort((a, b) => a.at - b.at)
  const step = (phone ? lh : 2 * lh) + 6
  const notes = []
  let floorY = top + fs
  for (const n of want) {
    const ty = Math.max(floorY, Math.min(bot - lh - 2, n.at))
    if (ty > bot - lh - 2) continue          // no row left; the method names it instead
    floorY = ty + step
    notes.push(
      `<line x1="${n.ax.toFixed(2)}" y1="${n.ay.toFixed(2)}" x2="${n.tx.toFixed(2)}" y2="${(ty + 3).toFixed(2)}" stroke="#fff" stroke-opacity="0.9" stroke-width="3"/>`,
      `<line x1="${n.ax.toFixed(2)}" y1="${n.ay.toFixed(2)}" x2="${n.tx.toFixed(2)}" y2="${(ty + 3).toFixed(2)}" stroke="${MUTED}" stroke-width="1"/>`,
      `<circle cx="${n.ax.toFixed(2)}" cy="${n.ay.toFixed(2)}" r="2.6" fill="${INK}"/>`,
      T('m-name', n.tx, ty, INK, n.side > 0 ? 'start' : 'end', esc(n.line1)))
    if (n.line2) notes.push(T('m-tick', n.tx, ty + lh, MUTED, n.side > 0 ? 'start' : 'end', n.line2))
  }

  // ---- the axes ------------------------------------------------------------------
  const axis = []
  for (const t of yticks) {
    const ty = Y(t)
    axis.push(`<line x1="${AXW.toFixed(2)}" y1="${ty.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${ty.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', AXW - 8, Math.min(bot, Math.max(top + fs, ty + fs * 0.34)), MUTED, 'end', ylab(t)))
  }
  axis.push(`<line x1="${AXW.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${bot.toFixed(2)}" stroke="${MUTED}" stroke-width="1"/>`)
  for (const d of P.scale.xticks) {
    const tx = X(d)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${bot.toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(bot + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    const lab = String(d)
    const half = monoW(lab) / 2
    axis.push(T('m-tick', Math.min(AXW + plotW - half, Math.max(AXW + half, tx)), axisY, MUTED, 'middle', lab))
  }
  // The caption is mono too, and at 320 the long form measures 244px against a 200px plot. It
  // is offered long and set short where it will not fit; the figcaption carries the full phrase.
  const cap = monoW('days since the record day') <= plotW ? 'days since the record day' : 'days'
  axis.push(T('m-tick', AXW + plotW / 2, axisY + fs + 6, MUTED, 'middle', cap))

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A line chart of ${P.stat.drawn} lines, one for each English Wikipedia page in this ` +
    `file that has a normal traffic level to measure against. Left to right is the first ` +
    `${P.scale.xhi} days after that page's record day. Up is how many times its own normal level the ` +
    `page was reading that day, on a scale where the bottom line is normal and the top is a hundred ` +
    `thousand times normal. A line's colour is that page's own return time, the same colour scale the ` +
    `first chart uses. Almost every line is a curve that falls steadily and flattens out. Four are ` +
    `drawn dark and heavy because they are not curves: they hold a flat top for days or weeks and ` +
    `then fall to the bottom of the chart between one day and the next. They are ` +
    `${four.map((t) => t.t).join(', ')}. The steepest of them falls ${P.snaps[0].snap} times in one day, ` +
    `from ${P.snaps[0].v.toLocaleString('en-US')} views to ${P.snaps[0].next}, against a middle value ` +
    `across ${P.stat.tested} pages of ${P.stat.median}.">` +
    `<g class="m-field">${field.join('')}</g><g class="m-four">${lit.join('')}</g>` +
    `${axis.join('')}${notes.join('')}</svg>`

  return { svg, height: H }
}
