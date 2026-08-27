# The Anniversary — confirmed premise, 2026-08-27

Replaces the Half-Life premise (killed 2026-08-27: the qualification gate selects for
"spiked and is now falling", so all 220 look alike by construction) and the
familiarity/persistence scatter (explicitly ruled out as a new project).

**The object.** 203 events are flat for a year after their peak, then lift together for
about two days at day 365, then go flat again. The old page drew day -14 to +60 and
stopped 300 days short of it.

Nothing here is built. Nothing here is in `scripts/analyse.js` yet. Every number below
came from throwaway scratchpad scripts and **must be re-derived inside
`scripts/analyse.js` / `src/lib/findings.js` before any of it reaches a page.** The
definitions are recorded verbatim so that port is mechanical.

## Operational definitions

All read from `data/census/top-days.json` rows. `series` is keyed by day offset from
that row's own peak; day 0 is the peak.

- `quiet(r)` = median of `series` over days 100..340 inclusive. Row requires >= 200
  present days in that range, and is dropped if `quiet < 20` (the published
  20-readers-a-day validity floor). **203 of 220 rows survive.**
- `anniv(r)` = whole calendar days from `r.date` to the same month and day one year
  later. 365, or 366 where a 29 February falls inside. Not a fixed 365.
- `echo(r, off)` = `series[anniv(r) + off] / quiet(r)`.
- `lead(r)` = count of consecutive days d = -1, -2, ... where `series[d] >= 2 * r.base`.
  `r.base` is the row's published median of days -21..-8. Rows with `base == 0` (pages
  created for their own event) are excluded; 218 of 220 have a usable base.
  **ambush = lead 0. ramp = lead >= 3.**
- placebo `bump(r, c)` = `max(series[c-10 .. c+10]) / median(series[c-65 .. c-20] U
  series[c+20 .. c+55])`. Requires >= 15 window days, >= 60 floor days, floor >= 20.
  Identical geometry at every centre, including 365.

## Numbers

### The curve, n = 203, median multiple of each row's own quiet level

| days 100-340 | 363 | 364 | **365** | 366 | 367 | 372 |
|---|---|---|---|---|---|---|
| 0.99 | 1.20 | 1.49 | **1.83** | 1.53 | 1.30 | 1.06 |

Median-of-medians across days 100..340 is 0.99; the largest single plain day is 1.20
(day 106). At day 365, 44.7% of rows sit at or above 2x their own quiet level.

### The placebo

Same geometry at 16 centres, day 110 to 335 in steps of 15:

| | median bump | share >= 2x | share >= 3x |
|---|---|---|---|
| centres 110..335 | 1.40 to 1.68 | 29.1% to 40.5% | 13.3% to 24.9% |
| **centre 365** | **3.10** | **71.4%** | **51.5%** |

### The control that carries the story

| | n | median day-365 | >= 2x in the +/-12 window | median best |
|---|---|---|---|---|
| all | 203 | 1.85x | 68.5% | 3.19x |
| **ambush** (day -1 still at baseline) | 80 | **2.65x** | 68.8% | 3.61x |
| ramp (>= 3 days of warning) | 69 | 1.48x | 63.8% | 2.53x |

The scheduled events echo weakest. Also stable across: title carries a year or ordinal
(1.65x, n=10) vs not (1.90x, n=193); peak under 2M (1.58x, n=99) vs over (2.07x, n=104);
first half of the record (2.00x) vs second half (1.71x).

Ambush-only curve, median multiple of quiet, offset from the exact anniversary:
-6 1.12 / -4 1.04 / -2 1.14 / **-1 1.40 / 0 2.79 / +1 1.86** / +2 1.38 / +5 1.05 / +8 0.98.

### Where it lands

Among the 139 rows whose window max reaches 2x: mode is **exactly day 0 (40 rows)**,
then -1 (32 rows). **56.1% land within one day of the exact calendar date.** Only 6.5%
land 2+ days out on a multiple of 7.

### Scale, and the ones that do not return

- Median anniversary day = **0.74% of the original peak**. Roughly seven readers in a
  thousand.
- Median 2 days at or above 2x inside the +/-10 window.
- **26 of 203 (12.8%)** never reach 1.5x anywhere in the window. Largest by peak:
  Donald_Trump, J._D._Vance, Tim_Walz, Lionel_Messi, DMX_(rapper), Charles_III,
  Imane_Khelif, Facebook, Wagner_Group, Keir_Starmer, Alexander_Hamilton, Jimmy_Carter.
- Largest echoes as a share of their own peak: Jannik_Sinner 40.3%, Dulce_María 31.3%,
  Diogo_Jota 15.1%, Peyton_Manning 7.9%, 88th_Academy_Awards 5.7%.

### The leading edge (supporting, and the control's own source)

218 rows with a usable base. **ambush 90 (41.3%)**, lead 1-2 57, **ramp >= 3 71 (32.6%)**.
Median day -1: 0.96x base for ambush, 14.33x base for ramp. Longest ramps:
Brett_Kavanaugh 13, Ukraine 12, Jannik_Sinner 12, Alexander_Hamilton 12, Neil_Gorsuch 11.

## Limits to state on the page

- The series stops at day +400, so **exactly one anniversary is observable.** There is no
  second one to test and no claim about year two.
- Day 0 is the row's peak day, not the event day. The -1 shoulder is reported as the
  shape of the window, with no explanation attached.
- Counts are users only. `data/probe` counts all agents and reads larger for the same
  peak. Never mixed inside one figure.

## Binding constraints, verbatim

> "Do NOT rebuild dataset.json (live network run) and do NOT edit it."
> "no em dashes, no causal language about the floor."

Stage-1 re-run (4,062 keyless requests, ~13 min, for the full daily top-1000 ranking)
was offered and **declined 2026-08-27**. Not needed; the premise is fully backed by
committed data.

## Open, for the build session

- Nothing is designed. No mark, no mock, no page. Art direction unstarted.
- `scripts/analyse.js` port is the first task, before any pixel.
- The 200 green tests all target the retired Orbit/floor components. Deleting
  `src/components/` kills 95. Port their number-provenance gate rather than lose it.
- `.claude/plans/2026-08-22-story/vc.html` (commit `dce6b67`) holds verified motion. The
  technique (every mark built in its finished state, animations play only FROM an offset)
  suits a scrub along the year. Its marks probably do not carry over.
- No git remote, never deployed, subdomain never picked.
