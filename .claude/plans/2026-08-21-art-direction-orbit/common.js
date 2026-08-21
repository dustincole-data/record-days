// Shared geometry + palette. No copy, no layout.
(function () {
  const E = window.AHL.events;
  window.WITH_FLOOR = E.filter(e => e.floor !== null);
  window.NO_FLOOR = E.filter(e => e.floor === null);

  // Spectral WITHIN poles: warm ramp for below-baseline, cool ramp for above.
  const WARM = ['#f7c86a', '#f0913f', '#df5b34', '#c02f4b', '#8e1a4e'];
  const COOL = ['#9fe3cf', '#4fc0c0', '#2f8fc9', '#3b5fc0', '#5b3fa8'];
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function ramp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
    const a = hex2rgb(stops[i]), b = hex2rgb(stops[i + 1]);
    return [Math.round(lerp(a[0], b[0], f)), Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f))];
  }
  // floor is a relative change: -0.567 .. +50.883, sign change at 0.
  window.floorColor = function (floor, alpha) {
    let rgb;
    if (floor < 0) rgb = ramp(WARM, Math.min(1, -floor / 0.57));
    else rgb = ramp(COOL, Math.min(1, Math.log10(1 + floor) / Math.log10(1 + 50.883)));
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
  };
  window.CLASS_HUE = {
    death: '#c02f4b', scandal: '#2f8fc9', culture: '#f0913f',
    sport: '#4fa05a', politics: '#7b57b5', disaster: '#8e1a4e', attack: '#8e1a4e'
  };

  // Attention relative to that article's own clean baseline, log10.
  // ratio at day d = curve[d] * peak / base.  Baseline itself sits at 0.
  window.ratioAt = function (e, d) { return e.curve[d] * e.peak / e.base; };
  window.floorRatio = function (e) { return 1 + e.floor; };

  window.hidpi = function (cv, w, h) {
    const r = Math.min(3, window.devicePixelRatio || 1);
    cv.width = w * r; cv.height = h * r;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d', { preserveDrawingBuffer: true, alpha: true });
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return ctx;
  };
  // Named subjects the plates label. All are rows in floor.json.
  window.LABELS = ['Jeffrey Epstein', 'Harvey Weinstein', 'Elizabeth II', 'Prince Philip, Duke of Edinburgh', 'Betty White'];
  window.shortName = function (a) { return a === 'Prince Philip, Duke of Edinburgh' ? 'Prince Philip' : a; };
})();
// Canvas text falls back to a serif unless the face is actually loaded first.
window.ready = function (fn) {
  Promise.all(['400 12px Archivo', '500 12px Archivo', '600 12px Archivo'].map(f => document.fonts.load(f)))
    .then(() => fn()).catch(() => fn());
};
