// The orbit. One thread per subject, radial, 57 of them. Each runs out from the ring to
// its peak and back down over sixty days, ending in a dot at where it stood a year later.
//
// The ring is that page's own reading before the event: radius is log10 of views against
// that page's clean baseline, so the ring is 1x and inside the ring is below baseline.
// Threads are sorted by the floor around the circle and the block that ends below is
// rotated to sit across the top, so the colour gradient is a consequence of the sort.

// Spectral within poles: a warm ramp for below the ring, a cool ramp for above it.
const WARM = ['#f7c86a', '#f0913f', '#df5b34', '#c02f4b', '#8e1a4e']
const COOL = ['#9fe3cf', '#4fc0c0', '#2f8fc9', '#3b5fc0', '#5b3fa8']

const RING_INK = 'rgba(29, 23, 38, 0.7)'
const RING_FILL = 'rgba(192, 47, 75, 0.055)'
const GRID_INK = 'rgba(29, 23, 38, 0.12)'
const LABEL_INK = 'rgba(29, 23, 38, 0.92)'
const SOFT_INK = 'rgba(111, 102, 120, 1)'
const GROUND = '#f4efe6'
const QUERY_INK = '#1d1726'

// The scale rings drawn behind the threads. Positions on a log radius, not claims.
const GRID = [
  [100, '100x'],
  [10, '10x'],
]

const DAYS = 60
// Radius stops falling below this multiple, so a subject that ends far under its baseline
// is held off the centre rather than collapsing onto it.
const FLOOR_CLAMP = 0.24

function hex2rgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

function ramp(stops, t) {
  const clamped = Math.max(0, Math.min(1, t))
  const x = clamped * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const a = hex2rgb(stops[i])
  const b = hex2rgb(stops[i + 1])
  const mix = (k) => Math.round(a[k] + (b[k] - a[k]) * f)
  return mix(0) + ', ' + mix(1) + ', ' + mix(2)
}

// Both ramps are stretched to the extremes the rows themselves reach, so neither end of
// the palette is a figure typed into the code.
export function floorScale(subjects) {
  const floors = subjects.map((s) => s.floor)
  return { deepest: -Math.min(...floors), highest: Math.max(...floors) }
}

export function floorColour(floor, alpha, scale) {
  const rgb =
    floor < 0
      ? ramp(WARM, -floor / scale.deepest)
      : ramp(COOL, Math.log10(1 + floor) / Math.log10(1 + scale.highest))
  return 'rgba(' + rgb + ', ' + alpha + ')'
}

// floor.json is the published record and supplies the floor, the peak and the baseline.
// results2.json supplies the daily views themselves, which floor.json does not carry: its
// series is keyed on days from the event and the peak sits pk_off days along, so the sixty
// days this mark draws are pk_off through pk_off plus sixty. Sorted by the floor, which is
// the order the whole mark is built on.
//
// Raw daily views rather than the normalised curve in dataset.json. That curve is a share
// of the lift over the near window and is clipped at one, so it reads as a fall to nothing
// where the page was still well above its clean baseline, and it flattens three subjects
// on the days they came back to their own peak. The ring is a level, so the radius has to
// be one too.
export function orbitSubjects(floors, probe) {
  const byArticle = new Map(probe.map((r) => [r.article, r]))
  return floors
    .map((r) => {
      const p = byArticle.get(r.article)
      if (!p) throw new Error('no results2.json row for ' + r.article)
      const levels = []
      for (let d = 0; d <= DAYS; d++) {
        const v = p.series[String(p.pk_off + d)]
        if (v === undefined) throw new Error('no day ' + d + ' for ' + r.article)
        levels.push(v)
      }
      return { article: r.article, peak: r.peak, base: r.clean_base, floor: r.floor, levels }
    })
    .sort((a, b) => a.floor - b.floor)
}

// Views on day d as a multiple of that page's own clean baseline, which is what the ring is.
export function ratioAt(subject, day) {
  return subject.levels[day] / subject.base
}

// Canvas text falls back to a serif unless the face is loaded before the first draw.
export function whenFontsReady(fn) {
  const faces = ['400 12px Archivo', '500 12px Archivo', '600 12px Archivo']
  Promise.all(faces.map((f) => document.fonts.load(f))).then(fn, fn)
}

// Stroke widths, as a function of the box rather than as constants buried in the draw, so
// the rule that none of them can fall under a pixel is a thing a test can run rather than
// a thing a test can grep. A device that will not draw under one pixel would otherwise
// silently flatten the two poles into the same stroke.
export function strokeWidths(S) {
  return {
    heavy: Math.max(1.4, 0.0055 * S),
    light: Math.max(1.05, 0.0041 * S),
    hairline: 1,
  }
}

export function drawOrbit(canvas, subjects, opts = {}) {
  const { labels = [], shortName = (a) => a, query = null } = opts
  const box = canvas.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)
  const ctx = canvas.getContext('2d', { preserveDrawingBuffer: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.width, box.height)
  // Alpha blending on a cream ground. Never the multiply operator, under which this many
  // overlapping strokes compound to black.
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineJoin = 'round'

  // A reader's own query is placed at its own floor rank rather than parked outside the
  // set, so it is read against the same sort as the rest.
  const drawn = query ? [...subjects, query].sort((a, b) => a.floor - b.floor) : subjects
  const scale = floorScale(subjects)

  const cx = box.width / 2
  const cy = box.height / 2
  const S = Math.min(cx, cy)
  const r0 = 0.382 * S
  const kr = 0.145 * S
  const R = (v) => r0 + kr * Math.log10(Math.max(v, FLOOR_CLAMP))
  const P = (r, th) => [cx + r * Math.cos(th), cy + r * Math.sin(th)]

  const slot = (2 * Math.PI) / drawn.length
  const drift = slot * 2.1
  const below = drawn.filter((s) => s.floor < 0).length
  // Rotate so the block that ends below the ring sits across the top.
  const a0 = -Math.PI / 2 - (below / 2) * slot

  ctx.fillStyle = RING_FILL
  ctx.beginPath()
  ctx.arc(cx, cy, R(1), 0, Math.PI * 2)
  ctx.fill()

  const capSize = Math.max(9, 0.031 * S)
  ctx.font = '400 ' + capSize + 'px Archivo, system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (const [v, label] of GRID) {
    ctx.strokeStyle = GRID_INK
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.arc(cx, cy, R(v), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    const ly = cy + R(v)
    const w = ctx.measureText(label).width + 10
    ctx.fillStyle = GROUND
    ctx.fillRect(cx - w / 2, ly - 8, w, 15)
    ctx.fillStyle = SOFT_INK
    ctx.fillText(label, cx, ly + 3)
  }

  ctx.strokeStyle = RING_INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, R(1), 0, Math.PI * 2)
  ctx.stroke()

  const { heavy, light, hairline } = strokeWidths(S)

  // Angle is the sort and never moves. Paint order does: the block that ends below the
  // ring is laid down last, so the finding sits on top of the rest instead of under it.
  const order = drawn
    .map((s, i) => i)
    .sort((i, j) => Number(drawn[i].floor < 0) - Number(drawn[j].floor < 0))

  order.forEach((i) => {
    const s = drawn[i]
    const th0 = a0 + i * slot
    const isBelow = s.floor < 0
    const isQuery = s === query
    const ink = (alpha) => (isQuery ? QUERY_INK : floorColour(s.floor, alpha, scale))

    // Stroke width never carries a value of its own. The block that ends below the ring is
    // drawn a little heavier as well as a little stronger in alpha, which repeats what the
    // warm ramp and the radius already say, and no width here is thin enough to be clamped
    // away on a device that will not draw under one pixel.
    ctx.strokeStyle = ink(isBelow ? 0.62 : 0.34)
    ctx.lineWidth = isQuery ? heavy * 1.3 : isBelow ? heavy : light
    ctx.beginPath()
    let started = false
    for (let d = 0; d <= DAYS; d++) {
      // A live query can come back short of sixty days. The gap is left open rather than
      // bridged, since a straight line across it would be a reading nobody took.
      if (s.levels[d] === null || s.levels[d] === undefined) {
        started = false
        continue
      }
      const p = P(R(ratioAt(s, d)), th0 + drift * Math.sqrt(d / DAYS))
      if (started) ctx.lineTo(p[0], p[1])
      else ctx.moveTo(p[0], p[1])
      started = true
    }
    ctx.stroke()

    // The tail from the last day read out to where the page stood a year later.
    let last = DAYS
    while (last > 0 && (s.levels[last] === null || s.levels[last] === undefined)) last--
    const a = P(R(ratioAt(s, last)), th0 + drift * Math.sqrt(last / DAYS))
    const q = P(R(1 + s.floor), th0 + drift * 1.55)
    ctx.strokeStyle = ink(isBelow ? 0.34 : 0.16)
    ctx.lineWidth = hairline
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.quadraticCurveTo(
      (a[0] + q[0]) / 2 + (cx - a[0]) * 0.1,
      (a[1] + q[1]) / 2 + (cy - a[1]) * 0.1,
      q[0],
      q[1]
    )
    ctx.stroke()

    const dot = (isBelow ? 0.0098 : 0.0078) * S
    ctx.fillStyle = ink(0.92)
    ctx.beginPath()
    ctx.arc(q[0], q[1], isQuery ? dot * 1.35 : dot, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = ink(isBelow ? 0.22 : 0.13)
    ctx.beginPath()
    ctx.arc(q[0], q[1], (isBelow ? 0.029 : 0.023) * S, 0, Math.PI * 2)
    ctx.fill()

    const h = P(R(ratioAt(s, 0)), th0)
    ctx.fillStyle = ink(isBelow ? 0.85 : 0.5)
    ctx.beginPath()
    ctx.arc(h[0], h[1], (1.1 + Math.log10(s.peak) * 0.4) * (S / 345), 0, Math.PI * 2)
    ctx.fill()
  })

  // The ring is named from inside it, where nothing is drawn. A line is only drawn if it
  // fits inside the ring: on a narrow canvas the ring is smaller than the sentence, and a
  // caption that runs out across the threads is worse than no caption. The key beside the
  // mark carries the same two facts in text either way.
  const room = 2 * R(1) - 14
  const fits = (text, weight, size) => {
    ctx.font = weight + ' ' + size + 'px Archivo, system-ui, sans-serif'
    return ctx.measureText(text).width <= room
  }
  ctx.textAlign = 'center'
  const NAME = 'BEFORE THE EVENT'
  const GLOSS = 'the ring is each page at its own normal reading'
  if (fits(NAME, '600', capSize)) {
    const both = fits(GLOSS, '400', capSize)
    ctx.font = '600 ' + capSize + 'px Archivo, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(29, 23, 38, 0.9)'
    ctx.fillText(NAME, cx, cy + (both ? capSize * 0.55 : capSize * 0.35))
    if (both) {
      ctx.font = '400 ' + capSize + 'px Archivo, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(111, 102, 120, 0.95)'
      ctx.fillText(GLOSS, cx, cy + capSize * 2)
    }
  }

  // Names, on a leader clamped to a radius that always fits inside the frame.
  // Held off the frame edge on both axes, so a name always has room to sit beside its
  // leader even when the box is much wider than it is tall.
  const out = Math.min(S - 16, Math.max(S * 0.55, cx - 96))
  const nameSize = Math.max(10, 0.0333 * S)
  ctx.font = '500 ' + nameSize + 'px Archivo, system-ui, sans-serif'
  ctx.lineWidth = 1
  for (const article of labels) {
    const i = drawn.findIndex((s) => s.article === article)
    if (i < 0) continue
    const s = drawn[i]
    const th = a0 + i * slot
    const p = P(Math.min(R(ratioAt(s, 0)) + 8, out - 22), th)
    const q = P(Math.min(R(ratioAt(s, 0)) + 26, out), th)
    const right = Math.cos(th) > -0.12
    ctx.strokeStyle = floorColour(s.floor, 0.5, scale)
    ctx.beginPath()
    ctx.moveTo(p[0], p[1])
    ctx.lineTo(q[0], q[1])
    ctx.stroke()
    ctx.textAlign = right ? 'left' : 'right'
    ctx.fillStyle = LABEL_INK
    ctx.fillText(shortName(article), q[0] + (right ? 4 : -4), q[1] + 4)
  }
}

// Mount a canvas that re-syncs from its own box. A window resize event misses the iOS URL
// bar collapse, which changes this element's height and fires nothing on the window.
export function mountOrbit(canvas, read) {
  const render = () => {
    const state = read()
    drawOrbit(canvas, state.subjects, state.opts)
  }
  new ResizeObserver(render).observe(canvas)
  whenFontsReady(render)
  return render
}
