import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import BeatFloor from '../src/components/BeatFloor.astro'

// Beat 1 states published numbers, so it is gated against the probe output rather than
// against dataset.json. floor.py's own header says these are "the numbers beat 1 of the
// piece will state", and the two files disagree at the printed digit: the probe's floor
// went through a lossy round trip via res365 (2dp), the library's did not. Betty White is
// 48% in floor.json and 49% in dataset.json, Prince Philip 49% and 50%. The published
// figure is the cited one.
const FLOOR = 'data/probe/floor.json'
const PROBE = 'data/probe/results2.json'
const floors = JSON.parse(readFileSync(FLOOR, 'utf8'))
const probe = JSON.parse(readFileSync(PROBE, 'utf8'))
const roundHalfEven = (x) => {
  const down = Math.trunc(x)
  if (x - down !== 0.5) return Math.round(x)
  return down % 2 === 0 ? down : down + 1
}
const pctOf = (floor) => roundHalfEven(Math.abs(floor) * 100)

const SOURCES = [
  'src/components/BeatFloor.astro',
  'src/layouts/Base.astro',
  'src/pages/index.astro',
]

let text
let named
beforeAll(async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(BeatFloor)
  text = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  named = floors.filter((r) => text.includes(r.article))
})

describe('beat 1 renders', () => {
  it('names at least the four subjects the spec opens on', () => {
    expect(named.map((r) => r.article)).toEqual(
      expect.arrayContaining([
        'Elizabeth II',
        'Betty White',
        'Kirk Douglas',
        'Prince Philip, Duke of Edinburgh',
      ])
    )
  })

  it('prints the lead peak exactly as the probe recorded it', () => {
    const lead = floors.find((r) => r.article === 'Elizabeth II')
    expect(lead.peak).toBeGreaterThan(10_000_000)
    expect(text).toContain(lead.peak.toLocaleString('en-US'))
  })
})

describe('beat 1 claims trace to the data', () => {
  it('every number on the page is a floor.json field or a count of probe rows', () => {
    // The binding constraint: no number appears in copy that is not a row in
    // results2.json or floor.json. The allowed set is built from the rows themselves, so
    // a figure typed by hand into the copy has nowhere to come from.
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    for (const r of floors) {
      allow(r.peak)
      allow(r.clean_base)
      allow(r.yr_later)
      allow(pctOf(r.floor))
      const [y, m, d] = r.event.split('-')
      allow(y)
      allow(m)
      allow(d)
    }
    allow(floors.length) // 57 subjects carry a floor
    allow(floors.filter((r) => r.floor < 0).length) // 16 of them end below it
    allow(probe.length) // 88 events measured

    const untraceable = (text.match(/\d[\d,]*/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })

  it('prints the floor.json percentage, not the dataset.json one, for every subject named', () => {
    expect(named.length).toBeGreaterThanOrEqual(4)
    for (const r of named) {
      expect(text, r.article).toContain(`${pctOf(r.floor)}%`)
    }
  })

  it('prints the percentages the spec published for the four named subjects', () => {
    // Independent of the formatting code above: these are the figures in the spec's §2
    // table, which was printed from floor.json by Python. Elizabeth II is an exact half at
    // this digit, so a change of rounding rule moves her from 30% to 31% and lands here.
    const published = {
      'Elizabeth II': '30%',
      'Betty White': '48%',
      'Kirk Douglas': '45%',
      'Prince Philip, Duke of Edinburgh': '49%',
    }
    for (const [article, figure] of Object.entries(published)) {
      const row = floors.find((r) => r.article === article)
      expect(`${pctOf(row.floor)}%`, article).toBe(figure)
      expect(text, article).toContain(figure)
    }
  })

  it('names no subject that ends the year above its clean baseline', () => {
    for (const r of named) expect(r.floor, r.article).toBeLessThan(0)
  })

  it('states the two counts the files hold, not counts typed by hand', () => {
    const below = floors.filter((r) => r.floor < 0).length
    expect(text).toContain(`${floors.length} of the ${probe.length} events`)
    expect(text).toContain(`${below} of them`)
  })

  it('still measures fifty-seven floor-eligible subjects, sixteen of them below', () => {
    // Pins the published counts to the committed probe output. If either file is ever
    // regenerated and drifts, the sentence above changes silently; this goes red first.
    expect(floors.length).toBe(57)
    expect(floors.filter((r) => r.floor < 0).length).toBe(16)
    expect(probe.length).toBe(88)
  })
})

describe('copy discipline', () => {
  const banned = /\bbecause\b|\bcaused?\b|\bforgotten\b|\bgrief\b|\blegacy\b|\bmourn|\bmemory\b|\bimportance\b/i

  it('uses no causal or memory language about the floor', () => {
    for (const f of SOURCES) expect(readFileSync(f, 'utf8'), f).not.toMatch(banned)
    expect(text).not.toMatch(banned)
  })

  it('uses no em dashes', () => {
    for (const f of SOURCES) expect(readFileSync(f, 'utf8'), f).not.toContain('—')
    expect(text).not.toContain('—')
  })
})
