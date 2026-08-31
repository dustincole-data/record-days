# Attention Half-Life — sources

One block per source. Filled in BEFORE the first number is derived: a column whose units,
denominator or temporal reference point you cannot state is a column you cannot publish.

**Read this first.** There are two independent pulls in this repo against the same API.
They count different things, they disagree on the same event by 20 to 25%, and mixing them
inside one figure is the single easiest way to publish a false number here. Source 1 counts
**users**. Source 2 counts **all agents**. See "The two pulls disagree" at the foot.

---

## 1. Wikimedia daily pageviews — the census — CONFIRMED

| | |
|---|---|
| **Source** | Wikimedia Foundation, Analytics/Pageviews REST API. Stage 1 `metrics/pageviews/top/en.wikipedia/all-access/{Y}/{M}/{D}`; stage 2 `metrics/pageviews/per-article/en.wikipedia/all-access/user/{article}/daily/{from}/{to}` |
| **URL** | `https://wikimedia.org/api/rest_v1/metrics/pageviews/` · docs `https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews` |
| **Licence** | CC0 1.0 (Wikimedia Foundation puts the pageview dumps and the AQS API in the public domain) |
| **Vintage** | pulled 2026-08-22. Window ends 2026-08-13 |
| **Extract** | Stage 1 walked **all 4,062 days** the daily API covers and kept, per article, its own largest single day: **200,270 articles seen**. Stage 2 pulled the full daily series (day -30 to +400 around the peak) for the **700** largest of those; **478** passed the shape gate; the **220** largest qualified rows are the file. |
| **Date basis** | **Occurrence.** A row's date is the calendar day the readings happened, UTC, as the API reports it. There is no registration or filing delay in this source: a pageview is dated when it was served. |
| **Denominator** | None. Every number is a **raw count of pageviews**, not a rate. It is not per capita, not per editor, not a share of Wikipedia traffic. "Readers" throughout means pageviews, which is not the same as people (see gotchas). |
| **Units** | pageviews per article per day, integer |
| **Local** | `data/census/top-days.json` (1.0 MB, 220 rows, each with `series` keyed by day offset -30 to +400) · `data/census/renamed.json` (8 titles) |
| **Fetch** | `node scripts/build-census.js` (live network run, roughly 13 minutes, 4,062 + 700 requests). **Do not re-run it.** |

### What the row fields mean

| Field | Meaning |
|---|---|
| `article` | en.wikipedia page title, underscored, as the API returned it on the peak day |
| `peak` | pageviews on the single largest day |
| `date` | the calendar day of `peak`, UTC |
| `base` | median pageviews over days -21 to -8 before the peak, the pre-event level |
| `lift` | **`series[+7] / base`** — day seven against the pre-event level, which is the gate's own "is this page still lifted a week later" arm. **NOT `peak / base`.** This table said `peak / base` until step 4 and it was wrong; the definition is `qualify()` in `src/lib/census.js`. The error put a false sentence in the findings record for three sessions ("on 10 rows the record day reads below the page's own recent level" — it is day seven that does, not the record day). Guarded in `pipeline/07_artefact.mjs`. |
| `share` | pageviews on day +7 as a fraction of `peak` |
| `falling` | day +7 as a fraction of day +3 |
| `series` | pageviews by day offset from the peak; offsets are **integers -30 to +400**, and a missing offset means **no reading was returned**, which is not a zero. Series lengths run **70 to 431 readings**, so rows are not comparable at long horizons without saying which ones survive |

### Gotchas — the things the publisher's prose says and the column names do not

- **A pageview is not a person.** No deduplication by reader. One person refreshing ten
  times is ten. Nothing here supports a claim about how many *people* did anything.
- **`all-access` folds desktop, mobile web and mobile app together.** The desktop/mobile
  split moved a lot over the window; any within-article comparison across years is partly a
  platform-mix comparison. Not separable from this extract.
- **The 220 rows are a gate, not a sample.** A row is only here if, seven days after its
  peak, it still held `alive` 0.004 of that peak; it held `share` 0.015 of the peak **or**
  sat at `lift` 1.5x its own pre-event level; **and** day 7 was under `falling` 0.85 of day
  3. Those thresholds are in `src/lib/census.js` as `QUALIFY` and in the file's own `meta`.
  **"Spiked and is now falling" is the definition of the set.** Any finding whose shape is
  "they all rise then decay" is describing the gate, not the world. This has already cost
  one whole premise on this dataset. Check every candidate finding against it.
- **Stage 1 only sees the top 1,000 of each day.** An article that never once reached a
  daily top-1000 is invisible here, however much total traffic it has. The frame is
  "biggest single days on record", never "most-read articles".
- **Namespace and title filtering happens before ranking.** `Main_Page`, `-`, `Wikipedia`,
  `Undefined` and 15 namespaces (Special, Portal, File, Talk, User, Draft, Module, …) are
  dropped in stage 1. `meta.dropped` carries the exact list.
- **Titles move, and it is worse than this line first said.** 8 of the 220 articles were later
  renamed; `renamed.json` maps old to new. The **old** title stops receiving traffic at the
  move, so a series read across a rename measures the move and not the readership. Safe on the
  peak day itself, unsafe for anything about the months after. Measured on the second pass: the
  8 rank **1, 2, 11, 16, 19, 50, 56 and 116** among the 196 rows by settle ratio, median rank
  **17.5** against 98.5 expected, permutation **p = 0.00026**, median settle **0.1541** against
  **0.9075**. `pipeline/01` computes a `renamed` flag and **nothing downstream reads it**, which
  is how two moved titles became the two named extremes on the shipped `#settle` plate. Three of
  the 8 also have their **new** title in the file as a **separate row with its own record day**
  (Electoral College, the 2016 election article, and Charles — who has a **third** row,
  `Charles,_King_of_the_United_Kingdom`, in the cut list on the same day as the first). The file
  therefore counts one subject as two pages. See F13.
- **The window is not a calendar.** It starts 2015-07-01 because that is the first day the
  daily API covers, and ends 2026-08-13 because a peak needs a day +7 to be testable.
  Coverage by month is therefore uneven at both ends: July 2015 and August 2026 are partial.
- **A recent peak has a short tail.** A row that peaked in 2026 cannot supply a full year
  of following days. Series lengths run **70 to 431 readings** against a possible 431, so a
  horizon of day +340 is not available for every row. Anything measured over a long horizon
  silently loses the newest rows unless the shortfall is counted and stated.
- **`meta.disqualified` is a real list, and it is where the biggest days are.** **222** rows
  passed stage 1 and failed the gate (700 tested, 478 qualified), each with its reason
  (`never fell` 27, `gone by day seven` 150, `back where it was by day seven` 45) and its peak,
  date, `share`, `lift` and `falling`. It carries **no `series`**, so those rows can be counted,
  named and compared on those five fields, but **never charted over time**. Pass one never
  opened it. What is in it: **83** of the 222 are bigger than the smallest kept row, so of the
  true top 100 days on record the site holds only **78**; the **largest single day in the entire
  record is not in the file at all** — `United_States_Senate`, **17,110,916** on 2020-02-08,
  above Charlie Kirk's 14,954,133 — and the top ten of all 442 also contains `Charles_Darwin`
  (8,145,795) and `Schutzstaffel` (7,849,999). It also holds **2017-05-22**, on which twenty-two
  country and historical-state pages set an all-time record within **1.1%** of each other. See
  F11 and the copy rule below.
- **Machine traffic survives the gate, and the four rows are now named.** The gate reads day
  +3, day +7 and the pre-event level. A crawl can satisfy all three. The second pass
  (2026-08-31) ran the search this line asked for and found **four**, not one:
  `Index_(statistics)` (rank 90), `Cook's_Country` (133), `Dulce_María` (155) and
  `Question_mark` (217). Two independent tests agree on the same set — the **snap** (the last
  day above both 20x its own level and 10,000 views, against the next day: 818x, 204x, 40x and
  82x, where the median row is 1.77x and no fifth row exceeds 11.5x) and the **toggle** (a day
  at least 10x below both neighbours where both neighbours are above 5,000: nobody else in the
  file has one). `Index_(statistics)` sat at 44 views a day, held 19 days between 128,405 and
  2,372,030, and read 157 the next day. **The cause is not identifiable from this extract** —
  an automated crawl and a redirect pointed at the title produce the same rectangle — so the
  shape may be published and a mechanism may not. They do **not** move any shipped number: F1's
  median duration is 28 either way and F3's share goes 43.9% to 43.8%. See F12.

---

### The copy rule the second pass added

The set is **the largest 220 rows that also passed a shape gate**. Because
`meta.disqualified` has now been counted, the size of that gap is known and may be stated
rather than hedged: of the true top 100 single days the census ranked, the site holds **78**;
of the top 20, **14**; and the single largest day of all, `United_States_Senate` at
**17,110,916** on 2020-02-08, is **not one of the 220**. Copy must keep saying "each page's own
biggest day" and never "the biggest days" — but it may now say what was left out, and how much.

## 2. Wikimedia daily pageviews — the 88-event probe — CONFIRMED, secondary

| | |
|---|---|
| **Source** | same API, `per-article/en.wikipedia/all-access/**all-agents**/{article}/daily/…` |
| **Licence** | CC0 1.0 |
| **Vintage** | pulled 2026-08-21 |
| **Extract** | 88 **hand-picked** events, chosen by a person, with a hand-assigned class (`death`, etc). `src/data/events.js` holds the list in its original order; `src/data/dataset.json` (169 KB) holds the pulled series; `data/probe/` holds the older Python probe, its results and a baseline-floor file. |
| **Date basis** | occurrence, same as source 1 |
| **Denominator** | none; raw counts |
| **Local** | `src/data/dataset.json`, `src/data/events.js`, `data/probe/*` |
| **Fetch** | `node scripts/build-dataset.js` (live network run). **Do not re-run it.** |

### Gotchas

- **These 88 events were chosen by a human.** They are not a census and carry whatever
  selection the chooser had. Nothing about "events in general" can be concluded from them.
  Useful as a *check* on a census finding, never as the evidence for one.
- **The `class` column is a hand label**, not a property of the data.
- **all-agents, not users.** See below.
- **The committed series stop at day 60 to 85** (median last offset 61; `dataset.json`'s
  `curve` is 61 long for all 88). Anything about a horizon past two months is not in this
  source, so F9's anniversary **cannot be replicated here**.
- **`res365`, `res180` and every column in `data/probe/floor.json` are NOT reproducible from a
  committed file.** `probe2.py:128` computes `res365` as `resid(335,366)` — a mean residual
  over days 335 to 365 against baseline, so a *level* measure and not an anniversary bump —
  from a fetch whose data was never committed. Under the "never ship a number you cannot
  reproduce" rule these are unusable as evidence. Recorded because `floor.json` disagrees
  loudly with F3 (its `yr_later / clean_base` is above 1 on **71.9%** of 57 rows against F3's
  43.9%) and someone will find it again: different window, different agent basis, different
  hand-picked set, undocumented `clean_base`. It does not overturn F3.
- **The `exp_r2` / `pow_r2` / `exp_hl` / `pow_a` columns are reproducible in kind but not in
  value.** Refitting both models to the committed series gives median R2 **0.706 / 0.802**
  against the file's **0.824 / 0.864**; the file's fitting choices are documented nowhere in
  the repo. **The refit is what may be published.** What survives either way is the direction:
  the power law beats the exponential on **66 of 88** probe events, on a set carrying **no
  shape gate**, which is what lets F10 make a decay-shape claim the kill list would otherwise
  forbid.

### What this source is FOR, restated after the second pass

Its one irreplaceable property is that **nobody gated it on shape**. That makes it the only
committed set on which a claim about the *form* of a decay can be tested without fitting the
census's own qualification rule. It is used for exactly that in F10 and for nothing else.

---

## The two pulls disagree, and the size of it

Source 1 counts `user` agents. Source 2 counts `all-agents`, which adds spiders and
automated traffic. The same event reads materially larger in source 2:

| Event | Source 1 (users) | Source 2 (all agents) |
|---|---|---|
| Elizabeth II, 2022-09-08 | 8,399,082 | 10,312,178 |

That is a **23% gap on one row**. Any figure that mixes them is wrong by an unknown amount.
**Rule for this project: one figure, one agent basis, and the basis is named on the page.**
Default to source 1 (users) for anything published; reach for source 2 only to test whether
a finding survives a different agent basis, and say so when you do.

---

## What was looked for and NOT found

The absence is a finding. Record the search so it is not repeated, and so a gap can be
stated on the page as a fact about the world rather than a gap in the research.

| Wanted | Outcome |
|---|---|
| Unique devices / people rather than pageviews | **Not available at article level.** Wikimedia publishes `unique-devices` per project per day, never per article. Any per-article claim about *people* is unpublishable from this source. |
| Referrer, or how a reader arrived | **Not in the pageviews API.** Wikimedia publishes a separate clickstream dump, monthly and aggregated, which cannot be joined to a single day. Not pulled. |
| Reader geography per article per day | **Not published at this granularity** for privacy reasons. |
| Anything before 2015-07-01 | **Does not exist in this API.** The older `pagecounts` dumps use a different, non-comparable counting method. Do not splice them. |
| Editor activity, revisions, or page protection around a peak | **Not pulled.** Available from other Wikimedia endpoints; would be a new live run and is out of scope until something needs it. |

---

## Reproducing

The two live network pulls above are **frozen** and must not be re-run. Everything the site
publishes has to be derivable from the committed extracts:

```
data/census/top-days.json      # source 1, the census, 220 rows
data/census/renamed.json       # the 8 moved titles
src/data/dataset.json          # source 2, the 88-event probe
data/probe/                    # the older all-agents probe and its outputs
```

Derivation from those files, once the mining pass has something to guard:

```
npm run data
```
