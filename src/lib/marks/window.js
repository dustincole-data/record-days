/**
 * The plate for F10 — the half-life against the window it was read from.
 *
 * THE AXIS IS THE FINDING, and it is the only axis on this site that is not a quantity the
 * world produced. Left to right is how long the analyst looked; up is the half-life the fit
 * hands back. A number that were a property of these events would draw a flat line. It climbs
 * by a factor of 48 across the plate and does not flatten anywhere.
 *
 * Under it, and drawn as a band rather than a line because it has a width, is the half-life
 * read straight off the readings at three depths. That one does not move.
 *
 * THE INK IS THE SITE'S DAY RAMP, taken from 03's payload rather than restated: up this plate
 * is a number of days, so a colour here is the same number of days it is on the first plate.
 * 11 asserts the two are one array.
 *
 * A VERTICAL GRADIENT'S STOPS ARE WRITTEN IN ASCENDING OFFSET ORDER, always. SVG clamps each
 * stop to be no smaller than the last, so a bottom-to-top ramp emitted in value order collapses
 * to its first colour — which is how three plates on this site rendered flat indigo once.
 *
 * Type size is emitted here, never in a stylesheet. See held.js for what that cost once.
 */
import { ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const L = Math.log10

export function windows(P, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14

  const S = P.scale
  const stops = P.stops.map(L)
  const yLab = S.y.labels.reduce((a, b) => (b.length > a.length ? b : a), '')
  const M = { l: Math.ceil(fs * 0.75 * yLab.length) + 16, r: phone ? 2 : 12 }
  const plotW = Math.max(120, W - M.l - M.r)
  const headY = 6 + fs
  // The two figures are pinned to their own windows, so the room they share is the gap between
  // those two windows and not the plate. Where they will not both fit in it they stagger onto
  // two rows, which is what beat 06's weekday names do and for the same reason.
  const figW = (t) => fs * 0.75 * (t.med + ' days').length
  const xOf = (v) => ((L(v) - L(S.x.lo)) / (L(S.x.hi) - L(S.x.lo))) * plotW
  const stagger = xOf(P.named[0].w) + 4 + figW(P.named[0]) > xOf(P.named[1].w) + 4 - figW(P.named[1])
  const headY2 = headY + fs + 3
  const top = (stagger ? headY2 : headY) + 14
  const plotH = Math.max(240, Math.min(560, plotW * 0.52))
  const base = top + plotH
  const tickY = base + 6 + fs
  const H = Math.ceil(tickY + 10)

  const xlo = L(S.x.lo), xhi = L(S.x.hi), ylo = L(S.y.lo), yhi = L(S.y.hi)
  const x = (v) => M.l + ((L(v) - xlo) / (xhi - xlo)) * plotW
  const y = (v) => base - ((L(v) - ylo) / (yhi - ylo)) * plotH
  const tint = (v) => ink(L(v), stops)

  const T = (cls, tx, ty, fill, anchor, s) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  // ---- the ribbon and the line it holds ------------------------------------
  const up = P.sweep.map((s) => `${x(s.w).toFixed(2)} ${y(s.p75).toFixed(2)}`)
  const down = P.sweep.slice().reverse().map((s) => `${x(s.w).toFixed(2)} ${y(s.p25).toFixed(2)}`)
  const line = P.sweep.map((s) => `${x(s.w).toFixed(2)} ${y(s.med).toFixed(2)}`)
  const marks = [
    `<path d="M${up.join('L')}L${down.join('L')}Z" fill="url(#ramp9)" fill-opacity="0.30"/>`,
    `<path d="M${line.join('L')}" fill="none" stroke="url(#ramp9)" stroke-width="${phone ? 2.4 : 3}" stroke-linejoin="round" stroke-linecap="round"/>`,
  ]

  // ---- what the readings themselves say, which is a band, not a line -------
  const bandTop = y(P.stat.obsHi), bandBot = y(P.stat.obsLo)
  const band = [
    `<rect x="${M.l.toFixed(2)}" y="${bandTop.toFixed(2)}" width="${plotW.toFixed(2)}" ` +
    `height="${Math.max(2, bandBot - bandTop).toFixed(2)}" fill="${tint(1)}" fill-opacity="0.22"/>`,
    `<line x1="${M.l.toFixed(2)}" y1="${bandTop.toFixed(2)}" x2="${(M.l + plotW).toFixed(2)}" y2="${bandTop.toFixed(2)}" stroke="${tint(1)}" stroke-width="1.2"/>`,
  ]
  const bandTxt = phone
    ? P.stat.obsLo + ' to ' + P.stat.obsHi + ' days'
    : 'the readings themselves halve in ' + P.stat.obsLo + ' to ' + P.stat.obsHi + ' days'
  // The label goes ABOVE the band, in the room the curve leaves empty at the left: below it is
  // the axis, and a line of type between a band and its own tick labels reads as a third scale.
  band.push(T('m-name', M.l + 6, bandTop - 8, tint(1), null, bandTxt))

  // ---- the two named windows, above the field so nothing lands on the ink --
  const notes = []
  P.named.forEach((n, i) => {
    const nx = x(n.w), ny = y(n.med)
    const right = i > 0
    notes.push(
      `<line x1="${nx.toFixed(2)}" y1="${((right && stagger ? headY2 : headY) + 6).toFixed(2)}" x2="${nx.toFixed(2)}" y2="${(ny - 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
      `<circle cx="${nx.toFixed(2)}" cy="${ny.toFixed(2)}" r="3.4" fill="#fff"/>`,
      `<circle cx="${nx.toFixed(2)}" cy="${ny.toFixed(2)}" r="2.4" fill="${tint(n.med)}"/>`,
      T('m-fig', right ? nx + 4 : nx - 4, right && stagger ? headY2 : headY, tint(n.med),
        right ? 'end' : 'start', n.med + ' days'))
  })

  // ---- the axes. The upright one is painted in the ramp, so it is the key. --
  const axis = [`<rect x="${(M.l - 9).toFixed(2)}" y="${top.toFixed(2)}" width="6" height="${plotH.toFixed(2)}" fill="url(#ramp9)"/>`]
  const yt = phone ? S.narrowY : S.y.ticks
  yt.forEach((t) => {
    axis.push(T('m-tick', M.l - 13, y(t) + fs * 0.35, MUTED, 'end', S.y.labels[S.y.ticks.indexOf(t)]))
  })
  const xt = phone ? S.narrowX : S.x.ticks
  xt.forEach((t, i) => {
    axis.push(`<line x1="${x(t).toFixed(2)}" y1="${base.toFixed(2)}" x2="${x(t).toFixed(2)}" y2="${(base + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', x(t), tickY, MUTED,
      i === 0 ? 'start' : i === xt.length - 1 ? 'end' : 'middle', S.x.labels[S.x.ticks.indexOf(t)]))
  })

  // The ramp is sampled off ink() rather than written from the five stops, so a colour on the
  // upright axis is the colour a value of that height is actually drawn in.
  const SAMPLES = 14
  const rampStops = Array.from({ length: SAMPLES }, (_, i) => {
    const t = i / (SAMPLES - 1)
    return `<stop offset="${(t * 100).toFixed(2)}%" stop-color="${ink(ylo + (yhi - ylo) * t, stops)}"/>`
  }).join('')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="A rising curve. Left to right is the length of the window an exponential decay ` +
    `was fitted over, from ${P.meta.from} to ${P.meta.to} days. Up is the half-life that fit ` +
    `reports, from about one day to about a hundred. The middle of ${P.stat.n} pages runs from ` +
    `${P.sweep[0].med} days at the shortest window to ${P.stat.hlLong} days at the longest, a ` +
    `factor of ${P.stat.span}, and it rises at every step. The flat band underneath is the ` +
    `half-life read straight off the readings, ${P.stat.obsLo} to ${P.stat.obsHi} days, which ` +
    `does not depend on the window.">` +
    `<defs><linearGradient id="ramp9" gradientUnits="userSpaceOnUse" x1="0" y1="${base}" x2="0" y2="${top}">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${band.join('')}${notes.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}
