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
      machine: machineHole(series, r.base),
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

// ---------------------------------------------------------------------------
// The cast
//
// A record reading day does not happen to one page. It happens to a small set of
// pages at once, and a year later the set is still moving together. Pages that
// shared a date by coincidence are not. Every figure the page prints about that
// comes from the functions below, read off data/census/top-days.json. The
// operational definitions are fixed in .claude/plans/2026-08-28-the-cast-premise.md
// and are reproduced here so the port is mechanical and nothing is carried by hand.
//
// Two conventions, both load-bearing:
//
//   The aftermath statistics drop the 8 renamed titles, exactly as the anniversary
//   ones do, and they also drop any row carrying a machine hole (below). The
//   premise file quotes a far-pair median of 0.026 because it was computed before
//   the machine test existed; with Question_mark out it reads 0.027 and nothing
//   else in the object moves. Both are carried, so the difference is visible
//   rather than silent.
//
//   A missing reading is not a zero. Every window here counts the readings that
//   are present and refuses to run when too few are.
// ---------------------------------------------------------------------------

// The residual window. Days 1 to 29 are excluded so the fall after the peak is not
// inside it, and day 340 is the last offset 199 of the 220 rows can supply.
export const CAST_FROM = 30
export const CAST_TO = 340
export const CAST_MIN_DAYS = 250
// The detrend: subtract a 29-day centred rolling median of log readings, which
// removes the shared decay shape, the one thing the qualification gate selects for.
export const CAST_HALF = 14
export const CAST_WINDOW_MIN = 20
// Two rows are compared only over calendar dates both were read on.
export const CAST_SHARED_MIN = 150
// Peaks this far apart or less, but not on the same day, are the near-miss control.
export const CAST_NEAR = 14
export const CAST_LAGS = 3
// "The days it was read most unusually" is the top 5% of a row's own residuals.
export const CAST_TOP_SHARE = 0.05
export const NULL_DRAWS = 20000
export const NULL_SEED = 20260828
// The region a pair with no shared record day occupies, cut at these two percentiles
// of the far-pair distribution. The sheet paints it, so the levels are data.
export const BAND_LO = 0.05
export const BAND_HI = 0.95
// The hero draws each page's residual track, so the track has to travel in the payload
// rather than be re-derived on the page. One byte a day: 0 is a day with no reading,
// and 1 to 255 is the residual clipped to CAST_TRACK_CLIP either side of nought. The
// byte is a DRAWN HEIGHT, not a reading. The clip is a drawing decision and the share
// of readings it touches is emitted beside it, so the choice is auditable rather than
// silent.
export const CAST_TRACK_CLIP = 0.42

const DAY_MS = 86400000
export const epochDay = (iso) => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY_MS)
export const isoDay = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10)

// --- machine traffic the two shape tests did not catch ---------------------
//
// qualify() reads day 0, day 3, day 7 and the pre-peak median. A page driven by an
// automated crawl can pass all three and still show a signature no readership has:
// a single day sitting back at its own baseline with a day on either side running a
// hundred times above it. People do not stop for one day and come back. One row of
// the 220 carries it, and naming it is a ruling the file makes, not one typed in.
export const MACHINE_AT = 3
export const MACHINE_AROUND = 100
export const MACHINE_FROM = -30
export const MACHINE_TO = 30

export function machineHole(series, base) {
  if (!base) return null
  for (let d = MACHINE_FROM; d <= MACHINE_TO; d++) {
    const v = series[d], before = series[d - 1], after = series[d + 1]
    if (v === undefined || before === undefined || after === undefined) continue
    if (v <= MACHINE_AT * base && before >= MACHINE_AROUND * base && after >= MACHINE_AROUND * base) {
      return { day: d, before, value: v, after, base }
    }
  }
  return null
}

// --- the residual series ----------------------------------------------------
//
// Keyed by CALENDAR DATE rather than by day offset, which is the whole point: two
// rows that peaked on the same day are then being compared on the same dates. The
// values are held on a dense span so a pair can be walked in one pass.
export function residualSeries(event) {
  const days = []
  for (let d = CAST_FROM; d <= CAST_TO; d++) {
    const v = event.series[d]
    if (v !== undefined && v > 0) days.push(d)
  }
  if (days.length < CAST_MIN_DAYS) return null
  const lg = new Map()
  for (const d of days) lg.set(d, Math.log(event.series[d]))
  const n = CAST_TO - CAST_FROM + 1
  const values = new Float64Array(n)
  const present = new Uint8Array(n)
  let kept = 0
  for (const d of days) {
    const w = []
    for (let e = d - CAST_HALF; e <= d + CAST_HALF; e++) if (lg.has(e)) w.push(lg.get(e))
    if (w.length < CAST_WINDOW_MIN) continue
    values[d - CAST_FROM] = lg.get(d) - median(w)
    present[d - CAST_FROM] = 1
    kept++
  }
  return { article: event.article, date: event.date, start: epochDay(event.date) + CAST_FROM, n, values, present, kept }
}

// The residual track as one byte a day, over the same offsets the tie is measured on.
export function trackBytes(rs) {
  const out = Buffer.alloc(rs.n)
  let clipped = 0, kept = 0
  for (let i = 0; i < rs.n; i++) {
    if (!rs.present[i]) continue
    const v = rs.values[i]
    kept++
    if (Math.abs(v) > CAST_TRACK_CLIP) clipped++
    const t = Math.max(-1, Math.min(1, v / CAST_TRACK_CLIP))
    out[i] = Math.max(1, Math.min(255, Math.round(128 + t * 127)))
  }
  return { b64: out.toString('base64'), clipped, kept }
}

// Every calendar date both rows were read on, with one row optionally shifted.
export function sharedDays(a, b, lag = 0) {
  const lo = Math.max(a.start + lag, b.start)
  const hi = Math.min(a.start + lag + a.n, b.start + b.n)
  const out = []
  for (let t = lo; t < hi; t++) {
    const i = t - a.start - lag, j = t - b.start
    if (!a.present[i] || !b.present[j]) continue
    out.push([t, a.values[i], b.values[j]])
  }
  return out
}

export function correlate(a, b, lag = 0, sharedMin = CAST_SHARED_MIN) {
  const lo = Math.max(a.start + lag, b.start)
  const hi = Math.min(a.start + lag + a.n, b.start + b.n)
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
  for (let t = lo; t < hi; t++) {
    const i = t - a.start - lag, j = t - b.start
    if (!a.present[i] || !b.present[j]) continue
    const x = a.values[i], y = b.values[j]
    n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
  }
  if (n < sharedMin) return null
  const cov = sxy - (sx * sy) / n
  const vx = sxx - (sx * sx) / n
  const vy = syy - (sy * sy) / n
  if (vx <= 0 || vy <= 0) return null
  return { r: cov / Math.sqrt(vx * vy), n }
}

// A correlation is not a quantity anyone reads in. This is: take the days one page
// was read most unusually, and report where its partner sat on exactly those days,
// as a multiple of the partner's own 29-day level.
export function partnerLift(a, b, q = CAST_TOP_SHARE, sharedMin = CAST_SHARED_MIN) {
  const days = sharedDays(a, b)
  if (days.length < sharedMin) return null
  const k = Math.max(5, Math.round(q * days.length))
  const top = days.slice().sort((x, y) => y[1] - x[1]).slice(0, k)
  return { k, shared: days.length, lift: Math.exp(median(top.map((d) => d[2]))) }
}

// Days from the peak to the first day the page is back at 1.5 times its own
// baseline. RETURN_LEVEL is the same 1.5 the anniversary section uses.
export function returnDay(event, level = RETURN_LEVEL) {
  if (!event.base) return null
  return dayItFellTo(event.series, event.base * level)
}

// --- the nulls --------------------------------------------------------------
//
// xorshift32, so a run of this file reproduces the same draws on any machine. The
// null redraws every row's peak date inside its own year and month AND on the same
// weekday, which holds both the shape of the record over time and the Monday skew
// fixed, then asks how many rows land on a date some other row also landed on.
export function xorshift(seed) {
  let s = (seed >>> 0) || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}

function sameWeekdaySlots(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), w = d.getUTCDay()
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const out = []
  for (let k = 1; k <= last; k++) if (new Date(Date.UTC(y, m, k)).getUTCDay() === w) out.push(y * 10000 + m * 100 + k)
  return out
}

// tags marks a subset of the rows (the months under test); the null reports both the
// whole count and the tagged count so one draw serves both questions.
export function sameDayNull(dates, tags, observed, observedTagged, draws = NULL_DRAWS, seed = NULL_SEED) {
  const rand = xorshift(seed)
  const slots = dates.map(sameWeekdaySlots)
  let total = 0, totalTagged = 0, atLeast = 0, atMost = 0
  for (let t = 0; t < draws; t++) {
    const seen = new Map()
    for (let i = 0; i < slots.length; i++) {
      const key = slots[i][Math.floor(rand() * slots[i].length)]
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key).push(i)
    }
    let n = 0, tagged = 0
    for (const v of seen.values()) {
      if (v.length < 2) continue
      n += v.length
      for (const i of v) if (tags[i]) tagged++
    }
    total += n
    totalTagged += tagged
    if (n >= observed) atLeast++
    if (tagged >= observedTagged) atMost++
  }
  return {
    draws,
    expected: +(total / draws).toFixed(1),
    expectedShare: +((100 * total) / draws / dates.length).toFixed(1),
    p: (atLeast + 1) / (draws + 1),
    expectedTagged: +(totalTagged / draws).toFixed(1),
    pTagged: (atMost + 1) / (draws + 1),
  }
}

// Resamples the observed pair distribution to ask how often k pairs drawn from it
// reach the same-day median. Lower is the tail for the return-day statistic, where
// a small number is the strong result.
export function permuteMedian(pool, k, observed, lower = false, draws = NULL_DRAWS, seed = NULL_SEED + 1) {
  const rand = xorshift(seed)
  let hits = 0
  const s = new Array(k)
  for (let t = 0; t < draws; t++) {
    for (let i = 0; i < k; i++) s[i] = pool[Math.floor(rand() * pool.length)]
    const m = median(s)
    if (lower ? m <= observed : m >= observed) hits++
  }
  return { draws, p: (hits + 1) / (draws + 1) }
}

// A page's title is not evidence. This drops any same-day pair whose two titles
// share a word, so a cast cannot be a subject counted twice. Bare years and the
// handful of words every American political title carries are stoplisted, because
// they are furniture rather than a subject.
export const TITLE_STOP = new Set(['the', 'of', 'and', 'in', 'a', 'united', 'states'])
export function titleTokens(article) {
  return new Set(
    article.toLowerCase().replace(/[(),]/g, ' ').split(/[\s_]+/)
      .filter((w) => w && !TITLE_STOP.has(w) && !/^\d{4}$/.test(w))
  )
}
export function sharedToken(a, b) {
  const A = titleTokens(a), B = titleTokens(b)
  for (const w of A) if (B.has(w)) return w
  return null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// The three months the casts land in, named here so the count and the null test the
// same set. No claim is made about why.
export const CAST_MONTHS = [1, 2, 10]

export function cast(events) {
  const monthOf = (iso) => +iso.slice(5, 7) - 1
  const machine = events.filter((e) => e.machine)
  const machineNames = new Set(machine.map((e) => e.article))

  // --- part A, the groups -------------------------------------------------
  const byDate = new Map()
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, [])
    byDate.get(e.date).push(e)
  }
  const groups = [...byDate.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([date, g]) => ({ date, pages: g.slice().sort((a, b) => b.peak - a.peak) }))
    .sort((a, b) => b.pages.length - a.pages.length || a.date.localeCompare(b.date))
  const member = new Set(groups.flatMap((g) => g.pages.map((e) => e.article)))
  const sizes = {}
  for (const g of groups) sizes[g.pages.length] = (sizes[g.pages.length] || 0) + 1

  const dates = events.map((e) => e.date)
  const tags = events.map((e) => CAST_MONTHS.includes(monthOf(e.date)))
  const inMonths = events.filter((e) => member.has(e.article) && CAST_MONTHS.includes(monthOf(e.date))).length
  const groupNull = sameDayNull(dates, tags, member.size, inMonths)

  const months = MONTHS.map((label, m) => {
    const all = events.filter((e) => monthOf(e.date) === m)
    const inCast = all.filter((e) => member.has(e.article))
    return { month: m + 1, label, n: all.length, inCast: inCast.length, share: all.length ? +((100 * inCast.length) / all.length).toFixed(1) : null }
  })

  // --- part B, the bond ---------------------------------------------------
  const usable = events
    .filter((e) => !e.renamed && !e.machine)
    .map(residualSeries)
    .filter(Boolean)
  const byArticle = new Map(usable.map((s) => [s.article, s]))
  const gapOf = (a, b) => Math.abs(epochDay(a.date) - epochDay(b.date))

  const same = [], near = [], far = []
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const c = correlate(usable[i], usable[j])
      if (!c) continue
      const gap = gapOf(usable[i], usable[j])
      const row = { a: usable[i].article, b: usable[j].article, date: usable[i].date, gap, r: c.r, days: c.n }
      if (gap === 0) same.push(row)
      else if (gap <= CAST_NEAR) near.push(row)
      else far.push(row)
    }
  }
  const farRs = far.map((p) => p.r).sort((x, y) => x - y)
  const p95 = farRs[Math.floor(BAND_HI * farRs.length)]
  const bucket = (set) => ({ n: set.length, median: +median(set.map((p) => p.r)).toFixed(3) })
  const farLong = far.filter((p) => p.days >= 250)

  // The same pass again with the machine row left in, so the one figure the premise
  // file quotes differently can be checked rather than taken on trust.
  const withMachine = events.filter((e) => !e.renamed).map(residualSeries).filter(Boolean)
  const farWith = []
  for (let i = 0; i < withMachine.length; i++) {
    for (let j = i + 1; j < withMachine.length; j++) {
      if (gapOf(withMachine[i], withMachine[j]) <= CAST_NEAR) continue
      const c = correlate(withMachine[i], withMachine[j])
      if (c) farWith.push(c.r)
    }
  }

  const permutation = permuteMedian(
    [...same, ...near, ...far].map((p) => p.r), same.length, median(same.map((p) => p.r))
  )

  const dropped = same.filter((p) => sharedToken(p.a, p.b))
  const cleanPairs = same.filter((p) => !sharedToken(p.a, p.b))

  const lag = []
  for (let k = -CAST_LAGS; k <= CAST_LAGS; k++) {
    const rs = []
    for (const p of same) {
      const c = correlate(byArticle.get(p.a), byArticle.get(p.b), k)
      if (c) rs.push(c.r)
    }
    lag.push({ lag: k, n: rs.length, median: +median(rs).toFixed(3), values: rs.map((v) => +v.toFixed(3)) })
  }

  // Quarters of the year after the peak, each run on its own residuals so the
  // window is never asked to carry a length it does not have.
  const quarters = [[30, 107], [108, 185], [186, 263], [264, 340]].map(([from, to]) => {
    const span = to - from + 1
    const minDays = Math.round(span * 0.83)
    const sharedMin = Math.round(span * 0.58)
    const rows = events.filter((e) => !e.renamed && !e.machine)
      .map((e) => residualSpan(e, from, to, minDays)).filter(Boolean)
    const s = [], f = []
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const c = correlate(rows[i], rows[j], 0, sharedMin)
        if (!c) continue
        const g = gapOf(rows[i], rows[j])
        if (g === 0) s.push(c.r)
        else if (g > CAST_NEAR) f.push(c.r)
      }
    }
    return { from, to, same: { n: s.length, median: +median(s).toFixed(3) }, far: { n: f.length, median: +median(f).toFixed(3) } }
  })

  // Per constellation: every pair inside it, and each page's median tie to the rest
  // of the field, which is the control drawn beside the cast rather than argued.
  const constellations = groups.map((g) => {
    const mem = g.pages.filter((e) => byArticle.has(e.article))
    const edges = []
    for (let i = 0; i < mem.length; i++) {
      for (let j = i + 1; j < mem.length; j++) {
        const c = correlate(byArticle.get(mem[i].article), byArticle.get(mem[j].article))
        if (!c) continue
        const ab = partnerLift(byArticle.get(mem[i].article), byArticle.get(mem[j].article))
        const ba = partnerLift(byArticle.get(mem[j].article), byArticle.get(mem[i].article))
        edges.push({
          a: mem[i].article, b: mem[j].article, r: +c.r.toFixed(3), raw: c.r, days: c.n,
          lift: ab ? +ab.lift.toFixed(3) : null, mirror: ba ? +ba.lift.toFixed(3) : null,
          token: sharedToken(mem[i].article, mem[j].article),
        })
      }
    }
    const combined = g.pages.reduce((a, e) => a + e.peak, 0)
    // The median and the spread are taken before the edges are rounded for print, so
    // recomputing either from the raw file lands on the same number.
    const raw = edges.map((e) => e.raw)
    for (const e of edges) delete e.raw
    return {
      date: g.date,
      n: g.pages.length,
      measured: mem.length,
      median: raw.length ? +median(raw).toFixed(3) : null,
      spread: raw.length > 1 ? +(Math.max(...raw) - Math.min(...raw)).toFixed(3) : null,
      combined,
      leadShare: +((100 * g.pages[0].peak) / combined).toFixed(1),
      pages: g.pages.map((e) => ({
        article: e.article, peak: e.peak, base: e.base, lead: e.lead, kind: leadClass(e.lead),
        renamed: e.renamed, machine: Boolean(e.machine), measured: byArticle.has(e.article),
        track: byArticle.has(e.article) ? trackBytes(byArticle.get(e.article)).b64 : null,
        elsewhere: byArticle.has(e.article)
          ? +median(usable.filter((o) => o.date !== e.date).map((o) => correlate(byArticle.get(e.article), o)).filter(Boolean).map((c) => c.r)).toFixed(3)
          : null,
      })),
      edges,
    }
  })

  const bySize = [2, 3, 4].map((n) => {
    const es = constellations.filter((c) => c.n === n).flatMap((c) => c.edges)
    return { size: n, pairs: es.length, median: es.length ? +median(es.map((e) => e.r)).toFixed(3) : null }
  })

  // --- the two kinds of record day ---------------------------------------
  const castRows = events.filter((e) => member.has(e.article))
  const soloRows = events.filter((e) => !member.has(e.article))
  const known = (set) => set.filter((e) => e.base >= KNOWN_FLOOR)
  const fameOf = (set, label) => ({
    label, n: set.length,
    base: Math.round(median(set.map((e) => e.base))),
    peak: Math.round(median(set.map((e) => e.peak))),
    lift: +median(known(set).map((e) => e.peak / e.base)).toFixed(0),
    underFloor: set.filter((e) => e.base < KNOWN_FLOOR).length,
  })
  const fame = {
    floor: KNOWN_FLOOR,
    cast: fameOf(castRows, 'shares its record day'),
    solo: fameOf(soloRows, 'has it alone'),
    test: mannWhitney(known(castRows).map((e) => e.base), known(soloRows).map((e) => e.base)),
  }
  // Every row, so a mark can draw the two groups as themselves.
  fame.points = events.map((e) => ({
    article: e.article, date: e.date, base: e.base, peak: e.peak,
    cast: member.has(e.article) ? 1 : 0,
  }))
  fame.baseRatio = +(fame.cast.base / fame.solo.base).toFixed(1)
  fame.peakGap = +(100 * Math.abs(fame.cast.peak - fame.solo.peak) / fame.solo.peak).toFixed(1)

  // --- they come down together -------------------------------------------
  const backPool = events.filter((e) => !e.renamed && !e.machine).map((e) => ({ e, day: returnDay(e) })).filter((x) => x.day !== null)
  const backBuckets = { same: [], near: [], far: [] }
  for (let i = 0; i < backPool.length; i++) {
    for (let j = i + 1; j < backPool.length; j++) {
      const g = Math.abs(epochDay(backPool[i].e.date) - epochDay(backPool[j].e.date))
      const d = Math.abs(backPool[i].day - backPool[j].day)
      if (g === 0) backBuckets.same.push(d)
      else if (g <= CAST_NEAR) backBuckets.near.push(d)
      else backBuckets.far.push(d)
    }
  }
  const backStat = (set) => ({ n: set.length, median: median(set), withinThree: +((100 * set.filter((d) => d <= 3).length) / set.length).toFixed(1) })
  const back = {
    level: RETURN_LEVEL,
    same: backStat(backBuckets.same), near: backStat(backBuckets.near), far: backStat(backBuckets.far),
    permutation: permuteMedian(
      [...backBuckets.same, ...backBuckets.near, ...backBuckets.far], backBuckets.same.length,
      median(backBuckets.same), true
    ),
    rows: groups.map((g) => {
      const pages = g.pages.map((e) => ({ article: e.article, day: e.renamed || e.machine ? null : returnDay(e) }))
      // The span between the first and the last of a group's days is the thing the row
      // draws and the thing the sentence names, so it is stored rather than left to
      // whatever reads the file to work out for itself.
      const days = pages.map((p) => p.day).filter((d) => d !== null)
      return { date: g.date, gap: days.length > 1 ? Math.max(...days) - Math.min(...days) : null, pages }
    }),
  }

  // --- the run-up matches too ---------------------------------------------
  const led = events.filter((e) => e.lead !== null)
  let sSame = 0, sTot = 0, fSame = 0, fTot = 0
  const sDiff = [], fDiff = []
  for (let i = 0; i < led.length; i++) {
    for (let j = i + 1; j < led.length; j++) {
      const g = Math.abs(epochDay(led[i].date) - epochDay(led[j].date))
      const d = Math.abs(led[i].lead - led[j].lead)
      if (g === 0) { sTot++; if (d === 0) sSame++; sDiff.push(d) }
      else if (g > CAST_NEAR) { fTot++; if (d === 0) fSame++; fDiff.push(d) }
    }
  }
  const runup = {
    same: { n: sTot, identical: sSame, share: +((100 * sSame) / sTot).toFixed(1), median: median(sDiff) },
    far: { n: fTot, identical: fSame, share: +((100 * fSame) / fTot).toFixed(1), median: median(fDiff) },
    test: chiSquare2x2(sSame, sTot - sSame, fSame, fTot - fSame),
  }

  // --- how big are the wiggles being correlated ---------------------------
  const amplitude = median(usable.map((s) => {
    const v = []
    for (let i = 0; i < s.n; i++) if (s.present[i]) v.push(Math.abs(s.values[i]))
    return median(v)
  }))
  const level = median(events.filter((e) => !e.renamed && !e.machine).map((e) => median(daysIn(e.series, 250, 340))).filter((v) => v !== null))

  return {
    definitions: {
      from: CAST_FROM, to: CAST_TO, minDays: CAST_MIN_DAYS, half: CAST_HALF,
      windowMin: CAST_WINDOW_MIN, sharedMin: CAST_SHARED_MIN, near: CAST_NEAR,
      topShare: CAST_TOP_SHARE, returnLevel: RETURN_LEVEL, floor: KNOWN_FLOOR,
      machine: { at: MACHINE_AT, around: MACHINE_AROUND, from: MACHINE_FROM, to: MACHINE_TO },
      months: CAST_MONTHS.map((m) => MONTHS[m]),
      total: events.length,
    },
    machine: {
      n: machine.length,
      found: machine.map((e) => ({ article: e.article, date: e.date, peak: e.peak, ...e.machine })),
    },
    // What the hero's tracks are, and what the drawing clip costs. Emitted so the page
    // can state the clip and a test can hold the share it touches down.
    tracks: (() => {
      let clipped = 0, kept = 0
      for (const e of usable) { const t = trackBytes(e); clipped += t.clipped; kept += t.kept }
      return {
        clip: CAST_TRACK_CLIP, from: CAST_FROM, to: CAST_TO, days: CAST_TO - CAST_FROM + 1,
        readings: kept, clipped, clippedShare: +((100 * clipped) / kept).toFixed(2),
      }
    })(),
    groups: {
      total: events.length, inCast: member.size,
      share: +((100 * member.size) / events.length).toFixed(1),
      casts: groups.length, sizes,
      null: groupNull,
      months, inMonths,
      monthShare: +((100 * inMonths) / events.filter((e) => CAST_MONTHS.includes(monthOf(e.date))).length).toFixed(1),
      quietMonths: MONTHS.filter((_, m) => !events.some((e) => monthOf(e.date) === m && member.has(e.article))),
      quietMonthRows: events.filter((e) => !events.some((o) => monthOf(o.date) === monthOf(e.date) && member.has(o.article))).length,
    },
    bond: {
      rows: usable.length, dropped: { renamed: events.filter((e) => e.renamed).length, machine: machine.length },
      same: bucket(same), near: bucket(near), far: bucket(far), farLong: bucket(farLong),
      p05: +farRs[Math.floor(BAND_LO * farRs.length)].toFixed(3),
      p95: +p95.toFixed(3),
      // The two percentile levels the band is cut at, and the share of the control
      // that therefore sits inside it. The sheet draws that band and names it, so the
      // levels are emitted rather than written into the caption by hand.
      pLo: +(100 * BAND_LO).toFixed(0),
      pHi: +(100 * BAND_HI).toFixed(0),
      band: +(100 * (BAND_HI - BAND_LO)).toFixed(0),
      aboveP95: same.filter((p) => p.r > p95).length,
      // The hero draws its two controls as cells rather than arguing them in a caption,
      // so it needs a named pair from each bucket whose tracks are already in the
      // payload. Both members must sit in some cast, and the pair is the one whose tie
      // is closest to its own bucket median: the typical case, not a chosen one.
      controls: (() => {
        const pick = (rows) => {
          const med = median(rows.map((r) => r.r))
          const ok = rows.filter((r) => member.has(r.a) && member.has(r.b))
          if (!ok.length) return null
          const best = ok.slice().sort((x, y) => Math.abs(x.r - med) - Math.abs(y.r - med) || x.a.localeCompare(y.a))[0]
          return { a: best.a, b: best.b, r: +best.r.toFixed(3) }
        }
        return { near: pick(near), far: pick(far) }
      })(),
      permutation,
      withMachine: { rows: withMachine.length, far: { n: farWith.length, median: +median(farWith).toFixed(3) } },
      tokens: { kept: cleanPairs.length, median: +median(cleanPairs.map((p) => p.r)).toFixed(3), dropped: dropped.map((p) => ({ a: p.a, b: p.b, token: sharedToken(p.a, p.b), r: +p.r.toFixed(3) })) },
      lag, quarters, bySize,
      amplitude: +amplitude.toFixed(3),
      swing: +((Math.exp(amplitude) - 1) * 100).toFixed(1),
      level: Math.round(level),
      histogram: histogram(far.map((p) => p.r), -0.4, 1, 0.05),
      nearHistogram: histogram(near.map((p) => p.r), -0.4, 1, 0.05),
      // Every control pair, so a mark can draw the controls as themselves rather
      // than as a summary of themselves.
      farValues: far.map((p) => +p.r.toFixed(3)).sort((a, b) => a - b),
      nearValues: near.map((p) => +p.r.toFixed(3)).sort((a, b) => a - b),
      pairs: same.slice().sort((a, b) => b.r - a.r).map((p) => ({ date: p.date, a: p.a, b: p.b, r: +p.r.toFixed(3), days: p.days })),
    },
    constellations,
    fame,
    back,
    runup,
  }
}

// The residual series over an arbitrary span, used by the quarter split.
export function residualSpan(event, from, to, minDays) {
  const days = []
  for (let d = from; d <= to; d++) {
    const v = event.series[d]
    if (v !== undefined && v > 0) days.push(d)
  }
  if (days.length < minDays) return null
  const lg = new Map()
  for (const d of days) lg.set(d, Math.log(event.series[d]))
  const n = to - from + 1
  const values = new Float64Array(n)
  const present = new Uint8Array(n)
  for (const d of days) {
    const w = []
    for (let e = d - CAST_HALF; e <= d + CAST_HALF; e++) if (lg.has(e)) w.push(lg.get(e))
    if (w.length < CAST_WINDOW_MIN) continue
    values[d - from] = lg.get(d) - median(w)
    present[d - from] = 1
  }
  return { article: event.article, date: event.date, start: epochDay(event.date) + from, n, values, present }
}

export function histogram(xs, lo, hi, step) {
  const bins = []
  for (let b = lo; b < hi - 1e-9; b += step) bins.push({ from: +b.toFixed(2), to: +(b + step).toFixed(2), n: 0 })
  for (const x of xs) {
    const i = Math.min(bins.length - 1, Math.max(0, Math.floor((x - lo) / step)))
    bins[i].n++
  }
  return bins
}

// 2x2 with the Yates correction, and the normal tail for the p, so the run-up claim
// carries a computed number like every other claim here.
export function chiSquare2x2(a, b, c, d) {
  const n = a + b + c + d
  const chi = (n * (Math.abs(a * d - b * c) - n / 2) ** 2) / ((a + b) * (c + d) * (a + c) * (b + d))
  const z = Math.sqrt(chi)
  const t = 1 / (1 + (0.3275911 * z) / Math.SQRT2)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return { chi2: +chi.toFixed(2), df: 1, p: 1 - erf }
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
    cast: cast(events),
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
