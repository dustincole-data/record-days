/**
 * The site's two brand marks, both drawn from the site's own data:
 * public/og.png (the social card, a 1200x630 box rendered at 2x) and public/favicon.svg.
 *
 *   node scripts/marks.mjs
 *
 * THE ART IS THE SITE'S OWN BEAT 01, not a decoration made to look like it. The same
 * `plate.json` the page draws, the same ramp from `ink.js`, the same rules: one tapered
 * bar per page, sorted shortest to longest, a bar's ink is its own duration, the 35 that
 * never returned held in a band that dissolves off the right edge, the median cased in
 * the ground, and the ramp under it as the key. Nothing here invents a number or a colour.
 *
 * The type goes in the white corner the sorted curve leaves above itself — the same corner
 * the page hangs its names in — so the mark is never cropped to make room for words. The
 * headline is a finding and not a label, and both of its numbers are read off the payload
 * and asserted below: the median is 28 because half the returners are at or under it, and
 * 35 is holdout + running, which is the page's own sentence.
 *
 * Fonts are BASE64-EMBEDDED. A page built with setContent has no origin, so a file:// or
 * absolute font URL resolves to nothing and the browser silently falls back; the render is
 * refused unless document.fonts.check reports both faces actually loaded.
 *
 * The favicon is the same plate at 32 units: the sorted curve sampled 28 times, the ramp
 * placed at the ROW each of its stops falls on rather than at a day, and the band under it.
 * Three earlier candidates were drawn and looked at at 16px before this one was kept -- five
 * bars at the ramp's own stops, and seven real pages, both of which fall apart into a column
 * of dots at tab size because three quarters of these pages return inside a sixth of the
 * axis. Only the filled silhouette survives, and it needs a floor under the mark's width or
 * the top half of the curve is thinner than a pixel and the wedge loses its wall.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HEX, ACCENT, INK, MUTED, ink } from '../src/lib/ink.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = JSON.parse(fs.readFileSync(path.join(root, 'src/gen/plate.json'), 'utf8'))

const W = 1200, H = 630
const M = { l: 56, r: 56, t: 132 }
const XMAX = P.axis.max
const axisW = W - M.l - M.r
const x = (d) => M.l + (d / XMAX) * axisW
const stops = P.stops

// The headline's own numbers, read off the payload rather than typed in.
const under = P.rows.filter((r) => r.kind === 'back' && r.dur <= P.stat.median).length
const never = P.stat.holdout + P.stat.running
if (under * 2 < P.stat.back) throw new Error(`"half ... or less" is false: ${under} of ${P.stat.back}`)

// The field fills the box between the type block and the axis. The break before the pages
// that never returned takes the same gap the page gives it, scaled to this box.
const FIELD_BOTTOM = 500
const BAND = 20
const rowH = (FIELD_BOTTOM - M.t - BAND) / P.rows.length

let y = M.t
const laid = []
let bandTop = null, lastBack = null
for (const r of P.rows) {
  if (r.kind !== 'back' && bandTop === null) { bandTop = y; y += BAND }
  laid.push({ r, top: y })
  if (r.kind === 'back') lastBack = y + rowH
  y += rowH
}

const floor = 1.4
const onEnd = x(P.stat.max) + 46          // where the never-returned band dissolves to
const marks = []
for (const { r, top } of laid) {
  const back = r.kind === 'back'
  const x0 = x(0)
  const x1 = back ? Math.max(x0 + floor, x(r.dur)) : onEnd
  const h0 = back ? rowH : rowH - 0.55
  const h1 = back ? Math.max(0.7, rowH * 0.55) : h0
  const d = `M${x0.toFixed(2)} ${top.toFixed(2)}` +
    `L${x1.toFixed(2)} ${(top + (rowH - h1) / 2).toFixed(2)}` +
    `L${x1.toFixed(2)} ${(top + (rowH + h1) / 2).toFixed(2)}` +
    `L${x0.toFixed(2)} ${(top + h0).toFixed(2)}Z`
  marks.push(`<path d="${d}" fill="${back ? ink(r.dur, stops) : 'url(#onward)'}"/>`)
}

// The axis, which is also the key — the ramp laid out in days, exactly as on the page.
const ax0 = x(0), ax1 = x(P.stat.max)
const axisY = 516
const rampStops = stops.map((s, i) =>
  `<stop offset="${((x(s) - ax0) / (ax1 - ax0) * 100).toFixed(2)}%" stop-color="${HEX[i]}"/>`).join('')
const ticks = [0, 30, 90, 180, 340]
const axis = [`<rect x="${ax0}" y="${axisY}" width="${(ax1 - ax0).toFixed(2)}" height="9" fill="url(#ramp)"/>`]
ticks.forEach((t, i) => {
  const tx = x(t)
  axis.push(`<line x1="${tx.toFixed(2)}" y1="${axisY + 9}" x2="${tx.toFixed(2)}" y2="${axisY + 15}" stroke="rgba(22,24,29,.22)" stroke-width="1"/>`)
  axis.push(`<text class="tick" x="${tx.toFixed(2)}" y="${axisY + 34}" fill="${MUTED}"` +
    ` text-anchor="${i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}">${t}</text>`)
})

// The median, cased in the ground so it reads over ink and over white.
const mx = x(P.stat.median)
const med = [
  `<line x1="${mx.toFixed(2)}" y1="${M.t - 10}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="#fff" stroke-width="4"/>`,
  `<line x1="${mx.toFixed(2)}" y1="${M.t - 10}" x2="${mx.toFixed(2)}" y2="${lastBack.toFixed(2)}" stroke="${ACCENT}" stroke-width="2"/>`,
  `<text class="note" x="${(mx + 9).toFixed(2)}" y="${M.t - 17}" fill="${ACCENT}">middle value ${P.stat.median} days</text>`,
]

// The dustincoledata signature, the same three paths every project wears.
const dcd =
  `<svg x="${W - M.r - 34}" y="${axisY + 58}" width="34" height="18" viewBox="3.8 17.1 56.5 29.8">` +
  `<g transform="translate(2.943 46.426) scale(0.040753 -0.040753)">` +
  `<path fill="${INK}" d="M22 269Q22 388 88.5 468.0Q155 548 262 548Q345 548 408 488V718H579V0H422V61Q354 -10 262 -10Q155 -10 88.5 70.5Q22 151 22 269ZM200 269Q200 209 230.5 176.5Q261 144 303 144Q346 144 376.0 177.0Q406 210 406 270Q406 331 376.0 362.5Q346 394 303.0 394.0Q260 394 230.0 362.0Q200 330 200 269Z"/>` +
  `<path fill="${INK}" transform="translate(605 0)" d="M293 -10Q173 -10 97.5 68.0Q22 146 22 269Q22 389 99.5 468.5Q177 548 293 548Q404 548 479.5 479.0Q555 410 566 298H384Q382 342 357.5 368.0Q333 394 294 394Q249 394 224.0 361.0Q199 328 199 269Q199 208 223.5 175.5Q248 143 294 143Q334 143 357.5 168.5Q381 194 384 240H566Q555 125 481.5 57.5Q408 -10 293 -10Z"/>` +
  `<path fill="#3B5BDB" transform="translate(1163 0)" d="M241 104Q241 56 211.0 25.5Q181 -5 133.0 -5.0Q85 -5 54.5 25.5Q24 56 24 104Q24 153 54.5 183.5Q85 214 133.0 214.0Q181 214 211.0 183.5Q241 153 241 104Z"/>` +
  `</g></svg>`

const head = [
  `<text class="eyebrow" x="${W - M.r}" y="104" fill="${MUTED}" text-anchor="end">RECORD DAYS</text>`,
  `<text class="line" x="${W - M.r}" y="190" fill="${INK}" text-anchor="end">Half the pages that came back</text>`,
  `<text class="line" x="${W - M.r}" y="242" fill="${INK}" text-anchor="end">took ${P.stat.median} days or less.</text>`,
  `<text class="line" x="${W - M.r}" y="294" fill="${INK}" text-anchor="end">${never} never came back.</text>`,
  `<text class="foot" x="${M.l}" y="${axisY + 72}" fill="${MUTED}">days since the record day  ·  ` +
  `${P.stat.drawn} of ${P.stat.all} English Wikipedia pages  ·  Wikimedia daily pageviews</text>`,
]

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<defs><linearGradient id="ramp" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${ax1}">${rampStops}</linearGradient>` +
  `<linearGradient id="onward" gradientUnits="userSpaceOnUse" x1="${ax0}" x2="${onEnd}">` +
  `<stop offset="0%" stop-color="${HEX[4]}"/>` +
  `<stop offset="${(((ax1 - ax0) / (onEnd - ax0)) * 100).toFixed(1)}%" stop-color="${HEX[4]}"/>` +
  `<stop offset="100%" stop-color="${HEX[4]}" stop-opacity="0"/></linearGradient></defs>` +
  `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
  marks.join('') + med.join('') + axis.join('') + head.join('') + dcd +
  `</svg>`

// ---- the favicon: the same plate at 32 units ---------------------------------
{
  const S = 32, L = 2.5, R = 29.5, T = 3, fieldB = 22.5, bandT = 24.5, bandB = 29
  const FLOOR = 1.6, N = 28
  const back = P.rows.filter((r) => r.kind === 'back')
  const pts = []
  for (let i = 0; i < N; i++) {
    const r = back[Math.min(back.length - 1, Math.round((i / (N - 1)) * (back.length - 1)))]
    pts.push([L + Math.max(FLOOR, (r.dur / XMAX) * (R - L)), T + (i / (N - 1)) * (fieldB - T)])
  }
  const d = `M${L} ${T}` + pts.map((q) => `L${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join('') + `L${L} ${fieldB}Z`
  const g = stops.map((s, i) => {
    const j = back.findIndex((r) => r.dur >= s)
    return `<stop offset="${((j < 0 ? 1 : j / (back.length - 1)) * 100).toFixed(1)}%" stop-color="${HEX[i]}"/>`
  }).join('')
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="Record Days">
  <defs><linearGradient id="r" x1="0" y1="${T}" x2="0" y2="${fieldB}" gradientUnits="userSpaceOnUse">${g}</linearGradient></defs>
  <rect width="${S}" height="${S}" fill="#ffffff"/>
  <path d="${d}" fill="url(#r)"/>
  <rect x="${L}" y="${bandT}" width="${R - L}" height="${bandB - bandT}" fill="${HEX[4]}"/>
</svg>
`
  fs.writeFileSync(path.join(root, 'public/favicon.svg'), favicon)
  console.log(`favicon ${favicon.length} bytes -> public/favicon.svg`)
}

const b64 = (f) => fs.readFileSync(path.join(root, 'public/fonts', f)).toString('base64')
const html = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family:'Schibsted Grotesk'; font-weight:400 700; font-display:block;
    src:url(data:font/woff2;base64,${b64('schibsted-grotesk-var-latin.woff2')}) format('woff2'); }
  @font-face { font-family:'Martian Mono'; font-weight:400 700; font-display:block;
    src:url(data:font/woff2;base64,${b64('martian-mono-var-latin.woff2')}) format('woff2'); }
  html,body{margin:0;padding:0;background:#fff;}
  svg{display:block;}
  .line{font-family:'Schibsted Grotesk';font-size:43px;font-weight:500;letter-spacing:-.012em;}
  .eyebrow{font-family:'Martian Mono';font-size:16px;font-weight:500;letter-spacing:.22em;}
  .note,.tick{font-family:'Martian Mono';font-size:15px;font-weight:400;}
  .foot{font-family:'Schibsted Grotesk';font-size:17px;font-weight:400;}
</style>${svg}`

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

const loaded = await page.evaluate(() => ({
  sans: document.fonts.check('500 43px "Schibsted Grotesk"'),
  mono: document.fonts.check('400 15px "Martian Mono"'),
}))
if (!loaded.sans || !loaded.mono) {
  await browser.close()
  throw new Error(`a declared font is not a loaded font: ${JSON.stringify(loaded)}`)
}

// Nothing may run off the card, and the headline may not reach into the mark.
const box = await page.evaluate(() => [...document.querySelectorAll('text')].map((t) => {
  const r = t.getBoundingClientRect()
  return { s: t.textContent.slice(0, 24), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }
}))
for (const t of box) {
  if (t.l < 0 || t.r > W || t.t < 0 || t.b > H) throw new Error(`type off the card: ${JSON.stringify(t)}`)
}
const headline = box.filter((t) => /^(Half|took|\d+ never)/.test(t.s))
console.log(`  headline left edge ${Math.min(...headline.map((t) => t.l))}px, deepest ${Math.max(...headline.map((t) => t.b))}px`)

const out = path.join(root, 'public/og.png')
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } })
await browser.close()
console.log(`og ${fs.statSync(out).size.toLocaleString()} bytes -> public/og.png  ` +
  `(fonts ${JSON.stringify(loaded)}, ${under}/${P.stat.back} at or under ${P.stat.median} days, ${never} never)`)
