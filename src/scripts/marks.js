// Redraws every mark at the width its box actually has.
//
// The server writes each sheet at a default width so a reader with no script still
// gets a whole one. Here the same pure draw functions run again with the real width
// and with the browser's own text metrics, which is what makes the sheets reflow
// instead of scale: a row on a phone is a different row, not a smaller one.
import cast from '../../data/census/cast.json'
import { heroSvg } from '../lib/marks/hero.js'
import { fameSvg } from '../lib/marks/fame.js'
import { backSvg } from '../lib/marks/back.js'
import { lagSvg } from '../lib/marks/lag.js'

const DRAW = { hero: heroSvg, fame: fameSvg, back: backSvg, lag: lagSvg }

// A declared font is not a loaded font, and a wrap measured against the fallback is a
// wrap in the wrong typeface. Canvas letterSpacing is what the tracked headings need;
// where it is missing the tracking is added back by hand.
const ctx = document.createElement('canvas').getContext('2d')
const HAS_TRACKING = 'letterSpacing' in ctx
const measure = (s, size, weight = 400, tracking = 0) => {
  ctx.font = (weight >= 600 ? '600 ' : '400 ') + size + 'px Archivo, system-ui, sans-serif'
  if (HAS_TRACKING) ctx.letterSpacing = tracking + 'px'
  const w = ctx.measureText(String(s)).width
  return HAS_TRACKING ? w : w + tracking * Math.max(0, String(s).length - 1)
}
const env = { measure }

const boxes = [...document.querySelectorAll('[data-draw]')]
const groups = new Map()
for (const el of boxes) {
  const name = el.dataset.draw
  if (!groups.has(name)) groups.set(name, [])
  groups.get(name).push(el)
}

const paint = (name, els, force) => {
  const w = Math.round(els[0].clientWidth)
  if (!w || (!force && els[0].dataset.at === String(w))) return
  const parts = [].concat(DRAW[name](cast, w, env))
  els.forEach((el, i) => {
    if (!parts[i]) return
    el.innerHTML = parts[i].svg
    el.dataset.at = String(w)
  })
}

const repaint = (force) => { for (const [name, els] of groups) paint(name, els, force) }

// Fonts first: a redraw before Archivo lands measures the fallback, so the pass after
// it loads is forced through even though the width has not changed.
repaint(false)
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => repaint(true))

let frame = 0
const observer = new ResizeObserver(() => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => repaint(false))
})
for (const [, els] of groups) observer.observe(els[0])
