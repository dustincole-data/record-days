/**
 * One page's own stopwatch: its daily views from a week before its record day to ninety
 * days after, on a log scale, with its normal level and the day it came back.
 *
 * The line's ink is the page's own return time on the site's ramp, so the page is the same
 * colour here as it is in the first chart. A page that never came back is gold; a page with
 * no normal level to measure against is grey.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'
import { esc, T, nf, logScale, compact } from './util.js'

export function trace(pg, stops, days, W) {
  const phone = W < 480
  const fs = phone ? 13 : 14
  const M = { l: 46, r: 14, t: 16 + fs + 10, b: 10 + fs + 8 }
  const H = phone ? 220 : 250
  const [FROM, TO] = days
  const x = (d) => M.l + ((d - FROM) / (TO - FROM)) * (W - M.l - M.r)
  const vals = pg.v.filter((v) => v > 0)
  const lo = Math.min(...vals, pg.base || Infinity)
  const hi = Math.max(...vals)
  const y = logScale(lo / 1.8, hi * 1.6, H - M.b, M.t)
  const hue = pg.kind === 'back' ? ink(pg.dur, stops) : pg.kind ? HEX[4] : MUTED

  // the line, broken where a reading is missing
  let d = '', area = '', open = false, firstX = null, lastX = null
  pg.v.forEach((v, i) => {
    const day = FROM + i
    if (v > 0) {
      const px = x(day), py = y(v)
      d += (open ? 'L' : 'M') + px.toFixed(2) + ' ' + py.toFixed(2)
      if (!open) { area += `M${px.toFixed(2)} ${(H - M.b).toFixed(2)}`; firstX = firstX ?? px }
      area += `L${px.toFixed(2)} ${py.toFixed(2)}`
      lastX = px
      open = true
    } else if (open) { area += `L${lastX.toFixed(2)} ${(H - M.b).toFixed(2)}Z`; open = false }
  })
  if (open) area += `L${lastX.toFixed(2)} ${(H - M.b).toFixed(2)}Z`

  const grid = []
  const decades = []
  for (let e = Math.ceil(Math.log10(lo / 1.8)); e <= Math.floor(Math.log10(hi * 1.6)); e++) decades.push(10 ** e)
  const shown = decades.length > (phone ? 4 : 5) ? decades.filter((_, i) => i % 2 === (decades.length - 1) % 2) : decades
  for (const t of shown) {
    const gy = y(t)
    grid.push(`<line x1="${M.l}" y1="${gy.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${gy.toFixed(2)}" stroke="${HAIR}" stroke-width="1" stroke-dasharray="2 4"/>`)
    grid.push(T('m-tick', M.l - 8, gy + fs * 0.36, fs, MUTED, compact(t), 'end'))
  }
  const xt = phone ? [0, 30, 60, 90] : [-7, 0, 15, 30, 45, 60, 75, 90]
  grid.push(`<line x1="${M.l}" y1="${(H - M.b).toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${(H - M.b).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
  for (const t of xt) {
    grid.push(T('m-tick', x(t), H - M.b + 8 + fs, fs, t === 0 ? INK : MUTED, t === 0 ? 'record day' : String(t), t === xt[0] && t < 0 ? 'start' : t === xt[xt.length - 1] ? 'end' : 'middle'))
  }

  const notes = []
  // the normal level, labelled under the line where the data almost never is
  if (pg.base) {
    const ny = y(pg.base)
    notes.push(`<line x1="${M.l}" y1="${ny.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${ny.toFixed(2)}" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4"/>`)
    notes.push(T('m-note', W - M.r, ny + fs + 4, fs, INK, `normal level ${nf.format(Math.round(pg.base))} a day`, 'end'))
  }
  // the record day
  const p0 = { cx: x(0), cy: y(pg.peak) }
  notes.push(`<circle cx="${p0.cx.toFixed(2)}" cy="${p0.cy.toFixed(2)}" r="4.5" fill="${hue}" stroke="#fff" stroke-width="1.5"/>`)
  notes.push(T('m-fig', p0.cx + 10, p0.cy + fs * 0.36, fs, hue, `${nf.format(pg.peak)} views`))
  // the return
  if (pg.kind === 'back' && pg.dur <= TO) {
    const rx = x(pg.dur)
    notes.push(`<line x1="${rx.toFixed(2)}" y1="${(M.t - 4).toFixed(2)}" x2="${rx.toFixed(2)}" y2="${(H - M.b).toFixed(2)}" stroke="#fff" stroke-width="3"/>`)
    notes.push(`<line x1="${rx.toFixed(2)}" y1="${(M.t - 4).toFixed(2)}" x2="${rx.toFixed(2)}" y2="${(H - M.b).toFixed(2)}" stroke="${hue}" stroke-width="1.6"/>`)
    const txt = `back to normal on day ${pg.dur}`
    const tw = fs * 0.53 * txt.length
    const anchor = rx + 8 + tw > W - M.r ? 'end' : 'start'
    notes.push(T('m-note', anchor === 'end' ? rx - 8 : rx + 8, M.t - 10, fs, hue, txt, anchor))
  } else {
    const txt = pg.kind === 'back' ? `back to normal on day ${pg.dur}`
      : pg.kind === 'holdout' ? 'still above twice normal a year later'
      : pg.kind === 'running' ? 'record day too recent to tell'
      : 'no normal level in the month before'
    notes.push(T('m-note', W - M.r, M.t - 10, fs, pg.kind ? hue : MUTED, txt, 'end'))
  }

  const svg =
    `<svg class="plate plate-trace" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Line chart. Daily views of the Wikipedia page ${esc(pg.t)} from a week before its record day, ${pg.d}, to ninety days after. ${nf.format(pg.peak)} views on the day, ${pg.before === null ? 'no reading' : nf.format(pg.before) + ' views'} the day before${pg.base ? `, a normal level of ${nf.format(Math.round(pg.base))} a day` : ''}${pg.kind === 'back' ? `, back to normal on day ${pg.dur}` : ''}.">` +
    grid.join('') +
    `<path d="${area}" fill="${hue}" fill-opacity="0.12"/>` +
    `<path d="${d}" fill="none" stroke="${hue}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    notes.join('') + `</svg>`

  return { svg, height: H }
}
