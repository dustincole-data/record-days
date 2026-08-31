/**
 * 08_weekday — the payload for F6, and every number that plate prints.
 *
 * TWO WEEKLY CYCLES ON ONE SHARED SCALE, so the plate is a comparison and not two charts.
 *   · which weekday a record day lands on, as a multiple of how many of that weekday the
 *     window holds;
 *   · how much these same pages are read on each weekday in ordinary time, as a multiple of
 *     their own average week.
 * Both are "times expected", both are drawn against the same pivot at 1, and the scale is
 * written once and asserted below.
 *
 * A RECORD CORRECTION, MADE HERE. The findings record carried "ordinary reading on these
 * pages is flattest on Monday and highest on Tuesday (Tue 1.779, Mon 1.744, Fri 1.410)".
 * Those three numbers are reproducible — they are the mean of each reading divided by its
 * page's median over days -30 to -8 — and that estimator is not usable:
 *   · the window runs to day -8, and for 45 of these rows traffic is climbing into the event
 *     by then, so it measures the run-up, not the reading week;
 *   · it is not detrended, so a page rising through the window pushes up whichever weekdays
 *     sit late in it;
 *   · a mean of ratios against a median is above 1 by construction, which is why every one
 *     of its seven values was around 1.7 rather than around 1.
 * Recomputed on a window that cannot see the event and with the trend divided out, the
 * cycle is Sunday-high and Friday-low, and TUESDAY IS ORDINARY. So "the record-day cycle
 * runs against the reading cycle" is false and is struck from the record. What survives is
 * bigger: the two cycles are not the same shape and they are not the same size.
 *
 * THE ESTIMATOR. Each reading is divided by the median of the seven days centred on it, so
 * any smooth trend in that page's traffic divides out and only the day-of-week remains.
 * Pooled over days +180 to +345, far past the event. The seven means are then divided by
 * their own mean so the index is centred on 1. Stability is guarded, not assumed: the same
 * index over a second, wider window has to agree to within 0.01.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'weekday'

const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const E = ev.events

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length

const READ = [180, 345]      // settled, and it cannot see the event
const ALT = [100, 345]       // the second window the index has to agree with
const SPAN = 3               // the centred window the trend is divided out by: 2*SPAN+1 days

// ---- which weekday a record day lands on ----------------------------------
const count = new Array(7).fill(0)
for (const e of E) count[e.wd]++
const avail = new Array(7).fill(0)
{
  const s = new Date(census.meta.window.start + 'T00:00:00Z'), en = new Date(census.meta.window.end + 'T00:00:00Z')
  for (const d = new Date(s); d <= en; d.setUTCDate(d.getUTCDate() + 1)) avail[d.getUTCDay()]++
}
const totDays = avail.reduce((a, b) => a + b, 0)
const expect = avail.map((a) => (E.length * a) / totDays)
const chi2 = count.reduce((s, c, i) => s + (c - expect[i]) ** 2 / expect[i], 0)
// upper tail of a chi-square with an even df, in closed form
const chiP = (x, df) => { let s = 0, t = 1; for (let k = 0; k < df / 2; k++) { s += t; t *= x / 2 / (k + 1) } return Math.exp(-x / 2) * s }

// ---- how much these pages are read on each weekday, in ordinary time ------
function readingIndex([lo, hi]) {
  const pool = Array.from({ length: 7 }, () => [])
  const pages = new Set()
  for (const r of census.rows) {
    const pk = new Date(r.date + 'T00:00:00Z')
    for (let d = lo; d <= hi; d++) {
      const v = r.series[d]
      if (!(v > 0)) continue
      const w = []
      for (let k = d - SPAN; k <= d + SPAN; k++) { const u = r.series[k]; if (u > 0) w.push(u) }
      if (w.length < 2 * SPAN + 1) continue
      const m = med(w)
      if (!(m > 0)) continue
      const t = new Date(pk); t.setUTCDate(t.getUTCDate() + d)
      pool[t.getUTCDay()].push(v / m)
      pages.add(r.article)
    }
  }
  const raw = pool.map((a) => mean(a))
  const g = mean(raw)
  return { idx: raw.map((x) => +(x / g).toFixed(4)), n: pool.map((a) => a.length), pages: pages.size, pool }
}
const R = readingIndex(READ)
const R2 = readingIndex(ALT)

// A page-clustered bootstrap, because the readings inside one page are not independent.
// Deterministic, so the run draws the same field every time.
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
const perPage = []
for (const r of census.rows) {
  const own = Array.from({ length: 7 }, () => [])
  const pk = new Date(r.date + 'T00:00:00Z')
  let any = false
  for (let d = READ[0]; d <= READ[1]; d++) {
    const v = r.series[d]
    if (!(v > 0)) continue
    const w = []
    for (let k = d - SPAN; k <= d + SPAN; k++) { const u = r.series[k]; if (u > 0) w.push(u) }
    if (w.length < 2 * SPAN + 1) continue
    const m = med(w)
    if (!(m > 0)) continue
    const t = new Date(pk); t.setUTCDate(t.getUTCDate() + d)
    own[t.getUTCDay()].push(v / m); any = true
  }
  if (any) perPage.push(own)
}
const rand = rng(20260831)
const DRAWS = 2000
const swings = []
for (let b = 0; b < DRAWS; b++) {
  const acc = Array.from({ length: 7 }, () => [])
  for (let i = 0; i < perPage.length; i++) {
    const p = perPage[Math.floor(rand() * perPage.length)]
    for (let k = 0; k < 7; k++) if (p[k].length) acc[k].push(...p[k])
  }
  const raw = acc.map((a) => (a.length ? mean(a) : 1))
  const g = mean(raw)
  const idx = raw.map((x) => x / g)
  swings.push(Math.max(...idx) / Math.min(...idx))
}
swings.sort((a, b) => a - b)

const ratio = count.map((c, i) => +(c / expect[i]).toFixed(3))
const recSwing = +(Math.max(...ratio) / Math.min(...ratio)).toFixed(2)
const readSwing = +(Math.max(...R.idx) / Math.min(...R.idx)).toFixed(3)
const argmax = (a) => a.indexOf(Math.max(...a))
const argmin = (a) => a.indexOf(Math.min(...a))

const LO = 0.5, HI = 2
const stops = [LO, 0.75, 1, 1.35, HI]      // the pivot is the middle stop: "as expected"

const out = {
  meta: {
    source: ev.meta.source, window: census.meta.window,
    read: READ, alt: ALT, span: 2 * SPAN + 1, draws: DRAWS,
  },
  labels: WD, short: SHORT,
  record: { count, expect: expect.map((x) => +x.toFixed(1)), ratio, chi2: +chi2.toFixed(2), df: 6, p: +chiP(chi2, 6).toPrecision(3) },
  reading: {
    idx: R.idx, readings: R.n.reduce((a, b) => a + b, 0), pages: R.pages,
    alt: R2.idx, altReadings: R2.n.reduce((a, b) => a + b, 0),
    swingCI: [+swings[Math.floor(0.025 * DRAWS)].toFixed(3), +swings[Math.floor(0.975 * DRAWS)].toFixed(3)],
  },
  stat: {
    n: E.length,
    recordSwing: recSwing, readingSwing: readSwing,
    recordHigh: WD[argmax(ratio)], recordLow: WD[argmin(ratio)],
    readingHigh: WD[argmax(R.idx)], readingLow: WD[argmin(R.idx)],
    mondayRecord: ratio[1], mondayReading: R.idx[1],
    tuesdayRecord: ratio[2], tuesdayReading: R.idx[2],
  },
  scale: { lo: LO, hi: HI, pivot: 1, ticks: [0.5, 0.75, 1, 1.5, 2], labels: ['0.5×', '0.75×', '1×', '1.5×', '2×'] },
  stops,
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

// --- which weekday a record day lands on -----------------------------------
check('record days by weekday', out.record.count, [30, 52, 19, 31, 33, 29, 26])
check('and they add to the file', out.record.count.reduce((a, b) => a + b, 0), 220)
check('Monday record days', out.record.count[1], 52)
check('against how many Mondays the window holds', out.record.expect[1], 31.4)
check('Tuesday record days', out.record.count[2], 19)
check('the seven multiples', out.record.ratio, [0.955, 1.655, 0.605, 0.985, 1.049, 0.923, 0.828])
// and the two the record states to two places
check('Monday, as the record states it', +out.record.ratio[1].toFixed(2), 1.66)
check('Tuesday, as the record states it', +out.record.ratio[2].toFixed(2), 0.6)
check('chi-square', out.record.chi2, 19.66, 0.05)
check('df', out.record.df, 6)
check('p, about three in a thousand', out.record.p, 0.0032, 0.0004)
check('significant at p = .05 on 6 df', out.record.chi2 > 12.59, true)
check('Monday is the high day and Tuesday the low one',
  [out.stat.recordHigh, out.stat.recordLow], ['Monday', 'Tuesday'])

// --- how much these pages are read on each weekday -------------------------
check('the reading week', out.reading.idx, [1.0799, 1.0407, 0.9876, 0.9703, 0.9598, 0.9539, 1.0077])
check('readings behind it', out.reading.readings, 33914)
check('pages behind it', out.reading.pages, 211)
check('it is centred on one', +mean(out.reading.idx).toFixed(4), 1, 0.0002)
// STABILITY. A weekday index is only worth printing if it does not move with the window.
check('the same index over a wider window agrees to within 0.01',
  out.reading.idx.every((v, i) => Math.abs(v - out.reading.alt[i]) < 0.01), true)
check('Sunday is the high day and Friday the low one',
  [out.stat.readingHigh, out.stat.readingLow], ['Sunday', 'Friday'])

// --- THE RELATION THE SECTION RESTS ON -------------------------------------
// Two cycles, not one. They are different sizes and they peak and trough on different days.
check('the record-day week swings', out.stat.recordSwing, 2.74, 0.01)
check('the reading week swings', out.stat.readingSwing, 1.132, 0.002)
check('so the record-day week swings much harder', recSwing > 2 * readSwing, true)
// the bootstrap says the reading swing is real but small, so "barely moves" is not noise
check('the reading swing, resampling whole pages, 95%', out.reading.swingCI, [1.107, 1.161])
check('and that interval is nowhere near the record-day swing',
  out.reading.swingCI[1] < out.stat.recordSwing, true)
// the two weeks do NOT line up: this is what replaces the struck claim
check('the two weeks do not share a high day', out.stat.recordHigh !== out.stat.readingHigh, true)
check('nor a low day', out.stat.recordLow !== out.stat.readingLow, true)
// Monday is a slightly busy reading day, and nothing like busy enough to be the explanation
check('Monday: record days against ordinary reading',
  [out.stat.mondayRecord, out.stat.mondayReading], [1.655, 1.0407])
check('the Monday excess in record days is more than ten times the Monday excess in reading',
  (out.stat.mondayRecord - 1) / (out.stat.mondayReading - 1) > 10, true)
// Tuesday is the emptiest record day in the file and an entirely ordinary reading day
check('Tuesday: record days against ordinary reading',
  [out.stat.tuesdayRecord, out.stat.tuesdayReading], [0.605, 0.9876])
check('Tuesday reading is within 2% of an average day', Math.abs(out.stat.tuesdayReading - 1) < 0.02, true)

// --- one scale, and nothing drawn off it -----------------------------------
check('the pivot is the middle stop', out.stops[2], out.scale.pivot)
check('every record-day multiple is inside the axis',
  out.record.ratio.every((v) => v > LO && v < HI), true)
check('every reading index is inside the axis',
  out.reading.idx.every((v) => v > LO && v < HI), true)
check('and both series are drawn against the same pivot', out.scale.pivot, 1)
check('the axis names the pivot as one times expected', out.scale.labels[2], '1×')

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
