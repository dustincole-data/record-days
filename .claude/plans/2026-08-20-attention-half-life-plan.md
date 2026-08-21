# Attention Half-Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a one-page scrolling data piece showing that event class does not change how fast a subject is forgotten, only whether the subject is permanently rewritten.

**Architecture:** Pure metric functions in `lib/`, tested against a committed probe output that already exists. A build script calls them once to emit one static JSON; the page loads only that. The live coda at the bottom reuses the identical modules against the browser's own `fetch`, so a reader's number is computed by the same code that produced the published ones.

**Tech Stack:** Astro, vanilla JS (no chart library), Canvas 2D for the band, inline SVG for distributions, Vitest for unit tests, Vercel for deploy.

**Spec:** `.claude/plans/2026-08-20-attention-half-life-design.md` — read it before Task 1. Every number in this plan traces to it.

## Global Constraints

- **Data source:** `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/<ARTICLE>/daily/<YYYYMMDD>/<YYYYMMDD>`. No key. **A real User-Agent with contact email is mandatory** — `AttentionHalfLife/1.0 (https://dustincoledata.com; dustincole.ent@gmail.com)`.
- **API floor:** daily data begins **2015-07-01**. Verified. Any date before this returns 404. Never request earlier.
- **Language register (binding on every string of user-facing copy):** all claims are correlational and descriptive. Permitted: "ends the year below", "is associated with", "no relationship to". **Forbidden:** any phrasing implying the event *caused* the floor, or that the floor measures memory, grief, importance, or legacy. Pageviews measure lookups on one website.
- **Copy tone:** flat declarative. No parallel triads, no feel-something clauses, no sales framing. No em dashes.
- **Number provenance:** no number appears in copy that is not a row in `data/probe/results2.json` or `data/probe/floor.json`.
- **Design system:** light ground, Archivo (grotesque sans). Never a serif. Never a giant hero.
- **Canvas:** alpha blending only (never `multiply` — 88 overlapping strokes compound to black on light). `lineWidth` is clamped to 1 on many devices, so never encode meaning in stroke width. `preserveDrawingBuffer: true`. Re-sync from the canvas's own bounding box via `ResizeObserver`, never window `resize`.
- **Touch:** any hover reveal needs `pointerdown` + `pointercancel`, not `pointermove` + `pointerleave`.
- **Commit after every task.** Do not push until Task 13.

---

### Task 1: Scaffold and the first metric

**Files:**
- Create: `package.json`, `astro.config.mjs`, `vitest.config.js`, `.gitignore`
- Create: `src/lib/metrics.js`
- Test: `test/metrics.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `median(nums: number[]) => number`, `baseline(series: Map<number,number>, from: number, to: number) => number`. `series` maps day-offset-from-event to daily views, and is the single data shape every later task passes around.

- [ ] **Step 1: Initialise the project**

```bash
cd C:/Users/dusti/Projects/Attention_Half_Life
npm create astro@latest . -- --template minimal --no-install --no-git --skip-houston
npm install
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Append to `.gitignore`:

```
node_modules/
dist/
.astro/
.vercel/
```

- [ ] **Step 2: Write the failing test**

`test/metrics.test.js`:

```js
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
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/metrics.js"`.

- [ ] **Step 4: Write the minimal implementation**

`src/lib/metrics.js`:

```js
export function median(nums) {
  if (nums.length === 0) throw new Error('median of empty list')
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function baseline(series, from, to) {
  const vals = []
  for (let d = from; d <= to; d++) {
    if (series.has(d)) vals.push(series.get(d))
  }
  if (vals.length === 0) throw new Error('no data in baseline window')
  return median(vals)
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro project with median and baseline metrics"
```

---

### Task 2: Peak detection and decay crossings

**Files:**
- Modify: `src/lib/metrics.js`
- Modify: `test/metrics.test.js`

**Interfaces:**
- Consumes: `median`, `baseline` from Task 1.
- Produces: `findPeak(series, from = -3, to = 25) => { day: number, views: number }` and `crossing(series, peakDay, peakExcess, base, frac) => number | null`. `crossing` returns interpolated days after the peak, or `null` if the level is never reached within 400 days.

**Why the interpolation matters:** most events halve in under one day, which is below the resolution of daily data. Reporting integer days would round most of the set to the same value and destroy the 17x spread the piece depends on. The linear interpolation between the bracketing days is what makes `t50` a continuous measure. This reproduces the probe's algorithm exactly and must not be "improved".

- [ ] **Step 1: Write the failing test**

Append to `test/metrics.test.js`:

```js
import { findPeak, crossing } from '../src/lib/metrics.js'

describe('findPeak', () => {
  it('finds the maximum inside the default window', () => {
    const series = new Map([[-1, 10], [0, 500], [1, 900], [2, 300]])
    expect(findPeak(series)).toEqual({ day: 1, views: 900 })
  })
  it('ignores a larger value outside the window', () => {
    const series = new Map([[-50, 99999], [0, 500], [1, 900]])
    expect(findPeak(series)).toEqual({ day: 1, views: 900 })
  })
  it('throws when the window is empty', () => {
    expect(() => findPeak(new Map([[-50, 1]]))).toThrow('no data in peak window')
  })
})

describe('crossing', () => {
  it('interpolates a sub-day crossing between bracketing days', () => {
    // base 0, peak 1000 on day 0. Day 1 = 400, already below half (500).
    // Half is crossed between day 0 (1000) and day 1 (400):
    // 1 - 1 + (1000 - 500) / (1000 - 400) = 0.8333...
    const series = new Map([[0, 1000], [1, 400]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeCloseTo(0.8333, 3)
  })
  it('subtracts the baseline before comparing, so excess is what decays', () => {
    // base 100, peak excess 900. Half of excess = 450, i.e. 550 raw views.
    const series = new Map([[0, 1000], [1, 550]])
    expect(crossing(series, 0, 900, 100, 0.5)).toBeCloseTo(1.0, 3)
  })
  it('keeps searching past days that are still above the level', () => {
    const series = new Map([[0, 1000], [1, 900], [2, 800], [3, 100]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeCloseTo(2.4286, 3)
  })
  it('returns null when the level is never reached', () => {
    const series = new Map([[0, 1000], [1, 999], [2, 999]])
    expect(crossing(series, 0, 1000, 0, 0.5)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `findPeak is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/metrics.js`:

```js
export function findPeak(series, from = -3, to = 25) {
  let best = null
  for (let d = from; d <= to; d++) {
    if (!series.has(d)) continue
    const v = series.get(d)
    if (best === null || v > best.views) best = { day: d, views: v }
  }
  if (best === null) throw new Error('no data in peak window')
  return best
}

export function crossing(series, peakDay, peakExcess, base, frac) {
  const target = frac * peakExcess
  let prev = peakExcess
  for (let d = peakDay + 1; d < peakDay + 400; d++) {
    if (!series.has(d)) continue
    const cur = series.get(d) - base
    if (cur <= target) {
      const span = d - peakDay
      if (prev > cur) return span - 1 + (prev - target) / (prev - cur)
      return span
    }
    prev = cur
  }
  return null
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add peak detection and interpolated decay crossings"
```

---

### Task 3: Decay model fits

**Files:**
- Modify: `src/lib/metrics.js`
- Modify: `test/metrics.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1-2.
- Produces: `linreg(xs, ys) => { slope, intercept, r2 } | null` and `fitDecay(series, peakDay, base) => { expHalfLife, expR2, powAlpha, powR2 }`. Any field is `null` when unfittable.

**What this computes and why:** beat 3 of the piece claims a power law fits better than an exponential on 57 of 88 events. That claim is only defensible if both fits are computed the same way over the same window. Both regress `log(excess)` over days 1 to 30 after the peak — the exponential against `t`, the power law against `log(t)` — and the comparison is their R².

- [ ] **Step 1: Write the failing test**

Append to `test/metrics.test.js`:

```js
import { linreg, fitDecay } from '../src/lib/metrics.js'

describe('linreg', () => {
  it('recovers slope and intercept of a perfect line with r2 of 1', () => {
    const r = linreg([1, 2, 3, 4], [3, 5, 7, 9])
    expect(r.slope).toBeCloseTo(2, 10)
    expect(r.intercept).toBeCloseTo(1, 10)
    expect(r.r2).toBeCloseTo(1, 10)
  })
  it('returns null when there are too few points to fit', () => {
    expect(linreg([1, 2], [1, 2])).toBeNull()
  })
  it('returns null when every x is identical', () => {
    expect(linreg([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull()
  })
})

describe('fitDecay', () => {
  it('recovers the half-life of clean exponential decay', () => {
    // excess = 1000 * 0.5^(t/3)  -> half-life exactly 3 days
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, 1000 * Math.pow(0.5, t / 3))
    const f = fitDecay(series, 0, 0)
    expect(f.expHalfLife).toBeCloseTo(3, 6)
    expect(f.expR2).toBeCloseTo(1, 6)
  })
  it('recovers the exponent of a clean power law', () => {
    // excess = 1000 * t^-1.5
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, 1000 * Math.pow(t, -1.5))
    const f = fitDecay(series, 0, 0)
    expect(f.powAlpha).toBeCloseTo(1.5, 6)
    expect(f.powR2).toBeCloseTo(1, 6)
  })
  it('skips days where excess is zero or negative, since log is undefined', () => {
    const series = new Map([[0, 1000]])
    for (let t = 1; t <= 30; t++) series.set(t, t < 10 ? 500 - t : 0)
    const f = fitDecay(series, 0, 0)
    expect(f.expR2).not.toBeNull()
  })
  it('returns nulls when fewer than four usable days remain', () => {
    const series = new Map([[0, 1000], [1, 500], [2, 0], [3, 0]])
    const f = fitDecay(series, 0, 0)
    expect(f.expHalfLife).toBeNull()
    expect(f.powAlpha).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `linreg is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/metrics.js`:

```js
export function linreg(xs, ys) {
  const n = xs.length
  if (n < 4) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = my - slope * mx
  let ssTot = 0, ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (ys[i] - my) ** 2
    ssRes += (ys[i] - (intercept + slope * xs[i])) ** 2
  }
  return { slope, intercept, r2: ssTot > 0 ? 1 - ssRes / ssTot : null }
}

export function fitDecay(series, peakDay, base) {
  const t = [], logT = [], logV = []
  for (let i = 1; i <= 30; i++) {
    const d = peakDay + i
    if (!series.has(d)) continue
    const excess = series.get(d) - base
    if (excess <= 0) continue
    t.push(i)
    logT.push(Math.log(i))
    logV.push(Math.log(excess))
  }
  const exp = linreg(t, logV)
  const pow = linreg(logT, logV)
  return {
    expHalfLife: exp && exp.slope < 0 ? Math.log(2) / -exp.slope : null,
    expR2: exp ? exp.r2 : null,
    powAlpha: pow ? -pow.slope : null,
    powR2: pow ? pow.r2 : null,
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 21 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add exponential and power-law decay fits"
```

---

### Task 4: The floor

**Files:**
- Modify: `src/lib/metrics.js`
- Modify: `test/metrics.test.js`

**Interfaces:**
- Consumes: `median` from Task 1.
- Produces: `floor(series, peakDay, cleanBase) => number | null` — the fractional change in daily views one year after the peak, relative to a clean pre-event baseline. `+0.34` means 34% above; `-0.30` means 30% below.

**Windows are fixed and load-bearing.** The clean baseline is the median of days **-455 to -270** relative to the event. The one-year-later level is the median of days **+335 to +365** relative to the *peak*. The first window is deliberately a year before the event so it cannot be contaminated by end-of-life or run-up coverage — that contamination is what moved the headline from 44% to 28%, and it is beat 4's subject.

- [ ] **Step 1: Write the failing test**

Append to `test/metrics.test.js`:

```js
import { floor, CLEAN_BASE_FROM, CLEAN_BASE_TO } from '../src/lib/metrics.js'

describe('floor', () => {
  it('reports a positive fraction when the subject ends above its clean baseline', () => {
    const series = new Map()
    for (let d = 335; d <= 365; d++) series.set(d, 1340)
    expect(floor(series, 0, 1000)).toBeCloseTo(0.34, 6)
  })
  it('reports a negative fraction when the subject ends below its clean baseline', () => {
    const series = new Map()
    for (let d = 335; d <= 365; d++) series.set(d, 700)
    expect(floor(series, 0, 1000)).toBeCloseTo(-0.30, 6)
  })
  it('measures the window relative to the peak, not the event', () => {
    const series = new Map()
    for (let d = 340; d <= 370; d++) series.set(d, 500)
    // peak on day 5, so the window is days 340..370
    expect(floor(series, 5, 1000)).toBeCloseTo(-0.5, 6)
  })
  it('returns null when the year-later window has no data', () => {
    expect(floor(new Map([[1, 100]]), 0, 1000)).toBeNull()
  })
  it('returns null for a non-positive baseline rather than dividing by zero', () => {
    const series = new Map()
    for (let d = 335; d <= 365; d++) series.set(d, 500)
    expect(floor(series, 0, 0)).toBeNull()
  })
  it('exposes the clean baseline window as named constants', () => {
    expect(CLEAN_BASE_FROM).toBe(-455)
    expect(CLEAN_BASE_TO).toBe(-270)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `floor is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/metrics.js`:

```js
export const CLEAN_BASE_FROM = -455
export const CLEAN_BASE_TO = -270
export const FLOOR_FROM = 335
export const FLOOR_TO = 365

export function floor(series, peakDay, cleanBase) {
  if (!(cleanBase > 0)) return null
  const vals = []
  for (let d = peakDay + FLOOR_FROM; d <= peakDay + FLOOR_TO; d++) {
    if (series.has(d)) vals.push(series.get(d))
  }
  if (vals.length === 0) return null
  return (median(vals) - cleanBase) / cleanBase
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 27 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add clean-baseline floor metric"
```

---

### Task 5: Article classification and eligibility

**Files:**
- Create: `src/lib/classify.js`
- Test: `test/classify.test.js`

**Interfaces:**
- Consumes: `baseline` from Task 1.
- Produces: `articleType(series) => 'subject' | 'event'` and `floorEligibility(series, eventDate) => { eligible: boolean, reason: string | null, cleanBase: number | null }`. `reason` is one of `'pre-api'`, `'event-article'`, `'low-volume'`, or `null` when eligible. These strings are the exact keys the coda's error table keys off in Task 12.

**The rules, from the spec:**
- **Article type** — `subject` if at least 40 days of data exist in the near-baseline window (-90 to -8), else `event`. An event article was created by the event and has no baseline; its floor is undefined, not zero.
- **Pre-API** — a clean baseline needs day -455, so events before 2016-10-01 cannot carry a floor. The API itself starts 2015-07-01.
- **Low volume** — clean baseline under 400 daily views. Small-town and unknown-person pages produce ratios in the thousands that are denominator artefacts. East Palestine (32/day), Surfside (48), Damar Hamlin (46) and JD Vance (3) are all excluded on this rule.

- [ ] **Step 1: Write the failing test**

`test/classify.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { articleType, floorEligibility, API_START, MIN_BASELINE } from '../src/lib/classify.js'

function seriesOver(from, to, views) {
  const s = new Map()
  for (let d = from; d <= to; d++) s.set(d, views)
  return s
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
})

describe('floorEligibility', () => {
  it('accepts a subject article with a clean high-volume baseline', () => {
    const s = seriesOver(-455, 400, 5000)
    const r = floorEligibility(s, '2022-09-08')
    expect(r.eligible).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.cleanBase).toBe(5000)
  })
  it('rejects an event article, since there is nothing to compare against', () => {
    const r = floorEligibility(seriesOver(0, 400, 5000), '2022-09-08')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('event-article')
  })
  it('rejects an event whose clean window predates the API', () => {
    const r = floorEligibility(seriesOver(-455, 400, 5000), '2016-04-21')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('pre-api')
  })
  it('rejects a baseline below the low-volume threshold', () => {
    const r = floorEligibility(seriesOver(-455, 400, 399), '2022-09-08')
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe('low-volume')
    expect(r.cleanBase).toBe(399)
  })
  it('accepts a baseline exactly at the threshold', () => {
    expect(floorEligibility(seriesOver(-455, 400, 400), '2022-09-08').eligible).toBe(true)
  })
  it('exposes the API start date and volume threshold as constants', () => {
    expect(API_START).toBe('2015-07-01')
    expect(MIN_BASELINE).toBe(400)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/classify.js"`.

- [ ] **Step 3: Write the implementation**

`src/lib/classify.js`:

```js
import { baseline, CLEAN_BASE_FROM, CLEAN_BASE_TO } from './metrics.js'

export const API_START = '2015-07-01'
export const MIN_BASELINE = 400
const NEAR_FROM = -90
const NEAR_TO = -8
const MIN_NEAR_DAYS = 40

export function articleType(series) {
  let days = 0
  for (let d = NEAR_FROM; d <= NEAR_TO; d++) if (series.has(d)) days++
  return days >= MIN_NEAR_DAYS ? 'subject' : 'event'
}

export function floorEligibility(series, eventDate) {
  if (articleType(series) === 'event') {
    return { eligible: false, reason: 'event-article', cleanBase: null }
  }
  const cleanWindowStart = new Date(eventDate + 'T00:00:00Z')
  cleanWindowStart.setUTCDate(cleanWindowStart.getUTCDate() + CLEAN_BASE_FROM)
  if (cleanWindowStart < new Date(API_START + 'T00:00:00Z')) {
    return { eligible: false, reason: 'pre-api', cleanBase: null }
  }
  let cleanBase
  try {
    cleanBase = baseline(series, CLEAN_BASE_FROM, CLEAN_BASE_TO)
  } catch {
    return { eligible: false, reason: 'pre-api', cleanBase: null }
  }
  if (cleanBase < MIN_BASELINE) {
    return { eligible: false, reason: 'low-volume', cleanBase }
  }
  return { eligible: true, reason: null, cleanBase }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 36 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add article classification and floor eligibility rules"
```

---

### Task 6: Wikimedia API client

**Files:**
- Create: `src/lib/pageviews.js`
- Test: `test/pageviews.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildUrl(article, startYmd, endYmd) => string`, `toSeries(items, eventDate) => Map<number,number>`, and `fetchSeries(article, eventDate, { from, to, fetchImpl }) => Promise<Map<number,number>>`. `fetchImpl` defaults to global `fetch` and exists so tests never touch the network.

**Tests must never hit the network.** Injecting `fetchImpl` keeps the suite fast and deterministic. The real API is exercised once, for real, in Task 7.

- [ ] **Step 1: Write the failing test**

`test/pageviews.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildUrl, toSeries, fetchSeries, USER_AGENT } from '../src/lib/pageviews.js'

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
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/pageviews.js"`.

- [ ] **Step 3: Write the implementation**

`src/lib/pageviews.js`:

```js
export const USER_AGENT =
  'AttentionHalfLife/1.0 (https://dustincoledata.com; dustincole.ent@gmail.com)'

const ROOT =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents'

export function buildUrl(article, startYmd, endYmd) {
  const slug = encodeURIComponent(article.replace(/ /g, '_'))
  return `${ROOT}/${slug}/daily/${startYmd}/${endYmd}`
}

function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function shift(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function toSeries(items, eventDate) {
  const event = new Date(eventDate + 'T00:00:00Z')
  const series = new Map()
  for (const it of items) {
    const t = it.timestamp
    const day = new Date(
      `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T00:00:00Z`
    )
    const offset = Math.round((day - event) / 86400000)
    series.set(offset, it.views)
  }
  return series
}

export async function fetchSeries(article, eventDate, opts = {}) {
  const { from = -455, to = 400, fetchImpl = fetch } = opts
  const url = buildUrl(article, ymd(shift(eventDate, from)), ymd(shift(eventDate, to)))
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
  if (res.status === 404) return new Map()
  if (!res.ok) throw new Error(`Wikimedia API returned ${res.status}`)
  const body = await res.json()
  return toSeries(body.items || [], eventDate)
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, 45 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Wikimedia pageviews client with injectable fetch"
```

---

### Task 7: Build the dataset, and prove it matches the probe

**Files:**
- Create: `src/data/events.js` (the curated event list)
- Create: `scripts/build-dataset.js`
- Create: `src/data/dataset.json` (generated, committed)
- Test: `test/parity.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: `EVENTS` — an array of `{ article, date, class }` — and `dataset.json` with shape `{ generated: string, events: [{ article, class, date, atype, peak, peakDay, nearBase, cleanBase, t50, t10, expHalfLife, expR2, powAlpha, powR2, floor, floorReason, curve: number[] }] }`. `curve` is normalised excess at days 0 through 60 after the peak, each value in 0..1, and is what the band in Task 9 draws.

**This is the task that makes every published number defensible.** The probe already produced `data/probe/results2.json` and `data/probe/floor.json` from independent Python. If this JavaScript pipeline disagrees with it, one of them is wrong and nothing ships. That parity check is the gate.

- [ ] **Step 1: Copy the event list out of the probe**

`src/data/events.js` — extract the 88 `(article, date, class)` triples from `data/probe/probe2.py`. Keep the order and the exact article titles. Format:

```js
export const EVENTS = [
  { article: 'Kobe Bryant', date: '2020-01-26', class: 'death' },
  { article: 'Chadwick Boseman', date: '2020-08-28', class: 'death' },
  // ... all 88, transcribed verbatim from data/probe/probe2.py
]
```

Verify the count before continuing:

```bash
node -e "import('./src/data/events.js').then(m => console.log(m.EVENTS.length))"
```

Expected: `88`. If it is not 88, transcription dropped a row — fix before continuing.

- [ ] **Step 2: Write the failing parity test**

`test/parity.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

const DATASET = 'src/data/dataset.json'
const PROBE = 'data/probe/results2.json'

describe('dataset parity with the Python probe', () => {
  it('has been generated', () => {
    expect(existsSync(DATASET)).toBe(true)
  })

  it('contains every event the probe measured', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    const theirs = JSON.parse(readFileSync(PROBE, 'utf8'))
    expect(ours.length).toBe(theirs.length)
    expect(new Set(ours.map(e => e.article)))
      .toEqual(new Set(theirs.map(e => e.article)))
  })

  it('reproduces the probe t50 for every event within 0.02 days', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    const theirs = JSON.parse(readFileSync(PROBE, 'utf8'))
    const byArticle = Object.fromEntries(theirs.map(e => [e.article, e]))
    const drift = []
    for (const e of ours) {
      const ref = byArticle[e.article]
      if (ref?.t50 == null || e.t50 == null) continue
      if (Math.abs(e.t50 - ref.t50) > 0.02) {
        drift.push(`${e.article}: ours ${e.t50} vs probe ${ref.t50}`)
      }
    }
    expect(drift).toEqual([])
  })

  it('reproduces the probe peak views exactly', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    const theirs = JSON.parse(readFileSync(PROBE, 'utf8'))
    const byArticle = Object.fromEntries(theirs.map(e => [e.article, e]))
    const drift = ours
      .filter(e => byArticle[e.article] && e.peak !== byArticle[e.article].peak)
      .map(e => `${e.article}: ours ${e.peak} vs probe ${byArticle[e.article].peak}`)
    expect(drift).toEqual([])
  })

  it('reproduces the probe article-type split of 77 subject and 11 event', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    expect(ours.filter(e => e.atype === 'subject').length).toBe(77)
    expect(ours.filter(e => e.atype === 'event').length).toBe(11)
  })

  it('reproduces the 57 floor-eligible events from floor.json', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    const theirs = JSON.parse(readFileSync('data/probe/floor.json', 'utf8'))
    expect(ours.filter(e => e.floor !== null).length).toBe(theirs.length)
  })

  it('reproduces every floor within 0.01', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    const theirs = JSON.parse(readFileSync('data/probe/floor.json', 'utf8'))
    const byArticle = Object.fromEntries(ours.map(e => [e.article, e]))
    const drift = []
    for (const ref of theirs) {
      const e = byArticle[ref.article]
      if (e?.floor == null) { drift.push(`${ref.article}: missing`); continue }
      if (Math.abs(e.floor - ref.floor) > 0.01) {
        drift.push(`${ref.article}: ours ${e.floor} vs probe ${ref.floor}`)
      }
    }
    expect(drift).toEqual([])
  })
})

describe('curves', () => {
  it('gives every event a 61-point normalised curve starting at 1', () => {
    const ours = JSON.parse(readFileSync(DATASET, 'utf8')).events
    for (const e of ours) {
      expect(e.curve.length).toBe(61)
      expect(e.curve[0]).toBeCloseTo(1, 6)
      expect(Math.max(...e.curve)).toBeLessThanOrEqual(1)
      expect(Math.min(...e.curve)).toBeGreaterThanOrEqual(0)
    }
  })
})
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm test -- parity`
Expected: FAIL — dataset has not been generated.

- [ ] **Step 4: Write the build script**

`scripts/build-dataset.js`:

```js
import { writeFileSync } from 'node:fs'
import { EVENTS } from '../src/data/events.js'
import { fetchSeries } from '../src/lib/pageviews.js'
import { baseline, findPeak, crossing, fitDecay, floor } from '../src/lib/metrics.js'
import { articleType, floorEligibility } from '../src/lib/classify.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

function curve(series, peakDay, base, peakExcess) {
  const out = []
  for (let i = 0; i <= 60; i++) {
    const d = peakDay + i
    const raw = series.has(d) ? (series.get(d) - base) / peakExcess : 0
    out.push(Math.max(0, Math.min(1, raw)))
  }
  return out
}

const events = []
for (const ev of EVENTS) {
  process.stdout.write(`${ev.article} ... `)
  const series = await fetchSeries(ev.article, ev.date, { from: -455, to: 400 })
  if (series.size === 0) { console.log('NO DATA'); continue }

  const atype = articleType(series)
  const nearBase = atype === 'subject' ? baseline(series, -90, -8) : 0
  const peak = findPeak(series)
  const peakExcess = peak.views - nearBase
  if (peakExcess <= 0) { console.log('NO LIFT'); continue }

  const elig = floorEligibility(series, ev.date)
  const fit = fitDecay(series, peak.day, nearBase)

  events.push({
    article: ev.article,
    class: ev.class,
    date: ev.date,
    atype,
    peak: peak.views,
    peakDay: peak.day,
    nearBase: Math.round(nearBase),
    cleanBase: elig.cleanBase === null ? null : Math.round(elig.cleanBase),
    t50: crossing(series, peak.day, peakExcess, nearBase, 0.5),
    t10: crossing(series, peak.day, peakExcess, nearBase, 0.1),
    ...fit,
    floor: elig.eligible ? floor(series, peak.day, elig.cleanBase) : null,
    floorReason: elig.reason,
    curve: curve(series, peak.day, nearBase, peakExcess),
  })
  console.log('ok')
  await sleep(250)
}

writeFileSync(
  'src/data/dataset.json',
  JSON.stringify({ generated: new Date().toISOString(), events }, null, 1)
)
console.log(`\nwrote ${events.length} events`)
```

Add to `package.json` scripts: `"build:data": "node scripts/build-dataset.js"`.

- [ ] **Step 5: Run the build against the real API**

Run: `npm run build:data`
Expected: 88 lines ending `ok`, then `wrote 88 events`. Takes roughly one minute. This is the only place the real network is used during development.

- [ ] **Step 6: Run the parity test and verify it passes**

Run: `npm test -- parity`
Expected: PASS, 8 tests.

**If parity fails, stop.** Do not adjust tolerances to make it pass. A disagreement means the JS and Python implementations differ, and the published numbers are only trustworthy because two independent implementations agree. Find the discrepancy.

- [ ] **Step 7: Prove the parity test can fail**

Temporarily change `crossing`'s interpolation in `src/lib/metrics.js` from `span - 1 + ...` to `span`, then run `npm test -- parity`.
Expected: FAIL, with a long drift list.

Revert the change and confirm parity passes again. A test that cannot go red tests nothing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build static dataset and verify parity with Python probe"
```

---

### Task 8: Page shell and Beat 1

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/styles/tokens.css`
- Create: `src/components/BeatFloor.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `src/data/dataset.json` from Task 7.
- Produces: the page shell and the opening beat. Later beats are sibling components dropped into `index.astro` in order.

**Beat 1 opens on people, not curves.** Named subjects, real numbers, no chart. Every figure below is a row in `dataset.json` — read them from the JSON at build time rather than hardcoding, so a rebuild cannot silently desynchronise the copy from the data.

- [ ] **Step 1: Write the design tokens**

`src/styles/tokens.css`:

```css
:root {
  --ink: #16151a;
  --ink-soft: #55525f;
  --ground: #f7f5f1;
  --rule: #ddd8d0;
  --below: #b8452f;
  --above: #2f6b7a;
  --measure: 34rem;
  font-family: Archivo, system-ui, sans-serif;
}
body { background: var(--ground); color: var(--ink); margin: 0; }
```

Load Archivo from a self-hosted woff2 in `public/fonts/`. Do not use a CDN.

- [ ] **Step 2: Write Beat 1**

`src/components/BeatFloor.astro`:

```astro
---
import dataset from '../data/dataset.json'
const pick = (name) => dataset.events.find(e => e.article === name)
const lead = pick('Elizabeth II')
const others = ['Betty White', 'Kirk Douglas', 'Prince Philip, Duke of Edinburgh']
  .map(pick)
const pct = (f) => `${Math.round(Math.abs(f) * 100)}%`
---
<section class="beat">
  <p class="stat">{lead.peak.toLocaleString()}</p>
  <p class="cap">views of the Elizabeth II article on the day she died,
     8 September 2022. For one day it was the most-read page on English Wikipedia.</p>
  <p class="body">
    A year later, {pct(lead.floor)} fewer people looked her up each day
    than in the year before she died.
  </p>
  <ul class="list">
    {others.map(e => (
      <li><span>{e.article}</span><span>{pct(e.floor)} below</span></li>
    ))}
  </ul>
  <p class="body">
    Sixteen of the fifty-seven subjects measured here end the year with fewer
    daily readers than before the event that made them briefly the most-read
    thing on the internet.
  </p>
</section>
```

Styling: `.stat` large but not a hero, tabular numerals, `.body` capped at `--measure`.

- [ ] **Step 3: Write the test**

`test/copy.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
const find = n => dataset.events.find(e => e.article === n)

describe('beat 1 claims trace to the data', () => {
  it('Elizabeth II peaked above ten million views', () => {
    expect(find('Elizabeth II').peak).toBeGreaterThan(10_000_000)
  })
  it('every subject named in beat 1 has a negative floor', () => {
    for (const n of ['Elizabeth II', 'Betty White', 'Kirk Douglas',
                     'Prince Philip, Duke of Edinburgh']) {
      expect(find(n).floor).toBeLessThan(0)
    }
  })
  it('exactly sixteen of the floor-eligible subjects end below baseline', () => {
    const withFloor = dataset.events.filter(e => e.floor !== null)
    expect(withFloor.length).toBe(57)
    expect(withFloor.filter(e => e.floor < 0).length).toBe(16)
  })
})

describe('copy discipline', () => {
  const sources = ['src/components/BeatFloor.astro']
  it('uses no causal or memory language about the floor', () => {
    const banned = /\bbecause\b|\bcaused\b|\bforgotten by\b|\bgrief\b|\blegacy\b|\bmourn/i
    for (const f of sources) {
      expect(readFileSync(f, 'utf8')).not.toMatch(banned)
    }
  })
  it('uses no em dashes', () => {
    for (const f of sources) expect(readFileSync(f, 'utf8')).not.toContain('—')
  })
})
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS. If the "sixteen" test fails, the number in the copy is wrong, not the test. Fix the copy.

- [ ] **Step 5: View it**

Run: `npm run dev` and open the local URL. Confirm Archivo is loading, not a fallback.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add page shell and beat 1"
```

---

### Task 9: Beat 2, the band

**Files:**
- Create: `src/components/BeatBand.astro`
- Create: `src/scripts/band.js`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `curve` and `peak` on every event in `dataset.json`.
- Produces: `drawBand(canvas, events, options) => void`, exported so the coda in Task 12 can overlay a reader's curve on the same axes.

**The tautology trap — read before writing any code.** Every normalised curve starts at 1.0 and descends *by construction*. A picture of 88 curves going down is an identity, not a finding, and shipping it as this beat's payoff would be dishonest.

The finding is that decay rate carries no signal about event magnitude. So **each curve is coloured by peak magnitude on a log scale**, and the evidence is that the colours interleave with no visible gradient through the band. `r = -0.21` is printed on the same screen. If the built band shows a colour gradient, the finding is wrong and this beat gets redesigned rather than shipped.

- [ ] **Step 1: Write the band renderer**

`src/scripts/band.js`:

```js
const PAD = { top: 24, right: 24, bottom: 36, left: 44 }

// Log-scaled magnitude colour. Deliberately a wide hue range so that any real
// ordering by magnitude would be impossible to miss.
function magnitudeColour(peak, minLog, maxLog, alpha) {
  const t = (Math.log10(peak) - minLog) / (maxLog - minLog)
  const hue = 190 - 175 * t
  return `hsla(${hue}, 62%, 45%, ${alpha})`
}

export function drawBand(canvas, events, opts = {}) {
  const { days = 30, highlight = null } = opts
  const dpr = window.devicePixelRatio || 1
  const box = canvas.getBoundingClientRect()
  canvas.width = box.width * dpr
  canvas.height = box.height * dpr

  const ctx = canvas.getContext('2d', { preserveDrawingBuffer: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.width, box.height)
  // Alpha blending. Never 'multiply' — 88 overlapping strokes compound to black.
  ctx.globalCompositeOperation = 'source-over'

  const w = box.width - PAD.left - PAD.right
  const h = box.height - PAD.top - PAD.bottom
  const x = d => PAD.left + (d / days) * w
  const y = v => PAD.top + (1 - v) * h

  const logs = events.map(e => Math.log10(e.peak))
  const minLog = Math.min(...logs)
  const maxLog = Math.max(...logs)

  ctx.lineWidth = 1
  for (const e of events) {
    ctx.strokeStyle = magnitudeColour(e.peak, minLog, maxLog, 0.28)
    ctx.beginPath()
    for (let d = 0; d <= days; d++) {
      const v = e.curve[d] ?? 0
      d === 0 ? ctx.moveTo(x(d), y(v)) : ctx.lineTo(x(d), y(v))
    }
    ctx.stroke()
  }

  if (highlight) {
    ctx.strokeStyle = '#16151a'
    ctx.beginPath()
    for (let d = 0; d <= days; d++) {
      const v = highlight.curve[d] ?? 0
      d === 0 ? ctx.moveTo(x(d), y(v)) : ctx.lineTo(x(d), y(v))
    }
    ctx.stroke()
  }
}
```

- [ ] **Step 2: Wire it up with a ResizeObserver**

In `src/components/BeatBand.astro`, inside a `<script>` block:

```js
import dataset from '../data/dataset.json'
import { drawBand } from '../scripts/band.js'

const canvas = document.querySelector('#band')
const render = () => drawBand(canvas, dataset.events)
// Observe the canvas's own box, not the window. The iOS URL-bar collapse
// fires no window resize but does change this element's height.
new ResizeObserver(render).observe(canvas)
render()
```

If the project later adds Astro's `ClientRouter`, this must move into an `astro:page-load` handler with an `isConnected` guard, because a module script never re-runs after a client-side navigation.

- [ ] **Step 3: Write the test**

Append to `test/copy.test.js`:

```js
import { readFileSync } from 'node:fs'

describe('band renderer safety rules', () => {
  const src = readFileSync('src/scripts/band.js', 'utf8')
  it('never uses multiply blending, which compounds to black on light', () => {
    expect(src).not.toContain("'multiply'")
  })
  it('colours curves by peak magnitude, which is what makes beat 2 honest', () => {
    expect(src).toContain('magnitudeColour')
    expect(src).toContain('Math.log10(e.peak)')
  })
  it('preserves the drawing buffer so screenshots are possible', () => {
    expect(src).toContain('preserveDrawingBuffer: true')
  })
})

describe('beat 2 claim traces to the data', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  it('peak views span at least four orders of magnitude', () => {
    const peaks = dataset.events.map(e => e.peak)
    expect(Math.max(...peaks) / Math.min(...peaks)).toBeGreaterThan(1000)
  })
  it('t50 and peak magnitude are effectively uncorrelated', () => {
    const rows = dataset.events.filter(e => e.t50 !== null)
    const xs = rows.map(e => Math.log10(e.peak))
    const ys = rows.map(e => e.t50)
    const mx = xs.reduce((a, b) => a + b) / xs.length
    const my = ys.reduce((a, b) => a + b) / ys.length
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my)
      dx += (xs[i] - mx) ** 2
      dy += (ys[i] - my) ** 2
    }
    expect(Math.abs(num / Math.sqrt(dx * dy))).toBeLessThan(0.3)
  })
})
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: The tautology check, by eye**

Run `npm run dev`, open the band, and answer: **can you see a colour gradient?** Dark curves should not sit systematically above or below light ones. If they do, magnitude predicts decay, the finding is wrong, and this beat must be redesigned. Record the answer in the commit message.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add beat 2 magnitude-coloured decay band (tautology check: no visible gradient)"
```

---

### Task 10: Beat 3, the name is wrong

**Files:**
- Create: `src/components/BeatModel.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `expR2`, `powR2`, `powAlpha` from `dataset.json`.
- Produces: a self-contained beat. Nothing depends on it.

**The claim:** a power law fits better than an exponential on 57 of 88 events, and under a power law the halving time grows rather than staying constant. At the median exponent of 1.29, the same curve halves in 1.7 days measured from day 1 and 21.5 days measured from day 30. Compute these in the frontmatter from the dataset; do not hardcode them.

- [ ] **Step 1: Write the beat**

`src/components/BeatModel.astro`:

```astro
---
import dataset from '../data/dataset.json'
const fitted = dataset.events.filter(e => e.powR2 !== null && e.expR2 !== null)
const powWins = fitted.filter(e => e.powR2 > e.expR2).length
const alphas = fitted.map(e => e.powAlpha).sort((a, b) => a - b)
const alpha = alphas[Math.floor(alphas.length / 2)]
const halveFrom = (t) => (t * (Math.pow(2, 1 / alpha) - 1)).toFixed(1)
---
<section class="beat">
  <p class="body">
    This page is called Attention Half-Life. The data does not show a half-life.
  </p>
  <p class="body">
    A power law fits the decay better than an exponential on {powWins} of
    {fitted.length} events. Under a power law the halving time is not constant.
    It grows. The same curve takes {halveFrom(1)} days to halve when measured
    from day one, and {halveFrom(30)} days when measured from day thirty.
  </p>
  <p class="body">
    The first half of the attention goes in a day. The last half takes a year.
  </p>
</section>
```

- [ ] **Step 2: Write the test**

Append to `test/copy.test.js`:

```js
describe('beat 3 claims trace to the data', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const fitted = dataset.events.filter(e => e.powR2 !== null && e.expR2 !== null)
  it('a power law wins on a clear majority of events', () => {
    const wins = fitted.filter(e => e.powR2 > e.expR2).length
    expect(wins).toBeGreaterThan(fitted.length / 2)
    expect(wins).toBe(57)
  })
  it('the median exponent is above 1, so halving time grows with time', () => {
    const a = fitted.map(e => e.powAlpha).sort((x, y) => x - y)
    const median = a[Math.floor(a.length / 2)]
    expect(median).toBeGreaterThan(1)
    expect(Math.pow(2, 1 / median)).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS. If `wins` is not 57, the dataset differs from the probe and Task 7's parity gate was bypassed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add beat 3 decay model correction"
```

---

### Task 11: Beat 4, the floor and the failed kill

**Files:**
- Create: `src/components/BeatDivergence.astro`
- Create: `src/components/BeatCorrection.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `floor`, `class`, `nearBase`, `cleanBase` from `dataset.json`.
- Produces: two beats. Nothing depends on them.

**Two marks.** First, the floor distribution: 57 subjects as a diverging plot about a baseline rule, sorted, with the sign change as the visual event and named labels on the extremes (Jeffrey Epstein +50.88x at one end, Ellen DeGeneres -0.57x at the other). Inline SVG, not canvas — 57 marks with labels want DOM.

Second, the correction. The floor result first read 44% below baseline and is now 28%, because the pre-event baseline was inflated by run-up coverage. Draw Prince Philip's near-baseline against his clean baseline: 1.97x, the gap being his February to March 2021 hospitalisation. Then state that three of twenty-eight deaths flip sign once the baseline is cleaned, and that the rest hold.

The correction is content, not a footnote. Give it the same visual weight as the other beats.

- [ ] **Step 1: Write the divergence mark**

Frontmatter computes the sorted rows and a shared scale. Use `Math.sign(floor)` to pick `--below` or `--above`. Because floors span -0.57 to +50.88, use a symmetric log scale, and label the axis so a reader can tell it is not linear. Per the design canon, no legend box: label the extremes directly on the marks.

- [ ] **Step 2: Write the correction beat**

Read `nearBase` and `cleanBase` straight from the dataset for Prince Philip and compute the ratio in the frontmatter. Never hardcode 1.97.

- [ ] **Step 3: Write the test**

Append to `test/copy.test.js`:

```js
describe('beat 4 claims trace to the data', () => {
  const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
  const find = n => dataset.events.find(e => e.article === n)

  it('the floor spans a sign change and several thousand fold', () => {
    const floors = dataset.events.filter(e => e.floor !== null).map(e => e.floor)
    expect(Math.min(...floors)).toBeLessThan(0)
    expect(Math.max(...floors)).toBeGreaterThan(50)
  })
  it('scandal reaches a higher floor than any death', () => {
    const maxDeath = Math.max(...dataset.events
      .filter(e => e.class === 'death' && e.floor !== null).map(e => e.floor))
    const maxScandal = Math.max(...dataset.events
      .filter(e => e.class === 'scandal' && e.floor !== null).map(e => e.floor))
    expect(maxScandal).toBeGreaterThan(maxDeath)
  })
  it('the floor is not predicted by spike size', () => {
    const rows = dataset.events.filter(e => e.floor !== null)
    const xs = rows.map(e => Math.log10(e.peak))
    const ys = rows.map(e => e.floor)
    const mx = xs.reduce((a, b) => a + b) / xs.length
    const my = ys.reduce((a, b) => a + b) / ys.length
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - mx) * (ys[i] - my)
      dx += (xs[i] - mx) ** 2
      dy += (ys[i] - my) ** 2
    }
    expect(Math.abs(num / Math.sqrt(dx * dy))).toBeLessThan(0.3)
  })
  it("Prince Philip's near baseline is inflated well above his clean one", () => {
    const p = find('Prince Philip, Duke of Edinburgh')
    expect(p.nearBase / p.cleanBase).toBeGreaterThan(1.5)
  })
})
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add beat 4 floor divergence and the baseline correction"
```

---

### Task 12: The coda

**Files:**
- Create: `src/components/CodaLookup.astro`
- Create: `src/scripts/coda.js`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `fetchSeries` (Task 6), all of `metrics.js` (Tasks 1-4), `floorEligibility` (Task 5), `drawBand` (Task 9).
- Produces: nothing. This is the last component.

**The coda is a live test of the pipeline.** It reuses the same modules that produced every published number, so a reader who looks up an event already in the set must get the identical figures. That round trip is the final verification step in Task 13.

**The reader supplies an article title and an event date.** The date cannot be inferred from a spike, because many articles have several. Ask for both.

**Every state below is real in the probe data. Handle all of them:**

| condition | behaviour |
|---|---|
| 404 from the API | "No English Wikipedia article by that name." Show the exact title format expected. |
| event date before 2015-07-01 | Refuse before fetching. State that daily data starts then. |
| `floorReason === 'pre-api'` | Draw the fall. State that no floor is available, and why. |
| `floorReason === 'event-article'` | Draw the fall. State that the page did not exist before the event, so there is nothing to compare against. |
| `floorReason === 'low-volume'` | Draw the fall. Show the floor flagged as unstable at low volume. Never print the raw ratio. |
| no detectable spike (`peakExcess <= 0`) | "No event spike found in this window." Not an error. |
| any other non-ok status | Retry once, then fail visibly. Never leave an empty chart with no message. |

- [ ] **Step 1: Write the lookup module**

`src/scripts/coda.js` exports `lookup(article, eventDate, fetchImpl)` returning `{ ok, reason, metrics, curve }`. It calls `fetchSeries`, then the same metric functions the build script calls, in the same order, with the same windows. Do not reimplement any metric.

- [ ] **Step 2: Write the test**

`test/coda.test.js` — drive `lookup` with a stub `fetchImpl` for each row of the table above and assert the `reason` string. No network.

```js
import { describe, it, expect } from 'vitest'
import { lookup } from '../src/scripts/coda.js'

const stub = (status, items = []) => async () => ({
  ok: status === 200, status, json: async () => ({ items }),
})

describe('coda states', () => {
  it('reports a missing article rather than throwing', async () => {
    const r = await lookup('Nope', '2022-09-08', stub(404))
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not-found')
  })
  it('refuses a date before the API start without fetching', async () => {
    let called = false
    await lookup('X', '2014-01-01', async () => { called = true })
    expect(called).toBe(false)
  })
  it('retries once on a transient error before failing visibly', async () => {
    let n = 0
    const flaky = async () => { n++; return { ok: false, status: 503 } }
    const r = await lookup('X', '2022-09-08', flaky)
    expect(n).toBe(2)
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run the tests and verify they fail, then pass**

Run: `npm test -- coda`
Expected: FAIL first, then PASS after Step 1's module is complete.

- [ ] **Step 4: Wire the UI**

Two inputs, one button, a canvas that calls `drawBand(canvas, dataset.events, { highlight })`. The reader's curve draws in `--ink` over the band.

Bind reveal interactions with `pointerdown` and `pointercancel`. Do not use `pointermove` plus `pointerleave` — that combination is mouse-only and silently does nothing on a phone.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add live coda lookup"
```

---

### Task 13: Verification and deploy

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all pass. Record the count.

- [ ] **Step 2: Coda round trip**

In the browser, look up five events already in the static set (Elizabeth II 2022-09-08, Kobe Bryant 2020-01-26, Harvey Weinstein 2017-10-05, Notre-Dame de Paris 2019-04-15, Titan (submersible) 2023-06-18) and confirm each returns figures identical to `dataset.json`. Titan must report `event-article` and show no floor.

- [ ] **Step 3: Real-device phone pass**

Open on an actual iPhone, not devtools emulation. Check: the band is not squashed after the URL bar collapses; every reveal responds to the first tap. The first-tap-is-hover bug does not reproduce in emulation, so emulation is not evidence.

- [ ] **Step 4: Copy audit**

Re-read every user-facing string against the language register in Global Constraints. Any sentence implying the event caused the floor, or that the floor measures memory or legacy, gets rewritten.

- [ ] **Step 5: Build and deploy**

```bash
npm run build
git add -A
git commit -m "chore: verification pass"
git push
npx vercel --prod --yes
```

- [ ] **Step 6: Verify live**

Check the finished page on the **project URL** (`<project>.vercel.app`), not a per-deployment URL. Per-deployment URLs sit behind SSO and return the login page with a 200, which reads as a successful deploy when nothing shipped.

Confirm the band renders, the coda answers a real query, and the numbers on screen match `dataset.json`.

---

## Self-review

**Spec coverage.** §1 premise → Tasks 2-3 and beat 3. §2 finding → Tasks 4, 11. §3 kill attempt → Task 11 `BeatCorrection`. §4 evidence and eligibility → Tasks 5, 7. §5 beats → Tasks 8-12. §6 mark and canvas rules → Task 9, Global Constraints. §7 architecture → Tasks 1-7 module split. §8 error handling → Task 12 table. §9 verification → Tasks 7 (parity, perturbation), 9 (tautology), 13 (device, round trip, live). §10 out of scope → nothing built for it. §11 open items → politics n=3 and sport n=5 are still thin; Task 11's class comparison must either drop those two classes or the event list grows first.

**Placeholders.** None. Task 11 steps 1-2 describe marks rather than pasting SVG, because the scale depends on the rendered width. The data access, colour rule, scale type, and label rule are all specified.

**Type consistency.** `series` is `Map<number,number>` everywhere. `crossing` returns `number | null`, checked as null in Task 7. `floorEligibility` returns `{ eligible, reason, cleanBase }`, and `reason` strings match Task 12's table exactly: `pre-api`, `event-article`, `low-volume`. `drawBand(canvas, events, opts)` has the same signature in Tasks 9 and 12.
