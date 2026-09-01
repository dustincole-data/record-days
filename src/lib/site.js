// The one place the deployed origin is written. astro.config.mjs and the page both
// read it, so a test that renders the page outside the Astro build still gets the
// same absolute URLs the build emits.
export const SITE = 'https://recorddays.dustincoledata.com'
