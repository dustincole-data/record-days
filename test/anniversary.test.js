import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  prepare,
  anniversary,
  anniv,
  quiet,
  lead,
  bump,
  echoAt,
  bestEcho,
  numbered,
  median,
  KNOWN_FLOOR,
  QUIET_FROM,
  QUIET_TO,
  QUIET_MIN_DAYS,
  ECHO_WINDOW,
} from '../src/lib/findings.js'
import { allowedFrom, untraceable, strip, BANNED_REGISTER, EM_DASH } from './provenance.js'

const census = JSON.parse(readFileSync('data/census/top-days.json', 'utf8'))
const renamed = JSON.parse(readFileSync('data/census/renamed.json', 'utf8'))
const events = prepare(census.rows, renamed)
const a = anniversary(events)
const day = (d) => a.curve.find((p) => p.d === d).m
const control = (k) => a.control[k]
const split = (label) => a.splits.find((s) => s.label === label)

// The premise was settled from throwaway scripts and its figures were recorded in
// .claude/plans/2026-08-27-anniversary-premise.md. This file is the port's receipt: the
// definitions live in src/lib/findings.js now, and every figure the plan recorded is
// re-derived here. A definition that drifts moves one of these and goes red.

describe('the definitions the plan fixed', () => {
  it('measures the quiet level over days 100 to 340 against the published floor', () => {
    expect([QUIET_FROM, QUIET_TO, QUIET_MIN_DAYS, KNOWN_FLOOR]).toEqual([100, 340, 200, 20])
    const short = { 100: 5000, 101: 5000 }
    expect(quiet(short)).toBeNull()
    const low = {}
    for (let d = QUIET_FROM; d <= QUIET_TO; d++) low[d] = KNOWN_FLOOR - 1
    expect(quiet(low)).toBeNull()
    const fine = {}
    for (let d = QUIET_FROM; d <= QUIET_TO; d++) fine[d] = 100
    expect(quiet(fine)).toBe(100)
  })

  it('keeps 203 of the 220 rows', () => {
    expect(census.rows.length).toBe(220)
    expect(a.n).toBe(203)
    expect(a.quiet.dropped).toBe(17)
  })

  it('counts whole calendar days to the same month and day, not a fixed 365', () => {
    expect(anniv('2019-06-01')).toBe(366) // 29 February 2020 falls inside
    expect(anniv('2020-06-01')).toBe(365)
    expect(anniv('2016-02-29')).toBe(366) // no counterpart, so the day after
    expect(a.annivDays).toEqual({ 365: 162, 366: 41 })
  })

  it('counts a day of warning as a day already at twice the published baseline', () => {
    expect(lead({ '-1': 200, '-2': 200, '-3': 50 }, 100)).toBe(2)
    expect(lead({ '-1': 199 }, 100)).toBe(0)
    expect(lead({ '-1': 999 }, 0)).toBeNull() // a page created for its own event
    expect(a.leadEdge.n).toBe(218)
  })

  it('runs the placebo geometry unchanged at every centre', () => {
    // Same window, same floor, same minimum counts. Only the centre moves.
    const row = events.find((e) => e.article === 'Elizabeth_II') ?? events[0]
    expect(bump(row.series, 200)).toBeGreaterThan(0)
    expect(bump({ 200: 5000 }, 200)).toBeNull() // too few window days
    expect(a.placebo.centres.map((p) => p.centre)).toEqual(
      Array.from({ length: 16 }, (_, i) => 110 + 15 * i)
    )
  })

  it('reads an echo as a multiple of the row\'s own quiet level', () => {
    const row = { quiet: 1000, anniv: 365, series: { 365: 2500, 366: 4000 } }
    expect(echoAt(row, 0)).toBe(2.5)
    expect(echoAt(row, 5)).toBeNull()
    expect(bestEcho(row, 12)).toEqual({ value: 4, offset: 1 })
  })

  it('reads a parenthesised year as a disambiguator, not as a numbered occasion', () => {
    expect(numbered('88th_Academy_Awards')).toBe(true)
    expect(numbered('2022_FIFA_World_Cup')).toBe(true)
    expect(numbered('Moonlight_(2016_film)')).toBe(false)
    expect(numbered('Royal_Rumble_(2024)')).toBe(false)
  })
})

describe('the curve', () => {
  it('is flat for the whole year between the fall and the anniversary', () => {
    expect(a.plain.median).toBe(0.99)
    expect(a.plain.high).toEqual({ d: 106, m: 1.2, n: expect.any(Number) })
  })

  it('lifts and falls back across six days', () => {
    expect([363, 364, 365, 366, 367, 372].map(day)).toEqual([1.2, 1.49, 1.83, 1.53, 1.3, 1.06])
  })

  it('has nearly half the rows at or above twice their quiet level on day 365', () => {
    expect(a.at365).toEqual({ n: 199, over2: 44.7 })
  })
})

describe('the placebo', () => {
  it('finds nothing like it at 16 other centres', () => {
    expect([a.placebo.medianLo, a.placebo.medianHi]).toEqual([1.4, 1.68])
    expect([a.placebo.over2Lo, a.placebo.over2Hi]).toEqual([29.1, 40.5])
    expect([a.placebo.over3Lo, a.placebo.over3Hi]).toEqual([13.3, 24.9])
  })

  it('reads 3.10 at the anniversary itself', () => {
    expect(a.placebo.real).toEqual({ centre: 365, n: 196, median: 3.1, over2: 71.4, over3: 51.5 })
  })

  it('separates the anniversary from every placebo centre by more than the centres vary', () => {
    expect(a.placebo.real.median).toBeGreaterThan(a.placebo.medianHi + (a.placebo.medianHi - a.placebo.medianLo))
  })
})

describe('the control', () => {
  it('scores the whole set at the anniversary', () => {
    expect(control('all')).toMatchObject({ n: 203, day0: 1.85, over2: 68.5, best: 3.19 })
  })

  it('has the events that arrived without warning echoing hardest', () => {
    expect(control('ambush')).toMatchObject({ n: 80, day0: 2.65, over2: 68.8, best: 3.61 })
    expect(control('ramp')).toMatchObject({ n: 69, day0: 1.48, over2: 63.8, best: 2.53 })
    // The whole weight of the piece rests on this ordering. Scheduled events echo
    // weakest, so what is being seen is not a set of recurring fixtures.
    expect(control('ambush').day0).toBeGreaterThan(control('ramp').day0)
  })

  it('keeps a row with no reading at the anniversary inside its group', () => {
    // Four of the 203 stop short of a full year. Dropping them would raise every share
    // and every median in the table by counting an unobserved anniversary as an absent
    // one, so they stay in the denominator and sort below every observed row.
    expect(control('all').n).toBe(203)
    expect(control('all').observed).toBe(199)
    expect(control('all').n).toBeGreaterThan(control('all').observed)
  })

  it('draws the ambush curve as a two day lift on a flat year', () => {
    const at = (o) => a.ambushCurve.find((p) => p.off === o).m
    expect([-6, -4, -2, -1, 0, 1, 2, 5, 8].map(at)).toEqual([1.12, 1.04, 1.14, 1.4, 2.79, 1.86, 1.38, 1.05, 0.98])
  })

  it('holds across the splits that could have explained it away', () => {
    expect(split('title carries a year or an ordinal')).toMatchObject({
      yes: expect.objectContaining({ n: 10, day0: 1.65 }),
      no: expect.objectContaining({ n: 193, day0: 1.9 }),
    })
    expect(split('peak under two million')).toMatchObject({
      yes: expect.objectContaining({ n: 99, day0: 1.58 }),
      no: expect.objectContaining({ n: 104, day0: 2.07 }),
    })
    expect(split('first half of the record')).toMatchObject({
      yes: expect.objectContaining({ n: 101, day0: 2 }),
      no: expect.objectContaining({ n: 102, day0: 1.71 }),
    })
  })
})

describe('where it lands, and how large it is', () => {
  it('lands on the calendar date', () => {
    expect(a.landing.n).toBe(139)
    expect(a.landing.mode).toEqual(['0', 40])
    expect(a.landing.hist['-1']).toBe(32)
    expect(a.landing.withinOne).toBe(56.1)
  })

  it('records the multiple-of-seven landings the definition actually finds', () => {
    // The plan recorded 6.5% here from a throwaway script. The definition it states,
    // 2 or more days out and a whole number of weeks from the date, finds 3 rows of the
    // 139. The computed figure is the one that ships; 6.5% is the count of rows landing
    // 7 or 8 days out, which is a different question.
    expect(a.landing.weekOutN).toBe(3)
    expect(a.landing.weekOut).toBe(2.2)
  })

  it('is a thousandth of the day that put the page on the list', () => {
    expect(a.scale.shareOfPeak).toBe(0.74)
    expect(a.scale.days.median).toBe(2)
  })

  it('names the rows that never come back', () => {
    expect(a.scale.neverBack.n).toBe(26)
    expect(a.scale.neverBack.share).toBe(12.8)
    expect(a.scale.neverBack.names.slice(0, 4)).toEqual(['Donald_Trump', 'J._D._Vance', 'Tim_Walz', 'Lionel_Messi'])
  })

  it('names the largest echoes as a share of their own peak', () => {
    expect(a.scale.largest.slice(0, 5)).toEqual([
      { article: 'Jannik_Sinner', peak: expect.any(Number), share: 40.3 },
      { article: 'Dulce_María', peak: expect.any(Number), share: 31.3 },
      { article: 'Diogo_Jota', peak: expect.any(Number), share: 15.1 },
      { article: 'Peyton_Manning', peak: expect.any(Number), share: 7.9 },
      { article: '88th_Academy_Awards', peak: expect.any(Number), share: 5.7 },
    ])
  })
})

describe('the leading edge', () => {
  it('splits the 218 measurable rows three ways', () => {
    expect(a.leadEdge).toMatchObject({ n: 218, ambush: 90, warned: 57, ramp: 71, ambushShare: 41.3, rampShare: 32.6 })
    expect(a.leadEdge.ambush + a.leadEdge.warned + a.leadEdge.ramp).toBe(a.leadEdge.n)
  })

  it('shows the two kinds apart on the day before', () => {
    expect(a.leadEdge.dayBefore).toEqual({ ambush: 0.96, ramp: 14.33 })
    expect(a.leadEdge.longest[0]).toEqual({ article: 'Brett_Kavanaugh', lead: 13 })
  })
})

describe('one anniversary, and only one', () => {
  it('never reads past the last day the census holds', () => {
    // The series stops at day 400, so exactly one anniversary is observable. Nothing
    // here may reach for a second one.
    const furthest = Math.max(...a.rows.map((r) => r.anniv + ECHO_WINDOW))
    expect(furthest).toBeLessThanOrEqual(400)
    expect(Math.max(...a.curve.map((p) => p.d))).toBeLessThanOrEqual(400)
  })

  it('carries one row per surviving article and nothing invented', () => {
    expect(a.rows).toHaveLength(203)
    const titles = new Set(census.rows.map((r) => r.article))
    for (const r of a.rows) expect(titles.has(r.article), r.article).toBe(true)
  })

  it('counts users only, and never reads the all-agents probe', () => {
    const source = readFileSync('src/lib/findings.js', 'utf8')
    expect(source).not.toMatch(/data\/probe/)
    expect(census.meta.agents).toContain('users only')
  })
})

describe('the number-provenance gate', () => {
  const allowed = allowedFrom(a)

  it('clears a figure the analysis produced', () => {
    expect(untraceable(`The set holds ${a.n} rows.`, allowed)).toEqual([])
    expect(untraceable(`It reads ${control('all').day0} times its quiet level.`, allowed)).toEqual([])
    expect(untraceable(`${a.landing.withinOne}% land within a day.`, allowed)).toEqual([])
  })

  it('catches a figure that was typed in', () => {
    // The gate is only worth having if it goes red on a number with no row behind it.
    // The invented figure is picked by asking the allowed set, so this cannot pass by
    // accidentally naming something the data happens to hold.
    let invented = 1000
    while (allowed.has(String(invented))) invented++
    expect(untraceable(`Roughly ${invented.toLocaleString('en-US')} of them came back.`, allowed)).toEqual([String(invented)])
    expect(untraceable('It reads 7.77 times its quiet level.', allowed)).toEqual(['7.77'])
  })

  it('is narrow enough to be worth running', () => {
    // A gate that clears most numbers is not a gate. Fewer than one in twenty
    // four-digit figures and one in three hundred five-digit figures get through.
    const cleared = (lo, hi) => {
      let n = 0
      for (let i = lo; i < hi; i++) if (allowed.has(String(i))) n++
      return n / (hi - lo)
    }
    expect(cleared(1000, 10000)).toBeLessThan(0.05)
    expect(cleared(10000, 100000)).toBeLessThan(0.005)
  })

  it('will not clear a figure taken from the all-agents probe', () => {
    // Elizabeth II peaked at 8,399,082 in data/probe and 10,312,178 in the census. The
    // gate is built from the census, so the probe figure has nowhere to come from and
    // the two cannot be mixed inside one sentence.
    const probe = JSON.parse(readFileSync('data/probe/results2.json', 'utf8'))
    const mismatched = probe.find((r) => r.article === 'Elizabeth II')
    expect(untraceable(String(mismatched.peak), allowed)).toEqual([String(mismatched.peak)])
  })

  it('reads copy out of markup and leaves styles and scripts alone', () => {
    const html = '<style>.a{width:9999px}</style><script>const n=8888</script><p>Held at 203 rows.</p>'
    expect(strip(html)).not.toContain('9999')
    expect(untraceable(strip(html), allowed)).toEqual([])
  })

  it('holds the register the constraint names', () => {
    // Both lines are Dustin's verbatim constraints and neither has been lifted. The
    // gate is exercised here so it cannot rot before the page it guards exists.
    expect('The floor sits where it sits.').not.toMatch(BANNED_REGISTER)
    expect('It fell because nobody looked.').toMatch(BANNED_REGISTER)
    expect(BANNED_REGISTER.test('a lasting legacy')).toBe(true)
    expect('day 365 to day 366').not.toContain(EM_DASH)
  })
})
