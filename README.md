# Attention Half-Life

One scrolling page. Daily English Wikipedia pageviews for 88 events, and where the reading
settles a year later.

Spec: `.claude/plans/2026-08-20-attention-half-life-design.md`
Plan: `.claude/plans/2026-08-20-attention-half-life-plan.md`
Art direction: `.claude/plans/2026-08-21-art-direction-orbit/NOTE.md`, which is binding on
the mark.

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

The ring is drawn from `floor.json` and from the daily views in `results2.json`, not from
the normalised curve in `dataset.json`. That curve is a share of the lift over the near
window and is clipped at one, so it carries no level: on Elizabeth II it reads a third of
her clean baseline at day sixty where the daily views put her above it, and it flattens
three subjects on the days they came back to their own peak. `results2.json` keys its
series on days from the event and the peak sits `pk_off` days along, so the sixty days the
mark draws are `pk_off` through `pk_off + 60`.

## Layout

| path | holds |
|---|---|
| `src/lib/metrics.js` | pure metric functions. Baseline, peak, t50/t10, decay fits, floor. No I/O. |
| `src/lib/pageviews.js` | the API client. URL building, User-Agent, series shaping. |
| `src/lib/classify.js` | subject vs event article, floor eligibility. |
| `scripts/build-dataset.js` | runs the above over the event list, writes `src/data/dataset.json`. |
| `src/scripts/orbit.js` | the ring, Canvas 2D. Palette, geometry, and the join that builds the 57 subjects. |
| `src/scripts/ladder.js` | the rank ladder beat 2 draws, Canvas 2D. |
| `src/scripts/coda.js` | one live reader query, through the same `lib/` modules. |
| `src/components/` | one component per beat, plus `CodaLookup`. |

Page order is `BeatFloor`, `BeatModel`, `BeatFall`, `BeatDivergence`, `BeatCorrection`,
`CodaLookup`. The model beat fits the exponent that the fall beat then reads against the
floor, so it comes first.

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
- **Canvas rules**: alpha blending only, never multiply; `preserveDrawingBuffer`; re-sync
  from the canvas box via `ResizeObserver`; no hover reveal. Stroke width is a published
  policy that is run across box sizes rather than grepped, and no width may fall under a
  pixel. Which side of the ring a thread ends on is carried by colour, so a device that
  clamps every stroke to one pixel still reads correctly. Paint order puts the block that
  ends below the ring last, since `floor.json` is itself sorted by the floor and file
  order would lay the whole cool half over the whole warm one.
- **Perturbation**: several gates carry a planted-defect test, so a gate that cannot go red
  is caught.

One check is not automated and has to be run by hand: the real-device phone pass (spec 9.5,
which does not reproduce in emulation).

## Deploy

Static output, Vercel. Verify on the project URL, `<project>.vercel.app`. A per-deployment
URL sits behind SSO and answers a login page with a 200, which reads as a successful deploy
when nothing shipped.
