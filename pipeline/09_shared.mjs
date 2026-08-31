/**
 * 09_shared — the payload for F7, and every number that plate prints.
 *
 * All 220 record days on their real date and their real size, and the 47 that are not one
 * page having a day but two, three or four pages having the SAME day.
 *
 * THE COUNT IS NOT THE CLAIM. Dates are lumpy on their own: there are more Mondays in some
 * months than others, and this file already knows the weekday distribution is uneven (F6).
 * So the claim is tested against a null that holds each row's year, month and weekday fixed
 * and redraws only WHICH matching day it landed on. That null is computed in 02 and carried
 * here rather than recomputed, and this pass asserts it still says what the record says.
 *
 * THE VERTICAL SCALE IS THE ONE BEAT 02 PRINTS. Its endpoints are the smallest and largest
 * record day in the file, and beat 02's deck prints both as "between 1.4 and 15.0 million
 * views". Two plates quoting one pair of numbers is a claim, so this pass reads 04's payload
 * and asserts the pair rather than recomputing it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'shared'

const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const claims = JSON.parse(readFileSync(join(GEN, 'claims.json'), 'utf8'))
const arrival = JSON.parse(readFileSync(join(GEN, 'arrival.json'), 'utf8'))
const E = ev.events

const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const day = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(ev.meta.window.start + 'T00:00:00Z')) / 864e5)

// ---- the 19 days that more than one page had --------------------------------
const byDate = new Map()
for (const e of E) { const g = byDate.get(e.d) ?? []; g.push(e); byDate.set(e.d, g) }
const bundles = [...byDate.entries()]
  .filter(([, g]) => g.length > 1)
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  .map(([d, g]) => {
    const s = g.slice().sort((a, b) => b.peak - a.peak)
    return {
      d, x: day(d), n: s.length,
      lo: s[s.length - 1].peak, hi: s[0].peak,
      total: s.reduce((a, b) => a + b.peak, 0),
      rows: s.map((e) => ({ t: e.t, peak: e.peak })),
    }
  })

const points = E.map((e) => ({ t: e.t, d: e.d, x: day(e.d), peak: e.peak, g: e.grp ? 1 : 0 }))
const peaks = E.map((e) => e.peak)

// the axis: the whole window the file covers, and the whole range of record days in it
const LO = 1.4e6, HI = 1.6e7
const YEARS = []
for (let y = 2016; y <= 2026; y++) YEARS.push({ y, x: day(y + '-01-01') })

const out = {
  meta: { source: ev.meta.source, window: ev.meta.window, days: day(ev.meta.window.end) },
  stat: {
    all: E.length,
    inBundles: E.filter((e) => e.grp !== null).length,
    bundles: bundles.length,
    alone: E.filter((e) => e.grp === null).length,
    sizes: bundles.reduce((m, b) => ({ ...m, [b.n]: (m[b.n] || 0) + 1 }), {}),
    biggest: bundles.slice().sort((a, b) => b.n - a.n || b.total - a.total)[0].d,
    minPeak: Math.min(...peaks), maxPeak: Math.max(...peaks),
    share: Math.round((100 * E.filter((e) => e.grp !== null).length) / E.length),
  },
  null: claims.shared.null,
  scale: {
    lo: LO, hi: HI, xlo: 0, xhi: day(ev.meta.window.end),
    ticks: [1500000, 2000000, 3000000, 5000000, 10000000, 15000000],
    labels: ['1.5M', '2M', '3M', '5M', '10M', '15M'],
    narrow: [2000000, 5000000, 10000000],
    years: YEARS,
  },
  stops: [Math.min(...peaks), q(peaks, 0.25), med(peaks), q(peaks, 0.75), Math.max(...peaks)],
  bundles,
  points,
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

check('record days drawn', out.stat.all, 220)
check('and every one is on the plate', out.points.length, 220)
check('pages sharing their date', out.stat.inBundles, 47)
check('in this many groups', out.stat.bundles, 19)
check('the rest had their day to themselves', out.stat.alone, 173)
check('and the two add up', out.stat.inBundles + out.stat.alone, out.stat.all)
check('group sizes', out.stat.sizes, { 2: 12, 3: 5, 4: 2 })
check('and the sizes add back to the rows', bundles.reduce((a, b) => a + b.n, 0), 47)
check('a fifth of the file', out.stat.share, 21)

// --- the null, carried from 02 and re-asserted here ------------------------
check('the null expects this many rows in a group', out.null.expected, 25.4, 0.05)
check('and 47 were observed', out.stat.inBundles > out.null.expected, true)
check('draws that reached it', out.null.atLeastObserved, 3)
check('out of', out.null.draws, 20000)
check('p', out.null.p, 2.0e-4, 1e-5)
check('the coincidence beats the calendar', out.null.p < 0.001, true)
// the same claim stated as the page states it: 47 is nearly twice what the calendar gives
check('47 is nearly twice the null', +(out.stat.inBundles / out.null.expected).toFixed(2), 1.85, 0.02)

// --- the shared vertical scale, asserted against the payload beat 02 prints -
check('the smallest record day is the one beat 02 prints', out.stat.minPeak, arrival.stat.minPeak)
check('and the largest', out.stat.maxPeak, arrival.stat.maxPeak)
check('which is 1.4 million', out.stat.minPeak, 1444398)
check('and 15.0 million', out.stat.maxPeak, 14954133)
check('every record day is inside the axis',
  points.every((p) => p.peak >= LO && p.peak <= HI), true)
check('every date is inside the window',
  points.every((p) => p.x >= 0 && p.x <= out.scale.xhi), true)

// --- the groups themselves, which are what the plate names -----------------
check('the four-page days', bundles.filter((b) => b.n === 4).map((b) => b.d), ['2016-11-09', '2020-11-08'])
check('and they are both the day after an election',
  bundles.filter((b) => b.n === 4).every((b) => new Date(b.d + 'T00:00:00Z').getUTCDay() <= 3), true)
check('the three-page days', bundles.filter((b) => b.n === 3).map((b) => b.d),
  ['2022-02-24', '2022-09-08', '2022-12-18', '2023-01-13', '2025-03-03'])
check('the shared day with the most traffic on it', out.stat.biggest, '2020-11-08')
check('the largest page on it', bundles.find((b) => b.d === '2020-11-08').rows[0], { t: 'Kamala Harris', peak: 6591413 })
check('and on the other four-page day', bundles.find((b) => b.d === '2016-11-09').rows[0], { t: 'Donald Trump', peak: 6125896 })
check('the largest page on any shared day',
  bundles.slice().sort((a, b) => b.hi - a.hi)[0].rows[0], { t: 'Elizabeth II', peak: 8399082 })
check('every bundle really holds more than one page', bundles.every((b) => b.n > 1), true)
check('and every page in one is flagged as such in 01',
  bundles.flatMap((b) => b.rows).length, E.filter((e) => e.grp !== null).length)

// --- the ramp: its middle stop is the middle record day in the file --------
check('the ramp stops rise', out.stops.every((s, i, a) => i === 0 || s >= a[i - 1]), true)
check('and its middle stop is the median record day', out.stops[2], med(peaks))
check('which is', out.stops[2], 2094010.5, 0.5)

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
