/**
 * 12_agree — the payload for F11, and every number that plate prints.
 *
 * THE FILE IS 442 ROWS, NOT 220. The census ranked 442 articles by their own biggest day and
 * then ran a shape gate over them; 220 passed and 222 are parked in `meta.disqualified`,
 * which nothing on this site had ever opened. Restoring them is the whole section: the
 * largest coincidence in the record is entirely inside the 222.
 *
 * A CUT ROW CARRIES NO SERIES. `meta.disqualified` holds a peak, a date and the three gate
 * readings, and nothing over time. So no cut row may appear on any plate whose axis is days,
 * and this plate's axes are a ratio and a date. That is asserted below rather than trusted.
 *
 * TWO CLAIMS, TWO NULLS, BECAUSE THEY ARE DIFFERENT QUESTIONS.
 *
 *   HOW MANY. 49 dates carry more than one of the 442 and one of them carries 22. Dates are
 *   lumpy on their own, so this is tested against the same year-month-weekday null beat 07
 *   uses: each row keeps its year, its month and its weekday, and only WHICH matching day it
 *   landed on is redrawn.
 *
 *   HOW CLOSE. 22 pages sharing a date is a coincidence claim; 22 pages sharing a date AND
 *   agreeing to a hundredth is a process claim, and only the second one is interesting. Its
 *   null is 22 rows drawn from the same 442 at random — which is what "unrelated pages that
 *   happen to land together" means — measured by the same largest-over-smallest.
 *
 * AND ONE CONTROL THAT IS NOT A NULL AT ALL. The file's peaks crowd towards the bottom of the
 * ranking, so a reader can fairly ask whether any 22 rows down there would look tight. The
 * answer is measured directly: the tightest 22 peaks that can be assembled from ANYWHERE in
 * the 442 while excluding this date. That is the best the file can do without the finding,
 * and the finding beats it.
 *
 * THE RECORD SAID 1.14x AND 2.24x AND BOTH WERE WRONG. See the guard block.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'agree'
const DATE = '2017-05-22'
const DRAWS = 20000

const census = JSON.parse(readFileSync(join(ROOT, 'data', 'census', 'top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const r4 = (v) => +v.toFixed(4)
// The same xorshift every other pass on this site seeds, so a null redraws the same field
// every run and an interval is reproducible from the file rather than from a memory of it.
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }

// ---- the 442 -----------------------------------------------------------------
const titleOf = (a) => a.replace(/_/g, ' ')
const KEPT = census.rows.map((r) => ({ a: r.article, t: titleOf(r.article), peak: r.peak, d: r.date, cut: 0, falling: r.falling }))
const CUT = census.meta.disqualified.map((r) => ({ a: r.article, t: titleOf(r.article), peak: r.peak, d: r.date, cut: 1, falling: r.falling, why: r.why }))
const ALL = [...KEPT, ...CUT]

const byDate = new Map()
for (const r of ALL) { const g = byDate.get(r.d) ?? []; g.push(r); byDate.set(r.d, g) }

const groups = [...byDate.entries()]
  .filter(([, g]) => g.length > 1)
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  .map(([d, g]) => {
    const s = g.slice().sort((x, y) => y.peak - x.peak)
    const peaks = s.map((r) => r.peak)
    const m = med(peaks)
    return {
      d, n: s.length,
      lo: Math.min(...peaks), hi: Math.max(...peaks), mid: m,
      spread: r4(Math.max(...peaks) / Math.min(...peaks)),
      cut: s.filter((r) => r.cut).length,
      total: peaks.reduce((a, b) => a + b, 0),
      rows: s.map((r) => ({ t: r.t, peak: r.peak, cut: r.cut, r: r4(r.peak / m) })),
    }
  })

const THE = groups.find((g) => g.d === DATE)
const OTHERS = groups.filter((g) => g.d !== DATE)
const mean22 = THE.rows.reduce((a, b) => a + b.peak, 0) / THE.n
const sd22 = Math.sqrt(THE.rows.reduce((a, b) => a + (b.peak - mean22) ** 2, 0) / (THE.n - 1))

// ---- null one: the calendar ---------------------------------------------------
const dates = ALL.map((r) => r.d)
const sizesOf = (ds) => { const m = new Map(); for (const d of ds) m.set(d, (m.get(d) || 0) + 1); return [...m.values()].filter((v) => v > 1) }
const obsSizes = sizesOf(dates)
const obsRows = obsSizes.reduce((a, b) => a + b, 0)
const obsMax = Math.max(...obsSizes)
const slotsFor = (iso) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7), w = new Date(iso + 'T00:00:00Z').getUTCDay()
  const out = []
  for (let dd = 1; dd <= 31; dd++) {
    const t = new Date(Date.UTC(y, m - 1, dd))
    if (t.getUTCMonth() !== m - 1) break
    if (t.getUTCDay() === w) out.push(t.toISOString().slice(0, 10))
  }
  return out
}
const slots = dates.map(slotsFor)
const randA = rng(20260831)
let sumRows = 0, hitRows = 0, sumMax = 0, hitMax = 0, everMax = 0
for (let k = 0; k < DRAWS; k++) {
  const draw = slots.map((s) => s[Math.floor(randA() * s.length)])
  const sz = sizesOf(draw)
  const n = sz.reduce((a, b) => a + b, 0)
  const mx = sz.length ? Math.max(...sz) : 1
  sumRows += n; if (n >= obsRows) hitRows++
  sumMax += mx; if (mx >= obsMax) hitMax++
  if (mx > everMax) everMax = mx
}

// ---- null two: how close would 22 unrelated pages be? --------------------------
const randB = rng(20260831)
const peaksAll = ALL.map((r) => r.peak)
let tightHits = 0
const tightDraws = []
for (let k = 0; k < DRAWS; k++) {
  const used = new Set(), pick = []
  while (pick.length < THE.n) { const i = Math.floor(randB() * peaksAll.length); if (!used.has(i)) { used.add(i); pick.push(peaksAll[i]) } }
  const s = Math.max(...pick) / Math.min(...pick)
  tightDraws.push(s)
  if (s <= THE.spread) tightHits++
}
tightDraws.sort((a, b) => a - b)

// ---- the control that is not a null: the file's own best packing ---------------
const elsewhere = ALL.filter((r) => r.d !== DATE).map((r) => r.peak).sort((a, b) => a - b)
let packed = Infinity
for (let i = 0; i + THE.n - 1 < elsewhere.length; i++) {
  const s = elsewhere[i + THE.n - 1] / elsewhere[i]
  if (s < packed) packed = s
}

// ---- the second signature: the shape, not the size -----------------------------
// `falling` is day seven against day three, which the gate reads and this site never has.
// It is the one column in `meta.disqualified` that describes a shape rather than a size.
const FALL = 0.15
const fell = ALL.filter((r) => r.falling !== null && r.falling <= FALL)

// ---- the site's own 19 groups, for the comparison the page draws ----------------
const siteBy = new Map()
for (const e of ev.events) { const g = siteBy.get(e.d) ?? []; g.push(e); siteBy.set(e.d, g) }
const siteSpreads = [...siteBy.values()].filter((g) => g.length > 1)
  .map((g) => Math.max(...g.map((e) => e.peak)) / Math.min(...g.map((e) => e.peak)))

// ---- the value band the 22 occupy, and who else is in it -----------------------
const inBand = ALL.filter((r) => r.peak >= THE.lo && r.peak <= THE.hi)

// ---- the plate ------------------------------------------------------------------
// x is a ratio to the row's OWN median, so every row is centred on itself and the only
// thing left in the horizontal is how far its pages disagree. y is the date, unspaced:
// the calendar is beat 07's axis and is not reused here as a distance.
const RLO = 0.22, RHI = 9
const out = {
  meta: {
    source: census.meta.source, window: census.meta.window,
    ranked: ALL.length, kept: KEPT.length, cutRows: CUT.length,
    date: DATE, draws: DRAWS, fallAt: FALL,
  },
  stat: {
    groups: groups.length,
    inGroups: obsRows,
    biggest: obsMax,
    n: THE.n,
    lo: THE.lo, hi: THE.hi, total: THE.total,
    spread: THE.spread,
    spreadPct: +((THE.spread - 1) * 100).toFixed(2),
    cv: +((100 * sd22) / mean22).toFixed(2),
    allCut: THE.cut === THE.n,
    minSpread3: r4(Math.min(...OTHERS.filter((g) => g.n >= 3).map((g) => g.spread))),
    medSpreadOthers: r4(med(OTHERS.map((g) => g.spread))),
    medSpreadSite: r4(med(siteSpreads)),
    siteGroups: siteSpreads.length,
    packed: r4(packed),
    bandRows: inBand.length,
    bandHere: inBand.filter((r) => r.d === DATE).length,
    fellRows: fell.length,
    fellHere: fell.filter((r) => r.d === DATE).length,
    maxFalling: Math.max(...THE.rows.map((r) => ALL.find((x) => x.t === r.t).falling)),
    runnerUp: OTHERS.slice().sort((a, b) => a.spread - b.spread || b.n - a.n).find((g) => g.n >= 3).d,
  },
  calendar: {
    draws: DRAWS,
    expectRows: +(sumRows / DRAWS).toFixed(1), atLeastRows: hitRows, pRows: (hitRows + 1) / (DRAWS + 1),
    expectMax: +(sumMax / DRAWS).toFixed(2), atLeastMax: hitMax, pMax: (hitMax + 1) / (DRAWS + 1),
    everMax,
  },
  tight: {
    draws: DRAWS,
    median: r4(tightDraws[DRAWS >> 1]),
    best: r4(tightDraws[0]),
    atMost: tightHits, p: (tightHits + 1) / (DRAWS + 1),
  },
  scale: { lo: RLO, hi: RHI, ticks: [0.25, 0.5, 1, 2, 4, 8], labels: ['÷4', '÷2', 'same', '×2', '×4', '×8'], narrow: [0.25, 1, 4] },
  names: THE.rows.map((r) => r.t),
  groups: groups.map((g) => ({ d: g.d, n: g.n, cut: g.cut, spread: g.spread, rows: g.rows })),
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

// --- the file, restored -----------------------------------------------------
check('rows the census ranked', out.meta.ranked, 442)
check('the 220 the gate kept', out.meta.kept, 220)
check('and the 222 it threw out', out.meta.cutRows, 222)
check('and the two add up', out.meta.kept + out.meta.cutRows, out.meta.ranked)
check('the kept 220 are the site\'s own 220', out.meta.kept, ev.events.length)
// The rule that makes this section possible and also limits it.
check('no cut row carries a series',
  census.meta.disqualified.every((r) => r.series === undefined), true)
check('and none is drawn against time on this plate',
  out.groups.every((g) => g.rows.every((r) => Object.keys(r).join() === 't,peak,cut,r')), true)

// --- how many ----------------------------------------------------------------
check('dates carrying more than one of the 442', out.stat.groups, 49)
check('rows on those dates', out.stat.inGroups, 139)
check('the largest date carries', out.stat.biggest, 22)
check('and it is', out.meta.date, '2017-05-22')
check('the calendar null expects rows in a group', out.calendar.expectRows, 96.8, 0.15)
check('draws that reached 139', out.calendar.atLeastRows, 0)
check('p', out.calendar.pRows < 5.01e-5, true)
check('the calendar null expects a largest group of', out.calendar.expectMax, 6.95, 0.05)
check('the largest it ever drew in 20,000 tries', out.calendar.everMax, 13)
check('which is short of 22', out.calendar.everMax < out.stat.n, true)
check('p', out.calendar.pMax < 5.01e-5, true)

// --- how close ---------------------------------------------------------------
check('the smallest of the 22', out.stat.lo, 1054667)
check('the largest', out.stat.hi, 1066589)
check('largest over smallest', out.stat.spread, 1.0113, 0.0001)
check('which is a per cent', out.stat.spreadPct, 1.13, 0.01)
check('coefficient of variation, %', out.stat.cv, 0.26, 0.005)
check('views they drew between them', out.stat.total, 23300230)
check('every one of the 22 was thrown out by the gate', out.stat.allCut, true)
check('22 unrelated rows spread a median', out.tight.median, 6.7, 0.1)
check('the tightest of 20,000 draws', out.tight.best, 2.02, 0.01)
check('draws that reached 1.0113', out.tight.atMost, 0)
check('p', out.tight.p < 5.01e-5, true)

// --- THE RECORD SAID 1.14x AND 2.24x. BOTH FAIL HERE, AND THE RECORD IS WRONG. ---
// "Every other multi-page date in the 442 spreads at least 1.14x, median 2.24x."
// 1.14 is the minimum over groups of THREE OR MORE, not over every other date: three PAIRS
// are tighter than this group, at 1.0036, 1.0319 and 1.0688, and a pair agreeing is not a
// finding — with 33 pairs in the file some of them land close. The median over the other 48
// dates is 1.5549, not 2.24. Both numbers are corrected in the record; the claim they were
// quoted for survives, restated as the thing that is actually true: nothing with three or
// more pages comes near this, and neither does the tightest 22 the file can assemble.
check('the tightest other group of three or more', out.stat.minSpread3, 1.1410, 0.0001)
check('and it is', out.stat.runnerUp, '2022-05-25')
check('which is wider than the 22 are', out.stat.minSpread3 > out.stat.spread, true)
check('the median spread of the other 48 dates', out.stat.medSpreadOthers, 1.5549, 0.0001)
check('the 19 groups the site already draws spread a median', out.stat.medSpreadSite, 1.5918, 0.0001)
check('over this many groups', out.stat.siteGroups, 19)
check('the tightest 22 peaks the file can assemble from other dates', out.stat.packed, 1.0272, 0.0001)
check('and the 22 beat even that', out.stat.spread < out.stat.packed, true)
// The relation the page rests on, stated as a relation: this group is BOTH the largest and,
// among anything larger than a pair, the tightest. The day either half stops being true the
// sentence on the page stops being true, and this run stops.
check('the largest group is also the tightest of every group above a pair',
  out.stat.spread === Math.min(...out.groups.filter((g) => g.n >= 3).map((g) => g.spread)), true)
check('and no group of three or more is within a per cent of it',
  OTHERS.filter((g) => g.n >= 3 && g.spread < out.stat.spread * 1.01).length, 0)

// --- the second signature -----------------------------------------------------
check('rows in the whole 442 whose day seven is under 0.15 of day three', out.stat.fellRows, 43)
check('of which on this one date', out.stat.fellHere, 22)
check('so all 22 are in it', out.stat.fellHere, out.stat.n)
check('and it is half of every such row in the file', out.stat.fellHere * 2 > out.stat.fellRows, true)
check('the worst of the 22 on that reading', out.stat.maxFalling, 0.15, 0.001)

// --- the value band, and the honest limit of it --------------------------------
check('rows anywhere in the file inside the 22\'s own value band', out.stat.bandRows, 29)
check('of which are the 22', out.stat.bandHere, 22)
check('so the band is not merely crowded', out.stat.bandRows - out.stat.bandHere, 7)

// --- the second-tightest thing in the file, which the page names ----------------
const jwt = out.groups.find((g) => g.d === '2018-01-18')
check('the other date whose pages agree', jwt.n, 4)
check('its spread', jwt.spread, 1.5022, 0.0001)
check('and every one of those four was thrown out too', jwt.cut, 4)
check('they are', jwt.rows.map((r) => r.t), ['JSON Web Token', 'HTTP cookie', 'Access token', 'Session token'])

// --- the plate -----------------------------------------------------------------
check('rows on the plate', out.groups.length, 49)
check('marks on the plate', out.groups.reduce((a, g) => a + g.n, 0), out.stat.inGroups)
check('every mark is inside the axis',
  out.groups.every((g) => g.rows.every((r) => r.r >= RLO && r.r <= RHI)), true)
check('every axis tick has a label', [out.scale.ticks.length, out.scale.labels.length], [6, 6])
check('the narrow ticks are a subset of the wide ones',
  out.scale.narrow.every((t) => out.scale.ticks.includes(t)), true)
check('the 22 are named', out.names.length, 22)
check('and the first of them', out.names[0], 'Norway')
check('and the last', out.names[21], 'Serbian Despotate')

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
