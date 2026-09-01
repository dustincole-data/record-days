// @ts-check
import { defineConfig } from 'astro/config'
import { SITE } from './src/lib/site.js'

// Record Days — one page, pure static, no adapter. The marks are drawn as SVG by
// src/lib/marks/*, server-rendered at a default width and redrawn client-side at
// the width the reader actually has.
export default defineConfig({
  site: SITE,
  base: '/',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
})
