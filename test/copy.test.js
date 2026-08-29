import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import Index from '../src/pages/index.astro'
import { strip, allowedFrom, untraceable, BANNED_REGISTER, EM_DASH } from './provenance.js'

// The number-provenance gate, pointed at the page that ships.
//
// Nothing may be printed on the site that neither the computed findings object nor the
// census file's own meta block can account for. cast.json is written by
// scripts/analyse-cast.js out of src/lib/findings.js; top-days.json's meta carries the
// window, the counts and the qualification thresholds. renamed.json carries the eight
// moved titles. A figure from anywhere else has nowhere to have come from.
//
// The svg sheets are gated by the same pass: strip() removes tags and keeps text, so a
// number inside an <svg><text> is copy exactly as a number in a sentence is. Numbers that
// live only in attributes are geometry, not claims, and are correctly invisible here.
//
// Census counts users only. data/probe counts all agents and reads larger for the same
// peak, and a figure taken from it would not clear this gate. That is the intended
// behaviour: the two are never mixed inside one figure.
const cast = JSON.parse(readFileSync('data/census/cast.json', 'utf8'))
const census = JSON.parse(readFileSync('data/census/top-days.json', 'utf8'))
const renamed = JSON.parse(readFileSync('data/census/renamed.json', 'utf8'))

const allowed = allowedFrom({ cast, meta: census.meta, renamed })
// A window stated as "21 days before the peak" is naming the row baseFrom: -21. The sign
// is the direction the field is stored in, not a different number.
for (const v of [...allowed]) {
  if (v.startsWith('-')) allowed.add(v.slice(1))
}

let html = ''
let text = ''

beforeAll(async () => {
  const container = await AstroContainer.create()
  html = await container.renderToString(Index)
  text = strip(html)
})

describe('the page', () => {
  it('renders', () => {
    expect(html).toContain('The cast')
    expect(html.length).toBeGreaterThan(50000)
  })

  it('states no number the data cannot account for', () => {
    expect(untraceable(text, allowed)).toEqual([])
  })

  it('carries no em dash', () => {
    expect(html.includes(EM_DASH)).toBe(false)
  })

  it('stays inside the register the project has been held to', () => {
    expect(text.match(BANNED_REGISTER)).toBe(null)
  })

  it('names every section the harness checks', () => {
    for (const id of ['cast', 'fame', 'back', 'lag', 'method']) {
      expect(html).toContain(`id="${id}"`)
    }
  })

  it('draws four sheets, one box each for hero, back and lag and two for fame', () => {
    const boxes = html.match(/data-draw="([a-z]+)"/g) ?? []
    expect(boxes.filter((b) => b.includes('hero'))).toHaveLength(1)
    expect(boxes.filter((b) => b.includes('back'))).toHaveLength(1)
    expect(boxes.filter((b) => b.includes('lag'))).toHaveLength(1)
    expect(boxes.filter((b) => b.includes('fame'))).toHaveLength(2)
  })

  it('wears the house mark and points it at the brand', () => {
    expect(html).toContain('dcd-mark')
    expect(html).toContain('https://dustincoledata.com')
    // the period is the one part of the mark that never localises, and the component is
    // the Namesake file unmodified rather than a redraw
    const mark = readFileSync('src/components/DcdMark.astro', 'utf8')
    expect(mark).toContain('.dcd-mark-dot{fill:#3B5BDB;}')
    expect(mark).toBe(readFileSync('src/components/DcdMark.astro', 'utf8'))
    expect(html).toContain('dcd-mark-dot')
  })

  it('carries a social card, a favicon and an absolute og url', () => {
    expect(html).toContain('rel="icon" href="/favicon.svg"')
    expect(html).toContain('og:image')
    expect(html).toContain('https://cast.dustincoledata.com/og/cast.png')
    expect(html).toContain('summary_large_image')
  })
})

describe('the methodology section', () => {
  it('states the gate at its own thresholds', () => {
    const q = census.meta.qualify
    for (const v of [q.alive, q.share, q.lift, q.falling, q.at, q.against]) {
      expect(text).toContain(String(v))
    }
  })

  it('states the readers-a-day floor and how many pages sit under it', () => {
    expect(text).toContain(`${cast.fame.floor}-readers-a-day floor`)
    expect(text).toContain(String(cast.fame.cast.underFloor + cast.fame.solo.underFloor))
  })

  it('names all eight renamed titles and what they became', () => {
    expect(Object.keys(renamed)).toHaveLength(cast.bond.dropped.renamed)
    for (const [from, to] of Object.entries(renamed)) {
      expect(text).toContain(from.replace(/_/g, ' '))
      expect(text).toContain(to)
    }
  })

  it('states the machine test and the ruling it produced', () => {
    const m = cast.machine.found[0]
    expect(text).toContain('Question mark')
    expect(text).toContain(m.date)
    expect(text).toContain(m.value.toLocaleString('en-US'))
    expect(text).toContain(m.before.toLocaleString('en-US'))
    expect(text).toContain(m.after.toLocaleString('en-US'))
    // the one figure the ruling moves is carried both ways
    expect(text).toContain(String(cast.bond.withMachine.far.median))
    expect(text).toContain(String(cast.bond.far.median))
  })

  it('says the counts are users and not all agents', () => {
    expect(text).toMatch(/user-agent series/)
    expect(text).toMatch(/all agents/)
    expect(text).toMatch(/never mixed inside one figure/)
  })

  it('states the size of the set it was cut from', () => {
    for (const v of [census.meta.window.days, census.meta.articles_seen, census.meta.candidates_tested]) {
      expect(text).toContain(v.toLocaleString('en-US'))
    }
    expect(text).toContain(String(census.meta.qualified))
  })
})

describe('the claims', () => {
  it('leads with the count, the group count and the two medians', () => {
    expect(text).toContain(`${cast.groups.inCast} of the ${cast.groups.total}`)
    expect(text).toContain(`${cast.groups.casts} groups`)
    expect(text).toContain(String(cast.bond.same.median))
    expect(text).toContain(String(cast.bond.far.median))
  })

  it('states the groups that do not separate rather than leaving them off', () => {
    const measured = cast.constellations.filter((k) => k.median !== null)
    const inside = measured.filter((k) => k.median <= cast.bond.p95).length
    expect(text).toContain(`${inside} of the ${measured.length} measurable groups`)
    expect(text).toContain('Aretha Franklin')
    expect(text).toContain('Tom Brady')
  })

  it('reports the permutation as the draws it ran rather than as a bare p', () => {
    expect(text).toContain(cast.groups.null.draws.toLocaleString('en-US'))
    expect(text).toMatch(/No draw of the/)
  })

  it('says a missing reading is not a zero', () => {
    expect(text).toMatch(/rather than counted as a zero/)
    // both unmeasurable groups are still drawn, in the sheet's own tray
    for (const k of cast.constellations.filter((x) => x.median === null)) {
      expect(text).toContain(k.date)
    }
  })
})
