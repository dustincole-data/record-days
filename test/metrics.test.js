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
