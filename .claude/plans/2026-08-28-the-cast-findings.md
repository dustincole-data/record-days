# The Cast, ranked findings inventory

Everything the constellation object carries, mined 2026-08-28 from
`data/census/top-days.json` only. Every figure is computed by `src/lib/findings.js`
and printed by `node scripts/analyse-cast.js`; the full object is written to
`data/census/cast.json`. 60 tests in `test/cast.test.js` pin every number below.
Nothing here was typed by hand.

Premise, definitions and the controls that were already run:
[`2026-08-28-the-cast-premise.md`](2026-08-28-the-cast-premise.md). Every number that
file states reproduces exactly, apart from one it could not have known about (see
finding 10).

Marks built this session: [`2026-08-28-cast-marks/`](2026-08-28-cast-marks/index.html).

---

## 1. HERO. A record day happens to a cast, and a year later the cast is still moving together

**Claim.** 47 of the 220 largest single reading days in the record are not one page
having a day; they are two, three or four pages having the same day. A year after,
those pages were still moving together. Pages that shared the date by coincidence were not.

**Number.**
- 47 of 220 rows (21.4%) share their exact peak date, in 19 groups (12 of two, 5 of
  three, 2 of four). Strong null, redraw every date inside its own year, month and
  weekday, 20,000 draws, expects 25.4 rows (11.5%). p < 5e-5.
- Same-day pairs median r **0.567** (n 30) against **0.027** for pairs whose peaks were
  more than a fortnight apart (n 1,428), and **0.066** for the near-miss control, 1 to
  14 days apart (n 144). Permutation p < 5e-5.
- 23 of 30 same-day pairs sit above the far-pair 95th percentile (0.328).
- Kill control: drop every pair whose titles share a word (Presley, Biden, Trump,
  Smith, Ukraine, presidential). 22 pairs survive at median **0.396**, still an order
  of magnitude above the strangers.
- The bottom of the field is the argument. 7 of the 30 same-day pairs sit inside the
  stranger distribution, including Aretha Franklin / Atal Bihari Vajpayee at **0.069**
  and Tom Brady / The Weeknd at **0.046**.

**Why a stranger cares.** The biggest days in the record are not solo events, and the
group that formed on one day is still a group twelve months later, which is not something
you would guess, and it is not what "a viral spike" means. The statistic finds
the coincidences without being told which they are.

**Confidence.** High. Two independent nulls, a near-miss control, a title-overlap
control, a lag control (finding 4), and a control that uses none of the same
machinery (finding 3).

**Mark.** [`hero.svg`](2026-08-28-cast-marks/hero.svg): 19 constellation figures on
one tie ruler, discs sized by readers, gap between discs = how far apart the two pages
stayed, with both control populations drawn above as every pair they contain.

---

## 2. The two kinds of record day

**Claim.** A page that shares its record day was already being read. A page that has
its record day alone was not. Their record days are the same size.

**Number.** Median readers a day before the event: **30,107** for the 47 cast pages,
**3,947** for the 173 solo pages, 7.6 times apart. Mann-Whitney z **-6.704**, p < 0.0001
on the 46 and 168 pages above the 20-readers-a-day validity floor. Median peak:
**2,095,287** and **2,092,734**, which is 0.1% apart. Median peak over base: **68x** for a cast
page, **587x** for a solo one.

**Why a stranger cares.** This is the reversal. The spike-from-nowhere is the lonely
one; the day the world spends together happens on pages it already had open. Two
record days of identical size mean two completely different things.

**Confidence.** High. Large n, non-parametric test, and the floor is already published.

**Mark.** [`fame.svg`](2026-08-28-cast-marks/fame.svg): two panels, one page per dot.
The clouds are far apart on the left and identical on the right.

---

## 3. They come down together

**Claim.** Castmates stop being unusual on nearly the same day.

**Number.** Days until a page is back at 1.5x its own baseline: same-day pairs are a
median of **2 days** apart (n 29, 62.1% within three days); pairs 1 to 14 days apart
are **22** (n 123, 14.6%); strangers are **27** (n 14,383, 9.1%). Permutation p < 5e-5.

**Why a stranger cares.** It uses no correlation, no logs and no detrending, just the
date each page went quiet, so it cannot be an artefact of the residual method. It is
the same finding arrived at a second way.

**Confidence.** High, with one honest wrinkle: Brady and The Weeknd came down 1 day
apart because they shared an actual event, so this statistic does not separate them.
The residual tie does. Aretha Franklin and Vajpayee are 42 days apart here, Prince and
Chyna 31, the two largest gaps on the sheet.

**Mark.** [`return.svg`](2026-08-28-cast-marks/return.svg): 18 spans on a day ruler,
then the three medians drawn as lengths on the same ruler.

---

## 4. The tie is to the exact day

**Claim.** Move one page's calendar by a single day and a third of the tie is gone.

**Number.** Median r by lag: -3 **0.084**, -2 **0.200**, -1 **0.374**, **0 0.567**,
+1 **0.401**, +2 **0.211**, +3 **0.123**. The near-miss control (peaks 1 to 14 days apart)
sits at 0.066 over 144 pairs.

**Why a stranger cares.** It rules out "the same news season" and "the same kind of
subject". Whatever binds these pages is dated to the day, not the week.

**Confidence.** High. The 30 pairs are the same 30 at every lag, so nothing changes
between the rows except the shift.

**Mark.** [`lag.svg`](2026-08-28-cast-marks/lag.svg): the same 30 pairs, seven times,
on the hero's ruler, coloured by their own value.

---

## 5. What the correlation is in readers

**Claim.** On the days one page was read most unusually, its castmate was up too.

**Number.** Taking a page's top 5% of residual days (15 days) and reading its
partner on exactly those days: Joe Biden's biggest days put Beau Biden **3.63x** his
own level; Lisa Marie Presley's put Priscilla Presley at **2.78x**; the median over
all same-day pairs is **1.28x**. The same statistic over stranger pairs is **1.00x**.
Tom Brady's biggest days put The Weeknd at 1.03x.

**Why a stranger cares.** "r = 0.567" is not a quantity anyone can feel. "On the days
Joe Biden was read most, Beau Biden, dead since 2015, was read three and a half
times his normal amount" is.

**Confidence.** High. Carried per-edge in `cast.json` (`lift` and `mirror`).

**Mark.** Belongs in the hero's hover state or its annotations, not its own mark.

---

## 6. The bigger the cast, the tighter it holds

**Claim.** A four-page cast is bound twice as tightly as a two-page one.

**Number.** Median r by cast size: two pages **0.348** (10 pairs), three **0.456** (13),
four **0.704** (7).

**Why a stranger cares.** It says a cast is a real object with a size, not a coin flip
that happened twice.

**Confidence.** Medium. Monotone and clean, but 30 pairs across three buckets.

**Mark.** None needed; it is legible in the hero because the four-page casts sit high.

---

## 7. A cast has a core and a fringe

**Claim.** The bond is not transitive. Inside a three-page cast, one member is
attached to the others much more loosely than they are to each other.

**Number.** Spread of the pairwise r inside a cast: Ukraine / 2022 Russian invasion /
Vladimir Putin **0.435** (0.694 down to 0.260, the loosest being invasion / Putin);
Anora / Mikey Madison / 97th Academy Awards 0.253; the Presleys only 0.154. The
Bidens spread 0.315 over six pairs, with Kamala Harris the loosest member.

**Why a stranger cares.** The cast has an inside and an outside, and the page with the
biggest independent life of its own is the one on the edge.

**Confidence.** Medium. Five casts are large enough to measure a spread.

**Mark.** Already carried inside each hero figure: the per-edge band widths differ.

---

## 8. The run-up matches too

**Claim.** Castmates did not only share the record day; they shared how much warning
the world had.

**Number.** Days of prior elevation (a day already running at twice the page's own
baseline, counted back from day -1): same-day pairs have an identical count **56.8%**
of the time (21 of 37, median difference 0 days); stranger pairs **22.3%** (5,225 of
23,435, median difference 2 days). 2x2 with the Yates correction: chi2 **23.33** df1,
p = **1.4e-6**.

**Why a stranger cares.** It uses only the seven days before the peak, which the
qualification gate never looks at, so it is a clean second confirmation drawn from the
opposite end of the series.

**Confidence.** High for the test, medium for the reading: the identical-count share is
inflated by ties at zero.

**Mark.** Not built. Would be a fourth supporting mark if the walk needs one.

---

## 9. Casts are a February, March and November thing

**Claim.** The record days that come in groups are not spread across the year.

**Number.** 32 of the 74 rows peaking in February, March or November are in a cast
(**43.2%**) against 21.4% overall. The same null used in finding 1 expects 15.6.
p = **1.0e-4**. By month: Nov 14 of 24, Feb 11 of 33, Mar 7 of 17.

**Why a stranger cares.** The calendar has seasons for collective attention.

**Confidence.** Medium, and one arm must not be claimed. **No cast at all falls in May,
June, July or October** (56 rows), which is striking to look at but is NOT significant:
the null expects only 1.8 rows there, p = 0.36. State the positive arm with its p, and
the empty months as description only. No causal claim about why.

**Mark.** Not built. Third-tier.

---

## 10. A third shape test, and a ruling on `Question_mark`

**Claim.** One row of the 220 is machine traffic that both of the gate's shape tests
missed, and a single mechanical rule finds it.

**Number.** The rule: a day sitting at or under 3x the page's own baseline, with the
day either side at or over 100x it, anywhere in days -30 to +30. Exactly **1 of 220**
rows qualifies: **Question_mark**, 2016-02-01 record day, day +2 reading **1,142**
between **522,905** and **638,607**, on a baseline of 967. People do not stop for one
day and come back.

**Ruling.** It is dropped from every aftermath figure, exactly as the 8 renamed titles
are. It is solo, so Part A is unmoved (47 of 220 either way). The only figure that
moves at all is the stranger-pair median, from 0.026 to **0.027**; both are carried in
`cast.json` (`bond.far` and `bond.withMachine.far`) so the difference is visible rather
than silent. That is the one premise-file figure that does not reproduce, and this is
why.

**Why a stranger cares.** It is the methodology section earning its place: a test the
project invented after the data was built, applied to its own published set, with the
result that nothing had to change.

**Confidence.** High.

**Mark.** Belongs in the methodology, drawn as the page's own three readings.

---

## 11. The tie survives the whole window

**Claim.** The bond weakens over the year but never falls into the noise.

**Number.** By quarter after the peak, days 30-107 **0.630**, 108-185 **0.507**,
186-263 **0.497**, 264-340 **0.372**, against a stranger median of -0.033, 0.124, 0.034,
0.028 in the same windows. Even in the last quarter the same-day pairs are more than
ten times the control.

**Why a stranger cares.** It answers "surely it fades" with a number.

**Confidence.** High. Each quarter is measured on its own residuals with its own
minimum-days requirement, so no window is asked to carry a length it does not have.

**Mark.** Not built. A caption line under the hero.

---

## 12. Scale, for context rather than as a claim

The pages being compared are read a median of **5,812** times a day at days 250 to 340,
and a typical day sits **10.1%** off the page's own 29-day level. The wiggles that
match are ordinary reading, not events. No cast page owns its own record day: the
largest page in a cast takes a median 54.3% of the group's combined readers, and in the
two four-page casts only 50.5% and 47.9%.

---

## KILLED by the data

- **"The biggest days on record happened alone."** Nine of the top ten peaks are solo,
  which looked like a finding. It is not: the cast rate is flat across peak quintiles
  (11, 6, 11, 8, 11 of 44). Do not pitch it.
- **"No cast ever falls in summer."** True as a count, not significant (finding 9).
  Do not lead with it and do not state it without its p.
- **The magnitude gradient** (more pages on a date, bigger the biggest page: r = 0.277)
  is already ranked below in the premise file and stays there. On the gate-free rows it
  falls to r = 0.072, because the top-700 cut is itself a threshold on that quantity.

---

## Traps honoured

- `top-days.json` counts **users only**; `data/probe` counts all agents. Never mixed.
- The 20-readers-a-day validity floor holds: 6 pages sit under it and are excluded
  from finding 2's test and from every multiple.
- **A missing reading is not a zero.** Two of the 19 constellations have no measurable
  tie, 2021-04-09 because DMX was renamed, 2026-02-20 because its record day is too
  recent for a year of readings, and both are drawn on the hero in a labelled tray
  rather than dropped or scored zero.
- Any gate-free statistic drops 2017-05-22 (22 machine pages). Only Part A's gate-free
  arm needs it; the disqualified list carries no series, so nothing else here can use
  the rejected rows.
- No causal language about the floor. No em dashes in anything that ships.
