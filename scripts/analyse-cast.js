// Prints the cast findings in the layout of .claude/plans/2026-08-28-the-cast-premise.md,
// so a run of this script is checkable line for line against the recorded definitions
// without opening the data file. Everything printed comes off src/lib/findings.js.
import { readFileSync, writeFileSync } from 'node:fs'
import { prepare, cast } from '../src/lib/findings.js'

const census = JSON.parse(readFileSync(new URL('../data/census/top-days.json', import.meta.url), 'utf8'))
const renamed = JSON.parse(readFileSync(new URL('../data/census/renamed.json', import.meta.url), 'utf8'))
const events = prepare(census.rows, renamed)
const c = cast(events)

writeFileSync(new URL('../data/census/cast.json', import.meta.url), JSON.stringify(c, null, 1) + '\n')

const pc = (x) => `${x}%`
// A permutation p is bounded below by its own draw count; an analytic one is not.
const draw = (x) => (x < 5e-5 ? '<5e-5' : x < 0.001 ? x.toExponential(1) : x.toFixed(4))
const p = (x) => (x < 0.001 ? x.toExponential(2) : x.toFixed(4))
const L = []

L.push('THE MACHINE TEST')
L.push(`  a day at or under ${c.definitions.machine.at}x the base between two days at or over ${c.definitions.machine.around}x it, anywhere in days ${c.definitions.machine.from} to ${c.definitions.machine.to}`)
for (const m of c.machine.found) L.push(`  ${m.article} ${m.date} day ${m.day}: ${m.before} -> ${m.value} -> ${m.after} (base ${m.base})`)
L.push(`  ${c.machine.n} of ${c.definitions.total} rows. Dropped from every aftermath figure below.`)
L.push('')

L.push('PART A - THE CAST EXISTS')
L.push(`  ${c.groups.inCast} of ${c.groups.total} rows (${pc(c.groups.share)}) share their exact peak date with another row`)
L.push(`  ${c.groups.casts} groups. sizes ${Object.entries(c.groups.sizes).sort((a, b) => b[0] - a[0]).map(([k, v]) => `${v} of ${k}`).join(', ')}`)
L.push(`  strong null, same year-month and same weekday, ${c.groups.null.draws} draws: expected ${c.groups.null.expected} rows (${pc(c.groups.null.expectedShare)}), p = ${draw(c.groups.null.p)}`)
L.push(`  months  ${c.groups.months.map((m) => `${m.label} ${m.inCast}/${m.n}`).join('  ')}`)
L.push(`  ${c.definitions.months.join(' + ')}: ${c.groups.inMonths} rows in a cast (${pc(c.groups.monthShare)}), null expects ${c.groups.null.expectedTagged}, p = ${draw(c.groups.null.pTagged)}`)
L.push(`  no cast at all in ${c.groups.quietMonths.join(', ')} (${c.groups.quietMonthRows} rows)`)
L.push('')

L.push('PART B - THE CAST STAYS BOUND')
L.push(`  ${c.bond.rows} rows usable (${c.bond.dropped.renamed} renamed and ${c.bond.dropped.machine} machine dropped), residuals over days ${c.definitions.from} to ${c.definitions.to}`)
L.push(`  peaks on the same day          n ${String(c.bond.same.n).padStart(5)}   median r ${c.bond.same.median}`)
L.push(`  peaks 1 to ${c.definitions.near} days apart      n ${String(c.bond.near.n).padStart(5)}   median r ${c.bond.near.median}`)
L.push(`  peaks more than ${c.definitions.near} days apart  n ${String(c.bond.far.n).padStart(5)}   median r ${c.bond.far.median}`)
L.push(`  the same, 250+ shared days     n ${String(c.bond.farLong.n).padStart(5)}   median r ${c.bond.farLong.median}`)
L.push(`  ${c.bond.aboveP95} of ${c.bond.same.n} same-day pairs sit above the far-pair 95th percentile (${c.bond.p95})`)
L.push(`  permutation on the same-day median, ${c.bond.permutation.draws} draws: p = ${draw(c.bond.permutation.p)}`)
L.push(`  with the machine row left in: ${c.bond.withMachine.rows} rows, far median ${c.bond.withMachine.far.median} (the premise file's figure)`)
L.push(`  shared-title kill control: ${c.bond.tokens.kept} pairs survive, median r ${c.bond.tokens.median}`)
L.push(`    dropped ${c.bond.tokens.dropped.map((d) => `${d.a}/${d.b} [${d.token}]`).join(', ')}`)
L.push(`  lag  ${c.bond.lag.map((l) => `${l.lag >= 0 ? '+' : ''}${l.lag} ${l.median}`).join('  ')}`)
L.push(`  quarters  ${c.bond.quarters.map((q) => `${q.from}-${q.to} same ${q.same.median} far ${q.far.median}`).join('   ')}`)
L.push(`  by cast size  ${c.bond.bySize.map((b) => `${b.size} pages ${b.median} (${b.pairs} pairs)`).join('   ')}`)
L.push(`  a typical day is ${pc(c.bond.swing)} off its own 29-day level; the median row is read ${c.bond.level} times a day at days 250 to 340`)
L.push('')

L.push('THE CONSTELLATIONS, most bound first')
for (const k of c.constellations.slice().sort((a, b) => (b.median ?? -9) - (a.median ?? -9))) {
  L.push(`  ${k.median === null ? ' n/a ' : k.median.toFixed(3)}  ${k.date}  ${k.pages.map((q) => q.article).join(' + ')}`)
}
L.push('')

L.push('PART C - THE PAIRS THAT SHARED A DATE AND NOTHING ELSE')
for (const q of c.bond.pairs.slice(-7)) L.push(`  r ${q.r}  ${q.date}  ${q.a} / ${q.b}`)
L.push(`  all ${c.bond.same.n - c.bond.aboveP95} of these sit inside the far-pair distribution`)
L.push('')

L.push('THE TWO KINDS OF RECORD DAY')
for (const g of [c.fame.cast, c.fame.solo]) {
  L.push(`  ${g.label.padEnd(22)} n ${String(g.n).padStart(3)}  median base ${String(g.base).padStart(6)}/day  median peak ${g.peak}  median peak/base ${g.lift}x`)
}
L.push(`  base ratio ${c.fame.baseRatio}x, Mann-Whitney z ${c.fame.test.z} p ${c.fame.test.p < 0.0001 ? '<0.0001' : c.fame.test.p}, n ${c.fame.test.n1}/${c.fame.test.n2}`)
L.push(`  the two medians of the peak itself differ by ${pc(c.fame.peakGap)}`)
L.push('')

L.push(`THEY COME DOWN TOGETHER - day the page is back at ${c.back.level}x its own base`)
for (const k of ['same', 'near', 'far']) {
  L.push(`  ${k.padEnd(5)} n ${String(c.back[k].n).padStart(5)}  median difference ${c.back[k].median} days   within 3 days ${pc(c.back[k].withinThree)}`)
}
L.push(`  permutation on the same-day median, ${c.back.permutation.draws} draws: p = ${draw(c.back.permutation.p)}`)
L.push('')

L.push('THE RUN-UP MATCHES TOO')
L.push(`  identical days of warning: same-day ${c.runup.same.identical}/${c.runup.same.n} (${pc(c.runup.same.share)}), far ${c.runup.far.identical}/${c.runup.far.n} (${pc(c.runup.far.share)})`)
L.push(`  median difference: same-day ${c.runup.same.median} days, far ${c.runup.far.median} days`)
L.push(`  chi2 ${c.runup.test.chi2} df${c.runup.test.df}, p = ${p(c.runup.test.p)}`)

console.log(L.join('\n'))
