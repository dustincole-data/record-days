import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { lookup, curve, MESSAGES, FLOOR_NOTES, FROM, TO } from '../src/scripts/coda.js'
import { fetchSeries, toSeries } from '../src/lib/pageviews.js'
import { baseline, findPeak, crossing, fitDecay, floor } from '../src/lib/metrics.js'
import {
  articleType,
  floorEligibility,
  API_START,
  MIN_BASELINE,
} from '../src/lib/classify.js'

// ---------------------------------------------------------------------------
// A stub API. No network runs in this file.
// ---------------------------------------------------------------------------

const EVENT = '2022-09-08'

const stampAt = (eventDate, offset) => {
  const d = new Date(eventDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10).replace(/-/g, '') + '00'
}

// A power-law fall onto a pre-event level, which is the shape the fitted events hold.
// tail replaces the level from tailFrom onward, so a test can put the year-out window
// wherever it needs it.
//
// The pre-event level drifts by half a view a day rather than sitting flat. A flat level
// has the same median over every window, so a coda that read its near baseline from the
// wrong days would agree with the library anyway and the parity check above would pass on
// a series that could not tell them apart. The decoy is the same trap on the peak window:
// a spike outside the default -3..25 that a widened window would pick up instead.
function synth({
  event = EVENT,
  base = 1200,
  peak = 400000,
  from = FROM,
  to = TO,
  tail = null,
  tailFrom = 300,
  decoy = true,
} = {}) {
  const rows = []
  for (let d = from; d <= to; d++) {
    let views =
      d < 0 ? base + Math.round(-d / 2) : Math.round(base + (peak - base) * (d + 1) ** -1.3)
    if (tail !== null && d >= tailFrom) views = tail
    if (decoy && d === 200) views = peak * 2
    rows.push([d, views])
  }
  return rows
}

const items = (rows, event = EVENT) =>
  rows.map(([offset, views]) => ({ timestamp: stampAt(event, offset), views }))

const serve = (rows, event = EVENT) => {
  const calls = []
  const impl = async (url) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => ({ items: items(rows, event) }) }
  }
  impl.calls = calls
  return impl
}

const status = (code) => async () => ({
  ok: code === 200,
  status: code,
  json: async () => ({ items: [] }),
})

// ---------------------------------------------------------------------------
// Every row of the error table in Task 12, and the two states the table omits.
// ---------------------------------------------------------------------------

describe('coda states', () => {
  it('reports a missing article rather than throwing', async () => {
    const r = await lookup('Nope', EVENT, status(404))
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not-found')
    expect(r.metrics).toBe(null)
    expect(r.curve).toBe(null)
  })

  it('refuses a date before the API start without fetching', async () => {
    let called = false
    const r = await lookup('X', '2014-01-01', async () => {
      called = true
    })
    expect(called).toBe(false)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('before-api')
  })

  it('accepts the API start date itself, which is a day of data and not a gap', async () => {
    let called = false
    await lookup('X', API_START, async () => {
      called = true
      return { ok: false, status: 404 }
    })
    expect(called).toBe(true)
  })

  it('retries once on a transient error before failing visibly', async () => {
    let n = 0
    const flaky = async () => {
      n++
      return { ok: false, status: 503 }
    }
    const r = await lookup('X', EVENT, flaky)
    expect(n).toBe(2)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('error')
  })

  it('keeps the answer when the retry is the call that succeeds', async () => {
    // A retry that discarded a good second response would fail visibly on a query that
    // actually worked, which is the same silent hole seen from the other side.
    let n = 0
    const good = serve(synth({ tail: 2400 }))
    const flaky = async (url) => {
      n++
      if (n === 1) return { ok: false, status: 429 }
      return good(url)
    }
    const r = await lookup('X', EVENT, flaky)
    expect(n).toBe(2)
    expect(r.ok).toBe(true)
    expect(r.reason).toBe(null)
  })

  it('does not retry a 404, which is an answer rather than a failure', async () => {
    let n = 0
    const missing = async () => {
      n++
      return { ok: false, status: 404 }
    }
    const r = await lookup('Nope', EVENT, missing)
    expect(n).toBe(1)
    expect(r.reason).toBe('not-found')
  })

  it('reports no spike rather than an error when the window holds no lift', async () => {
    const r = await lookup('X', EVENT, serve(synth({ peak: 1200 })))
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-spike')
  })

  it('reports no spike when the peak window itself has no data', async () => {
    // A date whose window sits past the end of the data. The series is not empty, so this
    // is not the missing-article state.
    const r = await lookup('X', EVENT, serve(synth({ to: -30 })))
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-spike')
  })
})

describe('coda floor states', () => {
  const run = (opts, event = EVENT) =>
    lookup('X', event, serve(synth({ ...opts, event }), event))

  it('draws the fall and names the pre-API state when the clean window predates the data', async () => {
    // 2016-06-03 less 455 days lands in March 2015, ahead of the first day of daily data.
    const r = await run({ from: -338, tail: 2400 }, '2016-06-03')
    expect(r.ok).toBe(true)
    expect(r.curve).toHaveLength(61)
    expect(r.metrics.floorReason).toBe('pre-api')
    expect(r.metrics.floor).toBe(null)
  })

  it('draws the fall and names the event-article state when nothing precedes the event', async () => {
    const r = await run({ from: 0, tail: 2400 })
    expect(r.ok).toBe(true)
    expect(r.metrics.atype).toBe('event')
    expect(r.metrics.floorReason).toBe('event-article')
    expect(r.metrics.floor).toBe(null)
  })

  it('withholds the floor entirely at low volume rather than printing the ratio', async () => {
    const r = await run({ base: 200, peak: 50000, tail: 4000 })
    expect(r.ok).toBe(true)
    expect(r.metrics.floorReason).toBe('low-volume')
    // The ratio here is nineteen times the clean baseline and is a denominator artefact.
    // Task 12 says it is never printed, so it is never computed either.
    expect(r.metrics.floor).toBe(null)
    expect(r.metrics.cleanBase).toBeLessThan(MIN_BASELINE)
  })

  it('names the open year-out window rather than folding it into the pre-API state', async () => {
    // build-dataset.js folds a missing year-out window into 'pre-api', which reads as a
    // statement about 2015 and would be false for an event three months old. The coda
    // answers live queries, so it carries its own state for this.
    const r = await run({ to: 300, tail: 2400, tailFrom: 200 })
    expect(r.ok).toBe(true)
    expect(r.metrics.floorReason).toBe('floor-window-open')
    expect(r.metrics.floor).toBe(null)
  })

  it('measures a floor when the article qualifies', async () => {
    const r = await run({ tail: 2400 })
    expect(r.ok).toBe(true)
    expect(r.reason).toBe(null)
    expect(r.metrics.floorReason).toBe(null)
    // The clean window and the near window sit at different points on the drift, so the
    // two baselines differ and a swap between them is visible here.
    expect(r.metrics.cleanBase).toBe(1381.5)
    expect(r.metrics.nearBase).toBe(1225)
    // The year-out level is the fixture's tail, set against the clean baseline and not
    // against the near one.
    expect(r.metrics.floor).toBeCloseTo((2400 - 1381.5) / 1381.5, 12)
    expect(r.metrics.floor.toFixed(4)).toBe('0.7372')
  })
})

// ---------------------------------------------------------------------------
// The coda is a live test of the pipeline, so it has to be the pipeline.
// ---------------------------------------------------------------------------

describe('coda runs the published pipeline rather than a second one', () => {
  it('requests the window build-dataset.js requests, to the day', async () => {
    const impl = serve(synth({ tail: 2400 }))
    await lookup('Elizabeth II', EVENT, impl)
    expect(impl.calls).toHaveLength(1)

    let expected = null
    await fetchSeries('Elizabeth II', EVENT, {
      from: -455,
      to: 400,
      fetchImpl: async (url) => {
        expected = url
        return { ok: true, status: 200, json: async () => ({ items: [] }) }
      },
    })
    expect(impl.calls[0]).toBe(expected)
    expect(FROM).toBe(-455)
    expect(TO).toBe(400)
  })

  it('returns exactly what the library returns, called in the build script order', async () => {
    const rows = synth({ tail: 2400 })
    const series = toSeries(items(rows), EVENT)
    const r = await lookup('X', EVENT, serve(rows))

    const atype = articleType(series)
    const nearBase = atype === 'subject' ? baseline(series, -90, -8) : 0
    const peak = findPeak(series)
    const peakExcess = peak.views - nearBase
    const elig = floorEligibility(series, EVENT)
    const fit = fitDecay(series, peak.day, nearBase)

    expect(r.metrics.atype).toBe(atype)
    expect(r.metrics.peak).toBe(peak.views)
    expect(r.metrics.peakDay).toBe(peak.day)
    expect(r.metrics.nearBase).toBe(nearBase)
    expect(r.metrics.cleanBase).toBe(elig.cleanBase)
    expect(r.metrics.t50).toBe(crossing(series, peak.day, peakExcess, nearBase, 0.5))
    expect(r.metrics.t10).toBe(crossing(series, peak.day, peakExcess, nearBase, 0.1))
    expect(r.metrics.expHalfLife).toBe(fit.expHalfLife)
    expect(r.metrics.expR2).toBe(fit.expR2)
    expect(r.metrics.powAlpha).toBe(fit.powAlpha)
    expect(r.metrics.powR2).toBe(fit.powR2)
    expect(r.metrics.floor).toBe(floor(series, peak.day, elig.cleanBase))
    expect(r.curve).toEqual(curve(series, peak.day, nearBase, peakExcess))
  })

  it('carries every field a dataset row carries, under the same names', async () => {
    // The round trip in Task 13 compares a reader's answer against a committed row. A
    // renamed or dropped field turns that comparison into a silent pass.
    const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
    const r = await lookup('X', EVENT, serve(synth({ tail: 2400 })))
    const rowKeys = Object.keys(dataset.events[0]).filter(
      (k) => k !== 'class' && k !== 'curve'
    )
    expect(Object.keys(r.metrics).sort()).toEqual(rowKeys.sort())
  })

  it('normalises the curve with the build script function, character for character', () => {
    // curve() is the one step the coda cannot import, since build-dataset.js runs a fetch
    // loop at import time. The two bodies are compared as text instead.
    const pull = (file) => {
      const src = readFileSync(file, 'utf8')
      const m = src.match(/(?:export )?function curve\([\s\S]*?\n\}/)
      expect(m, file).not.toBe(null)
      return m[0].replace(/^export /, '').replace(/\s+/g, ' ')
    }
    expect(pull('src/scripts/coda.js')).toBe(pull('scripts/build-dataset.js'))
  })

  it('defines no metric of its own', () => {
    const src = readFileSync('src/scripts/coda.js', 'utf8')
    const defined = [...src.matchAll(/^(?:export )?function (\w+)/gm)].map((m) => m[1])
    expect(defined).toEqual(['curve'])
    for (const name of ['baseline', 'findPeak', 'crossing', 'fitDecay', 'floor']) {
      expect(src, name).toMatch(new RegExp(`\\b${name}\\b`))
      expect(src, name).not.toMatch(new RegExp(`function ${name}\\b`))
    }
  })
})

describe('the coda and the committed set agree on which floors exist', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))

  it('never needed the build script folds, on any of the committed events', () => {
    // build-dataset.js can move an eligible event to 'pre-api' two further ways: a clean
    // window under 120 covered days, and an empty year-out window. Either fold leaves a
    // clean baseline on the row while the reason says pre-api. The coda carries neither
    // rule, so the round trip holds only while no committed row took those paths.
    const folded = dataset.events.filter(
      (e) => e.floorReason === 'pre-api' && e.cleanBase !== null
    )
    expect(folded.map((e) => e.article)).toEqual([])

    const reasons = [...new Set(dataset.events.map((e) => e.floorReason))]
    expect(reasons.filter((r) => r !== null).sort()).toEqual([
      'event-article',
      'low-volume',
      'pre-api',
    ])
    expect(dataset.events.filter((e) => e.floorReason === 'floor-window-open')).toEqual([])
  })

  it('gives every reason a dataset row holds a note of its own', () => {
    for (const e of dataset.events) {
      if (e.floorReason === null) continue
      expect(FLOOR_NOTES, e.article).toHaveProperty(e.floorReason)
    }
  })
})

describe('coda gates go red on a planted defect', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))

  it('the fold gate fails when a row carries a clean baseline under a pre-API reason', () => {
    const rows = JSON.parse(JSON.stringify(dataset.events))
    rows.find((e) => e.floorReason === 'pre-api').cleanBase = 5000
    expect(
      rows.filter((e) => e.floorReason === 'pre-api' && e.cleanBase !== null)
    ).not.toEqual([])
  })

  it('the reason-set gate fails when a fourth reason appears in the file', () => {
    const rows = JSON.parse(JSON.stringify(dataset.events))
    rows[0].floorReason = 'floor-window-open'
    expect(rows.filter((e) => e.floorReason === 'floor-window-open')).not.toEqual([])
  })

  it('the field-name gate fails when a row field is renamed', () => {
    const row = { ...dataset.events[0] }
    row.floorWhy = row.floorReason
    delete row.floorReason
    const keys = (o) => Object.keys(o).filter((k) => k !== 'class' && k !== 'curve').sort()
    expect(keys(row)).not.toEqual(keys(dataset.events[0]))
  })
})

// ---------------------------------------------------------------------------
// What the reader is told, for each state.
// ---------------------------------------------------------------------------

describe('coda messages', () => {
  const REASONS = ['before-api', 'not-found', 'no-spike', 'error']
  const FLOOR_REASONS = ['pre-api', 'event-article', 'low-volume', 'floor-window-open']

  it('answers every failing state with a message and never with silence', () => {
    expect(Object.keys(MESSAGES).sort()).toEqual([...REASONS].sort())
    for (const r of REASONS) expect(MESSAGES[r].length, r).toBeGreaterThan(10)
  })

  it('answers every floor state with a note', () => {
    expect(Object.keys(FLOOR_NOTES).sort()).toEqual([...FLOOR_REASONS].sort())
    for (const r of FLOOR_REASONS) expect(FLOOR_NOTES[r].length, r).toBeGreaterThan(10)
  })

  it('states the first day of data from the constant the fetch code enforces', () => {
    expect(API_START).toBe('2015-07-01')
    expect(MESSAGES['before-api']).toContain(API_START)
    const src = readFileSync('src/scripts/coda.js', 'utf8')
    expect(src).not.toContain('2015-07-01')
  })

  it('gives the title format on the missing-article message, as the table requires', () => {
    expect(MESSAGES['not-found']).toContain('No English Wikipedia article by that name.')
    expect(MESSAGES['not-found'].toLowerCase()).toContain('underscore')
  })

  it('prints no figure in any message', () => {
    // Every number a reader sees in the coda is one just measured from their own query. A
    // figure written into a message would be a published claim with no row behind it. The
    // one date the reader needs is interpolated from API_START, not typed.
    const written = { ...MESSAGES, 'before-api': MESSAGES['before-api'].replace(API_START, '') }
    for (const m of [...Object.values(written), ...Object.values(FLOOR_NOTES)]) {
      expect(m.match(/\d/g) ?? [], m).toEqual([])
    }
  })

  it('the no-figure gate fails on a planted figure', () => {
    const planted = { ...MESSAGES, 'no-spike': 'No event spike in this 30 day window.' }
    expect(Object.values(planted).filter((m) => /\d/.test(m))).not.toEqual([])
  })

  it('never reaches for an error word on the state Task 12 says is not one', () => {
    expect(MESSAGES['no-spike'].toLowerCase()).not.toContain('error')
    expect(MESSAGES['no-spike'].toLowerCase()).not.toContain('failed')
  })
})
