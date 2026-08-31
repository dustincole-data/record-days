// Verify every number that went into findings.md, against the files.
import { readFileSync } from 'node:fs'
const R = 'C:/Users/dusti/Projects/Attention_Half_Life/'
const c = JSON.parse(readFileSync(R+'data/census/top-days.json','utf8'))
const rows = c.rows
const med=(a)=>{const s=a.slice().sort((x,y)=>x-y);const n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):null}
const win=(r,lo,hi)=>{const v=[];for(let d=lo;d<=hi;d++) if(r.series[d]>0) v.push(r.series[d]); return v}
let fail=0
const ok=(l,g,w)=>{const p=String(g)===String(w); if(!p) fail++; console.log((p?'ok  ':'FAIL')+'  '+l+': '+g+(p?'':'   CLAIMED '+w))}

const pope = rows.find(r=>r.article==='Pope_Leo_XIV')
ok('Pope Leo XIV day -1', pope.series[-1], 5)
ok('Pope Leo XIV peak', pope.peak, 7538267)
const meg = rows.find(r=>r.article.startsWith('Meghan'))
ok('Meghan base', meg.base, 1)
ok('Meghan peak', meg.peak, 2301231)
ok('Meghan lift', Math.round(meg.lift), 136165)
const fifa = rows.find(r=>r.article==='FIFA_World_Cup')
ok('FIFA lift', fifa.lift, 0.14); ok('FIFA base', fifa.base, 397613)
ok('biggest day article', rows[0].article, 'Charlie_Kirk')
ok('biggest day peak', rows[0].peak, 14954133)
ok('biggest day date', rows[0].date, '2025-09-10')
ok('2nd biggest', rows[1].peak, 9929065)
console.log('     ratio top/second: '+(rows[0].peak/rows[1].peak).toFixed(2)+'x  (claimed 1.5x)')
const lifts = rows.map(r=>r.lift).filter(Number.isFinite)
ok('median lift', med(lifts).toFixed(1), '11.8')
ok('min lift', Math.min(...lifts), 0.14)
ok('rows lift<1.5', rows.filter(r=>Number.isFinite(r.lift)&&r.lift<1.5).length, 22)
ok('rows lift<1.0', rows.filter(r=>Number.isFinite(r.lift)&&r.lift<1.0).length, 10)
// warning bands
const warn = rows.filter(r=>r.series[-1]>0).map(r=>({r, w:r.series[-1]/r.peak}))
ok('rows with a day -1 reading', warn.length, 220)
ok('warning under 2%', warn.filter(x=>x.w<0.02).length, 107)
ok('warning over 25%', warn.filter(x=>x.w>0.25).length, 48)
ok('median warning %', (100*med(warn.map(x=>x.w))).toFixed(1), '2.4')
ok('max warning %', (100*Math.max(...warn.map(x=>x.w))).toFixed(1), '153.9')
// settle
const settle=[]
for (const r of rows){const b=win(r,-30,-8),a=win(r,300,340); if(b.length<10||a.length<20)continue; const bb=med(b); if(!bb||bb<20)continue; settle.push({r,ratio:med(a)/bb})}
ok('settle n', settle.length, 196)
ok('settle above 1.0', settle.filter(s=>s.ratio>1).length, 90)
ok('settle share above 1.0 %', (100*settle.filter(s=>s.ratio>1).length/settle.length).toFixed(1), '45.9')
ok('settle above 2', settle.filter(s=>s.ratio>2).length, 42)
ok('settle above 5', settle.filter(s=>s.ratio>5).length, 14)
const honjo=settle.find(s=>s.r.article==='Tasuku_Honjo')
ok('Honjo ratio', honjo.ratio.toFixed(1), '502.8')
// weekday
const day=(i)=>new Date(i+'T00:00:00Z').getUTCDay()
ok('Monday record days', rows.filter(r=>day(r.date)===1).length, 52)
ok('Tuesday record days', rows.filter(r=>day(r.date)===2).length, 19)
// shared dates
const bd=new Map(); for(const r of rows){const a=bd.get(r.date)??[];a.push(r);bd.set(r.date,a)}
const sh=[...bd.values()].filter(g=>g.length>1)
ok('rows sharing a date', sh.reduce((a,g)=>a+g.length,0), 47)
ok('groups', sh.length, 19)
ok('pairs', sh.filter(g=>g.length===2).length, 12)
ok('triples', sh.filter(g=>g.length===3).length, 5)
ok('quads', sh.filter(g=>g.length===4).length, 2)
// the artefact count
let climbing=0
for(const r of rows){const n=win(r,-21,-8),f=win(r,-30,-22); if(n.length<6||f.length<5)continue; const nb=med(n),fb=med(f); if(!nb||!fb||fb<20)continue; if(nb/fb>1.5) climbing++}
ok('rows already climbing before day -21', climbing, 45)

// --- duration: days until back under 2x a clean pre-event level, held 7 days ---
{
  const dur = (baseLo, baseHi) => {
    const out = []
    for (const r of rows) {
      const b = win(r, baseLo, baseHi); if (b.length < 5) continue
      const base = med(b); if (!base || base < 20) continue
      let end = null
      for (let d = 1; d <= 340; d++) { let under = true, seen = 0
        for (let k = d; k < d + 7; k++) { const v = r.series[k]; if (v === undefined) continue; seen++; if (v > 2*base) { under = false; break } }
        if (seen >= 5 && under) { end = d; break } }
      if (end !== null) out.push({ r, end, warn: (r.series[-1]||0)/r.peak })
    }
    return out
  }
  const F = dur(-30, -22)
  const e = F.map(x=>x.end).sort((a,b)=>a-b)
  ok('duration n (clean baseline)', F.length, 179)
  ok('duration median days', med(e), 28)
  ok('duration min', e[0], 1)
  ok('duration max', e[e.length-1], 340)
  ok('duration under a week', e.filter(x=>x<7).length, 16)
  ok('duration over 100 days', e.filter(x=>x>100).length, 27)
  const byArt = (a) => F.find(o=>o.r.article===a)
  ok('FIFA World Cup days', byArt('FIFA_World_Cup').end, 1)
  ok('Jerry Springer days', byArt('Jerry_Springer').end, 340)
  ok('88th Academy Awards days', byArt('88th_Academy_Awards').end, 3)
  ok('Tom Brady days', byArt('Tom_Brady').end, 7)
  const climbing=new Set(), calm=new Set()
  for (const r of rows) { const n1=win(r,-21,-8), f=win(r,-30,-22); if(n1.length<6||f.length<5) continue
    const nb=med(n1), fb=med(f); if(!nb||!fb||fb<20) continue; (nb/fb>1.5?climbing:calm).add(r.article) }
  ok('climbing-before median days', med(F.filter(o=>climbing.has(o.r.article)).map(o=>o.end)), 21)
  ok('calm-before median days', med(F.filter(o=>calm.has(o.r.article)).map(o=>o.end)), 31)
  ok('climbing n', F.filter(o=>climbing.has(o.r.article)).length, 38)
  ok('calm n', F.filter(o=>calm.has(o.r.article)).length, 141)
}
// came-from-nothing leaderboard
{
  const s = rows.filter(r=>r.series[-1]>0).sort((a,b)=>a.series[-1]-b.series[-1])
  ok('smallest day-before', s[0].series[-1], 5)
  ok('smallest day-before page', s[0].article, 'Pope_Leo_XIV')
  ok('2nd smallest', s[1].series[-1], 53)
  ok('2nd smallest page', s[1].article, 'Damar_Hamlin')
  ok('rows under 1,000 the day before', rows.filter(r=>r.series[-1]>0&&r.series[-1]<1000).length, 10)
}
console.log('\n' + (fail? fail+' CLAIM(S) WRONG' : 'ALL findings.md numbers reproduce'))
process.exit(fail?1:0)
