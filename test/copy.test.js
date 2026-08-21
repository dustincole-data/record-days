import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import BeatFloor from '../src/components/BeatFloor.astro'
import BeatBand from '../src/components/BeatBand.astro'
import BeatModel from '../src/components/BeatModel.astro'
import BeatDivergence from '../src/components/BeatDivergence.astro'
import BeatCorrection from '../src/components/BeatCorrection.astro'
import { fitDecay } from '../src/lib/metrics.js'

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
  'src/components/BeatModel.astro',
  'src/components/BeatDivergence.astro',
  'src/components/BeatCorrection.astro',
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
let modelText
let divText
let corrText
let divHtml
let corrHtml
let named
beforeAll(async () => {
  const container = await AstroContainer.create()
  text = strip(await container.renderToString(BeatFloor))
  bandText = strip(await container.renderToString(BeatBand))
  modelText = strip(await container.renderToString(BeatModel))
  divHtml = await container.renderToString(BeatDivergence)
  corrHtml = await container.renderToString(BeatCorrection)
  divText = strip(divHtml)
  corrText = strip(corrHtml)
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
    expect(modelText).not.toMatch(banned)
    expect(divText).not.toMatch(banned)
    expect(corrText).not.toMatch(banned)
  })

  it('uses no em dashes', () => {
    for (const f of SOURCES) expect(readFileSync(f, 'utf8'), f).not.toContain('—')
    expect(text).not.toContain('—')
    expect(bandText).not.toContain('—')
    expect(modelText).not.toContain('—')
    expect(divText).not.toContain('—')
    expect(corrText).not.toContain('—')
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

// ---------------------------------------------------------------------------
// Beat 3, the model.
// ---------------------------------------------------------------------------

describe('beat 3 claims trace to the data', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const fitted = dataset.events.filter((e) => e.powR2 !== null && e.expR2 !== null)
  const wins = fitted.filter((e) => e.powR2 > e.expR2).length
  // Reimplemented rather than imported from src/lib/metrics.js, so a change to the
  // library's median cannot move the printed figure and the assertion together.
  const med = (nums) => {
    const s = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }
  const alpha = med(fitted.map((e) => e.powAlpha))
  // Elapsed time to halve from day t under V = C t^-alpha: t * 2^(1/alpha) is where the
  // clock lands, so the duration is that less t. stats.py printed the landing point for
  // day one (1.7) and the duration for day thirty (21.5) and the spec carried both across
  // as though they were the same quantity. The beat states one quantity twice.
  const halveFrom = (t) => (t * (2 ** (1 / alpha) - 1)).toFixed(1)

  it('a power law beats an exponential on a clear majority of the events', () => {
    expect(fitted).toHaveLength(dataset.events.length)
    expect(wins).toBeGreaterThan(fitted.length / 2)
    expect(wins).toBe(57)
    // The same count in the file the figure is published from. If Task 7's parity gate
    // was bypassed the two disagree here before the copy can state either.
    expect(probe.filter((r) => r.pow_r2 > r.exp_r2).length).toBe(wins)
    expect(probe.length).toBe(fitted.length)
  })

  it('fits a decay, which is what the growing halving time rests on', () => {
    // The growth is a property of the form rather than of this data: t * (2^(1/alpha) - 1)
    // is linear in t for any positive exponent. What the data decides is which form fits,
    // and that every fitted exponent is a fall rather than a rise.
    expect(alpha).toBeGreaterThan(0)
    expect(fitted.filter((e) => e.powAlpha > 0)).toHaveLength(fitted.length)
    expect(Number(halveFrom(30))).toBeGreaterThan(Number(halveFrom(1)))
  })

  it('states halving times that do not depend on which file the exponent came from', () => {
    // dataset.json keeps the unrounded exponent, results2.json a 2dp copy, and the two
    // medians differ at the third place. Both land on the same printed digit here. The
    // upper of the two middle values does not: it prints 21.4 where a median prints 21.5.
    const probeAlpha = med(probe.map((r) => r.pow_a))
    const fromProbe = (t) => (t * (2 ** (1 / probeAlpha) - 1)).toFixed(1)
    expect(fromProbe(1)).toBe(halveFrom(1))
    expect(fromProbe(30)).toBe(halveFrom(30))
    // The exponent itself is not stable at two places across the two files, which is why
    // the beat states the halving times and never prints the exponent.
    expect(alpha.toFixed(2)).toBe('1.28')
    expect(probeAlpha.toFixed(2)).toBe('1.29')
  })

  it('fits only the window the beat says it fits, day one to day thirty', () => {
    // The beat states the fit runs from the day after the peak to day thirty, then
    // measures a halving time at each end of it. A fit that reached past day thirty would
    // put the second measurement inside the window rather than at its edge, and a fit that
    // stopped short would put it outside the data.
    const clean = new Map()
    for (let d = 1; d <= 40; d++) clean.set(d, Math.round(100000 * d ** -1.3))
    const alphaOf = (series) => fitDecay(series, 0, 0).powAlpha
    const base = alphaOf(clean)

    const past = new Map(clean)
    for (let d = 31; d <= 40; d++) past.set(d, 999999)
    expect(alphaOf(past)).toBe(base)

    const edge = new Map(clean)
    edge.set(30, 999999)
    expect(alphaOf(edge)).not.toBe(base)
  })

  it('prints the counts and the halving times the dataset holds', () => {
    expect(modelText).toContain(`${wins} of ${fitted.length} events`)
    expect(modelText).toContain(`${halveFrom(1)} days`)
    expect(modelText).toContain(`${halveFrom(30)} days`)
  })

  it('every number in the beat is a count of rows or a figure recomputed from them', () => {
    // Same rule as beats 1 and 2. Beat 3 prints no field of any row, only quantities
    // derived from all of them, so the allowed set is built by recomputing each one.
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    allow(wins)
    allow(fitted.length)
    allow(halveFrom(1))
    allow(halveFrom(30))

    const untraceable = (modelText.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })

  it('joins no two words where the template breaks a line beside an expression', () => {
    expect(modelText).not.toMatch(/[A-Za-z]\d|\d[A-Za-z]/)
    expect(modelText).not.toMatch(/\.[A-Za-z]/)
    expect(modelText).not.toMatch(/[A-Za-z],\d/)
  })

  it('claims no half-life for a fall it has just shown is not one', () => {
    // The page keeps the title. The beat has to take the name back explicitly, or the
    // masthead states a process the data rejects and nothing on the page says otherwise.
    expect(modelText).toMatch(/no such number/)
    expect(readFileSync('src/pages/index.astro', 'utf8')).toContain('<BeatModel />')
  })
})

// ---------------------------------------------------------------------------
// Beat 4, the floor distribution and the correction.
// ---------------------------------------------------------------------------

// The floor is published as a multiple of the clean baseline rather than as the delta
// floor.json stores, so a rule at 1 is the baseline itself and a plain log axis carries
// the whole range without a linear patch around zero. Printed to one place: the two files
// disagree at the second place on 19 of the 57 rows, and at the first place on two rows,
// neither of them named here.
const mult1 = (floorValue) => (1 + floorValue).toFixed(1)
const dataset4 = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
const dsRow = (name) => dataset4.events.find((e) => e.article === name)
const probeRow = (name) => probe.find((r) => r.article === name)
const med4 = (nums) => {
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
// The floor measured against the near window instead of the clean one. results2.json
// stores it directly as res365; dataset.json stores no such field, so it is rebuilt there
// from the year-later level the clean floor implies. Same window, same peak anchor.
const nearFromProbe = (name) => probeRow(name).res365
const nearFromDataset = (name) => {
  const e = dsRow(name)
  return (e.cleanBase * (1 + e.floor)) / e.nearBase - 1
}
const floorRows = floors
const deathRows = floorRows.filter((r) => r.class === 'death')
const lowest = floorRows.reduce((a, b) => (b.floor < a.floor ? b : a))
const highest = floorRows.reduce((a, b) => (b.floor > a.floor ? b : a))
const maxDeath = deathRows.reduce((a, b) => (b.floor > a.floor ? b : a))
const THICK = 15
const PHILIP = 'Prince Philip, Duke of Edinburgh'

describe('beat 4 resolves the thin-class question before it states a class', () => {
  // Spec 11 leaves this open: politics and sport are too thin for the class table and
  // either the event list grows or those classes get dropped. The event list cannot grow
  // here, so the beat states a class figure only where the class carries THICK subjects,
  // and says on the page that the rest are drawn without being named.
  const counts = Object.fromEntries(
    [...new Set(floorRows.map((r) => r.class))].map((c) => [
      c,
      floorRows.filter((r) => r.class === c).length,
    ])
  )

  it('finds exactly two classes thick enough to state', () => {
    expect(counts).toEqual({
      death: 25,
      scandal: 15,
      culture: 7,
      sport: 5,
      politics: 3,
      disaster: 2,
    })
    const thick = Object.keys(counts).filter((c) => counts[c] >= THICK).sort()
    expect(thick).toEqual(['death', 'scandal'])
  })

  it('agrees with dataset.json on every class count, so the ruling is not one file deep', () => {
    for (const [cls, n] of Object.entries(counts)) {
      const inDataset = dataset4.events.filter((e) => e.floor !== null && e.class === cls).length
      expect(inDataset, cls).toBe(n)
    }
  })

  it('names the two thick classes in the copy and none of the four thin ones', () => {
    expect(divText).toMatch(/deaths/)
    expect(divText).toMatch(/scandals/)
    for (const cls of Object.keys(counts).filter((c) => counts[c] < THICK)) {
      expect(divText.toLowerCase(), cls).not.toContain(cls)
    }
  })

  it('says on the page that the thin classes are drawn and not named', () => {
    const thin = Object.values(counts).filter((n) => n < THICK)
    expect(divText).toContain(`${thin.length} carry`)
    expect(divText).toContain(`${Math.max(...thin)} subjects or fewer`)
  })
})

describe('beat 4 divergence claims trace to the data', () => {
  it('the floor spans a sign change and a subject that ends the year fifty times higher', () => {
    const both = [
      floorRows.map((r) => r.floor),
      dataset4.events.filter((e) => e.floor !== null).map((e) => e.floor),
    ]
    for (const source of both) {
      expect(Math.min(...source)).toBeLessThan(0)
      expect(Math.max(...source)).toBeGreaterThan(50)
    }
    expect(lowest.article).toBe('Ellen DeGeneres')
    expect(highest.article).toBe('Jeffrey Epstein')
    expect(floorRows.filter((r) => r.floor === 0)).toEqual([])
  })

  it('the fall never changes direction, which is what the floor is set against', () => {
    // The contrast the beat draws: every t50 in the set is a positive duration, so the
    // fall has a spread and no sign. The floor has both.
    expect(probe.every((r) => r.t50 > 0)).toBe(true)
    const fast = probe.reduce((a, b) => (b.t50 < a.t50 ? b : a))
    const slow = probe.reduce((a, b) => (b.t50 > a.t50 ? b : a))
    expect(fast.article).toBe('Manchester Arena bombing')
    expect(slow.article).toBe('Anna Sorokin')
    expect(divText).toContain(`${fast.t50} days`)
    expect(divText).toContain(`${slow.t50} days`)
  })

  it('scandal reaches a higher floor than any death, and is not alone up there', () => {
    const maxScandal = Math.max(
      ...floorRows.filter((r) => r.class === 'scandal').map((r) => r.floor)
    )
    expect(maxScandal).toBeGreaterThan(maxDeath.floor)
    // The spec's prose says scandal owns the top. Four subjects sit above every death and
    // one of them is not a scandal, so the copy states the count and the share, never
    // "only scandals".
    const above = floorRows.filter((r) => r.floor > maxDeath.floor)
    expect(above).toHaveLength(4)
    expect(above.filter((r) => r.class === 'scandal')).toHaveLength(3)
    expect(above.map((r) => r.article)).toContain('Caitlin Clark')
    expect(divText).not.toMatch(/only scandals|all of them scandals/i)
  })

  it('the floor is not predicted by spike size, in either file', () => {
    const rF = corr(floorRows.map((r) => Math.log10(r.peak)), floorRows.map((r) => r.floor))
    const ds = dataset4.events.filter((e) => e.floor !== null)
    const rD = corr(ds.map((e) => Math.log10(e.peak)), ds.map((e) => e.floor))
    expect(Math.abs(rF)).toBeLessThan(0.15)
    expect(Math.abs(rF).toFixed(2)).toBe(Math.abs(rD).toFixed(2))
    expect(rF).toBeLessThan(0)
    expect(divText).toContain(`r = −${Math.abs(rF).toFixed(2)}`)
  })

  it('prints only multiples the two files agree on at the place they are printed', () => {
    const printed = ['Jeffrey Epstein', 'Ellen DeGeneres', 'Elizabeth II', 'George Michael']
    for (const name of printed) {
      const fromFloor = mult1(floorRows.find((r) => r.article === name).floor)
      expect(mult1(dsRow(name).floor), name).toBe(fromFloor)
      expect(divText, name).toContain(`${fromFloor} times`)
      expect(divText, name).toContain(name)
    }
    // The two rows the files do not agree on at this place are not among them. If a later
    // edit reaches for one, this names it rather than letting the copy state a digit only
    // one file supports.
    const split = floorRows
      .filter((r) => mult1(r.floor) !== mult1(dsRow(r.article).floor))
      .map((r) => r.article)
      .sort()
    expect(split).toEqual(['Caitlin Clark', 'Kirk Douglas'])
    for (const name of split) expect(divText, name).not.toContain(name)
  })

  it('states the split at the rule as the counts on each side', () => {
    const below = floorRows.filter((r) => r.floor < 0).length
    expect(divText).toContain(`${below} of them`)
    expect(divText).toContain(`${floorRows.length - below} above`)
  })
})

describe('beat 4 draws the distribution it claims', () => {
  const src = readFileSync('src/components/BeatDivergence.astro', 'utf8')
  const sides = () => [...divHtml.matchAll(/data-mark data-side="(below|above)"/g)].map((m) => m[1])

  it('draws one mark per floor-eligible subject', () => {
    expect(divHtml.match(/data-mark/g) ?? []).toHaveLength(floorRows.length)
  })

  it('sorts the marks so the colour change is the sign change', () => {
    const order = sides()
    expect(order).toHaveLength(floorRows.length)
    expect(order.indexOf('above')).toBe(floorRows.filter((r) => r.floor < 0).length)
    expect(order.lastIndexOf('below')).toBe(order.indexOf('above') - 1)
  })

  it('gives each mark the side its own floor sign holds', () => {
    const sorted = [...floorRows].sort((a, b) => a.floor - b.floor)
    const order = sides()
    for (let i = 0; i < sorted.length; i++) {
      expect(order[i], sorted[i].article).toBe(sorted[i].floor < 0 ? 'below' : 'above')
    }
  })

  it('is DOM rather than canvas, and takes no hover reveal that a phone cannot fire', () => {
    expect(src).not.toContain('canvas')
    expect(src).not.toContain('pointermove')
    expect(src).not.toMatch(/addEventListener\(\s*'resize'/)
  })

  it('labels the axis so a reader can tell it is not linear', () => {
    expect(divText).toMatch(/logarithmic/)
  })
})

describe('beat 4 correction claims trace to the data', () => {
  it('rebuilds the near-baseline floor to the probe field, on every row', () => {
    for (const r of floorRows) {
      expect(nearFromDataset(r.article).toFixed(2), r.article).toBe(
        nearFromProbe(r.article).toFixed(2)
      )
    }
  })

  it('finds the near baseline inflated well above the clean one for Prince Philip', () => {
    const p = dsRow(PHILIP)
    expect(p.nearBase / p.cleanBase).toBeGreaterThan(1.5)
    const runup = floorRows.find((r) => r.article === PHILIP).runup
    expect((p.nearBase / p.cleanBase).toFixed(2)).toBe(runup.toFixed(2))
    expect(corrText).toContain(`${runup} times`)
  })

  it('agrees with floor.json on the run-up of every subject, so 1.97 is not one file deep', () => {
    for (const r of floorRows) {
      const e = dsRow(r.article)
      expect((e.nearBase / e.cleanBase).toFixed(2), r.article).toBe(r.runup.toFixed(2))
    }
  })

  it('states a run-up that sits in particular subjects rather than across the deaths', () => {
    const fromFile = med4(deathRows.map((r) => r.runup))
    const fromDs = med4(
      deathRows.map((r) => dsRow(r.article).nearBase / dsRow(r.article).cleanBase)
    )
    expect(fromDs.toFixed(2)).toBe(fromFile.toFixed(2))
    expect(fromFile).toBeLessThan(1.1)
    expect(corrText).toContain(`${fromFile.toFixed(2)} times`)
  })

  it('states the deaths that change sign against the deaths that carry a floor', () => {
    // The plan says three of twenty-eight. Twenty-eight is the death count in
    // results2.json; three of those have no clean baseline and cannot change sign at all.
    // The denominator is the deaths a floor was measured for.
    expect(probe.filter((r) => r.class === 'death')).toHaveLength(28)
    expect(deathRows).toHaveLength(25)
    const flipped = deathRows.filter(
      (r) => Math.sign(r.floor) !== Math.sign(nearFromProbe(r.article))
    )
    const flippedDs = deathRows.filter(
      (r) => Math.sign(dsRow(r.article).floor) !== Math.sign(nearFromDataset(r.article))
    )
    expect(flipped).toHaveLength(3)
    expect(flippedDs).toHaveLength(3)
    expect(corrText).toContain(`${flipped.length} of those ${deathRows.length}`)
    expect(corrText).toContain(`${deathRows.length - flipped.length} hold`)
  })

  it('every sign change goes the same way, from below the near window to above the clean one', () => {
    const flipped = floorRows.filter(
      (r) => Math.sign(r.floor) !== Math.sign(nearFromProbe(r.article))
    )
    expect(flipped).toHaveLength(9)
    expect(flipped.every((r) => nearFromProbe(r.article) < 0 && r.floor > 0)).toBe(true)
  })

  it('states the headline the correction moved, and both counts behind it', () => {
    const belowNear = floorRows.filter((r) => nearFromProbe(r.article) < 0).length
    const belowNearDs = floorRows.filter((r) => nearFromDataset(r.article) < 0).length
    const belowClean = floorRows.filter((r) => r.floor < 0).length
    expect(belowNear).toBe(25)
    expect(belowNearDs).toBe(belowNear)
    expect(belowClean).toBe(16)
    expect(Math.round((100 * belowNear) / floorRows.length)).toBe(44)
    expect(Math.round((100 * belowClean) / floorRows.length)).toBe(28)
    expect(corrText).toContain(`${belowNear} of them below`)
    expect(corrText).toContain(`${belowClean} below`)
    expect(corrText).toContain('44%')
    expect(corrText).toContain('28%')
  })

  it('states that the clean window moves subjects both ways, not only up', () => {
    const up = floorRows.filter((r) => r.floor > nearFromProbe(r.article)).length
    const down = floorRows.filter((r) => r.floor < nearFromProbe(r.article)).length
    const upDs = floorRows.filter(
      (r) => dsRow(r.article).floor > nearFromDataset(r.article)
    ).length
    const downDs = floorRows.filter(
      (r) => dsRow(r.article).floor < nearFromDataset(r.article)
    ).length
    expect(up).toBe(39)
    expect(down).toBe(18)
    expect(up + down).toBe(floorRows.length)
    expect(upDs).toBe(up)
    expect(downDs).toBe(down)
    expect(corrText).toContain(`${up} read higher`)
    expect(corrText).toContain(`${down} read lower`)
  })

  it('prints both of the readings for Prince Philip, the near one and the published one', () => {
    const row = floorRows.find((r) => r.article === PHILIP)
    const nearPct = Math.round(Math.abs(nearFromProbe(PHILIP)) * 100)
    expect(nearPct).toBe(74)
    expect(Math.round(Math.abs(nearFromDataset(PHILIP)) * 100)).toBe(nearPct)
    expect(corrText).toContain(`${nearPct}%`)
    expect(corrText).toContain(`${pctOf(row.floor)}%`)
    // The published reading is floor.json's, the same one beat 1 states. dataset.json
    // reads one point lower on this subject, so the disagreement is pinned rather than
    // rounded away, and the page never carries both.
    expect(pctOf(row.floor)).toBe(49)
    expect(pctOf(dsRow(PHILIP).floor)).toBe(50)
    expect(text).toContain(`${pctOf(row.floor)}%`)
    expect(corrText).not.toContain(`${pctOf(dsRow(PHILIP).floor)}%`)
  })

  it('never prints the year-later level, which floor.json rebuilds through a 2dp field', () => {
    // floor.py wrote yr_later as baseline * (1 + res365) and res365 is stored to two
    // places, so the field is a reconstruction and not a measurement. dataset.json puts
    // Prince Philip at a different daily count. The two baselines either side of it are
    // measured medians and are printed; the level between them is drawn and not stated.
    const row = floorRows.find((r) => r.article === PHILIP)
    const e = dsRow(PHILIP)
    expect(row.yr_later).toBe(11031)
    expect(Math.round(e.cleanBase * (1 + e.floor))).not.toBe(row.yr_later)
    expect(corrText).not.toContain(row.yr_later.toLocaleString('en-US'))
    expect(corrText).toContain(probeRow(PHILIP).baseline.toLocaleString('en-US'))
    expect(corrText).toContain(row.clean_base.toLocaleString('en-US'))
    expect(probeRow(PHILIP).baseline).toBe(e.nearBase)
    expect(row.clean_base).toBe(Math.round(e.cleanBase))
  })
})

describe('beat 4 numbers are rows or counts of rows', () => {
  it('every number in the divergence beat traces', () => {
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    for (const name of ['Jeffrey Epstein', 'Ellen DeGeneres', 'Elizabeth II', 'George Michael']) {
      allow(mult1(floorRows.find((r) => r.article === name).floor))
    }
    allow(probe.reduce((a, b) => (b.t50 < a.t50 ? b : a)).t50)
    allow(probe.reduce((a, b) => (b.t50 > a.t50 ? b : a)).t50)
    allow(floorRows.length)
    allow(floorRows.filter((r) => r.floor < 0).length)
    allow(floorRows.filter((r) => r.floor >= 0).length)
    const classes = [...new Set(floorRows.map((r) => r.class))]
    for (const cls of classes) allow(floorRows.filter((r) => r.class === cls).length)
    allow(classes.length)
    allow(classes.filter((c) => floorRows.filter((r) => r.class === c).length < THICK).length)
    allow(floorRows.filter((r) => r.floor > maxDeath.floor).length)
    allow(
      floorRows.filter((r) => r.floor > maxDeath.floor && r.class === 'scandal').length
    )
    allow(
      Math.abs(
        corr(floorRows.map((r) => Math.log10(r.peak)), floorRows.map((r) => r.floor))
      ).toFixed(2)
    )
    // Axis ticks are positions on the scale, not claims. They are allowed only as the
    // exact list the component generates, and every one has to sit inside the drawn range.
    const AXIS = [0.5, 1, 2, 5, 10, 20, 50]
    const lo = Math.min(...floorRows.map((r) => 1 + r.floor))
    const hi = Math.max(...floorRows.map((r) => 1 + r.floor))
    for (const t of AXIS) {
      expect(t, `tick ${t}`).toBeGreaterThan(lo / 1.2)
      expect(t, `tick ${t}`).toBeLessThan(hi * 1.2)
      allow(t)
    }

    const untraceable = (divText.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })

  it('every number in the correction beat traces', () => {
    const row = floorRows.find((r) => r.article === PHILIP)
    const flips = deathRows.filter(
      (r) => Math.sign(r.floor) !== Math.sign(nearFromProbe(r.article))
    ).length
    const belowNear = floorRows.filter((r) => nearFromProbe(r.article) < 0).length
    const belowClean = floorRows.filter((r) => r.floor < 0).length
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    allow(probeRow(PHILIP).baseline)
    allow(row.clean_base)
    allow(row.runup)
    allow(pctOf(row.floor))
    allow(Math.round(Math.abs(nearFromProbe(PHILIP)) * 100))
    const [y, m, d] = row.event.split('-')
    allow(y)
    allow(m)
    allow(d)
    allow(med4(deathRows.map((r) => r.runup)).toFixed(2))
    allow(deathRows.length)
    allow(flips)
    allow(deathRows.length - flips)
    allow(floorRows.length)
    allow(belowNear)
    allow(belowClean)
    allow(Math.round((100 * belowNear) / floorRows.length))
    allow(Math.round((100 * belowClean) / floorRows.length))
    allow(floorRows.filter((r) => r.floor > nearFromProbe(r.article)).length)
    allow(floorRows.filter((r) => r.floor < nearFromProbe(r.article)).length)

    const untraceable = (corrText.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })
})

describe('beat 4 renders as written', () => {
  it('joins no two words where the template breaks a line beside an expression', () => {
    for (const t of [divText, corrText]) {
      expect(t).not.toMatch(/[A-Za-z]\d|\d[A-Za-z]/)
      expect(t).not.toMatch(/\.[A-Za-z]/)
      expect(t).not.toMatch(/[A-Za-z],\d/)
    }
  })

  it('is wired into the page after the beat that takes the name back', () => {
    const page = readFileSync('src/pages/index.astro', 'utf8')
    expect(page).toContain('<BeatDivergence />')
    expect(page).toContain('<BeatCorrection />')
    expect(page.indexOf('<BeatDivergence />')).toBeGreaterThan(page.indexOf('<BeatModel />'))
    expect(page.indexOf('<BeatCorrection />')).toBeGreaterThan(page.indexOf('<BeatDivergence />'))
  })
})

describe('beat 4 gates go red on a planted defect', () => {
  // Every assertion above reads a committed file, and a committed file cannot be perturbed
  // to prove the gate can fail. Each predicate is re-run here against an in-memory copy
  // carrying one planted defect, and each has to flip.
  const clone = () => JSON.parse(JSON.stringify(floorRows))

  it('the sign-change gate fails when nothing in the set is below the rule', () => {
    const rows = clone()
    for (const r of rows) if (r.floor < 0) r.floor = 0.1
    expect(Math.min(...rows.map((r) => r.floor))).not.toBeLessThan(0)
  })

  it('the thin-class rule fails when a thin class is padded past the threshold', () => {
    const rows = clone()
    let moved = 0
    for (const r of rows) if (r.class === 'death' && moved++ < 13) r.class = 'politics'
    const thick = [...new Set(rows.map((r) => r.class))].filter(
      (c) => rows.filter((x) => x.class === c).length >= THICK
    )
    expect(thick).toContain('politics')
  })

  it('the two-file agreement gate fails when one file moves at the printed place', () => {
    const planted = { ...dsRow('Jeffrey Epstein'), floor: highest.floor + 0.1 }
    expect(mult1(planted.floor)).not.toBe(mult1(highest.floor))
  })

  it('the run-up gate fails when the near window matches the clean one', () => {
    const p = { ...dsRow(PHILIP) }
    p.nearBase = p.cleanBase
    expect(p.nearBase / p.cleanBase).not.toBeGreaterThan(1.5)
  })

  it('the correction count fails when a planted row changes which side it is on', () => {
    const rows = clone()
    const target = rows.find((r) => r.floor < 0)
    target.floor = 0.5
    expect(rows.filter((r) => r.floor < 0).length).not.toBe(16)
  })

  it('the spike-size gate fails when the floor is made to follow the peak', () => {
    const rows = clone().map((r) => ({ ...r, floor: Math.log10(r.peak) }))
    const r = corr(rows.map((x) => Math.log10(x.peak)), rows.map((x) => x.floor))
    expect(Math.abs(r)).not.toBeLessThan(0.15)
  })
})
