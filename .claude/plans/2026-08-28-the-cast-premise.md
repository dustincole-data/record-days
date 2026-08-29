# The Cast - premise, definitions, and every number

Third premise for Attention_Half_Life, picked 2026-08-28 after Half-Life (dead by
construction 8/27) and The Anniversary (evidenced, built, killed on preference 8/28).
Do not re-pitch either. Do not read `2026-08-27-anniversary-*.md`.

Source: `data/census/top-days.json` only. 220 rows, each a median 431 daily values,
day -30 to +400 around its own peak. Users only, never mixed with `data/probe`
(all agents). 8 renamed titles in `data/census/renamed.json`. Validity floor 20
readers a day. No network run. Every figure below was computed from the file.

## The claim

A record-breaking reading day does not happen to one page. It happens to a small
cast of pages at once, and the cast is still moving together a year later. Pages
that shared a date by coincidence are not.

The two halves are separate findings and each has its own control.

## Why this is not the qualification gate talking

`qualify()` in `src/lib/census.js` reads exactly four things off ONE row: day 0,
day 3, day 7, and the median of days -21..-8. It is blind to the calendar date and
blind to every other row. It therefore cannot manufacture a shared date, and it
cannot manufacture a correlation between two rows measured after their decay shape
has been removed. This is the test premise 1 failed and this one passes.

## Part A - the cast exists

Definition: two rows are in the same cast if their peak dates are the same calendar
day. Single-linkage at radius 0.

- 47 of 220 rows (21.4%) share their exact peak date with at least one other row.
- 19 groups. Sizes: two of 4, five of 3, twelve of 2.
- Strong null: redraw every row's date inside its own year-month AND on the same
  weekday, 20,000 draws. Holds both the record's shape over time and the Monday
  skew (Part D) fixed. Expected 25.3 rows in a group (11.5%). p < 5e-5.
- Gate-free arm: the 222 rows the gate REJECTED, after mechanically dropping any
  date carrying 5 or more rejects (only 2017-05-22 qualifies, 22 machine-traffic
  pages: Norway, Prussia, Ancient Rome, Grenada). 31 of 200 = 15.5% vs null 19.3.
  p = 0.016. The clustering is present on both sides of the gate.
- Radius 1 (peaks a day apart) survives on the kept 220 (74 rows, p < 5e-5) but
  NOT on the rejected rows alone (p = 0.44). Claim the exact day, not plus or minus one.

The 19 groups, largest page first:

| date | n | pages |
|---|---|---|
| 2016-11-09 | 4 | Donald_Trump 6,125,896 / United_States_presidential_election,_2016 2,363,506 / Electoral_College_(United_States) 1,924,353 / Melania_Trump 1,725,038 |
| 2020-11-08 | 4 | Kamala_Harris 6,591,413 / Joe_Biden 3,826,893 / Jill_Biden 1,707,752 / Beau_Biden 1,648,352 |
| 2022-02-24 | 3 | Ukraine 2,373,594 / 2022_Russian_invasion_of_Ukraine 2,095,287 / Vladimir_Putin 1,506,221 |
| 2022-09-08 | 3 | Elizabeth_II 8,399,082 / Operation_London_Bridge 2,101,848 / Charles,_Prince_of_Wales 1,509,859 |
| 2022-12-18 | 3 | Lionel_Messi 3,086,080 / Kylian_Mbappe 2,216,858 / FIFA_World_Cup 1,473,099 |
| 2023-01-13 | 3 | Lisa_Marie_Presley 4,601,992 / Priscilla_Presley 1,841,442 / Riley_Keough 1,681,817 |
| 2025-03-03 | 3 | Anora 2,653,714 / Mikey_Madison 1,844,820 / 97th_Academy_Awards 1,463,511 |
| 2016-02-29 | 2 | Leonardo_DiCaprio 1,750,680 / 88th_Academy_Awards 1,473,868 |
| 2016-04-21 | 2 | Prince_(musician) 5,808,147 / Chyna 1,480,312 |
| 2018-08-16 | 2 | Aretha_Franklin 2,040,086 / Atal_Bihari_Vajpayee 1,908,766 |
| 2020-02-03 | 2 | Shakira 2,573,167 / Jennifer_Lopez 1,589,945 |
| 2020-11-04 | 2 | United_States_Electoral_College 4,986,159 / 2016_United_States_presidential_election 4,831,902 |
| 2021-02-08 | 2 | Tom_Brady 2,540,273 / The_Weeknd 1,595,847 |
| 2021-04-09 | 2 | Prince_Philip,_Duke_of_Edinburgh 3,872,125 / DMX_(rapper) 3,054,887 |
| 2022-03-28 | 2 | Jada_Pinkett_Smith 1,761,821 / Will_Smith 1,474,219 |
| 2023-03-13 | 2 | Everything_Everywhere_All_at_Once 1,938,448 / 95th_Academy_Awards 1,516,387 |
| 2024-11-06 | 2 | 2024_United_States_presidential_election 4,260,085 / 2020_United_States_presidential_election 3,935,277 |
| 2024-11-16 | 2 | Jake_Paul 2,273,277 / Mike_Tyson 2,226,899 |
| 2026-02-20 | 2 | Eric_Dane 2,767,351 / Alysa_Liu 1,521,808 |

Supporting gradient, weaker: the more pages a date carries, the bigger its biggest
page. Solo dates median 2,092,734; two-page 2,556,720; three 3,086,080; four
6,358,655. Pearson on log10(biggest) vs count r = 0.277, t = 4.0, n = 192 dates.
On the gate-free 442 this falls to r = 0.072, t = 1.4, because the top-700 magnitude
cut is itself a threshold on this quantity. Do not lead with it.

## Part B - the cast stays bound

Definition, fixed here so the port is mechanical:

1. Drop the 8 renamed titles; their aftermath measures the move, not the reading.
2. For each row take log(views) over days +30..+340 from its own peak, requiring
   250 present readings. Days 1 to 29 are excluded so the fall is not in the window.
3. Detrend: subtract a 29-day centred rolling median (halfwidth 14, at least 20
   readings in the window). This removes the shared decay shape, which is the one
   thing the gate does select for.
4. Key each residual by CALENDAR DATE, not day offset.
5. Correlate two rows over their shared calendar dates. Require 150 shared days.

196 of 220 rows usable.

| pair kind | n pairs | median r |
|---|---|---|
| peaks on the same day | 30 | **0.567** |
| peaks 1 to 14 days apart | 145 | 0.066 |
| peaks more than 14 days apart | 1,439 | 0.026 |
| more than 14 days apart, 250+ shared days | 388 | 0.012 |

- 23 of the 30 same-day pairs sit above the 95th percentile of the far pairs (0.328).
- Permutation on the same-day median against the pooled pair distribution, 20,000
  draws: p < 5e-5.
- The control pairs are calendar-matched by construction: the 150-shared-days
  requirement means every control pair overlaps the same stretch of real dates.
  So sitewide daily wobble is already controlled and sits at r = 0.03.
- The 1-to-14-day bucket at 0.066 rules out "same news season". The tie is specific
  to the exact day.

Kill control that was run and survived: remove every pair whose titles share a
token (Presley x3, Biden x2, "presidential election" x2, stoplist the/of/and/in/
a/united/states plus bare years). Median r falls 0.567 to 0.396 over 22 pairs.
Still an order of magnitude above the far pairs. Not a double-counted subject.

Per-constellation median r, one value per group (17 groups measurable, median of
medians 0.407):

    0.884  Lisa_Marie_Presley + Priscilla_Presley + Riley_Keough
    0.817  United_States_Electoral_College + 2016_United_States_presidential_election
    0.816  Elizabeth_II + Operation_London_Bridge
    0.714  Donald_Trump + Melania_Trump
    0.698  Jada_Pinkett_Smith + Will_Smith
    0.690  Kamala_Harris + Joe_Biden + Jill_Biden + Beau_Biden
    0.624  2024_United_States_presidential_election + 2020_United_States_presidential_election
    0.456  Anora + Mikey_Madison + 97th_Academy_Awards
    0.407  Ukraine + 2022_Russian_invasion_of_Ukraine + Vladimir_Putin
    0.386  Jake_Paul + Mike_Tyson
    0.354  Everything_Everywhere_All_at_Once + 95th_Academy_Awards
    0.341  Leonardo_DiCaprio + 88th_Academy_Awards
    0.303  Prince_(musician) + Chyna
    0.253  Lionel_Messi + Kylian_Mbappe + FIFA_World_Cup
    0.251  Shakira + Jennifer_Lopez
    0.069  Aretha_Franklin + Atal_Bihari_Vajpayee
    0.046  Tom_Brady + The_Weeknd

## Part C - the built-in negative control

The bottom of that list is the whole argument. Two pairs shared a date and nothing
else:

- Aretha Franklin and Atal Bihari Vajpayee died on 2018-08-16. r = 0.069.
- Tom Brady and The Weeknd shared Super Bowl LV on 2021-02-08, one event, two
  unrelated subjects. r = 0.046.

Both sit inside the far-pair distribution. The statistic separates a cast from a
coincidence without being told which is which. This is the finding's own control
and it is also the best story beat on the page.

## Part D - the second chapter (independent machinery, no overlap with A/B)

Split the 220 by whether the world had notice. `lead` = consecutive days before the
peak already running at 2x the row's own base, counted back from day -1 (already
ported, `src/lib/findings.js`). ambush = 0 days. ramp = 3 or more. Applied to the
214 rows with base 20 or more and a positive day -1.

|  | ambush | ramp |
|---|---|---|
| n | 90 | 70 |
| weekday vs uniform | chi2 6.76 df6, p = 0.34 | chi2 15.40 df6, p = 0.017 |
| month vs uniform | chi2 16.13 df11, p = 0.14 | chi2 44.17 df11, p = 6.8e-6 |
| Monday share | 10.0% | 28.6% |

Monday, ambush vs ramp, 2x2 with Yates: chi2 10.45 df1, p = 0.0012.
Ramp months: February 13, November 16; May 0, March 1.

The weekday baseline is built from the file, not assumed. Pool every row's quiet
stretch (days 100..340), normalise each reading by that row's own quiet median,
group by calendar weekday, take the median. 203 rows qualify. Ordinary reading is
nearly flat: Sun 15.4%, Mon 14.5%, Sat 14.5%, Tue 14.0%, Thu 13.9%, Fri 13.9%,
Wed 13.8% of a reading week. All 442 tested rows land on Monday 24.4% against the
14.5% that cycle predicts: chi2 39.39 df6, p = 6e-7.

Known weakness, must be disclosed if this ships: 6 of the 20 ramp Mondays are Super
Bowl halftime performers (Shakira + Jennifer_Lopez, Tom_Brady + The_Weeknd, Rihanna,
Usher, Kendrick_Lamar, Bad_Bunny). The effect is substantially one recurring US
television franchise. Second caveat, not a kill: the day is UTC, so a US Sunday
evening is a Monday here. No causal claim about why.

## Also true, ranked below, available if the walk needs more beats

- Warning is bought with prior fame. ambush median base 3,801 readers a day, ramp
  16,894. Mann-Whitney z = -4.30, p < 0.0001, n = 90 / 70. The measurement bias runs
  the other way (a small base is proportionally noisier and should trip the 2x test
  more easily), so the effect survives its own bias.
- The day before is an ordinary day. 90 of 214 (42.1%) had zero days of warning;
  49 of 214 (22.9%) had a day -1 at or below their own base; ambush median
  peak / day -1 = 732x against ramp 6.1x. Days -7 to -1 are untouched by the gate so
  the SHAPE is clean, but the HEIGHT is selected (these are the top 220 peaks ever)
  and the ambush share falls to 16.0% once base is 10,000 or more. State the
  flatness, never the multiple. Closest beat to the dead premise, it will read as
  "spike" if it opens the piece.

## Data-quality notes found while controlling

- 2017-05-22 carries 22 machine-traffic pages in the rejected set (Norway, Prussia,
  Ancient Rome, Kingdom_of_Poland). All correctly rejected by the gate. Any
  gate-free statistic must drop it.
- 2018-01-18 carries 4 more of the same kind (JSON_Web_Token, HTTP_cookie,
  Access_token, Session_token). Also rejected.
- `Question_mark` 2016-02-01 PASSED the gate and sits in the 220. Machine traffic
  that the two shape tests did not catch. Decide whether it appears on the page.
- David_Bowie 2016-01-11 classes as ramp with lead 6 because Blackstar released on
  2016-01-08. `lead` measures elevation, not foreknowledge.
- 4 of 203 rows stop short of a full year. A missing reading is not a zero.

## Constraints, verbatim, binding

> "Do NOT rebuild dataset.json (live network run) and do NOT edit it."
> "no em dashes, no causal language about the floor."

## Dead, do not re-pitch

Half-life / how fast attention decays. Day-365 anniversary echo. Familiarity vs
persistence scatter. No one-year framing on this data at all.
