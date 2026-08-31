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
