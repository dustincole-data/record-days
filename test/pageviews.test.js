import { describe, it, expect } from 'vitest'
import { buildUrl, toSeries, fetchSeries, USER_AGENT } from '../src/lib/pageviews.js'

const ROOT =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents'

describe('buildUrl', () => {
  it('underscores spaces and percent-encodes the article title', () => {
    const url = buildUrl('Elizabeth II', '20220101', '20221231')
    expect(url).toContain('/Elizabeth_II/daily/20220101/20221231')
  })
  it('encodes characters that would otherwise break the path', () => {
    expect(buildUrl('Prince (musician)', '20160101', '20160102'))
      .toContain('Prince_%28musician%29')
  })
  it('encodes non-ascii titles', () => {
    expect(buildUrl('Pelé', '20220101', '20220102')).toContain('Pel%C3%A9')
  })
  it('targets English Wikipedia, all access, all agents', () => {
    expect(buildUrl('X', '20220101', '20220102'))
      .toContain('/per-article/en.wikipedia/all-access/all-agents/')
  })

  // The probe used Python urllib.parse.quote(safe=''), which encodes ' ( ) ! *.
  // encodeURIComponent leaves all five alone, so the two disagree on 6 of the 88
  // articles. Task 7 compares against the probe row for row, so the slug has to
  // match the probe's byte for byte.
  it('encodes an apostrophe, which encodeURIComponent alone leaves bare', () => {
    expect(buildUrl("Sinéad O'Connor", '20230101', '20230102'))
      .toContain('Sin%C3%A9ad_O%27Connor')
  })
  it('reproduces the probe URL exactly, slug and path and dates', () => {
    expect(buildUrl('Titan (submersible)', '20220320', '20240722')).toBe(
      `${ROOT}/Titan_%28submersible%29/daily/20220320/20240722`
    )
  })
})

describe('toSeries', () => {
  it('keys views by day offset from the event date', () => {
    const items = [
      { timestamp: '2022090700', views: 10 },
      { timestamp: '2022090800', views: 99 },
      { timestamp: '2022090900', views: 20 },
    ]
    const s = toSeries(items, '2022-09-08')
    expect(s.get(-1)).toBe(10)
    expect(s.get(0)).toBe(99)
    expect(s.get(1)).toBe(20)
  })
  it('returns an empty map for no items', () => {
    expect(toSeries([], '2022-09-08').size).toBe(0)
  })
  // -455 is the far edge of the clean-baseline window, and for this real event it
  // spans 29 February 2024. An offset computed by counting months, or one that
  // assumes 365-day years, lands on the wrong day here.
  it('counts a long negative offset correctly across a leap day', () => {
    const s = toSeries([{ timestamp: '2022122700', views: 7 }], '2024-03-26')
    expect(s.get(-455)).toBe(7)
  })
})

describe('fetchSeries', () => {
  it('sends a contact User-Agent, which the API requires', async () => {
    let seen = null
    const fake = async (_url, opts) => {
      seen = opts.headers['User-Agent']
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    await fetchSeries('X', '2022-09-08', { from: -1, to: 1, fetchImpl: fake })
    expect(seen).toBe(USER_AGENT)
    // Asserted against the literal, not just the imported constant: comparing the
    // header to USER_AGENT alone passes for any value the module happens to export.
    expect(seen).toBe(
      'AttentionHalfLife/1.0 (https://dustincoledata.com; dustincole.ent@gmail.com)'
    )
    expect(seen).toContain('dustincole.ent@gmail.com')
  })
  it('returns an empty map on 404 instead of throwing', async () => {
    const fake = async () => ({ ok: false, status: 404 })
    const s = await fetchSeries('Nope', '2022-09-08', { from: -1, to: 1, fetchImpl: fake })
    expect(s.size).toBe(0)
  })
  it('throws on a non-404 error so failures are visible, never silent', async () => {
    const fake = async () => ({ ok: false, status: 429 })
    await expect(
      fetchSeries('X', '2022-09-08', { from: -1, to: 1, fetchImpl: fake })
    ).rejects.toThrow('429')
  })

  it('requests exactly the day window that from and to describe', async () => {
    let url = null
    const fake = async (u) => {
      url = u
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    await fetchSeries('X', '2022-09-08', { from: -90, to: 400, fetchImpl: fake })
    expect(url).toContain('/daily/20220610/20231013')
  })
  it('defaults to the widest window the piece needs, -455 to +400', async () => {
    let url = null
    const fake = async (u) => {
      url = u
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    await fetchSeries('X', '2022-09-08', { fetchImpl: fake })
    expect(url).toContain('/daily/20210610/20231013')
  })
  // Daily data begins 2015-07-01. Eleven of the 88 articles sit close enough to that
  // date that the default -455 start falls before it, and a request that starts
  // earlier is refused outright, which would drop the whole article.
  it('never requests a start date before the API floor', async () => {
    let url = null
    const fake = async (u) => {
      url = u
      return { ok: true, status: 200, json: async () => ({ items: [] }) }
    }
    await fetchSeries('David Bowie', '2016-01-10', { fetchImpl: fake })
    expect(url).toContain('/daily/20150701/20170213')
    expect(url).not.toContain('/daily/20141012/')
  })
  it('converts the response body into an offset-keyed series', async () => {
    const fake = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { timestamp: '2022090700', views: 10 },
          { timestamp: '2022090800', views: 99 },
        ],
      }),
    })
    const s = await fetchSeries('X', '2022-09-08', { from: -1, to: 0, fetchImpl: fake })
    expect(s.get(-1)).toBe(10)
    expect(s.get(0)).toBe(99)
    expect(s.size).toBe(2)
  })
})
