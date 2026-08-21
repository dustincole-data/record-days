import { describe, it, expect } from 'vitest'
import { articleType, floorEligibility, API_START, MIN_BASELINE } from '../src/lib/classify.js'

function seriesOver(from, to, views) {
  const s = new Map()
  for (let d = from; d <= to; d++) s.set(d, views)
  return s
}

function seriesOn(days, views) {
  return new Map(days.map((d) => [d, views]))
}

function range(from, to) {
  const out = []
  for (let d = from; d <= to; d++) out.push(d)
  return out
}

describe('articleType', () => {
  it('calls a page with a full pre-event history a subject article', () => {
    expect(articleType(seriesOver(-90, 10, 500))).toBe('subject')
  })
  it('calls a page with no pre-event history an event article', () => {
    expect(articleType(seriesOver(0, 100, 500))).toBe('event')
  })
  it('calls a page with too little pre-event history an event article', () => {
    expect(articleType(seriesOver(-20, 100, 500))).toBe('event')
  })
  it('calls a page with exactly 40 days in the near window a subject article', () => {
    expect(articleType(seriesOn(range(-47, -8), 500))).toBe('subject')
  })
  it('calls a page with 39 days in the near window an event article', () => {
    expect(articleType(seriesOn(range(-46, -8), 500))).toBe('event')
  })
  it('does not count day -7 toward the near window', () => {
    expect(articleType(seriesOn(range(-46, -7), 500))).toBe('event')
  })
  it('does not count day -91 toward the near window', () => {
    expect(articleType(seriesOn(range(-91, -52), 500))).toBe('event')
  })
})

describe('floorEligibility', () => {
  it('accepts a subject article with a clean high-volume baseline', () => {
    const s = seriesOver(-455, 400, 5000)
    const r = floorEligibility(s, '2022-09-08')
    expect(r.eligible).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.cleanBase).toBe(5000)
  })
  it('reads the baseline from the clean window, not the elevated run-up window', () => {
    const s = seriesOver(-455, 400, 5000)
    for (let d = -90; d <= -8; d++) s.set(d, 60000)
    expect(floorEligibility(s, '2022-09-08').cleanBase).toBe(5000)
  })
  it('rejects an event article, since there is nothing to compare against', () => {
    const r = floorEligibility(seriesOver(0, 400, 5000), '2022-09-08')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('event-article')
    expect(r.cleanBase).toBeNull()
  })
  it('rejects an event whose clean window predates the API', () => {
    const r = floorEligibility(seriesOver(-455, 400, 5000), '2016-04-21')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('pre-api')
    expect(r.cleanBase).toBeNull()
  })
  it('accepts an event whose clean window opens exactly on the API start date', () => {
    const r = floorEligibility(seriesOver(-455, 400, 5000), '2016-09-28')
    expect(r.eligible).toBe(true)
    expect(r.reason).toBeNull()
  })
  it('rejects an event whose clean window opens one day before the API start date', () => {
    expect(floorEligibility(seriesOver(-455, 400, 5000), '2016-09-27').reason).toBe('pre-api')
  })
  it('reports an event article as an event article even when its date is also pre-API', () => {
    const r = floorEligibility(seriesOver(0, 400, 5000), '2016-04-21')
    expect(r.reason).toBe('event-article')
  })
  it('rejects a subject article whose clean window holds no data at all', () => {
    const r = floorEligibility(seriesOver(-90, 400, 5000), '2022-09-08')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('pre-api')
    expect(r.cleanBase).toBeNull()
  })
  it('rejects a baseline below the low-volume threshold', () => {
    const r = floorEligibility(seriesOver(-455, 400, 399), '2022-09-08')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('low-volume')
    expect(r.cleanBase).toBe(399)
  })
  it('accepts a baseline exactly at the threshold', () => {
    const r = floorEligibility(seriesOver(-455, 400, 400), '2022-09-08')
    expect(r.eligible).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.cleanBase).toBe(400)
  })
  it('exposes the API start date and volume threshold as constants', () => {
    expect(API_START).toBe('2015-07-01')
    expect(MIN_BASELINE).toBe(400)
  })
})
