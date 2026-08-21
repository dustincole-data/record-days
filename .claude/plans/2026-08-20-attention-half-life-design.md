# Attention Half-Life — Design Spec

> Status: awaiting approval. No code until approved.
> Date: 2026-08-20
> Evidence base: `data/probe/results2.json` (88 events), `data/probe/floor.json` (57 with clean baselines)

---

## 1. The premise, tested

The kickoff brief proposed: *decay half-life differs by event class (disaster vs scandal vs death)*, to be verified on real articles before committing.

It was verified. **It does not survive as stated.**

Half-life (`t50`, days from peak to half of excess attention), 88 events, 2015–2024:

| class | n | median t50 | p25 | p75 |
|---|---|---|---|---|
| death | 28 | 0.86 d | 0.68 | 1.49 |
| attack | 8 | 0.88 d | 0.70 | 1.19 |
| sport | 6 | 0.87 d | 0.80 | 1.25 |
| politics | 6 | 1.68 d | 0.98 | 1.83 |
| scandal | 18 | 1.86 d | 1.26 | 3.00 |
| disaster | 14 | 2.27 d | 0.84 | 3.60 |

The classes are directionally ordered as the brief guessed, but the interquartile ranges overlap heavily — death p75 (1.49) sits inside scandal's p25–p75. At n = 6–28 per class this separation will not carry a project.

**Two further results killed the framing outright:**

1. **Decay rate is independent of event magnitude.** Peak daily views across the set span 2,782 → 10,905,053 — four orders of magnitude. Correlation with `t50`: **r = −0.21**. Effectively none. Matthew Perry's death (10.9M views) and the Orlando nightclub shooting article (2,782 views) both halve in ~0.6 days.
2. **There is no half-life.** A power law fits the day-1-to-30 decay better than an exponential on **57 of 88** events (median R² 0.864 vs 0.824). Under a power law with the observed median exponent α = 1.29, the halving time is not constant — it *grows*: 1.7 days when measured from day 1, 21.5 days when measured from day 30. "Half-life" describes a process this data does not exhibit.

Result 1 is not novel. It replicates Candia, Jara-Figueroa, Rodriguez-Sickert, Barabási & Hidalgo, *"The universal decay of collective memory and attention,"* Nature Human Behaviour 2018 ([doi:10.1038/s41562-018-0474-5](https://doi.org/10.1038/s41562-018-0474-5)). That the numbers replicate a Nature paper is the evidence that the pipeline is sound. It is not a discovery, and the piece will not present it as one.

## 2. The finding the project is built on

The brief's instinct — that event class matters — was right. It was pointed at the wrong number.

> **Event class does not change how fast a subject is forgotten. It changes whether the subject is permanently rewritten.**

The **fall** is near-universal. The **floor** — where attention settles a year later, measured against a clean pre-event baseline — is not:

| class | n | min floor | median | max | below baseline |
|---|---|---|---|---|---|
| politics | 3 | −0.41x | −0.01x | +3.60x | 2/3 |
| death | 25 | −0.49x | **+0.34x** | +3.98x | 8/25 |
| scandal | 15 | −0.57x | **+0.67x** | **+50.88x** | 3/15 |
| sport | 5 | +0.06x | +0.92x | +6.65x | 0/5 |
| culture | 7 | −0.08x | +1.20x | +3.73x | 2/7 |

Dynamic range tells the story: **the fall varies 17x; the floor varies across a sign change and 5,000x.** And the floor is no more predictable from spike size than the fall is — corr(log peak, floor) = **−0.097**.

Scandal owns the top of the floor distribution: Jeffrey Epstein +50.88x, Harvey Weinstein +10.01x, Sam Bankman-Fried +7.50x, Ghislaine Maxwell +3.43x. No death in the set exceeds +3.98x. A scandal rewrites what a page *is for*; a death is mostly a spike against an unchanged page.

**The human end of it — 16 of 57 subjects (28%) end the year with fewer daily readers than before the event that made them briefly the most-read thing on the internet.** For deaths specifically, 8 of 25:

| subject | peak views | floor at +1yr |
|---|---|---|
| Prince Philip, Duke of Edinburgh | 3,887,247 | −49% |
| Betty White | 3,751,355 | −48% |
| Kirk Douglas | 1,779,256 | −45% |
| Tony Bennett | 1,041,766 | −38% |
| Elizabeth II | 10,312,178 | −30% |
| Stephen Hawking | 7,141,309 | −18% |
| Henry Kissinger | 2,818,722 | −4% |
| Ruth Bader Ginsburg | 3,635,837 | −3% |

### Language register (binding on all copy)

Every statement above is **correlational and descriptive**. Permitted: "ends the year below", "is associated with", "no relationship to". Forbidden: any phrasing implying the event *caused* the floor, or that the floor measures memory, grief, importance, or legacy. Pageviews measure lookups on one website. That is all they measure.

## 3. What was done to try to kill the finding

The floor result initially read at 44% below baseline. That number was wrong, and the reason it was wrong is instructive enough to appear in the piece.

**Suspected confound:** the pre-event baseline for a death is contaminated by end-of-life coverage — hospitalisations, illness announcements, birthday campaigns, biopic press. A subject compared against their own final months is compared against an already-elevated number, manufacturing an artificial decline.

**Test:** re-measure every baseline from a clean window one year earlier (days −455 to −270), and recompute.

**Outcome — the confound is real and was material:**
- Prince Philip's near-baseline was **1.97x** his clean baseline (he was hospitalised 16 Feb – 16 Mar 2021 and died 9 April).
- Pelé 1.83x, Sinéad O'Connor 1.71x, Tina Turner 1.61x. Outside deaths: Liz Truss 17.68x, Caitlin Clark 13.42x, Oppenheimer 5.67x.
- Median run-up across deaths is only 1.04x, so the effect is concentrated in specific cases rather than systemic.
- **3 of 28 deaths flip sign** once the baseline is cleaned. The headline drops from 44% to **28%**.

The finding survived a genuine attempt to destroy it, at reduced magnitude. All published numbers use clean baselines. Beat 4 of the piece shows this test rather than describing it.

## 4. Evidence base and inclusion criteria

**Source (confirmed 2026-08-20, do not re-probe):**
`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/<ARTICLE>/daily/<YYYYMMDD>/<YYYYMMDD>` — no key, clean JSON, CORS-open. Requires a real User-Agent with contact email.

**Hard boundary, verified this session:** daily per-article data begins **2015-07-01** (2015-06-01 → HTTP 404; 2015-07-01 → HTTP 200). This is not the "2015-present" of the brief in the way it matters — a clean baseline needs day −455, so **only events from ~2016-10 onward can carry a floor measurement**. Six otherwise-strong events (David Bowie, Prince, Muhammad Ali, Theranos, Volkswagen, Flint) are excluded from the floor analysis for this reason and this reason only. They remain eligible for the fall analysis.

**Two article types, and they are not interchangeable:**
- **Subject articles** (77/88) — the page existed before the event. Has a baseline. Can carry both fall and floor.
- **Event articles** (11/88) — the page was created by the event (`2023 Hawaii wildfires`, `Titan (submersible)`). Baseline is undefined, not zero. **Fall only. Never a floor.**

This distinction is load-bearing and was the first thing the probe exposed: the original class taxonomy was confounded with article type, because deaths attach to pages that already exist while disasters create new ones. Comparing a death's decay to a disaster's decay was partly comparing two different measurements.

**Floor exclusion rule:** clean baseline < 400 daily views. Small-town and unknown-person pages (East Palestine 32, Surfside 48, Damar Hamlin 46, JD Vance 3) produce ratios in the thousands that are denominator artefacts, not findings. 20 events are excluded on this rule or the pre-API rule; **57 carry a floor.**

**Final counts:** 88 events probed · 88 clean series (0 fetch failures) · 77 subject / 11 event · 57 floor-eligible.

## 5. The piece

One scrolling page. Four beats. Opens on people, not curves.

### Beat 1 — The floor, stated cold

Opens with the payoff, not the setup. Elizabeth II: **10,312,178 views the day she died** — for one day the most-read thing on the internet. A year later, **30% fewer people looked her up than before she died.** Then Betty White −48%, Kirk Douglas −45%, Prince Philip −49%.

Named people, real numbers, no chart yet. The reader should finish this beat wanting to know whether that is a trick.

### Beat 2 — It isn't the fall

Introduce the fall as the natural explanation, then remove it. Matthew Perry's curve (10.9M peak) and a shooting article's curve (2,782 peak) — four orders of magnitude apart. Normalise each to its own peak; they land on top of each other. Then all 88.

Stated plainly on the page: **this part is known**, published in Nature in 2018, cited inline. Its role is to eliminate a suspect, not to claim a discovery. If everyone falls identically, the fall cannot be what separates them.

### Beat 3 — Then the name is wrong

The page is called Attention Half-Life and the data rejects it. Power law over exponential, 57 of 88. The same curve halves in 1.7 days measured from day 1 and 21.5 days measured from day 30. Attention has no half-life: the first half goes in a day, the last half takes a year.

The title is the thing being disproven. This is deliberate and stays.

### Beat 4 — The floor is the whole story

Return to beat 1 with the mechanism established. Fall varies 17x; floor varies 5,000x and changes sign. Neither is predicted by spike size (r = −0.21 and −0.097). Class lives here: scandal median +0.67x with a +50.88x tail, death +0.34x capped at +3.98x.

Then the kill-attempt, shown: the 44% → 28% correction, Prince Philip's 1.97x run-up drawn against his own clean baseline. **The correction is content, not a footnote.** A reader who watches a number get argued down trusts the one that survives.

### Coda — Try one

Input box. Type any person or event. Live keyless call to Wikimedia. The reader's curve is drawn onto the same normalised band as the other 88, with its own floor if the article qualifies.

## 6. The mark

Per the locked dustincoledata direction: light ground, Archivo (grotesque sans, no serif, no giant hero), Visual Cinnamon-grade real-data graphics.

**Primary mark — the band.** 88 normalised decay curves, peak-aligned at x=0, drawn as one translucent mass on light. The reader sees a single dense ribbon narrowing to a tail, individual curves resolvable inside it.

**Secondary mark — the floor.** Same 57 subjects, one year out, as a diverging distribution about the baseline line. Above and below, sorted, with the sign change as the visual event. Named labels on the extremes.

### The tautology trap (binding)

Every normalised curve starts at 1.0 and descends **by construction**. A picture of 88 curves all going down is an identity, not a finding, and shipping it as the beat-2 payoff would be dishonest.

The finding is that decay rate is *uncorrelated with magnitude* — the curves vary 17x in t50, and that variation carries no signal about how big the event was. The mark must therefore **colour each curve by peak magnitude**, so the reader sees the four-orders-of-magnitude range interleaved randomly through the band with no ordering. The visible absence of a gradient is the evidence. `r = −0.21` is stated on the same screen.

If the built band cannot be read this way, beat 2 is wrong and gets redesigned rather than shipped.

### Canvas rules (from prior projects, non-negotiable)

- **Alpha blending, not multiply.** 88 overlapping strokes under `multiply` compound to black on a light ground.
- `lineWidth` is clamped to 1 on many devices — do not encode meaning in stroke width.
- `preserveDrawingBuffer: true` so screenshots work.
- Re-sync canvas from its own bounding box via `ResizeObserver`, never the window `resize` event — the iOS URL-bar collapse squashes it otherwise.
- Any hover reveal needs `pointerdown` + `pointercancel`, not `pointermove` + `pointerleave`, or it is mouse-only.

## 7. Architecture

Astro, matching the existing dustincoledata project pattern. Deployed to its own subdomain.

**Build-time (Node):** a fetch script hits the Wikimedia API for the curated event list, computes fall and floor metrics, and writes a single static JSON. Runs on demand, not on every build — the payload is historical and does not change. Output is committed.

**Runtime (browser):** loads that one JSON. Zero API calls for beats 1–4. Canvas for the band, SVG for the floor distribution and small marks.

**Coda only:** one live `fetch` per reader query, direct to Wikimedia from the browser. Keyless, CORS-open, no proxy, no server, no secret.

**Modules** — each independently testable, no shared state:
- `lib/pageviews.js` — API client. URL construction, User-Agent, date formatting.
- `lib/metrics.js` — pure functions: baseline, peak detection, `t50`/`t10`, power-law and exponential fits, floor. Takes a series, returns numbers. No I/O. This is where the correctness risk lives, so it is isolated and unit-tested against the probe's committed output.
- `lib/classify.js` — subject vs event article, eligibility rules from §4.
- `scripts/build-dataset.js` — orchestrates the above, writes the static JSON.
- Components per beat, plus `CodaLookup`.

The coda reuses `pageviews.js` and `metrics.js` unchanged. The reader's number is computed by the same code that produced the published ones — the coda is a live test of the pipeline, not a parallel implementation.

## 8. Error handling

The only runtime failure surface is the coda.

| case | behaviour |
|---|---|
| article not found (404) | "No English Wikipedia article by that name." Suggest the exact title format. |
| article before 2015-07-01 | Draw the fall. State plainly that no floor is available and why. |
| event-type article (no baseline) | Draw the fall. Say the page did not exist before the event, so there is nothing to compare against. |
| clean baseline < 400/day | Draw both, flag the floor as unstable at low volume rather than printing a 5,000x ratio. |
| no detectable spike | "This article has no event spike in the window." Not an error. |
| network failure / rate limit | Retry once, then fail visibly. Never a silent empty chart. |

Every one of these is a real state in the probe data, not a hypothetical. Beats 1–4 cannot fail — static JSON.

## 9. Verification

The claim gate, before any published number is final:

1. **Metrics unit tests** — `lib/metrics.js` reproduces the committed `results2.json` values exactly for a sample of events. If the site's code and the probe's code disagree, one of them is wrong and nothing ships.
2. **Every published number traces** to a row in `results2.json` / `floor.json`. No number appears in copy that is not in the data.
3. **Perturbation test** — change a baseline window deliberately and confirm the affected number moves. A test that cannot go red is not a test.
4. **Tautology check** (§6) — colour-by-magnitude on the band, verify no visible gradient, confirm against r = −0.21. Human judgment, not automated.
5. **Real-device phone pass** — actual iPhone, not an emulator. The first-tap-is-hover bug does not reproduce in devtools.
6. **Coda round-trip** — pick 5 events already in the static set, look them up live, confirm identical numbers.
7. **Live domain check after deploy**, on the project URL, not the per-deployment URL.

## 10. Out of scope

- Non-English Wikipedia. One language, stated.
- Any claim about *why* a floor is high or low. Not measurable here.
- Comparison to Google Trends, news volume, or social data. Different denominators.
- Prediction. This is descriptive.
- A general-purpose pageview explorer. The coda answers one question against one argument.
- Expanding past 88 events for its own sake. n grows only if a class is too thin to state.

## 11. Open, to resolve during implementation

- **Event count.** 88 probed, 88 clean, 57 floor-eligible. Politics (n=3) and sport (n=5) are too thin for the class table in §2 and either get more events or get dropped from that table. Decide before beat 4 is built.
- **Subdomain name.** Title stays "Attention Half-Life"; the domain does not have to match.
- Whether beat 3 is its own scroll section or folds into beat 2's tail.
