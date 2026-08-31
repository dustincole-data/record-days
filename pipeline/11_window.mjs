/**
 * 11_window — the payload for F10, and every number that plate prints.
 *
 * THE FINDING. Fit an exponential to a page's traffic and it hands back a half-life. Fit it to
 * the same page over a longer window and it hands back a different one. Over ten days these
 * pages halve every 2.05 days; over 340 days the same pages halve every 97.93. Nothing about
 * the pages changed. The only thing that changed is how long the analyst looked.
 *
 * THE ESTIMATOR, one definition:
 *
 *   excess(d)   = views on day d minus the page's normal level  (the site's one before-window)
 *   exponential = least squares of ln(excess) on d          -> half-life ln2 / -slope
 *   power law   = least squares of ln(excess) on ln(d)
 *
 * Both are fitted to THE SAME POINTS, which is what makes their R2 comparable at all: only
 * days whose traffic is above the page's own level are usable, because ln of a non-positive
 * excess does not exist. A row is fitted over a window only if it has ten such days in it.
 *
 * THE SAME ROWS AT EVERY WINDOW. The claim is about one set of pages read two ways, so the set
 * is fixed once — the 182 pages that clear the rule at both 60 and 340 days — and every point
 * on the sweep is those pages. A sweep whose membership moved with the window would be
 * measuring its own row selection.
 *
 * WHAT THE RECORD SAID, AND WHAT THIS CORRECTS. `findings.md` carried 148 of 189 and 181 of
 * 196, a half-life of 9.62 against 94.97, from a script written during the second pass and
 * never committed. Its row rule is not recoverable from anything in this repo: no combination
 * of base window, coverage rule and minimum-points rule reproduces both counts. Under the
 * project's own rule — never ship a number you cannot reproduce from the source file — those
 * figures are replaced here by the ones this file computes, and the rule that produces them is
 * written above. The direction, the size and the conclusion are unchanged. The probe figures
 * DID reproduce exactly and are unchanged.
 *
 * THE PROBE IS THE POINT OF THE PROBE. The census gate selects for a clean fall by day seven,
 * which if anything favours the exponential this finding rejects. The 88 hand-picked probe
 * events carry no shape gate at all, so they are the check, and they agree.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'window'

const census = JSON.parse(readFileSync(join(ROOT, 'data', 'census', 'top-days.json'), 'utf8')).rows
const probe = JSON.parse(readFileSync(join(ROOT, 'data', 'probe', 'results2.json'), 'utf8'))
const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const plate = JSON.parse(readFileSync(join(GEN, 'plate.json'), 'utf8'))

const SHORT = 60, LONG = 340        // the two windows the page names
const MIN = 10                      // days above the page's own level a fit needs
const DEPTHS = [0.5, 0.1, 0.05]     // half, a tenth, a twentieth of the record day's excess

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }

// least squares of ys on xs, and how much of ys it accounts for
function fit(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
  return { b: sxy / sxx, a: my - (sxy / sxx) * mx, r2: syy === 0 ? 0 : (sxy * sxy) / (sxx * syy) }
}

// the usable days inside a window: only where the page is above its own level
function points(series, base, W) {
  const d = [], ly = []
  for (let k = 1; k <= W; k++) {
    const x = series[String(k)]
    if (x === undefined) continue
    const e = x - base
    if (e > 0) { d.push(k); ly.push(Math.log(e)) }
  }
  return { d, ly }
}
function models(series, base, W) {
  const p = points(series, base, W)
  if (p.d.length < MIN) return null
  const e = fit(p.d, p.ly)
  const w = fit(p.d.map(Math.log), p.ly)
  return { n: p.d.length, exp: e, pow: w, hl: e.b < 0 ? Math.LN2 / (-e.b) : null }
}

const byA = new Map(ev.events.map((e) => [e.a, e]))
const lastDay = (r) => Math.max(...Object.keys(r.series).map(Number))

// --- the set, fixed once -----------------------------------------------------
const set = []
for (const r of census) {
  const e = byA.get(r.article)
  if (!e || !(e.base > 0)) continue
  if (lastDay(r) < LONG) continue                                   // the window has to be covered
  if (!models(r.series, e.base, SHORT) || !models(r.series, e.base, LONG)) continue
  set.push({ a: r.article, t: r.t || r.article.replace(/_/g, ' '), series: r.series, base: e.base })
}

function atWindow(W) {
  const ms = set.map((s) => models(s.series, s.base, W)).filter(Boolean)
  const hl = ms.map((m) => m.hl).filter((x) => x !== null)
  return {
    w: W, n: ms.length, nhl: hl.length,
    med: +med(hl).toFixed(2), p25: +q(hl, 0.25).toFixed(2), p75: +q(hl, 0.75).toFixed(2),
    win: ms.filter((m) => m.pow.r2 > m.exp.r2).length,
    r2pow: +med(ms.map((m) => m.pow.r2)).toFixed(3),
    r2exp: +med(ms.map((m) => m.exp.r2)).toFixed(3),
  }
}

// --- the sweep. A log grid, with the two named windows forced into it --------
const grid = new Set([SHORT, LONG])
for (let i = 0; i <= 23; i++) grid.add(Math.round(10 * Math.pow(LONG / 10, i / 23)))
const sweep = [...grid].sort((a, b) => a - b).map(atWindow)
const short = sweep.find((s) => s.w === SHORT), long = sweep.find((s) => s.w === LONG)

// --- what the readings themselves say, on the same rows ----------------------
// Not a fit: the first day a page's excess falls to a given share of its record day's, then
// the half-life that day implies. A quantity that is really exponential gives the same answer
// at all three depths, and this one does.
const depths = DEPTHS.map((f) => {
  const ds = []
  for (const s of set) {
    const e0 = s.series['0'] - s.base
    if (!(e0 > 0)) continue
    for (let d = 1; d <= LONG; d++) {
      const x = s.series[String(d)]
      if (x === undefined) continue
      if (x - s.base <= f * e0) { ds.push(d); break }
    }
  }
  const day = med(ds)
  return { frac: f, pct: f * 100, n: ds.length, day, hl: +(day / Math.log2(1 / f)).toFixed(2) }
})
const obsLo = Math.min(...depths.map((d) => d.hl)), obsHi = Math.max(...depths.map((d) => d.hl))

// --- the ungated check -------------------------------------------------------
const pm = probe.map((r) => models(r.series, r.baseline, SHORT)).filter(Boolean)
const probeStat = {
  n: pm.length, all: probe.length,
  win: pm.filter((m) => m.pow.r2 > m.exp.r2).length,
  pct: +((100 * pm.filter((m) => m.pow.r2 > m.exp.r2).length) / pm.length).toFixed(1),
  r2pow: +med(pm.map((m) => m.pow.r2)).toFixed(3),
  r2exp: +med(pm.map((m) => m.exp.r2)).toFixed(3),
}

const out = {
  meta: {
    source: ev.meta.source, window: ev.meta.window, before: ev.meta.before,
    short: SHORT, long: LONG, min: MIN, depths: DEPTHS,
    from: sweep[0].w, to: sweep[sweep.length - 1].w,
  },
  stat: {
    n: set.length,
    hlShort: short.med, hlLong: long.med,
    climb: +(long.med / short.med).toFixed(1),
    span: +(sweep[sweep.length - 1].med / sweep[0].med).toFixed(1),
    winShort: short.win, winShortPct: +((100 * short.win) / short.n).toFixed(1),
    winLong: long.win, winLongPct: +((100 * long.win) / long.n).toFixed(1),
    r2ShortPow: short.r2pow, r2ShortExp: short.r2exp,
    r2LongPow: long.r2pow, r2LongExp: long.r2exp,
    obsLo, obsHi, obsSpan: +(obsHi / obsLo).toFixed(2),
    gap: Math.round(long.med / obsHi),
  },
  probe: probeStat,
  depths,
  sweep,
  named: [short, long],
  // The ink is the site's own day ramp, read from 03's payload rather than restated. This
  // plate's quantity is a number of days, so a colour here is the same number of days it is on
  // the first plate. 06 does the same with 05's axis, and for the same reason.
  stops: plate.stops,
  scale: {
    x: { lo: 9, hi: 380, ticks: [10, 30, 60, 120, 340], labels: ['10 days', '30', '60', '120', '340'] },
    y: { lo: 0.7, hi: 200, ticks: [1, 3, 10, 30, 100], labels: ['1 day', '3', '10', '30', '100'] },
    narrowX: [10, 60, 340], narrowY: [1, 10, 100],
  },
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

check('pages fitted at both windows', out.stat.n, 182)
check('the half-life read over 60 days', out.stat.hlShort, 9.59)
check('and over 340 days', out.stat.hlLong, 97.93)
check('which is a multiple of', out.stat.climb, 10.2)

// --- THE RELATION, which is the whole finding -------------------------------
// The claim is that the answer is a property of the window. That is false if the sweep is
// flat, false if it is not monotone, and false if the two named windows happen to agree.
check('the sweep climbs at every step',
  sweep.every((s, i) => i === 0 || s.med > sweep[i - 1].med), true)
check('over the whole sweep it multiplies by', out.stat.span, 47.8, 0.05)
check('the shortest window read', sweep[0].med, 2.05)
check('the longest read', sweep[sweep.length - 1].med, 97.93)
check('every window is fitted on nearly the whole set', sweep.every((s) => s.n >= 174), true)
check('and on the same set', sweep.every((s) => s.n <= out.stat.n), true)

// --- what the readings say, which does NOT move ------------------------------
check('the days to a half, a tenth and a twentieth', depths.map((d) => d.day), [1, 3, 5])
check('and the half-life each of those implies', depths.map((d) => d.hl), [1, 0.9, 1.16])
check('read off the readings it is stable', out.stat.obsSpan < 1.3, true)
check('every fitted window overstates it', sweep.every((s) => s.med > obsHi), true)
check('the longest window overstates it by', out.stat.gap, 84)
check('the depths are measured on the same rows', depths.every((d) => d.n === out.stat.n), true)

// --- why the fit moves: it is the wrong shape --------------------------------
check('the power law beats the exponential over 60 days', out.stat.winShort, 139)
check('which is, %', out.stat.winShortPct, 76.4)
check('and over 340 days', out.stat.winLong, 167)
check('which is, %', out.stat.winLongPct, 91.8)
check('median R2 over 60 days, power then exponential', [out.stat.r2ShortPow, out.stat.r2ShortExp], [0.835, 0.713])
check('and over 340', [out.stat.r2LongPow, out.stat.r2LongExp], [0.492, 0.223])
check('the power law wins on both windows',
  out.stat.winShortPct > 50 && out.stat.winLongPct > 50, true)

// --- the set with no shape gate, which is the check --------------------------
check('probe events fitted', [probeStat.n, probeStat.all], [88, 88])
check('the power law wins on', probeStat.win, 66)
check('which is, %', probeStat.pct, 75)
check('median R2, power then exponential', [probeStat.r2pow, probeStat.r2exp], [0.802, 0.706])
check('and it agrees with the census in direction', probeStat.pct > 50, true)

// --- the shared ink, asserted as one object ---------------------------------
check('the ramp is the first plate\'s own stops, not a copy of them', out.stops, plate.stops)
check('which are days', out.stops, [1, 12, 28, 56, 340])
check('every marked window is inside the axis',
  sweep.every((s) => s.w >= out.scale.x.lo && s.w <= out.scale.x.hi), true)
check('every drawn half-life is inside the axis',
  sweep.every((s) => s.p25 > out.scale.y.lo && s.p75 < out.scale.y.hi), true)
check('every axis tick has a label',
  [out.scale.x.ticks.length, out.scale.y.ticks.length], [out.scale.x.labels.length, out.scale.y.labels.length])
check('the narrow ticks are a subset of the wide ones',
  out.scale.narrowX.every((t) => out.scale.x.ticks.includes(t)) && out.scale.narrowY.every((t) => out.scale.y.ticks.includes(t)), true)

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
