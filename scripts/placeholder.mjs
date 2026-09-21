// The generated placeholder page for a student who has not submitted a given
// problem set yet.
//
// Deliberately self-contained — it carries its own CSS rather than linking the
// shared stylesheet, so it renders correctly even when opened straight off
// disk (which is also why its one link is relative). The palette and scales are
// the same `tokens` the stylesheet is built from, so it always matches the
// rest of the site. It carries PLACEHOLDER_MARKER (see roster.mjs); that is
// how the build tells a placeholder apart from a real submission.

import { esc, PLACEHOLDER_MARKER, PLACEHOLDER_SENTENCE } from './roster.mjs'
import { tokens, baseCss, headMeta, logoTag, universityLink } from './layout.mjs'

export function placeholderPage({ id, name, set }) {
  const path = `public/ps/${set.id}/${id}/index.html`
  const setLabel = `Бодлого ${set.id}${set.title ? ` — ${set.title}` : ''}`
  return `<!doctype html>
${PLACEHOLDER_MARKER}
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="eaib101-placeholder">
${headMeta}
<title>${esc(id)} — ${esc(name)} | ${esc(setLabel)}</title>
<meta name="description" content="EAIB101 — ${esc(name)} (${esc(id)}), ${esc(setLabel)}. Ажил хараахан илгээгдээгүй байна.">
<style>
${tokens}
${baseCss}
  .wrap { max-width: var(--measure); margin: 0 auto; padding: var(--sp-7) var(--sp-4) var(--sp-8); }
  .badges { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-5); }
  .badge {
    display: inline-flex; align-items: center;
    padding: .2rem .6rem; border-radius: var(--radius);
    border: 1px solid var(--line); background: var(--panel);
    font-size: var(--t-2); color: var(--muted);
  }
  .badge.id { color: var(--accent); letter-spacing: .04em; font-weight: 600; }
  h1 { font-size: var(--t-7); line-height: 1.1; margin: 0 0 var(--sp-2); }
  .sub { margin: 0 0 var(--sp-6); color: var(--muted); font-size: var(--t-4); }
  .notice {
    padding: var(--sp-4) var(--sp-5);
    border-left: 3px solid var(--accent); border-radius: 0 var(--radius) var(--radius) 0;
    background: var(--accent-soft);
  }
  .notice p { margin: 0 0 var(--sp-3); }
  .notice p:last-child { margin-bottom: 0; }
  .path {
    display: block; margin-top: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--line); border-radius: var(--radius);
    background: var(--panel); color: var(--ink);
    font-size: var(--t-2); line-height: 1.5;
    white-space: normal; overflow-wrap: anywhere;
  }
  footer { margin-top: var(--sp-7); padding-top: var(--sp-4); border-top: 1px solid var(--rule); font-size: var(--t-2); color: var(--muted); }
  footer a { display: inline-block; min-height: var(--tap); line-height: var(--tap); font-weight: 600; }
  footer small { display: block; font-size: var(--t-1); color: var(--muted); }
  footer small a { min-height: 0; line-height: 1.5; color: inherit; }
  .logo { display: block; height: 3rem; width: auto; margin-bottom: var(--sp-5); }
</style>
</head>
<body>
  <main class="wrap">
    <article>
      <header>
        ${logoTag('../../../', 'logo')}<div class="badges">
          <span class="badge id mono">${esc(id)}</span>
          <span class="badge set">${esc(setLabel)}</span>
        </div>
        <h1>${esc(name)}</h1>
        <p class="sub">EAIB101 — оюутны ажлын хуудас</p>
      </header>

      <div class="notice">
        <p><strong>${esc(PLACEHOLDER_SENTENCE)}.</strong> Энэ оюутан энэ бодлогын ажлаа хараахан илгээгээгүй байна.</p>
        <p>Өөрийн HTML-ээ байршуулахдаа дараах файлыг бүхэлд нь солино уу:</p>
        <code class="path">${esc(path)}</code>
      </div>

      <footer><a href="../">← ${esc(setLabel)}</a><br><small>${universityLink()}</small></footer>
    </article>
  </main>
</body>
</html>
`
}
