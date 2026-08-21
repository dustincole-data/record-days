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
