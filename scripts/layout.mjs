// The shared shell for every generated page: the stylesheet, the left sidebar
// and the surrounding HTML document.
//
// Student submissions are not built from this — they are the students' own
// files and are served exactly as handed in.
//
// The design is set like a course handbook: one type scale, one spacing scale,
// numbered sections divided by rules, boxes only where they carry meaning
// (code, notes). `tokens` holds the palette and scales; the placeholder page
// reuses it so the self-contained pages stay in step with the stylesheet.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { esc, setUrl, PUBLIC_DIR } from './roster.mjs'
import { brand } from './brand.mjs'

export const STYLESHEET = '/assets/site.css'

// A small course mark as the favicon — inline, so no request is made for it.
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  `<rect width="64" height="64" rx="12" fill="${brand.colors.light.accent}"/>` +
  `<text x="32" y="46" font-family="Charter,Georgia,serif" font-size="40" font-weight="600" text-anchor="middle" fill="${brand.colors.light.bg}">E</text>` +
  '</svg>'

const markPath = join(PUBLIC_DIR, 'assets', brand.logo.mark)
const favicon = existsSync(markPath)
  ? `data:image/png;base64,${readFileSync(markPath).toString('base64')}`
  : `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`

// <head> lines shared by every page the site generates, self-contained ones
// included: colour-scheme hints for the browser chrome and the favicon (the
// university's emblem, inlined so no request is made for it).
export const headMeta = `<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${brand.colors.light.bg}">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${brand.colors.dark.bg}">
<link rel="icon" href="${favicon}">`

// " lang=\"en\"" for a string with no Cyrillic in it, so screen readers switch
// voice for the English parts of these lang="mn" pages; "" otherwise.
export const langAttr = (s) => (/[\u0400-\u04FF]/.test(String(s)) ? '' : ' lang="en"')

// --- design tokens --------------------------------------------------------
//
// Every text/background pair below meets WCAG AA (≥ 4.5:1) in both schemes:
// ink, muted, accent and ok on bg, panel, accent-soft and ok-soft.

const palette = (colors, indent = '  ') =>
  Object.entries(colors)
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join('\n')

export const tokens = `:root {
  color-scheme: light dark;
${palette(brand.colors.light)}
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --display: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --t-1: .75rem;
  --t-2: .875rem;
  --t-3: 1rem;
  --t-4: 1.125rem;
  --t-5: 1.375rem;
  --t-6: 1.75rem;
  --t-7: clamp(2rem, 1.4rem + 2.4vw, 2.75rem);
  --sp-1: .25rem;
  --sp-2: .5rem;
  --sp-3: .75rem;
  --sp-4: 1rem;
  --sp-5: 1.5rem;
  --sp-6: 2rem;
  --sp-7: 3rem;
  --sp-8: 4rem;
  --tap: 2.75rem;
  --radius: 6px;
  --measure: 40rem;
  --side: 17rem;
}
@media (prefers-color-scheme: dark) {
  :root {
${palette(brand.colors.dark, '    ')}
  }
}`

// Base rules shared by the stylesheet and the self-contained pages.
export const baseCss = `*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 400 var(--t-3)/1.6 var(--sans);
}
.mono, code, pre, kbd { font-family: var(--mono); }
.vh { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
a { color: var(--accent); text-underline-offset: .15em; }
a:hover { color: var(--ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
h1, h2, h3, h4 { font-family: var(--display); font-weight: 700; letter-spacing: -.01em; overflow-wrap: anywhere; }
.eyebrow {
  margin: 0 0 var(--sp-2);
  font: 700 var(--t-1)/1.4 var(--sans);
  letter-spacing: .12em; text-transform: uppercase; color: var(--accent);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}`

// The logo, when public/assets/<brand.logo.file> exists. `prefix` is the path
// from the page to the site root: "/" for pages served by the site, a relative
// "../" chain for the self-contained placeholder so it also works off disk.
export const hasLogo = existsSync(join(PUBLIC_DIR, 'assets', brand.logo.file))
const hasDarkLogo = brand.logo.dark && existsSync(join(PUBLIC_DIR, 'assets', brand.logo.dark))
export const logoTag = (prefix = '/', cls = 'brand-logo') => {
  if (!hasLogo) return ''
  const src = (f) => `${esc(prefix)}assets/${esc(f)}`
  const size = brand.logo.width && brand.logo.height ? ` width="${brand.logo.width}" height="${brand.logo.height}"` : ''
  return `<picture class="${cls}">${
    hasDarkLogo ? `<source srcset="${src(brand.logo.dark)}" media="(prefers-color-scheme: dark)">` : ''
  }<img src="${src(brand.logo.file)}" alt="${esc(brand.logo.alt)}"${size}></picture>`
}

// The credit line in every footer: who built the site, with their mark when
// public/assets/<brand.madeBy.logo> exists. `prefix` as for logoTag.
const hasMadeByLogo = brand.madeBy?.logo && existsSync(join(PUBLIC_DIR, 'assets', brand.madeBy.logo))
export const madeByTag = (prefix = '/') => {
  const m = brand.madeBy
  if (!m) return ''
  const img = hasMadeByLogo
    ? `<img src="${esc(prefix)}assets/${esc(m.logo)}" alt="${esc(m.alt)}" width="${m.width}" height="${m.height}">`
    : ''
  return `<a class="madeby" href="${esc(m.url)}" rel="external">${img}<span>Сайтыг <b lang="en">${esc(m.name)}</b> бүтээв</span></a>`
}

// The university line shown under the course name and in every footer.
export const universityLink = (cls = 'uni') =>
  `<a class="${cls}" href="${esc(brand.university.url)}" rel="external">${esc(brand.university.mn)}</a>`

// --- stylesheet -----------------------------------------------------------

export const css = `/* EAIB101 — generated by scripts/build-site.mjs. Do not edit by hand. */
${tokens}
${baseCss}
/* Smooth only for in-page clicks; a shared deep link lands instantly. */
html:focus-within { scroll-behavior: smooth; }
/* Deep links and focus land clear of the sticky mobile bar. */
html { scroll-padding-top: 4.5rem; }
.skip {
  position: absolute; left: var(--sp-4); top: -100px; z-index: 50;
  padding: var(--sp-2) var(--sp-4); border-radius: var(--radius);
  background: var(--ink); color: var(--bg); font-weight: 600; text-decoration: none;
}
.skip:focus-visible { top: var(--sp-4); outline-color: var(--bg); }

/* ---- shell + sidebar --------------------------------------------------- */
.navtoggle { position: fixed; top: 0; left: 0; width: 1px; height: 1px; margin: 0; padding: 0; border: 0; opacity: 0; }
.side {
  position: sticky; top: 0; z-index: 20;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.sidehead {
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-4);
  min-height: 3.5rem;
}
.brand { display: flex; flex-direction: column; justify-content: center; min-height: var(--tap); text-decoration: none; color: inherit; min-width: 0; }
.brand-logo { display: block; margin-bottom: var(--sp-3); }
.brand-logo img { display: block; height: 2rem; width: auto; max-width: 100%; }
.brand-uni { display: block; font-size: var(--t-1); line-height: 1.4; color: var(--muted); margin-top: var(--sp-1); }
.navuni { margin: var(--sp-6) 0 0; padding-top: var(--sp-4); border-top: 1px solid var(--line); font-size: var(--t-1); line-height: 1.5; color: var(--muted); }
.navuni a { color: inherit; font-weight: 600; text-decoration: none; }
.navuni a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: .15em; }
.sitefoot { margin-top: var(--sp-7); padding: var(--sp-4) 0 0; border-top: 1px solid var(--line); font-size: var(--t-1); color: var(--muted); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--sp-3) var(--sp-5); }
.sitefoot-uni { display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-4); }
.sitefoot a { color: inherit; font-weight: 600; text-decoration: none; }
.sitefoot a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: .15em; }
.madeby { display: inline-flex; align-items: center; gap: var(--sp-3); min-height: var(--tap); font-weight: 400; }
.madeby img { display: block; height: 2.25rem; width: auto; border-radius: var(--radius); }
.madeby b { font-weight: 600; color: var(--ink); }
.madeby:hover b { color: var(--accent); }
@media (prefers-color-scheme: dark) {
  /* the mark was drawn for a white ground */
  .madeby img { background: #fff; padding: .2rem .35rem; }
}
.brand-class { display: block; font: 700 var(--t-4)/1.2 var(--display); letter-spacing: -.01em; }
.brand-course { display: block; font-size: var(--t-1); line-height: 1.4; color: var(--muted); }
.navbtn {
  display: inline-flex; align-items: center; gap: var(--sp-2);
  min-height: var(--tap); padding: 0 var(--sp-4);
  border: 1px solid var(--rule); border-radius: var(--radius);
  font-size: var(--t-2); font-weight: 600; color: var(--ink);
  cursor: pointer; white-space: nowrap; user-select: none;
}
.navbtn::before { content: "☰" / ""; font-size: 1rem; color: var(--accent); }
.navtoggle:checked ~ .shell .navbtn { background: var(--accent-soft); border-color: var(--accent); }
.navtoggle:focus-visible ~ .shell .navbtn { outline: 2px solid var(--accent); outline-offset: 2px; }
/* On phones the menu opens as an overlay below the bar, so it never pushes the
   page down or changes where the reader was. */
.nav {
  display: none; position: absolute; top: 100%; left: 0; right: 0;
  max-height: calc(100vh - 3.5rem); overflow-y: auto;
  padding: 0 var(--sp-4) var(--sp-5);
  background: var(--bg); border-bottom: 1px solid var(--line);
  box-shadow: 0 16px 24px -16px rgba(0, 0, 0, .35);
}
.navtoggle:checked ~ .shell .nav { display: block; }
.navtitle {
  margin: var(--sp-5) 0 var(--sp-2); padding-bottom: var(--sp-1);
  border-bottom: 1px solid var(--line);
  font-size: var(--t-1); font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
}
/* minmax(0, 1fr) keeps the column from growing to the widest title — without
   it the row overflows the sidebar and the count is pushed out of view. */
.navlist { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
.navlink {
  display: flex; align-items: center; gap: var(--sp-3); min-width: 0;
  min-height: var(--tap); padding: var(--sp-1) var(--sp-3) var(--sp-1) var(--sp-2);
  border-left: 2px solid transparent;
  text-decoration: none; color: var(--muted); font-size: var(--t-2); line-height: 1.35;
}
.navlink:hover { color: var(--ink); background: var(--panel); }
.navlink.is-current { border-left-color: var(--accent); color: var(--ink); font-weight: 600; }
.navlink.is-planned { color: var(--muted); font-style: italic; }
.navnum { flex: none; width: 1.5rem; font-size: var(--t-1); font-weight: 700; letter-spacing: .04em; color: var(--accent); font-style: normal; }
.is-planned .navnum { color: var(--muted); font-weight: 500; }
/* Titles wrap rather than truncate — a half-read problem set name is no use. */
.navname { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.navcount { flex: none; font-size: var(--t-1); font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }

.main { min-width: 0; }
.wrap { max-width: 62rem; margin: 0 auto; padding: var(--sp-6) var(--sp-4) var(--sp-8); }

/* ---- page header ------------------------------------------------------- */
.phead { margin-bottom: var(--sp-6); }
.phead h1 { font-size: var(--t-7); margin: 0 0 var(--sp-2); line-height: 1.1; }
.tagline { margin: 0 0 var(--sp-4); max-width: var(--measure); color: var(--muted); font-size: var(--t-4); line-height: 1.45; }
.lede { margin: 0 0 var(--sp-4); color: var(--muted); font-size: var(--t-4); }
.meta { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.chip {
  display: inline-flex; align-items: center;
  padding: .2rem .6rem; border-radius: var(--radius);
  border: 1px solid var(--line); background: var(--panel);
  font-size: var(--t-2); color: var(--muted);
}
.chip.is-open { border-color: var(--ok); color: var(--ok); background: var(--ok-soft); font-weight: 600; }
.chip.is-shut { border-color: var(--rule); }

/* ---- ledger: the jump strip under a problem set's header --------------- */
.ledger { margin: var(--sp-6) 0 0; }
.ledger ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.ledger li { border-bottom: 1px solid var(--line); }
.ledger a {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-4);
  min-height: var(--tap); padding: var(--sp-3) 0;
  text-decoration: none; color: inherit;
}
.ledger a:hover .ledger-k { text-decoration: underline; text-underline-offset: .15em; }
.ledger-k { font-size: var(--t-2); font-weight: 600; color: var(--accent); }
.ledger-k::after { content: " ↓" / ""; }
.ledger-v { font-size: var(--t-2); color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.ledger-v b { font: 600 var(--t-5)/1 var(--display); color: var(--ink); }
.ledger-v .pct { margin-left: var(--sp-2); }
@media (min-width: 44rem) {
  .ledger ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: var(--sp-5); border-bottom: 1px solid var(--line); }
  .ledger li { border-bottom: 0; }
  .ledger li + li { border-left: 1px solid var(--line); padding-left: var(--sp-5); }
  .ledger a { flex-direction: column-reverse; justify-content: flex-end; align-items: flex-start; gap: var(--sp-1); padding: var(--sp-4) 0; }
  .ledger-v b { font-size: var(--t-6); }
}

/* ---- numbered sections ------------------------------------------------- */
.sec { margin: var(--sp-7) 0 0; }
.sec > h2 {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--sp-2) var(--sp-3);
  margin: 0 0 var(--sp-5); padding-top: var(--sp-3);
  border-top: 1px solid var(--rule);
  font-size: var(--t-5); line-height: 1.25;
}
.sec-n { font: 700 var(--t-1)/1 var(--mono); letter-spacing: .08em; color: var(--accent); }
.sec-count { margin-left: auto; font: 600 var(--t-2)/1 var(--sans); color: var(--muted); font-variant-numeric: tabular-nums; }
.prose { max-width: var(--measure); }
.prose p { margin: 0 0 var(--sp-4); }
.prose > :last-child { margin-bottom: 0; }

/* ---- problem set brief + steps ----------------------------------------- */
.brief p { font-size: var(--t-4); line-height: 1.55; }
.brief h3 {
  margin: var(--sp-5) 0 var(--sp-2);
  font: 700 var(--t-1)/1.4 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
}
.steps { display: grid; gap: var(--sp-6); }
.step { display: grid; gap: var(--sp-3); padding-top: var(--sp-5); border-top: 1px solid var(--line); }
.steps .step:first-child { padding-top: 0; border-top: 0; }
.step-head { max-width: var(--measure); }
.step-n { margin: 0 0 var(--sp-1); }
.step h3 { margin: 0; font-size: var(--t-5); line-height: 1.25; }
.step-lead { margin: var(--sp-1) 0 0; color: var(--muted); font-size: var(--t-2); }
.step-body { max-width: var(--measure); min-width: 0; line-height: 1.5; }
.step-intro { margin: 0 0 var(--sp-4); }
.block { margin-top: var(--sp-4); }
.block:first-child { margin-top: 0; }
.block-title {
  margin: 0 0 var(--sp-2);
  font: 700 var(--t-1)/1.4 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
}
.block ul { margin: 0; padding-left: 1.25rem; }
.block li { margin-bottom: .375rem; padding-left: var(--sp-1); }
.block li::marker { color: var(--accent); }
pre {
  margin: 0; padding: var(--sp-3) var(--sp-4);
  background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--rule); border-radius: 0 var(--radius) var(--radius) 0;
  font-size: var(--t-2); line-height: 1.55;
  overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2;
}
.note {
  margin-top: var(--sp-4); padding: var(--sp-3) var(--sp-4);
  border-left: 3px solid var(--accent); border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--accent-soft); font-size: var(--t-2); line-height: 1.55;
}
.note p { margin: 0; }
@media (min-width: 52rem) {
  .step { grid-template-columns: 12rem minmax(0, var(--measure)); gap: var(--sp-4) var(--sp-6); }
  .step-head { position: sticky; top: var(--sp-5); align-self: start; }
  .step h3 { font-size: var(--t-4); }
}

/* ---- tabs -------------------------------------------------------------- */
.jump { margin: calc(-1 * var(--sp-3)) 0 var(--sp-4); font-size: var(--t-2); }
.jump a { display: inline-block; min-height: var(--tap); line-height: var(--tap); font-weight: 600; }
.tabset { margin: 0; padding: 0; border: 0; min-width: 0; }
.tabinput { position: absolute; width: 1px; height: 1px; margin: 0; padding: 0; border: 0; opacity: 0; }
.tabs { display: flex; flex-wrap: wrap; gap: 0 var(--sp-5); margin: 0 0 var(--sp-5); border-bottom: 1px solid var(--line); }
.tab {
  display: inline-flex; align-items: center; gap: var(--sp-2); max-width: 100%;
  min-height: var(--tap); padding: var(--sp-2) 0; margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--muted); font-size: var(--t-2); font-weight: 600; line-height: 1.3;
  cursor: pointer; user-select: none;
  transition: color .12s ease, border-color .12s ease;
}
.tab:hover { color: var(--ink); }
.tab-count { font-size: var(--t-1); font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.panel { display: none; }
@media (max-width: 40rem) {
  .tabs { gap: 0; }
  .tab { flex: 1 1 100%; justify-content: space-between; padding: var(--sp-2) var(--sp-3); }
}

/* ---- progress ---------------------------------------------------------- */
.progress { margin: 0 0 var(--sp-5); }
.progress-head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: var(--sp-4); margin-bottom: var(--sp-2); font-size: var(--t-2); color: var(--muted);
}
.progress-head b { font: 600 var(--t-5)/1 var(--display); color: var(--ink); }
.progress-head .pct { font-variant-numeric: tabular-nums; }
.progress.is-hero .progress-head b { font-size: var(--t-7); }
.progress.is-hero .progress-head { font-size: var(--t-3); }
.bar { display: block; height: .375rem; border-radius: 999px; background: var(--line); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--ok); border-radius: 999px; }

/* ---- roster: one row per student --------------------------------------- */
.roster { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.student {
  display: grid; grid-template-columns: .625rem auto minmax(0, 1fr) auto; align-items: center;
  gap: var(--sp-3); min-height: var(--tap); padding: var(--sp-2) var(--sp-1) var(--sp-2) var(--sp-2);
  border-bottom: 1px solid var(--line);
  text-decoration: none; color: inherit;
}
.student::before {
  content: ""; width: .625rem; height: .625rem; border-radius: 50%;
  border: 1.5px solid var(--muted);
}
.student.is-submitted::before { background: var(--ok); border-color: var(--ok); }
.student.is-locked::before { border-style: dashed; }
a.student:hover { background: var(--panel); }
a.student:hover .name { color: var(--accent); text-decoration: underline; text-underline-offset: .15em; }
.code { font-size: var(--t-1); letter-spacing: .04em; color: var(--muted); font-variant-numeric: tabular-nums; }
.name { font-size: .9375rem; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.tag { font-size: var(--t-1); font-weight: 600; white-space: nowrap; color: var(--muted); }
.is-submitted .tag { color: var(--ok); background: var(--ok-soft); padding: .1rem .5rem; border-radius: 999px; }
@media (max-width: 40rem) {
  .student { gap: var(--sp-2); }
  .student .code, .student .tag { font-size: .6875rem; }
}
@media (min-width: 40rem) {
  .roster { display: grid; grid-template-columns: repeat(auto-fill, minmax(21rem, 1fr)); column-gap: var(--sp-6); }
}

/* ---- overview: problem sets and programs as lists ---------------------- */
.setlist, .grouplist { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
.setrow {
  display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center;
  gap: var(--sp-3); min-height: var(--tap); padding: var(--sp-2) var(--sp-1);
  border-bottom: 1px solid var(--line);
  text-decoration: none; color: inherit;
}
div.setrow { min-height: 2.5rem; padding-top: var(--sp-1); padding-bottom: var(--sp-1); }
a.setrow:hover { background: var(--panel); }
a.setrow:hover .title { color: var(--accent); text-decoration: underline; text-underline-offset: .15em; }
.setrow .num { font-size: var(--t-1); font-weight: 700; letter-spacing: .04em; color: var(--accent); }
.is-planned .num { color: var(--muted); font-weight: 500; }
.setrow .title { font-weight: 600; font-size: var(--t-3); }
.setrow .title.is-empty { color: var(--muted); font-weight: 400; font-style: italic; font-size: var(--t-2); }
.setrow .state { font-size: var(--t-1); font-weight: 600; color: var(--muted); white-space: nowrap; }
.setrow .gauge { display: flex; align-items: center; gap: var(--sp-3); }
.setrow .gauge .bar { width: 5rem; }
.setrow .count { font-size: var(--t-2); font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (min-width: 40rem) { .setrow .gauge .bar { width: 10rem; } }
.grouprow {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline;
  gap: var(--sp-1) var(--sp-4); padding: var(--sp-3) var(--sp-1);
  border-bottom: 1px solid var(--line);
  text-decoration: none; color: inherit;
}
a.grouprow:hover { background: var(--panel); }
a.grouprow:hover .grouprow-name { color: var(--accent); text-decoration: underline; text-underline-offset: .15em; }
.grouprow-name { font-weight: 600; }
.grouprow-size { font-size: var(--t-2); color: var(--muted); }
.grouprow-count { grid-column: 2; grid-row: 1; font-size: var(--t-2); color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; text-align: right; }
.grouprow-count b { font: 600 var(--t-4)/1 var(--display); color: var(--ink); }
.grouprow .bar { grid-column: 1 / -1; margin-top: var(--sp-2); }

footer.page {
  margin-top: var(--sp-8); padding-top: var(--sp-4);
  border-top: 1px solid var(--rule);
  color: var(--muted); font-size: var(--t-2);
}
footer.page a { display: inline-block; min-height: var(--tap); line-height: var(--tap); color: var(--accent); font-weight: 600; }

/* ---- print: the whole roster, no chrome -------------------------------- */
@media print {
  .skip, .navbtn, .navtoggle, .nav, .tabinput, .tabs, .jump, .ledger { display: none; }
  .side { position: static; border: 0; }
  .panel { display: block; }
  .panel::before { content: attr(aria-label); display: block; margin: var(--sp-5) 0 var(--sp-3); font: 600 var(--t-4)/1.25 var(--display); }
  .roster { display: block; }
  .student, .setrow, .grouprow, .step { break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
}

/* ---- desktop ----------------------------------------------------------- */
@media (min-width: 60rem) {
  html { scroll-padding-top: var(--sp-5); }
  .shell { display: grid; grid-template-columns: var(--side) minmax(0, 1fr); align-items: start; }
  .side {
    position: sticky; top: 0;
    height: 100vh; overflow-y: auto;
    border-bottom: 0; border-right: 1px solid var(--line);
  }
  .sidehead { display: block; padding: var(--sp-6) var(--sp-4) 0; }
  .brand-class { font-size: var(--t-5); }
  .brand-course { font-size: var(--t-2); }
  .brand-logo img { height: 2.5rem; }
  .navbtn, .navtoggle { display: none; }
  .nav { display: block; position: static; max-height: none; overflow: visible; border-bottom: 0; box-shadow: none; }
  .wrap { padding: var(--sp-7) var(--sp-6) var(--sp-8); }
  .phead { margin-bottom: var(--sp-7); }
}
`

// The rules that make the CSS-only tabs work, one set per group. They depend
// only on the roster, so they are appended to the stylesheet once rather than
// emitted into every problem set page.
export function tabRules(groups) {
  return groups
    .map((g) => {
      const tab = `#tab-${g.id}`
      const label = `.tabs .tab[for="tab-${g.id}"]`
      return `${tab}:checked ~ #panel-${g.id} { display: block; }
${tab}:checked ~ ${label} { color: var(--ink); border-bottom: 3px solid var(--accent); font-weight: 700; }
${tab}:checked ~ ${label} .tab-count { color: var(--accent); }
${tab}:focus-visible ~ ${label} { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 40rem) { ${tab}:checked ~ ${label} { background: var(--accent-soft); } }`
    })
    .join('\n')
}

// --- document -------------------------------------------------------------

function navItem({ href, label, num, count, current, planned }) {
  const lang = langAttr(label)
  const cls = ['navlink', current ? 'is-current' : '', planned ? 'is-planned' : ''].filter(Boolean).join(' ')
  return `        <li><a class="${cls}" href="${esc(href)}"${current ? ' aria-current="page"' : ''}>${
    num ? `<span class="navnum mono">${esc(num)}</span>` : ''
  }<span class="navname"${lang}>${esc(label)}</span>${
    count ? `<span class="navcount mono">${esc(count)}</span>` : ''
  }</a></li>`
}

export function sidebar({ className, course, sets, current }) {
  const items = sets
    .map((s) =>
      navItem({
        href: setUrl(s.id),
        label: s.title || 'Удахгүй',
        num: s.id,
        count: s.status === 'published' ? `${s.done}/${s.total}` : '',
        current: current === s.id,
        planned: s.status !== 'published',
      })
    )
    .join('\n')

  return `    <aside class="side">
      <div class="sidehead">
        <a class="brand" href="/">
          ${logoTag('/')}<span class="brand-class">${esc(className)}</span>
          <span class="brand-course"${langAttr(course)}>${esc(course)}</span>
          <span class="brand-uni">${esc(brand.university.mnShort)}</span>
        </a>
        <label class="navbtn" for="navtoggle">Цэс</label>
      </div>
      <nav class="nav" id="nav" aria-label="Хичээлийн цэс">
        <ul class="navlist">
${navItem({ href: '/', label: 'Тойм', current: current === 'home' })}
        </ul>
        <p class="navtitle">Бодлогууд</p>
        <ul class="navlist">
${items}
        </ul>
        <p class="navuni">${universityLink()}<br><span lang="en">${esc(brand.university.en)}</span></p>
      </nav>
    </aside>`
}

export function page({ title, description, side, main, script = '', stylesheet = STYLESHEET }) {
  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headMeta}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand.university.mnShort)} — EAIB101">
<meta property="og:locale" content="mn_MN">
<link rel="stylesheet" href="${esc(stylesheet)}">
</head>
<body>
  <a class="skip" href="#main">Үндсэн хэсэг рүү</a>
  <input class="navtoggle" type="checkbox" id="navtoggle" aria-controls="nav" autocomplete="off">
  <div class="shell">
${side}
    <main class="main" id="main">
${main}
      <footer class="wrap sitefoot">
        <span class="sitefoot-uni">
          <span>${universityLink()}</span>
          <span lang="en">${esc(brand.university.en)}</span>
        </span>
        ${madeByTag('/')}
      </footer>
    </main>
  </div>
${script}
</body>
</html>
`
}

// public/404.html. Self-contained like the placeholder, so it renders even
// when /assets is what went missing. noindex: with auto-trailing-slash the
// same file also answers /404 as an ordinary page.
export function notFoundPage({ className }) {
  return `<!doctype html>
<!-- generated by scripts/build-site.mjs — do not edit by hand -->
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${headMeta}
<title>404 — Хуудас олдсонгүй | ${esc(className)}</title>
<style>
${tokens}
${baseCss}
  .wrap { max-width: var(--measure); margin: 0 auto; padding: var(--sp-8) var(--sp-4); }
  .code404 { margin: 0 0 var(--sp-2); font: 600 clamp(3rem, 2rem + 5vw, 5rem)/1 var(--display); color: var(--accent); }
  h1 { font-size: var(--t-6); margin: 0 0 var(--sp-2); line-height: 1.15; }
  p { color: var(--muted); margin: 0 0 var(--sp-4); font-size: var(--t-4); }
  footer { margin-top: var(--sp-6); padding-top: var(--sp-4); border-top: 1px solid var(--rule); }
  footer a { display: inline-block; min-height: var(--tap); line-height: var(--tap); font-weight: 600; }
  footer small { display: block; font-size: var(--t-1); color: var(--muted); }
  footer small a { min-height: 0; line-height: 1.5; color: inherit; }
  footer a.madeby { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-4); min-height: var(--tap); line-height: 1.5; font-size: var(--t-1); font-weight: 400; color: var(--muted); text-decoration: none; }
  .madeby img { display: block; height: 2.25rem; width: auto; border-radius: var(--radius); }
  .madeby b { font-weight: 600; color: var(--ink); }
  .madeby:hover b { color: var(--accent); }
  @media (prefers-color-scheme: dark) { .madeby img { background: #fff; padding: .2rem .35rem; } }
  .logo404 { display: block; margin-bottom: var(--sp-5); }
  .logo404 img { display: block; height: 2.5rem; width: auto; }
</style>
</head>
<body>
  <main class="wrap">
    ${logoTag('/', 'logo404')}<p class="eyebrow">${esc(className)}</p>
    <p class="code404">404</p>
    <h1>Хуудас олдсонгүй</h1>
    <p>Хайсан хуудас байхгүй эсвэл хаяг буруу байна.</p>
    <footer><a href="/">← Нүүр хуудас</a><br><small>${universityLink()}</small>${madeByTag('/')}</footer>
  </main>
</body>
</html>
`
}
