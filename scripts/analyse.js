import { readFileSync, writeFileSync } from 'node:fs'
import { prepare, findings } from '../src/lib/findings.js'

const census = JSON.parse(readFileSync(new URL('../data/census/top-days.json', import.meta.url), 'utf8'))
const renamed = JSON.parse(readFileSync(new URL('../data/census/renamed.json', import.meta.url), 'utf8'))
const events = prepare(census.rows, renamed)
const f = findings(events)

writeFileSync(new URL('../data/census/findings.json', import.meta.url), JSON.stringify(f, null, 1) + '\n')

// The full object is written to disk. What prints is the anniversary, laid out as the
// tables it has to match, so a run of this script is checkable against the recorded
// definitions without opening the file.
const a = f.anniversary
const day = (d) => a.curve.find((p) => p.d === d)?.m
const pc = (x) => `${x}%`
const L = []
L.push(`n = ${a.n} of ${f.n} rows, quiet over days ${a.quiet.from} to ${a.quiet.to}, ${a.quiet.dropped} dropped`)
L.push(`anniversary lengths: ${Object.entries(a.annivDays).map(([k, v]) => `${k} days x${v}`).join(', ')}`)
L.push('')
L.push('THE CURVE, median multiple of each row\'s own quiet level')
L.push(`  days ${a.quiet.from}-${a.quiet.to}  ${a.plain.median}    largest plain day ${a.plain.high.d} at ${a.plain.high.m}`)
L.push(`  ${[363, 364, 365, 366, 367, 372].map((d) => `${d} ${day(d)}`).join('   ')}`)
L.push(`  at day 365, ${pc(a.at365.over2)} of ${a.at365.n} rows sit at or above ${2}x their own quiet level`)
L.push('')
L.push(`THE PLACEBO, identical geometry at ${a.placebo.centres.length} centres`)
L.push(`  centres ${a.placebo.centres[0].centre}..${a.placebo.centres.at(-1).centre}   median ${a.placebo.medianLo} to ${a.placebo.medianHi}   >=2x ${pc(a.placebo.over2Lo)} to ${pc(a.placebo.over2Hi)}   >=3x ${pc(a.placebo.over3Lo)} to ${pc(a.placebo.over3Hi)}`)
L.push(`  centre ${a.placebo.real.centre}         median ${a.placebo.real.median}         >=2x ${pc(a.placebo.real.over2)}         >=3x ${pc(a.placebo.real.over3)}`)
L.push('')
L.push(`THE CONTROL, window +/-${a.control.window}`)
for (const [k, g] of Object.entries(a.control)) {
  if (k === 'window') continue
  L.push(`  ${k.padEnd(7)} n ${String(g.n).padStart(3)}   day-365 ${g.day0}x   >=2x in window ${pc(g.over2)}   median best ${g.best}x`)
}
L.push(`  ambush curve  ${[-6, -4, -2, -1, 0, 1, 2, 5, 8].map((o) => `${o >= 0 ? '+' : ''}${o} ${a.ambushCurve.find((p) => p.off === o).m}`).join(' / ')}`)
L.push('')
L.push('WHERE IT LANDS')
L.push(`  ${a.landing.n} rows reach 2x; mode is offset ${a.landing.mode[0]} with ${a.landing.mode[1]} rows`)
L.push(`  ${pc(a.landing.withinOne)} land within one day of the exact date`)
L.push(`  ${pc(a.landing.weekOut)} (${a.landing.weekOutN} rows) land 2+ days out on a multiple of 7`)
L.push('')
L.push('SCALE')
L.push(`  median anniversary day is ${pc(a.scale.shareOfPeak)} of the original peak (best day within +/-${a.scale.window})`)
L.push(`  median ${a.scale.days.median} days at or above 2x inside the +/-${a.scale.days.window} window`)
L.push(`  ${a.scale.neverBack.n} of ${a.n} (${pc(a.scale.neverBack.share)}) never reach ${1.5}x anywhere in the window`)
L.push(`    largest by peak: ${a.scale.neverBack.names.slice(0, 12).join(', ')}`)
L.push(`  largest echoes as a share of their own peak: ${a.scale.largest.slice(0, 5).map((e) => `${e.article} ${e.share}%`).join(', ')}`)
L.push('')
L.push('THE LEADING EDGE')
L.push(`  ${a.leadEdge.n} rows with a usable base: ambush ${a.leadEdge.ambush} (${pc(a.leadEdge.ambushShare)}), lead 1-2 ${a.leadEdge.warned}, ramp >=3 ${a.leadEdge.ramp} (${pc(a.leadEdge.rampShare)})`)
L.push(`  median day -1: ${a.leadEdge.dayBefore.ambush}x base for ambush, ${a.leadEdge.dayBefore.ramp}x base for ramp`)
L.push(`  longest ramps: ${a.leadEdge.longest.map((e) => `${e.article} ${e.lead}`).join(', ')}`)
L.push('')
L.push('STABLE ACROSS')
for (const s of a.splits) L.push(`  ${s.label}: ${s.yes.day0}x (n=${s.yes.n}) vs ${s.no.day0}x (n=${s.no.n})`)
console.log(L.join('\n'))
