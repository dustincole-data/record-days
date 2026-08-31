/**
 * 01_events — the per-row table every section on the site draws from.
 *
 * Reads the committed census only, emits ONE payload, and asserts at the bottom every
 * number the page will print, against research/findings.md. `npm run data` runs every pass
 * in order; a drift fails the run.
 *
 * ESTIMATOR. Every quantity here is a page measured against ITSELF: its own quiet level
 * before the event. That is the matched-peer form the contract asks for, and it is the only
 * safe one available, because a raw pageview count cannot be compared across years — the
 * platform's own traffic moved over the window and this extract carries no denominator to
 * remove it. That is also why F8, "the record is drifting upward", is killed rather than
 * published: see the kill list in research/findings.md.
 *
 * ONE definition of "before", for the whole site: the median of days -30 to -22. Days -21
 * to -8 are NOT used, though the census file offers them as `base`, because for 45 rows
 * that window is already climbing into the event and for ten of them it sits so far inside
 * it that the record day reads below its own baseline (F5). A single clean window is worth
 * more than a window that is closer to the event.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
mkdirSync(GEN, { recursive: true })

const PASS = 'events'
const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const renamed = JSON.parse(readFileSync(join(ROOT, 'data/census/renamed.json'), 'utf8'))
const rows = census.rows

// --- the shared definitions -------------------------------------------------
export const BEFORE_FROM = -30, BEFORE_TO = -22   // the clean pre-event window
export const AFTER_FROM = 300, AFTER_TO = 340     // "a year later"
export const OVER = 2                             // "still unusual" = over 2x its own level
export const HELD = 7                             // and it has to stay under for a week
export const FLOOR = 20                           // a level under 20/day is no level at all
export const CLIMB = 1.5                          // -21..-8 over -30..-22, the F5 test

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const win = (r, lo, hi) => { const v = []; for (let d = lo; d <= hi; d++) if (r.series[d] > 0) v.push(r.series[d]); return v }
const wd = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay()

// Days from the peak until the page is back under OVER x its own level and stays there for
// HELD days. A run of missing readings is not evidence of being back, so a window needs at
// least 5 real readings to count.
function duration(r, base) {
  for (let d = 1; d <= AFTER_TO; d++) {
    let under = true, seen = 0
    for (let k = d; k < d + HELD; k++) {
      const v = r.series[k]
      if (v === undefined) continue
      seen++
      if (v > OVER * base) { under = false; break }
    }
    if (seen >= 5 && under) return d
  }
  return null
}

// --- one row per record day -------------------------------------------------
const groups = new Map()
for (const r of rows) { const g = groups.get(r.date) ?? []; g.push(r.article); groups.set(r.date, g) }
const shared = [...groups.entries()].filter(([, g]) => g.length > 1).map(([d]) => d)

const events = rows.map((r) => {
  const bw = win(r, BEFORE_FROM, BEFORE_TO)
  const base = bw.length >= 5 ? med(bw) : null
  const usable = base !== null && base >= FLOOR
  const aw = win(r, AFTER_FROM, AFTER_TO)
  const near = win(r, -21, -8)
  const nearMed = near.length >= 6 ? med(near) : null
  return {
    a: r.article,
    t: r.article.replace(/_/g, ' '),
    d: r.date,
    wd: wd(r.date),
    peak: r.peak,
    // the day before, and it as a share of the day itself
    before: r.series[-1] ?? null,
    warn: r.series[-1] > 0 ? +(r.series[-1] / r.peak).toFixed(6) : null,
    base: usable ? +base.toFixed(1) : null,
    dur: usable ? duration(r, base) : null,
    settle: usable && aw.length >= 20 ? +(med(aw) / base).toFixed(4) : null,
    after: usable && aw.length >= 20 ? Math.round(med(aw)) : null,
    // was the near window already climbing into the event? (F5)
    climbing: usable && nearMed !== null ? nearMed / base > CLIMB : null,
    lift: r.lift,
    renamed: Object.prototype.hasOwnProperty.call(renamed, r.article),
    grp: shared.includes(r.date) ? r.date : null,
  }
})

const out = {
  meta: {
    source: 'Wikimedia REST pageviews, en.wikipedia, all-access, USER agents only',
    window: census.meta.window,
    rows: events.length,
    before: [BEFORE_FROM, BEFORE_TO], after: [AFTER_FROM, AFTER_TO],
    over: OVER, held: HELD, floor: FLOOR, climb: CLIMB,
  },
  events,
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
const by = (a) => events.find((e) => e.a === a)
const some = (f) => events.filter(f)

console.log(PASS + ' checks against research/findings.md:')

check('rows', events.length, 220)

// F1 — the world looks for about a month
const durs = some((e) => e.dur !== null).map((e) => e.dur).sort((a, b) => a - b)
check('F1 rows with a duration', durs.length, 179)
check('F1 median days', med(durs), 28)
check('F1 shortest', durs[0], 1)
check('F1 longest', durs[durs.length - 1], 340)
check('F1 done inside a week', durs.filter((x) => x < 7).length, 16)
check('F1 past 100 days', durs.filter((x) => x > 100).length, 27)
check('F1 FIFA World Cup', by('FIFA_World_Cup').dur, 1)
check('F1 Jerry Springer', by('Jerry_Springer').dur, 340)
check('F1 88th Academy Awards', by('88th_Academy_Awards').dur, 3)
check('F1 Tom Brady', by('Tom_Brady').dur, 7)
// the RELATION the sentence rests on: the scheduled block really is at the left wall
check('F1 the shortest ten are all under a fortnight',
  some((e) => e.dur !== null).sort((a, b) => a.dur - b.dur).slice(0, 10).every((e) => e.dur < 14), true)

// F2 — five readers to seven and a half million
check('F2 Pope Leo XIV the day before', by('Pope_Leo_XIV').before, 5)
check('F2 Pope Leo XIV the day', by('Pope_Leo_XIV').peak, 7538267)
check('F2 read under 1,000 the day before', some((e) => e.before > 0 && e.before < 1000).length, 10)
check('F2 Damar Hamlin', by('Damar_Hamlin').before, 53)
check('F2 the smallest day-before of the 220 is the Pope',
  some((e) => e.before > 0).sort((a, b) => a.before - b.before)[0].a, 'Pope_Leo_XIV')

// F3 — half never go back down. ONE before-window for the whole site, so these numbers are
// re-derived on -30..-22 and the record was corrected to match.
const settles = some((e) => e.settle !== null)
check('F3 rows with a settle ratio', settles.length, 196)
check('F3 settling above their old level', settles.filter((e) => e.settle > 1).length, 86)
check('F3 share above, %', +(100 * settles.filter((e) => e.settle > 1).length / settles.length).toFixed(1), 43.9)
check('F3 above 2x', settles.filter((e) => e.settle > 2).length, 46)
check('F3 above 5x', settles.filter((e) => e.settle > 5).length, 14)
check('F3 Tasuku Honjo', +by('Tasuku_Honjo').settle.toFixed(1), 507.9)
check('F3 Imane Khelif', +by('Imane_Khelif').settle.toFixed(1), 189.4)
check('F3 the biggest riser is Honjo', settles.slice().sort((a, b) => b.settle - a.settle)[0].a, 'Tasuku_Honjo')
check('F3 the biggest faller is J. D. Vance', settles.slice().sort((a, b) => a.settle - b.settle)[0].a, 'J._D._Vance')
// the relation the sentence rests on: "almost half" has to stay a near-half
check('F3 almost half, between 40 and 50 per cent',
  (() => { const p = 100 * settles.filter((e) => e.settle > 1).length / settles.length; return p > 40 && p < 50 })(), true)

// F5 — the before-window sitting inside the event
check('F5 already climbing before day -21', some((e) => e.climbing === true).length, 45)
check('F5 record day below its own recent level', some((e) => Number.isFinite(e.lift) && e.lift < 1).length, 10)
// The claim "all ten were already climbing" was FALSE, and chasing it produced the real
// finding: for six of them the FAR window is inside the event too, so there is no clean
// before anywhere in the thirty days the file carries.
const sub = some((e) => Number.isFinite(e.lift) && e.lift < 1)
check('F5 of the ten, how many have no clean window at all', sub.filter((e) => e.climbing !== true).length, 6)
check('F5 the World Cup reads HIGHER further from the final',
  by('FIFA_World_Cup').base > 397613, true)
check('F5 the World Cup far-window level', by('FIFA_World_Cup').base, 552584)

// F6 / F7 — the row-level inputs the aggregate pass tests
check('F6 Monday record days', some((e) => e.wd === 1).length, 52)
check('F6 Tuesday record days', some((e) => e.wd === 2).length, 19)
check('F7 rows sharing their date', some((e) => e.grp !== null).length, 47)
check('F7 groups', shared.length, 19)

// a NaN survives JSON.stringify as null and turns up much later as a blank mark
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
