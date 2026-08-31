/**
 * The plate for F6 — two weekly cycles on one axis.
 *
 * A WAVEFORM, which is a form no other beat here and no shipped project uses. Every other
 * plate on this site puts pages on an axis; this one puts a repeating week on it. The week
 * is tiled two or three times because a cycle read once is a bar chart and a cycle read
 * three times is a rhythm — it is the same seven values each time, and the caption says so.
 *
 * ONE VERTICAL AXIS FOR BOTH SERIES, "times expected", pivoted at 1:
 *   · how many record days landed on each weekday, against how many of that weekday the
 *     eleven-year window holds;
 *   · how much these same pages are read on each weekday in ordinary time, against their
 *     own average week.
 * Two quantities in one channel would be a lying axis, so they are not two quantities: both
 * are a count against its own expectation, and 06's pivot rule is the same object for both.
 * The finding is the difference in AMPLITUDE — one wave swings 2.74x and the other 1.13x —
 * and that only reads if they share the scale.
 *
 * The curve is drawn through the seven points; the points themselves are marked, because
 * they are the guarded numbers and the curve between them is not data.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

/** A closed Catmull-Rom through the points, as cubic beziers. The series is periodic, so
 *  the ends borrow from the other end rather than flattening. */
function curve(pts) {
  const n = pts.length
  const at = (i) => pts[Math.max(0, Math.min(n - 1, i))]
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = pts[i], p2 = pts[i + 1], p3 = at(i + 2)
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ` +
      `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ` +
      `${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

export function weekday(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  const ticks = P.scale.ticks
  const tickLab = (t) => P.scale.labels[P.scale.ticks.indexOf(t)]
  const AXW = Math.ceil(Math.max(...P.scale.labels.map((s) => s.length)) * fs * 0.75) + 14
  const RIGHT = phone ? 4 : Math.ceil(fs * 0.53 * 17)   // room for the two series names
  const plotW = Math.max(120, W - AXW - RIGHT)
  const ph = phone ? 216 : 300

  // How many times the week is tiled is measured, not set by a breakpoint. Day names never
  // shorten — "Su" and "Sa", "Tu" and "Th" are not names a reader can tell apart — so they
  // stagger onto two rows where one will not hold them, and the tiling is whatever the widest
  // arrangement is that those two rows can still carry. At 320 that is one week.
  const labW = 3 * fs * 0.75
  const rowsFor = (r) => Math.ceil((labW + 4) / (plotW / (7 * r)))
  const reps = [3, 2, 1].find((r) => rowsFor(r) <= 2) ?? 1
  const slots = 7 * reps
  const stagger = rowsFor(reps) > 1

  const lh = Math.round(fs * 1.2)

  const top = fs + 12
  const bot = top + ph
  const dayY = bot + fs + 8
  const H = Math.ceil(dayY + (stagger ? lh : 0) + 10)

  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const Y = (v) => bot - ((L(v) - lo) / (hi - lo)) * ph
  const X = (i) => AXW + ((i + 0.5) / slots) * plotW
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)
  const pivY = Y(P.scale.pivot)

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  const tiled = (a) => Array.from({ length: slots }, (_, i) => a[i % 7])

  // ---- the two waves --------------------------------------------------------
  const marks = []
  const SERIES = [
    { v: tiled(P.record.ratio), name: 'record days', w: 2.4, fill: 0.5 },
    { v: tiled(P.reading.idx), name: 'ordinary reading', w: 1.6, fill: 0.42 },
  ]
  for (const s of SERIES) {
    const pts = s.v.map((v, i) => [X(i), Y(v)])
    const d = curve(pts)
    // the lobes: along the wave, then back along the pivot. Where the wave is under the
    // pivot the shape folds, which is what fills both sides of it.
    marks.push(`<path d="${d}L${pts[pts.length - 1][0].toFixed(2)} ${pivY.toFixed(2)}L${pts[0][0].toFixed(2)} ${pivY.toFixed(2)}Z" fill="url(#ramp6)" fill-opacity="${s.fill}"/>`)
    marks.push(`<path d="${d}" fill="none" stroke="url(#ramp6)" stroke-width="${s.w}" stroke-linejoin="round" stroke-linecap="round"/>`)
    // the seven readings themselves, which are the numbers the page states
    s.v.forEach((v, i) => marks.push(
      `<circle cx="${X(i).toFixed(2)}" cy="${Y(v).toFixed(2)}" r="${phone ? 2.2 : 2.8}" fill="${tint(v)}" stroke="#fff" stroke-width="1"/>`))
  }

  // ---- the pivot, through the whole plate -----------------------------------
  const notes = [
    `<line x1="${AXW.toFixed(2)}" y1="${pivY.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${pivY.toFixed(2)}" stroke="#fff" stroke-width="3.4"/>`,
    `<line x1="${AXW.toFixed(2)}" y1="${pivY.toFixed(2)}" x2="${(AXW + plotW).toFixed(2)}" y2="${pivY.toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
  ]

  // ---- the two counts the section is about ----------------------------------
  // Named on the first week only. Repeating a label on every tile would say there are three
  // weeks of data here, and there are not.
  const HI_D = P.record.ratio.indexOf(Math.max(...P.record.ratio))
  const LO_D = P.record.ratio.indexOf(Math.min(...P.record.ratio))
  for (const [i, txt] of [[HI_D, P.record.count[HI_D] + ' record days'], [LO_D, P.record.count[LO_D] + ' record days']]) {
    const above = P.record.ratio[i] > 1
    const s2 = phone ? String(P.record.count[i]) : txt
    const half = (s2.length * fs * 0.75) / 2
    const cx = Math.min(AXW + plotW - half, Math.max(AXW + half, X(i)))
    notes.push(T('m-fig', cx, Y(P.record.ratio[i]) + (above ? -10 : fs + 8), tint(P.record.ratio[i]), 'middle', s2))
  }

  // ---- which wave is which, named at the end of each -------------------------
  if (!phone) {
    for (const s of SERIES) {
      const last = s.v[slots - 1]
      notes.push(
        `<line x1="${(AXW + plotW).toFixed(2)}" y1="${Y(last).toFixed(2)}" x2="${(AXW + plotW + 6).toFixed(2)}" y2="${Y(last).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
        T('m-name', AXW + plotW + 9, Y(last) + fs * 0.34, INK, 'start', s.name))
    }
  } else {
    // Top LEFT is where Monday's peak and its count label are, so the two series names sit
    // against the right wall instead. The ladder found them sitting on "52" at every width
    // under 700.
    notes.push(
      T('m-name', AXW + plotW, top + fs, INK, 'end', 'record days'),
      T('m-name', AXW + plotW, top + fs + lh, MUTED, 'end', 'ordinary reading'))
  }

  // ---- the week along the foot ----------------------------------------------
  const days = []
  for (let i = 0; i < slots; i++) {
    days.push(`<line x1="${X(i).toFixed(2)}" y1="${bot.toFixed(2)}" x2="${X(i).toFixed(2)}" y2="${(bot + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    // clamped to the plate: the last slot's centre is half a slot short of the right wall,
    // which is less than half a label at 320
    const dx = Math.min(AXW + plotW - labW / 2, Math.max(AXW + labW / 2, X(i)))
    days.push(T('m-tick', dx, dayY + (stagger && i % 2 ? lh : 0), i % 7 === 1 || i % 7 === 2 ? INK : MUTED, 'middle', P.short[i % 7]))
  }
  // one hairline between weeks, so the tiling is visible rather than implied
  for (let r = 1; r < reps; r++) {
    const bx = AXW + (r * 7 / slots) * plotW
    days.push(`<line x1="${bx.toFixed(2)}" y1="${top.toFixed(2)}" x2="${bx.toFixed(2)}" y2="${(bot + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1" stroke-dasharray="2 3"/>`)
  }

  // ---- the axis, which is also the key ---------------------------------------
  const axis = [`<rect x="${(AXW - 9).toFixed(2)}" y="${top.toFixed(2)}" width="7" height="${ph}" fill="url(#ramp6)"/>`]
  for (const t of ticks) {
    axis.push(T('m-tick', AXW - 12, Math.min(bot, Math.max(top + fs, Y(t) + fs * 0.34)), MUTED, 'end', tickLab(t)))
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
    `aria-label="Two curves over a week, repeated ${reps} times, on one scale of times expected with a ` +
    `line across the middle at as many as expected. The first curve is how many of the ${P.stat.n} record ` +
    `days landed on each weekday: Monday ${P.record.count[1]} against ${P.record.expect[1]} expected, and ` +
    `Tuesday ${P.record.count[2]}. It swings ${P.stat.recordSwing} times from its highest day to its ` +
    `lowest. The second curve is how much these same pages are read on each weekday in ordinary time. It ` +
    `is highest on ${P.stat.readingHigh} and lowest on ${P.stat.readingLow} and swings only ` +
    `${P.stat.readingSwing} times, so it is almost a straight line next to the first.">` +
    `<defs><linearGradient id="ramp6" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bot}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${days.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
