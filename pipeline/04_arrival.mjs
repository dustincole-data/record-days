/**
 * 04_arrival — the payload for F2, and every number that plate prints.
 *
 * Reads 01's payload only. One value per page on each side of one shared log axis of
 * pageviews: what the page got the day BEFORE its record day, and what it got ON it.
 *
 * THE RELATION THIS SECTION RESTS ON is not "the day before was small". It is that the two
 * sides have completely different SPREADS: every record day in the file lands inside a
 * single decade, and the day before those same pages were spread across nearly six. The
 * guards below assert both spans, because the picture is the contrast and a claim about a
 * contrast is false the moment either side moves.
 *
 * ONE row contradicts the frame and is not hidden: Antifa (United States) read MORE the day
 * before than on the day the census calls its record day. A record day is the largest day
 * the daily top-1000 ranking recorded for that page, and for this one page its own series
 * carries a larger day one day earlier. Counted, guarded, and said on the page.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'arrival'

const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const E = ev.events

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const nf = new Intl.NumberFormat('en-US')

// The axis. Its floor sits under the smallest reading in the file and its ceiling over the
// largest, so no mark is ever drawn outside the scale it is measured on.
const LO = 3, HI = 2e7

const before = E.map((e) => e.before)
const peaks = E.map((e) => e.peak)

// The ramp's stops are this plate's own landmarks: the smallest day-before reading, the
// quartiles and middle of the day-before spread, and the largest record day. The middle
// stop is the page's accent ink, so the rose rule on the plate and the rose in the axis
// strip are the same number by construction.
const stops = [Math.min(...before), q(before, 0.25), med(before), q(before, 0.75), Math.max(...peaks)]

const row = (a) => E.find((e) => e.a === a)
const cite = (a) => { const e = row(a); return { t: e.t, a: e.a, d: e.d, before: e.before, peak: e.peak } }

// Named on the plate. The one page nobody was reading, three more from the same tail, and
// the page at the other end that was already being read three and a half million times a day.
const POPE = cite('Pope_Leo_XIV')
const TAIL = ['Damar_Hamlin', 'Francis_Scott_Key_Bridge_(Baltimore)', 'Christina_Grimmie'].map(cite)
const BUSIEST = cite('Kamala_Harris')
const REVERSED = E.filter((e) => e.before > e.peak).map((e) => e.t)

const dec = (v) => Math.log10(v)
const out = {
  meta: { source: ev.meta.source, window: ev.meta.window },
  stat: {
    n: E.length,
    medianBefore: med(before),
    under1000: E.filter((e) => e.before < 1000).length,
    medianTimes: +med(E.map((e) => e.peak / e.before)).toFixed(1),
    minBefore: Math.min(...before), maxBefore: Math.max(...before),
    minPeak: Math.min(...peaks), maxPeak: Math.max(...peaks),
    beforeSpan: +(dec(Math.max(...before)) - dec(Math.min(...before))).toFixed(2),
    peakSpan: +(dec(Math.max(...peaks)) - dec(Math.min(...peaks))).toFixed(2),
    reversed: REVERSED.length,
    reversedName: REVERSED[0] ?? null,
  },
  scale: {
    lo: LO, hi: HI,
    ticks: [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7],
    labels: ['10', '100', '1K', '10K', '100K', '1M', '10M'],
    narrow: [10, 1e3, 1e5, 1e7],
  },
  stops,
  pope: { ...POPE, beforeText: nf.format(POPE.before) + ' views', peakText: nf.format(POPE.peak) + ' views' },
  tail: TAIL.map((r) => ({ ...r, text: nf.format(r.before) + ' views' })),
  busiest: { ...BUSIEST, text: nf.format(BUSIEST.before) + ' views' },
  rows: E.map((e) => ({ t: e.t, a: e.a, before: e.before, peak: e.peak })),
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

check('rows', out.stat.n, 220)
check('every page has a reading the day before', E.filter((e) => !(e.before > 0)).length, 0)

// the two figures the deck prints
check('half the pages were under 65,000 views the day before', out.stat.medianBefore, 64634.5)
check('and the page prints that as under 65,000', out.stat.medianBefore < 65000, true)
check('read under 1,000 the day before', out.stat.under1000, 10)

// the named marks, and the exact strings drawn beside them
check('Pope Leo XIV the day before', out.pope.before, 5)
check('Pope Leo XIV the day', out.pope.peak, 7538267)
check('Pope Leo XIV, as the plate prints it', [out.pope.beforeText, out.pope.peakText],
  ['5 views', '7,538,267 views'])
check('Pope Leo XIV record day', out.pope.d, '2025-05-08')
check('the smallest day-before reading in the file is his', out.stat.minBefore, 5)
check('Damar Hamlin', out.tail[0].before, 53)
check('Francis Scott Key Bridge', out.tail[1].before, 79)
check('Christina Grimmie', out.tail[2].before, 468)
check('every named tail page really is under 1,000', out.tail.every((r) => r.before < 1000), true)
check('the busiest day before is Kamala Harris', out.busiest.before, 3501236)
check('and it is the largest in the file', out.stat.maxBefore, out.busiest.before)

// the record-day band this plate draws, printed the way the standfirst prints it
check('smallest record day', out.stat.minPeak, 1444398)
check('largest record day', out.stat.maxPeak, 14954133)

// --- the RELATION the section rests on: two sides, two spreads -------------
// The picture is that one side is a slab and the other is a smear. Both spans are guarded,
// because "all of them land in one narrow band" is false the moment the band widens.
check('every record day lands inside a single decade', out.stat.peakSpan < 1.05, true)
check('the record-day span, in decades', out.stat.peakSpan, 1.02)
check('the day before is spread over more than five decades', out.stat.beforeSpan > 5, true)
check('the day-before span, in decades', out.stat.beforeSpan, 5.85)
check('the day before is spread at least five times wider than the day',
  out.stat.beforeSpan / out.stat.peakSpan > 5, true)
check('half the pages got at least 41 times more on the day', out.stat.medianTimes, 40.9)

// the one row that contradicts the frame, counted rather than dropped
check('pages that read more the day before than on the record day', out.stat.reversed, 1)
check('and which one', out.stat.reversedName, 'Antifa (United States)')

// nothing may be drawn outside the scale it is measured on
check('every mark sits inside the axis',
  E.filter((e) => e.before < LO || e.before > HI || e.peak < LO || e.peak > HI).length, 0)
check('the ramp stops rise', stops.every((s, i) => i === 0 || s > stops[i - 1]), true)
check('the ramp stops are the data, not a ramp',
  stops, [5, 3664, 64634.5, 453766, 14954133])
check('every axis tick has a label', out.scale.ticks.length, out.scale.labels.length)
check('the narrow ticks are a subset of the wide ones',
  out.scale.narrow.every((t) => out.scale.ticks.includes(t)), true)

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
