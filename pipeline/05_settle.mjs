/**
 * 05_settle — the payload for F3, and every number that plate prints.
 *
 * One value per page: its median daily traffic at day +300 to +340, divided by its normal
 * level on the site's one before-window (days -30 to -22). 1.0 means the page ended exactly
 * where it started, so 1.0 is the whole section and it is the ramp's middle stop, which is
 * the page's accent ink.
 *
 * THE RELATION is a share, not a ratio: "almost half" is false the moment the split leaves
 * the forties, and it is guarded as a band rather than as a single number. The count on each
 * side is guarded too, because the plate prints both and they have to add up to the 196 it
 * says it drew.
 *
 * The plate's own axis is what beat 04 is drawn on as well. That shared scale is asserted in
 * 06, which reads this payload rather than restating it.
 *
 * WHAT THE FALLING SIDE CONTAINS is not neutral, and the page says so. Half of the ten
 * biggest fallers are scheduled events whose before-window sits inside the event itself, so
 * their "normal level" is a tournament week rather than a quiet one. That is F5, counted here
 * because this is the plate a reader meets it on.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GEN = join(ROOT, 'src', 'gen')
const PASS = 'settle'

const ev = JSON.parse(readFileSync(join(GEN, 'events.json'), 'utf8'))
const E = ev.events
const S = E.filter((e) => e.settle !== null).sort((a, b) => a.settle - b.settle)

const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const nf = new Intl.NumberFormat('en-US')

// The axis. Floor under the smallest ratio in the file, ceiling over the largest.
const LO = 0.008, HI = 700
const PIVOT = 1                     // "the same as before"

const xs = S.map((e) => e.settle)
const above = S.filter((e) => e.settle > PIVOT)
const below = S.filter((e) => e.settle <= PIVOT)

// The ramp's stops: the two walls, the two quartiles, and the pivot in the middle. The
// middle stop is the site's accent ink, so on this plate the rose rule IS 1.0.
const stops = [Math.min(...xs), q(xs, 0.25), PIVOT, q(xs, 0.75), Math.max(...xs)]

const cite = (a) => { const e = E.find((x) => x.a === a); return { t: e.t, a: e.a, x: e.settle, base: e.base, after: e.after } }
const times = (x) => x >= 10 ? Math.round(x) + ' times' : x >= 1 ? x.toFixed(1) + ' times' : x.toFixed(3) + ' times'

// The rows on the falling side that F5 already flagged: the before-window sits inside a
// scheduled event, so the level they are measured against is not a quiet one.
const insideEvent = (e) => Number.isFinite(e.lift) && e.lift < 1
const worst10 = S.slice(0, 10)

const out = {
  meta: { source: ev.meta.source, window: ev.meta.window, before: ev.meta.before, after: ev.meta.after },
  stat: {
    all: E.length,
    n: S.length,
    above: above.length,
    below: below.length,
    abovePct: +((100 * above.length) / S.length).toFixed(1),
    aboveRounded: Math.round((100 * above.length) / S.length),
    above2: S.filter((e) => e.settle > 2).length,
    above5: S.filter((e) => e.settle > 5).length,
    max: +Math.max(...xs).toFixed(4),
    min: +Math.min(...xs).toFixed(4),
    p25: q(xs, 0.25), p75: q(xs, 0.75),
    scheduledInWorst10: worst10.filter(insideEvent).length,
  },
  scale: {
    lo: LO, hi: HI, pivot: PIVOT,
    ticks: [0.01, 0.1, 1, 10, 100],
    labels: ['0.01x', '0.1x', '1x', '10x', '100x'],
    narrow: [0.01, 1, 100],
  },
  stops,
  risen: ['Tasuku_Honjo', 'Imane_Khelif'].map((a) => ({ ...cite(a), text: times(cite(a).x) })),
  fallen: ['J._D._Vance'].map((a) => ({ ...cite(a), text: times(cite(a).x) })),
  rows: S.map((e) => ({ t: e.t, a: e.a, x: e.settle, base: e.base, after: e.after })),
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

check('pages with a level before and a full year after', out.stat.n, 196)
check('of the 220 in the file', out.stat.all, 220)
check('ended above their normal level', out.stat.above, 86)
check('ended at or below it', out.stat.below, 110)
// the plate prints both counts, so they have to account for every page it says it drew
check('the two sides account for every page drawn', out.stat.above + out.stat.below, out.stat.n)
check('share above, %', out.stat.abovePct, 43.9)
check('and the page prints that as 44', out.stat.aboveRounded, 44)
check('above twice their normal level', out.stat.above2, 46)
check('above five times it', out.stat.above5, 14)

// --- the RELATION: "almost half" is a band, not a number -------------------
check('almost half, between 40 and 50 per cent',
  out.stat.abovePct > 40 && out.stat.abovePct < 50, true)
// and it is a near-half in BOTH directions: neither side may run away with the field
check('neither side is twice the other', Math.max(out.stat.above, out.stat.below) / Math.min(out.stat.above, out.stat.below) < 2, true)

// the named marks and the strings drawn beside them
check('Tasuku Honjo', +out.risen[0].x.toFixed(1), 507.9)
check('and as the plate prints it', out.risen[0].text, '508 times')
check('Tasuku Honjo, before and after', [out.risen[0].base, out.risen[0].after], [99, 50281])
check('Imane Khelif', +out.risen[1].x.toFixed(1), 189.4)
check('J. D. Vance', +out.fallen[0].x.toFixed(4), 0.0129)
check('and as the plate prints it', out.fallen[0].text, '0.013 times')
check('the biggest riser really is Honjo', S[S.length - 1].a, 'Tasuku_Honjo')
check('the biggest faller really is Vance', S[0].a, 'J._D._Vance')

// the honesty note the plate carries about its own falling side
check('scheduled events among the ten biggest fallers', out.stat.scheduledInWorst10, 5)
check('which is half of them', out.stat.scheduledInWorst10 * 2, worst10.length)

// the pivot has to sit between the quartiles or the ramp is not a diverging one
check('the quartiles straddle the pivot', out.stat.p25 < PIVOT && out.stat.p75 > PIVOT, true)
check('the quartiles', [out.stat.p25, out.stat.p75], [0.3692, 1.8201])

// nothing may be drawn outside the scale it is measured on
check('every mark sits inside the axis', S.filter((e) => e.settle < LO || e.settle > HI).length, 0)
check('the ramp stops rise', stops.every((s, i) => i === 0 || s > stops[i - 1]), true)
check('the ramp middle stop is the pivot', stops[2], PIVOT)
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
