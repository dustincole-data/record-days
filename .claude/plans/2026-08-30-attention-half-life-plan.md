# Attention Half-Life — plan

The one plan document for this project. Appended per session. A second document about a
mark that already has one means the dress is not settled: go back to the theme step.

Research lives in `research/source.md` (provenance) and `research/findings.md` (the ranked
inventory, the kill list and the ledger). This file is decisions, not evidence.

---

## Session 1 — 2026-08-30 · MINE

Everything previously built on this dataset was deleted at Dustin's instruction and the run
restarted at step 1. The two frozen extracts survive; nothing about how they were once drawn
does. Commit `131e722`.

**Done**

- `research/source.md` filled before a number was derived. Two independent pulls against the
  same API, and they disagree by 23% on the same event because one counts users and the
  other counts all agents. The rule written down: one figure, one agent basis, named on the
  page.
- The selection effect recorded at the top of both research files: **the 220 rows are a
  gate, not a sample**, and "rose then decayed" is the definition of the set. Every finding
  is tested on day -1 and day +180 to +340, which the gate never reads.
- 7 findings ranked, 3 leads killed, every hunt-list shape checked.
- Provenance restored to a runnable state: `scripts/build-census.js` had been orphaned by
  the wipe, so `src/lib/census.js` and `pageviews.js` came back and `API_START` moved out of
  the deleted `classify.js`. The fetch is documented and re-runnable; it must not be re-run.

**Numbers checked against the files, not trusted**

A verification pass over every figure in `findings.md` **failed three of them** and they were
corrected in the record: minimum lift is 0.14 and not 0.1; ten rows have a lift under 1.0 and
not six; forty-five rows are already climbing before day -21 and not forty. The guard was
left alone. That is the mechanism working, at step 1, before anything was built on it.

**The spine**

F1: warning under 2% of the peak settles at **1.33x** its own old level a year later, 65% of
them higher; warning over 25% settles at **0.49x**, 30% higher. z 4.397, p 1.1e-5. It holds
across three before-windows and three after-windows, 9 of 9 at p ≤ 0.0007, and it survives
dropping every row whose baseline was already climbing (p 0.0020). Warning is not a proxy for
prior fame (log-log r 0.356).

**Open, and deliberately not decided this session**

- No theme sentence. No palette. No mark beyond the one named per finding in the inventory.
- F7 is ranked **low** and may be killed at step 2: 10 points, r 0.610, and it cannot be
  separated from Wikipedia's own traffic growth with this extract.
- F6 needs a null model over year, month and weekday before its count becomes a claim.
- The personal hook has no candidate that works on 220 rows. It is a step-3 interaction
  question, not a finding.

**Next: step 2, guard.** One `pipeline/` pass per mining pass, emitting the payload and
asserting every number above against this record. Nothing is built until `npm run data`
exits 0.

**Converted: 0 of 7.**

---

## Session 1b — 2026-08-30 · RE-RANK

Dustin: *"goal is to find the most interesting information and make a project out of it that
would actually interest people."* The first ranking was wrong for that goal. It put the most
statistically robust finding first, and that finding needs two constructed metrics ("warning",
"settle ratio") explained before it lands. The standards say the subject must be understood
with no setup sentence.

**Re-ranked for what a stranger cares about.** One new finding, mined for this and now the
lead.

- **F1 (new): the world looks for about a month.** Median **28 days**, range **1 to 340**.
  The FIFA World Cup final held it for **1 day**; Jerry Springer for **340**. Everyone has a
  sense that news fades and nobody has a number for it.
- **F2: five readers to seven and a half million.** Pope Leo XIV, one day apart. Ten of the
  220 were read under a thousand times the day before.
- **F3: half never go back down.** 45.9%. Tasuku Honjo x503 and still there.
- **F4** is the old F1, kept as the payoff rather than the opening.

**The asset this dataset actually has** is that its top 40 is a roll-call of names everyone
knows, each attached to an exact number: Kobe Bryant, David Bowie, Elizabeth II, Chadwick
Boseman, Stephen Hawking, Matthew Perry, Betty White, Ruth Bader Ginsburg, Gene Hackman,
Diane Keaton. A piece that hides those behind a metric wastes the whole thing.

**Honesty carried forward:** a month-long tournament has no clean pre-window inside 30 days,
so the World Cup's one day is partly its own baseline. That has to be said on the page, not
buried.

`research/verify.mjs` now asserts every number in the record and exits 0. It has failed four
of its own claims across this session; each was corrected in the record and never in the
guard.

**Converted: 0 of 8.**

---

## Session 2 — 2026-08-30 · GUARD (gate 1)

Two passes, `npm run data`, **61 checks, exits 0**.

- `pipeline/01_events.mjs` → `src/gen/events.json`, the per-row table all eight findings
  draw from: 220 rows with arrival, peak, clean before-level, duration, settle ratio,
  weekday, climbing flag and date-group.
- `pipeline/02_claims.mjs` → `src/gen/claims.json`, the aggregates and the tests. It reads
  01's payload rather than the raw file, so the site's totals and the site's rows cannot
  disagree.

**One definition of "before" for the whole site: days -30 to -22.** The census offers -21
to -8 as `base` and it is not usable: 45 rows are already climbing into the event there.
Unifying on the clean window moved four findings, and the record was corrected to match.

**The guard is live, not decorative.** Shifting the before-window by two days turns it red
across four findings and it goes green again on restore.

**What the guard changed this session**

| Claim | Was | Is |
|---|---|---|
| F3 settling higher | 90 of 196, 45.9% | **86 of 196, 43.9%** |
| F3 Tasuku Honjo | x502.8 | **x507.9** |
| F4 ambush / warned settle | 1.33 / 0.49 | **1.30 / 0.55** |
| F4 significance | z 4.397, p 1.1e-5 | **z 3.587, p 3.4e-4** |
| F5 "all ten were already climbing" | asserted | **false.** Six of the ten have no clean window anywhere in the file |

Nine of the guard's own claims have failed across steps 1 and 2. Every one was corrected in
the record; none was corrected in the guard.

**Rulings made**

- **F7 promoted to high.** The null it needed was run: holding each row's year, month and
  weekday fixed and redrawing only which matching day it landed on expects **25.4** rows in
  a group. **47** were observed, and 3 of 20,000 draws reached it. **p = 2.0e-4.**
- **F8 killed.** Every other finding is a page measured against itself, so the qualification
  gate cancels. F8 is a raw count compared across years and the census carries no
  denominator for Wikipedia's own traffic. Not revivable without a total-pageviews series,
  which `source.md` records as not pulled.

**Next: step 3, theme.** One sentence that decides and excludes, and one section built for
real in it, desktop and phone, put up together.

**Converted: 0 of 7** (F8 retired by killing).

---

## Session 3 — 2026-08-30 · THEME, AND ONE PLATE

### The sentence

> **Every mark on this site is one page measured against its own quiet, laid on one axis of
> days since the day. It is a stopwatch, not a front page.**

### What it decides

| Slot | Decision | Because |
|---|---|---|
| **Display face** | **Martian Mono** — every figure on the site, and the one title. A wide mechanical mono reads as an instrument readout | The figures ARE the display. A stopwatch has no headline face, so the numbers get the one loud slot and nothing else does |
| **Text face** | **Schibsted Grotesk** — headings, the few words, the 220 names | Quiet and wide-set, invisible next to a mono figure. Neither face is used on any shipped dustincoledata project, and neither is on the house ban list |
| **Rules** | The only structural chrome is the **day axis** and one median rule. No cards, no boxes, no panel borders | An instrument has a scale and a needle. Anything else is decoration on a measurement |
| **Ground** | White, per the standards. Colour lives only in the mark | |
| **Palette** | The ink IS the day count. Five stops, and they are the **data's own landmarks** — shortest 1, p25 12, **median 28**, p75 56, longest 340 — read from `plate.json`, never typed. `#1E2170` indigo, `#5B2A93` violet, **`#B31E63` rose**, `#C9452C`, `#C67F08` amber | The accent ink of the whole page (rule, section number, focus ring, readout figure) is `#B31E63`, which is the colour of 28 days. Chrome cannot drift from data because they are the same value |
| **Legend** | There is none. The **axis bar is painted in the ramp**, so a mark's colour is the axis colour at the day it stops | One object to read, not two |
| **Structure** | One numbered beat per finding, each a reading off the same instrument: number, heading, one line, the mark, the axis, a folded method tail | |
| **Interaction** | Pointer over a row lights it and dims the field; the readout names the page and its days | |

Palette check: every stop clears 3:1 against white, which is what keeps a one-day mark visible
when it is a pixel wide. The three a reader has to name apart — one day, a month, a year —
separate at ΔE 12.7 protan and 24.3 normal. The validator's lightness-band and adjacent-15
checks are categorical-palette checks and do not apply to a continuous ramp; its own footer
says so.

### What it rejects, in writing

**The front page.** No headline face, no dateline, no columns, no photographs, no obituary
column, no chronological ribbon of what happened. This dataset is a roll-call of famous names
attached to enormous numbers, and the obvious move is to dress it as news about them. It is
not news. It is 220 measurements, and the page they belong on is a scale, not a masthead.

Also rejected, and already dead in the record: the decay curve. That shape is the
qualification gate, not the world.

### Hero form — the audit

Hero forms already used by shipped dustincoledata projects: calendar plate (Year of
Everything), true-scale scroll strip (Deep Time), packed circles / name foam (Namesake),
chord diagram (Where America Moves), radial ring poster (Climate Fingerprint), decision
boundary field (By Example), semantic constellation (Meaning Map), range columns (How Tall),
flip bands (What America Eats), simulation stage (Cascade), age slider, dot map, stacked area.

**Chosen, and used by none of them: a sorted duration field.** 214 tapered marks, one per
page, all starting at the record day, each stopping on the day that page came back. The right
edge of the ink is the sorted duration curve, so the finding is the silhouette rather than a
number printed beside it. Rows sit edge to edge and fray at the tips, which is what keeps it
from reading as a bar chart.

### The plate — `#held`, F1

Built at `src/lib/marks/held.js`, drawn 1:1 and redrawn client-side from a `ResizeObserver` on
the plot box, never stretched, because a scaled SVG has a font-size in user units and a
rendered size in pixels and the gate measures the first.

**Two rejected drafts, and the rule each produced:**

| Draft | What was wrong | The rule it produced |
|---|---|---|
| Rows with a 1px gap between them | Read as a stack of stripes floating in white | The field is contiguous. Separation is a hairline of the ground, not a gap; white belongs outside the mark |
| Names printed at the left wall on a clearance above each row | Five of the ten sit within 30px of each other, so labels crowded, crossed the median rule and sat on the ink | Labels go in a column beside the plot with a leader back to their own mark, pushed apart to a readable spacing. The corner a sorted curve leaves empty is where the names live |

**What is drawn that a summary would drop.** The band at the foot: 35 pages never came back,
so their marks run past the axis and dissolve rather than stopping on a day that never
happened. The split inside that band is stated on the plate: **32** were watched a full year,
**3** have a record day too recent for the file to say.

### What the guard changed this session

`pipeline/03_plate.mjs`, **35 new checks**. `npm run data` is now **96 checks, exits 0**.

- **A second quantile definition.** 03's first draft floored `0.75*(n-1)` where 02 floors
  `0.75*n`, and they disagreed on p75 by a day, 55 against 56. The guard failed on it. The fix
  was not to match the numbers but to delete the second definition: 03 now takes the quartiles
  off 02's payload and asserts that its own recount of the median and the walls still agrees.
  Two definitions in one repo is one too many.
- **"41 never came back" was two different sentences.** 01 stops looking for a return at day
  340, so its 41 duration-less rows mix pages watched a full year that stayed up with pages
  whose record day is too recent to have a year of file at all. Counted apart: **32 / 3 / 6**.
  The record was corrected to carry all three.
- **The 340-day horizon was checked rather than assumed.** A scan out to day 393 finds **zero**
  of the 32 coming back late, so the horizon is not manufacturing the holdouts. The check is
  kept, because the day 01 changes its horizon is the day that stops being true.
- Stale cross-references in the hunt list still pointed at the pre-re-rank numbering, F1/F3/F4
  where F4/F5/F6 were meant. Corrected in the record.

### Harness

All three scaffold scripts copied in and their constants filled (`SEL '#held'`, three faces).

- `gate.mjs` — **AUDIT CLEAN** at 1440 / 820 / 390 / 320. Nothing under 14px desktop or 13px
  phone, nothing off-canvas, nothing clipped, no page-wide horizontal scroll, and all three
  faces genuinely loaded rather than declared.
- `interact.mjs` — all checks pass. No scroll trap, every control named, the mark carries alt
  text, the keyboard reaches the page, no page errors.
- `shots.mjs` — six widths, no horizontal overflow at any of them.

Two gate catches worth keeping: the mono figures in the folded method tail were set at 13px on
desktop and were refused, so they inherit now; and the hover readout's inner spans are created
by `innerHTML`, which Astro's scope attribute never reaches, so their type silently fell back
to an italic serif. Both were invisible to every other check.

### Open, and deliberately not decided

- **The site's name.** The page carries `Record Days` as a working title. The repo is
  `Attention_Half_Life` and that premise is dead, so this needs Dustin's call. Nothing else
  depends on it.
- `src/lib/site.js` still points at `cast.dustincoledata.com` and `public/favicon.svg` is the
  deleted piece's mark. Both left alone: subdomain and favicon are listed as still open.
- **F3 wording.** F3 reads a page's resting level at day 300 to 340. "A year later" is the
  natural phrase for it and the one-year idea was killed, so the phrase appears nowhere yet
  and will not until Dustin rules on it.

**Converted: 1 of 7.**

---

## Session 3b — 2026-08-31 · MOBILE REPAIR, AND A COPY RULE

Dustin, on the plate: *"it looks bad on mobile, but it looks good on the web. The words look
really messed up on mobile, and the graph gets all chopped up."* Then: *"the titles and
descriptions of everything must not try to be witty or creative. They must specifically spell
out exactly what people are looking at."*

### The three mobile bugs, and the rule each produced

| Bug | The rule |
|---|---|
| Every named row got vertical clearance so its label could sit above it, which on a phone turned the top 40% of the plate into five stubs floating in white | **No row moves for a label.** Names go in the empty corner the sorted curve already leaves, with a leader back to the mark. On a narrow plate that column sits inside the corner rather than beside the plot, and only the short wall is named there |
| A label was one string in two faces — a Schibsted name run into a wide mono figure, each label starting at a different x | **Name and number are two elements and two columns.** The figure sits on an edge, the name against it |
| Type size was set in CSS at a 639px VIEWPORT breakpoint while the mark measured a 640px PLOT-BOX breakpoint. They differ by the page margins, so from about 640 to 700 the layout was computed at 13px and rendered at 14px and a label ran outside the plate | **The code that measures the type emits its size.** No stylesheet may set a size the mark's layout depends on |

Also: the band that never returned had 6px to dissolve into on a phone and ended in a hard
edge, which reads as a measured stop. It gets a reserved 46px at every width.

Checked at 320/360/390/500/620/660/700/820/1180/1440: one type size per width, nothing outside
the plate, no overlapping labels, no page scroll.

### The copy rule — binding on every beat from here

**Say plainly what the reader is looking at.** No figurative headline, no phrase that has to be
decoded before the graphic makes sense. A heading names the measurement. A caption says what
one mark is. The numbers carry the interest, not the wording.

| Was | Is |
|---|---|
| `Record Days` | `Wikipedia's Biggest Traffic Days` |
| "The 220 biggest single days any English Wikipedia page has ever had, and how long the world stayed" | "220 English Wikipedia pages, each shown on the single biggest traffic day it has ever had. Those days drew between 1.4 and 15.0 million views, and they happened between 2015 and 2026." |
| "The world looks for about a month." | "How long traffic stayed high after each record day" |
| "Of the 220 record days, 179 came back to normal. The middle one took 28 days." | "179 of the 220 pages returned to their normal traffic level. The middle value is 28 days. 35 never returned." |
| "Days from a page's record day until it is back under twice its own quiet level..." | "Each bar is one page. It runs from that page's record day to the day its traffic fell back under twice its normal level and stayed there for a week..." |
| `median 28 days` (on the chart) | `middle value 28 days` |
| `quiet level` (a coined term) | `normal level` |

Two numbers are now printed that were not before, so they are guarded and in the record: the
smallest record day, **1,444,398** views, and the largest, **14,954,133**. `npm run data` is
**102 checks, exits 0**.

The record also gained a warning the copy rule forced into the open: this is **not** "the 220
biggest days on Wikipedia". It is the largest 220 rows that also passed the shape gate, so
bigger single days exist that the gate excluded. Copy says "each page's own biggest day".

Gate AUDIT CLEAN at 1440/820/390/320, interaction suite passes, six widths shot.

**Converted: 1 of 7.**

---

## Session 4 — 2026-08-31 · WALK IT WIDE (F2, F3, F4)

Three beats built in the approved dress, desktop and phone, off `src/gen/`. The dress was not
reopened. `#held` was touched once, for a named bug, and that fix is at the foot of this entry.

### The forms, and why no two are the same

The rule is that no two beats share a form and no form may be the hero of a shipped project.
That is harder here than it looks, because **F2, F3 and F4 are all "before against after"**,
and the obvious mark for all three is the same one: two values per page joined on a log axis.
Worse, that mark is already a shipped hero — **How Tall's range columns** are a range bar per
item, and a dumbbell is a range bar with the ends named. So the record's own proposed marks
for F2 ("a log strip with the day-before and the day joined") and F3 ("a before/after
dumbbell per page") could not both be built, and on that reading neither could be.

They were separated by what each one's AXIS is, not by how each one's marks are drawn:

| Beat | Axis | Hero | Why it is not the beat above it |
|---|---|---|---|
| 01 `#held` | days since the record day, linear | tapered marks from a common wall, sorted | — |
| 02 `#arrival` | **views per day**, log | a **two-sided rug**: 220 ticks above the scale for the record day, the same 220 below it for the day before | no common wall, no joins, no sorting. Two distributions on one scale, and the finding is that one is a slab and the other is a smear |
| 03 `#settle` | **times its normal level**, log | a **unit histogram**, one square per page, bins laid out from the pivot | a stack, not a rug. Its quantity is a ratio, and one value per page rather than two |
| 04 `#groups` | the same axis as 03 | five **density shapes**, one per fifth of the field | a smoothed silhouette over 39 pages, not a mark per page. The only plate on the site whose unit is a group |

None of those is a calendar plate, a true-scale strip, packed circles, a chord diagram, a
radial ring, a decision-boundary field, a constellation, range columns, flip bands, a
simulation stage, a slider, a dot map or a stacked area, which is the shipped list.

**The shared scale, and the guard on it.** Beats 03 and 04 are drawn on one axis at the same
margins, so 1x sits at the same x on the page in both and a reader can read straight down.
That is a claim, so `06_groups.mjs` reads 05's payload and asserts the axis and the ramp are
**one object**, not two matching copies. If they ever drift, `npm run data` stops.

### The ink, extended without changing it

Every plate now derives its five ramp stops from its own data, and the middle stop is always
the number that plate is about, which is the site's accent ink by construction:

- 02: smallest day-before reading, the day-before quartiles and middle, largest record day.
  Rose sits at **64,634.5** views, the median day before, which is the rule the plate draws.
- 03 and 04: the two walls, the two quartiles, and **1.0** in the middle. Rose is "same as
  before", so the pivot line and the axis colour under it are the same value.

`ink()` was not changed. It interpolates on whatever scale it is handed, so a log axis passes
log values and log stops.

### What the guard changed this session

`pipeline/04_arrival.mjs`, `05_settle.mjs`, `06_groups.mjs`. **93 new checks.**
`npm run data` is now **195 checks, exits 0.**

- **A false claim in the record, found and killed.** F2 carried "Meghan, Duchess of Sussex
  sat at a pre-event level of 1 a day against a peak of 2,301,231." The 1 is the census
  `base` field, the -21..-8 window this site abandoned at step 2. On the site's own window she
  has **no usable level at all** (four readings above zero in days -30 to -22, so she is one
  of the six `noQuiet` rows), and her reading **the day before is 2,202,300**. Her whole month
  before the wedding reads 1 to 9 views a day, which is a title that was a near-empty page
  until it was moved onto. On the kill list now, and nowhere on the site.
- **One row contradicts beat 02's frame, and is published rather than dropped.** Antifa
  (United States) read **2,561,240** the day before against **1,664,217** on the day. It is
  the only such row in the file, it is counted and guarded, and the method tail says why: a
  record day here is the largest day the daily top-1000 ranking recorded for a page, and this
  page's own series carries a larger day one day earlier.
- **A guard written from a picture instead of from the numbers.** 06's first draft asserted
  that every group but the quietest peaks below the pivot. It failed: the second fifth peaks
  at **1.008**, which is the pivot to any eye and to that kernel's width. The guard is now
  written at the strength the plate is drawn at, over 2 for the quiet group and under 1.05 for
  the rest, and the real modes are in the record.
- **The relation across the five groups is NOT monotone, and there is a guard that says so.**
  The busiest fifth settles at 0.58 against the fourth's 0.53. A check named "the relation is
  not monotone" exists so that no later copy on this page can call it a ladder. What is
  guarded and stated instead is narrower: the quietest fifth is the only group whose middle
  page ended above its own normal level, and the only one where most pages did.
- Two spans are guarded because beat 02 is a contrast and a contrast is false the moment
  either side moves: the record days cover **1.02** tenfold steps and the day before covers
  **5.85**.

### The copy, under Dustin's rule

Headings name the measurement, decks carry the numbers, captions say what one mark is first.

| Beat | Heading | The caption's first sentence |
|---|---|---|
| 02 | How much traffic each page had the day before its record day | "Each tick is one page." |
| 03 | Where each page's traffic settled 300 to 340 days after its record day | "Each square is one page." |
| 04 | Where traffic settled, grouped by how much traffic the page had the day before | "Each shape is one group of 39 or 40 pages." |

**"300 to 340 days after" everywhere, never "a year later"** — the one-year idea is dead and
the phrase is not on the site. No coined terms, no em dashes, no causal wording: beat 04 says
"grouped by" and "settled", never that one causes the other.

### Three drafts thrown away, and the rule each produced

| Draft | What was wrong | The rule |
|---|---|---|
| Beat 02 joined the Pope's two ticks with a curve across the plate | A long diagonal over a scale reads as a trend line, which is the one thing that mark is not, and it crossed the axis strip and two tick labels | A named page at the far end of a field is **flagged, not joined**: its ticks run past their field into clear ground and carry the label there |
| Beat 03 binned from the left wall | The bin holding 1.0 straddled the pivot, and the caption says squares right of the line ended busier, which was then untrue for whatever landed in it | **Bin edges are laid out from the pivot**, not from the wall, so no square straddles the line the caption points at |
| Beat 03's two named walls cleared only their own square | The label is wider than the square it names, and on a phone the rest of it lay across a stack four high | A label clears the **tallest stack it covers**, not the one it names |

Also: beat 02's tail figures were set after each name, and a name is proportional so its
measured width is an estimate. Three labels, three different x. The figures sit in a
right-aligned column of their own now.

### The one change to `#held`, named

At every desktop width the band caption was written as a single unwrapped line. From about
**660 to 820** the name column has moved far enough left that the longest returners' labels
land on the end of it, and at 700 "Kelly Preston" sat on "35 pages never returned to normal."
The caption now wraps to the room **left of the name column** rather than to the whole plate,
which costs a second line under 830px and changes nothing above it. Nothing else in that file
was touched.

### Harness

- `gate.mjs` — **AUDIT CLEAN** at 1440 / 820 / 390 / 320, all four sections.
- Ladder swept at **320 / 360 / 390 / 500 / 620 / 660 / 700 / 820 / 1180 / 1440**: one type
  size per width per plate, every label inside its own plate, **no overlapping labels**, svg
  width equals its box at every width, no page scroll. This sweep is what found both the
  beat-04 leading and the `#held` bug above.
- `interact.mjs` — all pass. No scroll trap in any of the four sections, every control named,
  four marks with alt text, keyboard reaches the page, no page errors.
- `shots.mjs` — six widths, four sections each, no horizontal overflow anywhere.

Hover is on `#held` and `#settle` only. A tick in a rug and a shape over forty pages are not
rows a readout can name, so beats 02 and 04 do not pretend to offer one.

### Open, unchanged

The site's name, the subdomain, the OG card, and `favicon.svg` and `src/lib/site.js` still
pointing at the deleted piece. Nothing was deployed and there is no remote.

**Converted: 4 of 7.** Remaining: F5 (the artefact), F6 (the weekday cycle), F7 (the shared
dates). All three are guarded already and each has a named mark in the record.

---

## Session 5 — 2026-08-31 · FINISH THE WALK (F5, F6, F7)

The last three beats, built in the approved dress off `src/gen/`. The dress was not reopened.
No shipped beat was touched. `npm run data` is **302 checks, exits 0**.

### The forms, and why no two are the same

The four already spent: sorted duration field, two-sided rug, unit histogram, density ridges.
The shipped list is unchanged and none of the three below is on it.

| Beat | Axis | Hero | Why it is not any beat above it |
|---|---|---|---|
| 05 `#artefact` | **days -30 to +7, INSIDE each panel** | **small multiples** — 20 panels, one page each, one shared vertical scale of "share of its own record day" | the only plate with a time axis. Every other beat puts pages on an axis; this one puts a month on it, twenty times, and asks the reader to compare shapes |
| 06 `#weekday` | **a repeating week** | a **two-trace waveform**, filled to a pivot at 1 | the only cyclic axis. Not a bar chart (a curve through 7 points, tiled), not a ridge (two series, not five, and the quantity is a count against its own expectation) |
| 07 `#shared` | **the calendar, 2015 to 2026** | a **date × size scatter** with the 19 same-day groups drawn as capsules | the only plate with two real axes and the only one that draws all 220 at once. Not the rug (that axis is a value and its ticks are equal), not the unit histogram (nothing here is binned or stacked) |

**F7's proposed mark was rejected and replaced.** The record asked for "a day-strip: the window
as a line, every record day a tick, groups drawn as a stack". Ticks on a line is beat 02's
rug, and stacked units over a binned axis is beat 03's histogram, so the proposal collided
with two shipped forms at once. The scatter carries the same finding with neither.

### What the guard changed this session — the biggest catch of the run

`pipeline/07_artefact.mjs`, `08_weekday.mjs`, `09_shared.mjs`. **107 new checks.**

- **`lift` is not what `source.md` said it was, and F5's headline was false for three sessions.**
  `source.md` documented the census `lift` field as `peak / base`. `qualify()` in
  `src/lib/census.js` computes it as **`series[+7] / base`** — the gate's own "still raised a
  week later" arm. So the record's sentence "on 10 rows **the record day** reads below the
  page's own recent level" is wrong: on this site's window those ten record days read **2.67x
  to 122x** their level. What reads below is **day seven**, against a baseline taken from
  inside the event. Killed, replaced, and both files corrected. The finding is *better* for
  it: the artefact is now the file's own qualification test failing, not a mystery about
  record days.
- **"Ordinary reading is flattest on Monday and highest on Tuesday (Tue 1.779, Mon 1.744, Fri
  1.410)" is dead, and so is the whole "runs against the reading cycle" frame.** Those numbers
  reproduce — they are the mean of each reading over its page's median across days **-30 to
  -8** — and that estimator cannot carry the claim: the window runs into the event for 45
  rows, it is not detrended, and a mean of ratios against a median is above 1 by construction,
  which is why all seven values sat near 1.7 instead of near 1. Recomputed on days +180 to
  +345 with each reading divided by the median of the 7 days centred on it, the reading week
  is **Sunday-high (1.080), Friday-low (0.954), and Tuesday ordinary (0.988)**. What replaced
  the dead claim is stronger and is what the page states: **two weekly cycles that share
  neither their high day nor their low day, one swinging 2.74x and the other 1.132x.** The
  index is guarded for stability against a second window and by a page-clustered bootstrap.
- **Two denominators the record had conflated.** 214 rows can be compared across the two
  windows; **218** rows the census could give a gate reading at all. Both are now named and
  guarded separately.
- **A count written at a strength the data does not carry.** Three of the ten read higher on
  the earlier window than the later one — but the third clears it by **2 views in 30,000**.
  Guarded twice: the raw count (3) and the count at a margin worth drawing (2), and the page
  says two.
- Two invented expectations of my own failed on first run and were corrected to the computed
  values, not the other way round: the shared-date group carrying the most traffic is
  2020-11-08 and not 2016-11-09, and the median record day is 2,094,010.5.

### Three drawing bugs the eye caught that no script did

| Bug | The rule |
|---|---|
| Every vertical ramp on all three plates rendered as one flat indigo. A bottom-to-top ramp emits its stops in DESCENDING offset order and **SVG clamps each stop to be no smaller than the last**, so the whole gradient collapsed to its first colour | A vertical gradient's stops are **reversed** before they are written. Horizontal ramps on beats 01 to 04 were never affected, which is why this had not appeared before |
| Beat 05's ramp strip ran the full height of the grid, so "100%" sat beside row 1 and "0.001%" beside row 4 — an axis implying that a panel's position on the page meant something | **The axis is one panel tall and repeats beside each row.** Small multiples share a scale; they do not share a coordinate space |
| Beat 07's "Charlie Kirk" label was end-anchored at `x + halo`, so it lay across its own dot and the white halo behind the type rubbed the mark out | A label placed on the far side flips its offset **as well as** its anchor |

### What the ladder found, and the rule each produced

The gate passed a page the ladder failed 47 times. Every one was a label measured with a
factor rather than against a box.

| Bug | The rule |
|---|---|
| The per-panel figure was "2.2% of its record day" in the MONO, 231px wide in a 222px panel, overrunning at every width | A string keeps its words only where **the widest of the set** fits the box it sits in. Otherwise it is set short |
| `"Chadwick Boseman"` fitted a 16-character budget and rendered 131px against 118px | The 0.53em-per-character figure the earlier plates use is an **under**-estimate for this face; measured off rendered boxes it runs 0.585. The budget is 0.60 |
| Beat 05's two window names collided at 820 measured against the plate, because they are pinned to the two bands and the room they share is the **band span**, not the plate | Measure a pair against the gap between their two anchors, never against the whole box |
| Beat 05's key labels were set in the mono, half again as wide as the text face | Words go in the text face, figures in the mono. The measure follows the face |
| Beat 06's day names collided at 320 whatever they were shortened to | Names never shorten — "Su"/"Sa" and "Tu"/"Th" are not names a reader can tell apart. They **stagger onto two rows**, and the number of week repeats is then chosen as the widest tiling those two rows can still carry: three at 1180, one at 320 |
| Beat 07's year labels collided at 320 on every-second-year | How many years to skip is **computed from the room one year has**, not from a width breakpoint |
| Beat 07's two four-page tags overlapped each other on a phone | Two tag rows; a tag takes the first row it clears, and one that clears neither is dropped. All 19 dates are listed under the chart, so nothing is lost |

### The copy, under Dustin's rule

| Beat | Heading | The caption's first sentence |
|---|---|---|
| 05 | How much traffic these pages already had in the month before their record day | "Each small chart is one page." |
| 06 | Which day of the week these record days landed on | "The week runs left to right." |
| 07 | When each record day happened, and the days more than one page shared | "Each dot is one page." |

The pivot's name came **off** beat 06's plate and into its caption ("the line across the
middle is where both curves would sit if every weekday were the same") because on the plate it
lay across the very curve it was labelling. Beat 06 says "landed on" and "against how many of
that weekday the eleven years hold", never why; the UTC caveat is in its method tail. Beat 07's
method tail carries the roll-call of all 19 shared dates and the pages on each.

### Harness

- `gate.mjs` — **AUDIT CLEAN** at 1440 / 820 / 390 / 320, all seven sections.
- `ladder.mjs` — **LADDER CLEAN** at 320/360/390/500/620/660/700/820/1180/1440: one type size
  per plate per width, every label inside its own plate, no overlaps, no page scroll.
- `interact.mjs` — all pass. Seven sections, seven marks with alt text, no scroll trap.
- `shots.mjs` — six widths, seven sections each, no horizontal overflow anywhere.

Hover now runs on `#held`, `#settle` and `#shared`. Beat 07's marks are one page each, so it
earns a readout; its 2.8px core is not a pointer target, so the halo and the core are one
group and the group is both the hit area and the thing that lights.

### Open

The site's name, the subdomain, the OG card, and `favicon.svg` and `src/lib/site.js` still
pointing at the deleted piece. **Nothing has been deployed and there is no remote.** Next step
per the skill is **step 5, the second pass**: re-mine every committed raw file for what pass
one missed, then back to step 4 with whatever it finds.

**Converted: 7 of 7.**

---

## Session 6 — 2026-08-31 · SECOND PASS (step 5)

Nothing was built and no shipped beat was edited. `npm run data` is unchanged at **302 checks,
exits 0**, verified at the top of the session and again at the end. Every committed raw file was
re-mined. **Seven findings added, five leads killed, and one of the seven is a correction owed to
a live section.**

### What pass one had never opened

| File | Pass one | Second pass |
|---|---|---|
| `data/census/top-days.json` → `meta.disqualified` | never read | **222 rows.** Holds the largest single day in the whole record and the 22-page crawl of 2017-05-22 → F11 |
| `data/census/renamed.json` | flag computed in `pipeline/01`, **read by nothing** | the 8 moved titles are the file's biggest fallers, p 0.00026 → F13, and a correction to `#settle` |
| `data/probe/results2.json` | not used | the only committed set with **no shape gate**, which is what lets F10 exist |
| `data/probe/floor.json`, `probe*.py`, `stats.py` | not used | `res365`/`res180`/`floor.json` are **not reproducible** from committed data → killed as evidence |
| `src/data/dataset.json`, `events.js` | not used | series stop at day 61; cannot test F9 |

### The seven, ranked as they should be built

| # | The finding | The number that decided it |
|---|---|---|
| **F9** | a year later, the world comes back | day +365 at **1.850x** its own surrounding level, **177 of 199** above 1, sign test **p 1.4e-31**; five matched controls at **0.965 to 1.013** |
| **F10** | there is no half-life | the fitted half-life of the **same rows** is **9.62 days** over a 60-day window and **94.97** over a 340-day one, while the pages halve in **1 day**; power law beats exponential on **66 of 88** ungated probe events |
| **F11** | 22 pages, one day, within 1% | peaks **1,054,667 to 1,066,589**, CV **0.26%**; null max **6.96**, p < 5e-5 |
| **F12** | four rows stop dead | snap **818x / 204x / 82x / 40x** against a median of **1.77** and a fifth-place **11.5x** |
| **F13** | a rename reads as abandonment | median settle **0.1541** against **0.9075**, faller ranks **1, 2, 11, …**, permutation **p 0.00026** |
| **F14** | February against May | **33 against 16.8**, **7 against 18.5**, chi-square 29.92, p **0.00176** — and nothing finer than a month survives |
| **F15** | the width of a record | second day a median **41.2%** of the first, adjacent on **209 of 220** |

### The correction owed to a shipped section

`#settle` prints **"J. D. Vance x0.0129"** and **"Charles, Prince of Wales x0.022"** as the two
pages that fell furthest. **Both are page moves.** `source.md` already warned that a series read
across a rename measures the move rather than the readership, `pipeline/01` already computes the
flag, and nothing read it. The finding itself survives and improves without them — the share
ending above their own level goes **43.9% to 45.2%** — so the fix is to the two names and to F3's
row in the record, not to the claim. **This is the first thing step 4 should do.**

### Five leads killed, with the numbers that killed them

- **"Oscars week / election week / Super Bowl week"** — the three densest fortnights are real at
  20, 17 and 18 rows against ~8 expected, but all three windows were **chosen by looking**, and
  the densest fortnight *anywhere* in the year is **p = 0.056** against a max-corrected null.
- **"May is empty"** at fortnight resolution — **p = 0.24**. Survives only as F14's month cell.
- **"Monday is a UTC artefact"** — moving every straddling row back a day leaves chi-square at
  **19.53** against 19.66 as dated. Killed as an objection, which **strengthens the shipped F6**.
- **"The machine rows contaminate the shipped beats"** — F1 median **28 either way**, F3 **43.9%
  to 43.8%**. Killed, which is why F12 can be built without reopening anything.
- **`res365` / `res180` / `floor.json`** — computed from a fetch never committed; the probe series
  stop at day 60. Unusable under the reproducibility rule, and recorded because `floor.json`
  answers F3's question with **71.9%** instead of 43.9% and someone will find it again.

### Two rules this pass produced

| What happened | The rule |
|---|---|
| A `renamed` flag was computed in `pipeline/01` at step 1 and read by nothing for four sessions, while two of the rows it flags were printed on a plate as the file's biggest fallers | **A flag that no guard asserts is not a safeguard.** Any per-row caveat the pipeline computes must either be consumed by a section or asserted by a check that fails when it is ignored |
| Three named calendar windows each carried a p-value under 0.005 and none of them survived at 0.056, because all three were picked by eye off the data first | **A window chosen by looking is tested against the best window the null can find**, never against itself. The month table survives because its twelve cells were fixed before the count |

### Open

Unchanged from Session 5: the site's name, the subdomain, the OG card, and `favicon.svg` /
`src/lib/site.js` still pointing at the deleted piece. **Nothing deployed, no remote.** Next is
**step 4 again** — F13's correction first, then F9, F10, F11, F12 as sections. F14 and F15 are
ranked so nobody mines them a third time and should probably not be spent on.

**Converted: 7 of 14.**
