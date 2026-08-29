import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  prepare,
  cast,
  machineHole,
  residualSeries,
  residualSpan,
  correlate,
  sharedDays,
  partnerLift,
  returnDay,
  xorshift,
  sameDayNull,
  permuteMedian,
  titleTokens,
  sharedToken,
  chiSquare2x2,
  histogram,
  epochDay,
  isoDay,
  median,
  CAST_FROM,
  CAST_TO,
  CAST_MIN_DAYS,
  CAST_HALF,
  CAST_SHARED_MIN,
  CAST_NEAR,
  CAST_MONTHS,
  MACHINE_AT,
  MACHINE_AROUND,
  KNOWN_FLOOR,
  RETURN_LEVEL,
} from '../src/lib/findings.js'

const census = JSON.parse(readFileSync(new URL('../data/census/top-days.json', import.meta.url), 'utf8'))
const renamed = JSON.parse(readFileSync(new URL('../data/census/renamed.json', import.meta.url), 'utf8'))
const events = prepare(census.rows, renamed)
const c = cast(events)

const find = (a) => events.find((e) => e.article === a)
const constellation = (d) => c.constellations.find((k) => k.date === d)
const edge = (d, a, b) =>
  constellation(d).edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))

// ---------------------------------------------------------------------------
// The machinery, on values small enough to check by hand
// ---------------------------------------------------------------------------

describe('the primitives', () => {
  it('turns a date into a day number and back', () => {
    expect(epochDay('1970-01-01')).toBe(0)
    expect(epochDay('1970-01-02')).toBe(1)
    expect(isoDay(epochDay('2023-01-13'))).toBe('2023-01-13')
    expect(epochDay('2023-01-14') - epochDay('2023-01-13')).toBe(1)
  })

  it('correlates two series that were built to correlate', () => {
    const a = { start: 0, n: 400, values: new Float64Array(400), present: new Uint8Array(400).fill(1) }
    const b = { start: 0, n: 400, values: new Float64Array(400), present: new Uint8Array(400).fill(1) }
    for (let i = 0; i < 400; i++) {
      a.values[i] = Math.sin(i / 7)
      b.values[i] = Math.sin(i / 7)
    }
    expect(correlate(a, b).r).toBeCloseTo(1, 10)
    for (let i = 0; i < 400; i++) b.values[i] = -a.values[i]
    expect(correlate(a, b).r).toBeCloseTo(-1, 10)
  })

  it('refuses a pair that does not overlap enough', () => {
    const a = { start: 0, n: 400, values: new Float64Array(400), present: new Uint8Array(400).fill(1) }
    const b = { start: 300, n: 400, values: new Float64Array(400), present: new Uint8Array(400).fill(1) }
    for (let i = 0; i < 400; i++) { a.values[i] = i % 13; b.values[i] = i % 11 }
    expect(correlate(a, b)).toBe(null)
    expect(correlate(a, b, 0, 50)).not.toBe(null)
  })

  it('skips a day either side is missing rather than treating it as a zero', () => {
    const a = { start: 0, n: 10, values: Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), present: Uint8Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]) }
    const b = { start: 0, n: 10, values: Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 99]), present: Uint8Array.from([1, 1, 1, 1, 1, 1, 1, 1, 1, 0]) }
    expect(sharedDays(a, b).length).toBe(9)
    expect(correlate(a, b, 0, 5).r).toBeCloseTo(1, 10)
  })

  it('shifts one row by the lag it is given', () => {
    const a = { start: 0, n: 40, values: new Float64Array(40), present: new Uint8Array(40).fill(1) }
    const b = { start: 0, n: 40, values: new Float64Array(40), present: new Uint8Array(40).fill(1) }
    for (let i = 0; i < 40; i++) { a.values[i] = Math.sin(i / 3); b.values[i] = Math.sin((i - 1) / 3) }
    expect(correlate(a, b, 1, 10).r).toBeGreaterThan(correlate(a, b, 0, 10).r)
    expect(correlate(a, b, -1, 10).r).toBeLessThan(correlate(a, b, 0, 10).r)
  })

  it('draws the same numbers every run', () => {
    const a = xorshift(7), b = xorshift(7)
    const one = Array.from({ length: 5 }, a)
    const two = Array.from({ length: 5 }, b)
    expect(one).toEqual(two)
    expect(one.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(Array.from({ length: 5 }, xorshift(8))).not.toEqual(one)
  })

  it('splits a title into words, ignoring furniture and bare years', () => {
    expect([...titleTokens('2016_United_States_presidential_election')].sort()).toEqual(['election', 'presidential'])
    expect([...titleTokens('Prince_(musician)')].sort()).toEqual(['musician', 'prince'])
    expect(sharedToken('Joe_Biden', 'Jill_Biden')).toBe('biden')
    expect(sharedToken('Tom_Brady', 'The_Weeknd')).toBe(null)
    expect(sharedToken('United_States_Electoral_College', '2016_United_States_presidential_election')).toBe(null)
  })

  it('computes a 2x2 with the Yates correction', () => {
    expect(chiSquare2x2(8, 2, 2, 8).chi2).toBe(5)
    expect(chiSquare2x2(8, 2, 2, 8).p).toBeCloseTo(0.0253, 3)
    expect(chiSquare2x2(10, 10, 10, 10).chi2).toBe(0.1)
  })

  it('bins without dropping anything off either end', () => {
    const h = histogram([-9, -0.5, 0, 0.049, 0.99, 9], -0.4, 1, 0.05)
    expect(h.reduce((a, b) => a + b.n, 0)).toBe(6)
    expect(h[0].n).toBe(2)
    expect(h.at(-1).n).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// The machine test. Question_mark passed both shape tests in the gate.
// ---------------------------------------------------------------------------

describe('the machine test', () => {
  it('catches exactly one row of the 220', () => {
    expect(c.machine.n).toBe(1)
    expect(c.machine.found.map((m) => m.article)).toEqual(['Question_mark'])
  })

  it('names the three readings that convict it', () => {
    const m = c.machine.found[0]
    expect(m.date).toBe('2016-02-01')
    expect(m.day).toBe(2)
    expect([m.before, m.value, m.after]).toEqual([522905, 1142, 638607])
    expect(m.base).toBe(967)
    expect(m.value).toBeLessThanOrEqual(MACHINE_AT * m.base)
    expect(m.before).toBeGreaterThanOrEqual(MACHINE_AROUND * m.base)
    expect(m.after).toBeGreaterThanOrEqual(MACHINE_AROUND * m.base)
  })

  it('needs all three readings and refuses a page with no baseline', () => {
    expect(machineHole({ 0: 1e6, 1: 10, 2: 1e6 }, 100)).toEqual({ day: 1, before: 1e6, value: 10, after: 1e6, base: 100 })
    expect(machineHole({ 0: 1e6, 2: 1e6 }, 100)).toBe(null)
    expect(machineHole({ 0: 1e6, 1: 10, 2: 1e6 }, 0)).toBe(null)
    expect(machineHole({ 0: 1e6, 1: 400, 2: 1e6 }, 100)).toBe(null)
    expect(machineHole({ 0: 1e6, 1: 10, 2: 5000 }, 100)).toBe(null)
  })

  it('leaves the finding where it was, which is why it can be published', () => {
    expect(c.bond.rows).toBe(195)
    expect(c.bond.withMachine.rows).toBe(196)
    expect(c.bond.far.median).toBe(0.027)
    expect(c.bond.withMachine.far.median).toBe(0.026)
    expect(c.bond.same.median).toBe(0.567)
  })

  it('does not put the machine row in a cast', () => {
    expect(events.filter((e) => e.date === '2016-02-01').length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Part A. The cast exists.
// ---------------------------------------------------------------------------

describe('part A, the cast exists', () => {
  it('finds 47 rows in 19 groups', () => {
    expect(c.groups.total).toBe(220)
    expect(c.groups.inCast).toBe(47)
    expect(c.groups.share).toBe(21.4)
    expect(c.groups.casts).toBe(19)
    expect(c.groups.sizes).toEqual({ 2: 12, 3: 5, 4: 2 })
  })

  it('every group is a set of rows that really share one date', () => {
    for (const k of c.constellations) {
      expect(k.pages.length).toBeGreaterThan(1)
      expect(k.n).toBe(k.pages.length)
      for (const q of k.pages) expect(find(q.article).date).toBe(k.date)
    }
    expect(c.constellations.reduce((a, k) => a + k.n, 0)).toBe(47)
  })

  it('beats a null that holds the year, the month and the weekday fixed', () => {
    expect(c.groups.null.draws).toBe(20000)
    expect(c.groups.null.expected).toBe(25.4)
    expect(c.groups.null.expectedShare).toBe(11.5)
    expect(c.groups.null.p).toBeLessThan(5e-5)
  })

  it('holds the same-weekday constraint the null claims to hold', () => {
    // Every redraw slot for a date must be the same weekday in the same year and month.
    const d = new Date('2016-11-09T00:00:00Z')
    const same = sameDayNull(['2016-11-09'], [false], 99, 99, 1, 5)
    expect(same.expected).toBe(0)
    const many = sameDayNull(Array(40).fill('2016-11-09'), Array(40).fill(false), 40, 0, 20, 5)
    expect(many.expected).toBe(40)
    expect(d.getUTCDay()).toBe(3)
  })

  it('lands in February, March and November', () => {
    expect(CAST_MONTHS).toEqual([1, 2, 10])
    expect(c.groups.inMonths).toBe(32)
    expect(c.groups.monthShare).toBe(43.2)
    expect(c.groups.null.expectedTagged).toBe(15.6)
    expect(c.groups.null.pTagged).toBeLessThan(0.001)
    const byLabel = Object.fromEntries(c.groups.months.map((m) => [m.label, m]))
    expect([byLabel.Feb.inCast, byLabel.Mar.inCast, byLabel.Nov.inCast]).toEqual([11, 7, 14])
    expect([byLabel.Feb.n, byLabel.Mar.n, byLabel.Nov.n]).toEqual([33, 17, 24])
  })

  it('reports the empty months as a description and not as a test', () => {
    expect(c.groups.quietMonths).toEqual(['May', 'Jun', 'Jul', 'Oct'])
    expect(c.groups.quietMonthRows).toBe(56)
    for (const label of c.groups.quietMonths) {
      expect(c.groups.months.find((m) => m.label === label).inCast).toBe(0)
    }
  })

  it('counts every month exactly once', () => {
    expect(c.groups.months.reduce((a, m) => a + m.n, 0)).toBe(220)
    expect(c.groups.months.reduce((a, m) => a + m.inCast, 0)).toBe(47)
  })
})

// ---------------------------------------------------------------------------
// Part B. The cast stays bound.
// ---------------------------------------------------------------------------

describe('part B, the cast stays bound', () => {
  it('uses the window the premise fixes', () => {
    expect([CAST_FROM, CAST_TO, CAST_MIN_DAYS, CAST_HALF, CAST_SHARED_MIN, CAST_NEAR]).toEqual([30, 340, 250, 14, 150, 14])
    expect(c.bond.dropped).toEqual({ renamed: 8, machine: 1 })
  })

  it('separates the same-day pairs from every control', () => {
    expect(c.bond.same).toEqual({ n: 30, median: 0.567 })
    expect(c.bond.near.n).toBe(144)
    expect(c.bond.near.median).toBe(0.066)
    expect(c.bond.far.n).toBe(1428)
    expect(c.bond.far.median).toBe(0.027)
    expect(c.bond.farLong.n).toBe(382)
    expect(c.bond.farLong.median).toBe(0.016)
  })

  it('rules out the same news season, which is what the near bucket is for', () => {
    expect(c.bond.near.median).toBeLessThan(c.bond.same.median / 5)
    expect(c.bond.near.median).toBeGreaterThan(c.bond.far.median)
  })

  it('puts 23 of the 30 above the far-pair 95th percentile', () => {
    expect(c.bond.p95).toBe(0.328)
    expect(c.bond.aboveP95).toBe(23)
    expect(c.bond.permutation.draws).toBe(20000)
    expect(c.bond.permutation.p).toBeLessThan(5e-5)
  })

  it('survives dropping every pair whose titles share a word', () => {
    expect(c.bond.tokens.kept).toBe(22)
    expect(c.bond.tokens.median).toBe(0.396)
    expect(c.bond.tokens.dropped.length).toBe(8)
    expect(c.bond.tokens.kept + c.bond.tokens.dropped.length).toBe(c.bond.same.n)
    expect(c.bond.tokens.median).toBeGreaterThan(10 * c.bond.far.median)
  })

  it('peaks at the exact day and falls off either side of it', () => {
    const at = (k) => c.bond.lag.find((l) => l.lag === k).median
    expect(c.bond.lag.map((l) => l.lag)).toEqual([-3, -2, -1, 0, 1, 2, 3])
    expect(at(0)).toBe(0.567)
    expect([at(-1), at(1)]).toEqual([0.374, 0.401])
    expect([at(-2), at(2)]).toEqual([0.2, 0.211])
    expect([at(-3), at(3)]).toEqual([0.084, 0.123])
    for (const k of [-3, -2, -1, 1, 2, 3]) expect(at(k)).toBeLessThan(at(0))
    expect(at(0) - Math.max(at(-1), at(1))).toBeGreaterThan(0.15)
  })

  it('is still there in the last quarter of the year', () => {
    expect(c.bond.quarters.map((q) => [q.from, q.to])).toEqual([[30, 107], [108, 185], [186, 263], [264, 340]])
    expect(c.bond.quarters.map((q) => q.same.median)).toEqual([0.63, 0.507, 0.497, 0.372])
    const last = c.bond.quarters.at(-1)
    expect(last.same.median).toBeGreaterThan(10 * last.far.median)
  })

  it('binds a bigger cast more tightly', () => {
    expect(c.bond.bySize).toEqual([
      { size: 2, pairs: 10, median: 0.348 },
      { size: 3, pairs: 13, median: 0.456 },
      { size: 4, pairs: 7, median: 0.704 },
    ])
    expect(c.bond.bySize.reduce((a, b) => a + b.pairs, 0)).toBe(c.bond.same.n)
  })

  it('says what size of wiggle is being matched', () => {
    expect(c.bond.amplitude).toBe(0.096)
    expect(c.bond.swing).toBe(10.1)
    expect(c.bond.level).toBe(5812)
  })

  it('scores every same-day pair and sorts them', () => {
    expect(c.bond.pairs.length).toBe(30)
    for (let i = 1; i < c.bond.pairs.length; i++) expect(c.bond.pairs[i].r).toBeLessThanOrEqual(c.bond.pairs[i - 1].r)
    for (const p of c.bond.pairs) {
      expect(find(p.a).date).toBe(p.date)
      expect(find(p.b).date).toBe(p.date)
      expect(p.days).toBeGreaterThanOrEqual(CAST_SHARED_MIN)
    }
  })

  it('reproduces one pair end to end from the raw file', () => {
    const a = residualSeries(find('Lisa_Marie_Presley'))
    const b = residualSeries(find('Riley_Keough'))
    const r = correlate(a, b)
    expect(+r.r.toFixed(3)).toBe(0.9)
    expect(edge('2023-01-13', 'Lisa_Marie_Presley', 'Riley_Keough').r).toBe(0.9)
    // the residual really is the log reading less its own 29-day centred median
    const day = a.start + 100
    const raw = find('Lisa_Marie_Presley').series[CAST_FROM + 100]
    const window = []
    for (let d = CAST_FROM + 100 - CAST_HALF; d <= CAST_FROM + 100 + CAST_HALF; d++) {
      const v = find('Lisa_Marie_Presley').series[d]
      if (v !== undefined && v > 0) window.push(Math.log(v))
    }
    expect(a.values[day - a.start]).toBeCloseTo(Math.log(raw) - median(window), 12)
  })

  it('refuses a row that is short of readings', () => {
    const short = { article: 'x', date: '2020-01-01', series: {} }
    for (let d = CAST_FROM; d < CAST_FROM + 100; d++) short.series[d] = 1000
    expect(residualSeries(short)).toBe(null)
    expect(residualSpan(short, 30, 107, 65)).not.toBe(null)
  })
})

// ---------------------------------------------------------------------------
// Part C. The pairs that shared a date and nothing else.
// ---------------------------------------------------------------------------

describe('part C, the coincidences', () => {
  it('puts the two named coincidences at the bottom of the field', () => {
    expect(edge('2018-08-16', 'Aretha_Franklin', 'Atal_Bihari_Vajpayee').r).toBe(0.069)
    expect(edge('2021-02-08', 'Tom_Brady', 'The_Weeknd').r).toBe(0.046)
    expect(c.bond.pairs.at(-1)).toMatchObject({ a: 'Tom_Brady', b: 'The_Weeknd' })
    expect(c.bond.pairs.at(-2).a).toBe('Aretha_Franklin')
  })

  it('leaves them inside the distribution of pages that share nothing', () => {
    for (const r of [0.069, 0.046]) expect(r).toBeLessThan(c.bond.p95)
  })

  it('names all seven pairs the statistic does not separate', () => {
    const under = c.bond.pairs.filter((p) => p.r <= c.bond.p95)
    expect(under.length).toBe(7)
    expect(under.map((p) => `${p.a}/${p.b}`)).toEqual([
      'Prince_(musician)/Chyna',
      '2022_Russian_invasion_of_Ukraine/Vladimir_Putin',
      'Lionel_Messi/Kylian_Mbappé',
      'Shakira/Jennifer_Lopez',
      'Kylian_Mbappé/FIFA_World_Cup',
      'Aretha_Franklin/Atal_Bihari_Vajpayee',
      'Tom_Brady/The_Weeknd',
    ])
  })

  it('measures the tie to the rest of the field beside every cast page', () => {
    for (const k of c.constellations) {
      for (const q of k.pages) {
        if (!q.measured) { expect(q.elsewhere).toBe(null); continue }
        expect(Math.abs(q.elsewhere)).toBeLessThan(0.2)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The constellations, which are what the hero mark draws.
// ---------------------------------------------------------------------------

describe('the constellations', () => {
  it('measures 17 of the 19 and says why the other two cannot be', () => {
    expect(c.constellations.length).toBe(19)
    const unmeasured = c.constellations.filter((k) => k.median === null)
    expect(unmeasured.map((k) => k.date)).toEqual(['2021-04-09', '2026-02-20'])
    // one lost a page to the rename list, one has not yet had a year of readings
    expect(constellation('2021-04-09').pages.filter((q) => q.renamed).map((q) => q.article)).toEqual(['DMX_(rapper)'])
    expect(constellation('2026-02-20').pages.every((q) => !q.renamed && !q.machine)).toBe(true)
    for (const q of constellation('2026-02-20').pages) expect(residualSeries(find(q.article))).toBe(null)
  })

  it('agrees with the premise on every measured constellation', () => {
    const table = {
      '2023-01-13': 0.884, '2020-11-04': 0.817, '2022-09-08': 0.816, '2016-11-09': 0.714,
      '2022-03-28': 0.698, '2020-11-08': 0.69, '2024-11-06': 0.624, '2025-03-03': 0.456,
      '2022-02-24': 0.407, '2024-11-16': 0.386, '2023-03-13': 0.354, '2016-02-29': 0.341,
      '2016-04-21': 0.303, '2022-12-18': 0.253, '2020-02-03': 0.251, '2018-08-16': 0.069,
      '2021-02-08': 0.046,
    }
    for (const [date, r] of Object.entries(table)) expect(constellation(date).median).toBe(r)
    expect(median(Object.values(table))).toBe(0.407)
  })

  it('carries every edge the mark has to draw', () => {
    expect(c.constellations.reduce((a, k) => a + k.edges.length, 0)).toBe(30)
    for (const k of c.constellations) {
      const m = k.measured
      expect(k.edges.length).toBe(m < 2 ? 0 : (m * (m - 1)) / 2)
      for (const e of k.edges) {
        expect(k.pages.map((q) => q.article)).toContain(e.a)
        expect(k.pages.map((q) => q.article)).toContain(e.b)
        expect(e.r).toBeGreaterThanOrEqual(-1)
        expect(e.r).toBeLessThanOrEqual(1)
      }
    }
  })

  it('translates a correlation into readers', () => {
    const e = edge('2020-11-08', 'Joe_Biden', 'Beau_Biden')
    expect(e.r).toBe(0.827)
    // on Joe Biden's most unusual days Beau Biden sat 3.6x his own level
    expect(e.lift).toBeCloseTo(3.629, 2)
    expect(e.mirror).toBeCloseTo(1.709, 2)
    const flat = edge('2021-02-08', 'Tom_Brady', 'The_Weeknd')
    expect(flat.lift).toBeLessThan(1.1)
    expect(flat.mirror).toBeLessThan(1.1)
  })

  it('takes the top five per cent of a row, and at least five days', () => {
    const a = residualSeries(find('Anora'))
    const b = residualSeries(find('Mikey_Madison'))
    const lift = partnerLift(a, b)
    expect(lift.k).toBe(Math.max(5, Math.round(0.05 * lift.shared)))
    expect(lift.shared).toBeGreaterThanOrEqual(CAST_SHARED_MIN)
  })

  it('holds the record day itself, which is the size of the mark', () => {
    const k = constellation('2022-09-08')
    expect(k.combined).toBe(8399082 + 2101848 + 1509859)
    expect(k.leadShare).toBe(69.9)
    expect(k.pages[0].article).toBe('Elizabeth_II')
    for (const j of c.constellations) {
      expect(j.combined).toBe(j.pages.reduce((a, q) => a + q.peak, 0))
      for (let i = 1; i < j.pages.length; i++) expect(j.pages[i].peak).toBeLessThanOrEqual(j.pages[i - 1].peak)
    }
  })

  it('shows a cast has a core and a fringe', () => {
    expect(constellation('2022-02-24').spread).toBe(0.435)
    expect(constellation('2023-01-13').spread).toBe(0.154)
    const loosest = constellation('2022-02-24').edges.slice().sort((a, b) => a.r - b.r)[0]
    expect([loosest.a, loosest.b].sort()).toEqual(['2022_Russian_invasion_of_Ukraine', 'Vladimir_Putin'])
  })
})

// ---------------------------------------------------------------------------
// The two kinds of record day.
// ---------------------------------------------------------------------------

describe('the two kinds of record day', () => {
  it('splits every row into one of the two', () => {
    expect(c.fame.cast.n + c.fame.solo.n).toBe(220)
    expect(c.fame.cast.n).toBe(47)
    expect(c.fame.solo.n).toBe(173)
  })

  it('finds the cast page was already being read and the solo page was not', () => {
    expect(c.fame.cast.base).toBe(30107)
    expect(c.fame.solo.base).toBe(3947)
    expect(c.fame.baseRatio).toBe(7.6)
    expect(c.fame.test.z).toBe(-6.704)
    expect(c.fame.test.p).toBeLessThan(0.0001)
    expect(c.fame.test.n1).toBe(46)
    expect(c.fame.test.n2).toBe(168)
  })

  it('finds the two record days are the same size, which is the point', () => {
    expect(c.fame.cast.peak).toBe(2095287)
    expect(c.fame.solo.peak).toBe(2092734)
    expect(c.fame.peakGap).toBe(0.1)
  })

  it('finds the solo page multiplies itself an order of magnitude harder', () => {
    expect(c.fame.cast.lift).toBe(68)
    expect(c.fame.solo.lift).toBe(587)
    expect(c.fame.solo.lift / c.fame.cast.lift).toBeGreaterThan(8)
  })

  it('holds the validity floor rather than dividing by a page that did not exist', () => {
    expect(c.fame.floor).toBe(KNOWN_FLOOR)
    expect(c.fame.cast.underFloor).toBe(1)
    expect(c.fame.solo.underFloor).toBe(5)
    expect(c.fame.test.n1 + c.fame.cast.underFloor).toBe(c.fame.cast.n)
    expect(c.fame.test.n2 + c.fame.solo.underFloor).toBe(c.fame.solo.n)
  })
})

// ---------------------------------------------------------------------------
// They come down together. No detrending, no logs, no residuals.
// ---------------------------------------------------------------------------

describe('they come down together', () => {
  it('measures the day the page is back at one and a half times its own base', () => {
    expect(c.back.level).toBe(RETURN_LEVEL)
    expect(returnDay(find('Lisa_Marie_Presley'))).toBe(25)
    expect(returnDay(find('Riley_Keough'))).toBe(25)
    expect(returnDay(find('Priscilla_Presley'))).toBe(24)
  })

  it('finds two days between castmates and twenty-seven between strangers', () => {
    expect(c.back.same).toEqual({ n: 29, median: 2, withinThree: 62.1 })
    expect(c.back.near.median).toBe(22)
    expect(c.back.far.median).toBe(27)
    expect(c.back.far.n).toBe(14383)
    expect(c.back.permutation.p).toBeLessThan(5e-5)
  })

  it('is not the near-miss control in disguise', () => {
    expect(c.back.near.withinThree).toBeLessThan(c.back.same.withinThree / 3)
    expect(c.back.far.withinThree).toBe(9.1)
  })

  it('leaves a page out rather than guessing at a day it has no reading for', () => {
    const rows = c.back.rows.flatMap((r) => r.pages)
    expect(rows.length).toBe(47)
    // three renamed titles, plus the page that was created for its own event and so
    // has no baseline to come back to
    expect(rows.filter((q) => q.day === null).map((q) => q.article).sort()).toEqual([
      '2022_Russian_invasion_of_Ukraine',
      'Charles,_Prince_of_Wales',
      'DMX_(rapper)',
      'Electoral_College_(United_States)',
      'United_States_presidential_election,_2016',
    ])
    expect(find('2022_Russian_invasion_of_Ukraine').base).toBe(0)
  })

  it('disagrees with the correlation on the one pair that shared a real event', () => {
    // Brady and The Weeknd were at the same Super Bowl, so they fell together;
    // only the residual tie tells the two subjects apart.
    const superbowl = c.back.rows.find((r) => r.date === '2021-02-08').pages.map((q) => q.day)
    expect(Math.abs(superbowl[0] - superbowl[1])).toBe(1)
    const deaths = c.back.rows.find((r) => r.date === '2018-08-16').pages.map((q) => q.day)
    expect(Math.abs(deaths[0] - deaths[1])).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// The run-up matches too.
// ---------------------------------------------------------------------------

describe('the run-up matches too', () => {
  it('counts pairs that had the identical number of days of warning', () => {
    expect(c.runup.same).toEqual({ n: 37, identical: 21, share: 56.8, median: 0 })
    expect(c.runup.far.n).toBe(23435)
    expect(c.runup.far.identical).toBe(5225)
    expect(c.runup.far.share).toBe(22.3)
    expect(c.runup.far.median).toBe(2)
  })

  it('carries a computed test rather than an assertion', () => {
    expect(c.runup.test.chi2).toBe(23.33)
    expect(c.runup.test.df).toBe(1)
    expect(c.runup.test.p).toBeLessThan(1e-5)
  })

  it('uses more pairs than the bond does, because a run-up needs no aftermath', () => {
    expect(c.runup.same.n).toBeGreaterThan(c.bond.same.n)
  })
})

// ---------------------------------------------------------------------------
// The permutations, checked against cases with a known answer.
// ---------------------------------------------------------------------------

describe('the permutations', () => {
  it('cannot report a p below one over the draws plus one', () => {
    const r = permuteMedian([0, 0, 0], 3, 99, false, 100, 1)
    expect(r.p).toBe(1 / 101)
    expect(r.draws).toBe(100)
  })

  it('reports one when the observed value is the pool itself', () => {
    expect(permuteMedian([5, 5, 5], 3, 5, false, 100, 1).p).toBe(1)
    expect(permuteMedian([5, 5, 5], 3, 5, true, 100, 1).p).toBe(1)
  })

  it('runs the lower tail when it is asked to', () => {
    expect(permuteMedian([1, 2, 3, 4, 5], 3, 1, true, 2000, 3).p).toBeLessThan(0.2)
    expect(permuteMedian([1, 2, 3, 4, 5], 3, 1, false, 2000, 3).p).toBeGreaterThan(0.9)
  })
})
