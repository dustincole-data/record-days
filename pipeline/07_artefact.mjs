/**
 * 07_artefact — the payload for F5, and every number that plate prints.
 *
 * THE FINDING IS THE MEASUREMENT, NOT THE WORLD. The census carries one baseline field,
 * `base`, the median of days -21 to -8. For an event that runs longer than a fortnight that
 * window sits INSIDE the event, so the "level before" it reports is the event's own traffic.
 * This site refuses that window everywhere and uses days -30 to -22 instead. This pass draws
 * the reason.
 *
 * WHAT `lift` IS, corrected here at step 4. `src/lib/census.js` computes it as
 * `series[+7] / base`, the gate's own "is this page still lifted a week later" arm — NOT
 * `peak / base`. `research/source.md` said peak/base and was wrong, and the findings record
 * carried the false sentence "on 10 rows the record day reads below the page's own recent
 * level". The record day does not: on the site's own window those ten read 2.7x to 122x
 * their level. What reads below is DAY SEVEN, against a baseline taken from inside the
 * event. Both files were corrected; this pass asserts the corrected sentence.
 *
 * THE PANELS. Ten scheduled events whose gate reading comes out under 1, against the ten
 * cleanest ambushes in the file, on ONE shared vertical scale of "views that day as a share
 * of this page's record day". A shared scale is a claim and it is guarded: the same lo/hi
 * pair is written once and every drawn point is asserted inside it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'artefact'

const census = JSON.parse(readFileSync(join(ROOT, 'data/census/top-days.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const E = ev.events
const byA = new Map(census.rows.map((r) => [r.article, r]))
const byT = new Map(E.map((e) => [e.a, e]))

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }

const FROM = -30, TO = 7                 // the run-up, plus the day the gate reads
const NEAR = [-21, -8]                   // the window the census offers, and this site refuses
const FAR = ev.meta.before               // the window this site uses everywhere

const win = (r, lo, hi) => { const v = []; for (let d = lo; d <= hi; d++) if (r.series[d] > 0) v.push(r.series[d]); return v }

function panel(e, group) {
  const r = byA.get(e.a)
  const pts = []
  for (let d = FROM; d <= TO; d++) { const v = r.series[d]; if (v > 0) pts.push([d, +(v / r.peak).toPrecision(4)]) }
  const nearMed = med(win(r, NEAR[0], NEAR[1]))
  const farMed = med(win(r, FAR[0], FAR[1]))
  return {
    a: e.a, t: e.t, d: e.d, group,
    peak: r.peak,
    near: nearMed, nearShare: +(nearMed / r.peak).toPrecision(4),
    far: farMed, farShare: +(farMed / r.peak).toPrecision(4),
    at7: r.series[7], at7Share: +(r.series[7] / r.peak).toPrecision(4),
    gate: +(r.series[7] / nearMed).toFixed(2),      // the census `lift` field, recomputed
    cleaner: farMed / nearMed < 1 / ev.meta.climb,  // does stepping the window back find a lower level
    pts,
  }
}

// the ten the gate reads as never having lifted, worst first
const sub = E.filter((e) => Number.isFinite(e.lift) && e.lift < 1).sort((a, b) => a.lift - b.lift)
// against the ten cleanest ambushes: a usable quiet window that is NOT climbing, smallest
// day-before as a share of the record day
const amb = E.filter((e) => e.climbing === false && e.warn !== null).sort((a, b) => a.warn - b.warn).slice(0, 10)

const panels = [...sub.map((e) => panel(e, 'scheduled')), ...amb.map((e) => panel(e, 'ambush'))]

const LO = 1e-5, HI = 1
// The ramp spans the WHOLE scale, so the axis strip drawn beside the grid is complete and a
// panel's ink is exactly the axis's colour at the height of that page's own level through the
// window. One object to read, as on beat 01. The middle stop is the number the plate is
// about: the middle of the twenty levels it draws.
const shares = panels.map((p) => p.nearShare).sort((a, b) => a - b)
const stops = [LO, q(shares, 0.25), med(shares), q(shares, 0.75), HI]

const out = {
  meta: {
    source: ev.meta.source, window: ev.meta.window,
    from: FROM, to: TO, near: NEAR, far: FAR, climb: ev.meta.climb,
    gateAt: 7, gateLift: 1.5,
  },
  stat: {
    // TWO different denominators, and the record confused them once. `testable` is the rows
    // this SITE can compare its window against the census's, which needs a usable -30..-22
    // level; `rated` is the rows the CENSUS could compute a gate reading for, which needs
    // only a -21..-8 level and a day +7.
    testable: E.filter((e) => e.climbing !== null).length,
    rated: E.filter((e) => Number.isFinite(e.lift)).length,
    climbing: E.filter((e) => e.climbing === true).length,
    belowGate: sub.length,
    noCleaner: sub.filter((e) => e.climbing !== true).length,
    worldCupFar: byT.get('FIFA_World_Cup').base,
    worldCupNear: byA.get('FIFA_World_Cup').base,
    worldCupPeak: byA.get('FIFA_World_Cup').peak,
    readsHigherFurtherOut: sub.filter((e) => byA.get(e.a).base < byT.get(e.a).base).length,
    // ...and the same count written at a strength the numbers carry. The third row clears
    // the near window by 2 views in 30,000, which is a dead heat and not a finding.
    readsMateriallyHigher: sub.filter((e) => byT.get(e.a).base / byA.get(e.a).base > 1.05).length,
  },
  scale: { lo: LO, hi: HI, ticks: [1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1], labels: ['0.001%', '0.01%', '0.1%', '1%', '10%', '100%'] },
  stops: stops.map((s) => +s.toPrecision(4)),
  panels,
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

check('rows this site can compare the two windows on', out.stat.testable, 214)
check('rows the census could give a gate reading', out.stat.rated, 218)
check('rows already climbing by day -21', out.stat.climbing, 45)
check('rows the gate reads as never having lifted', out.stat.belowGate, 10)
check('of those, how many find no lower level further out', out.stat.noCleaner, 6)

// --- THE CORRECTED SENTENCE. It is DAY SEVEN that reads below the window, not the record
// day. The record day on this site's own window is 2.7x to 122x its level for all ten.
check('for all ten, day seven reads below the window the census uses',
  sub.every((e) => byA.get(e.a).series[7] < byA.get(e.a).base), true)
check('and for none of them does the record day',
  sub.every((e) => byA.get(e.a).peak > byT.get(e.a).base), true)
check('the smallest of those record-day multiples, on this window',
  +Math.min(...sub.map((e) => byA.get(e.a).peak / byT.get(e.a).base)).toFixed(2), 2.67, 0.01)
check('the largest', +Math.max(...sub.map((e) => byA.get(e.a).peak / byT.get(e.a).base)).toFixed(0), 122, 1)

// --- every one of the ten is a scheduled event, and that is the list ---
check('the ten, worst first', sub.map((e) => e.t), [
  'FIFA World Cup', 'WrestleMania 34', 'WrestleMania 33', 'Royal Rumble (2024)', 'Tom Brady',
  '88th Academy Awards', '92nd Academy Awards', 'Peyton Manning', 'Beau Biden', '98th Academy Awards'])
check('their gate readings', sub.map((e) => e.lift),
  [0.14, 0.41, 0.42, 0.62, 0.82, 0.86, 0.93, 0.94, 0.96, 0.99])

// --- the World Cup, the row where the artefact is visible in one pair of numbers ---
check('the World Cup at days -30 to -22', out.stat.worldCupFar, 552584)
check('against days -21 to -8', out.stat.worldCupNear, 397613)
check('so it reads HIGHER further from the final', out.stat.worldCupFar > out.stat.worldCupNear, true)
check('and it is not the only one that does', out.stat.readsHigherFurtherOut, 3)
// The third of those three clears the near window by 2 views in 30,000. The page says "two",
// and this pair of checks is why: a count and the same count at a margin the plate can show.
check('but only two of the three by a margin worth drawing', out.stat.readsMateriallyHigher, 2)
check('the two, and by how much',
  sub.filter((e) => byT.get(e.a).base / byA.get(e.a).base > 1.05)
    .map((e) => [e.t, +(byT.get(e.a).base / byA.get(e.a).base).toFixed(2)]),
  [['FIFA World Cup', 1.39], ['92nd Academy Awards', 1.39]])
check('the dead heat, to five figures',
  +(byT.get('88th_Academy_Awards').base / byA.get('88th_Academy_Awards').base).toFixed(5), 1.00007, 1e-5)
check('the World Cup record day', out.stat.worldCupPeak, 1473099)

// --- the control ten, and the relation the plate rests on -----------------
const A = panels.filter((p) => p.group === 'ambush')
const S = panels.filter((p) => p.group === 'scheduled')
check('twenty panels', panels.length, 20)
check('ten of each', [S.length, A.length], [10, 10])
check('the control ten all have a clean window', amb.every((e) => e.climbing === false), true)
check('the control ten, quietest first', A.map((p) => p.t), [
  'Damar Hamlin', 'Francis Scott Key Bridge (Baltimore)', 'Christina Grimmie', 'Diogo Jota',
  'Chadwick Boseman', 'Puneeth Rajkumar', 'Oliver Tree', 'Cameron Boyce', 'Taylor Hawkins', 'Shinzo Abe'])
// THE RELATION THE TWO BLOCKS ARE DRAWN TO SHOW: the scheduled block sits far up the scale
// through the whole month before, the control block sits at the floor of it.
check('every scheduled panel sat above 1% of its record day through days -21 to -8',
  S.every((p) => p.nearShare > 0.01), true)
check('every control panel sat below it', A.every((p) => p.nearShare < 0.01), true)
check('and the two blocks do not overlap on that reading',
  Math.min(...S.map((p) => p.nearShare)) > Math.max(...A.map((p) => p.nearShare)), true)
check('every control panel clears the gate it is drawn against',
  A.every((p) => p.gate > out.meta.gateLift), true)
check('and no scheduled panel does', S.every((p) => p.gate < 1), true)

// --- nothing may be drawn outside the one scale ---------------------------
check('every panel carries all 38 days', panels.every((p) => p.pts.length === TO - FROM + 1), true)
check('every point is inside the shared scale',
  panels.every((p) => p.pts.every(([, v]) => v >= LO && v <= HI)), true)
check('the record day is the top of the scale', panels.every((p) => p.pts.find(([d]) => d === 0)[1] === 1), true)
check('the ramp stops rise', out.stops.every((s, i, a) => i === 0 || s >= a[i - 1]), true)
check('and it spans the whole scale, so the axis strip is the key',
  [out.stops[0], out.stops[4]], [LO, HI])
check('its middle stop is the middle of the twenty levels drawn',
  out.stops[2], +med(shares).toPrecision(4))
check('which falls between the two blocks',
  out.stops[2] > Math.max(...A.map((p) => p.nearShare)) && out.stops[2] < Math.min(...S.map((p) => p.nearShare)), true)

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
