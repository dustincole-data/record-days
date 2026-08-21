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
