// Regenerates public/index.html from the roster in students.json and the
// actual contents of public/student/. A folder still holding the generated
// placeholder counts as "pending"; anything else is a real submission.
//
//   npm run index
//
// Run this after adding or replacing a student page so the homepage counts
// stay honest.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STUDENT_DIR = join(ROOT, 'public', 'student')
const CLASS = 'EAIB101'

// Marker text unique to the generated placeholder page.
const PLACEHOLDER_MARKER = 'Түр зуурын хуудас'

const roster = JSON.parse(readFileSync(join(ROOT, 'scripts', 'students.json'), 'utf8'))

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const students = roster.map(({ id, name }) => {
  const page = join(STUDENT_DIR, id, 'index.html')
  if (!existsSync(page)) {
    console.warn(`  ! ${id}: no index.html — counting as pending`)
    return { id, name, submitted: false }
  }
  const html = readFileSync(page, 'utf8')
  return { id, name, submitted: !html.includes(PLACEHOLDER_MARKER) }
})

const done = students.filter((s) => s.submitted).length
const total = students.length
const pct = total ? Math.round((done / total) * 100) : 0

const cards = students
  .map(
    (s) => `      <li>
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

const html = `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${CLASS} — Оюутны ажлууд</title>
<meta name="description" content="${CLASS} хичээлийн оюутнуудын ажлын хуудсууд. ${done}/${total} илгээсэн.">
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

  .progress { margin: 1.5rem 0 2.5rem; }
  .progress-head {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 1rem; margin-bottom: .5rem; font-size: .9375rem;
  }
  .progress-head b { font-size: 1.125rem; }
  .progress-head .pct { color: var(--muted); }
  .bar {
    height: .5rem; border-radius: 999px; background: var(--line); overflow: hidden;
  }
  .bar span { display: block; height: 100%; width: ${pct}%; background: var(--ok); border-radius: 999px; }

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
  @media (prefers-reduced-motion: reduce) { .student { transition: none; } }
</style>
</head>
<body>
  <main class="wrap">
    <header>
      <h1>${CLASS}</h1>
      <p class="sub">Оюутны ажлын хуудсууд</p>
    </header>

    <section class="progress" aria-label="Илгээсэн байдал">
      <div class="progress-head">
        <span><b>${done}</b> / ${total} илгээсэн</span>
        <span class="pct">${pct}%</span>
      </div>
      <div class="bar" role="img" aria-label="${done} of ${total} students have submitted">
        <span></span>
      </div>
    </section>

    <ul>
${cards}
    </ul>

    <footer>Оюутны хуудас нээхийн тулд нэр дээр нь дарна уу. Хүлээгдэж буй хуудсууд түр зуурын байна.</footer>
  </main>
</body>
</html>
`

writeFileSync(join(ROOT, 'public', 'index.html'), html, 'utf8')
console.log(`public/index.html regenerated — ${done}/${total} submitted (${pct}%)`)
