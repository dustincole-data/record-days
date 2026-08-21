import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import BeatFloor from '../src/components/BeatFloor.astro'
import BeatBand from '../src/components/BeatBand.astro'

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
  'src/components/BeatBand.astro',
  'src/components/BeatFloor.astro',
  'src/layouts/Base.astro',
  'src/pages/index.astro',
]

// Copy is what a reader sees, so scoped styles and the component's own client script are
// stripped before anything is gated. Everything left is rendered prose.
const strip = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

let text
let bandText
let named
beforeAll(async () => {
  const container = await AstroContainer.create()
  text = strip(await container.renderToString(BeatFloor))
  bandText = strip(await container.renderToString(BeatBand))
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
    expect(bandText).not.toMatch(banned)
  })

  it('uses no em dashes', () => {
    for (const f of SOURCES) expect(readFileSync(f, 'utf8'), f).not.toContain('—')
    expect(text).not.toContain('—')
    expect(bandText).not.toContain('—')
  })
})

// ---------------------------------------------------------------------------
// Beat 2, the band.
// ---------------------------------------------------------------------------

const corr = (xs, ys) => {
  const mx = xs.reduce((a, b) => a + b) / xs.length
  const my = ys.reduce((a, b) => a + b) / ys.length
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return num / Math.sqrt(dx * dy)
}

describe('band renderer safety rules', () => {
  const src = readFileSync('src/scripts/band.js', 'utf8')
  const wiring = readFileSync('src/components/BeatBand.astro', 'utf8')

  it('never uses multiply blending, which compounds to black on light', () => {
    expect(src).not.toContain("'multiply'")
  })

  it('colours curves by peak magnitude, which is what makes beat 2 honest', () => {
    expect(src).toContain('magnitudeColour')
    expect(src).toContain('Math.log10(e.peak)')
  })

  it('preserves the drawing buffer so screenshots are possible', () => {
    const contexts = src.match(/getContext\(/g) ?? []
    const preserved = src.match(/preserveDrawingBuffer: true/g) ?? []
    expect(contexts.length).toBeGreaterThan(0)
    expect(preserved.length).toBe(contexts.length)
  })

  it('never encodes anything in stroke width, which is clamped to 1 on many devices', () => {
    const widths = src.match(/lineWidth\s*=\s*[^\n]+/g)
    expect(widths.length).toBeGreaterThan(0)
    expect([...new Set(widths)]).toEqual(['lineWidth = 1'])
  })

  it('re-syncs from the canvas box, never from a window resize event', () => {
    expect(wiring).toContain('ResizeObserver')
    expect(wiring).not.toMatch(/addEventListener\(\s*'resize'/)
    expect(src).not.toMatch(/addEventListener\(\s*'resize'/)
  })
})

describe('beat 2 claims trace to the data', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const src = readFileSync('src/scripts/band.js', 'utf8')
  const DAYS = 30

  it('peak views span more than three orders of magnitude', () => {
    // The plan called this four orders. The set spans 2,782 to 10,905,053, which is 3.6,
    // so the assertion states what the file holds and the copy states neither.
    const peaks = dataset.events.map((e) => e.peak)
    expect(Math.max(...peaks) / Math.min(...peaks)).toBeGreaterThan(1000)
  })

  it('t50 and peak magnitude are effectively uncorrelated', () => {
    const rows = dataset.events.filter((e) => e.t50 !== null)
    const r = corr(rows.map((e) => Math.log10(e.peak)), rows.map((e) => e.t50))
    expect(Math.abs(r)).toBeLessThan(0.3)
  })

  it('states the correlation the probe rows hold, not one typed by hand', () => {
    const r = corr(probe.map((e) => Math.log10(e.peak)), probe.map((e) => e.t50))
    expect(Math.abs(r).toFixed(2)).toBe('0.21')
  })

  it('draws only the window in which no curve was clamped to its own peak', () => {
    // build-dataset.js clamps the normalised curve to 1. Four articles come back to or
    // above their peak later in the series, and a clamped point drawn inside the band
    // would state "equal to the peak" for a day that was at or above it. All four sit
    // outside the drawn window. If that ever stops being true, this goes red before the
    // band can print it.
    const clampedIn = dataset.events
      .filter((e) => e.curve.slice(1, DAYS + 1).some((v) => v >= 1))
      .map((e) => e.article)
    expect(clampedIn).toEqual([])

    const clampedOut = dataset.events
      .filter((e) => e.curve.slice(DAYS + 1).some((v) => v >= 1))
      .map((e) => e.article)
      .sort()
    expect(clampedOut).toEqual([
      'JD Vance',
      'Jeffrey Epstein',
      'Naomi Osaka',
      'Sam Bankman-Fried',
    ])
    expect(src).toMatch(/days\s*=\s*30/)
  })

  it('draws in an order that does not track the colour variable', () => {
    // dataset.json is grouped by class, and class order tracks peak size closely enough
    // that the last layer drawn would read as a gradient produced by the draw order
    // alone. Article name is deterministic and carries no magnitude signal.
    const logPeak = (e) => Math.log10(e.peak)
    const fileOrder = corr(dataset.events.map((_, i) => i), dataset.events.map(logPeak))
    const drawn = [...dataset.events].sort((a, b) => a.article.localeCompare(b.article))
    const drawOrder = corr(drawn.map((_, i) => i), drawn.map(logPeak))
    expect(Math.abs(fileOrder)).toBeGreaterThan(0.3)
    expect(Math.abs(drawOrder)).toBeLessThan(0.15)
    expect(src).toContain('localeCompare')
  })
})

describe('beat 2 copy traces to the probe rows', () => {
  const big = probe.reduce((a, b) => (b.peak > a.peak ? b : a))
  const small = probe.reduce((a, b) => (b.peak < a.peak ? b : a))
  const r = corr(probe.map((e) => Math.log10(e.peak)), probe.map((e) => e.t50))

  it('names the largest and the smallest peak the probe recorded', () => {
    expect(big.article).toBe('Matthew Perry')
    expect(small.article).toBe('Orlando nightclub shooting')
    for (const row of [big, small]) {
      expect(bandText, row.article).toContain(row.article)
      expect(bandText, row.article).toContain(row.peak.toLocaleString('en-US'))
      expect(bandText, row.article).toContain(`${row.t50} days`)
    }
  })

  it('prints the correlation the rows hold, carrying its own sign', () => {
    expect(r).toBeLessThan(0)
    expect(bandText).toContain(`r = −${Math.abs(r).toFixed(2)}`)
  })

  it('every number in the beat is a probe row field or a count of rows', () => {
    // Same rule as beat 1, against the other cited file. This match also takes decimals,
    // which beat 1 has none of: t50 is printed to two places, so a match that stopped at
    // the point would let a hand-typed fraction through on the digits either side of it.
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    // Only the rows this beat names may supply a figure. Allowing all 88 would have
    // whitelisted every peak in the set and, through the event dates, every small integer.
    const cited = probe.filter((row) => bandText.includes(row.article))
    expect(cited.length).toBeGreaterThanOrEqual(2)
    for (const row of cited) {
      allow(row.peak)
      allow(row.t50)
      const [y, m, d] = row.event.split('-')
      allow(y)
      allow(m)
      allow(d)
    }
    allow(probe.length) // 88 events measured
    allow(Math.abs(r).toFixed(2)) // the correlation, recomputed from those rows

    const untraceable = (bandText.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })

  it('cites the prior work the fall belongs to', () => {
    const src = readFileSync('src/components/BeatBand.astro', 'utf8')
    expect(bandText).toContain('Nature Human Behaviour')
    expect(src).toContain('https://doi.org/10.1038/s41562-018-0474-5')
  })
})

describe('beat 2 renders as written', () => {
  it('joins no two words where the template breaks a line beside an expression', () => {
    // Astro drops the whitespace at a line break that sits directly against a {expr}, so
    // a reflow of the source silently jams the copy: "88events", "gone in0.64",
    // "shooting,2,782". The commas inside a thousands-separated number are digit-to-digit
    // and do not match here.
    expect(bandText).not.toMatch(/[A-Za-z]\d|\d[A-Za-z]/)
    expect(bandText).not.toMatch(/\.[A-Za-z]/)
    expect(bandText).not.toMatch(/[A-Za-z],\d/)
  })
})

describe('beat 2 carries the magnitude claim on an axis, not on hue over the band', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const wiring = readFileSync('src/components/BeatBand.astro', 'utf8')
  const events = dataset.events

  it('records the gradient that disqualified a magnitude-coloured band', () => {
    // Spec 6 is binding: the band may colour by peak magnitude only if the colours show
    // no ordering. They order. A normalised curve is (views - base) / (peak - base), so a
    // larger spike is a larger multiple of the same page's ordinary traffic and the same
    // return toward that traffic sits lower as a share of the peak. By day ten the level
    // tracks magnitude at the correlation asserted here, and the rendered band read as
    // warm along the bottom and cool along the top. The claim moved to a mark whose axis
    // is the quantity being claimed.
    const r = corr(
      events.map((e) => Math.log10(e.peak)),
      events.map((e) => Math.log10(Math.max(e.curve[10], 1e-6)))
    )
    expect(r).toBeLessThan(-0.4)

    // The rate, which is what beat 2 actually claims, does not track magnitude.
    const rate = corr(events.map((e) => Math.log10(e.peak)), events.map((e) => e.t50))
    expect(Math.abs(rate)).toBeLessThan(0.3)
  })

  it('draws the full band in a single ink', () => {
    expect(wiring).toMatch(/#band[\s\S]{0,200}ink:/)
  })

  it('places peak size on the scatter x axis and days to half on its y', async () => {
    const { rateScatterPoints } = await import('../src/scripts/band.js')
    const pts = rateScatterPoints(events)
    expect(pts).toHaveLength(events.length)
    for (let i = 0; i < events.length; i++) {
      expect(pts[i].x).toBe(Math.log10(events[i].peak))
      expect(pts[i].y).toBe(Math.log10(events[i].t50))
    }
    // The evidence the reader is asked to read: the cloud has no slope.
    expect(Math.abs(corr(pts.map((p) => p.x), pts.map((p) => p.y)))).toBeLessThan(0.3)
  })
})

describe('beat 2 states the pair the way the drawn curves read', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const find = (name) => dataset.events.find((e) => e.article === name)

  it('claims a shared rate, and not a shared level the curves do not hold', () => {
    const big = find('Matthew Perry')
    const small = find('Orlando nightclub shooting')
    // The rate is shared: both are half gone inside a day.
    expect(big.t50).toBeLessThan(1)
    expect(small.t50).toBeLessThan(1)
    // The level is not. By the end of the drawn window they are a long way apart, so the
    // copy states the rate and names the level as what separates them.
    expect(small.curve[30] / big.curve[30]).toBeGreaterThan(3)
    expect(bandText).toContain('the level, not the rate')
  })
})
