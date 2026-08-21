# Attention Half-Life

One scrolling page. Daily English Wikipedia pageviews for 88 events, and where the reading
settles a year later.

Spec: `.claude/plans/2026-08-20-attention-half-life-design.md`
Plan: `.claude/plans/2026-08-20-attention-half-life-plan.md`

## Run it

```bash
npm install
npm test        # vitest, the whole gate
npm run dev
npm run build
```

## Data

Source is the Wikimedia pageviews REST API, keyless, CORS open. Daily per-article data
begins **2015-07-01**; anything earlier returns 404. Requests carry a real User-Agent with
a contact address, which the API requires.

`src/data/dataset.json` is committed and **is not rebuilt on every build**. It is one
static payload, historical, and regenerating it is a live network run over all 88 events:

```bash
npm run build:data   # only on purpose, never as part of a build
```

`data/probe/results2.json` (88 rows) and `data/probe/floor.json` (57 rows) are the Python
probe's output. They are the published record: no number appears in copy that is not a
field of one of those two files, or a count of their rows.

Where the two files disagree at a printed digit, `floor.json` wins, because it is the file
the figures were published from. `dataset.json` keeps the unrounded value and is used for
counts and for anything derived from every row.

## Layout

| path | holds |
|---|---|
| `src/lib/metrics.js` | pure metric functions. Baseline, peak, t50/t10, decay fits, floor. No I/O. |
| `src/lib/pageviews.js` | the API client. URL building, User-Agent, series shaping. |
| `src/lib/classify.js` | subject vs event article, floor eligibility. |
| `scripts/build-dataset.js` | runs the above over the event list, writes `src/data/dataset.json`. |
| `src/scripts/band.js` | the band and the rate scatter, Canvas 2D. |
| `src/scripts/coda.js` | one live reader query, through the same `lib/` modules. |
| `src/components/` | one component per beat, plus `CodaLookup`. |

The coda reuses `lib/` unchanged, so a reader's number is computed by the code that
produced the published ones. That is what makes the round trip a real check.

## Gates

`npm test` covers all of these.

- **Parity**: `src/data/dataset.json` reproduces the probe's figures to the digit the probe
  kept, on every event and every floor.
- **Number provenance**: every number rendered into copy traces to a probe row or a count
  of rows. The coda's own template carries no figure at all.
- **Copy register**: no causal language about the floor, no claim that it measures memory
  or legacy, no em dashes.
- **Canvas rules**: alpha blending only, nothing encoded in `lineWidth`,
  `preserveDrawingBuffer`, re-sync from the canvas box via `ResizeObserver`.
- **Perturbation**: several gates carry a planted-defect test, so a gate that cannot go red
  is caught.

Two checks are not automated and have to be run by hand: the tautology read of beat 2
(spec 9.4) and the real-device phone pass (spec 9.5, which does not reproduce in emulation).

## Deploy

Static output, Vercel. Verify on the project URL, `<project>.vercel.app`. A per-deployment
URL sits behind SSO and answers a login page with a 200, which reads as a successful deploy
when nothing shipped.
