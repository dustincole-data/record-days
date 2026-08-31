import { API_START } from './census.js'

export const USER_AGENT =
  'AttentionHalfLife/1.0 (https://dustincoledata.com; dustincole.ent@gmail.com)'

const ROOT =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents'

// encodeURIComponent leaves ! ' ( ) * bare. Python's urllib.parse.quote(safe='')
// encodes all five, and that is what the probe used to fetch the committed rows,
// so the slug is escaped to the stricter of the two.
function quote(s) {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

export function buildUrl(article, startYmd, endYmd) {
  const slug = quote(article.replace(/ /g, '_'))
  return `${ROOT}/${slug}/daily/${startYmd}/${endYmd}`
}

function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function shift(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function toSeries(items, eventDate) {
  const event = new Date(eventDate + 'T00:00:00Z')
  const series = new Map()
  for (const it of items) {
    const t = it.timestamp
    const day = new Date(
      `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T00:00:00Z`
    )
    const offset = Math.round((day - event) / 86400000)
    series.set(offset, it.views)
  }
  return series
}

export async function fetchSeries(article, eventDate, opts = {}) {
  const { from = -455, to = 400, fetchImpl = fetch } = opts
  // Daily data begins at API_START and a request reaching back past it is refused,
  // which would cost the whole article rather than only the missing days.
  const floorDate = new Date(API_START + 'T00:00:00Z')
  const start = shift(eventDate, from)
  const url = buildUrl(
    article,
    ymd(start < floorDate ? floorDate : start),
    ymd(shift(eventDate, to))
  )
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
  if (res.status === 404) return new Map()
  if (!res.ok) throw new Error(`Wikimedia API returned ${res.status}`)
  const body = await res.json()
  return toSeries(body.items || [], eventDate)
}
