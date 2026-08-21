# Art direction — approved anchor

Approved 2026-08-21. Open `orbit.html` (needs a static server, not file://) or look at `orbit.png`.

**Premise, approved:** for one day they were the most-read page on the internet; a year later
16 of 57 are read less than before it happened. The page opens on Elizabeth II by name and
number, not on a curve.

**Anchor, approved:** C · Orbit. Four directions were rendered on real data with identical
copy; A (dark comet), B (light two-panel ribbon) and D (small-multiple glyph ledger) were
rejected and deleted the same day.

What the mark is, and what has to survive into the build:

- One thread per subject, 57 of them, radial. Each runs out from the ring to its peak and
  back down over sixty days, ending in a dot at where it stood a year later.
- The **ring is that page's own reading before the event**. Radius is log10 of views against
  that page's clean baseline, so the ring is 1x. Inside the ring is below baseline.
- Threads are **sorted by floor** around the circle, and the block that ends below is rotated
  to sit across the top. The colour gradient is a consequence of the sort, not decoration.
- Spectral **within** poles: warm ramp for below baseline, cool ramp for above. Below is drawn
  louder (higher alpha, thicker) than above, because 16 of 57 is the finding.
- Alpha blending on a cream ground, never multiply. Nothing is encoded in `lineWidth`.
- Cream `#f4efe6`, Archivo, small caps masthead. No serif, no giant type hero. The one large
  number is data, not display type.

Files here are a standalone plate, not the build. `data.js` is generated from
`src/data/dataset.json` + `data/probe/floor.json`; it is disposable and regenerable.
