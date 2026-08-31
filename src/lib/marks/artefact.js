/**
 * The plate for F5 — twenty pages, each drawn over the month before its record day.
 *
 * Small multiples, which is a form no other beat on this site and no shipped project uses.
 * Every other plate here draws one mark per page on a scale of pages; this one draws a
 * TIME axis inside each panel and asks the reader to compare shapes across the grid. Ten
 * scheduled events whose gate reading comes out under 1, then the ten cleanest ambushes.
 * The top block is a hill that had already risen a month before the record day; the bottom
 * block is a flat line and a cliff. That difference is the finding.
 *
 * ONE VERTICAL SCALE FOR ALL TWENTY, and it is also the key. Every panel's y is the same
 * share-of-its-own-record-day axis, painted once as a ramp strip down the left of the grid,
 * and a panel's ink is the ramp's colour at the height of that page's own level through the
 * window the census uses. So the colour of a panel and the height of its shaded band are the
 * same number, and there is no second legend to read.
 *
 * The two windows are washed into every panel: days -30 to -22, which this site uses
 * everywhere, and days -21 to -8, which the file offers and this site refuses. On the top
 * block both washes sit up inside the event.
 *
 * Drawn 1:1 and every type size is emitted here, never left to a stylesheet, for the reason
 * written at the head of held.js: a CSS breakpoint measures the viewport and a mark measures
 * its own box, and the two disagree by the page margins.
 */
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../ink.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const L = Math.log10

/** Break a name to lines that fit `budget` characters, longest word never split. */
function wrap(s, budget) {
  const out = []
  let line = ''
  for (const w of String(s).split(' ')) {
    if (!line) line = w
    else if ((line + ' ' + w).length <= budget) line += ' ' + w
    else { out.push(line); line = w }
  }
  if (line) out.push(line)
  return out
}

export function artefact(P, W) {
  const phone = W < 760
  const fs = W < 640 ? 13 : 14
  const cols = phone ? 2 : 5
  const rows = P.panels.length / cols            // 10 on a phone, 4 on a desktop

  // The axis gutter is measured from the widest label that will actually be set in it, in the
  // mono the ticks are set in. A gutter guessed from the type size put "0.001%" off the left
  // edge of the plate at every width.
  // Three ticks, at every width. Six of them over a 108px panel is a label every 18px, and
  // the axis they belong to is ONE PANEL tall, not the grid: see the axis block at the foot.
  const ticks = [1e-4, 1e-2, 1]
  const tickLab = (t) => P.scale.labels[P.scale.ticks.indexOf(t)]
  const AXW = Math.ceil(Math.max(...ticks.map((t) => tickLab(t).length)) * fs * 0.75) + 14
  const GUT = phone ? 12 : 16
  const grid = Math.max(120, W - AXW - 2)
  const cw = (grid - GUT * (cols - 1)) / cols    // one panel's width
  const ph = phone ? 84 : 108                    // one panel's plot height

  // 0.53 em per character is what the earlier plates use for this face and it is an
  // UNDER-estimate: "Chadwick Boseman" measured 131px at 14px against a 118px budget and ran
  // out of the last column at 820. Measured off the rendered boxes, this face runs about 0.585.
  const EM = 0.60
  const budget = Math.max(8, Math.floor(cw / (fs * EM)))
  const names = P.panels.map((p) => wrap(p.t, budget))
  const nameLines = Math.max(...names.map((n) => n.length))
  const lh = Math.round(fs * 1.22)
  const capH = nameLines * lh + lh + 6           // the name block plus one figure line
  const rowH = capH + ph + (phone ? 22 : 26)

  // The figure under each name is set in the mono, which is far wider than the proportional
  // face the name uses. Written as a sentence it overran every panel at every width. It keeps
  // its words only where the widest of the twenty actually fits the panel it sits in.
  const TAIL = ' of its record day'
  const widest = Math.max(...P.panels.map((p) => pct(p.nearShare).length))
  const withWords = (widest + TAIL.length) * fs * 0.75 <= cw
  const figure = (v) => pct(v) + (withWords ? TAIL : '')

  const lo = L(P.scale.lo), hi = L(P.scale.hi)
  const stops = P.stops.map(L)
  const tint = (v) => ink(L(v), stops)
  const days = P.meta.to - P.meta.from

  const T = (cls, tx, ty, fill, anchor, s, size) =>
    `<text class="${cls}" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="${size || fs}" ` +
    `fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${s}</text>`

  const W1_LEN = 25, W2_LEN = 26   // the two window names, measured before they are built

  // ---- the key: one strip of the day axis, with both windows named ---------
  // The room these two share is the span of the two bands, not the width of the plate: the
  // first is pinned to the start of the earlier band and the second to the end of the later
  // one. Measured against `grid` they read as fitting at 820, and they collided.
  const bandSpan = ((P.meta.near[1] + 1 - P.meta.far[0]) / (P.meta.to - P.meta.from)) * grid
  const keyStack = phone || (W1_LEN + W2_LEN + 3) * fs * EM > bandSpan
  const keyH = (keyStack ? fs + lh : fs * 2) + 26
  const keyY = fs + 6
  const kx0 = AXW, kw = grid
  const kxd = (d) => kx0 + ((d - P.meta.from) / days) * kw
  const key = [
    `<rect x="${kxd(P.meta.far[0]).toFixed(2)}" y="${keyY.toFixed(2)}" width="${(kxd(P.meta.far[1] + 1) - kxd(P.meta.far[0])).toFixed(2)}" height="10" fill="${ACCENT}" fill-opacity="0.26"/>`,
    `<rect x="${kxd(P.meta.near[0]).toFixed(2)}" y="${keyY.toFixed(2)}" width="${(kxd(P.meta.near[1] + 1) - kxd(P.meta.near[0])).toFixed(2)}" height="10" fill="${INK}" fill-opacity="0.12"/>`,
    `<line x1="${kx0.toFixed(2)}" y1="${(keyY + 10).toFixed(2)}" x2="${(kx0 + kw).toFixed(2)}" y2="${(keyY + 10).toFixed(2)}" stroke="${HAIR}" stroke-width="1"/>`,
    `<line x1="${kxd(0).toFixed(2)}" y1="${(keyY - 4).toFixed(2)}" x2="${kxd(0).toFixed(2)}" y2="${(keyY + 14).toFixed(2)}" stroke="${ACCENT}" stroke-width="1.7"/>`,
  ]
  // Day 0 sits at 81% of the strip, so on a narrow plate "record day" centred on it and
  // "day 7" pinned to the right wall are the same 40 pixels. The narrow plate drops day 7 and
  // hangs the record day off the left of its own rule.
  // Those two labels are set in the mono, which is half again as wide as the text face, and
  // side by side they collided at 820. Whether they fit is measured, not assumed.
  const W1 = 'the window this page uses', W2 = 'the window the file offers'
  // Stacked, the two lines carry the day numbers as well as the words, so each is offered long
  // and set short where the plate cannot hold it. 320px could not.
  const fit = (long, short) => (long.length * fs * EM <= kw ? long : short)
  key.push(phone
    ? T('m-tick', kx0, keyY - 5, MUTED, 'start', 'day −30')
    : T('m-tick', kx0, keyY - 5, MUTED, 'start', '30 days before'))
  if (keyStack) {
    key.push(phone
      ? T('m-note', kxd(0) - 5, keyY - 5, ACCENT, 'end', 'record day')
      : T('m-note', kxd(0), keyY - 5, ACCENT, 'middle', 'record day'))
    key.push(T('m-name', kx0, keyY + 10 + fs + 3, ACCENT, 'start',
      fit('days −30 to −22, the window used here', 'days −30 to −22, used')))
    key.push(T('m-name', kx0, keyY + 10 + fs + 3 + lh, MUTED, 'start',
      fit('days −21 to −8, the window not used', 'days −21 to −8, not used')))
  } else {
    key.push(T('m-note', kxd(0), keyY - 5, ACCENT, 'middle', 'record day'))
    key.push(T('m-tick', kx0 + kw, keyY - 5, MUTED, 'end', 'day 7'))
    key.push(T('m-name', kxd(P.meta.far[0]) + 2, keyY + 10 + fs + 3, ACCENT, 'start', W1))
    key.push(T('m-name', kxd(P.meta.near[1] + 1) - 2, keyY + 10 + fs + 3, MUTED, 'end', W2))
  }

  // ---- the blocks ----------------------------------------------------------
  const BLOCK = [
    { from: 0, label: 'The ten the file reads as never having lifted' },
    { from: 10, label: 'The ten quietest pages in the file, for comparison' },
  ]
  const blockBudget = Math.max(10, Math.floor(grid / (fs * EM)))
  const blockLines = BLOCK.map((b) => wrap(b.label, blockBudget))
  const blockLabelH = Math.max(...blockLines.map((l) => l.length)) * lh + Math.round(fs * 0.9)

  const marks = [], notes = [], rowTops = []
  let y = keyY + keyH

  BLOCK.forEach((blk, bi) => {
    const upto = bi + 1 < BLOCK.length ? BLOCK[bi + 1].from : P.panels.length
    blockLines[bi].forEach((line, j) => notes.push(T('m-name', AXW, y + fs + j * lh, INK, null, esc(line))))
    y += blockLabelH

    for (let i = blk.from; i < upto; i++) {
      const p = P.panels[i]
      const k = i - blk.from
      const px = AXW + (k % cols) * (cw + GUT)
      const py = y + Math.floor(k / cols) * rowH
      const top = py + capH
      const bot = top + ph
      if (k % cols === 0) rowTops.push(top)
      const X = (d) => px + ((d - P.meta.from) / days) * cw
      const Y = (v) => bot - ((L(v) - lo) / (hi - lo)) * ph
      const col = tint(p.nearShare)

      // 1 · the two windows, washed in
      marks.push(
        `<rect x="${X(P.meta.far[0]).toFixed(2)}" y="${top.toFixed(2)}" width="${(X(P.meta.far[1] + 1) - X(P.meta.far[0])).toFixed(2)}" height="${ph}" fill="${ACCENT}" fill-opacity="0.09"/>`,
        `<rect x="${X(P.meta.near[0]).toFixed(2)}" y="${top.toFixed(2)}" width="${(X(P.meta.near[1] + 1) - X(P.meta.near[0])).toFixed(2)}" height="${ph}" fill="${INK}" fill-opacity="0.055"/>`)

      // 2 · the trace, filled to the floor of the shared scale
      let d = `M${X(p.pts[0][0]).toFixed(2)} ${bot.toFixed(2)}`
      for (const [dd, v] of p.pts) d += `L${X(dd).toFixed(2)} ${Y(v).toFixed(2)}`
      d += `L${X(p.pts[p.pts.length - 1][0]).toFixed(2)} ${bot.toFixed(2)}Z`
      marks.push(`<path d="${d}" fill="${col}" fill-opacity="0.34"/>`)

      // 3 · the line itself, and the level the file reads this page at
      let s2 = ''
      p.pts.forEach(([dd, v], j) => { s2 += (j ? 'L' : 'M') + X(dd).toFixed(2) + ' ' + Y(v).toFixed(2) })
      marks.push(
        `<path d="${s2}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>`,
        `<line x1="${X(P.meta.near[0]).toFixed(2)}" y1="${Y(p.nearShare).toFixed(2)}" x2="${X(P.meta.near[1] + 1).toFixed(2)}" y2="${Y(p.nearShare).toFixed(2)}" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 2"/>`)

      // 4 · the two days the gate reads: the record day, and day seven
      marks.push(
        `<circle cx="${X(0).toFixed(2)}" cy="${Y(1).toFixed(2)}" r="${phone ? 2.4 : 3}" fill="${HEX[4]}"/>`,
        `<circle cx="${X(7).toFixed(2)}" cy="${Y(p.at7Share).toFixed(2)}" r="${phone ? 2.4 : 3}" fill="${col}" stroke="#fff" stroke-width="1"/>`)

      // the panel's own name and its one number
      names[i].forEach((line, j) => notes.push(T('m-name', px, py + fs + j * lh, INK, null, esc(line))))
      notes.push(T('m-fig', px, py + fs + nameLines * lh + 2, col, null, figure(p.nearShare)))
    }
    y += Math.ceil((upto - blk.from) / cols) * rowH
  })

  const H = Math.ceil(y + 8)

  // ---- the vertical axis, one per row of panels -----------------------------
  // Every panel carries the same scale, so the axis is one panel tall and is repeated beside
  // each row. Drawn once down the whole grid it read as though a panel's position on the page
  // meant something, and it does not: only its own line's height inside its own box does.
  const axis = []
  for (const rt of rowTops) {
    axis.push(`<rect x="${(AXW - 9).toFixed(2)}" y="${rt.toFixed(2)}" width="7" height="${ph}" fill="url(#ramp5)"/>`)
    for (const t of ticks) {
      const ty = rt + ph - ((L(t) - lo) / (hi - lo)) * ph
      axis.push(T('m-tick', AXW - 12, ty + fs * 0.34, MUTED, 'end', tickLab(t)))
    }
  }

  const rampStops = P.stops.map((s, i) =>
    `<stop offset="${(100 - ((L(s) - lo) / (hi - lo)) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`)
    .reverse().join('')

  const wc = P.panels[0]
  const svg =
    `<svg class="plate" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
    `aria-label="Twenty small charts. Each one is a single Wikipedia page over the month before its ` +
    `record day and the week after it, drawn as views that day divided by that page's record day, on ` +
    `one scale shared by all twenty. The top ten are scheduled events. Every one of them was already ` +
    `being read heavily through the whole month before: ${esc(wc.t)} sat at ${pct(wc.nearShare)} of its ` +
    `record day, so its record day is only ${(1 / wc.nearShare).toFixed(1)} times the level the file ` +
    `measures it against. The bottom ten are pages nobody was reading. Every one of them is a flat line ` +
    `along the floor of the scale and then a jump to the top of it. The shaded bands mark the two ` +
    `windows a level before the event can be taken from.">` +
    `<defs><linearGradient id="ramp5" x1="0" y1="0" x2="0" y2="1">${rampStops}</linearGradient></defs>` +
    `<g class="m-rows">${marks.join('')}</g>${notes.join('')}${key.join('')}${axis.join('')}</svg>`

  return { svg, height: H }
}

/** A share, written the way the axis writes it. */
function pct(v) {
  if (v >= 0.1) return (v * 100).toFixed(0) + '%'
  if (v >= 0.01) return (v * 100).toFixed(1) + '%'
  if (v >= 0.001) return (v * 100).toFixed(2) + '%'
  return (v * 100).toPrecision(2) + '%'
}
