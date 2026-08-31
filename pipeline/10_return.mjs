/**
 * 10_return — the payload for F9, and every number that plate prints.
 *
 * THE FINDING. On the day one year after its record day, a page reads a median 1.85 times its
 * own surrounding level, and 177 of the 199 pages that can be tested read above that level on
 * that one day. Five matched depths run the identical estimator and find nothing.
 *
 * THE ESTIMATOR, one definition, used for the headline and for every control:
 *
 *   ratio(D) = views on day D / median of days D-35 .. D+35, excluding D-7 .. D+7
 *
 * The excluded fortnight is what keeps the spike out of its own denominator. Everything the
 * plate draws and everything the page prints comes out of that one function, called at six
 * depths: +365 and the five controls at +200 / +240 / +270 / +300 / +330. A control is not a
 * different measurement, it is the same measurement somewhere else, which is the only reason
 * it can rule anything out.
 *
 * THE PLATE'S DENOMINATOR IS THE ROW'S, NOT THE COLUMN'S. Every cell in one page's column is
 * that day's views over THAT page's anniversary level, so the cell at day 365 IS the number in
 * the headline, by construction rather than by coincidence. A second, per-day estimator would
 * be a second definition of the same thing, which this repo has been bitten by once.
 *
 * WHAT IS GUARDED is the relation, not only the number: the anniversary must beat every one of
 * the five controls, the controls must all sit near 1, and the interval must exclude 1. "It
 * comes back" is false the moment a control lifts too, and only a guard on the controls catches
 * that.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'return'

const census = JSON.parse(readFileSync(join(ROOT, 'data', 'census', 'top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const renamed = Object.keys(JSON.parse(readFileSync(join(ROOT, 'data', 'census', 'renamed.json'), 'utf8')))

const DAY = 365                    // the anniversary
const HALF = 35, GAP = 7           // the neighbourhood, and the fortnight cut out of it
const CONTROLS = [200, 240, 270, 300, 330]
const FROM = DAY - HALF, TO = DAY + HALF   // the raster's window is the estimator's window
// The drawn field is quantised, and the quantisation is an editorial decision as much as a
// cheap one. The quantity is a LIFT, so every day at or below a page's own level is the same
// state — nothing happening — and shares bin 0. That is what lets a quiet column cost a
// handful of rectangles instead of seventy, and it is what the key strip says on the plate.
const BINS = 10                    // ten steps of 1.26x from its own level to eight times it
const CUT_LO = 1, CUT_HI = 8       // the ink's domain, in times its own level

const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const L = Math.log10

// The one estimator.
function ratio(series, D) {
  const v = series[String(D)]
  if (v === undefined) return null
  const nb = []
  for (let d = D - HALF; d <= D + HALF; d++) {
    if (Math.abs(d - D) <= GAP) continue
    const x = series[String(d)]
    if (x !== undefined) nb.push(x)
  }
  const l = med(nb)
  return (!l || l <= 0) ? null : v / l
}

// A hand rule, and it is named as one on the page: a title carrying one of these words is an
// event that runs again a year later, so its day +365 may be the next edition rather than a
// memory. The point of the split is that the OTHER rows carry the finding on their own.
const SCHEDULED = /World_Cup|WrestleMania|Royal_Rumble|Academy_Awards|Super_Bowl|Olympic|Eurovision|Grammy|Election|Final/i

const all = census.rows.map((r) => ({
  t: r.article.replace(/_/g, ' '), a: r.article, d: r.date, series: r.series,
  x: ratio(r.series, DAY),
})).filter((r) => r.x !== null)
all.sort((a, b) => b.x - a.x)

const xs = all.map((r) => r.x)
const above1 = all.filter((r) => r.x > 1).length
const above2 = all.filter((r) => r.x >= 2).length

// --- the five controls, same function, five other depths ---------------------
const controls = CONTROLS.map((D) => {
  const cs = census.rows.map((r) => ratio(r.series, D)).filter((x) => x !== null)
  return {
    d: D, n: cs.length,
    median: +med(cs).toFixed(4),
    above2Pct: +((100 * cs.filter((x) => x >= 2).length) / cs.length).toFixed(1),
  }
})

// --- the sign test, exact ----------------------------------------------------
const lgamma = (x) => { let s = 0; for (let i = 2; i < x; i++) s += Math.log(i); return s }
let signP = 0
for (let i = above1; i <= all.length; i++) {
  signP += Math.exp(lgamma(all.length + 1) - lgamma(i + 1) - lgamma(all.length - i + 1) - all.length * Math.LN2)
}

// --- the interval, deterministic so the run draws the same field every time ---
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
const rand = rng(20260831)
const DRAWS = 20000
const meds = []
for (let b = 0; b < DRAWS; b++) {
  const s = new Array(xs.length)
  for (let i = 0; i < xs.length; i++) s[i] = xs[(rand() * xs.length) | 0]
  meds.push(med(s))
}
meds.sort((a, b) => a - b)
const bootLo = +meds[Math.floor(0.025 * DRAWS)].toFixed(3)
const bootHi = +meds[Math.floor(0.975 * DRAWS)].toFixed(3)

// --- the two contamination cuts, and the repeating-event split ---------------
const F12 = ['Index_(statistics)', "Cook's_Country", 'Question_mark', 'Dulce_María']
const cutSet = new Set([...F12, ...renamed])
const cut = all.filter((r) => !cutSet.has(r.a))
const sched = all.filter((r) => SCHEDULED.test(r.a))
const other = all.filter((r) => !SCHEDULED.test(r.a))

// --- the drawn field ---------------------------------------------------------
// One column per page, one cell per day, quantised so that a run of quiet days is one rect
// rather than seventy. The bin is the only thing the mark reads, so the ink cannot drift from
// the payload: everything the eye sees was decided here.
const binOf = (v) => {
  const t = (L(v) - L(CUT_LO)) / (L(CUT_HI) - L(CUT_LO))
  return Math.max(0, Math.min(BINS - 1, Math.round(t * (BINS - 1))))
}
const CH = (b) => String.fromCharCode(48 + b)
const days = []
for (let d = FROM; d <= TO; d++) days.push(d)

const rows = all.map((r) => {
  const nb = []
  for (let d = DAY - HALF; d <= DAY + HALF; d++) {
    if (Math.abs(d - DAY) <= GAP) continue
    const x = r.series[String(d)]
    if (x !== undefined) nb.push(x)
  }
  const lvl = med(nb)
  const c = days.map((d) => {
    const v = r.series[String(d)]
    return v === undefined ? '.' : CH(binOf(v / lvl))
  }).join('')
  return { t: r.t, a: r.a, d: r.d, x: +r.x.toFixed(4), lvl: Math.round(lvl), c }
})

// The ramp's five stops are the anniversary distribution's own landmarks, and the middle one
// is 1.850 — the number the section is about, which is the page's accent ink by construction.
const stops = [
  +q(xs, 0.02).toFixed(4), +q(xs, 0.25).toFixed(4), +med(xs).toFixed(4),
  +q(xs, 0.75).toFixed(4), +Math.max(...xs).toFixed(3),
]

const fig = (x) => (x >= 10 ? Math.round(x) : x.toFixed(1)) + ' times'

const out = {
  meta: {
    source: ev.meta.source, window: ev.meta.window,
    day: DAY, half: HALF, gap: GAP, from: FROM, to: TO,
    controls: CONTROLS, draws: DRAWS, bins: BINS, cutLo: CUT_LO, cutHi: CUT_HI,
  },
  stat: {
    all: census.rows.length,
    n: all.length,
    median: +med(xs).toFixed(4),
    above1, above1Pct: +((100 * above1) / all.length).toFixed(1),
    above2Pct: +((100 * above2) / all.length).toFixed(1),
    signP,
    bootLo, bootHi,
    cutN: cut.length, cutMedian: +med(cut.map((r) => r.x)).toFixed(4),
    schedN: sched.length, schedMedian: +med(sched.map((r) => r.x)).toFixed(4),
    otherN: other.length, otherMedian: +med(other.map((r) => r.x)).toFixed(4),
    otherAbovePct: +((100 * other.filter((r) => r.x > 1).length) / other.length).toFixed(1),
    max: +Math.max(...xs).toFixed(2), min: +Math.min(...xs).toFixed(4),
    full: rows.filter((r) => !r.c.includes('.')).length,
  },
  controls,
  stops,
  days,
  sched: sched.map((r) => r.t).sort(),
  top: rows.slice(0, 3).map((r) => ({ t: r.t, a: r.a, d: r.d, x: r.x, lvl: r.lvl, text: fig(r.x) })),
  low: rows.slice(-1).map((r) => ({ t: r.t, x: r.x, text: r.x.toFixed(2) + ' times' })),
  rows: rows.map((r) => ({ t: r.t, a: r.a, x: r.x, c: r.c })),
}

// ==================================================================== guards
const fails = []
const check = (name, got, want, tol = 0) => {
  const ok = typeof want === 'number' && typeof got === 'number'
    ? Math.abs(got - want) <= tol
    : JSON.stringify(got) === JSON.stringify(want)
  console.log((ok ? '  ok   ' : '  FAIL ') + name + ': ' + JSON.stringify(got) + (ok ? '' : '   (expected ' + JSON.stringify(want) + ')'))
  if (!ok) fails.push(name)
}
console.log(PASS + ' checks against research/findings.md:')

check('pages with a reading on day 365', out.stat.n, 199)
check('of the 220 in the file', out.stat.all, 220)
check('the middle page reads, times its own level', out.stat.median, 1.85, 0.0001)
check('pages above their own level on the day', out.stat.above1, 177)
check('which is, %', out.stat.above1Pct, 88.9)
check('at or above twice it, %', out.stat.above2Pct, 46.2)
check('the biggest', out.top[0].t, 'Diogo Jota')
check('and what it reads', out.top[0].x, 82.06, 0.001)
check('and as the plate prints it', out.top[0].text, '82 times')
check('the smallest', out.low[0].x, 0.4243)

// --- THE RELATION. The claim is a comparison, so the comparison is guarded. --
check('the five control depths', controls.map((c) => c.d), CONTROLS)
check('and what each of them reads', controls.map((c) => c.median), [0.9648, 1.0129, 0.9648, 0.9984, 0.9671])
check('every control sits within 5% of its own level',
  controls.every((c) => c.median > 0.95 && c.median < 1.05), true)
check('the anniversary beats every one of them',
  controls.every((c) => out.stat.median > 1.6 * c.median), true)
check('their share at twice the level, %', controls.map((c) => c.above2Pct), [1.9, 6.3, 0.5, 7.4, 7.5])
check('and the anniversary carries at least five times the highest of them',
  out.stat.above2Pct > 5 * Math.max(...controls.map((c) => c.above2Pct)), true)

// --- the tests ---------------------------------------------------------------
check('sign test, one sided', +out.stat.signP.toExponential(1).split('e')[0], 1.4, 0.05)
check('and its exponent', Math.round(Math.log10(out.stat.signP)), -31)
check('the interval, ' + DRAWS.toLocaleString('en-US') + ' resamples', [bootLo, bootHi], [1.6, 2.085])
check('which excludes 1', bootLo > 1, true)

// --- the two ways it could be an artefact, both counted ----------------------
check('dropping the four shape outliers and the eight moved titles', out.stat.cutN, 187)
check('leaves the middle page at', out.stat.cutMedian, 1.8527)
check('which moves the headline by under 0.01', Math.abs(out.stat.cutMedian - out.stat.median) < 0.01, true)
check('titles naming an event that runs again', out.stat.schedN, 13)
check('and the rest', out.stat.otherN, 186)
check('which account for every page tested', out.stat.schedN + out.stat.otherN, out.stat.n)
check('the rest still read', out.stat.otherMedian, 1.841, 0.001)
check('with above their own level, %', out.stat.otherAbovePct, 89.2)
check('so the finding does not rest on the repeating events', out.stat.otherMedian > 1.6, true)
check('the repeating ones read', out.stat.schedMedian, 2.0532)

// --- the drawn field matches the numbers -------------------------------------
check('columns drawn, one per page', out.rows.length, out.stat.n)
check('days drawn, which is the estimator window', out.days.length, 2 * HALF + 1)
check('every column carries one cell per day', out.rows.every((r) => r.c.length === out.days.length), true)
check('pages with every day of the window', out.stat.full, 196)
check('the field is sorted, biggest lift first', out.rows.every((r, i) => i === 0 || r.x <= out.rows[i - 1].x), true)
const at365 = out.days.indexOf(DAY)
check('day 365 is the middle column', at365, HALF)
check('and its cell is that page\'s own reading, in every column',
  out.rows.every((r) => r.c[at365] === CH(binOf(r.x))), true)
check('the ramp stops rise', stops.every((s, i) => i === 0 || s > stops[i - 1]), true)
check('and its middle stop is the number the section is about', stops[2], out.stat.median)

const bad = []
;(function scan(node, path) {
  if (Array.isArray(node)) node.forEach((v, i) => scan(v, path + '[' + i + ']'))
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) scan(v, path + '.' + k)
  else if (typeof node === 'number' && !Number.isFinite(node)) bad.push(path)
})(out, PASS)
check('every number in the payload is a number', bad.slice(0, 3), [])

const p = join(GEN, PASS + '.json')
writeFileSync(p, JSON.stringify(out))
console.log('\n' + PASS + ' ' + readFileSync(p).length.toLocaleString('en-US') + ' bytes -> src/gen/' + PASS + '.json')
if (fails.length) { console.error('\n' + PASS + ' guards failed: ' + fails.join(', ')); process.exit(1) }
