// Every figure the charts print is computed here, from data/census/top-days.json
// and nothing else. No number is carried by hand.
//
// Eight of the 220 articles were later renamed, so their own title stops receiving
// traffic and the series after the move measures the move, not the reading. They are
// listed in data/census/renamed.json and are dropped from anything that looks at the
// aftermath. They stay in anything that only looks at the peak day itself, which
// happened while the article still had that title.

export function median(xs) {
  if (!xs.length) return null
  const s = xs.slice().sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export function quantile(xs, q) {
  const s = xs.slice().sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}

// First day after the peak on which the page fell to or below a level.
export function dayItFellTo(series, level, limit = 400) {
  for (let d = 1; d < limit; d++) {
    const v = series[d]
    if (v !== undefined && v <= level) return d
  }
  return null
}


// Mann-Whitney U with a tie correction and a normal approximation, so the claim that
// nothing changed between the early years and the late ones is a computed number and
// not one carried by hand. Two-sided.
export function mannWhitney(a, b) {
  const all = a.map((v) => [v, 0]).concat(b.map((v) => [v, 1])).sort((x, y) => x[0] - y[0])
  const ranks = new Array(all.length)
  let i = 0
  const tieGroups = []
  while (i < all.length) {
    let j = i
    while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[k] = r
    tieGroups.push(j - i + 1)
    i = j + 1
  }
  let rankSumA = 0
  for (let k = 0; k < all.length; k++) if (all[k][1] === 0) rankSumA += ranks[k]
  const n1 = a.length, n2 = b.length, n = n1 + n2
  const u1 = rankSumA - (n1 * (n1 + 1)) / 2
  const u = Math.min(u1, n1 * n2 - u1)
  const mu = (n1 * n2) / 2
  const tieTerm = tieGroups.reduce((s2, t) => s2 + (t ** 3 - t), 0)
  const sd = Math.sqrt((n1 * n2 / 12) * ((n + 1) - tieTerm / (n * (n - 1))))
  const z = sd === 0 ? 0 : (u - mu + 0.5) / sd
  // Abramowitz and Stegun 7.1.26 for the normal tail.
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  const p = Math.min(1, 2 * (0.5 * (1 - erf)))
  return { u, z: +z.toFixed(3), p: +p.toFixed(3), n1, n2 }
}


// A page read by fewer than twenty people a day before its event is not a measure of
// how known the subject was, it is a measure of whether that URL existed. Every case
// below the floor is a title that received its subject's history at the moment of the
// event: Meghan, Duchess of Sussex (1 a day), Pope Leo XIV (2), Prince Harry, Duke of
// Sussex (8), Charles III (9), plus Elliot Page and the 2022 Russian invasion article
// at zero. The baselines have a natural gap there: nothing sits between 9 and 30.
export const KNOWN_FLOOR = 20

export function pearson(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  const r = num / Math.sqrt(dx * dy)
  return { r: +r.toFixed(3), r2: +(r * r).toFixed(3), t: +(r * Math.sqrt((n - 2) / (1 - r * r))).toFixed(1), n }
}

// The question the whole piece turns on: what decides whether a day of global attention
// leaves a permanent mark. The answer is how well read the page already was.
export function persistence(events) {
  const set = events
    .filter((e) => !e.renamed && e.base >= KNOWN_FLOOR && e.yearLevel !== null)
    .map((e) => ({ article: e.article, base: e.base, peak: e.peak, date: e.date,
                   now: e.yearLevel, ratio: e.yearLevel / e.base, stuck: !e.toNormal }))
    .sort((a, b) => a.base - b.base)
  const fit = pearson(set.map((e) => Math.log10(e.base)), set.map((e) => Math.log10(e.ratio)))
  const q = Math.floor(set.length / 4)
  const groups = ['the quietest quarter', 'second quarter', 'third quarter', 'the best known quarter']
    .map((label, i) => {
      const g = i < 3 ? set.slice(i * q, (i + 1) * q) : set.slice(3 * q)
      return { label, n: g.length, base: median(g.map((e) => e.base)),
               stuck: g.filter((e) => e.stuck).length, ratio: +median(g.map((e) => e.ratio)).toFixed(2) }
    })
  return {
    n: set.length, fit, groups, floor: KNOWN_FLOOR,
    stuck: set.filter((e) => e.stuck).length,
    points: set.map((e) => ({ a: e.article, b: e.base, p: e.peak, w: Math.round(e.now), r: +e.ratio.toFixed(3), s: e.stuck ? 1 : 0, d: e.date })),
  }
}

export function prepare(rows, renamed) {
  return rows.map((r) => {
    const series = {}
    for (const [k, v] of Object.entries(r.series)) series[+k] = v
    const wholeYear = Array.from({ length: 365 }, (_, d) => series[d]).every((v) => v !== undefined)
    return {
      ...r,
      series,
      renamed: Boolean(renamed[r.article]),
      wholeYear,
      toHalf: dayItFellTo(series, r.peak * 0.5),
      toTenth: dayItFellTo(series, r.peak * 0.1),
      toNormal: r.base ? dayItFellTo(series, r.base * 1.5) : null,
      yearLevel: (() => {
        const w = []
        for (let d = 350; d <= 380; d++) if (series[d] !== undefined) w.push(series[d])
        return w.length >= 20 ? median(w) : null
      })(),
      yearShare: wholeYear
        ? r.peak / Array.from({ length: 365 }, (_, d) => series[d]).reduce((a, b) => a + b, 0)
        : null,
      quiet: quiet(series),
      anniv: anniv(r.date),
      lead: lead(series, r.base),
    }
  })
}

// ---------------------------------------------------------------------------
// The anniversary
//
// A year after its peak day a page lifts for about two days and then goes flat
// again. Every figure the page prints about that comes from the functions below,
// read off data/census/top-days.json. The operational definitions are fixed in
// .claude/plans/2026-08-27-anniversary-premise.md and are reproduced here verbatim
// so that the port is mechanical and nothing is carried by hand.
// ---------------------------------------------------------------------------

// The quiet level a row is measured against: its own median over days 100 to 340,
// the stretch after the fall has finished and before the anniversary window opens.
// A row needs 200 of those 241 days present, and one sitting under the published
// 20-readers-a-day validity floor is not a level at all. 203 of the 220 rows survive.
export const QUIET_FROM = 100
export const QUIET_TO = 340
export const QUIET_MIN_DAYS = 200

// Windows. The control and the landing histogram look 12 days either side of the
// exact date, the dose count 10, and the scale figures 3. Each is stated wherever
// it is used rather than assumed.
export const ECHO_WINDOW = 12
export const DOSE_WINDOW = 10
export const SCALE_WINDOW = 3
export const ECHO_LEVEL = 2
export const RETURN_LEVEL = 1.5

// The placebo runs the identical geometry at 16 other centres: a 21 day window over
// a floor taken from the 46 days before it and the 36 days after, both held off by
// 20 days so the window cannot feed its own floor.
export const PLACEBO_FROM = 110
export const PLACEBO_TO = 335
export const PLACEBO_STEP = 15
export const PLACEBO_HALF = 10
export const PLACEBO_MIN_WINDOW = 15
export const PLACEBO_GAP = 20
export const PLACEBO_BACK = 65
export const PLACEBO_FORWARD = 55
export const PLACEBO_MIN_FLOOR = 60

// A day of warning is a day already running at twice the row's own published
// baseline. Counted backwards from the day before the peak, it separates events
// that arrived without notice from ones the calendar announced.
export const LEAD_LEVEL = 2
export const LEAD_LIMIT = -30
export const RAMP_DAYS = 3

const round2 = (x) => (x === null ? null : +x.toFixed(2))
const share = (part, whole) => (whole ? +((100 * part) / whole).toFixed(1) : null)

// Every reading present in a span of day offsets, in order.
export function daysIn(series, from, to) {
  const out = []
  for (let d = from; d <= to; d++) if (series[d] !== undefined) out.push(series[d])
  return out
}

export function quiet(series) {
  const days = daysIn(series, QUIET_FROM, QUIET_TO)
  if (days.length < QUIET_MIN_DAYS) return null
  const level = median(days)
  return level < KNOWN_FLOOR ? null : level
}

// Whole calendar days from an event date to the same month and day one year later.
// 365, or 366 where a 29 February falls inside the year. Two rows peaked on a 29
// February itself, which has no counterpart the following year; those land on 1 March
// at 366 days, the first date on which the day has passed.
export function anniv(dateIso) {
  const [y, m, d] = dateIso.split('-').map(Number)
  return Math.round((Date.UTC(y + 1, m - 1, d) - Date.UTC(y, m - 1, d)) / 86400000)
}

// Consecutive days of warning before the peak. Rows whose baseline is zero are pages
// created for their own event and have nothing to be twice, so they carry no reading.
export function lead(series, base) {
  if (!base) return null
  let days = 0
  for (let d = -1; d >= LEAD_LIMIT; d--) {
    const v = series[d]
    if (v === undefined || v < LEAD_LEVEL * base) break
    days++
  }
  return days
}

export function leadClass(days) {
  if (days === null) return 'unmeasured'
  if (days === 0) return 'ambush'
  return days >= RAMP_DAYS ? 'ramp' : 'warned'
}

// A row's reading at an offset from its own exact anniversary, as a multiple of its
// own quiet level.
export function echoAt(event, off) {
  if (event.quiet === null) return null
  const v = event.series[event.anniv + off]
  return v === undefined ? null : v / event.quiet
}

export function bestEcho(event, half) {
  let value = null
  let offset = null
  for (let o = -half; o <= half; o++) {
    const e = echoAt(event, o)
    if (e !== null && (value === null || e > value)) {
      value = e
      offset = o
    }
  }
  return { value, offset }
}

// The placebo statistic, run at any centre including 365 itself. Identical geometry
// everywhere, so the only thing that changes between centres is the day it sits on.
export function bump(series, centre) {
  const window = daysIn(series, centre - PLACEBO_HALF, centre + PLACEBO_HALF)
  if (window.length < PLACEBO_MIN_WINDOW) return null
  const floor = daysIn(series, centre - PLACEBO_BACK, centre - PLACEBO_GAP).concat(
    daysIn(series, centre + PLACEBO_GAP, centre + PLACEBO_FORWARD)
  )
  if (floor.length < PLACEBO_MIN_FLOOR) return null
  const level = median(floor)
  if (level < KNOWN_FLOOR) return null
  return Math.max(...window) / level
}

// A row with no reading at an offset has not been shown to echo, so it stays in its
// group and sorts below every row that does have one. Four of the 203 stop short of a
// full year; dropping them instead would raise every share and every median in the
// table by treating an unobserved anniversary as an absent one.
const orNothing = (v) => (v === null ? 0 : v)

function echoGroup(set) {
  const day0 = set.map((e) => orNothing(echoAt(e, 0)))
  const best = set.map((e) => orNothing(bestEcho(e, ECHO_WINDOW).value))
  return {
    n: set.length,
    observed: set.filter((e) => echoAt(e, 0) !== null).length,
    day0: round2(median(day0)),
    over2: share(best.filter((v) => v >= ECHO_LEVEL).length, set.length),
    best: round2(median(best)),
  }
}

// A title that carries a year or an ordinal names a scheduled, numbered occasion.
// A parenthesised year is a disambiguator on the end of an ordinary title and is not
// part of the name, so it is stripped before the test: Moonlight (2016 film) is a
// film, not an annual event.
const YEAR_OR_ORDINAL = /\d{4}|\d+(?:st|nd|rd|th)/
export function numbered(article) {
  return YEAR_OR_ORDINAL.test(article.replace(/[_\s]*\([^)]*\)$/, ''))
}

export function anniversary(events) {
  const rows = events.filter((e) => e.quiet !== null)
  const withBase = events.filter((e) => e.base > 0)

  // The curve, drawn at literal day offsets from each row's own peak, as the median
  // multiple of that row's quiet level.
  const curve = []
  for (let d = -30; d <= 400; d++) {
    const vs = rows.map((e) => (e.series[d] === undefined ? null : e.series[d] / e.quiet)).filter((v) => v !== null)
    if (vs.length) curve.push({ d, m: round2(median(vs)), n: vs.length })
  }
  const plain = curve.filter((p) => p.d >= QUIET_FROM && p.d <= QUIET_TO)
  const plainHigh = plain.slice().sort((a, b) => b.m - a.m)[0]
  const at365 = rows.map((e) => (e.series[365] === undefined ? null : e.series[365] / e.quiet)).filter((v) => v !== null)

  // The placebo. Every centre is scored over every row that can carry the geometry,
  // which is why the counts differ slightly between centres.
  const centres = []
  for (let c = PLACEBO_FROM; c <= PLACEBO_TO; c += PLACEBO_STEP) centres.push(c)
  const placeboAt = (centre) => {
    const bs = events.map((e) => bump(e.series, centre)).filter((v) => v !== null)
    return {
      centre,
      n: bs.length,
      median: round2(median(bs)),
      over2: share(bs.filter((v) => v >= 2).length, bs.length),
      over3: share(bs.filter((v) => v >= 3).length, bs.length),
    }
  }
  const placebo = centres.map(placeboAt)
  const placeboReal = placeboAt(365)

  const ambush = rows.filter((e) => e.lead === 0)
  const ramp = rows.filter((e) => e.lead >= RAMP_DAYS)

  // Where the best day in the window falls, among the rows that reach twice their
  // quiet level at all.
  const landed = rows
    .map((e) => {
      const { value, offset } = bestEcho(e, ECHO_WINDOW)
      return value !== null && value >= ECHO_LEVEL ? { article: e.article, off: offset, echo: value } : null
    })
    .filter(Boolean)
  const landHist = {}
  for (const l of landed) landHist[l.off] = (landHist[l.off] || 0) + 1

  // Scale, read at the tight window: the best day near the anniversary against the
  // day that put the page on the list in the first place.
  const scaleShare = rows.map((e) => {
    const { offset } = bestEcho(e, SCALE_WINDOW)
    return offset === null ? 0 : e.series[e.anniv + offset] / e.peak
  })
  const largest = rows
    .map((e) => {
      const { offset } = bestEcho(e, SCALE_WINDOW)
      return offset === null ? null : { article: e.article, peak: e.peak, share: +(100 * (e.series[e.anniv + offset] / e.peak)).toFixed(1) }
    })
    .filter(Boolean)
    .sort((a, b) => b.share - a.share)
    .slice(0, 8)
  const dose = rows.map((e) => {
    let n = 0
    for (let o = -DOSE_WINDOW; o <= DOSE_WINDOW; o++) {
      const v = echoAt(e, o)
      if (v !== null && v >= ECHO_LEVEL) n++
    }
    return n
  })
  // Rows whose anniversary is observable and never reaches 1.5 times their quiet
  // level anywhere in the window. The four rows with no observable anniversary are
  // not among them; nothing was measured there to fall short.
  const observed = rows.filter((e) => bestEcho(e, ECHO_WINDOW).value !== null)
  const neverBack = observed
    .filter((e) => bestEcho(e, ECHO_WINDOW).value < RETURN_LEVEL)
    .sort((a, b) => b.peak - a.peak)

  const dayBefore = (set) => round2(median(set.map((e) => e.series[-1] / e.base)))
  const era = rows.slice().sort((a, b) => a.date.localeCompare(b.date))
  const half = Math.floor(era.length / 2)

  return {
    n: rows.length,
    // Every threshold the copy is allowed to name, carried as a field so that a
    // figure in a sentence has a row to come from and cannot be typed in.
    definitions: {
      echoLevel: ECHO_LEVEL, returnLevel: RETURN_LEVEL,
      echoWindow: ECHO_WINDOW, doseWindow: DOSE_WINDOW, scaleWindow: SCALE_WINDOW,
      leadLevel: LEAD_LEVEL, rampDays: RAMP_DAYS,
      placeboFrom: PLACEBO_FROM, placeboTo: PLACEBO_TO, placeboStep: PLACEBO_STEP,
      placeboHalf: PLACEBO_HALF, placeboGap: PLACEBO_GAP,
      placeboBack: PLACEBO_BACK, placeboForward: PLACEBO_FORWARD,
      total: events.length, lastDay: 400,
    },
    quiet: { from: QUIET_FROM, to: QUIET_TO, minDays: QUIET_MIN_DAYS, floor: KNOWN_FLOOR, dropped: events.length - rows.length },
    annivDays: rows.reduce((a, e) => ({ ...a, [e.anniv]: (a[e.anniv] || 0) + 1 }), {}),
    curve,
    plain: { median: round2(median(plain.map((p) => p.m))), high: plainHigh },
    at365: { n: at365.length, over2: share(at365.filter((v) => v >= ECHO_LEVEL).length, at365.length) },
    placebo: { centres: placebo, real: placeboReal,
      medianLo: Math.min(...placebo.map((p) => p.median)), medianHi: Math.max(...placebo.map((p) => p.median)),
      over2Lo: Math.min(...placebo.map((p) => p.over2)), over2Hi: Math.max(...placebo.map((p) => p.over2)),
      over3Lo: Math.min(...placebo.map((p) => p.over3)), over3Hi: Math.max(...placebo.map((p) => p.over3)) },
    control: { window: ECHO_WINDOW, all: echoGroup(rows), ambush: echoGroup(ambush), ramp: echoGroup(ramp) },
    ambushCurve: Array.from({ length: 2 * ECHO_WINDOW + 1 }, (_, i) => i - ECHO_WINDOW).map((o) => {
      const vs = ambush.map((e) => echoAt(e, o)).filter((v) => v !== null)
      return { off: o, m: round2(median(vs)), n: vs.length }
    }),
    landing: {
      n: landed.length, hist: landHist,
      mode: Object.entries(landHist).sort((a, b) => b[1] - a[1])[0],
      withinOne: share(landed.filter((l) => Math.abs(l.off) <= 1).length, landed.length),
      weekOut: share(landed.filter((l) => Math.abs(l.off) >= 2 && l.off % 7 === 0).length, landed.length),
      weekOutN: landed.filter((l) => Math.abs(l.off) >= 2 && l.off % 7 === 0).length,
    },
    scale: {
      window: SCALE_WINDOW,
      shareOfPeak: +(100 * median(scaleShare)).toFixed(2),
      days: { window: DOSE_WINDOW, median: median(dose) },
      neverBack: { n: neverBack.length, share: share(neverBack.length, rows.length), names: neverBack.map((e) => e.article) },
      largest,
    },
    leadEdge: {
      n: withBase.length,
      ambush: withBase.filter((e) => e.lead === 0).length,
      warned: withBase.filter((e) => e.lead >= 1 && e.lead < RAMP_DAYS).length,
      ramp: withBase.filter((e) => e.lead >= RAMP_DAYS).length,
      ambushShare: share(withBase.filter((e) => e.lead === 0).length, withBase.length),
      rampShare: share(withBase.filter((e) => e.lead >= RAMP_DAYS).length, withBase.length),
      dayBefore: { ambush: dayBefore(withBase.filter((e) => e.lead === 0)), ramp: dayBefore(withBase.filter((e) => e.lead >= RAMP_DAYS)) },
      longest: withBase.slice().sort((a, b) => b.lead - a.lead).slice(0, 5).map((e) => ({ article: e.article, lead: e.lead })),
    },
    splits: [
      { label: 'title carries a year or an ordinal', yes: echoGroup(rows.filter((e) => numbered(e.article))), no: echoGroup(rows.filter((e) => !numbered(e.article))) },
      { label: 'peak under two million', yes: echoGroup(rows.filter((e) => e.peak < 2e6)), no: echoGroup(rows.filter((e) => e.peak >= 2e6)) },
      { label: 'first half of the record', yes: echoGroup(era.slice(0, half)), no: echoGroup(era.slice(half)) },
    ],
    rows: rows.map((e) => {
      const best = bestEcho(e, ECHO_WINDOW)
      const tight = bestEcho(e, SCALE_WINDOW)
      return {
        article: e.article, date: e.date, peak: e.peak, base: e.base,
        quiet: Math.round(e.quiet), anniv: e.anniv, lead: e.lead, kind: leadClass(e.lead),
        day0: round2(echoAt(e, 0)), best: round2(best.value), at: best.offset,
        share: tight.offset === null ? null : +(100 * (e.series[e.anniv + tight.offset] / e.peak)).toFixed(2),
      }
    }),
  }
}

export function findings(events) {
  const after = events.filter((e) => !e.renamed)
  const half = events.map((e) => e.toHalf).filter(Boolean)
  const halfHist = {}
  for (const d of half) halfHist[d] = (halfHist[d] || 0) + 1

  const normalPool = after.filter((e) => e.base > 0)
  const normalBuckets = [
    { label: 'within a week', lo: 1, hi: 8 },
    { label: '1 to 4 weeks', lo: 8, hi: 31 },
    { label: '1 to 3 months', lo: 31, hi: 91 },
    { label: '3 to 12 months', lo: 91, hi: 366 },
  ].map((b) => ({ ...b, n: normalPool.filter((e) => e.toNormal >= b.lo && e.toNormal < b.hi).length }))
  const neverBack = normalPool.filter((e) => !e.toNormal).length

  const shares = after.filter((e) => e.yearShare !== null).map((e) => e.yearShare)

  const years = []
  for (let y = 2016; y <= 2026; y++) {
    const g = events.filter((e) => +e.date.slice(0, 4) === y)
    const t = g.map((e) => e.toTenth).filter(Boolean)
    if (t.length < 5) continue
    years.push({ year: y, n: g.length, lo: quantile(t, 0.25), median: median(t), hi: quantile(t, 0.75) })
  }

  const named = (e) => ({ article: e.article, peak: e.peak, date: e.date, base: e.base,
    toHalf: e.toHalf, toNormal: e.toNormal, yearShare: e.yearShare })

  const tenthIn = (lo, hi) => events.filter((e) => { const y = +e.date.slice(0, 4); return y >= lo && y <= hi })
    .map((e) => e.toTenth).filter(Boolean)
  const early = tenthIn(2016, 2020), late = tenthIn(2022, 2026)

  return {
    anniversary: anniversary(events),
    persistence: persistence(events),
    trend: { early: { n: early.length, median: median(early) }, late: { n: late.length, median: median(late) }, test: mannWhitney(early, late) },
    top: events.slice(0, 12).map(named),
    shareTop: after.filter((e) => e.yearShare !== null).sort((a, b) => b.yearShare - a.yearShare).slice(0, 5).map(named),
    shareLow: after.filter((e) => e.yearShare !== null).sort((a, b) => a.yearShare - b.yearShare).slice(0, 3).map(named),
    fastBack: normalPool.filter((e) => e.toNormal).sort((a, b) => a.toNormal - b.toNormal).slice(0, 4).map(named),
    slowBack: normalPool.filter((e) => e.toNormal).sort((a, b) => b.toNormal - a.toNormal).slice(0, 4).map(named),
    neverBackNames: normalPool.filter((e) => !e.toNormal).sort((a, b) => b.peak - a.peak).slice(0, 6).map(named),
    n: events.length,
    renamed: events.filter((e) => e.renamed).length,
    half: { median: median(half), hist: halfHist, withinOneDay: halfHist[1] || 0, withinTwoDays: (halfHist[1] || 0) + (halfHist[2] || 0) },
    tenth: { median: median(events.map((e) => e.toTenth).filter(Boolean)) },
    normal: { n: normalPool.length, median: median(normalPool.map((e) => e.toNormal).filter(Boolean)), buckets: normalBuckets, neverBack },
    share: { n: shares.length, median: median(shares), q1: quantile(shares, 0.25), q3: quantile(shares, 0.75), overHalf: shares.filter((s) => s > 0.5).length },
    years,
  }
}
