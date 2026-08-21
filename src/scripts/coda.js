// The coda answers one live reader query with the same modules that produced every
// published number on the page. Nothing here computes a metric of its own. The single
// local step is the curve normaliser, which build-dataset.js also holds and which cannot
// be imported from it, since that script runs a fetch loop at import time. The two bodies
// are compared as text in test/coda.test.js instead.

import { fetchSeries } from '../lib/pageviews.js'
import { baseline, findPeak, crossing, fitDecay, floor } from '../lib/metrics.js'
import { articleType, floorEligibility, API_START } from '../lib/classify.js'

// The window build-dataset.js passes. A narrower one would answer a different question
// from the one the 88 rows answer.
export const FROM = -455
export const TO = 400

export const MESSAGES = {
  'before-api': `Daily pageview data begins on ${API_START}. Pick a date on or after it.`,
  'not-found':
    'No English Wikipedia article by that name. Use the title exactly as the article ' +
    'URL spells it, with spaces or underscores between the words.',
  'no-spike':
    'No event spike found in this window. Check the date against the day the story broke.',
  error:
    'Wikimedia did not answer. The request was retried once and did not come back. ' +
    'Try again in a moment.',
}

// One note per state in which the fall is drawn and the floor is not. Task 12 is explicit
// that the low-volume ratio is never printed, so it is never computed either.
export const FLOOR_NOTES = {
  'pre-api':
    'No floor for this one. A clean baseline is read from the year before the event, ' +
    'and the daily data does not reach back that far from this date.',
  'event-article':
    'No floor for this one. The article did not exist before this date, so there is no ' +
    'earlier reading to set a year out against.',
  'low-volume':
    'No floor printed for this one. The page drew too few views a day beforehand, and a ' +
    'small denominator turns ordinary variation into a large ratio.',
  'floor-window-open':
    'No floor yet. A year past this date is not covered by the data, so the year-out ' +
    'window cannot be read.',
}

export function curve(series, peakDay, base, peakExcess) {
  const out = []
  for (let i = 0; i <= 60; i++) {
    const d = peakDay + i
    const raw = series.has(d) ? (series.get(d) - base) / peakExcess : 0
    out.push(Math.max(0, Math.min(1, raw)))
  }
  return out
}

const fail = (reason) => ({ ok: false, reason, metrics: null, curve: null })

const attempt = (article, eventDate, fetchImpl) =>
  fetchSeries(article, eventDate, { from: FROM, to: TO, fetchImpl })

export async function lookup(article, eventDate, fetchImpl = (...args) => fetch(...args)) {
  // Refused ahead of the request. The API returns 404 for an earlier start date, which
  // would arrive at the reader as a missing article rather than as a missing year.
  if (eventDate < API_START) return fail('before-api')

  let series
  try {
    series = await attempt(article, eventDate, fetchImpl)
  } catch {
    // One retry, and one only. A rate limit and a dropped connection both land here. A
    // second failure is stated rather than left as an empty chart. fetchSeries returns an
    // empty series on a 404 rather than throwing, so a missing article is never retried.
    try {
      series = await attempt(article, eventDate, fetchImpl)
    } catch {
      return fail('error')
    }
  }

  if (series.size === 0) return fail('not-found')

  const atype = articleType(series)
  const nearBase = atype === 'subject' ? baseline(series, -90, -8) : 0
  let peak
  try {
    peak = findPeak(series)
  } catch {
    return fail('no-spike')
  }
  const peakExcess = peak.views - nearBase
  if (peakExcess <= 0) return fail('no-spike')

  const elig = floorEligibility(series, eventDate)
  const fit = fitDecay(series, peak.day, nearBase)

  let floorValue = null
  let floorReason = elig.reason
  if (elig.eligible) {
    floorValue = floor(series, peak.day, elig.cleanBase)
    // build-dataset.js folds an unreadable year-out window into 'pre-api'. That reason
    // names the start of the data and would be false for an event three months old, so
    // the coda carries a state of its own for it. No committed row took that fold, which
    // test/coda.test.js pins, so the round trip against the 88 is unaffected.
    if (floorValue === null) floorReason = 'floor-window-open'
  }

  return {
    ok: true,
    reason: null,
    metrics: {
      article,
      date: eventDate,
      atype,
      peak: peak.views,
      peakDay: peak.day,
      nearBase,
      cleanBase: elig.cleanBase,
      t50: crossing(series, peak.day, peakExcess, nearBase, 0.5),
      t10: crossing(series, peak.day, peakExcess, nearBase, 0.1),
      ...fit,
      floor: floorValue,
      floorReason,
    },
    curve: curve(series, peak.day, nearBase, peakExcess),
  }
}
