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
 *
 * AND CORRECTED AT STEP 4, SECOND TIME ROUND (F13). The two pages that fall furthest in this
 * file are both titles that were MOVED during the year the site measures, so their series
 * after the move is the traffic to a redirect rather than to a readership. `01` has computed a
 * `renamed` flag since step 1 and nothing read it, while this plate printed one of the two as
 * its furthest-left page. The flag is now consumed here: the label marks the furthest-left
 * page whose title did not move, and the moved rows are named as moves in the method tail.
 * They are still DRAWN — a move is a real thing that happened to a real page, and cutting
 * eight rows out of a count would change the claim rather than correct it. What the guard
 * asserts instead is that the claim does not depend on them: the share ending above their own
 * level is 43.9% with the eight and 45.2% without.
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

// F13. The eight moved titles, and the field with them taken out. `renamed` is computed in
// 01 and this is the first thing that reads it, which is the whole point of the correction.
const moved = S.filter((e) => e.renamed)
const stayed = S.filter((e) => !e.renamed)
const staytAbove = stayed.filter((e) => e.settle > PIVOT)
const namedFaller = stayed[0]

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
    // the moved titles, and what the claim reads without them
    moved: moved.length,
    stayed: stayed.length,
    stayedAbove: staytAbove.length,
    stayedAbovePct: +((100 * staytAbove.length) / stayed.length).toFixed(1),
  },
  scale: {
    lo: LO, hi: HI, pivot: PIVOT,
    ticks: [0.01, 0.1, 1, 10, 100],
    labels: ['0.01x', '0.1x', '1x', '10x', '100x'],
    narrow: [0.01, 1, 100],
  },
  stops,
  risen: ['Tasuku_Honjo', 'Imane_Khelif'].map((a) => ({ ...cite(a), text: times(cite(a).x) })),
  // The plate's left-hand label. NOT S[0]: the two rows below this one are moved titles.
  fallen: [{ ...cite(namedFaller.a), text: times(namedFaller.settle) }],
  // Named in the method tail as moves, never as fallers.
  moves: moved.slice(0, 2).map((e) => ({ ...cite(e.a), text: times(e.settle) })),
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
check('the biggest riser really is Honjo', S[S.length - 1].a, 'Tasuku_Honjo')

// --- F13, the correction ---------------------------------------------------
// The two rows that fall furthest are both moved titles, so the plate may not name them as
// the pages that fell furthest. Every part of that sentence is asserted, because the day any
// of it stops being true is the day the label is wrong again.
check('the two pages that fall furthest were both moved', [S[0].a, S[1].a],
  ['J._D._Vance', 'Charles,_Prince_of_Wales'])
check('and 01 flags both of them as moved', [S[0].renamed, S[1].renamed], [true, true])
check('J. D. Vance, the furthest fall in the file', +S[0].settle.toFixed(4), 0.0129)
check('Charles, Prince of Wales, the second', +S[1].settle.toFixed(4), 0.0218)
check('moved titles in the field', out.stat.moved, 8)
check('and the rest', out.stat.stayed, 188)
check('which account for every page drawn', out.stat.moved + out.stat.stayed, out.stat.n)
// the label the plate actually draws
check('the plate names the furthest fall whose title did not move', out.fallen[0].a,
  'United_States_Electoral_College')
check('which is not itself a moved title', moved.some((e) => e.a === out.fallen[0].a), false)
check('and nothing between it and the wall stayed put',
  S.slice(0, S.indexOf(namedFaller)).every((e) => e.renamed), true)
check('as the plate prints it', [out.fallen[0].x, out.fallen[0].text], [0.0326, '0.033 times'])
// the claim does not rest on the eight
check('the share above without the moved titles, %', out.stat.stayedAbovePct, 45.2)
check('which is still almost half', out.stat.stayedAbovePct > 40 && out.stat.stayedAbovePct < 50, true)
check('and taking them out moves it by under 2 points',
  Math.abs(out.stat.stayedAbovePct - out.stat.abovePct) < 2, true)
// the two named in the method tail are the two moves, in that order
check('the method tail names the two moves', out.moves.map((m) => m.t),
  ['J. D. Vance', 'Charles, Prince of Wales'])
check('and prints them as', out.moves.map((m) => m.text), ['0.013 times', '0.022 times'])

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
