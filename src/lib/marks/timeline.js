/**
 * When each record day happened.
 *
 * Every page is one dot, placed by the date of its record day and by how many views that
 * day drew. Pages that share a date sit in a stack, and a capsule is drawn around the stack.
 *
 * Two layouts, decided by the box: wide boxes run time left to right with views up the
 * page; narrow boxes run time DOWN the page with views left to right, so a phone gets a
 * tall scroll of eleven years rather than eleven years squeezed into 360 pixels.
 *
 * Ink: the red-orange stop of the ramp for the dots, indigo for the capsules.
 */
import { INK, MUTED, HAIR } from '../ink.js'
import { esc, T, logScale, compact } from './util.js'

export const DOT = '#C9452C'
export const RING = '#1E2170'

export function timeline(S, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const pts = S.points
  const byDate = new Map(S.bundles.map((b) => [b.d, b]))
  const big = pts.reduce((m, p) => (p.peak > m.peak ? p : m), pts[0])
  const r = phone ? 4 : 4.5
  const label = new Map(S.scale.ticks.map((t, i) => [t, S.scale.labels[i]]))

  const dots = [], rings = [], grid = [], notes = []
  const geo = []
  let H, X, Y

  if (!phone) {
    const M = { l: 54, r: 16, t: 30 + fs, b: 16 + fs + 10 }
    H = 400
    X = (days) => M.l + (days / S.scale.xhi) * (W - M.l - M.r)
    Y = logScale(S.scale.lo, S.scale.hi, H - M.b, M.t)
    for (const yr of S.scale.years) {
      const gx = X(yr.x)
      grid.push(`<line x1="${gx.toFixed(2)}" y1="${M.t}" x2="${gx.toFixed(2)}" y2="${(H - M.b).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
      grid.push(T('m-tick', gx, H - M.b + 10 + fs, fs, MUTED, String(yr.y), 'middle'))
    }
    for (const t of S.scale.ticks) {
      const gy = Y(t)
      grid.push(`<line x1="${M.l}" y1="${gy.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${gy.toFixed(2)}" stroke="${HAIR}" stroke-width="1" stroke-dasharray="2 4"/>`)
      grid.push(T('m-tick', M.l - 8, gy + fs * 0.36, fs, MUTED, label.get(t), 'end'))
    }
    grid.push(T('m-tick', M.l, M.t - 14, fs, MUTED, 'views that day'))
    for (const b of S.bundles) {
      const cx = X(b.x)
      rings.push(`<rect x="${(cx - r - 4).toFixed(2)}" y="${(Y(b.hi) - r - 4).toFixed(2)}" width="${(2 * r + 8).toFixed(2)}" height="${(Y(b.lo) - Y(b.hi) + 2 * r + 8).toFixed(2)}" rx="${r + 4}" fill="none" stroke="${RING}" stroke-width="1.4"/>`)
    }
    pts.forEach((p, i) => {
      const cx = X(p.x), cy = Y(p.peak)
      dots.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}" data-i="${i}"/>`)
      geo.push({ i, cx, cy, t: p.t, d: p.d, peak: p.peak, n: byDate.get(p.d)?.n ?? 1 })
    })
    const g = geo[pts.indexOf(big)]
    notes.push(T('m-name', g.cx - 11, g.cy + fs * 0.36, fs, INK, esc(big.t), 'end'))
    notes.push(T('m-fig', g.cx - 11 - fs * 0.53 * big.t.length - 8, g.cy + fs * 0.36, fs, DOT, compact(big.peak), 'end'))
  } else {
    const M = { l: 46, r: 8, t: 22 + fs, b: 16 }
    H = 1000
    Y = (days) => M.t + (days / S.scale.xhi) * (H - M.t - M.b)
    X = logScale(S.scale.lo, S.scale.hi, M.l, W - M.r)
    for (const yr of S.scale.years) {
      const gy = Y(yr.x)
      grid.push(`<line x1="${M.l}" y1="${gy.toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${gy.toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
      grid.push(T('m-tick', M.l - 8, gy + fs * 0.36, fs, MUTED, String(yr.y), 'end'))
    }
    for (const t of S.scale.narrow) {
      const gx = X(t)
      grid.push(`<line x1="${gx.toFixed(2)}" y1="${M.t}" x2="${gx.toFixed(2)}" y2="${(H - M.b).toFixed(2)}" stroke="${HAIR}" stroke-width="1" stroke-dasharray="2 4"/>`)
      grid.push(T('m-tick', gx, M.t - 8, fs, MUTED, label.get(t) + (t === S.scale.narrow[0] ? ' views' : ''), t === S.scale.narrow[S.scale.narrow.length - 1] ? 'end' : 'middle'))
    }
    for (const b of S.bundles) {
      const cy = Y(b.x)
      rings.push(`<rect x="${(X(b.lo) - r - 4).toFixed(2)}" y="${(cy - r - 4).toFixed(2)}" width="${(X(b.hi) - X(b.lo) + 2 * r + 8).toFixed(2)}" height="${(2 * r + 8).toFixed(2)}" rx="${r + 4}" fill="none" stroke="${RING}" stroke-width="1.4"/>`)
    }
    pts.forEach((p, i) => {
      const cx = X(p.peak), cy = Y(p.x)
      dots.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}" data-i="${i}"/>`)
      geo.push({ i, cx, cy, t: p.t, d: p.d, peak: p.peak, n: byDate.get(p.d)?.n ?? 1 })
    })
    const g = geo[pts.indexOf(big)]
    notes.push(T('m-name', g.cx - 11, g.cy + fs * 0.36, fs, INK, esc(big.t), 'end'))
  }

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Scatter chart. ${pts.length} English Wikipedia pages, one dot each, placed by the date of the page's record day between ${S.meta.window.start} and ${S.meta.window.end} and by the views it drew that day, from ${compact(S.stat.minPeak)} to ${compact(S.stat.maxPeak)}. ${S.stat.inBundles} of the pages share their date with another page, on ${S.stat.bundles} dates, each marked with a ring.">` +
    `<defs><clipPath id="tclip"><rect class="m-wipe" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>` +
    grid.join('') +
    `<g class="m-rows" clip-path="url(#tclip)">` +
    `<g class="m-rings">${rings.join('')}</g>` +
    `<g class="m-dots" fill="${DOT}" fill-opacity="0.62" stroke="#fff" stroke-width="0.8">${dots.join('')}</g>` +
    `<circle class="m-pick" cx="-20" cy="-20" r="${r + 5}" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `</g>` + notes.join('') + `</svg>`

  return { svg, height: H, rows: geo, geo: { W, phone, r } }
}
