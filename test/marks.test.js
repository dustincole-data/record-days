import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { hero, heroLayout, heroSvg } from '../src/lib/marks/hero.js'
import { famePanel, fameSvg } from '../src/lib/marks/fame.js'
import { back, backLayout, backSvg } from '../src/lib/marks/back.js'
import { lag, lagLayout, lagSvg } from '../src/lib/marks/lag.js'
import { wrapList, wrapWords, advance, tieScale, tieTicks, TIE_MIN, TIE_MAX } from '../src/lib/marks/lib.js'

// The sheets are pure functions of the data and one width, so the things that make them
// true can be asserted without a browser: that the order is the order the claim rests on,
// that two marks sharing a scale really do share it, that nothing is drawn outside the
// sheet it belongs to, and that a narrow sheet is a different sheet rather than a small
// one. The legibility of the result is the harness's job, not this file's.
const c = JSON.parse(readFileSync('data/census/cast.json', 'utf8'))

const WIDTHS = [1440, 1320, 1180, 1000, 900, 820, 700, 560, 430, 390, 360, 320]
const textX = (svg) => [...svg.matchAll(/<text x="(-?[\d.]+)"/g)].map((m) => Number(m[1]))
const boxOf = (svg) => {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  return { w: Number(m[1]), h: Number(m[2]) }
}

describe('the relations the claims rest on', () => {
  it('ranks the three tie buckets in the order the page states', () => {
    expect(c.bond.same.median).toBeGreaterThan(c.bond.near.median)
    expect(c.bond.near.median).toBeGreaterThan(c.bond.far.median)
    // "an order of magnitude above the strangers" has to survive the title control
    expect(c.bond.tokens.median).toBeGreaterThan(10 * c.bond.far.median)
  })

  it('ranks the three coming-down buckets the same way round', () => {
    expect(c.back.same.median).toBeLessThan(c.back.near.median)
    expect(c.back.near.median).toBeLessThan(c.back.far.median)
    expect(c.back.same.withinThree).toBeGreaterThan(c.back.near.withinThree)
    expect(c.back.near.withinThree).toBeGreaterThan(c.back.far.withinThree)
  })

  it('peaks the lag curve on the aligned day and falls away on both sides', () => {
    const by = Object.fromEntries(c.bond.lag.map((l) => [l.lag, l.median]))
    expect(by[0]).toBeGreaterThan(by[-1])
    expect(by[0]).toBeGreaterThan(by[1])
    for (const k of [1, 2]) {
      expect(by[-k]).toBeGreaterThan(by[-k - 1])
      expect(by[k]).toBeGreaterThan(by[k + 1])
    }
    // three days out and the row has fallen back inside the stranger band
    expect(by[-3]).toBeLessThan(c.bond.p95)
    expect(by[3]).toBeLessThan(c.bond.p95)
  })

  it('holds the two halves of the record-day reversal apart', () => {
    expect(c.fame.cast.base).toBeGreaterThan(c.fame.solo.base)
    expect(Math.abs(c.fame.cast.peak - c.fame.solo.peak) / c.fame.solo.peak * 100).toBeLessThan(1)
    expect(c.fame.solo.lift).toBeGreaterThan(c.fame.cast.lift)
  })

  it('keeps every group with no measurable tie, rather than scoring it zero', () => {
    const unmeasured = c.constellations.filter((k) => k.median === null)
    expect(unmeasured).toHaveLength(2)
    const svg = heroSvg(c, 1180).svg
    for (const k of unmeasured) expect(svg).toContain(k.date)
    expect(svg).toContain('NO MEASUREMENT')
    // and every page inside a measured group that has no tie is still drawn
    for (const k of c.constellations) {
      for (const p of k.pages) expect(svg).toContain(p.article.replace(/_/g, ' ').replace(/&/g, '&amp;'))
    }
  })
})

describe('the ruler the hero and the lag sheet share', () => {
  it('is one domain and one tick set', () => {
    expect(TIE_MIN).toBeLessThan(Math.min(...c.bond.farValues, ...c.bond.same.median ? [c.bond.same.median] : []))
    expect(TIE_MAX).toBeGreaterThan(Math.max(...c.constellations.filter((k) => k.median !== null).map((k) => k.median)))
    expect(tieTicks(800)).toEqual([-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8])
    expect(tieTicks(280)).toEqual([-0.4, 0, 0.4, 0.8])
  })

  it('maps a value to the same offset in both sheets at the same plot width', () => {
    const s = tieScale(100, 900)
    for (const v of [-0.4, 0, 0.567, 0.9]) expect(s(v)).toBeCloseTo(100 + ((v + 0.5) / 1.45) * 800, 6)
  })

  it('draws the same stranger band on both sheets', () => {
    for (const svg of [heroSvg(c, 1180).svg, lagSvg(c, 1180).svg]) {
      expect(svg).toContain('fill="#D6740E" opacity="0.1"')
    }
  })
})

describe('every sheet reflows to the width it is given', () => {
  for (const w of WIDTHS) {
    it(`fits inside ${w}px`, () => {
      const sheets = [heroSvg(c, w), backSvg(c, w), lagSvg(c, w), ...fameSvg(c, w)]
      for (const s of sheets) {
        const box = boxOf(s.svg)
        expect(box.w).toBe(w)
        expect(box.h).toBeGreaterThan(0)
        for (const x of textX(s.svg)) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThanOrEqual(w)
        }
      }
    })
  }

  it('is a different sheet on a phone, not a smaller one', () => {
    const wide = heroLayout(1320)
    const narrow = heroLayout(390)
    expect(wide.side).toBe(true)
    expect(narrow.side).toBe(false)
    // three columns wide, one column narrow: the ruler takes the whole sheet
    expect(wide.plotL).toBeGreaterThan(wide.pad)
    expect(narrow.plotL).toBe(narrow.pad)
    expect(narrow.plotR).toBe(390 - narrow.pad)
    // and the sheet gets taller as it gets narrower, which a scaled sheet never does
    expect(hero(c, 390).height).toBeGreaterThan(hero(c, 1320).height)
    expect(back(c, 390).height).toBeGreaterThan(back(c, 1320).height)
  })

  it('keeps the discs and the gaps in proportion to the ruler', () => {
    for (const w of WIDTHS) {
      const L = heroLayout(w)
      expect(L.radius).toBeGreaterThanOrEqual(12)
      expect(L.radius).toBeLessThanOrEqual(22)
      expect(L.sep).toBeGreaterThanOrEqual(34)
      expect(L.plotR).toBeLessThanOrEqual(w - L.pad)
      expect(L.plotL).toBeGreaterThanOrEqual(L.pad)
    }
  })

  it('never leaves a label wider than the room it was wrapped to', () => {
    const room = 200
    const names = c.constellations.flatMap((k) => k.pages.map((p) => p.article.replace(/_/g, ' ')))
    for (const line of wrapList(names.slice(0, 6), room, 13)) {
      expect(advance(line, 13)).toBeLessThanOrEqual(room + 0.5)
    }
    // a single title too long for the column breaks on its spaces rather than running off
    const long = wrapList(['United States presidential election, 2016'], 120, 13)
    expect(long.length).toBeGreaterThan(1)
    for (const line of long) expect(advance(line, 13)).toBeLessThanOrEqual(120.5)
    // and a break never strands the separator on a line of its own
    expect(long).not.toContain('+')
  })

  it('accounts for tracking when it wraps a tracked heading', () => {
    const s = 'HOW CLOSELY THE TWO PAGES MOVED FOR THE YEAR AFTER'
    expect(advance(s, 13, 600, 0.9)).toBeGreaterThan(advance(s, 13, 600, 0))
    for (const line of wrapWords(s, 300, 13, advance, 600, 0.9)) {
      expect(advance(line, 13, 600, 0.9)).toBeLessThanOrEqual(300.5)
    }
  })
})

describe('the sheets are deterministic', () => {
  it('draws byte-identical svg for the same data and width', () => {
    for (const w of [1180, 390]) {
      expect(heroSvg(c, w).svg).toBe(heroSvg(c, w).svg)
      expect(backSvg(c, w).svg).toBe(backSvg(c, w).svg)
      expect(lagSvg(c, w).svg).toBe(lagSvg(c, w).svg)
    }
  })

  it('carries an alt text that states the finding rather than naming the chart', () => {
    for (const s of [heroSvg(c, 1180), backSvg(c, 1180), lagSvg(c, 1180), ...fameSvg(c, 560)]) {
      expect(s.svg).toContain('role="img"')
      expect(s.label.length).toBeGreaterThan(60)
      expect(s.label).toMatch(/\d/)
    }
  })
})

describe('the controls are drawn as themselves', () => {
  it('puts every far pair and every near pair on the hero sheet', () => {
    const svg = heroSvg(c, 1320).svg
    const inRange = (vs) => vs.filter((v) => v >= TIE_MIN && v <= TIE_MAX).length
    const ticks = (svg.match(/stroke-width="1" opacity="0.5"/g) ?? []).length
    // the sheet's two fields plus the legend's sample of the far field
    const legendFar = Math.ceil(c.bond.farValues.length / 3)
    expect(ticks).toBeGreaterThanOrEqual(inRange(c.bond.farValues) + inRange(c.bond.nearValues))
    expect(ticks).toBeLessThanOrEqual(
      c.bond.farValues.length + c.bond.nearValues.length + legendFar + c.bond.nearValues.length
    )
  })

  it('draws one dot per pair at every lag', () => {
    const svg = lagSvg(c, 1320).svg
    const dots = (svg.match(/<circle /g) ?? []).length
    expect(dots).toBe(c.bond.lag.reduce((a, l) => a + l.values.length, 0))
  })

  it('draws one dot per page in each fame panel', () => {
    for (const p of fameSvg(c, 620)) {
      const dots = (p.svg.match(/<circle /g) ?? []).length
      expect(dots).toBe(c.fame.points.length)
    }
  })
})
