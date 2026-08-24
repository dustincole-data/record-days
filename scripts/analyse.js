import { readFileSync, writeFileSync } from 'node:fs'
import { prepare, findings } from '../src/lib/findings.js'

const census = JSON.parse(readFileSync(new URL('../data/census/top-days.json', import.meta.url), 'utf8'))
const renamed = JSON.parse(readFileSync(new URL('../data/census/renamed.json', import.meta.url), 'utf8'))
const events = prepare(census.rows, renamed)
const f = findings(events)

writeFileSync(new URL('../data/census/findings.json', import.meta.url), JSON.stringify(f, null, 1) + '\n')
console.log(JSON.stringify(f, null, 1))
