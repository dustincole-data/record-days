import { describe, it, expect } from 'vitest'
import { median, baseline } from '../src/lib/metrics.js'

describe('median', () => {
  it('returns the middle value of an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
  it('averages the two middle values of an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('throws on an empty list rather than returning NaN', () => {
    expect(() => median([])).toThrow('median of empty list')
  })
})

describe('baseline', () => {
  it('takes the median of days within the window, inclusive of both ends', () => {
    const series = new Map([[-3, 100], [-2, 200], [-1, 300], [0, 999999]])
    expect(baseline(series, -3, -1)).toBe(200)
  })
  it('ignores days outside the window', () => {
    const series = new Map([[-10, 1], [-2, 50], [-1, 70], [5, 1]])
    expect(baseline(series, -3, -1)).toBe(60)
  })
  it('throws when the window contains no data', () => {
    const series = new Map([[5, 100]])
    expect(() => baseline(series, -3, -1)).toThrow('no data in baseline window')
  })
})

import { findPeak, crossing } from '../src/lib/metrics.js'

describe('findPeak', () => {
  it('finds the maximum inside the default window', () => {
    const series = new Map([[-1, 10], [0, 500], [1, 900], [2, 300]])
    expect(findPeak(series)).toEqual({ day: 1, views: 900 })
  })
  it('ignores a larger value outside the window', () => {
    const series = new Map([[-50, 99999], [0, 500], [1, 900]])
    expect(findPeak(series)).toEqual({ day: 1, views: 900 })
  })
  it('throws when the window is empty', () => {
    expect(() => findPeak(new Map([[-50, 1]]))).toThrow('no data in peak window')
  })
})

describe('crossing', () => {
  it('interpolates a sub-day crossing between bracketing days', () => {
    // base 0, peak 1000 on day 0. Day 1 = 400, already below half (500).
    // Half is crossed between day 0 (1000) and day 1 (400):
    // 1 - 1 + (1000 - 500) / (1000 - 400) = 0.8333...
    const series = new Map([[0, 1000], [1, 400]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeCloseTo(0.8333, 3)
  })
  it('subtracts the baseline before comparing, so excess is what decays', () => {
    // base 100, peak excess 900. Half of excess = 450, i.e. 550 raw views.
    const series = new Map([[0, 1000], [1, 550]])
    expect(crossing(series, 0, 900, 100, 0.5)).toBeCloseTo(1.0, 3)
  })
  it('keeps searching past days that are still above the level', () => {
    const series = new Map([[0, 1000], [1, 900], [2, 800], [3, 100]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeCloseTo(2.4286, 3)
  })
  it('returns null when the level is never reached', () => {
    const series = new Map([[0, 1000], [1, 999], [2, 999]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeNull()
  })
})

import { linreg, fitDecay } from '../src/lib/metrics.js'

describe('linreg', () => {
  it('recovers slope and intercept of a perfect line with r2 of 1', () => {
    const r = linreg([1, 2, 3, 4], [3, 5, 7, 9])
    expect(r.slope).toBeCloseTo(2, 10)
    expect(r.intercept).toBeCloseTo(1, 10)
    expect(r.r2).toBeCloseTo(1, 10)
  })
  it('returns null when there are too few points to fit', () => {
    expect(linreg([1, 2], [1, 2])).toBeNull()
  })
  it('returns null when every x is identical', () => {
    expect(linreg([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull()
  })
})

describe('fitDecay', () => {
  it('recovers the half-life of clean exponential decay', () => {
    // excess = 1000 * 0.5^(t/3)  -> half-life exactly 3 days
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, 1000 * Math.pow(0.5, t / 3))
    const f = fitDecay(series, 0, 0)
    expect(f.expHalfLife).toBeCloseTo(3, 6)
    expect(f.expR2).toBeCloseTo(1, 6)
  })
  it('recovers the exponent of a clean power law', () => {
    // excess = 1000 * t^-1.5
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, 1000 * Math.pow(t, -1.5))
    const f = fitDecay(series, 0, 0)
    expect(f.powAlpha).toBeCloseTo(1.5, 6)
    expect(f.powR2).toBeCloseTo(1, 6)
  })
  it('skips days where excess is zero or negative, since log is undefined', () => {
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, t < 10 ? 500 - t : 0)
    const f = fitDecay(series, 0, 0)
    expect(f.expR2).not.toBeNull()
  })
  it('returns nulls when fewer than four usable days remain', () => {
    const series = new Map([[0, 1000], [1, 500], [2, 0], [3, 0]])
    const f = fitDecay(series, 0, 0)
    expect(f.expHalfLife).toBeNull()
    expect(f.powAlpha).toBeNull()
  })
})
