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
| `lift` | `peak / base` |
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
- **Titles move.** 8 of the 220 articles were later renamed; `renamed.json` maps old to new.
  The **old** title stops receiving traffic at the move, so a series read across a rename
  measures the move and not the readership. Safe on the peak day itself, unsafe for anything
  about the months after.
- **The window is not a calendar.** It starts 2015-07-01 because that is the first day the
  daily API covers, and ends 2026-08-13 because a peak needs a day +7 to be testable.
  Coverage by month is therefore uneven at both ends: July 2015 and August 2026 are partial.
- **A recent peak has a short tail.** A row that peaked in 2026 cannot supply a full year
  of following days. Series lengths run **70 to 431 readings** against a possible 431, so a
  horizon of day +340 is not available for every row. Anything measured over a long horizon
  silently loses the newest rows unless the shortfall is counted and stated.
- **`meta.disqualified` is a real list.** **222** rows passed stage 1 and failed the gate
  (700 tested, 478 qualified), each with its reason (`never fell`, etc) and its peak, date,
  `share`, `lift` and `falling`. It carries **no `series`**, so those rows can be counted,
  named and compared on those five fields, but never charted over time.
- **Machine traffic survives the gate.** The gate reads day +3, day +7 and the pre-event
  level. A crawl can satisfy all three. At least one row in the 220 is known to have a shape
  no human readership has (a single day back at baseline between two days a hundred times
  above it). Any pass over this file has to look for that shape rather than assume the gate
  caught it.

---

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
