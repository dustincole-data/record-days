/**
 * 06_groups — the payload for F4, and every number that plate prints.
 *
 * The 196 pages that beat 03 draws, ordered by how much traffic they had the day before
 * their record day as a share of the record day itself, then cut into five equal groups.
 * For each group: where its pages ended up, on the SAME scale beat 03 uses.
 *
 * THE SHARED SCALE IS A CLAIM. Two plates on one page, both reading "times its normal
 * level", only mean what their captions say while they are measured the same way. This pass
 * reads 05's payload and asserts that the axis and the ramp are identical objects rather
 * than a matching pair of numbers typed twice. If they ever drift, the run stops.
 *
 * WHAT IS NOT CLAIMED. The groups do not march downward in order. The fifth group settles
 * slightly ABOVE the fourth, and that is guarded, so no future copy on this page can say the
 * relation is a ladder. What is true and guarded: the quietest fifth is the only group whose
 * middle page ended above its own normal level.
 *
 * The two-group test in the record (day before under 2% of the record day against over 25%,
 * Mann-Whitney z 3.587, p 3.4e-4) is computed in 02 and carried here for the method tail,
 * re-asserted rather than restated.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'groups'

const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const settle = JSON.parse(readFileSync(join(GEN, 'settle.json'), 'utf8'))
const claims = JSON.parse(readFileSync(join(GEN, 'claims.json'), 'utf8'))

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }

const K = 5
const NAMES = ['quietest fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'busiest fifth']
const BW = 0.22        // kernel width, in decades of the ratio scale
const GRID = 121       // points the ridge is drawn through

const S = ev.events.filter((e) => e.settle !== null && e.warn !== null).sort((a, b) => a.warn - b.warn)
const L = Math.log10
const { lo, hi, pivot } = settle.scale
const x0 = L(lo), x1 = L(hi)

const raw = []
for (let i = 0; i < K; i++) {
  const g = S.slice(Math.floor((i * S.length) / K), Math.floor(((i + 1) * S.length) / K))
  const xs = g.map((e) => L(e.settle))
  const d = []
  for (let j = 0; j < GRID; j++) {
    const x = x0 + ((x1 - x0) * j) / (GRID - 1)
    let s = 0
    for (const v of xs) s += Math.exp(-0.5 * ((x - v) / BW) ** 2)
    d.push(s / (xs.length * BW * Math.sqrt(2 * Math.PI)))
  }
  raw.push({ g, d })
}
// ONE vertical scale across all five ridges. A ridge normalised against its own peak would
// make five groups of different sizes look like five groups of the same size.
const peak = Math.max(...raw.flatMap((r) => r.d))

const pct = (w) => +(100 * w).toFixed(2)
const groups = raw.map(({ g, d }, i) => {
  const xs = g.map((e) => e.settle)
  const mode = d.indexOf(Math.max(...d))
  return {
    i, name: NAMES[i], n: g.length,
    warnLo: pct(g[0].warn), warnHi: pct(g[g.length - 1].warn),
    median: +med(xs).toFixed(2), p25: q(xs, 0.25), p75: q(xs, 0.75),
    above: g.filter((e) => e.settle > pivot).length,
    abovePct: Math.round((100 * g.filter((e) => e.settle > pivot).length) / g.length),
    modeAt: +(10 ** (x0 + ((x1 - x0) * mode) / (GRID - 1))).toFixed(3),
    d: d.map((v) => +(v / peak).toFixed(4)),
  }
})

const out = {
  meta: { source: ev.meta.source, window: ev.meta.window, before: ev.meta.before, after: ev.meta.after, bw: BW, grid: GRID },
  stat: {
    n: S.length, k: K,
    quietestHi: pct(S[Math.floor(S.length / K) - 1].warn),
    busiestLo: pct(S[Math.floor((4 * S.length) / K)].warn),
    quietestHiText: pct(S[Math.floor(S.length / K) - 1].warn).toFixed(2) + '%',
    busiestLoText: (+pct(S[Math.floor((4 * S.length) / K)].warn).toFixed(1)) + '%',
    aboveOne: groups.filter((g) => g.median > pivot).length,
  },
  scale: settle.scale,
  stops: settle.stops,
  test: { ...claims.warning.test, cut: claims.warning.cut, ambush: claims.warning.ambush, warned: claims.warning.warned },
  groups,
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

check('pages grouped', out.stat.n, 196)
check('and they are the same pages beat 03 draws', out.stat.n, settle.stat.n)
check('five groups', groups.length, K)
check('every page is in exactly one group', groups.reduce((a, g) => a + g.n, 0), out.stat.n)
check('the groups are equal fifths', groups.map((g) => g.n), [39, 39, 39, 39, 40])

// --- THE SHARED SCALE, asserted as one object rather than two matching copies ---
check('beat 03 and beat 04 are drawn on the same axis',
  JSON.stringify(out.scale), JSON.stringify(settle.scale))
check('and inked by the same ramp', JSON.stringify(out.stops), JSON.stringify(settle.stops))
check('with the same pivot', out.scale.pivot, 1)

// --- what the plate prints, group by group --------------------------------
check('the middle page of each group', groups.map((g) => g.median), [2.44, 0.96, 0.72, 0.53, 0.58])
check('how many of each group ended above their normal level',
  groups.map((g) => g.above), [35, 18, 11, 8, 14])
check('as a share, %', groups.map((g) => g.abovePct), [90, 46, 28, 21, 35])
check('the quietest fifth was at 0.13% of its record day or less', out.stat.quietestHi, 0.13)
check('and the page prints that', out.stat.quietestHiText, '0.13%')
check('the busiest fifth was at 29.71% or more', out.stat.busiestLo, 29.71)
check('and the page prints that', out.stat.busiestLoText, '29.7%')

// --- the RELATION the section rests on -------------------------------------
// Only one group's middle page ends above its own normal level, and it is the quiet one.
check('exactly one group settles above its normal level', out.stat.aboveOne, 1)
check('and it is the quietest fifth', groups.findIndex((g) => g.median > 1), 0)
check('every other group settles below it', groups.slice(1).every((g) => g.median < 1), true)
check('the quietest fifth is the only group where most pages ended higher',
  groups.map((g) => g.abovePct > 50), [true, false, false, false, false])
// NOT a ladder, and the guard exists so that no copy on this page ever says it is
check('the relation is not monotone: the fifth group settles above the fourth',
  groups[4].median > groups[3].median, true)
// The shape a reader sees: the quiet group's hill sits on the far side of the pivot and the
// others sit on it or to the left. The first draft of this guard asserted that every other
// group peaks BELOW the pivot and it failed: the second fifth peaks at 1.008, which is the
// pivot to any eye and to this kernel's width. The record was corrected and the guard is now
// written at the strength the plate is drawn at, not tighter than the kernel can carry.
check('the quietest fifth peaks well above the pivot', groups[0].modeAt > 2, true)
check('no other group peaks meaningfully above it',
  groups.slice(1).every((g) => g.modeAt < 1.05), true)
check('where each group peaks', groups.map((g) => g.modeAt), [2.152, 1.008, 0.39, 0.571, 0.519])

// the ridges share one vertical scale, so the tallest is exactly 1
check('one vertical scale across all five ridges', Math.max(...groups.flatMap((g) => g.d)), 1)
check('and no ridge is drawn off it', groups.every((g) => g.d.every((v) => v >= 0 && v <= 1)), true)

// the two-group test carried from 02 for the method tail
check('the test in the record: z', out.test.z, 3.587, 0.01)
check('the test in the record: p under 1e-3', out.test.p < 1e-3, true)
check('the two cuts it uses', out.test.cut, [0.02, 0.25])
check('and the two medians it compares', [out.test.ambush.median, out.test.warned.median], [1.3, 0.55])

// nothing may be drawn outside the scale it is measured on
check('every group median sits inside the axis',
  groups.every((g) => g.median > lo && g.median < hi), true)
check('every quartile too',
  groups.every((g) => g.p25 > lo && g.p75 < hi), true)

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
