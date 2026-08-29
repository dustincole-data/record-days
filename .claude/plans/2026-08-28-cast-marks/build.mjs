// Rebuilds all four marks and the contact sheet. Run after scripts/analyse-cast.js.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const MARKS = [
  ['hero', 'The cast', 'the nineteen constellations on the ruler that measures them'],
  ['fame', 'The two kinds of record day', 'the page that shares its day was already being read'],
  ['return', 'They come down together', 'no correlation, no detrending: only the day each page stopped being unusual'],
  ['lag', 'The tie is to the exact day', 'the same pairs scored again with one calendar shifted'],
]
for (const [name] of MARKS) {
  const svg = execFileSync(process.execPath, [new URL(`./${name}.mjs`, import.meta.url).pathname.slice(1)], { encoding: 'utf8', maxBuffer: 64 << 20 })
  writeFileSync(new URL(`./${name}.svg`, import.meta.url), svg)
  execFileSync(process.execPath, [new URL('./shot.mjs', import.meta.url).pathname.slice(1), name, '--check'], { stdio: 'inherit' })
}
writeFileSync(new URL('./index.html', import.meta.url), `<!doctype html>
<meta charset="utf-8">
<title>The Cast - marks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:#fff;color:#1F1D1B;font-family:Archivo,system-ui,sans-serif}
  main{max-width:1560px;margin:0 auto;padding:48px 20px 120px}
  h1{font-size:20px;font-weight:600;letter-spacing:-.2px;margin:0 0 4px}
  p.note{font-size:13px;opacity:.6;margin:0 0 40px}
  figure{margin:0 0 72px}
  figcaption{font-size:12px;opacity:.55;margin:0 0 10px}
  img{display:block;width:100%;height:auto;border:1px solid #EDEAE6}
</style>
<main>
<h1>The Cast: hero and three supporting marks</h1>
<p class="note">Real data, rebuilt by <code>node .claude/plans/2026-08-28-cast-marks/build.mjs</code> from <code>data/census/cast.json</code>. Standalone renders. No page.</p>
${MARKS.map(([n2, t, d]) => `<figure><figcaption>${t}. ${d}</figcaption><img src="${n2}.svg" alt="${t}"></figure>`).join('\n')}
</main>
`)
console.log('four marks + index.html')
