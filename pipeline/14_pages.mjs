/**
 * 14_pages — one small daily series per page, for the reader who taps a dot.
 *
 * The timeline lets a reader pick any of the 220 pages and see that page's own stopwatch:
 * its views from a week before its record day to ninety days after, its normal level, and
 * the day it came back. This pass emits exactly that and nothing derived: raw daily views
 * out of the committed census, the normal level and return day out of 01's payload, and the
 * kind (back / holdout / running / unmeasured) out of 03's.
 *
 * Nothing here is a new claim, so the guards are about integrity rather than findings: the
 * row count, the series length, that day zero IS the record day for every page but the one
 * 01 already knows about, and that the level printed beside a curve is the level every other
 * section uses.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')

const PASS = 'pages'
const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const plate = JSON.parse(readFileSync(join(GEN, 'plate.json'), 'utf8'))

const FROM = -7, TO = 90
const byArticle = new Map(census.rows.map((r) => [r.article, r]))
const kindOf = new Map(plate.rows.map((r) => [r.a, r.kind]))

const rows = ev.events.map((e) => {
  const s = byArticle.get(e.a).series
  const v = []
  for (let d = FROM; d <= TO; d++) v.push(s[d] === undefined ? null : s[d])
  return {
    a: e.a, t: e.t, d: e.d, peak: e.peak, before: e.before,
    base: e.base, dur: e.dur, kind: kindOf.get(e.a) ?? null, v,
  }
})

const out = { meta: { source: ev.meta.source, window: ev.meta.window, days: [FROM, TO], before: ev.meta.before, over: ev.meta.over }, rows }

// ==================================================================== guards
const fails = []
const check = (name, got, want, tol = 0) => {
  const ok = typeof want === 'number' && typeof got === 'number'
    ? Math.abs(got - want) <= tol
    : JSON.stringify(got) === JSON.stringify(want)
  console.log((ok ? '  ok   ' : '  FAIL ') + name + ': ' + JSON.stringify(got) + (ok ? '' : '   (expected ' + JSON.stringify(want) + ')'))
  if (!ok) fails.push(name)
}
const by = (a) => rows.find((r) => r.a === a)

console.log(PASS + ' checks:')
check('rows', rows.length, 220)
check('every series runs -7 to 90', rows.every((r) => r.v.length === TO - FROM + 1), true)
// The record day comes from the daily top-1000 ranking and the series from the per-article
// endpoint. They agree on day zero for 219 pages; for Keir Starmer the series reads 537
// views under the ranking. The chart draws the series and the text prints the ranking.
check('day zero is the record day, bar one page where the two endpoints disagree',
  rows.filter((r) => r.v[-FROM] !== r.peak).map((r) => r.a), ['Keir_Starmer'])
check('and that disagreement is small', by('Keir_Starmer').peak - by('Keir_Starmer').v[-FROM], 537)
check('kinds', ['back', 'holdout', 'running', null].map((k) => rows.filter((r) => r.kind === k).length), [179, 32, 3, 6])
check('a page with a duration is a page that came back', rows.every((r) => (r.dur !== null) === (r.kind === 'back')), true)
check('a page with a normal level is a page the first chart draws', rows.every((r) => (r.base !== null) === (r.kind !== null)), true)
check('missing readings inside the window', rows.reduce((n, r) => n + r.v.filter((x) => x === null).length, 0), 138)
check('Charlie Kirk record day', by('Charlie_Kirk').peak, 14954133)
check('Charlie Kirk normal level', by('Charlie_Kirk').base, 12445)
check('Charlie Kirk return day', by('Charlie_Kirk').dur, 134)
check('Pope Leo XIV the day before', by('Pope_Leo_XIV').before, 5)
check('Kobe Bryant return day', by('Kobe_Bryant').dur, plate.rows.find((r) => r.a === 'Kobe_Bryant').dur)

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
