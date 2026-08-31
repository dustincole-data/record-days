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

**Second pass run 2026-08-31 (step 5).** Every committed raw file was re-mined for what pass one missed: `data/census/top-days.json` including `meta.disqualified`, which pass one never opened at all; `data/census/renamed.json`, whose flag `pipeline/01` computes and nothing uses; `data/probe/results2.json`, `floor.json` and the three Python scripts; and `src/data/dataset.json` with `src/data/events.js`. It produced **seven new findings and killed five leads**, and one of the seven is a correction to a shipped section.

15 findings ranked, 8 leads killed. Every number is reproducible from the committed extracts
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
| **F9** | A year later, the world comes back. Not slowly, and not only on the pages you would guess — on nearly all of them, on the day itself. | Day **+365** reads a median **1.850x** the page's own surrounding level (the median of days +330 to +400, excluding the fortnight around the anniversary itself), bootstrap 95% **1.650 to 2.061**. **177 of 199** testable rows are above their own level on that one day; sign test **p = 1.4e-31**. **46.2%** are at or above **2x**. The same estimator at five matched control depths finds nothing: days **+200 / +240 / +270 / +300 / +330** read **0.965 / 1.013 / 0.965 / 0.998 / 0.967**, with **1.9 / 6.3 / 0.5 / 7.4 / 7.5%** above 2x against F9's **46.2%**. It is not the next edition of a scheduled event: the 13 scheduled rows read 2.513 and the other **186** read **1.841**, **89.2%** of them above their own level. Unmoved by dropping the four shape outliers of F12 and the eight moved titles of F13 (n 187, median **1.853**) | F1 says the world looks away after about a month. This says it comes back — and it is the only finding here a visitor can check against a date they remember | **High.** Five matched negative controls at the identical estimator, a sign test at 1e-31, a bootstrap interval that excludes 1, and stability under two contamination cuts. The decay is still running at day 365, which biases the neighbourhood median **up** and the ratio **down**, so the estimate is conservative | The year as a ring, all 199 rows on it at once, the anniversary week the only place the ink gathers. **Two years is not testable — the series stop at day 400** |
| **F10** | This site is called Attention Half-Life and the data says there is no half-life. How fast attention decays depends on how long you watch it. | Fitting both models to each page's excess over its own level: over days 1 to 60 the power law beats the exponential on **148 of 189** census rows (**78.3%**, median R2 **0.837** against **0.719**); over days 1 to 340 it wins on **181 of 196** (**92.3%**, **0.500** against **0.231**). On the **88 hand-picked probe events**, which carry **no shape gate at all** and count all agents rather than users, the power law wins on **66 of 88** (**75.0%**, **0.802** against **0.706**). The consequence is the finding: the fitted exponential half-life of the **same rows** is **9.62 days** read over a 60-day window and **94.97 days** read over a 340-day window, while the pages themselves halve in a median of **1 day**, reach a tenth in **3** and a twentieth in **5**. Read the half-life off the observed curve at those three depths and it is stable — **1.00, 0.90, 1.16 days**. Read it off the fitted exponential and it is 9.6 or 95.0, depending only on where you stopped looking | The phrase everyone reaches for is wrong, and the number it produces is a property of the analyst's window rather than of the event | **High**, and it is the one decay-shape claim the kill list permits: it is confirmed on the ungated probe, and the census gate selects for a clean fall by day 7, which if anything favours the exponential that the finding rejects. **My recomputation is what may be published** — the file's own `exp_r2` / `pow_r2` columns read 0.824 / 0.864 against my 0.706 / 0.802 and their fitting choices are documented nowhere in the repo | Two fitted curves through one page's real readings on a log-log ground, then the fitted half-life plotted against the length of the window it was read from: a line that ought to be flat and climbs instead |
| **F11** | On 22 May 2017, twenty-two pages had the biggest day in their history. They were Norway, the Bahamas, the Russian Empire, Prussia, Ancient Rome, Niue, the Serbian Despotate. And they agreed with each other to within one per cent. | The census ranked **442** rows in total — the **220** it kept and the **222** in `meta.disqualified`, which pass one never opened. **49** dates carry more than one of the 442, covering **139** rows against a null mean of **96.9** (**p < 5e-5**, the same year-month-weekday null F7 uses). The largest single date carries **22** against a null maximum of **6.96** (**p < 5e-5**). Every one of those 22 is a country or a historical state; every one was thrown out by the gate; their peaks run **1,054,667 to 1,066,589** — a largest-over-smallest of **1.0113x** and a coefficient of variation of **0.26%** — for **23,300,230** views in a day. Every other multi-page date in the 442 spreads at least **1.14x**, median **2.24x**, and the 19 genuine shared-date groups the site already draws spread a median **1.59x**. A second, smaller one sits at **2018-01-18**: JSON Web Token, HTTP cookie, Access token, Session token, spread **1.50x** | Twenty-two unrelated pages reading within 1% of each other is not twenty-two audiences. It is one process, and it is visible in the file without knowing anything about Wikipedia | **High.** Entirely internal, the tightness is the proof rather than a judgement, and the null is the one already guarded in `pipeline/02` | The 442 on a date axis with the 222 cut rows restored in a second ink, so 2017-05-22 stands up as a single bar 22 deep. **Cut rows carry no `series`** and can never be drawn over time |
| **F12** | Four of the 220 have a shape no readership has: they stop dead. One page ran nineteen days between 128,405 and 2,372,030 views and then read 157. | The snap: the last day a page was still read at event scale (above **20x** its own level **and** at least **10,000** views) against the day after it. Across **211** testable rows the median snap is **1.77** and the 90th percentile **4.89**. Four rows sit outside that field — `Index_(statistics)` **818x**, `Cook's_Country` **204x**, `Question_mark` **82x**, `Dulce_María` **40x** — and the next row down is `Charles,_Prince_of_Wales` at **11.5x**. `Index_(statistics)` sat at **44** views a day, held 19 straight days between 128,405 and 2,372,030, and read **157** the next day. `Cook's_Country` sat at **97**, read **57** on day -2 and **833,826** on day -1, and **876** on day +15. A second and independent signature — a day at least **10x below both** its neighbours where both neighbours are above 5,000 — picks out `Dulce_María` (4 such days), `Question_mark` (3), `Cook's_Country` (1) and **nobody else in the file**: Question_mark reads **522,905** on day 1, **1,142** on day 2 and **638,607** on day 3. **They do not move anything already shipped**: F1's median duration is **28** with and without them, and F3's share ending above goes **43.9% to 43.8%** | `source.md` predicted exactly one such row and could not name it. There are four, they are named, and the largest single day in the whole record belongs to the same family | **High** for the shape, which is measured twice by two unrelated tests that agree on the same tiny set. **The cause is not identifiable from this extract** and no copy may name one — an automated crawl and a redirect pointed at a title produce the same rectangle here, and nothing in the census separates them | Four rectangles drawn against the decay curves of the other 216 on one shared level-relative scale, so a flat top and a vertical drop read against a field of curves |
| **F13** | A page that was renamed looks exactly like a page the world abandoned, and the two biggest fallers on this site are both renames. | `data/census/renamed.json` holds **8** moved titles; `pipeline/01` computes a `renamed` flag for them and nothing downstream reads it. Of the **196** rows with a settle ratio, those 8 rank **1, 2, 11, 16, 19, 50, 56, 116** among the fallers — median rank **17.5** against **98.5** expected, permutation **p = 0.00026** over 200,000 draws. Their median settle is **0.1541** against **0.9075** for the other 188, a **5.89x** gap. **The two biggest fallers in the file are both moves**: `J._D._Vance` **0.0129** (level 11,423, a year later 147) and `Charles,_Prince_of_Wales` **0.0218** (level 11,563, a year later 252) — and **both are named in the F3 row above and drawn on the shipped `#settle` plate**. The headline survives the cut and is slightly stronger without them: share ending above goes **43.9% to 45.2%** (n 196 to 188), quartiles **0.3692 / 1.8201** to **0.4347 / 1.8888**, above 2x **46**, above 5x **14**. Three of the 8 old titles have their **new** title in the file as a separate row with its own separate record day — `Electoral_College_(United_States)` 2016-11-09 against `United_States_Electoral_College` 2020-11-04, `United_States_presidential_election,_2016` 2016-11-09 against `2016_United_States_presidential_election` 2020-11-04, and `Charles,_Prince_of_Wales` 2022-09-08 against `Charles_III` 2022-09-09 — with a **third** Charles, `Charles,_King_of_the_United_Kingdom`, in the cut list on 2022-09-08. So the file counts one subject as two pages and the older half is guaranteed to look abandoned | The file's own biggest collapses are a filing decision rather than a readership, and the same person is in it three times inside two days | **High.** Directly counted, the mechanism is already stated in `source.md`, and the permutation test is exact. **This is a correction to a shipped section, not only a finding** | The eight moves as before-and-after pairs on the `#settle` axis, each drawn against where its new title's own row sits. Whatever step 4 chooses, `#settle` must stop naming these two as fallers |
| **F14** | Record days pile into February and avoid May. | By month, against how many of each the window holds: **February 33 against 16.8 expected (1.96x)**, **May 7 against 18.5 (0.38x)**, highest to lowest **4.71x**; chi-square **29.92**, df 11, simulated **p = 0.00176**. Both extreme cells survive a Bonferroni correction across all twelve months on their own Poisson tails — February **3.8e-3**, May **2.6e-2**. February is not one bad year: across the eleven it carries 4, 3, 2, 2, 4, 2, 4, 1, 2, 3 and 6 | A year is not flat, and the emptiest month is not the one anyone would guess | **Medium, and the weakest of the seven.** The omnibus is a pre-specified twelve-cell partition and it holds. **Nothing finer than a month may be claimed** — see the kill list: the densest fortnight fails multiple-comparison correction at p 0.056 and the emptiest fails outright at p 0.24. No mechanism is identifiable from this extract and none may be named | Twelve cells against their own expectation, pivoted at 1. It would be the second cyclic plate on a site that already has `#weekday`, and step 4 should weigh that before spending a section on it |
| **F15** | A record is one day and the day beside it, and how much is beside it varies more than the record does. | The second-biggest day of a page's own series is a median **41.2%** of the biggest, and it is **adjacent** to it on **209 of 220** rows. **20** rows have a second day within 10% of the first — Sinéad O'Connor **100.0%**, the 2022 Russian invasion **99.5%**, Mac Miller **99.2%** — and **80** have one under a third: Neil Gorsuch **8.2%**, The Weeknd **12.6%**, Rihanna **12.6%**. Separately, **24 of 220** rows have a day before at 50% or more of the record day and **40 of 220** have a day before larger than the day after, so for those the event's own centre of mass sits on the wrong side of the date it is filed under | Whether a record was a night or a weekend is a real difference, and the file does not carry it anywhere | **Medium** for the numbers, **low** for the claim: it sits close to what `#arrival` already draws, which is the day before against the day itself on one axis | None proposed. Ranked so that it is not mined a third time; step 4 should probably fold the 24-and-40 counts into `#arrival`'s method tail rather than spend a section |

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

### Killed on the second pass, 2026-08-31

- **"Record days cluster in Oscars week, election week and Super Bowl week."** The three densest
  fortnights in the calendar are **Feb 19 - Mar 3 (20 rows against 8.3 expected)**, **Nov 3 - Nov 16
  (17 against 8.0)** and **Jan 28 - Feb 10 (18 against 8.7)**, and each looks overwhelming on its own
  p-value. **All three windows were chosen by looking at the data**, and against a null that redraws
  every row's day while holding its year, month and weekday, the **densest fortnight anywhere in the
  year** is 20 against a null maximum of 16.6 — **p = 0.056**. **Killed.** The seven-day version
  survives (15 against 10.7, p = 0.0075) but names no window a reader would recognise. Nothing finer
  than the month of F14 may be claimed, and no copy may name a broadcast.
- **"In eleven years, the first fortnight of May produced one record day."** True as counted, and
  **not a finding**: against the same null the **emptiest fortnight anywhere in the year** is
  **p = 0.24**, and at seven days p = 0.94. **Killed.** The May shortfall survives only at month
  resolution, inside F14.
- **"The Monday excess is a UTC boundary artefact — American Sunday evenings filed as Mondays."**
  The mechanism is real and `source.md` names it, but it does not produce F6. **24 of 220** rows have
  a day before at 50% or more of the record day and they are spread across the week (Sun 7, Mon 5,
  Tue 4, Wed 3, Thu 1, Fri 3, Sat 1). Moving every one of them back a day leaves Monday at **51** and
  chi-square at **19.53** against the **19.66** as dated; at a 80% threshold Monday goes **up** to 53
  and chi-square to 20.82. **Killed as an objection**, which makes F6 stronger than it was.
- **"The four shape outliers of F12 are contaminating the shipped beats."** F1's median duration is
  **28** with them and **28** without; F3's share ending above their own level is **43.9%** with and
  **43.8%** without. **Killed.** F12 can be built as its own section without reopening anything.
- **`res365`, `res180` and everything in `data/probe/floor.json` are unusable as published numbers.**
  `probe2.py:128` computes `res365` as `resid(335,366)`, a mean residual over days 335 to 365 against
  baseline — a *level* measure, not an anniversary bump, so it neither supports nor contradicts F9.
  More decisively, the committed probe series stop at day **60 to 85**, so **not one of those columns
  can be reproduced from a committed file**, which the standards forbid publishing. **Killed as
  evidence.** Recorded because `floor.json` disagrees loudly with F3 and someone will find it again:
  its `yr_later / clean_base` is above 1 on **71.9% of its 57 rows** (median 1.399) against F3's
  **43.9%**. Different window, different agent basis, different hand-picked set, and an undocumented
  `clean_base`. It does not overturn F3; it does show F3's share is estimator-dependent, and F3
  already names its window and basis on the page.

## Hunt list — checked

| Shape | Outcome |
|---|---|
| the reversal | **F4.** The direction of the aftermath flips with the warning |
| the thing that started or stopped, and the year | **F12, second pass.** Not a year boundary but a page boundary: four rows that stop dead in a single day, and the date each stops is exact. The original search stands — no step change in any series-level statistic at any year boundary, and the only time trend is F8, which is confounded |
| the outlier that should not be there | **F5** and, on the second pass, **F11** — a single day carrying 22 pages that agree to within 1%, which is the largest outlier in the whole record and sat unopened in `meta.disqualified` |
| an invisible cycle | **F6** (weekly), **F9** (annual, and much the largest of the three), **F14** (monthly, weakest). Monday/Tuesday at 2.74x against a reading week that moves 1.13x on different days; the anniversary at 1.85x against five flat controls; February against May at 4.71x |
| the personal hook | **Open.** 220 rows is too few for a birthday lookup to hit. Best candidate is letting a reader pick a page they know and see its own before/after against the two fans of F1. Needs an interaction, so it is a step-3 decision, not a finding. **Second pass: F9 supplies the finding a hook would sit on** — pick a page whose date you remember and see whether the world came back a year later |
| the widely believed thing the data contradicts | **F1 and F3.** "Big news leaves a mark" and "the internet moves on" are both contradicted, in opposite directions |
| **the artefact** | Four of them now. **F5** the baseline window sitting inside the event; **F11** the gate catching a 22-page crawl; **F12** the same gate missing four rectangles; **F13** a page move reading as abandonment, which put two false extremes on a shipped plate |

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
| F9 | a year later, the world comes back | — | — | **RANKED**, second pass. Highest of the seven |
| F10 | there is no half-life | — | — | **RANKED**, second pass |
| F11 | 22 pages, one day, within 1% | — | — | **RANKED**, second pass |
| F12 | four rows that stop dead | — | — | **RANKED**, second pass |
| F13 | a rename reads as abandonment | — | — | **RANKED**, second pass. **Also a correction owed to `#settle`** |
| F14 | February against May | — | — | **RANKED low**, second pass |
| F15 | the width of a record | — | — | **RANKED low**, second pass. No mark proposed |

**Converted: 7 of 14.** Seven built, seven ranked and unbuilt, one killed (F8). Nothing was built
this session and nothing shipped was edited; `npm run data` is unchanged at **302 checks, exits 0**.

**What step 4 owes, in order.** F13 first, because it is not a new section but a **false pair of names
on a plate that is already live**: `#settle` prints "J. D. Vance x0.0129" and "Charles, Prince of Wales
x0.022" as the two rows that fell furthest, and both are page moves. The headline survives the cut and
improves (43.9% to 45.2%), so the fix is to the named extremes and to F3's row above, not to the
finding. Then F9, F10, F11 and F12 as sections. F14 and F15 are ranked so nobody mines them a third
time and should probably not be spent on.

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
