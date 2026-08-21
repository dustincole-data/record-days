import { writeFileSync } from 'node:fs'
import { EVENTS } from '../src/data/events.js'
import { fetchSeries } from '../src/lib/pageviews.js'
import {
  baseline,
  findPeak,
  crossing,
  fitDecay,
  floor,
  CLEAN_BASE_FROM,
  CLEAN_BASE_TO,
} from '../src/lib/metrics.js'
import { articleType, floorEligibility } from '../src/lib/classify.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// floor.py refused a clean window the daily data does not actually cover: fewer than 120
// of the window's 186 days returned. classify.js cannot carry this rule, because it would
// need a fourth reason string and Task 12's error table has exactly three rows. So the
// rule lives here, and folds into 'pre-api', which already means "the daily data does not
// span the window this measurement needs".
const MIN_CLEAN_DAYS = 120
const CLEAN_WINDOW_DAYS = CLEAN_BASE_TO - CLEAN_BASE_FROM + 1

function cleanWindowDays(series) {
  let n = 0
  for (let d = CLEAN_BASE_FROM; d <= CLEAN_BASE_TO; d++) if (series.has(d)) n++
  return n
}

function curve(series, peakDay, base, peakExcess) {
  const out = []
  for (let i = 0; i <= 60; i++) {
    const d = peakDay + i
    const raw = series.has(d) ? (series.get(d) - base) / peakExcess : 0
    out.push(Math.max(0, Math.min(1, raw)))
  }
  return out
}

const events = []
const notes = []

for (const ev of EVENTS) {
  process.stdout.write(`${ev.article} ... `)
  const series = await fetchSeries(ev.article, ev.date, { from: -455, to: 400 })
  if (series.size === 0) {
    console.log('NO DATA')
    notes.push(`${ev.article}: no data`)
    continue
  }

  const atype = articleType(series)
  const nearBase = atype === 'subject' ? baseline(series, -90, -8) : 0
  const peak = findPeak(series)
  const peakExcess = peak.views - nearBase
  if (peakExcess <= 0) {
    console.log('NO LIFT')
    notes.push(`${ev.article}: no lift`)
    continue
  }

  const elig = floorEligibility(series, ev.date)
  const fit = fitDecay(series, peak.day, nearBase)

  let floorValue = null
  let floorReason = elig.reason
  if (elig.eligible) {
    const days = cleanWindowDays(series)
    if (days < MIN_CLEAN_DAYS) {
      floorReason = 'pre-api'
      notes.push(`${ev.article}: clean window short, ${days}/${CLEAN_WINDOW_DAYS} days`)
    } else {
      floorValue = floor(series, peak.day, elig.cleanBase)
      if (floorValue === null) {
        floorReason = 'pre-api'
        notes.push(`${ev.article}: no daily data at +335..+365`)
      }
    }
  }

  events.push({
    article: ev.article,
    class: ev.class,
    date: ev.date,
    atype,
    peak: peak.views,
    peakDay: peak.day,
    // Stored unrounded. The probe rounded these before storing and the parity test
    // reproduces that rounding at compare time, so rounding here would throw away
    // precision the floor replay needs and gain nothing.
    nearBase,
    cleanBase: elig.cleanBase,
    t50: crossing(series, peak.day, peakExcess, nearBase, 0.5),
    t10: crossing(series, peak.day, peakExcess, nearBase, 0.1),
    ...fit,
    floor: floorValue,
    floorReason,
    curve: curve(series, peak.day, nearBase, peakExcess),
  })
  console.log('ok')
  await sleep(250)
}

writeFileSync(
  'src/data/dataset.json',
  JSON.stringify({ generated: new Date().toISOString(), events }, null, 1)
)

const by = (k) => events.filter((e) => e.floorReason === k).length
console.log(`\nwrote ${events.length} events`)
console.log(
  `floors: ${events.filter((e) => e.floor !== null).length} measured, ` +
    `${by('pre-api')} pre-api, ${by('event-article')} event-article, ${by('low-volume')} low-volume`
)
if (notes.length) console.log('\nnotes:\n  ' + notes.join('\n  '))
