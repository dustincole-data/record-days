// Shared drawing helpers for the four cast marks. No data lives here; every number
// the marks draw comes from data/census/cast.json, which scripts/analyse-cast.js
// writes out of src/lib/findings.js.
//
// Every mark is a pure function of (cast, width, env) and returns the svg body plus
// the height that body needs. The page renders each one at a default width on the
// server and again at the width the reader actually has, so the sheets reflow rather
// than scale.

// --- the palette -----------------------------------------------------------
//
// One ramp carries one idea across all four marks: how tied two pages are. Violet
// is a pair that shared a record day, rose a pair whose days were within a fortnight
// of each other, amber a pair that shared nothing. Validated with the dataviz
// skill's validate_palette.js against a white surface: lightness band, chroma floor,
// CVD separation (worst adjacent 14.6 deutan, 11.8 tritan), normal-vision floor
// (18.2), and contrast (all three at or above 3:1) all pass.
export const INK = '#1F1D1B'
export const RULE = '#B9B4AE'
export const BOUND = '#5433B0'
export const NEAR = '#C42E5E'
export const ALONE = '#D6740E'
export const WHITE = '#ffffff'

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const rgb2hex = (v) => '#' + v.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function toOklab(hex) {
  const [r, g, b] = hex2rgb(hex).map(srgbToLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return rgb2hex([
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(linearToSrgb))
}

// Amber at nothing, rose in the middle, violet at a tie. Interpolated in OKLab so
// the lightness runs monotonically down the ramp instead of buckling in the rose.
const STOPS = [ALONE, NEAR, BOUND].map(toOklab)
export function ramp(t) {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x))
  const f = x - i
  return fromOklab(STOPS[i].map((v, k) => v + f * (STOPS[i + 1][k] - v)))
}

// --- svg -------------------------------------------------------------------
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const n = (x) => (Math.round(x * 100) / 100).toString()
export const title = (a) => a.replace(/_/g, ' ')

export function text(x, y, s, o = {}) {
  const a = {
    x: n(x), y: n(y), fill: o.fill || INK, 'font-size': o.size || 12,
    'font-weight': o.weight || 400, 'text-anchor': o.anchor || 'start',
    'letter-spacing': o.tracking === undefined ? 0 : o.tracking,
  }
  if (o.opacity !== undefined) a.opacity = o.opacity
  // An axis tick is the scale's own output rather than something anyone wrote, so it is
  // marked and the copy gate drops it before it counts numbers.
  if (o.tick) a.class = 'tick'
  return '<text ' + Object.entries(a).map(([k, v]) => k + '="' + v + '"').join(' ') + '>' + esc(s) + '</text>'
}

export function line(x1, y1, x2, y2, o = {}) {
  return '<line x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) +
    '" stroke="' + (o.stroke || RULE) + '" stroke-width="' + (o.width || 1) + '"' +
    (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') +
    (o.cap ? ' stroke-linecap="' + o.cap + '"' : '') +
    (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : '') + ' />'
}

export function circle(cx, cy, r, o = {}) {
  return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + (o.fill || 'none') + '"' +
    (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : '') +
    (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.width || 1) + '"' : '') + ' />'
}

export function rect(x, y, w, h, o = {}) {
  return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(Math.max(0, w)) + '" height="' + n(Math.max(0, h)) +
    '" fill="' + (o.fill || 'none') + '"' +
    (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : '') +
    (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.width || 1) + '"' : '') +
    (o.rx ? ' rx="' + o.rx + '"' : '') + ' />'
}

export function path(d, o = {}) {
  return '<path d="' + d + '" fill="' + (o.fill || 'none') + '"' +
    (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : '') +
    (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.width || 1) + '"' : '') +
    (o.cap ? ' stroke-linecap="' + o.cap + '"' : '') +
    (o.join ? ' stroke-linejoin="' + o.join + '"' : '') + ' />'
}

// A band between two discs, wide in the middle and tapered into each end, so the
// tie reads as a thing with a thickness rather than as a line with a stroke width.
export function band(ax, ay, bx, by, w) {
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const px = -uy, py = ux
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const e = 0.22 * w
  return [
    'M ' + n(ax + px * e) + ' ' + n(ay + py * e),
    'Q ' + n(mx + px * w) + ' ' + n(my + py * w) + ' ' + n(bx + px * e) + ' ' + n(by + py * e),
    'L ' + n(bx - px * e) + ' ' + n(by - py * e),
    'Q ' + n(mx - px * w) + ' ' + n(my - py * w) + ' ' + n(ax - px * e) + ' ' + n(ay - py * e),
    'Z',
  ].join(' ')
}

// --- scales ----------------------------------------------------------------
export const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)
export const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v))

// --- text measurement ------------------------------------------------------
//
// The browser measures with the loaded face and re-draws; this table is only what the
// server has to go on before that happens. Advances are Archivo's, in ems, bucketed:
// the error is a few percent, which moves a wrap point and never a number.
const NARROW = "iljtIfr.,;:'!|()[]/ "
const WIDE = 'mwMW@%'
const CAPS = 'ABCDEFGHJKLNOPQRSTUVXYZ'
export function advance(s, size, weight = 400, tracking = 0) {
  let em = 0
  for (const ch of String(s)) {
    if (ch === ' ') em += 0.26
    else if (NARROW.includes(ch)) em += 0.31
    else if (WIDE.includes(ch)) em += 0.86
    else if (CAPS.includes(ch)) em += 0.66
    else if (ch >= '0' && ch <= '9') em += 0.57
    else em += 0.545
  }
  return em * size * (weight >= 600 ? 1.035 : 1) + tracking * Math.max(0, String(s).length - 1)
}

// Greedy wrap to a pixel width.
export function wrapWords(s, maxPx, size, measure = advance, weight = 400, tracking = 0) {
  const words = String(s).split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const add = cur ? cur + ' ' + w : w
    if (cur && measure(add, size, weight, tracking) > maxPx) { lines.push(cur); cur = w } else cur = add
  }
  if (cur) lines.push(cur)
  return lines
}

// A list of page titles wraps on its own separator, so a broken line still ends in
// the plus that says it continues. A title too long to fit a line on its own falls
// back to breaking on spaces: at 320px "United States presidential election, 2016"
// is wider than the column, and without this it would run off the sheet.
export function wrapList(items, maxPx, size, measure = advance, weight = 400) {
  const lines = []
  let cur = ''
  const flush = () => { if (cur) { lines.push(cur); cur = '' } }
  for (const t of items) {
    const add = cur ? cur + ' + ' + t : t
    if (cur && measure(add + ' +', size, weight) > maxPx) { lines.push(cur + ' +'); cur = t } else { cur = add; continue }
    if (measure(cur + ' +', size, weight) > maxPx) {
      const broken = wrapWords(cur, maxPx, size, measure, weight)
      lines.push(...broken.slice(0, -1))
      cur = broken[broken.length - 1]
    }
  }
  flush()
  // The head of the list can overflow the same way when it is the only item so far.
  const out = []
  for (const l of lines) {
    if (measure(l, size, weight) <= maxPx) { out.push(l); continue }
    out.push(...wrapWords(l, maxPx, size, measure, weight))
  }
  // A break that leaves the separator stranded on its own line reads as a typo, so
  // the orphan goes back onto the line it came from.
  return out.filter((l, i) => {
    if (l !== '+' || i === 0) return true
    out[i - 1] += ' +'
    return false
  })
}

export function svg(w, h, body, label) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + n(w) + '" height="' + n(h) +
    '" viewBox="0 0 ' + n(w) + ' ' + n(h) + '" role="img" aria-label="' + esc(label) +
    '" font-family="Archivo, system-ui, sans-serif">' +
    '<rect width="' + n(w) + '" height="' + n(h) + '" fill="' + WHITE + '" />' + body + '</svg>'
}

// --- a deterministic stress layout -----------------------------------------
//
// Places the pages of one constellation so that the gap between any two of them is
// its own pair distance on one ruler shared by every constellation on the sheet.
// Seeded from the pages' own order, so a rebuild draws the identical figure.
export function stress(nodes, dist, iterations = 600) {
  const k = nodes.length
  const pos = nodes.map((_, i) => [
    Math.cos((i * 2.399963) + 0.6) * (12 + 6 * i),
    Math.sin((i * 2.399963) + 0.6) * (12 + 6 * i),
  ])
  if (k === 2) return [[-dist(0, 1) / 2, 0], [dist(0, 1) / 2, 0]]
  for (let t = 0; t < iterations; t++) {
    const step = 0.2 * (1 - t / iterations) + 0.02
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const dx = pos[j][0] - pos[i][0], dy = pos[j][1] - pos[i][1]
        const d = Math.hypot(dx, dy) || 0.001
        const want = dist(i, j)
        const push = (step * (d - want)) / d / 2
        pos[i][0] += dx * push; pos[i][1] += dy * push
        pos[j][0] -= dx * push; pos[j][1] -= dy * push
      }
    }
  }
  // Turn the figure so its longest axis lies across the sheet, then centre it.
  let best = [0, 1], span = -1
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const d = Math.hypot(pos[j][0] - pos[i][0], pos[j][1] - pos[i][1])
    if (d > span) { span = d; best = [i, j] }
  }
  const a = pos[best[0]], b = pos[best[1]]
  const ang = -Math.atan2(b[1] - a[1], b[0] - a[0])
  const cos = Math.cos(ang), sin = Math.sin(ang)
  const turned = pos.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
  const cx = (Math.min(...turned.map((p) => p[0])) + Math.max(...turned.map((p) => p[0]))) / 2
  const cy = (Math.min(...turned.map((p) => p[1])) + Math.max(...turned.map((p) => p[1]))) / 2
  return turned.map(([x, y]) => [x - cx, y - cy])
}

// --- the one ruler two marks share -----------------------------------------
//
// The hero and the lag sheet both measure the same quantity, so they are drawn on
// one domain with one tick set. At equal width they are pixel-identical rulers, and
// a lag row can be read straight up into the hero's rows.
export const TIE_MIN = -0.5
export const TIE_MAX = 0.95
export const TIE_TICKS = [-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]
export const TIE_TICKS_NARROW = [-0.4, 0, 0.4, 0.8]
export const tieScale = (l, r) => scale(TIE_MIN, TIE_MAX, l, r)
export const tieTicks = (plotW) => (plotW < 330 ? TIE_TICKS_NARROW : TIE_TICKS)

// A deterministic scatter, so a redraw at the same width lands the same field.
export function rng(seed) {
  let s = seed >>> 0
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
}

export const SOURCE =
  "English Wikipedia daily pageviews, user agents only, Wikimedia REST API. Every article that ever reached a day's most-read list, 1 July 2015 to 13 August 2026; the 220 largest single reading days on record."
