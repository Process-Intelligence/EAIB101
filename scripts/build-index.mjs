// Regenerates public/index.html from the grouped roster in students.json and
// the actual contents of public/student/. Each program group gets its own tab;
// a folder still holding the generated placeholder counts as "pending".
//
//   npm run index
//
// Run this after adding or replacing a student page so the homepage counts
// stay honest.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadRoster, findOrphanFolders, esc, ROOT } from './roster.mjs'

const roster = loadRoster()
const CLASS = roster.class

const groups = roster.groups.map((group) => {
  const done = group.students.filter((s) => s.submitted).length
  const total = group.students.length
  return { ...group, done, total, pct: total ? Math.round((done / total) * 100) : 0 }
})

const grandDone = groups.reduce((n, g) => n + g.done, 0)
const grandTotal = groups.reduce((n, g) => n + g.total, 0)

// --- warnings -------------------------------------------------------------
for (const group of groups) {
  for (const s of group.students) {
    if (!s.exists) console.warn(`  ! ${s.id}: no index.html — counting as pending (run npm run scaffold)`)
  }
}
for (const orphan of findOrphanFolders(groups)) {
  console.warn(`  ! public/student/${orphan}/ is not on any roster — nothing links to it`)
}

// --- markup ---------------------------------------------------------------
const tabId = (g) => `tab-${g.id}`
const panelId = (g) => `panel-${g.id}`

const inputs = groups
  .map(
    (g, i) =>
      `    <input class="tabinput" type="radio" name="group" id="${esc(tabId(g))}" autocomplete="off"${
        i === 0 ? ' checked' : ''
      }>`
  )
  .join('\n')

const tabs = groups
  .map(
    (g) => `      <label class="tab" for="${esc(tabId(g))}">
        <span class="tab-name">${esc(g.label)}</span>
        <span class="tab-count mono">${g.done}/${g.total}</span>
      </label>`
  )
  .join('\n')

const panels = groups
  .map((g) => {
    const cards = g.students
      .map(
        (s) => `          <li>
            <a class="student ${s.submitted ? 'is-submitted' : 'is-pending'}" href="/student/${esc(s.id)}/">
              <span class="row">
                <span class="code mono">${esc(s.id)}</span>
                <span class="tag">${s.submitted ? 'Илгээсэн' : 'Хүлээгдэж буй'}</span>
              </span>
              <span class="name">${esc(s.name)}</span>
            </a>
          </li>`
      )
      .join('\n')

    return `    <section class="panel" id="${esc(panelId(g))}" aria-label="${esc(g.label)}">
      <div class="progress">
        <div class="progress-head">
          <span><b>${g.done}</b> / ${g.total} илгээсэн</span>
          <span class="pct">${g.pct}%</span>
        </div>
        <div class="bar" role="img" aria-label="${esc(g.label)}: ${g.done} of ${g.total} students have submitted">
          <span style="width: ${g.pct}%"></span>
        </div>
      </div>

      <ul>
${cards}
      </ul>
    </section>`
  })
  .join('\n\n')

// Pure-CSS tabs: each radio shows its own panel and lights up its own label.
// The radios are siblings of both the tab bar and the panels, so the `~`
// combinator reaches them without needing :has().
const tabRules = groups
  .map(
    (g) => `  #${tabId(g)}:checked ~ #${panelId(g)} { display: block; }
  #${tabId(g)}:checked ~ .tabs .tab[for="${tabId(g)}"] {
    background: var(--accent-soft); border-color: var(--accent); color: var(--ink);
  }
  #${tabId(g)}:checked ~ .tabs .tab[for="${tabId(g)}"] .tab-count { background: var(--panel); }
  #${tabId(g)}:focus-visible ~ .tabs .tab[for="${tabId(g)}"] {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }`
  )
  .join('\n')

const html = `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${CLASS} — Оюутны ажлууд</title>
<meta name="description" content="${CLASS} хичээлийн оюутнуудын ажлын хуудсууд. ${grandDone}/${grandTotal} илгээсэн.">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    color-scheme: light dark;
    --bg: #f4f4f2;
    --panel: #ffffff;
    --ink: #1c1b19;
    --muted: #6b6963;
    --line: #e2e1dc;
    --accent: #b4522a;
    --accent-soft: #fbeee7;
    --ok: #2f6b46;
    --ok-soft: #e8f2ec;
    --shadow: 0 1px 2px rgba(28,27,25,.06), 0 8px 24px -12px rgba(28,27,25,.18);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14140f;
      --panel: #1e1e18;
      --ink: #f0efe9;
      --muted: #a09d94;
      --line: #32312a;
      --accent: #e8875c;
      --accent-soft: #2e211a;
      --ok: #7fc79b;
      --ok-soft: #1c2a22;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  .mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
  .wrap { max-width: 62rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }

  header { margin-bottom: 2rem; }
  h1 { font-size: clamp(2rem, 6vw, 3rem); margin: 0 0 .35rem; letter-spacing: -.02em; }
  .sub { color: var(--muted); margin: 0; }

  /* Tabs ------------------------------------------------------------- */
  .tabinput {
    position: absolute; width: 1px; height: 1px;
    margin: 0; padding: 0; border: 0; opacity: 0;
  }
  /* Pills, not an underlined strip: they wrap instead of scrolling, so every
     group stays visible on a phone. */
  .tabs { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 2rem; }
  .tab {
    display: inline-flex; align-items: center; gap: .5rem;
    max-width: 100%;
    padding: .55rem .95rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    font-size: .9375rem; font-weight: 600;
    cursor: pointer;
    transition: color .12s ease, background .12s ease, border-color .12s ease;
  }
  .tab:hover { color: var(--ink); }
  .tab-count {
    font-size: .75rem; font-weight: 700;
    padding: .1rem .45rem; border-radius: 999px;
    background: var(--bg); color: inherit;
  }
  .panel { display: none; }
${tabRules}

  /* Progress --------------------------------------------------------- */
  .progress { margin: 0 0 2rem; }
  .progress-head {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 1rem; margin-bottom: .5rem; font-size: .9375rem;
  }
  .progress-head b { font-size: 1.125rem; }
  .progress-head .pct { color: var(--muted); }
  .bar { height: .5rem; border-radius: 999px; background: var(--line); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--ok); border-radius: 999px; }

  /* Student cards ---------------------------------------------------- */
  ul { list-style: none; margin: 0; padding: 0;
       display: grid; gap: .75rem;
       grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
  .student {
    display: flex; flex-direction: column; gap: .4rem;
    padding: 1rem 1.1rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-left: 3px solid var(--line);
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow);
    transition: transform .12s ease, border-color .12s ease;
  }
  .student:hover, .student:focus-visible { transform: translateY(-2px); border-color: var(--accent); }
  .student.is-submitted { border-left-color: var(--ok); }
  .student.is-pending { opacity: .72; }

  .row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
  .code { font-size: .8125rem; letter-spacing: .06em; color: var(--accent); }
  .name { font-size: 1.0625rem; font-weight: 600; }
  .tag {
    font-size: .6875rem; font-weight: 600; letter-spacing: .02em;
    padding: .15rem .45rem; border-radius: 5px; white-space: nowrap;
  }
  .is-submitted .tag { background: var(--ok-soft); color: var(--ok); }
  .is-pending .tag { background: var(--accent-soft); color: var(--muted); }

  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line);
           color: var(--muted); font-size: .9375rem; }
  @media (prefers-reduced-motion: reduce) { .student, .tab { transition: none; } }
</style>
</head>
<body>
  <main class="wrap">
    <header>
      <h1>${CLASS}</h1>
      <p class="sub">Оюутны ажлын хуудсууд — ${grandDone}/${grandTotal} илгээсэн</p>
    </header>

${inputs}

    <div class="tabs">
${tabs}
    </div>

${panels}

    <footer>Оюутны хуудас нээхийн тулд нэр дээр нь дарна уу. Хүлээгдэж буй хуудсууд түр зуурын байна.</footer>
  </main>

<script>
// Deep links: /#<group-id> opens that tab, and switching tabs updates the URL
// so a tab can be shared. Without JS the tabs still work — this only syncs
// the address bar.
(function () {
  var groups = ${JSON.stringify(groups.map((g) => g.id))};
  var wanted = decodeURIComponent(location.hash.slice(1));
  groups.forEach(function (id) {
    var input = document.getElementById('tab-' + id);
    if (!input) return;
    if (id === wanted) input.checked = true;
    input.addEventListener('change', function () {
      if (input.checked) history.replaceState(null, '', '#' + id);
    });
  });
})();
</script>
</body>
</html>
`

writeFileSync(join(ROOT, 'public', 'index.html'), html, 'utf8')
console.log(
  `public/index.html regenerated — ${grandDone}/${grandTotal} submitted overall\n` +
    groups.map((g) => `  ${g.label}: ${g.done}/${g.total} (${g.pct}%)`).join('\n')
)
