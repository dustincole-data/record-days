import { API_START } from './classify.js'

const TOP_ROOT =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access'

// The top-1000 endpoint returns whatever sat on the list that day, which includes
// the wiki's own furniture. These are dropped by rule, and the rule is published
// with the file so the census stays a census rather than a curated set.
export const DROPPED_EXACT = new Set(['Main_Page', '-', 'Wikipedia', 'Undefined'])

export const DROPPED_NAMESPACES = [
  'Special',
  'Wikipedia',
  'Portal',
  'File',
  'Help',
  'Category',
  'Template',
  'Talk',
  'User',
  'User talk',
  'Draft',
  'Module',
  'MediaWiki',
  'Book',
  'TimedText',
]

export function isCensusArticle(title) {
  if (!title) return false
  if (DROPPED_EXACT.has(title)) return false
  const colon = title.indexOf(':')
  if (colon > 0) {
    const ns = title.slice(0, colon).replace(/_/g, ' ')
    if (DROPPED_NAMESPACES.includes(ns)) return false
  }
  return true
}

export function topUrl(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${TOP_ROOT}/${y}/${m}/${d}`
}

export function eachDay(startIso, endIso) {
  const out = []
  const end = new Date(endIso + 'T00:00:00Z')
  let cur = new Date(
    (startIso < API_START ? API_START : startIso) + 'T00:00:00Z'
  )
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10))
    cur = new Date(cur.getTime() + 86400000)
  }
  return out
}

// Folds one day's top-1000 payload into the running best-day-per-article map.
// A tie keeps the earlier date, so the recorded day is the first time the page
// reached that number rather than a later repeat of it.
export function foldDay(best, isoDate, articles) {
  for (const row of articles || []) {
    const title = row.article
    if (!isCensusArticle(title)) continue
    const views = row.views
    const prev = best.get(title)
    if (!prev || views > prev.peak || (views === prev.peak && isoDate < prev.date)) {
      best.set(title, { peak: views, date: isoDate })
    }
  }
  return best
}

export function rank(best, limit) {
  const rows = [...best.entries()].map(([article, v]) => ({
    article,
    peak: v.peak,
    date: v.date,
  }))
  rows.sort((a, b) => b.peak - a.peak || a.date.localeCompare(b.date) || a.article.localeCompare(b.article))
  const kept = limit ? rows.slice(0, limit) : rows
  return kept.map((r, i) => ({ rank: i + 1, ...r }))
}

// --- qualification -------------------------------------------------------
//
// The top-1000 list carries automated traffic that no user-agent filter catches.
// 404.php took 6,190,956 in a day. Anthropology took 6,131,162 on a Christmas Day.
// The United States Senate took 17,110,916 on a Saturday in February 2020, which is
// more than any human event on record here.
//
// Two tests, both read off the shape of the days after the peak.
//
//   TRACE. A week later at least four readers in every thousand from the peak day
//   are still there, and the event is still visible either as a fair share of the
//   peak or as a page still lifted off its own prior reading. Two arms, because a
//   subject who was already being read heavily going in has a small share and a
//   small lift both, and one arm alone throws those out: Kamala Harris on the day
//   the 2020 election was called, Lionel Messi on the day of the World Cup final.
//   The second arm is skipped for a page created for its own event, which has no
//   prior reading to be lifted off. The four-in-a-thousand floor comes first and
//   applies to both arms, because a lift measured against a small quiet base is
//   noise: Key frame took 6,061,614 in a day and was at 6,000 a week later, which
//   is 1.56 times its own base and nothing at all.
//
//   FALLING. Day seven is below day three. Attention that is real is still coming
//   down a week in. The United States Senate held 0.969 of its day three, 404.php
//   1.244, YouTube 1.216. Nothing human tested here exceeds 0.695.
//
// Neither test looks at where the page settles a year later, which is the thing this
// project measures. A rule that asked whether the event permanently changed the
// subject would decide the finding before the data did.
export const QUALIFY = { alive: 0.004, share: 0.015, lift: 1.5, falling: 0.85, at: 7, against: 3, baseFrom: -21, baseTo: -8 }

export function median(xs) {
  if (!xs.length) return 0
  const s = xs.slice().sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// series is a Map of day offset from the peak to views. Day 0 is the peak.
export function qualify(series) {
  const pre = []
  for (let d = QUALIFY.baseFrom; d <= QUALIFY.baseTo; d++) {
    if (series.has(d)) pre.push(series.get(d))
  }
  const base = median(pre)
  const peak = series.get(0) || 0
  const at = series.get(QUALIFY.at)
  const against = series.get(QUALIFY.against)
  const out = {
    ok: false, why: null, base,
    share: peak && at !== undefined ? at / peak : null,
    lift: base > 0 && at !== undefined ? at / base : null,
    falling: against && at !== undefined ? at / against : null,
  }
  if (at === undefined || against === undefined || !peak) { out.why = 'series too short to test'; return out }
  if (out.share < QUALIFY.alive) { out.why = 'gone by day seven'; return out }
  const traced = out.share >= QUALIFY.share || (base > 0 && out.lift >= QUALIFY.lift)
  if (!traced) { out.why = 'back where it was by day seven'; return out }
  if (out.falling > QUALIFY.falling) { out.why = 'never fell'; return out }
  out.ok = true
  return out
}
