# Attention Half-Life — findings

**Premise:** The Wikipedia pages nobody saw coming are the ones that keep their readers. The
ones everybody was waiting for hand them all back.

7 findings ranked, 3 leads killed. Every number is reproducible from the committed extracts
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
| **F1** | The pages nobody saw coming keep their readers. The ones everybody was waiting for give them back. | Warning under 2% of the peak: **107 of 220** rows, settle ratio median **1.33**, **65%** end higher than they started. Warning over 25%: **48** rows, median **0.49**, **30%** end higher. Mann-Whitney z **4.397**, p **1.1e-5** | It inverts the obvious guess. The biggest, most-anticipated news days leave nothing behind; the ambushes permanently change what a page is worth | **High.** Holds across 3 before-windows x 3 after-windows, 9 of 9 at p ≤ 0.0007. Survives dropping every row already climbing before day -21, which retains 87 ambush and 28 warned rows (z 3.089, p 0.0020). Warning is only weakly tied to prior fame (log-log r 0.356), so it is not a fame proxy | Slope pairs: every row a line from its own before-level to its own after-level, on one log scale, split into the two warning classes. The two fans point opposite ways |
| **F2** | A page can go from five readers to seven and a half million in one day. | Warning spans **0.00% to 153.9%**, median **2.4%**. Pope Leo XIV: **5** readings on 2025-05-07, **7,538,267** on 2025-05-08. Meghan, Duchess of Sussex: pre-event level of **1** a day, peak **2,301,231** (lift **136,165x**). Lift across the 218 rows that have one spans **0.14x to 136,165x**, median **11.8x** | The scale is the story and needs no domain knowledge at all. Six orders of magnitude in one column | **High.** Direct read of two columns, no modelling | A single log strip, 1 to 10 million, every row a mark at its day-before reading and its peak. The gap between the two is the whole finding |
| **F3** | For 45 rows the "before" window is inside the event, and on 10 of them the record day reads *below* the page's own recent level. Every one of those 10 is a scheduled event. | **45 of the 214** rows that can be tested have a -21..-8 median more than **1.5x** their -30..-22 median. **22** rows have lift under 1.5; **10** have lift **under 1.0**, and the whole list is scheduled: FIFA World Cup **0.14x** (base 397,613, mid-tournament), WrestleMania 34 **0.41x**, WrestleMania 33 **0.42x**, Royal Rumble 2024 **0.62x**, Tom Brady **0.82x** (Super Bowl LV), 88th Academy Awards **0.86x**, 92nd Academy Awards **0.93x**, Peyton Manning **0.94x** (Super Bowl 50), Beau Biden **0.96x** (election week), 98th Academy Awards **0.99x**. Two further rows have no lift at all, their pre-event level being **0** | The artefact is the finding: a multi-day scheduled event poisons its own baseline, so the standard "how many times normal" number is meaningless for exactly the events everyone can name | **High.** Directly counted, the list is exhaustive, and the mechanism is visible in the series | Small multiples of the -30..0 run-up for the ten sub-1.0 rows against ten ambushes, on one shared scale, with the baseline window shaded so you can see it sitting inside the event |
| **F4** | Record days cluster on Monday and avoid Tuesday, and that is not how Wikipedia is read. | Monday **52** record days against **31.4** expected, ratio **1.66**. Tuesday **19**, ratio **0.60**. Chi-square **19.66**, df 6, p ≈ **0.003**. But ordinary reading on these same pages is *flattest* on Monday and *highest* on Tuesday (Tue 1.779, Mon 1.744, Fri 1.410), so the record-day cycle runs against the reading cycle | An invisible weekly rhythm in what the world turns to, and it is the opposite of the rhythm in how much it reads | **Medium.** The count and the test are solid. No mechanism is verified, and no causal wording may be used | A seven-spoke radial: record days out, ordinary reading in, on one circle so the inversion is a shape |
| **F5** | Half the pages never go back down. One went up five hundredfold and stayed. | Of **196** rows with a usable before-level and a full year after, **90 (45.9%)** settle **above** where they started; **42** above 2x, **14** above 5x. Tasuku Honjo **100/day → 50,281/day** (x502.8). Imane Khelif **26 → 3,789** (x145.7). Pete Hegseth **537 → 20,504** (x38.2). Against that, J. D. Vance **18,241 → 147** (x0.01) | "The internet moves on" is the received wisdom, and for half of these it is simply false | **High** for the individual rows and the share; **medium** as a general claim, because the 220 are a gate not a sample | A before/after dumbbell per page on a log axis, sorted by ratio, with the crossing point where the two halves swap |
| **F6** | 47 of the 220 biggest reading days are not one page having a day. They are two, three or four pages having the same day. | **47 of 220** rows share their exact peak date with another row, in **19** groups: **12** pairs, **5** triples, **2** groups of four | The biggest days on record are mostly collective, not individual | **Medium.** The count is exact. The claim needs a null model over year, month and weekday before it can say the clustering is more than the calendar allows. Not yet run | A day-strip: the window as a line, every record day a tick, groups drawn as a stack |
| **F7** | The record is drifting upward. | Median peak by full calendar year rises from **1,784,848** (2016) to **2,896,856** (2025); slope **61,079**/year, r **0.610** over 10 full years. Largest single day on record is **2025-09-10, Charlie Kirk, 14,954,133**, which is **1.51x** the next largest ever | Records are being broken, and recently | **Low.** 10 points, r 0.610, and Wikipedia's own total traffic moved over the window. Cannot be separated from platform growth with this extract. **Do not publish as a trend without a denominator this source does not have** | None yet. Not ready to rank higher |

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
| F1 | no warning keeps the readers | — | — | unbuilt |
| F2 | five readers to seven million | — | — | unbuilt |
| F3 | the before-window inside the event | — | — | unbuilt |
| F4 | Monday, against the reading cycle | — | — | unbuilt |
| F5 | half never go back down | — | — | unbuilt |
| F6 | 47 of 220 share their date | — | — | unbuilt |
| F7 | the record is drifting up | — | — | unbuilt, low confidence, may be killed at step 2 |

**Converted: 0 of 7.**
