/**
 * What every mark shares: escaping, a text emitter that carries its own size, a log scale,
 * and the number formats. Type size is an attribute on every <text> because the mark that
 * measures its layout is the only thing allowed to decide it.
 */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const nf = new Intl.NumberFormat('en-US')

export const T = (cls, x, y, fs, fill, s, anchor, extra = '') =>
  `<text class="${cls}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${fs}" fill="${fill}"` +
  `${anchor ? ` text-anchor="${anchor}"` : ''}${extra}>${s}</text>`

export const logScale = (lo, hi, p0, p1) => {
  const a = Math.log10(lo), b = Math.log10(hi)
  return (v) => p0 + ((Math.log10(v) - a) / (b - a)) * (p1 - p0)
}

/** 14,954,133 -> 15.0M, 64,634 -> 65K, 468 -> 468 */
export const compact = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'K'
  return String(n)
}

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const shortDate = (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)

// Schibsted runs about .53em to the character; Martian Mono is a wide mono, nearer .75em.
export const nameW = (fs, s) => fs * 0.53 * String(s).length
export const figW = (fs, s) => fs * 0.75 * String(s).length
