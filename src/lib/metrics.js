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
