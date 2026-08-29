// Renders one mark to PNG through the headless shell, with the project's own Archivo
// woff2 files embedded. Without them the sheet silently falls back to Segoe UI, which
// is not the type the piece is designed in. Pass --check to have the page report
// whether the face actually loaded.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
const SHELL = 'C:/Users/dusti/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'
const FONTS = new URL('../../../public/fonts/', import.meta.url)
const face = (w) => {
  const b = readFileSync(new URL(`archivo-latin-${w}-normal.woff2`, FONTS))
  return `@font-face{font-family:Archivo;font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b.toString('base64')}) format('woff2')}`
}
const name = process.argv[2]
const check = process.argv.includes('--check')
const svg = readFileSync(new URL(`./${name}.svg`, import.meta.url), 'utf8')
const w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1]
const html = `<!doctype html><meta charset="utf-8">
<style>${[400, 600].map(face).join('')}html,body{margin:0;padding:0;background:#fff}</style>
${svg}
<script>
document.fonts.ready.then(() => {
  document.body.setAttribute('data-archivo', [400, 600].map((w2) => document.fonts.check(w2 + ' 16px Archivo')).join(','))
})
<\/script>`
const tmp = new URL(`./.shot-${name}.html`, import.meta.url)
writeFileSync(tmp, html)
try {
  if (check) {
    const dom = execFileSync(SHELL, ['--headless', '--disable-gpu', '--virtual-time-budget=3000', '--dump-dom', tmp.href], { encoding: 'utf8' })
    const m = dom.match(/data-archivo="([^"]*)"/)
    console.log(`${name}: Archivo 400/600 loaded = ${m ? m[1] : 'NOT REPORTED'}`)
  }
  execFileSync(SHELL, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${new URL(`./${name}.png`, import.meta.url).pathname.slice(1)}`,
    tmp.href], { stdio: 'inherit' })
} finally {
  unlinkSync(tmp)
}
