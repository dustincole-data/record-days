import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

const DATASET = 'src/data/dataset.json'
const PROBE = 'data/probe/results2.json'
const FLOOR = 'data/probe/floor.json'

const ours = () => JSON.parse(readFileSync(DATASET, 'utf8')).events
const theirs = () => JSON.parse(readFileSync(PROBE, 'utf8'))
const theirFloors = () => JSON.parse(readFileSync(FLOOR, 'utf8'))
const index = (rows) => Object.fromEntries(rows.map((e) => [e.article, e]))

// The probe rounded every figure before storing it. The library does not round, because
// rounding inside a metric destroys precision the next metric needs. So the rounding is
// applied here, at compare time, to put both sides on one scale. Tolerance is half of the
// probe's last kept digit, which states "ours rounds to what the probe published" without
// depending on which way a tie broke.
const round = (x, n) => Number(x.toFixed(n))
const HALF_ULP = { 2: 0.005, 3: 0.0005 }

// Python's round() breaks an exact tie to the even neighbour, JavaScript's breaks it away
// from zero. Ten of the clean baselines are medians of an even number of days and land on
// exactly .5, so the two disagree on every one of them. Only the comparisons that demand
// exact equality need this; the rest carry a half-digit tolerance that absorbs a tie.
function roundHalfEven(x) {
  if (!Number.isFinite(x)) return NaN
  const down = Math.trunc(x)
  const frac = x - down
  if (Math.abs(frac) !== 0.5) return Math.round(x)
  return down % 2 === 0 ? down : down + Math.sign(x)
}

function driftAt(dp, ourKey, theirKey) {
  const byArticle = index(theirs())
  const drift = []
  for (const e of ours()) {
    const ref = byArticle[e.article]
    if (!ref) {
      drift.push(`${e.article}: not in probe`)
      continue
    }
    const a = e[ourKey]
    const b = ref[theirKey]
    if (a === null && b === null) continue
    if (a === null || b === null) {
      drift.push(`${e.article}: ours ${a} vs probe ${b} (null disagreement)`)
      continue
    }
    if (Math.abs(a - b) > HALF_ULP[dp] + 1e-9) {
      drift.push(`${e.article}: ours ${a} vs probe ${b}`)
    }
  }
  return drift
}

describe('dataset parity with the Python probe', () => {
  it('has been generated', () => {
    expect(existsSync(DATASET)).toBe(true)
  })

  it('contains every event the probe measured', () => {
    expect(ours().length).toBe(theirs().length)
    expect(new Set(ours().map((e) => e.article))).toEqual(
      new Set(theirs().map((e) => e.article))
    )
  })

  it('reproduces the probe t50 for every event to the digit the probe kept', () => {
    expect(driftAt(2, 't50', 't50')).toEqual([])
  })

  it('reproduces the probe t10 for every event to the digit the probe kept', () => {
    expect(driftAt(2, 't10', 't10')).toEqual([])
  })

  it('reproduces the probe decay fits for every event', () => {
    expect(driftAt(2, 'expHalfLife', 'exp_hl')).toEqual([])
    expect(driftAt(2, 'powAlpha', 'pow_a')).toEqual([])
    expect(driftAt(3, 'expR2', 'exp_r2')).toEqual([])
    expect(driftAt(3, 'powR2', 'pow_r2')).toEqual([])
  })

  it('reproduces the probe peak views exactly', () => {
    const byArticle = index(theirs())
    const drift = ours()
      .filter((e) => byArticle[e.article] && e.peak !== byArticle[e.article].peak)
      .map((e) => `${e.article}: ours ${e.peak} vs probe ${byArticle[e.article].peak}`)
    expect(drift).toEqual([])
  })

  it('reproduces the probe peak day exactly', () => {
    const byArticle = index(theirs())
    const drift = ours()
      .filter((e) => byArticle[e.article] && e.peakDay !== byArticle[e.article].pk_off)
      .map((e) => `${e.article}: ours ${e.peakDay} vs probe ${byArticle[e.article].pk_off}`)
    expect(drift).toEqual([])
  })

  it('reproduces the probe near baseline exactly', () => {
    // The probe stored int(median), which truncates. Truncate at compare time.
    const byArticle = index(theirs())
    const drift = ours()
      .filter(
        (e) => byArticle[e.article] && Math.trunc(e.nearBase) !== byArticle[e.article].baseline
      )
      .map((e) => `${e.article}: ours ${e.nearBase} vs probe ${byArticle[e.article].baseline}`)
    expect(drift).toEqual([])
  })

  it('reproduces the probe article-type split of 77 subject and 11 event', () => {
    const byArticle = index(theirs())
    const drift = ours()
      .filter((e) => byArticle[e.article] && e.atype !== byArticle[e.article].atype)
      .map((e) => `${e.article}: ours ${e.atype} vs probe ${byArticle[e.article].atype}`)
    expect(drift).toEqual([])
    expect(ours().filter((e) => e.atype === 'subject').length).toBe(77)
    expect(ours().filter((e) => e.atype === 'event').length).toBe(11)
  })

  it('reproduces the 57 floor-eligible events from floor.json, by name', () => {
    const measured = ours().filter((e) => e.floor !== null)
    expect(measured.length).toBe(theirFloors().length)
    expect(new Set(measured.map((e) => e.article))).toEqual(
      new Set(theirFloors().map((e) => e.article))
    )
  })

  it('reproduces every floor to the digit the probe kept', () => {
    // floor.py never divided the raw +365d median by the clean baseline. It rebuilt that
    // median out of results2.json as int(nearBase) * (1 + res365), where res365 had already
    // been rounded to 2dp. That round trip loses up to 0.005 * nearBase views, which on a
    // high run-up article is worth more than 0.01 of floor. The library keeps the exact
    // quotient, so the probe's own arithmetic is replayed here, from three quantities this
    // pipeline measured independently: the +365d median, the near baseline, the clean one.
    const byArticle = index(ours())
    const drift = []
    for (const ref of theirFloors()) {
      const e = byArticle[ref.article]
      if (e?.floor == null) {
        drift.push(`${ref.article}: missing`)
        continue
      }
      const median365 = e.cleanBase * (1 + e.floor)
      const res365 = round((median365 - e.nearBase) / e.nearBase, 2)
      const replayed = (Math.trunc(e.nearBase) * (1 + res365) - e.cleanBase) / e.cleanBase
      if (Math.abs(replayed - ref.floor) > HALF_ULP[3] + 1e-9) {
        drift.push(`${ref.article}: ours ${replayed} vs probe ${ref.floor}`)
      }
    }
    expect(drift).toEqual([])
  })

  it('reproduces the probe clean baseline exactly', () => {
    const byArticle = index(ours())
    const drift = theirFloors()
      .filter((ref) => roundHalfEven(byArticle[ref.article]?.cleanBase) !== ref.clean_base)
      .map(
        (ref) =>
          `${ref.article}: ours ${byArticle[ref.article]?.cleanBase} vs probe ${ref.clean_base}`
      )
    expect(drift).toEqual([])
  })
})

describe('floor eligibility', () => {
  const API_START = Date.UTC(2015, 6, 1)
  const clamped = () =>
    ours().filter((e) => {
      const d = new Date(e.date + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 455)
      return d.getTime() < API_START
    })

  it('finds the eleven events whose clean window starts before the API floor', () => {
    expect(clamped().length).toBe(11)
  })

  it('gives none of those eleven a floor, and none of them are in floor.json', () => {
    const names = new Set(theirFloors().map((e) => e.article))
    for (const e of clamped()) {
      expect(e.floor, `${e.article} should have no floor`).toBeNull()
      expect(names.has(e.article), `${e.article} should not be in floor.json`).toBe(false)
    }
  })

  it('marks every article without a floor with one of the three coda reasons', () => {
    // Task 12's error table keys off exactly these strings. A fourth would fall through
    // the table and render nothing.
    const REASONS = ['pre-api', 'event-article', 'low-volume']
    for (const e of ours()) {
      if (e.floor === null) expect(REASONS, e.article).toContain(e.floorReason)
      else expect(e.floorReason, e.article).toBeNull()
    }
  })
})

describe('curves', () => {
  it('gives every event a 61-point normalised curve starting at 1', () => {
    for (const e of ours()) {
      expect(e.curve.length, e.article).toBe(61)
      expect(e.curve[0], e.article).toBeCloseTo(1, 6)
      expect(Math.max(...e.curve), e.article).toBeLessThanOrEqual(1)
      expect(Math.min(...e.curve), e.article).toBeGreaterThanOrEqual(0)
      expect(
        e.curve.every(Number.isFinite),
        e.article
      ).toBe(true)
    }
  })

  it('leaves every curve lower on day 60 than on day 0', () => {
    // Not "day 0 is the single highest point". Four articles carry a second, larger spike
    // inside the 60 day window (Jeffrey Epstein at +34, Sam Bankman-Fried at +31, Naomi
    // Osaka at +52, JD Vance at +56) and the normalisation clamps those days to 1. The
    // end of the window is still below the start for all 88.
    for (const e of ours()) {
      expect(e.curve[60], e.article).toBeLessThan(e.curve[0])
    }
  })

  it('reproduces every curve point from the probe raw series', () => {
    // The shape checks above pass on a curve with a corrupted interior point, so they are
    // not a gate on the band Task 9 draws. The probe stored its own daily views for
    // peakDay-7 to peakDay+60, which covers this window exactly, so all 61 points of all
    // 88 curves are rebuilt from the probe's numbers and compared one by one.
    const byArticle = index(theirs())
    const drift = []
    for (const e of ours()) {
      const ref = byArticle[e.article]
      const peakExcess = ref.peak - e.nearBase
      for (let i = 0; i <= 60; i++) {
        const key = String(e.peakDay + i)
        const views = Object.hasOwn(ref.series, key) ? ref.series[key] : null
        const expected =
          views === null ? 0 : Math.max(0, Math.min(1, (views - e.nearBase) / peakExcess))
        if (Math.abs(e.curve[i] - expected) > 1e-12) {
          drift.push(`${e.article} day +${i}: ours ${e.curve[i]} vs probe ${expected}`)
        }
      }
    }
    expect(drift).toEqual([])
  })
})
