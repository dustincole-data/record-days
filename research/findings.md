# Attention Half-Life — findings

**Premise:** These are the 220 biggest days in Wikipedia's history. For each one: who you
were the day before, how big the day was, how long the world looked, and who you are now.

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
| **F1** | The world looks at something for about a month. It looked at the World Cup final for one day and at Jerry Springer for a year. | Days until a page is back under twice its own quiet level and stays there a week, measured off days -30..-22: **median 28**, range **1 to 340**, n=179. **16** rows are done inside a week; **27** hold past 100 days. Shortest: FIFA World Cup **1 day**, WrestleMania 33 and 34 **2**, 88th Academy Awards **3**, Tom Brady **7**. Longest: Jerry Springer **340**, Kelly Preston **330**, Naya Rivera **327**, Sushant Singh Rajput **227** | Everyone has a sense that news fades, nobody has a number for it. "A month" is the number, and the extremes are a day and a year | **High** for the median and the range. **Medium** for the shortest rows: a month-long tournament has no clean pre-window inside 30 days, so the World Cup's 1 day is partly its own baseline. Say so on the page | A single duration axis, 1 to 340 days, every row a mark, named. The scheduled events pile against the left wall |
| **F2** | Five people read his page the day before. Seven and a half million read it the next. | Pope Leo XIV: **5** readings 2025-05-07, **7,538,267** on 2025-05-08. **10** of the 220 were read fewer than **1,000** times the day before their record day: Damar Hamlin **53**, Prince Harry **72**, Francis Scott Key Bridge **79**, the 2022 Russian invasion of Ukraine **306**, Christina Grimmie **468**. Meghan, Duchess of Sussex sat at a pre-event level of **1** a day against a peak of **2,301,231** | No setup, no metric, no domain. Two numbers and a name everyone knows | **High.** Direct read of two cells | A log strip from 1 to 10 million with the day-before and the day joined. The gap is the finding |
| **F3** | Almost half of them never go back down. | Against one before-window for the whole site (days -30 to -22), of **196** rows with a usable level and a full year after, **86 (43.9%)** settle **above** where they started; **46** above 2x, **14** above 5x. Tasuku Honjo **x507.9**. Imane Khelif **x189.4**. Against them, J. D. Vance **x0.013**, Charles, Prince of Wales **x0.022**, the United States Electoral College **x0.033** | "The internet moves on" is the received wisdom and it is wrong for half of these | **High** for the rows and the share; **medium** as a general claim, because the 220 are a gate not a sample | A before/after dumbbell per page on a log axis, sorted by ratio, with the line where the two halves swap |
| **F4** | The ones nobody saw coming are the ones that keep the readers. | On the site's one before-window: day before under 2% of the peak, **91** rows, settle **1.30x**, **60%** end higher. Over 25%, **43** rows, settle **0.55x**, **35%** higher. Mann-Whitney z **3.587**, p **3.4e-4**. The same split on duration runs **31 days** for the calm rows against **21** for those already climbing before day -21 | The payoff, not the opening: once a reader has seen F1, F2 and F3, this is what ties them together | **High.** Nine of nine across three before-windows and three after-windows, worst p 0.0007, and the value above is the most conservative of them. Warning is not a fame proxy (log-log r 0.356) | Two fans of slope lines from before-level to after-level on one log scale, pointing opposite ways |
| **F5** | For 45 rows the "before" window is inside the event. On 10 the record day reads *below* the page's own recent level, and for **6 of those there is no clean before anywhere in the file**. | **45 of the 214** testable rows have a -21..-8 median more than **1.5x** their -30..-22 median. **22** rows have lift under 1.5; **10** have lift **under 1.0**, and the whole list is scheduled: FIFA World Cup **0.14x**, WrestleMania 34 **0.41x**, WrestleMania 33 **0.42x**, Royal Rumble 2024 **0.62x**, Tom Brady **0.82x** (Super Bowl LV), 88th Academy Awards **0.86x**, 92nd Academy Awards **0.93x**, Peyton Manning **0.94x** (Super Bowl 50), Beau Biden **0.96x** (election week), 98th Academy Awards **0.99x**. **Six of the ten are not even flagged as climbing**, because the *far* window is inside the event too: the FIFA World Cup reads **552,584/day at days -30 to -22** against **397,613** at -21 to -8, so it is *higher* further from the final. Two further rows have no lift at all, their pre-event level being **0** | The artefact is the finding, and it fails silently. A scheduled event that runs longer than a month has no quiet window inside the 30 days the file carries, so "how many times normal" cannot be computed at all for a World Cup, and the number you get instead is smaller than one | **High.** Directly counted, the list is exhaustive, and the mechanism is visible in the series | Small multiples of the -30..0 run-up for the ten sub-1.0 rows against ten ambushes, on one shared scale, with the baseline window shaded so you can see it sitting inside the event |
| **F6** | Record days cluster on Monday and avoid Tuesday, and that is not how Wikipedia is read. | Monday **52** record days against **31.4** expected, ratio **1.66**. Tuesday **19**, ratio **0.60**. Chi-square **19.66**, df 6, p ≈ **0.003**. But ordinary reading on these same pages is *flattest* on Monday and *highest* on Tuesday (Tue 1.779, Mon 1.744, Fri 1.410), so the record-day cycle runs against the reading cycle | An invisible weekly rhythm in what the world turns to, and it is the opposite of the rhythm in how much it reads | **Medium.** The count and the test are solid. No mechanism is verified, and no causal wording may be used | A seven-spoke radial: record days out, ordinary reading in, on one circle so the inversion is a shape |
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
- **"Warning is just a proxy for how famous the page already was."** log(warning) against
  log(pre-event level), n=214, **r = 0.356**. Too weak to explain F1. **Killed as an
  objection**, which is what makes F1 publishable.

---

## Hunt list — checked

| Shape | Outcome |
|---|---|
| the reversal | **F1.** The direction of the aftermath flips with the warning |
| the thing that started or stopped, and the year | **Not found.** No step change in any series-level statistic at any year boundary. The only time trend is F7, which is confounded |
| the outlier that should not be there | **F3.** Six rows whose record day is *below* their own recent level |
| an invisible cycle | **F4.** Monday/Tuesday, and it runs against the reading cycle |
| the personal hook | **Open.** 220 rows is too few for a birthday lookup to hit. Best candidate is letting a reader pick a page they know and see its own before/after against the two fans of F1. Needs an interaction, so it is a step-3 decision, not a finding |
| the widely believed thing the data contradicts | **F1 and F5.** "Big news leaves a mark" and "the internet moves on" are both contradicted, in opposite directions |
| **the artefact** | **F3.** The baseline window sitting inside the event, and the lift metric silently inverting on scheduled events |

---

## The ledger

| # | Finding | Payload | Section | Status |
|---|---|---|---|---|
| F1 | the world looks for about a month | `pipeline/01` | — | **guarded** |
| F2 | five readers to seven and a half million | `pipeline/01` | — | **guarded** |
| F3 | almost half never go back down | — | `pipeline/01` | **guarded** |
| F4 | the ones nobody saw coming keep the readers | `pipeline/02` | — | **guarded** |
| F5 | no clean before anywhere in the file | `pipeline/01` | — | **guarded** |
| F6 | Monday, against the reading cycle | `pipeline/02` | — | **guarded** |
| F7 | 47 of 220 share their date, and beat the calendar | `pipeline/02` | — | **guarded** |
| F8 | the record is drifting up | — | — | **KILLED at step 2**, see the kill list |

**Converted: 0 of 8.**

Every number above is asserted in `pipeline/`; `npm run data` exits 0 or nothing is built.
The guard has now failed **nine** of its own claims across step 1 and step 2, and each was
corrected in this record rather than in the guard. The most useful failure was F5: the claim
"every one of the ten is a scheduled event that was already climbing" is **false**, and
chasing it produced the sharper finding that six of them have no clean window at all.
