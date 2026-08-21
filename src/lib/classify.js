import { baseline, CLEAN_BASE_FROM, CLEAN_BASE_TO } from './metrics.js'

export const API_START = '2015-07-01'
export const MIN_BASELINE = 400
const NEAR_FROM = -90
const NEAR_TO = -8
const MIN_NEAR_DAYS = 40

export function articleType(series) {
  let days = 0
  for (let d = NEAR_FROM; d <= NEAR_TO; d++) if (series.has(d)) days++
  return days >= MIN_NEAR_DAYS ? 'subject' : 'event'
}

export function floorEligibility(series, eventDate) {
  if (articleType(series) === 'event') {
    return { eligible: false, reason: 'event-article', cleanBase: null }
  }
  const cleanWindowStart = new Date(eventDate + 'T00:00:00Z')
  cleanWindowStart.setUTCDate(cleanWindowStart.getUTCDate() + CLEAN_BASE_FROM)
  if (cleanWindowStart < new Date(API_START + 'T00:00:00Z')) {
    return { eligible: false, reason: 'pre-api', cleanBase: null }
  }
  let cleanBase
  try {
    cleanBase = baseline(series, CLEAN_BASE_FROM, CLEAN_BASE_TO)
  } catch {
    return { eligible: false, reason: 'pre-api', cleanBase: null }
  }
  if (cleanBase < MIN_BASELINE) {
    return { eligible: false, reason: 'low-volume', cleanBase }
  }
  return { eligible: true, reason: null, cleanBase }
}
