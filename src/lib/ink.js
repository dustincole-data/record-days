/**
 * The ink.
 *
 * The ramp is not a stock scale dropped on top of the data. Its five stops ARE the data's
 * own landmarks — the shortest return, the two quartiles, the median and the longest — and
 * they arrive in `plate.json` from the pipeline, so the colours cannot drift from the
 * numbers. Interpolation runs piecewise between those stops in DAYS, which is also how the
 * axis bar's gradient is laid out, so a row's ink is exactly the axis's colour at the day
 * that row's mark stops.
 *
 * That makes the axis the legend. There is no second key to read.
 *
 * The page's accent — the rule, the section number, the focus ring — is ACCENT below, which
 * is the ink of 28 days: the median, and the one number the section is about. Chrome and
 * data are the same colour by construction.
 *
 * Every stop clears 3:1 against white (`dataviz` validate_palette, light, surface #fcfcfb),
 * which is what keeps the one-day marks at the left wall visible when they are a pixel wide.
 * The three a reader has to tell apart by name — one day, a month, a year — separate at
 * ΔE 12.7 protan / 24.3 normal. The validator's lightness-band and 15-ΔE checks are
 * categorical-palette checks and do not apply to a continuous ramp; its own footer says so.
 */
export const HEX = ['#1E2170', '#5B2A93', '#B31E63', '#C9452C', '#C67F08']

export const ACCENT = '#B31E63'   // 28 days. The median, and the page's accent ink.
export const INK = '#16181D'
export const MUTED = '#565C68'
export const HAIR = 'rgba(22,24,29,.16)'
export const GROUND = '#ffffff'

const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const RGB = HEX.map(hex2)
const pad = (n) => n.toString(16).padStart(2, '0')

/** The ink of a duration, interpolated between the payload's own stops. */
export function ink(days, stops) {
  if (days <= stops[0]) return HEX[0]
  if (days >= stops[stops.length - 1]) return HEX[HEX.length - 1]
  let i = 0
  while (i < stops.length - 2 && days > stops[i + 1]) i++
  const t = (days - stops[i]) / (stops[i + 1] - stops[i])
  const a = RGB[i], b = RGB[i + 1]
  return '#' + [0, 1, 2].map((k) => pad(Math.round(a[k] + (b[k] - a[k]) * t))).join('')
}
