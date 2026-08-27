# The Anniversary — art direction, 2026-08-27

Approved by Dustin in session, same day. Companion to
`.claude/plans/2026-08-27-anniversary-premise.md`, which holds the premise and the
operational definitions. That file is settled and is not reopened here.

**State: nothing is built.** The metrics port shipped (commit `593498c`). No page, no
component, no canvas. This file is the art direction and the build order.

## What already shipped

`src/lib/findings.js` computes the whole anniversary block and `data/census/findings.json`
carries it. `node scripts/analyse.js` prints it in the premise file's own layout. The
number-provenance gate is lifted off the retired Orbit and floor beats into
`test/provenance.js` and rebuilt around the findings object. 234 tests pass.

Two conventions the premise used but never stated are now recorded in the code, and both
are load-bearing:

- A row with no reading at an offset **stays in its group** and sorts below every observed
  row. Four of the 203 stop short of a full year. Drop them and the control table reads
  1.90x / 69.8% instead of 1.85x / 68.5%.
- A **parenthesised** year is a disambiguator, not a numbered occasion. Strip it before the
  title test or the split is 12 / 191 instead of 10 / 193.

One figure in the premise does not reproduce. It records 6.5% of landings 2+ days out on a
multiple of seven; the stated definition finds 3 of 139, which is 2.2%. 6.5% is the share
landing 7 or 8 days out, a different question. **The computed 2.2% is what ships.**

## What the probe settled

Three findings from throwaway renders of the real 203 rows. They are constraints on the
build, not preferences.

1. **The x axis is each row's own year, not literal day 365.** 162 rows have a 365 day year
   and 41 have a 366 day year. On a literal-day axis the 41 sit one day right and smear the
   exact alignment the piece is about. On an own-year axis both verticals are exact.
2. **Raster and heat treatments fail.** Daily variance inside a row's quiet year is itself
   0.6x to 3x, so per-row shading paints the year mid-grey and a 3x echo is
   indistinguishable from ordinary noise. Both a continuous grey ramp and a binary 2x
   threshold came back as static. The finding is **cross-row alignment**, not per-row
   magnitude, and only a mark where 203 spikes line up can carry it.
3. **A noise floor is required.** Nothing under 1.5x draws any height. Without it the field
   is texture and the seam competes with it. With it, the seam is the only vertical
   structure in the whole field.

## Identity

No new palette. `src/styles/tokens.css` already commits to cream ground `#f4efe6`, ink
`#1d1726`, Archivo at small sizes, no serif and no display type. Identity preservation
wins. The one large figure on the page is data.

The warm-to-cool ramp in that file currently means "below the ring / above the ring", which
is the retired premise. **Re-map the semantics, keep the pigments.** The ramp now means how
much warning the event gave, and it is ordered, not categorical:

| class | rows | token | hex | reading |
|---|---|---|---|---|
| no warning (`ambush`, lead 0) | 80 | `--below` | `#c02f4b` | warm, sudden |
| 1 to 2 days (`warned`) | 52 | `--above-far` | `#5b3fa8` | between |
| 3 days or more (`ramp`) | 69 | `--above` | `#3b5fc0` | cool, scheduled |
| no usable baseline | 2 | `--ink-soft` | `#6f6678` | not measured |

Crimson and blue are the two ends and they are the two that carry beat 3, where they are
overlaid and separation matters most. The blocks are spatially separated in the hero, so
hue proximity between `warned` and `ramp` costs nothing there.

Contrast: these are data marks, so the bar is legibility against cream, not WCAG text
contrast. Any of these hues used for **text** must be re-checked at 4.5:1 against
`#f4efe6`, and `--below-near` `#f7c86a` must never carry text on cream.

## The hero

One canvas. 203 rows, each a full year wide, sharing one vertical.

**Geometry.** `f` runs from `-30/365` to `400/365`. A row's reading at `f` is
`series[round(f * anniv)] / quiet`, so `f = 0` is every row's peak and `f = 1` is every
row's own anniversary. Both are exact verticals.

**Height.** `h(m) = m > 1.5 ? min(1, log10(m / 1.5) / log10(40 / 1.5)) * AMP : 0`.
Clipping at 40x is deliberate: the peak is two orders of magnitude above the band that
matters and is meant to saturate into a wall.

**Layout.** Pitch 7px, amplitude 30px at desktop, ridges drawn top to bottom so lower rows
occlude upper ones. Four blocks in the table's order, 26px between them. Rows within a
block are chronological.

**The one idea the hero rests on.** Each ridge fills translucent in its block's hue and
strokes in the same hue at higher alpha. Where rows spike together the fills stack and the
colour saturates, so **the pigment density at a column is the number of rows echoing
there**. Two saturated columns on a pale field. The reader looks at the finding rather than
at a rendering of it.

**Two rules**, at `f = 0` and `f = 1`, labelled `the peak` and `one year later`.

**Payload.** Precomputed at build time from `findings.js`, never in the browser. One byte
per row-day over days -30 to 400, 203 x 431 cells. Reserve `0` for no reading, `1` for at
or below the floor, `2..255` for the ramp; the four short rows must be distinguishable from
flat rows or the mark draws a false line where there is no data. 87KB raw, **30KB
gzipped**, measured.

**Canvas, not SVG**, because 203 paths x 431 points is roughly 1.2MB of inline markup.
Redraw on `ResizeObserver` against the canvas's own box, not on window resize. Cap dpr at
2; at 1400 x 1500 CSS px that is 33MB decoded, which is the ceiling.

## The beats

Four, each one chart and roughly forty words. Every figure comes from `findings.json`.

1. **The placebo.** 16 centres from day 110 to 335, identical geometry, medians 1.40 to
   1.68. At the anniversary, 3.10. One flat run and one jump.
2. **The control.** The ambush curve against the ramp curve, crimson against blue,
   offsets -12 to +12. 2.65x against 1.48x. The events nobody saw coming come back hardest
   and the ones on the calendar come back weakest, which is what rules out a set of
   recurring fixtures.
3. **The scale.** 0.74% of the original peak. A median of 2 days at or above twice the
   quiet level. Roughly seven readers in a thousand.
4. **The ones that do not come back.** 26 of 203, 12.8%, named, largest by peak first.

Then a **static index** built from the 203 rows so a reader can find their own event, and a
**colophon**.

## Limits the page must state

- The series stops at day 400, so **exactly one anniversary is observable**. No second one
  to test, and no claim about year two.
- Day 0 is the row's peak day, not the event day. The -1 shoulder is reported as the shape
  of the window with no explanation attached.
- Counts are **users only**. `data/probe` counts all agents and reads larger for the same
  peak. Never mixed inside one figure.
- The 8 renamed titles and the 20-readers-a-day validity floor, both already published and
  both still correct.

## Motion

The technique from `.claude/plans/2026-08-22-story/vc.html` (commit `dce6b67`), unchanged
and verified there: **every mark is built in its finished state and animations only play
from an offset**, so a dead observer still renders the finished page. Rows lift from a small
offset, staggered by block. The two rules draw in. No scroll-scrub in v1. Reduced motion
gets the finished state instantly, not a suppressed page.

## Responsive

The seam survives narrow widths because it is 203 rows tall, not because it is wide. Pitch
drops on phone and the mark goes full bleed past the page gutter. **Verify in the browser
rather than assume**; at 375px the whole year is roughly 0.8px per day and the five-day
window is about 4px, so this is the real risk in the build.

## Constraints, verbatim, still binding

> "Do NOT rebuild dataset.json (live network run) and do NOT edit it."
> "no em dashes, no causal language about the floor."

Every number on the page traces to `findings.json` through `test/provenance.js`. Nothing
typed by hand.

## Build order

1. The payload builder, emitting the hero bytes from `findings.js`.
2. The hero canvas, desktop only, no motion, no copy. Look at it before going further.
3. Point the provenance gate at the new page and retire `src/components/` plus the 95 tests
   that only cover the dead Orbit and floor beats. **Not before**, the old page is still the
   only page.
4. The four beats.
5. Index, colophon, motion, phone.

## Not decided

- Subdomain. Never picked. No git remote, never deployed.
- Whether the index needs search or just a long sorted list.
- Headline and the opening line.
