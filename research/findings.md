# Attention Half-Life — findings

**Premise:** These are the 220 biggest days in Wikipedia's history. For each one: who you
were the day before, how big the day was, how long the world looked, and who you are now.

**What the set is, stated the way the page states it** (added step 3, guarded in `pipeline/03`):
220 English Wikipedia pages, each on the single biggest traffic day it has ever had. Those days
run from **1,444,398** views (the smallest) to **14,954,133** (Charlie Kirk, 2025-09-10), and
they fall between **2015** and **2026**. Note this is *not* "the 220 biggest days on Wikipedia":
the set is the largest 220 rows that ALSO passed the shape gate, so bigger single days exist
that the gate excluded. Any copy must say "each page's own biggest day", never "the biggest
days".

**Ranked for what a stranger would care about, not for what is hardest to prove.** The first
pass ranked F4 (below) first because it is the most robust; it also needs two constructed
metrics explained before it lands, which the standards forbid. Re-ranked 2026-08-30.

8 findings ranked, 3 leads killed. Every number is reproducible from the committed extracts
described in `source.md`; none has a pipeline yet (that is step 2). Confidence is stated for
the **claim as written**, not for the arithmetic.

**Index convention:** *warning* is the reading on the day **before** the record day, as a
share of the record day itself. 0.06% means the page was almost untouched the day before.
*Settle ratio* is the median daily reading at day +300 to +340 divided by the median over the
quiet window before the event. 1.0 means the page ended exactly where it started.

**The gate is not the world.** All 220 rows were selected for having spiked and then fallen
by day 7 (`source.md`, source 1 gotchas). Nothing here may rest on "they rise then decay" —
that is the definition of the set. Every finding below is checked against day **-1** and day
**+180 to +340**, which the gate never reads.

---

## Ranked inventory

| # | Claim | Numbers | Why a stranger cares | Confidence | Mark |
|---|---|---|---|---|---|
| **F1** | The world looks at something for about a month. It looked at the World Cup final for one day and at Jerry Springer for a year. | Days until a page is back under twice its own quiet level and stays there a week, measured off days -30..-22: **median 28**, range **1 to 340**, n=179. **16** rows are done inside a week; **27** hold past 100 days. Shortest: FIFA World Cup **1 day**, WrestleMania 33 and 34 **2**, 88th Academy Awards **3**, Kamala Harris **5**, Tom Brady **7**. Longest: Jerry Springer **340**, Kelly Preston **330**, Christian Eriksen **330**, Alexander Hamilton **254**. The other **41** rows split three ways, and the split is the honesty of the finding: **32** were watched a **full year** (400 readings) and were still above twice their own quiet level at the end of it, **3** have a record day too recent for the file to say either way, and **6** have no quiet window in the thirty days before, so they cannot be measured this way at all. Added at step 3; **none** of the 32 comes back between day 341 and day 393 either, so the horizon is not what is producing them | Everyone has a sense that news fades, nobody has a number for it. "A month" is the number, the extremes are a day and a year, and a sixth of them never come back | **High** for the median and the range. **Medium** for the shortest rows: a month-long tournament has no clean pre-window inside 30 days, so the World Cup's 1 day is partly its own baseline. Say so on the page | A single duration axis, 1 to 340 days, every row a mark, named. The scheduled events pile against the left wall |
| **F2** | Five views the day before. Seven and a half million the next. | Pope Leo XIV: **5** views 2025-05-07, **7,538,267** on 2025-05-08. **10** of the 220 were viewed fewer than **1,000** times the day before their record day: Damar Hamlin **53**, Prince Harry **72**, Francis Scott Key Bridge **79**, the 2022 Russian invasion of Ukraine **306**, Christina Grimmie **468**. Half the file was under **64,634.5** views the day before, and half got at least **40.9x** more on the day. Added at step 4 and guarded in `pipeline/04`, because the plate is a contrast and a contrast needs both sides: the record days span **1.02** tenfold steps (1,444,398 to 14,954,133) and the day before spans **5.85** (5 to 3,501,236, Kamala Harris). **One row runs the other way:** Antifa (United States) read **2,561,240** the day before against **1,664,217** on the day, because a record day is the largest day the daily top-1000 ranking recorded and its own series carries a larger day one earlier | No setup, no metric, no domain. Two numbers and a name everyone knows | **High.** Direct read of two cells | A two-sided rug on one log axis of views: the record day above the scale, the day before below it, the named page flagged at both ends |
| **F3** | Almost half of them never go back down. | Against one before-window for the whole site (days -30 to -22), of **196** rows with a usable level and a full year after, **86 (43.9%)** settle **above** where they started and **110** at or below; **46** above 2x, **14** above 5x. Quartiles **0.3692** and **1.8201**, so the pivot at 1.0 sits between them. Tasuku Honjo **x507.9** (99 a day before, 50,281 after). Imane Khelif **x189.4**. Against them, J. D. Vance **x0.0129**, Charles, Prince of Wales **x0.022**, the United States Electoral College **x0.033**. Added at step 4: **5 of the 10** biggest fallers are scheduled events whose before-window sits inside the event (World Cup, both WrestleManias, Royal Rumble 2024, 92nd Academy Awards), so that end of the field is partly F5 and the page says so | "The internet moves on" is the received wisdom and it is wrong for half of these | **High** for the rows and the share; **medium** as a general claim, because the 220 are a gate not a sample | A unit histogram, one square per page, on a log ratio axis with the bins laid out from the pivot |
| **F4** | The ones nobody saw coming are the ones that keep the readers. | On the site's one before-window: day before under 2% of the peak, **91** rows, settle **1.30x**, **60%** end higher. Over 25%, **43** rows, settle **0.55x**, **35%** higher. Mann-Whitney z **3.587**, p **3.4e-4**. The same split on duration runs **31 days** for the calm rows against **21** for those already climbing before day -21. Added at step 4 and guarded in `pipeline/06`, cutting the 196 into equal fifths by the day before rather than at a threshold: medians **2.44 / 0.96 / 0.72 / 0.53 / 0.58**, share ending above **90 / 46 / 28 / 21 / 35%**, group walls **0.13%** and **29.71%**. **The five are NOT a ladder** and no copy may say they are: the busiest fifth settles above the fourth. What holds is narrower and is what the page states, that the quietest fifth is the only group whose middle page ended above its own normal level and the only one where most pages did | The payoff, not the opening: once a reader has seen F1, F2 and F3, this is what ties them together | **High.** Nine of nine across three before-windows and three after-windows, worst p 0.0007, and the value above is the most conservative of them. Warning is not a fame proxy (log-log r 0.356) | Five density shapes stacked on the SAME axis beat 03 uses, medians marked, the pivot running through all five |
| **F5** | The file's own baseline window sits inside the event. For 10 pages it is so far inside that the gate records them as never having lifted at all, and for 6 of those, stepping the window back another fortnight finds no lower reading. | **45 of the 214** rows this site can compare the two windows on have a -21..-8 median more than **1.5x** their -30..-22 median: traffic is already climbing before the "before" is taken. **10 of the 218** rows the census could give a gate reading come out **under 1** on that reading, and every one of the ten is a scheduled event: FIFA World Cup **0.14**, WrestleMania 34 **0.41**, WrestleMania 33 **0.42**, Royal Rumble 2024 **0.62**, Tom Brady **0.82** (Super Bowl LV), 88th Academy Awards **0.86**, 92nd Academy Awards **0.93**, Peyton Manning **0.94** (Super Bowl 50), Beau Biden **0.96** (election week), 98th Academy Awards **0.99**. **CORRECTED at step 4:** that reading is `series[+7] / base`, so what falls below the window is **day seven**, NOT the record day — on this site's own window all ten record days read **2.67x to 122x** their level. The earlier claim is on the kill list. For **6 of the 10** the far window is not lower either (`climbing` is false), and for **3 of those 6 it reads higher**, though only **2 by a margin worth drawing**: the FIFA World Cup reads **552,584/day at days -30 to -22** against **397,613** at -21 to -8, and the 92nd Academy Awards is the same 1.39x; the 88th Academy Awards clears its near window by **2 views in 30,000**, which is a dead heat. Guarded in `pipeline/07` | The artefact is the finding, and it fails silently. A scheduled event that runs longer than a fortnight has no quiet window inside the month the file carries, so "how many times normal" cannot be computed for a World Cup at all, and the number you get instead is smaller than one | **High.** Directly counted, the list is exhaustive, the mechanism is visible in the series, and the two windows are drawn on the page | Small multiples of days -30 to +7 for the ten against the ten cleanest ambushes, on one shared scale of "share of its own record day", with both candidate windows shaded |
| **F6** | Record days cluster hard on Monday and avoid Tuesday. Ordinary reading on the same pages has a weekly rhythm too, and it is a twentieth of the size and a different shape. | Record days by weekday: Sun **30**, **Mon 52**, **Tue 19**, Wed 31, Thu 33, Fri 29, Sat 26, against **31.4** of each expected from how many of each weekday the window holds. Multiples **0.96 / 1.66 / 0.60 / 0.98 / 1.05 / 0.92 / 0.83**; chi-square **19.66**, df 6, **p = 0.0032**. Highest day to lowest is **2.74x**. Ordinary reading on these same 211 pages, over **33,914** readings on days +180 to +345, each divided by the median of the seven days centred on it so any trend divides out: **Sun 1.080, Mon 1.041, Tue 0.988, Wed 0.970, Thu 0.960, Fri 0.954, Sat 1.008**. Highest to lowest **1.132x**, and resampling whole pages puts that between **1.107 and 1.161**. The same index over days +100 to +345 agrees to within 0.01. So: the two weeks share neither their high day (Monday against Sunday) nor their low day (Tuesday against Friday); Monday IS a slightly busy reading day, by **4%**, against a **66%** excess in record days; and Tuesday, the emptiest record day in the file, is an entirely ordinary reading day at **0.988**. Guarded in `pipeline/08` | An invisible weekly rhythm in what the world turns to, an order of magnitude bigger than the rhythm in how much it reads | **High** for the counts, the test and the index. **No mechanism is verified and no causal wording may be used.** Dates are UTC, so a US Sunday evening is a UTC Monday, and the page says so | Two traces on one axis of "times expected", pivoted at 1, the week tiled so the rhythm reads as a wave |
| **F7** | 47 of the 220 biggest reading days are not one page having a day. They are two, three or four pages having the same day, and that is not the calendar. | **47 of 220** rows share their exact peak date, in **19** groups: **12** pairs, **5** triples, **2** groups of four. A null that holds each row's year, month and weekday fixed and redraws only which matching day it landed on expects **25.4** rows in a group; **47** were observed, and only 3 of **20,000** draws reached it. **p = 2.0e-4** | A record day is more often collective than it looks, and it beats the calendar's own lumpiness | **High.** The null was run at step 2 and is in `pipeline/02`. Promoted from medium | A day-strip: the window as a line, every record day a tick, groups drawn as a stack |
| **F8** | The record is drifting upward. | Median peak by full calendar year rises from **1,784,848** (2016) to **2,896,856** (2025); slope **61,079**/year, r **0.610** over 10 full years. Largest single day on record is **2025-09-10, Charlie Kirk, 14,954,133**, which is **1.51x** the next largest ever | Records are being broken, and recently | **Low.** 10 points, r 0.610, and Wikipedia's own total traffic moved over the window. Cannot be separated from platform growth with this extract. **Do not publish as a trend without a denominator this source does not have** | None yet. Not ready to rank higher |

---

## Tested and killed

- **"Attention has a half-life you can measure."** The 220 rows were selected by a gate that
  requires a spike still falling at day 7 (`QUALIFY`: alive 0.004, share 0.015, lift 1.5,
  falling 0.85). "Rose then decayed" is the definition of the set, so a universal decay curve
  fitted to it is fitting the gate. **Killed.** Any future decay-shape claim must be tested
  against `meta.disqualified` (222 rows that failed) or it repeats this.
- **"The biggest days are all celebrity deaths."** The top ten contains an election result, a
  papal election and a cathedral fire alongside the deaths, and the sub-1.0-lift block is
  sport and awards. Not clean enough to state as a proportion without a hand-labelled class
  column, which this dataset does not have and which source 2's 88 rows cannot supply
  without importing its chooser's selection. **Killed as a claim; the top-ten list stays as
  a table.**
- **"The record is drifting upward" (was F8).** Median peak by full calendar year rises from
  1,784,848 to 2,896,856, slope 61,079/yr, r 0.610 over 10 points. **Killed at step 2.** Every
  other finding on this site is a page measured against itself, so the qualification gate
  cancels. This one is a raw count compared across years, and the census carries no
  denominator for Wikipedia's own traffic over the window. The rise cannot be separated from
  the platform growing. Do not revive it without a total-pageviews series, which
  `source.md` records as not pulled.
- **"Meghan, Duchess of Sussex sat at a pre-event level of 1 a day."** Written into the F2 row at step 1b and **false as this site defines "before"**. The 1 is the census `base` field, the -21..-8 median, which the site abandoned at step 2. On the site's own window she has **no usable level at all** (only four readings above zero in days -30 to -22, so she is one of the six `noQuiet` rows), and her reading **the day before** is **2,202,300**. Her whole month before the wedding reads 1 to 9 views a day, which is a title that was a near-empty page until it was moved. **Corrected at step 4**, and the claim is nowhere on the site.
- **"On 10 rows the record day reads *below* the page's own recent level" (was the F5 headline).**
  Written at step 1 and carried through steps 2 and 3. **False.** It rests on the census `lift`
  field, and `research/source.md` documented that field as `peak / base` when
  `qualify()` in `src/lib/census.js` computes it as **`series[+7] / base`** — day seven, not the
  record day. On this site's own window every one of those ten record days reads **2.67x to 122x**
  its level (FIFA World Cup 2.67x, Peyton Manning 122x). **Killed and replaced at step 4** by the
  true and sharper sentence: it is DAY SEVEN that falls below a baseline taken from inside the
  event, which is the gate reading itself failing. Both files corrected; guarded in `pipeline/07`.

- **"The record-day weekday cycle runs against the reading cycle" (was the second half of F6).**
  Rested on "ordinary reading is flattest on Monday and highest on Tuesday (Tue 1.779, Mon 1.744,
  Fri 1.410)". Those numbers are reproducible — the mean of each reading over its page's median
  across days **-30 to -8** — and that estimator cannot carry the claim: the window runs into the
  event for 45 rows, it is not detrended, and a mean of ratios against a median is above 1 by
  construction, which is why all seven values sat near 1.7 instead of near 1. Recomputed on days
  +180 to +345 with the trend divided out, the reading week is **Sunday-high, Friday-low, and
  Tuesday is ordinary at 0.988**. **Killed at step 4.** What replaced it is stronger and is in F6:
  two weekly cycles that share neither their high day nor their low day, one **2.74x** and the
  other **1.13x**.

- **"Warning is just a proxy for how famous the page already was."** log(warning) against
  log(pre-event level), n=214, **r = 0.356**. Too weak to explain F1. **Killed as an
  objection**, which is what makes F1 publishable.

---

## Hunt list — checked

| Shape | Outcome |
|---|---|
| the reversal | **F4.** The direction of the aftermath flips with the warning |
| the thing that started or stopped, and the year | **Not found.** No step change in any series-level statistic at any year boundary. The only time trend is F7, which is confounded |
| the outlier that should not be there | **F5.** Ten rows whose record day is *below* their own recent level, six of them with no clean window anywhere |
| an invisible cycle | **F6.** Monday/Tuesday, at 2.74x, against a reading week that moves 1.13x and moves on different days |
| the personal hook | **Open.** 220 rows is too few for a birthday lookup to hit. Best candidate is letting a reader pick a page they know and see its own before/after against the two fans of F1. Needs an interaction, so it is a step-3 decision, not a finding |
| the widely believed thing the data contradicts | **F1 and F3.** "Big news leaves a mark" and "the internet moves on" are both contradicted, in opposite directions |
| **the artefact** | **F5.** The baseline window sitting inside the event, so the gate's own lift reading comes out under 1 for ten scheduled events |

---

## The ledger

| # | Finding | Payload | Section | Status |
|---|---|---|---|---|
| F1 | the world looks for about a month | `pipeline/01`, `03` | `#held` | **BUILT** |
| F2 | five views to seven and a half million | `pipeline/01`, `04` | `#arrival` | **BUILT** |
| F3 | almost half never go back down | `pipeline/01`, `05` | `#settle` | **BUILT** |
| F4 | the ones nobody saw coming keep the readers | `pipeline/02`, `06` | `#groups` | **BUILT** |
| F5 | the baseline window sits inside the event | `pipeline/01`, `07` | `#artefact` | **BUILT** |
| F6 | two weekly cycles, one twenty times the other | `pipeline/02`, `08` | `#weekday` | **BUILT** |
| F7 | 47 of 220 share their date, and beat the calendar | `pipeline/02`, `09` | `#shared` | **BUILT** |
| F8 | the record is drifting up | — | — | **KILLED at step 2**, see the kill list |

**Converted: 7 of 7.**

Every number above is asserted in `pipeline/`; `npm run data` exits 0 or nothing is built.
The guard has now failed **thirteen** of its own claims across steps 1, 2 and 4, and each was
corrected in this record rather than in the guard. The most useful failure was F5: the claim
"every one of the ten is a scheduled event that was already climbing" is **false**, and
chasing it produced the sharper finding that six of them have no clean window at all. Step 4
added two more: Meghan's "pre-event level of 1" (kill list) and a shape claim about beat 04
that was written from a reading of a sparkline rather than from the numbers, which asserted
that every group but the quietest peaks BELOW the pivot when the second fifth peaks at 1.008,
which is the pivot to any eye and to that kernel's width. The guard is now written at the
strength the plate is drawn at. One wording fix, not a guard failure: F2 said "five people
read his page" and `source.md` is explicit that a pageview is not a person, so the record and
the site both say views.
