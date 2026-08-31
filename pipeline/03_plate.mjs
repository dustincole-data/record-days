/**
 * 03_plate — the payload the F1 plate draws, and every number it prints.
 *
 * Reads 01's payload for the per-row table and the committed census only for one thing 01
 * does not carry: how many days after its record day a row was actually WATCHED. That
 * distinction is the whole honesty of this section. 01 stops looking for a return at day
 * 340, so "never came back" is two different sentences:
 *
 *   - watched a full year and still above twice its own quiet level          -> a holdout
 *   - the file simply ends first, because the record day is recent           -> still running
 *
 * Collapsing those two would publish "these never came back" over three rows that were
 * watched for forty days. They are counted apart here and labelled apart on the page.
 *
 * The scan below runs to day 393, not 340, so a row that comes back LATE than 01 looks is
 * caught rather than silently filed as a holdout. Zero rows do; the check is kept because
 * the day 01 changes its horizon is the day that stops being true.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')

const PASS = 'plate'
const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const events = ev.events
// The quartiles come off 02's payload rather than being computed again here. Two quantile
// definitions in one repo is one definition too many: the first draft of this pass floored
// 0.75*(n-1) where 02 floors 0.75*n, and the two disagreed on p75 by a day. The guard below
// caught it, and the fix is to have a single definition rather than a matching pair.
const claims = JSON.parse(readFileSync(join(GEN, 'claims.json'), 'utf8'))
const OVER = ev.meta.over            // "still unusual" = over 2x its own quiet level
const HELD = ev.meta.held            // and it has to stay under for a week
const SCAN = 393                     // 400 readings, minus the 7-day window
const YEAR = 341                     // watched long enough to have shown a return by day 340

const byArticle = new Map(census.rows.map((r) => [r.article, r]))
const watched = (a) => {
  let m = 0
  for (const k of Object.keys(byArticle.get(a).series)) { const d = +k; if (d > m) m = d }
  return m
}
const returnDay = (a, base, limit) => {
  const s = byArticle.get(a).series
  for (let d = 1; d <= limit; d++) {
    let under = true, seen = 0
    for (let k = d; k < d + HELD; k++) {
      const v = s[k]
      if (v === undefined) continue
      seen++
      if (v > OVER * base) { under = false; break }
    }
    if (seen >= 5 && under) return d
  }
  return null
}
const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }

// --- one row per drawable page ----------------------------------------------
// A page with no quiet window in the thirty days before its record day has nothing to be
// measured against, so it is not on this plate at all. It is counted, and said out loud.
const noQuiet = events.filter((e) => e.base === null)

const rows = events
  .filter((e) => e.base !== null)
  .map((e) => {
    const w = watched(e.a)
    const kind = e.dur !== null ? 'back' : (w >= YEAR ? 'holdout' : 'running')
    return { t: e.t, a: e.a, d: e.d, peak: e.peak, dur: e.dur, w, kind }
  })
  .sort((a, b) => {
    const rank = { back: 0, holdout: 1, running: 2 }
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind]
    if (a.kind === 'back') return a.dur - b.dur
    return b.peak - a.peak
  })

const back = rows.filter((r) => r.kind === 'back')
const durs = back.map((r) => r.dur)
const holdout = rows.filter((r) => r.kind === 'holdout')
const running = rows.filter((r) => r.kind === 'running')

// The ramp's stops are the data's own landmarks, not five numbers picked to look nice: the
// shortest, the quartiles, the median and the longest. src/lib/ink.js maps them to ink.
const D = claims.duration
const stops = [D.min, D.p25, D.median, D.p75, D.max]

// Rows named on the plate. Both walls, and the biggest page in the band that never came back.
const NAMES = ['FIFA_World_Cup', 'WrestleMania_33', '88th_Academy_Awards', 'Tom_Brady',
  'Kamala_Harris', 'Jerry_Springer', 'Kelly_Preston', 'Christian_Eriksen',
  'Alexander_Hamilton', 'Chadwick_Boseman']

const out = {
  meta: {
    source: ev.meta.source,
    window: ev.meta.window,
    before: ev.meta.before, over: OVER, held: HELD, scan: SCAN, year: YEAR,
  },
  stat: {
    all: events.length,
    drawn: rows.length,
    back: back.length,
    median: D.median, p25: D.p25, p75: D.p75,
    min: D.min, max: D.max,
    underWeek: durs.filter((x) => x < 7).length,
    over100: durs.filter((x) => x > 100).length,
    holdout: holdout.length,
    running: running.length,
    noQuiet: noQuiet.length,
  },
  stops,
  axis: { max: 345, ticks: [0, 7, 30, 90, 180, 270, 340] },
  named: NAMES,
  rows: rows.map((r) => ({ t: r.t, a: r.a, d: r.d, peak: r.peak, dur: r.dur, kind: r.kind, w: r.w })),
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
const by = (a) => rows.find((r) => r.a === a)

console.log(PASS + ' checks against research/findings.md:')

// every number this plate prints
check('rows on the plate', rows.length, 214)
check('came back', back.length, 179)

// This pass takes the quartiles from 02 rather than computing them again. That is only safe
// while the two passes are looking at the same rows, so say so out loud.
check('02 and 03 are counting the same returns', D.n, back.length)
check('02 and 03 agree on the median', med(durs), D.median)
check('02 and 03 agree on the walls', [durs[0], durs[durs.length - 1]], [D.min, D.max])

check('median days', out.stat.median, 28)
check('shortest', out.stat.min, 1)
check('longest', out.stat.max, 340)
check('done inside a week', out.stat.underWeek, 16)
check('past 100 days', out.stat.over100, 27)
check('watched a full year and still not back', holdout.length, 32)
check('the file ends first', running.length, 3)
check('no quiet window to measure against', noQuiet.length, 6)

// every row the plate names
check('FIFA World Cup', by('FIFA_World_Cup').dur, 1)
check('WrestleMania 33', by('WrestleMania_33').dur, 2)
check('88th Academy Awards', by('88th_Academy_Awards').dur, 3)
check('Tom Brady', by('Tom_Brady').dur, 7)
check('Kamala Harris', by('Kamala_Harris').dur, 5)
check('Jerry Springer', by('Jerry_Springer').dur, 340)
check('Kelly Preston', by('Kelly_Preston').dur, 330)
check('Christian Eriksen', by('Christian_Eriksen').dur, 330)
check('Alexander Hamilton', by('Alexander_Hamilton').dur, 254)
check('Chadwick Boseman is in the band that never came back', by('Chadwick_Boseman').kind, 'holdout')
check('every named row is on the plate', NAMES.filter((a) => !by(a)), [])

// --- the RELATIONS the section rests on, at the strength the page states them ---

// "220 record days" has to still add up once three of them are set aside
check('the four groups account for all 220',
  back.length + holdout.length + running.length + noQuiet.length, events.length)

// "about a month" is the headline. It is false the moment the median leaves the month.
check('the median really is about a month', out.stat.median >= 21 && out.stat.median <= 35, true)

// the left wall is the picture: the scheduled block really does pile there
check('the shortest ten are all inside a fortnight', back.slice(0, 10).every((r) => r.dur < 14), true)
check('the shortest row is the World Cup final', back[0].a, 'FIFA_World_Cup')
check('the longest row is Jerry Springer', back[back.length - 1].a, 'Jerry_Springer')

// the band drawn past the right edge must genuinely be past it: every holdout was watched
// LONGER than the longest row that did come back, or the band is drawing a short series
check('every holdout was watched longer than the longest return',
  holdout.every((r) => r.w > out.stat.max), true)
check('every holdout was watched a full year', holdout.every((r) => r.w >= YEAR), true)
check('the three still running were watched less than a year', running.every((r) => r.w < YEAR), true)

// 01 stops looking at day 340. If a holdout comes back by day 393 it is not a holdout, and
// this check is what notices the day that changes.
const late = holdout.filter((r) => returnDay(r.a, events.find((e) => e.a === r.a).base, SCAN) !== null)
check('no holdout comes back before the file does', late.map((r) => r.a), [])

// the ramp is anchored on the data, so its stops have to be the data's own landmarks
check('ramp stops are the shortest, the quartiles, the median and the longest',
  stops, [1, 12, 28, 56, 340])

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
