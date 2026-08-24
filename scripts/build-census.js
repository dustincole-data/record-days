// Census of the biggest single reading days in English Wikipedia history.
//
// Stage 1 walks the top-1000 endpoint for every day the daily API covers and keeps,
// per article, its own largest day. Nothing is chosen: 180,000-odd articles are seen
// and the ranking is what the numbers say.
//
// Stage 2 asks each candidate to prove it was an attention event rather than a traffic
// anomaly, by the two shape tests in src/lib/census.js: a week later a hundredth of the
// peak is still there, and it is still falling. Those tests, not a judgement about the
// subject, are what remove 404.php, Anthropology and the United States Senate.
//
// Both stages count users only, which is what the top endpoint reports. The probe files
// in data/probe count all agents, so the same peak reads larger there (Elizabeth II,
// 2022-09-08: 8,399,082 here, 10,312,178 there). Never mix the two inside one figure.
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { USER_AGENT } from '../src/lib/pageviews.js'
import { API_START } from '../src/lib/classify.js'
import {
  eachDay, topUrl, foldDay, rank, qualify,
  DROPPED_EXACT, DROPPED_NAMESPACES, QUALIFY,
} from '../src/lib/census.js'

const OUT = new URL('../data/census/top-days.json', import.meta.url)
const CANDIDATES = 700   // raw rows stage 2 tests
const KEEP = 220         // qualified rows the file carries a series for
const SERIES = { from: -30, to: 400 }
const CONCURRENCY = 4
const PACE = 110
// A peak needs a day 7 to be testable, so the sweep stops short of today.
const END = process.env.CENSUS_END ||
  new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url, tries = 0) {
  let res
  try {
    res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  } catch (e) {
    if (tries < 6) { await sleep(1000 * 2 ** tries); return get(url, tries + 1) }
    return { error: e.message }
  }
  if (res.status === 404) return { body: null }
  if (!res.ok) {
    if (tries < 6) { await sleep(1000 * 2 ** tries); return get(url, tries + 1) }
    return { error: res.status }
  }
  return { body: await res.json() }
}

async function pool(items, fn, label) {
  let i = 0, done = 0
  const step = Math.max(1, Math.floor(items.length / 12))
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await fn(item)
      await sleep(PACE)
      if (++done % step === 0) console.log(`  ${label} ${done}/${items.length}`)
    }
  }))
}

// --- stage 1 -------------------------------------------------------------
// The sweep is four thousand requests. CENSUS_CACHE points at a scratch file so a
// failure in stage 2 does not cost it twice.
const days = eachDay(API_START, END)
const best = new Map()
const stillFailed = []
const CACHE = process.env.CENSUS_CACHE

let pending = days
let seen = null
if (CACHE && existsSync(CACHE)) {
  const c = JSON.parse(readFileSync(CACHE, 'utf8'))
  if (c.end === END) {
    for (const [a, v] of c.best) best.set(a, v)
    seen = c.seen
    pending = []
    console.log(`stage 1: reused cache, ${seen} articles seen, top ${best.size} kept`)
  }
}
if (pending.length) console.log(`stage 1: ${days.length} days, ${API_START} to ${END}`)

for (let round = 0; round < 6 && pending.length; round++) {
  const failed = []
  if (round) console.log(`  repair round ${round}, ${pending.length} days`)
  await pool(pending, async (iso) => {
    const { body, error } = await get(topUrl(iso))
    if (error) { failed.push({ date: iso, status: error }); return }
    foldDay(best, iso, body?.items?.[0]?.articles || [])
  }, 'days')
  pending = failed.map((f) => f.date)
  if (round === 5) stillFailed.push(...failed)
}
if (seen === null) seen = best.size
console.log(`stage 1 done: ${seen} articles, ${pending.length} days unrecovered`)
// The cache keeps only the head of the ranking, so the count of everything the sweep
// saw is written beside it rather than recomputed from a truncated map.
if (CACHE && !existsSync(CACHE)) {
  writeFileSync(CACHE, JSON.stringify({ end: END, seen, best: rank(best, 4000).map((r) => [r.article, { peak: r.peak, date: r.date }]) }))
}

// --- stage 2 -------------------------------------------------------------
const raw = rank(best, CANDIDATES)
console.log(`stage 2: testing ${raw.length} candidates`)

const ymd = (iso, off) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + off)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}
const ROOT = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user'
const tested = []

await pool(raw, async (r) => {
  const slug = encodeURIComponent(r.article).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  const url = `${ROOT}/${slug}/daily/${ymd(r.date, SERIES.from)}/${ymd(r.date, SERIES.to)}`
  const { body, error } = await get(url)
  if (error || !body) { tested.push({ ...r, q: { ok: false, why: 'series unavailable' } }); return }
  const series = new Map()
  const peakMs = Date.parse(r.date + 'T00:00:00Z')
  for (const it of body.items || []) {
    const t = it.timestamp
    const off = Math.round((Date.parse(`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}T00:00:00Z`) - peakMs) / 86400000)
    series.set(off, it.views)
  }
  tested.push({ ...r, q: qualify(series), series })
}, 'candidates')

const r2 = (v) => (v == null || !isFinite(v) ? null : +v.toFixed(2))

tested.sort((a, b) => b.peak - a.peak || a.date.localeCompare(b.date))
const passed = tested.filter((t) => t.q.ok)
const cut = tested.filter((t) => !t.q.ok)
  .map((t) => ({ article: t.article, peak: t.peak, date: t.date, why: t.q.why, share: r2(t.q.share), lift: r2(t.q.lift), falling: r2(t.q.falling) }))

const rows = passed.slice(0, KEEP).map((t, i) => ({
  rank: i + 1,
  article: t.article,
  peak: t.peak,
  date: t.date,
  base: Math.round(t.q.base),
  lift: r2(t.q.lift),
  share: r2(t.q.share),
  falling: r2(t.q.falling),
  series: Object.fromEntries([...t.series].filter(([d]) => d >= SERIES.from && d <= SERIES.to).sort((a, b) => a[0] - b[0])),
}))

writeFileSync(OUT, JSON.stringify({
  meta: {
    what: 'The largest single-day English Wikipedia pageview count on record for each article, ranked, over every day the daily API covers.',
    source: 'Wikimedia REST pageviews. Stage 1: top/en.wikipedia/all-access, one request per day. Stage 2: per-article/en.wikipedia/all-access/user.',
    agents: 'users only. data/probe counts all agents and reads larger for the same peak. The two are never mixed inside one figure.',
    window: { start: API_START, end: END, days: days.length, unrecovered: stillFailed },
    dropped: { exact: [...DROPPED_EXACT], namespaces: DROPPED_NAMESPACES },
    qualify: QUALIFY,
    articles_seen: seen,
    candidates_tested: tested.length,
    qualified: passed.length,
    kept: rows.length,
    disqualified: cut,
  },
  rows,
}) + '\n')
console.log(`\n${seen} seen, ${tested.length} tested, ${passed.length} qualified, ${rows.length} kept`)
console.log('\ncut from the top 40 raw:')
console.log(cut.slice(0, 45).map((c) => `  ${c.article.padEnd(38)} ${c.peak.toLocaleString().padStart(11)} ${c.date}  ${c.why}${c.share == null ? '' : ', share ' + c.share}${c.lift == null ? '' : ', lift ' + c.lift}${c.falling == null ? '' : ', falling ' + c.falling}`).join('\n'))
console.log('\ntop 25 kept:')
console.log(rows.slice(0, 25).map((r) => `${String(r.rank).padStart(3)}. ${r.article.padEnd(34)} ${r.peak.toLocaleString().padStart(11)}  ${r.date}  lift ${r.lift == null ? 'new page' : r.lift}`).join('\n'))
