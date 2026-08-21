import { getViteConfig } from 'astro/config'

// Beat components are .astro files, so the test runner needs Astro's own Vite plugin to
// transform them. Without it test/copy.test.js cannot import the component it gates.
export default getViteConfig({
  test: {
    include: ['test/**/*.test.js'],
  },
})
