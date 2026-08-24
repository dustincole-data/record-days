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
    }
  })
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
