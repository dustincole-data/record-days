/**
 * Where each page's traffic settled 300 to 340 days after its record day.
 *
 * One log scale of "times its own normal level", a line at 1x, and one square per page
 * stacked into bins. Squares left of the line are pages getting less traffic than before
 * their record day; squares right of it are pages getting more. The two counts are printed
 * either side of the line, which is the whole finding.
 *
 * Ink: violet for less, rose for more — the second and third stops of the site's ramp.
 * Renamed pages are drawn hollow: Wikipedia keeps counting the old title, which after a
 * move receives almost nothing, so they read as abandoned when what changed was the name.
 */
import { INK, MUTED, HAIR } from '../ink.js'
import { esc, T, logScale, nameW } from './util.js'

export const LESS = '#5B2A93'
export const MORE = '#B31E63'

export function settled(S, W) {
  const phone = W < 640
  const fs = phone ? 13 : 14
  const M = { l: 0, r: phone ? 4 : 10, t: 0 }
  const x = logScale(S.scale.lo, S.scale.hi, M.l, W - M.r)
  // The two count labels hang off the 1x line where there is room, slide inside the plate
  // where there is not, and stack when even that would make them meet.
  const px = x(1)
  const lessT = 'less traffic than before', moreT = 'more traffic than before'
  const lessW = nameW(fs, lessT), moreW = nameW(fs, moreT)
  const lx = Math.max(M.l, px - 12 - lessW)
  const rx = Math.min(W - M.r - moreW, px + 12)
  const stacked = lx + lessW + 12 > rx
  const drop = stacked ? 2 * (fs + 5) : 0
  M.t = 30 + (fs + 5) * 2 + drop + 18
  const decades = Math.log10(S.scale.hi / S.scale.lo)
  // Finer bins on a phone, not coarser: coarse bins stack forty squares high and the plate
  // grows taller than the screen. Eight per decade keeps the tallest stack under 250px.
  const perDecade = phone ? 8 : 9
  const nb = Math.round(decades * perDecade)
  const plotW = W - M.r - M.l
  const binW = plotW / nb
  const side = Math.max(4, Math.min(12, binW - 1.5))
  const rise = side + 1.2
  const binOf = (v) => Math.min(nb - 1, Math.max(0, Math.floor(((Math.log10(v) - Math.log10(S.scale.lo)) / decades) * nb)))
  const moves = new Set(S.moves.map((m) => m.a))

  // stack, lowest ratio first inside a bin so the order is stable across widths
  const sorted = S.rows.slice().sort((a, b) => a.x - b.x)
  const count = new Array(nb).fill(0)
  const placed = []
  for (const r of sorted) {
    const b = binOf(r.x)
    placed.push({ r, b, k: count[b] })
    count[b]++
  }
  const maxStack = Math.max(...count)
  const base = M.t + maxStack * rise + 6
  const H = Math.ceil(base + 12 + fs + 8)

  const squares = []
  const geo = []
  placed.forEach(({ r, b, k }, i) => {
    const cx = M.l + b * binW + binW / 2
    const cy = base - k * rise - side / 2
    const more = r.x >= 1
    const hollow = moves.has(r.a)
    squares.push(`<rect x="${(cx - side / 2).toFixed(2)}" y="${(cy - side / 2).toFixed(2)}" width="${side.toFixed(2)}" height="${side.toFixed(2)}" rx="1.5" ` +
      (hollow ? `fill="#fff" stroke="${more ? MORE : LESS}" stroke-width="1.5"` : `fill="${more ? MORE : LESS}"`) +
      ` data-i="${i}"/>`)
    geo.push({ i, cx, cy, side, t: r.t, x: r.x, more, hollow })
  })

  // ---- the line at 1x, and the two counts -----------------------------------------
  const notes = []
  const lessN = S.rows.filter((r) => r.x < 1).length
  const moreN = S.rows.filter((r) => r.x >= 1).length
  const labBottom = 30 + fs + 5 + fs
  notes.push(`<line x1="${px.toFixed(2)}" y1="${(labBottom + drop + 8).toFixed(2)}" x2="${px.toFixed(2)}" y2="${(base + 6).toFixed(2)}" stroke="${INK}" stroke-width="1.2"/>`)
  notes.push(T('m-count', lx, 30 + fs, fs, LESS, `${lessN} pages`))
  notes.push(T('m-name', lx, labBottom, fs, INK, lessT))
  notes.push(T('m-count', rx, 30 + fs + drop, fs, MORE, `${moreN} pages`))
  notes.push(T('m-name', rx, labBottom + drop, fs, INK, moreT))

  // ---- the scale ---------------------------------------------------------------------
  const label = new Map(S.scale.ticks.map((t, i) => [t, S.scale.labels[i].replace('x', '×')]))
  const ticks = phone ? S.scale.narrow : S.scale.ticks
  const axis = [`<line x1="${M.l}" y1="${(base + 6).toFixed(2)}" x2="${(W - M.r).toFixed(2)}" y2="${(base + 6).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`]
  for (const t of ticks) {
    const tx = x(t)
    axis.push(`<line x1="${tx.toFixed(2)}" y1="${(base + 6).toFixed(2)}" x2="${tx.toFixed(2)}" y2="${(base + 11).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    axis.push(T('m-tick', tx, base + 12 + fs, fs, MUTED, label.get(t), t === ticks[0] ? 'start' : t === ticks[ticks.length - 1] ? 'end' : 'middle'))
  }

  // ---- two named extremes ----------------------------------------------------------
  // Each block is placed above the tallest stack under its own width, never on the squares,
  // with a leader down its own column to the square it names. The two extremes are singletons
  // at the walls, so the leader crosses nothing. Where the two blocks would meet, the second
  // is lifted a block above the first.
  const hiR = S.risen[0], loR = S.fallen[0]
  const hiG = geo.find((g) => g.t === hiR.t), loG = geo.find((g) => g.t === loR.t)
  const placed2 = []
  const spanTop = (x0, x1) => {
    let top = Infinity
    for (const q of geo) if (q.cx + side / 2 > x0 - 6 && q.cx - side / 2 < x1 + 6) top = Math.min(top, q.cy - side / 2)
    return top
  }
  const bandBottom = labBottom + drop + 12
  const block = (g, name, figTxt, hue, anchor) => {
    let tw = Math.max(nameW(fs, name), fs * 0.75 * figTxt.length)
    let x0 = anchor === 'end' ? g.cx + side / 2 - tw : g.cx - side / 2
    let top = spanTop(x0, x0 + tw)
    // A block whose width reaches the tall stacks would have to climb into the count band at
    // the top of the plate. It becomes the figure alone, which is short and stays low.
    if (top - 2 * fs - 17 <= bandBottom) {
      figTxt = figTxt.replace(/ its normal level$/, '')
      name = ''
      tw = fs * 0.75 * figTxt.length
      x0 = anchor === 'end' ? g.cx + side / 2 - tw : g.cx - side / 2
      top = spanTop(x0, x0 + tw)
    }
    const x1 = x0 + tw
    let figY = top - 12
    for (const b of placed2) {
      const meets = b.x0 < x1 + 12 && b.x1 > x0 - 12 && Math.abs(b.figY - figY) < 2 * (fs + 5) + 4
      if (meets) figY = b.nameY - fs - 12
    }
    const nameY = name ? figY - fs - 5 : figY
    placed2.push({ x0, x1, figY, nameY })
    const ax = anchor === 'end' ? g.cx + side / 2 : g.cx - side / 2
    if (figY + 4 < g.cy - side / 2 - 2) notes.push(`<line x1="${g.cx.toFixed(2)}" y1="${(g.cy - side / 2 - 2).toFixed(2)}" x2="${g.cx.toFixed(2)}" y2="${(figY + 4).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`)
    if (name) notes.push(T('m-name', ax, nameY, fs, INK, esc(name), anchor))
    notes.push(T('m-fig', ax, figY, fs, hue, figTxt, anchor))
  }
  if (loG) block(loG, loR.t, `${loR.text.replace(' times', '×')} its normal level`, LESS, 'start')
  if (hiG) block(hiG, hiR.t, `${hiR.text.replace(' times', '×')} its normal level`, MORE, 'end')

  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Dot histogram on a log scale. ${S.stat.n} English Wikipedia pages, one square each, placed by their daily traffic 300 to 340 days after their record day as a multiple of their normal level before it. ${moreN} pages sit above 1 times, ${lessN} below.">` +
    `<defs><clipPath id="sclip"><rect class="m-wipe" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>` +
    axis.join('') +
    `<g class="m-rows" clip-path="url(#sclip)">${squares.join('')}</g>` +
    notes.join('') + `</svg>`

  return { svg, height: H, rows: geo, geo: { W } }
}
