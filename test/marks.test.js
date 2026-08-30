import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { hero, heroLayout, heroSvg } from '../src/lib/marks/hero.js'
import { famePanel, fameSvg } from '../src/lib/marks/fame.js'
import { back, backLayout, backSvg } from '../src/lib/marks/back.js'
import { lag, lagLayout, lagSvg } from '../src/lib/marks/lag.js'
import { wrapList, wrapWords, advance, tieScale, tieTicks, decodeTrack, TIE_MIN, TIE_MAX } from '../src/lib/marks/lib.js'
import { trackBytes, residualSeries, CAST_TRACK_CLIP } from '../src/lib/findings.js'

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
// A label the mark wrapped is two <text> elements, so a name is looked for in the
// sheet's joined copy rather than in one element of it.
const said = (svg) => [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]).join(' ')

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
    // and every page of every group is named, including the ones inside a measured
    // group that carry no year of readings and so cannot be drawn
    const copy = said(svg)
    for (const k of c.constellations) {
      for (const p of k.pages) expect(copy).toContain(p.article.replace(/_/g, ' ').replace(/&/g, '&amp;'))
    }
    expect(copy).toContain('no year of readings')
  })
})

describe('the tie ruler', () => {
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

  it('draws the stranger band on the sheet that carries the ruler, and states it there', () => {
    const lagS = lagSvg(c, 1180).svg
    expect(lagS).toContain('fill="#D6740E" opacity="0.1"')
    expect(said(lagS)).toContain('the middle ' + c.bond.band + '% of the pairs that shared no date')
    // the hero draws the year rather than the coefficient, so it carries no tie ruler
    // to fall out of step with this one
    expect(heroSvg(c, 1180).svg).not.toContain('fill="#D6740E" opacity="0.1"')
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
    // three columns of cells wide, two at a tablet, one on a phone
    expect(heroLayout(1320).cols).toBe(3)
    expect(heroLayout(820).cols).toBe(2)
    expect(heroLayout(390).cols).toBe(1)
    expect(backLayout(1320).side).toBe(true)
    expect(backLayout(390).side).toBe(false)
    // and the sheet gets taller as it gets narrower, which a scaled sheet never does
    expect(hero(c, 390).height).toBeGreaterThan(hero(c, 1320).height)
    expect(back(c, 390).height).toBeGreaterThan(back(c, 1320).height)
  })

  it('keeps every cell inside the sheet and deep enough to read a silhouette in', () => {
    for (const w of WIDTHS) {
      const L = heroLayout(w)
      expect(L.cellW).toBeGreaterThan(0)
      expect(L.pad + L.cols * L.cellW + (L.cols - 1) * L.gut).toBeCloseTo(w - L.pad, 6)
      expect(L.half).toBeGreaterThanOrEqual(30)
      expect(L.half).toBeLessThanOrEqual(52)
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

describe('the track the hero draws', () => {
  const census = JSON.parse(readFileSync('data/census/top-days.json', 'utf8'))
  const rowOf = (a) => census.rows.find((r) => r.article === a)

  it('survives the round trip through one byte a day, to within the step', () => {
    const k = c.constellations.filter((x) => x.median !== null)[0]
    const p = k.pages.find((q) => q.track)
    const rs = residualSeries(rowOf(p.article))
    const back = decodeTrack(p.track, c.tracks.clip)
    expect(back).toHaveLength(rs.n)
    const step = (2 * CAST_TRACK_CLIP) / 254
    let checked = 0
    for (let i = 0; i < rs.n; i++) {
      if (!rs.present[i]) { expect(back[i]).toBeNull(); continue }
      const want = Math.max(-CAST_TRACK_CLIP, Math.min(CAST_TRACK_CLIP, rs.values[i]))
      expect(Math.abs(back[i] - want)).toBeLessThanOrEqual(step)
      checked++
    }
    expect(checked).toBeGreaterThan(250)
  })

  it('never turns a day with no reading into a nought', () => {
    const rs = residualSeries(rowOf(c.constellations.find((k) => k.median !== null).pages.find((q) => q.track).article))
    const bytes = Buffer.from(trackBytes(rs).b64, 'base64')
    for (let i = 0; i < rs.n; i++) expect(bytes[i] === 0).toBe(!rs.present[i])
  })

  it('keeps the drawing clip off most of the readings it is drawn over', () => {
    expect(c.tracks.clip).toBe(CAST_TRACK_CLIP)
    expect(c.tracks.clippedShare).toBeLessThan(15)
    expect(c.tracks.days).toBe(c.tracks.to - c.tracks.from + 1)
  })

  it('mirrors the second page against the first rather than stacking them', () => {
    // The first page of a cell is drawn above its line and the second below it, so on
    // a day both were read unusually high the two fills reach AWAY from each other.
    const k = c.constellations.filter((x) => x.median !== null && x.pages.filter((p) => p.track).length >= 2)
      .sort((a, b) => b.median - a.median)[0]
    const pages = k.pages.filter((p) => p.track).sort((a, b) => b.peak - a.peak)
    const a = decodeTrack(pages[0].track, c.tracks.clip)
    const b = decodeTrack(pages[1].track, c.tracks.clip)
    const svg = heroSvg(c, 1320).svg
    // find a day both pages were read well above their own level
    let day = -1
    for (let i = 1; i < a.length; i++) if (a[i] > 0.2 && b[i] > 0.2) { day = i; break }
    expect(day).toBeGreaterThan(-1)
    const L = heroLayout(1320)
    const top = -L.half * Math.min(1, a[day] / c.tracks.clip)
    const bot = L.half * Math.min(1, b[day] / c.tracks.clip)
    expect(top).toBeLessThan(0)
    expect(bot).toBeGreaterThan(0)
    expect(svg).toContain('mix-blend-mode:multiply')
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
  it('draws both controls on the hero as cells, on the same geometry as a group', () => {
    const copy = said(heroSvg(c, 1320).svg)
    for (const key of ['near', 'far']) {
      const cp = c.bond.controls[key]
      expect(cp).toBeTruthy()
      for (const a of [cp.a, cp.b]) expect(copy).toContain(a.replace(/_/g, ' '))
      expect(copy).toContain(cp.r.toFixed(3))
    }
    expect(copy).toContain('no shared date')
    expect(copy).toContain('within a fortnight')
    // and each is the pair of its bucket closest to that bucket's own median, so it is
    // the typical case rather than a chosen one
    expect(Math.abs(c.bond.controls.far.r - c.bond.far.median)).toBeLessThan(0.01)
    expect(Math.abs(c.bond.controls.near.r - c.bond.near.median)).toBeLessThan(0.05)
  })

  it('lays the cells out from the closest-moving group down to the controls', () => {
    const ties = c.constellations.filter((k) => k.median !== null && k.pages.filter((p) => p.track).length >= 2)
      .map((k) => k.median).sort((a, b) => b - a)
    const copy = said(heroSvg(c, 1320).svg)
    let at = -1
    for (const t of ties) {
      const i = copy.indexOf(t.toFixed(3), at + 1)
      expect(i).toBeGreaterThan(at)
      at = i
    }
    // the controls come after every group
    expect(copy.indexOf('no shared date')).toBeGreaterThan(at)
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
