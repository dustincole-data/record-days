// The band: normalised decay curves on one canvas, peak-aligned at x = 0, coloured by how
// large the peak was. Exported so the coda can overlay a reader's own curve on the same
// axes, and so both panels of beat 2 share one colour scale.

const PAD = { top: 18, right: 18, bottom: 30, left: 48 }

// The y axis is log. On a linear axis the median curve is at 0.03 of its own peak by day
// ten and 0.006 by day thirty, so everything past the first few days would lie flat on the
// bottom rule and the colour interleaving, which is the evidence this beat rests on, could
// not be read at all. Anything under the floor runs off the bottom of the plot and is
// clipped there rather than being flattened onto it.
const Y_FLOOR = 1e-3
const OFF_SCALE = 1e-12
const TICKS = [
  [1, '100%'],
  [0.1, '10%'],
  [0.01, '1%'],
  [Y_FLOOR, '0.1%'],
]

const RULE = '#ddd8d0'
const LABEL = '#55525f'
const HIGHLIGHT = '#16151a'

// Log-scaled magnitude colour. Deliberately a wide hue range so that any real ordering by
// magnitude would be impossible to miss.
function magnitudeColour(peak, minLog, maxLog, alpha) {
  const t = (Math.log10(peak) - minLog) / (maxLog - minLog)
  const hue = 190 - 175 * t
  return `hsla(${hue}, 62%, 45%, ${alpha})`
}

export function magnitudeScale(events) {
  const logs = events.map(e => Math.log10(e.peak))
  return { minLog: Math.min(...logs), maxLog: Math.max(...logs) }
}

function strokeCurve(ctx, curve, x, y, days) {
  ctx.beginPath()
  for (let d = 0; d <= days; d++) {
    const v = curve[d] ?? 0
    d === 0 ? ctx.moveTo(x(d), y(v)) : ctx.lineTo(x(d), y(v))
  }
  ctx.stroke()
}

function drawAxes(ctx, x, y, w, h, days) {
  ctx.save()
  ctx.strokeStyle = RULE
  ctx.fillStyle = LABEL
  ctx.font = '11px Archivo, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const [v, label] of TICKS) {
    const py = Math.round(y(v)) + 0.5
    ctx.beginPath()
    ctx.moveTo(PAD.left, py)
    ctx.lineTo(PAD.left + w, py)
    ctx.stroke()
    ctx.fillText(label, PAD.left - 8, py)
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let d = 0; d <= days; d += 10) {
    ctx.fillText(String(d), x(d), PAD.top + h + 8)
  }
  ctx.restore()
}

export function drawBand(canvas, events, opts = {}) {
  const { days = 30, alpha = 0.28, highlight = null, ink = null } = opts
  const box = canvas.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)

  const ctx = canvas.getContext('2d', { preserveDrawingBuffer: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.width, box.height)
  // Alpha blending, and never the multiply operator, under which 88 overlapping strokes
  // compound to black on a light ground.
  ctx.globalCompositeOperation = 'source-over'
  // lineWidth is clamped to 1 on many devices, so nothing here encodes meaning in it.
  ctx.lineWidth = 1

  const w = box.width - PAD.left - PAD.right
  const h = box.height - PAD.top - PAD.bottom
  const x = d => PAD.left + (d / days) * w
  const y = v => PAD.top + (Math.log10(Math.max(v, OFF_SCALE)) / Math.log10(Y_FLOOR)) * h

  drawAxes(ctx, x, y, w, h, days)

  const scale = opts.scale ?? magnitudeScale(events)

  // Draw order must not track the colour variable. dataset.json is grouped by class, and
  // that order tracks peak size closely enough that the last layer drawn would read as a
  // gradient produced by the ordering alone. Article name is deterministic and carries no
  // magnitude signal.
  const ordered = [...events].sort((a, b) => a.article.localeCompare(b.article))

  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD.left, PAD.top, w, h)
  ctx.clip()
  for (const e of ordered) {
    // A single ink when the caller asks for one. Hue over the whole set would grade from
    // top to bottom, since a normalised curve's level tracks magnitude by arithmetic, and
    // an ordering the mark does not claim is worse than no colour at all.
    ctx.strokeStyle = ink
      ? `rgba(${ink}, ${alpha})`
      : magnitudeColour(e.peak, scale.minLog, scale.maxLog, alpha)
    strokeCurve(ctx, e.curve, x, y, days)
  }
  if (highlight) {
    ctx.strokeStyle = HIGHLIGHT
    strokeCurve(ctx, highlight.curve, x, y, days)
  }
  ctx.restore()
}

// The rate against the magnitude, which is the claim beat 2 actually makes. Peak size is
// an axis here rather than a hue. Over the band a hue is unreadable as evidence: the level
// of a normalised curve tracks magnitude arithmetically, so any colour laid over the mass
// grades top to bottom whatever the rate does.
export function rateScatterPoints(events) {
  return events.map(e => ({ x: Math.log10(e.peak), y: Math.log10(e.t50), peak: e.peak }))
}

const X_TICKS = [[1e4, '10k'], [1e5, '100k'], [1e6, '1M'], [1e7, '10M']]
const Y_TICKS = [[0.5, '0.5'], [1, '1'], [2, '2'], [5, '5'], [10, '10']]

export function drawRateScatter(canvas, events, opts = {}) {
  const box = canvas.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)

  const ctx = canvas.getContext('2d', { preserveDrawingBuffer: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.width, box.height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 1

  const w = box.width - PAD.left - PAD.right
  const h = box.height - PAD.top - PAD.bottom
  const pts = rateScatterPoints(events)
  const scale = opts.scale ?? magnitudeScale(events)

  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const padX = (x1 - x0) * 0.06
  const padY = (y1 - y0) * 0.09
  const X = v => PAD.left + ((v - x0 + padX) / (x1 - x0 + 2 * padX)) * w
  const Y = v => PAD.top + h - ((v - y0 + padY) / (y1 - y0 + 2 * padY)) * h

  ctx.save()
  ctx.strokeStyle = RULE
  ctx.fillStyle = LABEL
  ctx.font = '11px Archivo, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const [v, label] of Y_TICKS) {
    const py = Math.round(Y(Math.log10(v))) + 0.5
    if (py < PAD.top || py > PAD.top + h) continue
    ctx.beginPath()
    ctx.moveTo(PAD.left, py)
    ctx.lineTo(PAD.left + w, py)
    ctx.stroke()
    ctx.fillText(label, PAD.left - 8, py)
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const [v, label] of X_TICKS) {
    const px = X(Math.log10(v))
    if (px < PAD.left || px > PAD.left + w) continue
    ctx.fillText(label, px, PAD.top + h + 8)
  }
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD.left, PAD.top, w, h)
  ctx.clip()
  for (const p of pts) {
    ctx.fillStyle = magnitudeColour(p.peak, scale.minLog, scale.maxLog, 0.72)
    ctx.beginPath()
    ctx.arc(X(p.x), Y(p.y), 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
