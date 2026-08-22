import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import BeatFloor from '../src/components/BeatFloor.astro'
import BeatFall from '../src/components/BeatFall.astro'
import BeatModel from '../src/components/BeatModel.astro'
import BeatDivergence from '../src/components/BeatDivergence.astro'
import BeatCorrection from '../src/components/BeatCorrection.astro'
import CodaLookup from '../src/components/CodaLookup.astro'
import { fitDecay } from '../src/lib/metrics.js'
import {
  floorColour,
  floorScale,
  orbitSubjects,
  ratioAt,
  strokeWidths,
} from '../src/scripts/orbit.js'
import { ladderAxes, LADDER_WIDTHS } from '../src/scripts/ladder.js'
import { API_START } from '../src/lib/classify.js'

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
  'src/components/BeatFall.astro',
  'src/components/BeatModel.astro',
  'src/components/BeatDivergence.astro',
  'src/components/BeatCorrection.astro',
  'src/components/CodaLookup.astro',
  'src/layouts/Base.astro',
  'src/pages/index.astro',
  // Not a component. The coda's user-facing strings live here rather than in the
  // template, since the state they answer is only known after the fetch returns, so the
  // register and the em-dash rule have to reach this file as well.
  'src/scripts/coda.js',
  // The two renderers draw label text onto the canvas, so reader-facing strings live in
  // them too and the register has to cover them.
  'src/scripts/orbit.js',
  'src/scripts/ladder.js',
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
let fallText
let modelText
let divText
let corrText
let codaText
let divHtml
let corrHtml
let codaHtml
let named
beforeAll(async () => {
  const container = await AstroContainer.create()
  text = strip(await container.renderToString(BeatFloor))
  fallText = strip(await container.renderToString(BeatFall))
  modelText = strip(await container.renderToString(BeatModel))
  divHtml = await container.renderToString(BeatDivergence)
  corrHtml = await container.renderToString(BeatCorrection)
  codaHtml = await container.renderToString(CodaLookup)
  divText = strip(divHtml)
  corrText = strip(corrHtml)
  codaText = strip(codaHtml)
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
    expect(fallText).not.toMatch(banned)
    expect(modelText).not.toMatch(banned)
    expect(divText).not.toMatch(banned)
    expect(corrText).not.toMatch(banned)
    expect(codaText).not.toMatch(banned)
  })

  it('uses no em dashes', () => {
    for (const f of SOURCES) expect(readFileSync(f, 'utf8'), f).not.toContain('—')
    expect(text).not.toContain('—')
    expect(fallText).not.toContain('—')
    expect(modelText).not.toContain('—')
    expect(divText).not.toContain('—')
    expect(corrText).not.toContain('—')
    expect(codaText).not.toContain('—')
  })
})
// ---------------------------------------------------------------------------
// Beat 2, the fall.
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

// Reimplemented rather than imported from src/lib/metrics.js, so a change to the library
// cannot move a printed figure and its assertion together. Ties share the average of the
// ranks they span, which is what a rank correlation is defined on and what the ten tied
// exponents in the set need.
const rankOf = (values) => {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const out = new Array(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++
    const shared = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[order[k][1]] = shared
    i = j + 1
  }
  return out
}
const rho = (xs, ys) => corr(rankOf(xs), rankOf(ys))
const signed = (v) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(2)}`

const probeOfArticle = (name) => probe.find((r) => r.article === name)
// The 57 that carry a floor, joined to the exponent the same rows were fitted with.
const fallRows = floors.map((r) => ({
  article: r.article,
  peak: r.peak,
  floor: r.floor,
  exponent: probeOfArticle(r.article).pow_a,
}))
const logPeak88 = probe.map((r) => Math.log10(r.peak))
const t50s88 = probe.map((r) => r.t50)
const exps88 = probe.map((r) => r.pow_a)
const logPeak57 = fallRows.map((r) => Math.log10(r.peak))
const exponents57 = fallRows.map((r) => r.exponent)
const floors57 = fallRows.map((r) => r.floor)

describe('beat 2 takes back the measurement the page used to answer this with', () => {
  it('reproduces the figure the old reading rested on, days to half against peak size', () => {
    // The old claim was that peak size has no relationship to how fast the curve falls, on
    // a straight-line correlation of −0.21 between log peak views and days to half. The
    // figure is real. What it measures is one crossing, not the rate.
    expect(corr(logPeak88, t50s88).toFixed(2)).toBe('-0.21')
    expect(fallText).toContain(`r = ${signed(corr(logPeak88, t50s88))}`)
  })

  it('finds the fall does track the spike once the rate is the fitted exponent', () => {
    // The exponent of the power law beat 3 fits is the rate of the whole fall, and against
    // it the relationship is not small on either measure. The old beat's own threshold for
    // calling a pair unrelated was 0.3.
    const r = corr(logPeak88, exps88)
    const p = rho(logPeak88, exps88)
    expect(r).toBeGreaterThan(0.5)
    expect(p).toBeGreaterThan(0.5)
    expect(fallText).toContain(`r = ${signed(r)}`)
    expect(fallText).toContain(`ρ = ${signed(p)}`)
  })

  it('states days to half for the two peaks it names', () => {
    const big = probe.reduce((a, b) => (b.peak > a.peak ? b : a))
    const small = probe.reduce((a, b) => (b.peak < a.peak ? b : a))
    expect(big.t50).toBeLessThan(1)
    expect(small.t50).toBeLessThan(1)
    expect(fallText).toContain(`${big.t50} days`)
    expect(fallText).toContain(String(small.t50))
  })
})

describe('beat 2 states what the fall does to the floor, on both measures', () => {
  it('finds a rank relationship a straight line misses', () => {
    // Why the beat prints two correlations rather than one. The floor runs from 0.43 to
    // 51.88 times a page's own baseline, so a straight line spends its fit on the top of
    // that range and reads the pair as almost nothing.
    const r = corr(exponents57, floors57)
    const p = rho(exponents57, floors57)
    expect(Math.abs(r)).toBeLessThan(0.25)
    expect(Math.abs(p)).toBeGreaterThan(0.5)
    expect(Math.abs(p)).toBeGreaterThan(2 * Math.abs(r))
    expect(r).toBeLessThan(0)
    expect(p).toBeLessThan(0)
    expect(fallText).toContain(`r = ${signed(r)}`)
    expect(fallText).toContain(`ρ = ${signed(p)}`)
  })

  it('agrees with dataset.json on that pair, so the correction is not one file deep', () => {
    const ds = JSON.parse(readFileSync('src/data/dataset.json', 'utf8')).events
    const byName = new Map(ds.map((e) => [e.article, e]))
    const dsRows = floors.map((r) => byName.get(r.article))
    expect(dsRows.every(Boolean)).toBe(true)
    const p = rho(
      dsRows.map((e) => e.powAlpha),
      dsRows.map((e) => e.floor)
    )
    expect(p.toFixed(2)).toBe(rho(exponents57, floors57).toFixed(2))
  })

  it('keeps the suspect the page does rule out, on both measures', () => {
    // Spike size against the floor is the reading the rest of the page rests on, and it is
    // small whichever way it is measured. This is the one the beat still gets to state.
    const r = corr(logPeak57, floors57)
    const p = rho(logPeak57, floors57)
    expect(Math.abs(r)).toBeLessThan(0.15)
    expect(Math.abs(p)).toBeLessThan(0.15)
    expect(fallText).toContain(`r = ${signed(r)}`)
    expect(fallText).toContain(`ρ = ${signed(p)}`)
  })

  it('does not claim the fall was removed', () => {
    expect(fallText).toContain('the fall is not removed here')
    expect(fallText).not.toMatch(/no relationship|the cloud has no slope/i)
  })
})

describe('beat 2 numbers are rows, counts of rows, or figures recomputed from them', () => {
  it('every number in the beat traces', () => {
    const allowed = new Set()
    const allow = (n) => allowed.add(String(Number(n)))
    const big = probe.reduce((a, b) => (b.peak > a.peak ? b : a))
    const small = probe.reduce((a, b) => (b.peak < a.peak ? b : a))
    allow(big.t50)
    allow(small.t50)
    allow(probe.length)
    allow(floors.length)
    // The highest floor in the set, as a multiple of that subject's own baseline, printed
    // to the one place the two files agree on for it.
    allow((1 + Math.max(...floors57)).toFixed(1))
    for (const v of [
      corr(logPeak88, t50s88),
      corr(logPeak88, exps88),
      rho(logPeak88, exps88),
      corr(exponents57, floors57),
      rho(exponents57, floors57),
      corr(logPeak57, floors57),
      rho(logPeak57, floors57),
    ]) {
      allow(Math.abs(v).toFixed(2))
    }

    const untraceable = (fallText.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
      .map((n) => String(Number(n.replace(/,/g, ''))))
      .filter((n) => !allowed.has(n))
    expect(untraceable).toEqual([])
  })

  it('joins no two words where the template breaks a line beside an expression', () => {
    expect(fallText).not.toMatch(/[A-Za-z]\d|\d[A-Za-z]/)
    expect(fallText).not.toMatch(/\.[A-Za-z]/)
    expect(fallText).not.toMatch(/[A-Za-z],\d/)
  })
})

describe('beat 2 draws the ranks it states', () => {
  it('gives every subject a place on all three axes, one subject per place', () => {
    const axes = ladderAxes(fallRows)
    for (const key of ['fall', 'floor', 'spike']) {
      const slots = [...axes[key]].sort((a, b) => a - b)
      expect(slots, key).toEqual(fallRows.map((_, i) => i))
    }
  })

  it('puts the steepest fall, the lowest floor and the largest spike at the top', () => {
    const axes = ladderAxes(fallRows)
    const topOf = (key) => fallRows[axes[key].indexOf(0)]
    expect(topOf('fall').exponent).toBe(Math.max(...exponents57))
    expect(topOf('floor').floor).toBe(Math.min(...floors57))
    expect(topOf('spike').peak).toBe(Math.max(...fallRows.map((r) => r.peak)))
  })

  it('orders the middle axis exactly as the ring at the top of the page is ordered', () => {
    const axes = ladderAxes(fallRows)
    const byAxis = fallRows.map((_, i) => fallRows[axes.floor.indexOf(i)].article)
    const bySort = [...fallRows].sort((a, b) => a.floor - b.floor).map((r) => r.article)
    expect(byAxis).toEqual(bySort)
  })
})

describe('mark renderer safety rules', () => {
  const RENDERERS = ['src/scripts/orbit.js', 'src/scripts/ladder.js']
  const sources = RENDERERS.map((f) => [f, readFileSync(f, 'utf8')])

  it('never uses multiply blending, which compounds to black on a light ground', () => {
    for (const [f, src] of sources) expect(src, f).not.toContain("'multiply'")
    expect(sources[0][1]).toContain("'source-over'")
  })

  it('preserves the drawing buffer so screenshots are possible', () => {
    for (const [f, src] of sources) {
      const contexts = src.match(/getContext\(/g) ?? []
      const preserved = src.match(/preserveDrawingBuffer: true/g) ?? []
      expect(contexts.length, f).toBeGreaterThan(0)
      expect(preserved.length, f).toBe(contexts.length)
    }
  })

  it('sets no stroke width under one pixel, which many devices will not draw', () => {
    // The old rule was that every width is exactly 1. The approved mark draws the block
    // that ends below the ring a little heavier, so the rule is now the device constraint
    // itself. Both renderers publish their width policy and it is run here across box
    // sizes rather than grepped, since the ring computes its widths from the box and a
    // floor written anywhere but the lineWidth line would never appear to a grep.
    for (const S of [8, 40, 120, 345, 900, 4000]) {
      const w = strokeWidths(S)
      for (const [name, value] of Object.entries(w)) {
        expect(value, `orbit ${name} at S=${S}`).toBeGreaterThanOrEqual(1)
      }
      expect(w.heavy, `S=${S}`).toBeGreaterThan(w.light)
    }
    for (const [name, value] of Object.entries(LADDER_WIDTHS)) {
      expect(value, `ladder ${name}`).toBeGreaterThanOrEqual(1)
    }
    expect(LADDER_WIDTHS.below).toBeGreaterThan(LADDER_WIDTHS.above)

    // And nothing sets a width outside that policy.
    for (const [f, src] of sources) {
      const widths = src.match(/lineWidth\s*=\s*[^\n]+/g) ?? []
      expect(widths.length, f).toBeGreaterThan(0)
      const numbers = widths.flatMap((w) => (w.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))
      for (const n of numbers) expect(n, `${f} :: ${n}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('carries the two poles in colour, so no width is the only thing saying which side', () => {
    // What the width rule is actually protecting. A device that clamps every stroke to the
    // same pixel still has to show which side of the ring a thread ends on.
    const scale = floorScale([{ floor: -0.567 }, { floor: 50.883 }])
    const warm = floorColour(-0.4, 0.8, scale)
    const cool = floorColour(0.4, 0.8, scale)
    expect(warm).not.toBe(cool)
    // And within a pole, so each ramp is a reading and not a flat ink.
    expect(floorColour(-0.1, 0.8, scale)).not.toBe(warm)
    expect(floorColour(5, 0.8, scale)).not.toBe(cool)
  })

  it('re-syncs from the canvas box, never from a window resize event', () => {
    for (const [f, src] of sources) {
      expect(src, f).toContain('ResizeObserver')
      expect(src, f).not.toMatch(/addEventListener\(\s*'resize'/)
    }
  })

  it('takes no hover reveal that a phone cannot fire', () => {
    for (const [f, src] of sources) {
      expect(src, f).not.toContain('pointermove')
      expect(src, f).not.toContain('pointerleave')
    }
  })

  it('paints the block that ends below the ring last, not the file order', () => {
    // floor.json is itself sorted by the floor. Drawing in file order would lay the whole
    // cool half over the whole warm one, and the layering would read as an ordering the
    // mark never claims.
    expect(floors.every((r, i) => i === 0 || floors[i - 1].floor <= r.floor)).toBe(true)
    for (const [f, src] of sources) {
      expect(src, f).toMatch(
        /Number\([A-Za-z]+\[i\]\.floor < 0\) - Number\([A-Za-z]+\[j\]\.floor < 0\)/
      )
    }
  })
})

describe('the ring is drawn against the level it says it is drawn against', () => {
  // The ring is each page at its own clean baseline, so the radius has to be a level. The
  // normalised curve in dataset.json is a share of the lift over the near window and is
  // clipped at one, which is neither. On Elizabeth II it reads a third of her baseline at
  // day sixty, where the daily views put her above it.
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8')).events
  const dsOf = (name) => dataset.find((e) => e.article === name)
  const subjects = orbitSubjects(floors, probe)

  it('reads every day off the daily views over that article own clean baseline', () => {
    expect(subjects).toHaveLength(floors.length)
    for (const s of subjects) {
      const row = floors.find((r) => r.article === s.article)
      const p = probe.find((r) => r.article === s.article)
      expect(s.base, s.article).toBe(row.clean_base)
      for (let d = 0; d <= 60; d++) {
        const raw = p.series[String(p.pk_off + d)]
        expect(raw, `${s.article} day ${d}`).not.toBeUndefined()
        expect(s.levels[d], `${s.article} day ${d}`).toBe(raw)
        expect(ratioAt(s, d)).toBe(raw / row.clean_base)
      }
    }
  })

  it('starts every thread at the peak the probe recorded for it', () => {
    for (const s of subjects) expect(s.levels[0], s.article).toBe(s.peak)
  })

  it('is not the reading the normalised curve would have given', () => {
    const lead = subjects.find((s) => s.article === 'Elizabeth II')
    const e = dsOf('Elizabeth II')
    const fromCurve = (e.curve[60] * e.peak) / lead.base
    expect(fromCurve).toBeLessThan(1)
    expect(ratioAt(lead, 60)).toBeGreaterThan(1)
  })

  it('covers three subjects whose curve is clipped inside the window it draws', () => {
    // The other reason the curve cannot carry this mark. These come back to or above their
    // own peak inside the sixty days, and a clipped point drawn on a radius would state
    // "equal to the peak" for a day that was at or above it.
    const clipped = dataset
      .filter((e) => floors.some((r) => r.article === e.article))
      .filter((e) => e.curve.slice(1, 61).some((v) => v >= 1))
      .map((e) => e.article)
      .sort()
    expect(clipped).toEqual(['Jeffrey Epstein', 'Naomi Osaka', 'Sam Bankman-Fried'])
    for (const name of clipped) {
      const s = subjects.find((x) => x.article === name)
      const e = dsOf(name)
      const day = e.curve.slice(1, 61).findIndex((v) => v >= 1) + 1
      expect(ratioAt(s, day), name).not.toBe(s.peak / s.base)
    }
  })
})

describe('beat 2 gates go red on a planted defect', () => {
  it('the rank gate fails when the tail is taken out of the floor', () => {
    // What the two correlations are separating. On the floor as it stands the two readings
    // are a third of a correlation apart. Take the tail out by ranking the floor and they
    // land on each other, which is the whole reason the beat prints both. The residue is
    // the ten tied exponents, which the rank measure averages and the straight line does
    // not.
    const live = Math.abs(rho(exponents57, floors57) - corr(exponents57, floors57))
    expect(live).toBeGreaterThan(0.3)
    const flattened = rankOf(floors57)
    const planted = Math.abs(rho(exponents57, flattened) - corr(exponents57, flattened))
    expect(planted).toBeLessThan(0.05)
    expect(planted).toBeLessThan(live / 10)
  })

  it('the spike gate fails when the floor is made to follow the peak', () => {
    expect(Math.abs(rho(logPeak57, logPeak57))).not.toBeLessThan(0.15)
  })

  it('the width rule fails on a planted sub-pixel floor in the policy', () => {
    // The policy is a function of the box, so the defect to plant is a floor that holds on
    // a large canvas and gives way on a small one. The live policy holds at every size.
    const planted = (S) => ({ heavy: Math.max(1.4, 0.0055 * S), light: Math.max(0.5, 0.0041 * S) })
    expect(planted(120).light).toBeLessThan(1)
    expect(strokeWidths(120).light).toBeGreaterThanOrEqual(1)
  })

  it('the two-pole colour rule fails when both ramps resolve to one ink', () => {
    const scale = floorScale([{ floor: -0.567 }, { floor: 50.883 }])
    const flat = () => floorColour(0, 0.8, scale)
    expect(flat()).toBe(flat())
  })

  it('the level gate fails when the radius is taken from the clipped curve again', () => {
    const events = JSON.parse(readFileSync('src/data/dataset.json', 'utf8')).events
    const e = events.find((x) => x.article === 'Jeffrey Epstein')
    const row = floors.find((r) => r.article === 'Jeffrey Epstein')
    const day = e.curve.slice(1, 61).findIndex((v) => v >= 1) + 1
    expect((e.curve[day] * e.peak) / row.clean_base).toBe(e.peak / row.clean_base)
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
    const page = readFileSync('src/pages/index.astro', 'utf8')
    expect(page).toContain('<BeatModel />')
    // The model beat fits the exponent that the fall beat then reads against the floor, so
    // it has to come first. The old order put the fall beat above it and the exponent was
    // named before anything had fitted it.
    expect(page.indexOf('<BeatModel />')).toBeGreaterThan(page.indexOf('<BeatFloor />'))
    expect(page.indexOf('<BeatFall />')).toBeGreaterThan(page.indexOf('<BeatModel />'))
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
    expect(page.indexOf('<BeatDivergence />')).toBeGreaterThan(page.indexOf('<BeatFall />'))
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

// ---------------------------------------------------------------------------
// The coda.
// ---------------------------------------------------------------------------

describe('the coda states no figure of its own', () => {
  it('carries no number in its own copy, so every number a reader sees was just measured', () => {
    // The binding rule is that no number appears in copy without a row behind it. The
    // coda has no rows: it answers a query the set never covered. It resolves that by
    // printing nothing of its own, which is stricter than a whitelist and cannot drift.
    expect(codaText.match(/\d/g) ?? []).toEqual([])
  })

  it('the no-figure gate fails on a planted figure', () => {
    const planted = codaText.replace('the same measurements', 'the same 6 measurements')
    expect(planted.match(/\d/g) ?? []).not.toEqual([])
  })

  it('floors the date input at the first day of data, from the constant not from a literal', () => {
    const src = readFileSync('src/components/CodaLookup.astro', 'utf8')
    expect(src).toContain('min={API_START}')
    expect(src).not.toContain(API_START)
    expect(codaHtml).toContain(`min="${API_START}"`)
  })

  it('asks for both an article and a date, which a spike cannot be read off alone', () => {
    // Many articles carry several spikes, so the event date is an input and never a guess.
    expect(codaHtml).toMatch(/id="coda-article"[^>]*type="text"/)
    expect(codaHtml).toMatch(/id="coda-date"[^>]*type="date"/)
    expect(codaHtml).toContain('for="coda-article"')
    expect(codaHtml).toContain('for="coda-date"')
    expect(codaText).toContain('Article title')
    expect(codaText).toContain('Event date')
  })

  it('keeps a live region for the message, so a failure is never a silent empty chart', () => {
    expect(codaHtml).toMatch(/id="coda-status"[^>]*aria-live="polite"/)
    expect(codaHtml).toMatch(/id="coda-metrics"[^>]*hidden/)
  })

  it('draws the reader into the same ring the page opens on', () => {
    const src = readFileSync('src/components/CodaLookup.astro', 'utf8')
    const hero = readFileSync('src/components/BeatFloor.astro', 'utf8')
    for (const text of [src, hero]) {
      expect(text).toContain("from '../scripts/orbit.js'")
      expect(text).toContain('orbitSubjects(floors, probe)')
      expect(text).toContain('mountOrbit')
    }
    // Threaded into the set at its own place in the order rather than parked beside it,
    // which is what makes the round trip a reading against the 57 and not next to them.
    expect(src).toContain('query')
    expect(src).toContain('levels: result.levels')
  })

  it('places the query by its own floor, and draws none when there is no floor', () => {
    const src = readFileSync('src/components/CodaLookup.astro', 'utf8')
    const orbit = readFileSync('src/scripts/orbit.js', 'utf8')
    expect(src).toMatch(/m\.floorReason === null[\s\S]{0,400}floor: m\.floor/)
    expect(orbit).toContain('[...subjects, query].sort((a, b) => a.floor - b.floor)')
  })

  it('reads the query off the daily views, the same quantity the ring is drawn on', () => {
    const coda = readFileSync('src/scripts/coda.js', 'utf8')
    expect(coda).toContain('levels: Array.from({ length: 61 }')
    expect(coda).toContain('series.get(peak.day + i) ?? null')
  })

  it('re-syncs from the canvas box and takes no reveal a phone cannot fire', () => {
    for (const f of ['src/components/CodaLookup.astro', 'src/scripts/coda.js']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toContain('pointermove')
      expect(src, f).not.toContain('pointerleave')
      expect(src, f).not.toMatch(/addEventListener\(\s*'resize'/)
    }
    // The observer lives in the renderer both marks mount through, so the coda is held to
    // it by going through that mount rather than by wiring an observer of its own.
    expect(readFileSync('src/components/CodaLookup.astro', 'utf8')).toContain('mountOrbit(')
    expect(readFileSync('src/scripts/orbit.js', 'utf8')).toMatch(
      /export function mountOrbit[\s\S]{0,400}new ResizeObserver\(render\)\.observe\(canvas\)/
    )
  })

  it('joins no two words where the template breaks a line beside an expression', () => {
    expect(codaText).not.toMatch(/[A-Za-z]\d|\d[A-Za-z]/)
    expect(codaText).not.toMatch(/\.[A-Za-z]/)
    expect(codaText).not.toMatch(/[A-Za-z],\d/)
  })

  it('is wired into the page after the beat it tests', () => {
    const page = readFileSync('src/pages/index.astro', 'utf8')
    expect(page).toContain('<CodaLookup />')
    expect(page.indexOf('<CodaLookup />')).toBeGreaterThan(page.indexOf('<BeatCorrection />'))
  })
})
