/**
 * 13_stop — the payload for F12, and every number that plate prints.
 *
 * Four of the 220 do not decay. They hold a flat top for days or weeks at a level hundreds of
 * times their own normal reading, and then, between one day and the next, they are back at
 * nothing. Readership does not do that. Something switched off.
 *
 * TWO TESTS THAT DO NOT KNOW ABOUT EACH OTHER, AND THE PAGES THEY NAME.
 *
 *   THE SNAP. Take the last day a page was still being read at event scale — above 20 times
 *   its own normal level AND at least 10,000 views — against the day after it. For a real
 *   audience that ratio is small, because attention is still coming down: over 207 rows the
 *   middle value is 1.78. Three rows are at 817.9, 204.4 and 81.8, and the fourth-largest in
 *   the file is 11.5.
 *
 *   THE DROPOUT. A single day at least ten times below BOTH its neighbours, where both
 *   neighbours are above 5,000 views. A page cannot lose and regain an audience overnight.
 *   Three rows have such days and nobody else in the file does.
 *
 * Between them the two tests name FOUR pages and agree on two. That is the finding, and it is
 * not the finding the record described — see the guard block, which corrects five numbers.
 *
 * THE CAUSE IS NOT IDENTIFIABLE FROM THIS EXTRACT and no copy on the page names one. A crawl,
 * a redirect and a mirror all draw the same rectangle here.
 *
 * THE INK IS BEAT 01's INK. Up this plate is a multiple of a page's own normal level, but a
 * trace's COLOUR is that page's own return time, which is the quantity beat 01's ramp already
 * means. So the stops are read out of `plate.json` rather than restated, and a page that never
 * returned takes the top stop, which is the rule beat 01 already publishes. That is the site's
 * fourth shared scale and, like the other three, it is a claim and is guarded.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'stop'

const census = JSON.parse(readFileSync(join(ROOT, 'data', 'census', 'top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const plate = JSON.parse(readFileSync(join(GEN, 'plate.json'), 'utf8'))
const settle = JSON.parse(readFileSync(join(GEN, 'settle.json'), 'utf8'))

const SCALE = 20        // "event scale" is 20x the page's own normal level ...
const FLOOR = 10000     // ... and at least this many views, so a tiny base cannot fake it
const DEEP = 10         // a dropout day is this many times below both neighbours ...
const NEIGH = 5000      // ... where both neighbours are at least this big
const DAYS = 60         // the plate's horizontal reach

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }
const sig = (v, n = 3) => +v.toPrecision(n)
const E = new Map(ev.events.map((e) => [e.a, e]))
const D = new Map(plate.rows.map((r) => [r.a, r]))

// ---- the snap -----------------------------------------------------------------
// Two rows are untestable and both exclusions are real rather than convenient: a page with no
// day at event scale has nothing to snap, and a page still at event scale on the last day the
// file covers has no "day after" to read. The second one costs us Dulce_María, whose traffic
// is STILL above 20x her own level on day 400. She is not in this test; the dropout test finds
// her, which is the whole reason there are two of them.
const snaps = []
let noScale = 0, stillRunning = 0
const running = []
for (const row of census.rows) {
  const e = E.get(row.article)
  if (!e || !e.base) continue
  const S = row.series
  const days = Object.keys(S).map(Number).filter((d) => d >= 0).sort((a, b) => a - b)
  let last = null
  for (const d of days) { const v = S[String(d)]; if (v > SCALE * e.base && v >= FLOOR) last = d }
  if (last === null) { noScale++; continue }
  const next = S[String(last + 1)]
  if (next === undefined) { stillRunning++; running.push(e.t); continue }
  snaps.push({ a: row.article, t: e.t, day: last, v: S[String(last)], next, snap: +(S[String(last)] / Math.max(next, 1)).toFixed(1), raw: S[String(last)] / Math.max(next, 1) })
}
snaps.sort((a, b) => b.snap - a.snap)
// The percentiles are read off the unrounded ratios; the ONE-DECIMAL value is what the page
// prints, and rounding 207 of them before taking a middle moves the middle.
const snapVals = snaps.map((s) => s.raw)

// ---- the dropout ---------------------------------------------------------------
const drops = []
for (const row of census.rows) {
  const S = row.series
  const days = Object.keys(S).map(Number).filter((d) => d >= 1).sort((a, b) => a - b)
  const hit = []
  for (const d of days) {
    const v = S[String(d)], p = S[String(d - 1)], n = S[String(d + 1)]
    if (p === undefined || n === undefined) continue
    if (p > NEIGH && n > NEIGH && v * DEEP <= p && v * DEEP <= n) hit.push(d)
  }
  if (hit.length) drops.push({ a: row.article, t: (E.get(row.article) || {}).t || row.article, days: hit })
}
drops.sort((a, b) => b.days.length - a.days.length)

// ---- the union the page draws ---------------------------------------------------
const NAMED = [...new Set([...snaps.slice(0, 3).map((s) => s.a), ...drops.map((d) => d.a)])]

// ---- the traces ------------------------------------------------------------------
// Every page with a normal level to measure against, as its own multiple of that level over
// the first DAYS days. A cut row has no series and cannot be here; this plate's axis is days,
// which is exactly the axis 12's rows are forbidden from.
const traces = []
for (const row of census.rows) {
  const e = E.get(row.article)
  if (!e || !e.base) continue
  const r = D.get(row.article)
  const v = []
  for (let d = 0; d <= DAYS; d++) {
    const x = row.series[String(d)]
    v.push(x === undefined ? null : sig(Math.max(x / e.base, 0.1)))
  }
  traces.push({ a: row.article, t: e.t, dur: r ? r.dur : null, kind: r ? r.kind : null, v, named: NAMED.includes(row.article) ? 1 : 0 })
}
const allV = traces.flatMap((t) => t.v).filter((x) => x !== null)

// ---- what the four actually did, in their own numbers -----------------------------
const story = {}
for (const a of NAMED) {
  const row = census.rows.find((r) => r.article === a)
  const e = E.get(a)
  const S = row.series
  // The flat top is measured with the SAME event-scale rule the snap uses, rather than a third
  // threshold invented for the sentence: the longest unbroken run of days above 20x the page's
  // own normal level and at least 10,000 views. A number chosen to make a sentence read well is
  // not a measurement.
  let best = null, run = null
  for (let d = -30; d <= DAYS; d++) {
    const x = S[String(d)]
    if (x !== undefined && x > SCALE * e.base && x >= FLOOR) { run = run ?? { from: d, lo: x, hi: x }; run.to = d; run.lo = Math.min(run.lo, x); run.hi = Math.max(run.hi, x) }
    else { if (run && (!best || run.to - run.from > best.to - best.from)) best = run; run = null }
  }
  if (run && (!best || run.to - run.from > best.to - best.from)) best = run
  const s = snaps.find((x) => x.a === a)
  const dp = drops.find((x) => x.a === a)
  // The steepest single-day fall INSIDE the window the plate draws, from a day that was itself
  // at event scale. A page the snap cannot be read on still stops somewhere, and that day is
  // where the plate has to point: the longest event-scale run ends at the first day under the
  // 10,000 floor, which for Dulce María is day 21 — a dip she climbs straight back out of, not
  // the day she stops. Pointing a label there would have named the wrong day on the plate.
  let fallDay = null, fallBy = 0
  for (let d = 1; d <= DAYS; d++) {
    const a0 = S[String(d - 1)], a1 = S[String(d)]
    if (a0 === undefined || a1 === undefined) continue
    if (!(a0 > SCALE * e.base && a0 >= FLOOR)) continue
    const r = a0 / Math.max(a1, 1)
    if (r > fallBy) { fallBy = r; fallDay = d - 1 }
  }
  story[a] = {
    t: e.t, base: e.base, peak: row.peak, d: row.date,
    run: { days: best.to - best.from + 1, from: best.from, to: best.to, lo: best.lo, hi: best.hi },
    snap: s ? s.snap : null, snapDay: s ? s.day : null, snapFrom: s ? s.v : null, snapTo: s ? s.next : null,
    fallDay, fallBy: +fallBy.toFixed(1), fallFrom: fallDay === null ? null : S[String(fallDay)],
    fallTo: fallDay === null ? null : S[String(fallDay + 1)],
    dropDays: dp ? dp.days : [],
  }
}

// ---- do they move anything already shipped? ----------------------------------------
const cut = new Set(NAMED)
const durs = ev.events.filter((e) => e.dur !== null).map((e) => e.dur)
const dursNo = ev.events.filter((e) => e.dur !== null && !cut.has(e.a)).map((e) => e.dur)
const sets = ev.events.filter((e) => e.settle !== null)
const setsNo = sets.filter((e) => !cut.has(e.a))

const out = {
  meta: {
    source: ev.meta.source, window: ev.meta.window,
    scale: SCALE, floor: FLOOR, deep: DEEP, neigh: NEIGH, days: DAYS,
    before: ev.meta.before,
  },
  stat: {
    all: census.rows.length,
    drawn: traces.length,
    tested: snaps.length,
    noScale, stillRunning,
    median: +med(snapVals).toFixed(2),
    p75: +pct(snapVals, 0.75).toFixed(2),
    p90: +pct(snapVals, 0.9).toFixed(2),
    named: NAMED.length,
    bySnap: snaps.slice(0, 3).map((s) => s.t),
    byDrop: drops.map((d) => d.t),
    both: NAMED.filter((a) => snaps.slice(0, 3).some((s) => s.a === a) && drops.some((d) => d.a === a)).length,
    nextDown: snaps[3].t,
    nextDownSnap: snaps[3].snap,
    gap: +(snaps[2].snap / snaps[3].snap).toFixed(1),
    lift: sig(Math.max(...allV)),
  },
  contam: {
    durMedian: med(durs), durMedianNo: med(dursNo),
    settleAbove: +((100 * sets.filter((e) => e.settle >= 1).length) / sets.length).toFixed(1),
    settleAboveNo: +((100 * setsNo.filter((e) => e.settle >= 1).length) / setsNo.length).toFixed(1),
  },
  scale: {
    ylo: 1, yhi: 200000, xhi: DAYS,
    yticks: [1, 10, 100, 1000, 10000, 100000],
    ylabels: ['normal', '×10', '×100', '×1,000', '×10,000', '×100,000'],
    ynarrow: [1, 100, 10000],
    xticks: [0, 7, 14, 30, 45, 60],
  },
  stops: plate.stops,
  snaps: snaps.slice(0, 8),
  drops,
  story,
  traces,
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

// --- THE RECORD SAID 211 ROWS, A MEDIAN OF 1.77, A p90 OF 4.89, DULCE MARÍA AT 40x
// --- AND THREE DROPOUT DAYS FOR QUESTION MARK. FIVE OF THOSE ARE WRONG.
//
// 207 rows are testable, not 211: three pages never reach event scale at all, and four are
// STILL at event scale on the last day the file covers, so there is no day after to read.
// Dulce María is one of those four — her traffic is above 20x her own level on day 400 — so
// her "40x snap" is not a number this rule can produce, and no rule that stops at the end of
// a file can produce one. It is dropped from the record rather than rescued.
//
// What the record got right is the shape of the finding and three of its four names. What is
// corrected is how the fourth name arrives: not by snapping, but by being the only page in
// the file with FOUR dropout days. The two tests name four pages and agree on two, and that
// is a better-evidenced claim than the one the record wrote down.
check('rows with a normal level to measure against', out.stat.drawn, 214)
check('rows the snap can be read on', out.stat.tested, 207)
check('rows that never reached event scale', out.stat.noScale, 3)
check('rows still at event scale when the file ends', out.stat.stillRunning, 4)
check('and the three exclusions account for the 220', out.stat.tested + out.stat.noScale + out.stat.stillRunning + (out.stat.all - out.stat.drawn), 220)
check('the middle snap', out.stat.median, 1.78, 0.01)
check('three quarters of the file is under', out.stat.p75, 2.54, 0.01)
check('nine tenths under', out.stat.p90, 6.09, 0.01)

// --- test one: the snap ---------------------------------------------------------
check('the snap names', out.stat.bySnap, ['Index (statistics)', "Cook's Country", 'Question mark'])
check('at', snaps.slice(0, 3).map((s) => s.snap), [817.9, 204.4, 81.8])
check('and the next row down is', out.stat.nextDown, 'Charles, Prince of Wales')
check('at', out.stat.nextDownSnap, 11.5, 0.05)
check('so the third is this many times the fourth', out.stat.gap, 7.1, 0.05)
// The relation the page rests on. Three rows are not "the three largest"; they are three rows
// standing off a field, and the sentence is false the moment the gap closes.
check('every named snap is at least 40 times the middle of the file',
  snaps.slice(0, 3).every((s) => s.snap >= 40 * out.stat.median), true)
check('and at least seven times the fourth-largest',
  snaps.slice(0, 3).every((s) => s.snap >= 7 * out.stat.nextDownSnap), true)
check('while the fourth-largest is under seven times the middle',
  out.stat.nextDownSnap < 7 * out.stat.median, true)

// --- test two: the dropout ------------------------------------------------------
check('pages with a day ten times below both its neighbours', out.stat.byDrop, ['Dulce María', 'Question mark', "Cook's Country"])
check('with this many such days each', drops.map((d) => d.days.length), [4, 2, 1])
check('and nobody else in the file has one', drops.length, 3)
check('Dulce María\'s dropout days', drops[0].days, [353, 377, 394, 397])
check('Question mark\'s', drops[1].days, [2, 6])
check("Cook's Country's", drops[2].days, [4])

// --- the union ------------------------------------------------------------------
check('the two tests name this many pages between them', out.stat.named, 4)
check('and agree on', out.stat.both, 2)
check('so neither test alone finds all four',
  out.stat.bySnap.length < 4 && out.stat.byDrop.length < 4, true)
check('the four', NAMED.slice().sort(), ["Cook's_Country", 'Dulce_María', 'Index_(statistics)', 'Question_mark'])

// --- what each one actually did, which is what the page prints -------------------
const IX = out.story['Index_(statistics)']
check('Index (statistics) sat at this many views a day', IX.base, 44)
check('held this many straight days at event scale', IX.run.days, 20)
check('running from day', IX.run.from, -5)
check('to day', IX.run.to, 14)
check('between', IX.run.lo, 128405)
check('and', IX.run.hi, 2372030)
check('and then read', IX.snapTo, 157)
const CC = out.story["Cook's_Country"]
check("Cook's Country sat at", CC.base, 97)
check('read this on the day before its record day', census.rows.find((r) => r.article === "Cook's_Country").series['-1'], 833826)
check('and this two days before', census.rows.find((r) => r.article === "Cook's_Country").series['-2'], 57)
check('and after day 14 it read', CC.snapTo, 876)
const QM = out.story['Question_mark']
check('Question mark read this on day one', census.rows.find((r) => r.article === 'Question_mark').series['1'], 522905)
check('this on day two', census.rows.find((r) => r.article === 'Question_mark').series['2'], 1142)
check('and this on day three', census.rows.find((r) => r.article === 'Question_mark').series['3'], 638607)
const DM = out.story['Dulce_María']
check('Dulce María is still above 20x her own level on the last day the file covers',
  census.rows.find((r) => r.article === 'Dulce_María').series['400'] > SCALE * E.get('Dulce_María').base, true)
check('which is why the snap cannot be read on her', DM.snap, null)
// She still stops, and the plate points at the day she does rather than at the end of a run.
check('her steepest fall inside the sixty days the plate draws is day', DM.fallDay, 47)
check('from', DM.fallFrom, 33034)
check('to', DM.fallTo, 1529)
check('which is', DM.fallBy, 21.6, 0.05)
check('and it is not the day her longest event-scale run ends', DM.fallDay !== DM.run.to, true)
check('every one of the four has a day the plate can point at',
  Object.values(out.story).every((v) => v.fallDay !== null), true)
// It is NOT the same day for all three, and the exception is worth keeping rather than
// smoothing: Question mark's steepest fall inside these sixty days is its DROPOUT on day two,
// 457.9 times in one day, not the day it finally stops. So a single "biggest fall" rule cannot
// stand in for the snap, and the plate points at the snap where a snap exists. That the two
// readings disagree about which of its days matters most is the reason there are two of them.
check('two of the three fall hardest on the day they stop',
  Object.values(out.story).filter((v) => v.snap !== null && v.fallDay === v.snapDay).length, 2)
check('Question mark falls hardest on its dropout instead, on day', QM.fallDay, 1)
check('by', QM.fallBy, 457.9, 0.05)
check('which is larger than the day it stops', QM.fallBy > QM.snap, true)
check('and that day is one of its dropout days', drops.find((d) => d.a === 'Question_mark').days.includes(QM.fallDay + 1), true)

// --- they move nothing already shipped -------------------------------------------
check('beat 01\'s middle duration with the four in', out.contam.durMedian, 28)
check('and with them out', out.contam.durMedianNo, 28)
check('beat 03\'s share ending above their own level, with them in', out.contam.settleAbove, 43.9, 0.05)
check('and it is the number beat 03 prints', out.contam.settleAbove, settle.stat.abovePct)
check('and with them out', out.contam.settleAboveNo, 43.8, 0.05)
check('so the four move nothing already on the site',
  Math.abs(out.contam.settleAbove - out.contam.settleAboveNo) < 0.2, true)

// --- the shared scale, read from beat 01 rather than restated ----------------------
check('the ramp is beat 01\'s own stops, not a copy of them', out.stops, plate.stops)
check('which are days', out.stops, [1, 12, 28, 56, 340])
check('every trace that returned has a duration inside them',
  traces.every((t) => t.kind !== 'back' || (t.dur >= 1 && t.dur <= plate.stat.max)), true)
check('and every trace that did not takes the top stop, which is beat 01\'s rule',
  traces.filter((t) => t.kind !== 'back').length, 35)

// --- the plate ---------------------------------------------------------------------
check('traces drawn', out.traces.length, 214)
check('days on each', out.traces[0].v.length, DAYS + 1)
// Two pages are missing days the API never returned. They are drawn as broken lines rather
// than bridged, because a straight segment across a hole is a reading nobody took.
check('traces with a hole the source never filled',
  traces.filter((t) => t.v.some((x) => x === null)).length, 2)
check('and they are', traces.filter((t) => t.v.some((x) => x === null)).map((t) => t.a).sort(), ['Lindsey_Graham', 'Sam_Neill'])
check('neither of them is one of the four', traces.filter((t) => t.v.some((x) => x === null)).every((t) => !t.named), true)
check('days the source never returned', traces.reduce((a, t) => a + t.v.filter((x) => x === null).length, 0), 41)
check('every point is inside the axis',
  allV.every((x) => x >= out.scale.ylo * 0.1 && x <= out.scale.yhi), true)
check('the tallest point', out.stat.lift, 136000, 1000)
check('and it is under the axis top', out.stat.lift < out.scale.yhi, true)
check('every axis tick has a label', [out.scale.yticks.length, out.scale.ylabels.length], [6, 6])
check('the narrow ticks are a subset of the wide ones',
  out.scale.ynarrow.every((t) => out.scale.yticks.includes(t)), true)
check('four traces are lit', traces.filter((t) => t.named).length, 4)

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
