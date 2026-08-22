// The rank ladder. Three axes, one thread per subject, and a thread's height on each axis
// is that subject's position in the order that axis sorts by.
//
// A rank is what the second correlation on this beat reads, so the mark draws ranks rather
// than values. Two axes that sort alike carry near level threads; two that do not carry a
// scribble. The middle axis is the floor, which is also what the colour is, so the middle
// of the mark grades from one pole to the other and the two halves are read against it.

import { floorColour, floorScale } from './orbit.js'

// Just enough side padding to keep an end node from being clipped in half, so the three
// axes sit where the labels around the canvas say they do.
const PAD = { top: 14, bottom: 14, left: 4, right: 4 }
const NODE = 2.2
// The same rule the ring is held to: neither width can fall under a pixel, and the block
// that ends below the ring is the heavier of the two.
export const LADDER_WIDTHS = { below: 1.9, above: 1.4 }

// Ordinal position on an axis, lowest value first. Ties take adjacent slots in a stable
// order, which the average ranks the stated correlations use would not give a place to.
function positions(subjects, key) {
  const order = subjects
    .map((s, i) => ({ i, v: key(s), a: s.article }))
    .sort((p, q) => p.v - q.v || p.a.localeCompare(q.a))
  const out = new Array(subjects.length)
  order.forEach((p, slot) => {
    out[p.i] = slot
  })
  return out
}

export function ladderAxes(subjects) {
  return {
    // Steepest fall at the top, so a thread that runs level to the middle axis is a
    // subject whose fall and whose floor sit at the same end of their orders.
    fall: positions(subjects, (s) => -s.exponent),
    floor: positions(subjects, (s) => s.floor),
    spike: positions(subjects, (s) => -s.peak),
  }
}

export function drawLadder(canvas, subjects) {
  const box = canvas.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)
  const ctx = canvas.getContext('2d', { preserveDrawingBuffer: true })
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, box.width, box.height)
  // Alpha blending on a cream ground, never the multiply operator.
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'round'

  const axes = ladderAxes(subjects)
  const scale = floorScale(subjects)
  const n = subjects.length
  const w = box.width - PAD.left - PAD.right
  const h = box.height - PAD.top - PAD.bottom
  const x = [PAD.left, PAD.left + w / 2, PAD.left + w]
  const y = (slot) => PAD.top + (slot / (n - 1)) * h

  // The three axes themselves, drawn faint and behind everything.
  ctx.strokeStyle = 'rgba(29, 23, 38, 0.16)'
  ctx.lineWidth = 1
  for (const px of x) {
    ctx.beginPath()
    ctx.moveTo(Math.round(px) + 0.5, PAD.top - 6)
    ctx.lineTo(Math.round(px) + 0.5, PAD.top + h + 6)
    ctx.stroke()
  }

  // Threads that end below the ring are drawn a little heavier as well as a little
  // stronger in alpha, repeating what the warm ramp already says. Neither width is thin
  // enough to be clamped away on a device that will not draw under one pixel.
  // floor.json is itself sorted by the floor, so drawing in file order would put the whole
  // cool half on top of the whole warm one and the layering would read as a gradient the
  // mark does not claim. Painted above the rule first and below it last, which is the
  // emphasis the palette already carries.
  const order = subjects
    .map((s, i) => i)
    .sort((i, j) => Number(subjects[i].floor < 0) - Number(subjects[j].floor < 0))

  order.forEach((i) => {
    const s = subjects[i]
    const below = s.floor < 0
    const pts = [
      [x[0], y(axes.fall[i])],
      [x[1], y(axes.floor[i])],
      [x[2], y(axes.spike[i])],
    ]
    ctx.strokeStyle = floorColour(s.floor, below ? 0.8 : 0.45, scale)
    ctx.lineWidth = below ? LADDER_WIDTHS.below : LADDER_WIDTHS.above
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1]
      const [x1, y1] = pts[k]
      const bend = (x1 - x0) * 0.42
      ctx.bezierCurveTo(x0 + bend, y0, x1 - bend, y1, x1, y1)
    }
    ctx.stroke()

    ctx.fillStyle = floorColour(s.floor, below ? 0.95 : 0.65, scale)
    for (const [px, py] of pts) {
      ctx.beginPath()
      ctx.arc(px, py, below ? NODE + 0.6 : NODE, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

export function mountLadder(canvas, subjects) {
  const render = () => drawLadder(canvas, subjects)
  // The canvas's own box, never a window resize event.
  new ResizeObserver(render).observe(canvas)
  return render
}
