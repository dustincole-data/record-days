/**
 * The projects-wall tile for dustincoledata.com.
 *
 *   node scripts/tile.mjs        -> public/tile/record-days.webp
 *
 * The wall serves this at about 418px, a 2.87x reduction, so it is composed at 1200x900
 * rather than captured off the page: a screenshot of beat 01 arrives with its deck, its
 * caption and its method block set at four pixels, and the wedge shares the frame with
 * three paragraphs it cannot outrank.
 *
 * THE MARK IS THE SITE'S OWN BEAT 01 — the same `plate.json`, the same ramp out of `ink.js`,
 * the same rules `scripts/marks.mjs` draws the social card by: one tapered bar per page,
 * sorted shortest to longest, a bar's ink is its own duration, the pages that never came
 * back held in a band that dissolves off the right edge, the median cased in the ground, and
 * the ramp under it as the key. Nothing here invents a number or a colour.
 *
 * ONE MARK AND A PLAIN TITLE. The card on `/projects` already prints "Record Days" and a
 * full sentence under the image, so anything the tile spells out a second time costs mark
 * and buys nothing. What it keeps is the house set: title, the mark, three figures with
 * one-or-two-word labels, one source line, the dc. signature. The title says what the data
 * is rather than what the page argues — the social card carries the finding, this does not.
 *
 * Fonts are BASE64-EMBEDDED and then checked for real. A page built with `setContent` has no
 * origin, so `/fonts/...` resolves to nothing and the browser silently falls back; a tile
 * shot in Arial is a tile nothing downstream would ever flag.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HEX, ACCENT, INK, MUTED, HAIR, ink } from '../src/lib/ink.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = 'public/tile/record-days.webp'
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/gen/plate.json'), 'utf8'))

const W = 1200, H = 900
const PAD = { l: 56, r: 56, t: 40, b: 30 }
const FACES = ['Schibsted Grotesk', 'Martian Mono']
// 16px here is 5.6px on the 418px card. Nothing a reader is meant to read may print under it.
const FLOOR = 16

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------------------------------------------------------------- the numbers
// Read off the payload, never typed. The card's own sentence is the same three.
const never = P.stat.holdout + P.stat.running
const under = P.rows.filter((r) => r.kind === 'back' && r.dur <= P.stat.median).length
if (under * 2 < P.stat.back) throw new Error(`the median is not the median: ${under} of ${P.stat.back}`)
if (P.rows.length !== P.stat.drawn) throw new Error(`${P.rows.length} rows for ${P.stat.drawn} drawn`)

// ---------------------------------------------------------------- the mark
// Beat 01, drawn 1:1 into its own stated box. The guard below refuses any layout that
// renders the box smaller than this, which is the only way `meet` could shrink the mark and
// leave dead ground either side of it.
const FW = 1088, FH = 680
const TOP = 26                 // the first row; nothing is moved to make room for type
const AXIS_Y = 626             // the day rule the bars are measured against
const BAND = 22                // the break before the pages that never came back
// The title hangs in the white corner the sorted curve leaves above itself — the page's own
// rule, and the same corner the social card uses. It is measured against the bars rather
// than placed by eye: NOTE_Y sits under the title block, in white either way.
const TITLE_H = 118
const NOTE_Y = 178
const XMAX = P.axis.max
const x = (d) => (d / XMAX) * (FW - 62)   // 62px of run-off for the band to dissolve into
const rowH = (AXIS_Y - TOP - BAND) / P.rows.length
const stops = P.stops

let y = TOP
const laid = []
let bandTop = null, lastBack = null
for (const r of P.rows) {
  if (r.kind !== 'back' && bandTop === null) { bandTop = y; y += BAND }
  laid.push({ r, top: y })
  if (r.kind === 'back') lastBack = y + rowH
  y += rowH
}

const floor = 1.6                          // the narrowest a bar may be drawn
const onEnd = x(P.stat.max) + 56           // where the never-returned band dissolves to
const bars = laid.map(({ r, top }) => {
  const back = r.kind === 'back'
  const x0 = 0
  const x1 = back ? Math.max(x0 + floor, x(r.dur)) : onEnd
  const h0 = back ? rowH : rowH - 0.5
  const h1 = back ? Math.max(0.8, rowH * 0.62) : h0
  const d = `M${x0.toFixed(2)} ${top.toFixed(2)}`
    + `L${x1.toFixed(2)} ${(top + (rowH - h1) / 2).toFixed(2)}`
    + `L${x1.toFixed(2)} ${(top + (rowH + h1) / 2).toFixed(2)}`
    + `L${x0.toFixed(2)} ${(top + h0).toFixed(2)}Z`
  return `<path d="${d}" fill="${back ? ink(r.dur, stops) : 'url(#onward)'}"/>`
}).join('')

// The page paints its day axis IN the ramp, so the axis is the key and there is no second
// one to read. At 418px that bar lands directly under the block of pages that never came
// back, which is itself a full-width slab of the ramp's last colour, and the two read as the
// same object twice. A thumbnail does not need a key at all — the wedge is the mark and the
// figures underneath say what it counts — so what is left here is the rule the bars are
// measured against, in the ground's own ink.
const ax1 = x(P.stat.max)
const TICKS = [0, 30, 90, 180, 340]
const axis = [`<line x1="0" y1="${AXIS_Y}" x2="${ax1.toFixed(2)}" y2="${AXIS_Y}" stroke="rgba(22,24,29,.30)" stroke-width="1.5"/>`]
TICKS.forEach((t, i) => {
  const tx = x(t)
  axis.push(`<line x1="${tx.toFixed(2)}" y1="${AXIS_Y}" x2="${tx.toFixed(2)}" y2="${AXIS_Y + 8}" stroke="rgba(22,24,29,.30)" stroke-width="1.5"/>`)
  axis.push(`<text class="tick" x="${tx.toFixed(2)}" y="${AXIS_Y + 33}" fill="${MUTED}"`
    + ` text-anchor="${i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle'}">${t}</text>`)
})

// The median, cased in the ground so it reads over ink and over white. Its label sits below
// the title block rather than above the first row: with the type in the corner, the top of
// the rule is the one place on this plate where the two would print over each other.
const mx = x(P.stat.median)
const med = [
  `<line x1="${mx.toFixed(2)}" y1="${TOP - 10}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="#fff" stroke-width="7"/>`,
  `<line x1="${mx.toFixed(2)}" y1="${TOP - 10}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="${ACCENT}" stroke-width="3"/>`,
  `<text class="note" x="${(mx + 12).toFixed(2)}" y="${NOTE_Y}" fill="${ACCENT}">middle value ${P.stat.median} days</text>`,
]

// How far right the ink reaches inside the band the title hangs in — the bars in those rows
// plus the median rule, which runs the whole height. The title has to clear it, and the
// clearance is measured rather than eyeballed: the curve moves when the data does.
const INK_X = Math.max(
  mx + 2,
  ...laid.filter(({ top }) => top < TITLE_H + 26)
    .map(({ r }) => (r.kind === 'back' ? Math.max(floor, x(r.dur)) : onEnd)),
)

const FIELD_ALT = `${P.stat.drawn} bars, one per Wikipedia page, sorted shortest to longest. `
  + `Each runs from that page's record day to the day its traffic fell back to normal. `
  + `Half of the ${P.stat.back} that came back are at or under ${P.stat.median} days; the `
  + `${never} that never came back run off the axis and fade out.`

const field = `<svg class="field" viewBox="0 0 ${FW} ${FH}" preserveAspectRatio="xMidYMid meet"
  role="img" aria-label="${esc(FIELD_ALT)}">
  <defs>
    <linearGradient id="onward" gradientUnits="userSpaceOnUse" x1="0" x2="${onEnd.toFixed(2)}">
      <stop offset="0%" stop-color="${HEX[4]}"/>
      <stop offset="${((ax1 / onEnd) * 100).toFixed(1)}%" stop-color="${HEX[4]}"/>
      <stop offset="100%" stop-color="${HEX[4]}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g id="fieldContent">${bars}</g>
  ${med.join('')}${axis.join('')}
</svg>`

// ---------------------------------------------------------------- the words
// Two lines, broken where it balances. The title says what the data IS; the finding is the
// social card's job, and the wall's card prints its own sentence under this image.
const TITLE = ['How long Wikipedia traffic stayed', "high after each page's biggest day"]
const CELLS = [
  [String(P.stat.all), 'pages'],
  [`${P.stat.median} days`, 'middle value'],
  [String(never), 'never came back'],
]
const SRC = `days since the record day &middot; ${P.stat.drawn} of ${P.stat.all} English `
  + `Wikipedia pages drawn, each on its own biggest traffic day &middot; Wikimedia daily pageviews`

// The house signature: the three letterforms out of src/components/DcdMark.astro, never
// redrawn. Only the colour localises, and on a white ground that is its own light palette.
const GLYPH = `<svg viewBox="3.8 17.1 56.5 29.8" aria-hidden="true" focusable="false">
      <g transform="translate(2.943 46.426) scale(0.040753 -0.040753)">
        <path fill="currentColor" d="M22 269Q22 388 88.5 468.0Q155 548 262 548Q345 548 408 488V718H579V0H422V61Q354 -10 262 -10Q155 -10 88.5 70.5Q22 151 22 269ZM200 269Q200 209 230.5 176.5Q261 144 303 144Q346 144 376.0 177.0Q406 210 406 270Q406 331 376.0 362.5Q346 394 303.0 394.0Q260 394 230.0 362.0Q200 330 200 269Z"/>
        <path fill="currentColor" transform="translate(605 0)" d="M293 -10Q173 -10 97.5 68.0Q22 146 22 269Q22 389 99.5 468.5Q177 548 293 548Q404 548 479.5 479.0Q555 410 566 298H384Q382 342 357.5 368.0Q333 394 294 394Q249 394 224.0 361.0Q199 328 199 269Q199 208 223.5 175.5Q248 143 294 143Q334 143 357.5 168.5Q381 194 384 240H566Q555 125 481.5 57.5Q408 -10 293 -10Z"/>
        <path fill="#3B5BDB" transform="translate(1163 0)" d="M241 104Q241 56 211.0 25.5Q181 -5 133.0 -5.0Q85 -5 54.5 25.5Q24 56 24 104Q24 153 54.5 183.5Q85 214 133.0 214.0Q181 214 211.0 183.5Q241 153 241 104Z"/>
      </g>
    </svg>`

const face = (family, file) =>
  `@font-face { font-family: '${family}'; font-weight: 100 900; font-style: normal;\n`
  + `  src: url('data:font/woff2;base64,`
  + fs.readFileSync(path.join(ROOT, 'public/fonts', file)).toString('base64')
  + `') format('woff2-variations'); }`

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  ${face('Schibsted Grotesk', 'schibsted-grotesk-var-latin.woff2')}
  ${face('Martian Mono', 'martian-mono-var-latin.woff2')}
  * { box-sizing: border-box; margin: 0; }
  html, body { background: #fff; }
  :root {
    --ink: ${INK}; --muted: ${MUTED}; --hair: ${HAIR}; --accent: ${ACCENT};
    --text: 'Schibsted Grotesk', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    --mono: 'Martian Mono', ui-monospace, Consolas, monospace;
  }
  #tile { position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
          background: #fff; color: var(--ink); font-family: var(--text);
          display: flex; flex-direction: column;
          padding: ${PAD.t}px ${PAD.r}px ${PAD.b}px ${PAD.l}px; }

  /* Stated, not flexed. The bars are placed at a size before the page exists, so the box
     they land in has to be that size or xMidYMid meet scales the whole mark down and leaves
     dead ground either side of it. The title is laid over that same box, in the corner the
     curve leaves, so the field is never cut to make room for it. */
  .stage { position: relative; flex: none; width: ${FW}px; height: ${FH}px; }
  .field { position: absolute; inset: 0; width: ${FW}px; height: ${FH}px; display: block; }
  h1 { position: absolute; top: 0; right: 0; margin: 0; text-align: right;
       font-family: var(--text); font-weight: 500; font-size: 54px; line-height: 1.09;
       letter-spacing: -.022em; }
  .glyph { height: 26px; width: 49px; flex: none; display: block; color: var(--ink); }
  .tick { font-family: var(--mono); font-size: 19px; font-weight: 400; }
  .note { font-family: var(--mono); font-size: 19px; font-weight: 500; }

  .strip { display: flex; gap: 58px; align-items: baseline; flex: none;
           margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--hair); }
  .cell { display: flex; align-items: baseline; gap: 13px; white-space: nowrap; }
  .cv { font-family: var(--mono); font-weight: 600; font-size: 50px; line-height: .9;
        letter-spacing: -.03em; }
  .cl { font-size: 19px; color: var(--muted); }

  .ft { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px;
        flex: none; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--hair); }
  .src { font-size: 15px; line-height: 1.45; color: var(--muted); max-width: 76ch; }
  .mark { display: inline-flex; align-items: center; gap: 11px; line-height: 1;
          flex: none; white-space: nowrap; }
  .mark .rule { width: 1px; height: 17px; background: var(--hair); }
  .mark .who { font-weight: 600; font-size: 16px; letter-spacing: -.01em; }
  .mark .suffix { font-family: var(--mono); font-weight: 500; font-size: 11px;
                  letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
</style></head><body><div id="tile">
  <div class="stage">${field}<h1>${TITLE.map(esc).join('<br>')}</h1></div>
  <div class="strip">${CELLS.map(([v, l]) =>
    `<div class="cell"><span class="cv">${esc(v)}</span><span class="cl">${esc(l)}</span></div>`).join('')}</div>
  <div class="ft"><p class="src">${SRC}</p>
    <span class="mark"><span class="glyph">${GLYPH}</span><span class="rule"></span>` +
    `<span class="who">Dustin Cole</span><span class="suffix">Data</span></span>
  </div>
</div></body></html>`

// ---------------------------------------------------------------- shoot it
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.setContent(html, { waitUntil: 'load' })
await p.evaluate(() => document.fonts.ready)

// A declared font is not a loaded font, and `document.fonts.check()` cannot tell you the
// difference — it answers "can you render this spec?", which a fallback satisfies. Inspect
// the FontFace objects the page actually created.
const faces = await p.evaluate(async (want) => {
  for (const f of want) {
    for (const spec of [`400 16px "${f}"`, `600 16px "${f}"`]) {
      try { await document.fonts.load(spec) } catch { /* ignore */ }
    }
  }
  return want.map((f) => [f, [...document.fonts]
    .filter((ff) => ff.family.replace(/["']/g, '') === f)
    .some((ff) => ff.status === 'loaded')])
}, FACES)

const bad = await p.evaluate(({ min, fw, fh, n, titleH, inkX }) => {
  const out = []
  const t = document.getElementById('tile')

  // The frame has `overflow:hidden`, so content that does not fit is not an error — it is
  // silently guillotined, and what goes first is the foot: the source line and the mark.
  if (t.scrollHeight > t.clientHeight) out.push(`frame overflows ${t.scrollHeight - t.clientHeight}px tall`)
  if (t.scrollWidth > t.clientWidth) out.push(`frame overflows ${t.scrollWidth - t.clientWidth}px wide`)

  // Not overflowing the frame is not the same as being laid out: a row can overflow INSIDE a
  // fixed-height box and print across its neighbour while the document never grows.
  for (const sel of ['.stage', '.strip', '.ft', '.cell', '.mark']) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect()
      const over = Math.max(pr.top - r.top, r.bottom - pr.bottom, pr.left - r.left, r.right - pr.right)
      if (over > 0.5) out.push(`${sel} spills its parent by ${Math.round(over)}px`)
    }
  }

  const svg = document.querySelector('svg.field')
  const box = svg.getBoundingClientRect()

  // Every page has to be drawn, and drawn inside the box that was stated for them. An SVG
  // does not complain about a child outside its own viewBox, it just cuts it.
  const marks = document.getElementById('fieldContent')
  const drawn = marks.querySelectorAll('path').length
  if (drawn !== n) out.push(`${drawn} bars drawn, expected ${n}`)
  const bb = marks.getBBox()
  if (bb.x < -0.5 || bb.y < -0.5 || bb.x + bb.width > fw + 0.5 || bb.y + bb.height > fh + 0.5) {
    out.push(`the field draws outside its own viewBox: ${JSON.stringify(bb)}`)
  }
  if (box.height < fh - 0.5) out.push(`the field box is ${Math.round(box.height)}px for a ${fh}px drawing`)

  // Nothing inside the SVG may run out of it either — the median's label sits above the
  // first row with no box to stop it.
  for (const el of svg.querySelectorAll('text')) {
    const r = el.getBBox()
    if (r.x < -0.5 || r.y < -0.5 || r.x + r.width > fw + 0.5 || r.y + r.height > fh + 0.5) {
      out.push(`"${el.textContent}" runs out of the field`)
    }
  }

  // The drawing must be the biggest thing in the frame.
  const fr = t.getBoundingClientRect()
  const share = (box.width * box.height) / (fr.width * fr.height)
  if (share < 0.4) out.push(`the drawing is only ${Math.round(share * 100)}% of the frame`)

  // The title hangs over the drawing, so it has to clear the ink rather than sit on it, and
  // it has to stay inside the band that was measured for it.
  const h1 = document.querySelector('h1').getBoundingClientRect()
  const left = h1.left - box.left, bottom = h1.bottom - box.top
  if (bottom > titleH + 0.5) out.push(`the title is ${Math.round(bottom)}px deep, measured at ${titleH}px`)
  if (left - inkX < 24) out.push(`the title clears the ink by ${Math.round(left - inkX)}px, wanted 24`)

  // ...and nothing in the plate may print over it.
  const hb = { l: left, r: h1.right - box.left, t: h1.top - box.top, b: bottom }
  for (const el of svg.querySelectorAll('text')) {
    const r = el.getBBox()
    if (r.x < hb.r && r.x + r.width > hb.l && r.y < hb.b && r.y + r.height > hb.t) {
      out.push(`"${el.textContent}" prints over the title`)
    }
  }

  // Nothing may print under the size the wall can carry. `.src` is back matter meant to be
  // read on the poster itself and `.mark` is the house signature, whose proportions are
  // fixed by DcdMark.astro; resizing either to satisfy a floor chosen here would be
  // redrawing it.
  const small = []
  for (const el of document.querySelectorAll('#tile *')) {
    if (el.children.length || !(el.textContent || '').trim()) continue
    if (el.closest('.src') || el.closest('.mark')) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < min) small.push(`${fs}px: "${(el.textContent || '').trim().slice(0, 28)}"`)
  }
  for (const el of svg.querySelectorAll('text')) {
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < min) small.push(`${fs}px: "${(el.textContent || '').trim().slice(0, 28)}"`)
  }
  out.push(...small.map((s) => `under the ${min}px floor — ${s}`))
  return out
}, { min: FLOOR, fw: FW, fh: FH, n: P.rows.length, titleH: TITLE_H, inkX: INK_X })

const all = [
  ...errs.map((e) => `page error: ${e}`),
  ...faces.filter(([, ok]) => !ok).map(([f]) => `${f} NOT LOADED`),
  ...bad,
]
if (all.length) {
  console.error(`tile ${W}x${H}  REFUSED (${all.length})`)
  for (const s of all) console.error(`   ${s}`)
  await b.close()
  process.exit(1)
}

const png = await p.locator('#tile').screenshot()
const out = path.join(ROOT, OUT)
fs.mkdirSync(path.dirname(out), { recursive: true })

// Chromium encodes webp itself, so this needs no image dependency the repo does not already
// have. 0.92 holds the ramp's steps without banding the white ground.
const dataUrl = await p.evaluate(async (b64) => {
  const img = new Image()
  img.src = `data:image/png;base64,${b64}`
  await img.decode()
  const cv = document.createElement('canvas')
  cv.width = img.naturalWidth
  cv.height = img.naturalHeight
  cv.getContext('2d').drawImage(img, 0, 0)
  return cv.toDataURL('image/webp', 0.92)
}, png.toString('base64'))
if (!dataUrl.startsWith('data:image/webp')) throw new Error('canvas did not encode webp')
fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'))

console.log(`tile ${W}x${H}  ->  ${OUT}  ${fs.statSync(out).size.toLocaleString()} bytes  `
  + `bars ${P.rows.length}/${P.stat.drawn}  rowH ${rowH.toFixed(2)}px  `
  + `ink reaches ${INK_X.toFixed(0)}px under the title  faces loaded`)
console.log(`ship  -> copy "${out}" `
  + `"C:\\Users\\dusti\\Projects\\dustincole_data\\public\\images\\tiles\\recorddays.webp"`)
await b.close()
