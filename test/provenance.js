// The number-provenance gate, ported off the retired Orbit and floor beats.
//
// The binding constraint on this project is that no number appears in copy that is not
// a row in the committed data. The old gate built its allowed set out of floor.json and
// results2.json by hand, one field at a time. This one walks the computed findings
// object instead, so any figure the analysis produces is quotable and any figure it does
// not produce has nowhere to come from.
//
// Census counts users only. data/probe counts all agents and reads larger for the same
// peak. A gate built from one file will not clear a figure taken from the other, which
// is the intended behaviour: the two are never mixed inside one figure.

// Strips styles, scripts and tags. Copy is what a reader sees, so a number sitting in a
// stylesheet or a data attribute is not gated and a number in a sentence is.
export const strip = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    // An axis tick is the scale's own output, not something anyone wrote. src/lib/marks
    // marks them so the gate can tell a ruler apart from a claim.
    .replace(/<text[^>]*class="tick"[^>]*>[\s\S]*?<\/text>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const add = (set, n) => {
  if (!Number.isFinite(n)) return
  set.add(String(n))
  // A figure is quotable at the precision it is printed to as well as its full one, so
  // 1.895 clears as 1.9 without the copy carrying more digits than it shows. Rounding to
  // a whole number is deliberately not allowed: it would clear every small integer off
  // the back of any ratio in the object and leave the gate holding nothing.
  set.add(String(+n.toFixed(1)))
  set.add(String(+n.toFixed(2)))
}

// Every number reachable in the findings object, plus the parts of every date in it.
export function allowedFrom(value, set = new Set()) {
  if (typeof value === 'number') add(set, value)
  else if (typeof value === 'string') {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (iso) for (const part of iso.slice(1)) add(set, Number(part))
    // A figure inside one of the data's own strings is a row of the data too: the page
    // that peaked is called "97th Academy Awards", and naming it is quoting the file.
    else for (const part of value.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) add(set, Number(part.replace(/,/g, '')))
  } else if (Array.isArray(value)) for (const v of value) allowedFrom(v, set)
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      // Object keys carry figures too: the landing histogram is keyed by offset and the
      // curve by day, and copy naming one of those is naming a row of the data.
      if (/^-?\d+$/.test(k)) add(set, Number(k))
      allowedFrom(v, set)
    }
  }
  return set
}

// Numbers in the text that the allowed set cannot account for. An empty array is the
// only passing result.
export function untraceable(text, allowed) {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((n) => String(Number(n.replace(/,/g, ''))))
    .filter((n) => n !== 'NaN' && !allowed.has(n))
}

// The register the project has been held to since the first beat. Both lines are
// constraints Dustin set verbatim and neither has been lifted.
export const BANNED_REGISTER = /\bbecause\b|\bcaused?\b|\bforgotten\b|\bgrief\b|\blegacy\b|\bmourn|\bmemory\b|\bimportance\b/i
export const EM_DASH = '—'
