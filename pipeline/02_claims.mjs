/**
 * 02_claims — the aggregate numbers and the tests behind them.
 *
 * Reads 01's payload, so the page's totals and the page's rows cannot disagree: that is
 * itself a shared scale and it is guarded below. Emits ONE payload and asserts every
 * aggregate the site will print against research/findings.md.
 *
 * ESTIMATOR. Every split here compares rows to other rows in the SAME set, under the same
 * qualification gate, so the gate cancels. No number is compared across years: the census
 * carries no denominator that would make that safe, which is why F8 is killed here rather
 * than published.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'claims'

const src = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const E = src.events

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Mann-Whitney U, two-sided, normal approximation with a tie correction. Chosen over a t
// test because settle ratios span four orders of magnitude and are nowhere near normal.
function mannWhitney(a, b) {
  const all = a.map((v) => [v, 0]).concat(b.map((v) => [v, 1])).sort((x, y) => x[0] - y[0])
  const ranks = new Array(all.length)
  let i = 0, tie = 0
  while (i < all.length) {
    let j = i
    while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++
    const rk = (i + j + 2) / 2
    for (let k = i; k <= j; k++) ranks[k] = rk
    const t = j - i + 1; tie += t ** 3 - t; i = j + 1
  }
  let R1 = 0
  for (let k = 0; k < all.length; k++) if (all[k][1] === 0) R1 += ranks[k]
  const n1 = a.length, n2 = b.length
  const U = R1 - (n1 * (n1 + 1)) / 2
  const sd = Math.sqrt(((n1 * n2) / 12) * (n1 + n2 + 1 - tie / ((n1 + n2) * (n1 + n2 - 1))))
  const z = (U - (n1 * n2) / 2) / sd
  return { z: +z.toFixed(3), p: 2 * (1 - normCdf(Math.abs(z))), n1, n2 }
}
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2))
function erf(x) {
  const t = 1 / (1 + 0.3275911 * x)
  return 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
}
// A deterministic generator, so the null model draws the same field every run.
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }

const out = {}

// ==================================================== F1 how long the world looks
const durs = E.filter((e) => e.dur !== null).map((e) => e.dur).sort((a, b) => a - b)
const named = (n, dir) => E.filter((e) => e.dur !== null).sort((a, b) => dir * (a.dur - b.dur)).slice(0, n).map((e) => ({ t: e.t, d: e.d, dur: e.dur, peak: e.peak }))
out.duration = {
  n: durs.length, median: med(durs), min: durs[0], max: durs[durs.length - 1],
  p25: durs[Math.floor(0.25 * durs.length)], p75: durs[Math.floor(0.75 * durs.length)],
  underWeek: durs.filter((x) => x < 7).length, over100: durs.filter((x) => x > 100).length,
  shortest: named(10, 1), longest: named(10, -1),
}

// ==================================================== F2 the arrival
const arrivals = E.filter((e) => e.before > 0).sort((a, b) => a.before - b.before)
out.arrival = {
  under1000: arrivals.filter((e) => e.before < 1000).length,
  medianWarnPct: +(100 * med(E.filter((e) => e.warn !== null).map((e) => e.warn))).toFixed(1),
  smallest: arrivals.slice(0, 12).map((e) => ({ t: e.t, d: e.d, before: e.before, peak: e.peak })),
}

// ==================================================== F3 where they end up
const S = E.filter((e) => e.settle !== null)
out.settle = {
  n: S.length,
  above: S.filter((e) => e.settle > 1).length,
  abovePct: +((100 * S.filter((e) => e.settle > 1).length) / S.length).toFixed(1),
  above2: S.filter((e) => e.settle > 2).length,
  above5: S.filter((e) => e.settle > 5).length,
  risers: S.slice().sort((a, b) => b.settle - a.settle).slice(0, 10).map((e) => ({ t: e.t, base: e.base, after: e.after, x: e.settle })),
  fallers: S.slice().sort((a, b) => a.settle - b.settle).slice(0, 10).map((e) => ({ t: e.t, base: e.base, after: e.after, x: e.settle })),
}

// ==================================================== F4 the payoff
const amb = S.filter((e) => e.warn !== null && e.warn < 0.02).map((e) => e.settle)
const war = S.filter((e) => e.warn !== null && e.warn > 0.25).map((e) => e.settle)
const t4 = mannWhitney(amb, war)
const durAmb = E.filter((e) => e.dur !== null && e.climbing === false).map((e) => e.dur)
const durWar = E.filter((e) => e.dur !== null && e.climbing === true).map((e) => e.dur)
out.warning = {
  cut: [0.02, 0.25],
  ambush: { n: amb.length, median: +med(amb).toFixed(2), abovePct: +((100 * amb.filter((x) => x > 1).length) / amb.length).toFixed(0) },
  warned: { n: war.length, median: +med(war).toFixed(2), abovePct: +((100 * war.filter((x) => x > 1).length) / war.length).toFixed(0) },
  test: { z: t4.z, p: t4.p },
  duration: { calm: { n: durAmb.length, median: med(durAmb) }, climbing: { n: durWar.length, median: med(durWar) } },
}

// ==================================================== F5 the artefact
const sub = E.filter((e) => Number.isFinite(e.lift) && e.lift < 1)
out.artefact = {
  climbing: E.filter((e) => e.climbing === true).length,
  belowOwnLevel: sub.length,
  noCleanWindow: sub.filter((e) => e.climbing !== true).length,
  worldCupFar: E.find((e) => e.a === 'FIFA_World_Cup').base,
  worldCupNear: census.rows.find((r) => r.article === 'FIFA_World_Cup').base,
  rows: sub.sort((a, b) => a.lift - b.lift).map((e) => ({ t: e.t, lift: e.lift, base: e.base, clean: e.climbing !== true })),
}

// ==================================================== F6 the weekday cycle
const count = new Array(7).fill(0)
for (const e of E) count[e.wd]++
const avail = new Array(7).fill(0)
{
  const s = new Date(census.meta.window.start + 'T00:00:00Z'), en = new Date(census.meta.window.end + 'T00:00:00Z')
  for (const d = new Date(s); d <= en; d.setUTCDate(d.getUTCDate() + 1)) avail[d.getUTCDay()]++
}
const totDays = avail.reduce((a, b) => a + b, 0)
let chi = 0
const expect = avail.map((a) => (E.length * a) / totDays)
for (let i = 0; i < 7; i++) chi += (count[i] - expect[i]) ** 2 / expect[i]
out.weekday = {
  labels: WD, count, expect: expect.map((x) => +x.toFixed(1)),
  ratio: count.map((c, i) => +(c / expect[i]).toFixed(2)),
  chi2: +chi.toFixed(2), df: 6,
}

// ==================================================== F7 the shared dates, with a null
// The count on its own is not a claim. The null keeps each row's year, month and weekday
// and redraws only WHICH day of that month-and-weekday it landed on, so the calendar's own
// lumpiness is held fixed and only the coincidence is tested.
const dates = E.map((e) => e.d)
const groupsOf = (ds) => { const m = new Map(); for (const d of ds) m.set(d, (m.get(d) || 0) + 1); return [...m.values()].filter((v) => v > 1) }
const observed = groupsOf(dates)
const inCast = observed.reduce((a, b) => a + b, 0)
const rand = rng(20260830)
const slotsFor = (iso) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7), w = new Date(iso + 'T00:00:00Z').getUTCDay()
  const days = []
  for (let dd = 1; dd <= 31; dd++) {
    const t = new Date(Date.UTC(y, m - 1, dd))
    if (t.getUTCMonth() !== m - 1) break
    if (t.getUTCDay() === w) days.push(t.toISOString().slice(0, 10))
  }
  return days
}
const slots = dates.map(slotsFor)
const DRAWS = 20000
let hits = 0, sum = 0
for (let k = 0; k < DRAWS; k++) {
  const draw = slots.map((s) => s[Math.floor(rand() * s.length)])
  const n = groupsOf(draw).reduce((a, b) => a + b, 0)
  sum += n
  if (n >= inCast) hits++
}
out.shared = {
  rows: inCast, groups: observed.length,
  sizes: observed.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {}),
  null: { draws: DRAWS, expected: +(sum / DRAWS).toFixed(1), atLeastObserved: hits, p: (hits + 1) / (DRAWS + 1) },
}

// ==================================================== guards
const fails = []
const check = (name, got, want, tol = 0) => {
  const ok = typeof want === 'number' && typeof got === 'number' ? Math.abs(got - want) <= tol : JSON.stringify(got) === JSON.stringify(want)
  console.log((ok ? '  ok   ' : '  FAIL ') + name + ': ' + JSON.stringify(got) + (ok ? '' : '   (expected ' + JSON.stringify(want) + ')'))
  if (!ok) fails.push(name)
}
console.log(PASS + ' checks against research/findings.md:')

check('F1 median days', out.duration.median, 28)
check('F1 range', [out.duration.min, out.duration.max], [1, 340])
check('F1 the median really is about a month', out.duration.median >= 25 && out.duration.median <= 35, true)
check('F2 read under 1,000 the day before', out.arrival.under1000, 10)
check('F2 median warning, %', out.arrival.medianWarnPct, 2.4)
check('F3 share settling higher, %', out.settle.abovePct, 43.9)
check('F4 ambush median settle', out.warning.ambush.median, 1.30, 0.02)
check('F4 warned median settle', out.warning.warned.median, 0.55, 0.02)
check('F4 z', out.warning.test.z, 3.587, 0.01)
check('F4 p under 1e-3', out.warning.test.p < 1e-3, true)
// the RELATION: the sentence says the two groups point OPPOSITE ways, not merely differ
check('F4 ambush ends above 1 and warned below', out.warning.ambush.median > 1 && out.warning.warned.median < 1, true)
check('F4 calm hold the world longer than climbing',
  out.warning.duration.calm.median > out.warning.duration.climbing.median, true)
check('F5 no clean window at all', out.artefact.noCleanWindow, 6)
check('F5 the World Cup reads higher further out', out.artefact.worldCupFar > out.artefact.worldCupNear, true)
check('F6 Monday', out.weekday.count[1], 52)
check('F6 Tuesday', out.weekday.count[2], 19)
check('F6 chi-square', out.weekday.chi2, 19.66, 0.05)
check('F6 significant at p=.05, df 6', out.weekday.chi2 > 12.59, true)
check('F7 rows sharing a date', out.shared.rows, 47)
check('F7 groups', out.shared.groups, 19)
// F7 was ranked "medium, needs a null". This is the null; the ruling goes in the record.
console.log('  ..   F7 null: expected ' + out.shared.null.expected + ' rows in a group, observed ' + inCast +
  ', p = ' + out.shared.null.p.toExponential(2) + ' over ' + DRAWS.toLocaleString('en-US') + ' draws')
check('F7 the coincidence beats the calendar', out.shared.null.p < 0.01, true)
check('F7 the null expects far fewer', out.shared.null.expected, 25.4, 0.05)
check('F7 group sizes', out.shared.sizes, { 2: 12, 3: 5, 4: 2 })

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
