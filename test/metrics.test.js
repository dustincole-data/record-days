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
